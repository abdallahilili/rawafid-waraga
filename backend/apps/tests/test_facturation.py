from decimal import Decimal

from apps.articles.models import Article
from apps.caisse import services as caisse_services
from apps.facturation import services
from apps.facturation.models import Client, ModePaiement, EtatExpression
from apps.commun.exceptions import ErreurMetier
from apps.stock import services as stock_services
from apps.stock.models import Stock
from .base import CasDeBase


class TestCircuitFacturation(CasDeBase):
    def setUp(self):
        super().setUp()
        self.client_fiche = Client.objects.create(nom="Sow", prenom="Ali", num_client="C-001")
        self.article = Article.objects.create(nom="Ramette A4", reference="ART-F1", prix_achat=10, prix_vente=20)
        stock_services.enregistrer_entree(self.article, self.depot, 100, Decimal("10"))
        self.mode, _ = ModePaiement.objects.get_or_create(nom="Especes")

    def _devis(self, quantite=10):
        return services.creer_devis(
            self.client_fiche, self.magasinier, [{"article": self.article, "quantite": quantite}],
        )

    def test_devis_utilise_le_prix_de_vente(self):
        devis = self._devis(10)
        self.assertEqual(devis.etat, EtatExpression.DEVIS)
        self.assertEqual(devis.prix_total, Decimal("200"))
        self.assertTrue(devis.reference.startswith("DEV-"))

    def test_bon_livraison_sort_le_stock_et_recalcule_le_total(self):
        devis = self._devis(10)
        ligne = devis.lignes.get()
        bl = services.valider_bon_livraison(devis, {ligne.id: 6}, utilisateur=self.magasinier)
        self.assertEqual(bl.etat, EtatExpression.BON_LIVRAISON)
        self.assertEqual(bl.prix_total, Decimal("120"))
        self.assertTrue(bl.numero_bl.startswith("BL-"))
        self.assertEqual(Stock.objects.get(article=self.article, depot=self.depot).quantite, 94)

    def test_quantite_livree_superieure_au_devis_refusee(self):
        devis = self._devis(10)
        ligne = devis.lignes.get()
        with self.assertRaises(ErreurMetier):
            services.valider_bon_livraison(devis, {ligne.id: 11}, utilisateur=self.magasinier)

    def test_circuit_complet_avec_paiements_partiels(self):
        devis = self._devis(10)
        bl = services.valider_bon_livraison(devis, utilisateur=self.magasinier)
        facture = services.valider_facture(bl)
        self.assertEqual(facture.etat, EtatExpression.FACTURE)
        self.assertEqual(facture.montant_reste, Decimal("200"))

        # Pas de paiement sans session de caisse ouverte.
        with self.assertRaises(ErreurMetier):
            services.payer_facture(facture, 50, self.mode, self.caissier)

        session = caisse_services.ouvrir_session(self.depot, self.caissier, 0)
        services.payer_facture(facture, 50, self.mode, self.caissier)
        facture.refresh_from_db()
        self.assertEqual(facture.montant_reste, Decimal("150"))
        self.assertEqual(facture.etat_paiement, 0)

        with self.assertRaises(ErreurMetier):  # depasse le reste
            services.payer_facture(facture, 500, self.mode, self.caissier)

        services.payer_facture(facture, 150, self.mode, self.caissier)
        facture.refresh_from_db()
        self.assertEqual(facture.etat_paiement, 1)
        self.assertEqual(caisse_services.calculer_solde(session), Decimal("200"))

    def test_etapes_dans_l_ordre(self):
        devis = self._devis(1)
        with self.assertRaises(ErreurMetier):
            services.valider_facture(devis)  # un devis ne devient pas facture directement
        services.valider_bon_livraison(devis, utilisateur=self.magasinier)
        with self.assertRaises(ErreurMetier):
            services.modifier_devis(devis, [{"article": self.article, "quantite": 2}])


class TestApiFacturation(CasDeBase):
    def setUp(self):
        super().setUp()
        self.client_fiche = Client.objects.create(nom="Sow")
        self.article = Article.objects.create(nom="Stylo", reference="ART-F2", prix_achat=5, prix_vente=10)
        stock_services.enregistrer_entree(self.article, self.depot, 50, Decimal("5"))

    def test_droits_par_etape(self):
        magasinier = self.client_pour(self.magasinier)
        corps = {"client": self.client_fiche.id, "lignes": [{"article": self.article.id, "quantite": 3}]}
        reponse = magasinier.post("/api/facturation/documents/creer/", corps, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        identifiant = reponse.data["id"]

        reponse = magasinier.post(f"/api/facturation/documents/{identifiant}/valider_bl/", {}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data["etat"], 1)

        # Le magasinier ne facture pas ; le caissier ne cree pas de devis.
        self.assertEqual(magasinier.post(f"/api/facturation/documents/{identifiant}/valider_facture/", {}, format="json").status_code, 403)
        caissier = self.client_pour(self.caissier)
        self.assertEqual(caissier.post("/api/facturation/documents/creer/", corps, format="json").status_code, 403)
        self.assertEqual(caissier.get("/api/facturation/documents/").status_code, 200)

        admin = self.client_pour(self.admin)
        reponse = admin.post(f"/api/facturation/documents/{identifiant}/valider_facture/", {}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data["montant_reste"], "30.00")

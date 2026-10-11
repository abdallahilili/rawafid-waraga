from decimal import Decimal
from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import (
    TypeTravailImpression, FormatPapier, CouleurImpression,
)
from apps.articles.models import Article
from apps.impression.models import TarifImpression
from apps.impression import services as impression_services
from apps.caisse import services as caisse_services
from apps.ventes import services as vente_services
from apps.ventes.models import TypeLigneVente
from apps.stock import services as stock_services
from apps.stock.models import Stock
from .base import CasDeBase


class TestCaisse(CasDeBase):
    def test_ouverture_et_fermeture_session(self):
        session = caisse_services.ouvrir_session(self.depot, self.caissier, montant_ouverture=5000)
        self.assertEqual(caisse_services.calculer_solde(session), 5000)
        caisse_services.fermer_session(session, 5000)
        session.refresh_from_db()
        self.assertEqual(session.statut, "FERMEE")

    def test_double_ouverture_refusee(self):
        caisse_services.ouvrir_session(self.depot, self.caissier)
        with self.assertRaises(ErreurMetier):
            caisse_services.ouvrir_session(self.depot, self.caissier)


class TestVentes(CasDeBase):
    def setUp(self):
        super().setUp()
        self.article = Article.objects.create(nom="Cahier", reference="ART-C1", prix_achat=100, prix_vente=200)
        stock_services.enregistrer_entree(self.article, self.depot, 50, Decimal("100"))
        self.session = caisse_services.ouvrir_session(self.depot, self.caissier)
        TarifImpression.objects.create(
            depot=self.depot, type_travail=TypeTravailImpression.PHOTOCOPIE,
            format_papier=FormatPapier.A4, couleur=CouleurImpression.NOIR_BLANC,
            prix_unitaire_page=Decimal("5"),
        )

    def test_vente_article_decremente_le_stock_et_encaisse(self):
        vente = vente_services.creer_vente(
            self.depot, self.session,
            [{"type": TypeLigneVente.ARTICLE, "article": self.article, "quantite": 3}],
            montant_recu=Decimal("1000"),
        )
        self.assertEqual(vente.montant_total, Decimal("600"))
        self.assertEqual(vente.monnaie_rendue, Decimal("400"))
        stock = Stock.objects.get(article=self.article, depot=self.depot)
        self.assertEqual(stock.quantite, 47)
        self.assertEqual(caisse_services.calculer_solde(self.session), Decimal("600"))

    def test_vente_combinee_article_et_impression(self):
        commande = impression_services.creer_commande_impression(
            self.depot,
            [{
                "type_travail": TypeTravailImpression.PHOTOCOPIE,
                "format_papier": FormatPapier.A4, "couleur": CouleurImpression.NOIR_BLANC,
                "nombre_pages": 20, "nombre_copies": 1,
            }],
        )  # 20 * 5 = 100
        vente = vente_services.creer_vente(
            self.depot, self.session,
            [
                {"type": TypeLigneVente.ARTICLE, "article": self.article, "quantite": 1},
                {"type": TypeLigneVente.IMPRESSION, "commande_impression": commande},
            ],
            montant_recu=Decimal("500"),
        )
        self.assertEqual(vente.montant_total, Decimal("300"))  # 200 + 100
        self.assertEqual(vente.lignes.count(), 2)

    def test_vente_refusee_si_montant_recu_insuffisant(self):
        with self.assertRaises(ErreurMetier):
            vente_services.creer_vente(
                self.depot, self.session,
                [{"type": TypeLigneVente.ARTICLE, "article": self.article, "quantite": 5}],
                montant_recu=Decimal("100"),
            )

    def test_vente_est_immuable(self):
        vente = vente_services.creer_vente(
            self.depot, self.session,
            [{"type": TypeLigneVente.ARTICLE, "article": self.article, "quantite": 1}],
            montant_recu=Decimal("200"),
        )
        with self.assertRaises(TypeError):
            vente.nom_client = "Modifie"
            vente.save()
        with self.assertRaises(TypeError):
            vente.delete()

    def test_api_vente_necessite_session_ouverte(self):
        from apps.utilisateurs.models import Utilisateur
        autre_caissier = Utilisateur.objects.create_user(
            identifiant="caissier2", mot_de_passe="pass1234",
            nom="Caissier2", groupe=self.groupes["Caissier"], depot=self.depot,
        )
        client = self.client_pour(autre_caissier)
        reponse = client.post("/api/ventes/", {
            "depot": self.depot.id, "montant_recu": "200",
            "lignes": [{"type": "ARTICLE", "article": self.article.id, "quantite": 1}],
        }, format="json")
        self.assertEqual(reponse.status_code, 400)


class TestVenteService(CasDeBase):
    def setUp(self):
        super().setUp()
        from apps.impression.models import TarifImpression
        self.tarif = TarifImpression.objects.create(
            depot=self.depot, type_travail="PHOTOCOPIE", format_papier="A4",
            couleur="NOIR_BLANC", prix_unitaire_page=Decimal("5"),
        )
        self.session = caisse_services.ouvrir_session(self.depot, self.caissier)

    def test_vente_d_un_service_au_comptoir(self):
        client = self.client_pour(self.caissier)
        reponse = client.post("/api/ventes/", {
            "depot": self.depot.id, "montant_recu": "100",
            "lignes": [{"type": "SERVICE", "tarif": self.tarif.id, "quantite": 12}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(reponse.data["montant_total"], "60.00")
        ligne = reponse.data["lignes"][0]
        self.assertEqual(ligne["designation"], "Photocopie A4 Noir et blanc")
        self.assertEqual(ligne["quantite"], 12)

    def test_tarif_inactif_refuse(self):
        self.tarif.actif = False
        self.tarif.save()
        reponse = self.client_pour(self.caissier).post("/api/ventes/", {
            "depot": self.depot.id, "montant_recu": "100",
            "lignes": [{"type": "SERVICE", "tarif": self.tarif.id, "quantite": 1}],
        }, format="json")
        self.assertEqual(reponse.status_code, 400)


class TestPaiementsMultiples(CasDeBase):
    def setUp(self):
        super().setUp()
        from apps.facturation.models import ModePaiement
        self.especes, _ = ModePaiement.objects.update_or_create(nom="Especes", defaults={"especes": True, "etat": True})
        self.mobile, _ = ModePaiement.objects.update_or_create(nom="Mobile test", defaults={"especes": False, "etat": True})
        self.article = Article.objects.create(nom="Classeur", reference="ART-PM", prix_achat=50, prix_vente=100)
        stock_services.enregistrer_entree(self.article, self.depot, 50, Decimal("50"))
        self.session = caisse_services.ouvrir_session(self.depot, self.caissier, 0)
        self.lignes = [{"type": TypeLigneVente.ARTICLE, "article": self.article, "quantite": 3}]  # 300

    def test_paiement_partage_entre_deux_modes_avec_rendu(self):
        vente = vente_services.creer_vente(
            self.depot, self.session, self.lignes, 150, utilisateur=self.caissier,
            paiements=[
                {"mode_paiement": self.especes, "montant": Decimal("120")},
                {"mode_paiement": self.mobile, "montant": Decimal("180"), "reference_transaction": "TX1"},
            ],
        )
        self.assertEqual(vente.paiements.count(), 2)
        self.assertEqual(vente.monnaie_rendue, Decimal("30"))      # 150 remis pour 120 en especes
        self.assertEqual(vente.montant_recu, Decimal("330"))       # 150 + 180
        resume = caisse_services.calculer_resume(self.session)
        self.assertEqual(resume["total_especes"], Decimal("120"))
        self.assertEqual(resume["total_autres_paiements"], Decimal("180"))

    def test_montant_remis_facultatif_et_somme_obligatoire(self):
        vente = vente_services.creer_vente(
            self.depot, self.session, self.lignes, None,
            paiements=[{"mode_paiement": self.mobile, "montant": Decimal("300")}],
        )
        self.assertEqual(vente.monnaie_rendue, Decimal("0"))
        with self.assertRaises(ErreurMetier):
            vente_services.creer_vente(
                self.depot, self.session, self.lignes, None,
                paiements=[{"mode_paiement": self.especes, "montant": Decimal("250")}],
            )

    def test_api_vente_sans_montant_recu_ni_paiements_regle_en_especes(self):
        reponse = self.client_pour(self.caissier).post("/api/ventes/", {
            "depot": self.depot.id,
            "lignes": [{"type": "ARTICLE", "article": self.article.id, "quantite": 1}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(reponse.data["paiements"][0]["mode_paiement_nom"], "Especes")

    def test_api_paiements_multiples(self):
        reponse = self.client_pour(self.caissier).post("/api/ventes/", {
            "depot": self.depot.id,
            "lignes": [{"type": "ARTICLE", "article": self.article.id, "quantite": 2}],
            "paiements": [
                {"mode_paiement": self.especes.id, "montant": "50"},
                {"mode_paiement": self.mobile.id, "montant": "150", "reference_transaction": "ABC"},
            ],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(len(reponse.data["paiements"]), 2)

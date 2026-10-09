from decimal import Decimal
from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import StatutDocument
from apps.articles.models import Article
from apps.fournisseurs.models import Fournisseur
from apps.achats import services as achat_services
from apps.stock.models import Stock
from .base import CasDeBase


class TestAchats(CasDeBase):
    def setUp(self):
        super().setUp()
        self.fournisseur = Fournisseur.objects.create(nom="Fournisseur Test")
        self.article = Article.objects.create(nom="Stylo", reference="ART-S1", prix_achat=20, prix_vente=40)

    def test_creation_achat_brouillon_ne_touche_pas_le_stock(self):
        achat = achat_services.creer_achat(
            self.fournisseur, self.depot,
            [{"article": self.article, "quantite": 100, "prix_unitaire": Decimal("20")}],
            utilisateur=self.admin,
        )
        self.assertEqual(achat.statut, StatutDocument.BROUILLON)
        self.assertEqual(achat.montant_total, Decimal("2000"))
        self.assertFalse(Stock.objects.filter(article=self.article).exists())

    def test_validation_achat_incremente_le_stock(self):
        achat = achat_services.creer_achat(
            self.fournisseur, self.depot,
            [{"article": self.article, "quantite": 100, "prix_unitaire": Decimal("20")}],
        )
        achat_services.valider_achat(achat, utilisateur=self.admin)
        stock = Stock.objects.get(article=self.article, depot=self.depot)
        self.assertEqual(stock.quantite, 100)

    def test_double_validation_refusee(self):
        achat = achat_services.creer_achat(
            self.fournisseur, self.depot,
            [{"article": self.article, "quantite": 10, "prix_unitaire": Decimal("20")}],
        )
        achat_services.valider_achat(achat)
        with self.assertRaises(ErreurMetier):
            achat_services.valider_achat(achat)

    def test_annulation_achat_valide_retire_le_stock(self):
        achat = achat_services.creer_achat(
            self.fournisseur, self.depot,
            [{"article": self.article, "quantite": 10, "prix_unitaire": Decimal("20")}],
        )
        achat_services.valider_achat(achat)
        achat_services.annuler_achat(achat)
        stock = Stock.objects.get(article=self.article, depot=self.depot)
        self.assertEqual(stock.quantite, 0)

    def test_api_creation_achat_reserve_admin_magasinier(self):
        client = self.client_pour(self.caissier)
        reponse = client.post("/api/achats/", {
            "fournisseur": self.fournisseur.id, "depot": self.depot.id,
            "lignes": [{"article": self.article.id, "quantite": 5, "prix_unitaire": "20"}],
        }, format="json")
        self.assertEqual(reponse.status_code, 403)

        client = self.client_pour(self.magasinier)
        reponse = client.post("/api/achats/", {
            "fournisseur": self.fournisseur.id, "depot": self.depot.id,
            "lignes": [{"article": self.article.id, "quantite": 5, "prix_unitaire": "20"}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201)

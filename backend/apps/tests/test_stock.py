from decimal import Decimal
from apps.commun.exceptions import ErreurMetier
from apps.articles.models import Article, Categorie
from apps.stock import services as stock_services
from apps.stock.models import Stock, MouvementStock
from .base import CasDeBase


class TestStock(CasDeBase):
    def setUp(self):
        super().setUp()
        self.categorie = Categorie.objects.create(nom="Papier")
        self.article = Article.objects.create(
            nom="Ramette A4", reference="ART-1", categorie=self.categorie,
            prix_achat=1000, prix_vente=1500, seuil_alerte=5,
        )

    def test_entree_cree_stock_et_mouvement(self):
        stock, mouvement = stock_services.enregistrer_entree(
            self.article, self.depot, 50, Decimal("1000"), utilisateur=self.admin,
        )
        self.assertEqual(stock.quantite, 50)
        self.assertEqual(stock.cout_moyen_pondere, Decimal("1000"))
        self.assertEqual(MouvementStock.objects.count(), 1)
        self.assertEqual(mouvement.stock_avant, 0)
        self.assertEqual(mouvement.stock_apres, 50)

    def test_cump_recalcule_sur_entree_a_prix_different(self):
        stock_services.enregistrer_entree(self.article, self.depot, 10, Decimal("1000"))
        stock, _ = stock_services.enregistrer_entree(self.article, self.depot, 10, Decimal("2000"))
        # (10*1000 + 10*2000) / 20 = 1500
        self.assertEqual(stock.cout_moyen_pondere, Decimal("1500"))

    def test_sortie_refuse_si_stock_insuffisant(self):
        stock_services.enregistrer_entree(self.article, self.depot, 5, Decimal("1000"))
        with self.assertRaises(ErreurMetier):
            stock_services.enregistrer_sortie(self.article, self.depot, 10)

    def test_mouvement_stock_est_immuable(self):
        _, mouvement = stock_services.enregistrer_entree(self.article, self.depot, 5, Decimal("1000"))
        mouvement.commentaire = "modifie"
        with self.assertRaises(TypeError):
            mouvement.save()
        with self.assertRaises(TypeError):
            mouvement.delete()

    def test_transfert_entre_depots(self):
        stock_services.enregistrer_entree(self.article, self.depot, 20, Decimal("1000"))
        stock_services.transferer_stock(self.article, self.depot, self.depot2, 8)
        source = Stock.objects.get(article=self.article, depot=self.depot)
        destination = Stock.objects.get(article=self.article, depot=self.depot2)
        self.assertEqual(source.quantite, 12)
        self.assertEqual(destination.quantite, 8)
        self.assertEqual(destination.cout_moyen_pondere, Decimal("1000"))

    def test_ajustement_inventaire_cree_mouvement_correctif(self):
        stock_services.enregistrer_entree(self.article, self.depot, 20, Decimal("1000"))
        ecart = stock_services.ajuster_inventaire(self.article, self.depot, 17, utilisateur=self.magasinier)
        self.assertEqual(ecart, -3)
        stock = Stock.objects.get(article=self.article, depot=self.depot)
        self.assertEqual(stock.quantite, 17)

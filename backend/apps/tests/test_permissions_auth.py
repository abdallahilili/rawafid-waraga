from decimal import Decimal
from apps.articles.models import Article
from apps.stock import services as stock_services
from .base import CasDeBase


class TestAuth(CasDeBase):
    def test_connexion_retourne_jwt_et_profil(self):
        from rest_framework.test import APIClient
        client = APIClient()
        reponse = client.post("/api/auth/connexion/", {
            "identifiant": "admin", "mot_de_passe": "pass1234",
        }, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertIn("access", reponse.data)
        self.assertEqual(reponse.data["utilisateur"]["groupe_nom"], "Administrateur")
        self.assertIn("articles.gerer", reponse.data["utilisateur"]["permissions"])

    def test_connexion_refusee_mauvais_mot_de_passe(self):
        from rest_framework.test import APIClient
        client = APIClient()
        reponse = client.post("/api/auth/connexion/", {
            "identifiant": "admin", "mot_de_passe": "faux",
        }, format="json")
        self.assertEqual(reponse.status_code, 401)


class TestPermissionsArticles(CasDeBase):
    def setUp(self):
        super().setUp()
        self.article = Article.objects.create(nom="Stylo", reference="ART-P1", prix_achat=10, prix_vente=20)

    def test_caissier_peut_lire_mais_pas_creer_article(self):
        client = self.client_pour(self.caissier)
        reponse = client.get("/api/articles/")
        self.assertEqual(reponse.status_code, 200)
        reponse = client.post("/api/articles/", {
            "nom": "Nouveau", "reference": "ART-X", "prix_achat": "10", "prix_vente": "20",
        }, format="json")
        self.assertEqual(reponse.status_code, 403)

    def test_caissier_ne_voit_pas_le_prix_achat(self):
        client = self.client_pour(self.caissier)
        reponse = client.get(f"/api/articles/{self.article.id}/")
        self.assertNotIn("prix_achat", reponse.data)

    def test_magasinier_voit_le_prix_achat(self):
        client = self.client_pour(self.magasinier)
        reponse = client.get(f"/api/articles/{self.article.id}/")
        self.assertIn("prix_achat", reponse.data)

    def test_recherche_caisse_retourne_quantite_disponible(self):
        stock_services.enregistrer_entree(self.article, self.depot, 30, Decimal("10"))
        client = self.client_pour(self.caissier)
        reponse = client.get(f"/api/articles/recherche-caisse/?q=Stylo&depot={self.depot.id}")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data[0]["quantite_disponible"], 30)

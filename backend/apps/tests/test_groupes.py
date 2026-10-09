from apps.utilisateurs.models import Groupe, Utilisateur, Fonctionnalite, FonctionnaliteGroupe
from apps.utilisateurs.groupes import attribuer
from .base import CasDeBase


class TestGroupes(CasDeBase):
    def setUp(self):
        super().setUp()
        # Deux groupes de caissiers aux fonctionnalites differentes.
        base = list(self.groupes["Caissier"].fonctionnalites.values_list("nom", flat=True))
        self.groupe_senior = Groupe.objects.create(nom="Caissier principal")
        codes = base + ["ventes.voir_toutes", "rapports.voir", "rapports.recettes"]
        attribuer(
            self.groupe_senior,
            list(Fonctionnalite.objects.filter(nom__in=codes).values_list("pk", flat=True)),
            FonctionnaliteGroupe,
        )
        self.senior = Utilisateur.objects.create_user(
            identifiant="senior", mot_de_passe="pass1234", nom="Senior",
            groupe=self.groupe_senior, depot=self.depot,
        )

    def test_permissions_et_modules_dans_le_profil(self):
        reponse = self.client_pour(self.caissier).get("/api/auth/moi/")
        self.assertIn("caisse", reponse.data["modules"])
        self.assertNotIn("rapports", reponse.data["modules"])
        self.assertNotIn("utilisateurs", reponse.data["modules"])

    def test_rapport_recettes_reserve_au_groupe_autorise(self):
        self.assertEqual(self.client_pour(self.caissier).get("/api/rapports/ventes/").status_code, 403)
        self.assertEqual(self.client_pour(self.senior).get("/api/rapports/ventes/").status_code, 200)
        # L'etat du stock n'a pas ete accorde au groupe principal.
        self.assertEqual(self.client_pour(self.senior).get("/api/rapports/stock/").status_code, 403)

    def test_administrateur_a_acces_total(self):
        client = self.client_pour(self.admin)
        for url in ("/api/rapports/ventes/", "/api/rapports/stock/", "/api/utilisateurs/groupes/"):
            self.assertEqual(client.get(url).status_code, 200, url)

    def test_creation_groupe_et_validation_des_codes(self):
        client = self.client_pour(self.admin)
        ok = client.post("/api/utilisateurs/groupes/", {
            "nom": "Stagiaire", "fonctionnalites": ["articles.voir"],
        }, format="json")
        self.assertEqual(ok.status_code, 201, ok.data)
        ko = client.post("/api/utilisateurs/groupes/", {
            "nom": "Faux", "fonctionnalites": ["inexistante.code"],
        }, format="json")
        self.assertEqual(ko.status_code, 400)

    def test_caissier_ne_gere_pas_les_groupes(self):
        reponse = self.client_pour(self.caissier).post(
            "/api/utilisateurs/groupes/", {"nom": "X", "fonctionnalites": []}, format="json")
        self.assertEqual(reponse.status_code, 403)

    def test_groupe_avec_utilisateurs_non_supprimable(self):
        reponse = self.client_pour(self.admin).delete(f"/api/utilisateurs/groupes/{self.groupe_senior.id}/")
        self.assertEqual(reponse.status_code, 400)

    def test_groupe_inactif_retire_les_droits(self):
        Groupe.objects.filter(pk=self.groupe_senior.pk).update(etat=False)
        senior = Utilisateur.objects.get(pk=self.senior.pk)  # recharge le groupe
        self.assertEqual(self.client_pour(senior).get("/api/articles/").status_code, 403)

    def test_fonctionnalite_inactive_retire_le_droit(self):
        Fonctionnalite.objects.filter(nom="rapports.recettes").update(etat=False)
        self.assertEqual(self.client_pour(self.senior).get("/api/rapports/ventes/").status_code, 403)

    def test_utilisateur_sans_groupe_n_a_aucun_droit(self):
        sans = Utilisateur.objects.create_user(identifiant="vide", mot_de_passe="x", nom="Vide")
        self.assertEqual(self.client_pour(sans).get("/api/articles/").status_code, 403)

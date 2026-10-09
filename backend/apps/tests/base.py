from django.test import TestCase
from rest_framework.test import APIClient

from apps.depots.models import Depot
from apps.utilisateurs.models import Utilisateur, Groupe, Fonctionnalite, FonctionnaliteGroupe
from apps.utilisateurs.groupes import creer_groupes_par_defaut


class CasDeBase(TestCase):
    def setUp(self):
        self.depot = Depot.objects.create(nom="Depot Test", code="DEP-01")
        self.depot2 = Depot.objects.create(nom="Depot Secondaire", code="DEP-02")

        creer_groupes_par_defaut(Fonctionnalite, Groupe, FonctionnaliteGroupe)
        self.groupes = {g.nom: g for g in Groupe.objects.all()}

        self.admin = Utilisateur.objects.create_user(
            identifiant="admin", mot_de_passe="pass1234",
            nom="Admin", groupe=self.groupes["Administrateur"], depot=self.depot,
        )
        self.magasinier = Utilisateur.objects.create_user(
            identifiant="magasinier", mot_de_passe="pass1234",
            nom="Magasinier", groupe=self.groupes["Magasinier"], depot=self.depot,
        )
        self.caissier = Utilisateur.objects.create_user(
            identifiant="caissier", mot_de_passe="pass1234",
            nom="Caissier", groupe=self.groupes["Caissier"], depot=self.depot,
        )

    def client_pour(self, utilisateur):
        client = APIClient()
        client.force_authenticate(user=utilisateur)
        return client

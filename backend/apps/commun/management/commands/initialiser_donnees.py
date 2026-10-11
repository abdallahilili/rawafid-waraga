from django.core.management.base import BaseCommand
from django.db import transaction

from apps.depots.models import Depot
from apps.utilisateurs.models import Utilisateur, Groupe, Fonction, Fonctionnalite, FonctionnaliteGroupe
from apps.utilisateurs.groupes import creer_groupes_par_defaut
from apps.commun.constantes import PARAMETRES_PAR_DEFAUT
from apps.commun.models import Parametre


class Command(BaseCommand):
    help = "Initialise les donnees de base indispensables (admin, depot, parametres)."

    @transaction.atomic
    def handle(self, *args, **options):
        depot, cree = Depot.objects.get_or_create(
            code="MAG-01",
            defaults={"nom": "Magasin principal", "est_point_de_vente": True},
        )
        if cree:
            self.stdout.write(self.style.SUCCESS(f"Depot cree : {depot.nom}"))

        creer_groupes_par_defaut(Fonctionnalite, Groupe, FonctionnaliteGroupe)
        for nom_fonction in ("Gerant", "Caissier", "Magasinier"):
            Fonction.objects.get_or_create(nom=nom_fonction)

        if not Utilisateur.objects.filter(identifiant="admin").exists():
            admin = Utilisateur.objects.create_user(
                identifiant="admin", mot_de_passe="admin123",
                nom="Administrateur", prenom="Systeme",
                groupe=Groupe.objects.get(nom="Administrateur"), depot=depot,
                is_staff=True, is_superuser=True,
            )
            self.stdout.write(self.style.SUCCESS(
                f"Utilisateur admin cree (identifiant=admin / mot de passe=admin123)"
            ))

        for cle, (valeur, description) in PARAMETRES_PAR_DEFAUT.items():
            Parametre.objects.get_or_create(cle=cle, defaults={"valeur": valeur, "description": description})

        self.stdout.write(self.style.SUCCESS("Initialisation terminee."))

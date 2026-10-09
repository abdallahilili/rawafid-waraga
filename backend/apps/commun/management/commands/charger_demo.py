from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.depots.models import Depot
from apps.utilisateurs.models import Utilisateur, Groupe, Fonctionnalite, FonctionnaliteGroupe
from apps.utilisateurs.groupes import creer_groupes_par_defaut, attribuer
from apps.commun.constantes import GROUPES_PAR_DEFAUT, TypeTravailImpression, FormatPapier, CouleurImpression
from apps.articles.models import Article, Categorie
from apps.fournisseurs.models import Fournisseur
from apps.impression.models import TarifImpression
from apps.achats import services as achat_services
from apps.stock.models import Stock


class Command(BaseCommand):
    help = "Charge des donnees de demonstration (articles, fournisseurs, stock, tarifs, utilisateurs)."

    @transaction.atomic
    def handle(self, *args, **options):
        depot, _ = Depot.objects.get_or_create(
            code="MAG-01", defaults={"nom": "Magasin principal"}
        )
        depot2, _ = Depot.objects.get_or_create(
            code="MAG-02", defaults={"nom": "Succursale centre-ville"}
        )

        creer_groupes_par_defaut(Fonctionnalite, Groupe, FonctionnaliteGroupe)
        # Exemple d'un second groupe de caissiers avec des droits etendus.
        caissier_principal, cree = Groupe.objects.get_or_create(
            nom="Caissier principal",
            defaults={"description": "Caissier avec acces aux ventes de tous et aux etats de recettes."},
        )
        if cree:
            codes = GROUPES_PAR_DEFAUT["Caissier"]["permissions"] + [
                "caisse.voir_toutes_sessions", "ventes.voir_toutes",
                "rapports.voir", "rapports.recettes",
            ]
            attribuer(
                caissier_principal,
                list(Fonctionnalite.objects.filter(nom__in=codes).values_list("pk", flat=True)),
                FonctionnaliteGroupe,
            )

        if not Utilisateur.objects.filter(identifiant="caissier2").exists():
            Utilisateur.objects.create_user(
                identifiant="caissier2", mot_de_passe="caissier123",
                nom="Sow", prenom="Mariem", groupe=caissier_principal, depot=depot,
            )
        if not Utilisateur.objects.filter(identifiant="caissier1").exists():
            Utilisateur.objects.create_user(
                identifiant="caissier1", mot_de_passe="caissier123",
                nom="Ba", prenom="Fatimata", groupe=Groupe.objects.get(nom="Caissier"), depot=depot,
            )
        if not Utilisateur.objects.filter(identifiant="magasinier1").exists():
            Utilisateur.objects.create_user(
                identifiant="magasinier1", mot_de_passe="magasinier123",
                nom="Diallo", prenom="Amadou", groupe=Groupe.objects.get(nom="Magasinier"), depot=depot,
            )

        categorie_papier, _ = Categorie.objects.get_or_create(nom="Papier")
        categorie_ecriture, _ = Categorie.objects.get_or_create(nom="Ecriture")
        categorie_bureau, _ = Categorie.objects.get_or_create(nom="Fournitures de bureau")

        fournisseur, _ = Fournisseur.objects.get_or_create(
            nom="Societe Generale de Papeterie", defaults={"telephone1": "22 22 22 22"}
        )

        articles_demo = [
            ("Ramette papier A4 80g", "ART-0001", categorie_papier, "ramette", 1200, 1600),
            ("Cahier 100 pages grand format", "ART-0002", categorie_ecriture, "unite", 250, 400),
            ("Stylo bille bleu", "ART-0003", categorie_ecriture, "unite", 30, 60),
            ("Classeur A4", "ART-0004", categorie_bureau, "unite", 400, 700),
            ("Cartouche toner HP noir", "ART-0005", categorie_bureau, "unite", 15000, 20000),
        ]
        articles = []
        for nom, ref, categorie, unite, prix_achat, prix_vente in articles_demo:
            article, _ = Article.objects.get_or_create(
                reference=ref,
                defaults={
                    "nom": nom, "categorie": categorie, "unite": unite,
                    "prix_achat": prix_achat, "prix_vente": prix_vente, "seuil_alerte": 10,
                },
            )
            articles.append(article)

        if not Stock.objects.filter(depot=depot).exists():
            achat = achat_services.creer_achat(
                fournisseur, depot,
                [{"article": a, "quantite": 100, "prix_unitaire": a.prix_achat} for a in articles],
            )
            achat_services.valider_achat(achat)

        tarifs_demo = [
            (TypeTravailImpression.IMPRESSION, FormatPapier.A4, CouleurImpression.NOIR_BLANC, 10),
            (TypeTravailImpression.IMPRESSION, FormatPapier.A4, CouleurImpression.COULEUR, 50),
            (TypeTravailImpression.PHOTOCOPIE, FormatPapier.A4, CouleurImpression.NOIR_BLANC, 5),
            (TypeTravailImpression.PHOTOCOPIE, FormatPapier.A4, CouleurImpression.COULEUR, 30),
            (TypeTravailImpression.IMPRESSION, FormatPapier.A3, CouleurImpression.NOIR_BLANC, 20),
            (TypeTravailImpression.RELIURE, FormatPapier.A4, CouleurImpression.NOIR_BLANC, 100),
            (TypeTravailImpression.PLASTIFICATION, FormatPapier.A4, CouleurImpression.NOIR_BLANC, 200),
        ]
        for type_travail, format_papier, couleur, prix in tarifs_demo:
            TarifImpression.objects.get_or_create(
                depot=depot, type_travail=type_travail, format_papier=format_papier, couleur=couleur,
                defaults={"prix_unitaire_page": prix},
            )

        self.stdout.write(self.style.SUCCESS("Donnees de demonstration chargees."))

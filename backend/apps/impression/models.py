from django.db import models
from apps.commun.constantes import (
    TypeTravailImpression, FormatPapier, CouleurImpression, StatutCommandeImpression,
)


class TarifImpression(models.Model):
    """Grille tarifaire configurable par type de travail / format / couleur,
    au depot (chaque point de vente peut avoir ses propres tarifs)."""

    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.CASCADE, db_column="id_depot", related_name="tarifs_impression",
    )
    type_travail = models.CharField(max_length=20, choices=TypeTravailImpression.CHOIX, db_column="type_travail")
    format_papier = models.CharField(max_length=10, choices=FormatPapier.CHOIX, db_column="format_papier")
    couleur = models.CharField(max_length=15, choices=CouleurImpression.CHOIX, db_column="couleur")
    prix_unitaire_page = models.DecimalField(max_digits=10, decimal_places=2, db_column="prix_unitaire_page")
    actif = models.BooleanField(default=True, db_column="actif")

    class Meta:
        db_table = "tarif_impression"
        unique_together = [("depot", "type_travail", "format_papier", "couleur")]
        verbose_name = "Tarif d'impression"
        verbose_name_plural = "Tarifs d'impression"

    def __str__(self):
        return f"{self.type_travail}/{self.format_papier}/{self.couleur} = {self.prix_unitaire_page}"


class CommandeImpression(models.Model):
    """Commande de travaux d'impression/photocopie/reliure... Peut etre
    reglee independamment ou rattachee a une vente au comptoir."""

    reference = models.CharField(max_length=30, unique=True, db_column="reference")
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT, db_column="id_depot", related_name="commandes_impression",
    )
    nom_client = models.CharField(max_length=150, blank=True, default="", db_column="nom_client")
    telephone_client = models.CharField(max_length=30, blank=True, default="", db_column="telephone_client")
    statut = models.CharField(
        max_length=20, choices=StatutCommandeImpression.CHOIX,
        default=StatutCommandeImpression.EN_ATTENTE, db_column="statut",
    )
    date_commande = models.DateTimeField(auto_now_add=True, db_column="date_commande")
    date_livraison_prevue = models.DateTimeField(null=True, blank=True, db_column="date_livraison_prevue")
    date_livraison = models.DateTimeField(null=True, blank=True, db_column="date_livraison")
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column="montant_total")
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, on_delete=models.SET_NULL,
        db_column="id_utilisateur", related_name="commandes_impression",
    )

    class Meta:
        db_table = "commande_impression"
        ordering = ["-date_commande"]
        verbose_name = "Commande d'impression"
        verbose_name_plural = "Commandes d'impression"

    def __str__(self):
        return self.reference


class LigneCommandeImpression(models.Model):
    commande = models.ForeignKey(
        CommandeImpression, on_delete=models.CASCADE, db_column="id_commande", related_name="lignes",
    )
    type_travail = models.CharField(max_length=20, choices=TypeTravailImpression.CHOIX, db_column="type_travail")
    format_papier = models.CharField(max_length=10, choices=FormatPapier.CHOIX, db_column="format_papier")
    couleur = models.CharField(max_length=15, choices=CouleurImpression.CHOIX, db_column="couleur")
    recto_verso = models.BooleanField(default=False, db_column="recto_verso")
    nombre_pages = models.IntegerField(default=1, db_column="nombre_pages")
    nombre_copies = models.IntegerField(default=1, db_column="nombre_copies")
    prix_unitaire_page = models.DecimalField(max_digits=10, decimal_places=2, db_column="prix_unitaire_page")
    description = models.CharField(max_length=255, blank=True, default="", db_column="description")

    class Meta:
        db_table = "ligne_commande_impression"
        verbose_name = "Ligne de commande d'impression"
        verbose_name_plural = "Lignes de commande d'impression"

    @property
    def montant(self):
        return self.nombre_pages * self.nombre_copies * self.prix_unitaire_page

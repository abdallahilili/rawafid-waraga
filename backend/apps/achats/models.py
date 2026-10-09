from django.db import models
from apps.commun.constantes import StatutDocument


class Achat(models.Model):
    reference = models.CharField(max_length=30, unique=True, db_column="reference")
    fournisseur = models.ForeignKey(
        "fournisseurs.Fournisseur", on_delete=models.PROTECT,
        db_column="id_fournisseur", related_name="achats",
    )
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT,
        db_column="id_depot", related_name="achats",
    )
    statut = models.CharField(
        max_length=20, choices=StatutDocument.CHOIX, default=StatutDocument.BROUILLON,
        db_column="statut",
    )
    date_achat = models.DateTimeField(auto_now_add=True, db_column="date_achat")
    date_validation = models.DateTimeField(null=True, blank=True, db_column="date_validation")
    montant_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, db_column="montant_total")
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, on_delete=models.SET_NULL,
        db_column="id_utilisateur", related_name="achats",
    )

    class Meta:
        db_table = "achat"
        ordering = ["-date_achat"]
        verbose_name = "Achat"
        verbose_name_plural = "Achats"

    def __str__(self):
        return self.reference


class LigneAchat(models.Model):
    achat = models.ForeignKey(Achat, on_delete=models.CASCADE, db_column="id_achat", related_name="lignes")
    article = models.ForeignKey(
        "articles.Article", on_delete=models.PROTECT, db_column="id_article", related_name="lignes_achat",
    )
    quantite = models.IntegerField(db_column="quantite")
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, db_column="prix_unitaire")

    class Meta:
        db_table = "ligne_achat"
        verbose_name = "Ligne d'achat"
        verbose_name_plural = "Lignes d'achat"

    @property
    def montant(self):
        return self.quantite * self.prix_unitaire

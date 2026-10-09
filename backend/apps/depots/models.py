from django.db import models


class Depot(models.Model):
    """Magasin / point de vente / depot de stock."""

    nom = models.CharField(max_length=100, db_column="nom")
    code = models.CharField(max_length=20, unique=True, db_column="code")
    adresse = models.CharField(max_length=255, blank=True, default="", db_column="adresse")
    telephone = models.CharField(max_length=30, blank=True, default="", db_column="telephone")
    est_point_de_vente = models.BooleanField(default=True, db_column="est_point_de_vente")
    actif = models.BooleanField(default=True, db_column="actif")

    class Meta:
        db_table = "depot"
        verbose_name = "Depot"
        verbose_name_plural = "Depots"
        ordering = ["nom"]

    def __str__(self):
        return self.nom

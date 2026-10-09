from django.db import models


class Fournisseur(models.Model):
    nom = models.CharField(max_length=150, db_column="nom")
    sigle = models.CharField(max_length=30, blank=True, default="", db_column="sigle")
    adresse = models.CharField(max_length=255, blank=True, default="", db_column="adresse")
    telephone1 = models.CharField(max_length=30, blank=True, default="", db_column="telephone1")
    telephone2 = models.CharField(max_length=30, blank=True, default="", db_column="telephone2")
    email = models.EmailField(blank=True, default="", db_column="email")
    actif = models.BooleanField(default=True, db_column="actif")

    class Meta:
        db_table = "fournisseur"
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"
        ordering = ["nom"]

    def __str__(self):
        return self.nom

from django.db import models


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True, db_column="nom")

    class Meta:
        db_table = "categorie"
        verbose_name = "Categorie"
        verbose_name_plural = "Categories"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Article(models.Model):
    """Article de papeterie / fourniture de bureau (sans notion de
    peremption ni de lot : simple stock geré par depot via l'app stock)."""

    nom = models.CharField(max_length=150, db_column="nom")
    reference = models.CharField(max_length=50, unique=True, db_column="reference")
    code_barre = models.CharField(max_length=50, blank=True, default="", db_column="code_barre")
    categorie = models.ForeignKey(
        Categorie, null=True, blank=True, on_delete=models.SET_NULL,
        db_column="id_categorie", related_name="articles",
    )
    unite = models.CharField(max_length=20, default="unite", db_column="unite")
    prix_achat = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column="prix_achat")
    prix_vente = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column="prix_vente")
    seuil_alerte = models.IntegerField(default=5, db_column="seuil_alerte")
    actif = models.BooleanField(default=True, db_column="actif")
    date_creation = models.DateTimeField(auto_now_add=True, db_column="date_creation")

    class Meta:
        db_table = "article"
        verbose_name = "Article"
        verbose_name_plural = "Articles"
        ordering = ["nom"]

    def __str__(self):
        return self.nom

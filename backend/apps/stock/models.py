from django.db import models
from apps.commun.modeles import ModeleImmuable
from apps.commun.constantes import TypeMouvementStock


class Stock(models.Model):
    """Niveau de stock courant d'un article dans un depot (pas de lot,
    pas de peremption : simple quantite + cout unitaire moyen pondere)."""

    article = models.ForeignKey(
        "articles.Article", on_delete=models.CASCADE,
        db_column="id_article", related_name="stocks",
    )
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.CASCADE,
        db_column="id_depot", related_name="stocks",
    )
    quantite = models.IntegerField(default=0, db_column="quantite")
    cout_moyen_pondere = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, db_column="cout_moyen_pondere"
    )

    class Meta:
        db_table = "stock"
        unique_together = [("article", "depot")]
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"

    def __str__(self):
        return f"{self.article} @ {self.depot} = {self.quantite}"

    @property
    def valeur_stock(self):
        return self.quantite * self.cout_moyen_pondere


class MouvementStock(ModeleImmuable):
    """Historique immuable de tout mouvement de stock. Toute correction
    passe par un mouvement inverse, jamais par une modification."""

    article = models.ForeignKey(
        "articles.Article", on_delete=models.PROTECT,
        db_column="id_article", related_name="mouvements",
    )
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT,
        db_column="id_depot", related_name="mouvements_stock",
    )
    type_mouvement = models.CharField(
        max_length=20, choices=TypeMouvementStock.CHOIX, db_column="type_mouvement"
    )
    quantite = models.IntegerField(db_column="quantite")  # positif ou negatif
    stock_avant = models.IntegerField(db_column="stock_avant")
    stock_apres = models.IntegerField(db_column="stock_apres")
    prix_unitaire = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, db_column="prix_unitaire"
    )
    reference_document = models.CharField(max_length=50, blank=True, default="", db_column="reference_document")
    commentaire = models.CharField(max_length=255, blank=True, default="", db_column="commentaire")
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, on_delete=models.SET_NULL,
        db_column="id_utilisateur", related_name="mouvements_stock",
    )
    date_mouvement = models.DateTimeField(auto_now_add=True, db_column="date_mouvement")

    class Meta:
        db_table = "mouvement_stock"
        ordering = ["-date_mouvement"]
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"

    def __str__(self):
        return f"{self.type_mouvement} {self.quantite} {self.article} @ {self.depot}"


class Inventaire(ModeleImmuable):
    """Ligne d'ecart constate lors d'un inventaire physique."""

    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT, db_column="id_depot", related_name="inventaires",
    )
    article = models.ForeignKey(
        "articles.Article", on_delete=models.PROTECT, db_column="id_article", related_name="inventaires",
    )
    quantite_theorique = models.IntegerField(db_column="quantite_theorique")
    quantite_physique = models.IntegerField(db_column="quantite_physique")
    ecart = models.IntegerField(db_column="ecart")
    date_inventaire = models.DateTimeField(auto_now_add=True, db_column="date_inventaire")
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, on_delete=models.SET_NULL,
        db_column="id_utilisateur", related_name="inventaires",
    )

    class Meta:
        db_table = "inventaire"
        ordering = ["-date_inventaire"]
        verbose_name = "Inventaire"
        verbose_name_plural = "Inventaires"

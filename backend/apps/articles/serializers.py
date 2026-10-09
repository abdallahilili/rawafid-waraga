from rest_framework import serializers
from apps.commun.serializers import MasquerPrixAchatMixin
from .models import Article, Categorie


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ["id", "nom"]


class ArticleSerializer(MasquerPrixAchatMixin, serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True, default=None)
    stock_total = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id", "nom", "reference", "code_barre", "categorie", "categorie_nom",
            "unite", "prix_achat", "prix_vente", "seuil_alerte", "actif",
            "date_creation", "stock_total",
        ]

    def get_stock_total(self, obj):
        total = getattr(obj, "stock_total_annote", None)
        if total is not None:
            return total
        from django.db.models import Sum
        from apps.stock.models import Stock
        resultat = Stock.objects.filter(article=obj).aggregate(total=Sum("quantite"))
        return resultat["total"] or 0

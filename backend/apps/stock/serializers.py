from rest_framework import serializers
from apps.commun.serializers import MasquerPrixAchatMixin
from .models import Stock, MouvementStock, Inventaire


class StockSerializer(MasquerPrixAchatMixin, serializers.ModelSerializer):
    article_nom = serializers.CharField(source="article.nom", read_only=True)
    article_reference = serializers.CharField(source="article.reference", read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)
    seuil_alerte = serializers.IntegerField(source="article.seuil_alerte", read_only=True)
    valeur_stock = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            "id", "article", "article_nom", "article_reference", "depot", "depot_nom",
            "quantite", "cout_moyen_pondere", "seuil_alerte", "valeur_stock",
        ]

    def get_valeur_stock(self, obj):
        return str(obj.valeur_stock)


class MouvementStockSerializer(serializers.ModelSerializer):
    article_nom = serializers.CharField(source="article.nom", read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = MouvementStock
        fields = [
            "id", "article", "article_nom", "depot", "depot_nom", "type_mouvement",
            "quantite", "stock_avant", "stock_apres", "prix_unitaire",
            "reference_document", "commentaire", "utilisateur", "utilisateur_nom",
            "date_mouvement",
        ]

    def get_utilisateur_nom(self, obj):
        return str(obj.utilisateur) if obj.utilisateur else "Systeme"


class EntreeStockSerializer(serializers.Serializer):
    article = serializers.IntegerField()
    depot = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1)
    prix_unitaire = serializers.DecimalField(max_digits=12, decimal_places=2)
    commentaire = serializers.CharField(required=False, allow_blank=True, default="")


class SortieStockSerializer(serializers.Serializer):
    article = serializers.IntegerField()
    depot = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1)
    commentaire = serializers.CharField(required=False, allow_blank=True, default="")


class TransfertStockSerializer(serializers.Serializer):
    article = serializers.IntegerField()
    depot_source = serializers.IntegerField()
    depot_destination = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1)


class InventaireSerializer(serializers.ModelSerializer):
    article_nom = serializers.CharField(source="article.nom", read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)

    class Meta:
        model = Inventaire
        fields = [
            "id", "depot", "depot_nom", "article", "article_nom",
            "quantite_theorique", "quantite_physique", "ecart", "date_inventaire",
        ]


class AjusterInventaireSerializer(serializers.Serializer):
    article = serializers.IntegerField()
    depot = serializers.IntegerField()
    quantite_physique = serializers.IntegerField(min_value=0)

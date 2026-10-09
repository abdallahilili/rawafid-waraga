from rest_framework import serializers
from .models import Achat, LigneAchat


class LigneAchatSerializer(serializers.ModelSerializer):
    article_nom = serializers.CharField(source="article.nom", read_only=True)
    montant = serializers.SerializerMethodField()

    class Meta:
        model = LigneAchat
        fields = ["id", "article", "article_nom", "quantite", "prix_unitaire", "montant"]

    def get_montant(self, obj):
        return str(obj.montant)


class LigneAchatEcritureSerializer(serializers.Serializer):
    article = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1)
    prix_unitaire = serializers.DecimalField(max_digits=12, decimal_places=2)


class AchatSerializer(serializers.ModelSerializer):
    lignes = LigneAchatSerializer(many=True, read_only=True)
    fournisseur_nom = serializers.CharField(source="fournisseur.nom", read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)

    class Meta:
        model = Achat
        fields = [
            "id", "reference", "fournisseur", "fournisseur_nom", "depot", "depot_nom",
            "statut", "date_achat", "date_validation", "montant_total", "lignes",
        ]
        read_only_fields = ["reference", "montant_total", "statut"]


class CreerAchatSerializer(serializers.Serializer):
    fournisseur = serializers.IntegerField()
    depot = serializers.IntegerField()
    lignes = LigneAchatEcritureSerializer(many=True)

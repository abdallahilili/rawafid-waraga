from rest_framework import serializers
from .models import TarifImpression, CommandeImpression, LigneCommandeImpression


class TarifImpressionSerializer(serializers.ModelSerializer):
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)

    class Meta:
        model = TarifImpression
        fields = [
            "id", "depot", "depot_nom", "type_travail", "format_papier", "couleur",
            "prix_unitaire_page", "actif",
        ]


class LigneCommandeImpressionSerializer(serializers.ModelSerializer):
    montant = serializers.SerializerMethodField()

    class Meta:
        model = LigneCommandeImpression
        fields = [
            "id", "type_travail", "format_papier", "couleur", "recto_verso",
            "nombre_pages", "nombre_copies", "prix_unitaire_page", "description", "montant",
        ]

    def get_montant(self, obj):
        return str(obj.montant)


class LigneCommandeImpressionEcritureSerializer(serializers.Serializer):
    type_travail = serializers.CharField()
    format_papier = serializers.CharField()
    couleur = serializers.CharField()
    recto_verso = serializers.BooleanField(required=False, default=False)
    nombre_pages = serializers.IntegerField(min_value=1)
    nombre_copies = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class CommandeImpressionSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeImpressionSerializer(many=True, read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)

    class Meta:
        model = CommandeImpression
        fields = [
            "id", "reference", "depot", "depot_nom", "nom_client", "telephone_client",
            "statut", "date_commande", "date_livraison_prevue", "date_livraison",
            "montant_total", "lignes",
        ]
        read_only_fields = ["reference", "montant_total", "statut"]


class CreerCommandeImpressionSerializer(serializers.Serializer):
    depot = serializers.IntegerField()
    nom_client = serializers.CharField(required=False, allow_blank=True, default="")
    telephone_client = serializers.CharField(required=False, allow_blank=True, default="")
    date_livraison_prevue = serializers.DateTimeField(required=False, allow_null=True, default=None)
    lignes = LigneCommandeImpressionEcritureSerializer(many=True)


class ChangerStatutSerializer(serializers.Serializer):
    statut = serializers.CharField()

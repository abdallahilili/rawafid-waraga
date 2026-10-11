from rest_framework import serializers

from .models import (
    Client, ModePaiement, ExpressionBesoins, LigneExpressionBesoins, PaiementFacture,
)


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "nom", "prenom", "num_client", "etat"]


class ModePaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModePaiement
        fields = ["id", "nom", "alias", "etat", "especes"]


class LigneSerializer(serializers.ModelSerializer):
    article_nom = serializers.SerializerMethodField()
    unite = serializers.SerializerMethodField()

    class Meta:
        model = LigneExpressionBesoins
        fields = [
            "id", "article", "tarif", "article_nom", "designation", "unite", "quantite_devis",
            "quantite_livre", "prix", "prix_total",
        ]

    def get_article_nom(self, obj):
        return obj.article.nom if obj.article_id else obj.designation

    def get_unite(self, obj):
        return obj.article.unite if obj.article_id else "page"


class PaiementSerializer(serializers.ModelSerializer):
    mode_paiement_nom = serializers.CharField(source="mode_paiement.nom", read_only=True)
    personnel_nom = serializers.CharField(source="personnel.__str__", read_only=True)

    class Meta:
        model = PaiementFacture
        fields = ["id", "montant_paye", "date_paiement", "mode_paiement", "mode_paiement_nom", "personnel_nom"]


class ExpressionSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source="client.__str__", read_only=True)
    personnel_nom = serializers.CharField(source="personnel.__str__", read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True, default=None)
    etat_libelle = serializers.CharField(source="get_etat_display", read_only=True)
    lignes = LigneSerializer(many=True, read_only=True)
    paiements = PaiementSerializer(many=True, read_only=True)

    class Meta:
        model = ExpressionBesoins
        fields = [
            "id", "reference", "type", "client", "client_nom", "personnel_nom", "depot", "depot_nom",
            "etat", "etat_libelle", "etat_paiement", "date_devis", "date_bc", "date_fc",
            "numero_bl", "numero_facture", "prix_total", "montant_reste", "lignes", "paiements",
        ]


class LigneEcritureSerializer(serializers.Serializer):
    article = serializers.IntegerField(required=False)
    tarif = serializers.IntegerField(required=False)
    quantite = serializers.IntegerField(min_value=1)
    prix = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)


class DevisEcritureSerializer(serializers.Serializer):
    client = serializers.IntegerField()
    type = serializers.CharField(required=False, allow_blank=True, default="")
    lignes = LigneEcritureSerializer(many=True)


class QuantiteLivreeSerializer(serializers.Serializer):
    ligne = serializers.IntegerField()
    quantite_livre = serializers.IntegerField(min_value=0)


class ValiderBLSerializer(serializers.Serializer):
    date_bc = serializers.DateTimeField(required=False)
    lignes = QuantiteLivreeSerializer(many=True, required=False)


class ValiderFactureSerializer(serializers.Serializer):
    date_fc = serializers.DateTimeField(required=False)


class PayerSerializer(serializers.Serializer):
    montant = serializers.DecimalField(max_digits=14, decimal_places=2)
    mode_paiement = serializers.IntegerField()

from rest_framework import serializers
from .models import Vente, LigneVente, TypeLigneVente


class LigneVenteSerializer(serializers.ModelSerializer):
    article_nom = serializers.CharField(source="article.nom", read_only=True, default=None)
    reference_commande_impression = serializers.CharField(
        source="commande_impression.reference", read_only=True, default=None
    )

    class Meta:
        model = LigneVente
        fields = [
            "id", "type_ligne", "article", "article_nom", "quantite",
            "commande_impression", "reference_commande_impression",
            "prix_unitaire", "montant",
        ]


class VenteSerializer(serializers.ModelSerializer):
    lignes = LigneVenteSerializer(many=True, read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)
    caissier_nom = serializers.SerializerMethodField()

    class Meta:
        model = Vente
        fields = [
            "id", "reference", "depot", "depot_nom", "session_caissier", "caissier_nom",
            "nom_client", "montant_total", "montant_recu", "monnaie_rendue", "annulee",
            "date_vente",
            "lignes",
        ]

    def get_caissier_nom(self, obj):
        return str(obj.utilisateur) if obj.utilisateur else None


class LigneVenteEcritureSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=TypeLigneVente.CHOIX)
    article = serializers.IntegerField(required=False)
    quantite = serializers.IntegerField(required=False, min_value=1)
    commande_impression = serializers.IntegerField(required=False)


class CreerVenteSerializer(serializers.Serializer):
    depot = serializers.IntegerField()
    nom_client = serializers.CharField(required=False, allow_blank=True, default="")
    montant_recu = serializers.DecimalField(max_digits=12, decimal_places=2)
    lignes = LigneVenteEcritureSerializer(many=True)

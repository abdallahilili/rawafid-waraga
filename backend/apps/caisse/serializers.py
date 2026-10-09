from rest_framework import serializers
from .models import SessionCaissier, MouvementCaisse


class MouvementCaisseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MouvementCaisse
        fields = ["id", "session", "type_mouvement", "montant", "reference_document", "commentaire", "date_mouvement"]


class SessionCaissierSerializer(serializers.ModelSerializer):
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)
    caissier_nom = serializers.SerializerMethodField()
    solde = serializers.SerializerMethodField()
    mouvements = MouvementCaisseSerializer(many=True, read_only=True)

    class Meta:
        model = SessionCaissier
        fields = [
            "id", "depot", "depot_nom", "utilisateur", "caissier_nom", "statut",
            "montant_ouverture", "montant_fermeture", "date_ouverture", "date_fermeture",
            "solde", "mouvements",
        ]

    def get_caissier_nom(self, obj):
        return str(obj.utilisateur)

    def get_solde(self, obj):
        from .services import calculer_solde
        return str(calculer_solde(obj))


class OuvrirSessionSerializer(serializers.Serializer):
    depot = serializers.IntegerField()
    montant_ouverture = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)


class FermerSessionSerializer(serializers.Serializer):
    montant_fermeture = serializers.DecimalField(max_digits=12, decimal_places=2)

from decimal import Decimal

from rest_framework import serializers

from apps.commun.constantes import TypeMouvementCaisse
from .models import Caisse, SessionCaissier, MouvementCaisse
from .services import calculer_resume


class MouvementCaisseSerializer(serializers.ModelSerializer):
    type_libelle = serializers.CharField(source="get_type_mouvement_display", read_only=True)
    mode_paiement_nom = serializers.CharField(source="mode_paiement.nom", read_only=True, default="Especes")
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = MouvementCaisse
        fields = [
            "id", "session", "type_mouvement", "type_libelle", "montant", "mode_paiement_nom",
            "reference_document", "commentaire", "utilisateur_nom", "date_mouvement",
        ]

    def get_utilisateur_nom(self, obj):
        return str(obj.utilisateur) if obj.utilisateur else ""


class CaisseSerializer(serializers.ModelSerializer):
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)

    class Meta:
        model = Caisse
        fields = ["id", "nom", "depot", "depot_nom", "etat"]


class SessionCaissierSerializer(serializers.ModelSerializer):
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)
    caisse_nom = serializers.CharField(source="caisse.nom", read_only=True, default="")
    caissier_nom = serializers.SerializerMethodField()
    fermee_par_nom = serializers.SerializerMethodField()
    solde = serializers.SerializerMethodField()
    resume = serializers.SerializerMethodField()

    class Meta:
        model = SessionCaissier
        fields = [
            "id", "depot", "depot_nom", "caisse", "caisse_nom", "utilisateur", "caissier_nom", "statut",
            "montant_ouverture", "montant_fermeture", "montant_attendu", "ecart", "note",
            "date_ouverture", "date_fermeture", "fermee_par_nom", "solde", "resume",
        ]

    def get_caissier_nom(self, obj):
        return str(obj.utilisateur)

    def get_fermee_par_nom(self, obj):
        return str(obj.fermee_par) if obj.fermee_par else ""

    def get_resume(self, obj):
        return {cle: str(valeur) if isinstance(valeur, Decimal) else valeur
                for cle, valeur in calculer_resume(obj).items()}

    def get_solde(self, obj):
        return self.get_resume(obj)["montant_attendu"]


class OuvrirSessionSerializer(serializers.Serializer):
    depot = serializers.IntegerField()
    caisse = serializers.IntegerField(required=False, allow_null=True)
    montant_ouverture = serializers.DecimalField(max_digits=12, decimal_places=2, default=0, min_value=0)


class FermerSessionSerializer(serializers.Serializer):
    montant_fermeture = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class MouvementManuelSerializer(serializers.Serializer):
    type_mouvement = serializers.ChoiceField(
        choices=[TypeMouvementCaisse.ENTREE_CAISSE, TypeMouvementCaisse.SORTIE_CAISSE]
    )
    montant = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    motif = serializers.CharField(max_length=255)

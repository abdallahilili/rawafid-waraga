from rest_framework import serializers
from apps.facturation.models import ModePaiement
from .models import Vente, LigneVente, PaiementVente, TypeLigneVente


class LigneVenteSerializer(serializers.ModelSerializer):
    article_nom = serializers.CharField(source="article.nom", read_only=True, default=None)
    reference_commande_impression = serializers.CharField(
        source="commande_impression.reference", read_only=True, default=None
    )

    class Meta:
        model = LigneVente
        fields = [
            "id", "type_ligne", "article", "article_nom", "designation", "quantite",
            "commande_impression", "reference_commande_impression",
            "prix_unitaire", "montant",
        ]


class PaiementVenteSerializer(serializers.ModelSerializer):
    mode_paiement_nom = serializers.CharField(source="mode_paiement.nom", read_only=True)

    class Meta:
        model = PaiementVente
        fields = ["id", "mode_paiement", "mode_paiement_nom", "montant", "reference_transaction"]


class VenteSerializer(serializers.ModelSerializer):
    lignes = LigneVenteSerializer(many=True, read_only=True)
    paiements = PaiementVenteSerializer(many=True, read_only=True)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True)
    caissier_nom = serializers.SerializerMethodField()

    class Meta:
        model = Vente
        fields = [
            "id", "reference", "depot", "depot_nom", "session_caissier", "caissier_nom",
            "nom_client", "montant_total", "montant_recu", "monnaie_rendue", "annulee",
            "date_vente",
            "lignes", "paiements",
        ]

    def get_caissier_nom(self, obj):
        return str(obj.utilisateur) if obj.utilisateur else None


class LigneVenteEcritureSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=TypeLigneVente.CHOIX)
    article = serializers.IntegerField(required=False)
    quantite = serializers.IntegerField(required=False, min_value=1)
    commande_impression = serializers.IntegerField(required=False)
    tarif = serializers.IntegerField(required=False)


class PaiementEntreeSerializer(serializers.Serializer):
    mode_paiement = serializers.PrimaryKeyRelatedField(queryset=ModePaiement.objects.filter(etat=True))
    montant = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    reference_transaction = serializers.CharField(required=False, allow_blank=True, max_length=60, default="")


class CreerVenteSerializer(serializers.Serializer):
    depot = serializers.IntegerField()
    nom_client = serializers.CharField(required=False, allow_blank=True, default="")
    # Avec `paiements` : especes remises par le client (facultatif, sert au calcul du rendu).
    # Sans `paiements` : montant remis, reglement integral en especes.
    montant_recu = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    paiements = PaiementEntreeSerializer(many=True, required=False)
    lignes = LigneVenteEcritureSerializer(many=True)

from rest_framework import serializers
from .models import JournalAudit


class MasquerPrixAchatMixin:
    """Mixin de serializer qui masque les champs de prix d'achat/valeur
    de stock pour les utilisateurs sans la permission
    articles.voir_prix_achat (ils ne voient que les prix de vente)."""

    champs_prix_achat = ("prix_achat", "valeur_stock")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        utilisateur = getattr(request, "user", None) if request else None
        if utilisateur and not (
            utilisateur.is_superuser or utilisateur.a_permission("articles.voir_prix_achat")
        ):
            for champ in self.champs_prix_achat:
                data.pop(champ, None)
        return data


class JournalAuditSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = JournalAudit
        fields = [
            "id", "date_action", "utilisateur", "utilisateur_nom", "action",
            "modele", "reference_objet", "ancienne_valeur", "nouvelle_valeur",
        ]

    def get_utilisateur_nom(self, obj):
        return str(obj.utilisateur) if obj.utilisateur else "Systeme"

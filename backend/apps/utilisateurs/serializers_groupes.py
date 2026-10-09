from rest_framework import serializers

from .models import Groupe, Fonctionnalite, Fonction


class GroupeSerializer(serializers.ModelSerializer):
    nombre_utilisateurs = serializers.IntegerField(read_only=True, default=0)
    # Liste des noms (codes) de fonctionnalites du groupe.
    fonctionnalites = serializers.SlugRelatedField(
        slug_field="nom", many=True, queryset=Fonctionnalite.objects.all(), required=False,
    )

    class Meta:
        model = Groupe
        fields = ["id", "nom", "description", "etat", "fonctionnalites", "nombre_utilisateurs"]


class FonctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fonction
        fields = ["id", "nom", "description"]

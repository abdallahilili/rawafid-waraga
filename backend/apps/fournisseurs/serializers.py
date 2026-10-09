from rest_framework import serializers
from .models import Fournisseur


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ["id", "nom", "sigle", "adresse", "telephone1", "telephone2", "email", "actif"]

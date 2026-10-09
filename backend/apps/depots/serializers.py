from rest_framework import serializers
from .models import Depot


class DepotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depot
        fields = ["id", "nom", "code", "adresse", "telephone", "est_point_de_vente", "actif"]

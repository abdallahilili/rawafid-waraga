from rest_framework import filters
from apps.commun.vues_base import ViewSetGestion
from .models import Fournisseur
from .serializers import FournisseurSerializer


class FournisseurViewSet(ViewSetGestion):
    queryset = Fournisseur.objects.all().order_by("nom")
    serializer_class = FournisseurSerializer
    permission_lecture = ["fournisseurs.voir", "achats.creer"]
    permission_ecriture = "fournisseurs.gerer"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nom", "sigle", "email"]

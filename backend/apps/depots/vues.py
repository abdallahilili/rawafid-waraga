from rest_framework import filters
from apps.commun.vues_base import ViewSetGestion
from .models import Depot
from .serializers import DepotSerializer


class DepotViewSet(ViewSetGestion):
    queryset = Depot.objects.all().order_by("nom")
    serializer_class = DepotSerializer
    permission_lecture = None
    permission_ecriture = "depots.gerer"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nom", "code"]
    pagination_class = None

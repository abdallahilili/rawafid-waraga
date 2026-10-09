from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.commun.permissions import PermissionParCode
from apps.commun.vues_base import ViewSetGestion
from apps.depots.models import Depot
from .models import TarifImpression, CommandeImpression
from .serializers import (
    TarifImpressionSerializer, CommandeImpressionSerializer,
    CreerCommandeImpressionSerializer, ChangerStatutSerializer,
)
from . import services


class TarifImpressionViewSet(ViewSetGestion):
    queryset = TarifImpression.objects.select_related("depot").all()
    serializer_class = TarifImpressionSerializer
    permission_lecture = ["tarifs_impression.voir", "impression.creer"]
    permission_ecriture = "tarifs_impression.gerer"
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        depot = self.request.query_params.get("depot")
        if depot:
            qs = qs.filter(depot_id=depot)
        return qs


class CommandeImpressionViewSet(viewsets.ModelViewSet):
    queryset = CommandeImpression.objects.select_related("depot").prefetch_related("lignes").all()
    serializer_class = CommandeImpressionSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = ["impression.voir", "ventes.creer"]
    permissions_par_action = {
        "create": "impression.creer",
        "changer_statut": "impression.changer_statut",
    }
    http_method_names = ["get", "post", "head", "options"]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "nom_client", "telephone_client"]
    ordering_fields = ["date_commande"]

    def get_queryset(self):
        qs = super().get_queryset()
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        depot = self.request.query_params.get("depot")
        if depot:
            qs = qs.filter(depot_id=depot)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = CreerCommandeImpressionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        depot = Depot.objects.get(pk=donnees["depot"])
        commande = services.creer_commande_impression(
            depot, donnees["lignes"],
            nom_client=donnees.get("nom_client", ""),
            telephone_client=donnees.get("telephone_client", ""),
            date_livraison_prevue=donnees.get("date_livraison_prevue"),
            utilisateur=request.user,
        )
        return Response(CommandeImpressionSerializer(commande).data, status=201)

    @action(detail=True, methods=["post"])
    def changer_statut(self, request, pk=None):
        commande = self.get_object()
        serializer = ChangerStatutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        commande = services.changer_statut(
            commande, serializer.validated_data["statut"], utilisateur=request.user
        )
        return Response(CommandeImpressionSerializer(commande).data)


class CalculerPrixImpressionView(APIView):
    """Calcule le prix d'une ligne cote serveur, pour previsualisation
    instantanee dans l'interface avant creation de la commande."""

    permission_classes = [PermissionParCode]
    permission_lecture = "impression.creer"

    def get(self, request):
        depot_id = request.query_params.get("depot")
        type_travail = request.query_params.get("type_travail")
        format_papier = request.query_params.get("format_papier")
        couleur = request.query_params.get("couleur")
        nombre_pages = int(request.query_params.get("nombre_pages", 1))
        nombre_copies = int(request.query_params.get("nombre_copies", 1))

        depot = Depot.objects.get(pk=depot_id)
        prix_unitaire = services.obtenir_tarif(depot, type_travail, format_papier, couleur)
        montant = prix_unitaire * nombre_pages * nombre_copies
        return Response({"prix_unitaire_page": str(prix_unitaire), "montant": str(montant)})

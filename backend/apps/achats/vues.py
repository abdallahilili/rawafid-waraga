from rest_framework import viewsets, filters
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.commun.permissions import PermissionParCode
from apps.articles.models import Article
from apps.fournisseurs.models import Fournisseur
from apps.depots.models import Depot
from .models import Achat
from .serializers import AchatSerializer, CreerAchatSerializer
from . import services


class AchatViewSet(viewsets.ModelViewSet):
    queryset = Achat.objects.select_related("fournisseur", "depot").prefetch_related("lignes__article").all()
    serializer_class = AchatSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "achats.voir"
    permissions_par_action = {
        "create": "achats.creer",
        "valider": "achats.valider",
        "annuler": "achats.annuler",
    }
    http_method_names = ["get", "post", "head", "options"]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference"]
    ordering_fields = ["date_achat"]

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
        serializer = CreerAchatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        fournisseur = Fournisseur.objects.get(pk=donnees["fournisseur"])
        depot = Depot.objects.get(pk=donnees["depot"])
        lignes = []
        for ligne in donnees["lignes"]:
            lignes.append({
                "article": Article.objects.get(pk=ligne["article"]),
                "quantite": ligne["quantite"],
                "prix_unitaire": ligne["prix_unitaire"],
            })
        achat = services.creer_achat(fournisseur, depot, lignes, utilisateur=request.user)
        return Response(AchatSerializer(achat).data, status=201)

    @action(detail=True, methods=["post"])
    def valider(self, request, pk=None):
        achat = self.get_object()
        achat = services.valider_achat(achat, utilisateur=request.user)
        return Response(AchatSerializer(achat).data)

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):
        achat = self.get_object()
        achat = services.annuler_achat(achat, utilisateur=request.user)
        return Response(AchatSerializer(achat).data)

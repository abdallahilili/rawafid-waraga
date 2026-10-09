from rest_framework import filters, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import F

from apps.commun.permissions import PermissionParCode
from apps.articles.models import Article
from apps.depots.models import Depot
from .models import Stock, MouvementStock, Inventaire
from .serializers import (
    StockSerializer, MouvementStockSerializer, EntreeStockSerializer,
    SortieStockSerializer, TransfertStockSerializer, InventaireSerializer,
    AjusterInventaireSerializer,
)
from . import services


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.select_related("article", "article__categorie", "depot").all()
    serializer_class = StockSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = ["stock.voir", "caisse.voir"]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["article__nom", "article__reference"]
    ordering_fields = ["quantite"]

    def get_queryset(self):
        qs = super().get_queryset()
        depot = self.request.query_params.get("depot")
        if depot:
            qs = qs.filter(depot_id=depot)
        rupture = self.request.query_params.get("rupture")
        if rupture == "true":
            qs = qs.filter(quantite__lte=F("article__seuil_alerte"))
        return qs


class MouvementStockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MouvementStock.objects.select_related("article", "depot", "utilisateur").all()
    serializer_class = MouvementStockSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "stock.voir_mouvements"
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["date_mouvement"]

    def get_queryset(self):
        qs = super().get_queryset()
        depot = self.request.query_params.get("depot")
        if depot:
            qs = qs.filter(depot_id=depot)
        article = self.request.query_params.get("article")
        if article:
            qs = qs.filter(article_id=article)
        return qs


class EntreeStockView(APIView):
    permission_classes = [PermissionParCode]
    permission_ecriture = "stock.entree"

    def post(self, request):
        serializer = EntreeStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        article = Article.objects.get(pk=donnees["article"])
        depot = Depot.objects.get(pk=donnees["depot"])
        stock, mouvement = services.enregistrer_entree(
            article, depot, donnees["quantite"], donnees["prix_unitaire"],
            reference_document="ENTREE_MANUELLE",
            commentaire=donnees.get("commentaire", ""),
            utilisateur=request.user,
        )
        return Response(StockSerializer(stock, context={"request": request}).data, status=201)


class SortieStockView(APIView):
    permission_classes = [PermissionParCode]
    permission_ecriture = "stock.sortie"

    def post(self, request):
        serializer = SortieStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        article = Article.objects.get(pk=donnees["article"])
        depot = Depot.objects.get(pk=donnees["depot"])
        stock, mouvement = services.enregistrer_sortie(
            article, depot, donnees["quantite"],
            reference_document="SORTIE_MANUELLE",
            commentaire=donnees.get("commentaire", ""),
            utilisateur=request.user,
        )
        return Response(StockSerializer(stock, context={"request": request}).data, status=201)


class TransfertStockView(APIView):
    permission_classes = [PermissionParCode]
    permission_ecriture = "stock.transfert"

    def post(self, request):
        serializer = TransfertStockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        article = Article.objects.get(pk=donnees["article"])
        depot_source = Depot.objects.get(pk=donnees["depot_source"])
        depot_destination = Depot.objects.get(pk=donnees["depot_destination"])
        stock = services.transferer_stock(
            article, depot_source, depot_destination, donnees["quantite"],
            reference_document="TRANSFERT", utilisateur=request.user,
        )
        return Response(StockSerializer(stock, context={"request": request}).data, status=201)


class InventaireViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Inventaire.objects.select_related("article", "depot").all()
    serializer_class = InventaireSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "stock.voir_mouvements"


class AjusterInventaireView(APIView):
    permission_classes = [PermissionParCode]
    permission_ecriture = "stock.inventaire"

    def post(self, request):
        serializer = AjusterInventaireSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        article = Article.objects.get(pk=donnees["article"])
        depot = Depot.objects.get(pk=donnees["depot"])
        ecart = services.ajuster_inventaire(
            article, depot, donnees["quantite_physique"], utilisateur=request.user,
        )
        return Response({"ecart": ecart}, status=201)

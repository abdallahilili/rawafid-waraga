from django.urls import path
from rest_framework.routers import DefaultRouter
from .vues import (
    StockViewSet, MouvementStockViewSet, EntreeStockView, SortieStockView,
    TransfertStockView, InventaireViewSet, AjusterInventaireView,
)

routeur = DefaultRouter()
routeur.register("niveaux", StockViewSet, basename="stock-niveau")
routeur.register("mouvements", MouvementStockViewSet, basename="mouvement-stock")
routeur.register("inventaires", InventaireViewSet, basename="inventaire")

urlpatterns = [
    path("entree/", EntreeStockView.as_view(), name="stock-entree"),
    path("sortie/", SortieStockView.as_view(), name="stock-sortie"),
    path("transfert/", TransfertStockView.as_view(), name="stock-transfert"),
    path("ajuster-inventaire/", AjusterInventaireView.as_view(), name="stock-ajuster-inventaire"),
] + routeur.urls

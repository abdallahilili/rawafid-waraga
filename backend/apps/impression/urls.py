from django.urls import path
from rest_framework.routers import DefaultRouter
from .vues import TarifImpressionViewSet, CommandeImpressionViewSet, CalculerPrixImpressionView

routeur = DefaultRouter()
routeur.register("tarifs", TarifImpressionViewSet, basename="tarif-impression")
routeur.register("commandes", CommandeImpressionViewSet, basename="commande-impression")

urlpatterns = [
    path("calculer-prix/", CalculerPrixImpressionView.as_view(), name="calculer-prix-impression"),
] + routeur.urls

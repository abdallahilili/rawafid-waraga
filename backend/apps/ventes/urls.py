from rest_framework.routers import DefaultRouter
from .vues import VenteViewSet

routeur = DefaultRouter()
routeur.register("", VenteViewSet, basename="vente")
urlpatterns = routeur.urls

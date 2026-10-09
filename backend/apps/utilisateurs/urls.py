from rest_framework.routers import DefaultRouter
from django.urls import path
from .vues import UtilisateurViewSet, GroupeViewSet, FonctionViewSet, CataloguePermissionsView

routeur = DefaultRouter()
routeur.register("groupes", GroupeViewSet, basename="groupe")
routeur.register("fonctions", FonctionViewSet, basename="fonction")
routeur.register("", UtilisateurViewSet, basename="utilisateur")

urlpatterns = [
    path("permissions/", CataloguePermissionsView.as_view(), name="catalogue-permissions"),
] + routeur.urls

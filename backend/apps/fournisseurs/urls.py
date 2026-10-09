from rest_framework.routers import DefaultRouter
from .vues import FournisseurViewSet

routeur = DefaultRouter()
routeur.register("", FournisseurViewSet, basename="fournisseur")
urlpatterns = routeur.urls

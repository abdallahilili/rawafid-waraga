from rest_framework.routers import DefaultRouter
from .vues import DepotViewSet

routeur = DefaultRouter()
routeur.register("", DepotViewSet, basename="depot")
urlpatterns = routeur.urls

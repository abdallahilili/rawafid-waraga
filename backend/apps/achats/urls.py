from rest_framework.routers import DefaultRouter
from .vues import AchatViewSet

routeur = DefaultRouter()
routeur.register("", AchatViewSet, basename="achat")
urlpatterns = routeur.urls

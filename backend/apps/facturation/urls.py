from rest_framework.routers import DefaultRouter
from .vues import ClientViewSet, ModePaiementViewSet, ExpressionBesoinsViewSet

routeur = DefaultRouter()
routeur.register("clients", ClientViewSet, basename="client")
routeur.register("modes-paiement", ModePaiementViewSet, basename="mode-paiement")
routeur.register("documents", ExpressionBesoinsViewSet, basename="expression-besoins")
urlpatterns = routeur.urls

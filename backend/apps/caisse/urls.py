from django.urls import path
from rest_framework.routers import DefaultRouter
from .vues import CaisseViewSet, SessionCaissierViewSet, SessionActuelleView, OuvrirSessionView, FermerSessionView

routeur = DefaultRouter()
routeur.register("caisses", CaisseViewSet, basename="caisse")
routeur.register("sessions", SessionCaissierViewSet, basename="session-caissier")

urlpatterns = [
    path("session-actuelle/", SessionActuelleView.as_view(), name="session-actuelle"),
    path("ouvrir-session/", OuvrirSessionView.as_view(), name="ouvrir-session"),
    path("sessions/<int:pk>/fermer/", FermerSessionView.as_view(), name="fermer-session"),
] + routeur.urls

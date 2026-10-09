from django.urls import path
from .vues import ConnexionView, RafraichirTokenView, MoiView

urlpatterns = [
    path("connexion/", ConnexionView.as_view(), name="connexion"),
    path("rafraichir/", RafraichirTokenView.as_view(), name="rafraichir"),
    path("moi/", MoiView.as_view(), name="moi"),
]

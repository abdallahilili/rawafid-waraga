from django.urls import path
from .vues import TableauDeBordView, RapportVentesView, RapportStockView, RapportImpressionView

urlpatterns = [
    path("tableau-de-bord/", TableauDeBordView.as_view(), name="tableau-de-bord"),
    path("ventes/", RapportVentesView.as_view(), name="rapport-ventes"),
    path("stock/", RapportStockView.as_view(), name="rapport-stock"),
    path("impression/", RapportImpressionView.as_view(), name="rapport-impression"),
]

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.utilisateurs.urls_auth")),
    path("api/utilisateurs/", include("apps.utilisateurs.urls")),
    path("api/depots/", include("apps.depots.urls")),
    path("api/articles/", include("apps.articles.urls")),
    path("api/fournisseurs/", include("apps.fournisseurs.urls")),
    path("api/stock/", include("apps.stock.urls")),
    path("api/achats/", include("apps.achats.urls")),
    path("api/impression/", include("apps.impression.urls")),
    path("api/ventes/", include("apps.ventes.urls")),
    path("api/caisse/", include("apps.caisse.urls")),
    path("api/facturation/", include("apps.facturation.urls")),
    path("api/rapports/", include("apps.rapports.urls")),
    path("api/", include("apps.commun.urls")),
]

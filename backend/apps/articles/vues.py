from rest_framework import filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, F

from apps.commun.permissions import PermissionParCode
from apps.commun.vues_base import ViewSetGestion
from .models import Article, Categorie
from .serializers import ArticleSerializer, CategorieSerializer


class CategorieViewSet(ViewSetGestion):
    queryset = Categorie.objects.all().order_by("nom")
    serializer_class = CategorieSerializer
    permission_lecture = None
    permission_ecriture = "articles.gerer"
    pagination_class = None
    filter_backends = [filters.SearchFilter]
    search_fields = ["nom"]


class ArticleViewSet(ViewSetGestion):
    queryset = Article.objects.select_related("categorie").all().order_by("nom")
    serializer_class = ArticleSerializer
    permission_lecture = [
        "articles.voir", "caisse.voir", "ventes.creer", "achats.creer",
        "stock.voir",
    ]
    permissions_par_action = {
        "create": "articles.gerer",
        "update": "articles.gerer",
        "partial_update": "articles.gerer",
        "destroy": "articles.supprimer",
    }
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nom", "reference", "code_barre"]
    ordering_fields = ["nom", "prix_vente", "date_creation"]

    def get_queryset(self):
        qs = super().get_queryset()
        categorie = self.request.query_params.get("categorie")
        if categorie:
            qs = qs.filter(categorie_id=categorie)
        actif = self.request.query_params.get("actif")
        if actif is not None:
            qs = qs.filter(actif=actif == "true")
        return qs


class RechercheCaisseArticleView(APIView):
    """Recherche rapide d'articles pour l'ecran de vente (POS)."""

    permission_classes = [PermissionParCode]
    permission_lecture = ["caisse.voir", "ventes.creer"]

    def get(self, request):
        terme = request.query_params.get("q", "").strip()
        depot_id = request.query_params.get("depot")
        qs = Article.objects.filter(actif=True)
        if terme:
            qs = qs.filter(nom__icontains=terme) | qs.filter(reference__icontains=terme) \
                 | qs.filter(code_barre__icontains=terme)
        qs = qs.select_related("categorie")[:20]

        from apps.stock.models import Stock
        resultats = []
        for article in qs:
            stock_qs = Stock.objects.filter(article=article)
            if depot_id:
                stock_qs = stock_qs.filter(depot_id=depot_id)
            quantite = stock_qs.aggregate(total=Sum("quantite"))["total"] or 0
            resultats.append({
                "id": article.id,
                "nom": article.nom,
                "reference": article.reference,
                "unite": article.unite,
                "prix_vente": str(article.prix_vente),
                "categorie_nom": article.categorie.nom if article.categorie else None,
                "quantite_disponible": quantite,
            })
        return Response(resultats)

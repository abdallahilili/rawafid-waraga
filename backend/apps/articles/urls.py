from django.urls import path
from rest_framework.routers import DefaultRouter
from .vues import ArticleViewSet, CategorieViewSet, RechercheCaisseArticleView

routeur = DefaultRouter()
routeur.register("categories", CategorieViewSet, basename="categorie")
routeur.register("", ArticleViewSet, basename="article")

urlpatterns = [
    path("recherche-caisse/", RechercheCaisseArticleView.as_view(), name="recherche-caisse-article"),
] + routeur.urls

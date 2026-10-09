from rest_framework import viewsets, filters
from rest_framework.response import Response

from apps.commun.permissions import PermissionParCode
from apps.commun.exceptions import ErreurMetier
from apps.depots.models import Depot
from apps.articles.models import Article
from apps.impression.models import CommandeImpression
from apps.caisse import services as caisse_services
from .models import Vente, TypeLigneVente
from .serializers import VenteSerializer, CreerVenteSerializer
from . import services


class VenteViewSet(viewsets.ModelViewSet):
    queryset = Vente.objects.select_related("depot", "utilisateur").prefetch_related(
        "lignes__article", "lignes__commande_impression"
    ).all()
    serializer_class = VenteSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "ventes.voir"
    permission_ecriture = "ventes.creer"
    http_method_names = ["get", "post", "head", "options"]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "nom_client"]
    ordering_fields = ["date_vente"]

    def get_queryset(self):
        qs = super().get_queryset()
        utilisateur = self.request.user
        if not (utilisateur.is_superuser or utilisateur.a_permission("ventes.voir_toutes")):
            qs = qs.filter(utilisateur=utilisateur)
        depot = self.request.query_params.get("depot")
        if depot:
            qs = qs.filter(depot_id=depot)
        session = self.request.query_params.get("session")
        if session:
            qs = qs.filter(session_caissier_id=session)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = CreerVenteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data

        session = caisse_services.session_ouverte_pour(request.user)
        if not session:
            raise ErreurMetier("Vous devez ouvrir une session de caisse avant d'encaisser une vente.")

        depot = Depot.objects.get(pk=donnees["depot"])
        lignes = []
        for ligne in donnees["lignes"]:
            if ligne["type"] == TypeLigneVente.ARTICLE:
                lignes.append({
                    "type": TypeLigneVente.ARTICLE,
                    "article": Article.objects.get(pk=ligne["article"]),
                    "quantite": ligne["quantite"],
                })
            else:
                lignes.append({
                    "type": TypeLigneVente.IMPRESSION,
                    "commande_impression": CommandeImpression.objects.get(pk=ligne["commande_impression"]),
                })

        vente = services.creer_vente(
            depot, session, lignes, donnees["montant_recu"],
            nom_client=donnees.get("nom_client", ""), utilisateur=request.user,
        )
        return Response(VenteSerializer(vente).data, status=201)

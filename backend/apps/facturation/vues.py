from django.shortcuts import get_object_or_404
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.articles.models import Article
from apps.commun.exceptions import ErreurMetier
from apps.impression.models import TarifImpression
from apps.commun.permissions import PermissionParCode
from apps.commun.vues_base import ViewSetGestion
from . import services
from .models import Client, ModePaiement, ExpressionBesoins
from .serializers import (
    ClientSerializer, ModePaiementSerializer, ExpressionSerializer, DevisEcritureSerializer,
    ValiderBLSerializer, ValiderFactureSerializer, PayerSerializer,
)


class ClientViewSet(ViewSetGestion):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_lecture = ["clients.voir", "facturation.creer"]
    permission_ecriture = "clients.gerer"
    filter_backends = [filters.SearchFilter]
    search_fields = ["nom", "prenom", "num_client"]

    def perform_destroy(self, instance):
        # Un client reste dans l'historique : on le desactive.
        instance.etat = False
        instance.save(update_fields=["etat"])


class ModePaiementViewSet(ViewSetGestion):
    queryset = ModePaiement.objects.all()
    serializer_class = ModePaiementSerializer
    permission_lecture = None
    permission_ecriture = "administration.parametres"
    pagination_class = None


def _lignes_devis(donnees):
    lignes = []
    for ligne in donnees["lignes"]:
        if bool(ligne.get("article")) == bool(ligne.get("tarif")):
            raise ErreurMetier("Chaque ligne doit porter un article ou un service.")
        lignes.append({
            "article": get_object_or_404(Article, pk=ligne["article"]) if ligne.get("article") else None,
            "tarif": get_object_or_404(TarifImpression, pk=ligne["tarif"]) if ligne.get("tarif") else None,
            "quantite": ligne["quantite"], "prix": ligne.get("prix"),
        })
    return lignes


class ExpressionBesoinsViewSet(viewsets.ReadOnlyModelViewSet):
    """Devis, bons de livraison et factures des clients."""

    queryset = ExpressionBesoins.objects.select_related(
        "client", "personnel", "depot"
    ).prefetch_related("lignes__article", "paiements__mode_paiement", "paiements__personnel")
    serializer_class = ExpressionSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "facturation.voir"
    permissions_par_action = {
        "creer": "facturation.creer",
        "modifier": "facturation.creer",
        "valider_bl": "facturation.valider_bl",
        "valider_facture": "facturation.valider_facture",
        "payer": "facturation.paiement",
    }
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["reference", "numero_bl", "numero_facture", "client__nom", "client__prenom"]
    ordering_fields = ["id", "prix_total"]

    def get_queryset(self):
        qs = super().get_queryset()
        for parametre, champ in (("etat", "etat"), ("etat_paiement", "etat_paiement"), ("client", "client_id")):
            valeur = self.request.query_params.get(parametre)
            if valeur not in (None, ""):
                qs = qs.filter(**{champ: valeur})
        return qs

    def _reponse(self, expression, statut=200):
        expression = self.get_queryset().get(pk=expression.pk)
        return Response(ExpressionSerializer(expression).data, status=statut)

    @action(detail=False, methods=["post"])
    def creer(self, request):
        serializer = DevisEcritureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        client = get_object_or_404(Client, pk=donnees["client"])
        expression = services.creer_devis(
            client, request.user, _lignes_devis(donnees), type_document=donnees.get("type", ""),
        )
        return self._reponse(expression, 201)

    @action(detail=True, methods=["post"])
    def modifier(self, request, pk=None):
        serializer = DevisEcritureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        client = get_object_or_404(Client, pk=donnees["client"])
        expression = services.modifier_devis(self.get_object(), _lignes_devis(donnees), client=client)
        return self._reponse(expression)

    @action(detail=True, methods=["post"])
    def valider_bl(self, request, pk=None):
        serializer = ValiderBLSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        quantites = {l["ligne"]: l["quantite_livre"] for l in donnees.get("lignes", [])}
        expression = services.valider_bon_livraison(
            self.get_object(), quantites, donnees.get("date_bc"), utilisateur=request.user,
        )
        return self._reponse(expression)

    @action(detail=True, methods=["post"])
    def valider_facture(self, request, pk=None):
        serializer = ValiderFactureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expression = services.valider_facture(self.get_object(), serializer.validated_data.get("date_fc"))
        return self._reponse(expression)

    @action(detail=True, methods=["post"])
    def payer(self, request, pk=None):
        serializer = PayerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        mode = get_object_or_404(ModePaiement, pk=donnees["mode_paiement"])
        expression = self.get_object()
        services.payer_facture(expression, donnees["montant"], mode, request.user)
        return self._reponse(expression)

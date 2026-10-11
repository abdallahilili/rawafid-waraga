from django.shortcuts import get_object_or_404
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.commun.permissions import PermissionParCode
from apps.commun.vues_base import ViewSetGestion
from apps.depots.models import Depot
from .models import Caisse, SessionCaissier
from .serializers import (
    CaisseSerializer, SessionCaissierSerializer, OuvrirSessionSerializer,
    FermerSessionSerializer, MouvementCaisseSerializer, MouvementManuelSerializer,
)
from . import services


class CaisseViewSet(ViewSetGestion):
    queryset = Caisse.objects.select_related("depot").all()
    serializer_class = CaisseSerializer
    permission_lecture = None
    permission_ecriture = "administration.parametres"
    pagination_class = None


class SessionCaissierViewSet(viewsets.ReadOnlyModelViewSet):
    """Journal de session : historique des sessions, resume et mouvements."""

    queryset = SessionCaissier.objects.select_related(
        "depot", "caisse", "utilisateur", "fermee_par"
    ).all()
    serializer_class = SessionCaissierSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "journal_caisse.voir"
    permissions_par_action = {"mouvement_manuel": "caisse.mouvements_manuels"}
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["utilisateur__nom", "utilisateur__prenom", "caisse__nom"]
    ordering_fields = ["date_ouverture", "date_fermeture", "ecart"]

    def get_queryset(self):
        qs = super().get_queryset()
        u = self.request.user
        if not (u.is_superuser or u.a_permission("caisse.voir_toutes_sessions")
                or u.a_permission("caisse.fermer_sessions_autres")):
            qs = qs.filter(utilisateur=u)
        p = self.request.query_params
        for parametre, champ in (("statut", "statut"), ("utilisateur", "utilisateur_id"), ("caisse", "caisse_id")):
            if p.get(parametre):
                qs = qs.filter(**{champ: p[parametre]})
        if p.get("date_debut"):
            qs = qs.filter(date_ouverture__date__gte=p["date_debut"])
        if p.get("date_fin"):
            qs = qs.filter(date_ouverture__date__lte=p["date_fin"])
        return qs

    @action(detail=True, methods=["get"])
    def mouvements(self, request, pk=None):
        session = self.get_object()
        qs = session.mouvements.select_related("mode_paiement", "utilisateur").order_by("date_mouvement", "id")
        return Response(MouvementCaisseSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="mouvement-manuel")
    def mouvement_manuel(self, request, pk=None):
        session = self.get_object()
        serializer = MouvementManuelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        mouvement = services.ajouter_mouvement_manuel(
            session, request.user, donnees["type_mouvement"], donnees["montant"], donnees["motif"],
        )
        return Response(MouvementCaisseSerializer(mouvement).data, status=201)


class SessionActuelleView(APIView):
    def get(self, request):
        session = services.session_ouverte_pour(request.user)
        if not session:
            return Response(None)
        return Response(SessionCaissierSerializer(session).data)


class OuvrirSessionView(APIView):
    permission_classes = [PermissionParCode]
    permission_ecriture = "caisse.ouvrir_fermer"

    def post(self, request):
        serializer = OuvrirSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        depot = get_object_or_404(Depot, pk=donnees["depot"])
        caisse = get_object_or_404(Caisse, pk=donnees["caisse"]) if donnees.get("caisse") else None
        session = services.ouvrir_session(depot, request.user, donnees["montant_ouverture"], caisse)
        return Response(SessionCaissierSerializer(session).data, status=201)


class FermerSessionView(APIView):
    """Cloture de session : par son caissier (caisse.ouvrir_fermer) ou, pour la
    session d'un autre, par un utilisateur ayant caisse.fermer_sessions_autres."""

    permission_classes = [PermissionParCode]
    permission_ecriture = ["caisse.ouvrir_fermer", "caisse.fermer_sessions_autres"]

    def post(self, request, pk):
        session = get_object_or_404(SessionCaissier, pk=pk)
        serializer = FermerSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data
        session = services.fermer_session(
            session, donnees["montant_fermeture"], utilisateur=request.user, note=donnees.get("note", ""),
        )
        return Response(SessionCaissierSerializer(session).data)

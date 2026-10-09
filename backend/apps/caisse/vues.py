from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.commun.permissions import PermissionParCode
from apps.depots.models import Depot
from .models import SessionCaissier
from .serializers import SessionCaissierSerializer, OuvrirSessionSerializer, FermerSessionSerializer
from . import services


class SessionCaissierViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SessionCaissier.objects.select_related("depot", "utilisateur").prefetch_related("mouvements").all()
    serializer_class = SessionCaissierSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = ["caisse.voir", "ventes.voir"]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.a_permission("caisse.voir_toutes_sessions")                 and not self.request.user.is_superuser:
            qs = qs.filter(utilisateur=self.request.user)
        return qs


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
        depot = Depot.objects.get(pk=donnees["depot"])
        session = services.ouvrir_session(depot, request.user, donnees["montant_ouverture"])
        return Response(SessionCaissierSerializer(session).data, status=201)


class FermerSessionView(APIView):
    permission_classes = [PermissionParCode]
    permission_ecriture = "caisse.ouvrir_fermer"

    def post(self, request, pk):
        session = SessionCaissier.objects.get(pk=pk)
        serializer = FermerSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = services.fermer_session(session, serializer.validated_data["montant_fermeture"])
        return Response(SessionCaissierSerializer(session).data)

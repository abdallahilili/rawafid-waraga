from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, filters
from django.db import transaction

from .models import Parametre, JournalAudit
from .serializers import JournalAuditSerializer
from .permissions import PermissionParCode


class ParametresView(APIView):
    permission_classes = [PermissionParCode]
    permissions_par_action = {"put": "administration.parametres"}

    def get(self, request):
        parametres = {p.cle: p.valeur for p in Parametre.objects.all()}
        return Response(parametres)

    def put(self, request):
        with transaction.atomic():
            for cle, valeur in request.data.items():
                Parametre.objects.update_or_create(
                    cle=cle, defaults={"valeur": str(valeur)}
                )
        parametres = {p.cle: p.valeur for p in Parametre.objects.all()}
        return Response(parametres)


class JournalAuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JournalAudit.objects.select_related("utilisateur").all()
    serializer_class = JournalAuditSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "administration.journal"
    permission_ecriture = []
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["modele", "action", "reference_objet"]
    ordering_fields = ["date_action"]

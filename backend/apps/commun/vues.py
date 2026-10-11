from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, filters
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .constantes import PARAMETRES_PAR_DEFAUT
from .models import Parametre, JournalAudit
from .serializers import JournalAuditSerializer
from .permissions import PermissionParCode


def _parametres_courants():
    """Valeurs par defaut completees par celles enregistrees."""
    valeurs = {cle: defaut for cle, (defaut, _) in PARAMETRES_PAR_DEFAUT.items()}
    valeurs.update({p.cle: p.valeur for p in Parametre.objects.all()})
    return valeurs


class ParametresView(APIView):
    permission_classes = [PermissionParCode]
    permissions_par_action = {"put": "administration.parametres"}

    def get(self, request):
        return Response(_parametres_courants())

    def put(self, request):
        inconnues = [c for c in request.data if c not in PARAMETRES_PAR_DEFAUT]
        if inconnues:
            raise ValidationError({"detail": f"Parametre inconnu : {', '.join(inconnues)}"})
        with transaction.atomic():
            for cle, valeur in request.data.items():
                Parametre.objects.update_or_create(
                    cle=cle,
                    defaults={"valeur": str(valeur), "description": PARAMETRES_PAR_DEFAUT[cle][1]},
                )
        return Response(_parametres_courants())


class JournalAuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JournalAudit.objects.select_related("utilisateur").all()
    serializer_class = JournalAuditSerializer
    permission_classes = [PermissionParCode]
    permission_lecture = "administration.journal"
    permission_ecriture = []
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["modele", "action", "reference_objet"]
    ordering_fields = ["date_action"]

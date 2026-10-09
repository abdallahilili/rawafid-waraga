from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from django.db.models import Count
from rest_framework.exceptions import ValidationError

from apps.commun.constantes import CATALOGUE_PERMISSIONS
from apps.commun.permissions import PermissionParCode
from apps.commun.vues_base import ViewSetGestion
from .models import Utilisateur, Groupe, Fonctionnalite, Fonction
from .serializers import ConnexionSerializer, UtilisateurSerializer
from .serializers_groupes import GroupeSerializer, FonctionSerializer


class ConnexionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ConnexionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class RafraichirTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed(str(exc))
        return Response(serializer.validated_data)


class MoiView(APIView):
    def get(self, request):
        return Response(UtilisateurSerializer(request.user).data)


class UtilisateurViewSet(ViewSetGestion):
    queryset = Utilisateur.objects.select_related("depot").all().order_by("nom")
    serializer_class = UtilisateurSerializer
    permission_lecture = "utilisateurs.voir"
    permission_ecriture = "utilisateurs.gerer"
    filterset_fields = []
    search_fields = ["identifiant", "nom", "prenom"]

    def get_queryset(self):
        qs = super().get_queryset()
        recherche = self.request.query_params.get("recherche")
        if recherche:
            qs = qs.filter(nom__icontains=recherche)
        groupe = self.request.query_params.get("groupe")
        if groupe:
            qs = qs.filter(groupe_id=groupe)
        return qs


class GroupeViewSet(ViewSetGestion):
    queryset = Groupe.objects.annotate(
        nombre_utilisateurs=Count("utilisateurs", distinct=True)
    ).prefetch_related("fonctionnalites").order_by("nom")
    serializer_class = GroupeSerializer
    # La liste sert aussi de choix dans le formulaire utilisateur.
    permission_lecture = ["groupes.voir", "utilisateurs.gerer"]
    permission_ecriture = "groupes.gerer"
    pagination_class = None

    def perform_destroy(self, instance):
        if instance.utilisateurs.exists():
            raise ValidationError(
                "Ce groupe contient des utilisateurs : reaffectez-les avant de le supprimer."
            )
        instance.delete()


class CataloguePermissionsView(APIView):
    """Liste des permissions disponibles, regroupees par module."""

    permission_classes = [PermissionParCode]
    permission_lecture = ["groupes.voir", "groupes.gerer"]

    def get(self, request):
        actives = {f.nom: f for f in Fonctionnalite.objects.filter(etat=True)}
        resultat = []
        for module, (libelle, perms) in CATALOGUE_PERMISSIONS.items():
            fonctionnalites = [
                {"code": f.nom, "libelle": f.description}
                for code, _ in perms if (f := actives.get(code))
            ]
            if fonctionnalites:
                resultat.append({"module": module, "libelle": libelle, "permissions": fonctionnalites})
        return Response(resultat)


class FonctionViewSet(ViewSetGestion):
    queryset = Fonction.objects.all().order_by("nom")
    serializer_class = FonctionSerializer
    permission_lecture = ["utilisateurs.voir", "utilisateurs.gerer"]
    permission_ecriture = "utilisateurs.gerer"
    pagination_class = None

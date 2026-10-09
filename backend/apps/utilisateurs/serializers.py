from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed

from apps.commun.constantes import MODULES_MENU
from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    mot_de_passe = serializers.CharField(write_only=True, required=False)
    modules = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    groupe_nom = serializers.CharField(source="groupe.nom", read_only=True, default=None)
    fonction_nom = serializers.CharField(source="fonction.nom", read_only=True, default=None)
    depot_nom = serializers.CharField(source="depot.nom", read_only=True, default=None)

    class Meta:
        model = Utilisateur
        fields = [
            "id", "identifiant", "nom", "prenom", "telephone", "groupe",
            "groupe_nom", "fonction", "fonction_nom", "depot", "depot_nom", "actif", "date_creation", "mot_de_passe",
            "modules", "permissions",
        ]

    def get_modules(self, obj):
        permissions = obj.permissions_effectives()
        return [m for m in MODULES_MENU if f"{m}.voir" in permissions]

    def get_permissions(self, obj):
        return sorted(obj.permissions_effectives())

    def create(self, donnees_validees):
        mot_de_passe = donnees_validees.pop("mot_de_passe", None)
        utilisateur = Utilisateur(**donnees_validees)
        utilisateur.set_password(mot_de_passe or "changer123")
        utilisateur.save()
        return utilisateur

    def update(self, instance, donnees_validees):
        mot_de_passe = donnees_validees.pop("mot_de_passe", None)
        for cle, valeur in donnees_validees.items():
            setattr(instance, cle, valeur)
        if mot_de_passe:
            instance.set_password(mot_de_passe)
        instance.save()
        return instance


class ConnexionSerializer(serializers.Serializer):
    """Serializer de connexion entierement en francais : prend
    identifiant/mot_de_passe et retourne les jetons JWT + le profil.
    (SimpleJWT impose des noms anglais en interne ; on les encapsule
    ici plutot que de les exposer dans l'API.)"""

    identifiant = serializers.CharField()
    mot_de_passe = serializers.CharField(write_only=True)

    def validate(self, attrs):
        utilisateur = authenticate(
            identifiant=attrs["identifiant"], password=attrs["mot_de_passe"]
        )
        if utilisateur is None:
            raise AuthenticationFailed("Identifiant ou mot de passe incorrect.")
        if not utilisateur.actif:
            raise AuthenticationFailed("Ce compte est desactive.")

        refresh = RefreshToken.for_user(utilisateur)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "utilisateur": UtilisateurSerializer(utilisateur).data,
        }

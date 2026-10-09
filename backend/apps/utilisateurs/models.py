from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from apps.commun.constantes import TOUTES_LES_PERMISSIONS


class GestionnaireUtilisateur(BaseUserManager):
    def create_user(self, identifiant, mot_de_passe=None, **extra):
        if not identifiant:
            raise ValueError("L'identifiant est obligatoire.")
        utilisateur = self.model(identifiant=identifiant, **extra)
        utilisateur.set_password(mot_de_passe)
        utilisateur.save(using=self._db)
        return utilisateur

    def create_superuser(self, identifiant, mot_de_passe=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(identifiant, mot_de_passe, **extra)


class Fonctionnalite(models.Model):
    """Une fonctionnalite de l'application (ex. "articles.gerer"). Les
    fonctionnalites sont attribuees aux groupes ; `nom` est le code
    technique verifie par les permissions, `module` sert a les regrouper
    dans l'ecran de gestion des groupes."""

    nom = models.CharField(max_length=100, unique=True, db_column="nom")
    description = models.CharField(max_length=255, blank=True, default="", db_column="description")
    module = models.CharField(max_length=50, blank=True, default="", db_column="module")
    etat = models.BooleanField(default=True, db_column="etat")

    class Meta:
        db_table = "fonctionnalite"
        verbose_name = "Fonctionnalite"
        verbose_name_plural = "Fonctionnalites"
        ordering = ["module", "nom"]

    def __str__(self):
        return self.nom


class Groupe(models.Model):
    """Groupe d'utilisateurs : un ensemble de fonctionnalites que l'on
    peut attribuer a plusieurs utilisateurs."""

    nom = models.CharField(max_length=100, unique=True, db_column="nom")
    description = models.CharField(max_length=255, blank=True, default="", db_column="description")
    etat = models.BooleanField(default=True, db_column="etat")
    fonctionnalites = models.ManyToManyField(
        Fonctionnalite, through="FonctionnaliteGroupe", related_name="groupes", blank=True,
    )

    class Meta:
        db_table = "groupe"
        verbose_name = "Groupe"
        verbose_name_plural = "Groupes"
        ordering = ["nom"]

    def __str__(self):
        return self.nom

    def codes_permissions(self):
        if not self.etat:
            return set()
        return set(self.fonctionnalites.filter(etat=True).values_list("nom", flat=True))


class FonctionnaliteGroupe(models.Model):
    groupe = models.ForeignKey(Groupe, on_delete=models.CASCADE, db_column="idGroupe")
    fonctionnalite = models.ForeignKey(Fonctionnalite, on_delete=models.CASCADE, db_column="idFonctionnalite")

    class Meta:
        db_table = "fonctionnalitegroupe"
        unique_together = [("groupe", "fonctionnalite")]


class Fonction(models.Model):
    """Poste occupe par l'utilisateur (informatif, distinct du groupe qui
    porte les droits)."""

    nom = models.CharField(max_length=100, unique=True, db_column="nom")
    description = models.CharField(max_length=255, blank=True, default="", db_column="description")

    class Meta:
        db_table = "fonction"
        verbose_name = "Fonction"
        verbose_name_plural = "Fonctions"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    identifiant = models.CharField(
        max_length=50, unique=True, db_column="identifiant"
    )
    nom = models.CharField(max_length=100, db_column="nom")
    prenom = models.CharField(max_length=100, blank=True, default="", db_column="prenom")
    telephone = models.CharField(max_length=30, blank=True, default="", db_column="telephone")
    groupe = models.ForeignKey(
        Groupe, null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_groupe", related_name="utilisateurs",
    )
    fonction = models.ForeignKey(
        Fonction, null=True, blank=True, on_delete=models.SET_NULL,
        db_column="id_fonction", related_name="utilisateurs",
    )
    depot = models.ForeignKey(
        "depots.Depot", null=True, blank=True, on_delete=models.SET_NULL,
        db_column="id_depot", related_name="utilisateurs",
    )
    actif = models.BooleanField(default=True, db_column="actif")
    date_creation = models.DateTimeField(auto_now_add=True, db_column="date_creation")

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = GestionnaireUtilisateur()

    USERNAME_FIELD = "identifiant"
    REQUIRED_FIELDS = ["nom"]

    class Meta:
        db_table = "utilisateur"
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return f"{self.prenom} {self.nom}".strip() or self.identifiant

    @property
    def is_active(self):
        return self.actif

    @is_active.setter
    def is_active(self, valeur):
        self.actif = valeur

    def permissions_effectives(self):
        if self.is_superuser:
            return set(TOUTES_LES_PERMISSIONS)
        if self.groupe_id is None:
            return set()
        return self.groupe.codes_permissions()

    def a_permission(self, code):
        return code in self.permissions_effectives()

from django.db import models, transaction
from .modeles import ModeleImmuable


class Parametre(models.Model):
    """Parametre de configuration metier cle/valeur (ex: TVA, devise)."""

    cle = models.CharField(max_length=100, unique=True, db_column="cle")
    valeur = models.TextField(blank=True, default="", db_column="valeur")
    description = models.CharField(
        max_length=255, blank=True, default="", db_column="description"
    )

    class Meta:
        db_table = "parametre"
        verbose_name = "Parametre"
        verbose_name_plural = "Parametres"

    def __str__(self):
        return f"{self.cle}={self.valeur}"


class SequenceDocument(models.Model):
    """Compteur par prefixe+annee pour generer des references uniques."""

    prefixe = models.CharField(max_length=20, db_column="prefixe")
    annee = models.IntegerField(db_column="annee")
    dernier_numero = models.IntegerField(default=0, db_column="dernier_numero")

    class Meta:
        db_table = "sequence_document"
        unique_together = [("prefixe", "annee")]

    def __str__(self):
        return f"{self.prefixe}-{self.annee}:{self.dernier_numero}"


class JournalAudit(ModeleImmuable):
    """Trace immuable qui/quoi/quand/ancien->nouveau/reference."""

    date_action = models.DateTimeField(auto_now_add=True, db_column="date_action")
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur",
        null=True,
        on_delete=models.SET_NULL,
        db_column="id_utilisateur",
        related_name="actions_audit",
    )
    action = models.CharField(max_length=100, db_column="action")
    modele = models.CharField(max_length=100, db_column="modele")
    reference_objet = models.CharField(max_length=100, db_column="reference_objet")
    ancienne_valeur = models.JSONField(null=True, blank=True, db_column="ancienne_valeur")
    nouvelle_valeur = models.JSONField(null=True, blank=True, db_column="nouvelle_valeur")

    class Meta:
        db_table = "journal_audit"
        ordering = ["-date_action"]
        verbose_name = "Entree du journal d'audit"
        verbose_name_plural = "Journal d'audit"

    def __str__(self):
        return f"{self.date_action} {self.action} {self.modele}#{self.reference_objet}"

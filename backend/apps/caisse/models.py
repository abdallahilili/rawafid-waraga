from django.db import models
from apps.commun.modeles import ModeleImmuable
from apps.commun.constantes import StatutSessionCaisse, TypeMouvementCaisse


class SessionCaissier(models.Model):
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT, db_column="id_depot", related_name="sessions_caissier",
    )
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", on_delete=models.PROTECT, db_column="id_utilisateur",
        related_name="sessions_caissier",
    )
    statut = models.CharField(
        max_length=10, choices=StatutSessionCaisse.CHOIX,
        default=StatutSessionCaisse.OUVERTE, db_column="statut",
    )
    montant_ouverture = models.DecimalField(max_digits=12, decimal_places=2, default=0, db_column="montant_ouverture")
    montant_fermeture = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, db_column="montant_fermeture"
    )
    date_ouverture = models.DateTimeField(auto_now_add=True, db_column="date_ouverture")
    date_fermeture = models.DateTimeField(null=True, blank=True, db_column="date_fermeture")

    class Meta:
        db_table = "session_caissier"
        ordering = ["-date_ouverture"]
        verbose_name = "Session caissier"
        verbose_name_plural = "Sessions caissier"

    def __str__(self):
        return f"Session {self.id} - {self.utilisateur}"


class MouvementCaisse(ModeleImmuable):
    session = models.ForeignKey(
        SessionCaissier, on_delete=models.PROTECT, db_column="id_session", related_name="mouvements",
    )
    type_mouvement = models.CharField(max_length=20, choices=TypeMouvementCaisse.CHOIX, db_column="type_mouvement")
    montant = models.DecimalField(max_digits=12, decimal_places=2, db_column="montant")
    reference_document = models.CharField(max_length=50, blank=True, default="", db_column="reference_document")
    commentaire = models.CharField(max_length=255, blank=True, default="", db_column="commentaire")
    date_mouvement = models.DateTimeField(auto_now_add=True, db_column="date_mouvement")

    class Meta:
        db_table = "mouvement_caisse"
        ordering = ["-date_mouvement"]
        verbose_name = "Mouvement de caisse"
        verbose_name_plural = "Mouvements de caisse"

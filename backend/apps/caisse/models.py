from django.db import models
from apps.commun.modeles import ModeleImmuable
from apps.commun.constantes import StatutSessionCaisse, TypeMouvementCaisse


class Caisse(models.Model):
    """Poste d'encaissement physique d'un depot (ex: Caisse 1, Caisse comptoir)."""

    nom = models.CharField(max_length=60, db_column="nom")
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT, db_column="id_depot", related_name="caisses",
    )
    etat = models.BooleanField(default=True, db_column="etat")

    class Meta:
        db_table = "caisse"
        ordering = ["depot__nom", "nom"]
        unique_together = [("depot", "nom")]
        verbose_name = "Caisse"
        verbose_name_plural = "Caisses"

    def __str__(self):
        return f"{self.nom} ({self.depot})"


class SessionCaissier(models.Model):
    depot =models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT, db_column="id_depot", related_name="sessions_caissier",
    )
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", on_delete=models.PROTECT, db_column="id_utilisateur",
        related_name="sessions_caissier",
    )
    caisse = models.ForeignKey(
        Caisse, null=True, blank=True, on_delete=models.PROTECT, db_column="id_caisse",
        related_name="sessions",
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
    # Valeurs figees a la cloture : montant_fermeture = especes comptees.
    total_ventes = models.DecimalField(max_digits=14, decimal_places=2, default=0, db_column="total_ventes")
    montant_attendu = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, db_column="montant_attendu"
    )
    ecart = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, db_column="ecart")
    note = models.CharField(max_length=255, blank=True, default="", db_column="note")
    fermee_par = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_fermee_par", related_name="+",
    )

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
    mode_paiement = models.ForeignKey(
        "facturation.ModePaiement", null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_mode_paiement", related_name="+",
    )  # vide = especes (vente au comptoir)
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_utilisateur", related_name="+",
    )
    date_mouvement = models.DateTimeField(auto_now_add=True, db_column="date_mouvement")

    class Meta:
        db_table = "mouvement_caisse"
        ordering = ["-date_mouvement"]
        verbose_name = "Mouvement de caisse"
        verbose_name_plural = "Mouvements de caisse"

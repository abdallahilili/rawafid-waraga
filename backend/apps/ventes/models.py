from django.db import models
from apps.commun.modeles import ModeleImmuable


class TypeLigneVente:
    ARTICLE = "ARTICLE"
    IMPRESSION = "IMPRESSION"
    SERVICE = "SERVICE"
    CHOIX = [
        (ARTICLE, "Article"),
        (IMPRESSION, "Commande d'impression"),
        (SERVICE, "Service (travail au comptoir)"),
    ]


class Vente(ModeleImmuable):
    """Vente au comptoir : immuable une fois cree. Toute annulation se
    fait par un remboursement explicite, jamais par suppression."""

    reference = models.CharField(max_length=30, unique=True, db_column="reference")
    depot = models.ForeignKey(
        "depots.Depot", on_delete=models.PROTECT, db_column="id_depot", related_name="ventes",
    )
    session_caissier = models.ForeignKey(
        "caisse.SessionCaissier", on_delete=models.PROTECT, db_column="id_session", related_name="ventes",
    )
    nom_client = models.CharField(max_length=150, blank=True, default="", db_column="nom_client")
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, db_column="montant_total")
    montant_recu = models.DecimalField(max_digits=12, decimal_places=2, db_column="montant_recu")
    monnaie_rendue = models.DecimalField(max_digits=12, decimal_places=2, db_column="monnaie_rendue")
    annulee = models.BooleanField(default=False, db_column="annulee")
    utilisateur = models.ForeignKey(
        "utilisateurs.Utilisateur", null=True, on_delete=models.SET_NULL,
        db_column="id_utilisateur", related_name="ventes",
    )
    date_vente = models.DateTimeField(auto_now_add=True, db_column="date_vente")

    class Meta:
        db_table = "vente"
        ordering = ["-date_vente"]
        verbose_name = "Vente"
        verbose_name_plural = "Ventes"

    def __str__(self):
        return self.reference


class PaiementVente(models.Model):
    """Une vente peut etre reglee par plusieurs modes de paiement ; la somme des
    paiements est egale au total de la vente."""

    vente = models.ForeignKey(Vente, on_delete=models.CASCADE, db_column="id_vente", related_name="paiements")
    mode_paiement = models.ForeignKey(
        "facturation.ModePaiement", on_delete=models.PROTECT, db_column="id_mode_paiement", related_name="+",
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2, db_column="montant")
    reference_transaction = models.CharField(max_length=60, blank=True, default="", db_column="reference_transaction")

    class Meta:
        db_table = "paiement_vente"
        ordering = ["id"]
        verbose_name = "Paiement de vente"
        verbose_name_plural = "Paiements de vente"


class LigneVente(models.Model):
    """Les lignes elles-memes ne sont pas immuables individuellement
    (elles sont creees une seule fois avec la vente, jamais modifiees
    par la suite ; l'immuabilite forte est portee par Vente)."""

    vente = models.ForeignKey(Vente, on_delete=models.CASCADE, db_column="id_vente", related_name="lignes")
    type_ligne = models.CharField(max_length=15, choices=TypeLigneVente.CHOIX, db_column="type_ligne")
    article = models.ForeignKey(
        "articles.Article", null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_article", related_name="lignes_vente",
    )
    quantite = models.IntegerField(null=True, blank=True, db_column="quantite")
    commande_impression = models.OneToOneField(
        "impression.CommandeImpression", null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_commande_impression", related_name="ligne_vente",
    )
    tarif = models.ForeignKey(
        "impression.TarifImpression", null=True, blank=True, on_delete=models.PROTECT,
        db_column="id_tarif", related_name="lignes_vente",
    )
    # Libelle fige pour les services (ex. "Photocopie A4 Noir et blanc") ; quantite = nombre de pages.
    designation = models.CharField(max_length=150, blank=True, default="", db_column="designation")
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, db_column="prix_unitaire")
    montant = models.DecimalField(max_digits=12, decimal_places=2, db_column="montant")

    class Meta:
        db_table = "ligne_vente"
        verbose_name = "Ligne de vente"
        verbose_name_plural = "Lignes de vente"

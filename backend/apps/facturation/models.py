"""Circuit commercial vers un client : Devis -> Bon de livraison ->
Facture -> Paiement (repris de l'application JEE : ExpressionBesoins,
LigneExpressionBesoins, PaiementFacture, ModePaiement, Client)."""
from django.db import models


class EtatExpression:
    DEVIS = 0
    BON_LIVRAISON = 1
    FACTURE = 2

    CHOIX = [
        (DEVIS, "Devis"),
        (BON_LIVRAISON, "Bon de livraison"),
        (FACTURE, "Facture"),
    ]


class Client(models.Model):
    nom = models.CharField(max_length=100, db_column="nom")
    prenom = models.CharField(max_length=100, blank=True, default="", db_column="prenom")
    num_client = models.CharField(max_length=30, blank=True, default="", db_column="numClient")
    etat = models.BooleanField(default=True, db_column="etat")

    class Meta:
        db_table = "client"
        ordering = ["nom", "prenom"]
        verbose_name = "Client"
        verbose_name_plural = "Clients"

    def __str__(self):
        return f"{self.prenom} {self.nom}".strip()


class ModePaiement(models.Model):
    nom = models.CharField(max_length=60, unique=True, db_column="nom")
    etat = models.BooleanField(default=True, db_column="etat")
    alias = models.CharField(max_length=30, blank=True, default="", db_column="alias")
    # Les paiements en especes comptent dans le tiroir-caisse (montant attendu a la cloture).
    especes = models.BooleanField(default=False, db_column="especes")

    class Meta:
        db_table = "modepaiement"
        ordering = ["nom"]
        verbose_name = "Mode de paiement"
        verbose_name_plural = "Modes de paiement"

    def __str__(self):
        return self.nom


class ExpressionBesoins(models.Model):
    """Document commercial d'un client. `etat` indique l'etape atteinte :
    0 = devis, 1 = bon de livraison, 2 = facture."""

    reference = models.CharField(max_length=30, unique=True, db_column="reference")
    type = models.CharField(max_length=30, blank=True, default="", db_column="type")
    date_devis = models.DateTimeField(auto_now_add=True, db_column="dateDevis")
    date_bc = models.DateTimeField(null=True, blank=True, db_column="dateBC")
    date_fc = models.DateTimeField(null=True, blank=True, db_column="dateFC")
    numero_bl = models.CharField(max_length=30, blank=True, default="", db_column="numeroBL")
    numero_facture = models.CharField(max_length=30, blank=True, default="", db_column="numeroFacture")
    prix_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, db_column="prixTotal")
    montant_reste = models.DecimalField(max_digits=14, decimal_places=2, default=0, db_column="montant_Rest")
    etat = models.SmallIntegerField(choices=EtatExpression.CHOIX, default=EtatExpression.DEVIS, db_column="etat")
    etat_paiement = models.SmallIntegerField(default=0, db_column="etatPaiement")  # 0 non paye, 1 paye
    personnel = models.ForeignKey(
        "utilisateurs.Utilisateur", on_delete=models.PROTECT, db_column="idPersonnel",
        related_name="expressions_besoins",
    )
    client = models.ForeignKey(
        Client, on_delete=models.PROTECT, db_column="idClient", related_name="expressions_besoins",
    )
    depot = models.ForeignKey(
        "depots.Depot", null=True, blank=True, on_delete=models.PROTECT, db_column="idDepot",
        related_name="expressions_besoins",
    )

    class Meta:
        db_table = "expressionbesoins"
        ordering = ["-id"]
        verbose_name = "Expression de besoins"
        verbose_name_plural = "Expressions de besoins"

    def __str__(self):
        return self.reference


class LigneExpressionBesoins(models.Model):
    expression_besoins = models.ForeignKey(
        ExpressionBesoins, on_delete=models.CASCADE, db_column="idExpression", related_name="lignes",
    )
    # Une ligne porte soit un article (sortie de stock a la livraison), soit un
    # service d'impression au comptoir (tarif ; quantite = nombre de pages, sans stock).
    article = models.ForeignKey(
        "articles.Article", null=True, blank=True, on_delete=models.PROTECT,
        db_column="idMedicament", related_name="+",
    )
    tarif = models.ForeignKey(
        "impression.TarifImpression", null=True, blank=True, on_delete=models.PROTECT,
        db_column="idTarif", related_name="+",
    )
    designation = models.CharField(max_length=150, blank=True, default="", db_column="designation")
    quantite_devis = models.PositiveIntegerField(db_column="quantiteDevis")
    quantite_livre = models.PositiveIntegerField(default=0, db_column="quantiteLivre")
    prix = models.DecimalField(max_digits=12, decimal_places=2, db_column="prix")
    prix_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, db_column="prixTotal")

    class Meta:
        db_table = "ligneexpressionbesoins"
        ordering = ["id"]


class PaiementFacture(models.Model):
    montant_paye = models.DecimalField(max_digits=14, decimal_places=2, db_column="montantPeyer")
    nom_client = models.CharField(max_length=200, blank=True, default="", db_column="nom_client")
    date_paiement = models.DateTimeField(auto_now_add=True, db_column="date_p")
    personnel = models.ForeignKey(
        "utilisateurs.Utilisateur", on_delete=models.PROTECT, db_column="idPersonnel",
        related_name="paiements_factures",
    )
    session_caissier = models.ForeignKey(
        "caisse.SessionCaissier", on_delete=models.PROTECT, db_column="idSession",
        related_name="paiements_factures",
    )
    mode_paiement = models.ForeignKey(
        ModePaiement, on_delete=models.PROTECT, db_column="idModePaiement", related_name="paiements",
    )
    client = models.ForeignKey(
        Client, on_delete=models.PROTECT, db_column="idClient", related_name="paiements",
    )
    expression_besoins = models.ForeignKey(
        ExpressionBesoins, on_delete=models.PROTECT, db_column="idExpressionBesoins",
        related_name="paiements",
    )

    class Meta:
        db_table = "paiementfacture"
        ordering = ["-date_paiement"]

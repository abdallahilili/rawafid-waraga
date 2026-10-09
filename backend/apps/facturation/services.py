from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.caisse import services as caisse_services
from apps.commun.constantes import TypeMouvementStock
from apps.commun.exceptions import ErreurMetier
from apps.commun.references import prochaine_reference
from apps.stock import services as stock_services
from .models import (
    EtatExpression, ExpressionBesoins, LigneExpressionBesoins, PaiementFacture,
)


def _ecrire_lignes(expression, lignes):
    """Remplace les lignes du devis. lignes : [{article, quantite, prix?}].
    Le prix par defaut est le prix de vente de l'article."""
    if not lignes:
        raise ErreurMetier("Un devis doit contenir au moins une ligne.")
    expression.lignes.all().delete()
    total = Decimal("0")
    for ligne in lignes:
        quantite = ligne["quantite"]
        if quantite <= 0:
            raise ErreurMetier("La quantite doit etre positive.")
        article = ligne["article"]
        prix = Decimal(ligne["prix"]) if ligne.get("prix") is not None else article.prix_vente
        if prix < 0:
            raise ErreurMetier("Le prix ne peut pas etre negatif.")
        montant = prix * quantite
        LigneExpressionBesoins.objects.create(
            expression_besoins=expression, article=article,
            quantite_devis=quantite, prix=prix, prix_total=montant,
        )
        total += montant
    expression.prix_total = total
    expression.save(update_fields=["prix_total"])


def _verrouiller(expression):
    return ExpressionBesoins.objects.select_for_update().get(pk=expression.pk)


@transaction.atomic
def creer_devis(client, personnel, lignes, type_document=""):
    if not client.etat:
        raise ErreurMetier("Ce client est desactive.")
    expression = ExpressionBesoins.objects.create(
        reference=prochaine_reference("DEV"), client=client, personnel=personnel,
        type=type_document, depot=personnel.depot,
    )
    _ecrire_lignes(expression, lignes)
    return expression


@transaction.atomic
def modifier_devis(expression, lignes, client=None):
    expression = _verrouiller(expression)
    if expression.etat != EtatExpression.DEVIS:
        raise ErreurMetier("Seul un devis peut etre modifie.")
    if client is not None:
        expression.client = client
        expression.save(update_fields=["client"])
    _ecrire_lignes(expression, lignes)
    return expression


@transaction.atomic
def valider_bon_livraison(expression, quantites_livrees=None, date_bc=None, utilisateur=None):
    """Transforme le devis en bon de livraison. `quantites_livrees` :
    {id_ligne: quantite}; par defaut tout ce qui est au devis est livre.
    Le stock du depot est diminue des quantites livrees."""
    expression = _verrouiller(expression)
    if expression.etat != EtatExpression.DEVIS:
        raise ErreurMetier("Seul un devis peut etre transforme en bon de livraison.")
    depot = expression.depot or (utilisateur.depot if utilisateur else None)
    if depot is None:
        raise ErreurMetier("Aucun depot n'est associe : impossible de sortir le stock.")

    quantites_livrees = quantites_livrees or {}
    numero = prochaine_reference("BL")
    total = Decimal("0")
    for ligne in expression.lignes.select_related("article"):
        livree = quantites_livrees.get(ligne.id, ligne.quantite_devis)
        if livree < 0 or livree > ligne.quantite_devis:
            raise ErreurMetier(
                f"Quantite livree invalide pour {ligne.article.nom} "
                f"(devis : {ligne.quantite_devis})."
            )
        ligne.quantite_livre = livree
        ligne.prix_total = ligne.prix * livree
        ligne.save(update_fields=["quantite_livre", "prix_total"])
        total += ligne.prix_total
        if livree > 0:
            stock_services.enregistrer_sortie(
                ligne.article, depot, livree, reference_document=numero,
                commentaire=f"Bon de livraison {numero}", utilisateur=utilisateur,
                type_mouvement=TypeMouvementStock.SORTIE,
            )

    expression.etat = EtatExpression.BON_LIVRAISON
    expression.numero_bl = numero
    expression.date_bc = date_bc or timezone.now()
    expression.prix_total = total
    expression.depot = depot
    expression.save(update_fields=["etat", "numero_bl", "date_bc", "prix_total", "depot"])
    return expression


@transaction.atomic
def valider_facture(expression, date_fc=None):
    expression = _verrouiller(expression)
    if expression.etat != EtatExpression.BON_LIVRAISON:
        raise ErreurMetier("Seul un bon de livraison peut etre transforme en facture.")
    expression.etat = EtatExpression.FACTURE
    expression.numero_facture = prochaine_reference("FAC")
    expression.date_fc = date_fc or timezone.now()
    expression.montant_reste = expression.prix_total
    expression.etat_paiement = 1 if expression.prix_total == 0 else 0
    expression.save(update_fields=[
        "etat", "numero_facture", "date_fc", "montant_reste", "etat_paiement",
    ])
    return expression


@transaction.atomic
def payer_facture(expression, montant, mode_paiement, personnel):
    expression = _verrouiller(expression)
    if expression.etat != EtatExpression.FACTURE:
        raise ErreurMetier("Seule une facture peut etre payee.")
    if expression.etat_paiement == 1:
        raise ErreurMetier("Cette facture est deja entierement payee.")
    if not mode_paiement.etat:
        raise ErreurMetier("Ce mode de paiement est desactive.")
    montant = Decimal(montant)
    if montant <= 0:
        raise ErreurMetier("Le montant du paiement doit etre positif.")
    if montant > expression.montant_reste:
        raise ErreurMetier(
            f"Le montant depasse le reste a payer ({expression.montant_reste})."
        )
    session = caisse_services.session_ouverte_pour(personnel)
    if session is None:
        raise ErreurMetier("Vous devez ouvrir une session de caisse avant d'encaisser un paiement.")

    paiement = PaiementFacture.objects.create(
        montant_paye=montant, nom_client=str(expression.client), personnel=personnel,
        session_caissier=session, mode_paiement=mode_paiement,
        client=expression.client, expression_besoins=expression,
    )
    expression.montant_reste -= montant
    if expression.montant_reste == 0:
        expression.etat_paiement = 1
    expression.save(update_fields=["montant_reste", "etat_paiement"])
    caisse_services.enregistrer_encaissement(
        session, montant, reference_document=expression.numero_facture,
        commentaire=f"Paiement facture {expression.numero_facture}",
    )
    return paiement

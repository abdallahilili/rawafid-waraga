from django.db import transaction
from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import StatutDocument, TypeMouvementStock
from apps.commun.references import prochaine_reference
from apps.stock import services as stock_services
from .models import Achat, LigneAchat


@transaction.atomic
def creer_achat(fournisseur, depot, lignes, utilisateur=None):
    """lignes: liste de dicts {article, quantite, prix_unitaire}."""
    if not lignes:
        raise ErreurMetier("Un achat doit contenir au moins une ligne.")

    achat = Achat.objects.create(
        reference=prochaine_reference("ACH"),
        fournisseur=fournisseur,
        depot=depot,
        statut=StatutDocument.BROUILLON,
        utilisateur=utilisateur,
    )
    montant_total = 0
    for ligne in lignes:
        l = LigneAchat.objects.create(
            achat=achat,
            article=ligne["article"],
            quantite=ligne["quantite"],
            prix_unitaire=ligne["prix_unitaire"],
        )
        montant_total += l.montant
    achat.montant_total = montant_total
    achat.save(update_fields=["montant_total"])
    return achat


@transaction.atomic
def valider_achat(achat, utilisateur=None):
    if achat.statut != StatutDocument.BROUILLON:
        raise ErreurMetier("Seul un achat en brouillon peut etre valide.")

    from django.utils import timezone
    for ligne in achat.lignes.select_related("article").all():
        stock_services.enregistrer_entree(
            ligne.article, achat.depot, ligne.quantite, ligne.prix_unitaire,
            reference_document=achat.reference,
            commentaire=f"Achat {achat.reference}",
            utilisateur=utilisateur,
        )
    achat.statut = StatutDocument.VALIDE
    achat.date_validation = timezone.now()
    achat.save(update_fields=["statut", "date_validation"])
    return achat


@transaction.atomic
def annuler_achat(achat, utilisateur=None):
    if achat.statut != StatutDocument.VALIDE:
        raise ErreurMetier("Seul un achat valide peut etre annule.")
    for ligne in achat.lignes.select_related("article").all():
        stock_services.enregistrer_sortie(
            ligne.article, achat.depot, ligne.quantite,
            reference_document=f"ANNUL-{achat.reference}",
            commentaire=f"Annulation achat {achat.reference}",
            utilisateur=utilisateur,
            type_mouvement=TypeMouvementStock.CORRECTION,
        )
    achat.statut = StatutDocument.ANNULE
    achat.save(update_fields=["statut"])
    return achat

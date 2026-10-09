"""
Point d'ecriture unique pour toute mutation de stock.
Aucun autre module ne doit modifier Stock.quantite directement : tout
passe par appliquer_mouvement() pour garantir l'atomicite, le
verrouillage de ligne, la non-negativite (sauf parametre admin) et la
tracabilite immuable (MouvementStock).
"""
from decimal import Decimal
from django.db import transaction

from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import TypeMouvementStock
from apps.commun.models import Parametre
from .models import Stock, MouvementStock


def autoriser_stock_negatif():
    try:
        return Parametre.objects.get(cle="AUTORISER_STOCK_NEGATIF").valeur == "1"
    except Parametre.DoesNotExist:
        return False


@transaction.atomic
def appliquer_mouvement(article, depot, type_mouvement, quantite_delta,
                         prix_unitaire=None, reference_document="",
                         commentaire="", utilisateur=None):
    """
    Applique un delta (positif = entree, negatif = sortie) sur le stock
    d'un article dans un depot, et enregistre un MouvementStock immuable.

    - quantite_delta > 0 : entree (achat, retour, correction positive...)
    - quantite_delta < 0 : sortie (vente, transfert sortant, correction...)

    Si type_mouvement == ENTREE, met a jour le cout unitaire moyen pondere
    (CUMP) a partir de prix_unitaire.
    """
    if quantite_delta == 0:
        raise ErreurMetier("La quantite du mouvement ne peut pas etre nulle.")

    stock, _ = Stock.objects.select_for_update().get_or_create(
        article=article, depot=depot, defaults={"quantite": 0, "cout_moyen_pondere": 0}
    )

    stock_avant = stock.quantite
    stock_apres = stock_avant + quantite_delta

    if stock_apres < 0 and not autoriser_stock_negatif():
        raise ErreurMetier(
            f"Stock insuffisant pour {article.nom} au depot {depot.nom} "
            f"(disponible: {stock_avant}, demande: {-quantite_delta})."
        )

    if quantite_delta > 0 and prix_unitaire is not None:
        prix_unitaire = Decimal(prix_unitaire)
        if stock_avant <= 0:
            stock.cout_moyen_pondere = prix_unitaire
        else:
            valeur_avant = Decimal(stock_avant) * stock.cout_moyen_pondere
            valeur_entree = Decimal(quantite_delta) * prix_unitaire
            stock.cout_moyen_pondere = (valeur_avant + valeur_entree) / Decimal(stock_apres) \
                if stock_apres > 0 else prix_unitaire

    stock.quantite = stock_apres
    stock.save(update_fields=["quantite", "cout_moyen_pondere"])

    mouvement = MouvementStock.objects.create(
        article=article,
        depot=depot,
        type_mouvement=type_mouvement,
        quantite=quantite_delta,
        stock_avant=stock_avant,
        stock_apres=stock_apres,
        prix_unitaire=prix_unitaire,
        reference_document=reference_document,
        commentaire=commentaire,
        utilisateur=utilisateur,
    )
    return stock, mouvement


@transaction.atomic
def enregistrer_entree(article, depot, quantite, prix_unitaire,
                        reference_document="", commentaire="", utilisateur=None):
    if quantite <= 0:
        raise ErreurMetier("La quantite d'entree doit etre positive.")
    return appliquer_mouvement(
        article, depot, TypeMouvementStock.ENTREE, quantite,
        prix_unitaire=prix_unitaire, reference_document=reference_document,
        commentaire=commentaire, utilisateur=utilisateur,
    )


@transaction.atomic
def enregistrer_sortie(article, depot, quantite, reference_document="",
                        commentaire="", utilisateur=None,
                        type_mouvement=TypeMouvementStock.SORTIE):
    if quantite <= 0:
        raise ErreurMetier("La quantite de sortie doit etre positive.")
    return appliquer_mouvement(
        article, depot, type_mouvement, -quantite,
        reference_document=reference_document, commentaire=commentaire,
        utilisateur=utilisateur,
    )


@transaction.atomic
def transferer_stock(article, depot_source, depot_destination, quantite,
                      reference_document="", utilisateur=None):
    if depot_source.pk == depot_destination.pk:
        raise ErreurMetier("Le depot source et destination doivent etre differents.")
    if quantite <= 0:
        raise ErreurMetier("La quantite transferee doit etre positive.")

    stock_source, _ = appliquer_mouvement(
        article, depot_source, TypeMouvementStock.TRANSFERT_SORTIE, -quantite,
        reference_document=reference_document,
        commentaire=f"Transfert vers {depot_destination.nom}",
        utilisateur=utilisateur,
    )
    stock_dest = Stock.objects.select_for_update().filter(
        article=article, depot=depot_source
    ).first()
    prix = stock_dest.cout_moyen_pondere if stock_dest else None

    appliquer_mouvement(
        article, depot_destination, TypeMouvementStock.TRANSFERT_ENTREE, quantite,
        prix_unitaire=prix, reference_document=reference_document,
        commentaire=f"Transfert depuis {depot_source.nom}",
        utilisateur=utilisateur,
    )
    return stock_source


@transaction.atomic
def ajuster_inventaire(article, depot, quantite_physique, utilisateur=None):
    from .models import Inventaire
    stock, _ = Stock.objects.select_for_update().get_or_create(
        article=article, depot=depot, defaults={"quantite": 0, "cout_moyen_pondere": 0}
    )
    quantite_theorique = stock.quantite
    ecart = quantite_physique - quantite_theorique

    Inventaire.objects.create(
        depot=depot, article=article,
        quantite_theorique=quantite_theorique,
        quantite_physique=quantite_physique,
        ecart=ecart,
        utilisateur=utilisateur,
    )

    if ecart != 0:
        appliquer_mouvement(
            article, depot, TypeMouvementStock.AJUSTEMENT, ecart,
            reference_document="INVENTAIRE",
            commentaire="Ajustement suite a inventaire physique",
            utilisateur=utilisateur,
        )
    return ecart

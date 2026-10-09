from decimal import Decimal
from django.db import transaction

from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import TypeMouvementStock, StatutCommandeImpression
from apps.commun.references import prochaine_reference
from apps.stock import services as stock_services
from apps.caisse import services as caisse_services
from .models import Vente, LigneVente, TypeLigneVente


@transaction.atomic
def creer_vente(depot, session_caissier, lignes, montant_recu, nom_client="", utilisateur=None):
    """
    lignes: liste de dicts, soit
      {type: ARTICLE, article: Article, quantite: int}
      {type: IMPRESSION, commande_impression: CommandeImpression}
    Les prix/montants sont TOUJOURS calcules serveur, jamais fait
    confiance au frontend.
    """
    if not lignes:
        raise ErreurMetier("Une vente doit contenir au moins une ligne.")

    montant_total = Decimal("0")
    lignes_calculees = []

    for ligne in lignes:
        if ligne["type"] == TypeLigneVente.ARTICLE:
            article = ligne["article"]
            quantite = ligne["quantite"]
            if quantite <= 0:
                raise ErreurMetier("La quantite vendue doit etre positive.")
            prix_unitaire = article.prix_vente
            montant = prix_unitaire * quantite
            lignes_calculees.append({
                "type_ligne": TypeLigneVente.ARTICLE,
                "article": article,
                "quantite": quantite,
                "prix_unitaire": prix_unitaire,
                "montant": montant,
            })
        elif ligne["type"] == TypeLigneVente.IMPRESSION:
            commande = ligne["commande_impression"]
            if commande.statut == StatutCommandeImpression.ANNULEE:
                raise ErreurMetier(f"La commande d'impression {commande.reference} est annulee.")
            if hasattr(commande, "ligne_vente"):
                raise ErreurMetier(f"La commande d'impression {commande.reference} est deja reglee.")
            montant = commande.montant_total
            lignes_calculees.append({
                "type_ligne": TypeLigneVente.IMPRESSION,
                "commande_impression": commande,
                "prix_unitaire": montant,
                "montant": montant,
            })
        else:
            raise ErreurMetier("Type de ligne de vente inconnu.")
        montant_total += montant

    montant_recu = Decimal(montant_recu)
    if montant_recu < montant_total:
        raise ErreurMetier("Le montant recu est inferieur au montant total de la vente.")

    vente = Vente.objects.create(
        reference=prochaine_reference("VTE"),
        depot=depot,
        session_caissier=session_caissier,
        nom_client=nom_client,
        montant_total=montant_total,
        montant_recu=montant_recu,
        monnaie_rendue=montant_recu - montant_total,
        utilisateur=utilisateur,
    )

    for ligne in lignes_calculees:
        LigneVente.objects.create(vente=vente, **ligne)
        if ligne["type_ligne"] == TypeLigneVente.ARTICLE:
            stock_services.enregistrer_sortie(
                ligne["article"], depot, ligne["quantite"],
                reference_document=vente.reference,
                commentaire=f"Vente {vente.reference}",
                utilisateur=utilisateur,
                type_mouvement=TypeMouvementStock.VENTE,
            )

    caisse_services.enregistrer_encaissement(
        session_caissier, montant_total, reference_document=vente.reference,
        commentaire=f"Vente {vente.reference}",
    )
    return vente

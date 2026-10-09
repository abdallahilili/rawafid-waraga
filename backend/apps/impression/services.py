from django.db import transaction
from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import StatutCommandeImpression
from apps.commun.references import prochaine_reference
from .models import CommandeImpression, LigneCommandeImpression, TarifImpression


def obtenir_tarif(depot, type_travail, format_papier, couleur):
    try:
        return TarifImpression.objects.get(
            depot=depot, type_travail=type_travail, format_papier=format_papier,
            couleur=couleur, actif=True,
        ).prix_unitaire_page
    except TarifImpression.DoesNotExist:
        raise ErreurMetier(
            "Aucun tarif configure pour cette combinaison "
            f"(travail={type_travail}, format={format_papier}, couleur={couleur})."
        )


@transaction.atomic
def creer_commande_impression(depot, lignes, nom_client="", telephone_client="",
                               date_livraison_prevue=None, utilisateur=None):
    """lignes: liste de dicts {type_travail, format_papier, couleur,
    recto_verso, nombre_pages, nombre_copies, description}. Le prix
    unitaire est toujours recalcule serveur, jamais fait confiance au
    frontend."""
    if not lignes:
        raise ErreurMetier("Une commande d'impression doit contenir au moins une ligne.")

    commande = CommandeImpression.objects.create(
        reference=prochaine_reference("IMP"),
        depot=depot,
        nom_client=nom_client,
        telephone_client=telephone_client,
        date_livraison_prevue=date_livraison_prevue,
        utilisateur=utilisateur,
    )
    montant_total = 0
    for ligne in lignes:
        prix = obtenir_tarif(depot, ligne["type_travail"], ligne["format_papier"], ligne["couleur"])
        l = LigneCommandeImpression.objects.create(
            commande=commande,
            type_travail=ligne["type_travail"],
            format_papier=ligne["format_papier"],
            couleur=ligne["couleur"],
            recto_verso=ligne.get("recto_verso", False),
            nombre_pages=ligne["nombre_pages"],
            nombre_copies=ligne["nombre_copies"],
            prix_unitaire_page=prix,
            description=ligne.get("description", ""),
        )
        montant_total += l.montant
    commande.montant_total = montant_total
    commande.save(update_fields=["montant_total"])
    return commande


@transaction.atomic
def changer_statut(commande, statut, utilisateur=None):
    transitions_valides = {
        StatutCommandeImpression.EN_ATTENTE: {StatutCommandeImpression.EN_COURS, StatutCommandeImpression.ANNULEE},
        StatutCommandeImpression.EN_COURS: {StatutCommandeImpression.TERMINEE, StatutCommandeImpression.ANNULEE},
        StatutCommandeImpression.TERMINEE: {StatutCommandeImpression.LIVREE},
        StatutCommandeImpression.LIVREE: set(),
        StatutCommandeImpression.ANNULEE: set(),
    }
    if statut not in transitions_valides.get(commande.statut, set()):
        raise ErreurMetier(f"Transition {commande.statut} -> {statut} non autorisee.")

    commande.statut = statut
    if statut == StatutCommandeImpression.LIVREE:
        from django.utils import timezone
        commande.date_livraison = timezone.now()
        commande.save(update_fields=["statut", "date_livraison"])
    else:
        commande.save(update_fields=["statut"])
    return commande

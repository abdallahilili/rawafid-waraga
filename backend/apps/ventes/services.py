from decimal import Decimal
from django.db import transaction

from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import TypeMouvementStock, StatutCommandeImpression
from apps.commun.references import prochaine_reference
from apps.stock import services as stock_services
from apps.caisse import services as caisse_services
from apps.facturation.models import ModePaiement
from .models import Vente, LigneVente, PaiementVente, TypeLigneVente


def libelle_tarif(tarif):
    return (
        f"{tarif.get_type_travail_display()} {tarif.get_format_papier_display()} "
        f"{tarif.get_couleur_display()}"
    )


def mode_especes():
    mode = ModePaiement.objects.filter(especes=True, etat=True).first()
    return mode or ModePaiement.objects.update_or_create(
        nom="Especes", defaults={"especes": True, "etat": True, "alias": "ESP"},
    )[0]


@transaction.atomic
def creer_vente(depot, session_caissier, lignes, montant_recu=None, nom_client="", utilisateur=None,
                paiements=None):
    """
    lignes: liste de dicts, soit
      {type: ARTICLE, article: Article, quantite: int}
      {type: IMPRESSION, commande_impression: CommandeImpression}
    Les prix/montants sont TOUJOURS calcules serveur, jamais fait
    confiance au frontend.

    paiements: liste [{mode_paiement, montant, reference_transaction}] dont la somme
    doit etre egale au total ; `montant_recu` est alors les especes remises par le
    client (facultatif : sans lui, le client a donne le compte exact).
    Sans `paiements`, la vente est reglee en especes avec `montant_recu` (>= total).
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
        elif ligne["type"] == TypeLigneVente.SERVICE:
            tarif = ligne["tarif"]
            quantite = ligne["quantite"]
            if quantite <= 0:
                raise ErreurMetier("La quantite doit etre positive.")
            if not tarif.actif or tarif.depot_id != depot.id:
                raise ErreurMetier("Ce tarif n'est pas disponible dans ce depot.")
            prix_unitaire = tarif.prix_unitaire_page
            montant = prix_unitaire * quantite
            lignes_calculees.append({
                "type_ligne": TypeLigneVente.SERVICE,
                "tarif": tarif,
                "designation": libelle_tarif(tarif),
                "quantite": quantite,
                "prix_unitaire": prix_unitaire,
                "montant": montant,
            })
        else:
            raise ErreurMetier("Type de ligne de vente inconnu.")
        montant_total += montant

    if paiements:
        for p in paiements:
            if p["montant"] <= 0:
                raise ErreurMetier("Chaque paiement doit avoir un montant positif.")
        somme = sum((Decimal(p["montant"]) for p in paiements), Decimal("0"))
        if somme != montant_total:
            raise ErreurMetier(
                f"Le total des paiements ({somme}) doit etre egal au total de la vente ({montant_total})."
            )
        especes = sum((Decimal(p["montant"]) for p in paiements if p["mode_paiement"].especes), Decimal("0"))
        autres = somme - especes
        if montant_recu is not None and especes > 0:
            montant_recu = Decimal(montant_recu)
            if montant_recu < especes:
                raise ErreurMetier("Les especes remises sont inferieures a la part payee en especes.")
            monnaie = montant_recu - especes
            montant_recu = montant_recu + autres
        else:
            montant_recu, monnaie = montant_total, Decimal("0")
    else:
        if montant_recu is None:
            montant_recu = montant_total
        montant_recu = Decimal(montant_recu)
        if montant_recu < montant_total:
            raise ErreurMetier("Le montant recu est inferieur au montant total de la vente.")
        monnaie = montant_recu - montant_total
        paiements = [{"mode_paiement": mode_especes(), "montant": montant_total, "reference_transaction": ""}]

    vente = Vente.objects.create(
        reference=prochaine_reference("VTE"),
        depot=depot,
        session_caissier=session_caissier,
        nom_client=nom_client,
        montant_total=montant_total,
        montant_recu=montant_recu,
        monnaie_rendue=monnaie,
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

    for p in paiements:
        PaiementVente.objects.create(
            vente=vente, mode_paiement=p["mode_paiement"], montant=p["montant"],
            reference_transaction=p.get("reference_transaction", ""),
        )
        caisse_services.enregistrer_encaissement(
            session_caissier, p["montant"], reference_document=vente.reference,
            commentaire=f"Vente {vente.reference} ({p['mode_paiement'].nom})",
            mode_paiement=p["mode_paiement"], utilisateur=utilisateur,
        )
    return vente

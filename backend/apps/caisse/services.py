from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import StatutSessionCaisse, TypeMouvementCaisse
from .models import SessionCaissier, MouvementCaisse

ZERO = Decimal("0")


def _somme(qs):
    return qs.aggregate(
        t=Coalesce(Sum("montant"), Value(ZERO), output_field=DecimalField(max_digits=16, decimal_places=2))
    )["t"]


def peut_gerer_session(utilisateur, session):
    """Le caissier gere sa propre session ; les autres necessitent la permission
    de cloturer / modifier les sessions des autres utilisateurs."""
    return (
        session.utilisateur_id == utilisateur.pk
        or utilisateur.is_superuser
        or utilisateur.a_permission("caisse.fermer_sessions_autres")
    )


@transaction.atomic
def ouvrir_session(depot, utilisateur, montant_ouverture=0, caisse=None):
    if SessionCaissier.objects.filter(
        utilisateur=utilisateur, statut=StatutSessionCaisse.OUVERTE
    ).exists():
        raise ErreurMetier("Vous avez deja une session de caisse ouverte.")

    if caisse is not None:
        if not caisse.etat or caisse.depot_id != depot.id:
            raise ErreurMetier("Cette caisse n'est pas disponible dans ce depot.")
        if SessionCaissier.objects.filter(caisse=caisse, statut=StatutSessionCaisse.OUVERTE).exists():
            raise ErreurMetier("Cette caisse est deja ouverte par un autre caissier.")

    session = SessionCaissier.objects.create(
        depot=depot, utilisateur=utilisateur, montant_ouverture=montant_ouverture, caisse=caisse,
    )
    MouvementCaisse.objects.create(
        session=session, type_mouvement=TypeMouvementCaisse.OUVERTURE,
        montant=montant_ouverture, commentaire="Ouverture de caisse", utilisateur=utilisateur,
    )
    return session


def calculer_resume(session):
    """Chiffres de la session, recalcules a partir des mouvements (immuables).
    Les encaissements sans mode de paiement (ventes au comptoir) sont des especes."""
    mouvements = session.mouvements.all()
    encaissements = mouvements.filter(type_mouvement=TypeMouvementCaisse.ENCAISSEMENT)
    est_especes = Q(mode_paiement__isnull=True) | Q(mode_paiement__especes=True)
    especes = _somme(encaissements.filter(est_especes))
    autres = _somme(encaissements.exclude(est_especes))
    remboursements = _somme(mouvements.filter(type_mouvement=TypeMouvementCaisse.REMBOURSEMENT))
    entrees = _somme(mouvements.filter(type_mouvement=TypeMouvementCaisse.ENTREE_CAISSE))
    sorties = _somme(mouvements.filter(type_mouvement=TypeMouvementCaisse.SORTIE_CAISSE))
    paiements_factures = session.paiements_factures.aggregate(
        t=Coalesce(Sum("montant_paye"), Value(ZERO), output_field=DecimalField(max_digits=16, decimal_places=2))
    )["t"]

    ventes = session.ventes.filter(annulee=False)
    if session.statut == StatutSessionCaisse.FERMEE:
        total_ventes = session.total_ventes
    else:
        total_ventes = ventes.aggregate(
            t=Coalesce(Sum("montant_total"), Value(ZERO), output_field=DecimalField(max_digits=16, decimal_places=2))
        )["t"]
    attendu = session.montant_ouverture + especes + entrees - remboursements - sorties
    return {
        "nombre_ventes": ventes.count(),
        "total_ventes": total_ventes,
        "total_especes": especes,
        "total_autres_paiements": autres,
        "paiements_factures": paiements_factures,
        "remboursements": remboursements,
        "entrees_manuelles": entrees,
        "sorties_manuelles": sorties,
        "montant_attendu": attendu,
    }


@transaction.atomic
def fermer_session(session, montant_fermeture, utilisateur=None, note=""):
    """Cloture la session : fige les totaux, l'attendu et l'ecart. Un
    utilisateur ne peut cloturer la session d'un autre que s'il a la
    permission `caisse.fermer_sessions_autres`."""
    session = SessionCaissier.objects.select_for_update().get(pk=session.pk)
    if session.statut != StatutSessionCaisse.OUVERTE:
        raise ErreurMetier("Cette session est deja fermee.")
    if utilisateur is not None and not peut_gerer_session(utilisateur, session):
        raise ErreurMetier(
            "Seul le caissier de la session, ou un utilisateur autorise a cloturer "
            "les sessions des autres, peut la fermer."
        )
    montant_fermeture = Decimal(montant_fermeture)
    if montant_fermeture < 0:
        raise ErreurMetier("Le montant compte ne peut pas etre negatif.")

    resume = calculer_resume(session)
    session.statut = StatutSessionCaisse.FERMEE
    session.montant_fermeture = montant_fermeture
    session.total_ventes = resume["total_ventes"]
    session.montant_attendu = resume["montant_attendu"]
    session.ecart = montant_fermeture - resume["montant_attendu"]
    session.date_fermeture = timezone.now()
    session.note = (note or "")[:255]
    session.fermee_par = utilisateur
    session.save(update_fields=[
        "statut", "montant_fermeture", "total_ventes", "montant_attendu", "ecart",
        "date_fermeture", "note", "fermee_par",
    ])
    commentaire = "Fermeture de caisse"
    if utilisateur is not None and utilisateur.pk != session.utilisateur_id:
        commentaire += f" par {utilisateur}"
    MouvementCaisse.objects.create(
        session=session, type_mouvement=TypeMouvementCaisse.FERMETURE,
        montant=montant_fermeture, commentaire=commentaire, utilisateur=utilisateur,
    )
    return session


@transaction.atomic
def enregistrer_encaissement(session, montant, reference_document="", commentaire="",
                              mode_paiement=None, utilisateur=None):
    return MouvementCaisse.objects.create(
        session=session, type_mouvement=TypeMouvementCaisse.ENCAISSEMENT,
        montant=montant, reference_document=reference_document, commentaire=commentaire,
        mode_paiement=mode_paiement, utilisateur=utilisateur,
    )


@transaction.atomic
def ajouter_mouvement_manuel(session, utilisateur, type_mouvement, montant, motif):
    """Entree ou sortie manuelle d'especes (fond de caisse, depense, depot en
    banque...). Un motif est obligatoire : il apparait dans le journal."""
    if type_mouvement not in (TypeMouvementCaisse.ENTREE_CAISSE, TypeMouvementCaisse.SORTIE_CAISSE):
        raise ErreurMetier("Type de mouvement manuel invalide.")
    if not motif or not motif.strip():
        raise ErreurMetier("Un motif est obligatoire pour toute operation manuelle.")
    montant = Decimal(montant)
    if montant <= 0:
        raise ErreurMetier("Le montant doit etre superieur a zero.")
    session = SessionCaissier.objects.select_for_update().get(pk=session.pk)
    if session.statut != StatutSessionCaisse.OUVERTE:
        raise ErreurMetier("La session est cloturee.")
    if not peut_gerer_session(utilisateur, session):
        raise ErreurMetier("Vous ne pouvez pas modifier la caisse d'un autre caissier.")
    if type_mouvement == TypeMouvementCaisse.SORTIE_CAISSE:
        attendu = calculer_resume(session)["montant_attendu"]
        if montant > attendu:
            raise ErreurMetier(f"Sortie superieure aux especes attendues en caisse ({attendu}).")
    return MouvementCaisse.objects.create(
        session=session, type_mouvement=type_mouvement, montant=montant,
        commentaire=motif.strip()[:255], utilisateur=utilisateur,
    )


def session_ouverte_pour(utilisateur):
    return SessionCaissier.objects.filter(
        utilisateur=utilisateur, statut=StatutSessionCaisse.OUVERTE
    ).first()


def calculer_solde(session):
    """Especes attendues dans le tiroir-caisse."""
    return calculer_resume(session)["montant_attendu"]

from django.db import transaction
from django.utils import timezone

from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import StatutSessionCaisse, TypeMouvementCaisse
from .models import SessionCaissier, MouvementCaisse


@transaction.atomic
def ouvrir_session(depot, utilisateur, montant_ouverture=0):
    if SessionCaissier.objects.filter(
        utilisateur=utilisateur, statut=StatutSessionCaisse.OUVERTE
    ).exists():
        raise ErreurMetier("Vous avez deja une session de caisse ouverte.")

    session = SessionCaissier.objects.create(
        depot=depot, utilisateur=utilisateur, montant_ouverture=montant_ouverture,
    )
    MouvementCaisse.objects.create(
        session=session, type_mouvement=TypeMouvementCaisse.OUVERTURE,
        montant=montant_ouverture, commentaire="Ouverture de caisse",
    )
    return session


@transaction.atomic
def fermer_session(session, montant_fermeture, utilisateur=None):
    if session.statut != StatutSessionCaisse.OUVERTE:
        raise ErreurMetier("Cette session est deja fermee.")
    session.statut = StatutSessionCaisse.FERMEE
    session.montant_fermeture = montant_fermeture
    session.date_fermeture = timezone.now()
    session.save(update_fields=["statut", "montant_fermeture", "date_fermeture"])
    MouvementCaisse.objects.create(
        session=session, type_mouvement=TypeMouvementCaisse.FERMETURE,
        montant=montant_fermeture, commentaire="Fermeture de caisse",
    )
    return session


@transaction.atomic
def enregistrer_encaissement(session, montant, reference_document="", commentaire=""):
    return MouvementCaisse.objects.create(
        session=session, type_mouvement=TypeMouvementCaisse.ENCAISSEMENT,
        montant=montant, reference_document=reference_document, commentaire=commentaire,
    )


def session_ouverte_pour(utilisateur):
    return SessionCaissier.objects.filter(
        utilisateur=utilisateur, statut=StatutSessionCaisse.OUVERTE
    ).first()


def calculer_solde(session):
    from django.db.models import Sum, Case, When, F, DecimalField
    encaissements = session.mouvements.filter(
        type_mouvement=TypeMouvementCaisse.ENCAISSEMENT
    ).aggregate(total=Sum("montant"))["total"] or 0
    remboursements = session.mouvements.filter(
        type_mouvement=TypeMouvementCaisse.REMBOURSEMENT
    ).aggregate(total=Sum("montant"))["total"] or 0
    sorties = session.mouvements.filter(
        type_mouvement=TypeMouvementCaisse.SORTIE_CAISSE
    ).aggregate(total=Sum("montant"))["total"] or 0
    return session.montant_ouverture + encaissements - remboursements - sorties

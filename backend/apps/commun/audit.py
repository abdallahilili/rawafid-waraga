from django.core.serializers.json import DjangoJSONEncoder
import json

from .models import JournalAudit


def instantane(instance, champs=None):
    """Capture un instantane serialisable JSON d'une instance de modele."""
    if instance is None:
        return None
    data = {}
    champs_a_prendre = champs or [f.name for f in instance._meta.fields]
    for nom in champs_a_prendre:
        valeur = getattr(instance, nom, None)
        try:
            json.dumps(valeur, cls=DjangoJSONEncoder)
        except TypeError:
            valeur = str(valeur)
        data[nom] = valeur
    return json.loads(json.dumps(data, cls=DjangoJSONEncoder))


def enregistrer_audit(utilisateur, action, modele, reference_objet,
                       ancienne_valeur=None, nouvelle_valeur=None):
    JournalAudit.objects.create(
        utilisateur=utilisateur if utilisateur and utilisateur.is_authenticated else None,
        action=action,
        modele=modele,
        reference_objet=str(reference_objet),
        ancienne_valeur=ancienne_valeur,
        nouvelle_valeur=nouvelle_valeur,
    )

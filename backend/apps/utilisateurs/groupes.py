"""Synchronisation du catalogue de fonctionnalites (constantes) avec la
base et creation des groupes par defaut. Les fonctions prennent les
classes de modeles en parametre pour servir aussi dans les migrations."""

from apps.commun.constantes import CATALOGUE_PERMISSIONS, GROUPES_PAR_DEFAUT


def synchroniser_fonctionnalites(Fonctionnalite, Groupe=None, Liaison=None):
    """Cree/met a jour les fonctionnalites du catalogue (sans toucher a
    leur etat) et donne toutes les fonctionnalites au groupe
    Administrateur s'il existe."""
    for module, (_, perms) in CATALOGUE_PERMISSIONS.items():
        for code, libelle in perms:
            Fonctionnalite.objects.update_or_create(
                nom=code, defaults={"description": libelle, "module": module},
            )
    codes = [code for _, perms in CATALOGUE_PERMISSIONS.values() for code, _ in perms]
    Fonctionnalite.objects.exclude(nom__in=codes).delete()  # fonctionnalites retirees du catalogue
    if Groupe is not None:
        admin = Groupe.objects.filter(nom="Administrateur").first()
        if admin is not None:
            attribuer(admin, [f.pk for f in Fonctionnalite.objects.all()], Liaison)


def attribuer(groupe, ids_fonctionnalites, Liaison):
    """Remplace les fonctionnalites d'un groupe."""
    Liaison.objects.filter(groupe=groupe).exclude(fonctionnalite_id__in=ids_fonctionnalites).delete()
    existants = set(Liaison.objects.filter(groupe=groupe).values_list("fonctionnalite_id", flat=True))
    Liaison.objects.bulk_create([
        Liaison(groupe=groupe, fonctionnalite_id=i) for i in ids_fonctionnalites if i not in existants
    ])


def creer_groupes_par_defaut(Fonctionnalite, Groupe, Liaison):
    synchroniser_fonctionnalites(Fonctionnalite)
    for nom, definition in GROUPES_PAR_DEFAUT.items():
        groupe, cree = Groupe.objects.get_or_create(
            nom=nom, defaults={"description": definition["description"]},
        )
        if not cree:
            continue
        codes = definition["permissions"]
        qs = Fonctionnalite.objects.all() if codes is None else Fonctionnalite.objects.filter(nom__in=codes)
        attribuer(groupe, [f.pk for f in qs], Liaison)
    synchroniser_fonctionnalites(Fonctionnalite, Groupe, Liaison)

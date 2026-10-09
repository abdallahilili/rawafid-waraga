from django.apps import AppConfig


class UtilisateursConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.utilisateurs"
    verbose_name = "Utilisateurs"

    def ready(self):
        from django.db.models.signals import post_migrate
        post_migrate.connect(_apres_migration, sender=self)


def _apres_migration(sender, **kwargs):
    """Garde la table des fonctionnalites a jour avec le catalogue."""
    from .groupes import synchroniser_fonctionnalites
    from .models import Fonctionnalite, FonctionnaliteGroupe, Groupe
    synchroniser_fonctionnalites(Fonctionnalite, Groupe, FonctionnaliteGroupe)

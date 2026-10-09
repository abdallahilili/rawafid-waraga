from django.db import migrations

MODES = [("Especes", "ESP"), ("Cheque", "CHQ"), ("Virement", "VIR"), ("Mobile money", "MOB")]


def creer_modes(apps, schema_editor):
    ModePaiement = apps.get_model("facturation", "ModePaiement")
    for nom, alias in MODES:
        ModePaiement.objects.get_or_create(nom=nom, defaults={"alias": alias})


class Migration(migrations.Migration):

    dependencies = [
        ("facturation", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(creer_modes, migrations.RunPython.noop),
    ]

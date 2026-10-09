from django.utils import timezone


def maintenant():
    return timezone.now()


def aujourdhui():
    return timezone.localdate()

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


class ErreurMetier(Exception):
    """Levee pour toute violation d'une regle metier (erreur 400)."""

    def __init__(self, message, code="erreur_metier"):
        self.message = message
        self.code = code
        super().__init__(message)


class NonAuthentifie(Exception):
    """Levee lorsqu'une action necessite une authentification (401)."""

    def __init__(self, message="Authentification requise"):
        self.message = message
        super().__init__(message)


def gestionnaire_exceptions(exc, context):
    if isinstance(exc, ErreurMetier):
        return Response(
            {"detail": exc.message, "code": exc.code},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, NonAuthentifie):
        return Response(
            {"detail": exc.message}, status=status.HTTP_401_UNAUTHORIZED
        )
    return exception_handler(exc, context)

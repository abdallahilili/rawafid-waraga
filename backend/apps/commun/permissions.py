from rest_framework.permissions import BasePermission

METHODES_LECTURE = ("GET", "HEAD", "OPTIONS")


class PermissionParCode(BasePermission):
    """
    Permission basee sur les permissions du groupe de l'utilisateur.

    La vue definit les codes requis (chaque valeur est un code, ou une
    liste/tuple de codes dont un seul suffit) :
    - permission_lecture / permission_ecriture : codes pour les methodes
      de lecture (GET/HEAD/OPTIONS) et pour les autres.
    - permissions_par_action : {nom_action_ou_methode: codes} pour un
      controle plus fin ; prioritaire sur les deux attributs precedents.
      Pour une APIView, la cle est la methode en minuscules ("post").
    Une valeur absente laisse l'acces a tout utilisateur authentifie ;
    une liste vide ([]) le reserve aux super-utilisateurs.
    """

    def has_permission(self, request, view):
        utilisateur = request.user
        if not utilisateur or not utilisateur.is_authenticated:
            return False

        par_action = getattr(view, "permissions_par_action", None) or {}
        cle = getattr(view, "action", None) or request.method.lower()
        if cle in par_action:
            requis = par_action[cle]
        elif request.method in METHODES_LECTURE:
            requis = getattr(view, "permission_lecture", None)
        else:
            requis = getattr(view, "permission_ecriture", None)

        if requis is None:
            return True
        if isinstance(requis, str):
            requis = [requis]
        return any(utilisateur.a_permission(code) for code in requis) \
            or utilisateur.is_superuser

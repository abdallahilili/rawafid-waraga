from rest_framework import viewsets
from .permissions import PermissionParCode


class ViewSetGestion(viewsets.ModelViewSet):
    """ViewSet standard CRUD, filtrage par recherche/tri delegue a DRF."""

    permission_classes = [PermissionParCode]


class ViewSetLecture(viewsets.ReadOnlyModelViewSet):
    permission_classes = [PermissionParCode]

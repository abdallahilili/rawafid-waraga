from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class PaginationStandard(PageNumberPagination):
    page_size = 20
    page_size_query_param = "taille_page"
    max_page_size = 200
    page_query_param = "page"

    def get_paginated_response(self, data):
        return Response(
            {
                "total": self.page.paginator.count,
                "page": self.page.number,
                "taille_page": self.page.paginator.per_page,
                "nombre_pages": self.page.paginator.num_pages,
                "resultats": data,
            }
        )

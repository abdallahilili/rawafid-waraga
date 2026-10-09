from decimal import Decimal
from apps.commun.exceptions import ErreurMetier
from apps.commun.constantes import (
    TypeTravailImpression, FormatPapier, CouleurImpression, StatutCommandeImpression,
)
from apps.impression.models import TarifImpression
from apps.impression import services as impression_services
from .base import CasDeBase


class TestImpression(CasDeBase):
    def setUp(self):
        super().setUp()
        TarifImpression.objects.create(
            depot=self.depot, type_travail=TypeTravailImpression.IMPRESSION,
            format_papier=FormatPapier.A4, couleur=CouleurImpression.NOIR_BLANC,
            prix_unitaire_page=Decimal("10"),
        )

    def test_creation_commande_calcule_montant_serveur(self):
        commande = impression_services.creer_commande_impression(
            self.depot,
            [{
                "type_travail": TypeTravailImpression.IMPRESSION,
                "format_papier": FormatPapier.A4,
                "couleur": CouleurImpression.NOIR_BLANC,
                "nombre_pages": 10,
                "nombre_copies": 3,
            }],
            nom_client="Client Test",
        )
        # 10 pages * 3 copies * 10 = 300
        self.assertEqual(commande.montant_total, Decimal("300"))
        self.assertEqual(commande.statut, StatutCommandeImpression.EN_ATTENTE)

    def test_tarif_manquant_refuse(self):
        with self.assertRaises(ErreurMetier):
            impression_services.creer_commande_impression(
                self.depot,
                [{
                    "type_travail": TypeTravailImpression.PLASTIFICATION,
                    "format_papier": FormatPapier.A3,
                    "couleur": CouleurImpression.COULEUR,
                    "nombre_pages": 1,
                    "nombre_copies": 1,
                }],
            )

    def test_transitions_statut_valides_et_invalides(self):
        commande = impression_services.creer_commande_impression(
            self.depot,
            [{
                "type_travail": TypeTravailImpression.IMPRESSION,
                "format_papier": FormatPapier.A4,
                "couleur": CouleurImpression.NOIR_BLANC,
                "nombre_pages": 1, "nombre_copies": 1,
            }],
        )
        impression_services.changer_statut(commande, StatutCommandeImpression.EN_COURS)
        impression_services.changer_statut(commande, StatutCommandeImpression.TERMINEE)
        impression_services.changer_statut(commande, StatutCommandeImpression.LIVREE)
        commande.refresh_from_db()
        self.assertEqual(commande.statut, StatutCommandeImpression.LIVREE)
        self.assertIsNotNone(commande.date_livraison)

        with self.assertRaises(ErreurMetier):
            impression_services.changer_statut(commande, StatutCommandeImpression.EN_ATTENTE)

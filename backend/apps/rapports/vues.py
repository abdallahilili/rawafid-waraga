import csv
from datetime import timedelta

from django.db.models import Sum, Count, F, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.commun.constantes import StatutCommandeImpression, StatutDocument
from apps.commun.permissions import PermissionParCode
from apps.stock.models import Stock
from apps.ventes.models import Vente, LigneVente, TypeLigneVente
from apps.achats.models import Achat
from apps.impression.models import CommandeImpression


NOMS_MOIS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]


class TableauDeBordView(APIView):
    """KPI + series mensuelles pour le tableau de bord style Acumatica
    (cartes a bandeau colore + graphiques Expedition/Receptions)."""

    permission_classes = [PermissionParCode]
    permission_lecture = "tableau_de_bord.voir"

    def get(self, request):
        aujourdhui = timezone.localdate()
        maintenant = timezone.now()

        commandes_a_livrer = CommandeImpression.objects.filter(
            statut__in=[StatutCommandeImpression.EN_ATTENTE, StatutCommandeImpression.EN_COURS]
        ).count()
        commandes_en_retard = CommandeImpression.objects.filter(
            statut__in=[StatutCommandeImpression.EN_ATTENTE, StatutCommandeImpression.EN_COURS],
            date_livraison_prevue__lt=maintenant,
        ).count()
        commandes_terminees_non_livrees = CommandeImpression.objects.filter(
            statut=StatutCommandeImpression.TERMINEE
        ).count()
        achats_en_attente = Achat.objects.filter(statut=StatutDocument.BROUILLON).count()

        articles_en_rupture = Stock.objects.filter(quantite__lte=F("article__seuil_alerte")).count()

        debut_mois = aujourdhui.replace(day=1)
        ventes_ce_mois = Vente.objects.filter(annulee=False, date_vente__date__gte=debut_mois)
        chiffre_affaires_mois = ventes_ce_mois.aggregate(total=Sum("montant_total"))["total"] or 0
        nombre_ventes_mois = ventes_ce_mois.count()

        livrees_a_temps = CommandeImpression.objects.filter(
            statut=StatutCommandeImpression.LIVREE,
            date_livraison__lte=F("date_livraison_prevue"),
        ).count()
        livrees_total = CommandeImpression.objects.filter(statut=StatutCommandeImpression.LIVREE).count()
        taux_livraison_a_temps = round((livrees_a_temps / livrees_total) * 100, 1) if livrees_total else 0

        # Series sur les 6 derniers mois
        mois_labels = []
        ventes_par_mois = []
        achats_par_mois = []
        taux_livraison_par_mois = []
        for i in range(5, -1, -1):
            annee = aujourdhui.year
            mois = aujourdhui.month - i
            while mois <= 0:
                mois += 12
                annee -= 1
            mois_labels.append(NOMS_MOIS[mois - 1])

            total_vente = Vente.objects.filter(
                annulee=False, date_vente__year=annee, date_vente__month=mois
            ).aggregate(total=Sum("montant_total"))["total"] or 0
            ventes_par_mois.append(float(total_vente))

            total_achat = Achat.objects.filter(
                statut=StatutDocument.VALIDE, date_validation__year=annee, date_validation__month=mois
            ).aggregate(total=Sum("montant_total"))["total"] or 0
            achats_par_mois.append(float(total_achat))

            livrees_m = CommandeImpression.objects.filter(
                statut=StatutCommandeImpression.LIVREE, date_livraison__year=annee, date_livraison__month=mois,
            )
            total_m = livrees_m.count()
            a_temps_m = livrees_m.filter(date_livraison__lte=F("date_livraison_prevue")).count()
            taux_livraison_par_mois.append(round((a_temps_m / total_m) * 100, 1) if total_m else 0)

        return Response({
            "cartes": {
                "commandes_a_livrer": commandes_a_livrer,
                "commandes_en_retard": commandes_en_retard,
                "commandes_terminees_non_livrees": commandes_terminees_non_livrees,
                "achats_en_attente": achats_en_attente,
                "articles_en_rupture": articles_en_rupture,
                "chiffre_affaires_mois": str(chiffre_affaires_mois),
                "nombre_ventes_mois": nombre_ventes_mois,
                "taux_livraison_a_temps": taux_livraison_a_temps,
            },
            "graphiques": {
                "mois": mois_labels,
                "ventes_par_mois": ventes_par_mois,
                "achats_par_mois": achats_par_mois,
                "taux_livraison_par_mois": taux_livraison_par_mois,
            },
        })


class RapportVentesView(APIView):
    permission_classes = [PermissionParCode]
    permission_lecture = "rapports.recettes"

    def get(self, request):
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        qs = Vente.objects.filter(annulee=False)
        if date_debut:
            qs = qs.filter(date_vente__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_vente__date__lte=date_fin)

        if request.query_params.get("format") == "csv":
            reponse = HttpResponse(content_type="text/csv")
            reponse["Content-Disposition"] = 'attachment; filename="rapport_ventes.csv"'
            writer = csv.writer(reponse)
            writer.writerow(["Reference", "Date", "Depot", "Client", "Montant total"])
            for vente in qs.select_related("depot"):
                writer.writerow([
                    vente.reference, vente.date_vente, vente.depot.nom,
                    vente.nom_client, vente.montant_total,
                ])
            return reponse

        total = qs.aggregate(total=Sum("montant_total"), nombre=Count("id"))
        return Response({
            "nombre_ventes": total["nombre"] or 0,
            "montant_total": str(total["total"] or 0),
        })


class RapportStockView(APIView):
    permission_classes = [PermissionParCode]
    permission_lecture = "rapports.etat_stock"

    def get(self, request):
        qs = Stock.objects.select_related("article", "depot")
        depot = request.query_params.get("depot")
        if depot:
            qs = qs.filter(depot_id=depot)

        if request.query_params.get("format") == "csv":
            reponse = HttpResponse(content_type="text/csv")
            reponse["Content-Disposition"] = 'attachment; filename="rapport_stock.csv"'
            writer = csv.writer(reponse)
            writer.writerow(["Article", "Depot", "Quantite", "Cout moyen pondere", "Valeur"])
            for s in qs:
                writer.writerow([s.article.nom, s.depot.nom, s.quantite, s.cout_moyen_pondere, s.valeur_stock])
            return reponse

        valeur_totale = sum(s.valeur_stock for s in qs)
        return Response({
            "nombre_references": qs.values("article").distinct().count(),
            "valeur_totale_stock": str(valeur_totale),
        })


class RapportImpressionView(APIView):
    permission_classes = [PermissionParCode]
    permission_lecture = "rapports.etat_impression"

    def get(self, request):
        qs = CommandeImpression.objects.all()
        par_statut = qs.values("statut").annotate(nombre=Count("id"))
        par_type = CommandeImpression.objects.values(
            type_travail=F("lignes__type_travail")
        ).annotate(nombre=Count("id")).exclude(type_travail__isnull=True)
        return Response({
            "par_statut": list(par_statut),
            "par_type_travail": list(par_type),
        })

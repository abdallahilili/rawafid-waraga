from decimal import Decimal

from apps.caisse import services
from apps.commun.exceptions import ErreurMetier
from apps.facturation.models import ModePaiement
from apps.utilisateurs.groupes import attribuer
from apps.utilisateurs.models import Fonctionnalite, FonctionnaliteGroupe, Groupe, Utilisateur
from .base import CasDeBase


class TestSessionsCaisse(CasDeBase):
    def setUp(self):
        super().setUp()
        self.session = services.ouvrir_session(self.depot, self.caissier, 1000)

    def test_cloture_fige_attendu_et_ecart(self):
        services.enregistrer_encaissement(self.session, 500, reference_document="VTE-1")
        mobile = ModePaiement.objects.create(nom="Mobile test", especes=False)
        services.enregistrer_encaissement(self.session, 300, mode_paiement=mobile)
        services.ajouter_mouvement_manuel(self.session, self.caissier, "ENTREE_CAISSE", 100, "Fond complementaire")
        services.ajouter_mouvement_manuel(self.session, self.caissier, "SORTIE_CAISSE", 200, "Achat fournitures")

        resume = services.calculer_resume(self.session)
        self.assertEqual(resume["total_especes"], Decimal("500"))
        self.assertEqual(resume["total_autres_paiements"], Decimal("300"))
        self.assertEqual(resume["montant_attendu"], Decimal("1400"))  # 1000 + 500 + 100 - 200

        session = services.fermer_session(self.session, 1390, utilisateur=self.caissier, note="manque 10")
        self.assertEqual(session.montant_attendu, Decimal("1400"))
        self.assertEqual(session.ecart, Decimal("-10"))
        self.assertEqual(session.fermee_par, self.caissier)

    def test_mouvement_manuel_exige_un_motif_et_une_session_ouverte(self):
        with self.assertRaises(ErreurMetier):
            services.ajouter_mouvement_manuel(self.session, self.caissier, "SORTIE_CAISSE", 10, "  ")
        with self.assertRaises(ErreurMetier):
            services.ajouter_mouvement_manuel(self.session, self.caissier, "SORTIE_CAISSE", 5000, "trop")
        services.fermer_session(self.session, 1000, utilisateur=self.caissier)
        with self.assertRaises(ErreurMetier):
            services.ajouter_mouvement_manuel(self.session, self.caissier, "ENTREE_CAISSE", 10, "apres cloture")

    def test_cloture_d_une_session_d_autrui_exige_la_permission(self):
        with self.assertRaises(ErreurMetier):
            services.fermer_session(self.session, 1000, utilisateur=self.magasinier)

        # Permission donnee au groupe Magasinier par l'administrateur.
        attribuer(
            self.groupes["Magasinier"],
            list(Fonctionnalite.objects.filter(
                nom__in=list(self.groupes["Magasinier"].fonctionnalites.values_list("nom", flat=True))
                + ["caisse.fermer_sessions_autres"]).values_list("pk", flat=True)),
            FonctionnaliteGroupe,
        )
        magasinier = Utilisateur.objects.get(pk=self.magasinier.pk)
        session = services.fermer_session(self.session, 1000, utilisateur=magasinier)
        self.assertEqual(session.fermee_par, magasinier)

    def test_administrateur_peut_cloturer_via_l_api(self):
        reponse = self.client_pour(self.admin).post(
            f"/api/caisse/sessions/{self.session.id}/fermer/",
            {"montant_fermeture": "1000", "note": "cloture par admin"}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data["statut"], "FERMEE")
        self.assertEqual(reponse.data["fermee_par_nom"], str(self.admin))

    def test_api_cloture_autrui_refusee_sans_permission(self):
        reponse = self.client_pour(self.magasinier).post(
            f"/api/caisse/sessions/{self.session.id}/fermer/", {"montant_fermeture": "1"}, format="json")
        self.assertEqual(reponse.status_code, 403)

    def test_journal_reserve_aux_groupes_autorises(self):
        self.assertEqual(self.client_pour(self.caissier).get("/api/caisse/sessions/").status_code, 403)
        reponse = self.client_pour(self.admin).get("/api/caisse/sessions/")
        self.assertEqual(reponse.status_code, 200)
        reponse = self.client_pour(self.admin).get(f"/api/caisse/sessions/{self.session.id}/mouvements/")
        self.assertEqual(reponse.status_code, 200)
        self.assertGreaterEqual(len(reponse.data), 1)

    def test_journal_limite_a_ses_propres_sessions(self):
        groupe = Groupe.objects.create(nom="Journal seul")
        attribuer(groupe, list(Fonctionnalite.objects.filter(nom="journal_caisse.voir").values_list("pk", flat=True)), FonctionnaliteGroupe)
        autre = Utilisateur.objects.create_user(identifiant="j", mot_de_passe="x", nom="J", groupe=groupe, depot=self.depot)
        reponse = self.client_pour(autre).get("/api/caisse/sessions/")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["total"], 0)  # la session ouverte est celle du caissier

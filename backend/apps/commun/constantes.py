"""Constantes metier partagees par toute l'application."""


# Catalogue des permissions : {module: (libelle, [(code, libelle), ...])}.
# Un groupe d'utilisateurs recoit une liste de codes "module.action".
# Le code "<module>.voir" donne acces au menu correspondant.
CATALOGUE_PERMISSIONS = {
    "tableau_de_bord": ("Tableau de bord", [
        ("tableau_de_bord.voir", "Voir le tableau de bord"),
    ]),
    "caisse": ("Caisse (POS)", [
        ("caisse.voir", "Acceder a l'ecran de caisse"),
        ("caisse.ouvrir_fermer", "Ouvrir et fermer une session de caisse"),
        ("caisse.voir_toutes_sessions", "Voir les sessions de tous les caissiers"),
        ("caisse.mouvements_manuels", "Faire des entrees / sorties manuelles d'especes en caisse"),
        ("caisse.fermer_sessions_autres", "Cloturer les sessions de caisse des autres utilisateurs"),
    ]),
    "journal_caisse": ("Journal de caisse", [
        ("journal_caisse.voir", "Consulter le journal de session (historique, mouvements, ecarts)"),
    ]),
    "ventes": ("Ventes et recettes", [
        ("ventes.voir", "Voir l'historique des ventes"),
        ("ventes.creer", "Encaisser une vente"),
        ("ventes.voir_toutes", "Voir les ventes de tous les caissiers"),
    ]),
    "impression": ("Commandes d'impression", [
        ("impression.voir", "Voir les commandes d'impression"),
        ("impression.creer", "Creer une commande d'impression"),
        ("impression.changer_statut", "Changer le statut d'une commande"),
    ]),
    "clients": ("Clients", [
        ("clients.voir", "Voir les clients"),
        ("clients.gerer", "Creer / modifier / desactiver les clients"),
    ]),
    "facturation": ("Devis, bons de livraison et factures", [
        ("facturation.voir", "Voir les devis, bons de livraison et factures"),
        ("facturation.creer", "Creer et modifier un devis"),
        ("facturation.valider_bl", "Transformer un devis en bon de livraison"),
        ("facturation.valider_facture", "Transformer un bon de livraison en facture"),
        ("facturation.paiement", "Encaisser le paiement d'une facture"),
    ]),
    "tarifs_impression": ("Tarifs d'impression", [
        ("tarifs_impression.voir", "Voir les tarifs"),
        ("tarifs_impression.gerer", "Creer / modifier les tarifs"),
    ]),
    "articles": ("Articles", [
        ("articles.voir", "Voir les articles"),
        ("articles.gerer", "Creer / modifier les articles"),
        ("articles.supprimer", "Supprimer des articles"),
        ("articles.voir_prix_achat", "Voir les prix d'achat et la valeur du stock"),
    ]),
    "stock": ("Stock", [
        ("stock.voir", "Voir le stock"),
        ("stock.voir_mouvements", "Voir les mouvements et inventaires"),
        ("stock.entree", "Enregistrer une entree de stock"),
        ("stock.sortie", "Enregistrer une sortie de stock"),
        ("stock.transfert", "Transferer du stock entre depots"),
        ("stock.inventaire", "Ajuster l'inventaire"),
    ]),
    "fournisseurs": ("Fournisseurs", [
        ("fournisseurs.voir", "Voir les fournisseurs"),
        ("fournisseurs.gerer", "Creer / modifier les fournisseurs"),
    ]),
    "achats": ("Achats", [
        ("achats.voir", "Voir les achats"),
        ("achats.creer", "Creer un achat"),
        ("achats.valider", "Valider un achat (reception)"),
        ("achats.annuler", "Annuler un achat"),
    ]),
    "depots": ("Depots", [
        ("depots.voir", "Voir les depots"),
        ("depots.gerer", "Creer / modifier les depots"),
    ]),
    "utilisateurs": ("Utilisateurs", [
        ("utilisateurs.voir", "Voir les utilisateurs"),
        ("utilisateurs.gerer", "Creer / modifier les utilisateurs"),
    ]),
    "groupes": ("Groupes et permissions", [
        ("groupes.voir", "Voir les groupes"),
        ("groupes.gerer", "Creer / modifier les groupes et leurs permissions"),
    ]),
    "rapports": ("Rapports et etats", [
        ("rapports.voir", "Acceder a la page des rapports"),
        ("rapports.recettes", "Etat des recettes (ventes)"),
        ("rapports.etat_stock", "Etat du stock"),
        ("rapports.etat_impression", "Etat des travaux d'impression"),
    ]),
    "administration": ("Administration", [
        ("administration.voir", "Acceder a la page Parametres"),
        ("administration.parametres", "Modifier les parametres, caisses et modes de paiement"),
        ("administration.journal", "Consulter le journal d'audit"),
    ]),
}

TOUTES_LES_PERMISSIONS = [
    code for _, perms in CATALOGUE_PERMISSIONS.values() for code, _ in perms
]

# Modules affiches dans le menu : visibles si "<module>.voir" est accorde.
MODULES_MENU = [
    "tableau_de_bord", "caisse", "journal_caisse", "ventes", "impression", "tarifs_impression",
    "clients", "facturation", "articles", "stock", "fournisseurs", "achats", "depots",
    "utilisateurs", "groupes", "rapports", "administration",
]

# Groupes crees par defaut (initialiser_donnees / migration).
GROUPES_PAR_DEFAUT = {
    "Administrateur": {
        "description": "Acces complet a toutes les fonctionnalites.",
        "permissions": None,  # None = toutes les fonctionnalites
    },
    "Magasinier": {
        "description": "Gestion des articles, du stock, des achats et fournisseurs.",
        "permissions": [
            "tableau_de_bord.voir", "articles.voir", "articles.gerer",
            "articles.voir_prix_achat", "stock.voir", "stock.voir_mouvements",
            "stock.entree", "stock.sortie", "stock.transfert", "stock.inventaire",
            "fournisseurs.voir", "fournisseurs.gerer", "achats.voir",
            "achats.creer", "achats.valider", "achats.annuler",
            "impression.voir", "impression.creer", "impression.changer_statut",
            "tarifs_impression.voir", "depots.voir", "ventes.voir",
            "clients.voir", "facturation.voir", "facturation.creer",
            "facturation.valider_bl",
        ],
    },
    "Caissier": {
        "description": "Encaissement et suivi de ses propres ventes.",
        "permissions": [
            "tableau_de_bord.voir", "caisse.voir", "caisse.ouvrir_fermer",
            "ventes.voir", "ventes.creer", "impression.voir", "impression.creer",
            "articles.voir", "stock.voir", "depots.voir", "clients.voir",
            "facturation.voir", "facturation.paiement",
        ],
    },
}


class StatutDocument:
    BROUILLON = "BROUILLON"
    VALIDE = "VALIDE"
    ANNULE = "ANNULE"

    CHOIX = [
        (BROUILLON, "Brouillon"),
        (VALIDE, "Valide"),
        (ANNULE, "Annule"),
    ]


class TypeMouvementStock:
    ENTREE = "ENTREE"
    SORTIE = "SORTIE"
    TRANSFERT_SORTIE = "TRANSFERT_SORTIE"
    TRANSFERT_ENTREE = "TRANSFERT_ENTREE"
    AJUSTEMENT = "AJUSTEMENT"
    VENTE = "VENTE"
    CORRECTION = "CORRECTION"

    CHOIX = [
        (ENTREE, "Entree"),
        (SORTIE, "Sortie"),
        (TRANSFERT_SORTIE, "Transfert (sortie)"),
        (TRANSFERT_ENTREE, "Transfert (entree)"),
        (AJUSTEMENT, "Ajustement d'inventaire"),
        (VENTE, "Vente"),
        (CORRECTION, "Correction"),
    ]


class TypeTravailImpression:
    IMPRESSION = "IMPRESSION"
    PHOTOCOPIE = "PHOTOCOPIE"
    RELIURE = "RELIURE"
    PLASTIFICATION = "PLASTIFICATION"
    SCAN = "SCAN"
    AUTRE = "AUTRE"

    CHOIX = [
        (IMPRESSION, "Impression"),
        (PHOTOCOPIE, "Photocopie"),
        (RELIURE, "Reliure"),
        (PLASTIFICATION, "Plastification"),
        (SCAN, "Scan"),
        (AUTRE, "Autre"),
    ]


class FormatPapier:
    A3 = "A3"
    A4 = "A4"
    A5 = "A5"
    AUTRE = "AUTRE"

    CHOIX = [
        (A3, "A3"),
        (A4, "A4"),
        (A5, "A5"),
        (AUTRE, "Autre"),
    ]


class CouleurImpression:
    NOIR_BLANC = "NOIR_BLANC"
    COULEUR = "COULEUR"

    CHOIX = [
        (NOIR_BLANC, "Noir et blanc"),
        (COULEUR, "Couleur"),
    ]


class StatutCommandeImpression:
    EN_ATTENTE = "EN_ATTENTE"
    EN_COURS = "EN_COURS"
    TERMINEE = "TERMINEE"
    LIVREE = "LIVREE"
    ANNULEE = "ANNULEE"

    CHOIX = [
        (EN_ATTENTE, "En attente"),
        (EN_COURS, "En cours"),
        (TERMINEE, "Terminee"),
        (LIVREE, "Livree"),
        (ANNULEE, "Annulee"),
    ]


class StatutSessionCaisse:
    OUVERTE = "OUVERTE"
    FERMEE = "FERMEE"

    CHOIX = [
        (OUVERTE, "Ouverte"),
        (FERMEE, "Fermee"),
    ]


class TypeMouvementCaisse:
    ENCAISSEMENT = "ENCAISSEMENT"
    REMBOURSEMENT = "REMBOURSEMENT"
    OUVERTURE = "OUVERTURE"
    FERMETURE = "FERMETURE"
    SORTIE_CAISSE = "SORTIE_CAISSE"
    ENTREE_CAISSE = "ENTREE_CAISSE"

    CHOIX = [
        (ENCAISSEMENT, "Encaissement"),
        (REMBOURSEMENT, "Remboursement"),
        (OUVERTURE, "Ouverture"),
        (FERMETURE, "Fermeture"),
        (SORTIE_CAISSE, "Sortie de caisse"),
        (ENTREE_CAISSE, "Entree de caisse"),
    ]


# Parametres de l'application : {cle: (valeur par defaut, description)}.
# Seules ces cles sont modifiables depuis la page Parametres.
PARAMETRES_PAR_DEFAUT = {
    "NOM_ENTREPRISE": ("Papeterie & Imprimerie", "Nom de l'entreprise"),
    "LOGO_ENTREPRISE": ("", "Logo (image encodee en data URL)"),
    "TELEPHONE_ENTREPRISE": ("", "Telephone 1"),
    "TELEPHONE_ENTREPRISE_2": ("", "Telephone 2 (optionnel)"),
    "ADRESSE_ENTREPRISE": ("", "Adresse de l'entreprise"),
    "EMAIL_ENTREPRISE": ("", "Email de l'entreprise"),
    "NIF_ENTREPRISE": ("", "NIF / registre de commerce"),
    "DEVISE": ("MRU", "Devise affichee sur les montants imprimes"),
    "MESSAGE_RECU": ("Merci de votre confiance !", "Message en bas des recus"),
    "MESSAGE_DEVIS": ("Devis valable 30 jours - Bon pour accord (signature du client)", "Message en bas des devis"),
    "MESSAGE_BL": ("Merci de verifier la conformite des quantites a la reception.", "Message en bas des bons de livraison"),
    "MESSAGE_FACTURE": ("", "Message en bas des factures (vide = message du recu)"),
    "AFFICHER_LOGO_DOCUMENTS": ("1", "1 pour afficher le logo sur les documents imprimes"),
    "AUTORISER_STOCK_NEGATIF": ("0", "1 pour autoriser un stock negatif"),
}

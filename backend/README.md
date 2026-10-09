# Papeterie & Imprimerie — Backend (Django + DRF)

Application de gestion pour un commerce de papeterie / imprimerie :
articles, stock, fournisseurs, achats, travaux d'impression a la commande
(impression, photocopie, reliure, plastification...), ventes/caisse,
utilisateurs et rapports. Architecture et conventions reprises du projet
de gestion de pharmacie (Django/DRF/MySQL, JWT, noms francais partout).

## Installation

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajuster les identifiants MySQL si besoin
python manage.py migrate
python manage.py initialiser_donnees   # cree le depot + l'utilisateur admin
python manage.py charger_demo          # (optionnel) donnees de demonstration
python manage.py runserver
```

Pour tester rapidement sans MySQL, definir `UTILISER_SQLITE=1` dans `.env`
ou dans l'environnement.

Identifiants crees par `initialiser_donnees` : `admin` / `admin123`.
`charger_demo` ajoute en plus `caissier1` / `caissier123` et
`magasinier1` / `magasinier123`.

## Lancer les tests

```bash
UTILISER_SQLITE=1 python manage.py test apps.tests
```

## Principes d'architecture (identiques au projet pharmacie)

- **Point d'ecriture unique du stock** : `apps/stock/services.py::appliquer_mouvement()`.
  Aucun autre module ne touche `Stock.quantite` directement. Verrouillage
  de ligne (`select_for_update`), non-negativite du stock (sauf parametre
  `AUTORISER_STOCK_NEGATIF`), cout unitaire moyen pondere (CUMP) recalcule
  a chaque entree. Pas de notion de lot/peremption (articles de papeterie).
- **Historique immuable** : `MouvementStock`, `Vente` et `MouvementCaisse`
  heritent de `ModeleImmuable` (edition/suppression bloquees apres
  creation). Toute correction se fait par mouvement inverse.
- **Transactions atomiques** sur toutes les operations metier
  (`@transaction.atomic`), erreurs metier renvoyees en 400 via
  `ErreurMetier` plutot que des exceptions generiques.
- **Prix/stock toujours calcules cote serveur**, jamais fait confiance au
  frontend (ventes, commandes d'impression).
- **Commandes d'impression** : grille tarifaire configurable par depot
  (`TarifImpression`, cle type de travail + format + couleur), commande
  avec plusieurs lignes, transitions de statut controlees
  (`EN_ATTENTE -> EN_COURS -> TERMINEE -> LIVREE`, ou `ANNULEE`).
  Une commande terminee peut etre reglee au comptoir : la vente cree une
  ligne de type `IMPRESSION` reliee a la commande (OneToOne, empeche le
  double encaissement).
- **Groupes et permissions** : chaque utilisateur appartient a un groupe
  (modele `Groupe`) qui regroupe des permissions par menu et par
  fonctionnalite (`module.action`, ex. `rapports.recettes`,
  `impression.bon_livraison`). Le catalogue est dans
  `apps/commun/constantes.py` (`CATALOGUE_PERMISSIONS`) ; les groupes se
  gerent depuis l'ecran « Groupes et permissions » (ou `/api/utilisateurs/groupes/`).
  Groupes par defaut : Administrateur (acces complet), Magasinier, Caissier.
  On peut creer autant de groupes que voulu (ex. deux groupes de caissiers
  aux droits differents). Sans la permission `articles.voir_prix_achat`,
  les prix d'achat et la valeur du stock sont masques.
- **Noms francais** partout (modeles, colonnes, URLs, parametres DRF),
  sauf les attributs imposes par Django/DRF (`password`, `is_active`,
  `last_login`), documentes comme exceptions.

## Modules

| App | Role |
|---|---|
| `commun` | infrastructure partagee (audit, sequences, permissions, pagination) |
| `utilisateurs` | authentification JWT, groupes et permissions |
| `depots` | magasins / points de vente |
| `articles` | catalogue des articles de papeterie |
| `fournisseurs` | fournisseurs |
| `stock` | niveaux de stock, mouvements, transferts, inventaires |
| `achats` | commandes fournisseur (brouillon -> validee -> stock mis a jour) |
| `impression` | tarifs et commandes de travaux d'impression sur mesure |
| `ventes` | ventes au comptoir (articles + travaux d'impression) |
| `caisse` | sessions caissier, mouvements de caisse |
| `rapports` | tableau de bord (KPI + graphiques) et rapports CSV |

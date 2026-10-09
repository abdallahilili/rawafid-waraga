# Papeterie & Imprimerie — Frontend (React + TypeScript + Tailwind)

Interface inspiree du tableau de bord Acumatica (barre superieure bleue,
sidebar a icones, cartes KPI a bandeau colore, graphiques en cartes
blanches). Memes conventions et composants generiques que le projet de
gestion de pharmacie (`PageCrud`, `useListe`/`useOptions`, intercepteur
JWT avec rafraichissement automatique...).

## Installation

```bash
npm install
cp .env .env.local   # ajuster VITE_URL_API si le backend n'est pas sur localhost:8000
npm run dev
```

## Build de production

```bash
npm run build
npm run preview   # pour verifier le build localement
```

## Structure

- `src/services/` — client Axios (`api.ts`) et authentification (`auth.ts`).
- `src/hooks/` — `useAuth` (contexte d'authentification + permissions par
  module), `useListe`/`useOptions` (listes paginees et dropdowns).
- `src/composants/` — composants reutilisables : `PageCrud` (CRUD generique
  piloté par configuration), `TableauDonnees`, `Modale`, `Badge`,
  `CarteKpi`, `Graphiques` (barres/ligne en SVG, style Acumatica),
  `Notifications`, `Confirmation`.
- `src/miseEnPage/` — barre superieure + sidebar (`MiseEnPagePrincipale`),
  menu et boutons filtres par permissions du groupe (`menu.ts`, `autorise()`).
- `src/pages/` — une page par module (articles, stock, achats, impression,
  caisse/POS, ventes, utilisateurs, depots, fournisseurs, rapports).

## Comptes de demonstration

Apres avoir lance `python manage.py charger_demo` cote backend :

| Identifiant | Mot de passe | Groupe |
|---|---|---|
| admin | admin123 | Administrateur |
| caissier1 | caissier123 | Caissier |
| caissier2 | caissier123 | Caissier principal |
| magasinier1 | magasinier123 | Magasinier |

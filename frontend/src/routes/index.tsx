import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { PageTableauDeBord } from "../pages/TableauDeBord";
import { PageArticles } from "../pages/articles/Articles";
import { PageFournisseurs } from "../pages/fournisseurs/Fournisseurs";
import { PageDepots } from "../pages/depots/Depots";
import { PageUtilisateurs } from "../pages/utilisateurs/Utilisateurs";
import { PageGroupes } from "../pages/utilisateurs/Groupes";
import { PageFacturation } from "../pages/facturation/Facturation";
import { PageClients } from "../pages/facturation/Clients";
import { PageStock } from "../pages/stock/Stock";
import { PageAchats } from "../pages/achats/Achats";
import { PageTarifsImpression } from "../pages/impression/TarifsImpression";
import { PageCommandesImpression } from "../pages/impression/CommandesImpression";
import { PageCaisse } from "../pages/caisse/Caisse";
import { PageJournalCaisse } from "../pages/caisse/JournalCaisse";
import { PageVentes } from "../pages/ventes/Ventes";
import { PageRapports } from "../pages/rapports/Rapports";
import { PageParametres } from "../pages/parametres/Parametres";

export interface RouteProtegee {
  chemin: string;
  module: string;
  element: ReactElement;
}

export const routesProtegees: RouteProtegee[] = [
  { chemin: "/", module: "tableau_de_bord", element: <PageTableauDeBord /> },
  { chemin: "/articles", module: "articles", element: <PageArticles /> },
  { chemin: "/fournisseurs", module: "fournisseurs", element: <PageFournisseurs /> },
  { chemin: "/depots", module: "depots", element: <PageDepots /> },
  { chemin: "/utilisateurs", module: "utilisateurs", element: <PageUtilisateurs /> },
  { chemin: "/groupes", module: "groupes", element: <PageGroupes /> },
  { chemin: "/facturation", module: "facturation", element: <PageFacturation /> },
  { chemin: "/clients", module: "clients", element: <PageClients /> },
  { chemin: "/stock", module: "stock", element: <PageStock /> },
  { chemin: "/achats", module: "achats", element: <PageAchats /> },
  { chemin: "/tarifs-impression", module: "tarifs_impression", element: <PageTarifsImpression /> },
  { chemin: "/impression", module: "impression", element: <PageCommandesImpression /> },
  { chemin: "/caisse", module: "caisse", element: <PageCaisse /> },
  { chemin: "/journal-caisse", module: "journal_caisse", element: <PageJournalCaisse /> },
  { chemin: "/ventes", module: "ventes", element: <PageVentes /> },
  { chemin: "/rapports", module: "rapports", element: <PageRapports /> },
  { chemin: "/parametres", module: "administration", element: <PageParametres /> },
  { chemin: "*", module: "tableau_de_bord", element: <Navigate to="/" replace /> },
];

import {
  LayoutDashboard, Package, Layers, Truck, ShoppingCart, Printer, Tags,
  CreditCard, ReceiptText, Warehouse, Users, BarChart3, ShieldCheck,
} from "lucide-react";

export interface ElementMenu {
  module: string;
  libelle: string;
  chemin: string;
  icone: typeof LayoutDashboard;
}

export const MENU: ElementMenu[] = [
  { module: "tableau_de_bord", libelle: "Tableau de bord", chemin: "/", icone: LayoutDashboard },
  { module: "caisse", libelle: "Caisse (POS)", chemin: "/caisse", icone: CreditCard },
  { module: "ventes", libelle: "Ventes", chemin: "/ventes", icone: ReceiptText },
  { module: "impression", libelle: "Commandes d'impression", chemin: "/impression", icone: Printer },
  { module: "tarifs_impression", libelle: "Tarifs d'impression", chemin: "/tarifs-impression", icone: Tags },
  { module: "articles", libelle: "Articles", chemin: "/articles", icone: Package },
  { module: "stock", libelle: "Stock", chemin: "/stock", icone: Layers },
  { module: "fournisseurs", libelle: "Fournisseurs", chemin: "/fournisseurs", icone: Truck },
  { module: "achats", libelle: "Achats", chemin: "/achats", icone: ShoppingCart },
  { module: "depots", libelle: "Depots", chemin: "/depots", icone: Warehouse },
  { module: "utilisateurs", libelle: "Utilisateurs", chemin: "/utilisateurs", icone: Users },
  { module: "groupes", libelle: "Groupes et permissions", chemin: "/groupes", icone: ShieldCheck },
  { module: "rapports", libelle: "Rapports", chemin: "/rapports", icone: BarChart3 },
];

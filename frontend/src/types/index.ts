export interface Groupe {
  id: number;
  nom: string;
  description: string;
  etat: boolean;
  fonctionnalites: string[];
  nombre_utilisateurs: number;
}

export interface ModulePermissions {
  module: string;
  libelle: string;
  permissions: { code: string; libelle: string }[];
}

export interface Utilisateur {
  id: number;
  identifiant: string;
  nom: string;
  prenom: string;
  telephone: string;
  groupe: number | null;
  groupe_nom: string | null;
  fonction: number | null;
  fonction_nom: string | null;
  depot: number | null;
  depot_nom: string | null;
  actif: boolean;
  date_creation: string;
  modules: string[];
  permissions: string[];
}

export interface Depot {
  id: number;
  nom: string;
  code: string;
  adresse: string;
  telephone: string;
  est_point_de_vente: boolean;
  actif: boolean;
}

export interface Categorie {
  id: number;
  nom: string;
}

export interface Article {
  id: number;
  nom: string;
  reference: string;
  code_barre: string;
  categorie: number | null;
  categorie_nom: string | null;
  unite: string;
  prix_achat?: string;
  prix_vente: string;
  seuil_alerte: number;
  actif: boolean;
  date_creation: string;
  stock_total: number;
}

export interface Fournisseur {
  id: number;
  nom: string;
  sigle: string;
  adresse: string;
  telephone1: string;
  telephone2: string;
  email: string;
  actif: boolean;
}

export interface Stock {
  id: number;
  article: number;
  article_nom: string;
  article_reference: string;
  depot: number;
  depot_nom: string;
  quantite: number;
  cout_moyen_pondere?: string;
  seuil_alerte: number;
  valeur_stock?: string;
}

export interface MouvementStock {
  id: number;
  article: number;
  article_nom: string;
  depot: number;
  depot_nom: string;
  type_mouvement: string;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  prix_unitaire: string | null;
  reference_document: string;
  commentaire: string;
  utilisateur_nom: string;
  date_mouvement: string;
}

export interface LigneAchat {
  id: number;
  article: number;
  article_nom: string;
  quantite: number;
  prix_unitaire: string;
  montant: string;
}

export interface Achat {
  id: number;
  reference: string;
  fournisseur: number;
  fournisseur_nom: string;
  depot: number;
  depot_nom: string;
  statut: "BROUILLON" | "VALIDE" | "ANNULE";
  date_achat: string;
  date_validation: string | null;
  montant_total: string;
  lignes: LigneAchat[];
}

export type TypeTravail = "IMPRESSION" | "PHOTOCOPIE" | "RELIURE" | "PLASTIFICATION" | "SCAN" | "AUTRE";
export type FormatPapier = "A3" | "A4" | "A5" | "AUTRE";
export type Couleur = "NOIR_BLANC" | "COULEUR";
export type StatutCommandeImpression = "EN_ATTENTE" | "EN_COURS" | "TERMINEE" | "LIVREE" | "ANNULEE";

export interface TarifImpression {
  id: number;
  depot: number;
  depot_nom: string;
  type_travail: TypeTravail;
  format_papier: FormatPapier;
  couleur: Couleur;
  prix_unitaire_page: string;
  actif: boolean;
  libelle: string;
  /** Nombre de fois ou ce travail a ete vendu au comptoir. */
  frequence: number;
}

export interface LigneCommandeImpression {
  id: number;
  type_travail: TypeTravail;
  format_papier: FormatPapier;
  couleur: Couleur;
  recto_verso: boolean;
  nombre_pages: number;
  nombre_copies: number;
  prix_unitaire_page: string;
  description: string;
  montant: string;
}

export interface CommandeImpression {
  id: number;
  reference: string;
  depot: number;
  depot_nom: string;
  nom_client: string;
  telephone_client: string;
  statut: StatutCommandeImpression;
  date_commande: string;
  date_livraison_prevue: string | null;
  date_livraison: string | null;
  montant_total: string;
  lignes: LigneCommandeImpression[];
}

export interface LigneVente {
  id: number;
  type_ligne: "ARTICLE" | "IMPRESSION" | "SERVICE";
  article: number | null;
  article_nom: string | null;
  designation: string;
  quantite: number | null;
  commande_impression: number | null;
  reference_commande_impression: string | null;
  prix_unitaire: string;
  montant: string;
}

export interface Vente {
  id: number;
  reference: string;
  depot: number;
  depot_nom: string;
  session_caissier: number;
  caissier_nom: string;
  nom_client: string;
  montant_total: string;
  montant_recu: string;
  monnaie_rendue: string;
  annulee: boolean;
  date_vente: string;
  lignes: LigneVente[];
  paiements: { id: number; mode_paiement: number; mode_paiement_nom: string; montant: string; reference_transaction: string }[];
}

export interface SessionCaissier {
  id: number;
  depot: number;
  depot_nom: string;
  caisse: number | null;
  caisse_nom: string;
  utilisateur: number;
  caissier_nom: string;
  statut: "OUVERTE" | "FERMEE";
  montant_ouverture: string;
  montant_fermeture: string | null;
  montant_attendu: string | null;
  ecart: string | null;
  note: string;
  date_ouverture: string;
  date_fermeture: string | null;
  fermee_par_nom: string;
  solde: string;
  resume: ResumeSession;
}

export interface ResumeSession {
  nombre_ventes: number;
  total_ventes: string;
  total_especes: string;
  total_autres_paiements: string;
  paiements_factures: string;
  remboursements: string;
  entrees_manuelles: string;
  sorties_manuelles: string;
  montant_attendu: string;
}

export interface MouvementCaisse {
  id: number;
  type_mouvement: string;
  type_libelle: string;
  montant: string;
  mode_paiement_nom: string;
  reference_document: string;
  commentaire: string;
  utilisateur_nom: string;
  date_mouvement: string;
}

export interface Caisse {
  id: number;
  nom: string;
  depot: number;
  depot_nom: string;
  etat: boolean;
}

export interface ListePaginee<T> {
  total: number;
  page: number;
  taille_page: number;
  nombre_pages: number;
  resultats: T[];
}

export interface TableauDeBord {
  cartes: {
    commandes_a_livrer: number;
    commandes_en_retard: number;
    commandes_terminees_non_livrees: number;
    achats_en_attente: number;
    articles_en_rupture: number;
    chiffre_affaires_mois: string;
    nombre_ventes_mois: number;
    taux_livraison_a_temps: number;
  };
  graphiques: {
    mois: string[];
    ventes_par_mois: number[];
    achats_par_mois: number[];
    taux_livraison_par_mois: number[];
  };
}

export interface Client {
  id: number;
  nom: string;
  prenom: string;
  num_client: string;
  etat: boolean;
}

export interface ModePaiement {
  id: number;
  nom: string;
  alias: string;
  etat: boolean;
  /** Paiement en especes : compte dans le tiroir-caisse. */
  especes: boolean;
}

export interface LigneExpression {
  id: number;
  article: number | null;
  tarif: number | null;
  article_nom: string;
  unite: string;
  quantite_devis: number;
  quantite_livre: number;
  prix: string;
  prix_total: string;
}

/** Devis (etat 0), bon de livraison (1) ou facture (2). */
export interface ExpressionBesoins {
  id: number;
  reference: string;
  client: number;
  client_nom: string;
  personnel_nom: string;
  etat: 0 | 1 | 2;
  etat_libelle: string;
  etat_paiement: 0 | 1;
  date_devis: string;
  date_bc: string | null;
  date_fc: string | null;
  numero_bl: string;
  numero_facture: string;
  prix_total: string;
  montant_reste: string;
  lignes: LigneExpression[];
}

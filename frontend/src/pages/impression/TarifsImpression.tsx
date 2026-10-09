import { PageCrud } from "../../composants/PageCrud";
import type { TarifImpression } from "../../types";

const CHOIX_TRAVAIL = [
  { value: "IMPRESSION", label: "Impression" },
  { value: "PHOTOCOPIE", label: "Photocopie" },
  { value: "RELIURE", label: "Reliure" },
  { value: "PLASTIFICATION", label: "Plastification" },
  { value: "SCAN", label: "Scan" },
  { value: "AUTRE", label: "Autre" },
];
const CHOIX_FORMAT = [
  { value: "A3", label: "A3" }, { value: "A4", label: "A4" },
  { value: "A5", label: "A5" }, { value: "AUTRE", label: "Autre" },
];
const CHOIX_COULEUR = [
  { value: "NOIR_BLANC", label: "Noir et blanc" }, { value: "COULEUR", label: "Couleur" },
];

export function PageTarifsImpression() {
  return (
    <PageCrud<TarifImpression>
      titre="Tarifs d'impression"
      url="/impression/tarifs/"
      cleLigne={(t) => t.id}
      valeursParDefaut={{ actif: true, couleur: "NOIR_BLANC" }}
      colonnes={[
        { cle: "depot_nom", titre: "Depot" },
        { cle: "type_travail", titre: "Type de travail" },
        { cle: "format_papier", titre: "Format" },
        { cle: "couleur", titre: "Couleur" },
        { cle: "prix_unitaire_page", titre: "Prix / page", alignerDroite: true, rendu: (t) => `${t.prix_unitaire_page} MRU` },
      ]}
      champs={[
        { nom: "depot", label: "Depot", type: "select", optionsUrl: "/depots/", requis: true },
        { nom: "type_travail", label: "Type de travail", type: "select", optionsStatiques: CHOIX_TRAVAIL, requis: true },
        { nom: "format_papier", label: "Format papier", type: "select", optionsStatiques: CHOIX_FORMAT, requis: true },
        { nom: "couleur", label: "Couleur", type: "select", optionsStatiques: CHOIX_COULEUR, requis: true },
        { nom: "prix_unitaire_page", label: "Prix par page", type: "decimal", requis: true },
        { nom: "actif", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}

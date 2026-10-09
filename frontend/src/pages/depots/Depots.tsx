import { PageCrud } from "../../composants/PageCrud";
import type { Depot } from "../../types";

export function PageDepots() {
  return (
    <PageCrud<Depot>
      titre="Depots"
      url="/depots/"
      cleLigne={(d) => d.id}
      valeursParDefaut={{ actif: true, est_point_de_vente: true }}
      colonnes={[
        { cle: "nom", titre: "Nom" },
        { cle: "code", titre: "Code" },
        { cle: "adresse", titre: "Adresse" },
        { cle: "telephone", titre: "Telephone" },
        {
          cle: "est_point_de_vente", titre: "Point de vente",
          rendu: (d) => (d.est_point_de_vente ? "Oui" : "Non"),
        },
      ]}
      champs={[
        { nom: "nom", label: "Nom", requis: true, colonnePleine: true },
        { nom: "code", label: "Code", requis: true },
        { nom: "adresse", label: "Adresse", colonnePleine: true },
        { nom: "telephone", label: "Telephone" },
        { nom: "est_point_de_vente", label: "Point de vente", type: "checkbox" },
        { nom: "actif", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}

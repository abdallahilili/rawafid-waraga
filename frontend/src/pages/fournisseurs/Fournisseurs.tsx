import { PageCrud } from "../../composants/PageCrud";
import type { Fournisseur } from "../../types";

export function PageFournisseurs() {
  return (
    <PageCrud<Fournisseur>
      titre="Fournisseurs"
      url="/fournisseurs/"
      cleLigne={(f) => f.id}
      valeursParDefaut={{ actif: true }}
      colonnes={[
        { cle: "nom", titre: "Nom" },
        { cle: "sigle", titre: "Sigle" },
        { cle: "telephone1", titre: "Telephone" },
        { cle: "email", titre: "Email" },
        {
          cle: "actif", titre: "Statut",
          rendu: (f) => (
            <span className={f.actif ? "text-accent-vert" : "text-accent-rouge"}>
              {f.actif ? "Actif" : "Inactif"}
            </span>
          ),
        },
      ]}
      champs={[
        { nom: "nom", label: "Nom", requis: true, colonnePleine: true },
        { nom: "sigle", label: "Sigle" },
        { nom: "adresse", label: "Adresse", colonnePleine: true },
        { nom: "telephone1", label: "Telephone 1" },
        { nom: "telephone2", label: "Telephone 2" },
        { nom: "email", label: "Email", type: "email" },
        { nom: "actif", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}

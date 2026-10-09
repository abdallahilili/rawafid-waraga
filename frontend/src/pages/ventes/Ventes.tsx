import { useListe } from "../../hooks/useListe";
import { TableauDonnees } from "../../composants/TableauDonnees";
import type { Vente } from "../../types";

export function PageVentes() {
  const { resultats, chargement, page, setPage, nombrePages } = useListe<Vente>("/ventes/");

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-texte">Historique des ventes</h1>
      <TableauDonnees<Vente>
        colonnes={[
          { cle: "reference", titre: "Reference" },
          { cle: "date_vente", titre: "Date", rendu: (v) => new Date(v.date_vente).toLocaleString("fr-FR") },
          { cle: "depot_nom", titre: "Depot" },
          { cle: "caissier_nom", titre: "Caissier" },
          { cle: "nom_client", titre: "Client" },
          { cle: "montant_total", titre: "Montant", alignerDroite: true, rendu: (v) => `${v.montant_total} MRU` },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(v) => v.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
      />
    </div>
  );
}

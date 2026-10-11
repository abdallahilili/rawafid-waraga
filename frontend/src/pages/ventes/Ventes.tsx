import { useEntreprise } from "../../hooks/useEntreprise";
import { useState } from "react";
import { Printer } from "lucide-react";
import { useListe } from "../../hooks/useListe";
import { TableauDonnees } from "../../composants/TableauDonnees";
import { RecuImpression } from "../../composants/RecuImpression";
import { formaterDateHeure, formaterDateHeureExport } from "../../utilitaires/formatage";
import type { Vente } from "../../types";

export function PageVentes() {
  const { devise } = useEntreprise();
  const { resultats, chargement, page, setPage, nombrePages } = useListe<Vente>("/ventes/");
  const [recu, setRecu] = useState<Vente | null>(null);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-texte">Historique des ventes</h1>
      <TableauDonnees<Vente>
        titre="Ventes"
        colonnes={[
          { cle: "reference", titre: "Reference" },
          { cle: "date_vente", titre: "Date", rendu: (v) => formaterDateHeure(v.date_vente), exportRendu: (v) => formaterDateHeureExport(v.date_vente) },
          { cle: "depot_nom", titre: "Depot" },
          { cle: "caissier_nom", titre: "Caissier" },
          { cle: "nom_client", titre: "Client" },
          { cle: "montant_total", titre: "Montant", alignerDroite: true, rendu: (v) => `${v.montant_total} ${devise}` },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(v) => v.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
        actions={(v) => (
          <button onClick={() => setRecu(v)} className="inline-flex items-center gap-1 rounded border border-bordure px-2 py-0.5 text-xs hover:bg-fond">
            <Printer size={12} /> Recu
          </button>
        )}
      />
      <RecuImpression vente={recu} onFermer={() => setRecu(null)} />
    </div>
  );
}

import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

export function PageRapports() {
  const { autorise } = useAuth();
  const [chargement, setChargement] = useState<string | null>(null);

  async function telecharger(url: string, nomFichier: string) {
    setChargement(url);
    try {
      const reponse = await api.get(url, { params: { format: "csv" }, responseType: "blob" });
      const lien = document.createElement("a");
      lien.href = URL.createObjectURL(reponse.data);
      lien.download = nomFichier;
      lien.click();
    } finally {
      setChargement(null);
    }
  }

  const rapports = [
    { permission: "rapports.recettes", url: "/rapports/ventes/", fichier: "rapport_ventes.csv", titre: "Etat des recettes (ventes)", description: "Liste des ventes encaissees avec montants et depots." },
    { permission: "rapports.etat_stock", url: "/rapports/stock/", fichier: "rapport_stock.csv", titre: "Etat du stock", description: "Niveaux de stock, cout moyen pondere et valeur par article/depot." },
  ].filter((r) => autorise(r.permission));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-texte">Rapports</h1>
      {rapports.length === 0 && <p className="text-sm text-texte-attenue">Aucun etat disponible pour votre groupe.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rapports.map((r) => (
          <div key={r.url} className="rounded-md border border-bordure bg-fond-carte p-4 shadow-carte">
            <h2 className="mb-1 text-sm font-semibold text-texte">{r.titre}</h2>
            <p className="mb-3 text-sm text-texte-attenue">{r.description}</p>
            <button
              onClick={() => telecharger(r.url, r.fichier)}
              disabled={chargement === r.url}
              className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond disabled:opacity-50"
            >
              <Download size={15} /> Telecharger CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

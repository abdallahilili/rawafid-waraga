import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Columns3, FileSpreadsheet, FileText } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { exporterExcel, exporterPdf } from "../utilitaires/exports";

export interface Colonne<T> {
  cle: string;
  titre: string;
  rendu?: (ligne: T) => ReactNode;
  /** Valeur texte/nombre utilisee dans les exports (par defaut : le champ `cle` de la ligne). */
  exportRendu?: (ligne: T) => string | number | null;
  alignerDroite?: boolean;
  cacheParDefaut?: boolean;
}

interface Props<T> {
  colonnes: Colonne<T>[];
  lignes: T[];
  chargement?: boolean;
  cleLigne: (ligne: T) => string | number;
  actions?: (ligne: T) => ReactNode;
  page?: number;
  nombrePages?: number;
  onChangerPage?: (page: number) => void;
  videMessage?: string;
  /** Titre du document exporte (PDF / Excel). */
  titre?: string;
  choixColonnes?: boolean;
  exporter?: boolean;
}

function valeurExport<T>(colonne: Colonne<T>, ligne: T) {
  if (colonne.exportRendu) return colonne.exportRendu(ligne);
  if (colonne.rendu) {
    const affiche = colonne.rendu(ligne);
    if (typeof affiche === "string" || typeof affiche === "number") return affiche;
  }
  const valeur = (ligne as Record<string, unknown>)[colonne.cle];
  if (typeof valeur === "boolean") return valeur ? "Oui" : "Non";
  return valeur == null || typeof valeur === "object" ? "" : (valeur as string | number);
}

const BOUTON_OUTIL = "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-texte-attenue hover:bg-fond disabled:opacity-40";

export function TableauDonnees<T>({
  colonnes, lignes, chargement, cleLigne, actions, page = 1, nombrePages = 1, onChangerPage,
  videMessage = "Aucune donnee.", titre = "Export", choixColonnes = true, exporter = true,
}: Props<T>) {
  const { utilisateur } = useAuth();
  const [cachees, setCachees] = useState<string[]>(colonnes.filter((c) => c.cacheParDefaut).map((c) => c.cle));
  const [menuOuvert, setMenuOuvert] = useState(false);
  const visibles = colonnes.filter((c) => !cachees.includes(c.cle));

  const nomFichier = titre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "export";
  const donneesExport = () => ({
    titre, nomFichier,
    entetes: visibles.map((c) => c.titre),
    lignes: lignes.map((l) => visibles.map((c) => valeurExport(c, l))),
  });
  const imprimePar = utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}`.trim() : "-";

  return (
    <div className="rounded-md border border-bordure bg-fond-carte shadow-carte">
      {(exporter || choixColonnes) && (
        <div className="sans-impression flex flex-wrap justify-end gap-2 rounded-t-md border-b border-bordure px-3 py-2">
          {exporter && (
            <>
              <button type="button" className={BOUTON_OUTIL} disabled={lignes.length === 0}
                onClick={() => exporterExcel(donneesExport())}>
                <FileSpreadsheet size={14} /> Exporter en Excel
              </button>
              <button type="button" className={BOUTON_OUTIL} disabled={lignes.length === 0}
                onClick={() => exporterPdf({ ...donneesExport(), imprimePar })}>
                <FileText size={14} /> Exporter en PDF
              </button>
            </>
          )}
          {choixColonnes && (
            <div className="relative">
              <button type="button" className={BOUTON_OUTIL} onClick={() => setMenuOuvert(!menuOuvert)}>
                <Columns3 size={14} /> Colonnes
              </button>
              {menuOuvert && (
                <div className="absolute right-0 top-9 z-20 max-h-72 w-56 overflow-y-auto rounded-md border border-bordure bg-white p-2 shadow-lg">
                  {colonnes.map((c) => (
                    <label key={c.cle} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-fond">
                      <input
                        type="checkbox"
                        checked={!cachees.includes(c.cle)}
                        disabled={!cachees.includes(c.cle) && visibles.length === 1}
                        onChange={() => setCachees((x) => (x.includes(c.cle) ? x.filter((k) => k !== c.cle) : [...x, c.cle]))}
                      />
                      {c.titre}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-b-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bordure bg-fond-barre text-left text-texte-attenue">
              {visibles.map((c) => (
                <th key={c.cle} className={`whitespace-nowrap px-3 py-2 font-medium ${c.alignerDroite ? "text-right" : ""}`}>
                  {c.titre}
                </th>
              ))}
              {actions && <th className="px-3 py-2 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {chargement && (
              <tr>
                <td colSpan={visibles.length + (actions ? 1 : 0)} className="px-3 py-6 text-center text-texte-attenue">
                  Chargement...
                </td>
              </tr>
            )}
            {!chargement && lignes.length === 0 && (
              <tr>
                <td colSpan={visibles.length + (actions ? 1 : 0)} className="px-3 py-6 text-center text-texte-attenue">
                  {videMessage}
                </td>
              </tr>
            )}
            {!chargement && lignes.map((ligne) => (
              <tr key={cleLigne(ligne)} className="border-b border-bordure last:border-0 hover:bg-fond">
                {visibles.map((c) => (
                  <td key={c.cle} className={`px-3 py-2 text-texte ${c.alignerDroite ? "text-right" : ""}`}>
                    {c.rendu ? c.rendu(ligne) : String((ligne as Record<string, unknown>)[c.cle] ?? "")}
                  </td>
                ))}
                {actions && <td className="px-3 py-2 text-right">{actions(ligne)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onChangerPage && nombrePages > 1 && (
        <div className="sans-impression flex items-center justify-between border-t border-bordure px-3 py-2">
          <button
            disabled={page <= 1}
            onClick={() => onChangerPage(page - 1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-texte-attenue disabled:opacity-40 hover:bg-fond"
          >
            <ChevronLeft size={16} /> Precedent
          </button>
          <span className="text-sm text-texte-attenue">Page {page} / {nombrePages}</span>
          <button
            disabled={page >= nombrePages}
            onClick={() => onChangerPage(page + 1)}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-texte-attenue disabled:opacity-40 hover:bg-fond"
          >
            Suivant <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

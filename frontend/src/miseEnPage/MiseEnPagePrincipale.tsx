import { NavLink } from "react-router-dom";
import { Search, HelpCircle, User, LogOut } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { MENU } from "./menu";
import { useEntreprise } from "../hooks/useEntreprise";

/** Mise en page principale inspiree de l'image de reference Acumatica :
 * barre superieure bleue pleine avec logo/recherche a gauche et
 * compte/horloge a droite, sidebar grise a icones, contenu sur fond
 * gris clair. */
export function MiseEnPagePrincipale({ children }: { children: ReactNode }) {
  const { utilisateur, deconnecter, peut } = useAuth();
  const [reduit, setReduit] = useState(false);
  const entreprise = useEntreprise();

  return (
    <div className="flex h-screen flex-col bg-fond">
      <header className="flex h-14 shrink-0 items-center justify-between bg-entete px-4 text-white">
        <div className="flex items-center gap-4">
          {entreprise.logo && <img src={entreprise.logo} alt="" className="h-8 max-w-[7rem] rounded bg-white/90 object-contain p-0.5" />}
          <span className="text-lg font-bold tracking-tight">{entreprise.nom}</span>
          <div className="hidden items-center gap-2 rounded bg-white/15 px-2.5 py-1.5 sm:flex">
            <Search size={14} />
            <input
              placeholder="Rechercher..."
              className="w-40 bg-transparent text-sm placeholder-white/70 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden md:inline text-white/90">{utilisateur?.depot_nom ?? "Tous les depots"}</span>
          <HelpCircle size={18} className="hidden sm:block text-white/80" />
          <div className="flex items-center gap-1.5">
            <User size={16} />
            <span>{utilisateur?.prenom} {utilisateur?.nom}</span>
          </div>
          <button onClick={deconnecter} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/15" title="Deconnexion">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className={`flex shrink-0 flex-col border-r border-bordure bg-fond-barre transition-all ${reduit ? "w-14" : "w-56"}`}>
          <div className="flex-1 overflow-y-auto py-2">
            {MENU.filter((e) => peut(e.module)).map((e) => (
              <NavLink
                key={e.module}
                to={e.chemin}
                end={e.chemin === "/"}
                className={({ isActive }) =>
                  `mx-2 mb-0.5 flex items-center gap-3 rounded px-2.5 py-2 text-sm ${
                    isActive ? "bg-entete text-white" : "text-texte hover:bg-fond"
                  }`
                }
              >
                <e.icone size={17} className="shrink-0" />
                {!reduit && <span className="truncate">{e.libelle}</span>}
              </NavLink>
            ))}
          </div>
          <button
            onClick={() => setReduit((r) => !r)}
            className="border-t border-bordure px-2.5 py-2 text-left text-xs text-texte-attenue hover:bg-fond"
          >
            {reduit ? "»" : "« Reduire"}
          </button>
        </nav>

        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}

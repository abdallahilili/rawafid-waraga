import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Flame } from "lucide-react";
import { api } from "../../services/api";
import { useEntreprise } from "../../hooks/useEntreprise";
import { Badge } from "../../composants/Badge";
import type { CommandeImpression, TarifImpression } from "../../types";

export interface ArticleCaisse {
  id: number; nom: string; reference: string; unite: string;
  prix_vente: string; categorie_nom: string | null; quantite_disponible: number; frequence: number;
}

type Onglet = "ARTICLES" | "SERVICES" | "COMMANDES";

interface Props {
  depot: number | null | undefined;
  /** Quantite deja au panier, par cle de ligne (ART-1, SRV-3, IMP-2). */
  quantitesPanier: Record<string, number>;
  onAjouterArticle: (a: ArticleCaisse) => void;
  onAjouterService: (t: TarifImpression) => void;
  onAjouterCommande: (c: CommandeImpression) => void;
}

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "ARTICLES", libelle: "Articles" },
  { cle: "SERVICES", libelle: "Travaux (services)" },
  { cle: "COMMANDES", libelle: "Commandes d'impression a regler" },
];

function Frequence({ n, unite }: { n: number; unite: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${n > 0 ? "text-accent-orange" : "text-texte-attenue"}`}
      title={`${n} ${unite}`}>
      {n > 0 && <Flame size={12} />}{n}
    </span>
  );
}

const TH = "px-3 py-2 font-medium";

/** Catalogue de la caisse : liste filtrable des articles, des travaux (services) et
 * des commandes d'impression a regler. Un clic sur une ligne (ou sur +) l'ajoute au
 * panier ; chaque clic supplementaire augmente la quantite. Tri par frequence. */
export function CatalogueCaisse({ depot, quantitesPanier, onAjouterArticle, onAjouterService, onAjouterCommande }: Props) {
  const { devise } = useEntreprise();
  const [onglet, setOnglet] = useState<Onglet>("ARTICLES");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("");
  const [articles, setArticles] = useState<ArticleCaisse[]>([]);
  const [tarifs, setTarifs] = useState<TarifImpression[]>([]);
  const [commandes, setCommandes] = useState<CommandeImpression[]>([]);

  useEffect(() => {
    if (onglet !== "ARTICLES") return;
    const id = setTimeout(() => {
      api.get("/articles/recherche-caisse/", { params: { q: recherche, depot } })
        .then((r) => setArticles(r.data)).catch(() => setArticles([]));
    }, 200);
    return () => clearTimeout(id);
  }, [onglet, recherche, depot]);

  useEffect(() => {
    if (onglet !== "SERVICES" || tarifs.length) return;
    api.get("/impression/tarifs/", { params: { depot, ordre: "frequence" } })
      .then((r) => setTarifs((r.data as TarifImpression[]).filter((t) => t.actif))).catch(() => setTarifs([]));
  }, [onglet, depot, tarifs.length]);

  useEffect(() => {
    if (onglet !== "COMMANDES") return;
    api.get("/impression/commandes/", { params: { a_regler: 1, depot, taille_page: 100 } })
      .then((r) => setCommandes(r.data.resultats ?? r.data)).catch(() => setCommandes([]));
  }, [onglet, depot]);

  // Valeurs de filtre propres a l'onglet actif.
  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.categorie_nom).filter(Boolean) as string[])).sort(),
    [articles],
  );
  const types = useMemo(() => Array.from(new Set(tarifs.map((t) => t.type_travail))), [tarifs]);

  const terme = recherche.trim().toLowerCase();
  const articlesFiltres = articles.filter((a) => !filtre || a.categorie_nom === filtre);
  const tarifsFiltres = tarifs.filter(
    (t) => (!filtre || t.type_travail === filtre) && (!terme || t.libelle.toLowerCase().includes(terme)),
  );
  const commandesFiltrees = commandes.filter(
    (c) => !terme || `${c.reference} ${c.nom_client}`.toLowerCase().includes(terme),
  );

  function changerOnglet(o: Onglet) {
    setOnglet(o); setFiltre(""); setRecherche("");
  }

  const ligneCliquable = "cursor-pointer border-b border-bordure last:border-0 hover:bg-fond";
  const boutonPlus = "inline-flex h-7 w-7 items-center justify-center rounded bg-entete text-white hover:bg-entete-fonce disabled:opacity-40";

  return (
    <div className="rounded-md border border-bordure bg-fond-carte shadow-carte">
      <div className="flex flex-wrap border-b border-bordure">
        {ONGLETS.map((o) => (
          <button key={o.cle} onClick={() => changerOnglet(o.cle)}
            className={`px-4 py-2.5 text-sm font-medium ${onglet === o.cle ? "border-b-2 border-entete text-entete" : "text-texte-attenue hover:text-texte"}`}>
            {o.libelle}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-2.5 top-2.5 text-texte-attenue" />
          <input
            value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus
            placeholder={onglet === "ARTICLES" ? "Nom, reference ou code-barres..." : onglet === "SERVICES" ? "Rechercher un travail..." : "Reference ou client..."}
            className="w-full rounded border border-bordure py-1.5 pl-8 pr-3 text-sm focus:border-entete focus:outline-none"
          />
        </div>
        {onglet === "ARTICLES" && (
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm">
            <option value="">Toutes les categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {onglet === "SERVICES" && (
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm">
            <option value="">Tous les types</option>
            {types.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        )}
      </div>

      <div className="max-h-[28rem] overflow-y-auto">
        {onglet === "ARTICLES" && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-fond-barre text-left text-texte-attenue">
              <tr><th className={TH}>Article</th><th className={TH}>Categorie</th><th className={`${TH} text-right`}>Prix</th>
                <th className={`${TH} text-right`}>Stock</th><th className={`${TH} text-right`} title="Nombre de ventes">Ventes</th><th className={TH} /></tr>
            </thead>
            <tbody>
              {articlesFiltres.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-texte-attenue">Aucun article.</td></tr>}
              {articlesFiltres.map((a) => {
                const dansPanier = quantitesPanier[`ART-${a.id}`];
                return (
                  <tr key={a.id} className={ligneCliquable} onClick={() => onAjouterArticle(a)}>
                    <td className="px-3 py-2">{a.nom} <span className="text-xs text-texte-attenue">({a.reference})</span></td>
                    <td className="px-3 py-2 text-texte-attenue">{a.categorie_nom ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{a.prix_vente} {devise}</td>
                    <td className={`px-3 py-2 text-right ${a.quantite_disponible <= 0 ? "text-accent-rouge" : ""}`}>{a.quantite_disponible}</td>
                    <td className="px-3 py-2 text-right"><Frequence n={a.frequence} unite="vente(s)" /></td>
                    <td className="px-3 py-2 text-right">
                      <button className={boutonPlus} title="Ajouter au panier" onClick={(e) => { e.stopPropagation(); onAjouterArticle(a); }}>
                        {dansPanier ? <span className="text-xs font-semibold">{dansPanier}</span> : <Plus size={15} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {onglet === "SERVICES" && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-fond-barre text-left text-texte-attenue">
              <tr><th className={TH}>Travail</th><th className={`${TH} text-right`}>Prix / page</th>
                <th className={`${TH} text-right`} title="Nombre d'utilisations">Utilisations</th><th className={TH} /></tr>
            </thead>
            <tbody>
              {tarifsFiltres.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-texte-attenue">Aucun travail.</td></tr>}
              {tarifsFiltres.map((t) => {
                const dansPanier = quantitesPanier[`SRV-${t.id}`];
                return (
                  <tr key={t.id} className={ligneCliquable} onClick={() => onAjouterService(t)}>
                    <td className="px-3 py-2">{t.libelle}</td>
                    <td className="px-3 py-2 text-right">{t.prix_unitaire_page} {devise}</td>
                    <td className="px-3 py-2 text-right"><Frequence n={t.frequence} unite="utilisation(s)" /></td>
                    <td className="px-3 py-2 text-right">
                      <button className={boutonPlus} title="Ajouter au panier" onClick={(e) => { e.stopPropagation(); onAjouterService(t); }}>
                        {dansPanier ? <span className="text-xs font-semibold">{dansPanier}</span> : <Plus size={15} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {onglet === "COMMANDES" && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-fond-barre text-left text-texte-attenue">
              <tr><th className={TH}>Reference</th><th className={TH}>Client</th><th className={`${TH} text-right`}>Montant</th><th className={TH}>Statut</th><th className={TH} /></tr>
            </thead>
            <tbody>
              {commandesFiltrees.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-texte-attenue">Aucune commande a regler.</td></tr>}
              {commandesFiltrees.map((c) => {
                const dejaAjoutee = !!quantitesPanier[`IMP-${c.id}`];
                return (
                  <tr key={c.id} className={ligneCliquable} onClick={() => !dejaAjoutee && onAjouterCommande(c)}>
                    <td className="px-3 py-2">{c.reference}</td>
                    <td className="px-3 py-2 text-texte-attenue">{c.nom_client || "-"}</td>
                    <td className="px-3 py-2 text-right">{c.montant_total} {devise}</td>
                    <td className="px-3 py-2"><Badge statut={c.statut} /></td>
                    <td className="px-3 py-2 text-right">
                      <button className={boutonPlus} disabled={dejaAjoutee} title="Ajouter au panier" onClick={(e) => { e.stopPropagation(); onAjouterCommande(c); }}>
                        <Plus size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

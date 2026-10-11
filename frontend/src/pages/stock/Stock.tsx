import { useEntreprise } from "../../hooks/useEntreprise";
import { useState } from "react";
import { useListe, useOptions } from "../../hooks/useListe";
import { TableauDonnees } from "../../composants/TableauDonnees";
import { Modale } from "../../composants/Modale";
import { useNotifications } from "../../composants/Notifications";
import { api, messageErreur } from "../../services/api";
import type { Stock, Depot, Article } from "../../types";
import { Plus, Minus, ArrowLeftRight, ClipboardList } from "lucide-react";

type Onglet = "ENTREE" | "SORTIE" | "TRANSFERT" | "INVENTAIRE";

export function PageStock() {
  const { devise } = useEntreprise();
  const depots = useOptions<Depot>("/depots/");
  const articles = useOptions<Article>("/articles/");
  const [depotFiltre, setDepotFiltre] = useState("");
  const { resultats, chargement, page, setPage, nombrePages, recharger } = useListe<Stock>(
    "/stock/niveaux/", { depot: depotFiltre || undefined }
  );
  const { notifierSucces, notifierErreur } = useNotifications();
  const [modale, setModale] = useState<Onglet | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [envoi, setEnvoi] = useState(false);

  function ouvrir(onglet: Onglet) {
    setForm({});
    setModale(onglet);
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try {
      if (modale === "ENTREE") await api.post("/stock/entree/", form);
      if (modale === "SORTIE") await api.post("/stock/sortie/", form);
      if (modale === "TRANSFERT") await api.post("/stock/transfert/", form);
      if (modale === "INVENTAIRE") await api.post("/stock/ajuster-inventaire/", form);
      notifierSucces("Operation enregistree.");
      setModale(null);
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-texte">Stock</h1>
        <div className="flex gap-2">
          <button onClick={() => ouvrir("ENTREE")} className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm text-white hover:bg-entete-fonce">
            <Plus size={15} /> Entree
          </button>
          <button onClick={() => ouvrir("SORTIE")} className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">
            <Minus size={15} /> Sortie
          </button>
          <button onClick={() => ouvrir("TRANSFERT")} className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">
            <ArrowLeftRight size={15} /> Transfert
          </button>
          <button onClick={() => ouvrir("INVENTAIRE")} className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">
            <ClipboardList size={15} /> Inventaire
          </button>
        </div>
      </div>

      <div className="mb-3">
        <select value={depotFiltre} onChange={(e) => setDepotFiltre(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm">
          <option value="">Tous les depots</option>
          {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
        </select>
      </div>

      <TableauDonnees<Stock>
        titre="Stock"
        colonnes={[
          { cle: "article_nom", titre: "Article" },
          { cle: "depot_nom", titre: "Depot" },
          {
            cle: "quantite", titre: "Quantite", alignerDroite: true,
            rendu: (s) => (
              <span className={s.quantite <= s.seuil_alerte ? "font-semibold text-accent-rouge" : ""}>{s.quantite}</span>
            ),
            exportRendu: (s) => s.quantite,
          },
          { cle: "cout_moyen_pondere", titre: "CUMP", alignerDroite: true, rendu: (s) => s.cout_moyen_pondere ? `${s.cout_moyen_pondere} ${devise}` : "-" },
          { cle: "valeur_stock", titre: "Valeur", alignerDroite: true, rendu: (s) => s.valeur_stock ? `${s.valeur_stock} ${devise}` : "-" },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(s) => s.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
      />

      <Modale titre="Mouvement de stock" ouverte={!!modale} onFermer={() => setModale(null)}>
        <form onSubmit={soumettre} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Article</label>
            <select required value={form.article ?? ""} onChange={(e) => setForm((f) => ({ ...f, article: e.target.value }))} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
              <option value="">-- Selectionner --</option>
              {articles.map((a) => <option key={a.id} value={a.id}>{a.nom} ({a.reference})</option>)}
            </select>
          </div>
          {modale !== "TRANSFERT" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Depot</label>
              <select required value={form.depot ?? ""} onChange={(e) => setForm((f) => ({ ...f, depot: e.target.value }))} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
                <option value="">-- Selectionner --</option>
                {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Depot source</label>
                <select required value={form.depot_source ?? ""} onChange={(e) => setForm((f) => ({ ...f, depot_source: e.target.value }))} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
                  <option value="">--</option>
                  {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Depot destination</label>
                <select required value={form.depot_destination ?? ""} onChange={(e) => setForm((f) => ({ ...f, depot_destination: e.target.value }))} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
                  <option value="">--</option>
                  {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">
              {modale === "INVENTAIRE" ? "Quantite physique constatee" : "Quantite"}
            </label>
            <input
              type="number" min={0} required
              value={(modale === "INVENTAIRE" ? form.quantite_physique : form.quantite) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [modale === "INVENTAIRE" ? "quantite_physique" : "quantite"]: e.target.value }))}
              className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm"
            />
          </div>
          {modale === "ENTREE" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Prix unitaire d'achat</label>
              <input type="number" step="0.01" required value={form.prix_unitaire ?? ""} onChange={(e) => setForm((f) => ({ ...f, prix_unitaire: e.target.value }))} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModale(null)} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
            <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm text-white hover:bg-entete-fonce disabled:opacity-50">Valider</button>
          </div>
        </form>
      </Modale>
    </div>
  );
}

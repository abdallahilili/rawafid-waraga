import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, messageErreur } from "../../services/api";
import { useOptions } from "../../hooks/useListe";
import { Modale } from "../../composants/Modale";
import { useNotifications } from "../../composants/Notifications";
import type { Article, Client, ExpressionBesoins } from "../../types";

interface LigneForm { article: string; quantite: string; prix: string }
const LIGNE_VIDE: LigneForm = { article: "", quantite: "1", prix: "" };

interface Props {
  ouverte: boolean;
  devis: ExpressionBesoins | null; // null = creation
  onFermer: () => void;
  onEnregistre: () => void;
}

/** Creation ou modification d'un devis (etat 0). */
export function ModaleDevis({ ouverte, devis, onFermer, onEnregistre }: Props) {
  const clients = useOptions<Client>("/facturation/clients/", ouverte);
  const articles = useOptions<Article>("/articles/", ouverte);
  const { notifierSucces, notifierErreur } = useNotifications();
  const [client, setClient] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([{ ...LIGNE_VIDE }]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouverte) return;
    if (devis) {
      setClient(String(devis.client));
      setLignes(devis.lignes.map((l) => ({ article: String(l.article), quantite: String(l.quantite_devis), prix: String(l.prix) })));
    } else {
      setClient("");
      setLignes([{ ...LIGNE_VIDE }]);
    }
  }, [ouverte, devis]);

  function maj(i: number, champ: keyof LigneForm, valeur: string) {
    setLignes((ls) => ls.map((l, idx) => {
      if (idx !== i) return l;
      const suivante = { ...l, [champ]: valeur };
      if (champ === "article") {
        const a = articles.find((x) => String(x.id) === valeur);
        if (a) suivante.prix = String(a.prix_vente);
      }
      return suivante;
    }));
  }

  const total = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try {
      const corps = {
        client: Number(client),
        lignes: lignes.map((l) => ({ article: Number(l.article), quantite: Number(l.quantite), prix: l.prix || null })),
      };
      if (devis) await api.post(`/facturation/documents/${devis.id}/modifier/`, corps);
      else await api.post("/facturation/documents/creer/", corps);
      notifierSucces(devis ? "Devis modifie." : "Devis cree.");
      onEnregistre();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={devis ? `Modifier le devis ${devis.reference}` : "Nouveau devis"} ouverte={ouverte} onFermer={onFermer} largeur="max-w-3xl">
      <form onSubmit={soumettre} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Client <span className="text-accent-rouge">*</span></label>
          <select required value={client} onChange={(e) => setClient(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
            <option value="">-- Selectionner --</option>
            {clients.filter((c) => c.etat || String(c.id) === client).map((c) => (
              <option key={c.id} value={c.id}>{c.nom} {c.prenom}{c.num_client ? ` (${c.num_client})` : ""}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">Articles</label>
            <button type="button" onClick={() => setLignes((l) => [...l, { ...LIGNE_VIDE }])} className="flex items-center gap-1 text-xs text-entete hover:underline">
              <Plus size={12} /> Ajouter une ligne
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-1.5 text-xs text-texte-attenue">
              <span className="col-span-6">Designation</span><span className="col-span-2">Quantite</span><span className="col-span-3">Prix unitaire</span>
            </div>
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-1.5">
                <select required value={l.article} onChange={(e) => maj(i, "article", e.target.value)} className="col-span-6 rounded border border-bordure px-1.5 py-1 text-sm">
                  <option value="">--</option>
                  {articles.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </select>
                <input required type="number" min={1} value={l.quantite} onChange={(e) => maj(i, "quantite", e.target.value)} className="col-span-2 rounded border border-bordure px-1.5 py-1 text-sm" />
                <input required type="number" min={0} step="0.01" value={l.prix} onChange={(e) => maj(i, "prix", e.target.value)} className="col-span-3 rounded border border-bordure px-1.5 py-1 text-sm" />
                <button type="button" disabled={lignes.length === 1} onClick={() => setLignes((ls) => ls.filter((_, idx) => idx !== i))} className="col-span-1 text-accent-rouge disabled:opacity-30">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-sm font-semibold">Total : {total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MRU</p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onFermer} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
          <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">Enregistrer</button>
        </div>
      </form>
    </Modale>
  );
}

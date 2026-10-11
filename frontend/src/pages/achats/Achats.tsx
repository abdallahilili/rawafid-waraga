import { useEntreprise } from "../../hooks/useEntreprise";
import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { useListe, useOptions } from "../../hooks/useListe";
import { TableauDonnees } from "../../composants/TableauDonnees";
import { Modale } from "../../composants/Modale";
import { Badge, libelleStatut } from "../../composants/Badge";
import { useNotifications } from "../../composants/Notifications";
import { useConfirmation } from "../../composants/Confirmation";
import { api, messageErreur } from "../../services/api";
import type { Achat, Fournisseur, Depot, Article } from "../../types";

interface LigneForm { article: string; quantite: string; prix_unitaire: string }

export function PageAchats() {
  const { devise } = useEntreprise();
  const { resultats, chargement, page, setPage, nombrePages, recharger } = useListe<Achat>("/achats/");
  const fournisseurs = useOptions<Fournisseur>("/fournisseurs/");
  const depots = useOptions<Depot>("/depots/");
  const articles = useOptions<Article>("/articles/");
  const { notifierSucces, notifierErreur } = useNotifications();
  const { demanderConfirmation } = useConfirmation();

  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [fournisseur, setFournisseur] = useState("");
  const [depot, setDepot] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([{ article: "", quantite: "1", prix_unitaire: "" }]);
  const [envoi, setEnvoi] = useState(false);

  function ajouterLigne() {
    setLignes((l) => [...l, { article: "", quantite: "1", prix_unitaire: "" }]);
  }
  function retirerLigne(i: number) {
    setLignes((l) => l.filter((_, idx) => idx !== i));
  }
  function majLigne(i: number, champ: keyof LigneForm, valeur: string) {
    setLignes((l) => l.map((x, idx) => (idx === i ? { ...x, [champ]: valeur } : x)));
  }

  function reinitialiser() {
    setFournisseur(""); setDepot(""); setLignes([{ article: "", quantite: "1", prix_unitaire: "" }]);
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/achats/", {
        fournisseur, depot,
        lignes: lignes.map((l) => ({ article: l.article, quantite: Number(l.quantite), prix_unitaire: l.prix_unitaire })),
      });
      notifierSucces("Achat cree en brouillon.");
      setModaleOuverte(false);
      reinitialiser();
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  async function valider(achat: Achat) {
    const ok = await demanderConfirmation({
      titre: "Valider l'achat",
      message: `Valider ${achat.reference} ajoutera les quantites au stock du depot ${achat.depot_nom}.`,
    });
    if (!ok) return;
    try {
      await api.post(`/achats/${achat.id}/valider/`);
      notifierSucces("Achat valide, stock mis a jour.");
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    }
  }

  async function annuler(achat: Achat) {
    const ok = await demanderConfirmation({
      titre: "Annuler l'achat",
      message: `Annuler ${achat.reference} retirera les quantites du stock.`,
    });
    if (!ok) return;
    try {
      await api.post(`/achats/${achat.id}/annuler/`);
      notifierSucces("Achat annule.");
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-texte">Achats</h1>
        <button onClick={() => setModaleOuverte(true)} className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm text-white hover:bg-entete-fonce">
          <Plus size={16} /> Nouvel achat
        </button>
      </div>

      <TableauDonnees<Achat>
        titre="Achats"
        colonnes={[
          { cle: "reference", titre: "Reference" },
          { cle: "fournisseur_nom", titre: "Fournisseur" },
          { cle: "depot_nom", titre: "Depot" },
          { cle: "montant_total", titre: "Montant", alignerDroite: true, rendu: (a) => `${a.montant_total} ${devise}` },
          { cle: "statut", titre: "Statut", rendu: (a) => <Badge statut={a.statut} />, exportRendu: (a) => libelleStatut(a.statut) },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(a) => a.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
        actions={(a) => a.statut === "BROUILLON" ? (
          <div className="flex justify-end gap-2">
            <button onClick={() => valider(a)} className="text-accent-vert hover:opacity-70" title="Valider"><Check size={16} /></button>
          </div>
        ) : a.statut === "VALIDE" ? (
          <button onClick={() => annuler(a)} className="text-accent-rouge hover:opacity-70" title="Annuler"><X size={16} /></button>
        ) : null}
      />

      <Modale titre="Nouvel achat" ouverte={modaleOuverte} onFermer={() => setModaleOuverte(false)} largeur="max-w-2xl">
        <form onSubmit={soumettre} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Fournisseur</label>
              <select required value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
                <option value="">-- Selectionner --</option>
                {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Depot</label>
              <select required value={depot} onChange={(e) => setDepot(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
                <option value="">-- Selectionner --</option>
                {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">Lignes</label>
              <button type="button" onClick={ajouterLigne} className="text-xs text-entete hover:underline">+ Ajouter une ligne</button>
            </div>
            <div className="space-y-2">
              {lignes.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select required value={l.article} onChange={(e) => majLigne(i, "article", e.target.value)} className="flex-1 rounded border border-bordure px-2 py-1.5 text-sm">
                    <option value="">-- Article --</option>
                    {articles.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                  </select>
                  <input type="number" min={1} required placeholder="Qte" value={l.quantite} onChange={(e) => majLigne(i, "quantite", e.target.value)} className="w-20 rounded border border-bordure px-2 py-1.5 text-sm" />
                  <input type="number" step="0.01" required placeholder="PU" value={l.prix_unitaire} onChange={(e) => majLigne(i, "prix_unitaire", e.target.value)} className="w-24 rounded border border-bordure px-2 py-1.5 text-sm" />
                  {lignes.length > 1 && (
                    <button type="button" onClick={() => retirerLigne(i)} className="text-accent-rouge"><X size={16} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModaleOuverte(false)} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
            <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm text-white hover:bg-entete-fonce disabled:opacity-50">Creer (brouillon)</button>
          </div>
        </form>
      </Modale>
    </div>
  );
}

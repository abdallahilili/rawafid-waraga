import { useEntreprise } from "../../hooks/useEntreprise";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useListe, useOptions } from "../../hooks/useListe";
import { TableauDonnees } from "../../composants/TableauDonnees";
import { Modale } from "../../composants/Modale";
import { Badge, libelleStatut } from "../../composants/Badge";
import { useNotifications } from "../../composants/Notifications";
import { api, messageErreur } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import type { CommandeImpression, Depot, TypeTravail, FormatPapier, Couleur } from "../../types";

const CHOIX_TRAVAIL: { value: TypeTravail; label: string }[] = [
  { value: "IMPRESSION", label: "Impression" }, { value: "PHOTOCOPIE", label: "Photocopie" },
  { value: "RELIURE", label: "Reliure" }, { value: "PLASTIFICATION", label: "Plastification" },
  { value: "SCAN", label: "Scan" }, { value: "AUTRE", label: "Autre" },
];
const CHOIX_FORMAT: { value: FormatPapier; label: string }[] = [
  { value: "A3", label: "A3" }, { value: "A4", label: "A4" }, { value: "A5", label: "A5" }, { value: "AUTRE", label: "Autre" },
];
const CHOIX_COULEUR: { value: Couleur; label: string }[] = [
  { value: "NOIR_BLANC", label: "Noir et blanc" }, { value: "COULEUR", label: "Couleur" },
];

interface LigneForm {
  type_travail: TypeTravail; format_papier: FormatPapier; couleur: Couleur;
  nombre_pages: string; nombre_copies: string; description: string;
}

const LIGNE_VIDE: LigneForm = { type_travail: "IMPRESSION", format_papier: "A4", couleur: "NOIR_BLANC", nombre_pages: "1", nombre_copies: "1", description: "" };

const TRANSITIONS: Record<string, string[]> = {
  EN_ATTENTE: ["EN_COURS", "ANNULEE"],
  EN_COURS: ["TERMINEE", "ANNULEE"],
  TERMINEE: ["LIVREE"],
  LIVREE: [], ANNULEE: [],
};

export function PageCommandesImpression() {
  const { devise } = useEntreprise();
  const { utilisateur, autorise } = useAuth();
  const { resultats, chargement, page, setPage, nombrePages, recharger } = useListe<CommandeImpression>("/impression/commandes/");
  const depots = useOptions<Depot>("/depots/");
  const { notifierSucces, notifierErreur } = useNotifications();

  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [depot, setDepot] = useState<string>(utilisateur?.depot ? String(utilisateur.depot) : "");
  const [nomClient, setNomClient] = useState("");
  const [telephoneClient, setTelephoneClient] = useState("");
  const [lignes, setLignes] = useState<LigneForm[]>([{ ...LIGNE_VIDE }]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (utilisateur?.depot) setDepot(String(utilisateur.depot));
  }, [utilisateur]);

  function majLigne(i: number, champ: keyof LigneForm, valeur: string) {
    setLignes((l) => l.map((x, idx) => (idx === i ? { ...x, [champ]: valeur } : x)));
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await api.post("/impression/commandes/", {
        depot, nom_client: nomClient, telephone_client: telephoneClient,
        lignes: lignes.map((l) => ({
          type_travail: l.type_travail, format_papier: l.format_papier, couleur: l.couleur,
          nombre_pages: Number(l.nombre_pages), nombre_copies: Number(l.nombre_copies), description: l.description,
        })),
      });
      notifierSucces("Commande d'impression creee.");
      setModaleOuverte(false);
      setNomClient(""); setTelephoneClient(""); setLignes([{ ...LIGNE_VIDE }]);
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  async function changerStatut(commande: CommandeImpression, statut: string) {
    try {
      await api.post(`/impression/commandes/${commande.id}/changer_statut/`, { statut });
      notifierSucces("Statut mis a jour.");
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-texte">Commandes d'impression</h1>
        {autorise("impression.creer") && (
          <button onClick={() => setModaleOuverte(true)} className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm text-white hover:bg-entete-fonce">
            <Plus size={16} /> Nouvelle commande
          </button>
        )}
      </div>

      <TableauDonnees<CommandeImpression>
        titre="Commandes d'impression"
        colonnes={[
          { cle: "reference", titre: "Reference" },
          { cle: "nom_client", titre: "Client" },
          { cle: "depot_nom", titre: "Depot" },
          { cle: "montant_total", titre: "Montant", alignerDroite: true, rendu: (c) => `${c.montant_total} ${devise}` },
          { cle: "statut", titre: "Statut", rendu: (c) => <Badge statut={c.statut} />, exportRendu: (c) => libelleStatut(c.statut) },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(c) => c.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
        actions={(c) => (
          <div className="flex justify-end gap-2">
            {autorise("impression.changer_statut") && TRANSITIONS[c.statut]?.map((s) => (
              <button key={s} onClick={() => changerStatut(c, s)} className="rounded border border-bordure px-2 py-0.5 text-xs hover:bg-fond">
                <Badge statut={s} />
              </button>
            ))}
          </div>
        )}
      />

      <Modale titre="Nouvelle commande d'impression" ouverte={modaleOuverte} onFermer={() => setModaleOuverte(false)} largeur="max-w-2xl">
        <form onSubmit={soumettre} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Depot</label>
              <select required value={depot} onChange={(e) => setDepot(e.target.value)} className="w-full rounded border border-bordure px-2 py-1.5 text-sm">
                <option value="">--</option>
                {depots.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Client</label>
              <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} className="w-full rounded border border-bordure px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telephone</label>
              <input value={telephoneClient} onChange={(e) => setTelephoneClient(e.target.value)} className="w-full rounded border border-bordure px-2 py-1.5 text-sm" />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium">Travaux</label>
              <button type="button" onClick={() => setLignes((l) => [...l, { ...LIGNE_VIDE }])} className="text-xs text-entete hover:underline">+ Ajouter un travail</button>
            </div>
            <div className="space-y-2">
              {lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-6 items-center gap-1.5 rounded border border-bordure p-2">
                  <select value={l.type_travail} onChange={(e) => majLigne(i, "type_travail", e.target.value)} className="col-span-2 rounded border border-bordure px-1.5 py-1 text-xs">
                    {CHOIX_TRAVAIL.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <select value={l.format_papier} onChange={(e) => majLigne(i, "format_papier", e.target.value)} className="rounded border border-bordure px-1.5 py-1 text-xs">
                    {CHOIX_FORMAT.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <select value={l.couleur} onChange={(e) => majLigne(i, "couleur", e.target.value)} className="rounded border border-bordure px-1.5 py-1 text-xs">
                    {CHOIX_COULEUR.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <input type="number" min={1} value={l.nombre_pages} onChange={(e) => majLigne(i, "nombre_pages", e.target.value)} placeholder="Pages" className="rounded border border-bordure px-1.5 py-1 text-xs" />
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={l.nombre_copies} onChange={(e) => majLigne(i, "nombre_copies", e.target.value)} placeholder="Copies" className="w-full rounded border border-bordure px-1.5 py-1 text-xs" />
                    {lignes.length > 1 && (
                      <button type="button" onClick={() => setLignes((ls) => ls.filter((_, idx) => idx !== i))} className="text-accent-rouge"><X size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-texte-attenue">Le prix est calcule automatiquement par le serveur selon la grille tarifaire du depot.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModaleOuverte(false)} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
            <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm text-white hover:bg-entete-fonce disabled:opacity-50">Creer la commande</button>
          </div>
        </form>
      </Modale>
    </div>
  );
}

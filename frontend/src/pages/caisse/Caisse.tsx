import { useEffect, useState } from "react";
import { Trash2, Printer as IconePrinter, Package } from "lucide-react";
import { api, messageErreur } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../composants/Notifications";
import type { SessionCaissier, Vente } from "../../types";

interface ResultatArticle {
  id: number; nom: string; reference: string; unite: string;
  prix_vente: string; categorie_nom: string | null; quantite_disponible: number;
}

interface LignePanier {
  cle: string;
  type: "ARTICLE" | "IMPRESSION";
  libelle: string;
  quantite: number;
  prix_unitaire: number;
  montant: number;
  article_id?: number;
  commande_impression_id?: number;
}

export function PageCaisse() {
  const { utilisateur } = useAuth();
  const { notifierSucces, notifierErreur } = useNotifications();
  const [session, setSession] = useState<SessionCaissier | null | undefined>(undefined);
  const [montantOuverture, setMontantOuverture] = useState("0");

  const [recherche, setRecherche] = useState("");
  const [resultatsArticle, setResultatsArticle] = useState<ResultatArticle[]>([]);
  const [refCommande, setRefCommande] = useState("");

  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [nomClient, setNomClient] = useState("");
  const [montantRecu, setMontantRecu] = useState("");
  const [derniereVente, setDerniereVente] = useState<Vente | null>(null);

  async function chargerSession() {
    const { data } = await api.get("/caisse/session-actuelle/");
    setSession(data);
  }

  useEffect(() => { chargerSession(); }, []);

  useEffect(() => {
    if (!recherche.trim()) { setResultatsArticle([]); return; }
    const id = setTimeout(() => {
      api.get("/articles/recherche-caisse/", { params: { q: recherche, depot: utilisateur?.depot } })
        .then((r) => setResultatsArticle(r.data));
    }, 250);
    return () => clearTimeout(id);
  }, [recherche, utilisateur]);

  async function ouvrirSession() {
    try {
      await api.post("/caisse/ouvrir-session/", { depot: utilisateur?.depot, montant_ouverture: montantOuverture });
      notifierSucces("Session de caisse ouverte.");
      chargerSession();
    } catch (err) { notifierErreur(messageErreur(err)); }
  }

  async function fermerSession() {
    if (!session) return;
    try {
      await api.post(`/caisse/sessions/${session.id}/fermer/`, { montant_fermeture: montantRecu || "0" });
      notifierSucces("Session fermee.");
      chargerSession();
    } catch (err) { notifierErreur(messageErreur(err)); }
  }

  function ajouterArticle(a: ResultatArticle) {
    setPanier((p) => {
      const existe = p.find((l) => l.type === "ARTICLE" && l.article_id === a.id);
      if (existe) {
        return p.map((l) => l === existe ? { ...l, quantite: l.quantite + 1, montant: (l.quantite + 1) * l.prix_unitaire } : l);
      }
      return [...p, {
        cle: `ART-${a.id}`, type: "ARTICLE", libelle: a.nom, quantite: 1,
        prix_unitaire: Number(a.prix_vente), montant: Number(a.prix_vente), article_id: a.id,
      }];
    });
    setRecherche("");
    setResultatsArticle([]);
  }

  async function ajouterCommandeImpression() {
    if (!refCommande.trim()) return;
    try {
      const { data } = await api.get("/impression/commandes/", { params: { recherche: refCommande } });
      const commande = (data.resultats ?? data)[0];
      if (!commande) { notifierErreur("Commande introuvable."); return; }
      if (panier.some((l) => l.commande_impression_id === commande.id)) {
        notifierErreur("Cette commande est deja dans le panier.");
        return;
      }
      setPanier((p) => [...p, {
        cle: `IMP-${commande.id}`, type: "IMPRESSION",
        libelle: `${commande.reference} - ${commande.nom_client || "Impression"}`,
        quantite: 1, prix_unitaire: Number(commande.montant_total), montant: Number(commande.montant_total),
        commande_impression_id: commande.id,
      }]);
      setRefCommande("");
    } catch (err) { notifierErreur(messageErreur(err)); }
  }

  function retirerLigne(cle: string) {
    setPanier((p) => p.filter((l) => l.cle !== cle));
  }

  const total = panier.reduce((s, l) => s + l.montant, 0);
  const monnaie = montantRecu ? Number(montantRecu) - total : 0;

  async function encaisser() {
    if (panier.length === 0) return;
    try {
      const { data } = await api.post("/ventes/", {
        depot: utilisateur?.depot,
        nom_client: nomClient,
        montant_recu: montantRecu || "0",
        lignes: panier.map((l) => l.type === "ARTICLE"
          ? { type: "ARTICLE", article: l.article_id, quantite: l.quantite }
          : { type: "IMPRESSION", commande_impression: l.commande_impression_id }),
      });
      notifierSucces(`Vente ${data.reference} encaissee.`);
      setDerniereVente(data);
      setPanier([]); setNomClient(""); setMontantRecu("");
    } catch (err) { notifierErreur(messageErreur(err)); }
  }

  if (session === undefined) return <p className="text-sm text-texte-attenue">Chargement...</p>;

  if (!session) {
    return (
      <div className="mx-auto max-w-sm rounded-md border border-bordure bg-fond-carte p-5 shadow-carte">
        <h1 className="mb-3 text-lg font-semibold text-texte">Ouvrir une session de caisse</h1>
        <label className="mb-1 block text-sm font-medium">Montant d'ouverture</label>
        <input type="number" value={montantOuverture} onChange={(e) => setMontantOuverture(e.target.value)} className="mb-3 w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
        <button onClick={ouvrirSession} className="w-full rounded bg-entete py-2 text-sm font-medium text-white hover:bg-entete-fonce">Ouvrir la session</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-texte">Point de vente</h1>
          <div className="text-sm text-texte-attenue">
            Session #{session.id} - Solde: {session.solde} MRU
            <button onClick={fermerSession} className="ml-3 rounded border border-bordure px-2 py-1 text-xs hover:bg-fond">Fermer la session</button>
          </div>
        </div>

        <div className="mb-3 rounded-md border border-bordure bg-fond-carte p-3 shadow-carte">
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><Package size={14} /> Rechercher un article</label>
          <input
            value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, reference ou code-barres..."
            className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm"
          />
          {resultatsArticle.length > 0 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded border border-bordure">
              {resultatsArticle.map((a) => (
                <button key={a.id} onClick={() => ajouterArticle(a)} className="flex w-full items-center justify-between border-b border-bordure px-3 py-2 text-left text-sm last:border-0 hover:bg-fond">
                  <span>{a.nom} <span className="text-texte-attenue">({a.reference})</span></span>
                  <span className="text-texte-attenue">{a.prix_vente} MRU - stock {a.quantite_disponible}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-bordure bg-fond-carte p-3 shadow-carte">
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium"><IconePrinter size={14} /> Ajouter une commande d'impression reglee</label>
          <div className="flex gap-2">
            <input value={refCommande} onChange={(e) => setRefCommande(e.target.value)} placeholder="Reference (ex: IMP-2026-00001)" className="flex-1 rounded border border-bordure px-2.5 py-1.5 text-sm" />
            <button onClick={ajouterCommandeImpression} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Ajouter</button>
          </div>
        </div>
      </div>

      <div>
        <div className="rounded-md border border-bordure bg-fond-carte p-3 shadow-carte">
          <h2 className="mb-2 text-sm font-semibold text-texte">Panier</h2>
          <div className="mb-2 max-h-72 space-y-1 overflow-y-auto">
            {panier.length === 0 && <p className="text-sm text-texte-attenue">Panier vide.</p>}
            {panier.map((l) => (
              <div key={l.cle} className="flex items-center justify-between rounded border border-bordure px-2 py-1.5 text-sm">
                <div>
                  <div className="font-medium">{l.libelle}</div>
                  <div className="text-xs text-texte-attenue">{l.quantite} x {l.prix_unitaire} MRU</div>
                </div>
                <div className="flex items-center gap-2">
                  <span>{l.montant} MRU</span>
                  <button onClick={() => retirerLigne(l.cle)} className="text-accent-rouge"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-2 flex justify-between border-t border-bordure pt-2 text-base font-semibold">
            <span>Total</span><span>{total.toFixed(2)} MRU</span>
          </div>
          <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Nom du client (optionnel)" className="mb-2 w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
          <input type="number" value={montantRecu} onChange={(e) => setMontantRecu(e.target.value)} placeholder="Montant recu" className="mb-1 w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
          <p className="mb-2 text-sm text-texte-attenue">Monnaie a rendre : {monnaie >= 0 ? monnaie.toFixed(2) : 0} MRU</p>
          <button onClick={encaisser} disabled={panier.length === 0} className="w-full rounded bg-entete py-2 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">
            Encaisser
          </button>
        </div>

        {derniereVente && (
          <div className="mt-3 rounded-md border border-bordure bg-fond-carte p-3 shadow-carte text-sm">
            <h3 className="mb-1 font-semibold">Recu {derniereVente.reference}</h3>
            {derniereVente.lignes.map((l) => (
              <div key={l.id} className="flex justify-between text-texte-attenue">
                <span>{l.article_nom ?? l.reference_commande_impression}</span>
                <span>{l.montant} MRU</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-bordure pt-1 font-semibold">
              <span>Total</span><span>{derniereVente.montant_total} MRU</span>
            </div>
            <div className="flex justify-between text-texte-attenue">
              <span>Recu / Monnaie</span><span>{derniereVente.montant_recu} / {derniereVente.monnaie_rendue} MRU</span>
            </div>
            <button onClick={() => window.print()} className="mt-2 w-full rounded border border-bordure py-1.5 text-xs hover:bg-fond">Imprimer le recu</button>
          </div>
        )}
      </div>
    </div>
  );
}

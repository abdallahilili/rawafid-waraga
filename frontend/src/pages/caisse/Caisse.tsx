import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowLeftRight, Lock, FileText } from "lucide-react";
import { api, messageErreur } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useEntreprise } from "../../hooks/useEntreprise";
import { useNotifications } from "../../composants/Notifications";
import { RecuImpression } from "../../composants/RecuImpression";
import { CatalogueCaisse } from "./CatalogueCaisse";
import type { ArticleCaisse } from "./CatalogueCaisse";
import { ModaleCloture } from "./ModaleCloture";
import { ModaleMouvement } from "./ModaleMouvement";
import { ModaleEncaissement } from "./ModaleEncaissement";
import type { PaiementsValides } from "./ModaleEncaissement";
import { ModaleDevis } from "../facturation/ModaleDevis";
import type { Caisse, CommandeImpression, SessionCaissier, TarifImpression, Vente } from "../../types";

interface LignePanier {
  cle: string;
  type: "ARTICLE" | "SERVICE" | "IMPRESSION";
  libelle: string;
  /** Unite de la quantite : articles = pieces, services = pages. */
  unite: string;
  quantite: number;
  prix_unitaire: number;
  /** Stock disponible (articles), pour avertir quand la quantite le depasse. */
  stock?: number;
  article_id?: number;
  tarif_id?: number;
  commande_impression_id?: number;
}

const arrondir = (n: number) => Math.round(n * 100) / 100;

export function PageCaisse() {
  const { devise } = useEntreprise();
  const { utilisateur, autorise } = useAuth();
  const { notifierSucces, notifierErreur } = useNotifications();
  const navigate = useNavigate();
  const [devisOuvert, setDevisOuvert] = useState(false);
  const [caisses, setCaisses] = useState<Caisse[]>([]);
  const [caisseId, setCaisseId] = useState("");
  const [session, setSession] = useState<SessionCaissier | null | undefined>(undefined);
  const [montantOuverture, setMontantOuverture] = useState("0");

  const [recuOuvert, setRecuOuvert] = useState(false);
  const [clotureOuverte, setClotureOuverte] = useState(false);
  const [mouvementOuvert, setMouvementOuvert] = useState(false);

  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [nomClient, setNomClient] = useState("");
  const [encaissementOuvert, setEncaissementOuvert] = useState(false);
  const [envoiVente, setEnvoiVente] = useState(false);
  const [derniereVente, setDerniereVente] = useState<Vente | null>(null);

  async function chargerSession() {
    const { data } = await api.get("/caisse/session-actuelle/");
    setSession(data);
  }

  useEffect(() => { chargerSession(); }, []);

  useEffect(() => {
    api.get("/caisse/caisses/").then(({ data }) => {
      const dispo = (data as Caisse[]).filter((c) => c.etat && c.depot === utilisateur?.depot);
      setCaisses(dispo);
      if (dispo.length === 1) setCaisseId(String(dispo[0].id));
    }).catch(() => {});
  }, [utilisateur]);

  async function ouvrirSession() {
    try {
      await api.post("/caisse/ouvrir-session/", { depot: utilisateur?.depot, caisse: caisseId ? Number(caisseId) : null, montant_ouverture: montantOuverture });
      notifierSucces("Session de caisse ouverte.");
      chargerSession();
    } catch (err) { notifierErreur(messageErreur(err)); }
  }

  /** Ajoute une ligne, ou augmente sa quantite d'une unite si elle est deja au panier. */
  function ajouter(nouvelle: LignePanier) {
    setPanier((p) => {
      const existe = p.find((l) => l.cle === nouvelle.cle);
      if (existe) return p.map((l) => (l.cle === nouvelle.cle ? { ...l, quantite: l.quantite + 1 } : l));
      return [...p, nouvelle];
    });
  }

  const ajouterArticle = (a: ArticleCaisse) => ajouter({
    cle: `ART-${a.id}`, type: "ARTICLE", libelle: a.nom, unite: a.unite || "unite", quantite: 1,
    prix_unitaire: Number(a.prix_vente), stock: a.quantite_disponible, article_id: a.id,
  });

  const ajouterService = (t: TarifImpression) => ajouter({
    cle: `SRV-${t.id}`, type: "SERVICE", libelle: t.libelle, unite: "page", quantite: 1,
    prix_unitaire: Number(t.prix_unitaire_page), tarif_id: t.id,
  });

  function ajouterCommande(c: CommandeImpression) {
    if (panier.some((l) => l.cle === `IMP-${c.id}`)) return;
    ajouter({
      cle: `IMP-${c.id}`, type: "IMPRESSION", libelle: `${c.reference}${c.nom_client ? ` - ${c.nom_client}` : ""}`,
      unite: "commande", quantite: 1, prix_unitaire: Number(c.montant_total), commande_impression_id: c.id,
    });
  }

  function changerQuantite(cle: string, quantite: number) {
    setPanier((p) => p.map((l) => (l.cle === cle ? { ...l, quantite: Math.max(1, Math.floor(quantite) || 1) } : l)));
  }

  function retirerLigne(cle: string) {
    setPanier((p) => p.filter((l) => l.cle !== cle));
  }

  const total = arrondir(panier.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0));
  const quantitesPanier = Object.fromEntries(panier.map((l) => [l.cle, l.quantite]));
  // Une commande d'impression a deja son propre circuit : elle ne peut pas entrer dans un devis.
  const panierSansCommande = !panier.some((l) => l.type === "IMPRESSION");
  const lignesDevis = panier.filter((l) => l.type !== "IMPRESSION").map((l) => ({
    article: l.article_id, tarif: l.tarif_id, libelle: l.libelle, quantite: l.quantite, prix: l.prix_unitaire,
  }));

  async function encaisser({ paiements, montantRecu }: PaiementsValides) {
    if (panier.length === 0) return;
    setEnvoiVente(true);
    try {
      const { data } = await api.post("/ventes/", {
        depot: utilisateur?.depot,
        nom_client: nomClient,
        paiements,
        montant_recu: montantRecu,
        lignes: panier.map((l) => {
          if (l.type === "ARTICLE") return { type: "ARTICLE", article: l.article_id, quantite: l.quantite };
          if (l.type === "SERVICE") return { type: "SERVICE", tarif: l.tarif_id, quantite: l.quantite };
          return { type: "IMPRESSION", commande_impression: l.commande_impression_id };
        }),
      });
      notifierSucces(`Vente ${data.reference} encaissee.`);
      setDerniereVente(data);
      setRecuOuvert(true);
      setPanier([]); setNomClient("");
      setEncaissementOuvert(false);
    } catch (err) { notifierErreur(messageErreur(err)); }
    finally { setEnvoiVente(false); }
  }

  if (session === undefined) return <p className="text-sm text-texte-attenue">Chargement...</p>;

  if (!session) {
    return (
      <div className="mx-auto max-w-sm rounded-md border border-bordure bg-fond-carte p-5 shadow-carte">
        <h1 className="mb-3 text-lg font-semibold text-texte">Ouvrir une session de caisse</h1>
        {caisses.length > 0 && (
          <>
            <label className="mb-1 block text-sm font-medium">Caisse</label>
            <select value={caisseId} onChange={(e) => setCaisseId(e.target.value)} className="mb-3 w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
              <option value="">-- Choisir --</option>
              {caisses.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </>
        )}
        <label className="mb-1 block text-sm font-medium">Montant d'ouverture</label>
        <input type="number" value={montantOuverture} onChange={(e) => setMontantOuverture(e.target.value)} className="mb-3 w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
        <button onClick={ouvrirSession} className="w-full rounded bg-entete py-2 text-sm font-medium text-white hover:bg-entete-fonce">Ouvrir la session</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-texte">Point de vente</h1>
          <div className="text-sm text-texte-attenue">
            Session #{session.id}{session.caisse_nom ? ` (${session.caisse_nom})` : ""} - Solde: {session.solde} {devise}
            {autorise("caisse.mouvements_manuels") && (
              <button onClick={() => setMouvementOuvert(true)} className="ml-3 inline-flex items-center gap-1 rounded border border-bordure px-2 py-1 text-xs hover:bg-fond">
                <ArrowLeftRight size={12} /> Entree / sortie
              </button>
            )}
            {autorise("caisse.ouvrir_fermer") && (
              <button onClick={() => setClotureOuverte(true)} className="ml-2 inline-flex items-center gap-1 rounded border border-bordure px-2 py-1 text-xs hover:bg-fond">
                <Lock size={12} /> Cloturer la session
              </button>
            )}
          </div>
        </div>

        <CatalogueCaisse
          depot={utilisateur?.depot}
          quantitesPanier={quantitesPanier}
          onAjouterArticle={ajouterArticle}
          onAjouterService={ajouterService}
          onAjouterCommande={ajouterCommande}
        />
      </div>

      <div>
        <div className="rounded-md border border-bordure bg-fond-carte p-3 shadow-carte">
          <h2 className="mb-2 text-sm font-semibold text-texte">Panier</h2>
          <div className="mb-2 max-h-80 space-y-1.5 overflow-y-auto">
            {panier.length === 0 && <p className="text-sm text-texte-attenue">Panier vide : cliquez sur une ligne pour l'ajouter.</p>}
            {panier.map((l) => {
              const depasseStock = l.stock != null && l.quantite > l.stock;
              return (
                <div key={l.cle} className="rounded border border-bordure px-2 py-1.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{l.libelle}</div>
                    <button onClick={() => retirerLigne(l.cle)} className="text-accent-rouge" title="Retirer"><Trash2 size={14} /></button>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    {l.type === "IMPRESSION" ? (
                      <span className="text-xs text-texte-attenue">Commande d'impression</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => changerQuantite(l.cle, l.quantite - 1)} disabled={l.quantite <= 1}
                          className="flex h-6 w-6 items-center justify-center rounded border border-bordure hover:bg-fond disabled:opacity-40"><Minus size={12} /></button>
                        <input type="number" min={1} value={l.quantite} onChange={(e) => changerQuantite(l.cle, Number(e.target.value))}
                          className="h-6 w-14 rounded border border-bordure text-center text-sm" />
                        <button onClick={() => changerQuantite(l.cle, l.quantite + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-bordure hover:bg-fond"><Plus size={12} /></button>
                        <span className="ml-1 text-xs text-texte-attenue">{l.unite}{l.quantite > 1 ? "s" : ""} x {l.prix_unitaire}</span>
                      </div>
                    )}
                    <span className="font-semibold">{arrondir(l.quantite * l.prix_unitaire).toFixed(2)} {devise}</span>
                  </div>
                  {depasseStock && <p className="mt-1 text-xs text-accent-rouge">Stock disponible : {l.stock}</p>}
                </div>
              );
            })}
          </div>
          <div className="mb-2 flex justify-between border-t border-bordure pt-2 text-base font-semibold">
            <span>Total</span><span>{total.toFixed(2)} {devise}</span>
          </div>
          <input value={nomClient} onChange={(e) => setNomClient(e.target.value)} placeholder="Nom du client (optionnel)" className="mb-2 w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
          <div className="flex gap-2">
            {autorise("facturation.creer") && (
              <button
                onClick={() => setDevisOuvert(true)}
                disabled={panier.length === 0 || !panierSansCommande}
                title={panierSansCommande ? "Etablir un devis pour un client (devis, bon de livraison, facture)" : "Retirez les commandes d'impression du panier pour faire un devis"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-entete py-2 text-sm font-medium text-entete hover:bg-fond disabled:opacity-50"
              >
                <FileText size={15} /> Devis
              </button>
            )}
            <button onClick={() => setEncaissementOuvert(true)} disabled={panier.length === 0} className="flex-1 rounded bg-entete py-2 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">
              Encaisser
            </button>
          </div>
        </div>

        {derniereVente && (
          <div className="mt-3 rounded-md border border-bordure bg-fond-carte p-3 shadow-carte text-sm">
            <h3 className="mb-1 font-semibold">Recu {derniereVente.reference}</h3>
            {derniereVente.lignes.map((l) => (
              <div key={l.id} className="flex justify-between text-texte-attenue">
                <span>{l.article_nom ?? l.designation ?? l.reference_commande_impression}</span>
                <span>{l.montant} {devise}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-bordure pt-1 font-semibold">
              <span>Total</span><span>{derniereVente.montant_total} {devise}</span>
            </div>
            {(derniereVente.paiements ?? []).map((p) => (
              <div key={p.id} className="flex justify-between text-texte-attenue">
                <span>{p.mode_paiement_nom}</span><span>{p.montant} {devise}</span>
              </div>
            ))}
            {Number(derniereVente.monnaie_rendue) > 0 && (
              <div className="flex justify-between font-medium">
                <span>Monnaie a rendre</span><span>{derniereVente.monnaie_rendue} {devise}</span>
              </div>
            )}
            <button onClick={() => setRecuOuvert(true)} className="mt-2 w-full rounded border border-bordure py-1.5 text-xs hover:bg-fond">Imprimer le recu</button>
          </div>
        )}
      </div>
      <ModaleEncaissement
        ouverte={encaissementOuvert}
        total={total}
        envoi={envoiVente}
        onFermer={() => setEncaissementOuvert(false)}
        onValider={encaisser}
      />
      <ModaleDevis
        ouverte={devisOuvert}
        devis={null}
        lignesInitiales={lignesDevis}
        onFermer={() => setDevisOuvert(false)}
        onEnregistre={() => { setDevisOuvert(false); setPanier([]); setNomClient(""); navigate("/facturation"); }}
      />
      <RecuImpression vente={recuOuvert ? derniereVente : null} onFermer={() => setRecuOuvert(false)} />
      <ModaleCloture
        session={clotureOuverte ? session ?? null : null}
        onFermer={() => setClotureOuverte(false)}
        onCloturee={() => { setClotureOuverte(false); setPanier([]); chargerSession(); }}
      />
      <ModaleMouvement
        session={mouvementOuvert ? session ?? null : null}
        onFermer={() => setMouvementOuvert(false)}
        onEnregistre={() => { setMouvementOuvert(false); chargerSession(); }}
      />
    </div>
  );
}

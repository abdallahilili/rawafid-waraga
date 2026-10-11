import { useEffect, useRef, useState } from "react";
import { Building2, FileText, Wallet, Landmark, Palette, Boxes, Upload, Trash2, Save } from "lucide-react";
import { api, messageErreur } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../composants/Notifications";
import { PageCrud } from "../../composants/PageCrud";
import { actualiserEntreprise } from "../../hooks/useEntreprise";
import {
  COULEURS, POLICES, TAILLES, enregistrerApparence, lireApparence,
} from "../../utilitaires/apparence";
import type { Apparence, Theme, TaillePolice } from "../../utilitaires/apparence";
import type { Caisse, ModePaiement } from "../../types";

type Valeurs = Record<string, string>;
type Onglet = "entreprise" | "documents" | "paiement" | "caisses" | "stock" | "apparence";

const ONGLETS: { id: Onglet; libelle: string; icone: typeof Building2 }[] = [
  { id: "entreprise", libelle: "Entreprise", icone: Building2 },
  { id: "documents", libelle: "Recus et documents", icone: FileText },
  { id: "paiement", libelle: "Modes de paiement", icone: Wallet },
  { id: "caisses", libelle: "Caisses", icone: Landmark },
  { id: "stock", libelle: "Stock", icone: Boxes },
  { id: "apparence", libelle: "Apparence", icone: Palette },
];

const CLASSE_CHAMP = "w-full rounded border border-bordure bg-fond-carte px-2.5 py-1.5 text-sm focus:border-entete focus:outline-none disabled:opacity-60";
const TAILLE_MAX_LOGO = 220; // px : le logo est reduit avant enregistrement

function Champ({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-xs text-texte-attenue">{aide}</span>}
    </label>
  );
}

/** Reduit l'image choisie (PNG pour conserver la transparence) et la renvoie en data URL. */
function lireLogo(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, TAILLE_MAX_LOGO / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * echelle);
      canvas.height = Math.round(img.height * echelle);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible.")); };
    img.src = url;
  });
}

export function PageParametres() {
  const { autorise } = useAuth();
  const peutModifier = autorise("administration.parametres");
  const { notifierSucces, notifierErreur } = useNotifications();

  const [onglet, setOnglet] = useState<Onglet>("entreprise");
  const [valeurs, setValeurs] = useState<Valeurs | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [apparence, setApparence] = useState<Apparence>(lireApparence);
  const entreeLogo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/parametres/").then(({ data }) => setValeurs(data)).catch((e) => notifierErreur(messageErreur(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = (cle: string) => valeurs?.[cle] ?? "";
  const maj = (cle: string, valeur: string) => setValeurs((x) => ({ ...(x ?? {}), [cle]: valeur }));

  async function enregistrer(cles: string[]) {
    if (!valeurs) return;
    setEnvoi(true);
    try {
      const envoyees = Object.fromEntries(cles.map((c) => [c, valeurs[c] ?? ""]));
      const { data } = await api.put("/parametres/", envoyees);
      setValeurs(data);
      actualiserEntreprise(data);
      notifierSucces("Parametres enregistres.");
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  async function choisirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) { notifierErreur("Choisissez un fichier image (PNG, JPG, SVG...)."); return; }
    try { maj("LOGO_ENTREPRISE", await lireLogo(fichier)); } catch (err) { notifierErreur(messageErreur(err)); }
  }

  function changerApparence(changement: Partial<Apparence>) {
    const suivante = { ...apparence, ...changement };
    setApparence(suivante);
    enregistrerApparence(suivante);
  }

  const boutonEnregistrer = (cles: string[]) => peutModifier && (
    <button
      type="button" disabled={envoi} onClick={() => enregistrer(cles)}
      className="flex items-center gap-1.5 rounded bg-entete px-4 py-2 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-60"
    >
      <Save size={16} /> {envoi ? "Enregistrement..." : "Enregistrer"}
    </button>
  );

  const carte = "rounded-md border border-bordure bg-fond-carte p-5 shadow-carte";

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-texte">Parametres</h1>
      {!peutModifier && (
        <p className="mb-3 rounded border border-bordure bg-fond-barre px-3 py-2 text-sm text-texte-attenue">
          Lecture seule : vous n'avez pas le droit de modifier les parametres de l'entreprise. L'onglet Apparence reste modifiable.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-bordure">
        {ONGLETS.map((o) => (
          <button
            key={o.id} onClick={() => setOnglet(o.id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              onglet === o.id ? "border-entete font-medium text-entete" : "border-transparent text-texte-attenue hover:text-texte"
            }`}
          >
            <o.icone size={16} /> {o.libelle}
          </button>
        ))}
      </div>

      {!valeurs && onglet !== "paiement" && onglet !== "caisses" && onglet !== "apparence" && (
        <p className="text-sm text-texte-attenue">Chargement...</p>
      )}

      {valeurs && onglet === "entreprise" && (
        <div className={`${carte} max-w-3xl space-y-4`}>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-bordure bg-white">
              {v("LOGO_ENTREPRISE")
                ? <img src={v("LOGO_ENTREPRISE")} alt="Logo" className="max-h-full max-w-full object-contain" />
                : <span className="px-1 text-center text-xs text-texte-attenue">Aucun logo</span>}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Logo</p>
              <p className="text-xs text-texte-attenue">Affiche dans la barre superieure et sur les recus, devis, bons de livraison et factures.</p>
              {peutModifier && (
                <div className="flex gap-2">
                  <input ref={entreeLogo} type="file" accept="image/*" className="hidden" onChange={choisirLogo} />
                  <button type="button" onClick={() => entreeLogo.current?.click()} className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">
                    <Upload size={15} /> Choisir une image
                  </button>
                  {v("LOGO_ENTREPRISE") && (
                    <button type="button" onClick={() => maj("LOGO_ENTREPRISE", "")} className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm text-accent-rouge hover:bg-fond">
                      <Trash2 size={15} /> Retirer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Champ label="Nom de l'entreprise">
                <input className={CLASSE_CHAMP} disabled={!peutModifier} value={v("NOM_ENTREPRISE")} onChange={(e) => maj("NOM_ENTREPRISE", e.target.value)} />
              </Champ>
            </div>
            <Champ label="Telephone 1">
              <input className={CLASSE_CHAMP} disabled={!peutModifier} value={v("TELEPHONE_ENTREPRISE")} onChange={(e) => maj("TELEPHONE_ENTREPRISE", e.target.value)} />
            </Champ>
            <Champ label="Telephone 2">
              <input className={CLASSE_CHAMP} disabled={!peutModifier} value={v("TELEPHONE_ENTREPRISE_2")} onChange={(e) => maj("TELEPHONE_ENTREPRISE_2", e.target.value)} />
            </Champ>
            <div className="sm:col-span-2">
              <Champ label="Adresse">
                <input className={CLASSE_CHAMP} disabled={!peutModifier} value={v("ADRESSE_ENTREPRISE")} onChange={(e) => maj("ADRESSE_ENTREPRISE", e.target.value)} />
              </Champ>
            </div>
            <Champ label="Email">
              <input type="email" className={CLASSE_CHAMP} disabled={!peutModifier} value={v("EMAIL_ENTREPRISE")} onChange={(e) => maj("EMAIL_ENTREPRISE", e.target.value)} />
            </Champ>
            <Champ label="NIF / registre de commerce">
              <input className={CLASSE_CHAMP} disabled={!peutModifier} value={v("NIF_ENTREPRISE")} onChange={(e) => maj("NIF_ENTREPRISE", e.target.value)} />
            </Champ>
          </div>
          {boutonEnregistrer(["NOM_ENTREPRISE", "LOGO_ENTREPRISE", "TELEPHONE_ENTREPRISE", "TELEPHONE_ENTREPRISE_2", "ADRESSE_ENTREPRISE", "EMAIL_ENTREPRISE", "NIF_ENTREPRISE"])}
        </div>
      )}

      {valeurs && onglet === "documents" && (
        <div className={`${carte} max-w-3xl space-y-4`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Devise" aide="Affichee sur tous les montants (ex: MRU, MAD, EUR).">
              <input className={CLASSE_CHAMP} disabled={!peutModifier} value={v("DEVISE")} onChange={(e) => maj("DEVISE", e.target.value)} />
            </Champ>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox" disabled={!peutModifier} checked={v("AFFICHER_LOGO_DOCUMENTS") !== "0"}
                onChange={(e) => maj("AFFICHER_LOGO_DOCUMENTS", e.target.checked ? "1" : "0")}
              />
              Afficher le logo sur les documents imprimes
            </label>
          </div>
          <Champ label="Message sur le recu (ticket de caisse)">
            <textarea rows={2} className={CLASSE_CHAMP} disabled={!peutModifier} value={v("MESSAGE_RECU")} onChange={(e) => maj("MESSAGE_RECU", e.target.value)} />
          </Champ>
          <Champ label="Message sur le bon de livraison (BL)">
            <textarea rows={2} className={CLASSE_CHAMP} disabled={!peutModifier} value={v("MESSAGE_BL")} onChange={(e) => maj("MESSAGE_BL", e.target.value)} />
          </Champ>
          <Champ label="Message sur le devis">
            <textarea rows={2} className={CLASSE_CHAMP} disabled={!peutModifier} value={v("MESSAGE_DEVIS")} onChange={(e) => maj("MESSAGE_DEVIS", e.target.value)} />
          </Champ>
          <Champ label="Message sur la facture" aide="Laisser vide pour reprendre le message du recu.">
            <textarea rows={2} className={CLASSE_CHAMP} disabled={!peutModifier} value={v("MESSAGE_FACTURE")} onChange={(e) => maj("MESSAGE_FACTURE", e.target.value)} />
          </Champ>
          {boutonEnregistrer(["DEVISE", "AFFICHER_LOGO_DOCUMENTS", "MESSAGE_RECU", "MESSAGE_BL", "MESSAGE_DEVIS", "MESSAGE_FACTURE"])}
        </div>
      )}

      {onglet === "paiement" && (
        <PageCrud<ModePaiement>
          titre="Modes de paiement"
          url="/facturation/modes-paiement/"
          cleLigne={(m) => m.id}
          champRecherche={false}
          peutCreer={peutModifier} peutModifier={peutModifier} peutSupprimer={false}
          valeursParDefaut={{ etat: true }}
          colonnes={[
            { cle: "nom", titre: "Nom" },
            { cle: "alias", titre: "Alias" },
            { cle: "etat", titre: "Actif", rendu: (m) => (m.etat ? "Oui" : "Non") },
          ]}
          champs={[
            { nom: "nom", label: "Nom (ex: Especes, Bankily, Masrvi)", requis: true, colonnePleine: true },
            { nom: "alias", label: "Alias" },
            { nom: "etat", label: "Actif", type: "checkbox" },
          ]}
        />
      )}

      {onglet === "caisses" && (
        <PageCrud<Caisse>
          titre="Caisses"
          url="/caisse/caisses/"
          cleLigne={(c) => c.id}
          champRecherche={false}
          peutCreer={peutModifier} peutModifier={peutModifier} peutSupprimer={false}
          valeursParDefaut={{ etat: true }}
          colonnes={[
            { cle: "nom", titre: "Caisse" },
            { cle: "depot_nom", titre: "Depot" },
            { cle: "etat", titre: "Active", rendu: (c) => (c.etat ? "Oui" : "Non") },
          ]}
          champs={[
            { nom: "nom", label: "Nom (ex: Caisse 1)", requis: true },
            { nom: "depot", label: "Depot", type: "select", requis: true, optionsUrl: "/depots/" },
            { nom: "etat", label: "Active", type: "checkbox" },
          ]}
        />
      )}

      {valeurs && onglet === "stock" && (
        <div className={`${carte} max-w-3xl space-y-4`}>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox" className="mt-0.5" disabled={!peutModifier} checked={v("AUTORISER_STOCK_NEGATIF") === "1"}
              onChange={(e) => maj("AUTORISER_STOCK_NEGATIF", e.target.checked ? "1" : "0")}
            />
            <span>
              Autoriser un stock negatif
              <span className="block text-xs text-texte-attenue">Permet de vendre ou sortir un article meme si le stock enregistre est insuffisant.</span>
            </span>
          </label>
          {boutonEnregistrer(["AUTORISER_STOCK_NEGATIF"])}
        </div>
      )}

      {onglet === "apparence" && (
        <div className={`${carte} max-w-3xl space-y-5`}>
          <p className="text-xs text-texte-attenue">Ces reglages s'appliquent a ce poste uniquement (navigateur) et sont enregistres automatiquement.</p>

          <Champ label="Theme">
            <div className="flex gap-2">
              {([["clair", "Clair"], ["sombre", "Sombre"], ["auto", "Automatique"]] as [Theme, string][]).map(([id, libelle]) => (
                <button
                  key={id} type="button" onClick={() => changerApparence({ theme: id })}
                  className={`rounded border px-3 py-1.5 text-sm ${apparence.theme === id ? "border-entete bg-entete text-white" : "border-bordure hover:bg-fond"}`}
                >
                  {libelle}
                </button>
              ))}
            </div>
          </Champ>

          <Champ label="Couleur principale">
            <div className="flex gap-2">
              {COULEURS.map((c) => (
                <button
                  key={c.rgb} type="button" title={c.libelle} onClick={() => changerApparence({ couleur: c.rgb })}
                  style={{ backgroundColor: `rgb(${c.rgb})` }}
                  className={`h-8 w-8 rounded-full border-2 ${apparence.couleur === c.rgb ? "border-texte" : "border-transparent"}`}
                />
              ))}
            </div>
          </Champ>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Champ label="Police du texte">
              <select className={CLASSE_CHAMP} value={apparence.police} onChange={(e) => changerApparence({ police: e.target.value })}>
                {POLICES.map((p) => <option key={p.libelle} value={p.valeur}>{p.libelle}</option>)}
              </select>
            </Champ>
            <Champ label="Taille du texte">
              <select className={CLASSE_CHAMP} value={apparence.taille} onChange={(e) => changerApparence({ taille: e.target.value as TaillePolice })}>
                {(Object.entries(TAILLES) as [TaillePolice, { libelle: string; px: number }][]).map(([id, t]) => (
                  <option key={id} value={id}>{t.libelle} ({t.px} px)</option>
                ))}
              </select>
            </Champ>
          </div>

          <div className="rounded border border-bordure bg-fond p-3 text-sm">
            Apercu : Le zephyr leger berce 1 234,50 {v("DEVISE") || "MRU"} de papier et d'encre.
          </div>
        </div>
      )}
    </div>
  );
}

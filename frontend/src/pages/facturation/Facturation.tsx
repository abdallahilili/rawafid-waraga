import { useEntreprise } from "../../hooks/useEntreprise";
import { useState } from "react";
import { Plus, Pencil, Printer, Truck, FileText, Banknote, Search } from "lucide-react";
import { api, messageErreur } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useListe } from "../../hooks/useListe";
import { useNotifications } from "../../composants/Notifications";
import { useConfirmation } from "../../composants/Confirmation";
import { TableauDonnees } from "../../composants/TableauDonnees";
import { Badge } from "../../composants/Badge";
import { ImpressionFacturation } from "./ImpressionFacturation";
import type { TypeDocument } from "./ImpressionFacturation";
import type { ExpressionBesoins } from "../../types";
import { ModaleDevis } from "./ModaleDevis";
import { ModaleBL } from "./ModaleBL";
import { ModalePaiement } from "./ModalePaiement";

const ETATS = [
  { valeur: "", libelle: "Tous les documents" },
  { valeur: "0", libelle: "Devis" },
  { valeur: "1", libelle: "Bons de livraison" },
  { valeur: "2", libelle: "Factures" },
];
const CLE_ETAT = ["DEVIS", "BON_LIVRAISON", "FACTURE"];

function numeroCourant(d: ExpressionBesoins) {
  return d.etat === 2 ? d.numero_facture : d.etat === 1 ? d.numero_bl : d.reference;
}
function dateCourante(d: ExpressionBesoins) {
  const iso = d.etat === 2 ? d.date_fc : d.etat === 1 ? d.date_bc : d.date_devis;
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "-";
}

const BOUTON = "flex items-center gap-1 rounded border border-bordure px-2 py-0.5 text-xs hover:bg-fond";

export function PageFacturation() {
  const { devise } = useEntreprise();
  const { autorise } = useAuth();
  const { notifierSucces, notifierErreur } = useNotifications();
  const { demanderConfirmation } = useConfirmation();
  const [etat, setEtat] = useState("");
  const [recherche, setRecherche] = useState("");
  const { resultats, chargement, page, setPage, nombrePages, recharger } = useListe<ExpressionBesoins>(
    "/facturation/documents/", { ...(etat ? { etat } : {}), ...(recherche ? { recherche } : {}) },
  );

  const [devisOuvert, setDevisOuvert] = useState(false);
  const [devisEdite, setDevisEdite] = useState<ExpressionBesoins | null>(null);
  const [blCible, setBlCible] = useState<ExpressionBesoins | null>(null);
  const [paiementCible, setPaiementCible] = useState<ExpressionBesoins | null>(null);

  const [impression, setImpression] = useState<{ type: TypeDocument; doc: ExpressionBesoins } | null>(null);
  const imprimer = (type: TypeDocument, doc: ExpressionBesoins) => setImpression({ type, doc });

  async function facturer(doc: ExpressionBesoins) {
    const ok = await demanderConfirmation({
      titre: "Transformer en facture",
      message: `Creer la facture du bon de livraison ${doc.numero_bl} (${doc.prix_total} ${devise}) ?`,
    });
    if (!ok) return;
    try {
      const { data } = await api.post(`/facturation/documents/${doc.id}/valider_facture/`, {});
      notifierSucces(`Facture ${data.numero_facture} creee.`);
      recharger();
    } catch (err) {
      notifierErreur(messageErreur(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-texte">Devis, bons de livraison et factures</h1>
        {autorise("facturation.creer") && (
          <button
            onClick={() => { setDevisEdite(null); setDevisOuvert(true); }}
            className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce"
          >
            <Plus size={16} /> Nouveau devis
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-2.5 text-texte-attenue" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Numero ou client..." className="rounded border border-bordure py-1.5 pl-8 pr-3 text-sm focus:border-entete focus:outline-none" />
        </div>
        <select value={etat} onChange={(e) => setEtat(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm">
          {ETATS.map((e) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}
        </select>
      </div>

      <TableauDonnees<ExpressionBesoins>
        titre="Devis, bons de livraison et factures"
        colonnes={[
          { cle: "reference", titre: "Numero", rendu: numeroCourant },
          { cle: "client_nom", titre: "Client" },
          { cle: "date_devis", titre: "Date", rendu: dateCourante },
          { cle: "prix_total", titre: "Montant", alignerDroite: true, rendu: (d) => `${d.prix_total} ${devise}` },
          { cle: "montant_reste", titre: "Reste a payer", alignerDroite: true, rendu: (d) => (d.etat === 2 ? `${d.montant_reste} ${devise}` : "-") },
          { cle: "etat", titre: "Etape", rendu: (d) => <Badge statut={CLE_ETAT[d.etat]} />, exportRendu: (d) => d.etat_libelle },
          {
            cle: "etat_paiement", titre: "Paiement",
            rendu: (d) => d.etat < 2 ? "-" : <span className={d.etat_paiement ? "text-accent-vert" : "text-accent-rouge"}>{d.etat_paiement ? "Paye" : "Non paye"}</span>,
            exportRendu: (d) => (d.etat < 2 ? "-" : d.etat_paiement ? "Paye" : "Non paye"),
          },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(d) => d.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
        actions={(d) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            {d.etat === 0 && autorise("facturation.creer") && (
              <button className={BOUTON} onClick={() => { setDevisEdite(d); setDevisOuvert(true); }}><Pencil size={12} /> Modifier</button>
            )}
            <button className={BOUTON} onClick={() => imprimer("DEVIS", d)}><Printer size={12} /> Devis</button>
            {d.etat >= 1 && <button className={BOUTON} onClick={() => imprimer("BON_LIVRAISON", d)}><Printer size={12} /> BL</button>}
            {d.etat === 2 && <button className={BOUTON} onClick={() => imprimer("FACTURE", d)}><Printer size={12} /> Facture</button>}
            {d.etat === 0 && autorise("facturation.valider_bl") && (
              <button className={`${BOUTON} text-entete`} onClick={() => setBlCible(d)}><Truck size={12} /> Valider en BL</button>
            )}
            {d.etat === 1 && autorise("facturation.valider_facture") && (
              <button className={`${BOUTON} text-entete`} onClick={() => facturer(d)}><FileText size={12} /> Facturer</button>
            )}
            {d.etat === 2 && !d.etat_paiement && autorise("facturation.paiement") && (
              <button className={`${BOUTON} text-accent-vert`} onClick={() => setPaiementCible(d)}><Banknote size={12} /> Payer</button>
            )}
          </div>
        )}
      />

      <ImpressionFacturation document={impression?.doc ?? null} type={impression?.type ?? "DEVIS"} onFermer={() => setImpression(null)} />
      <ModaleDevis
        ouverte={devisOuvert} devis={devisEdite}
        onFermer={() => setDevisOuvert(false)}
        onEnregistre={() => { setDevisOuvert(false); recharger(); }}
      />
      <ModaleBL
        ouverte={!!blCible} devis={blCible}
        onFermer={() => setBlCible(null)}
        onValide={(doc) => { setBlCible(null); recharger(); imprimer("BON_LIVRAISON", doc); }}
      />
      <ModalePaiement
        ouverte={!!paiementCible} facture={paiementCible}
        onFermer={() => setPaiementCible(null)}
        onPaye={() => { setPaiementCible(null); recharger(); }}
      />
    </div>
  );
}

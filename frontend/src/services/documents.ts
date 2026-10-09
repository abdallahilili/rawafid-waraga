import { api } from "./api";
import type { ExpressionBesoins } from "../types";

export type TypeDocument = "DEVIS" | "BON_LIVRAISON" | "FACTURE";

function echapper(texte: string) {
  return texte.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function date(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "-";
}

function montant(valeur: string | number) {
  return Number(valeur).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TITRES: Record<TypeDocument, string> = {
  DEVIS: "DEVIS",
  BON_LIVRAISON: "BON DE LIVRAISON",
  FACTURE: "FACTURE",
};

/** Ouvre un devis, un bon de livraison ou une facture dans une fenetre
 * d'impression. Le bon de livraison n'affiche pas les prix de facon
 * secondaire : il liste d'abord ce qui est commande et ce qui est livre. */
export async function imprimerDocument(type: TypeDocument, doc: ExpressionBesoins) {
  let entreprise = "Papeterie & Imprimerie";
  try {
    const { data } = await api.get("/parametres/");
    if (data.NOM_ENTREPRISE) entreprise = data.NOM_ENTREPRISE;
  } catch {
    // Le nom par defaut suffit.
  }

  const numero = type === "FACTURE" ? doc.numero_facture : type === "BON_LIVRAISON" ? doc.numero_bl : doc.reference;
  const dateDoc = type === "FACTURE" ? doc.date_fc : type === "BON_LIVRAISON" ? doc.date_bc : doc.date_devis;
  const avecLivre = type !== "DEVIS";

  const lignes = doc.lignes.map((l, i) => {
    const quantite = avecLivre ? l.quantite_livre : l.quantite_devis;
    return `<tr>
      <td>${i + 1}</td>
      <td>${echapper(l.article_nom)}${l.unite ? ` <small>/ ${echapper(l.unite)}</small>` : ""}</td>
      ${type === "BON_LIVRAISON" ? `<td class="d">${l.quantite_devis}</td>` : ""}
      <td class="d"><strong>${quantite}</strong></td>
      <td class="d">${montant(l.prix)}</td>
      <td class="d">${montant(avecLivre ? l.prix_total : Number(l.prix) * l.quantite_devis)}</td>
    </tr>`;
  }).join("");

  const colonneCommande = type === "BON_LIVRAISON" ? "<th class=\"d\">Commande</th>" : "";
  const libelleQuantite = type === "BON_LIVRAISON" ? "Livre" : "Quantite";
  const paye = Number(doc.prix_total) - Number(doc.montant_reste);

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${TITRES[type]} ${echapper(numero || doc.reference)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; margin: 32px; font-size: 13px; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 12px; }
  h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
  .entreprise { font-size: 16px; font-weight: bold; }
  .bloc { display: flex; gap: 24px; margin: 20px 0; }
  .bloc > div { flex: 1; border: 1px solid #999; padding: 10px 12px; }
  .bloc h2 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; color: #555; }
  .bloc p { margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  .d { text-align: right; white-space: nowrap; }
  small { color: #555; }
  .total { margin-top: 10px; text-align: right; font-size: 15px; font-weight: bold; }
  .total div { margin-top: 3px; }
  .signatures { display: flex; gap: 24px; margin-top: 48px; }
  .signatures > div { flex: 1; border: 1px solid #999; height: 110px; padding: 8px 12px; }
  .pied { margin-top: 24px; text-align: center; color: #555; font-size: 11px; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <div class="entete">
    <div class="entreprise">${echapper(entreprise)}</div>
    <div style="text-align:right">
      <h1>${TITRES[type]}</h1>
      <div>N&deg; <strong>${echapper(numero || doc.reference)}</strong></div>
    </div>
  </div>

  <div class="bloc">
    <div>
      <h2>Client</h2>
      <p><strong>${echapper(doc.client_nom)}</strong></p>
    </div>
    <div>
      <h2>Document</h2>
      <p>Date : ${date(dateDoc)}</p>
      ${type !== "DEVIS" ? `<p>Devis de reference : ${echapper(doc.reference)}</p>` : ""}
      ${type === "FACTURE" && doc.numero_bl ? `<p>Bon de livraison : ${echapper(doc.numero_bl)}</p>` : ""}
      <p>Etabli par : ${echapper(doc.personnel_nom)}</p>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Designation</th>${colonneCommande}
      <th class="d">${libelleQuantite}</th><th class="d">Prix unitaire</th><th class="d">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="total">
    <div>Total : ${montant(doc.prix_total)} MRU</div>
    ${type === "FACTURE" ? `<div>Deja paye : ${montant(paye)} MRU</div><div>Reste a payer : ${montant(doc.montant_reste)} MRU</div>` : ""}
  </div>

  ${type === "BON_LIVRAISON" ? `<div class="signatures">
    <div>Livre par (nom et signature)</div>
    <div>Recu par le client (nom, date et signature)</div>
  </div>
  <div class="pied">Merci de verifier la conformite des quantites a la reception.</div>` : ""}
  ${type === "DEVIS" ? `<div class="pied">Devis valable 30 jours. Bon pour accord (signature du client) :</div>` : ""}
  <script>window.onload = function () { window.print(); };</script>
</body></html>`;

  const fenetre = window.open("", "_blank", "width=900,height=700");
  if (!fenetre) throw new Error("Le navigateur a bloque la fenetre d'impression.");
  fenetre.document.write(html);
  fenetre.document.close();
}

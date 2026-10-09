import { api } from "./api";
import type { CommandeImpression } from "../types";

const TRAVAUX: Record<string, string> = {
  IMPRESSION: "Impression", PHOTOCOPIE: "Photocopie", RELIURE: "Reliure",
  PLASTIFICATION: "Plastification", SCAN: "Scan", AUTRE: "Autre",
};
const COULEURS: Record<string, string> = { NOIR_BLANC: "Noir et blanc", COULEUR: "Couleur" };

function echapper(texte: string) {
  return texte.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function formaterDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "-";
}

/** Ouvre le bon de livraison d'une commande d'impression dans une fenetre
 * d'impression : en-tete de l'entreprise, informations du client, detail
 * des travaux, total et zones de signature (livreur / client). */
export async function imprimerBonLivraison(commande: CommandeImpression) {
  let entreprise = "Papeterie & Imprimerie";
  try {
    const { data } = await api.get("/parametres/");
    if (data.NOM_ENTREPRISE) entreprise = data.NOM_ENTREPRISE;
  } catch {
    // Le nom par defaut suffit si les parametres sont inaccessibles.
  }

  const lignes = commande.lignes.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${echapper(TRAVAUX[l.type_travail] ?? l.type_travail)}${l.description ? `<br><small>${echapper(l.description)}</small>` : ""}</td>
      <td>${echapper(l.format_papier)} - ${echapper(COULEURS[l.couleur] ?? l.couleur)}</td>
      <td class="d">${l.nombre_pages}</td>
      <td class="d">${l.nombre_copies}</td>
      <td class="d">${echapper(l.prix_unitaire_page)}</td>
      <td class="d">${echapper(l.montant)}</td>
    </tr>`).join("");

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Bon de livraison ${echapper(commande.reference)}</title>
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
  .signatures { display: flex; gap: 24px; margin-top: 48px; }
  .signatures > div { flex: 1; border: 1px solid #999; height: 110px; padding: 8px 12px; }
  .pied { margin-top: 24px; text-align: center; color: #555; font-size: 11px; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <div class="entete">
    <div class="entreprise">${echapper(entreprise)}</div>
    <div style="text-align:right">
      <h1>BON DE LIVRAISON</h1>
      <div>N&deg; <strong>${echapper(commande.reference)}</strong></div>
    </div>
  </div>

  <div class="bloc">
    <div>
      <h2>Client</h2>
      <p><strong>${echapper(commande.nom_client || "Client comptoir")}</strong></p>
      <p>Tel : ${echapper(commande.telephone_client || "-")}</p>
    </div>
    <div>
      <h2>Commande</h2>
      <p>Date de commande : ${formaterDate(commande.date_commande)}</p>
      <p>Date de livraison : ${formaterDate(commande.date_livraison ?? new Date().toISOString())}</p>
      <p>Point de retrait : ${echapper(commande.depot_nom)}</p>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>Travail</th><th>Format / couleur</th>
      <th class="d">Pages</th><th class="d">Copies</th><th class="d">Prix / page</th><th class="d">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="total">Total : ${echapper(commande.montant_total)} MRU</div>

  <div class="signatures">
    <div>Livre par (nom et signature)</div>
    <div>Recu par le client (nom, date et signature)</div>
  </div>
  <div class="pied">Merci de verifier la conformite des travaux a la reception.</div>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`;

  const fenetre = window.open("", "_blank", "width=900,height=700");
  if (!fenetre) throw new Error("Le navigateur a bloque la fenetre d'impression.");
  fenetre.document.write(html);
  fenetre.document.close();
}

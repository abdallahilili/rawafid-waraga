import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { chargerEntreprise } from "../hooks/useEntreprise";
import { formaterDateHeureExport } from "./formatage";

export type CelluleExport = string | number | null | undefined;

/** Les polices standard de jsPDF ne rendent pas certains caracteres (fleches, tirets longs...). */
function nettoyerPourPdf(valeur: string) {
  return valeur.replace(/→/g, "->").replace(/←/g, "<-").replace(/[–—]/g, "-").replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
}

function telecharger(blob: Blob, nomFichier: string) {
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

/** Export d'un tableau en PDF : en-tete de l'entreprise, titre, imprime par / date, puis le tableau. */
export async function exporterPdf(options: {
  titre: string;
  nomFichier: string;
  entetes: string[];
  lignes: CelluleExport[][];
  imprimePar: string;
}) {
  const { titre, nomFichier, entetes, lignes } = options;
  const entreprise = await chargerEntreprise();
  const doc = new jsPDF({ orientation: entetes.length > 6 ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const largeurPage = doc.internal.pageSize.getWidth();
  const marge = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(nettoyerPourPdf(entreprise.nom), largeurPage / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(11);
  doc.text(nettoyerPourPdf(titre), largeurPage / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Imprime par : ${nettoyerPourPdf(options.imprimePar)}`, marge, y);
  doc.text(`Date : ${formaterDateHeureExport(new Date().toISOString())}`, largeurPage - marge, y, { align: "right" });
  y += 3;
  doc.setLineWidth(0.2);
  doc.line(marge, y, largeurPage - marge, y);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: marge, right: marge },
    head: [entetes.map(nettoyerPourPdf)],
    body: lignes.map((l) => l.map((v) => nettoyerPourPdf(v == null ? "" : String(v)))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [20, 100, 180] },
  });

  doc.save(nomFichier.endsWith(".pdf") ? nomFichier : `${nomFichier}.pdf`);
}

/** Export d'un tableau en classeur Excel (.xlsx), colonnes ajustees, nombres conserves. */
export async function exporterExcel(options: {
  titre: string;
  nomFichier: string;
  entetes: string[];
  lignes: CelluleExport[][];
}) {
  const { default: ExcelJS } = await import("exceljs");
  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet(options.titre.slice(0, 31).replace(/[\\/?*[\]:]/g, " ") || "Export");
  feuille.addRow(options.entetes);
  options.lignes.forEach((l) => feuille.addRow(l.map((v) => (v == null ? "" : v))));

  const entete = feuille.getRow(1);
  entete.font = { bold: true, color: { argb: "FFFFFFFF" } };
  entete.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1464B4" } };
  feuille.columns.forEach((colonne, i) => {
    const longueurs = [options.entetes[i], ...options.lignes.map((l) => l[i])].map((v) => String(v ?? "").length);
    colonne.width = Math.min(50, Math.max(10, ...longueurs) + 2);
  });
  feuille.views = [{ state: "frozen", ySplit: 1 }];

  const tampon = await classeur.xlsx.writeBuffer();
  telecharger(
    new Blob([tampon], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    options.nomFichier.endsWith(".xlsx") ? options.nomFichier : `${options.nomFichier}.xlsx`,
  );
}

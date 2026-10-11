import { formaterDate, formaterNombre } from "../../utilitaires/formatage";
import { useEntreprise } from "../../hooks/useEntreprise";
import { DocumentImpression } from "../../composants/DocumentImpression";
import type { ColonneDocument } from "../../composants/DocumentImpression";
import type { ExpressionBesoins } from "../../types";

export type TypeDocument = "DEVIS" | "BON_LIVRAISON" | "FACTURE";

const TITRES: Record<TypeDocument, string> = {
  DEVIS: "Devis", BON_LIVRAISON: "Bon de livraison", FACTURE: "Facture",
};

interface Props {
  document: ExpressionBesoins | null;
  type: TypeDocument;
  onFermer: () => void;
}

/** Devis, Bon de livraison ou facture : meme modele d'impression que les recus. */
export function ImpressionFacturation({ document: doc, type, onFermer }: Props) {
  const entreprise = useEntreprise();
  const titre = TITRES[type];
  const numero = !doc ? "" : type === "FACTURE" ? doc.numero_facture : type === "BON_LIVRAISON" ? doc.numero_bl : doc.reference;
  const dateDoc = !doc ? null : type === "FACTURE" ? doc.date_fc : type === "BON_LIVRAISON" ? doc.date_bc : doc.date_devis;

  const colonnes: ColonneDocument[] = type === "BON_LIVRAISON"
    ? [
        { titre: "Designation" },
        { titre: "Commande", alignement: "centre" },
        { titre: "Livre", alignement: "centre", gras: true },
        { titre: "P.U.", alignement: "droite" },
        { titre: "Total", alignement: "droite", gras: true },
      ]
    : [
        { titre: "Designation" },
        { titre: "Qte", alignement: "centre" },
        { titre: "P.U.", alignement: "droite" },
        { titre: "Total", alignement: "droite", gras: true },
      ];

  const lignes = (doc?.lignes ?? []).map((l) => {
    const designation = l.unite ? `${l.article_nom} (${l.unite})` : l.article_nom;
    if (type === "BON_LIVRAISON") {
      return [designation, l.quantite_devis, l.quantite_livre, formaterNombre(l.prix), formaterNombre(l.prix_total)];
    }
    if (type === "FACTURE") {
      return [designation, l.quantite_livre, formaterNombre(l.prix), formaterNombre(l.prix_total)];
    }
    return [designation, l.quantite_devis, formaterNombre(l.prix), formaterNombre(Number(l.prix) * l.quantite_devis)];
  });

  const total = !doc ? 0 : type === "DEVIS"
    ? doc.lignes.reduce((s, l) => s + Number(l.prix) * l.quantite_devis, 0)
    : Number(doc.prix_total);

  return (
    <DocumentImpression
      ouvert={!!doc}
      onFermer={onFermer}
      titreModale={`${titre} ${numero}`}
      titreDocument={titre}
      infosGauche={[
        { libelle: `${titre} N°`, valeur: numero },
        { libelle: "Client", valeur: doc?.client_nom },
      ]}
      infosDroite={[
        { libelle: "Date", valeur: formaterDate(dateDoc) },
        ...(type === "DEVIS" ? [] : [{ libelle: "Devis", valeur: doc?.reference }]),
        ...(type === "FACTURE" && doc?.numero_bl ? [{ libelle: "Bon de livraison", valeur: doc.numero_bl }] : []),
        { libelle: "Etabli par", valeur: doc?.personnel_nom },
      ]}
      colonnes={colonnes}
      lignes={lignes}
      libelleTotal={type === "FACTURE" ? "TOTAL FACTURE" : "TOTAL"}
      total={formaterNombre(total)}
      details={type === "FACTURE" && doc ? [
        { libelle: "Deja paye", valeur: formaterNombre(Number(doc.prix_total) - Number(doc.montant_reste)) },
        { libelle: "Reste a payer", valeur: formaterNombre(doc.montant_reste) },
      ] : []}
      signatures={type === "BON_LIVRAISON" ? ["Livre par (nom et signature)", "Recu par le client (nom, date et signature)"] : []}
      messagePied={
        type === "DEVIS" ? entreprise.messageDevis
        : type === "BON_LIVRAISON" ? entreprise.messageBL
        : entreprise.messageFacture || undefined
      }
    />
  );
}

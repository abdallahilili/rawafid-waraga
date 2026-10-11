import { formaterDateHeure, formaterNombre } from "../utilitaires/formatage";
import type { Vente } from "../types";
import { DocumentImpression } from "./DocumentImpression";

/** Recu de caisse d'une vente (moitie haute d'une feuille A4). */
export function RecuImpression({ vente, onFermer }: { vente: Vente | null; onFermer: () => void }) {
  return (
    <DocumentImpression
      demiPage
      ouvert={!!vente}
      onFermer={onFermer}
      titreModale={vente ? `Recu ${vente.reference}` : "Recu"}
      infosGauche={[
        { libelle: "Recu N°", valeur: vente?.reference },
        { libelle: "Client", valeur: vente?.nom_client || "-" },
      ]}
      infosDroite={[
        { libelle: "Date", valeur: formaterDateHeure(vente?.date_vente) },
        { libelle: "Caissier", valeur: vente?.caissier_nom },
      ]}
      banniere={vente?.annulee ? "VENTE ANNULEE" : undefined}
      colonnes={[
        { titre: "Designation" },
        { titre: "Qte", alignement: "centre" },
        { titre: "P.U.", alignement: "droite" },
        { titre: "Total", alignement: "droite", gras: true },
      ]}
      lignes={(vente?.lignes ?? []).map((l) => [
        l.article_nom ?? (l.designation || `Commande d'impression ${l.reference_commande_impression ?? ""}`),
        l.quantite ?? 1,
        formaterNombre(l.prix_unitaire),
        formaterNombre(l.montant),
      ])}
      libelleTotal="TOTAL A PAYER"
      total={vente ? formaterNombre(vente.montant_total) : undefined}
      details={vente ? [
        // Un paiement par mode ; "Recu" / "Rendu" seulement s'il y a une monnaie a rendre.
        ...(vente.paiements ?? []).map((p) => ({ libelle: p.mode_paiement_nom, valeur: formaterNombre(p.montant) })),
        ...(Number(vente.monnaie_rendue) > 0 ? [
          { libelle: "Recu", valeur: formaterNombre(vente.montant_recu) },
          { libelle: "Rendu", valeur: formaterNombre(vente.monnaie_rendue) },
        ] : []),
      ] : []}
    />
  );
}

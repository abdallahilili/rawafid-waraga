import { useEntreprise } from "../hooks/useEntreprise";
import { formaterNombre } from "../utilitaires/formatage";
import type { SessionCaissier } from "../types";

function Carte({ titre, valeur, ton = "" }: { titre: string; valeur: string; ton?: string }) {
  return (
    <div className="rounded-md border border-bordure bg-fond-carte p-3 shadow-carte">
      <p className="text-xs text-texte-attenue">{titre}</p>
      <p className={`mt-1 text-lg font-semibold ${ton}`}>{valeur}</p>
    </div>
  );
}

/** Chiffres cles d'une session de caisse (en cours ou cloturee). */
export function ResumeSession({ session }: { session: SessionCaissier }) {
  const { devise } = useEntreprise();
  const r = session.resume;
  const montant = (v: string | number | null) => `${formaterNombre(v)} ${devise}`;
  const ferme = session.statut === "FERMEE";
  const ecart = Number(session.ecart ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Carte titre="Fond de caisse" valeur={montant(session.montant_ouverture)} />
      <Carte titre={`Ventes (${r.nombre_ventes})`} valeur={montant(r.total_ventes)} />
      <Carte titre="Encaisse en especes" valeur={montant(r.total_especes)} />
      <Carte titre="Autres paiements" valeur={montant(r.total_autres_paiements)} />
      <Carte titre="Paiements de factures" valeur={montant(r.paiements_factures)} />
      <Carte titre="Remboursements" valeur={montant(r.remboursements)} />
      <Carte titre="Entrees manuelles" valeur={montant(r.entrees_manuelles)} />
      <Carte titre="Sorties manuelles" valeur={montant(r.sorties_manuelles)} />
      <Carte titre="Especes attendues" valeur={montant(r.montant_attendu)} ton="text-entete" />
      {ferme && <Carte titre="Especes comptees" valeur={montant(session.montant_fermeture)} />}
      {ferme && (
        <Carte
          titre="Ecart"
          valeur={`${ecart > 0 ? "+" : ""}${montant(ecart)}`}
          ton={ecart === 0 ? "text-accent-vert" : "text-accent-rouge"}
        />
      )}
    </div>
  );
}

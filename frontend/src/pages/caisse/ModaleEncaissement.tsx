import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEntreprise } from "../../hooks/useEntreprise";
import { useOptions } from "../../hooks/useListe";
import { Modale } from "../../composants/Modale";
import { formaterNombre } from "../../utilitaires/formatage";
import type { ModePaiement } from "../../types";

interface PaiementSaisi { mode_paiement: string; montant: string; reference_transaction: string }

export interface PaiementsValides {
  paiements: { mode_paiement: number; montant: number; reference_transaction: string }[];
  /** Especes remises par le client, ou null si le compte est exact. */
  montantRecu: number | null;
}

interface Props {
  ouverte: boolean;
  total: number;
  envoi: boolean;
  onFermer: () => void;
  onValider: (p: PaiementsValides) => void;
}

const arrondir = (n: number) => Math.round(n * 100) / 100;

/** Fenetre d'encaissement : un ou plusieurs modes de paiement pour un meme recu.
 * Prerempli avec le total en especes : un simple clic sur Valider suffit. */
export function ModaleEncaissement({ ouverte, total, envoi, onFermer, onValider }: Props) {
  const { devise } = useEntreprise();
  const modes = useOptions<ModePaiement>("/facturation/modes-paiement/", ouverte).filter((m) => m.etat);
  const [paiements, setPaiements] = useState<PaiementSaisi[]>([]);
  const [recu, setRecu] = useState("");

  const modeEspeces = modes.find((m) => m.especes);

  useEffect(() => {
    if (!ouverte) return;
    setRecu("");
    setPaiements([{ mode_paiement: modeEspeces ? String(modeEspeces.id) : "", montant: String(total), reference_transaction: "" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte, total, modeEspeces?.id]);

  const estEspeces = (id: string) => !!modes.find((m) => String(m.id) === id)?.especes;
  const somme = arrondir(paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0));
  const reste = arrondir(total - somme);
  const especes = arrondir(paiements.filter((p) => estEspeces(p.mode_paiement)).reduce((s, p) => s + (Number(p.montant) || 0), 0));
  const rendu = recu !== "" && especes > 0 ? arrondir(Number(recu) - especes) : null;
  const valide = Math.abs(reste) < 0.005 && paiements.every((p) => p.mode_paiement && Number(p.montant) > 0)
    && (recu === "" || especes === 0 || Number(recu) >= especes);

  const maj = (i: number, champ: keyof PaiementSaisi, valeur: string) =>
    setPaiements((x) => x.map((p, j) => (j === i ? { ...p, [champ]: valeur } : p)));

  function valider() {
    onValider({
      paiements: paiements.filter((p) => Number(p.montant) > 0).map((p) => ({
        mode_paiement: Number(p.mode_paiement), montant: Number(p.montant), reference_transaction: p.reference_transaction,
      })),
      montantRecu: recu !== "" && especes > 0 ? Number(recu) : null,
    });
  }

  return (
    <Modale titre="Encaissement" ouverte={ouverte} onFermer={onFermer} largeur="max-w-xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded border border-bordure bg-fond px-3 py-2">
          <span className="text-sm text-texte-attenue">Total a payer</span>
          <span className="text-xl font-bold">{formaterNombre(total)} {devise}</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Paiement</p>
          {paiements.map((p, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <select value={p.mode_paiement} onChange={(e) => maj(i, "mode_paiement", e.target.value)} aria-label="Mode de paiement"
                className="col-span-5 rounded border border-bordure px-2 py-1.5 text-sm">
                <option value="">-- Mode --</option>
                {modes.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <input type="number" min={0} step="0.01" value={p.montant} onChange={(e) => maj(i, "montant", e.target.value)} aria-label="Montant"
                className="col-span-4 rounded border border-bordure px-2 py-1.5 text-right text-sm" />
              {paiements.length > 1 ? (
                <button onClick={() => setPaiements((x) => x.filter((_, j) => j !== i))} className="col-span-1 text-texte-attenue hover:text-accent-rouge" aria-label="Retirer ce paiement">
                  <Trash2 size={16} />
                </button>
              ) : <span className="col-span-1" />}
              {p.mode_paiement && !estEspeces(p.mode_paiement) && (
                <input value={p.reference_transaction} onChange={(e) => maj(i, "reference_transaction", e.target.value)}
                  placeholder="Reference de transaction (facultatif)" maxLength={60}
                  className="col-span-12 rounded border border-bordure px-2 py-1.5 text-sm" />
              )}
            </div>
          ))}
          <button type="button" onClick={() => setPaiements((x) => [...x, { mode_paiement: "", montant: reste > 0 ? String(reste) : "", reference_transaction: "" }])}
            className="inline-flex items-center gap-1 text-sm text-entete hover:underline">
            <Plus size={14} /> Ajouter un mode de paiement
          </button>
          <p className={`text-sm ${Math.abs(reste) < 0.005 ? "text-accent-vert" : "text-accent-rouge"}`}>
            {Math.abs(reste) < 0.005
              ? "Le montant couvre exactement le total."
              : reste > 0 ? `Reste a encaisser : ${formaterNombre(reste)} ${devise}`
              : `Trop-percu : ${formaterNombre(-reste)} ${devise} (le total des paiements doit etre egal au total)`}
          </p>
        </div>

        {especes > 0 && (
          <div className="grid grid-cols-2 items-end gap-3 border-t border-bordure pt-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Especes remises par le client</label>
              <input type="number" min={0} step="0.01" value={recu} onChange={(e) => setRecu(e.target.value)}
                placeholder={`Facultatif (${formaterNombre(especes)})`}
                className="w-full rounded border border-bordure px-2 py-1.5 text-sm" />
            </div>
            <p className="pb-2 text-sm">
              Rendu : <strong className={rendu != null && rendu < 0 ? "text-accent-rouge" : ""}>{rendu != null ? `${formaterNombre(rendu)} ${devise}` : "-"}</strong>
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onFermer} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Retour au panier</button>
          <button onClick={valider} disabled={!valide || envoi}
            className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">
            {envoi ? "Enregistrement..." : `Valider la vente - ${formaterNombre(total)} ${devise}`}
          </button>
        </div>
      </div>
    </Modale>
  );
}

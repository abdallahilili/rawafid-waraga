import { useEntreprise } from "../../hooks/useEntreprise";
import { useEffect, useState } from "react";
import { api, messageErreur } from "../../services/api";
import { useOptions } from "../../hooks/useListe";
import { Modale } from "../../composants/Modale";
import { useNotifications } from "../../composants/Notifications";
import type { ExpressionBesoins, ModePaiement } from "../../types";

interface Props {
  ouverte: boolean;
  facture: ExpressionBesoins | null;
  onFermer: () => void;
  onPaye: () => void;
}

/** Paiement (total ou partiel) d'une facture ; necessite une session de caisse ouverte. */
export function ModalePaiement({ ouverte, facture, onFermer, onPaye }: Props) {
  const { devise } = useEntreprise();
  const modes = useOptions<ModePaiement>("/facturation/modes-paiement/", ouverte);
  const { notifierSucces, notifierErreur } = useNotifications();
  const [mode, setMode] = useState("");
  const [montant, setMontant] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (ouverte && facture) {
      setMontant(String(facture.montant_reste));
      setMode("");
    }
  }, [ouverte, facture]);

  if (!facture) return null;

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!facture) return;
    setEnvoi(true);
    try {
      await api.post(`/facturation/documents/${facture.id}/payer/`, { montant, mode_paiement: Number(mode) });
      notifierSucces("Paiement enregistre.");
      onPaye();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={`Paiement - facture ${facture.numero_facture}`} ouverte={ouverte} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-3">
        <div className="rounded border border-bordure bg-fond p-3 text-sm">
          <div>Client : <strong>{facture.client_nom}</strong></div>
          <div>Total : {facture.prix_total} {devise}</div>
          <div>Reste a payer : <strong className="text-accent-rouge">{facture.montant_reste} {devise}</strong></div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Mode de paiement <span className="text-accent-rouge">*</span></label>
          <select required value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
            <option value="">-- Selectionner --</option>
            {modes.filter((m) => m.etat).map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Montant paye <span className="text-accent-rouge">*</span></label>
          <input required type="number" min={0.01} max={Number(facture.montant_reste)} step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
          <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">Enregistrer le paiement</button>
        </div>
      </form>
    </Modale>
  );
}

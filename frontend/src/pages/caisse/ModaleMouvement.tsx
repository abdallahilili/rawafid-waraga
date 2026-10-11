import { useEffect, useState } from "react";
import { api, messageErreur } from "../../services/api";
import { Modale } from "../../composants/Modale";
import { useNotifications } from "../../composants/Notifications";
import type { SessionCaissier } from "../../types";

interface Props {
  session: SessionCaissier | null;
  onFermer: () => void;
  onEnregistre: () => void;
}

/** Entree ou sortie manuelle d'especes dans une session ouverte (motif obligatoire). */
export function ModaleMouvement({ session, onFermer, onEnregistre }: Props) {
  const { notifierSucces, notifierErreur } = useNotifications();
  const [type, setType] = useState("ENTREE_CAISSE");
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { if (session) { setType("ENTREE_CAISSE"); setMontant(""); setMotif(""); } }, [session]);
  if (!session) return null;

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setEnvoi(true);
    try {
      await api.post(`/caisse/sessions/${session.id}/mouvement-manuel/`, { type_mouvement: type, montant, motif });
      notifierSucces("Mouvement enregistre.");
      onEnregistre();
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre="Entree / sortie manuelle d'especes" ouverte={!!session} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Type <span className="text-accent-rouge">*</span></label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm">
            <option value="ENTREE_CAISSE">Entree d'especes</option>
            <option value="SORTIE_CAISSE">Sortie d'especes</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Montant <span className="text-accent-rouge">*</span></label>
          <input required type="number" min={0.01} step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Motif <span className="text-accent-rouge">*</span></label>
          <input required maxLength={255} value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
          <p className="mt-1 text-xs text-texte-attenue">Obligatoire : le motif apparait dans le journal de caisse.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
          <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">Enregistrer</button>
        </div>
      </form>
    </Modale>
  );
}

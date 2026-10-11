import { useEffect, useState } from "react";
import { api, messageErreur } from "../../services/api";
import { useEntreprise } from "../../hooks/useEntreprise";
import { Modale } from "../../composants/Modale";
import { useNotifications } from "../../composants/Notifications";
import { formaterNombre } from "../../utilitaires/formatage";
import type { SessionCaissier } from "../../types";

interface Props {
  session: SessionCaissier | null;
  onFermer: () => void;
  onCloturee: (session: SessionCaissier) => void;
}

/** Cloture d'une session : especes comptees, ecart avec l'attendu, note. */
export function ModaleCloture({ session, onFermer, onCloturee }: Props) {
  const { devise } = useEntreprise();
  const { notifierSucces, notifierErreur } = useNotifications();
  const [compte, setCompte] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { if (session) { setCompte(""); setNote(""); } }, [session]);
  if (!session) return null;

  const attendu = Number(session.resume.montant_attendu);
  const ecart = compte !== "" ? Number(compte) - attendu : null;

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setEnvoi(true);
    try {
      const { data } = await api.post(`/caisse/sessions/${session.id}/fermer/`, { montant_fermeture: compte, note });
      notifierSucces("Session cloturee.");
      onCloturee(data);
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={`Cloturer la session n° ${session.id}`} ouverte={!!session} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-3">
        <p className="text-sm text-texte-attenue">
          Caissier : <strong className="text-texte">{session.caissier_nom}</strong>
          {session.caisse_nom ? ` - ${session.caisse_nom}` : ""}
        </p>
        <p className="text-sm">Especes attendues en caisse : <strong>{formaterNombre(attendu)} {devise}</strong></p>
        <div>
          <label className="mb-1 block text-sm font-medium">Especes comptees <span className="text-accent-rouge">*</span></label>
          <input
            required autoFocus type="number" min={0} step="0.01" value={compte}
            onChange={(e) => setCompte(e.target.value)}
            className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm"
          />
        </div>
        {ecart != null && (
          <p className={`rounded px-3 py-2 text-sm ${ecart === 0 ? "bg-green-50 text-accent-vert" : "bg-amber-50 text-amber-700"}`}>
            Ecart : <strong>{ecart > 0 ? "+" : ""}{formaterNombre(ecart)} {devise}</strong>{" "}
            {ecart === 0 ? "- la caisse est juste." : ecart > 0 ? "(exces)" : "(manquant)"}
          </p>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Note (facultatif)</label>
          <input value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} className="w-full rounded border border-bordure px-2.5 py-1.5 text-sm" />
        </div>
        <p className="text-xs text-texte-attenue">Une session cloturee ne peut plus etre modifiee.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
          <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">Cloturer la session</button>
        </div>
      </form>
    </Modale>
  );
}

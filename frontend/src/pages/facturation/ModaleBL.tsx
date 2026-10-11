import { useEntreprise } from "../../hooks/useEntreprise";
import { useEffect, useState } from "react";
import { api, messageErreur } from "../../services/api";
import { Modale } from "../../composants/Modale";
import { useNotifications } from "../../composants/Notifications";
import type { ExpressionBesoins } from "../../types";

interface Props {
  ouverte: boolean;
  devis: ExpressionBesoins | null;
  onFermer: () => void;
  onValide: (document: ExpressionBesoins) => void;
}

/** Validation du devis en bon de livraison : date et quantites reellement livrees. */
export function ModaleBL({ ouverte, devis, onFermer, onValide }: Props) {
  const { devise } = useEntreprise();
  const { notifierSucces, notifierErreur } = useNotifications();
  const [dateBL, setDateBL] = useState("");
  const [livrees, setLivrees] = useState<Record<number, string>>({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!ouverte || !devis) return;
    setDateBL(new Date().toISOString().slice(0, 10));
    setLivrees(Object.fromEntries(devis.lignes.map((l) => [l.id, String(l.quantite_devis)])));
  }, [ouverte, devis]);

  if (!devis) return null;

  const total = devis.lignes.reduce((s, l) => s + Number(l.prix) * (Number(livrees[l.id]) || 0), 0);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!devis) return;
    setEnvoi(true);
    try {
      const { data } = await api.post(`/facturation/documents/${devis.id}/valider_bl/`, {
        date_bc: new Date(`${dateBL}T12:00:00`).toISOString(),
        lignes: devis.lignes.map((l) => ({ ligne: l.id, quantite_livre: Number(livrees[l.id] ?? l.quantite_devis) })),
      });
      notifierSucces(`Bon de livraison ${data.numero_bl} cree. Le stock a ete mis a jour.`);
      onValide(data);
    } catch (err) {
      notifierErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale titre={`Bon de livraison - devis ${devis.reference}`} ouverte={ouverte} onFermer={onFermer} largeur="max-w-2xl">
      <form onSubmit={soumettre} className="space-y-3">
        <p className="text-sm text-texte-attenue">Client : <strong className="text-texte">{devis.client_nom}</strong>. Indiquez les quantites reellement livrees : elles sortent du stock et servent a la facture.</p>
        <div>
          <label className="mb-1 block text-sm font-medium">Date du bon de livraison <span className="text-accent-rouge">*</span></label>
          <input required type="date" value={dateBL} onChange={(e) => setDateBL(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bordure text-left text-xs text-texte-attenue">
              <th className="py-1">Designation</th><th className="text-right">Devis</th><th className="text-right">Livre</th><th className="text-right">Prix</th>
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map((l) => (
              <tr key={l.id} className="border-b border-bordure">
                <td className="py-1.5">{l.article_nom}</td>
                <td className="text-right">{l.quantite_devis}</td>
                <td className="text-right">
                  <input
                    type="number" min={0} max={l.quantite_devis} value={livrees[l.id] ?? ""}
                    onChange={(e) => setLivrees((s) => ({ ...s, [l.id]: e.target.value }))}
                    className="w-20 rounded border border-bordure px-1.5 py-1 text-right text-sm"
                  />
                </td>
                <td className="text-right">{l.prix}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-sm font-semibold">Total livre : {total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {devise}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">Annuler</button>
          <button type="submit" disabled={envoi} className="rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce disabled:opacity-50">Valider le bon de livraison</button>
        </div>
      </form>
    </Modale>
  );
}

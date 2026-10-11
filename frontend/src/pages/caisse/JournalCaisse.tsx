import { useEffect, useState } from "react";
import { Printer, Lock } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useEntreprise } from "../../hooks/useEntreprise";
import { useListe } from "../../hooks/useListe";
import { Badge } from "../../composants/Badge";
import { libelleStatut } from "../../composants/Badge";
import { DocumentImpression } from "../../composants/DocumentImpression";
import { Modale } from "../../composants/Modale";
import { ResumeSession } from "../../composants/ResumeSession";
import { TableauDonnees } from "../../composants/TableauDonnees";
import { formaterDateHeure, formaterDateHeureExport, formaterNombre } from "../../utilitaires/formatage";
import type { MouvementCaisse, SessionCaissier } from "../../types";
import { ModaleCloture } from "./ModaleCloture";

const NEGATIFS = ["REMBOURSEMENT", "SORTIE_CAISSE"];
const SANS_MONTANT = ["OUVERTURE", "FERMETURE"];

function DetailSession({ session, onFermer, onCloturee }: {
  session: SessionCaissier | null; onFermer: () => void; onCloturee: (s: SessionCaissier) => void;
}) {
  const { autorise } = useAuth();
  const { devise } = useEntreprise();
  const [mouvements, setMouvements] = useState<MouvementCaisse[]>([]);
  const [impression, setImpression] = useState(false);
  const [cloture, setCloture] = useState<SessionCaissier | null>(null);

  useEffect(() => {
    if (!session) return;
    api.get(`/caisse/sessions/${session.id}/mouvements/`).then((r) => setMouvements(r.data)).catch(() => setMouvements([]));
  }, [session]);

  if (!session) return null;
  const peutCloturer = session.statut === "OUVERTE" && autorise("caisse.fermer_sessions_autres");
  const ecart = Number(session.ecart ?? 0);

  return (
    <>
      <Modale titre={`Session n° ${session.id}${session.caisse_nom ? ` - ${session.caisse_nom}` : ""}`} ouverte={!!session} onFermer={onFermer} largeur="max-w-4xl">
        <div className="space-y-4">
          <p className="text-sm text-texte-attenue">
            Caissier : <strong className="text-texte">{session.caissier_nom}</strong> · Ouverte le {formaterDateHeure(session.date_ouverture)}
            {session.date_fermeture && ` · Cloturee le ${formaterDateHeure(session.date_fermeture)}`}
            {session.fermee_par_nom && session.fermee_par_nom !== session.caissier_nom && ` par ${session.fermee_par_nom}`}
          </p>
          <ResumeSession session={session} />
          {session.note && <p className="text-sm">Note : {session.note}</p>}

          <div className="overflow-x-auto rounded-md border border-bordure">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bordure bg-fond-barre text-left text-texte-attenue">
                  <th className="px-3 py-2">Heure</th><th className="px-3 py-2">Operation</th><th className="px-3 py-2">Paiement</th>
                  <th className="px-3 py-2">Detail</th><th className="px-3 py-2">Par</th><th className="px-3 py-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <tr key={m.id} className="border-b border-bordure last:border-0">
                    <td className="px-3 py-2">{formaterDateHeure(m.date_mouvement)}</td>
                    <td className="px-3 py-2">{m.type_libelle}</td>
                    <td className="px-3 py-2">{SANS_MONTANT.includes(m.type_mouvement) ? "-" : m.mode_paiement_nom}</td>
                    <td className="px-3 py-2 text-texte-attenue">{[m.reference_document, m.commentaire].filter(Boolean).join(" - ")}</td>
                    <td className="px-3 py-2">{m.utilisateur_nom}</td>
                    <td className={`px-3 py-2 text-right font-medium ${NEGATIFS.includes(m.type_mouvement) ? "text-accent-rouge" : ""}`}>
                      {NEGATIFS.includes(m.type_mouvement) ? "-" : ""}{formaterNombre(m.montant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => setImpression(true)} className="flex items-center gap-1.5 rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond">
              <Printer size={15} /> Imprimer le journal
            </button>
            {peutCloturer && (
              <button onClick={() => setCloture(session)} className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce">
                <Lock size={15} /> Cloturer cette session
              </button>
            )}
          </div>
        </div>
      </Modale>

      <ModaleCloture session={cloture} onFermer={() => setCloture(null)} onCloturee={(s) => { setCloture(null); onCloturee(s); }} />

      <DocumentImpression
        ouvert={impression}
        onFermer={() => setImpression(false)}
        titreModale={`Journal de la session n° ${session.id}`}
        titreDocument="Journal de session de caisse"
        infosGauche={[
          { libelle: "Session N°", valeur: session.id },
          { libelle: "Caissier", valeur: session.caissier_nom },
          { libelle: "Caisse", valeur: session.caisse_nom || session.depot_nom },
        ]}
        infosDroite={[
          { libelle: "Ouverture", valeur: formaterDateHeure(session.date_ouverture) },
          { libelle: "Cloture", valeur: session.date_fermeture ? formaterDateHeure(session.date_fermeture) : "En cours" },
          { libelle: "Etat", valeur: libelleStatut(session.statut) },
        ]}
        colonnes={[
          { titre: "Heure" }, { titre: "Operation" }, { titre: "Detail" },
          { titre: "Montant", alignement: "droite", gras: true },
        ]}
        lignes={mouvements.map((m) => [
          formaterDateHeure(m.date_mouvement),
          m.type_libelle,
          [m.mode_paiement_nom !== "Especes" && !SANS_MONTANT.includes(m.type_mouvement) ? m.mode_paiement_nom : "", m.reference_document, m.commentaire].filter(Boolean).join(" - "),
          `${NEGATIFS.includes(m.type_mouvement) ? "-" : ""}${formaterNombre(m.montant)}`,
        ])}
        libelleTotal="ESPECES ATTENDUES"
        total={formaterNombre(session.resume.montant_attendu)}
        details={[
          { libelle: "Fond de caisse", valeur: formaterNombre(session.montant_ouverture) },
          { libelle: "Ventes", valeur: formaterNombre(session.resume.total_ventes) },
          ...(session.statut === "FERMEE" ? [
            { libelle: "Especes comptees", valeur: formaterNombre(session.montant_fermeture) },
            { libelle: "Ecart", valeur: `${ecart > 0 ? "+" : ""}${formaterNombre(ecart)}` },
          ] : []),
        ]}
        signatures={["Caissier (nom et signature)", "Responsable (nom et signature)"]}
        messagePied={`Montants en ${devise}`}
      />
    </>
  );
}

export function PageJournalCaisse() {
  const { autorise } = useAuth();
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [statut, setStatut] = useState("");
  const [recherche, setRecherche] = useState("");
  const [detail, setDetail] = useState<SessionCaissier | null>(null);
  const { resultats, chargement, page, setPage, nombrePages, recharger } = useListe<SessionCaissier>("/caisse/sessions/", {
    ...(debut ? { date_debut: debut } : {}), ...(fin ? { date_fin: fin } : {}),
    ...(statut ? { statut } : {}), ...(recherche ? { recherche } : {}),
  });
  const toutes = autorise("caisse.voir_toutes_sessions") || autorise("caisse.fermer_sessions_autres");

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-texte">Journal de caisse</h1>
      <p className="mb-4 text-sm text-texte-attenue">
        {toutes ? "Toutes les sessions de caisse, avec les ecarts constates." : "Vos sessions de caisse."} Cliquez sur une ligne pour voir le detail.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div><label className="mb-1 block text-xs text-texte-attenue">Du</label><input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm" /></div>
        <div><label className="mb-1 block text-xs text-texte-attenue">Au</label><input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm" /></div>
        <div>
          <label className="mb-1 block text-xs text-texte-attenue">Etat</label>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className="rounded border border-bordure px-2.5 py-1.5 text-sm">
            <option value="">Toutes</option><option value="OUVERTE">Ouvertes</option><option value="FERMEE">Cloturees</option>
          </select>
        </div>
        {toutes && (
          <div><label className="mb-1 block text-xs text-texte-attenue">Caissier / caisse</label><input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher..." className="rounded border border-bordure px-2.5 py-1.5 text-sm" /></div>
        )}
      </div>

      <TableauDonnees<SessionCaissier>
        titre="Journal de caisse"
        colonnes={[
          { cle: "id", titre: "N°" },
          { cle: "date_ouverture", titre: "Ouverture", rendu: (s) => formaterDateHeure(s.date_ouverture), exportRendu: (s) => formaterDateHeureExport(s.date_ouverture) },
          { cle: "date_fermeture", titre: "Cloture", rendu: (s) => formaterDateHeure(s.date_fermeture), exportRendu: (s) => (s.date_fermeture ? formaterDateHeureExport(s.date_fermeture) : "") },
          { cle: "caissier_nom", titre: "Caissier" },
          { cle: "caisse_nom", titre: "Caisse" },
          { cle: "total_ventes", titre: "Ventes", alignerDroite: true, rendu: (s) => formaterNombre(s.resume.total_ventes), exportRendu: (s) => Number(s.resume.total_ventes) },
          { cle: "montant_attendu", titre: "Attendu", alignerDroite: true, rendu: (s) => formaterNombre(s.resume.montant_attendu), exportRendu: (s) => Number(s.resume.montant_attendu) },
          { cle: "montant_fermeture", titre: "Compte", alignerDroite: true, rendu: (s) => (s.montant_fermeture == null ? "-" : formaterNombre(s.montant_fermeture)), exportRendu: (s) => (s.montant_fermeture == null ? "" : Number(s.montant_fermeture)) },
          {
            cle: "ecart", titre: "Ecart", alignerDroite: true,
            rendu: (s) => s.ecart == null ? "-" : (
              <span className={Number(s.ecart) === 0 ? "text-accent-vert" : "font-semibold text-accent-rouge"}>
                {Number(s.ecart) > 0 ? "+" : ""}{formaterNombre(s.ecart)}
              </span>
            ),
            exportRendu: (s) => (s.ecart == null ? "" : Number(s.ecart)),
          },
          { cle: "statut", titre: "Etat", rendu: (s) => <Badge statut={s.statut} />, exportRendu: (s) => libelleStatut(s.statut) },
        ]}
        lignes={resultats}
        chargement={chargement}
        cleLigne={(s) => s.id}
        page={page}
        nombrePages={nombrePages}
        onChangerPage={setPage}
        videMessage="Aucune session de caisse."
        actions={(s) => (
          <button onClick={() => setDetail(s)} className="rounded border border-bordure px-2 py-0.5 text-xs hover:bg-fond">Detail</button>
        )}
      />

      <DetailSession
        session={detail}
        onFermer={() => setDetail(null)}
        onCloturee={(s) => { setDetail(s); recharger(); }}
      />
    </div>
  );
}

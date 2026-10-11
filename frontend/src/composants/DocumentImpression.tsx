import { Printer } from "lucide-react";
import type { ReactNode } from "react";
import { useEntreprise } from "../hooks/useEntreprise";
import { Modale } from "./Modale";

export interface ColonneDocument {
  titre: string;
  alignement?: "gauche" | "centre" | "droite";
  gras?: boolean;
}

export interface InfoDocument {
  libelle: string;
  valeur: ReactNode;
}

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  titreModale: string;
  /** Titre affiche dans le document (ex. BON DE LIVRAISON). Absent pour un recu de caisse. */
  titreDocument?: string;
  infosGauche: InfoDocument[];
  infosDroite: InfoDocument[];
  banniere?: string;
  colonnes: ColonneDocument[];
  lignes: ReactNode[][];
  libelleTotal?: string;
  total?: string;
  details?: InfoDocument[];
  signatures?: string[];
  messagePied?: string;
  /** Recu de caisse : moitie haute d'une feuille A4. Sinon, page A4 complete. */
  demiPage?: boolean;
}

const CLASSE_ALIGNEMENT = { gauche: "gauche", centre: "centre", droite: "droite" } as const;

/** Modele d'impression commun a tous les documents (recus, devis, bons de
 * livraison, factures) : cadre arrondi noir et blanc, en-tete de l'entreprise,
 * grille d'informations, tableau, encadre du total. */
export function DocumentImpression({
  ouvert, onFermer, titreModale, titreDocument, infosGauche, infosDroite, banniere,
  colonnes, lignes, libelleTotal = "TOTAL", total, details = [], signatures = [], messagePied,
  demiPage = false,
}: Props) {
  const entreprise = useEntreprise();
  const message = messagePied ?? entreprise.message;

  return (
    <Modale titre={titreModale} ouverte={ouvert} onFermer={onFermer} largeur="max-w-3xl">
      <div className="sans-impression mb-3 flex justify-end gap-2">
        <button className="rounded border border-bordure px-3 py-1.5 text-sm hover:bg-fond" onClick={onFermer}>Fermer</button>
        <button className="flex items-center gap-1.5 rounded bg-entete px-3 py-1.5 text-sm font-medium text-white hover:bg-entete-fonce" onClick={() => window.print()}>
          <Printer size={16} /> Imprimer
        </button>
      </div>

      <div className="zone-impression w-full bg-white text-black">
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            ${demiPage ? "html, body { height: 100% !important; max-height: 100% !important; overflow: hidden !important; }" : ""}
          }
        `}</style>
        <div className={`recu-conteneur ${demiPage ? "" : "recu-pleine"}`}>
          <div className="recu-cadre">
            <div className="recu-entete">
              <div className="recu-entete-gauche">
                {entreprise.logo && entreprise.afficherLogo ? (
                  <img src={entreprise.logo} alt="" className="recu-logo" />
                ) : (
                <div className="recu-icone-entreprise">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
                  </svg>
                </div>
                )}
                <h1 className="recu-entreprise-nom">{entreprise.nom}</h1>
              </div>
              <div className="recu-entete-droite">
                {entreprise.adresse && (
                  <div className="recu-entete-ligne">
                    <span className="recu-entete-label">Adresse :</span>
                    <span className="recu-entete-valeur">{entreprise.adresse}</span>
                  </div>
                )}
                {entreprise.telephones.map((tel, i) => (
                  <div key={i} className="recu-entete-ligne">
                    <span className="recu-entete-label">{entreprise.telephones.length === 1 ? "Tel :" : `Tel ${i + 1} :`}</span>
                    <span className="recu-entete-valeur">{tel}</span>
                  </div>
                ))}
                {entreprise.email && (
                  <div className="recu-entete-ligne">
                    <span className="recu-entete-label">Email :</span>
                    <span className="recu-entete-valeur">{entreprise.email}</span>
                  </div>
                )}
                {entreprise.nif && (
                  <div className="recu-entete-ligne">
                    <span className="recu-entete-label">NIF :</span>
                    <span className="recu-entete-valeur">{entreprise.nif}</span>
                  </div>
                )}
              </div>
            </div>

            {titreDocument && <div className="recu-titre-document">{titreDocument}</div>}

            <div className="recu-info-grille">
              {[infosGauche, infosDroite].map((infos, c) => (
                <div key={c} className="recu-info-col">
                  {infos.map((info) => (
                    <div key={info.libelle} className="recu-info-ligne">
                      <span className="recu-info-label">{info.libelle} :</span>
                      <span className="recu-info-valeur">{info.valeur}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {banniere && <div className="recu-annulee">★★★ {banniere} ★★★</div>}

            <table className="recu-table">
              <thead>
                <tr>
                  {colonnes.map((c) => (
                    <th key={c.titre} className={`recu-th recu-th-${CLASSE_ALIGNEMENT[c.alignement ?? "gauche"]}`}>{c.titre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, i) => (
                  <tr key={i} className={i % 2 === 1 ? "recu-tr-alt" : ""}>
                    {ligne.map((cellule, j) => (
                      <td key={j} className={`recu-td recu-td-${CLASSE_ALIGNEMENT[colonnes[j]?.alignement ?? "gauche"]} ${colonnes[j]?.gras ? "recu-td-gras" : ""}`}>
                        {cellule}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {total != null && (
              <div className="recu-total-ligne">
                <span className="recu-total-label">{libelleTotal}</span>
                <span className="recu-total-montant">{total} {entreprise.devise}</span>
              </div>
            )}

            {details.length > 0 && (
              <div className="recu-paiement-section">
                {details.map((d) => (
                  <div key={d.libelle} className="recu-paiement-ligne">
                    <span className="recu-paiement-mode">{d.libelle} :</span>
                    <span className="recu-paiement-montant">{d.valeur} {entreprise.devise}</span>
                  </div>
                ))}
              </div>
            )}

            {signatures.length > 0 && (
              <div className="recu-signatures">
                {signatures.map((s) => <div key={s} className="recu-signature">{s}</div>)}
              </div>
            )}

            {message && (
              <div className="recu-pied-message">
                <p className="recu-message">{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modale>
  );
}

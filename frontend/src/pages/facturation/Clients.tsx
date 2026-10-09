import { PageCrud } from "../../composants/PageCrud";
import { useAuth } from "../../hooks/useAuth";
import type { Client } from "../../types";

export function PageClients() {
  const { autorise } = useAuth();
  const gerer = autorise("clients.gerer");

  return (
    <PageCrud<Client>
      titre="Clients"
      url="/facturation/clients/"
      cleLigne={(c) => c.id}
      peutCreer={gerer}
      peutModifier={gerer}
      peutSupprimer={gerer}
      valeursParDefaut={{ etat: true }}
      colonnes={[
        { cle: "num_client", titre: "N° client" },
        { cle: "nom", titre: "Nom" },
        { cle: "prenom", titre: "Prenom" },
        {
          cle: "etat", titre: "Statut",
          rendu: (c) => <span className={c.etat ? "text-accent-vert" : "text-accent-rouge"}>{c.etat ? "Actif" : "Desactive"}</span>,
        },
      ]}
      champs={[
        { nom: "nom", label: "Nom", requis: true },
        { nom: "prenom", label: "Prenom" },
        { nom: "num_client", label: "N° client" },
        { nom: "etat", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}

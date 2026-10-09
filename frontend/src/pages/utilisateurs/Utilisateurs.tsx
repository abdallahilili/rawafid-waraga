import { PageCrud } from "../../composants/PageCrud";
import { useAuth } from "../../hooks/useAuth";
import type { Utilisateur } from "../../types";

export function PageUtilisateurs() {
  const { autorise } = useAuth();
  return (
    <PageCrud<Utilisateur>
      titre="Utilisateurs"
      url="/utilisateurs/"
      cleLigne={(u) => u.id}
      peutCreer={autorise("utilisateurs.gerer")}
      peutModifier={autorise("utilisateurs.gerer")}
      peutSupprimer={autorise("utilisateurs.gerer")}
      valeursParDefaut={{ actif: true }}
      colonnes={[
        { cle: "identifiant", titre: "Identifiant" },
        { cle: "nom", titre: "Nom" },
        { cle: "prenom", titre: "Prenom" },
        { cle: "groupe_nom", titre: "Groupe" },
        { cle: "fonction_nom", titre: "Fonction" },
        { cle: "depot_nom", titre: "Depot" },
        {
          cle: "actif", titre: "Statut",
          rendu: (u) => (
            <span className={u.actif ? "text-accent-vert" : "text-accent-rouge"}>
              {u.actif ? "Actif" : "Inactif"}
            </span>
          ),
        },
      ]}
      champs={[
        { nom: "identifiant", label: "Identifiant", requis: true },
        { nom: "mot_de_passe", label: "Mot de passe" },
        { nom: "nom", label: "Nom", requis: true },
        { nom: "prenom", label: "Prenom" },
        { nom: "telephone", label: "Telephone" },
        { nom: "groupe", label: "Groupe", type: "select", requis: true, optionsUrl: "/utilisateurs/groupes/" },
        { nom: "fonction", label: "Fonction", type: "select", optionsUrl: "/utilisateurs/fonctions/" },
        { nom: "depot", label: "Depot", type: "select", optionsUrl: "/depots/" },
        { nom: "actif", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}

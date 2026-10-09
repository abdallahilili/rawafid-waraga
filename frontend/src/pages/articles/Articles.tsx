import { PageCrud } from "../../composants/PageCrud";
import { useAuth } from "../../hooks/useAuth";
import type { Article } from "../../types";

export function PageArticles() {
  const { autorise } = useAuth();

  return (
    <PageCrud<Article>
      titre="Articles"
      url="/articles/"
      cleLigne={(a) => a.id}
      peutCreer={autorise("articles.gerer")}
      peutModifier={autorise("articles.gerer")}
      peutSupprimer={autorise("articles.supprimer")}
      valeursParDefaut={{ unite: "unite", seuil_alerte: 5, actif: true }}
      colonnes={[
        { cle: "nom", titre: "Nom" },
        { cle: "reference", titre: "Reference" },
        { cle: "categorie_nom", titre: "Categorie" },
        { cle: "unite", titre: "Unite" },
        { cle: "prix_vente", titre: "Prix vente", alignerDroite: true, rendu: (a) => `${a.prix_vente} MRU` },
        { cle: "stock_total", titre: "Stock", alignerDroite: true },
        {
          cle: "actif", titre: "Statut",
          rendu: (a) => (
            <span className={a.actif ? "text-accent-vert" : "text-accent-rouge"}>
              {a.actif ? "Actif" : "Inactif"}
            </span>
          ),
        },
      ]}
      champs={[
        { nom: "nom", label: "Nom", requis: true, colonnePleine: true },
        { nom: "reference", label: "Reference", requis: true },
        { nom: "code_barre", label: "Code-barres" },
        { nom: "categorie", label: "Categorie", type: "select", optionsUrl: "/articles/categories/" },
        { nom: "unite", label: "Unite" },
        { nom: "prix_achat", label: "Prix d'achat", type: "decimal", requis: true },
        { nom: "prix_vente", label: "Prix de vente", type: "decimal", requis: true },
        { nom: "seuil_alerte", label: "Seuil d'alerte", type: "nombre" },
        { nom: "actif", label: "Actif", type: "checkbox" },
      ]}
    />
  );
}

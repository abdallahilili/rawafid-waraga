import { useEntreprise } from "../hooks/useEntreprise";
import { useEffect, useState } from "react";
import { Truck, Clock, PackageCheck, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";
import { api } from "../services/api";
import type { TableauDeBord } from "../types";
import { CarteKpi } from "../composants/CarteKpi";
import { CarteGraphiqueBarres, CarteGraphiqueLigne } from "../composants/Graphiques";

export function PageTableauDeBord() {
  const { devise } = useEntreprise();
  const formaterMontant = (valeur: string) => `${Number(valeur).toLocaleString("fr-FR")} ${devise}`;
  const [donnees, setDonnees] = useState<TableauDeBord | null>(null);

  useEffect(() => {
    api.get("/rapports/tableau-de-bord/").then((r) => setDonnees(r.data));
  }, []);

  if (!donnees) {
    return <p className="text-sm text-texte-attenue">Chargement du tableau de bord...</p>;
  }

  const { cartes, graphiques } = donnees;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-texte">Tableau de bord</h1>

      <h2 className="mb-2 text-sm font-semibold text-texte-attenue">Impression</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <CarteKpi valeur={cartes.commandes_a_livrer} libelle="Commandes a livrer" icone={<Truck size={22} />} accent="vert" />
        <CarteKpi valeur={cartes.commandes_en_retard} libelle="Commandes en retard" icone={<Clock size={22} />} accent={cartes.commandes_en_retard > 0 ? "rouge" : "vert"} />
        <CarteKpi valeur={cartes.commandes_terminees_non_livrees} libelle="Terminees, a remettre" icone={<PackageCheck size={22} />} accent="vert" />
        <CarteKpi valeur={`${cartes.taux_livraison_a_temps}%`} libelle="Livraisons a temps" icone={<PackageCheck size={22} />} accent="vert" />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-texte-attenue">Achats &amp; stock</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <CarteKpi valeur={cartes.achats_en_attente} libelle="Achats en attente" icone={<ShoppingCart size={22} />} accent="vert" />
        <CarteKpi valeur={cartes.articles_en_rupture} libelle="Articles en rupture" icone={<AlertTriangle size={22} />} accent={cartes.articles_en_rupture > 0 ? "rouge" : "vert"} />
        <CarteKpi valeur={formaterMontant(cartes.chiffre_affaires_mois)} libelle="Chiffre d'affaires du mois" icone={<DollarSign size={22} />} accent="vert" />
        <CarteKpi valeur={cartes.nombre_ventes_mois} libelle="Ventes ce mois-ci" icone={<ShoppingCart size={22} />} accent="vert" />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-texte-attenue">Planification</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CarteGraphiqueBarres titre="Taux de livraison a temps (%)" categories={graphiques.mois} valeurs={graphiques.taux_livraison_par_mois} suffixe="%" />
        <CarteGraphiqueLigne titre={`Ventes par mois (${devise})`} categories={graphiques.mois} valeurs={graphiques.ventes_par_mois} />
        <CarteGraphiqueLigne titre={`Achats par mois (${devise})`} categories={graphiques.mois} valeurs={graphiques.achats_par_mois} />
      </div>
    </div>
  );
}

const COULEURS: Record<string, string> = {
  BROUILLON: "bg-gray-100 text-gray-700",
  VALIDE: "bg-green-50 text-accent-vert",
  ANNULE: "bg-red-50 text-accent-rouge",
  ANNULEE: "bg-red-50 text-accent-rouge",
  EN_ATTENTE: "bg-amber-50 text-amber-700",
  EN_COURS: "bg-blue-50 text-accent-bleu",
  TERMINEE: "bg-indigo-50 text-indigo-700",
  LIVREE: "bg-green-50 text-accent-vert",
  OUVERTE: "bg-green-50 text-accent-vert",
  FERMEE: "bg-gray-100 text-gray-700",
};

const LIBELLES: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Valide",
  ANNULE: "Annule",
  ANNULEE: "Annulee",
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  TERMINEE: "Terminee",
  LIVREE: "Livree",
  OUVERTE: "Ouverte",
  FERMEE: "Fermee",
};

export function Badge({ statut }: { statut: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COULEURS[statut] ?? "bg-gray-100 text-gray-700"}`}>
      {LIBELLES[statut] ?? statut}
    </span>
  );
}

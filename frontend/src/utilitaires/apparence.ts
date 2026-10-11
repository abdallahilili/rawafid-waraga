/** Apparence de l'interface (theme, police, taille, couleur principale).
 * Reglages propres a chaque poste : conserves dans le navigateur. */

export type Theme = "clair" | "sombre" | "auto";
export type TaillePolice = "petite" | "normale" | "grande" | "tres_grande";

export interface Apparence {
  theme: Theme;
  police: string;
  taille: TaillePolice;
  couleur: string;
}

export const TAILLES: Record<TaillePolice, { libelle: string; px: number }> = {
  petite: { libelle: "Petite", px: 14 },
  normale: { libelle: "Normale", px: 16 },
  grande: { libelle: "Grande", px: 18 },
  tres_grande: { libelle: "Tres grande", px: 20 },
};

export const POLICES: { libelle: string; valeur: string }[] = [
  { libelle: "Inter (par defaut)", valeur: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif' },
  { libelle: "Segoe UI", valeur: '"Segoe UI", system-ui, sans-serif' },
  { libelle: "Arial", valeur: "Arial, Helvetica, sans-serif" },
  { libelle: "Verdana", valeur: "Verdana, Geneva, sans-serif" },
  { libelle: "Tahoma", valeur: "Tahoma, Geneva, sans-serif" },
  { libelle: "Georgia (serif)", valeur: "Georgia, 'Times New Roman', serif" },
  { libelle: "Consolas (mono)", valeur: "Consolas, 'Courier New', monospace" },
];

/** Couleurs principales : canaux RGB de la barre superieure / boutons. */
export const COULEURS: { libelle: string; rgb: string; fonce: string }[] = [
  { libelle: "Bleu", rgb: "20 100 180", fonce: "15 79 145" },
  { libelle: "Vert", rgb: "22 130 90", fonce: "16 100 69" },
  { libelle: "Violet", rgb: "109 74 180", fonce: "86 56 148" },
  { libelle: "Rouge", rgb: "190 52 52", fonce: "150 38 38" },
  { libelle: "Orange", rgb: "205 110 20", fonce: "165 85 12" },
  { libelle: "Ardoise", rgb: "55 71 99", fonce: "40 53 76" },
];

export const APPARENCE_PAR_DEFAUT: Apparence = {
  theme: "clair", police: POLICES[0].valeur, taille: "normale", couleur: COULEURS[0].rgb,
};

const CLE = "apparence";

export function lireApparence(): Apparence {
  try {
    const brut = localStorage.getItem(CLE);
    return brut ? { ...APPARENCE_PAR_DEFAUT, ...JSON.parse(brut) } : APPARENCE_PAR_DEFAUT;
  } catch {
    return APPARENCE_PAR_DEFAUT;
  }
}

export function appliquerApparence(a: Apparence) {
  const racine = document.documentElement;
  const sombre = a.theme === "sombre"
    || (a.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  racine.dataset.theme = sombre ? "sombre" : "clair";
  racine.style.setProperty("--police", a.police);
  racine.style.setProperty("--taille-police", `${TAILLES[a.taille]?.px ?? 16}px`);
  const couleur = COULEURS.find((c) => c.rgb === a.couleur) ?? COULEURS[0];
  racine.style.setProperty("--c-entete", couleur.rgb);
  racine.style.setProperty("--c-entete-fonce", couleur.fonce);
}

export function enregistrerApparence(a: Apparence) {
  try { localStorage.setItem(CLE, JSON.stringify(a)); } catch { /* stockage indisponible */ }
  appliquerApparence(a);
}

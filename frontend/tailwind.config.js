/** Jetons de design inspires du tableau de bord Acumatica (image de reference) :
 * barre superieure bleue pleine, sidebar a icones gris clair, cartes KPI
 * blanches a bandeau colore en haut, graphiques en cartes blanches. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        entete: {
          DEFAULT: "rgb(var(--c-entete) / <alpha-value>)",
          fonce: "rgb(var(--c-entete-fonce) / <alpha-value>)",
        },
        fond: {
          DEFAULT: "rgb(var(--c-fond) / <alpha-value>)",
          carte: "rgb(var(--c-carte) / <alpha-value>)",
          barre: "rgb(var(--c-barre) / <alpha-value>)",
        },
        accent: {
          vert: "#3fae56",
          rouge: "#d64545",
          bleu: "#4a90d9",
          orange: "#f2994a",
        },
        texte: {
          DEFAULT: "rgb(var(--c-texte) / <alpha-value>)",
          attenue: "rgb(var(--c-texte-attenue) / <alpha-value>)",
        },
        bordure: "rgb(var(--c-bordure) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--police)"],
      },
      boxShadow: {
        carte: "0 1px 2px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};

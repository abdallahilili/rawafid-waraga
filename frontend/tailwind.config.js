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
          DEFAULT: "#1464b4",
          fonce: "#0f4f91",
        },
        fond: {
          DEFAULT: "#f4f5f7",
          carte: "#ffffff",
          barre: "#eef0f3",
        },
        accent: {
          vert: "#3fae56",
          rouge: "#d64545",
          bleu: "#4a90d9",
          orange: "#f2994a",
        },
        texte: {
          DEFAULT: "#2b2f36",
          attenue: "#6b7280",
        },
        bordure: "#e2e5ea",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        carte: "0 1px 2px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};

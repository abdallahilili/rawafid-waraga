interface Props {
  titre: string;
  categories: string[];
  valeurs: number[];
  suffixe?: string;
}

const LARGEUR = 520;
const HAUTEUR = 220;
const MARGE = { haut: 10, bas: 28, gauche: 36, droite: 10 };

function echelle(valeurs: number[]) {
  const max = Math.max(1, ...valeurs);
  return { max: max * 1.15 };
}

/** Graphique en barres bleu, dans le style "On Time Shipping Ratio" de
 * l'image de reference Acumatica. */
export function CarteGraphiqueBarres({ titre, categories, valeurs, suffixe = "" }: Props) {
  const { max } = echelle(valeurs);
  const largeurUtile = LARGEUR - MARGE.gauche - MARGE.droite;
  const hauteurUtile = HAUTEUR - MARGE.haut - MARGE.bas;
  const largeurBarre = (largeurUtile / valeurs.length) * 0.55;

  return (
    <div className="rounded-md border border-bordure bg-fond-carte p-4 shadow-carte">
      <h3 className="mb-2 text-sm font-semibold text-texte">{titre}</h3>
      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="w-full" role="img" aria-label={titre}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = MARGE.haut + hauteurUtile * (1 - f);
          return (
            <g key={f}>
              <line x1={MARGE.gauche} x2={LARGEUR - MARGE.droite} y1={y} y2={y} stroke="#e2e5ea" strokeWidth={1} />
              <text x={MARGE.gauche - 6} y={y + 3} fontSize={9} fill="#6b7280" textAnchor="end">
                {(max * f).toFixed(suffixe ? 0 : 1)}
                {suffixe}
              </text>
            </g>
          );
        })}
        {valeurs.map((v, i) => {
          const x = MARGE.gauche + (largeurUtile / valeurs.length) * i + (largeurUtile / valeurs.length - largeurBarre) / 2;
          const h = (v / max) * hauteurUtile;
          const y = MARGE.haut + hauteurUtile - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={largeurBarre} height={h} fill="#4a90d9" rx={1} />
              <text
                x={x + largeurBarre / 2}
                y={HAUTEUR - MARGE.bas + 12}
                fontSize={8}
                fill="#6b7280"
                textAnchor="middle"
                transform={`rotate(-35 ${x + largeurBarre / 2} ${HAUTEUR - MARGE.bas + 12})`}
              >
                {categories[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Graphique en ligne orange avec marqueurs, dans le style "Avg Shipments
 * per Day" / "Avg Receipts per Day" de l'image de reference. */
export function CarteGraphiqueLigne({ titre, categories, valeurs, suffixe = "" }: Props) {
  const { max } = echelle(valeurs);
  const min = Math.min(0, ...valeurs);
  const largeurUtile = LARGEUR - MARGE.gauche - MARGE.droite;
  const hauteurUtile = HAUTEUR - MARGE.haut - MARGE.bas;

  const points = valeurs.map((v, i) => {
    const x = MARGE.gauche + (largeurUtile / (valeurs.length - 1 || 1)) * i;
    const y = MARGE.haut + hauteurUtile - ((v - min) / (max - min || 1)) * hauteurUtile;
    return { x, y };
  });
  const chemin = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="rounded-md border border-bordure bg-fond-carte p-4 shadow-carte">
      <h3 className="mb-2 text-sm font-semibold text-texte">{titre}</h3>
      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} className="w-full" role="img" aria-label={titre}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = MARGE.haut + hauteurUtile * (1 - f);
          return (
            <g key={f}>
              <line x1={MARGE.gauche} x2={LARGEUR - MARGE.droite} y1={y} y2={y} stroke="#e2e5ea" strokeWidth={1} />
              <text x={MARGE.gauche - 6} y={y + 3} fontSize={9} fill="#6b7280" textAnchor="end">
                {(min + (max - min) * f).toFixed(suffixe ? 0 : 1)}
                {suffixe}
              </text>
            </g>
          );
        })}
        <path d={chemin} fill="none" stroke="#f2994a" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f2994a" />
        ))}
        {categories.map((c, i) => (
          <text
            key={i}
            x={points[i].x}
            y={HAUTEUR - MARGE.bas + 12}
            fontSize={8}
            fill="#6b7280"
            textAnchor="middle"
            transform={`rotate(-35 ${points[i].x} ${HAUTEUR - MARGE.bas + 12})`}
          >
            {c}
          </text>
        ))}
      </svg>
    </div>
  );
}

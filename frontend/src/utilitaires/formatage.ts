const formatNombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const formaterNombre = (n: number | string | null | undefined) =>
  n == null || n === "" ? "-" : formatNombre.format(Number(n));

export function formaterDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formaterDateHeure(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/** Format aaaa/mm/jj hh:mm, utilise dans les exports pour rester trie correctement. */
export function formaterDateHeureExport(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${deuxChiffres(d.getMonth() + 1)}/${deuxChiffres(d.getDate())} ${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`;
}

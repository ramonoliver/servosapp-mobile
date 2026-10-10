// Onde o seletor de data/hora abre. Valores no formato do calendário da
// igreja: "YYYY-MM-DD" e "HH:MM".

export function pickerStart(
  value: string | null,
  mode: "date" | "time",
  opts: { emptyStart?: string; minimumDate?: string; maximumDate?: string; today: string },
): string {
  if (value) return value;
  if (mode === "time") return opts.emptyStart || "18:00";
  return opts.emptyStart || opts.minimumDate || opts.maximumDate || opts.today;
}

/** Data de nascimento vazia: o seletor abre 30 anos antes de hoje, em 1º de janeiro. */
export function birthDateStart(today: string): string {
  return `${Number(today.slice(0, 4)) - 30}-01-01`;
}

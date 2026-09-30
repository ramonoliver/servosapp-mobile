// Novo evento pelo app — validação e o formato que a rota do web espera
// (`events/manage`, recorrência canônica `weekly:D` / `once:AAAA-MM-DD`). Puro.

export type EventKind = "weekly" | "once";

/** 0 = domingo … 6 = sábado (mesma regra do servidor). */
export const WEEKDAYS = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
];

export interface EventInput {
  name: string;
  type: "recurring" | "special";
  icon: string;
  location: string;
  base_time: string;
  recurrence: string;
}

export function buildEventInput(form: {
  name: string;
  kind: EventKind;
  weekday: number;
  date: string | null;
  time: string | null;
  location: string;
  today: string;
}): { ok: true; data: EventInput } | { ok: false; error: string } {
  const name = form.name.trim();
  if (name.length < 3) return { ok: false, error: "Dê um nome para o evento." };
  if (!form.time) return { ok: false, error: "Escolha o horário." };
  let recurrence: string;
  if (form.kind === "weekly") {
    if (!Number.isInteger(form.weekday) || form.weekday < 0 || form.weekday > 6) return { ok: false, error: "Escolha o dia da semana." };
    recurrence = `weekly:${form.weekday}`;
  } else {
    if (!form.date) return { ok: false, error: "Escolha a data." };
    if (form.date < form.today) return { ok: false, error: "A data já passou." };
    recurrence = `once:${form.date}`;
  }
  return {
    ok: true,
    data: {
      name,
      type: form.kind === "weekly" ? "recurring" : "special",
      icon: "CalendarBlank",
      location: form.location.trim(),
      base_time: form.time,
      recurrence,
    },
  };
}

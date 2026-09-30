// Datas e agrupamentos de escala em pt-BR. Datas chegam como dia de
// calendário da igreja ("YYYY-MM-DD") — tudo aqui opera sobre a data pura,
// sem fuso, para "domingo" nunca virar "sábado" num aparelho em outro fuso.

import type { AssignmentCard } from "@/api/contracts";

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

interface Parts { y: number; m: number; d: number; weekday: number }

export function parseDay(iso: string): Parts {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function toIso(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseDay(iso);
  return toIso(y, m, d + days);
}

/** Hoje no relógio da igreja (America/Sao_Paulo), independente do fuso do aparelho. */
export function churchToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Domingo, 27 de setembro" */
export function formatLongDate(iso: string): string {
  const { m, d, weekday } = parseDay(iso);
  return `${cap(WEEKDAYS[weekday])}, ${d} de ${MONTHS[m - 1]}`;
}

/** "Dom, 27 set" */
export function formatShortDate(iso: string): string {
  const { m, d, weekday } = parseDay(iso);
  return `${WEEKDAYS_SHORT[weekday]}, ${d} ${MONTHS_SHORT[m - 1]}`;
}

/** Para o "calendário" do card: { weekday: "DOM", day: "27", month: "SET" } */
export function dateTile(iso: string) {
  const { m, d, weekday } = parseDay(iso);
  return { weekday: WEEKDAYS_SHORT[weekday].toUpperCase(), day: String(d), month: MONTHS_SHORT[m - 1].toUpperCase() };
}

/** "18:00" → "18h" · "18:30" → "18h30" · "" → "" */
export function formatTime(hhmm: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ""));
  if (!match) return "";
  const h = Number(match[1]);
  return match[2] === "00" ? `${h}h` : `${h}h${match[2]}`;
}

/** "Hoje" / "Amanhã" / null */
export function relativeDay(iso: string, today: string): string | null {
  if (iso === today) return "Hoje";
  if (iso === addDays(today, 1)) return "Amanhã";
  return null;
}

/** "Domingo · 18h" ou "Hoje · 18h" */
export function dayAndTime(iso: string, time: string, today: string): string {
  const rel = relativeDay(iso, today);
  const day = rel ?? cap(WEEKDAYS[parseDay(iso).weekday]).split("-")[0];
  return [day, formatTime(time)].filter(Boolean).join(" · ");
}

/** "Hoje" · "Amanhã" · "Dom, 11 out" — sem ambiguidade entre semanas. */
export function dayLabel(iso: string, today: string): string {
  return relativeDay(iso, today) ?? formatShortDate(iso);
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export interface CardGroup {
  key: string;
  title: string;
  items: AssignmentCard[];
}

/**
 * Próximas (§19): HOJE · ESTA SEMANA · PRÓXIMA SEMANA · <MÊS> (com ano se
 * não for o ano corrente). Semana começa no domingo, como no calendário
 * brasileiro. Mantém a ordem recebida (o servidor já ordena).
 */
export function groupUpcoming(items: readonly AssignmentCard[], today: string): CardGroup[] {
  const { weekday, y: thisYear } = parseDay(today);
  const endOfWeek = addDays(today, 6 - weekday);
  const endOfNextWeek = addDays(endOfWeek, 7);
  const groups: CardGroup[] = [];
  const push = (key: string, title: string, card: AssignmentCard) => {
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, title, items: [] };
      groups.push(g);
    }
    g.items.push(card);
  };
  for (const card of items) {
    if (card.date <= today) push("today", "Hoje", card);
    else if (card.date <= endOfWeek) push("week", "Esta semana", card);
    else if (card.date <= endOfNextWeek) push("next-week", "Próxima semana", card);
    else {
      const { y, m } = parseDay(card.date);
      push(`${y}-${m}`, y === thisYear ? cap(MONTHS[m - 1]) : `${cap(MONTHS[m - 1])} de ${y}`, card);
    }
  }
  return groups;
}

/** Passadas: por mês, mais recente primeiro (ordem recebida). */
export function groupPast(items: readonly AssignmentCard[], today: string): CardGroup[] {
  const { y: thisYear } = parseDay(today);
  const groups: CardGroup[] = [];
  for (const card of items) {
    const { y, m } = parseDay(card.date);
    const key = `${y}-${m}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, title: y === thisYear ? cap(MONTHS[m - 1]) : `${cap(MONTHS[m - 1])} de ${y}`, items: [] };
      groups.push(g);
    }
    g.items.push(card);
  }
  return groups;
}

// ── Calendário (P2) ─────────────────────────────────────────────────────────

/** "2026-10-04" → "2026-10" */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** "2026-10" + 1 → "2026-11" (atravessa o ano). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** "2026-10" → "Outubro de 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${cap(MONTHS[m - 1])} de ${y}`;
}

export const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Semanas do mês (domingo a sábado), com os dias de fora como null — o
 * calendário não mostra dia de outro mês para não confundir com escala real.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const lead = parseDay(first).weekday;
  const days: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let iso = first; monthOf(iso) === month; iso = addDays(iso, 1)) days.push(iso);
  while (days.length % 7 !== 0) days.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** Para leitores de tela: "Domingo, 4 de outubro, 2 escalas" */
export function dayA11yLabel(iso: string, count: number): string {
  return `${formatLongDate(iso)}${count ? `, ${count === 1 ? "1 escala" : `${count} escalas`}` : ""}`;
}

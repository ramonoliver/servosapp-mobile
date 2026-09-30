// Textos e filtros das ferramentas de liderança (P1). Puro.

import type { Candidate, CandidateFlag, MinistryMemberView, Unavailability } from "@/api/contracts";
import { dateTile, formatLongDate, formatShortDate, formatTime, parseDay } from "@/features/schedules/format";

/** "Ainda não serviu aqui" · "Última escala: esta semana" · "…: há 3 semanas" · "…: há 2 meses". */
export function lastServedLabel(days: number | null): string {
  if (days === null) return "Ainda não serviu aqui";
  if (days < 7) return "Última escala: esta semana";
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `Última escala: há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  const months = Math.round(days / 30);
  return `Última escala: há ${months} ${months === 1 ? "mês" : "meses"}`;
}

export type FlagTone = "success" | "warning" | "neutral";

export function flagLine(flag: CandidateFlag, functionName: string): { text: string; tone: FlagTone } {
  if (flag.kind === "unavailable") {
    return { text: flag.reason ? `Indisponível neste dia · ${flag.reason}` : "Indisponível neste dia", tone: "warning" };
  }
  if (flag.kind === "conflict") {
    return { text: `Conflito de horário · ${flag.ministryName} · ${flag.eventName}`, tone: "warning" };
  }
  return { text: functionName ? `Não tem a função ${functionName}` : "Sem função definida", tone: "neutral" };
}

/** Linhas que descrevem o candidato (§23: "✓ Disponível" / "⚠ Conflito de horário"). */
export function candidateLines(c: Candidate, functionName: string): { text: string; tone: FlagTone }[] {
  if (c.flags.length === 0) return [{ text: `Disponível · ${lastServedLabel(c.lastServedDaysAgo)}`, tone: "success" }];
  return c.flags.map((f) => flagLine(f, functionName));
}

/** Confirmação consciente antes de escalar com aviso (§25/§26). null = não precisa. */
export function overrideDialog(name: string, flags: readonly CandidateFlag[]): { title: string; message: string } | null {
  const first = name.split(" ")[0];
  const conflict = flags.find((f) => f.kind === "conflict");
  const unavailable = flags.find((f) => f.kind === "unavailable");
  if (!conflict && !unavailable) return null;
  if (conflict && conflict.kind === "conflict") {
    return {
      title: "Conflito de horário",
      message: `${first} já está escalado em ${conflict.ministryName} neste período (${conflict.eventName}${
        conflict.time ? `, ${formatTime(conflict.time)}` : ""
      }). Escalar mesmo assim?`,
    };
  }
  const reason = unavailable && unavailable.kind === "unavailable" && unavailable.reason ? ` (${unavailable.reason})` : "";
  return { title: "Indisponível neste dia", message: `${first} avisou que não pode servir nesta data${reason}. Escalar mesmo assim?` };
}

/** Rótulo de uma indisponibilidade: tile + período + detalhe. */
export function unavailabilityLabel(u: Unavailability) {
  const tile = dateTile(u.date);
  let period: string;
  if (u.endDate) {
    const a = parseDay(u.date);
    const b = parseDay(u.endDate);
    period = a.m === b.m ? `${a.d} a ${formatShortDate(u.endDate).split(", ")[1]}` : `${formatShortDate(u.date).split(", ")[1]} a ${formatShortDate(u.endDate).split(", ")[1]}`;
  } else if (!u.allDay && u.startTime && u.endTime) {
    period = `${formatTime(u.startTime)} às ${formatTime(u.endTime)}`;
  } else {
    period = "Dia inteiro";
  }
  return { tile, period, reason: u.reason || (u.source === "decline" ? "Informado ao recusar uma escala" : "") };
}

export type TeamFilter = "all" | "leaders" | "members" | "inactive";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Equipe (§35): busca por nome ou função + filtros Todos/Líderes/Servos/Inativos. */
export function filterTeam(team: readonly MinistryMemberView[], filter: TeamFilter, query: string): MinistryMemberView[] {
  const q = fold(query.trim());
  return team.filter((m) => {
    if (filter === "leaders" && (m.role !== "LEADER" || !m.active)) return false;
    if (filter === "members" && (m.role !== "MEMBER" || !m.active)) return false;
    if (filter === "inactive" && m.active) return false;
    if (filter === "all" && !m.active) return false;
    return !q || fold(m.name).includes(q) || m.functions.some((f) => fold(f).includes(q));
  });
}

export interface CriticalChange {
  field: "date" | "time" | "arrival_time" | "location" | "function";
  from: string;
  to: string;
}

const CHANGE_LABEL: Record<CriticalChange["field"], string> = {
  date: "Data",
  time: "Horário",
  arrival_time: "Horário de chegada",
  location: "Local",
  function: "Função",
};

/** Mesmo texto que o servidor usa na notificação (critical-changes.ts). */
export function describeChange(c: CriticalChange): string {
  const fmt = (v: string) => (c.field === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().slice(0, 2).join("/") : v);
  if (!c.to) return `${CHANGE_LABEL[c.field]}: removido`;
  if (!c.from) return `${CHANGE_LABEL[c.field]}: ${fmt(c.to)}`;
  return `${CHANGE_LABEL[c.field]}: ${fmt(c.from)} → ${fmt(c.to)}`;
}

/** Diálogo do §27 antes de reabrir confirmações. */
export function criticalChangeDialog(confirmedCount: number, changes: readonly CriticalChange[]) {
  return {
    title: "Esta alteração afeta pessoas que já confirmaram presença.",
    message: `${confirmedCount === 1 ? "1 pessoa já confirmou" : `${confirmedCount} pessoas já confirmaram`} esta escala.\n\n${changes
      .map(describeChange)
      .join("\n")}\n\nElas vão receber o aviso do que mudou e precisarão confirmar de novo.`,
  };
}

// ── Histórico da escala (P2) ───────────────────────────────────────────────

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });

/** Dia (calendário da igreja) de um instante ISO. */
export function churchDayOf(isoInstant: string): string {
  return dayFmt.format(new Date(isoInstant));
}

/** "14:05" no horário da igreja. */
export function churchTimeOf(isoInstant: string): string {
  return timeFmt.format(new Date(isoInstant));
}

/** Agrupa (já em ordem, mais recente primeiro) por dia: "Hoje", "Ontem", "Terça-feira, 22 de setembro". */
export function groupHistory<T extends { at: string }>(items: readonly T[], today: string): { title: string; items: T[] }[] {
  const out: { day: string; title: string; items: T[] }[] = [];
  for (const it of items) {
    const day = churchDayOf(it.at);
    let g = out[out.length - 1];
    if (!g || g.day !== day) {
      const title = day === today ? "Hoje" : day === addDaysIso(today, -1) ? "Ontem" : formatLongDate(day);
      g = { day, title, items: [] };
      out.push(g);
    }
    g.items.push(it);
  }
  return out.map(({ title, items: list }) => ({ title, items: list }));
}

function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

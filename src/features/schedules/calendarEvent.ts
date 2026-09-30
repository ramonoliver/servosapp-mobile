// "Salvar na agenda": monta o evento do celular a partir da escala. Puro.
// Começa na CHEGADA (é quando a pessoa precisa estar lá); o início do culto
// vai nas notas. Horários no fuso da igreja (Brasília, sem horário de verão).

import { formatTime } from "./format";

const TZ_OFFSET = "-03:00";
const DEFAULT_DURATION_MIN = 120;

export interface CalendarEventInput {
  eventName: string;
  ministryName: string;
  functionName: string | null;
  date: string;
  time: string;
  endTime?: string | null;
  arrivalTime?: string | null;
  location?: string | null;
  instructions?: string | null;
}

export interface CalendarEventData {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes: string;
}

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00${TZ_OFFSET}`);

export function buildCalendarEvent(s: CalendarEventInput): CalendarEventData {
  const startHHMM = s.arrivalTime || s.time || "00:00";
  const startDate = at(s.date, startHHMM);
  let endDate = s.endTime ? at(s.date, s.endTime) : new Date(at(s.date, s.time || startHHMM).getTime() + DEFAULT_DURATION_MIN * 60_000);
  if (endDate <= startDate) endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MIN * 60_000);
  const lines = [
    s.functionName ? `Função: ${s.functionName}` : null,
    s.arrivalTime ? `Chegada: ${formatTime(s.arrivalTime)}` : null,
    s.time ? `Início: ${formatTime(s.time)}` : null,
    s.instructions?.trim() ? `\n${s.instructions.trim()}` : null,
    "\nEscala do Servos",
  ].filter(Boolean);
  return {
    title: `Servir: ${s.eventName} (${s.ministryName})`,
    startDate,
    endDate,
    location: s.location || undefined,
    notes: lines.join("\n"),
  };
}

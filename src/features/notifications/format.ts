import type { AppNotification } from "@/api/endpoints";
import { addDays, churchToday, formatShortDate } from "@/features/schedules/format";

const TZ = "America/Sao_Paulo";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

// `Intl.DateTimeFormat.format` lança RangeError com data inválida; numa tela
// isso derruba o app. Sem data válida, a notificação vai para "Anteriores".
function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type NotificationSection = { title: "Hoje" | "Ontem" | "Anteriores"; data: AppNotification[] };

/** Hoje / Ontem / Anteriores pelo dia da igreja; seções vazias ficam de fora. */
export function groupNotifications(items: AppNotification[], now: Date = new Date()): NotificationSection[] {
  const today = churchToday(now);
  const yesterday = addDays(today, -1);
  const groups: Record<NotificationSection["title"], AppNotification[]> = { Hoje: [], Ontem: [], Anteriores: [] };
  for (const n of items) {
    const d = parse(n.createdAt);
    const day = d ? dayFmt.format(d) : null;
    groups[day === today ? "Hoje" : day === yesterday ? "Ontem" : "Anteriores"].push(n);
  }
  return (Object.keys(groups) as NotificationSection["title"][])
    .filter((title) => groups[title].length > 0)
    .map((title) => ({ title, data: groups[title] }));
}

/** "10:05" se for de hoje, "Ter, 6 out" se for de outro dia, "" sem data. */
export function notificationWhen(iso: string | null | undefined, now: Date = new Date()): string {
  const d = parse(iso);
  if (!d) return "";
  const day = dayFmt.format(d);
  return day === churchToday(now) ? timeFmt.format(d) : formatShortDate(day);
}

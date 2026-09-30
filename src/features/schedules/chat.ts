import type { ChatMessage } from "@/api/contracts";

// Conversa da escala: agrupamento para a tela. Puro.

export interface ChatBubble extends ChatMessage {
  /** Mostra nome/foto só na 1ª mensagem de uma sequência da mesma pessoa. */
  showAuthor: boolean;
  /** Separador de dia antes desta mensagem ("Hoje", "Ontem", "Domingo, 4 de outubro"). */
  dayLabel: string | null;
}

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });

export const chatTime = (iso: string) => timeFmt.format(new Date(iso));

export function toBubbles(items: readonly ChatMessage[], labelForDay: (day: string) => string): ChatBubble[] {
  let prevDay = "";
  let prevAuthor = "";
  return items.map((m) => {
    const day = dayFmt.format(new Date(m.createdAt));
    const newDay = day !== prevDay;
    const bubble: ChatBubble = { ...m, dayLabel: newDay ? labelForDay(day) : null, showAuthor: !m.mine && (newDay || m.author.id !== prevAuthor) };
    prevDay = day;
    prevAuthor = m.author.id;
    return bubble;
  });
}

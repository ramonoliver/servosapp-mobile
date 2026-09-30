// Status sempre com ícone + texto + cor (briefing §16, §48): nunca só cor.

import type { AssignmentStatus, AttentionItem, ScheduleStatus } from "@/api/contracts";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusIcon = "check" | "clock" | "x" | "swap" | "arrows" | "prohibit";

export interface StatusMeta {
  label: string;
  icon: StatusIcon;
  tone: Tone;
}

const ASSIGNMENT: Record<AssignmentStatus, StatusMeta> = {
  PENDING: { label: "Aguardando", icon: "clock", tone: "warning" },
  ACCEPTED: { label: "Confirmado", icon: "check", tone: "success" },
  DECLINED: { label: "Recusado", icon: "x", tone: "danger" },
  REPLACEMENT_PENDING: { label: "Substituição pendente", icon: "swap", tone: "info" },
  REPLACED: { label: "Substituído", icon: "arrows", tone: "neutral" },
  CANCELLED: { label: "Cancelado", icon: "prohibit", tone: "neutral" },
};

export function assignmentStatusMeta(status: AssignmentStatus, scheduleStatus?: ScheduleStatus): StatusMeta {
  if (scheduleStatus === "CANCELLED") return { label: "Escala cancelada", icon: "prohibit", tone: "neutral" };
  return ASSIGNMENT[status];
}

export interface AttentionCopy {
  title: string;
  detail: string;
  tone: Tone;
}

/** Texto das pendências do líder — o problema exato, não uma contagem (§34). */
export function attentionCopy(item: AttentionItem): AttentionCopy {
  switch (item.kind) {
    case "declined":
      return { title: `${item.userName} recusou`, detail: item.functionName || "Sem função", tone: "danger" };
    case "replacement_requested":
      return { title: `${item.userName} pediu substituição`, detail: item.functionName || "Sem função", tone: "info" };
    case "open_slots":
      return {
        title: item.count === 1 ? `1 vaga de ${item.functionName}` : `${item.count} vagas de ${item.functionName}`,
        detail: "Nenhum responsável",
        tone: "warning",
      };
    case "no_response":
      return {
        title: item.count === 1 ? "1 pessoa ainda não respondeu" : `${item.count} pessoas ainda não responderam`,
        detail: joinNames(item.userNames),
        tone: "warning",
      };
  }
}

export function joinNames(names: readonly string[], max = 3): string {
  if (names.length <= max) {
    return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  }
  const rest = names.length - max;
  return `${names.slice(0, max).join(", ")} e mais ${rest}`;
}

// Atualização otimista das telas quando a pessoa responde (§40: feedback
// imediato). Pura — os hooks aplicam sobre o cache do React Query.

import type { AssignmentCard, AssignmentStatus, MobileOverview, MobileScheduleDetail, MobileScheduleList } from "@/api/contracts";

function patchCard(card: AssignmentCard, assignmentId: string, status: AssignmentStatus): AssignmentCard {
  if (card.assignmentId !== assignmentId) return card;
  return { ...card, status, needsResponse: false, reconfirmRequested: false };
}

/**
 * Na Home, responder tira o card de "Pendências". A próxima escala continua
 * a mesma até o servidor recompor — evita a tela "pular" no meio do toque.
 */
export function applyToOverview(data: MobileOverview | undefined, assignmentId: string, status: AssignmentStatus) {
  if (!data) return data;
  const next = data.next ? patchCard(data.next, assignmentId, status) : null;
  const answered = data.pending.find((c) => c.assignmentId === assignmentId);
  return {
    ...data,
    next,
    pending: data.pending.filter((c) => c.assignmentId !== assignmentId),
    upcoming: answered
      ? [...data.upcoming, patchCard(answered, assignmentId, status)].sort((a, b) =>
          a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
        )
      : data.upcoming.map((c) => patchCard(c, assignmentId, status)),
  };
}

export function applyToList(data: MobileScheduleList | undefined, assignmentId: string, status: AssignmentStatus) {
  if (!data) return data;
  return { ...data, items: data.items.map((c) => patchCard(c, assignmentId, status)) };
}

export function applyToDetail(data: MobileScheduleDetail | undefined, assignmentId: string, status: AssignmentStatus) {
  if (!data || data.me?.assignmentId !== assignmentId) return data;
  return {
    ...data,
    me: { ...data.me, status, reconfirmRequested: false },
    team: data.team.map((t) => (t.assignmentId === assignmentId ? { ...t, status } : t)),
  };
}

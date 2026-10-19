import { onlineManager, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import type { AssignmentStatus, MobileOverview, MobileScheduleDetail, MobileScheduleList } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { useToast } from "@/components/ui/Toast";
import { mutationKeys, queryKeys, refreshAfterResponse } from "@/lib/query";
import { relativeDay, churchToday, parseDay } from "./format";
import { applyToDetail, applyToList, applyToOverview } from "./optimistic";

export function useOverview() {
  return useQuery({ queryKey: queryKeys.overview, queryFn: endpoints.overview });
}

export function useUpcomingSchedules() {
  return useQuery({ queryKey: queryKeys.schedules("upcoming"), queryFn: () => endpoints.schedules("upcoming") });
}

export function usePastSchedules(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.schedules("past"),
    queryFn: ({ pageParam }) => endpoints.schedules("past", pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

export function useScheduleDetail(id: string) {
  return useQuery({ queryKey: queryKeys.schedule(id), queryFn: () => endpoints.schedule(id), enabled: Boolean(id) });
}

export function useMinistries() {
  return useQuery({ queryKey: queryKeys.ministries, queryFn: endpoints.ministries });
}

const WEEKDAY_WORD = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "Nos vemos domingo!" · "Nos vemos hoje!" · "Nos vemos amanhã!" */
export function seeYouMessage(date: string | undefined): string {
  if (!date) return "Obrigado por confirmar!";
  const rel = relativeDay(date, churchToday());
  if (rel) return `Nos vemos ${rel.toLowerCase()}!`;
  return `Nos vemos ${WEEKDAY_WORD[parseDay(date).weekday]}!`;
}

type Snapshot = [readonly unknown[], unknown][];

function useOptimisticStatus() {
  const qc = useQueryClient();
  return {
    async apply(assignmentId: string, scheduleId: string | undefined, status: AssignmentStatus): Promise<Snapshot> {
      const keys = [queryKeys.overview, queryKeys.schedules("upcoming"), ...(scheduleId ? [queryKeys.schedule(scheduleId)] : [])];
      await Promise.all(keys.map((k) => qc.cancelQueries({ queryKey: k })));
      const snapshot: Snapshot = keys.map((k) => [k, qc.getQueryData(k)]);
      qc.setQueryData<MobileOverview>(queryKeys.overview, (d) => applyToOverview(d, assignmentId, status));
      qc.setQueryData<MobileScheduleList>(queryKeys.schedules("upcoming"), (d) => applyToList(d, assignmentId, status));
      if (scheduleId) qc.setQueryData<MobileScheduleDetail>(queryKeys.schedule(scheduleId), (d) => applyToDetail(d, assignmentId, status));
      return snapshot;
    },
    rollback(snapshot: Snapshot | undefined) {
      snapshot?.forEach(([k, v]) => qc.setQueryData(k, v));
    },
  };
}

interface RespondVars {
  assignmentId: string;
  scheduleId?: string;
  date?: string;
  status: "confirmed" | "declined";
  reason?: string;
  markUnavailable?: boolean;
}

/**
 * Confirmar / recusar. Sem modal de "tem certeza?" (§40): é reversível.
 * Otimista; se estiver offline a ação fica pausada, persiste em disco e é
 * enviada quando a rede voltar.
 */
export function useRespond() {
  const toast = useToast();
  const optimistic = useOptimisticStatus();
  return useMutation({
    mutationKey: mutationKeys.respond,
    mutationFn: (v: RespondVars) => endpoints.respond(v),
    onMutate: async (v) => {
      const snapshot = await optimistic.apply(v.assignmentId, v.scheduleId, v.status === "confirmed" ? "ACCEPTED" : "DECLINED");
      if (!onlineManager.isOnline()) {
        toast.show({ kind: "offline", title: "Resposta salva", description: "Será sincronizada quando a conexão voltar." });
      } else if (v.status === "confirmed") {
        toast.show({ kind: "success", title: "Presença confirmada", description: seeYouMessage(v.date) });
      } else {
        toast.show({ kind: "success", title: "Seu líder foi avisado", description: "Obrigado por avisar com antecedência." });
      }
      return { snapshot };
    },
    onError: (error, v, ctx) => {
      optimistic.rollback(ctx?.snapshot);
      toast.show({
        kind: "error",
        title: v.status === "confirmed" ? "Não foi possível confirmar" : "Não foi possível enviar",
        description: error instanceof ApiError ? error.message : "Tente novamente.",
      });
    },
    // onSettled (atualizar as telas) e a fila em ordem vêm dos defaults da
    // chave em lib/query.ts — valem também para a resposta retomada do disco.
  });
}

/** Pedir substituição — precisa de rede (o líder tem que receber agora). */
export function useRequestReplacement() {
  const qc = useQueryClient();
  const toast = useToast();
  const optimistic = useOptimisticStatus();
  return useMutation({
    mutationFn: (v: { assignmentId: string; scheduleId?: string; reason?: string; markUnavailable?: boolean }) =>
      endpoints.requestReplacement(v),
    networkMode: "always",
    onSuccess: async (_d, v) => {
      await optimistic.apply(v.assignmentId, v.scheduleId, "REPLACEMENT_PENDING");
      toast.show({ kind: "success", title: "Pedido enviado", description: "Seu líder vai escolher quem entra no seu lugar." });
    },
    onError: (error) => {
      toast.show({
        kind: "error",
        title: "Pedido não enviado",
        description: error instanceof ApiError ? error.message : "Tente novamente.",
      });
    },
    onSettled: (_d, _e, v) => refreshAfterResponse(qc, v),
  });
}

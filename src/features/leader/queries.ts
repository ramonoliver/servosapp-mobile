import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useToast } from "@/components/ui/Toast";
import { queryKeys } from "@/lib/query";

// Hooks do P1. Escritas de liderança precisam de rede (não entram na fila
// offline): o líder precisa saber na hora se deu certo e o time é avisado.

export function useUnavailability() {
  return useQuery({ queryKey: queryKeys.unavailability, queryFn: endpoints.unavailability });
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: queryKeys.notificationPreferences, queryFn: endpoints.notificationPreferences });
}

export function useMinistryDetail(id: string) {
  return useQuery({ queryKey: queryKeys.ministry(id), queryFn: () => endpoints.ministry(id), enabled: Boolean(id) });
}

export function useCandidates(scheduleId: string, functionName: string, replacing?: string) {
  return useQuery({
    queryKey: queryKeys.candidates(scheduleId, functionName, replacing),
    queryFn: () => endpoints.candidates(scheduleId, functionName, replacing),
    enabled: Boolean(scheduleId),
    staleTime: 0,
  });
}

export function useOccurrences(ministryId: string) {
  return useQuery({ queryKey: queryKeys.occurrences(ministryId), queryFn: () => endpoints.occurrences(ministryId), enabled: Boolean(ministryId) });
}

export function usePeopleSearch(ministryId: string, q: string, enabled: boolean) {
  return useQuery({ queryKey: queryKeys.people(ministryId, q), queryFn: () => endpoints.people(ministryId, q), enabled });
}

/** Mensagem humana para o toast de erro. */
export function errorText(error: unknown, fallback = "Tente novamente.") {
  return error instanceof ApiError ? error.message : fallback;
}

/** Invalida tudo que mostra escalas/ministérios depois de uma ação do líder. */
export function useRefreshLeaderData() {
  const qc = useQueryClient();
  return (ids: { scheduleId?: string; ministryId?: string } = {}) => {
    void qc.invalidateQueries({ queryKey: queryKeys.overview });
    void qc.invalidateQueries({ queryKey: ["schedules"] });
    void qc.invalidateQueries({ queryKey: ["candidates"] });
    if (ids.scheduleId) void qc.invalidateQueries({ queryKey: queryKeys.schedule(ids.scheduleId) });
    if (ids.ministryId) {
      void qc.invalidateQueries({ queryKey: queryKeys.ministry(ids.ministryId) });
      void qc.invalidateQueries({ queryKey: queryKeys.occurrences(ids.ministryId) });
    }
    void qc.invalidateQueries({ queryKey: queryKeys.ministries });
  };
}

export function useSavePreferences() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: endpoints.saveNotificationPreferences,
    networkMode: "always",
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: queryKeys.notificationPreferences });
      const prev = qc.getQueryData(queryKeys.notificationPreferences);
      qc.setQueryData(queryKeys.notificationPreferences, (d: Awaited<ReturnType<typeof endpoints.notificationPreferences>> | undefined) =>
        d ? { ...d, ...patch, leader: { ...d.leader, ...(patch.leader ?? {}) } } : d,
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(queryKeys.notificationPreferences, ctx?.prev);
      toast.show({ kind: "error", title: "Não foi possível salvar", description: errorText(e) });
    },
    onSuccess: (data) => qc.setQueryData(queryKeys.notificationPreferences, data),
  });
}

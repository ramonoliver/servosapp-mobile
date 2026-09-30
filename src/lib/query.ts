import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, onlineManager, focusManager } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";

// Offline (§51): o React Query sabe quando a rede cai (NetInfo) e pausa
// consultas/ações em vez de falhar; o cache é persistido em disco para a
// próxima escala, o detalhe e a equipe abrirem sem conexão.

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false)),
);

AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 7 * 24 * 60 * 60 * 1000, // cache vive 7 dias no disco
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
    mutations: {
      retry: (count, error) => error instanceof ApiError && error.isNetwork && count < 3,
    },
  },
});

export const queryKeys = {
  overview: ["overview"] as const,
  schedules: (scope: "upcoming" | "past") => ["schedules", scope] as const,
  schedule: (id: string) => ["schedule", id] as const,
  ministries: ["ministries"] as const,
  notifications: ["notifications"] as const,
  unavailability: ["unavailability"] as const,
  notificationPreferences: ["notification-preferences"] as const,
  ministry: (id: string) => ["ministry", id] as const,
  candidates: (scheduleId: string, fn: string, replacing?: string) => ["candidates", scheduleId, fn, replacing ?? ""] as const,
  occurrences: (ministryId: string) => ["occurrences", ministryId] as const,
  people: (ministryId: string, q: string) => ["people", ministryId, q] as const,
};

/**
 * Ações que podem ser feitas sem rede e sincronizadas depois. Os defaults
 * precisam existir por chave para que uma ação pausada, persistida em disco,
 * seja retomada mesmo depois de fechar e reabrir o app.
 */
export const mutationKeys = {
  respond: ["respond"] as const,
};

queryClient.setMutationDefaults(mutationKeys.respond, {
  mutationFn: endpoints.respond,
});

export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "servos.cache.v1" });

export async function clearPersistedCache() {
  await AsyncStorage.removeItem("servos.cache.v1");
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, onlineManager, focusManager } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { AppState, Platform } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints, type SessionUser } from "@/api/endpoints";
import { USER_KEY } from "@/lib/savedSession";

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

/** Telas que mudam quando a pessoa responde ou pede substituição. */
export function refreshAfterResponse(qc: QueryClient, v: { scheduleId?: string; markUnavailable?: boolean }) {
  void qc.invalidateQueries({ queryKey: queryKeys.overview });
  void qc.invalidateQueries({ queryKey: ["schedules"] });
  if (v.scheduleId) void qc.invalidateQueries({ queryKey: queryKeys.schedule(v.scheduleId) });
  // "Marcar como indisponível" cria a exceção no servidor.
  if (v.markUnavailable) void qc.invalidateQueries({ queryKey: queryKeys.unavailability });
}

/**
 * Ações que podem ser feitas sem rede e sincronizadas depois. Os defaults
 * precisam existir por chave para que uma ação pausada, persistida em disco,
 * seja retomada mesmo depois de fechar e reabrir o app — sem o hook montado,
 * só valem o que está aqui (inclusive atualizar as telas no fim).
 */
export const mutationKeys = {
  respond: ["respond"] as const,
};

// O React Query também retoma ações pausadas sozinho (rede voltou, app em
// foco), o que pode acontecer no boot antes de a sessão ter token: o envio
// espera a sessão, senão o servidor recusa sem token e a resposta se perde.
let releaseSession: (() => void) | null = null;
let sessionReady = new Promise<void>((resolve) => (releaseSession = resolve));

queryClient.setMutationDefaults(mutationKeys.respond, {
  mutationFn: async (v: Parameters<typeof endpoints.respond>[0]) => {
    await sessionReady;
    return endpoints.respond(v);
  },
  // Uma por vez, na ordem: confirmar e depois recusar offline não pode chegar
  // invertido no servidor quando a rede volta.
  scope: { id: "respond" },
  onSettled: (_data, _error, v) => refreshAfterResponse(queryClient, v as { scheduleId?: string; markUnavailable?: boolean }),
});

// ── Cache por conta ─────────────────────────────────────────────────────────
// O cache em disco leva a marca de quem estava logado. Só volta para a mesma
// pessoa na mesma igreja: uma gravação atrasada (throttle) que caia depois do
// logout, ou o cache de outra conta, nunca aparece para quem entrar depois.

const CACHE_KEY = "servos.cache.v1";

type CacheOwner = Pick<SessionUser, "id" | "church_id">;
type OwnedClient = PersistedClient & { owner?: string | null };

const ownerOf = (user: CacheOwner | null) => (user ? `${user.id}:${user.church_id ?? ""}` : null);

let cacheOwner: string | null = null;

/**
 * Liga o cache à sessão atual (null ao sair). Com a sessão de pé (token
 * válido), libera e retoma as respostas que ficaram pausadas.
 */
export function bindCacheToUser(user: CacheOwner | null) {
  cacheOwner = ownerOf(user);
  if (cacheOwner) {
    releaseSession?.();
    releaseSession = null;
    void queryClient.resumePausedMutations();
  } else if (!releaseSession) {
    sessionReady = new Promise<void>((resolve) => (releaseSession = resolve));
  }
}

const storagePersister = createAsyncStoragePersister({ storage: AsyncStorage, key: CACHE_KEY });

export const persister: Persister = {
  persistClient: (client) => storagePersister.persistClient({ ...client, owner: cacheOwner } as OwnedClient),
  restoreClient: async () => {
    const [client, savedUser] = await Promise.all([storagePersister.restoreClient(), AsyncStorage.getItem(USER_KEY)]);
    if (!client) return undefined;
    const owner = ownerOf(savedUser ? (JSON.parse(savedUser) as CacheOwner) : null);
    if (!owner || (client as OwnedClient).owner !== owner) {
      await storagePersister.removeClient();
      return undefined;
    }
    return client;
  },
  removeClient: () => storagePersister.removeClient(),
};

export async function clearPersistedCache() {
  await AsyncStorage.removeItem(CACHE_KEY);
}

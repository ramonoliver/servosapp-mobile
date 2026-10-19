import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, hydrate, onlineManager, QueryClient } from "@tanstack/react-query";
import { endpoints } from "@/api/endpoints";
import { USER_KEY } from "@/lib/savedSession";
import { bindCacheToUser, mutationKeys, persister, queryClient, queryKeys } from "./query";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@react-native-community/netinfo", () => jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock.js"));
jest.mock("@/api/endpoints", () => ({ endpoints: { respond: jest.fn() } }));

const respond = endpoints.respond as jest.Mock;

const ana = { id: "ana", church_id: "c1", name: "Ana", email: "ana@x.com", photo_url: null, avatar_color: null };
const bia = { id: "bia", church_id: "c1", name: "Bia", email: "bia@x.com", photo_url: null, avatar_color: null };

const flush = () => new Promise((r) => setTimeout(r, 0));

/** `clear()` não desliga o timer de GC das mutações — sem isso o Jest não encerra. */
function resetClient() {
  queryClient.getMutationCache().getAll().forEach((m) => m.destroy());
  queryClient.clear();
}

function persistedClient() {
  return { timestamp: Date.now(), buster: "v1", clientState: { queries: [], mutations: [] } };
}

/** Respostas feitas sem rede, num app que depois foi fechado (estado como fica no disco). */
async function pausedResponses(...vars: Record<string, unknown>[]) {
  const offlineClient = new QueryClient();
  // Mesmos defaults do app: é o que vai para o disco quando a pessoa responde.
  offlineClient.setMutationDefaults(mutationKeys.respond, queryClient.getMutationDefaults(mutationKeys.respond));
  onlineManager.setOnline(false);
  for (const v of vars) {
    const mutation = offlineClient.getMutationCache().build(offlineClient, { mutationKey: mutationKeys.respond });
    void mutation.execute(v).catch(() => {});
  }
  await flush(); // o envio chega a pausar esperando a rede
  const state = JSON.parse(JSON.stringify(dehydrate(offlineClient)));
  offlineClient.getMutationCache().getAll().forEach((m) => m.destroy());
  offlineClient.clear();
  onlineManager.setOnline(true); // reabriu o app com rede
  return state;
}

function deferred() {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(async () => {
  bindCacheToUser(null);
  resetClient();
  respond.mockReset();
  onlineManager.setOnline(true);
  await AsyncStorage.clear();
});

afterAll(resetClient);

describe("cache persistido no aparelho", () => {
  it("não restaura para outra conta o cache salvo por quem saiu", async () => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(ana));
    bindCacheToUser(ana);
    await persister.persistClient(persistedClient());

    // Ana sai e Bia entra no mesmo aparelho.
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(bia));
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it("não restaura cache gravado com atraso depois do logout", async () => {
    // A gravação é adiada (throttle de 1s): pode cair no disco depois do
    // `removeItem` do logout, ainda com os dados de quem saiu.
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(ana));
    bindCacheToUser(ana);
    await persister.persistClient(persistedClient());
    await AsyncStorage.removeItem(USER_KEY); // logout apaga o usuário salvo

    expect(await persister.restoreClient()).toBeUndefined();
  });

  it("restaura o cache da mesma conta (offline continua funcionando)", async () => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(ana));
    bindCacheToUser(ana);
    await persister.persistClient(persistedClient());

    expect(await persister.restoreClient()).toMatchObject({ buster: "v1" });
  });

  it("trocar de igreja não reaproveita o cache da igreja anterior", async () => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(ana));
    bindCacheToUser(ana);
    await persister.persistClient(persistedClient());

    await AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...ana, church_id: "c2" }));
    expect(await persister.restoreClient()).toBeUndefined();
  });
});

describe("respostas pausadas retomadas ao reabrir o app", () => {
  it("é enviada quando a sessão volta (antes disso, sem token, o servidor recusaria e a resposta se perderia)", async () => {
    hydrate(queryClient, await pausedResponses({ assignmentId: "a1", scheduleId: "s1", status: "confirmed" }));

    // Rede voltou / app em foco antes de o boot renovar a sessão: o React
    // Query retoma sozinho, mas o envio espera a sessão.
    void queryClient.resumePausedMutations();
    await flush();
    expect(respond).not.toHaveBeenCalled();

    respond.mockResolvedValue({ success: true, changed: true });
    bindCacheToUser(ana);
    await flush();
    expect(respond).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: "a1", status: "confirmed" }));
  });

  it("atualiza Home, escalas, detalhe e disponibilidade depois de enviar", async () => {
    queryClient.setQueryData(queryKeys.overview, { pending: [] });
    queryClient.setQueryData(queryKeys.schedules("upcoming"), { items: [] });
    queryClient.setQueryData(queryKeys.schedule("s1"), { me: null });
    queryClient.setQueryData(queryKeys.unavailability, { items: [] });
    hydrate(queryClient, await pausedResponses({ assignmentId: "a1", scheduleId: "s1", status: "declined", markUnavailable: true }));
    respond.mockResolvedValue({ success: true, changed: true });

    bindCacheToUser(ana);
    await flush();
    await flush();

    for (const key of [queryKeys.overview, queryKeys.schedules("upcoming"), queryKeys.schedule("s1"), queryKeys.unavailability]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it("envia na ordem em que a pessoa respondeu (confirmou e depois recusou)", async () => {
    hydrate(
      queryClient,
      await pausedResponses(
        { assignmentId: "a1", scheduleId: "s1", status: "confirmed" },
        { assignmentId: "a1", scheduleId: "s1", status: "declined" },
      ),
    );
    const first = deferred();
    respond.mockImplementationOnce(() => first.promise).mockResolvedValueOnce({ success: true, changed: true });

    bindCacheToUser(ana);
    await flush();
    expect(respond).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenLastCalledWith(expect.objectContaining({ status: "confirmed" }));

    first.resolve({ success: true, changed: true });
    await flush();
    await flush();
    expect(respond).toHaveBeenCalledTimes(2);
    expect(respond).toHaveBeenLastCalledWith(expect.objectContaining({ status: "declined" }));
  });
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, setApiToken, setUnauthorizedHandler } from "@/api/client";
import { endpoints, type AuthResponse, type JoinOutcome, type SessionUser } from "@/api/endpoints";
import { queryClient, clearPersistedCache } from "@/lib/query";
import { unregisterPushOnLogout } from "@/lib/push";
import { TOKEN_KEY } from "@/lib/savedSession";

const USER_KEY = "servos.user";
const JOIN_KEY = "servos.join";

type Status = "loading" | "signedOut" | "signedIn" | "pending";

/** Cadastro feito pelo código/convite da igreja, aguardando aprovação. */
export interface PendingJoin {
  joinToken: string;
  churchName: string;
  name: string;
  invitedByName: string | null;
  /** Preenchido quando a liderança recusou. */
  rejectedMessage?: string | null;
}

interface SessionState {
  status: Status;
  user: SessionUser | null;
  /** Motivo exibido no login (ex.: sessão expirou). */
  signedOutReason: string | null;
  pending: PendingJoin | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithCode: (email: string, code: string) => Promise<void>;
  signInWithGoogle: (firebaseIdToken: string) => Promise<void>;
  updateUser: (patch: Partial<SessionUser>) => Promise<void>;
  signOut: (reason?: string) => Promise<void>;
  /** Resultado do cadastro: entra direto (convite pessoal) ou vai aguardar. */
  finishSignup: (outcome: JoinOutcome) => Promise<void>;
  /** Consulta o pedido; aprovado → entra. */
  refreshPending: () => Promise<JoinOutcome["status"] | null>;
  /** Desiste de esperar neste aparelho (volta ao login). */
  leavePending: () => Promise<void>;
  /** Multi-igreja: troca a sessão para o perfil da pessoa em outra igreja. */
  switchChurch: (churchId: string) => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

async function persist(token: string | null, user: SessionUser | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(USER_KEY);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signedOutReason, setReason] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingJoin | null>(null);

  const savePending = useCallback(async (p: PendingJoin | null) => {
    if (p) await SecureStore.setItemAsync(JOIN_KEY, JSON.stringify(p));
    else await SecureStore.deleteItemAsync(JOIN_KEY);
    setPending(p);
  }, []);

  const enter = useCallback(
    async (res: AuthResponse) => {
      await savePending(null);
      setApiToken(res.token);
      await persist(res.token, res.user);
      setUser(res.user);
      setReason(null);
      setStatus("signedIn");
    },
    [savePending],
  );

  const clearLocal = useCallback(async (reason: string | null) => {
    setApiToken(null);
    await persist(null, null);
    queryClient.clear();
    await clearPersistedCache();
    setUser(null);
    setReason(reason);
    setStatus("signedOut");
  }, []);

  const signOut = useCallback(
    async (reason?: string) => {
      // Ordem importa: tira o push do aparelho ENQUANTO o token ainda vale.
      await unregisterPushOnLogout().catch(() => {});
      await endpoints.logout().catch(() => {});
      await clearLocal(reason ?? null);
    },
    [clearLocal],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearLocal("Sua sessão expirou. Entre novamente para continuar.");
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocal]);

  // Boot: token salvo → renova a sessão (sliding). Sem rede, entra com o
  // último usuário conhecido e o cache (§51) — não joga a pessoa no login.
  useEffect(() => {
    (async () => {
      const [savedToken, savedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (!savedToken) {
        const savedJoin = await SecureStore.getItemAsync(JOIN_KEY).catch(() => null);
        if (savedJoin) {
          setPending(JSON.parse(savedJoin) as PendingJoin);
          setStatus("pending");
          return;
        }
        setStatus("signedOut");
        return;
      }
      setApiToken(savedToken);
      const cachedUser = savedUser ? (JSON.parse(savedUser) as SessionUser) : null;
      try {
        const res = await endpoints.session();
        setApiToken(res.token);
        await persist(res.token, res.user);
        setUser(res.user);
        setStatus("signedIn");
      } catch (error) {
        if (error instanceof ApiError && error.isNetwork && cachedUser) {
          setUser(cachedUser);
          setStatus("signedIn");
          return;
        }
        await clearLocal(error instanceof ApiError && error.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : null);
      }
    })();
  }, [clearLocal]);

  /** Login (senha, código ou Google): entra, ou vai para a espera se o cadastro ainda está em análise. */
  const authenticate = useCallback(
    async (request: () => Promise<AuthResponse>) => {
      try {
        await enter(await request());
      } catch (error) {
        const joinToken = error instanceof ApiError && error.code === "PENDING_APPROVAL" ? error.body?.joinToken : null;
        if (typeof joinToken === "string" && joinToken) {
          await savePending({ joinToken, churchName: "", name: "", invitedByName: null });
          setStatus("pending");
          return;
        }
        throw error;
      }
    },
    [enter, savePending],
  );

  const signIn = useCallback((email: string, password: string) => authenticate(() => endpoints.login(email, password)), [authenticate]);
  const signInWithCode = useCallback((email: string, code: string) => authenticate(() => endpoints.verifyLoginCode(email, code)), [authenticate]);
  const signInWithGoogle = useCallback((firebaseIdToken: string) => authenticate(() => endpoints.googleLogin(firebaseIdToken)), [authenticate]);

  /** "Meus dados" salvo: reflete nome/foto no app sem esperar a próxima sessão. */
  const updateUser = useCallback(async (patch: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const finishSignup = useCallback(
    async (outcome: JoinOutcome) => {
      if (outcome.status === "approved" && "token" in outcome && outcome.token) {
        await enter(outcome);
        return;
      }
      if (outcome.status === "pending" && outcome.joinToken) {
        await savePending({
          joinToken: outcome.joinToken,
          churchName: outcome.church.name,
          name: outcome.name,
          invitedByName: outcome.invitedByName ?? null,
        });
        setStatus("pending");
      }
    },
    [enter, savePending],
  );

  const leavePending = useCallback(async () => {
    await savePending(null);
    setReason(null);
    setStatus("signedOut");
  }, [savePending]);

  const refreshPending = useCallback(async () => {
    if (!pending) return null;
    try {
      const res = await endpoints.joinStatus(pending.joinToken);
      if (res.status === "approved") {
        if ("token" in res && res.token) {
          await enter(res);
        } else {
          await savePending(null);
          setReason("Seu cadastro foi aprovado! Entre com seu e-mail e senha.");
          setStatus("signedOut");
        }
      } else if (res.status === "rejected") {
        await savePending({ ...pending, churchName: res.church.name || pending.churchName, rejectedMessage: res.message });
      } else {
        await savePending({
          ...pending,
          churchName: res.church.name || pending.churchName,
          name: res.name || pending.name,
          invitedByName: res.invitedByName ?? pending.invitedByName,
          rejectedMessage: null,
        });
      }
      return res.status;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await savePending(null);
        setReason("Não encontramos seu cadastro. Entre com seu e-mail e senha.");
        setStatus("signedOut");
      }
      throw error;
    }
  }, [pending, enter, savePending]);

  // Os dados em cache são da igreja anterior: some tudo antes de entrar na
  // nova sessão, para nenhuma tela mostrar escala da outra igreja.
  const switchChurch = useCallback(
    async (churchId: string) => {
      const res = await endpoints.switchChurch(churchId);
      await queryClient.cancelQueries();
      queryClient.clear();
      await clearPersistedCache();
      await enter(res);
    },
    [enter],
  );

  const value = useMemo(
    () => ({
      status, user, signedOutReason, pending,
      signIn, signInWithCode, signInWithGoogle, updateUser, signOut, finishSignup, refreshPending, leavePending, switchChurch,
    }),
    [status, user, signedOutReason, pending, signIn, signInWithCode, signInWithGoogle, updateUser, signOut, finishSignup, refreshPending, leavePending, switchChurch],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession fora do SessionProvider");
  return ctx;
}

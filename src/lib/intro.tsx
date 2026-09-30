import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Apresentação do app no primeiro acesso (antes do login). É por APARELHO:
// quem já viu não vê de novo ao sair e entrar com outra conta.
const KEY = "servos.intro.seen";

type State = "loading" | "unseen" | "seen";
const IntroContext = createContext<{ state: State; markSeen: () => Promise<void> } | null>(null);

export function IntroProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((v) => alive && setState(v ? "seen" : "unseen"))
      .catch(() => alive && setState("seen"));
    return () => {
      alive = false;
    };
  }, []);

  const markSeen = useCallback(async () => {
    setState("seen");
    await AsyncStorage.setItem(KEY, "1").catch(() => {});
  }, []);

  const value = useMemo(() => ({ state, markSeen }), [state, markSeen]);
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro() {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error("useIntro fora do IntroProvider");
  return ctx;
}

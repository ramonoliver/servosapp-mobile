import AsyncStorage from "@react-native-async-storage/async-storage";
import { track } from "@/lib/analytics";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Onboarding é por pessoa (outro usuário no mesmo aparelho também vê).
const key = (userId: string) => `servos.onboarded.${userId}`;

type State = "loading" | "pending" | "done";
const OnboardingContext = createContext<{ state: State; complete: () => Promise<void> } | null>(null);

export function OnboardingProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  // Estado derivado de "para qual pessoa já li o armazenamento" — trocar de
  // conta volta a "loading" sem setState dentro do effect.
  const [loaded, setLoaded] = useState<{ userId: string; done: boolean } | null>(null);
  const state: State = !userId || loaded?.userId !== userId ? "loading" : loaded.done ? "done" : "pending";

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    AsyncStorage.getItem(key(userId))
      .then((v) => alive && setLoaded({ userId, done: Boolean(v) }))
      .catch(() => alive && setLoaded({ userId, done: true }));
    return () => {
      alive = false;
    };
  }, [userId]);

  const complete = useCallback(async () => {
    if (!userId) return;
    await AsyncStorage.setItem(key(userId), "1");
    track("onboarding_completed");
    setLoaded({ userId, done: true });
  }, [userId]);

  const value = useMemo(() => ({ state, complete }), [state, complete]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding fora do OnboardingProvider");
  return ctx;
}

import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from "@expo-google-fonts/geist";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/auth/session";
import { AnimatedSplash } from "@/components/brand/AnimatedSplash";
import { setAnalyticsEnabled, track } from "@/lib/analytics";
import { IntroProvider, useIntro } from "@/lib/intro";
import { ToastProvider } from "@/components/ui/Toast";
import { appRouteForUrl } from "@/lib/links";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding";
import { configureNotifications, registerDevice, urlFromNotification } from "@/lib/push";
import { persister, queryClient } from "@/lib/query";
import { color, font } from "@/theme/tokens";

void SplashScreen.preventAutoHideAsync();
configureNotifications();
track("app_opened");

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  // O splash animado cobre o app até a navegação estar pronta; depois se dissolve.
  const [settled, setSettled] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const onSettled = useCallback(() => setSettled(true), []);
  const onSplashDone = useCallback(() => setSplashDone(true), []);
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60 * 1000, buster: "v1" }}
        // Ações feitas sem rede e salvas em disco voltam a ser enviadas (§51).
        onSuccess={() => void queryClient.resumePausedMutations()}
      >
        <SessionProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <IntroProvider>
              <RootNavigator ready={fontsLoaded || Boolean(fontError)} onSettled={onSettled} />
            </IntroProvider>
            {!splashDone ? <AnimatedSplash ready={settled} onDone={onSplashDone} /> : null}
          </ToastProvider>
        </SessionProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator({ ready, onSettled }: { ready: boolean; onSettled: () => void }) {
  const { status, user } = useSession();
  useEffect(() => {
    setAnalyticsEnabled(status === "signedIn");
  }, [status]);
  return (
    <OnboardingProvider userId={user?.id ?? null}>
      <Navigator ready={ready} status={status} onSettled={onSettled} />
    </OnboardingProvider>
  );
}

function Navigator({
  ready,
  status,
  onSettled,
}: {
  ready: boolean;
  status: "loading" | "signedIn" | "signedOut" | "pending";
  onSettled: () => void;
}) {
  const onboarding = useOnboarding();
  const intro = useIntro();
  const signedIn = status === "signedIn";
  const signedOut = status === "signedOut";
  const settled =
    ready &&
    status !== "loading" &&
    (!signedIn || onboarding.state !== "loading") &&
    (!signedOut || intro.state !== "loading");

  // O splash (nativo → animado) só sai quando a primeira tela certa já existe.
  useEffect(() => {
    if (settled) onSettled();
  }, [settled, onSettled]);

  const inApp = signedIn && onboarding.state === "done";
  usePushWiring(inApp);

  if (!settled) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.background },
        headerStyle: { backgroundColor: color.background },
        headerTintColor: color.primary,
        headerTitleStyle: { fontFamily: font.semibold, color: color.foreground },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="escala/[id]" options={{ headerShown: true, title: "Escala" }} />
        <Stack.Screen name="notificacoes" options={{ headerShown: true, title: "Notificações" }} />
        <Stack.Screen name="disponibilidade" options={{ headerShown: true, title: "Minha disponibilidade" }} />
        <Stack.Screen name="preferencias" options={{ headerShown: true, title: "Notificações" }} />
        <Stack.Screen name="ministerio/[id]" options={{ headerShown: true, title: "Ministério" }} />
        <Stack.Screen name="nova-escala" options={{ headerShown: true, title: "Nova escala", presentation: "modal" }} />
        <Stack.Screen name="selecionar-pessoa" options={{ headerShown: true, title: "Escolher pessoa", presentation: "modal" }} />
        <Stack.Screen name="convidar" options={{ headerShown: true, title: "Convidar pessoas", presentation: "modal" }} />
        <Stack.Screen name="aprovacoes" options={{ headerShown: true, title: "Pedidos de entrada" }} />
        <Stack.Screen name="meus-dados" options={{ headerShown: true, title: "Meus dados" }} />
        <Stack.Screen name="historico/[id]" options={{ headerShown: true, title: "Histórico da escala" }} />
        <Stack.Screen name="relatorio/[id]" options={{ headerShown: true, title: "Relatório da equipe" }} />
      </Stack.Protected>
      <Stack.Protected guard={status === "pending"}>
        <Stack.Screen name="aguardando" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarding.state === "pending"}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedOut && intro.state === "unseen"}>
        <Stack.Screen name="bem-vindo" />
      </Stack.Protected>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="login" />
        <Stack.Screen name="esqueci-senha" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="entrar" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="entrar-com-codigo" options={{ headerShown: true, title: "" }} />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Push dentro do app: registra o aparelho (e renova `last_used_at` a cada
 * volta ao app) e abre o contexto certo ao tocar numa notificação (§31/§32).
 */
function usePushWiring(enabled: boolean) {
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    void registerDevice();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void registerDevice();
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    track("notification_opened");
    router.push(appRouteForUrl(urlFromNotification(lastResponse.notification)));
  }, [enabled, lastResponse]);
}

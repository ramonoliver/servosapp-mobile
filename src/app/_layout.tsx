import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from "@expo-google-fonts/geist";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as Notifications from "expo-notifications";
import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/auth/session";
import { AnimatedSplash } from "@/components/brand/AnimatedSplash";
import { ErrorState } from "@/components/ui/States";
import { setAnalyticsEnabled, track } from "@/lib/analytics";
import { initMonitoring, reportError, setMonitoringUser, withMonitoring } from "@/lib/monitoring";
import { IntroProvider, useIntro } from "@/lib/intro";
import { ToastProvider } from "@/components/ui/Toast";
import { appRouteForUrl } from "@/lib/links";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding";
import { churchOfNotification, configureNotifications, registerDevice, urlFromNotification } from "@/lib/push";
import { persister, queryClient } from "@/lib/query";
import { color, font, solid } from "@/theme/tokens";

initMonitoring();
void SplashScreen.preventAutoHideAsync();
configureNotifications();
track("app_opened");

export default withMonitoring(RootLayout);

// Erro de renderização em qualquer tela cai aqui (a rota sem ErrorBoundary
// própria sobe até o pai). Sem isso, no build de produção o app fecha.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => reportError(error), [error]);
  return (
    <View style={styles.errorBoundary}>
      <ErrorState message="Algo deu errado nesta tela. Tente de novo; se continuar, feche e abra o app." onRetry={() => void retry()} />
    </View>
  );
}

function RootLayout() {
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
            <StatusBar style="auto" />
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
  useEffect(() => {
    setMonitoringUser(status === "signedIn" ? user?.id ?? null : null);
  }, [status, user?.id]);
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
  // Cabeçalho nativo não resolve cor dinâmica: passa o tom do esquema atual.
  const tone = solid[useColorScheme() === "dark" ? "dark" : "light"];
  usePushWiring(inApp);

  if (!settled) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.background },
        headerStyle: { backgroundColor: tone.background },
        headerTintColor: tone.primary,
        headerTitleStyle: { fontFamily: font.semibold, color: tone.foreground },
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
        <Stack.Screen name="conversa/[id]" options={{ headerShown: true, title: "Conversa da escala" }} />
        <Stack.Screen name="musicas/[id]" options={{ headerShown: true, title: "Músicas da escala", presentation: "modal" }} />
        <Stack.Screen name="repertorio" options={{ headerShown: true, title: "Repertório" }} />
        <Stack.Screen name="nova-musica" options={{ headerShown: true, title: "Nova música", presentation: "modal" }} />
        <Stack.Screen name="novo-evento" options={{ headerShown: true, title: "Novo evento", presentation: "modal" }} />
        <Stack.Screen name="novo-ministerio" options={{ headerShown: true, title: "Novo ministério", presentation: "modal" }} />
        <Stack.Screen name="outra-igreja" options={{ headerShown: true, title: "Entrar em outra igreja", presentation: "modal" }} />
        <Stack.Screen name="excluir-conta" options={{ headerShown: true, title: "Excluir conta", presentation: "modal" }} />
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
        <Stack.Screen name="criar-igreja" options={{ headerShown: true, title: "" }} />
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

  const { user, switchChurch } = useSession();
  useEffect(() => {
    if (!enabled || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    track("notification_opened");
    const target = appRouteForUrl(urlFromNotification(lastResponse.notification));
    // Multi-igreja: aviso de outra igreja troca a igreja antes de abrir.
    const churchId = churchOfNotification(lastResponse.notification);
    if (churchId && user?.church_id && churchId !== user.church_id) {
      void switchChurch(churchId)
        .then(() => router.push(target))
        .catch(() => router.push("/notificacoes"));
      return;
    }
    router.push(target);
  }, [enabled, lastResponse, user?.church_id, switchChurch]);
}

const styles = StyleSheet.create({
  errorBoundary: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: color.background },
});

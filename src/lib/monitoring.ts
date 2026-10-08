import Constants from "expo-constants";

// Monitoramento de erros (Sentry). Só liga com EXPO_PUBLIC_SENTRY_DSN no
// build; sem ela, nada é enviado e o app funciona igual. Sem dado pessoal:
// só o id do perfil (nunca nome, e-mail ou telefone).

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Sentry: typeof import("@sentry/react-native") | null = DSN ? require("@sentry/react-native") : null;

export function initMonitoring() {
  if (!Sentry) return;
  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? "development" : "production",
    release: `servos@${Constants.expoConfig?.version ?? "0"}`,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    enabled: !__DEV__,
  });
}

export function setMonitoringUser(profileId: string | null) {
  Sentry?.setUser(profileId ? { id: profileId } : null);
}

/** Envolve o componente raiz (captura erros de renderização). */
export function withMonitoring(Component: () => React.JSX.Element): () => React.JSX.Element {
  return Sentry ? (Sentry.wrap(Component as never) as unknown as () => React.JSX.Element) : Component;
}

/** Erro já tratado na tela (ex.: pela ErrorBoundary), mas que precisamos ver. */
export function reportError(error: unknown) {
  Sentry?.captureException(error);
}

import Constants from "expo-constants";

// Entrar com Google (§52): login nativo no Google → credencial → troca por um
// token do FIREBASE na API REST pública do Identity Toolkit (mesma chave
// pública do web) → o servidor confere o token (/auth/social) ou cria o
// cadastro (/join/signup).
//
// Só aparece quando a chave do Firebase e os IDs OAuth estão configurados
// (app.config.ts). O módulo nativo é carregado sob demanda: um build sem ele
// continua funcionando.

export type SocialProvider = "google";

export interface SocialCredential {
  provider: SocialProvider;
  /** Token do Firebase — é o que o servidor aceita. */
  idToken: string;
  /** Nome da conta no Google. */
  name: string | null;
  email: string | null;
}

/** A pessoa fechou a janela do provedor: não é erro, não mostra nada. */
export class SocialSignInCancelled extends Error {}

interface GoogleConfig {
  webClientId: string;
  iosClientId: string;
  firebaseApiKey: string;
}

function extra() {
  return (Constants.expoConfig?.extra ?? {}) as { google?: GoogleConfig | null };
}

// O manifesto do Expo pode trocar `null` por `{}`: só vale texto não vazio.
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function googleConfig(): GoogleConfig | null {
  const g = extra().google;
  const webClientId = text(g?.webClientId);
  const firebaseApiKey = text(g?.firebaseApiKey);
  return webClientId && firebaseApiKey ? { webClientId, iosClientId: text(g?.iosClientId) ?? "", firebaseApiKey } : null;
}



/** Troca a credencial do Google por um token do Firebase. */
async function exchange(key: string, postBody: string): Promise<{ idToken: string; name: string | null; email: string | null }> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody, requestUri: "http://localhost", returnIdpCredential: true, returnSecureToken: true }),
  }).catch(() => null);
  const json = (await res?.json().catch(() => ({}))) as { idToken?: string; displayName?: string; fullName?: string; email?: string } | undefined;
  if (!res?.ok || !json?.idToken) {
    throw new Error("Não foi possível entrar com o Google. Tente de novo.");
  }
  return { idToken: json.idToken, name: json.displayName || json.fullName || null, email: json.email || null };
}

export async function signInWithGoogleProvider(): Promise<SocialCredential> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Entrar com Google não está disponível neste aparelho.");
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({ webClientId: cfg.webClientId, iosClientId: cfg.iosClientId || undefined });

  let googleToken: string | null = null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) throw new SocialSignInCancelled();
    googleToken = res.data.idToken;
  } catch (error) {
    if (error instanceof SocialSignInCancelled) throw error;
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) throw new SocialSignInCancelled();
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Atualize o Google Play Services para entrar com o Google.");
    }
    throw new Error("Não foi possível abrir o Google. Tente de novo ou entre com seu e-mail.");
  }
  if (!googleToken) throw new Error("O Google não devolveu sua conta. Tente de novo.");
  const out = await exchange(cfg.firebaseApiKey, `id_token=${encodeURIComponent(googleToken)}&providerId=google.com`);
  return { provider: "google", ...out };
}

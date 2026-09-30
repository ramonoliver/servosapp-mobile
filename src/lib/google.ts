import Constants from "expo-constants";

// Entrar com Google (§52). O servidor já aceita um token do FIREBASE em
// /auth/google (é o que o web usa). No app: Google Sign-In nativo → token do
// Google → troca pelo token do Firebase na API REST pública do Identity
// Toolkit (mesma chave pública do web) → /auth/google.
//
// Só existe quando os IDs OAuth estão configurados (app.config.ts). O módulo
// nativo é carregado sob demanda: um build sem ele continua funcionando.

interface GoogleConfig {
  webClientId: string;
  iosClientId: string;
  firebaseApiKey: string;
}

export function googleConfig(): GoogleConfig | null {
  const g = Constants.expoConfig?.extra?.google as GoogleConfig | null | undefined;
  return g?.webClientId && g.firebaseApiKey ? g : null;
}

export class GoogleSignInCancelled extends Error {}

/** Abre o Google e devolve o token do Firebase. Lança `GoogleSignInCancelled` se a pessoa desistir. */
export async function googleFirebaseIdToken(): Promise<string> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Entrar com Google não está disponível neste aparelho.");
  const mod = await import("@react-native-google-signin/google-signin");
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = mod;
  GoogleSignin.configure({ webClientId: cfg.webClientId, iosClientId: cfg.iosClientId || undefined });

  let idToken: string | null = null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) throw new GoogleSignInCancelled();
    idToken = res.data.idToken;
  } catch (error) {
    if (error instanceof GoogleSignInCancelled) throw error;
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleSignInCancelled();
    if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Atualize o Google Play Services para entrar com o Google.");
    }
    throw new Error("Não foi possível abrir o Google. Tente de novo ou entre com seu e-mail.");
  }
  if (!idToken) throw new Error("O Google não devolveu sua conta. Tente de novo.");

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(cfg.firebaseApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
      requestUri: "http://localhost",
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  }).catch(() => null);
  const json = (await res?.json().catch(() => ({}))) as { idToken?: string } | undefined;
  if (!res?.ok || !json?.idToken) throw new Error("Não foi possível entrar com o Google. Tente de novo.");
  return json.idToken;
}

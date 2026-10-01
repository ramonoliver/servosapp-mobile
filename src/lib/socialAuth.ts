import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

// Entrar com Google e com Apple (§52). Os dois seguem o mesmo caminho:
// login nativo no provedor → credencial → troca por um token do FIREBASE na
// API REST pública do Identity Toolkit (mesma chave pública do web) → o
// servidor confere o token (/auth/social) ou cria o cadastro (/join/signup).
//
// Só aparecem quando a chave do Firebase está configurada (app.config.ts);
// o Google precisa também dos IDs OAuth. Os módulos nativos são carregados
// sob demanda: um build sem eles continua funcionando.

export type SocialProvider = "google" | "apple";

export interface SocialCredential {
  provider: SocialProvider;
  /** Token do Firebase — é o que o servidor aceita. */
  idToken: string;
  /** Nome da conta. A Apple só manda no PRIMEIRO login da pessoa no app. */
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
  return (Constants.expoConfig?.extra ?? {}) as { google?: GoogleConfig | null; firebaseApiKey?: string };
}

export function googleConfig(): GoogleConfig | null {
  const g = extra().google;
  return g?.webClientId && g.firebaseApiKey ? g : null;
}

function firebaseApiKey(): string | null {
  return extra().firebaseApiKey || extra().google?.firebaseApiKey || null;
}

/** Apple só no iPhone, com a chave do Firebase e o recurso disponível no aparelho. */
export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios" || !firebaseApiKey()) return false;
  try {
    const mod = await import("expo-apple-authentication");
    return await mod.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Troca a credencial do provedor por um token do Firebase. */
async function exchange(provider: SocialProvider, postBody: string): Promise<{ idToken: string; name: string | null; email: string | null }> {
  const key = firebaseApiKey();
  if (!key) throw new Error("Entrar com Google ou Apple não está disponível neste aparelho.");
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postBody, requestUri: "http://localhost", returnIdpCredential: true, returnSecureToken: true }),
  }).catch(() => null);
  const json = (await res?.json().catch(() => ({}))) as { idToken?: string; displayName?: string; fullName?: string; email?: string } | undefined;
  if (!res?.ok || !json?.idToken) {
    throw new Error(`Não foi possível entrar com ${provider === "apple" ? "a Apple" : "o Google"}. Tente de novo.`);
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
  const out = await exchange("google", `id_token=${encodeURIComponent(googleToken)}&providerId=google.com`);
  return { provider: "google", ...out };
}

export async function signInWithAppleProvider(): Promise<SocialCredential> {
  const Apple = await import("expo-apple-authentication");
  // Nonce: a Apple assina o hash; o Firebase confere com o valor original.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: Awaited<ReturnType<typeof Apple.signInAsync>>;
  try {
    credential = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED") throw new SocialSignInCancelled();
    throw new Error("Não foi possível abrir o login da Apple. Tente de novo ou entre com seu e-mail.");
  }
  if (!credential.identityToken) throw new Error("A Apple não devolveu sua conta. Tente de novo.");
  const out = await exchange(
    "apple",
    `id_token=${encodeURIComponent(credential.identityToken)}&providerId=apple.com&nonce=${encodeURIComponent(rawNonce)}`,
  );
  return {
    provider: "apple",
    idToken: out.idToken,
    name: appleFullName(credential.fullName) ?? out.name,
    email: credential.email ?? out.email,
  };
}

/** "Ana" + "Souza" → "Ana Souza". A Apple manda nome só no primeiro login. */
export function appleFullName(n: { givenName?: string | null; middleName?: string | null; familyName?: string | null } | null | undefined): string | null {
  const full = [n?.givenName, n?.middleName, n?.familyName].filter((p) => p && p.trim()).join(" ").trim();
  return full || null;
}

import { existsSync } from "node:fs";
import type { ConfigContext, ExpoConfig } from "expo/config";

// Push (FCM): os arquivos do projeto Firebase NÃO são versionados. Quando
// existirem em ./firebase/, entram no build; sem eles o app funciona e só não
// registra push (lib/push.ts detecta via `extra.pushConfigured`).
const ANDROID_FIREBASE = "./firebase/google-services.json";
const IOS_FIREBASE = "./firebase/GoogleService-Info.plist";

// Entrar com Google: só aparece quando os IDs OAuth existem (Google Cloud →
// Credenciais). Sem eles o botão some e o resto do login funciona igual.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
// Mesma chave pública do web (NEXT_PUBLIC_FIREBASE_API_KEY): troca o token do
// Google por um token do Firebase, que o servidor já aceita em /auth/google.
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";

/** "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc" */
function reversedClientId(id: string): string {
  return id.split(".").reverse().join(".");
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const android = existsSync(ANDROID_FIREBASE);
  const ios = existsSync(IOS_FIREBASE);
  const google = Boolean(GOOGLE_WEB_CLIENT_ID && FIREBASE_API_KEY);
  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(android ? { googleServicesFile: ANDROID_FIREBASE } : {}) },
    ios: { ...config.ios, ...(ios ? { googleServicesFile: IOS_FIREBASE } : {}) },
    plugins: [
      ...(config.plugins ?? []),
      ["expo-image-picker", { photosPermission: "O Servos usa suas fotos só para a foto do seu perfil." }],
      ...(GOOGLE_IOS_CLIENT_ID
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme: reversedClientId(GOOGLE_IOS_CLIENT_ID) }] as [string, unknown]]
        : []),
    ],
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://servos-server.vercel.app",
      pushConfigured: { android, ios },
      google: google ? { webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID, firebaseApiKey: FIREBASE_API_KEY } : null,
    },
  };
};

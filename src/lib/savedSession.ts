import * as SecureStore from "expo-secure-store";

/** Onde o token da sessão fica no aparelho (Keychain/Keystore). */
export const TOKEN_KEY = "servos.session";

export async function hasSavedSession(): Promise<boolean> {
  try {
    return Boolean(await SecureStore.getItemAsync(TOKEN_KEY));
  } catch {
    return false;
  }
}

import Constants from "expo-constants";
import type { TextInputProps } from "react-native";

/** Build dos testes ponta a ponta (perfil "e2e" do eas.json, contra a API de mock). */
export const isE2E = Constants.expoConfig?.extra?.e2e === true;

/**
 * Campo de senha nova. No build de E2E fica sem a sugestão de senha forte do
 * iOS, que cobre o campo no simulador e engole o que o Maestro digita.
 */
export const newPasswordProps: Pick<TextInputProps, "autoComplete" | "textContentType"> = isE2E
  ? { autoComplete: "current-password", textContentType: "password" }
  : { autoComplete: "new-password", textContentType: "newPassword" };

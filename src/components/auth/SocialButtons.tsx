import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { GoogleLogoIcon } from "@/components/ui/icons";
import {
  appleAvailable,
  googleConfig,
  signInWithAppleProvider,
  signInWithGoogleProvider,
  SocialSignInCancelled,
  type SocialCredential,
  type SocialProvider,
} from "@/lib/socialAuth";
import { buttonHeight, radius } from "@/theme/tokens";

/** Quais provedores aparecem neste aparelho. `null` = ainda conferindo. */
export function useSocialProviders(): { google: boolean; apple: boolean | null } {
  const [apple, setApple] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void appleAvailable().then((ok) => alive && setApple(ok));
    return () => {
      alive = false;
    };
  }, []);
  return { google: Boolean(googleConfig()), apple };
}

// Botões de Apple e Google. A Apple exige o botão DELA (visual e texto do
// sistema, na língua do aparelho) e pelo menos o mesmo destaque do Google
// (App Store 4.8) — por isso vem primeiro.
export function SocialButtons({
  onCredential,
  onError,
  disabled,
}: {
  /** Recebe o token do Firebase e o nome/e-mail da conta. */
  onCredential: (credential: SocialCredential) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const providers = useSocialProviders();
  const scheme = useColorScheme();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [AppleButton, setAppleButton] = useState<null | typeof import("expo-apple-authentication")>(null);

  useEffect(() => {
    if (providers.apple) void import("expo-apple-authentication").then(setAppleButton);
  }, [providers.apple]);

  const run = async (provider: SocialProvider) => {
    if (busy || disabled) return;
    setBusy(provider);
    try {
      const credential = provider === "apple" ? await signInWithAppleProvider() : await signInWithGoogleProvider();
      await onCredential(credential);
    } catch (error) {
      if (!(error instanceof SocialSignInCancelled)) onError(error instanceof Error ? error.message : "Não foi possível entrar. Tente de novo.");
    } finally {
      setBusy(null);
    }
  };

  if (!providers.google && !providers.apple) return null;
  return (
    <View style={styles.wrap}>
      {providers.apple && AppleButton ? (
        <View style={busy || disabled ? styles.dimmed : null} pointerEvents={busy || disabled ? "none" : "auto"}>
          <AppleButton.AppleAuthenticationButton
            buttonType={AppleButton.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              scheme === "dark" ? AppleButton.AppleAuthenticationButtonStyle.WHITE : AppleButton.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.md}
            style={styles.apple}
            onPress={() => void run("apple")}
          />
        </View>
      ) : null}
      {providers.google ? (
        <Button
          label="Continuar com Google"
          icon={GoogleLogoIcon}
          variant="secondary"
          size="lg"
          fullWidth
          loading={busy === "google"}
          disabled={Boolean(disabled || (busy && busy !== "google"))}
          onPress={() => void run("google")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  apple: { width: "100%", height: buttonHeight.lg },
  dimmed: { opacity: 0.5 },
});

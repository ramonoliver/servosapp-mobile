import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { googleConfig, signInWithGoogleProvider, SocialSignInCancelled, type SocialCredential } from "@/lib/socialAuth";
import { GoogleLogo } from "./GoogleLogo";

/** Quais provedores aparecem neste aparelho. */
export function useSocialProviders(): { google: boolean } {
  return { google: Boolean(googleConfig()) };
}

// Botão "Continuar com o Google": o G colorido e o texto que as diretrizes
// do Google pedem, no estilo do botão secundário do app.
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
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onCredential(await signInWithGoogleProvider());
    } catch (error) {
      if (!(error instanceof SocialSignInCancelled)) onError(error instanceof Error ? error.message : "Não foi possível entrar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  if (!googleConfig()) return null;
  return (
    <Button
      label="Continuar com o Google"
      icon={GoogleLogo}
      variant="secondary"
      size="lg"
      fullWidth
      loading={busy}
      disabled={disabled}
      onPress={() => void run()}
    />
  );
}

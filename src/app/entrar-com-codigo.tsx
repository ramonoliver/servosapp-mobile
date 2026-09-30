import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { track } from "@/lib/analytics";
import { color, font, gutter, hitSize, radius, space } from "@/theme/tokens";

const RESEND_SECONDS = 45;

// Entrar sem senha (§52): e-mail → código de 6 dígitos → entra. O servidor
// responde igual exista ou não a conta, então a tela também não revela.
export default function EmailCodeScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signInWithCode } = useSession();
  const [email, setEmail] = useState(params.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Informe um e-mail válido.");
    setBusy(true);
    setError(null);
    try {
      await endpoints.requestLoginCode(email);
      setSentTo(email.trim().toLowerCase());
      setCode("");
      setWait(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (busy || value.length !== 6 || !sentTo) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithCode(sentTo, value);
      track("login_succeeded", { method: "email_code" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível entrar. Tente novamente.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const onCode = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void verify(digits);
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <View style={styles.head}>
          <Text variant="display" accessibilityRole="header">
            {sentTo ? "Digite o código" : "Entrar sem senha"}
          </Text>
          <Text variant="body" color="foregroundSecondary">
            {sentTo
              ? `Se houver uma conta com ${sentTo}, enviamos um código de 6 dígitos. Ele vale por 10 minutos.`
              : "Vamos mandar um código de 6 dígitos para o seu e-mail. É só digitar aqui para entrar."}
          </Text>
        </View>

        {!sentTo ? (
          <>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="send"
              onSubmitEditing={send}
              error={error}
              autoFocus={!params.email}
            />
            <Button label="Enviar código" size="lg" fullWidth loading={busy} onPress={send} />
          </>
        ) : (
          <>
            <View>
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={onCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                accessibilityLabel="Código de 6 dígitos"
                style={styles.hidden}
                caretHidden
              />
              <View style={styles.boxes} onTouchEnd={() => codeRef.current?.focus()} accessible={false} importantForAccessibility="no-hide-descendants">
                {Array.from({ length: 6 }, (_, i) => {
                  const active = i === code.length && !busy;
                  return (
                    <View key={i} style={[styles.box, active ? styles.boxActive : null, error ? styles.boxError : null]}>
                      <Text style={styles.digit}>{code[i] ?? ""}</Text>
                    </View>
                  );
                })}
              </View>
              {error ? (
                <Text variant="label" color="danger" style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
            </View>
            <Button label="Entrar" size="lg" fullWidth loading={busy} disabled={code.length !== 6} onPress={() => void verify()} />
            <View style={styles.row}>
              <Button label="Trocar e-mail" variant="ghost" onPress={() => { setSentTo(null); setError(null); }} />
              <Button
                label={wait > 0 ? `Reenviar em ${wait}s` : "Reenviar código"}
                variant="ghost"
                disabled={wait > 0 || busy}
                onPress={send}
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { padding: gutter, gap: space[5] },
  head: { gap: space[2] },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  boxes: { flexDirection: "row", gap: space[2], justifyContent: "space-between" },
  box: {
    flex: 1,
    height: hitSize + 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: color.primary },
  boxError: { borderColor: color.danger },
  digit: { fontFamily: font.semibold, fontSize: 24, color: color.foreground, fontVariant: ["tabular-nums"] },
  error: { marginTop: space[2] },
  row: { flexDirection: "row", justifyContent: "space-between" },
});

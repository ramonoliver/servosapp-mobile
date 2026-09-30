import { router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { EnvelopeSimpleIcon, GoogleLogoIcon, InfoIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { track } from "@/lib/analytics";
import { GoogleSignInCancelled, googleConfig, googleFirebaseIdToken } from "@/lib/google";
import { color, gutter, radius, space } from "@/theme/tokens";

function loginError(e: unknown): string {
  if (e instanceof ApiError && e.code === "JOIN_REJECTED") return e.message;
  if (e instanceof ApiError && (e.status === 401 || e.status === 400)) return "E-mail ou senha incorretos.";
  if (e instanceof ApiError) return e.message;
  return e instanceof Error ? e.message : "Não foi possível entrar. Tente novamente.";
}

// Login (§52): e-mail e senha como caminho principal; sem senha (código por
// e-mail) e Google como alternativas; e, para quem chega pela primeira vez,
// a entrada pelo código da igreja.
export default function LoginScreen() {
  const { signIn, signInWithGoogle, signedOutReason } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const google = googleConfig();

  const submit = async () => {
    if (submitting) return;
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      track("login_succeeded", { method: "password" });
    } catch (e) {
      setError(loginError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const withGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      await signInWithGoogle(await googleFirebaseIdToken());
      track("login_succeeded", { method: "google" });
    } catch (e) {
      if (!(e instanceof GoogleSignInCancelled)) setError(loginError(e));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo size={52} />
            <Text variant="display" accessibilityRole="header" style={styles.title}>
              Entrar no Servos
            </Text>
            <Text variant="body" color="foregroundSecondary">
              Suas escalas, confirmações e equipe num só lugar.
            </Text>
          </View>

          {signedOutReason ? (
            <View style={styles.notice} accessibilityRole="alert">
              <InfoIcon size={18} color={color.info} weight="bold" />
              <Text variant="label" color="info" style={styles.flex}>
                {signedOutReason}
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error}
            />
            <View style={styles.forgot}>
              <Button label="Esqueci minha senha" variant="ghost" onPress={() => router.push("/esqueci-senha")} />
            </View>
          </View>

          <Button label="Entrar" size="lg" fullWidth loading={submitting} onPress={submit} />

          <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.rule} />
            <Text variant="caption" color="mutedForeground">
              ou entre sem senha
            </Text>
            <View style={styles.rule} />
          </View>

          <View style={styles.alternatives}>
            {google ? (
              <Button label="Continuar com Google" icon={GoogleLogoIcon} variant="secondary" size="lg" fullWidth loading={googleBusy} onPress={withGoogle} />
            ) : null}
            <Button
              label="Receber código por e-mail"
              icon={EnvelopeSimpleIcon}
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.push({ pathname: "/entrar-com-codigo", params: email.trim() ? { email: email.trim() } : {} })}
            />
          </View>

          <View style={styles.newHere}>
            <Text variant="label" color="foregroundSecondary">
              Primeira vez no Servos?
            </Text>
            <Button label="Entrar com o código da igreja" variant="ghost" onPress={() => router.push("/entrar")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: gutter, gap: space[4] },
  brand: { gap: space[2], marginBottom: space[4] },
  title: { marginTop: space[5] },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    backgroundColor: color.infoSoft,
    padding: space[3],
    borderRadius: radius.md,
  },
  form: { gap: space[4] },
  forgot: { alignSelf: "flex-end", marginTop: -space[2] },
  divider: { flexDirection: "row", alignItems: "center", gap: space[3], marginVertical: space[1] },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.borderStrong },
  alternatives: { gap: space[3] },
  newHere: { alignItems: "center", marginTop: space[4] },
});

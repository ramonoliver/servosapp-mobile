import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { EnvelopeSimpleIcon } from "@/components/ui/icons";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { space } from "@/theme/tokens";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await endpoints.forgotPassword(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Screen edges={[]}>
        <EmptyState
          icon={EnvelopeSimpleIcon}
          title="Confira seu e-mail"
          description={`Se ${email.trim()} tiver uma conta no Servos, você vai receber um link para criar uma nova senha.`}
          actionLabel="Voltar para o login"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View style={styles.head}>
        <Text variant="display" accessibilityRole="header">
          Esqueceu a senha?
        </Text>
        <Text variant="body" color="foregroundSecondary">
          Enviamos um link para você criar uma nova.
        </Text>
      </View>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={submit}
        error={error}
      />
      <Button label="Enviar link" size="lg" fullWidth loading={submitting} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({ head: { gap: space[2], marginVertical: space[4] } });

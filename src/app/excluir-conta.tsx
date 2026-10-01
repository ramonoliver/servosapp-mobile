import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { color, gutter, space } from "@/theme/tokens";

const WORD = "EXCLUIR";

const WHAT_HAPPENS = [
  "Seu login deixa de existir — inclusive pelo Google ou pela Apple.",
  "Seu nome, e-mail, celular, foto e data de nascimento são apagados.",
  "Você sai de todos os ministérios e células, em todas as igrejas.",
  "Suas próximas escalas são canceladas e a liderança vê a vaga aberta.",
  "Nas escalas que já aconteceram, aparece “Pessoa removida”.",
];

// Excluir a própria conta (App Store 5.1.1(v), Google Play, LGPD). Não tem
// volta: a confirmação é digitar a palavra, não só um toque.
export default function DeleteAccountScreen() {
  const { signOut } = useSession();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = typed.trim().toUpperCase() === WORD;

  const remove = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await endpoints.deleteAccount();
      await signOut("Sua conta foi excluída. Se quiser voltar, é só se cadastrar de novo com o código da igreja.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível excluir sua conta agora. Tente novamente.");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <View style={styles.head}>
          <Text variant="title" accessibilityRole="header">
            Excluir sua conta do Servos
          </Text>
          <Text variant="body" color="foregroundSecondary">
            Isso não pode ser desfeito.
          </Text>
        </View>

        <Card style={styles.list}>
          {WHAT_HAPPENS.map((line) => (
            <View key={line} style={styles.item}>
              <View style={styles.bullet} />
              <Text variant="label" style={styles.flex}>
                {line}
              </Text>
            </View>
          ))}
        </Card>

        <Text variant="caption" color="mutedForeground">
          Se você só quer parar de servir em um ministério, fale com a liderança — não precisa excluir a conta.
        </Text>

        <TextField
          label={`Para confirmar, digite ${WORD}`}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={remove}
          error={error}
        />
        <Button label="Excluir minha conta" variant="destructive" size="lg" fullWidth loading={busy} disabled={!ready} onPress={remove} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { padding: gutter, paddingBottom: space[12], gap: space[5] },
  head: { gap: space[2] },
  list: { gap: space[3] },
  item: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.danger, marginTop: 8 },
});

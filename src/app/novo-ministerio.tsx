import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { ministryNameError, parseFunctionNames } from "@/features/leader/newMinistry";
import { errorText, useRefreshLeaderData } from "@/features/leader/queries";
import { color, gutter, space } from "@/theme/tokens";

// Novo ministério (admin, pastor, coordenação). Quem cria entra como líder,
// para já montar a equipe e as escalas. Funções são opcionais aqui e podem
// ser ajustadas depois na aba Funções do ministério.
export default function NewMinistryScreen() {
  const { user } = useSession();
  const toast = useToast();
  const refresh = useRefreshLeaderData();
  const [name, setName] = useState("");
  const [functions, setFunctions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving || !user) return;
    const problem = ministryNameError(name);
    if (problem) return setError(problem);
    setError(null);
    setSaving(true);
    try {
      const { id } = await endpoints.createMinistry({ name, leaderId: user.id });
      const names = parseFunctionNames(functions);
      // Uma função que falhe não desfaz o ministério: o líder completa na aba Funções.
      const results = await Promise.allSettled(names.map((n) => endpoints.ministryFunction(id, { action: "create", name: n })));
      const missed = results.filter((r) => r.status === "rejected").length;
      refresh({ ministryId: id });
      toast.show({
        kind: "success",
        title: "Ministério criado",
        description: missed ? `${missed === 1 ? "1 função não foi criada" : `${missed} funções não foram criadas`}. Confira na aba Funções.` : "Agora adicione a equipe e monte a primeira escala.",
      });
      router.replace({ pathname: "/ministerio/[id]", params: { id } });
    } catch (e) {
      toast.show({ kind: "error", title: "Não foi possível criar", description: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        <TextField
          label="Nome"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(null);
          }}
          placeholder="Ex.: Louvor, Recepção, Mídia"
          autoCapitalize="words"
          maxLength={60}
          error={error}
          autoFocus
        />
        <TextField
          label="Funções (opcional)"
          value={functions}
          onChangeText={setFunctions}
          placeholder="Ex.: Vocal, Violão, Bateria"
          multiline
        />
        <Text variant="caption" color="mutedForeground">
          Separe por vírgula. São os lugares que as pessoas ocupam na escala. Você entra como líder do ministério.
        </Text>
        <Button label="Criar ministério" size="lg" fullWidth loading={saving} onPress={() => void submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { padding: gutter, paddingBottom: space[12], gap: space[5] },
});

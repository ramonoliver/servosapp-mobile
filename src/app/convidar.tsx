import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowsClockwiseIcon, PaperPlaneTiltIcon, UserPlusIcon } from "@/components/ui/icons";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { color, font, radius, space, fixed } from "@/theme/tokens";
import { track } from "@/lib/analytics";

// Convidar (admin e liderança): código fixo da igreja + link/QR de quem
// convida (entra pendente, aprovado por quem convidou ou pela administração)
// e convite pessoal (entra direto).
export default function InviteScreen() {
  const { ministryId } = useLocalSearchParams<{ ministryId?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["invite", ministryId ?? ""] as const;
  const info = useQuery({ queryKey: key, queryFn: () => endpoints.inviteInfo(ministryId) });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [personError, setPersonError] = useState<string | null>(null);

  const person = useMutation({
    mutationFn: () => endpoints.invitePerson({ name: name.trim(), email: email.trim() || null, ministryId: ministryId ?? null }),
    onSuccess: async (res) => {
      setName("");
      setEmail("");
      track("invite_shared", { kind: "person", withEmail: Boolean(email.trim()) });
      await Share.share({ message: res.message });
    },
    onError: (e) => setPersonError(errorText(e)),
  });

  const regenerate = useMutation({
    mutationFn: endpoints.regenerateJoinCode,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["invite"] });
      toast.show({ kind: "success", title: `Novo código: ${res.codeFormatted}` });
    },
    onError: (e) => toast.show({ kind: "error", title: errorText(e) }),
  });

  if (info.isError) return <ErrorState message={errorText(info.error)} onRetry={() => void info.refetch()} />;

  const data = info.data;
  const confirmRegenerate = () =>
    Alert.alert(
      "Trocar o código da igreja?",
      "O código atual e todos os links já enviados param de funcionar. Quem já entrou não é afetado.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Trocar código", style: "destructive", onPress: () => regenerate.mutate() },
      ],
    );

  const sendPerson = () => {
    if (name.trim().length < 2) return setPersonError("Informe o nome da pessoa.");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setPersonError("E-mail inválido.");
    setPersonError(null);
    person.mutate();
  };

  return (
    <Screen edges={[]}>
      <Text variant="body" color="foregroundSecondary">
        {data?.ministry
          ? `Quem entrar por este convite já fica no ${data.ministry.name}.`
          : "Mande o convite para quem vai servir. A pessoa baixa o app e já cai na sua igreja."}
      </Text>

      <Card style={styles.hero}>
        <Text variant="overline" color="mutedForeground">
          Código da igreja
        </Text>
        {data ? (
          <Text style={styles.code} accessibilityLabel={`Código da igreja: ${data.code.split("").join(" ")}`} selectable>
            {data.codeFormatted}
          </Text>
        ) : (
          <Skeleton width={180} height={44} />
        )}
        <View style={styles.qr} accessible accessibilityLabel="QR code do convite">
          {data ? <QRCode value={data.url} size={168} color={fixed.ink} backgroundColor={fixed.paper} /> : <Skeleton width={168} height={168} />}
        </View>
        <Text variant="caption" color="mutedForeground" align="center">
          Aponte a câmera do celular para o QR code ou digite o código no app.
        </Text>
        <Button
          label="Compartilhar convite"
          icon={PaperPlaneTiltIcon}
          size="lg"
          fullWidth
          disabled={!data}
          onPress={() => {
            if (!data) return;
            track("invite_shared", { kind: "link", ministry: Boolean(data.ministry) });
            void Share.share({ message: data.message });
          }}
        />
        <Text variant="caption" color="foregroundSecondary" align="center">
          Quem entrar pelo código ou por este link aguarda a sua aprovação ou a da administração.
        </Text>
      </Card>

      <SectionHeader title="Convite pessoal" />
      <Card style={styles.person}>
        <View style={styles.personHead}>
          <UserPlusIcon size={22} color={color.foregroundSecondary} />
          <Text variant="label" color="foregroundSecondary" style={styles.flex}>
            Para alguém específico. Vale uma vez, por 14 dias, e a pessoa entra direto, sem aprovação.
          </Text>
        </View>
        <TextField label="Nome" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="off" />
        <TextField
          label="E-mail (opcional)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="off"
          hint="Com e-mail, só essa pessoa consegue usar o convite."
          error={personError}
        />
        <Button label="Criar convite e compartilhar" variant="secondary" fullWidth loading={person.isPending} onPress={sendPerson} />
      </Card>

      {data?.canRegenerateCode ? (
        <Button label="Trocar o código da igreja" icon={ArrowsClockwiseIcon} variant="ghost" loading={regenerate.isPending} onPress={confirmRegenerate} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: space[3], paddingVertical: space[6] },
  code: { fontFamily: font.semibold, fontSize: 36, lineHeight: 44, letterSpacing: 4, fontVariant: ["tabular-nums"], color: color.foreground },
  qr: { padding: space[3], borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  person: { gap: space[4] },
  personHead: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
});

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { JoinLookup } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { PasteCodeButton } from "@/components/join/PasteCodeButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChurchIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { codeFromClipboard, codeProblem, isCompleteCode, maskCode, normalizeCode, parseInviteLink } from "@/features/join/join";
import { track } from "@/lib/analytics";
import { color, gutter, radius, space } from "@/theme/tokens";

const problemText = (e: unknown) => (e instanceof ApiError ? e.message : "Não foi possível verificar o código. Tente novamente.");

// Quem já tem conta entra em mais uma igreja com o código (ou o link) dela.
// Mesmo login; na outra igreja nasce um perfil próprio, que a liderança de
// lá aprova. Depois é só trocar de igreja no Perfil.
export default function JoinAnotherChurchScreen() {
  const params = useLocalSearchParams<{ c?: string; i?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const { switchChurch } = useSession();
  const fromLink = Boolean(params.c && isCompleteCode(normalizeCode(params.c)));
  const [code, setCode] = useState(() => maskCode(params.c ?? ""));
  const [invite, setInvite] = useState<string | null>(params.i ?? null);
  const [manual, setManual] = useState<JoinLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const auto = useQuery({
    queryKey: ["join-lookup", params.c ?? "", params.i ?? ""],
    queryFn: () => endpoints.joinLookup(normalizeCode(params.c ?? ""), params.i ?? null),
    enabled: fromLink,
    retry: false,
    gcTime: 0,
  });
  const lookup = manual ?? (dismissed ? null : auto.data ?? null);

  const check = async (raw: string, inviteToken: string | null) => {
    const c = normalizeCode(raw);
    const problem = codeProblem(c);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    setDismissed(true);
    try {
      setManual(await endpoints.joinLookup(c, inviteToken));
    } catch (e) {
      setError(problemText(e));
    } finally {
      setBusy(false);
    }
  };

  const onCodeChange = (text: string) => {
    const link = parseInviteLink(text);
    if (link) {
      setCode(maskCode(link.code));
      setInvite(link.invite);
      void check(link.code, link.invite);
      return;
    }
    setCode(maskCode(text));
    setError(null);
  };

  const onPaste = (text: string) => {
    const found = codeFromClipboard(text);
    if (!found) return setError("Não achamos um código no que você copiou. Digite as 6 letras e números.");
    setCode(maskCode(found.code));
    setInvite(found.invite);
    void check(found.code, found.invite);
  };

  const join = async () => {
    if (!lookup) return;
    setBusy(true);
    setError(null);
    try {
      const res = await endpoints.joinAnotherChurch(lookup.church.code, invite);
      qc.setQueryData(["my-churches"], { items: res.items });
      track("church_join_requested", { status: res.status });
      if (res.status === "approved") {
        Alert.alert(`Você entrou na ${res.church.name}`, "Quer abrir essa igreja agora? Dá para trocar a qualquer momento no Perfil.", [
          { text: "Depois", style: "cancel", onPress: () => router.back() },
          { text: "Abrir agora", onPress: () => void switchChurch(res.church.id).catch((e) => setError(problemText(e))) },
        ]);
      } else {
        toast.show({ kind: "success", title: "Pedido enviado", description: `A liderança da ${res.church.name} vai confirmar. Você recebe o aviso aqui.` });
        router.back();
      }
    } catch (e) {
      setError(problemText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <Text variant="body" color="foregroundSecondary">
          Serve em mais de uma igreja? Use o código ou o link que a liderança de lá passou. Você continua entrando com o mesmo e-mail.
        </Text>

        {!lookup ? (
          <>
            <TextField
              label="Código da igreja"
              value={code}
              onChangeText={onCodeChange}
              placeholder="ABC-123"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={200}
              returnKeyType="go"
              onSubmitEditing={() => void check(code, invite)}
              error={error ?? (auto.error && !dismissed ? problemText(auto.error) : null)}
              hint="São 6 letras e números. Pode colar o link do convite."
              style={styles.codeInput}
            />
            <PasteCodeButton onPaste={onPaste} />
            <Button label="Continuar" size="lg" fullWidth loading={busy || auto.isFetching} onPress={() => void check(code, invite)} />
          </>
        ) : (
          <>
            <Card style={styles.church}>
              <View style={styles.churchIcon}>
                <ChurchIcon size={24} color={color.primaryText} weight="duotone" />
              </View>
              <View style={styles.flex}>
                <Text variant="heading">{lookup.church.name}</Text>
                <Text variant="label" color="foregroundSecondary">
                  {lookup.invite
                    ? `Convite de ${lookup.invite.inviterName.split(" ")[0]}`
                    : [lookup.church.city, `Código ${maskCode(lookup.church.code)}`].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Button
                label="Trocar"
                variant="ghost"
                onPress={() => {
                  setManual(null);
                  setInvite(null);
                  setCode("");
                  setDismissed(true);
                }}
              />
            </Card>
            {error ? (
              <Text variant="label" color="danger" accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Button
              label={lookup.invite?.kind === "person" ? "Entrar nesta igreja" : "Pedir para entrar"}
              size="lg"
              fullWidth
              loading={busy}
              onPress={join}
            />
            <Text variant="caption" color="mutedForeground" align="center">
              {lookup.invite?.kind === "person"
                ? "Convite pessoal: você entra direto."
                : "A liderança confirma o pedido. Enquanto isso, sua igreja atual continua igual."}
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { padding: gutter, paddingBottom: space[12], gap: space[5] },
  codeInput: { fontSize: 22, letterSpacing: 3 },
  church: { flexDirection: "row", alignItems: "center", gap: space[3] },
  churchIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center" },
});

import { useEffect, useState } from "react";
import { Alert, AppState, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { ClockIcon, XCircleIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { pendingHeadline } from "@/features/join/join";
import { color, gutter, radius, space } from "@/theme/tokens";

const POLL_MS = 30_000;

// Cadastro enviado, aguardando a liderança. Confere sozinho ao voltar para o
// app e a cada 30 s; aprovado → entra direto (sem pedir a senha de novo).
export default function PendingScreen() {
  const { pending, refreshPending, leavePending } = useSession();
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const tick = () => void refreshPending().catch(() => {});
    tick();
    const timer = setInterval(tick, POLL_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
    // Só na montagem: refreshPending muda a cada atualização do pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pending) return null;
  const rejected = Boolean(pending.rejectedMessage);
  const head = pendingHeadline(pending);

  const checkNow = async () => {
    setChecking(true);
    try {
      const status = await refreshPending();
      if (status === "pending") toast.show({ kind: "success", title: "Ainda aguardando", description: "Você entra assim que for aprovado." });
    } catch (e) {
      toast.show({ kind: e instanceof ApiError && e.isNetwork ? "offline" : "error", title: e instanceof Error ? e.message : "Tente novamente." });
    } finally {
      setChecking(false);
    }
  };

  const leave = () =>
    Alert.alert("Sair deste aparelho?", "Seu cadastro continua. Depois é só entrar com seu e-mail e senha.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void leavePending() },
    ]);

  return (
    <SafeAreaView style={styles.fill}>
      <View style={styles.content}>
        <View style={[styles.badge, rejected ? styles.badgeRejected : null]}>
          {rejected ? (
            <XCircleIcon size={36} color={color.danger} weight="duotone" />
          ) : (
            <ClockIcon size={36} color={color.primaryText} weight="duotone" />
          )}
        </View>
        <Text variant="display" align="center" accessibilityRole="header">
          {rejected ? "Cadastro não aprovado" : head.title}
        </Text>
        {pending.churchName ? (
          <Text variant="heading" align="center" color="foregroundSecondary">
            {pending.churchName}
          </Text>
        ) : null}
        <Text variant="body" align="center" color="foregroundSecondary" accessibilityLiveRegion="polite">
          {rejected ? pending.rejectedMessage : head.body}
        </Text>
      </View>
      <View style={styles.actions}>
        {rejected ? (
          <Button label="Voltar ao início" size="lg" fullWidth onPress={() => void leavePending()} />
        ) : (
          <>
            <Button label="Verificar agora" variant="secondary" size="lg" fullWidth loading={checking} onPress={checkNow} />
            <Button label="Sair deste aparelho" variant="ghost" fullWidth onPress={leave} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: gutter, gap: space[3] },
  badge: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: color.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[3],
  },
  badgeRejected: { backgroundColor: color.dangerSoft },
  actions: { paddingHorizontal: gutter, paddingBottom: space[6], gap: space[2] },
});

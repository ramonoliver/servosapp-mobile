import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/Button";
import { Mascot } from "@/components/brand/Mascot";
import { CalendarBlankIcon, CheckCircleIcon, HandsPrayingIcon, type Icon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { useOnboarding } from "@/lib/onboarding";
import { getPermissionState, pushAvailability, registerDevice, requestPermission } from "@/lib/push";
import { color, gutter, radius, space } from "@/theme/tokens";

/**
 * Onboarding (§53): 1) o que é o Servos; 2) push com contexto ANTES do prompt
 * nativo (§54) — só quando o aparelho realmente pode receber. Depois a Home
 * já mostra a próxima ação.
 */
export default function OnboardingScreen() {
  const { user } = useSession();
  const { complete } = useOnboarding();
  const [step, setStep] = useState<"welcome" | "push">("welcome");
  const [busy, setBusy] = useState(false);
  const firstName = (user?.name ?? "").split(" ")[0];

  const next = async () => {
    const canPush = pushAvailability() === "ready" && (await getPermissionState()) === "undetermined";
    if (canPush) setStep("push");
    else await complete();
  };

  const enablePush = async () => {
    setBusy(true);
    const state = await requestPermission();
    if (state === "granted") await registerDevice();
    setBusy(false);
    await complete();
  };

  return (
    <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
      <View style={styles.progress} accessibilityLabel={`Passo ${step === "welcome" ? 1 : 2}`}>
        <View style={[styles.dot, styles.dotOn]} />
        <View style={[styles.dot, step === "push" ? styles.dotOn : null]} />
      </View>

      {step === "welcome" ? (
        <View style={styles.body}>
          <Mascot pose="confirma" height={120} style={styles.mascot} />
          <Text variant="display" accessibilityRole="header">
            {firstName ? `Olá, ${firstName}!` : "Olá!"}
          </Text>
          <Text variant="body" color="foregroundSecondary">
            O Servos organiza onde e quando você serve.
          </Text>
          <View style={styles.points}>
            <Point icon={CalendarBlankIcon} title="Suas escalas num só lugar" text="Dia, horário de chegada, local e sua função." />
            <Point icon={CheckCircleIcon} title="Confirme com um toque" text="Seu líder sabe na hora que pode contar com você." />
            <Point icon={HandsPrayingIcon} title="Não vai poder servir?" text="Avise pelo app e peça substituição sem constrangimento." />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <Mascot pose="aviso" height={200} style={styles.mascotCenter} />
          <Text variant="display" accessibilityRole="header">
            Não perca nenhuma escala
          </Text>
          <Text variant="body" color="foregroundSecondary">
            Receba avisos quando você for escalado ou quando houver alguma alteração.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {step === "welcome" ? (
          <Button label="Começar" size="lg" fullWidth onPress={next} />
        ) : (
          <>
            <Button label="Ativar notificações" size="lg" fullWidth loading={busy} onPress={enablePush} />
            <Button label="Agora não" variant="ghost" fullWidth disabled={busy} onPress={complete} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Point({ icon: IconComponent, title, text }: { icon: Icon; title: string; text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <IconComponent size={22} color={color.primaryText} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="label" color="foregroundSecondary">
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background, paddingHorizontal: gutter },
  flex: { flex: 1 },
  progress: { flexDirection: "row", gap: space[2], paddingTop: space[4] },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.border },
  dotOn: { backgroundColor: color.primary },
  body: { flex: 1, justifyContent: "center", gap: space[3] },
  points: { gap: space[5], marginTop: space[6] },
  point: { flexDirection: "row", gap: space[4], alignItems: "flex-start" },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: { marginBottom: space[2], marginLeft: -space[2] },
  mascotCenter: { alignSelf: "center", marginBottom: space[4] },
  footer: { gap: space[1], paddingBottom: space[4] },
});

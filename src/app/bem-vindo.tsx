import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AssignmentCard } from "@/api/contracts";
import { Logo } from "@/components/brand/Logo";
import { LivelyMascot, Mascot } from "@/components/brand/Mascot";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircleIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Text } from "@/components/ui/Text";
import { addDays, churchToday, parseDay } from "@/features/schedules/format";
import { useIntro } from "@/lib/intro";
import { color, gutter, radius, space } from "@/theme/tokens";

// Primeiro acesso (antes do login): boas-vindas com o Servo (o mascote do
// site) e três telas curtas sobre o que o app faz, ilustradas com os próprios
// componentes do app (o que a pessoa vai ver de verdade) e o mascote junto.
// No fim, a saída para entrar ou usar o código da igreja.

const SLIDES = [
  {
    key: "oi",
    title: "Bem-vindo ao Servos",
    body: "Chega de caçar a escala no grupo. Onde e quando você serve, num só lugar.",
  },
  {
    key: "escalas",
    title: "Suas escalas num só lugar",
    body: "Quando, onde e em que função você serve. Sem caçar mensagem no grupo.",
  },
  {
    key: "confirmar",
    title: "Confirme com um toque",
    body: "Sua liderança sabe na hora que pode contar com você.",
  },
  {
    key: "imprevisto",
    title: "Imprevistos acontecem",
    body: "Não vai poder servir? Avise pelo app e peça substituição, sem constrangimento.",
  },
] as const;

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const { markSeen } = useIntro();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = index === SLIDES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const finish = async (next: "/login" | "/entrar") => {
    await markSeen();
    if (next === "/entrar") router.push("/entrar");
  };

  return (
    <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Logo size={32} />
        {!last ? <Button label="Pular" variant="ghost" onPress={() => goTo(SLIDES.length - 1)} /> : <View style={styles.topSpacer} />}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.slide, { width }]} accessible={i === index} accessibilityLabel={`${s.title}. ${s.body}`}>
            <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {s.key === "oi" ? (
                <View style={styles.hello}>
                  <LivelyMascot height={Math.min(260, width * 0.62)} />
                </View>
              ) : (
                <View>
                  {s.key === "escalas" ? <ScheduleArt /> : s.key === "confirmar" ? <ConfirmArt active={index === i} /> : <SwapArt />}
                  <Mascot pose={s.key === "escalas" ? "agenda" : s.key === "confirmar" ? "confirma" : "radio"} height={92} style={styles.peek} />
                </View>
              )}
            </View>
            <View style={styles.copy}>
              <Text variant="display" accessibilityRole="header">
                {s.title}
              </Text>
              <Text variant="body" color="foregroundSecondary">
                {s.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <Dots count={SLIDES.length} index={index} />
        {last ? (
          <View style={styles.actions}>
            <Button label="Entrar" size="lg" fullWidth onPress={() => void finish("/login")} />
            <Button label="Tenho o código da igreja" variant="secondary" size="lg" fullWidth onPress={() => void finish("/entrar")} />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button label="Continuar" size="lg" fullWidth onPress={() => goTo(index + 1)} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Tela ${index + 1} de ${count}`} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index ? styles.dotOn : null]} />
      ))}
    </View>
  );
}

// ── Ilustrações: componentes reais com dados de exemplo ─────────────────────

const noop = () => {};
const sample = (over: Partial<AssignmentCard>): AssignmentCard => ({
  assignmentId: over.assignmentId ?? "x",
  scheduleId: "x",
  status: "ACCEPTED",
  scheduleStatus: "PUBLISHED",
  needsResponse: false,
  eventName: "Culto de domingo",
  ministry: { id: "m", name: "Louvor", color: null, icon: null },
  functionName: "Violão",
  date: churchToday(),
  time: "18:00",
  arrivalTime: "17:00",
  location: "Templo principal",
  reconfirmRequested: false,
  ...over,
});

/** Próximo dia da semana (0 = domingo) a partir de amanhã. */
function nextWeekday(today: string, weekday: number): string {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    if (parseDay(d).weekday === weekday) return d;
  }
  return addDays(today, 7);
}

function ScheduleArt() {
  const today = churchToday();
  const sunday = nextWeekday(today, 0);
  return (
    <View style={styles.stack} pointerEvents="none">
      <ScheduleCard card={sample({ assignmentId: "a", date: sunday })} onPress={noop} />
      <ScheduleCard
        card={sample({
          assignmentId: "b",
          date: nextWeekday(sunday, 3),
          eventName: "Culto de quarta",
          ministry: { id: "r", name: "Recepção", color: null, icon: null },
          functionName: "Recepcionista",
          status: "PENDING",
          needsResponse: true,
          time: "19:30",
          arrivalTime: "19:00",
        })}
        onPress={noop}
      />
    </View>
  );
}

/** O botão vira "Presença confirmada" quando a tela aparece (uma vez). */
function ConfirmArt({ active }: { active: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || done) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      Animated.timing(progress, {
        toValue: 1,
        duration: reduce ? 0 : 320,
        delay: reduce ? 0 : 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => alive && setDone(true));
    });
    return () => {
      alive = false;
    };
  }, [active, done, progress]);

  return (
    <Card style={styles.confirmCard}>
      <Text variant="overline" color="heroAccent">
        Próxima escala
      </Text>
      <Text variant="title" color="heroForeground">
        Domingo, 18h
      </Text>
      <Text variant="label" color="heroSecondary">
        Louvor · Violão · chegada 17h
      </Text>
      <View style={styles.confirmSlot}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <View style={styles.fakeButton}>
            <Text variant="bodyStrong" color="primaryForeground">
              Confirmar presença
            </Text>
          </View>
        </Animated.View>
        <Animated.View
          style={[
            styles.confirmed,
            { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
          ]}
        >
          <CheckCircleIcon size={22} color={color.heroSuccess} weight="fill" />
          <Text variant="bodyStrong" color="heroSuccess">
            Presença confirmada
          </Text>
        </Animated.View>
      </View>
    </Card>
  );
}

function SwapArt() {
  return (
    <Card padded={false} style={styles.swapCard}>
      <View style={styles.swapRow}>
        <Avatar name="Bianca Zoe" avatarColor="#AB153E" size={40} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">Bianca Zoe</Text>
          <Text variant="caption" color="foregroundSecondary">
            Viagem a trabalho
          </Text>
        </View>
        <StatusBadge label="Pediu troca" icon="swap" tone="warning" size="sm" />
      </View>
      <View style={styles.swapDivider} />
      <View style={styles.swapRow}>
        <Avatar name="Fernanda Frota" avatarColor="#105FA6" size={40} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">Fernanda Frota</Text>
          <Text variant="caption" color="foregroundSecondary">
            Vai no lugar da Bianca
          </Text>
        </View>
        <StatusBadge label="Confirmada" icon="check" tone="success" size="sm" />
      </View>
      <View style={styles.swapFooter}>
        <Avatar name="Ramon Oliver" avatarColor="#8B2407" size={24} />
        <Text variant="caption" color="foregroundSecondary" style={styles.flex}>
          Ramon Oliver, líder do Louvor, aprovou a troca
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: gutter, minHeight: 52 },
  topSpacer: { height: 44 },
  pager: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: gutter, justifyContent: "center", gap: space[8] },
  art: { minHeight: 260, justifyContent: "center", paddingTop: space[10] },
  hello: { alignItems: "center", justifyContent: "center" },
  // O mascote "senta" no canto de cima da ilustração.
  peek: { position: "absolute", right: 0, top: -78 },
  copy: { gap: space[3] },
  stack: { gap: space[3] },
  confirmCard: { gap: space[1], borderRadius: radius.xl, padding: space[5], backgroundColor: color.heroSurface },
  confirmSlot: { height: 52, marginTop: space[4], justifyContent: "center" },
  fakeButton: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmed: { flexDirection: "row", alignItems: "center", gap: space[2] },
  swapCard: { borderRadius: radius.xl, overflow: "hidden" },
  swapRow: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4] },
  swapFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: color.surfaceSunken,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  swapDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: 68 },
  bottom: { paddingHorizontal: gutter, paddingBottom: space[4], gap: space[5] },
  dots: { flexDirection: "row", gap: space[2], justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.borderStrong },
  dotOn: { width: 24, backgroundColor: color.primary },
  // Altura fixa: os pontos não pulam quando aparece o segundo botão.
  actions: { gap: space[3], minHeight: 52 * 2 + space[3], justifyContent: "flex-end" },
});

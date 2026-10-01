import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, View, type StyleProp, type ViewStyle } from "react-native";

// O Servo — mascote da marca (o mesmo do site servosapp.com). Só em momentos
// de boas-vindas e explicação; nunca nas telas de trabalho do dia a dia.

const POSES = {
  /** Flutuando e acenando: boas-vindas. */
  acenando: { source: require("../../../assets/mascot/acenando.png"), ratio: 542 / 600 },
  /** Com a escala na prancheta. */
  agenda: { source: require("../../../assets/mascot/agenda.png"), ratio: 317 / 225 },
  /** Crachá de voluntário e joinha. */
  confirma: { source: require("../../../assets/mascot/confirma.png"), ratio: 305 / 257 },
  /** Rádio na mão: comunicação, imprevistos. */
  radio: { source: require("../../../assets/mascot/radio.png"), ratio: 292 / 244 },
  /** Rádio e crachá, acenando: avisos. */
  aviso: { source: require("../../../assets/mascot/aviso.png"), ratio: 550 / 600 },
} as const;

export type MascotPose = keyof typeof POSES;

export function Mascot({
  pose,
  height,
  float = true,
  style,
}: {
  pose: MascotPose;
  height: number;
  /** Sobe e desce devagar (desliga com "Reduzir movimento"). */
  float?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { source, ratio } = POSES[pose];
  const width = Math.round(height * ratio);
  const [y] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!float) return;
    let loop: Animated.CompositeAnimation | null = null;
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive || reduce) return;
      const step = (to: number) =>
        Animated.timing(y, { toValue: to, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
      loop = Animated.loop(Animated.sequence([step(-6), step(0)]));
      loop.start();
    });
    return () => {
      alive = false;
      loop?.stop();
    };
  }, [float, y]);

  return (
    <View
      style={[{ width, height, alignItems: "center", justifyContent: "center" }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        <Image source={source} style={{ width, height }} contentFit="contain" transition={180} />
      </Animated.View>
    </View>
  );
}

// ── Mascote "vivo" (boas-vindas) ──────────────────────────────────────────────
// Corpo e sombra são camadas separadas: o corpo entra com um pulinho, flutua e
// acena de tempos em tempos; a sombra fica no chão e encolhe quando ele sobe.
// Tocar nele faz acenar. Com "Reduzir movimento", só aparece (sem loops).

const BODY = require("../../../assets/mascot/acenando-corpo.png");
const SHADOW = require("../../../assets/mascot/acenando-sombra.png");
const SRC_W = 542;
const SRC_BODY_H = 478;
const SRC_SHADOW_H = 122;

export function LivelyMascot({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  const scale = height / (SRC_BODY_H + SRC_SHADOW_H);
  const width = Math.round(SRC_W * scale);
  const bodyH = Math.round(SRC_BODY_H * scale);
  const shadowH = Math.round(SRC_SHADOW_H * scale);

  const [enter] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const [wave] = useState(() => new Animated.Value(0));
  const [reduce, setReduce] = useState(false);

  const waveOnce = useCallback(
    () =>
      Animated.sequence([
        Animated.timing(wave, { toValue: -1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0.8, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(wave, { toValue: -0.5, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    [wave],
  );

  useEffect(() => {
    let alive = true;
    const loops: Animated.CompositeAnimation[] = [];
    void AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (!alive) return;
      setReduce(r);
      if (r) {
        Animated.timing(enter, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        return;
      }
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(enter, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      ]).start(() => {
        if (!alive) return;
        const drift = (to: number) =>
          Animated.timing(float, { toValue: to, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
        const f = Animated.loop(Animated.sequence([drift(1), drift(0)]));
        const w = Animated.loop(Animated.sequence([waveOnce(), Animated.delay(3200)]));
        loops.push(f, w);
        f.start();
        w.start();
      });
    });
    return () => {
      alive = false;
      loops.forEach((l) => l.stop());
    };
  }, [enter, float, waveOnce]);

  const lift = height * 0.035;
  const bodyStyle = {
    opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: "clamp" }),
    transform: [
      { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [height * 0.12, 0] }), float.interpolate({ inputRange: [0, 1], outputRange: [0, -lift] })) },
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
      { rotate: wave.interpolate({ inputRange: [-1, 1], outputRange: ["-9deg", "9deg"] }) },
    ],
  } as const;
  const shadowStyle = {
    opacity: Animated.multiply(enter, float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] })),
    transform: [{ scaleX: float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }],
  } as const;

  return (
    <Pressable
      onPress={reduce ? undefined : () => waveOnce().start()}
      accessible={false}
      style={[{ width, height }, style]}
    >
      <Animated.View style={[{ width, height: bodyH, transformOrigin: "50% 70%" }, bodyStyle]}>
        <Image source={BODY} style={{ width, height: bodyH }} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[{ width, height: shadowH }, shadowStyle]}>
        <Image source={SHADOW} style={{ width, height: shadowH }} contentFit="contain" />
      </Animated.View>
    </Pressable>
  );
}

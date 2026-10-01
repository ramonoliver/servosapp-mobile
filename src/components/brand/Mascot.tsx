import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from "react-native";

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

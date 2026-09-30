import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from "react-native";
import { color, radius, space } from "@/theme/tokens";

/** Bloco de carregamento. Respeita "reduzir movimento" (sem pulso). */
export function Skeleton({ width = "100%", height = 16, rounded = radius.sm }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: color.surfacePressed, opacity }} />;
}

/** Esqueleto de um cartão de escala — usado em Início e listas. */
export function ScheduleCardSkeleton({ hero }: { hero?: boolean }) {
  return (
    <View
      style={[styles.card, hero ? { padding: space[5] } : null]}
      accessibilityLabel="Carregando"
      accessibilityRole="progressbar"
    >
      <Skeleton width={hero ? 120 : 64} height={hero ? 14 : 48} rounded={hero ? radius.sm : radius.md} />
      <View style={styles.lines}>
        <Skeleton width="70%" height={hero ? 24 : 16} />
        <Skeleton width="45%" height={14} />
        {hero ? <Skeleton width="100%" height={52} rounded={radius.md} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  lines: { gap: space[2] },
});

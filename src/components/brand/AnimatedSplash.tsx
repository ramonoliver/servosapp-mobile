import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { color, font } from "@/theme/tokens";
import { Logo } from "./Logo";

// Tamanho do símbolo no splash nativo (app.json → expo-splash-screen.imageWidth).
// O primeiro quadro daqui é idêntico ao nativo: a troca é invisível.
const MARK = 96;
const LIFT = 22;

/**
 * Abertura animada: o splash nativo some por baixo desta camada idêntica; o
 * símbolo sobe um pouco, o nome "Servos" aparece e a camada se dissolve no
 * app. ~1 s no total, só na abertura a frio. Com "Reduzir movimento", só
 * um fade curto.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [lift] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [layer] = useState(() => new Animated.Value(1));
  const [markScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      const reduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      await SplashScreen.hideAsync().catch(() => {});
      if (!alive) return;
      if (reduce) {
        Animated.timing(layer, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => onDone());
        return;
      }
      const out = Easing.out(Easing.cubic);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(lift, { toValue: 1, duration: 420, easing: out, useNativeDriver: true }),
          Animated.timing(markScale, { toValue: 0.82, duration: 420, easing: out, useNativeDriver: true }),
          Animated.timing(word, { toValue: 1, duration: 360, delay: 120, easing: out, useNativeDriver: true }),
        ]),
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(layer, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(markScale, { toValue: 0.9, duration: 260, useNativeDriver: true }),
        ]),
      ]).start(() => onDone());
    })();
    return () => {
      alive = false;
    };
  }, [ready, lift, word, layer, markScale, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer, { opacity: layer }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={{
          transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -LIFT] }) }, { scale: markScale }],
        }}
      >
        <Logo size={MARK} />
      </Animated.View>
      <View style={styles.wordSlot}>
        <Animated.Text
          style={[
            styles.word,
            {
              opacity: word,
              transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [8, -LIFT + 8] }) }],
            },
          ]}
        >
          Servos
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { backgroundColor: color.background, alignItems: "center", justifyContent: "center", zIndex: 100 },
  wordSlot: { position: "absolute", top: "50%", marginTop: MARK / 2 + 4, alignItems: "center" },
  word: { fontFamily: font.semibold, fontSize: 30, letterSpacing: -0.6, color: color.foreground },
});

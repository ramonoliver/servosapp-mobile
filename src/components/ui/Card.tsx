import { Pressable, StyleSheet, View, type ViewProps } from "react-native";
import { color, radius, space } from "@/theme/tokens";

/**
 * Cartão: folha branca sobre a "mesa" linho. Hierarquia vem de espaço e
 * contraste, não de sombra (§47).
 */
export function Card({ style, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  return <View style={[styles.card, padded ? styles.padded : null, style]} {...rest} />;
}

export function PressableCard({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  children,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  children: React.ReactNode;
  style?: ViewProps["style"];
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.card, styles.padded, pressed ? styles.pressed : null, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  padded: { padding: space[4] },
  pressed: { backgroundColor: color.surfaceSunken },
});

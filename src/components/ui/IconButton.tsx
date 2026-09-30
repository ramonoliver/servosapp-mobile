import { Pressable, StyleSheet, View } from "react-native";
import { color, hitSize, radius } from "@/theme/tokens";
import type { Icon } from "./icons";
import { Text } from "./Text";

export interface IconButtonProps {
  icon: Icon;
  /** Obrigatório: botão só com ícone precisa de nome para o leitor de tela. */
  accessibilityLabel: string;
  onPress: () => void;
  badge?: number;
  tone?: "default" | "onSurface";
}

export function IconButton({ icon: IconComponent, accessibilityLabel, onPress, badge, tone = "default" }: IconButtonProps) {
  const label = badge ? `${accessibilityLabel}, ${badge} não ${badge === 1 ? "lida" : "lidas"}` : accessibilityLabel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? color.surfacePressed : tone === "onSurface" ? color.surface : "transparent" },
      ]}
    >
      <IconComponent size={24} color={color.foreground} />
      {badge ? (
        <View style={styles.badge} importantForAccessibility="no-hide-descendants">
          <Text variant="overline" color="primaryForeground" style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {badge > 9 ? "9+" : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: hitSize,
    height: hitSize,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: color.background,
  },
  badgeText: { fontSize: 10, lineHeight: 12, letterSpacing: 0 },
});

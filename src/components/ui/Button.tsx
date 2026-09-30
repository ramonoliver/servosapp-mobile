import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, View, type ColorValue, type PressableProps } from "react-native";
import { buttonHeight, color, radius, space } from "@/theme/tokens";
import type { Icon } from "./icons";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "ghostOnDark" | "destructive";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: Variant;
  size?: "md" | "lg";
  loading?: boolean;
  icon?: Icon;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, { bg: ColorValue; pressed: ColorValue; fg: keyof typeof color; border?: ColorValue }> = {
  primary: { bg: color.primary, pressed: color.primaryPressed, fg: "primaryForeground" },
  secondary: { bg: color.surface, pressed: color.surfacePressed, fg: "foreground", border: color.borderStrong },
  ghost: { bg: "transparent", pressed: color.muted, fg: "primaryText" },
  // Ação secundária sobre o cartão herói escuro.
  ghostOnDark: { bg: "transparent", pressed: color.heroPressed, fg: "heroAccent" },
  // Vermelho só em ação destrutiva, nunca como primária normal (§45).
  destructive: { bg: color.danger, pressed: color.dangerPressed, fg: "primaryForeground" },
};

/**
 * Botão com toque mínimo de 44pt (§45). `loading` trava o toque — evita
 * envio duplo (edge case #24) — e anuncia "ocupado" ao leitor de tela.
 */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon: IconComponent,
  fullWidth,
  onPress,
  ...rest
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = Boolean(disabled) || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={size === "md" ? 4 : 0}
      onPress={(e) => {
        if (variant === "primary") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: buttonHeight[size],
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: disabled && !loading ? 0.45 : 1,
          alignSelf: fullWidth ? "stretch" : "auto",
          paddingHorizontal: variant === "ghost" || variant === "ghostOnDark" ? space[3] : space[5],
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={color[v.fg]} />
      ) : (
        <View style={styles.row}>
          {IconComponent ? <IconComponent size={20} color={color[v.fg]} weight="bold" /> : null}
          <Text variant="bodyStrong" color={v.fg} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
});

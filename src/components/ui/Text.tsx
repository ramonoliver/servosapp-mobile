import { Text as RNText, type TextProps } from "react-native";
import { color as palette, type as typeScale, type TypeVariant } from "@/theme/tokens";

type ColorToken = keyof typeof palette;

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: ColorToken;
  align?: "left" | "center" | "right";
  /** Números alinhados (datas, contagens). */
  tabular?: boolean;
}

/**
 * Texto do app. Dynamic Type ligado por padrão (§48), com teto para o layout
 * não quebrar em tamanhos extremos.
 */
export function Text({ variant = "body", color = "foreground", align, tabular, style, ...rest }: AppTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        typeScale[variant],
        { color: palette[color] },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        variant === "overline" ? { textTransform: "uppercase" } : null,
        style,
      ]}
    />
  );
}

import { StyleSheet, View, type ColorValue } from "react-native";
import type { StatusIcon, Tone } from "@/features/schedules/status";
import { color, font, radius, space } from "@/theme/tokens";
import {
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ProhibitIcon,
  XCircleIcon,
  type Icon,
} from "./icons";
import { Text } from "./Text";

export const TONES: Record<Tone, { bg: ColorValue; fg: keyof typeof color }> = {
  success: { bg: color.successSoft, fg: "success" },
  warning: { bg: color.warningSoft, fg: "warning" },
  danger: { bg: color.dangerSoft, fg: "danger" },
  info: { bg: color.infoSoft, fg: "info" },
  neutral: { bg: color.muted, fg: "foregroundSecondary" },
};

const ICONS: Record<StatusIcon, Icon> = {
  check: CheckCircleIcon,
  clock: ClockIcon,
  x: XCircleIcon,
  swap: ArrowsClockwiseIcon,
  arrows: ArrowsLeftRightIcon,
  prohibit: ProhibitIcon,
};

/** Status = ícone + texto + cor (§16). Nunca só a cor. */
export function StatusBadge({ label, icon, tone, size = "md" }: { label: string; icon: StatusIcon; tone: Tone; size?: "sm" | "md" }) {
  const t = TONES[tone];
  const IconComponent = ICONS[icon];
  return (
    <View
      style={[styles.badge, { backgroundColor: t.bg }, size === "sm" ? styles.sm : null]}
      accessible
      accessibilityLabel={`Status: ${label}`}
    >
      <IconComponent size={size === "sm" ? 14 : 16} color={color[t.fg]} weight="bold" />
      <Text variant={size === "sm" ? "caption" : "label"} color={t.fg} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.full,
  },
  sm: { paddingVertical: 2 },
  label: { fontFamily: font.medium },
});

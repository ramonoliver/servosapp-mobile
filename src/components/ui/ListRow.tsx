import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { color, hitSize, space } from "@/theme/tokens";
import { CaretRightIcon, type Icon } from "./icons";
import { Text } from "./Text";

/** Linha de lista (Perfil, ajustes, ações). Um componente para o mesmo problema (§44). */
export function ListRow({
  icon: IconComponent,
  title,
  subtitle,
  destructive,
  onPress,
  trailing,
  disabled,
}: {
  icon?: Icon;
  title: string;
  subtitle?: string;
  destructive?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  const body = (
    <>
      {IconComponent ? <IconComponent size={22} color={destructive ? color.danger : color.foregroundSecondary} /> : null}
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={destructive ? "danger" : disabled ? "disabled" : "foreground"}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="mutedForeground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress && !destructive ? <CaretRightIcon size={18} color={color.mutedForeground} /> : null)}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={[title, subtitle].filter(Boolean).join(". ")}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={[title, subtitle].filter(Boolean).join(". ")}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: color.surfaceSunken } : null]}
    >
      {body}
    </Pressable>
  );
}

/** Linha com interruptor — sem confirmação (alterar preferência é reversível, §61). */
export function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={disabled ? "disabled" : "foreground"}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="mutedForeground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: color.primary, false: color.borderStrong }}
        accessibilityLabel={title}
      />
    </View>
  );
}

export function RowDivider({ inset = 58 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    minHeight: hitSize + 12,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  flex: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border },
});

import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { color, hitSize, radius, space } from "@/theme/tokens";
import { Text } from "./Text";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(opt.value);
            }}
            style={[styles.segment, selected ? styles.selected : null]}
          >
            <Text variant="label" color={selected ? "foreground" : "mutedForeground"}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: color.surfacePressed,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: hitSize - 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm + 1,
    paddingHorizontal: space[3],
  },
  selected: {
    backgroundColor: color.surface,
    shadowColor: color.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});

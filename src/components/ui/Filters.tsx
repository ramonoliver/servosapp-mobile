import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { color, font, hitSize, radius, space } from "@/theme/tokens";
import { MagnifyingGlassIcon, XIcon } from "./icons";
import { Text } from "./Text";

/** Chips de filtro (§44 FilterChip). Mudar filtro não pede confirmação (§61). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                void Haptics.selectionAsync();
                onChange(o.value);
              }
            }}
            style={[styles.chip, selected ? styles.chipOn : null]}
          >
            <Text variant="label" color={selected ? "inverseForeground" : "foreground"}>
              {o.count !== undefined ? `${o.label} · ${o.count}` : o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <MagnifyingGlassIcon size={18} color={color.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.mutedForeground}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        maxFontSizeMultiplier={1.6}
        style={styles.input}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={12}>
          <XIcon size={16} color={color.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: space[2], paddingVertical: 2 },
  chip: {
    minHeight: 36,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: color.inverse, borderColor: color.inverse },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: hitSize,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surfacePressed,
  },
  input: { flex: 1, fontFamily: font.regular, fontSize: 16, color: color.foreground, paddingVertical: space[2] },
});

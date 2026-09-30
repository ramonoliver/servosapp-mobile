import { Pressable, StyleSheet, View } from "react-native";
import { color, hitSize, radius } from "@/theme/tokens";
import { Text } from "./Text";

/** Quantidade com − / + (ajustável pelo leitor de tela). */
export function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value}`}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === "increment" ? 1 : -1))))}
    >
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={styles.stepBtn} accessibilityLabel="Diminuir">
        <Text variant="title" color={value <= min ? "disabled" : "foreground"}>
          −
        </Text>
      </Pressable>
      <Text variant="heading" tabular style={styles.stepValue}>
        {value}
      </Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} style={styles.stepBtn} accessibilityLabel="Aumentar">
        <Text variant="title" color={value >= max ? "disabled" : "foreground"}>
          +
        </Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: color.borderStrong },
  stepBtn: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 28, textAlign: "center" },
});

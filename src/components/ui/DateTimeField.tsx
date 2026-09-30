import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { formatLongDate, formatTime } from "@/features/schedules/format";
import { color, hitSize, radius, space, fixed } from "@/theme/tokens";
import { Text } from "./Text";

// Data/hora com o seletor NATIVO do sistema (§44 DatePicker/TimePicker).
// Valores trafegam como texto do calendário da igreja: "YYYY-MM-DD" e "HH:MM".

const pad = (n: number) => String(n).padStart(2, "0");

export function toDate(value: string, mode: "date" | "time"): Date {
  if (mode === "date") {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  }
  const [h, min] = (value || "18:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, min || 0, 0, 0);
  return d;
}

export function fromDate(date: Date, mode: "date" | "time"): string {
  return mode === "date"
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  minimumDate,
  maximumDate,
  placeholder = "Escolher",
  error,
}: {
  label: string;
  mode: "date" | "time";
  value: string | null;
  onChange: (value: string) => void;
  minimumDate?: string;
  maximumDate?: string;
  placeholder?: string;
  error?: string | null;
}) {
  const shown = value ? (mode === "date" ? formatLongDate(value) : formatTime(value)) : placeholder;
  const pickerValue = toDate(value || (mode === "date" ? minimumDate || maximumDate || fromDate(new Date(), "date") : "18:00"), mode);
  const min = minimumDate ? toDate(minimumDate, "date") : undefined;
  const max = maximumDate ? toDate(maximumDate, "date") : undefined;

  const openAndroid = () =>
    DateTimePickerAndroid.open({
      value: pickerValue,
      mode,
      is24Hour: true,
      minimumDate: min,
      maximumDate: max,
      onValueChange: (_e, date) => onChange(fromDate(date, mode)),
    });

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="foregroundSecondary">
        {label}
      </Text>
      {Platform.OS === "ios" ? (
        // iOS: o controle nativo "compact" já mostra o valor — nada de repetir (§70).
        <View style={styles.iosRow}>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display="compact"
            locale="pt-BR"
            minimumDate={min}
            maximumDate={max}
            minuteInterval={mode === "time" ? 5 : undefined}
            accentColor={fixed.brand}
            onValueChange={(_e, date) => onChange(fromDate(date, mode))}
            accessibilityLabel={`${label}: ${shown}`}
            style={[styles.iosPicker, mode === "time" ? styles.iosPickerTime : null]}
          />
          {!value ? (
            <Text variant="label" color="mutedForeground">
              {placeholder}
            </Text>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={openAndroid}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${shown}`}
          style={[styles.field, error ? styles.fieldError : null]}
        >
          <Text variant="body" color={value ? "foreground" : "mutedForeground"}>
            {shown}
          </Text>
        </Pressable>
      )}
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  field: {
    minHeight: hitSize + 4,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    backgroundColor: color.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
  },
  fieldError: { borderColor: color.danger },
  iosRow: { flexDirection: "row", alignItems: "center", gap: space[2], minHeight: hitSize },
  // O controle "compact" do iOS vem com recuo próprio: alinha com os demais campos.
  iosPicker: { alignSelf: "flex-start", marginLeft: -19 },
  iosPickerTime: { marginLeft: -10 },
});

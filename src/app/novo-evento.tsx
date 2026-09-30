import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { FilterChips } from "@/components/ui/Filters";
import { SectionHeader } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { buildEventInput, WEEKDAYS, type EventKind } from "@/features/events/newEvent";
import { churchToday } from "@/features/schedules/format";
import { track } from "@/lib/analytics";
import { queryKeys } from "@/lib/query";
import { color, gutter, space } from "@/theme/tokens";

// Novo culto ou evento (mesma rota do web). Nasce publicado: já aparece
// para os líderes montarem escala.
export default function NewEventScreen() {
  const { ministryId } = useLocalSearchParams<{ ministryId?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const today = churchToday();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<EventKind>("weekly");
  const [weekday, setWeekday] = useState("0");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>("19:00");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const built = buildEventInput({ name, kind, weekday: Number(weekday), date, time, location, today });
    if (!built.ok) return setError(built.error);
    setError(null);
    setSaving(true);
    try {
      await endpoints.createEvent(built.data);
      track("event_created", { kind });
      if (ministryId) void qc.invalidateQueries({ queryKey: queryKeys.occurrences(String(ministryId)) });
      void qc.invalidateQueries({ queryKey: ["occurrences"] });
      toast.show({ kind: "success", title: "Evento criado", description: "Já dá para montar escala para ele." });
      router.back();
    } catch (e) {
      toast.show({ kind: "error", title: "Não foi possível criar", description: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Culto de domingo" autoFocus />

        <View style={styles.block}>
          <SegmentedControl
            accessibilityLabel="Repetição"
            options={[
              { value: "weekly", label: "Toda semana" },
              { value: "once", label: "Data única" },
            ]}
            value={kind}
            onChange={setKind}
          />
          {kind === "weekly" ? (
            <>
              <SectionHeader title="Dia da semana" />
              <FilterChips options={WEEKDAYS} value={weekday} onChange={setWeekday} />
            </>
          ) : (
            <DateTimeField label="Data" mode="date" value={date} onChange={setDate} minimumDate={today} />
          )}
        </View>

        <DateTimeField label="Horário" mode="time" value={time} onChange={setTime} />
        <TextField label="Local" value={location} onChangeText={setLocation} placeholder="Opcional" />

        {error ? (
          <Text variant="label" color="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label="Criar evento" size="lg" fullWidth loading={saving} onPress={submit} />
        <Text variant="caption" color="mutedForeground" align="center">
          Detalhes como descrição e fim da série ficam no Servos web.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { padding: gutter, paddingBottom: space[12], gap: space[5] },
  block: { gap: space[3] },
});

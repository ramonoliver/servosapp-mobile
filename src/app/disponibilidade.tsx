import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import type { Unavailability } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { CalendarBlankIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner, useIsOnline } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { errorText, useUnavailability } from "@/features/leader/queries";
import { unavailabilityLabel } from "@/features/leader/copy";
import { churchToday } from "@/features/schedules/format";
import { queryKeys } from "@/lib/query";
import { color, radius, space } from "@/theme/tokens";
import { track } from "@/lib/analytics";

/**
 * Minha disponibilidade (§24): a pessoa cadastra as EXCEÇÕES — quando não
 * pode servir. Nada de grade semanal para manter.
 */
export default function AvailabilityScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useUnavailability();
  const [adding, setAdding] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const qc = useQueryClient();
  const toast = useToast();
  const online = useIsOnline();

  const remove = (u: Unavailability) => {
    const label = unavailabilityLabel(u);
    Alert.alert("Remover indisponibilidade?", `${label.tile.day} ${label.tile.month} · ${label.period}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await endpoints.removeUnavailability(u.id);
            qc.setQueryData(queryKeys.unavailability, res);
            toast.show({ kind: "success", title: "Removida" });
          } catch (e) {
            toast.show({ kind: "error", title: "Não foi possível remover", description: errorText(e) });
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={[]} refreshing={isRefetching} onRefresh={refetch}>
      <OfflineBanner />
      <Text variant="body" color="foregroundSecondary">
        Avise os dias em que você não pode servir. Seu líder vê isso na hora de montar a escala.
      </Text>
      <Button
        label="Adicionar indisponibilidade"
        icon={PlusIcon}
        size="lg"
        fullWidth
        disabled={!online}
        onPress={() => {
          setSheetKey((k) => k + 1);
          setAdding(true);
        }}
      />
      {isPending ? (
        <ScheduleCardSkeleton />
      ) : isError && !data ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState icon={CalendarBlankIcon} title="Tudo livre por aqui" description="Você não marcou nenhum dia em que não pode servir." />
      ) : (
        <Card padded={false}>
          {data?.items.map((u, i) => {
            const l = unavailabilityLabel(u);
            return (
              <View key={u.id} style={[styles.row, i > 0 ? styles.rowBorder : null]}>
                <View style={styles.tile}>
                  <Text variant="overline" color="primaryText">
                    {l.tile.month}
                  </Text>
                  <Text variant="title" tabular>
                    {l.tile.day}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{l.period}</Text>
                  {l.reason ? (
                    <Text variant="label" color="foregroundSecondary">
                      {l.reason}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => remove(u)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover indisponibilidade de ${l.tile.day} ${l.tile.month}`}
                  hitSlop={8}
                  style={styles.trash}
                >
                  <TrashIcon size={20} color={color.mutedForeground} />
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}
      <AddSheet key={sheetKey} visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

type Kind = "day" | "range" | "hours";

function AddSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const today = churchToday();
  const [kind, setKind] = useState<Kind>("day");
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("12:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await endpoints.addUnavailability({
        date,
        endDate: kind === "range" ? endDate : null,
        allDay: kind !== "hours",
        startTime: kind === "hours" ? start : null,
        endTime: kind === "hours" ? end : null,
        reason: reason.trim() || undefined,
      });
      track("unavailability_added", { kind });
      qc.setQueryData(queryKeys.unavailability, res);
      toast.show({ kind: "success", title: "Indisponibilidade salva", description: "Seu líder vai ver isso ao montar a escala." });
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable={!saving} title="Quando você não pode servir?">
      <SegmentedControl
        options={[
          { value: "day", label: "Um dia" },
          { value: "range", label: "Período" },
          { value: "hours", label: "Horário" },
        ]}
        value={kind}
        onChange={setKind}
        accessibilityLabel="Tipo de indisponibilidade"
      />
      <View style={styles.fields}>
        <DateTimeField
          label={kind === "range" ? "De" : "Dia"}
          mode="date"
          value={date}
          minimumDate={today}
          onChange={(v) => {
            setDate(v);
            if (endDate < v) setEndDate(v);
          }}
        />
        {kind === "range" ? <DateTimeField label="Até" mode="date" value={endDate} minimumDate={date} onChange={setEndDate} /> : null}
        {kind === "hours" ? (
          <View style={styles.twoCols}>
            <View style={styles.flex}>
              <DateTimeField label="Das" mode="time" value={start} onChange={setStart} />
            </View>
            <View style={styles.flex}>
              <DateTimeField label="Até" mode="time" value={end} onChange={setEnd} />
            </View>
          </View>
        ) : null}
        <TextField label="Motivo (opcional)" placeholder="Ex.: viagem" value={reason} onChangeText={setReason} maxLength={200} error={error} />
      </View>
      <Button label="Salvar" size="lg" fullWidth loading={saving} onPress={save} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: space[4], padding: space[4] },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  tile: { width: 52, alignItems: "center", paddingVertical: space[1], borderRadius: radius.md, backgroundColor: color.primarySoft },
  trash: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  fields: { gap: space[4] },
  twoCols: { flexDirection: "row", gap: space[3] },
});

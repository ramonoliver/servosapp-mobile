import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { AssignmentCard } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { IconButton } from "@/components/ui/IconButton";
import { CaretLeftIcon, CaretRightIcon } from "@/components/ui/icons";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import { TONES } from "@/components/ui/StatusBadge";
import { Text } from "@/components/ui/Text";
import {
  churchToday,
  dayA11yLabel,
  formatLongDate,
  monthLabel,
  monthOf,
  monthWeeks,
  shiftMonth,
  WEEKDAY_INITIALS,
} from "@/features/schedules/format";
import { assignmentStatusMeta } from "@/features/schedules/status";
import { track } from "@/lib/analytics";
import { color, font, radius, space } from "@/theme/tokens";
import { ScheduleCard } from "./ScheduleCard";

/**
 * Calendário mensal (§19, P2): visão secundária da aba Escalas. Um ponto por
 * escala no dia, na cor do status; tocar no dia lista as escalas embaixo.
 */
export function CalendarView({ onOpen }: { onOpen: (card: AssignmentCard) => void }) {
  const today = churchToday();
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState<string>(today);
  const q = useQuery({ queryKey: ["schedules", "month", month], queryFn: () => endpoints.scheduleMonth(month) });

  useEffect(() => {
    track("calendar_viewed");
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, AssignmentCard[]>();
    for (const c of q.data?.items ?? []) map.set(c.date, [...(map.get(c.date) ?? []), c]);
    return map;
  }, [q.data]);

  const weeks = useMemo(() => monthWeeks(month), [month]);
  const dayItems = byDay.get(selected) ?? [];
  // Dia vazio: aponta o próximo dia do mês que tem escala (sem caçar no grid).
  const nextBusy = useMemo(() => [...byDay.keys()].sort().find((d) => d > selected) ?? null, [byDay, selected]);

  const go = (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    // Ao trocar de mês, seleciona hoje (se for o mês atual) ou o dia 1.
    setSelected(monthOf(today) === next ? today : `${next}-01`);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text variant="heading" accessibilityRole="header" accessibilityLiveRegion="polite">
            {monthLabel(month)}
          </Text>
          <View style={styles.nav}>
            <IconButton icon={CaretLeftIcon} accessibilityLabel="Mês anterior" onPress={() => go(-1)} />
            <IconButton icon={CaretRightIcon} accessibilityLabel="Próximo mês" onPress={() => go(1)} />
          </View>
        </View>

        <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {WEEKDAY_INITIALS.map((d, i) => (
            <Text key={i} variant="caption" color="mutedForeground" style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        {weeks.map((week, w) => (
          <View key={w} style={styles.row}>
            {week.map((iso, i) => {
              if (!iso) return <View key={i} style={styles.cell} />;
              const items = byDay.get(iso) ?? [];
              const isSelected = iso === selected;
              const isToday = iso === today;
              const past = iso < today;
              return (
                <Pressable
                  key={iso}
                  onPress={() => setSelected(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={dayA11yLabel(iso, items.length)}
                  style={styles.cell}
                  hitSlop={2}
                >
                  <View style={[styles.day, isToday ? styles.today : null, isSelected ? styles.selected : null]}>
                    <Text
                      style={[
                        styles.dayText,
                        past && !isSelected ? styles.pastText : null,
                        isSelected ? styles.selectedText : null,
                        items.length && !isSelected ? styles.busyText : null,
                      ]}
                    >
                      {Number(iso.slice(8))}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {items.slice(0, 3).map((c) => (
                      <View key={c.assignmentId} style={[styles.dot, { backgroundColor: color[TONES[assignmentStatusMeta(c.status, c.scheduleStatus).tone].fg] }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {LEGEND.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: color[TONES[l.tone].fg] }]} />
              <Text variant="caption" color="mutedForeground">
                {l.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.dayHeader}>
        <Text variant="overline" color="mutedForeground" accessibilityRole="header">
          {selected === today ? "Hoje" : formatLongDate(selected)}
        </Text>
      </View>
      {q.isPending ? (
        <ScheduleCardSkeleton />
      ) : q.isError ? (
        <ErrorState message={q.error?.message} onRetry={() => void q.refetch()} />
      ) : dayItems.length === 0 ? (
        <View style={styles.none}>
          <Text variant="label" color="mutedForeground">
            {(q.data?.items.length ?? 0) === 0 ? "Nenhuma escala neste mês." : "Nenhuma escala neste dia."}
          </Text>
          {nextBusy ? (
            <Pressable onPress={() => setSelected(nextBusy)} accessibilityRole="button" hitSlop={8}>
              <Text variant="label" color="primaryText">
                {`Próxima: ${formatLongDate(nextBusy)}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.list}>
          {dayItems.map((c) => (
            <ScheduleCard key={c.assignmentId} card={c} onPress={onOpen} />
          ))}
        </View>
      )}
    </View>
  );
}

const LEGEND = [
  { label: "Confirmada", tone: "success" as const },
  { label: "Aguardando", tone: "warning" as const },
  { label: "Recusada", tone: "danger" as const },
];

const CELL = 42;

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space[3], paddingBottom: space[2] },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: space[2], marginBottom: space[2] },
  nav: { flexDirection: "row" },
  row: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", paddingBottom: space[1] },
  cell: { flex: 1, alignItems: "center", minHeight: CELL + 4, paddingTop: 2 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  today: { borderWidth: 1.5, borderColor: color.primary },
  selected: { backgroundColor: color.inverse, borderColor: color.inverse },
  dayText: { fontFamily: font.medium, fontSize: 15, color: color.foreground, fontVariant: ["tabular-nums"] },
  pastText: { color: color.mutedForeground },
  busyText: { fontFamily: font.semibold },
  selectedText: { color: color.inverseForeground, fontFamily: font.semibold },
  dots: { flexDirection: "row", gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayHeader: { marginTop: space[2] },
  none: { paddingVertical: space[2], gap: space[2] },
  legend: { flexDirection: "row", gap: space[4], justifyContent: "center", paddingTop: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, marginTop: space[1] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space[1] },
  list: { gap: space[3] },
});

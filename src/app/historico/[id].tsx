import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { HistoryTone } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { ClockCounterClockwiseIcon } from "@/components/ui/icons";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { churchTimeOf, groupHistory } from "@/features/leader/copy";
import { errorText } from "@/features/leader/queries";
import { churchToday } from "@/features/schedules/format";
import { color, radius, space } from "@/theme/tokens";

const DOT: Record<HistoryTone, string> = {
  neutral: color.borderStrong,
  success: color.success,
  warning: color.warningStrong,
  danger: color.danger,
  info: color.info,
};

// Histórico da escala (§38, P2): o que aconteceu, quem fez e quando — para o
// líder entender uma escala sem perguntar no grupo.
export default function ScheduleHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ["history", id], queryFn: () => endpoints.scheduleHistory(String(id)), enabled: Boolean(id) });

  if (q.isError) return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;

  const groups = groupHistory(q.data?.items ?? [], churchToday());
  return (
    <Screen edges={[]} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {q.isPending ? (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </View>
      ) : groups.length === 0 ? (
        <EmptyState icon={ClockCounterClockwiseIcon} title="Nada registrado ainda" description="As próximas mudanças desta escala aparecem aqui." />
      ) : (
        groups.map((g) => (
          <View key={g.title}>
            <SectionHeader title={g.title} />
            <View style={styles.timeline}>
              {g.items.map((item, i) => (
                <View key={item.id} style={styles.item} accessible accessibilityLabel={`${churchTimeOf(item.at)}. ${item.text}${item.detail ? `. ${item.detail}` : ""}`}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, { backgroundColor: DOT[item.tone] }]} />
                    {i < g.items.length - 1 ? <View style={styles.line} /> : null}
                  </View>
                  <View style={styles.body}>
                    <View style={styles.head}>
                      <Text variant="bodyStrong" style={styles.flex}>
                        {item.text}
                      </Text>
                      <Text variant="caption" color="mutedForeground" tabular>
                        {churchTimeOf(item.at)}
                      </Text>
                    </View>
                    {item.detail ? (
                      <Text variant="label" color="foregroundSecondary">
                        {item.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeletons: { gap: space[3], marginTop: space[4] },
  timeline: { marginTop: space[3], backgroundColor: color.surface, borderRadius: radius.lg, paddingVertical: space[3], paddingHorizontal: space[4] },
  item: { flexDirection: "row", gap: space[3] },
  rail: { width: 12, alignItems: "center", paddingTop: 7 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { flex: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: color.border, marginTop: 4 },
  body: { flex: 1, gap: 2, paddingBottom: space[4] },
  head: { flexDirection: "row", gap: space[2], alignItems: "flex-start" },
});

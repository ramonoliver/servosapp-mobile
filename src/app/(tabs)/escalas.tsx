import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AssignmentCard } from "@/api/contracts";
import { CalendarView } from "@/components/schedule/CalendarView";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { Button } from "@/components/ui/Button";
import { CalendarBlankIcon, ClockIcon } from "@/components/ui/icons";
import { ScreenTitle, SectionHeader } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { churchToday, groupPast, groupUpcoming } from "@/features/schedules/format";
import { usePastSchedules, useUpcomingSchedules } from "@/features/schedules/queries";
import { color, gutter, space } from "@/theme/tokens";

type Scope = "upcoming" | "calendar" | "past";
const SCOPES = [
  { value: "upcoming", label: "Próximas" },
  { value: "calendar", label: "Calendário" },
  { value: "past", label: "Passadas" },
] as const;

const openCard = (c: AssignmentCard) => router.push({ pathname: "/escala/[id]", params: { id: c.scheduleId } });

/** Minhas escalas (§19, §59): próximas agrupadas por período; histórico à parte, paginado. */
export default function SchedulesScreen() {
  const [scope, setScope] = useState<Scope>("upcoming");
  const upcoming = useUpcomingSchedules();
  const past = usePastSchedules(scope === "past");
  const today = churchToday();

  const qc = useQueryClient();
  const sections = useMemo(() => {
    if (scope === "calendar") return [];
    if (scope === "upcoming") return groupUpcoming(upcoming.data?.items ?? [], today);
    return groupPast(past.data?.pages.flatMap((p) => p.items) ?? [], today);
  }, [scope, upcoming.data, past.data, today]);

  const active = scope === "upcoming" ? upcoming : past;
  const renderItem = useCallback(({ item }: { item: AssignmentCard }) => <ScheduleCard card={item} onPress={openCard} />, []);

  return (
    <SafeAreaView style={styles.fill} edges={["top"]}>
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections.map((g) => ({ key: g.key, title: g.title, data: g.items }))}
        keyExtractor={(c) => c.assignmentId}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} inList />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        refreshControl={
          <RefreshControl
            refreshing={scope !== "calendar" && active.isRefetching}
            onRefresh={() =>
              scope === "calendar" ? void qc.invalidateQueries({ queryKey: ["schedules", "month"] }) : void active.refetch()
            }
            tintColor={color.primary}
            colors={[color.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenTitle title="Minhas escalas" />
            <SegmentedControl options={SCOPES} value={scope} onChange={setScope} accessibilityLabel="Período das escalas" />
            <OfflineBanner />
            {scope === "calendar" ? <CalendarView onOpen={openCard} /> : null}
          </View>
        }
        ListEmptyComponent={
          scope === "calendar" ? null : active.isPending ? (
            <View style={styles.skeletons}>
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </View>
          ) : active.isError ? (
            <ErrorState message={active.error?.message} onRetry={() => void active.refetch()} />
          ) : scope === "upcoming" ? (
            <EmptyState
              icon={CalendarBlankIcon}
              title="Nenhuma escala por enquanto"
              description="Quando sua liderança escalar você, ela aparece aqui para você confirmar."
            />
          ) : (
            <EmptyState icon={ClockIcon} title="Nenhuma escala ainda" description="Quando você servir, suas escalas passadas aparecem aqui." />
          )
        }
        ListFooterComponent={
          scope === "past" && past.hasNextPage ? (
            <View style={styles.footer}>
              {past.isFetchingNextPage ? (
                <ActivityIndicator color={color.primary} />
              ) : (
                <Button label="Carregar mais" variant="secondary" onPress={() => void past.fetchNextPage()} />
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: gutter, paddingTop: space[2], paddingBottom: space[12] },
  header: { gap: space[4] },
  skeletons: { gap: space[3], marginTop: space[4] },
  separator: { height: space[3] },
  footer: { alignItems: "center", paddingTop: space[5] },
});

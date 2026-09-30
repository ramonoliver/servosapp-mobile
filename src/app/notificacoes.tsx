import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { endpoints, type AppNotification } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { BellIcon } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { addDays, churchToday, formatShortDate } from "@/features/schedules/format";
import { appRouteForUrl } from "@/lib/links";
import { queryKeys } from "@/lib/query";
import { color, gutter, hitSize, radius, space } from "@/theme/tokens";

function dayOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function timeOf(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Central (§31): Hoje / Ontem / Anteriores, lidas e não lidas, deep link. */
export default function NotificationsScreen() {
  const qc = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: queryKeys.notifications, queryFn: endpoints.notifications });

  const markRead = useMutation({
    mutationFn: (ids: string[]) => endpoints.markNotificationsRead(ids),
    onMutate: (ids) => {
      qc.setQueryData<typeof data>(queryKeys.notifications, (d) =>
        d ? { ...d, notifications: d.notifications.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)), unreadCount: 0 } : d,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
      void qc.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });

  const sections = useMemo(() => {
    const today = churchToday();
    const yesterday = addDays(today, -1);
    const groups: Record<string, AppNotification[]> = { Hoje: [], Ontem: [], Anteriores: [] };
    for (const n of data?.notifications ?? []) {
      const d = dayOf(n.created_at);
      groups[d === today ? "Hoje" : d === yesterday ? "Ontem" : "Anteriores"].push(n);
    }
    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([title, items]) => ({ title, data: items }));
  }, [data]);

  const unread = (data?.notifications ?? []).filter((n) => !n.read).map((n) => n.id);

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate([n.id]);
    router.push(appRouteForUrl(n.action_url));
  };

  return (
    <View style={styles.fill}>
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(n) => n.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <OfflineBanner />
            {unread.length > 0 ? (
              <View style={styles.markAll}>
                <Button label="Marcar todas como lidas" variant="ghost" onPress={() => markRead.mutate(unread)} />
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} inList />}
        renderItem={({ item }) => <NotificationItem n={item} onPress={() => open(item)} />}
        ListEmptyComponent={
          isPending ? (
            <View style={styles.skeletons}>
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </View>
          ) : isError ? (
            <ErrorState message={error?.message} onRetry={() => void refetch()} />
          ) : (
            <EmptyState icon={BellIcon} title="Nada de novo por aqui" description="Quando você for escalado ou algo mudar, avisamos aqui." />
          )
        }
      />
    </View>
  );
}

function NotificationItem({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const day = dayOf(n.created_at);
  const when = day === churchToday() ? timeOf(n.created_at) : formatShortDate(day);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? "" : "Não lida. "}${n.title}. ${n.body}. ${when}`}
      style={({ pressed }) => [styles.item, !n.read ? styles.unread : null, pressed ? { backgroundColor: color.surfacePressed } : null]}
    >
      <View style={[styles.dot, { backgroundColor: n.read ? "transparent" : color.brandMark }]} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant={n.read ? "body" : "bodyStrong"} style={styles.flex} numberOfLines={2}>
            {n.title}
          </Text>
          <Text variant="caption" color="mutedForeground">
            {when}
          </Text>
        </View>
        <Text variant="label" color="foregroundSecondary" numberOfLines={3}>
          {n.body}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingBottom: space[12], gap: space[2] },
  skeletons: { gap: space[3], marginTop: space[4] },
  listHeader: { gap: space[2] },
  markAll: { alignItems: "flex-end", marginBottom: -space[4] },
  item: {
    flexDirection: "row",
    marginBottom: space[2],
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    minHeight: hitSize + 20,
  },
  unread: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.primarySoft },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  titleRow: { flexDirection: "row", gap: space[2], alignItems: "flex-start" },
});

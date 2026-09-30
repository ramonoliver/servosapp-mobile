import { router } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import type { AssignmentCard } from "@/api/contracts";
import { useSession } from "@/auth/session";
import { AttentionRow, JoinRequestsRow, LeaderMinistryCard } from "@/components/schedule/LeaderCards";
import { NextScheduleCard } from "@/components/schedule/NextScheduleCard";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { BellIcon, CalendarBlankIcon } from "@/components/ui/icons";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { ScheduleCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { churchToday, dayLabel, formatLongDate, greeting } from "@/features/schedules/format";
import { useOverview } from "@/features/schedules/queries";
import { color, space } from "@/theme/tokens";

function openSchedule(scheduleId: string) {
  router.push({ pathname: "/escala/[id]", params: { id: scheduleId } });
}

export default function HomeScreen() {
  const { user } = useSession();
  const { data, isPending, isError, error, refetch, isRefetching } = useOverview();
  const onCard = useCallback((c: AssignmentCard) => openSchedule(c.scheduleId), []);
  const firstName = data?.user.firstName ?? (user?.name ?? "").split(" ")[0];
  const today = churchToday();
  const joinRequests = data?.joinRequests ?? 0;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="label" color="mutedForeground">
            {formatLongDate(today)}
          </Text>
          <Text variant="title" accessibilityRole="header" numberOfLines={1}>
            {`${greeting(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`}
          </Text>
        </View>
        <IconButton
          icon={BellIcon}
          accessibilityLabel="Notificações"
          badge={data?.unreadNotifications}
          onPress={() => router.push("/notificacoes")}
        />
      </View>
      <OfflineBanner />

      {isPending ? (
        <View style={styles.stack}>
          <ScheduleCardSkeleton hero />
          <Skeleton width={120} height={12} />
          <ScheduleCardSkeleton />
        </View>
      ) : isError && !data ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : data ? (
        <>
          {data.next ? (
            <NextScheduleCard card={data.next} onOpen={() => openSchedule(data.next!.scheduleId)} />
          ) : (
            <Card>
              <EmptyState
                icon={CalendarBlankIcon}
                title="Nenhuma escala por enquanto"
                description="Quando sua liderança escalar você, ela aparece aqui para você confirmar."
              />
            </Card>
          )}

          {data.pending.length > 0 ? (
            <>
              <SectionHeader title={data.pending.length === 1 ? "Precisa da sua resposta" : `Precisam da sua resposta · ${data.pending.length}`} />
              {data.pending.map((c) => (
                <ScheduleCard key={c.assignmentId} card={c} onPress={onCard} />
              ))}
            </>
          ) : null}

          {(data.leader && data.leader.attention.length > 0) || joinRequests > 0 ? (
            <>
              <SectionHeader title="Precisa de atenção" />
              <Card padded={false} style={styles.list}>
                {joinRequests > 0 ? <JoinRequestsRow count={joinRequests} onPress={() => router.push("/aprovacoes")} /> : null}
                {(data.leader?.attention ?? []).slice(0, 6).map((item, i) => (
                  <View key={`${item.scheduleId}-${item.kind}-${"assignmentId" in item ? item.assignmentId : item.kind}-${i}`}>
                    {i > 0 || joinRequests > 0 ? <View style={styles.divider} /> : null}
                    <AttentionRow
                      item={item}
                      context={`${item.ministryName} · ${item.eventName} · ${dayLabel(item.date, today)}`}
                      onPress={() => openSchedule(item.scheduleId)}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {data.leader && data.leader.ministries.length > 0 ? (
            <>
              <SectionHeader title={data.leader.ministries.length === 1 ? "Sua equipe" : "Suas equipes"} />
              {data.leader.ministries.map((m) => (
                <LeaderMinistryCard key={m.ministry.id} summary={m} onOpen={openSchedule} />
              ))}
            </>
          ) : null}

          {data.upcoming.length > 0 ? (
            <>
              <SectionHeader title="Próximas escalas" />
              {data.upcoming.slice(0, 4).map((c) => (
                <ScheduleCard key={c.assignmentId} card={c} onPress={onCard} />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: 56, marginTop: space[2] },
  flex: { flex: 1 },
  stack: { gap: space[4] },
  list: { overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: 64 },
});

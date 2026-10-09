import { StyleSheet, View } from "react-native";
import type { MyMinistry } from "@/api/contracts";
import { AvatarGroup } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, PressableCard } from "@/components/ui/Card";
import { router } from "expo-router";
import { MusicNotesIcon, PlusIcon, UsersThreeIcon } from "@/components/ui/icons";
import { ListRow } from "@/components/ui/ListRow";
import { Screen, ScreenTitle } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useMinistries, useOverview } from "@/features/schedules/queries";
import { joinNames } from "@/features/schedules/status";
import { color, radius, space } from "@/theme/tokens";

export default function MinistriesScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMinistries();
  const overview = useOverview();
  const canCreate = Boolean(overview.data?.access?.canCreateMinistries);
  const newMinistry = () => router.push("/novo-ministerio");
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <ScreenTitle title="Ministérios" />
      <OfflineBanner />
      {isPending ? (
        <>
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
        </>
      ) : isError && !data ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : data && data.items.length === 0 ? (
        canCreate ? (
          <EmptyState
            icon={UsersThreeIcon}
            title="Nenhum ministério ainda"
            description="Comece pelo primeiro ministério da igreja: Louvor, Recepção, Mídia… Depois é só montar a equipe e as escalas."
            actionLabel="Criar ministério"
            onAction={newMinistry}
          />
        ) : (
          <EmptyState
            icon={UsersThreeIcon}
            title="Você ainda não está em um ministério"
            description="Quando um líder adicionar você a um ministério, ele aparece aqui."
          />
        )
      ) : (
        data?.items.map((m) => <MinistryCard key={m.ministry.id} item={m} />)
      )}
      {canCreate && data && data.items.length > 0 ? (
        <Button label="Novo ministério" icon={PlusIcon} variant="secondary" fullWidth onPress={newMinistry} />
      ) : null}
      {overview.data?.access?.canSeeRepertoire ? (
        <Card padded={false}>
          <ListRow icon={MusicNotesIcon} title="Repertório" subtitle="Músicas, tons e cifras da igreja" onPress={() => router.push("/repertorio")} />
        </Card>
      ) : null}
    </Screen>
  );
}

function MinistryCard({ item }: { item: MyMinistry }) {
  const leaderNames = item.leaders.map((l) => l.name.split(" ")[0]);
  return (
    <PressableCard
      style={styles.card}
      onPress={() => router.push({ pathname: "/ministerio/[id]", params: { id: item.ministry.id } })}
      accessibilityLabel={`${item.ministry.name}. ${item.role === "LEADER" ? "Você lidera" : "Você serve"}.`}
      accessibilityHint="Abre a equipe do ministério"
    >
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="heading">{item.ministry.name}</Text>
          <Text variant="caption" color="mutedForeground">
            {item.memberCount === 1 ? "1 pessoa" : `${item.memberCount} pessoas`}
          </Text>
        </View>
        <View style={[styles.role, item.role === "LEADER" ? styles.roleLeader : null]}>
          <Text variant="caption" color={item.role === "LEADER" ? "primaryText" : "foregroundSecondary"}>
            {item.role === "LEADER" ? "Você lidera" : "Você serve"}
          </Text>
        </View>
      </View>

      {item.ministry.description ? (
        <Text variant="label" color="foregroundSecondary" numberOfLines={2}>
          {item.ministry.description}
        </Text>
      ) : null}

      <View style={styles.block}>
        <Text variant="caption" color="mutedForeground">
          {item.functions.length > 1 ? "Suas funções" : "Sua função"}
        </Text>
        {item.functions.length > 0 ? (
          <View style={styles.chips}>
            {item.functions.map((f) => (
              <View key={f} style={styles.chip}>
                <Text variant="label">{f}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="label" color="foregroundSecondary">
            Ainda sem função definida. Fale com seu líder.
          </Text>
        )}
      </View>

      {item.leaders.length > 0 ? (
        <View style={styles.leaders}>
          <AvatarGroup people={item.leaders} size={28} />
          <Text variant="label" color="foregroundSecondary" style={styles.flex} numberOfLines={2}>
            {item.leaders.length === 1 ? `Líder: ${leaderNames[0]}` : `Líderes: ${joinNames(leaderNames)}`}
          </Text>
        </View>
      ) : null}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4] },
  head: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  flex: { flex: 1 },
  role: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.full, backgroundColor: color.muted },
  roleLeader: { backgroundColor: color.primarySoft },
  block: { gap: space[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSunken,
  },
  leaders: { flexDirection: "row", alignItems: "center", gap: space[3] },
});

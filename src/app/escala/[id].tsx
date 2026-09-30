import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { MobileScheduleDetail, TeamMember } from "@/api/contracts";
import { AttentionRow } from "@/components/schedule/LeaderCards";
import { attentionAction, openPicker, useLeaderTools } from "@/components/schedule/LeaderTools";
import { useAssignmentActions } from "@/components/schedule/useAssignmentActions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  InfoIcon,
  MapPinIcon,
  NoteIcon,
  PhoneIcon,
  ProhibitIcon,
  UsersThreeIcon,
  type Icon,
} from "@/components/ui/icons";
import { ScheduleExtras } from "@/components/schedule/ScheduleExtras";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Text } from "@/components/ui/Text";
import { formatLongDate, formatTime } from "@/features/schedules/format";
import { useScheduleDetail } from "@/features/schedules/queries";
import { track } from "@/lib/analytics";
import { assignmentStatusMeta } from "@/features/schedules/status";
import { color, hitSize, radius, space } from "@/theme/tokens";

export default function ScheduleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error, refetch, isRefetching } = useScheduleDetail(String(id ?? ""));
  useEffect(() => {
    if (id) track("schedule_viewed");
  }, [id]);

  if (isPending) {
    return (
      <Screen edges={[]}>
        <ScheduleCardSkeleton hero />
        <ScheduleCardSkeleton />
      </Screen>
    );
  }

  if (!data) {
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <Screen edges={[]}>
        {status === 404 ? (
          <EmptyState
            icon={ProhibitIcon}
            title="Esta escala não existe mais"
            description="Ela pode ter sido removida pelo líder."
            actionLabel="Ver minhas escalas"
            onAction={() => router.replace("/(tabs)/escalas")}
          />
        ) : status === 403 ? (
          <EmptyState
            icon={UsersThreeIcon}
            title="Você não tem acesso a esta escala"
            description="Ela pertence a um ministério do qual você não participa."
            actionLabel="Voltar"
            onAction={() => router.back()}
          />
        ) : isError ? (
          <ErrorState message={error?.message} onRetry={() => void refetch()} />
        ) : null}
      </Screen>
    );
  }

  return <Detail data={data} refreshing={isRefetching} onRefresh={refetch} />;
}

function Detail({ data, refreshing, onRefresh }: { data: MobileScheduleDetail; refreshing: boolean; onRefresh: () => void }) {
  const canManage = data.permissions.canManage;
  const leader = useLeaderTools(data);
  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: data.schedule.ministry.name }} />
      <OfflineBanner />
      <Summary data={data} />
      {data.me ? <MyActions data={data} /> : null}
      {canManage && leader.bar ? (
        <>
          <SectionHeader title="Gerenciar escala" />
          {leader.bar}
        </>
      ) : null}
      {data.schedule.instructions ? (
        <>
          <SectionHeader title="Observações" />
          <Card style={styles.row}>
            <NoteIcon size={20} color={color.mutedForeground} />
            <Text variant="body" style={styles.flex}>
              {data.schedule.instructions}
            </Text>
          </Card>
        </>
      ) : null}
      {data.permissions.canManage && data.attention && data.attention.length > 0 ? (
        <>
          <SectionHeader title="Precisa de atenção" />
          <Card padded={false}>
            {data.attention.map((item, i) => (
              <View key={`${item.kind}-${i}`}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <AttentionRow item={item} onPress={attentionAction(data, item)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <ScheduleExtras data={data} />
      <Leaders data={data} />
      <Team data={data} onMember={canManage ? leader.openMember : undefined} />
      {canManage ? leader.sheets : null}
    </Screen>
  );
}

function Summary({ data }: { data: MobileScheduleDetail }) {
  const s = data.schedule;
  const cancelled = s.status === "CANCELLED";
  return (
    <Card style={styles.summary}>
      {cancelled ? (
        <View style={[styles.banner, { backgroundColor: color.muted }]} accessibilityRole="alert">
          <ProhibitIcon size={18} color={color.foregroundSecondary} weight="bold" />
          <Text variant="label" color="foregroundSecondary" style={styles.flex}>
            Esta escala foi cancelada. Você não precisa comparecer.
          </Text>
        </View>
      ) : s.status === "DRAFT" ? (
        <View style={[styles.banner, { backgroundColor: color.warningSoft }]}>
          <InfoIcon size={18} color={color.warning} weight="bold" />
          <Text variant="label" color="warning" style={styles.flex}>
            Rascunho — a equipe ainda não foi avisada.
          </Text>
        </View>
      ) : null}
      <View style={styles.titleBlock}>
        <Text variant="title" accessibilityRole="header" color={cancelled ? "foregroundSecondary" : "foreground"}>
          {s.event.name}
        </Text>
        <Text variant="bodyStrong" color="foregroundSecondary">
          {formatLongDate(s.date)}
        </Text>
      </View>
      <View style={styles.facts}>
        <Fact icon={ClockIcon} label="Início" value={formatTime(s.time) || "A definir"} />
        {s.arrivalTime ? <Fact icon={CheckCircleIcon} label="Chegada" value={formatTime(s.arrivalTime)} emphasis /> : null}
      </View>
      {s.location ? (
        <View style={styles.row}>
          <MapPinIcon size={18} color={color.mutedForeground} />
          <Text variant="label" color="foregroundSecondary" style={styles.flex}>
            {s.location}
          </Text>
        </View>
      ) : null}
      {data.me ? (
        <View style={styles.meRow}>
          <View style={styles.flex}>
            <Text variant="caption" color="mutedForeground">
              Sua função
            </Text>
            <Text variant="heading">{data.me.functionName || "A definir"}</Text>
          </View>
          <StatusBadge {...assignmentStatusMeta(data.me.status, s.status)} />
        </View>
      ) : null}
    </Card>
  );
}

function Fact({ icon: IconComponent, label, value, emphasis }: { icon: Icon; label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <IconComponent size={18} color={emphasis ? color.primaryText : color.mutedForeground} />
      <View>
        <Text variant="caption" color="mutedForeground">
          {label}
        </Text>
        <Text variant="heading" tabular color={emphasis ? "primaryText" : "foreground"}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MyActions({ data }: { data: MobileScheduleDetail }) {
  const me = data.me!;
  const actions = useAssignmentActions({ assignmentId: me.assignmentId, scheduleId: data.schedule.id, date: data.schedule.date });
  if (me.status === "REPLACEMENT_PENDING") {
    return (
      <View style={[styles.banner, { backgroundColor: color.infoSoft }]}>
        <InfoIcon size={18} color={color.info} weight="bold" />
        <Text variant="label" color="info" style={styles.flex}>
          Você pediu substituição. Seu líder vai escolher quem entra no seu lugar e você será avisado.
        </Text>
      </View>
    );
  }
  if (!data.permissions.canRespond) return null;
  return (
    <View style={styles.actions}>
      {me.reconfirmRequested ? (
        <View style={[styles.banner, { backgroundColor: color.infoSoft }]} accessibilityRole="alert">
          <InfoIcon size={18} color={color.info} weight="bold" />
          <Text variant="label" color="info" style={styles.flex}>
            A escala mudou depois da sua confirmação. Confirme de novo.
          </Text>
        </View>
      ) : null}
      {me.status === "PENDING" ? (
        <>
          <Button label="Confirmar presença" size="lg" fullWidth loading={actions.confirming} onPress={actions.confirm} />
          <Button label="Não posso servir" variant="ghost" fullWidth onPress={actions.openDecline} />
        </>
      ) : me.status === "ACCEPTED" ? (
        <Button label="Não vou mais poder servir" variant="ghost" fullWidth onPress={actions.openDecline} />
      ) : me.status === "DECLINED" ? (
        <>
          {me.declineReason ? (
            <Text variant="label" color="foregroundSecondary" align="center">
              Seu motivo: “{me.declineReason}”
            </Text>
          ) : null}
          <Button label="Posso servir, confirmar" variant="secondary" fullWidth loading={actions.confirming} onPress={actions.confirm} />
        </>
      ) : null}
      {actions.sheet}
    </View>
  );
}

function Leaders({ data }: { data: MobileScheduleDetail }) {
  if (data.leaders.length === 0) return null;
  return (
    <>
      <SectionHeader title={data.leaders.length === 1 ? "Líder" : "Líderes"} />
      <Card padded={false}>
        {data.leaders.map((l, i) => (
          <View key={l.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.person}>
              <Avatar name={l.name} photoUrl={l.photoUrl} avatarColor={l.avatarColor} size={40} />
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {l.name}
              </Text>
              {l.phone ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ligar para ${l.name.split(" ")[0]}`}
                  onPress={() => void Linking.openURL(`tel:${l.phone!.replace(/[^\d+]/g, "")}`)}
                  style={({ pressed }) => [styles.call, pressed ? { backgroundColor: color.primarySoft } : null]}
                >
                  <PhoneIcon size={20} color={color.primaryText} weight="bold" />
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

/** Equipe por função, com a cobertura explícita (§14): "3 de 4" e a vaga aberta. */
function Team({ data, onMember }: { data: MobileScheduleDetail; onMember?: (m: TeamMember) => void }) {
  const manage = Boolean(onMember) && data.schedule.status !== "CANCELLED" && data.schedule.status !== "COMPLETED";
  const byFunction = new Map<string, TeamMember[]>();
  for (const t of data.team) {
    const key = t.functionName || "Sem função";
    byFunction.set(key, [...(byFunction.get(key) ?? []), t]);
  }
  const coverage = data.coverage.byFunction;
  const names = [...new Set([...coverage.map((c) => c.functionName), ...byFunction.keys()])];
  if (names.length === 0) return null;

  return (
    <>
      <SectionHeader title="Equipe" />
      {names.map((fn) => {
        const c = coverage.find((x) => x.functionName === fn);
        const members = byFunction.get(fn) ?? [];
        const openCount = c ? Math.max(0, c.needed - c.filled - c.pending) : 0;
        return (
          <Card key={fn} padded={false}>
            <View style={styles.fnHeader}>
              <Text variant="bodyStrong" style={styles.flex}>
                {fn}
              </Text>
              {c ? (
                <Text variant="caption" color={c.filled >= c.needed ? "success" : "mutedForeground"} tabular>
                  {c.filled} de {c.needed} {c.needed === 1 ? "confirmada" : "confirmadas"}
                </Text>
              ) : null}
            </View>
            {members.map((m) => {
              const meta = assignmentStatusMeta(m.status, data.schedule.status);
              return (
                <Pressable
                  key={m.assignmentId}
                  disabled={!manage}
                  onPress={() => onMember?.(m)}
                  accessibilityRole={manage ? "button" : undefined}
                  accessibilityLabel={`${m.name}${m.isMe ? " (você)" : ""}, ${meta.label}`}
                  style={({ pressed }) => [styles.person, pressed ? { backgroundColor: color.surfaceSunken } : null]}
                >
                  <Avatar name={m.name} photoUrl={m.photoUrl} avatarColor={m.avatarColor} size={36} />
                  <View style={styles.memberText}>
                    <Text variant="body" numberOfLines={1}>
                      {m.name.split(" ").slice(0, 2).join(" ")}
                      {m.isMe ? <Text variant="body" color="mutedForeground"> · você</Text> : null}
                    </Text>
                    <StatusBadge {...meta} size="sm" />
                  </View>
                  {manage ? <CaretRightIcon size={16} color={color.mutedForeground} /> : null}
                </Pressable>
              );
            })}
            {openCount > 0 ? (
              <Pressable
                disabled={!manage}
                onPress={() => openPicker(data.schedule.id, fn === "Sem função" ? "" : fn)}
                accessibilityRole={manage ? "button" : undefined}
                accessibilityLabel={`${openCount === 1 ? "1 vaga não preenchida" : `${openCount} vagas não preenchidas`}${manage ? ". Toque para escolher alguém" : ""}`}
                style={({ pressed }) => [styles.person, pressed ? { backgroundColor: color.surfaceSunken } : null]}
              >
                <View style={styles.openSlot}>
                  <UsersThreeIcon size={16} color={color.warning} />
                </View>
                <Text variant="label" color="warning" style={styles.flex}>
                  {openCount === 1 ? "1 vaga não preenchida" : `${openCount} vagas não preenchidas`}
                </Text>
                {manage ? (
                  <Text variant="label" color="primaryText">
                    Escolher
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: space[4], padding: space[5] },
  banner: { flexDirection: "row", alignItems: "center", gap: space[2], padding: space[3], borderRadius: radius.md },
  titleBlock: { gap: space[1] },
  facts: { flexDirection: "row", gap: space[6] },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  meRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingTop: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  actions: { gap: space[2] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: space[4] },
  person: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[2], minHeight: hitSize + 8 },
  memberText: { flex: 1, gap: space[1], alignItems: "flex-start" },
  call: { width: hitSize, height: hitSize, borderRadius: hitSize / 2, alignItems: "center", justifyContent: "center" },
  fnHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[1],
  },
  openSlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: color.warningStrong,
    alignItems: "center",
    justifyContent: "center",
  },
});

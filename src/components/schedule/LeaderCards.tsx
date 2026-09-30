import { Pressable, StyleSheet, View } from "react-native";
import type { AttentionItem, LeaderAttentionItem, LeaderMinistrySummary } from "@/api/contracts";
import { PressableCard } from "@/components/ui/Card";
import { CaretRightIcon, CheckCircleIcon, UserPlusIcon, WarningCircleIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { TONES } from "@/components/ui/StatusBadge";
import { churchToday, dayAndTime } from "@/features/schedules/format";
import { attentionCopy } from "@/features/schedules/status";
import { color, font, hitSize, radius, space } from "@/theme/tokens";

/** Situação da próxima escala de um ministério que a pessoa lidera (§18). */
export function LeaderMinistryCard({ summary, onOpen }: { summary: LeaderMinistrySummary; onOpen: (scheduleId: string) => void }) {
  const next = summary.nextSchedule;
  if (!next) {
    return (
      <View style={styles.emptyCard}>
        <Text variant="bodyStrong">{summary.ministry.name}</Text>
        <Text variant="label" color="mutedForeground">
          Nenhuma escala nas próximas semanas.
        </Text>
      </View>
    );
  }
  const t = next.totals;
  const when = `${dayAndTime(next.date, next.time, churchToday())} · ${next.eventName}`;
  const problems = next.attention.filter((a) => a.kind !== "no_response").length;
  const stats = [
    { label: t.confirmed === 1 ? "confirmada" : "confirmadas", value: t.confirmed, tone: "success" as const },
    { label: "aguardando", value: t.pending, tone: "warning" as const },
    { label: t.declined === 1 ? "recusou" : "recusaram", value: t.declined, tone: "danger" as const },
    { label: t.openSlots === 1 ? "vaga" : "vagas", value: t.openSlots, tone: "danger" as const },
  ].filter((s) => s.value > 0 || s.tone === "success");

  return (
    <PressableCard
      onPress={() => onOpen(next.scheduleId)}
      accessibilityLabel={`${summary.ministry.name}, próxima escala ${when}. ${t.people} pessoas, ${stats.map((s) => `${s.value} ${s.label}`).join(", ")}.`}
      accessibilityHint="Abre a escala"
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="overline" color="mutedForeground">
            {summary.ministry.name}
          </Text>
          <Text variant="heading" numberOfLines={1}>
            {when}
          </Text>
        </View>
        {next.isIncomplete ? (
          <View style={[styles.pill, { backgroundColor: color.warningSoft }]}>
            <WarningCircleIcon size={14} color={color.warning} weight="bold" />
            <Text variant="caption" color="warning" style={styles.pillText}>
              {problems === 1 ? "1 pendência" : `${problems} pendências`}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: color.successSoft }]}>
            <CheckCircleIcon size={14} color={color.success} weight="bold" />
            <Text variant="caption" color="success" style={styles.pillText}>
              Completa
            </Text>
          </View>
        )}
      </View>
      <View style={styles.stats}>
        <Stat value={t.people} label={t.people === 1 ? "pessoa" : "pessoas"} />
        {stats.map((s) => (
          <Stat key={s.label} value={s.value} label={s.label} tone={s.tone} />
        ))}
      </View>
    </PressableCard>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "success" | "warning" | "danger" }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading" tabular color={tone ? TONES[tone].fg : "foreground"}>
        {value}
      </Text>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
    </View>
  );
}

/** Pedidos de entrada na igreja esperando esta pessoa decidir. */
export function JoinRequestsRow({ count, onPress }: { count: number; onPress: () => void }) {
  const title = count === 1 ? "1 pessoa aguardando aprovação" : `${count} pessoas aguardando aprovação`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Novos cadastros na igreja.`}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: color.surfaceSunken } : null]}
    >
      <View style={[styles.dot, { backgroundColor: color.infoSoft }]}>
        <UserPlusIcon size={18} color={color.info} weight="bold" />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="foregroundSecondary">
          Novos cadastros na igreja
        </Text>
      </View>
      <CaretRightIcon size={18} color={color.mutedForeground} />
    </Pressable>
  );
}

/** Uma pendência concreta — o problema, onde, e (se houver) o caminho para resolver. */
export function AttentionRow({
  item,
  context,
  onPress,
}: {
  item: AttentionItem | LeaderAttentionItem;
  context?: string;
  onPress?: () => void;
}) {
  const copy = attentionCopy(item);
  const tone = TONES[copy.tone];
  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: tone.bg }]}>
        <WarningCircleIcon size={18} color={color[tone.fg]} weight="bold" />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{copy.title}</Text>
        <Text variant="caption" color="foregroundSecondary" numberOfLines={2}>
          {[copy.detail, context].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {onPress ? <CaretRightIcon size={18} color={color.mutedForeground} /> : null}
    </>
  );
  const label = [copy.title, copy.detail, context].filter(Boolean).join(". ");
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre a escala para resolver"
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: color.surfaceSunken } : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4] },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space[4],
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  flex: { flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pillText: { fontFamily: font.medium },
  stats: { flexDirection: "row", flexWrap: "wrap", columnGap: space[5], rowGap: space[2] },
  stat: { minWidth: 56 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: hitSize + 16,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});

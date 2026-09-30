import { memo } from "react";
import { StyleSheet, View } from "react-native";
import type { AssignmentCard } from "@/api/contracts";
import { PressableCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Text } from "@/components/ui/Text";
import { dateTile, formatLongDate, formatTime } from "@/features/schedules/format";
import { assignmentStatusMeta } from "@/features/schedules/status";
import { color, radius, space } from "@/theme/tokens";

/** "Folha de calendário" da data — o dado mais escaneável da lista. */
export function DateTile({ date, muted }: { date: string; muted?: boolean }) {
  const t = dateTile(date);
  return (
    <View style={[styles.tile, muted ? styles.tileMuted : null]} importantForAccessibility="no-hide-descendants">
      <Text variant="overline" color={muted ? "mutedForeground" : "primaryText"} maxFontSizeMultiplier={1.2}>
        {t.weekday}
      </Text>
      <Text variant="title" tabular maxFontSizeMultiplier={1.2} color={muted ? "foregroundSecondary" : "foreground"} style={styles.day}>
        {t.day}
      </Text>
      <Text variant="caption" color="mutedForeground" maxFontSizeMultiplier={1.2}>
        {t.month}
      </Text>
    </View>
  );
}

/** Cartão de escala da lista (§19): data, evento, ministério, função, horário, status. */
export const ScheduleCard = memo(function ScheduleCard({ card, onPress }: { card: AssignmentCard; onPress: (card: AssignmentCard) => void }) {
  const meta = assignmentStatusMeta(card.status, card.scheduleStatus);
  const inactive = card.scheduleStatus === "CANCELLED" || card.status === "REPLACED" || card.status === "CANCELLED";
  const who = [card.ministry.name, card.functionName].filter(Boolean).join(" · ");
  const when = [formatTime(card.time), card.arrivalTime ? `chegada ${formatTime(card.arrivalTime)}` : ""].filter(Boolean).join(" · ");
  return (
    <PressableCard
      onPress={() => onPress(card)}
      accessibilityLabel={`${formatLongDate(card.date)}, ${card.eventName}, ${who}, ${when}. ${meta.label}`}
      accessibilityHint="Abre os detalhes da escala"
      style={styles.card}
    >
      <DateTile date={card.date} muted={inactive} />
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={1} color={inactive ? "foregroundSecondary" : "foreground"}>
          {card.eventName}
        </Text>
        <Text variant="label" color="foregroundSecondary" numberOfLines={1}>
          {who}
        </Text>
        {when ? (
          <Text variant="caption" color="mutedForeground" numberOfLines={1}>
            {when}
          </Text>
        ) : null}
        <View style={styles.badgeRow}>
          <StatusBadge label={meta.label} icon={meta.icon} tone={meta.tone} size="sm" />
        </View>
      </View>
    </PressableCard>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: space[4], alignItems: "flex-start" },
  tile: {
    width: 56,
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: color.primarySoft,
    alignItems: "center",
  },
  tileMuted: { backgroundColor: color.muted },
  day: { marginVertical: -2 },
  body: { flex: 1, gap: 2 },
  badgeRow: { marginTop: space[2], alignItems: "flex-start" },
});

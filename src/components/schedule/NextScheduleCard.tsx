import { StyleSheet, View } from "react-native";
import type { AssignmentCard } from "@/api/contracts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircleIcon, ClockIcon, InfoIcon, MapPinIcon } from "@/components/ui/icons";
import { Text } from "@/components/ui/Text";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { churchToday, formatLongDate, formatTime, relativeDay } from "@/features/schedules/format";
import { assignmentStatusMeta } from "@/features/schedules/status";
import { color, font, radius, space } from "@/theme/tokens";
import { useAssignmentActions } from "./useAssignmentActions";

/**
 * Hero da Home do servo (§17): responde em um olhar — quando, onde, qual
 * função, e se precisa fazer algo. Uma ação principal clara. Fundo escuro
 * para se destacar dos cartões brancos do resto da tela.
 */
export function NextScheduleCard({ card, onOpen }: { card: AssignmentCard; onOpen: () => void }) {
  const actions = useAssignmentActions({ assignmentId: card.assignmentId, scheduleId: card.scheduleId, date: card.date });
  const rel = relativeDay(card.date, churchToday());
  const accepted = card.status === "ACCEPTED";
  const meta = assignmentStatusMeta(card.status, card.scheduleStatus);

  return (
    <Card style={styles.card} padded={false}>
      <View style={styles.top}>
        <View style={styles.overlineRow}>
          <Text variant="overline" color="heroAccent">
            Próxima escala
          </Text>
          {rel ? (
            <View style={styles.relChip}>
              <Text variant="caption" color="heroAccent" style={styles.relText}>
                {rel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="title" color="heroForeground" accessibilityRole="header">
          {formatLongDate(card.date)}
        </Text>
        <Text variant="heading" color="heroSecondary">
          {card.eventName}
        </Text>
      </View>

      <View style={styles.facts}>
        <Fact label="Ministério" value={card.ministry.name} />
        <Fact label="Função" value={card.functionName || "A definir"} />
        {card.arrivalTime ? (
          <Fact label="Chegada" value={formatTime(card.arrivalTime)} emphasis />
        ) : (
          <Fact label="Início" value={formatTime(card.time)} emphasis />
        )}
      </View>

      <View style={styles.meta}>
        {card.arrivalTime ? (
          <MetaLine icon={<ClockIcon size={16} color={color.heroMuted} />} text={`Início às ${formatTime(card.time)}`} />
        ) : null}
        {card.location ? <MetaLine icon={<MapPinIcon size={16} color={color.heroMuted} />} text={card.location} /> : null}
      </View>

      {card.reconfirmRequested ? (
        <View style={styles.notice} accessibilityRole="alert">
          <InfoIcon size={18} color={color.info} weight="bold" />
          <Text variant="label" color="info" style={styles.flex}>
            A escala mudou. Confirme de novo sua presença.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {accepted ? (
          <View style={styles.confirmedRow} accessibilityLiveRegion="polite">
            <View style={styles.confirmed}>
              <CheckCircleIcon size={22} color={color.heroSuccess} weight="fill" />
              <Text variant="bodyStrong" color="heroSuccess">
                Presença confirmada
              </Text>
            </View>
            <Button label="Ver detalhes" variant="ghostOnDark" onPress={onOpen} />
          </View>
        ) : card.status === "PENDING" ? (
          <>
            <Button label="Confirmar presença" size="lg" fullWidth loading={actions.confirming} onPress={actions.confirm} />
            <View style={styles.secondaryRow}>
              <Button label="Não posso servir" variant="ghostOnDark" onPress={actions.openDecline} />
              <Button label="Ver detalhes" variant="ghostOnDark" onPress={onOpen} />
            </View>
          </>
        ) : (
          <View style={styles.confirmedRow}>
            <StatusBadge label={meta.label} icon={meta.icon} tone={meta.tone} />
            <Button label="Ver detalhes" variant="ghostOnDark" onPress={onOpen} />
          </View>
        )}
      </View>
      {actions.sheet}
    </Card>
  );
}

function Fact({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View style={[styles.fact, emphasis ? styles.factShort : null]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" color="heroMuted">
        {label}
      </Text>
      <Text variant={emphasis ? "heading" : "bodyStrong"} color="heroForeground" numberOfLines={2} tabular={emphasis}>
        {value}
      </Text>
    </View>
  );
}

function MetaLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.metaLine}>
      {icon}
      <Text variant="label" color="heroSecondary" style={styles.flex} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space[5], gap: space[5], backgroundColor: color.heroSurface },
  top: { gap: space[1] },
  overlineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[1] },
  // Discreto sobre o escuro: o único laranja forte do cartão é o "Confirmar".
  relChip: { backgroundColor: color.heroPressed, borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: 3 },
  relText: { fontFamily: font.semibold },
  facts: {
    flexDirection: "row",
    gap: space[3],
    paddingVertical: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: color.heroBorder,
  },
  fact: { flex: 1, gap: 2 },
  // O horário é curto ("19h30"): cede espaço para nomes de função longos
  // ("Recepcionista") não quebrarem no meio da palavra.
  factShort: { flex: 0.7 },
  meta: { gap: space[2], marginTop: -space[2] },
  metaLine: { flexDirection: "row", alignItems: "center", gap: space[2] },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    backgroundColor: color.infoSoft,
    borderRadius: radius.md,
    padding: space[3],
  },
  actions: { gap: space[1] },
  secondaryRow: { flexDirection: "row", justifyContent: "space-between" },
  confirmedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confirmed: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
});

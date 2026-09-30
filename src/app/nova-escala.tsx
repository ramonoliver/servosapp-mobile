import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { ApiError } from "@/api/client";
import type { Occurrence } from "@/api/contracts";
import { endpoints, type ScheduleSource } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BookmarkSimpleIcon, CalendarPlusIcon, CheckIcon, CopyIcon, ListChecksIcon, type Icon } from "@/components/ui/icons";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, useIsOnline } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { errorText, useMinistryDetail, useOccurrences, useRefreshLeaderData } from "@/features/leader/queries";
import { useOverview } from "@/features/schedules/queries";
import { churchToday, dayLabel, formatShortDate, formatTime } from "@/features/schedules/format";
import { color, hitSize, radius, space } from "@/theme/tokens";
import { track } from "@/lib/analytics";

type Choice = { kind: "blank" } | { kind: "template"; id: string } | { kind: "duplicate"; id: string };

/**
 * Nova escala (§33): 1) evento e data; 2) como começar — modelo, duplicar
 * uma anterior (só estrutura ou com as pessoas) ou do zero. Sempre nasce
 * RASCUNHO: ninguém é avisado até o líder publicar (§13).
 */
export default function NewScheduleScreen() {
  const { ministryId } = useLocalSearchParams<{ ministryId: string }>();
  const id = String(ministryId ?? "");
  const occurrences = useOccurrences(id);
  const ministry = useMinistryDetail(id);
  const [picked, setPicked] = useState<Occurrence | null>(null);
  const [choice, setChoice] = useState<Choice>({ kind: "blank" });
  const [withPeople, setWithPeople] = useState(false);
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const refresh = useRefreshLeaderData();
  const online = useIsOnline();
  const today = churchToday();
  const canCreateEvents = Boolean(useOverview().data?.access?.canCreateEvents);
  const newEvent = () => router.push({ pathname: "/novo-evento", params: { ministryId: id } });

  const openSchedule = (scheduleId: string) => router.replace({ pathname: "/escala/[id]", params: { id: scheduleId } });

  const create = async () => {
    if (!picked) return;
    const source: ScheduleSource =
      choice.kind === "template"
        ? { kind: "template", templateId: choice.id }
        : choice.kind === "duplicate"
          ? { kind: "duplicate", scheduleId: choice.id, withPeople }
          : { kind: "blank" };
    setCreating(true);
    try {
      const res = await endpoints.createSchedule({ ministryId: id, eventId: picked.eventId, date: picked.date, time: picked.time || undefined, source });
      track("schedule_created", { source: source.kind });
      refresh({ ministryId: id });
      toast.show({
        kind: "success",
        title: "Rascunho criado",
        description: res.skipped.length
          ? `${res.skipped.length === 1 ? "1 pessoa ficou" : `${res.skipped.length} pessoas ficaram`} de fora (não estão mais no ministério).`
          : "Ninguém foi avisado ainda. Revise e publique.",
      });
      openSchedule(res.scheduleId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_EXISTS" && typeof e.body?.scheduleId === "string") {
        const existing = e.body.scheduleId;
        Alert.alert("Essa escala já existe", e.message, [
          { text: "Fechar", style: "cancel" },
          { text: "Abrir escala", onPress: () => openSchedule(existing) },
        ]);
      } else {
        toast.show({ kind: "error", title: "Não foi possível criar", description: errorText(e) });
      }
    } finally {
      setCreating(false);
    }
  };

  if (occurrences.isPending || ministry.isPending) {
    return (
      <Screen edges={["bottom"]}>
        <ScheduleCardSkeleton />
        <ScheduleCardSkeleton />
      </Screen>
    );
  }
  if (!occurrences.data || !ministry.data) {
    return (
      <Screen edges={["bottom"]}>
        <ErrorState message={(occurrences.error ?? ministry.error)?.message} onRetry={() => void Promise.all([occurrences.refetch(), ministry.refetch()])} />
      </Screen>
    );
  }

  const m = ministry.data;
  if (!picked) {
    const items = occurrences.data.items;
    return (
      <Screen edges={["bottom"]}>
        <Text variant="title" accessibilityRole="header">
          Para qual culto ou evento?
        </Text>
        <Text variant="body" color="foregroundSecondary">
          Próximas 8 semanas · {m.ministry.name}
        </Text>
        {items.length === 0 ? (
          <EmptyState
            icon={CalendarPlusIcon}
            title="Nenhum evento programado"
            description={canCreateEvents ? "Crie o culto ou evento e depois monte a escala." : "Os eventos são cadastrados pela administração da igreja."}
            actionLabel={canCreateEvents ? "Criar evento" : undefined}
            onAction={newEvent}
          />
        ) : (
          <Card padded={false}>
            {items.map((o, i) => (
              <Pressable
                key={`${o.eventId}-${o.date}`}
                onPress={() => (o.existingScheduleId ? openSchedule(o.existingScheduleId) : setPicked(o))}
                accessibilityRole="button"
                accessibilityLabel={`${o.eventName}, ${dayLabel(o.date, today)}${o.time ? `, ${formatTime(o.time)}` : ""}${o.existingScheduleId ? ", já tem escala" : ""}`}
                style={({ pressed }) => [styles.occ, i > 0 ? styles.occBorder : null, pressed ? { backgroundColor: color.surfaceSunken } : null]}
              >
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{o.eventName}</Text>
                  <Text variant="caption" color="mutedForeground">
                    {[dayLabel(o.date, today), formatTime(o.time), o.location].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                {o.existingScheduleId ? (
                  <Text variant="label" color="primaryText">
                    Já tem escala · Abrir
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </Card>
        )}
        {canCreateEvents && items.length > 0 ? (
          <Button label="Criar outro evento" icon={CalendarPlusIcon} variant="ghost" onPress={newEvent} />
        ) : null}
      </Screen>
    );
  }

  const option = (key: string, active: boolean, onPress: () => void, icon: Icon, title: string, description: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${title}. ${description}`}
      style={[styles.option, active ? styles.optionOn : null]}
    >
      {(() => {
        const I = icon;
        return <I size={22} color={active ? color.primaryText : color.foregroundSecondary} />;
      })()}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="foregroundSecondary">
          {description}
        </Text>
      </View>
      {active ? <CheckIcon size={20} color={color.primaryText} weight="bold" /> : null}
    </Pressable>
  );

  const activeFunctions = m.functions.filter((f) => f.status === "active");
  return (
    <Screen edges={["bottom"]}>
      <Pressable onPress={() => setPicked(null)} accessibilityRole="button" accessibilityLabel="Trocar evento" style={styles.pickedCard}>
        <View style={styles.flex}>
          <Text variant="overline" color="primaryText">
            {m.ministry.name}
          </Text>
          <Text variant="heading">{picked.eventName}</Text>
          <Text variant="label" color="foregroundSecondary">
            {[dayLabel(picked.date, today), formatTime(picked.time)].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Text variant="label" color="primaryText">
          Trocar
        </Text>
      </Pressable>

      <Text variant="title" accessibilityRole="header">
        Como começar?
      </Text>

      {m.templates.length > 0 ? (
        <>
          <SectionHeader title="Usar modelo" />
          {m.templates.map((t) =>
            option(
              t.id,
              choice.kind === "template" && choice.id === t.id,
              () => setChoice({ kind: "template", id: t.id }),
              BookmarkSimpleIcon,
              t.name,
              t.positions.map((p) => `${p.function_name} ×${p.quantity}`).join(" · "),
            ),
          )}
        </>
      ) : null}

      {m.recent.length > 0 ? (
        <>
          <SectionHeader title="Duplicar escala anterior" />
          {m.recent.slice(0, 4).map((r) =>
            option(
              r.scheduleId,
              choice.kind === "duplicate" && choice.id === r.scheduleId,
              () => setChoice({ kind: "duplicate", id: r.scheduleId }),
              CopyIcon,
              r.eventName,
              [formatShortDate(r.date), formatTime(r.time)].filter(Boolean).join(" · "),
            ),
          )}
          {choice.kind === "duplicate" ? (
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">Copiar também as pessoas</Text>
                <Text variant="caption" color="mutedForeground">
                  Entram como aguardando. Quem saiu do ministério fica de fora.
                </Text>
              </View>
              <Switch value={withPeople} onValueChange={setWithPeople} trackColor={{ true: color.primary, false: color.borderStrong }} />
            </View>
          ) : null}
        </>
      ) : null}

      <SectionHeader title="Do zero" />
      {option(
        "blank",
        choice.kind === "blank",
        () => setChoice({ kind: "blank" }),
        ListChecksIcon,
        "Começar do zero",
        activeFunctions.length
          ? `Funções do ministério: ${activeFunctions.map((f) => `${f.name} ×${f.defaultQuantity}`).join(" · ")}`
          : "Sem funções cadastradas — você adiciona depois.",
      )}

      <Button label="Criar rascunho" size="lg" fullWidth loading={creating} disabled={!online} onPress={create} />
      <Text variant="caption" color="mutedForeground" align="center">
        A equipe só é avisada quando você publicar.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  occ: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], minHeight: hitSize + 16 },
  occBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  pickedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.primarySoft,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  optionOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  switchRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[1] },
});

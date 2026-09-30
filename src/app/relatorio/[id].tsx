import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PersonReport } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { ChartBarHorizontalIcon } from "@/components/ui/icons";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { lastServedLabel } from "@/features/leader/copy";
import { errorText } from "@/features/leader/queries";
import { churchToday } from "@/features/schedules/format";
import { track } from "@/lib/analytics";
import { color, radius, space } from "@/theme/tokens";

const PERIODS = [
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "6 meses" },
] as const;

const FLAG: Record<NonNullable<PersonReport["flag"]>, { text: string; color: keyof typeof color }> = {
  overloaded: { text: "Serviu bem acima da média", color: "warning" },
  declines_often: { text: "Recusou mais do que serviu", color: "danger" },
  idle: { text: "Sem escalas no período", color: "mutedForeground" },
};

function daysSince(iso: string | null, today: string): number | null {
  if (!iso) return null;
  return Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86_400_000);
}

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

// Relatório da equipe (P2: relatórios + distribuição). Para o líder ver se a
// escala está pesando em poucas pessoas e quem ficou de fora.
export default function MinistryReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("90");
  const q = useQuery({ queryKey: ["report", id, period], queryFn: () => endpoints.ministryReport(String(id), Number(period)), enabled: Boolean(id) });
  const today = churchToday();

  useEffect(() => {
    track("report_viewed", { days: Number(period) });
  }, [period]);

  if (q.isError) return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;
  const r = q.data;
  const maxServed = Math.max(1, ...(r?.people.map((p) => p.served) ?? [0]));

  return (
    <Screen edges={[]} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {r ? (
        <Text variant="title" accessibilityRole="header">
          {r.ministry.name}
        </Text>
      ) : (
        <Skeleton width={160} height={28} />
      )}
      <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} accessibilityLabel="Período do relatório" />

      {!r ? (
        <View style={styles.skeletons}>
          <Skeleton height={96} rounded={16} />
          <Skeleton height={220} rounded={16} />
        </View>
      ) : r.totals.schedules === 0 ? (
        <EmptyState
          icon={ChartBarHorizontalIcon}
          title="Nenhuma escala neste período"
          description="Quando as escalas acontecerem, você vê aqui a confirmação e a distribuição da equipe."
        />
      ) : (
        <>
          <Card style={styles.kpis}>
            <Kpi value={String(r.totals.schedules)} label={r.totals.schedules === 1 ? "escala" : "escalas"} />
            <View style={styles.kpiDivider} />
            <Kpi value={pct(r.totals.confirmRate)} label="confirmaram" />
            <View style={styles.kpiDivider} />
            <Kpi value={pct(r.totals.fillRate)} label="das vagas cobertas" />
          </Card>
          <Text variant="label" color="foregroundSecondary">
            {[
              `${r.totals.confirmed} ${r.totals.confirmed === 1 ? "confirmação" : "confirmações"}`,
              `${r.totals.declined} ${r.totals.declined === 1 ? "recusa" : "recusas"}`,
              r.totals.replacements ? `${r.totals.replacements} ${r.totals.replacements === 1 ? "substituição" : "substituições"}` : null,
              r.totals.unanswered ? `${r.totals.unanswered} sem resposta` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>

          <SectionHeader title="Quem está servindo" trailing={<Text variant="caption" color="mutedForeground">{`Média ${String(r.averageServed).replace(".", ",")} por pessoa`}</Text>} />
          <Card padded={false}>
            {r.people.map((p, i) => {
              const days = daysSince(p.lastServedDate, today);
              const flag = p.flag ? FLAG[p.flag] : null;
              return (
                <View
                  key={p.userId}
                  style={[styles.person, i > 0 ? styles.personBorder : null]}
                  accessible
                  accessibilityLabel={`${p.name}: serviu ${p.served} ${p.served === 1 ? "vez" : "vezes"}${p.declined ? `, recusou ${p.declined}` : ""}${flag ? `. ${flag.text}` : ""}`}
                >
                  <Avatar name={p.name} photoUrl={p.photoUrl} avatarColor={p.avatarColor} size={36} />
                  <View style={styles.flex}>
                    <View style={styles.personHead}>
                      <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                        {p.name}
                      </Text>
                      <Text variant="heading" tabular>
                        {p.served}
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.bar, { width: `${(p.served / maxServed) * 100}%` }, p.flag === "overloaded" ? styles.barHot : null]} />
                    </View>
                    <Text variant="caption" color={flag?.color ?? "mutedForeground"}>
                      {flag?.text ??
                        [lastServedLabel(days), p.declined ? `${p.declined} ${p.declined === 1 ? "recusa" : "recusas"}` : null, p.upcoming ? `${p.upcoming} próxima${p.upcoming === 1 ? "" : "s"}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpi}>
      <Text variant="title" tabular>
        {value}
      </Text>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeletons: { gap: space[4] },
  // Topo alinhado: rótulo que quebra linha não desalinha os números.
  kpis: { flexDirection: "row", alignItems: "flex-start" },
  kpi: { flex: 1, gap: 2 },
  kpiDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: color.border, marginHorizontal: space[3] },
  person: { flexDirection: "row", gap: space[3], padding: space[4], alignItems: "flex-start" },
  personBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  personHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
  track: { height: 6, borderRadius: radius.full, backgroundColor: color.muted, marginVertical: space[1], overflow: "hidden" },
  bar: { height: 6, borderRadius: radius.full, backgroundColor: color.foregroundSecondary },
  barHot: { backgroundColor: color.warningStrong },
});

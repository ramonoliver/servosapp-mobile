import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, SectionList, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { Candidate, CandidateFlag } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { Avatar } from "@/components/ui/Avatar";
import { SearchField } from "@/components/ui/Filters";
import { CheckCircleIcon, UsersThreeIcon, WarningCircleIcon } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { candidateLines, overrideDialog } from "@/features/leader/copy";
import { errorText, useCandidates, useRefreshLeaderData } from "@/features/leader/queries";
import { color, gutter, hitSize, radius, space } from "@/theme/tokens";
import { track } from "@/lib/analytics";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Escolher pessoa para uma vaga (§23, §57, §58). O sistema recomenda; o líder
 * decide. Aviso de conflito/indisponibilidade não bloqueia, mas pede decisão
 * consciente (§25/§26) — e o override fica no AuditLog.
 */
export default function PickPersonScreen() {
  const params = useLocalSearchParams<{ scheduleId: string; functionName?: string; replacing?: string; replacingName?: string }>();
  const scheduleId = String(params.scheduleId ?? "");
  const functionName = String(params.functionName ?? "");
  const replacing = params.replacing ? String(params.replacing) : undefined;
  const { data, isPending, isError, error, refetch } = useCandidates(scheduleId, functionName, replacing);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const refresh = useRefreshLeaderData();

  const sections = useMemo(() => {
    const q = fold(query.trim());
    const match = (c: Candidate) => !q || fold(c.name).includes(q);
    return [
      { key: "rec", title: "Recomendados", data: (data?.recommended ?? []).filter(match) },
      { key: "others", title: "Outros", data: (data?.others ?? []).filter(match) },
    ].filter((s) => s.data.length > 0);
  }, [data, query]);

  const assign = async (c: Candidate, override: boolean) => {
    setBusy(c.userId);
    try {
      await endpoints.assign(scheduleId, { userId: c.userId, functionName: functionName || undefined, replacingAssignmentId: replacing, override });
      track("person_assigned", { replacing: Boolean(replacing), override, recommended: c.flags.length === 0 });
      refresh({ scheduleId });
      toast.show({
        kind: "success",
        title: replacing ? `${c.name.split(" ")[0]} vai substituir` : `${c.name.split(" ")[0]} foi escalado`,
        description: "Enviamos o aviso para confirmar presença.",
      });
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.code === "NEEDS_OVERRIDE") {
        confirmOverride(c, (e.body?.flags as CandidateFlag[]) ?? c.flags);
      } else {
        toast.show({ kind: "error", title: "Não foi possível escalar", description: errorText(e) });
      }
    } finally {
      setBusy(null);
    }
  };

  const confirmOverride = (c: Candidate, flags: readonly CandidateFlag[]) => {
    const dialog = overrideDialog(c.name, flags);
    if (!dialog) return void assign(c, false);
    Alert.alert(dialog.title, dialog.message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Escalar mesmo assim", onPress: () => void assign(c, true) },
    ]);
  };

  const onPick = (c: Candidate) => {
    if (busy) return;
    if (overrideDialog(c.name, c.flags)) confirmOverride(c, c.flags);
    else void assign(c, false);
  };

  const title = replacing ? "Encontrar substituto" : "Escolher pessoa";
  const subtitle = [functionName, replacing && params.replacingName ? `no lugar de ${params.replacingName}` : ""].filter(Boolean).join(" · ");

  return (
    <View style={styles.fill}>
      <Stack.Screen options={{ title }} />
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.userId}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <OfflineBanner />
            {subtitle ? (
              <Text variant="bodyStrong" color="foregroundSecondary">
                {subtitle}
              </Text>
            ) : null}
            <SearchField value={query} onChangeText={setQuery} placeholder="Buscar pelo nome" />
          </View>
        }
        renderSectionHeader={({ section }) => <SectionHeader title={section.title} inList />}
        renderItem={({ item, index, section }) => (
          <CandidateRow
            c={item}
            functionName={functionName}
            first={index === 0}
            last={index === section.data.length - 1}
            busy={busy === item.userId}
            onPress={() => onPick(item)}
          />
        )}
        ListEmptyComponent={
          isPending ? (
            <View style={styles.skeletons}>
              <ScheduleCardSkeleton />
              <ScheduleCardSkeleton />
            </View>
          ) : isError ? (
            <ErrorState message={error?.message} onRetry={() => void refetch()} />
          ) : (
            <EmptyState
              icon={UsersThreeIcon}
              title={query ? "Ninguém com esse nome" : "Não há mais ninguém disponível"}
              description={query ? undefined : "Todas as pessoas do ministério já estão nesta escala."}
            />
          )
        }
      />
    </View>
  );
}

function CandidateRow({
  c,
  functionName,
  first,
  last,
  busy,
  onPress,
}: {
  c: Candidate;
  functionName: string;
  first: boolean;
  last: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const lines = candidateLines(c, functionName);
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy }}
      accessibilityLabel={`${c.name}. ${lines.map((l) => l.text).join(". ")}`}
      style={({ pressed }) => [
        styles.row,
        first ? styles.rowFirst : styles.rowBorder,
        last ? styles.rowLast : null,
        pressed || busy ? { backgroundColor: color.surfaceSunken } : null,
      ]}
    >
      <Avatar name={c.name} photoUrl={c.photoUrl} avatarColor={c.avatarColor} size={40} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {c.name}
        </Text>
        {lines.map((l) => (
          <View key={l.text} style={styles.line}>
            {l.tone === "success" ? (
              <CheckCircleIcon size={14} color={color.success} weight="bold" />
            ) : (
              <WarningCircleIcon size={14} color={l.tone === "warning" ? color.warning : color.mutedForeground} weight="bold" />
            )}
            <Text variant="caption" color={l.tone === "success" ? "success" : l.tone === "warning" ? "warning" : "mutedForeground"} style={styles.flex}>
              {l.text}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: gutter, paddingBottom: space[12] },
  header: { gap: space[3], paddingTop: space[3] },
  skeletons: { gap: space[3], marginTop: space[4] },
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: hitSize + 16,
    backgroundColor: color.surface,
  },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  line: { flexDirection: "row", alignItems: "center", gap: space[1] },
});

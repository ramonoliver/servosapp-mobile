import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { MinistryDetail, MinistryFunctionView, MinistryMemberView } from "@/api/contracts";
import { endpoints, type MemberAction } from "@/api/endpoints";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Avatar } from "@/components/ui/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card, PressableCard } from "@/components/ui/Card";
import { FilterChips, SearchField } from "@/components/ui/Filters";
import {
  CalendarPlusIcon,
  CaretRightIcon,
  ChartBarHorizontalIcon,
  CheckIcon,
  CrownSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  ListChecksIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from "@/components/ui/icons";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stepper } from "@/components/ui/Stepper";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { filterTeam, type TeamFilter } from "@/features/leader/copy";
import { errorText, useMinistryDetail, usePeopleSearch, useRefreshLeaderData } from "@/features/leader/queries";
import { churchToday, dayLabel, formatTime } from "@/features/schedules/format";
import { color, hitSize, radius, space } from "@/theme/tokens";

type Tab = "team" | "functions" | "schedules";

export default function MinistryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ministryId = String(id ?? "");
  const { data, isPending, isError, error, refetch, isRefetching } = useMinistryDetail(ministryId);
  const [tab, setTab] = useState<Tab>("team");

  if (isPending) {
    return (
      <Screen edges={[]}>
        <ScheduleCardSkeleton />
        <ScheduleCardSkeleton />
      </Screen>
    );
  }
  if (!data) {
    const status = error instanceof ApiError ? error.status : 0;
    return (
      <Screen edges={[]}>
        {status === 403 || status === 404 ? (
          <EmptyState
            icon={UsersThreeIcon}
            title={status === 404 ? "Ministério não encontrado" : "Você não faz parte deste ministério"}
            actionLabel="Voltar"
            onAction={() => router.back()}
          />
        ) : isError ? (
          <ErrorState message={error?.message} onRetry={() => void refetch()} />
        ) : null}
      </Screen>
    );
  }

  const canManage = data.permissions.canManage;
  return (
    <Screen edges={[]} refreshing={isRefetching} onRefresh={refetch}>
      <Stack.Screen
        options={{
          title: data.ministry.name,
          headerRight: canManage
            ? () => (
                <Pressable
                  onPress={() => router.push({ pathname: "/relatorio/[id]", params: { id: data.ministry.id } })}
                  accessibilityRole="button"
                  accessibilityLabel="Relatório da equipe"
                  hitSlop={10}
                  style={styles.headerAction}
                >
                  <ChartBarHorizontalIcon size={18} color={color.primaryText} weight="bold" />
                  <Text variant="bodyStrong" color="primaryText">
                    Relatório
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <OfflineBanner />
      {data.ministry.description ? (
        <Text variant="body" color="foregroundSecondary">
          {data.ministry.description}
        </Text>
      ) : null}
      {canManage ? (
        <SegmentedControl
          options={[
            { value: "team", label: "Equipe" },
            { value: "functions", label: "Funções" },
            { value: "schedules", label: "Escalas" },
          ]}
          value={tab}
          onChange={setTab}
          accessibilityLabel="Seção do ministério"
        />
      ) : null}
      {tab === "team" || !canManage ? <TeamTab data={data} /> : tab === "functions" ? <FunctionsTab data={data} /> : <SchedulesTab data={data} />}
    </Screen>
  );
}

// ── Equipe (§35) ───────────────────────────────────────────────────────────

function TeamTab({ data }: { data: MinistryDetail }) {
  const canManage = data.permissions.canManage;
  const [filter, setFilter] = useState<TeamFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MinistryMemberView | null>(null);
  const [editing, setEditing] = useState<MinistryMemberView | null>(null);
  const [adding, setAdding] = useState(false);
  const refresh = useRefreshLeaderData();
  const toast = useToast();
  const ministryId = data.ministry.id;
  const list = useMemo(() => filterTeam(data.team, filter, query), [data.team, filter, query]);
  const counts = {
    all: data.team.filter((m) => m.active).length,
    leaders: data.team.filter((m) => m.active && m.role === "LEADER").length,
    members: data.team.filter((m) => m.active && m.role === "MEMBER").length,
    inactive: data.team.filter((m) => !m.active).length,
  };

  const run = async (input: MemberAction, success: string) => {
    try {
      const res = await endpoints.ministryMember(ministryId, input);
      toast.show({ kind: "success", title: success, description: res.cancelledAssignments ? "As escalas futuras foram liberadas para você revisar." : undefined });
      refresh({ ministryId });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === "HAS_FUTURE_SCHEDULES" && input.action === "remove") {
        Alert.alert(e.message, "As vagas dessas escalas voltam a ficar abertas para você escolher outra pessoa.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover e revisar escalas", style: "destructive", onPress: () => void run({ ...input, reviewSchedules: true }, success) },
        ]);
        return false;
      }
      if (e instanceof ApiError && e.code === "LAST_LEADER") {
        Alert.alert("Não é possível remover", e.message);
        return false;
      }
      toast.show({ kind: "error", title: "Não foi possível salvar", description: errorText(e) });
      return false;
    }
  };

  const first = (m: MinistryMemberView) => m.name.split(" ")[0];
  const actionsFor = (m: MinistryMemberView) => [
    { label: "Alterar funções", icon: ListChecksIcon, onPress: () => setEditing(m) },
    m.role === "LEADER"
      ? {
          label: "Remover liderança",
          description: `${first(m)} continua servindo no ministério.`,
          icon: CrownSimpleIcon,
          onPress: () =>
            Alert.alert(`Remover a liderança de ${first(m)}?`, "Essa pessoa deixa de administrar escalas e equipe deste ministério.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Remover liderança", style: "destructive", onPress: () => void run({ action: "demote", userId: m.userId }, "Liderança removida") },
            ]),
        }
      : {
          label: "Promover a líder",
          description: "Passa a administrar escalas e equipe deste ministério.",
          icon: CrownSimpleIcon,
          onPress: () => void run({ action: "promote", userId: m.userId }, `${first(m)} agora é líder`),
        },
    {
      label: "Remover do ministério",
      icon: UserMinusIcon,
      destructive: true,
      onPress: () =>
        Alert.alert(`Remover ${first(m)} do ministério?`, "O histórico de escalas continua preservado.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: () => void run({ action: "remove", userId: m.userId }, "Pessoa removida do ministério") },
        ]),
    },
  ];

  return (
    <>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por nome ou função" />
      <FilterChips
        options={[
          { value: "all", label: "Todos", count: counts.all },
          { value: "leaders", label: "Líderes", count: counts.leaders },
          { value: "members", label: "Servos", count: counts.members },
          ...(canManage && counts.inactive > 0 ? [{ value: "inactive" as const, label: "Inativos", count: counts.inactive }] : []),
        ]}
        value={filter}
        onChange={setFilter}
      />
      {canManage ? <Button label="Adicionar pessoa" icon={UserPlusIcon} variant="secondary" fullWidth onPress={() => setAdding(true)} /> : null}
      {list.length === 0 ? (
        <EmptyState icon={UsersThreeIcon} title="Ninguém por aqui" description={query ? "Nenhuma pessoa com esse nome ou função." : undefined} />
      ) : (
        <Card padded={false}>
          {list.map((m, i) => (
            <View key={m.userId}>
              {i > 0 ? <RowDivider inset={68} /> : null}
              <Pressable
                disabled={!canManage || m.isMe}
                onPress={() => setSelected(m)}
                accessibilityRole={canManage && !m.isMe ? "button" : undefined}
                accessibilityLabel={`${m.name}, ${m.role === "LEADER" ? "líder" : "servo"}${m.functions.length ? `, ${m.functions.join(", ")}` : ""}`}
                style={({ pressed }) => [styles.member, pressed ? { backgroundColor: color.surfaceSunken } : null]}
              >
                <Avatar name={m.name} photoUrl={m.photoUrl} avatarColor={m.avatarColor} size={40} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1} color={m.active ? "foreground" : "mutedForeground"}>
                    {m.name}
                    {m.isMe ? <Text variant="body" color="mutedForeground"> · você</Text> : null}
                  </Text>
                  <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                    {m.functions.length ? m.functions.join(" · ") : "Sem função definida"}
                  </Text>
                </View>
                {m.role === "LEADER" ? <StatusBadge label="Líder" icon="check" tone="info" size="sm" /> : null}
                {!m.active ? <StatusBadge label="Inativo" icon="prohibit" tone="neutral" size="sm" /> : null}
                {canManage && !m.isMe ? <CaretRightIcon size={16} color={color.mutedForeground} /> : null}
              </Pressable>
            </View>
          ))}
        </Card>
      )}
      {selected ? (
        <ActionSheet
          visible
          onClose={() => setSelected(null)}
          title={selected.name}
          description={selected.functions.length ? selected.functions.join(" · ") : "Sem função definida"}
          actions={actionsFor(selected)}
        />
      ) : null}
      {editing ? (
        <FunctionsPicker
          title={`Funções de ${first(editing)}`}
          functions={data.functions.filter((f) => f.status === "active")}
          initial={editing.functions}
          confirmLabel="Salvar funções"
          onClose={() => setEditing(null)}
          onConfirm={async (names) => {
            const ok = await run({ action: "set_functions", userId: editing.userId, functionNames: names }, "Funções atualizadas");
            if (ok) setEditing(null);
          }}
        />
      ) : null}
      {adding ? <AddPersonSheet data={data} onClose={() => setAdding(false)} onAdd={(userId, names) => run({ action: "add", userId, functionNames: names }, "Pessoa adicionada")} /> : null}
    </>
  );
}

function FunctionsPicker({
  title,
  functions,
  initial,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  functions: MinistryFunctionView[];
  initial: string[];
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (names: string[]) => Promise<void> | void;
}) {
  const [picked, setPicked] = useState(new Set(initial.map((n) => n.toLowerCase())));
  const [saving, setSaving] = useState(false);
  const toggle = (name: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      const k = name.toLowerCase();
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  return (
    <BottomSheet visible onClose={onClose} dismissable={!saving} title={title} description="Uma pessoa pode ter mais de uma função.">
      {functions.length === 0 ? (
        <Text variant="body" color="foregroundSecondary">
          Crie as funções do ministério na aba Funções.
        </Text>
      ) : (
        <View style={styles.checks}>
          {functions.map((f) => {
            const on = picked.has(f.name.toLowerCase());
            return (
              <Pressable
                key={f.id}
                onPress={() => toggle(f.name)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={[styles.check, on ? styles.checkOn : null]}
              >
                <View style={[styles.box, on ? styles.boxOn : null]}>{on ? <CheckIcon size={14} color={color.primaryForeground} weight="bold" /> : null}</View>
                <Text variant="bodyStrong">{f.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Button
        label={confirmLabel}
        size="lg"
        fullWidth
        loading={saving}
        onPress={async () => {
          setSaving(true);
          await onConfirm(functions.filter((f) => picked.has(f.name.toLowerCase())).map((f) => f.name));
          setSaving(false);
        }}
      />
    </BottomSheet>
  );
}

function AddPersonSheet({
  data,
  onClose,
  onAdd,
}: {
  data: MinistryDetail;
  onClose: () => void;
  onAdd: (userId: string, functionNames: string[]) => Promise<boolean>;
}) {
  const [q, setQ] = useState("");
  const [person, setPerson] = useState<{ id: string; name: string } | null>(null);
  const people = usePeopleSearch(data.ministry.id, q.trim(), !person);

  if (person) {
    return (
      <FunctionsPicker
        title={`Funções de ${person.name.split(" ")[0]}`}
        functions={data.functions.filter((f) => f.status === "active")}
        initial={[]}
        confirmLabel="Adicionar ao ministério"
        onClose={onClose}
        onConfirm={async (names) => {
          if (await onAdd(person.id, names)) onClose();
        }}
      />
    );
  }
  return (
    <BottomSheet visible onClose={onClose} title="Adicionar pessoa" description={`Pessoas da igreja que ainda não estão em ${data.ministry.name}.`}>
      <SearchField value={q} onChangeText={setQ} placeholder="Buscar pelo nome" />
      <View style={styles.peopleList}>
        {people.isPending ? (
          <ScheduleCardSkeleton />
        ) : (people.data?.items ?? []).length === 0 ? (
          <Text variant="label" color="mutedForeground" align="center">
            Ninguém encontrado.
          </Text>
        ) : (
          people.data!.items.slice(0, 8).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setPerson(p)}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${p.name}`}
              style={({ pressed }) => [styles.person, pressed ? { backgroundColor: color.surfaceSunken } : null]}
            >
              <Avatar name={p.name} photoUrl={p.photoUrl} avatarColor={p.avatarColor} size={36} />
              <Text variant="body" style={styles.flex} numberOfLines={1}>
                {p.name}
              </Text>
              <PlusIcon size={18} color={color.primaryText} weight="bold" />
            </Pressable>
          ))
        )}
      </View>
      <Button
        label="Ainda não está no Servos? Convidar"
        icon={PaperPlaneTiltIcon}
        variant="ghost"
        fullWidth
        onPress={() => {
          onClose();
          router.push({ pathname: "/convidar", params: { ministryId: data.ministry.id } });
        }}
      />
    </BottomSheet>
  );
}

// ── Funções (§9) ───────────────────────────────────────────────────────────

function FunctionsTab({ data }: { data: MinistryDetail }) {
  const [editing, setEditing] = useState<MinistryFunctionView | "new" | null>(null);
  const refresh = useRefreshLeaderData();
  const toast = useToast();
  const toggle = async (f: MinistryFunctionView) => {
    try {
      await endpoints.ministryFunction(data.ministry.id, { action: f.status === "active" ? "deactivate" : "activate", functionId: f.id });
      toast.show({
        kind: "success",
        title: f.status === "active" ? "Função desativada" : "Função reativada",
        description: f.status === "active" ? "Ela some das novas escalas; o histórico continua." : undefined,
      });
      refresh({ ministryId: data.ministry.id });
    } catch (e) {
      toast.show({ kind: "error", title: "Não foi possível salvar", description: errorText(e) });
    }
  };
  const active = data.functions.filter((f) => f.status === "active");
  const inactive = data.functions.filter((f) => f.status === "inactive");
  const row = (f: MinistryFunctionView, i: number) => (
    <View key={f.id}>
      {i > 0 ? <RowDivider inset={16} /> : null}
      <ListRow
        title={f.name}
        subtitle={`${f.defaultQuantity} por escala · ${f.memberCount === 1 ? "1 pessoa" : `${f.memberCount} pessoas`}`}
        onPress={() => setEditing(f)}
        trailing={
          <Pressable
            onPress={() => void toggle(f)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={f.status === "active" ? `Desativar ${f.name}` : `Reativar ${f.name}`}
            style={styles.iconBtn}
          >
            {f.status === "active" ? <EyeIcon size={20} color={color.foregroundSecondary} /> : <EyeSlashIcon size={20} color={color.mutedForeground} />}
          </Pressable>
        }
      />
    </View>
  );
  return (
    <>
      <Button label="Nova função" icon={PlusIcon} variant="secondary" fullWidth onPress={() => setEditing("new")} />
      {active.length === 0 ? (
        <EmptyState icon={ListChecksIcon} title="Nenhuma função ainda" description="Crie o que as pessoas fazem aqui: Câmera, Vocal, Recepção…" />
      ) : (
        <Card padded={false}>{active.map(row)}</Card>
      )}
      {inactive.length > 0 ? (
        <>
          <SectionHeader title="Desativadas" />
          <Card padded={false}>{inactive.map(row)}</Card>
        </>
      ) : null}
      {editing ? <FunctionSheet ministryId={data.ministry.id} fn={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function FunctionSheet({ ministryId, fn, onClose }: { ministryId: string; fn: MinistryFunctionView | null; onClose: () => void }) {
  const [name, setName] = useState(fn?.name ?? "");
  const [qty, setQty] = useState(fn?.defaultQuantity ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useRefreshLeaderData();
  const toast = useToast();
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await endpoints.ministryFunction(
        ministryId,
        fn ? { action: "update", functionId: fn.id, name, defaultQuantity: qty } : { action: "create", name, defaultQuantity: qty },
      );
      toast.show({ kind: "success", title: fn ? "Função atualizada" : "Função criada" });
      refresh({ ministryId });
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <BottomSheet visible onClose={onClose} dismissable={!saving} title={fn ? "Editar função" : "Nova função"}>
      <TextField label="Nome" placeholder="Ex.: Câmera" value={name} onChangeText={setName} maxLength={40} error={error} autoFocus={!fn} />
      <View style={styles.qtyRow}>
        <View style={styles.flex}>
          <Text variant="bodyStrong">Quantidade padrão</Text>
          <Text variant="caption" color="mutedForeground">
            Quantas pessoas nesta função em cada escala.
          </Text>
        </View>
        <Stepper value={qty} onChange={setQty} min={1} max={50} label="Quantidade padrão" />
      </View>
      {fn && fn.name !== name.trim() && name.trim() ? (
        <Text variant="caption" color="mutedForeground">
          O novo nome vale para a equipe e para as próximas escalas. As escalas que já passaram mantêm o nome antigo.
        </Text>
      ) : null}
      <Button label="Salvar" size="lg" fullWidth loading={saving} onPress={save} />
    </BottomSheet>
  );
}

// ── Escalas do ministério ──────────────────────────────────────────────────

function SchedulesTab({ data }: { data: MinistryDetail }) {
  const today = churchToday();
  return (
    <>
      <Button
        label="Nova escala"
        icon={CalendarPlusIcon}
        size="lg"
        fullWidth
        onPress={() => router.push({ pathname: "/nova-escala", params: { ministryId: data.ministry.id } })}
      />
      {data.upcoming.length === 0 ? (
        <EmptyState icon={CalendarPlusIcon} title="Nenhuma escala nas próximas semanas" description="Crie a próxima a partir de um modelo ou de uma escala anterior." />
      ) : (
        data.upcoming.map((s) => (
          <PressableCard
            key={s.scheduleId}
            onPress={() => router.push({ pathname: "/escala/[id]", params: { id: s.scheduleId } })}
            accessibilityLabel={`${s.eventName}, ${dayLabel(s.date, today)}, ${s.filledSlots} de ${s.totalSlots} confirmadas`}
            style={styles.scheduleRow}
          >
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {s.eventName}
              </Text>
              <Text variant="caption" color="mutedForeground">
                {[dayLabel(s.date, today), formatTime(s.time)].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {s.status === "DRAFT" ? (
              <StatusBadge label="Rascunho" icon="clock" tone="neutral" size="sm" />
            ) : s.openSlots > 0 ? (
              <StatusBadge label={s.openSlots === 1 ? "1 vaga" : `${s.openSlots} vagas`} icon="x" tone="warning" size="sm" />
            ) : (
              <StatusBadge label={`${s.filledSlots}/${s.totalSlots}`} icon="check" tone={s.filledSlots >= s.totalSlots ? "success" : "warning"} size="sm" />
            )}
          </PressableCard>
        ))
      )}
      {data.templates.length > 0 ? (
        <>
          <SectionHeader title="Modelos" />
          <Card padded={false}>
            {data.templates.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <RowDivider inset={16} /> : null}
                <ListRow title={t.name} subtitle={t.positions.map((p) => `${p.function_name} ×${p.quantity}`).join(" · ")} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerAction: { flexDirection: "row", alignItems: "center", gap: space[1], paddingHorizontal: space[2] },
  flex: { flex: 1 },
  member: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], minHeight: hitSize + 16 },
  checks: { gap: space[2] },
  check: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[3], borderRadius: radius.md, borderWidth: 1.5, borderColor: color.border },
  checkOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.borderStrong, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  peopleList: { gap: 2, minHeight: 120 },
  person: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2], paddingHorizontal: space[1], minHeight: hitSize, borderRadius: radius.md },
  iconBtn: { width: hitSize, height: hitSize, alignItems: "center", justifyContent: "center" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
});

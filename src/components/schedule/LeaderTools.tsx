import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { AttentionItem, MobileScheduleDetail, TeamMember } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { ActionSheet, type SheetAction } from "@/components/ui/ActionSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import {
  ArrowsClockwiseIcon,
  BookmarkSimpleIcon,
  ClockCounterClockwiseIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  ProhibitInsetIcon,
  UserMinusIcon,
} from "@/components/ui/icons";
import { useIsOnline } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { criticalChangeDialog, type CriticalChange } from "@/features/leader/copy";
import { errorText, useRefreshLeaderData } from "@/features/leader/queries";
import { track } from "@/lib/analytics";
import { space } from "@/theme/tokens";

// Ferramentas do líder na escala (P1): publicar, editar (com alteração
// crítica §27 e conflito de versão #25), salvar como modelo, cancelar (§61),
// escalar/substituir/remover pessoas. Um só lugar para essas ações (§44).

export function openPicker(scheduleId: string, functionName: string, replacing?: { assignmentId: string; name: string }) {
  router.push({
    pathname: "/selecionar-pessoa",
    params: {
      scheduleId,
      functionName,
      ...(replacing ? { replacing: replacing.assignmentId, replacingName: replacing.name.split(" ")[0] } : {}),
    },
  });
}

/** Tocar numa pendência leva direto a resolvê-la (§18: não fazer o líder procurar). */
export function attentionAction(data: MobileScheduleDetail, item: AttentionItem): (() => void) | undefined {
  if (item.kind === "open_slots") return () => openPicker(data.schedule.id, item.functionName);
  if (item.kind === "declined" || item.kind === "replacement_requested") {
    return () => openPicker(data.schedule.id, item.functionName, { assignmentId: item.assignmentId, name: item.userName });
  }
  return undefined;
}

export function useLeaderTools(data: MobileScheduleDetail) {
  const s = data.schedule;
  const toast = useToast();
  const refresh = useRefreshLeaderData();
  const online = useIsOnline();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [publishing, setPublishing] = useState(false);
  const done = () => refresh({ scheduleId: s.id, ministryId: s.ministry.id });

  const versionConflict = (e: unknown) => {
    if (e instanceof ApiError && e.code === "VERSION_CONFLICT") {
      Alert.alert("Outra pessoa alterou esta escala", "Vamos carregar a versão mais recente para você revisar.", [{ text: "Ok", onPress: done }]);
      return true;
    }
    return false;
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await endpoints.editSchedule(s.id, { expectedVersion: s.version, publish: true });
      toast.show({ kind: "success", title: "Escala publicada", description: "A equipe foi avisada para confirmar presença." });
      track("schedule_published");
      done();
    } catch (e) {
      if (!versionConflict(e)) toast.show({ kind: "error", title: "Não foi possível publicar", description: errorText(e) });
    } finally {
      setPublishing(false);
    }
  };

  const cancel = () =>
    Alert.alert("Cancelar esta escala?", "Quem estava escalado será avisado de que não precisa comparecer. O histórico fica guardado.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar escala",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await endpoints.cancelSchedule(s.id);
            track("schedule_cancelled");
            toast.show({ kind: "success", title: "Escala cancelada", description: res.notified ? `${res.notified} pessoas foram avisadas.` : undefined });
            done();
          } catch (e) {
            toast.show({ kind: "error", title: "Não foi possível cancelar", description: errorText(e) });
          }
        },
      },
    ]);

  const memberActions = (m: TeamMember): SheetAction[] => {
    const first = m.name.split(" ")[0];
    const actions: SheetAction[] = [];
    if (m.status === "DECLINED" || m.status === "REPLACEMENT_PENDING") {
      actions.push({
        label: "Encontrar substituto",
        description: `Quem entra no lugar de ${first} em ${m.functionName || "sem função"}.`,
        icon: ArrowsClockwiseIcon,
        onPress: () => openPicker(s.id, m.functionName, { assignmentId: m.assignmentId, name: m.name }),
      });
    }
    actions.push({
      label: "Remover da escala",
      description: s.status === "DRAFT" ? "Ninguém foi avisado ainda." : `${first} será avisado de que não precisa comparecer.`,
      icon: UserMinusIcon,
      destructive: true,
      onPress: () =>
        Alert.alert(`Remover ${first} da escala?`, s.status === "DRAFT" ? undefined : "Essa pessoa será avisada.", [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              try {
                await endpoints.unassign(s.id, m.assignmentId);
                toast.show({ kind: "success", title: `${first} saiu da escala` });
                done();
              } catch (e) {
                toast.show({ kind: "error", title: "Não foi possível remover", description: errorText(e) });
              }
            },
          },
        ]),
    });
    return actions;
  };

  const cancelled = s.status === "CANCELLED";
  const past = s.status === "COMPLETED" || s.status === "ARCHIVED";
  const openHistory = () => router.push({ pathname: "/historico/[id]", params: { id: s.id } });
  const bar =
    cancelled || past ? (
      <View style={styles.bar}>
        <Button label="Histórico da escala" icon={ClockCounterClockwiseIcon} variant="secondary" fullWidth onPress={openHistory} />
      </View>
    ) : (
      <View style={styles.bar}>
        {s.status === "DRAFT" ? (
          <>
            <Button label="Publicar escala" icon={PaperPlaneTiltIcon} size="lg" fullWidth loading={publishing} disabled={!online} onPress={publish} />
            <Text variant="caption" color="mutedForeground" align="center">
              Ao publicar, cada pessoa recebe o aviso para confirmar.
            </Text>
          </>
        ) : null}
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Editar" icon={PencilSimpleIcon} variant="secondary" fullWidth disabled={!online} onPress={() => setEditOpen(true)} />
          </View>
          <View style={styles.flex}>
            <Button label="Mais" variant="secondary" fullWidth disabled={!online} onPress={() => setMenuOpen(true)} />
          </View>
        </View>
      </View>
    );

  const sheets = (
    <>
      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={s.event.name}
        actions={[
          { label: "Histórico", description: "Quem escalou, confirmou, recusou e o que mudou.", icon: ClockCounterClockwiseIcon, onPress: openHistory },
          { label: "Salvar como modelo", description: "Reaproveite funções e quantidades nas próximas.", icon: BookmarkSimpleIcon, onPress: () => setTemplateOpen(true) },
          { label: "Cancelar escala", icon: ProhibitInsetIcon, destructive: true, onPress: cancel },
        ]}
      />
      {member ? (
        <ActionSheet visible onClose={() => setMember(null)} title={member.name} description={member.functionName || undefined} actions={memberActions(member)} />
      ) : null}
      {editOpen ? <EditSheet data={data} onClose={() => setEditOpen(false)} onSaved={done} onVersionConflict={versionConflict} /> : null}
      {templateOpen ? <TemplateSheet data={data} onClose={() => setTemplateOpen(false)} onSaved={done} /> : null}
    </>
  );

  return { bar, sheets, openMember: setMember };
}

function EditSheet({
  data,
  onClose,
  onSaved,
  onVersionConflict,
}: {
  data: MobileScheduleDetail;
  onClose: () => void;
  onSaved: () => void;
  onVersionConflict: (e: unknown) => boolean;
}) {
  const s = data.schedule;
  const [time, setTime] = useState(s.time || "");
  const [arrival, setArrival] = useState(s.arrivalTime || "");
  const [location, setLocation] = useState(s.location || "");
  const [instructions, setInstructions] = useState(s.instructions || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const payload = {
    expectedVersion: s.version,
    ...(time && time !== s.time ? { time } : {}),
    ...(arrival !== s.arrivalTime ? { arrivalTime: arrival } : {}),
    ...(location.trim() !== s.location ? { location: location.trim() } : {}),
    ...(instructions.trim() !== s.instructions ? { instructions: instructions.trim() } : {}),
  };
  const changed = Object.keys(payload).length > 1;

  const submit = async (criticalChange: "check" | "reconfirm") => {
    setSaving(true);
    setError(null);
    try {
      const res = await endpoints.editSchedule(s.id, { ...payload, criticalChange });
      track("schedule_edited", { reconfirm: res.reconfirmationRequested > 0 });
      toast.show({
        kind: "success",
        title: "Escala atualizada",
        description: res.reconfirmationRequested
          ? `${res.reconfirmationRequested} ${res.reconfirmationRequested === 1 ? "pessoa foi avisada" : "pessoas foram avisadas"} para confirmar de novo.`
          : s.status === "PUBLISHED"
            ? "A equipe foi avisada do que mudou."
            : undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === "CRITICAL_CHANGE") {
        const dialog = criticalChangeDialog(Number(e.body?.confirmedCount ?? 0), (e.body?.changes as CriticalChange[]) ?? []);
        Alert.alert(dialog.title, dialog.message, [
          { text: "Cancelar", style: "cancel" },
          { text: "Salvar e solicitar nova confirmação", onPress: () => void submit("reconfirm") },
        ]);
      } else if (!onVersionConflict(e)) {
        setError(errorText(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible onClose={onClose} dismissable={!saving} title="Editar escala" description={`${s.event.name} · ${s.ministry.name}`}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateTimeField label="Início" mode="time" value={time || null} onChange={setTime} />
        </View>
        <View style={styles.flex}>
          <DateTimeField label="Chegada" mode="time" value={arrival || null} onChange={setArrival} placeholder="Sem horário" />
        </View>
      </View>
      <TextField label="Local" value={location} onChangeText={setLocation} placeholder="Ex.: Templo principal" maxLength={120} />
      <TextField label="Observações" value={instructions} onChangeText={setInstructions} placeholder="Ex.: chegar pelo portão lateral" multiline maxLength={1000} error={error} />
      <Button label="Salvar alterações" size="lg" fullWidth loading={saving} disabled={!changed} onPress={() => void submit("check")} />
    </BottomSheet>
  );
}

function TemplateSheet({ data, onClose, onSaved }: { data: MobileScheduleDetail; onClose: () => void; onSaved: () => void }) {
  const s = data.schedule;
  const [name, setName] = useState(`${s.event.name} — ${s.ministry.name}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await endpoints.saveTemplate(s.ministry.id, { name, fromScheduleId: s.id });
      toast.show({ kind: "success", title: "Modelo salvo", description: "Use em \"Nova escala\" nas próximas vezes." });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <BottomSheet
      visible
      onClose={onClose}
      dismissable={!saving}
      title="Salvar como modelo"
      description={data.coverage.byFunction.map((f) => `${f.functionName} ×${f.needed}`).join(" · ") || "Esta escala ainda não tem funções."}
    >
      <TextField label="Nome do modelo" value={name} onChangeText={setName} maxLength={60} error={error} />
      <Button label="Salvar modelo" size="lg" fullWidth loading={saving} onPress={save} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bar: { gap: space[2] },
  row: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1 },
});

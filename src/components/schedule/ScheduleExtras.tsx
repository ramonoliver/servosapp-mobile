import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { MobileScheduleDetail, ScheduleFile, SetlistEntry } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Card } from "@/components/ui/Card";
import {
  CalendarCheckIcon,
  ChatCircleDotsIcon,
  FileTextIcon,
  ImageIcon,
  MusicNotesIcon,
  PaperclipIcon,
  YoutubeLogoIcon,
} from "@/components/ui/icons";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { buildCalendarEvent } from "@/features/schedules/calendarEvent";
import { fileSizeLabel } from "@/features/schedules/files";
import { track } from "@/lib/analytics";
import { addToDeviceCalendar } from "@/lib/deviceCalendar";
import { color, radius, space } from "@/theme/tokens";

// O que acompanha a escala além da equipe: conversa, músicas (Louvor),
// arquivos e "salvar na agenda". Tudo à mão no detalhe (§20), sem outra aba.

export function ScheduleExtras({ data }: { data: MobileScheduleDetail }) {
  const s = data.schedule;
  const ended = s.status === "CANCELLED" || s.status === "COMPLETED" || s.status === "ARCHIVED";
  return (
    <>
      <SectionHeader title="Nesta escala" />
      <Card padded={false}>
        <ListRow
          icon={ChatCircleDotsIcon}
          title="Conversa da escala"
          subtitle="Recados da liderança e da equipe"
          onPress={() => router.push({ pathname: "/conversa/[id]", params: { id: s.id } })}
        />
        {data.me && !ended ? (
          <>
            <RowDivider />
            <AddToCalendarRow data={data} />
          </>
        ) : null}
      </Card>
      <Songs data={data} />
      <Files data={data} />
    </>
  );
}

function AddToCalendarRow({ data }: { data: MobileScheduleDetail }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const s = data.schedule;
  const add = async () => {
    setBusy(true);
    try {
      const result = await addToDeviceCalendar(
        buildCalendarEvent({
          eventName: s.event.name,
          ministryName: s.ministry.name,
          functionName: data.me?.functionName ?? null,
          date: s.date,
          time: s.time,
          endTime: s.endTime,
          arrivalTime: s.arrivalTime,
          location: s.location,
          instructions: s.instructions,
        }),
      );
      if (result === "saved") {
        track("calendar_saved");
        toast.show({ kind: "success", title: "Escala salva na agenda", description: "Com lembrete 2 horas antes." });
      } else if (result === "denied") {
        toast.show({ kind: "error", title: "Sem acesso à agenda", description: "Libere em Ajustes → Servos → Calendários." });
      } else if (result === "unavailable") {
        toast.show({ kind: "error", title: "Nenhuma agenda disponível neste aparelho" });
      }
    } catch {
      toast.show({ kind: "error", title: "Não foi possível abrir a agenda" });
    } finally {
      setBusy(false);
    }
  };
  return <ListRow icon={CalendarCheckIcon} title="Salvar na agenda" subtitle="Com a hora de chegada e lembrete" onPress={busy ? undefined : add} />;
}

// ── Músicas (Louvor) ────────────────────────────────────────────────────────

function Songs({ data }: { data: MobileScheduleDetail }) {
  const isWorship = data.schedule.ministry.kind === "louvor";
  const q = useQuery({
    queryKey: ["schedule-songs", data.schedule.id],
    queryFn: () => endpoints.scheduleSongs(data.schedule.id),
    enabled: isWorship,
  });
  const items = q.data?.items ?? [];
  const canEdit = Boolean(q.data?.canEdit) && isWorship;
  if (items.length === 0 && !canEdit) return null;
  return (
    <>
      <SectionHeader
        title="Músicas"
        trailing={
          canEdit ? (
            <Pressable onPress={() => router.push({ pathname: "/musicas/[id]", params: { id: data.schedule.id } })} accessibilityRole="button" hitSlop={8}>
              <Text variant="label" color="primaryText">
                {items.length ? "Editar" : "Montar lista"}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <Card>
          <Text variant="label" color="mutedForeground">
            Nenhuma música ainda. Monte a lista para a equipe ensaiar.
          </Text>
        </Card>
      ) : (
        <Card padded={false}>
          {items.map((song, i) => (
            <View key={song.songId}>
              {i > 0 ? <RowDivider inset={space[4]} /> : null}
              <SongRow song={song} />
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function SongRow({ song }: { song: SetlistEntry }) {
  const link = song.chordsUrl || song.lyricsUrl;
  return (
    <View style={styles.songRow}>
      <Text variant="label" color="mutedForeground" tabular style={styles.position}>
        {song.position}
      </Text>
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {song.title}
        </Text>
        <Text variant="caption" color="foregroundSecondary" numberOfLines={1}>
          {[song.artist, song.bpm ? `${song.bpm} bpm` : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {song.key ? (
        <View style={styles.keyChip} accessibilityLabel={`Tom ${song.key}`}>
          <Text variant="label" color="foreground">
            {song.key}
          </Text>
        </View>
      ) : null}
      {song.videoUrl ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`Vídeo de ${song.title}`} onPress={() => void WebBrowser.openBrowserAsync(song.videoUrl!)} hitSlop={6} style={styles.iconBtn}>
          <YoutubeLogoIcon size={22} color={color.foregroundSecondary} />
        </Pressable>
      ) : null}
      {link ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`Cifra de ${song.title}`} onPress={() => void WebBrowser.openBrowserAsync(link)} hitSlop={6} style={styles.iconBtn}>
          <FileTextIcon size={22} color={color.foregroundSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Arquivos ────────────────────────────────────────────────────────────────

function Files({ data }: { data: MobileScheduleDetail }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const key = ["schedule-files", data.schedule.id];
  const q = useQuery({ queryKey: key, queryFn: () => endpoints.scheduleFiles(data.schedule.id) });
  const files = q.data?.files ?? [];
  const canUpload = data.permissions.canManage && data.schedule.status !== "CANCELLED";

  const upload = useMutation({
    mutationFn: (uri: string) => endpoints.uploadScheduleFile(data.schedule.id, { uri }),
    onSuccess: () => {
      track("file_attached");
      void qc.invalidateQueries({ queryKey: key });
      toast.show({ kind: "success", title: "Arquivo anexado", description: "A equipe já pode abrir pela escala." });
    },
    onError: (e) => toast.show({ kind: "error", title: "Não foi possível anexar", description: errorText(e) }),
  });

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "audio/*", "text/plain", "application/vnd.openxmlformats-officedocument.*"],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets?.[0]) upload.mutate(res.assets[0].uri);
  };
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) upload.mutate(res.assets[0].uri);
  };

  if (files.length === 0 && !canUpload) return null;
  return (
    <>
      <SectionHeader
        title="Arquivos"
        trailing={
          canUpload ? (
            <Pressable onPress={() => setMenu(true)} accessibilityRole="button" hitSlop={8} disabled={upload.isPending}>
              <Text variant="label" color="primaryText">
                {upload.isPending ? "Enviando…" : "Anexar"}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      {files.length === 0 ? (
        <Card>
          <Text variant="label" color="mutedForeground">
            Roteiro, cifras, mapa de palco… anexe aqui para a equipe (até 4 MB).
          </Text>
        </Card>
      ) : (
        <Card padded={false}>
          {files.map((f, i) => (
            <View key={f.id}>
              {i > 0 ? <RowDivider /> : null}
              <FileRow file={f} />
            </View>
          ))}
        </Card>
      )}
      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title="Anexar à escala"
        actions={[
          { label: "Documento ou áudio", description: "PDF, Word, planilha, áudio", icon: PaperclipIcon, onPress: () => void pickDocument() },
          { label: "Foto", description: "Da galeria do celular", icon: ImageIcon, onPress: () => void pickImage() },
        ]}
      />
    </>
  );
}

function FileRow({ file }: { file: ScheduleFile }) {
  const isImage = file.contentType.startsWith("image/");
  return (
    <ListRow
      icon={isImage ? ImageIcon : file.contentType.startsWith("audio/") ? MusicNotesIcon : FileTextIcon}
      title={file.name}
      subtitle={[fileSizeLabel(file.size), file.uploadedByName].filter(Boolean).join(" · ")}
      onPress={file.url ? () => void WebBrowser.openBrowserAsync(file.url!) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  songRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  position: { width: 18, textAlign: "right" },
  keyChip: { minWidth: 36, paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.sm, backgroundColor: color.muted, alignItems: "center" },
  iconBtn: { padding: space[1] },
});

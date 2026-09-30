import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import type { Song } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { ActionSheet, type SheetAction } from "@/components/ui/ActionSheet";
import { Card } from "@/components/ui/Card";
import { FilterChips, SearchField } from "@/components/ui/Filters";
import { FileTextIcon, MusicNotesIcon, NoteIcon, TrashIcon, YoutubeLogoIcon } from "@/components/ui/icons";
import { RowDivider } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { useOverview } from "@/features/schedules/queries";
import { searchSongs } from "@/features/songs/songs";
import { color, space } from "@/theme/tokens";

const ALL = "__all";

// Repertório da igreja (mesmos dados do web). Quem é do Louvor consulta tom,
// cifra e vídeo; quem gerencia músicas cadastra e remove.
export default function RepertoireScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const overview = useOverview();
  const canManage = Boolean(overview.data?.access?.canManageSongs);
  const q = useQuery({ queryKey: ["songs"], queryFn: endpoints.songs });
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<string>(ALL);
  const [open, setOpen] = useState<Song | null>(null);

  const songs = useMemo(() => q.data?.songs ?? [], [q.data]);
  const themes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of songs) if (s.theme) counts.set(s.theme, (counts.get(s.theme) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, label: value, count }));
  }, [songs]);
  const shown = searchSongs(songs, query).filter((s) => theme === ALL || s.theme === theme);

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deleteSong(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["songs"] });
      toast.show({ kind: "success", title: "Música removida do repertório" });
    },
    onError: (e) => toast.show({ kind: "error", title: "Não foi possível remover", description: errorText(e) }),
  });

  const actionsFor = (s: Song): SheetAction[] => {
    const list: SheetAction[] = [];
    if (s.chords_url) list.push({ label: "Abrir cifra", icon: FileTextIcon, onPress: () => void WebBrowser.openBrowserAsync(s.chords_url) });
    if (s.lyrics_url) list.push({ label: "Abrir letra", icon: NoteIcon, onPress: () => void WebBrowser.openBrowserAsync(s.lyrics_url) });
    if (s.video_url) list.push({ label: "Ver vídeo", icon: YoutubeLogoIcon, onPress: () => void WebBrowser.openBrowserAsync(s.video_url) });
    if (canManage) {
      list.push({
        label: "Remover do repertório",
        icon: TrashIcon,
        destructive: true,
        onPress: () =>
          Alert.alert(`Remover "${s.title}"?`, "Ela sai do repertório. Escalas antigas continuam mostrando a música.", [
            { text: "Cancelar", style: "cancel" },
            { text: "Remover", style: "destructive", onPress: () => remove.mutate(s.id) },
          ]),
      });
    }
    return list;
  };

  return (
    <Screen edges={["bottom"]} refreshing={q.isRefetching} onRefresh={q.refetch}>
      {canManage ? (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable onPress={() => router.push("/nova-musica")} accessibilityRole="button" hitSlop={10} style={styles.headerAction}>
                <Text variant="bodyStrong" color="primaryText">
                  Nova
                </Text>
              </Pressable>
            ),
          }}
        />
      ) : null}
      <OfflineBanner />
      {q.isPending ? (
        <>
          <ScheduleCardSkeleton />
          <ScheduleCardSkeleton />
        </>
      ) : q.isError && !q.data ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : songs.length === 0 ? (
        <EmptyState
          icon={MusicNotesIcon}
          title="Repertório vazio"
          description={canManage ? "Cadastre as músicas que a igreja canta. Toque em Nova." : "Quem cuida do Louvor ainda não cadastrou músicas."}
        />
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por nome, artista ou tema" />
          {themes.length > 1 ? (
            <FilterChips options={[{ value: ALL, label: "Todas", count: songs.length }, ...themes]} value={theme} onChange={setTheme} />
          ) : null}
          {shown.length === 0 ? (
            <Text variant="label" color="mutedForeground" align="center">
              Nenhuma música encontrada.
            </Text>
          ) : (
            <Card padded={false}>
              {shown.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <RowDivider inset={space[4]} /> : null}
                  <SongRow song={s} onPress={() => setOpen(s)} />
                </View>
              ))}
            </Card>
          )}
          <Text variant="caption" color="mutedForeground" align="center">
            {songs.length === 1 ? "1 música" : `${songs.length} músicas`} no repertório
          </Text>
        </>
      )}
      {open ? (
        <ActionSheet
          visible
          onClose={() => setOpen(null)}
          title={open.title}
          description={[open.artist, `Tom ${open.key}`, open.bpm ? `${open.bpm} bpm` : null].filter(Boolean).join(" · ")}
          actions={actionsFor(open)}
        />
      ) : null}
    </Screen>
  );
}

function SongRow({ song, onPress }: { song: Song; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${song.title}${song.artist ? `, ${song.artist}` : ""}, tom ${song.key}`}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: color.surfaceSunken } : null]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {song.title}
        </Text>
        <Text variant="caption" color="foregroundSecondary" numberOfLines={1}>
          {[song.artist, song.theme, song.times_used ? `tocada ${song.times_used}×` : null].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={styles.keyChip}>
        <Text variant="label">{song.key}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerAction: { paddingHorizontal: space[2] },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  keyChip: { minWidth: 36, paddingHorizontal: space[2], paddingVertical: 2, borderRadius: 6, backgroundColor: color.muted, alignItems: "center" },
});

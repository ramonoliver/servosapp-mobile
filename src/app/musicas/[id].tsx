import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { SetlistEntry, Song } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchField } from "@/components/ui/Filters";
import { ArrowDownIcon, ArrowUpIcon, MusicNotesIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { RowDivider } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { track } from "@/lib/analytics";
import { moveItem, searchSongs, type DraftItem } from "@/features/songs/songs";
import { color, font, radius, space } from "@/theme/tokens";

// Montar as músicas da escala (Louvor): escolher do repertório, ordenar e
// combinar o tom do dia. Quem serve vê a lista no detalhe da escala.
export default function SetlistEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheduleId = String(id ?? "");
  const current = useQuery({ queryKey: ["schedule-songs", scheduleId], queryFn: () => endpoints.scheduleSongs(scheduleId), enabled: Boolean(scheduleId) });
  const library = useQuery({ queryKey: ["songs"], queryFn: endpoints.songs });

  if (current.isError) return <ErrorState message={errorText(current.error)} onRetry={() => void current.refetch()} />;
  if (!current.data || !library.data) {
    return (
      <Screen edges={[]}>
        <ScheduleCardSkeleton />
      </Screen>
    );
  }
  return <Editor scheduleId={scheduleId} initial={current.data.items} library={library.data.songs} />;
}

function Editor({ scheduleId, initial, library }: { scheduleId: string; initial: SetlistEntry[]; library: Song[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [items, setItems] = useState<DraftItem[]>(
    // Tom igual ao original fica vazio: segue o original se ele mudar no repertório.
    initial.map((i) => ({ songId: i.songId, key: i.key === i.originalKey ? "" : i.key })),
  );
  const [picking, setPicking] = useState(false);
  const byId = useMemo(() => new Map(library.map((s) => [s.id, s])), [library]);

  const save = useMutation({
    mutationFn: () => endpoints.saveScheduleSongs(scheduleId, items),
    onSuccess: (res) => {
      track("setlist_saved", { songs: items.length });
      qc.setQueryData(["schedule-songs", scheduleId], res);
      toast.show({ kind: "success", title: "Músicas salvas", description: "A equipe já vê a lista na escala." });
      router.back();
    },
    onError: (e) => toast.show({ kind: "error", title: "Não foi possível salvar", description: errorText(e) }),
  });

  const setKey = (i: number, key: string) => setItems((list) => list.map((it, idx) => (idx === i ? { ...it, key } : it)));

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => save.mutate()} disabled={save.isPending} accessibilityRole="button" hitSlop={10} style={styles.headerAction}>
              <Text variant="bodyStrong" color="primaryText">
                {save.isPending ? "Salvando…" : "Salvar"}
              </Text>
            </Pressable>
          ),
        }}
      />
      {items.length === 0 ? (
        <EmptyState icon={MusicNotesIcon} title="Nenhuma música na lista" description="Escolha do repertório da igreja. Você pode mudar o tom só para este dia." />
      ) : (
        <Card padded={false}>
          {items.map((it, i) => {
            const song = byId.get(it.songId);
            return (
              <View key={it.songId}>
                {i > 0 ? <RowDivider inset={space[4]} /> : null}
                <View style={styles.row}>
                  <Text variant="label" color="mutedForeground" tabular style={styles.position}>
                    {i + 1}
                  </Text>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {song?.title ?? "Música removida"}
                    </Text>
                    <Text variant="caption" color="foregroundSecondary" numberOfLines={1}>
                      {song ? `Tom original ${song.key}` : ""}
                    </Text>
                  </View>
                  <TextInput
                    value={it.key}
                    onChangeText={(t) => setKey(i, t)}
                    placeholder={song?.key ?? "Tom"}
                    placeholderTextColor={color.disabled}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    style={styles.keyInput}
                    accessibilityLabel={`Tom de ${song?.title ?? "música"} neste dia`}
                  />
                  <View style={styles.moves}>
                    <IconTap label="Subir" disabled={i === 0} onPress={() => setItems((l) => moveItem(l, i, i - 1))}>
                      <ArrowUpIcon size={18} color={i === 0 ? color.disabled : color.foregroundSecondary} />
                    </IconTap>
                    <IconTap label="Descer" disabled={i === items.length - 1} onPress={() => setItems((l) => moveItem(l, i, i + 1))}>
                      <ArrowDownIcon size={18} color={i === items.length - 1 ? color.disabled : color.foregroundSecondary} />
                    </IconTap>
                    <IconTap label={`Tirar ${song?.title ?? "música"}`} onPress={() => setItems((l) => l.filter((_, idx) => idx !== i))}>
                      <XIcon size={18} color={color.foregroundSecondary} />
                    </IconTap>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}
      <Button label="Adicionar música" icon={PlusIcon} variant="secondary" fullWidth onPress={() => setPicking(true)} />
      {picking ? (
        <SongPicker
          library={library}
          exclude={new Set(items.map((i) => i.songId))}
          onClose={() => setPicking(false)}
          onPick={(s) => setItems((l) => [...l, { songId: s.id, key: "" }])}
        />
      ) : null}
    </Screen>
  );
}

function IconTap({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={styles.iconTap}>
      {children}
    </Pressable>
  );
}

function SongPicker({ library, exclude, onPick, onClose }: { library: Song[]; exclude: Set<string>; onPick: (s: Song) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = searchSongs(library, q).filter((s) => !exclude.has(s.id));
  return (
    <BottomSheet visible onClose={onClose} title="Adicionar música" description="Do repertório da igreja.">
      <SearchField value={q} onChangeText={setQ} placeholder="Buscar por nome, artista ou tema" />
      <View style={styles.results}>
        {results.length === 0 ? (
          <Text variant="label" color="mutedForeground" align="center">
            {library.length === 0 ? "O repertório ainda está vazio. Cadastre músicas em Ministérios → Repertório." : "Nenhuma música encontrada."}
          </Text>
        ) : (
          results.slice(0, 8).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                onPick(s);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${s.title}`}
              style={({ pressed }) => [styles.result, pressed ? { backgroundColor: color.surfaceSunken } : null]}
            >
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text variant="caption" color="foregroundSecondary" numberOfLines={1}>
                  {[s.artist, `Tom ${s.key}`].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <PlusIcon size={18} color={color.primaryText} weight="bold" />
            </Pressable>
          ))
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerAction: { paddingHorizontal: space[2] },
  row: { flexDirection: "row", alignItems: "center", gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  position: { width: 18, textAlign: "right" },
  keyInput: {
    width: 52,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.borderStrong,
    textAlign: "center",
    fontFamily: font.medium,
    fontSize: 15,
    color: color.foreground,
    backgroundColor: color.surface,
  },
  moves: { flexDirection: "row" },
  iconTap: { width: 32, height: 36, alignItems: "center", justifyContent: "center" },
  results: { gap: space[1], minHeight: 120 },
  result: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.md },
});

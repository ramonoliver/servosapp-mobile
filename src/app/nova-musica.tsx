import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { endpoints } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { FilterChips } from "@/components/ui/Filters";
import { SectionHeader } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { track } from "@/lib/analytics";
import { KEYS, normalizeUrl, THEMES } from "@/features/songs/songs";
import { color, gutter, space } from "@/theme/tokens";

// Cadastro rápido de música no repertório (o web tem a versão completa).
export default function NewSongScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("C");
  const [bpm, setBpm] = useState("");
  const [theme, setTheme] = useState(THEMES[0]);
  const [chords, setChords] = useState("");
  const [video, setVideo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      endpoints.createSong({
        title: title.trim(),
        artist: artist.trim(),
        key,
        bpm: bpm ? Number(bpm) : null,
        theme,
        chords_url: normalizeUrl(chords),
        video_url: normalizeUrl(video),
        lyrics_url: "",
        notes: "",
        department_id: null,
      }),
    onSuccess: () => {
      track("song_created");
      void qc.invalidateQueries({ queryKey: ["songs"] });
      toast.show({ kind: "success", title: "Música cadastrada", description: title.trim() });
      router.back();
    },
    onError: (e) => toast.show({ kind: "error", title: "Não foi possível cadastrar", description: errorText(e) }),
  });

  const submit = () => {
    if (!title.trim()) return setError("Dê um nome para a música.");
    if (bpm && (!/^\d{2,3}$/.test(bpm) || Number(bpm) < 40 || Number(bpm) > 240)) return setError("BPM entre 40 e 240.");
    if ((chords.trim() && !normalizeUrl(chords)) || (video.trim() && !normalizeUrl(video))) return setError("Confira os links.");
    setError(null);
    save.mutate();
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
        <TextField label="Nome" value={title} onChangeText={setTitle} placeholder="Ex.: Grande é o Senhor" autoFocus returnKeyType="next" />
        <TextField label="Artista ou ministério" value={artist} onChangeText={setArtist} placeholder="Opcional" />

        <SectionHeader title="Tom original" />
        <FilterChips options={KEYS.map((k) => ({ value: k, label: k }))} value={key} onChange={setKey} />

        <SectionHeader title="Tema" />
        <FilterChips options={THEMES.map((t) => ({ value: t, label: t }))} value={theme} onChange={setTheme} />

        <TextField label="BPM" value={bpm} onChangeText={(t) => setBpm(t.replace(/\D/g, "").slice(0, 3))} placeholder="Opcional" keyboardType="number-pad" />
        <TextField label="Link da cifra" value={chords} onChangeText={setChords} placeholder="cifraclub.com.br/…" autoCapitalize="none" keyboardType="url" autoCorrect={false} />
        <TextField label="Link do vídeo" value={video} onChangeText={setVideo} placeholder="youtube.com/…" autoCapitalize="none" keyboardType="url" autoCorrect={false} />

        {error ? (
          <Text variant="label" color="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button label="Cadastrar música" size="lg" fullWidth loading={save.isPending} onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { padding: gutter, paddingBottom: space[12], gap: space[4] },
  actions: { marginTop: space[2] },
});

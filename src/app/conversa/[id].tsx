import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatMessage } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { Avatar } from "@/components/ui/Avatar";
import { ChatCircleDotsIcon, PaperPlaneRightIcon } from "@/components/ui/icons";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { toBubbles, chatTime, type ChatBubble } from "@/features/schedules/chat";
import { churchToday, formatLongDate } from "@/features/schedules/format";
import { track } from "@/lib/analytics";
import { color, font, gutter, hitSize, radius, space } from "@/theme/tokens";

const POLL_MS = 10_000;

// Conversa da escala: recados entre liderança e equipe (§20). Atualiza a
// cada 10 s enquanto aberta; recado da liderança chega como push para a
// equipe (servidor, lib/schedules/chat.ts).
export default function ScheduleChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheduleId = String(id ?? "");
  const qc = useQueryClient();
  const toast = useToast();
  const key = ["schedule-chat", scheduleId];
  const q = useQuery({ queryKey: key, queryFn: () => endpoints.scheduleChat(scheduleId), refetchInterval: POLL_MS, enabled: Boolean(scheduleId) });
  const [text, setText] = useState("");
  const list = useRef<FlatList<ChatBubble>>(null);

  const send = useMutation({
    mutationFn: (t: string) => endpoints.sendChat(scheduleId, t),
    onMutate: () => setText(""),
    onSuccess: (res) => {
      track("chat_message_sent");
      qc.setQueryData(key, (old: { items: ChatMessage[]; readOnly: boolean } | undefined) => ({ readOnly: old?.readOnly ?? false, items: res.items }));
    },
    onError: (e, t) => {
      setText(t);
      toast.show({ kind: "error", title: "Mensagem não enviada", description: errorText(e) });
    },
  });

  const today = churchToday();
  const bubbles = useMemo(() => {
    const label = (day: string) => (day === today ? "Hoje" : formatLongDate(day));
    // Lista invertida: a mais recente fica embaixo, perto do campo.
    return toBubbles(q.data?.items ?? [], label).reverse();
  }, [q.data, today]);

  if (q.isError && !q.data) return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;

  const readOnly = q.data?.readOnly;
  const submit = () => {
    const t = text.trim();
    if (!t || send.isPending) return;
    send.mutate(t);
  };

  return (
    <SafeAreaView style={styles.fill} edges={["bottom"]}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}>
        {q.isPending ? (
          <View style={styles.loading}>
            <ScheduleCardSkeleton />
          </View>
        ) : bubbles.length === 0 ? (
          <View style={styles.flex}>
            <EmptyState icon={ChatCircleDotsIcon} title="Nenhuma mensagem ainda" description="Deixe um recado para a equipe desta escala: horário, roupa, o que levar." />
          </View>
        ) : (
          <FlatList
            ref={list}
            data={bubbles}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <Bubble m={item} />}
            keyboardDismissMode="interactive"
          />
        )}

        {readOnly ? (
          <Text variant="label" color="mutedForeground" align="center" style={styles.readOnly}>
            Esta escala foi cancelada. A conversa fica só para leitura.
          </Text>
        ) : (
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escreva para a equipe"
              placeholderTextColor={color.disabled}
              multiline
              maxLength={1000}
              style={styles.input}
              accessibilityLabel="Mensagem"
            />
            <Pressable
              onPress={submit}
              disabled={!text.trim() || send.isPending}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              style={[styles.send, !text.trim() ? styles.sendOff : null]}
            >
              <PaperPlaneRightIcon size={20} color={color.primaryForeground} weight="fill" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ m }: { m: ChatBubble }) {
  return (
    <View>
      {m.dayLabel ? (
        <Text variant="caption" color="mutedForeground" align="center" style={styles.day}>
          {m.dayLabel}
        </Text>
      ) : null}
      <View style={[styles.row, m.mine ? styles.rowMine : null]}>
        {!m.mine ? (
          <View style={styles.avatarSlot}>{m.showAuthor ? <Avatar name={m.author.name} photoUrl={m.author.photoUrl} avatarColor={m.author.avatarColor} size={28} /> : null}</View>
        ) : null}
        <View style={styles.bubbleCol}>
          {m.showAuthor ? (
            <Text variant="caption" color="foregroundSecondary" style={styles.author}>
              {m.author.name.split(" ")[0]}
              {m.fromLeader ? " · liderança" : ""}
            </Text>
          ) : null}
          <View style={[styles.bubble, m.mine ? styles.bubbleMine : m.fromLeader ? styles.bubbleLeader : null]} accessible accessibilityLabel={`${m.mine ? "Você" : m.author.name}: ${m.text}. ${chatTime(m.createdAt)}`}>
            <Text variant="body" color={m.mine ? "primaryForeground" : "foreground"}>
              {m.text}
            </Text>
            <Text variant="caption" color={m.mine ? "primaryForeground" : "mutedForeground"} style={styles.time}>
              {chatTime(m.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  loading: { padding: gutter },
  list: { paddingHorizontal: gutter, paddingVertical: space[4], gap: space[1] },
  day: { marginVertical: space[3] },
  row: { flexDirection: "row", alignItems: "flex-end", gap: space[2], marginTop: 2 },
  rowMine: { justifyContent: "flex-end" },
  avatarSlot: { width: 28 },
  bubbleCol: { maxWidth: "78%" },
  author: { marginBottom: 2, marginLeft: space[2] },
  bubble: { backgroundColor: color.surface, borderRadius: radius.lg, paddingHorizontal: space[3], paddingVertical: space[2], gap: 2 },
  bubbleMine: { backgroundColor: color.primary },
  bubbleLeader: { borderWidth: 1, borderColor: color.border },
  time: { alignSelf: "flex-end", opacity: 0.75, fontVariant: ["tabular-nums"] },
  readOnly: { padding: space[4] },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space[2],
    paddingHorizontal: gutter,
    paddingVertical: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
  input: {
    flex: 1,
    minHeight: hitSize,
    maxHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    paddingHorizontal: space[3],
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.foreground,
  },
  send: { width: hitSize, height: hitSize, borderRadius: hitSize / 2, backgroundColor: color.primary, alignItems: "center", justifyContent: "center" },
  sendOff: { opacity: 0.4 },
});

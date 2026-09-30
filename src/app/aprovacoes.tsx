import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import type { JoinRequestView } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserPlusIcon } from "@/components/ui/icons";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { requestSubtitle } from "@/features/join/join";
import { errorText } from "@/features/leader/queries";
import { queryKeys } from "@/lib/query";
import { space } from "@/theme/tokens";
import { track } from "@/lib/analytics";

const KEY = ["join-requests"] as const;

// Pedidos de entrada na igreja: a administração vê todos; quem convidou vê
// os que vieram do seu convite (regra no servidor, lib/join/rules.ts).
export default function ApprovalsScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({ queryKey: KEY, queryFn: endpoints.joinRequests });

  const decide = useMutation({
    mutationFn: (v: { request: JoinRequestView; decision: "approve" | "reject" }) => endpoints.decideJoin(v.request.id, v.decision),
    onMutate: async ({ request }) => {
      // Some da lista na hora; volta se der erro.
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<{ items: JoinRequestView[] }>(KEY);
      qc.setQueryData<{ items: JoinRequestView[] }>(KEY, (d) => (d ? { items: d.items.filter((i) => i.id !== request.id) } : d));
      return { prev };
    },
    onSuccess: (_res, { request, decision }) => {
      track("join_request_decided", { decision, viaInvite: Boolean(request.invitedByName) });
      const first = request.name.split(" ")[0];
      toast.show({
        kind: "success",
        title: decision === "approve" ? `${first} entrou na igreja` : `Pedido de ${first} recusado`,
        description: decision === "approve" ? "Já pode ser escalado." : undefined,
      });
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
      toast.show({ kind: "error", title: errorText(e) });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: queryKeys.overview });
    },
  });

  const reject = (request: JoinRequestView) =>
    Alert.alert(`Recusar ${request.name.split(" ")[0]}?`, "A pessoa não entra na igreja pelo app. Ela vê que o cadastro não foi aprovado.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Recusar", style: "destructive", onPress: () => decide.mutate({ request, decision: "reject" }) },
    ]);

  if (list.isError) return <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />;

  const items = list.data?.items ?? [];
  return (
    <Screen edges={[]} refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      {list.isPending ? (
        <>
          <Skeleton height={120} rounded={16} />
          <Skeleton height={120} rounded={16} />
        </>
      ) : items.length === 0 ? (
        <EmptyState
          icon={UserPlusIcon}
          title="Nenhum pedido agora"
          description="Quando alguém entrar pelo código ou pelo seu convite, o pedido aparece aqui."
          actionLabel="Convidar pessoas"
          onAction={() => router.push("/convidar")}
        />
      ) : (
        items.map((r) => (
          <Card key={r.id} style={styles.card}>
            <View style={styles.row}>
              <Avatar name={r.name} size={44} />
              <View style={styles.flex}>
                <Text variant="heading" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text variant="label" color="foregroundSecondary" numberOfLines={1} selectable>
                  {r.email}
                </Text>
                {r.phone ? (
                  <Text variant="label" color="foregroundSecondary" numberOfLines={1} selectable>
                    {r.phone}
                  </Text>
                ) : null}
                <Text variant="caption" color="mutedForeground">
                  {requestSubtitle(r)}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button label="Recusar" variant="secondary" fullWidth onPress={() => reject(r)} />
              </View>
              <View style={styles.flex}>
                <Button label="Aprovar" fullWidth onPress={() => decide.mutate({ request: r, decision: "approve" })} />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space[4] },
  row: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  actions: { flexDirection: "row", gap: space[3] },
});

import { Linking, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RowDivider, SwitchRow } from "@/components/ui/ListRow";
import { Screen, SectionHeader } from "@/components/ui/Screen";
import { ScheduleCardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, OfflineBanner } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useNotificationPreferences, useSavePreferences } from "@/features/leader/queries";
import { useMinistries } from "@/features/schedules/queries";
import { getPermissionState, pushAvailability } from "@/lib/push";

/**
 * Notificações (§30): push para o que exige ação; o resto fica na central.
 * A seção de liderança só aparece para quem lidera algum ministério.
 */
export default function PreferencesScreen() {
  const prefs = useNotificationPreferences();
  const save = useSavePreferences();
  const ministries = useMinistries();
  const permission = useQuery({ queryKey: ["push-permission"], queryFn: getPermissionState });
  const leads = (ministries.data?.items ?? []).some((m) => m.role === "LEADER");
  const osBlocked = pushAvailability() === "ready" && permission.data === "denied";

  if (prefs.isPending) {
    return (
      <Screen edges={[]}>
        <ScheduleCardSkeleton />
      </Screen>
    );
  }
  if (!prefs.data) {
    return (
      <Screen edges={[]}>
        <ErrorState message={prefs.error?.message} onRetry={() => void prefs.refetch()} />
      </Screen>
    );
  }
  const p = prefs.data;
  const setLeader = (key: keyof typeof p.leader) => (v: boolean) => save.mutate({ leader: { [key]: v } });

  return (
    <Screen edges={[]}>
      <OfflineBanner />
      {osBlocked ? (
        <Card>
          <View style={{ gap: 12 }}>
            <Text variant="bodyStrong">As notificações estão desligadas nos Ajustes do aparelho</Text>
            <Text variant="label" color="foregroundSecondary">
              Você continua vendo tudo no sininho do Início, mas não recebe avisos fora do app.
            </Text>
            <Button label="Abrir Ajustes" variant="secondary" onPress={() => void Linking.openSettings()} />
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Suas escalas" />
      <Card padded={false}>
        <SwitchRow
          title="Avisos no celular"
          subtitle="Quando for escalado, a escala mudar ou for cancelada."
          value={p.pushEnabled && p.scheduleNotifications}
          onValueChange={(v) => save.mutate({ pushEnabled: v, scheduleNotifications: v })}
        />
      </Card>

      {leads ? (
        <>
          <SectionHeader title="Como líder" />
          <Card padded={false}>
            <SwitchRow title="Recusas" subtitle="Quando alguém não puder servir." value={p.leader.declines} onValueChange={setLeader("declines")} />
            <RowDivider inset={16} />
            <SwitchRow title="Substituições" subtitle="Pedidos de substituição da equipe." value={p.leader.replacements} onValueChange={setLeader("replacements")} />
            <RowDivider inset={16} />
            <SwitchRow
              title="Problemas na escala"
              subtitle="Escala incompleta perto do evento."
              value={p.leader.schedule_issues}
              onValueChange={setLeader("schedule_issues")}
            />
            <RowDivider inset={16} />
            <SwitchRow
              title="Cada confirmação"
              subtitle="Um aviso por pessoa que confirmar. Costuma ser muito."
              value={p.leader.each_confirmation}
              onValueChange={setLeader("each_confirmation")}
            />
          </Card>
          <Text variant="caption" color="mutedForeground">
            Tudo continua aparecendo no sininho do Início, mesmo desligado aqui.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}

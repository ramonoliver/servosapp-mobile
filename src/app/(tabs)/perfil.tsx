import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSession } from "@/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { Card, PressableCard } from "@/components/ui/Card";
import { BellIcon, CalendarBlankIcon, CaretRightIcon, QuestionIcon, SignOutIcon, UserPlusIcon, UsersThreeIcon } from "@/components/ui/icons";
import { ChurchSwitcher } from "@/components/profile/ChurchSwitcher";
import { useOverview } from "@/features/schedules/queries";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { Screen, ScreenTitle, SectionHeader } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { getPermissionState, pushAvailability, type PermissionState } from "@/lib/push";
import { color, space } from "@/theme/tokens";

const HELP_URL = "https://servosapp.com";

/**
 * Perfil simples (§55). "Meus ministérios" já é uma aba (§70: sem
 * funcionalidade duplicada).
 */
export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const availability = pushAvailability();
  const overview = useOverview();
  const joinRequests = overview.data?.joinRequests ?? 0;

  useEffect(() => {
    void getPermissionState().then(setPermission);
  }, []);

  const pushLabel =
    availability === "ready"
      ? permission === "granted"
        ? "Ativadas neste aparelho"
        : "Desativadas nos Ajustes do aparelho"
      : "Escolha o que você quer receber";

  const confirmSignOut = () =>
    Alert.alert("Sair do Servos?", "Você deixa de receber notificações neste aparelho.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      <ScreenTitle title="Perfil" />
      <PressableCard
        onPress={() => router.push("/meus-dados")}
        accessibilityLabel={`${user?.name ?? ""}. Meus dados`}
        accessibilityHint="Editar foto, nome e contato"
        style={styles.identity}
      >
        <Avatar name={user?.name ?? ""} photoUrl={user?.photo_url} avatarColor={user?.avatar_color} size={56} />
        <View style={styles.flex}>
          <Text variant="heading" numberOfLines={1}>
            {user?.name}
          </Text>
          <Text variant="label" color="foregroundSecondary" numberOfLines={1}>
            Meus dados
          </Text>
        </View>
        <CaretRightIcon size={18} color={color.mutedForeground} />
      </PressableCard>

      <Card padded={false}>
        <ListRow
          icon={CalendarBlankIcon}
          title="Minha disponibilidade"
          subtitle="Dias em que você não pode servir"
          onPress={() => router.push("/disponibilidade")}
        />
        <RowDivider />
        <ListRow icon={BellIcon} title="Notificações" subtitle={pushLabel} onPress={() => router.push("/preferencias")} />
        <RowDivider />
        <ListRow icon={QuestionIcon} title="Ajuda" subtitle="Dúvidas sobre o Servos" onPress={() => void WebBrowser.openBrowserAsync(HELP_URL)} />
      </Card>

      {overview.data?.access?.canInvite ? (
        <SectionHeader title="Liderança" />
      ) : null}
      {overview.data?.access?.canInvite ? (
        <Card padded={false}>
          <ListRow
            icon={UserPlusIcon}
            title="Convidar pessoas"
            subtitle="Código da igreja, link e QR code"
            onPress={() => router.push("/convidar")}
          />
          <RowDivider />
          <ListRow
            icon={UsersThreeIcon}
            title="Pedidos de entrada"
            subtitle={
              joinRequests === 0 ? "Nenhum aguardando" : joinRequests === 1 ? "1 pessoa aguardando" : `${joinRequests} pessoas aguardando`
            }
            onPress={() => router.push("/aprovacoes")}
          />
        </Card>
      ) : null}

      <ChurchSwitcher />

      <Card padded={false}>
        <ListRow icon={SignOutIcon} title="Sair" destructive onPress={confirmSignOut} />
      </Card>

      <Text variant="caption" color="mutedForeground" align="center">
        Servos {Constants.expoConfig?.version ?? ""}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: space[4] },
  flex: { flex: 1 },
});

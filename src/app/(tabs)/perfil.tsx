import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSession } from "@/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { Card, PressableCard } from "@/components/ui/Card";
import { BellIcon, CalendarBlankIcon, CaretRightIcon, QuestionIcon, SignOutIcon, TrashIcon, UserPlusIcon, UsersThreeIcon } from "@/components/ui/icons";
import { ChurchSwitcher } from "@/components/profile/ChurchSwitcher";
import { useOverview } from "@/features/schedules/queries";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { Screen, ScreenTitle, SectionHeader } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { openSite } from "@/lib/siteLinks";
import { getPermissionState, pushAvailability, type PermissionState } from "@/lib/push";
import { color, space } from "@/theme/tokens";


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
        <ListRow icon={QuestionIcon} title="Ajuda" subtitle="Dúvidas sobre o Servos" onPress={() => openSite("support")} />
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
        <RowDivider />
        <ListRow icon={TrashIcon} title="Excluir minha conta" destructive onPress={() => router.push("/excluir-conta")} />
      </Card>

      <Text variant="caption" color="mutedForeground" align="center">
        Servos {Constants.expoConfig?.version ?? ""}
      </Text>
      <View style={styles.legal}>
        <Text variant="caption" color="mutedForeground" onPress={() => openSite("privacy")} accessibilityRole="link" style={styles.link}>
          Privacidade
        </Text>
        <Text variant="caption" color="mutedForeground" onPress={() => openSite("terms")} accessibilityRole="link" style={styles.link}>
          Termos de uso
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: space[4] },
  legal: { flexDirection: "row", justifyContent: "center", gap: space[5], marginTop: -space[2] },
  link: { textDecorationLine: "underline", paddingVertical: space[2] },
  flex: { flex: 1 },
});

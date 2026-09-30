import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import type { MyChurch } from "@/api/contracts";
import { endpoints } from "@/api/endpoints";
import { useSession } from "@/auth/session";
import { Card } from "@/components/ui/Card";
import { CheckIcon, ChurchIcon, PlusIcon } from "@/components/ui/icons";
import { ListRow, RowDivider } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/Screen";
import { useToast } from "@/components/ui/Toast";
import { errorText } from "@/features/leader/queries";
import { track } from "@/lib/analytics";
import { color } from "@/theme/tokens";

// Multi-igreja no Perfil: em qual igreja a pessoa está, trocar para outra
// em que já faz parte e entrar em mais uma pelo código.
export function ChurchSwitcher() {
  const { switchChurch } = useSession();
  const toast = useToast();
  const [switching, setSwitching] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["my-churches"], queryFn: endpoints.myChurches, staleTime: 60_000 });
  const items = q.data?.items ?? [];
  const many = items.length > 1;

  const go = (c: MyChurch) =>
    Alert.alert(`Abrir ${c.churchName}?`, "Você vê as escalas e os ministérios dessa igreja. Dá para voltar quando quiser.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Trocar",
        onPress: async () => {
          setSwitching(c.churchId);
          try {
            await switchChurch(c.churchId);
            track("church_switched");
            router.replace("/(tabs)");
            toast.show({ kind: "success", title: `Você está na ${c.churchName}`, description: "Para voltar, use Perfil → Suas igrejas." });
          } catch (e) {
            toast.show({ kind: "error", title: "Não foi possível trocar", description: errorText(e) });
          } finally {
            setSwitching(null);
          }
        },
      },
    ]);

  const subtitle = (c: MyChurch) =>
    switching === c.churchId ? "Trocando…" : c.current ? "Você está aqui" : c.status === "pending" ? "Aguardando aprovação" : "Tocar para abrir";

  return (
    <>
      <SectionHeader title={many ? "Suas igrejas" : "Igreja"} />
      <Card padded={false}>
        {items.map((c, i) => (
          <View key={c.churchId}>
            {i > 0 ? <RowDivider /> : null}
            <ListRow
              icon={ChurchIcon}
              title={c.churchName}
              subtitle={subtitle(c)}
              disabled={c.status === "pending"}
              onPress={!c.current && c.status === "active" && !switching ? () => go(c) : undefined}
              trailing={c.current && many ? <CheckIcon size={18} color={color.primaryText} weight="bold" /> : undefined}
            />
          </View>
        ))}
        {items.length > 0 ? <RowDivider /> : null}
        <ListRow icon={PlusIcon} title="Entrar em outra igreja" subtitle="Com o código ou o link do convite" onPress={() => router.push("/outra-igreja")} />
      </Card>
    </>
  );
}

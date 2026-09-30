import { router } from "expo-router";
import { ProhibitIcon } from "@/components/ui/icons";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <Screen>
      <EmptyState
        icon={ProhibitIcon}
        title="Página não encontrada"
        description="Esse link não leva a lugar nenhum no app."
        actionLabel="Ir para o início"
        onAction={() => router.replace("/")}
      />
    </Screen>
  );
}

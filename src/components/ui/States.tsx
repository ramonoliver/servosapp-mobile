import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { color, radius, space } from "@/theme/tokens";
import { Button } from "./Button";
import { CloudSlashIcon, WarningCircleIcon, type Icon } from "./icons";
import { Text } from "./Text";

/** Vazio humano (§39) com ação opcional. */
export function EmptyState({
  icon: IconComponent,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      {IconComponent ? (
        <View style={styles.iconWrap}>
          <IconComponent size={28} color={color.primaryText} weight="duotone" />
        </View>
      ) : null}
      <Text variant="heading" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="foregroundSecondary" align="center">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} variant="secondary" onPress={onAction} /> : null}
    </View>
  );
}

/** Erro com saída: o que aconteceu + tentar de novo (§60). */
export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <View style={[styles.iconWrap, { backgroundColor: color.dangerSoft }]}>
        <WarningCircleIcon size={28} color={color.danger} weight="duotone" />
      </View>
      <Text variant="heading" align="center">
        Não foi possível carregar
      </Text>
      <Text variant="body" color="foregroundSecondary" align="center">
        {message ?? "Verifique sua conexão e tente novamente."}
      </Text>
      <Button label="Tentar novamente" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function useIsOnline() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
}

/** Faixa "Sem conexão" (§51): aparece por cima do conteúdo em cache, nunca o apaga. */
export function OfflineBanner() {
  const online = useIsOnline();
  if (online) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <CloudSlashIcon size={18} color={color.inverseForeground} />
      <Text variant="label" color="inverseForeground" style={styles.bannerText}>
        Sem conexão · mostrando o que já estava salvo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: space[3], paddingVertical: space[10], paddingHorizontal: space[6] },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: color.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space[1],
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    backgroundColor: color.inverse,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.md,
  },
  bannerText: { flex: 1 },
});

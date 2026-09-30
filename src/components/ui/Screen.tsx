import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { color, gutter, space } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * Tela padrão: área segura (notch, Dynamic Island, gesto inferior — §49),
 * rolagem com inset automático sob a tab bar nativa e "puxar para atualizar".
 */
export function Screen({
  children,
  refreshing,
  onRefresh,
  edges = ["top"],
  scroll = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.fill} edges={edges}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={color.primary} colors={[color.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Título grande da aba (Início usa saudação própria). */
export function ScreenTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <Text variant="display" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Cabeçalho de seção dentro da tela. */
export function SectionHeader({ title, trailing, inList }: { title: string; trailing?: ReactNode; inList?: boolean }) {
  return (
    <View style={[styles.section, inList ? styles.sectionInList : null]}>
      <Text variant="overline" color="mutedForeground" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: gutter, paddingTop: space[2], paddingBottom: space[12], gap: space[4] },
  titleRow: { flexDirection: "row", alignItems: "center", minHeight: 48, marginBottom: space[1] },
  flex: { flex: 1 },
  section: { flexDirection: "row", alignItems: "center", marginTop: space[4], marginBottom: -space[1] },
  // Em SectionList não há `gap` do container: o título precisa do próprio respiro.
  sectionInList: { marginTop: space[6], marginBottom: space[3] },
});

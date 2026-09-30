import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, duration, radius, space } from "@/theme/tokens";
import { Text } from "./Text";

/**
 * Sheet modal de baixo (§44). Fecha no toque fora, no "voltar" do Android e
 * no botão do próprio conteúdo. Respeita teclado e a área de gesto inferior.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** false enquanto uma ação está em andamento. */
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [translate] = useState(() => new Animated.Value(400));

  useEffect(() => {
    if (visible) {
      translate.setValue(400);
      Animated.timing(translate, { toValue: 0, duration: duration.slow, useNativeDriver: true }).start();
    }
  }, [visible, translate]);

  const close = () => {
    if (dismissable) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" />
        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space[4]), transform: [{ translateY: translate }] }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {description ? (
              <Text variant="body" color="foregroundSecondary">
                {description}
              </Text>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[2],
    gap: space[5],
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.borderStrong,
  },
  header: { gap: space[1] },
});

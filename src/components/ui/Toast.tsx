import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space } from "@/theme/tokens";
import { CheckCircleIcon, CloudSlashIcon, WarningCircleIcon } from "./icons";
import { Text } from "./Text";

type ToastKind = "success" | "error" | "offline";

interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

const ToastContext = createContext<{ show: (t: Omit<ToastMessage, "id">) => void } | null>(null);

/**
 * Feedback leve e imediato (§40): confirmar presença não abre modal — mostra
 * o toast e anuncia para o leitor de tela.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);

  const show = useCallback((t: Omit<ToastMessage, "id">) => {
    seq.current += 1;
    setToast({ ...t, id: seq.current });
    AccessibilityInfo.announceForAccessibility([t.title, t.description].filter(Boolean).join(". "));
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(toast.kind === "success" ? 2600 : 4200),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone());
  }, [anim, onDone, toast.kind]);

  const Icon = toast.kind === "success" ? CheckCircleIcon : toast.kind === "offline" ? CloudSlashIcon : WarningCircleIcon;
  const iconColor = toast.kind === "success" ? color.successOnInverse : toast.kind === "offline" ? color.inverseForeground : color.dangerOnInverse;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space[2] }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
        ]}
      >
        <Icon size={22} color={iconColor} weight="fill" />
        <View style={styles.texts}>
          <Text variant="bodyStrong" color="inverseForeground">
            {toast.title}
          </Text>
          {toast.description ? (
            <Text variant="caption" color="inverseForeground" style={styles.desc}>
              {toast.description}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fora do ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space[4], right: space[4], alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: color.inverse,
    borderRadius: radius.lg,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    maxWidth: 480,
    alignSelf: "stretch",
  },
  texts: { flex: 1, gap: 2 },
  desc: { opacity: 0.8 },
});

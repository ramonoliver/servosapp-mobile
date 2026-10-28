import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { endpoints } from "@/api/endpoints";

// Push (§32, §54). O servidor envia pelo canal certo conforme o token:
//  - Android: `getDevicePushTokenAsync` devolve o token FCM, desde que o
//    build tenha o google-services.json (app.config.ts). Vai por FCM.
//  - iOS: o token APNs cru não serve ao FCM, então o app registra um token do
//    serviço de push da Expo (`ExponentPushToken[...]`), e o servidor envia
//    por ele. A chave APNs fica nas credenciais do EAS. Ver docs/03-push.md.

const STORED_TOKEN = "servos.push.token";
export const ANDROID_CHANNEL = "escalas";

type PushConfigured = { android?: boolean; ios?: boolean };

export type PushAvailability = "ready" | "not_configured" | "simulator" | "unsupported";

export function pushAvailability(): PushAvailability {
  if (Platform.OS === "web") return "unsupported";
  if (!Device.isDevice) return "simulator";
  const configured = (Constants.expoConfig?.extra?.pushConfigured ?? {}) as PushConfigured;
  if (Platform.OS === "android") return configured.android ? "ready" : "not_configured";
  return expoProjectId() ? "ready" : "not_configured";
}

function expoProjectId(): string | null {
  const id = (Constants.expoConfig?.extra?.eas as { projectId?: unknown } | undefined)?.projectId;
  return typeof id === "string" && id ? id : null;
}

/** Android: token FCM. iOS: token do serviço de push da Expo. */
async function pushToken(): Promise<string> {
  if (Platform.OS === "ios") {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: expoProjectId()! });
    return data;
  }
  const { data } = await Notifications.getDevicePushTokenAsync();
  return String(data);
}

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Escalas",
      description: "Quando você for escalado, houver mudança ou alguém precisar de você.",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export type PermissionState = "granted" | "denied" | "undetermined";

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/** Abre o prompt nativo — só depois da tela de contexto (§54). */
export async function requestPermission(): Promise<PermissionState> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === "granted" ? "granted" : "denied";
}

/** Registra o aparelho no servidor. Silencioso: push é melhoria, não bloqueio. */
export async function registerDevice(): Promise<boolean> {
  if (pushAvailability() !== "ready") return false;
  if ((await getPermissionState()) !== "granted") return false;
  try {
    const token = await pushToken();
    await endpoints.registerPush(token, Platform.OS === "ios" ? "ios" : "android", Device.modelName ?? undefined);
    await AsyncStorage.setItem(STORED_TOKEN, token);
    return true;
  } catch (error) {
    console.warn("Push: não foi possível registrar o aparelho", error);
    return false;
  }
}

export async function unregisterPushOnLogout() {
  const token = await AsyncStorage.getItem(STORED_TOKEN);
  if (!token) return;
  await endpoints.unregisterPush(token).catch(() => {});
  await AsyncStorage.removeItem(STORED_TOKEN);
}

/** URL do web gravada pelo servidor no push (`data.url`). */
/** Multi-igreja: de qual igreja é o aviso (o servidor manda `church_id`). */
export function churchOfNotification(notification: Notifications.Notification): string | null {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  return typeof data?.church_id === "string" && data.church_id ? data.church_id : null;
}

export function urlFromNotification(notification: Notifications.Notification): string | null {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  const url = data?.url ?? data?.click_action;
  return typeof url === "string" ? url : null;
}

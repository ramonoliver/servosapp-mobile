import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { endpoints } from "@/api/endpoints";
import { pushAvailability, registerDevice } from "./push";

jest.mock("expo-device", () => ({ isDevice: true, modelName: "iPhone 16" }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: "proj-123" }, pushConfigured: { android: false, ios: false } } } },
}));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
}));
jest.mock("@/api/endpoints", () => ({ endpoints: { registerPush: jest.fn(), unregisterPush: jest.fn() } }));
jest.mock("@react-native-async-storage/async-storage", () => ({ setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "ios";
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: "granted" } as never);
  jest.mocked(endpoints.registerPush).mockResolvedValue({ success: true });
});

test("no iPhone o push fica pronto sem o arquivo do Firebase", () => {
  expect(pushAvailability()).toBe("ready");
});

test("no iPhone registra o token do serviço de push da Expo", async () => {
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ type: "expo", data: "ExponentPushToken[abc]" });

  await expect(registerDevice()).resolves.toBe(true);

  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "proj-123" });
  expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
  expect(endpoints.registerPush).toHaveBeenCalledWith("ExponentPushToken[abc]", "ios", "iPhone 16");
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("servos.push.token", "ExponentPushToken[abc]");
});

test("no Android sem google-services.json o push continua desligado", () => {
  Platform.OS = "android";
  expect(pushAvailability()).toBe("not_configured");
});

test("sem permissão não registra nada", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: "denied" } as never);

  await expect(registerDevice()).resolves.toBe(false);
  expect(endpoints.registerPush).not.toHaveBeenCalled();
});

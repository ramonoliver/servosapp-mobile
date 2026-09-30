import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import { endpoints } from "@/api/endpoints";

// Analytics nomeados (P2). Eventos com nome fixo (lista no servidor:
// lib/analytics/events.ts), propriedades pequenas e sem dado pessoal.
// Fila em memória + disco: sem rede ou sem sessão, espera e manda depois.
// Nunca atrapalha o app — toda falha aqui é silenciosa.

export type AnalyticsEvent =
  | "app_opened"
  | "onboarding_completed"
  | "login_succeeded"
  | "signup_submitted"
  | "join_request_decided"
  | "invite_shared"
  | "schedule_viewed"
  | "assignment_confirmed"
  | "assignment_declined"
  | "replacement_requested"
  | "unavailability_added"
  | "person_assigned"
  | "schedule_created"
  | "schedule_published"
  | "schedule_edited"
  | "schedule_cancelled"
  | "notification_opened"
  | "report_viewed"
  | "calendar_viewed"
  | "profile_updated"
  | "chat_message_sent"
  | "setlist_saved"
  | "file_attached"
  | "calendar_saved"
  | "event_created"
  | "song_created"
  | "church_switched"
  | "church_join_requested";

type Props = Record<string, string | number | boolean>;
interface Queued {
  name: AnalyticsEvent;
  at: string;
  props: Props;
}

const KEY = "servos.analytics.queue";
const MAX_QUEUE = 200;
const FLUSH_MS = 20_000;

let queue: Queued[] = [];
let loaded = false;
let enabled = false;
let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;
let listening = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]") as Queued[];
    queue = [...saved, ...queue].slice(-MAX_QUEUE);
  } catch {
    /* fila corrompida: começa do zero */
  }
}

function persist() {
  void AsyncStorage.setItem(KEY, JSON.stringify(queue.slice(-MAX_QUEUE))).catch(() => {});
}

export function track(name: AnalyticsEvent, props: Props = {}) {
  queue.push({ name, at: new Date().toISOString(), props });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persist();
}

export async function flush() {
  if (!enabled || flushing) return;
  await load();
  if (queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, 50);
  try {
    await endpoints.analytics({ events: batch, platform: Platform.OS, appVersion: String(Constants.expoConfig?.version ?? "") });
    queue = queue.slice(batch.length);
    persist();
  } catch {
    /* sem rede ou sessão: tenta no próximo ciclo */
  } finally {
    flushing = false;
  }
}

/** Liga o envio enquanto há sessão (o endpoint exige login). */
export function setAnalyticsEnabled(on: boolean) {
  enabled = on;
  if (on && !timer) {
    timer = setInterval(() => void flush(), FLUSH_MS);
    if (!listening) {
      listening = true;
      AppState.addEventListener("change", (s) => {
        if (s !== "active") void flush();
      });
    }
    void flush();
  }
  if (!on && timer) {
    clearInterval(timer);
    timer = null;
  }
}

import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import type { CalendarEventData } from "@/features/schedules/calendarEvent";

// Abre a tela do PRÓPRIO sistema para a pessoa conferir e salvar o evento na
// agenda do celular. Pede só permissão de escrita (não lê a agenda dela).

export type AddToCalendarResult = "saved" | "canceled" | "denied" | "unavailable";

export async function addToDeviceCalendar(event: CalendarEventData): Promise<AddToCalendarResult> {
  const permission = await Calendar.requestCalendarPermissions(true);
  if (!permission.granted) return "denied";
  let calendar: Calendar.ExpoCalendar | undefined;
  if (Platform.OS === "ios") {
    calendar = Calendar.getDefaultCalendarSync();
  } else {
    const all = await Calendar.getCalendars();
    calendar = all.find((c) => c.isPrimary && c.allowsModifications) ?? all.find((c) => c.allowsModifications);
  }
  if (!calendar) return "unavailable";
  const res = await calendar.addEventWithForm({
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    notes: event.notes,
    alarms: [{ relativeOffset: -120 }],
  });
  if (res.action === "canceled") return "canceled";
  return "saved";
}

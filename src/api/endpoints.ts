import { api, apiUpload } from "./client";
import type {
  CandidateList,
  MinistryDetail,
  MobileMinistries,
  MobileOverview,
  MobileScheduleDetail,
  MobileScheduleList,
  NotificationPreferences,
  Occurrence,
  PersonLite,
  Unavailability,
  JoinLookup,
  JoinRequestView,
  InviteInfo,
  MeProfile,
  ChatMessage,
  SetlistEntry,
  ScheduleFile,
  Song,
  MyChurch,
  MinistryReport,
  ScheduleHistoryItem,
} from "./contracts";

const enc = encodeURIComponent;

export type ScheduleSource =
  | { kind: "blank" }
  | { kind: "template"; templateId: string }
  | { kind: "duplicate"; scheduleId: string; withPeople: boolean };

export type MemberAction =
  | { action: "add"; userId: string; functionNames: string[] }
  | { action: "set_functions"; userId: string; functionNames: string[] }
  | { action: "promote"; userId: string }
  | { action: "demote"; userId: string }
  | { action: "remove"; userId: string; reviewSchedules?: boolean };

export type FunctionAction =
  | { action: "create"; name: string; defaultQuantity?: number }
  | { action: "update"; functionId: string; name?: string; defaultQuantity?: number }
  | { action: "deactivate"; functionId: string }
  | { action: "activate"; functionId: string };

export interface SessionUser {
  id: string;
  church_id?: string;
  name: string;
  email: string;
  photo_url: string | null;
  avatar_color: string | null;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

/** Cadastro/status da entrada na igreja: aprovado traz sessão; pendente, o join token. */
export type JoinOutcome =
  | ({ status: "approved"; church: { name: string }; code?: undefined } & AuthResponse)
  | { status: "approved"; church: { name: string }; code: "LOGIN_REQUIRED" }
  | { status: "pending"; church: { name: string }; joinToken?: string; name: string; invitedByName?: string | null }
  | { status: "rejected"; church: { name: string }; message: string };

export const endpoints = {
  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", { method: "POST", body: { email: email.trim(), password } }),
  session: () => api<AuthResponse & { authenticated: boolean }>("/auth/session"),
  requestLoginCode: (email: string) => api<{ success: boolean }>("/auth/email-code", { method: "POST", body: { email: email.trim() } }),
  verifyLoginCode: (email: string, code: string) =>
    api<AuthResponse>("/auth/email-code/verify", { method: "POST", body: { email: email.trim(), code } }),
  /** Google ou Apple: token do Firebase recém-obtido no provedor. */
  socialLogin: (firebaseIdToken: string) => api<AuthResponse>("/auth/social", { method: "POST", body: { idToken: firebaseIdToken } }),
  logout: () => api<{ success: boolean }>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) => api<{ success: boolean }>("/auth/forgot-password", { method: "POST", body: { email: email.trim() } }),
  /** Criar igreja pelo app: 1) código no e-mail; 2) cria igreja + admin. */
  requestChurchSignupCode: (email: string) =>
    api<{ success: boolean }>("/auth/register/code", { method: "POST", body: { email: email.trim() } }),
  registerChurch: (input: {
    churchName: string;
    weeklyServices: { day: string; time: string }[];
    name: string;
    email: string;
    phone: string;
    password: string;
    emailCode: string;
  }) => api<AuthResponse & { churchCode: string | null }>("/auth/register", { method: "POST", body: { ...input, email: input.email.trim() } }),

  // Entrada na igreja (públicas)
  joinLookup: (code: string, invite?: string | null) =>
    api<JoinLookup>(`/join/lookup?c=${enc(code)}${invite ? `&i=${enc(invite)}` : ""}`),
  /** Com senha, ou com Google/Apple (`idToken` no lugar de e-mail e senha). */
  joinSignup: (
    input:
      | { code: string; invite?: string | null; name: string; email: string; phone: string; password: string }
      | { code: string; invite?: string | null; name: string; phone: string; idToken: string },
  ) => api<JoinOutcome>("/join/signup", { method: "POST", body: "email" in input ? { ...input, email: input.email.trim() } : input }),
  joinStatus: (joinToken: string) => api<JoinOutcome>("/join/status", { headers: { "x-servos-join": joinToken } }),

  // Entrada na igreja (liderança)
  inviteInfo: (ministryId?: string | null) => api<InviteInfo>(`/mobile/join/invite${ministryId ? `?ministryId=${enc(ministryId)}` : ""}`),
  invitePerson: (input: { name: string; email?: string | null; ministryId?: string | null }) =>
    api<{ url: string; code: string; message: string; expiresAt: string }>("/mobile/join/invite", { method: "POST", body: input }),
  regenerateJoinCode: () => api<{ code: string; codeFormatted: string }>("/mobile/join/code", { method: "POST" }),
  joinRequests: () => api<{ items: JoinRequestView[] }>("/mobile/join/requests"),
  decideJoin: (id: string, decision: "approve" | "reject") =>
    api<{ status: "approved" | "rejected" }>(`/mobile/join/requests/${enc(id)}`, { method: "POST", body: { decision } }),

  overview: () => api<MobileOverview>("/mobile/overview"),
  scheduleMonth: (month: string) => api<{ month: string; items: MobileScheduleList["items"] }>(`/mobile/schedules?month=${enc(month)}`),
  scheduleHistory: (scheduleId: string) => api<{ items: ScheduleHistoryItem[] }>(`/mobile/schedules/${enc(scheduleId)}/history`),
  ministryReport: (ministryId: string, days: number) => api<MinistryReport>(`/mobile/ministries/${enc(ministryId)}/report?days=${days}`),
  me: () => api<MeProfile>("/mobile/me"),
  /** Excluir a própria conta em todas as igrejas (não tem volta). */
  deleteAccount: () => api<{ success: boolean }>("/mobile/me", { method: "DELETE", body: { confirm: "EXCLUIR" } }),
  updateProfile: (input: { name: string; phone?: string; birthDate?: string | null }) =>
    api<{ success: boolean }>("/profile/update", { method: "POST", body: input }),
  uploadPhoto: (file: { uri: string }) => apiUpload<{ url: string }>("/profile/upload-photo", file),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ success: boolean }>("/profile/change-password", { method: "POST", body: { currentPassword, newPassword, confirmPassword: newPassword } }),
  // Conversa · músicas · arquivos da escala
  scheduleChat: (scheduleId: string) => api<{ items: ChatMessage[]; readOnly: boolean }>(`/mobile/schedules/${enc(scheduleId)}/chat`),
  sendChat: (scheduleId: string, text: string) =>
    api<{ items: ChatMessage[] }>(`/mobile/schedules/${enc(scheduleId)}/chat`, { method: "POST", body: { text } }),
  scheduleSongs: (scheduleId: string) => api<{ items: SetlistEntry[]; canEdit: boolean }>(`/mobile/schedules/${enc(scheduleId)}/songs`),
  saveScheduleSongs: (scheduleId: string, items: { songId: string; key: string }[]) =>
    api<{ items: SetlistEntry[]; canEdit: boolean }>(`/mobile/schedules/${enc(scheduleId)}/songs`, { method: "PUT", body: { items } }),
  scheduleFiles: (scheduleId: string) => api<{ files: ScheduleFile[] }>(`/schedules/files?scheduleId=${enc(scheduleId)}`),
  uploadScheduleFile: (scheduleId: string, file: { uri: string }) =>
    apiUpload<{ file: ScheduleFile }>("/schedules/files", file, { scheduleId }),

  // Repertório
  songs: () => api<{ songs: Song[] }>("/songs"),
  createSong: (song: Omit<Song, "id" | "times_used" | "last_used">) => api<{ success: boolean }>("/songs", { method: "POST", body: { song } }),
  deleteSong: (songId: string) => api<{ success: boolean }>(`/songs?songId=${enc(songId)}`, { method: "DELETE" }),

  // Evento (mesma rota do web)
  createEvent: (data: { name: string; type: "recurring" | "special"; icon: string; location: string; base_time: string; recurrence: string; description?: string }) =>
    api<{ success: boolean; id: string }>("/events/manage", { method: "POST", body: { mode: "create", data: { status: "publicado", ...data } } }),

  // Multi-igreja
  myChurches: () => api<{ items: MyChurch[] }>("/mobile/churches"),
  switchChurch: (churchId: string) => api<AuthResponse>("/mobile/churches", { method: "POST", body: { action: "switch", churchId } }),
  joinAnotherChurch: (code: string, invite?: string | null) =>
    api<{ status: "pending" | "approved"; church: { id: string; name: string }; items: MyChurch[] }>("/mobile/churches", {
      method: "POST",
      body: { action: "join", code, invite: invite ?? null },
    }),

  analytics: (body: { events: unknown[]; platform: string; appVersion: string }) =>
    api<{ accepted: number }>("/mobile/analytics", { method: "POST", body }),
  schedules: (scope: "upcoming" | "past", cursor?: string | null) =>
    api<MobileScheduleList>(`/mobile/schedules?scope=${scope}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  schedule: (id: string) => api<MobileScheduleDetail>(`/mobile/schedules/${encodeURIComponent(id)}`),
  ministries: () => api<MobileMinistries>("/mobile/ministries"),

  respond: (input: { assignmentId: string; status: "confirmed" | "declined"; reason?: string; markUnavailable?: boolean }) =>
    api<{ success: boolean; changed: boolean }>("/schedule-members", {
      method: "PATCH",
      body: {
        action: "respond",
        scheduleMemberId: input.assignmentId,
        status: input.status,
        declineReason: input.reason ?? "",
        markUnavailable: input.markUnavailable,
      },
    }),
  requestReplacement: (input: { assignmentId: string; reason?: string; markUnavailable?: boolean }) =>
    api<{ success: boolean; changed: boolean }>("/schedule-members", {
      method: "PATCH",
      body: {
        action: "request-replacement",
        scheduleMemberId: input.assignmentId,
        reason: input.reason,
        markUnavailable: input.markUnavailable,
      },
    }),

  // P1 — servo
  unavailability: () => api<{ items: Unavailability[] }>("/mobile/unavailability"),
  addUnavailability: (input: { date: string; endDate?: string | null; allDay: boolean; startTime?: string | null; endTime?: string | null; reason?: string }) =>
    api<{ items: Unavailability[] }>("/mobile/unavailability", { method: "POST", body: input }),
  removeUnavailability: (id: string) => api<{ items: Unavailability[] }>(`/mobile/unavailability?id=${enc(id)}`, { method: "DELETE" }),
  notificationPreferences: () => api<NotificationPreferences>("/mobile/notification-preferences"),
  saveNotificationPreferences: (patch: Partial<Omit<NotificationPreferences, "leader">> & { leader?: Partial<NotificationPreferences["leader"]> }) =>
    api<NotificationPreferences>("/mobile/notification-preferences", { method: "PUT", body: patch }),

  // P1 — liderança: escala
  candidates: (scheduleId: string, functionName: string, replacing?: string) =>
    api<CandidateList>(
      `/mobile/schedules/${enc(scheduleId)}/candidates?function=${enc(functionName)}${replacing ? `&replacing=${enc(replacing)}` : ""}`,
    ),
  assign: (scheduleId: string, input: { userId: string; functionName?: string; replacingAssignmentId?: string; override?: boolean }) =>
    api<{ success: boolean; assignmentId: string }>(`/mobile/schedules/${enc(scheduleId)}/assignments`, { method: "POST", body: input }),
  unassign: (scheduleId: string, assignmentId: string) =>
    api<{ success: boolean; mode: "deleted" | "cancelled" }>(`/mobile/schedules/${enc(scheduleId)}/assignments?assignmentId=${enc(assignmentId)}`, {
      method: "DELETE",
    }),
  editSchedule: (
    scheduleId: string,
    input: {
      expectedVersion: number;
      time?: string;
      endTime?: string;
      arrivalTime?: string;
      location?: string;
      instructions?: string;
      publish?: true;
      criticalChange?: "check" | "reconfirm";
    },
  ) => api<{ success: boolean; version: number; reconfirmationRequested: number }>(`/mobile/schedules/${enc(scheduleId)}`, { method: "PATCH", body: input }),
  cancelSchedule: (scheduleId: string, reason?: string) =>
    api<{ success: boolean; notified: number }>(`/mobile/schedules/${enc(scheduleId)}/cancel`, { method: "POST", body: { reason } }),
  createSchedule: (input: { ministryId: string; eventId: string; date: string; time?: string; source: ScheduleSource }) =>
    api<{ success: boolean; scheduleId: string; skipped: { user_id: string; reason: string }[] }>("/mobile/schedules", { method: "POST", body: input }),

  // P1 — liderança: ministério
  ministry: (id: string) => api<MinistryDetail>(`/mobile/ministries/${enc(id)}`),
  ministryMember: (ministryId: string, input: MemberAction) =>
    api<{ success: boolean; cancelledAssignments?: number }>(`/mobile/ministries/${enc(ministryId)}/members`, { method: "POST", body: input }),
  ministryFunction: (ministryId: string, input: FunctionAction) =>
    api<{ success: boolean }>(`/mobile/ministries/${enc(ministryId)}/functions`, { method: "POST", body: input }),
  saveTemplate: (ministryId: string, input: { name: string; fromScheduleId: string }) =>
    api<{ success: boolean; templateId: string }>(`/mobile/ministries/${enc(ministryId)}/templates`, { method: "POST", body: { action: "create", ...input } }),
  archiveTemplate: (ministryId: string, templateId: string) =>
    api<{ success: boolean }>(`/mobile/ministries/${enc(ministryId)}/templates`, { method: "POST", body: { action: "archive", templateId } }),
  occurrences: (ministryId: string) => api<{ items: Occurrence[] }>(`/mobile/ministries/${enc(ministryId)}/occurrences`),
  people: (ministryId: string, q: string) => api<{ items: PersonLite[] }>(`/mobile/people?ministryId=${enc(ministryId)}&q=${enc(q)}`),

  notifications: () =>
    api<{ notifications: AppNotification[]; unreadCount: number }>("/notifications/list"),
  markNotificationsRead: (ids: string[]) =>
    api<{ success: boolean }>("/notifications/read", { method: "POST", body: { notificationIds: ids } }),
  registerPush: (token: string, platform: "ios" | "android", deviceName?: string) =>
    api<{ success: boolean }>("/notifications/register-push", { method: "POST", body: { token, platform, deviceName } }),
  unregisterPush: (token: string) =>
    api<{ success: boolean }>("/notifications/register-push", { method: "DELETE", body: { token } }),
};

/** Formato de GET /notifications/list (o servidor devolve camelCase). */
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  icon: string | null;
  type: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string | null;
}

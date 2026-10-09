// Espelho de Servos-v3/server/src/lib/mobile/contracts.ts (BFF /api/mobile/*).
// Mudou lá → mude aqui. Os tipos importados do servidor foram trazidos inline.

export type ScheduleStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

export type AssignmentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "REPLACEMENT_PENDING"
  | "REPLACED"
  | "CANCELLED";

export type AttentionItem =
  | { kind: "open_slots"; functionName: string; count: number }
  | { kind: "declined"; assignmentId: string; userId: string; userName: string; functionName: string }
  | { kind: "replacement_requested"; assignmentId: string; userId: string; userName: string; functionName: string }
  | { kind: "no_response"; count: number; userNames: string[] };


export interface MinistryRef {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  kind?: string | null;
}

export interface AssignmentCard {
  assignmentId: string;
  scheduleId: string;
  status: AssignmentStatus;
  scheduleStatus: ScheduleStatus;
  /** PENDING numa escala publicada e futura — a pessoa precisa responder. */
  needsResponse: boolean;
  eventName: string;
  ministry: MinistryRef;
  functionName: string;
  date: string;
  time: string;
  arrivalTime: string;
  location: string;
  /** Pedido de nova confirmação por alteração crítica. */
  reconfirmRequested: boolean;
}

export interface LeaderScheduleSummary {
  scheduleId: string;
  date: string;
  time: string;
  eventName: string;
  status: ScheduleStatus;
  totals: { people: number; confirmed: number; pending: number; declined: number; openSlots: number; totalSlots: number };
  attention: AttentionItem[];
  isIncomplete: boolean;
}

export interface LeaderMinistrySummary {
  ministry: MinistryRef;
  nextSchedule: LeaderScheduleSummary | null;
}

export type LeaderAttentionItem = AttentionItem & {
  scheduleId: string;
  date: string;
  eventName: string;
  ministryName: string;
};

export interface MobileOverview {
  user: { id: string; name: string; firstName: string; photoUrl: string | null; avatarColor: string | null };
  next: AssignmentCard | null;
  /** Precisam de resposta (sem a `next`). */
  pending: AssignmentCard[];
  /** Demais próximas (sem a `next` e sem as pendentes). */
  upcoming: AssignmentCard[];
  leader: { ministries: LeaderMinistrySummary[]; attention: LeaderAttentionItem[] } | null;
  unreadNotifications: number;
  /** O que o app oferece a esta pessoa na entrada de novas pessoas. */
  access?: {
    canInvite: boolean;
    canRegenerateCode: boolean;
    canCreateEvents?: boolean;
    canSeeRepertoire?: boolean;
    canManageSongs?: boolean;
    /** Criar ministério (admin, pastor, coordenação). */
    canCreateMinistries?: boolean;
  };
  /** Pedidos de entrada na igreja que ela pode aprovar agora. */
  joinRequests?: number;
  generatedAt: string;
}

export interface MobileScheduleList {
  scope: "upcoming" | "past";
  items: AssignmentCard[];
  /** Cursor opaco para "carregar mais" do histórico. */
  nextCursor: string | null;
}

export interface TeamMember {
  assignmentId: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
  functionName: string;
  status: AssignmentStatus;
  isMe: boolean;
}

export interface FunctionCoverageView {
  functionName: string;
  needed: number;
  filled: number;
  pending: number;
  open: number;
}

export interface MobileScheduleDetail {
  schedule: {
    id: string;
    status: ScheduleStatus;
    date: string;
    time: string;
    endTime: string;
    arrivalTime: string;
    location: string;
    instructions: string;
    version: number;
    event: { id: string; name: string; description: string };
    ministry: MinistryRef;
  };
  me: {
    assignmentId: string;
    status: AssignmentStatus;
    functionName: string;
    declineReason: string;
    reconfirmRequested: boolean;
  } | null;
  leaders: { id: string; name: string; photoUrl: string | null; avatarColor: string | null; phone: string | null }[];
  team: TeamMember[];
  coverage: { totalSlots: number; filledSlots: number; openSlots: number; byFunction: FunctionCoverageView[] };
  attention: AttentionItem[] | null;
  permissions: { canManage: boolean; canRespond: boolean };
}

export interface MyMinistry {
  ministry: MinistryRef & { description: string };
  role: "LEADER" | "MEMBER";
  /** Funções reais (papel nunca aparece como função). */
  functions: string[];
  leaders: { id: string; name: string; photoUrl: string | null; avatarColor: string | null }[];
  memberCount: number;
}

export interface MobileMinistries {
  items: MyMinistry[];
}

// ── P1 ──────────────────────────────────────────────────────────────────────

export type CandidateFlag =
  | { kind: "unavailable"; reason: string }
  | { kind: "conflict"; scheduleId: string; ministryName: string; eventName: string; date: string; time: string }
  | { kind: "no_function" };

export interface Candidate {
  userId: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
  hasFunction: boolean;
  flags: CandidateFlag[];
  lastServedDaysAgo: number | null;
}

export interface CandidateList {
  functionName: string;
  recommended: Candidate[];
  others: Candidate[];
}

export interface Unavailability {
  id: string;
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  source: string;
}

export interface LeaderPreferences {
  declines: boolean;
  replacements: boolean;
  schedule_issues: boolean;
  each_confirmation: boolean;
  confirmation_digest: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  scheduleNotifications: boolean;
  leader: LeaderPreferences;
}

export interface MinistryFunctionView {
  id: string;
  name: string;
  defaultQuantity: number;
  status: "active" | "inactive";
  memberCount: number;
}

export interface MinistryMemberView {
  membershipId: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
  role: "LEADER" | "MEMBER";
  functions: string[];
  active: boolean;
  isMe: boolean;
}

export interface MinistryScheduleSummary {
  scheduleId: string;
  date: string;
  time: string;
  eventName: string;
  status: ScheduleStatus;
  filledSlots: number;
  totalSlots: number;
  openSlots: number;
  pending: number;
}

export interface TemplateView {
  id: string;
  name: string;
  positions: { function_name: string; quantity: number }[];
  arrivalOffsetMin: number;
}

export interface MinistryDetail {
  ministry: MinistryRef & { description: string };
  myRole: "LEADER" | "MEMBER";
  permissions: { canManage: boolean };
  functions: MinistryFunctionView[];
  team: MinistryMemberView[];
  upcoming: MinistryScheduleSummary[];
  recent: { scheduleId: string; date: string; time: string; eventName: string }[];
  templates: TemplateView[];
}

export interface Occurrence {
  eventId: string;
  eventName: string;
  date: string;
  time: string;
  location: string;
  existingScheduleId: string | null;
}

export interface PersonLite {
  id: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
}

// ── Entrada na igreja ────────────────────────────────────────────────────────

export interface JoinLookup {
  church: { name: string; city: string; code: string };
  invite: {
    kind: "link" | "person";
    inviterName: string;
    ministryName: string | null;
    name: string | null;
    email: string | null;
  } | null;
}

export interface InviteInfo {
  church: { name: string };
  ministry: { id: string; name: string } | null;
  code: string;
  codeFormatted: string;
  url: string;
  message: string;
  canRegenerateCode: boolean;
}

export interface JoinRequestView {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  invitedByName: string | null;
  ministryName: string | null;
}

// ── Meus dados · histórico · relatório (P2) ─────────────────────────────────

export interface MeProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string | null;
  photoUrl: string | null;
  avatarColor: string | null;
  church: { name: string };
}

export type HistoryTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface ScheduleHistoryItem {
  id: string;
  at: string;
  text: string;
  detail: string | null;
  tone: HistoryTone;
  actorName: string;
}

export interface PersonReport {
  userId: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
  served: number;
  declined: number;
  replacements: number;
  upcoming: number;
  lastServedDate: string | null;
  flag: "overloaded" | "idle" | "declines_often" | null;
}

export interface MinistryReport {
  ministry: { id: string; name: string };
  period: { days: number; from: string; to: string };
  totals: {
    schedules: number;
    assignments: number;
    confirmed: number;
    declined: number;
    replacements: number;
    unanswered: number;
    confirmRate: number | null;
    fillRate: number | null;
  };
  averageServed: number;
  people: PersonReport[];
}

// ── Conversa, músicas, arquivos, repertório, multi-igreja ───────────────────

export interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
  mine: boolean;
  fromLeader: boolean;
  author: { id: string; name: string; photoUrl: string | null; avatarColor: string | null };
}

export interface SetlistEntry {
  position: number;
  songId: string;
  title: string;
  artist: string;
  key: string;
  originalKey: string;
  bpm: number | null;
  videoUrl: string | null;
  chordsUrl: string | null;
  lyricsUrl: string | null;
}

export interface ScheduleFile {
  id: string;
  scheduleId: string;
  name: string;
  size: number;
  contentType: string;
  uploadedByName?: string;
  createdAt: string;
  url?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  bpm: number | null;
  theme: string;
  lyrics_url: string;
  chords_url: string;
  video_url: string;
  notes: string;
  department_id: string | null;
  times_used?: number;
  last_used?: string | null;
}

export interface MyChurch {
  churchId: string;
  churchName: string;
  status: "active" | "pending";
  current: boolean;
}

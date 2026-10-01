// API FALSA para desenvolvimento/QA visual do app — NUNCA usada em produção.
// Implementa o contrato do BFF (/api/mobile/*) e as rotas de escrita que o
// app chama, em memória, com dados fictícios. Sobe em http://localhost:3999.
//
//   node scripts/mock-api.mjs
//   EXPO_PUBLIC_API_URL=http://localhost:3999 npx expo start
//
// Login: qualquer e-mail + senha "servos". Entra como "Ramon" — líder de
// Produção e servo em Recepção (cobre as duas homes numa conta só).
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 3999);

function iso(daysFromToday) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nextWeekday(target) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diff = (target - d.getDay() + 7) % 7 || 7;
  return iso(diff);
}

const PROD = { id: "prod", name: "Produção", color: "#D83B0C", icon: "video" };
const REC = { id: "rec", name: "Recepção", color: "#2076C9", icon: "door" };

const people = {
  ramon: { id: "ramon", name: "Ramon Oliveira", photoUrl: null, avatarColor: "#8B2407" },
  fer: { id: "fer", name: "Fernanda Lima", photoUrl: null, avatarColor: "#105FA6", phone: "+55 21 99999-0001" },
  joao: { id: "joao", name: "João Pedro", photoUrl: null, avatarColor: "#037138" },
  pedro: { id: "pedro", name: "Pedro Santos", photoUrl: null, avatarColor: "#5E5A55" },
  lucas: { id: "lucas", name: "Lucas Almeida", photoUrl: null, avatarColor: "#8A5601" },
  ana: { id: "ana", name: "Ana Clara", photoUrl: null, avatarColor: "#AB153E" },
  bia: { id: "bia", name: "Beatriz Souza", photoUrl: null, avatarColor: "#48443F" },
};

const sunday = nextWeekday(0);
const state = {
  schedules: [
    {
      id: "s1", ministry: PROD, eventName: "Culto das 18h", date: sunday, time: "18:00", arrivalTime: "17:30",
      location: "Templo principal", instructions: "Chegar pelo portão lateral. Teste de câmeras às 17h40.", status: "PUBLISHED", version: 3,
      slots: [{ fn: "Diretor", n: 1 }, { fn: "Câmera", n: 4 }, { fn: "Fotografia", n: 2 }, { fn: "Streaming", n: 1 }],
      members: [
        { id: "a1", user: "ramon", fn: "Câmera", status: "PENDING" },
        { id: "a2", user: "joao", fn: "Câmera", status: "ACCEPTED" },
        { id: "a3", user: "pedro", fn: "Câmera", status: "DECLINED" },
        { id: "a4", user: "fer", fn: "Diretor", status: "ACCEPTED" },
        { id: "a5", user: "ana", fn: "Streaming", status: "ACCEPTED" },
        { id: "a6", user: "bia", fn: "Fotografia", status: "REPLACEMENT_PENDING" },
      ],
    },
    {
      id: "s2", ministry: REC, eventName: "Culto de quarta", date: nextWeekday(3), time: "19:30", arrivalTime: "19:00",
      location: "Entrada principal", instructions: "", status: "PUBLISHED", version: 1,
      slots: [{ fn: "Recepcionista", n: 3 }],
      members: [
        { id: "b1", user: "ramon", fn: "Recepcionista", status: "PENDING" },
        { id: "b2", user: "lucas", fn: "Recepcionista", status: "ACCEPTED" },
      ],
    },
    {
      id: "s3", ministry: PROD, eventName: "Conferência de Jovens", date: iso(16), time: "20:00", arrivalTime: "18:30",
      location: "Auditório", instructions: "", status: "PUBLISHED", version: 1,
      slots: [{ fn: "Câmera", n: 2 }, { fn: "Streaming", n: 1 }],
      members: [
        { id: "c1", user: "ramon", fn: "Streaming", status: "ACCEPTED" },
        { id: "c2", user: "joao", fn: "Câmera", status: "PENDING" },
      ],
    },
    {
      id: "s5", ministry: { id: "louvor", name: "Louvor", color: null, icon: null, kind: "louvor" }, eventName: "Culto das 18h", date: sunday, time: "17:00", arrivalTime: "16:30",
      location: "Templo principal", instructions: "", status: "PUBLISHED", version: 1, slots: [{ fn: "Vocal", n: 2 }],
      members: [{ id: "e1", user: "rafa", fn: "Vocal", status: "ACCEPTED" }],
    },
    {
      id: "s4", ministry: PROD, eventName: "Culto das 18h", date: iso(-7), time: "18:00", arrivalTime: "17:30",
      location: "Templo principal", instructions: "", status: "COMPLETED", version: 2,
      slots: [{ fn: "Câmera", n: 2 }],
      members: [{ id: "d1", user: "ramon", fn: "Câmera", status: "ACCEPTED" }],
    },
  ],
  notifications: [
    { id: "n1", title: "Você foi escalado 🙌", body: `Produção · Câmera — Dom · 18h — Chegada às 17h30`, icon: "check-circle", type: "confirmation", read: false, action_url: "/escalas/s1", created_at: new Date(Date.now() - 3600e3).toISOString() },
    { id: "n2", title: "Bia pediu substituição", body: "Produção · Fotografia — Culto das 18h", icon: "refresh-cw", type: "substitution", read: false, action_url: "/escalas/s1", created_at: new Date(Date.now() - 5 * 3600e3).toISOString() },
    { id: "n3", title: "Sua escala foi alterada", body: "Horário de chegada: 19:30 → 19:00\nRecepção · Culto de quarta", icon: "alert-circle", type: "alert", read: true, action_url: "/escalas/s2", created_at: new Date(Date.now() - 30 * 3600e3).toISOString() },
  ],
  sessions: new Map(),
};

const leadership = { prod: ["ramon", "fer"], rec: ["lucas"], louvor: ["ramon"] };
const leadersOf = (m) => leadership[m.id];
const ministries = { prod: PROD, rec: REC };
// Vínculos: quem está em qual ministério e com quais funções.
const memberships = {
  prod: {
    ramon: ["Diretor", "Câmera", "Streaming"], fer: ["Diretor"], joao: ["Câmera"], pedro: ["Câmera"], lucas: ["Câmera", "Fotografia"],
    ana: ["Streaming"], bia: ["Fotografia"], rafa: ["Câmera"],
  },
  rec: { ramon: ["Recepcionista"], lucas: ["Recepcionista"], bia: ["Recepcionista"] },
};
people.rafa = { id: "rafa", name: "Rafael Costa", photoUrl: null, avatarColor: "#105FA6" };
people.clara = { id: "clara", name: "Clara Mendes", photoUrl: null, avatarColor: "#8B2407" };
people.davi = { id: "davi", name: "Davi Rocha", photoUrl: null, avatarColor: "#037138" };
const functionsOf = {
  prod: [
    { id: "f1", name: "Diretor", defaultQuantity: 1, status: "active" },
    { id: "f2", name: "Câmera", defaultQuantity: 4, status: "active" },
    { id: "f3", name: "Fotografia", defaultQuantity: 2, status: "active" },
    { id: "f4", name: "Streaming", defaultQuantity: 1, status: "active" },
    { id: "f5", name: "Iluminação", defaultQuantity: 1, status: "inactive" },
  ],
  rec: [{ id: "f6", name: "Recepcionista", defaultQuantity: 3, status: "active" }],
};
const templates = { prod: [{ id: "t1", name: "Culto Domingo 18h — Produção", positions: [{ function_name: "Diretor", quantity: 1 }, { function_name: "Câmera", quantity: 4 }, { function_name: "Fotografia", quantity: 2 }, { function_name: "Streaming", quantity: 1 }], arrivalOffsetMin: 30 }], rec: [] };
const unavailability = { ramon: [], pedro: [] };
const prefs = { pushEnabled: true, scheduleNotifications: true, leader: { declines: true, replacements: true, schedule_issues: true, each_confirmation: false, confirmation_digest: true } };
let seq = 100;
// Papel derivado para o web (Servos-v3/app) conseguir abrir as telas de admin
// contra este mock (QA de /aprovacoes).
const WEB_DERIVED = { primaryRole: "admin", businessRoles: ["admin"], profileMode: "admin" };

// ── Meus dados · histórico · relatório · analytics (P2) ──────────────────────
const me = { id: "ramon", name: "", email: "lider@servos.dev", phone: "19998765432", birthDate: "1990-05-12", photoUrl: null, avatarColor: "#8B2407", church: { name: "Igreja Central" } };
const analytics = [];
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
function historyFor(scheduleId) {
  const s = state.schedules.find((x) => x.id === scheduleId);
  const first = (id) => (people[id]?.name || "Alguém").split(" ")[0];
  const items = [
    { id: "h1", at: ago(240), text: "Ramon criou a escala", detail: "A partir de um modelo", tone: "neutral", actorName: "Ramon" },
    { id: "h2", at: ago(239), text: "Ramon publicou a escala", detail: null, tone: "info", actorName: "Ramon" },
  ];
  (s?.members || []).slice(0, 6).forEach((m, i) => {
    items.push({ id: `a${i}`, at: ago(238 - i), text: `Ramon escalou ${first(m.user)} como ${m.fn}`, detail: null, tone: "neutral", actorName: "Ramon" });
    if (m.status === "ACCEPTED") items.push({ id: `c${i}`, at: ago(40 - i * 3), text: `${first(m.user)} confirmou presença`, detail: null, tone: "success", actorName: first(m.user) });
    if (m.status === "DECLINED") items.push({ id: `d${i}`, at: ago(20 - i), text: `${first(m.user)} não pode servir`, detail: m.reason || null, tone: "danger", actorName: first(m.user) });
    if (m.status === "REPLACEMENT_PENDING") items.push({ id: `r${i}`, at: ago(5), text: `${first(m.user)} pediu substituição`, detail: m.reason || null, tone: "warning", actorName: first(m.user) });
  });
  items.push({ id: "h9", at: ago(30), text: "Ramon alterou o horário de chegada", detail: "17:00 → 17:30", tone: "neutral", actorName: "Ramon" });
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
function reportFor(ministryId, days) {
  const team = Object.keys(memberships[ministryId] || {});
  const k = days / 90;
  const served = { ramon: 9, fer: 7, pedro: 2, joao: 5, bia: 4, davi: 0, lucas: 3, ana: 6 };
  const peopleRows = team.map((u) => {
    const n = Math.round((served[u] ?? 2) * k);
    return {
      userId: u, name: people[u].name, photoUrl: null, avatarColor: people[u].avatarColor,
      served: n, declined: u === "pedro" ? Math.max(2, Math.round(3 * k)) : 0, replacements: u === "bia" ? 1 : 0, upcoming: n ? 1 : 0,
      lastServedDate: n ? iso(-Math.max(3, 30 - n * 3)) : null, flag: null,
    };
  });
  const avg = peopleRows.length ? Math.round((peopleRows.reduce((a, p) => a + p.served, 0) / peopleRows.length) * 10) / 10 : 0;
  for (const p of peopleRows) {
    if (p.served >= 3 && p.served >= avg * 1.5) p.flag = "overloaded";
    else if (p.declined >= 2 && p.declined >= p.served) p.flag = "declines_often";
    else if (p.served === 0) p.flag = "idle";
  }
  peopleRows.sort((a, b) => b.served - a.served);
  const confirmed = peopleRows.reduce((a, p) => a + p.served, 0);
  const declined = peopleRows.reduce((a, p) => a + p.declined, 0);
  return {
    ministry: { id: ministryId, name: ministries[ministryId]?.name || "Ministério" },
    period: { days, from: iso(-days), to: iso(0) },
    totals: { schedules: Math.round(12 * k), assignments: confirmed + declined + 2, confirmed, declined, replacements: 1, unanswered: 2, confirmRate: Math.round((confirmed / Math.max(1, confirmed + declined)) * 100), fillRate: 86 },
    averageServed: avg,
    people: peopleRows,
  };
}

// ── Conversa, músicas, arquivos, eventos e multi-igreja ──────────────────────
// Outras igrejas: Nova Vida (Ramon já faz parte) e Esperança (para testar o pedido).
const OTHER_CHURCHES = {
  P2R8TZ: { id: "igreja-nova", name: "Igreja Nova Vida", city: "Valinhos", code: "P2R8TZ" },
  H3W9KD: { id: "comunidade", name: "Comunidade Esperança", city: "Campinas", code: "H3W9KD" },
};
const extras = {
  chats: {
    s1: [
      { id: "m1", authorId: "fer", fromLeader: true, text: "Pessoal, domingo teremos batismo. Câmera 2 fica na lateral esquerda.", createdAt: ago(20) },
      { id: "m2", authorId: "joao", fromLeader: false, text: "Combinado! Levo o tripé extra.", createdAt: ago(18) },
      { id: "m3", authorId: "ana", fromLeader: false, text: "A transmissão começa 17h50. Alguém confere o áudio comigo antes?", createdAt: ago(6) },
      { id: "m4", authorId: "fer", fromLeader: true, text: "Ana, o Lucas chega mais cedo e te ajuda. Obrigada, equipe!", createdAt: ago(5) },
      { id: "m5", authorId: "ramon", fromLeader: true, text: "Estarei lá às 17h30. Vai ser um culto lindo!", createdAt: ago(2) },
    ],
  },
  songs: [
    { id: "sg1", title: "Grande é o Senhor", artist: "Adhemar de Campos", key: "G", bpm: 72, theme: "Adoração", lyrics_url: "", chords_url: "https://www.cifraclub.com.br", video_url: "https://www.youtube.com", notes: "", department_id: null, times_used: 12 },
    { id: "sg2", title: "Aclame ao Senhor", artist: "Diante do Trono", key: "A", bpm: 128, theme: "Louvor", lyrics_url: "", chords_url: "", video_url: "https://www.youtube.com", notes: "", department_id: null, times_used: 8 },
    { id: "sg3", title: "Santo Espírito", artist: "Laura Souguellis", key: "D", bpm: 68, theme: "Adoração", lyrics_url: "", chords_url: "https://www.cifraclub.com.br", video_url: "", notes: "", department_id: null, times_used: 5 },
    { id: "sg4", title: "Ceia do Senhor", artist: "", key: "E", bpm: null, theme: "Ceia", lyrics_url: "", chords_url: "", video_url: "", notes: "", department_id: null, times_used: 2 },
    { id: "sg5", title: "Ao Único", artist: "Aline Barros", key: "C", bpm: 76, theme: "Abertura", lyrics_url: "", chords_url: "", video_url: "", notes: "", department_id: null, times_used: 3 },
    { id: "sg6", title: "Bondade de Deus", artist: "Isaías Saad", key: "G", bpm: 68, theme: "Adoração", lyrics_url: "", chords_url: "https://www.cifraclub.com.br", video_url: "https://www.youtube.com", notes: "", department_id: null, times_used: 10 },
    { id: "sg7", title: "Lindo És", artist: "Livres para Adorar", key: "E", bpm: 70, theme: "Adoração", lyrics_url: "", chords_url: "https://www.cifraclub.com.br", video_url: "", notes: "", department_id: null, times_used: 7 },
    { id: "sg8", title: "Deus de Promessas", artist: "Davi Sacer", key: "D", bpm: 124, theme: "Louvor", lyrics_url: "", chords_url: "", video_url: "https://www.youtube.com", notes: "", department_id: null, times_used: 6 },
  ],
  setlists: { s5: [{ songId: "sg2", key: "" }, { songId: "sg1", key: "A" }] },
  files: {
    s1: [{ id: "fl1", scheduleId: "s1", name: "Roteiro do culto.pdf", size: 184320, contentType: "application/pdf", uploadedByName: "Fernanda Lima", createdAt: ago(30), url: "https://example.com/roteiro.pdf" }],
  },
  churches: [
    { churchId: "igreja-central", churchName: "Igreja Central", status: "active" },
    { churchId: "igreja-nova", churchName: "Igreja Nova Vida", status: "active" },
  ],
  // token → igreja da sessão
  sessionChurch: new Map(),
};
function extraRoutes(req, url, path, body, uid, send) {
  const token = String(req.headers["x-servos-auth"] || "");
  const current = extras.sessionChurch.get(token) || "igreja-central";
  let m;
  if ((m = /^\/mobile\/schedules\/([^/]+)\/chat$/.exec(path))) {
    const list = (extras.chats[m[1]] ||= []);
    const s = state.schedules.find((x) => x.id === m[1]);
    if (req.method === "POST") {
      const text = String(body.text || "").trim();
      if (!text) return send(400, { error: "Escreva a mensagem." });
      list.push({ id: nid("m"), authorId: uid, fromLeader: Boolean(leadersOf(s.ministry)?.includes(uid)), text, createdAt: new Date().toISOString() });
    }
    const items = list.map((x) => ({
      id: x.id, text: x.text, createdAt: x.createdAt, mine: x.authorId === uid, fromLeader: x.fromLeader,
      author: { id: x.authorId, name: people[x.authorId].name, photoUrl: x.authorId === "ramon" ? me.photoUrl : null, avatarColor: people[x.authorId].avatarColor },
    }));
    return send(200, { items, readOnly: s?.status === "CANCELLED" });
  }
  if ((m = /^\/mobile\/schedules\/([^/]+)\/songs$/.exec(path))) {
    const s = state.schedules.find((x) => x.id === m[1]);
    const canEdit = Boolean(s && leadersOf(s.ministry)?.includes(uid));
    if (req.method === "PUT") {
      if (!canEdit) return send(403, { error: "Só a liderança monta a lista." });
      extras.setlists[m[1]] = (body.items || []).map((i) => ({ songId: i.songId, key: String(i.key || "").slice(0, 6) }));
    }
    const items = (extras.setlists[m[1]] || [])
      .map((e, i) => {
        const song = extras.songs.find((x) => x.id === e.songId);
        return song ? { position: i + 1, songId: song.id, title: song.title, artist: song.artist, key: e.key || song.key, originalKey: song.key, bpm: song.bpm, chordsUrl: song.chords_url || null, lyricsUrl: song.lyrics_url || null, videoUrl: song.video_url || null } : null;
      })
      .filter(Boolean);
    return send(200, { items, canEdit });
  }
  if (path === "/schedules/files") {
    const sid = url.searchParams.get("scheduleId") || body.scheduleId || /name="scheduleId"\r\n\r\n([^\r]+)/.exec(body.__raw || "")?.[1];
    const list = (extras.files[sid] ||= []);
    if (req.method === "POST") {
      const fileName = /filename="([^"]+)"/.exec(body.__raw || "")?.[1] || `arquivo-${list.length + 1}`;
      const type = /name="file"[^\r]*\r\nContent-Type: ([^\r]+)/.exec(body.__raw || "")?.[1] || "application/octet-stream";
      list.push({ id: nid("fl"), scheduleId: sid, name: fileName, size: body.__size || 250000, contentType: type, uploadedByName: people[uid].name, createdAt: new Date().toISOString(), url: "https://example.com/arquivo" });
      return send(200, { file: list[list.length - 1] });
    }
    return send(200, { files: list });
  }
  if (path === "/songs") {
    if (req.method === "POST") {
      const song = { ...body.song, id: nid("sg"), times_used: 0 };
      extras.songs.push(song);
      return send(200, { success: true });
    }
    if (req.method === "DELETE") {
      extras.songs = extras.songs.filter((x) => x.id !== url.searchParams.get("songId"));
      return send(200, { success: true });
    }
    return send(200, { songs: extras.songs });
  }
  if (path === "/events/manage" && req.method === "POST") {
    if (!body.data?.name) return send(400, { error: "Dê um nome ao evento." });
    return send(200, { success: true, id: nid("ev") });
  }
  if (path === "/mobile/churches") {
    const list = () => extras.churches.map((c) => ({ ...c, current: c.churchId === current }));
    if (req.method === "POST" && body.action === "switch") {
      const c = extras.churches.find((x) => x.churchId === body.churchId);
      if (!c) return send(403, { error: "Você não faz parte desta igreja.", code: "NOT_MEMBER" });
      if (c.status !== "active") return send(409, { error: "Seu pedido nesta igreja ainda aguarda aprovação.", code: "PENDING_APPROVAL" });
      const t = `mock-${Math.random().toString(36).slice(2)}`;
      state.sessions.set(t, uid);
      extras.sessionChurch.set(t, c.churchId);
      return send(200, { success: true, token: t, user: { id: uid, church_id: c.churchId, name: people[uid].name, email: "lider@servos.dev", photo_url: me.photoUrl, avatar_color: people[uid].avatarColor } });
    }
    if (req.method === "POST" && body.action === "join") {
      const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code === join.church.code) return send(409, { error: "Você já faz parte desta igreja.", code: "ALREADY_MEMBER" });
      const other = OTHER_CHURCHES[code];
      if (!other) return send(404, { error: "Não encontramos uma igreja com esse código.", code: "CODE_NOT_FOUND" });
      const found = extras.churches.find((c) => c.churchId === other.id);
      if (found?.status === "active") return send(409, { error: "Você já faz parte desta igreja.", code: "ALREADY_MEMBER" });
      if (found) return send(409, { error: "Você já pediu para entrar nesta igreja. Aguarde a liderança.", code: "ALREADY_REQUESTED" });
      extras.churches.push({ churchId: other.id, churchName: other.name, status: "pending" });
      return send(200, { status: "pending", church: { id: other.id, name: other.name }, items: list() });
    }
    return send(200, { items: list() });
  }
  return false;
}

// ── Entrada na igreja (mesmas regras de lib/join no servidor) ───────────────
const join = {
  church: { name: "Igreja Central", city: "Campinas", code: "K7M4QX" },
  // token → convite
  invites: {
    "lnk-ramon": { kind: "link", inviter: "ramon", ministry: null },
    "lnk-ramon-prod": { kind: "link", inviter: "ramon", ministry: "prod" },
  },
  requests: [
    { id: "jr1", name: "Ana Paula Souza", email: "ana.paula@email.com", phone: "(19) 99876-5432", invitedBy: "ramon", ministry: "prod", status: "pending", createdAt: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { id: "jr2", name: "Marcos Vinícius Lima", email: "marcos.lima@email.com", phone: "", invitedBy: null, ministry: null, status: "pending", createdAt: new Date(Date.now() - 26 * 3600e3).toISOString() },
  ],
  // joinToken → id do pedido
  tokens: new Map([["join-seed", "jr3"]]),
};
join.requests.push({ id: "jr3", name: "Pessoa Pendente", email: "pendente@servos.dev", phone: "", invitedBy: "ramon", ministry: null, status: "pending", createdAt: new Date().toISOString() });
const fmtCode = (c) => `${c.slice(0, 3)}-${c.slice(3)}`;
const joinUrl = (token) => `https://servosapp.com/entrar?c=${join.church.code}${token ? `&i=${token}` : ""}`;
const inviteMsg = (url, ministry, person) =>
  `${person ? `Oi, ${person.split(" ")[0]}! ` : ""}Ramon convidou você para ${ministry ? `servir no ${ministries[ministry].name} da ${join.church.name}` : `fazer parte da equipe da ${join.church.name}`} no Servos, o app das escalas.\n\nBaixe o app e entre por este link:\n${url}\n\nSe pedir, o código da igreja é ${fmtCode(join.church.code)}.`;
const pendingFor = (uid) => join.requests.filter((r) => r.status === "pending" && (uid === "ramon" || r.invitedBy === uid));

function joinPublic(req, url, path, body, send) {
  if (path === "/join/lookup") {
    const code = (url.searchParams.get("c") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (OTHER_CHURCHES[code]) return send(200, { church: OTHER_CHURCHES[code], invite: null });
    if (code !== join.church.code) return send(404, { error: "Não encontramos uma igreja com esse código. Confira com quem convidou você.", code: "CODE_NOT_FOUND" });
    const token = url.searchParams.get("i");
    const inv = token ? join.invites[token] : null;
    if (token && !inv) return send(404, { error: "Este convite não é válido. Peça um novo a quem convidou você.", code: "INVITE_NOT_FOUND" });
    if (inv?.used) return send(410, { error: "Este convite já foi usado. Peça um novo a quem convidou.", code: "INVITE_USED" });
    return send(200, {
      church: join.church,
      invite: inv ? { kind: inv.kind, inviterName: people[inv.inviter].name, ministryName: inv.ministry ? ministries[inv.ministry].name : null, name: inv.name ?? null, email: inv.email ?? null } : null,
    });
  }
  if (path === "/join/signup" && req.method === "POST") {
    if (String(body.code).toUpperCase().replace(/[^A-Z0-9]/g, "") !== join.church.code) return send(404, { error: "Não encontramos uma igreja com esse código.", code: "CODE_NOT_FOUND" });
    if (body.idToken) body.email = body.idToken === "mock-social-novo" ? "nova.pessoa@icloud.com" : "lider@servos.dev";
    if (/ramon|lider/i.test(body.email)) return send(409, { error: "Este e-mail já tem uma conta no Servos. Entre com ele.", code: "EMAIL_TAKEN" });
    const inv = body.invite ? join.invites[body.invite] : null;
    if (inv?.kind === "person") {
      if (inv.email && inv.email !== body.email.toLowerCase()) return send(409, { error: "Este convite foi enviado para outro e-mail. Use o e-mail do convite ou peça um novo.", code: "INVITE_EMAIL_MISMATCH" });
      inv.used = true;
      const token = `mock-${Math.random().toString(36).slice(2)}`;
      state.sessions.set(token, "ramon");
      return send(200, { status: "approved", church: { name: join.church.name }, token, user: { id: "ramon", name: people.ramon.name, email: body.email, photo_url: null, avatar_color: people.ramon.avatarColor } });
    }
    const id = nid("jr");
    join.requests.push({ id, name: body.name, email: body.email, phone: body.phone, invitedBy: inv?.inviter ?? null, ministry: inv?.ministry ?? null, status: "pending", createdAt: new Date().toISOString() });
    const joinToken = `join-${id}`;
    join.tokens.set(joinToken, id);
    return send(200, { status: "pending", church: { name: join.church.name }, joinToken, name: body.name });
  }
  if (path === "/join/status") {
    const r = join.requests.find((x) => x.id === join.tokens.get(req.headers["x-servos-join"]));
    if (!r) return send(401, { error: "Cadastro não encontrado. Entre de novo.", code: "INVALID_JOIN_TOKEN" });
    const church = { name: join.church.name };
    if (r.status === "rejected") return send(200, { status: "rejected", church, message: "Seu pedido para entrar nesta igreja não foi aprovado. Fale com a liderança." });
    if (r.status === "approved") {
      const token = `mock-${Math.random().toString(36).slice(2)}`;
      state.sessions.set(token, "ramon");
      return send(200, { status: "approved", church, token, user: { id: "ramon", name: people.ramon.name, email: r.email, photo_url: null, avatar_color: people.ramon.avatarColor } });
    }
    return send(200, { status: "pending", church, name: r.name, invitedByName: r.invitedBy ? people[r.invitedBy].name : null, createdAt: r.createdAt });
  }
  return false;
}

function joinLeader(req, url, path, body, uid, send) {
  let m;
  if (path === "/mobile/join/invite" && req.method === "GET") {
    const ministry = url.searchParams.get("ministryId");
    const token = ministry ? `lnk-${uid}-${ministry}` : `lnk-${uid}`;
    join.invites[token] ||= { kind: "link", inviter: uid, ministry };
    const u = joinUrl(token);
    return send(200, {
      church: { name: join.church.name }, ministry: ministry ? { id: ministry, name: ministries[ministry].name } : null,
      code: join.church.code, codeFormatted: fmtCode(join.church.code), url: u, message: inviteMsg(u, ministry), canRegenerateCode: uid === "ramon",
    });
  }
  if (path === "/mobile/join/invite" && req.method === "POST") {
    if (!body.name || body.name.trim().length < 2) return send(400, { error: "Informe o nome da pessoa." });
    const token = nid("p");
    join.invites[token] = { kind: "person", inviter: uid, ministry: body.ministryId || null, name: body.name.trim(), email: body.email ? body.email.toLowerCase() : null };
    const u = joinUrl(token);
    return send(200, { url: u, code: join.church.code, expiresAt: new Date(Date.now() + 14 * 86400e3).toISOString(), message: inviteMsg(u, body.ministryId, body.name) });
  }
  if (path === "/mobile/join/code") {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    join.church.code = Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join("");
    return send(200, { code: join.church.code, codeFormatted: fmtCode(join.church.code) });
  }
  if (path === "/mobile/join/requests") {
    return send(200, {
      items: pendingFor(uid).map((r) => ({ id: r.id, userId: r.id, name: r.name, email: r.email, phone: r.phone, createdAt: r.createdAt, invitedByName: r.invitedBy ? people[r.invitedBy].name : null, ministryName: r.ministry ? ministries[r.ministry].name : null })),
    });
  }
  if ((m = /^\/mobile\/join\/requests\/([^/]+)$/.exec(path))) {
    const r = join.requests.find((x) => x.id === m[1]);
    if (!r) return send(404, { error: "Pedido não encontrado.", code: "NOT_FOUND" });
    if (r.status !== "pending") return send(409, { error: "Este pedido já foi decidido por outra pessoa.", code: "ALREADY_DECIDED" });
    r.status = body.decision === "approve" ? "approved" : "rejected";
    return send(200, { status: r.status });
  }
  return false;
}
unavailability.pedro.push({ id: "u-pedro", date: sunday, endDate: null, allDay: true, startTime: null, endTime: null, reason: "Viagem", source: "user" });
const nid = (p) => `${p}${++seq}`;

function card(s, m) {
  return {
    assignmentId: m.id, scheduleId: s.id, status: s.status === "CANCELLED" ? "CANCELLED" : m.status, scheduleStatus: s.status,
    needsResponse: m.status === "PENDING" && s.status === "PUBLISHED", eventName: s.eventName, ministry: s.ministry,
    functionName: m.fn, date: s.date, time: s.time, arrivalTime: s.arrivalTime, location: s.location, reconfirmRequested: Boolean(m.reconfirm),
  };
}

function coverage(s) {
  const byFunction = s.slots.map(({ fn, n }) => {
    const ms = s.members.filter((m) => m.fn === fn);
    const confirmed = ms.filter((m) => m.status === "ACCEPTED").length;
    const pending = ms.filter((m) => m.status === "PENDING").length;
    const filled = Math.min(confirmed, n);
    return { functionName: fn, needed: n, filled, pending, open: Math.max(0, n - filled - pending) };
  });
  const total = byFunction.reduce((a, f) => a + f.needed, 0);
  const filled = byFunction.reduce((a, f) => a + f.filled, 0);
  const pending = byFunction.reduce((a, f) => a + f.pending, 0);
  return { totalSlots: total, filledSlots: filled, openSlots: Math.max(0, total - filled - pending), byFunction };
}

function attention(s) {
  const items = [];
  const unresolved = {};
  for (const m of s.members) {
    if (m.status !== "DECLINED" && m.status !== "REPLACEMENT_PENDING") continue;
    unresolved[m.fn] = (unresolved[m.fn] || 0) + 1;
    items.push({ kind: m.status === "DECLINED" ? "declined" : "replacement_requested", assignmentId: m.id, userId: m.user, userName: people[m.user].name.split(" ")[0], functionName: m.fn });
  }
  for (const f of coverage(s).byFunction) {
    const count = Math.max(0, f.open - (unresolved[f.functionName] || 0));
    if (count > 0) items.push({ kind: "open_slots", functionName: f.functionName, count });
  }
  return items;
}

function overview(userId) {
  const mine = state.schedules.flatMap((s) => s.members.filter((m) => m.user === userId).map((m) => card(s, m)));
  const today = iso(0);
  const upcoming = mine.filter((c) => c.date >= today && c.scheduleStatus !== "COMPLETED").sort((a, b) => a.date.localeCompare(b.date));
  const serving = upcoming.filter((c) => c.scheduleStatus === "PUBLISHED" && ["PENDING", "ACCEPTED"].includes(c.status));
  const next = serving[0] ?? null;
  const rest = upcoming.filter((c) => c !== next);
  const led = [PROD, REC].filter((m) => leadersOf(m).includes(userId));
  const leader = led.length
    ? {
        ministries: led.map((m) => {
          const s = state.schedules.filter((x) => x.ministry.id === m.id && x.date >= today && x.status === "PUBLISHED").sort((a, b) => a.date.localeCompare(b.date))[0];
          if (!s) return { ministry: m, nextSchedule: null };
          const cov = coverage(s);
          const att = attention(s);
          return {
            ministry: m,
            nextSchedule: {
              scheduleId: s.id, date: s.date, time: s.time, eventName: s.eventName, status: s.status,
              totals: {
                people: s.members.filter((x) => ["PENDING", "ACCEPTED"].includes(x.status)).length,
                confirmed: s.members.filter((x) => x.status === "ACCEPTED").length,
                pending: s.members.filter((x) => x.status === "PENDING").length,
                declined: s.members.filter((x) => ["DECLINED", "REPLACEMENT_PENDING"].includes(x.status)).length,
                openSlots: cov.openSlots, totalSlots: cov.totalSlots,
              },
              attention: att, isIncomplete: att.length > 0,
            },
          };
        }),
        attention: led.flatMap((m) =>
          state.schedules.filter((x) => x.ministry.id === m.id && x.date >= today && x.status === "PUBLISHED")
            .flatMap((s) => attention(s).map((a) => ({ ...a, scheduleId: s.id, date: s.date, eventName: s.eventName, ministryName: m.name }))),
        ),
      }
    : null;
  const u = people[userId];
  return {
    user: { id: u.id, name: u.name, firstName: u.name.split(" ")[0], photoUrl: null, avatarColor: u.avatarColor },
    next, pending: rest.filter((c) => c.needsResponse), upcoming: rest.filter((c) => !c.needsResponse).slice(0, 10), leader,
    unreadNotifications: state.notifications.filter((n) => !n.read).length,
    access: { canInvite: true, canRegenerateCode: userId === "ramon", canCreateEvents: true, canSeeRepertoire: true, canManageSongs: true },
    joinRequests: pendingFor(userId).length,
    generatedAt: new Date().toISOString(),
  };
}

function detail(userId, id) {
  const s = state.schedules.find((x) => x.id === id);
  if (!s) return [404, { error: "Esta escala não existe mais.", code: "NOT_FOUND" }];
  const me = s.members.find((m) => m.user === userId);
  const canManage = leadersOf(s.ministry).includes(userId);
  return [200, {
    schedule: { id: s.id, status: s.status, date: s.date, time: s.time, endTime: "", arrivalTime: s.arrivalTime, location: s.location, instructions: s.instructions, version: s.version, event: { id: "e", name: s.eventName, description: "" }, ministry: s.ministry },
    me: me ? { assignmentId: me.id, status: me.status, functionName: me.fn, declineReason: me.reason || "", reconfirmRequested: Boolean(me.reconfirm) } : null,
    leaders: leadersOf(s.ministry).map((l) => ({ id: l, name: people[l].name, photoUrl: null, avatarColor: people[l].avatarColor, phone: people[l].phone ?? null })),
    team: s.members.filter((m) => m.status !== "REPLACED" && m.status !== "CANCELLED").map((m) => ({ assignmentId: m.id, userId: m.user, name: people[m.user].name, photoUrl: null, avatarColor: people[m.user].avatarColor, functionName: m.fn, status: m.status, isMe: m.user === userId })),
    coverage: coverage(s),
    attention: canManage ? attention(s) : null,
    permissions: { canManage, canRespond: Boolean(me) && s.status === "PUBLISHED" },
  }];
}

function findAssignment(id) {
  for (const s of state.schedules) {
    const m = s.members.find((x) => x.id === id);
    if (m) return { s, m };
  }
  return null;
}


// ── P1 ─────────────────────────────────────────────────────────────────────
function scheduleById(id) { return state.schedules.find((x) => x.id === id); }
function daysAgoServed(uid, ministryId) {
  const past = state.schedules.filter((x) => x.ministry.id === ministryId && x.date < iso(0)).flatMap((x) => x.members.filter((m) => m.user === uid && m.status === "ACCEPTED").map(() => x.date));
  if (!past.length) return uid === "joao" ? 21 : uid === "lucas" ? 14 : null;
  const last = past.sort().at(-1);
  return Math.round((Date.parse(iso(0)) - Date.parse(last)) / 86400000);
}
function candidates(s, fn, replacing) {
  const leaving = s.members.find((m) => m.id === replacing)?.user;
  const assigned = new Set(s.members.filter((m) => ["PENDING", "ACCEPTED"].includes(m.status)).map((m) => m.user));
  const list = Object.entries(memberships[s.ministry.id] || {})
    .filter(([uid]) => !assigned.has(uid) && uid !== leaving)
    .map(([uid, fns]) => {
      const flags = [];
      const un = (unavailability[uid] || []).find((u) => u.date <= s.date && (u.endDate || u.date) >= s.date);
      if (un) flags.push({ kind: "unavailable", reason: un.reason });
      const clash = state.schedules.find((o) => o.id !== s.id && o.date === s.date && o.status !== "CANCELLED" && o.members.some((m) => m.user === uid && ["PENDING", "ACCEPTED"].includes(m.status)));
      if (clash) flags.push({ kind: "conflict", scheduleId: clash.id, ministryName: clash.ministry.name, eventName: clash.eventName, date: clash.date, time: clash.time });
      const has = !fn || fns.some((f) => f.toLowerCase() === fn.toLowerCase());
      if (!has) flags.push({ kind: "no_function" });
      return { userId: uid, name: people[uid].name, photoUrl: null, avatarColor: people[uid].avatarColor, hasFunction: has, flags, lastServedDaysAgo: daysAgoServed(uid, s.ministry.id) };
    });
  const rest = (c) => (c.lastServedDaysAgo === null ? 1e9 : c.lastServedDaysAgo);
  return {
    functionName: fn,
    recommended: list.filter((c) => !c.flags.length).sort((a, b) => rest(b) - rest(a)),
    others: list.filter((c) => c.flags.length).sort((a, b) => Number(b.hasFunction) - Number(a.hasFunction)),
  };
}
function ministryDetail(uid, id) {
  const m = ministries[id];
  if (!m) return [404, { error: "Ministério não encontrado.", code: "NOT_FOUND" }];
  const canManage = leadersOf(m).includes(uid);
  const team = Object.entries(memberships[id]).map(([u, fns]) => ({
    membershipId: `${id}-${u}`, userId: u, name: people[u].name, photoUrl: null, avatarColor: people[u].avatarColor,
    role: leadersOf(m).includes(u) ? "LEADER" : "MEMBER", functions: fns, active: u !== "davi", isMe: u === uid,
  }));
  const today = iso(0);
  return [200, {
    ministry: { ...m, description: id === "prod" ? "Transmissão, fotografia e direção dos cultos." : "" },
    myRole: leadersOf(m).includes(uid) ? "LEADER" : "MEMBER",
    permissions: { canManage },
    functions: functionsOf[id].filter((f) => canManage || f.status === "active").map((f) => ({ ...f, memberCount: team.filter((t) => t.functions.includes(f.name)).length })),
    team,
    upcoming: canManage ? state.schedules.filter((x) => x.ministry.id === id && x.date >= today && x.status !== "CANCELLED").map((x) => {
      const c = coverage(x);
      return { scheduleId: x.id, date: x.date, time: x.time, eventName: x.eventName, status: x.status, filledSlots: c.filledSlots, totalSlots: c.totalSlots, openSlots: c.openSlots, pending: x.members.filter((y) => y.status === "PENDING").length };
    }) : [],
    recent: canManage ? state.schedules.filter((x) => x.ministry.id === id && x.date < today).map((x) => ({ scheduleId: x.id, date: x.date, time: x.time, eventName: x.eventName })) : [],
    templates: canManage ? templates[id].filter((t) => !t.archived) : [],
  }];
}
async function p1(req, url, path, body, uid, send) {
  let m;
  if (path === "/mobile/unavailability") {
    const list = (unavailability[uid] ||= []);
    if (req.method === "POST") {
      if (!body.date) return send(400, { error: "Escolha a data." });
      list.push({ id: nid("u"), date: body.date, endDate: body.endDate || null, allDay: body.allDay !== false, startTime: body.startTime || null, endTime: body.endTime || null, reason: body.reason || "", source: "user" });
    }
    if (req.method === "DELETE") unavailability[uid] = list.filter((u) => u.id !== url.searchParams.get("id"));
    return send(200, { items: unavailability[uid].sort((a, b) => a.date.localeCompare(b.date)) });
  }
  if (path === "/mobile/notification-preferences") {
    if (req.method === "PUT") Object.assign(prefs, { ...body, leader: { ...prefs.leader, ...(body.leader || {}) } });
    return send(200, prefs);
  }
  if ((m = /^\/mobile\/schedules\/([^/]+)\/candidates$/.exec(path))) {
    return send(200, candidates(scheduleById(m[1]), url.searchParams.get("function") || "", url.searchParams.get("replacing")));
  }
  if ((m = /^\/mobile\/schedules\/([^/]+)\/assignments$/.exec(path))) {
    const s = scheduleById(m[1]);
    if (req.method === "DELETE") {
      const a = s.members.find((x) => x.id === url.searchParams.get("assignmentId"));
      if (s.status === "DRAFT") s.members = s.members.filter((x) => x !== a); else a.status = "CANCELLED";
      return send(200, { success: true, mode: s.status === "DRAFT" ? "deleted" : "cancelled" });
    }
    const c = candidates(s, body.functionName || "", body.replacingAssignmentId);
    const cand = [...c.recommended, ...c.others].find((x) => x.userId === body.userId);
    const blocking = (cand?.flags || []).filter((f) => f.kind !== "no_function");
    if (blocking.length && !body.override) return send(409, { error: "Essa pessoa tem um aviso para esta data.", code: "NEEDS_OVERRIDE", flags: blocking });
    const fn = body.functionName || (memberships[s.ministry.id][body.userId] || [])[0] || "";
    if (body.replacingAssignmentId) {
      const orig = s.members.find((x) => x.id === body.replacingAssignmentId);
      orig.status = "REPLACED";
      s.members.push({ id: nid("a"), user: body.userId, fn: orig.fn, status: "PENDING" });
    } else {
      s.members.push({ id: nid("a"), user: body.userId, fn, status: "PENDING" });
    }
    s.version++;
    return send(200, { success: true, assignmentId: `a${seq}`, overridden: blocking.map((f) => f.kind) });
  }
  if ((m = /^\/mobile\/schedules\/([^/]+)\/cancel$/.exec(path))) {
    const s = scheduleById(m[1]);
    s.status = "CANCELLED";
    return send(200, { success: true, notified: s.members.filter((x) => ["PENDING", "ACCEPTED"].includes(x.status)).length, alreadyCancelled: false });
  }
  if ((m = /^\/mobile\/schedules\/([^/]+)$/.exec(path)) && req.method === "PATCH") {
    const s = scheduleById(m[1]);
    if (body.expectedVersion !== s.version) return send(409, { error: "Esta escala foi alterada por outra pessoa.", code: "VERSION_CONFLICT" });
    const changes = [];
    if (body.time !== undefined && body.time !== s.time) changes.push({ field: "time", from: s.time, to: body.time });
    if (body.arrivalTime !== undefined && body.arrivalTime !== s.arrivalTime) changes.push({ field: "arrival_time", from: s.arrivalTime, to: body.arrivalTime });
    if (body.location !== undefined && body.location !== s.location) changes.push({ field: "location", from: s.location, to: body.location });
    const confirmed = changes.length ? s.members.filter((x) => x.status === "ACCEPTED") : [];
    if ((body.criticalChange || "check") === "check" && confirmed.length) {
      return send(409, { error: "Esta alteração afeta pessoas que já confirmaram presença.", code: "CRITICAL_CHANGE", confirmedCount: confirmed.length, changes });
    }
    if (body.time !== undefined) s.time = body.time;
    if (body.arrivalTime !== undefined) s.arrivalTime = body.arrivalTime;
    if (body.location !== undefined) s.location = body.location;
    if (body.instructions !== undefined) s.instructions = body.instructions;
    confirmed.forEach((x) => { x.status = "PENDING"; x.reconfirm = true; });
    if (body.publish) s.status = "PUBLISHED";
    s.version++;
    return send(200, { success: true, version: s.version, reconfirmationRequested: confirmed.length, published: s.status === "PUBLISHED" });
  }
  if (path === "/mobile/schedules" && req.method === "POST") {
    const exists = state.schedules.find((x) => x.ministry.id === body.ministryId && x.date === body.date && x.eventName === occurrenceName(body.eventId) && x.status !== "CANCELLED");
    if (exists) return send(409, { error: "Já existe uma escala deste ministério para este evento nesta data.", code: "ALREADY_EXISTS", scheduleId: exists.id });
    let slots = functionsOf[body.ministryId].filter((f) => f.status === "active").map((f) => ({ fn: f.name, n: f.defaultQuantity }));
    let members = [];
    if (body.source.kind === "template") slots = templates[body.ministryId].find((t) => t.id === body.source.templateId).positions.map((p) => ({ fn: p.function_name, n: p.quantity }));
    if (body.source.kind === "duplicate") {
      const src = scheduleById(body.source.scheduleId);
      slots = src.slots.map((x) => ({ ...x }));
      if (body.source.withPeople) members = src.members.filter((x) => x.status === "ACCEPTED").map((x) => ({ id: nid("a"), user: x.user, fn: x.fn, status: "PENDING" }));
    }
    const id = nid("s");
    state.schedules.push({ id, ministry: ministries[body.ministryId], eventName: occurrenceName(body.eventId), date: body.date, time: body.time || "18:00", arrivalTime: "17:30", location: "Templo principal", instructions: "", status: "DRAFT", version: 0, slots, members });
    return send(200, { success: true, scheduleId: id, skipped: [] });
  }
  if ((m = /^\/mobile\/ministries\/([^/]+)$/.exec(path))) return send(...ministryDetail(uid, m[1]));
  if ((m = /^\/mobile\/ministries\/([^/]+)\/members$/.exec(path))) {
    const id = m[1];
    const mm = memberships[id];
    const lead = leadership[id];
    if (body.action === "add") mm[body.userId] = body.functionNames;
    if (body.action === "set_functions") mm[body.userId] = body.functionNames;
    if (body.action === "promote") lead.push(body.userId);
    if (body.action === "demote") {
      if (lead.length === 1) return send(409, { error: "Este ministério precisa ter pelo menos um líder. Adicione outro líder antes de remover este líder.", code: "LAST_LEADER" });
      leadership[id] = lead.filter((x) => x !== body.userId);
    }
    if (body.action === "remove") {
      const future = state.schedules.filter((x) => x.ministry.id === id && x.date >= iso(0) && x.status !== "CANCELLED" && x.members.some((y) => y.user === body.userId && ["PENDING", "ACCEPTED"].includes(y.status)));
      if (future.length && !body.reviewSchedules) return send(409, { error: `${people[body.userId].name.split(" ")[0]} possui ${future.length} ${future.length === 1 ? "escala futura" : "escalas futuras"} neste ministério.`, code: "HAS_FUTURE_SCHEDULES" });
      future.forEach((x) => x.members.forEach((y) => { if (y.user === body.userId) y.status = "CANCELLED"; }));
      delete mm[body.userId];
      return send(200, { success: true, cancelledAssignments: future.length });
    }
    return send(200, { success: true });
  }
  if ((m = /^\/mobile\/ministries\/([^/]+)\/functions$/.exec(path))) {
    const list = functionsOf[m[1]];
    if (body.action === "create") {
      if (list.some((f) => f.name.toLowerCase() === String(body.name).trim().toLowerCase())) return send(400, { error: "Já existe uma função com esse nome." });
      list.push({ id: nid("f"), name: String(body.name).trim(), defaultQuantity: body.defaultQuantity || 1, status: "active" });
    } else {
      const f = list.find((x) => x.id === body.functionId);
      if (body.action === "update") Object.assign(f, { name: body.name ?? f.name, defaultQuantity: body.defaultQuantity ?? f.defaultQuantity });
      if (body.action === "deactivate") f.status = "inactive";
      if (body.action === "activate") f.status = "active";
    }
    return send(200, { success: true });
  }
  if ((m = /^\/mobile\/ministries\/([^/]+)\/templates$/.exec(path))) {
    if (body.action === "create") {
      const src = scheduleById(body.fromScheduleId);
      templates[m[1]].push({ id: nid("t"), name: body.name, positions: src.slots.map((x) => ({ function_name: x.fn, quantity: x.n })), arrivalOffsetMin: 30 });
    }
    return send(200, { success: true, templateId: `t${seq}` });
  }
  if ((m = /^\/mobile\/ministries\/([^/]+)\/occurrences$/.exec(path))) {
    const items = [];
    for (let w = 0; w < 8; w++) {
      const sun = iso(((7 - new Date(iso(0)).getUTCDay()) % 7 || 7) + w * 7 - 7 + 7);
      items.push({ eventId: "ev-dom", eventName: "Culto das 18h", date: sun, time: "18:00", location: "Templo principal" });
    }
    return send(200, {
      items: items.map((o) => ({ ...o, existingScheduleId: state.schedules.find((x) => x.ministry.id === m[1] && x.date === o.date && x.eventName === o.eventName && x.status !== "CANCELLED")?.id ?? null })),
    });
  }
  if (path === "/mobile/people") {
    const id = url.searchParams.get("ministryId");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    return send(200, { items: Object.values(people).filter((p) => !memberships[id][p.id] && p.name.toLowerCase().includes(q)).map((p) => ({ id: p.id, name: p.name, photoUrl: null, avatarColor: p.avatarColor })) });
  }
  return false;
}
function occurrenceName(eventId) { return eventId === "ev-dom" ? "Culto das 18h" : "Evento"; }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  // Upload de foto chega como multipart: o mock não lê o arquivo, só aceita.
  let body = {};
  try {
    body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString() || "{}") : {};
  } catch {
    // Multipart: guarda o texto bruto para o mock achar campos e o nome do arquivo.
    const raw = Buffer.concat(chunks);
    body = { __raw: raw.toString("latin1").slice(0, 4000), __size: raw.length };
  }
  const send = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  await new Promise((r) => setTimeout(r, 350)); // latência realista (skeletons)
  const path = url.pathname.replace(/^\/api/, "");
  // Sessões sobrevivem ao reinício do mock (só QA): qualquer "mock-…" é o Ramon.
  const authHeader = String(req.headers["x-servos-auth"] || "");
  const userId = state.sessions.get(authHeader) ?? (authHeader.startsWith("mock-") ? "ramon" : undefined);

  if (path.startsWith("/join/")) {
    const handled = joinPublic(req, url, path, body, send);
    if (handled !== false) return;
  }
  // Entrar com código por e-mail: no mock o código é sempre 123456.
  if (path === "/auth/email-code") return send(200, { success: true });
  if (path === "/auth/email-code/verify") {
    if (String(body.code).replace(/\D/g, "") !== "123456") return send(400, { error: "Código incorreto. Você tem mais 4 tentativas.", code: "CODE_WRONG" });
    const token = `mock-${Math.random().toString(36).slice(2)}`;
    state.sessions.set(token, "ramon");
    return send(200, { success: true, token, user: { id: "ramon", name: people.ramon.name, email: body.email, photo_url: me.photoUrl, avatar_color: people.ramon.avatarColor } });
  }
  if (path === "/auth/login" && req.method === "POST") {
    if (body.password !== "servos") return send(401, { error: "E-mail ou senha incorretos." });
    // Cadastro ainda em análise (pendente@servos.dev).
    const waiting = join.requests.find((r) => r.email === String(body.email).toLowerCase() && r.status !== "approved");
    if (waiting) {
      if (waiting.status === "rejected") return send(403, { error: "Seu pedido para entrar nesta igreja não foi aprovado. Fale com a liderança.", code: "JOIN_REJECTED" });
      const joinToken = `join-${waiting.id}`;
      join.tokens.set(joinToken, waiting.id);
      return send(403, { error: "Seu cadastro está aguardando aprovação da liderança da igreja.", code: "PENDING_APPROVAL", joinToken });
    }
    const uid = "ramon";
    const token = `mock-${Math.random().toString(36).slice(2)}`;
    state.sessions.set(token, uid);
    return send(200, { success: true, token, user: { id: uid, name: people[uid].name, email: body.email, photo_url: null, avatar_color: people[uid].avatarColor } });
  }
  // Google/Apple: o mock não confere o token. "mock-social-novo" = conta sem cadastro.
  if (path === "/auth/social" && req.method === "POST") {
    if (body.idToken === "mock-social-novo") return send(404, { error: "Não encontramos uma conta no Servos com esse e-mail. Primeira vez? Entre com o código da igreja.", code: "NO_ACCOUNT" });
    const token = `mock-${Math.random().toString(36).slice(2)}`;
    state.sessions.set(token, "ramon");
    return send(200, { success: true, token, user: { id: "ramon", church_id: "igreja-central", name: people.ramon.name, email: "lider@servos.dev", photo_url: me.photoUrl, avatar_color: people.ramon.avatarColor } });
  }
  if (path === "/auth/forgot-password") return send(200, { success: true });
  if (path === "/auth/logout") return send(200, { success: true });
  if (!userId) return send(401, { error: "Sessao expirada. Entre novamente." });

  if (path === "/auth/session") return send(200, { authenticated: true, token: req.headers["x-servos-auth"], user: { id: userId, name: people[userId].name, email: "lider@servos.dev", photo_url: null, avatar_color: people[userId].avatarColor, church_id: extras.sessionChurch.get(authHeader) || "igreja-central", role: "admin", derived: WEB_DERIVED } });
  if (extraRoutes(req, url, path, body, userId, send) !== false) return;
  if (path.startsWith("/mobile/") && !/^\/mobile\/(me|analytics)$|\/history$|\/report$/.test(path) && path !== "/mobile/overview" && path !== "/mobile/schedules" && !/^\/mobile\/schedules\/[^/]+$/.test(path) || (/^\/mobile\/schedules\/[^/]+$/.test(path) && req.method === "PATCH") || (path === "/mobile/schedules" && req.method === "POST")) {
    const handled = path.startsWith("/mobile/join/") ? joinLeader(req, url, path, body, userId, send) : await p1(req, url, path, body, userId, send);
    if (handled !== false) return;
  }
  if (path === "/mobile/overview") return send(200, overview(userId));
  if (path === "/mobile/schedules") {
    const today = iso(0);
    const mine = state.schedules.flatMap((s) => s.members.filter((m) => m.user === userId).map((m) => card(s, m)));
    const month = url.searchParams.get("month");
    if (month) return send(200, { scope: "month", month, items: mine.filter((c) => c.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)), nextCursor: null });
    const scope = url.searchParams.get("scope") === "past" ? "past" : "upcoming";
    const items = scope === "past" ? mine.filter((c) => c.date < today).sort((a, b) => b.date.localeCompare(a.date)) : mine.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    return send(200, { scope, items, nextCursor: null });
  }
  const dm = /^\/mobile\/schedules\/([^/]+)$/.exec(path);
  if (dm) return send(...detail(userId, decodeURIComponent(dm[1])));
  if (path === "/mobile/ministries") {
    return send(200, {
      items: [
        { ministry: { ...PROD, description: "Transmissão, fotografia e direção dos cultos." }, role: "LEADER", functions: ["Diretor", "Câmera", "Streaming"], leaders: [people.ramon, people.fer].map((p) => ({ id: p.id, name: p.name, photoUrl: null, avatarColor: p.avatarColor })), memberCount: 12 },
        { ministry: { ...REC, description: "" }, role: "MEMBER", functions: ["Recepcionista"], leaders: [{ id: "lucas", name: people.lucas.name, photoUrl: null, avatarColor: people.lucas.avatarColor }], memberCount: 8 },
      ],
    });
  }
  if (path === "/schedule-members" && req.method === "PATCH") {
    const found = findAssignment(body.scheduleMemberId);
    if (!found) return send(404, { error: "Participacao na escala nao encontrada." });
    if (found.s.status === "CANCELLED") return send(409, { error: "Esta escala foi cancelada.", code: "SCHEDULE_CANCELLED" });
    if (body.action === "request-replacement") {
      found.m.status = "REPLACEMENT_PENDING";
      found.m.reason = body.reason || "";
      return send(200, { success: true, status: "REPLACEMENT_PENDING", changed: true });
    }
    found.m.status = body.status === "confirmed" ? "ACCEPTED" : "DECLINED";
    found.m.reason = body.declineReason || "";
    found.m.reconfirm = false;
    return send(200, { success: true, changed: true });
  }
  if (path === "/mobile/me" && req.method === "DELETE") {
    if (body.confirm !== "EXCLUIR") return send(400, { error: "Confirme a exclusão digitando EXCLUIR." });
    state.sessions.delete(authHeader);
    return send(200, { success: true });
  }
  if (path === "/mobile/me") return send(200, { ...me, name: people.ramon.name });
  if (path === "/profile/update") {
    if (body.name) people.ramon.name = body.name;
    me.phone = body.phone ?? me.phone;
    if (body.birthDate !== undefined) me.birthDate = body.birthDate;
    return send(200, { success: true });
  }
  if (path === "/profile/upload-photo") {
    me.photoUrl = `https://i.pravatar.cc/300?u=ramon-${Date.now()}`;
    return send(200, { url: me.photoUrl });
  }
  if (path === "/profile/change-password") {
    if (body.currentPassword !== "servos") return send(400, { error: "Senha atual incorreta." });
    return send(200, { success: true });
  }
  if (path === "/mobile/analytics") {
    analytics.push(...(body.events || []));
    return send(202, { accepted: (body.events || []).length });
  }
  let hm;
  if ((hm = /^\/mobile\/schedules\/([^/]+)\/history$/.exec(path))) return send(200, { items: historyFor(hm[1]) });
  if ((hm = /^\/mobile\/ministries\/([^/]+)\/report$/.exec(path))) return send(200, reportFor(hm[1], Number(url.searchParams.get("days")) || 90));
  if (path === "/notifications/list") return send(200, { notifications: state.notifications, unreadCount: state.notifications.filter((n) => !n.read).length });
  if (path === "/notifications/read") {
    for (const n of state.notifications) if (body.notificationIds?.includes(n.id)) n.read = true;
    return send(200, { success: true });
  }
  if (path === "/notifications/register-push") return send(200, { success: true });
  return send(404, { error: "Rota não existe no mock." });
});

server.listen(PORT, () => console.log(`Mock API do Servos em http://localhost:${PORT}/api (login: qualquer e-mail, senha "servos")`));

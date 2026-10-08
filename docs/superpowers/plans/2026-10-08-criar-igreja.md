# Criar igreja pelo app — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quem baixa o Servos numa igreja que ainda não usa o app consegue criar a igreja e a própria conta de administrador, confirmando o e-mail com um código, e sai com o código da igreja para convidar as próximas pessoas.

**Architecture:** O servidor já tem `POST /api/auth/register` (cria igreja + admin + cultos semanais + código da igreja). Hoje ele só aceita o header secreto interno (Decisão 6, de 2026-09-22). Esta mudança abre um segundo caminho: um código de 6 dígitos mandado ao e-mail por `POST /api/auth/register/code`, reaproveitando o mecanismo do "entrar com código" (`lib/auth/email-code.ts`, rate limit no Firestore, Resend). No app entra a tela `criar-igreja` (4 passos), ligada na tela de login e na última tela de boas-vindas.

**Tech Stack:** Servidor: Next.js (rotas em `server/src/app/api`), Firestore via shim `getFirebaseAdminClient`/`adminDb`, Vitest. App: Expo SDK 57, Expo Router, Jest (jest-expo).

**Spec (decisões do usuário em 2026-10-08):** a igreja fica ativa na hora (sem aprovação da equipe Servos); a confirmação do e-mail é a única proteção extra, junto com o rate limit que já existe.

## Global Constraints

- Texto de interface em português do Brasil, no tom do app ("você", frases curtas).
- Senha mínima: 6 caracteres (Decisão 8).
- O header `x-servos-registration-secret` continua funcionando como antes (uso interno).
- Sem código válido e sem segredo, `/api/auth/register` continua respondendo 404, sem tocar em Firestore nem em Firebase Auth.
- Coleção dos códigos de cadastro: `signupCodes`, doc id derivado por sha256 (padrão de `loginCodes`), nunca `where()`.
- Servidor: trabalhar numa worktree nova a partir de `origin/main` (a worktree principal está em `ui/nova-interface` com mudanças locais). Publicar = merge em `main`, que a Vercel publica sozinha; isso só com a confirmação do usuário.
- App: só JavaScript (nenhum módulo nativo novo), então pode ir por `eas update` para o build 6. Antes, conferir o fingerprint (ver memória do iCloud e do eas.json).

---

### Task 1: Servidor — código de cadastro por e-mail

**Files:**
- Modify: `server/src/lib/auth/email-code.ts` (nova função `signupCodeDocId`)
- Modify: `server/src/lib/email/send.ts` (nova função `sendChurchSignupCodeEmail`, ao lado de `sendLoginCodeEmail`)
- Create: `server/src/app/api/auth/register/code/route.ts`
- Test: `server/src/app/api/auth/register/code/route.test.ts`

**Interfaces:**
- Produces: `signupCodeDocId(email: string): string`; `sendChurchSignupCodeEmail({ to, code }: { to: string; code: string })`; `POST /api/auth/register/code` com corpo `{ email }` → `200 { success: true }`, `400` (e-mail inválido), `409 { code: "EMAIL_IN_USE" }`, `429`.

- [ ] **Step 1: Teste da rota (falha)**

```ts
// server/src/app/api/auth/register/code/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const docGet = vi.fn();
const docSet = vi.fn();
const sendMock = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getFirebaseAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) }),
  adminDb: { collection: () => ({ doc: () => ({ get: docGet, set: docSet }) }) },
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  extractClientIp: () => "1.2.3.4",
  checkForgotPasswordRateLimit: vi.fn(async () => ({ blocked: false, retryAfterSeconds: 0 })),
  recordForgotPasswordAttempt: vi.fn(async () => undefined),
}));
vi.mock("@/lib/email/send", () => ({ sendChurchSignupCodeEmail: (...a: unknown[]) => sendMock(...a) }));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/auth/register/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/auth/register/code", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    docGet.mockReset();
    docSet.mockReset();
    sendMock.mockReset();
  });

  it("e-mail inválido: 400", async () => {
    expect((await POST(req({ email: "x" }))).status).toBe(400);
  });

  it("e-mail que já tem conta: 409 EMAIL_IN_USE, sem mandar código", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "u1" } });
    const res = await POST(req({ email: "Ana@Igreja.com" }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("EMAIL_IN_USE");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("e-mail novo: grava o código e manda o e-mail", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    docGet.mockResolvedValue({ exists: false });
    const res = await POST(req({ email: "ana@igreja.com" }));
    expect(res.status).toBe(200);
    expect(docSet).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "ana@igreja.com", code: expect.stringMatching(/^\d{6}$/) }));
  });

  it("pedido repetido antes de 45 s: não manda outro e-mail", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    docGet.mockResolvedValue({ exists: true, data: () => ({ created_at: Date.now(), hash: "h", salt: "s", expires_at: Date.now() + 1000, attempts: 0 }) });
    const res = await POST(req({ email: "ana@igreja.com" }));
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `cd server && npx vitest run src/app/api/auth/register/code` → FALHA (rota não existe).

- [ ] **Step 3: Implementar**

Em `email-code.ts`, logo após `codeDocId`:

```ts
/** Código para criar igreja pelo app: mesmo formato, coleção `signupCodes`. */
export function signupCodeDocId(email: string): string {
  return createHash("sha256").update(`signup-code:${normalizeLoginEmail(email)}`).digest("hex");
}
```

Em `send.ts`, depois de `sendLoginCodeEmail` (mesmo HTML, outro texto):

```ts
export async function sendChurchSignupCodeEmail({ to, code }: { to: string; code: string }) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const contentHtml = `
    <div style="text-align:center;margin:8px 0 4px;">
      <div style="display:inline-block;padding:18px 28px;border-radius:18px;background:#F9F6F3;border:1px solid #eadfce;font-size:36px;letter-spacing:.18em;font-weight:800;color:#1B1726;font-variant-numeric:tabular-nums;">${spaced}</div>
    </div>`;
  const html = renderServosEmail({
    preheader: `Seu código para criar a igreja: ${spaced}`,
    eyebrow: "Servos · Cadastro",
    title: "Confirme seu e-mail",
    intro: "Digite este código no app para criar sua igreja no Servos. Ele vale por 10 minutos.",
    contentHtml,
    footnote: "Se você não pediu este código, pode ignorar este e-mail. Nada é criado sem ele.",
  });
  return sendEmail({
    to,
    subject: `${spaced} é o seu código para criar a igreja no Servos`,
    html,
    text: [`Seu código para criar a igreja no Servos: ${spaced}`, "Ele vale por 10 minutos.", "Se você não pediu, ignore este e-mail."].join("\n"),
  });
}
```

Rota `register/code/route.ts`:

```ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, getFirebaseAdminClient } from "@/lib/firebase-admin";
import { canResend, generateCode, newStoredCode, normalizeLoginEmail, signupCodeDocId, type StoredCode } from "@/lib/auth/email-code";
import { checkForgotPasswordRateLimit, extractClientIp, recordForgotPasswordAttempt } from "@/lib/auth/rate-limit";
import { sendChurchSignupCodeEmail } from "@/lib/email/send";

const bodySchema = z.object({ email: z.string().trim().email() });

// POST /api/auth/register/code — PÚBLICA. Primeiro passo de "criar igreja"
// no app: manda um código de 6 dígitos para confirmar o e-mail de quem vai
// ser o admin. Sem esse código, /api/auth/register continua 404.
export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    const email = normalizeLoginEmail(parsed.data.email);
    const ip = extractClientIp(req);

    const limit = await checkForgotPasswordRateLimit(email, ip);
    if (limit.blocked) {
      return NextResponse.json(
        { error: "Muitos pedidos de código. Aguarde alguns minutos e tente de novo." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    await recordForgotPasswordAttempt(email, ip);

    const { data: existing } = await getFirebaseAdminClient().from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Este e-mail já tem conta no Servos. Entre com ele e use \"Entrar em outra igreja\".", code: "EMAIL_IN_USE" },
        { status: 409 },
      );
    }

    const ref = adminDb.collection("signupCodes").doc(signupCodeDocId(email));
    const snap = await ref.get();
    const now = Date.now();
    if (canResend(snap.exists ? (snap.data() as StoredCode) : null, now)) {
      const code = generateCode();
      await ref.set(newStoredCode(code, now));
      try {
        await sendChurchSignupCodeEmail({ to: email, code });
      } catch (e) {
        console.error("auth/register/code: falha ao enviar o e-mail:", e);
        if (process.env.NODE_ENV !== "production") console.info(`[dev] código de cadastro de ${email}: ${code}`);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API auth/register/code error:", error);
    return NextResponse.json({ error: "Não foi possível enviar o código. Tente novamente." }, { status: 500 });
  }
}
```

- [ ] **Step 4:** `npx vitest run src/app/api/auth/register/code src/lib/auth/email-code` → PASSA.
- [ ] **Step 5:** commit `feat(auth): código por e-mail para criar igreja pelo app`.

### Task 2: Servidor — `/api/auth/register` aceita o código

**Files:**
- Modify: `server/src/app/api/auth/register/route.ts`
- Test: `server/src/app/api/auth/register/route.test.ts` (novos casos; os atuais continuam passando)
- Modify: `docs/product/DECISIONS_2026-09-22.md` (nota na linha da Decisão 6)

**Interfaces:**
- Consumes: `signupCodeDocId`, `checkCode`, `codeFailureMessage` (Task 1 e já existentes).
- Produces: corpo aceita `emailCode?: string`; resposta de sucesso ganha `churchCode: string | null` (além de `token`, `user`, `session`, `firebaseToken`).

- [ ] **Step 1: Testes novos (falham)** — acrescentar ao arquivo de teste existente. O mock de `@/lib/firebase-admin` passa a expor `adminDb` e o de rate limit:

```ts
const codeGet = vi.fn();
const codeUpdate = vi.fn();
const codeDelete = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getFirebaseAdminClient: () => ({ from: fromMock }),
  adminAuth: { createUser: (...a: unknown[]) => createUserMock(...a), createCustomToken: vi.fn() },
  adminDb: { collection: () => ({ doc: () => ({ get: codeGet, update: codeUpdate, delete: codeDelete }) }) },
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  extractClientIp: () => "1.2.3.4",
  checkLoginRateLimit: vi.fn(async () => ({ blocked: false, retryAfterSeconds: 0 })),
  recordLoginFailure: vi.fn(async () => undefined),
}));
import { newStoredCode } from "@/lib/auth/email-code";

const body = { name: "Ana Souza", email: "ana@igreja.com", password: "123456", churchName: "Igreja Vida", weeklyServices: [{ day: "0", time: "18:00" }] };

describe("POST /api/auth/register — código por e-mail", () => {
  beforeEach(() => {
    delete process.env.CHURCH_REGISTRATION_SECRET;
    codeGet.mockReset(); codeUpdate.mockReset(); codeDelete.mockReset(); fromMock.mockReset(); createUserMock.mockReset();
  });

  it("sem segredo e sem código: 404 (como antes)", async () => {
    expect((await POST(req({}, body))).status).toBe(404);
    expect(codeGet).not.toHaveBeenCalled();
  });

  it("código errado: 400 com a mensagem do código, sem criar nada", async () => {
    codeGet.mockResolvedValue({ exists: true, data: () => newStoredCode("123456", Date.now()) });
    const res = await POST(req({}, { ...body, emailCode: "000000" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("CODE_WRONG");
    expect(codeUpdate).toHaveBeenCalledWith({ attempts: 1 });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("código certo: passa do gate e apaga o código (aqui o Firestore falso para no 1º select)", async () => {
    codeGet.mockResolvedValue({ exists: true, data: () => newStoredCode("123456", Date.now()) });
    fromMock.mockImplementation(() => { throw new Error("parou no Firestore"); });
    const res = await POST(req({}, { ...body, emailCode: "123456" }));
    expect(res.status).toBe(500);
    expect(fromMock).toHaveBeenCalled();
    expect(codeDelete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `npx vitest run src/app/api/auth/register` → os novos FALHAM (rota ainda 404).

- [ ] **Step 3: Implementar.** No schema, `emailCode: z.string().trim().optional()`. Trocar o começo do `POST`:

```ts
export async function POST(req: Request) {
  const internal = registrationSecretMatches(req.headers.get(REGISTRATION_SECRET_HEADER));
  const raw = await req.json().catch(() => ({}));
  // Sem o segredo interno, só passa quem mandou o código do e-mail
  // (/api/auth/register/code). Sem nenhum dos dois: 404, como antes.
  if (!internal && !(raw && typeof raw.emailCode === "string" && raw.emailCode.trim())) return notFound();

  try {
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos para criar conta." }, { status: 400 });
    }
    const { name, email, phone, password, churchName, weeklyServices, emailCode } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    if (!internal) {
      const ip = extractClientIp(req);
      const limit = await checkLoginRateLimit(normalizedEmail, ip);
      if (limit.blocked) {
        return NextResponse.json(
          { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
          { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
        );
      }
      const ref = adminDb.collection("signupCodes").doc(signupCodeDocId(normalizedEmail));
      const snap = await ref.get();
      const stored = snap.exists ? (snap.data() as StoredCode) : null;
      const check = checkCode(stored, emailCode ?? "", Date.now());
      if (check.kind === "fail") {
        if (check.reason === "wrong" && stored) await ref.update({ attempts: stored.attempts + 1 });
        await recordLoginFailure(normalizedEmail, ip);
        return NextResponse.json({ error: codeFailureMessage(check), code: `CODE_${check.reason.toUpperCase()}` }, { status: 400 });
      }
      await ref.delete();
    }

    const db = getFirebaseAdminClient();
    // ... resto igual, usando normalizedEmail ...
```

Guardar o retorno do `ensureJoinCode` (`const churchCode = await ensureJoinCode(db, church).catch(... => null)`) e devolvê-lo: `NextResponse.json({ success: true, session, token, firebaseToken, user: clientUser, churchCode })`. Imports novos: `adminDb` de `@/lib/firebase-admin`; `checkCode, codeFailureMessage, signupCodeDocId, type StoredCode` de `@/lib/auth/email-code`; `checkLoginRateLimit, extractClientIp, recordLoginFailure` de `@/lib/auth/rate-limit`. Atualizar o comentário da Decisão 6 no topo da rota e acrescentar na tabela de `DECISIONS_2026-09-22.md`: "Revisto em 2026-10-08: também aceita o código de 6 dígitos mandado por `/api/auth/register/code` (criar igreja pelo app, ativa na hora)."

- [ ] **Step 4:** `npx vitest run src/app/api/auth` → todos PASSAM. Rodar também `npx tsc --noEmit -p .` e `npm run lint` no `server/`.
- [ ] **Step 5:** commit `feat(auth): criar igreja pelo app com código de e-mail (Decisão 6 revista)`.

### Task 3: App — regras do formulário (puras, testadas)

**Files:**
- Create: `src/features/church/signup.ts`
- Test: `src/features/church/signup.test.ts`

**Interfaces:**
- Produces: `type Service = { day: number; time: string }` (day 0–6, 0 = domingo; time "HH:MM"); `DEFAULT_SERVICES: Service[]`; `churchStepError(churchName: string, services: Service[]): string | null`; `personStepError(p: { name: string; email: string; password: string }): string | null`; `servicesPayload(services: Service[]): { day: string; time: string }[]` (ordena por dia e hora, remove repetidos); `WEEKDAYS: string[]` ("Dom"…"Sáb").

- [ ] **Step 1: Teste (falha)**

```ts
import { churchStepError, DEFAULT_SERVICES, personStepError, servicesPayload } from "./signup";

describe("criar igreja", () => {
  it("passo da igreja: nome e pelo menos um culto", () => {
    expect(churchStepError(" ", DEFAULT_SERVICES)).toBe("Informe o nome da igreja.");
    expect(churchStepError("Igreja Vida", [])).toBe("Adicione pelo menos um culto da semana.");
    expect(churchStepError("Igreja Vida", DEFAULT_SERVICES)).toBeNull();
  });

  it("passo da pessoa: nome e sobrenome, e-mail e senha de 6", () => {
    expect(personStepError({ name: "Ana", email: "a@b.co", password: "123456" })).toBe("Informe nome e sobrenome.");
    expect(personStepError({ name: "Ana Souza", email: "ab.co", password: "123456" })).toBe("Informe um e-mail válido.");
    expect(personStepError({ name: "Ana Souza", email: "a@b.co", password: "12345" })).toBe("A senha precisa ter pelo menos 6 caracteres.");
    expect(personStepError({ name: "Ana Souza", email: "a@b.co", password: "123456" })).toBeNull();
  });

  it("cultos para o servidor: dia como texto, ordenados, sem repetidos", () => {
    expect(servicesPayload([{ day: 3, time: "19:30" }, { day: 0, time: "18:00" }, { day: 0, time: "09:00" }, { day: 3, time: "19:30" }])).toEqual([
      { day: "0", time: "09:00" },
      { day: "0", time: "18:00" },
      { day: "3", time: "19:30" },
    ]);
  });
});
```

- [ ] **Step 2:** `npx jest src/features/church` → FALHA.
- [ ] **Step 3: Implementar**

```ts
// Criar igreja pelo app: validação dos passos e o formato dos cultos que o
// servidor espera em /api/auth/register (dia "0"–"6", 0 = domingo).

export type Service = { day: number; time: string };

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** O mesmo padrão do servidor: domingo 18h e quarta 19h30. */
export const DEFAULT_SERVICES: Service[] = [
  { day: 0, time: "18:00" },
  { day: 3, time: "19:30" },
];

export function churchStepError(churchName: string, services: Service[]): string | null {
  if (!churchName.trim()) return "Informe o nome da igreja.";
  if (services.length === 0) return "Adicione pelo menos um culto da semana.";
  return null;
}

export function personStepError(p: { name: string; email: string; password: string }): string | null {
  if (p.name.trim().split(/\s+/).length < 2) return "Informe nome e sobrenome.";
  if (!/^\S+@\S+\.\S+$/.test(p.email.trim())) return "Informe um e-mail válido.";
  if (p.password.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  return null;
}

export function servicesPayload(services: Service[]): { day: string; time: string }[] {
  const seen = new Set<string>();
  return [...services]
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    .filter((s) => {
      const key = `${s.day}-${s.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({ day: String(s.day), time: s.time }));
}
```

- [ ] **Step 4:** `npx jest src/features/church` → PASSA.
- [ ] **Step 5:** commit `feat(criar-igreja): regras do formulário`.

### Task 4: App — endpoints, sessão e tela

**Files:**
- Modify: `src/api/endpoints.ts` (`requestChurchSignupCode`, `registerChurch`)
- Modify: `src/auth/session.tsx` (`enterWithResponse`)
- Create: `src/app/criar-igreja.tsx`
- Modify: `src/app/_layout.tsx` (rota no grupo `signedOut`)
- Modify: `src/app/login.tsx`, `src/app/bem-vindo.tsx` (botão "Minha igreja ainda não usa o Servos")

**Interfaces:**
- Consumes: Task 3 inteira; rotas das Tasks 1–2.
- Produces: `endpoints.requestChurchSignupCode(email: string): Promise<{ success: boolean }>`; `endpoints.registerChurch(input: { churchName: string; weeklyServices: { day: string; time: string }[]; name: string; email: string; phone: string; password: string; emailCode: string }): Promise<AuthResponse & { churchCode: string | null }>`; `useSession().enterWithResponse(res: AuthResponse): Promise<void>`.

- [ ] **Step 1: Endpoints**

```ts
  /** Criar igreja pelo app: 1) código no e-mail; 2) cria igreja + admin. */
  requestChurchSignupCode: (email: string) => api<{ success: boolean }>("/auth/register/code", { method: "POST", body: { email: email.trim() } }),
  registerChurch: (input: {
    churchName: string;
    weeklyServices: { day: string; time: string }[];
    name: string;
    email: string;
    phone: string;
    password: string;
    emailCode: string;
  }) => api<AuthResponse & { churchCode: string | null }>("/auth/register", { method: "POST", body: { ...input, email: input.email.trim() } }),
```

- [ ] **Step 2: Sessão.** Em `session.tsx`, ao lado de `signInWithSocial`: `const enterWithResponse = useCallback((res: AuthResponse) => authenticate(() => Promise.resolve(res)), [authenticate]);`, incluir no tipo do contexto (`enterWithResponse: (res: AuthResponse) => Promise<void>;`), no objeto do `useMemo` e nas dependências.

- [ ] **Step 3: Tela `criar-igreja.tsx`** — 4 passos num só componente (`step: "church" | "person" | "code" | "done"`):
  1. **Sua igreja:** `TextField` "Nome da igreja"; lista de cultos (cada um: chips de dia com `WEEKDAYS` + `DateTimeField mode="time"` + botão remover); "Adicionar culto"; "Continuar" valida com `churchStepError`.
  2. **Você:** nome completo, e-mail, celular (`maskPhone` de `features/profile/format`), senha; "Enviar código" valida com `personStepError` e chama `requestChurchSignupCode`. Erro `EMAIL_IN_USE` mostra a mensagem do servidor e um botão "Entrar com este e-mail" (`router.replace({ pathname: "/login" })`).
  3. **Código:** campo de 6 dígitos (mesmo estilo de `entrar-com-codigo.tsx`, com reenvio após 45 s); ao completar 6 dígitos chama `registerChurch({... servicesPayload(services) ...})`.
  4. **Pronto:** "Igreja criada!", o `churchCode` grande, botão "Compartilhar código" (`Share.share` do React Native com a mensagem "Entre na <igreja> no Servos com o código <código>: https://servosapp.com/entrar?c=<código>") e "Começar" → `enterWithResponse(res)` (o app segue para o onboarding).
  `track("church_created")` no sucesso.

- [ ] **Step 4: Ligar a rota.** Em `_layout.tsx`, dentro de `<Stack.Protected guard={signedOut}>`: `<Stack.Screen name="criar-igreja" options={{ headerShown: true, title: "" }} />`. Em `login.tsx`, no bloco "Primeira vez no Servos?", abaixo do botão do código: `<Button label="Minha igreja ainda não usa o Servos" variant="ghost" onPress={() => router.push("/criar-igreja")} />`. Em `bem-vindo.tsx`, abaixo de "Tenho o código da igreja": `<Button label="Minha igreja ainda não usa o Servos" variant="ghost" fullWidth onPress={() => void finish("/criar-igreja")} />`, e tratar `"/criar-igreja"` em `finish` como já é feito com `"/entrar"`.

- [ ] **Step 5:** `npx tsc --noEmit`, `npx expo lint`, `npx jest` → tudo passa.
- [ ] **Step 6:** commit `feat(criar-igreja): criar igreja e conta de admin pelo app`.

### Task 5: Publicar (com confirmação do usuário)

- [ ] Servidor: push da branch e merge em `main` do `Servos-v3` (a Vercel publica). Conferir `curl -s -X POST https://servos-server.vercel.app/api/auth/register/code -H 'content-type: application/json' -d '{"email":"x"}'` → 400 "Informe um e-mail válido." (prova de que a rota nova está no ar).
- [ ] App: conferir node_modules sem cópias " 2" e o fingerprint igual ao do build instalado; `eas update --channel production`.
- [ ] Teste de ponta a ponta no iPhone, feito pelo usuário com um e-mail real dele: criar uma igreja de teste e apagar depois (Perfil → Excluir conta).

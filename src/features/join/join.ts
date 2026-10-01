// Entrada na igreja — regras de tela (puras). Espelham lib/join/rules.ts do
// servidor: código de 6 caracteres sem I, O, 0 e 1.

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isCompleteCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** Máscara enquanto digita: "k7m4" → "K7M-4". */
export function maskCode(input: string): string {
  const c = normalizeCode(input).slice(0, CODE_LENGTH);
  return c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c;
}

/** Explica o que está errado no código, sem esperar o servidor. */
export function codeProblem(code: string): string | null {
  if (!code) return "Digite o código da igreja.";
  const wrong = [...code].find((c) => !CODE_ALPHABET.includes(c));
  if (wrong === "0" || wrong === "O") return "O código não tem a letra O nem o número zero. Confira com quem convidou você.";
  if (wrong === "1" || wrong === "I") return "O código não tem a letra I nem o número um. Confira com quem convidou você.";
  if (code.length !== CODE_LENGTH) return "O código tem 6 letras e números.";
  return null;
}

/**
 * Aceita o link inteiro colado no campo (ou recebido por universal link):
 * https://servosapp.com/entrar?c=K7M4QX&i=abc · servos://entrar?c=…
 */
export function parseInviteLink(text: string): { code: string; invite: string | null } | null {
  const raw = text.trim();
  if (!/^(https?|servos):\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw.replace(/^servos:\/\//i, "https://app/"));
    const code = normalizeCode(url.searchParams.get("c") ?? "");
    if (!code) return null;
    return { code, invite: url.searchParams.get("i") || null };
  } catch {
    return null;
  }
}

/**
 * O que veio da área de transferência: a mensagem de convite inteira (com o
 * link), só o link ou só o código ("K7M-4QX"). null = nada aproveitável.
 */
export function codeFromClipboard(text: string): { code: string; invite: string | null } | null {
  const link = /(https?|servos):\/\/\S+/i.exec(text);
  if (link) {
    const parsed = parseInviteLink(link[0]);
    if (parsed) return parsed;
  }
  for (const m of text.toUpperCase().matchAll(/(?:^|[^A-Z0-9])([A-Z0-9]{3})[-\s]?([A-Z0-9]{3})(?![A-Z0-9])/g)) {
    const code = m[1] + m[2];
    if (isCompleteCode(code)) return { code, invite: null };
  }
  return null;
}

/**
 * Nome do cadastro com Apple/Google: o que a pessoa digitou (se já tem nome
 * e sobrenome) ou o da conta. null = falta pedir. A Apple só manda o nome no
 * primeiro login no app; o Google sempre manda.
 */
export function socialSignupName(typed: string, fromProvider: string | null): string | null {
  const full = (s: string | null) => (s && s.trim().split(/\s+/).length >= 2 ? s.trim().replace(/\s+/g, " ") : null);
  return full(typed) ?? full(fromProvider);
}

export function pendingHeadline(p: { churchName: string; invitedByName: string | null }): { title: string; body: string } {
  const church = p.churchName || "a igreja";
  const who = p.invitedByName ? `${p.invitedByName.split(" ")[0]} ou a liderança da ${church}` : `a liderança da ${church}`;
  return {
    title: "Cadastro enviado",
    body: `Assim que ${who} aprovar, você entra direto no app. Não precisa fazer nada — é só voltar aqui depois.`,
  };
}

/** "agora" · "há 5 min" · "há 3 h" · "há 2 dias". */
export function sinceLabel(iso: string, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - Date.parse(iso));
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

export function requestSubtitle(r: { invitedByName: string | null; ministryName: string | null; createdAt: string }, nowMs?: number): string {
  const via = r.invitedByName ? `Convite de ${r.invitedByName.split(" ")[0]}` : "Pelo código da igreja";
  return [via, r.ministryName, sinceLabel(r.createdAt, nowMs)].filter(Boolean).join(" · ");
}

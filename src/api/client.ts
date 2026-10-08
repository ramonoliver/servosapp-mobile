import Constants from "expo-constants";
import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";

// Cliente HTTP da API do Servos-v3. Autenticação pelo header `x-servos-auth`
// (o mesmo token de sessão que o web usa); o token vive no SecureStore
// (auth/storage.ts) e é injetado aqui em memória.

const API_URL: string = String(Constants.expoConfig?.extra?.apiUrl ?? "https://servos-server.vercel.app").replace(/\/$/, "");
const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Sem rede / servidor inalcançável (não é erro de regra). */
  get isNetwork() {
    return this.status === 0;
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

const OFFLINE_MESSAGE = "Sem conexão. Verifique sua internet e tente novamente.";
const GENERIC_MESSAGE = "Não foi possível concluir agora. Tente novamente.";

export async function api<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  options.signal?.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "x-servos-auth": token } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE, "NETWORK");
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const isAuthTransition = path.startsWith("/auth/login") || path.startsWith("/auth/logout") || path.startsWith("/join/");
    if (res.status === 401 && token && !isAuthTransition) onUnauthorized?.();
    const message = typeof json.error === "string" && json.error ? json.error : GENERIC_MESSAGE;
    throw new ApiError(res.status, message, typeof json.code === "string" ? json.code : undefined, json);
  }
  return json as T;
}

/**
 * Envio de arquivo (multipart) — foto do perfil. Mesmo tratamento de erro do `api`.
 * No SDK 57 o `fetch` global é o `expo/fetch`, que NÃO aceita o formato
 * `{ uri, name, type }` do React Native no FormData: o arquivo vai como
 * `File` do expo-file-system (que é um Blob de verdade).
 */
export async function apiUpload<T>(path: string, file: { uri: string; name?: string; type?: string }, fields: Record<string, string> = {}): Promise<T> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  // Só o `expo/fetch` lê bytes, nome e tipo do `File` (que implementa Blob).
  // O `fetch` global do React Native não entende esse objeto e manda o campo
  // sem arquivo, e o servidor recusa ("Formato não suportado").
  form.append("file", new File(file.uri) as unknown as Blob);
  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${API_URL}/api${path}`, {
      method: "POST",
      headers: { Accept: "application/json", ...(token ? { "x-servos-auth": token } : {}) },
      body: form,
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE, "NETWORK");
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, typeof json.error === "string" ? json.error : GENERIC_MESSAGE, undefined, json);
  }
  return json as T;
}

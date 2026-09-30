// Deep links (§31, §32). O servidor grava `action_url` como rota do WEB
// ("/escalas/:id", "/minhas-escalas", "/perfil"…); o app traduz para as suas
// rotas. `servos://escala/:id` chega pelo próprio Expo Router.

export type AppHref =
  | { pathname: "/escala/[id]"; params: { id: string } }
  | { pathname: "/conversa/[id]"; params: { id: string } }
  | "/(tabs)/escalas"
  | "/(tabs)/perfil"
  | "/notificacoes"
  | "/aprovacoes"
  | "/(tabs)";

export function appRouteForUrl(url: string | null | undefined): AppHref {
  const raw = String(url ?? "").trim();
  if (!raw) return "/notificacoes";
  let path = raw;
  try {
    // Aceita URL absoluta do web ou do esquema do app.
    if (/^[a-z]+:\/\//i.test(raw)) {
      const u = new URL(raw.replace(/^servos:\/\//, "https://app/"));
      path = u.pathname;
    }
  } catch {
    return "/notificacoes";
  }
  const scheduleMatch = /^\/(?:escalas|escala)\/([^/?#]+)/.exec(path);
  if (scheduleMatch) {
    const id = decodeURIComponent(scheduleMatch[1]);
    // Recado na conversa da escala abre direto a conversa.
    return /[?&]conversa=1\b/.test(raw) ? { pathname: "/conversa/[id]", params: { id } } : { pathname: "/escala/[id]", params: { id } };
  }
  if (path.startsWith("/minhas-escalas") || path === "/escalas") return "/(tabs)/escalas";
  if (path.startsWith("/perfil") || path.startsWith("/conta")) return "/(tabs)/perfil";
  if (path.startsWith("/aprovacoes")) return "/aprovacoes";
  if (path.startsWith("/inicio") || path === "/") return "/(tabs)";
  return "/notificacoes";
}

import { hasSavedSession } from "@/lib/savedSession";

// Link de convite (`servos://entrar?c=…&i=…` ou servosapp.com/entrar) aberto
// por quem JÁ tem conta no aparelho: em vez do cadastro, vai para "Entrar em
// outra igreja".
export async function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, "servos://app");
    const route = url.protocol === "servos:" && url.host !== "app" ? `/${url.host}${url.pathname}` : url.pathname;
    if (route.replace(/\/+$/, "") === "/entrar" && (await hasSavedSession())) {
      return `/outra-igreja${url.search}`;
    }
    return path;
  } catch {
    return path;
  }
}

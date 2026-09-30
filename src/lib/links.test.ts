import { appRouteForUrl } from "./links";

describe("appRouteForUrl", () => {
  it("escala do web vira detalhe no app", () => {
    expect(appRouteForUrl("/escalas/abc123")).toEqual({ pathname: "/escala/[id]", params: { id: "abc123" } });
    expect(appRouteForUrl("/escalas/abc123?conversa=1")).toEqual({ pathname: "/conversa/[id]", params: { id: "abc123" } });
    expect(appRouteForUrl("https://servos.web.app/escalas/a%20b")).toEqual({ pathname: "/escala/[id]", params: { id: "a b" } });
    expect(appRouteForUrl("servos://escala/xyz")).toEqual({ pathname: "/escala/[id]", params: { id: "xyz" } });
  });

  it("listas e perfil", () => {
    expect(appRouteForUrl("/minhas-escalas")).toBe("/(tabs)/escalas");
    expect(appRouteForUrl("/perfil")).toBe("/(tabs)/perfil");
    expect(appRouteForUrl("/inicio")).toBe("/(tabs)");
  });

  it("desconhecido ou vazio cai na central de notificações (nunca numa tela quebrada)", () => {
    expect(appRouteForUrl("/aprovacoes")).toBe("/aprovacoes");
    expect(appRouteForUrl("/kids/checkin")).toBe("/notificacoes");
    expect(appRouteForUrl("")).toBe("/notificacoes");
    expect(appRouteForUrl(undefined)).toBe("/notificacoes");
  });
});

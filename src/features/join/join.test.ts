import { codeProblem, isCompleteCode, maskCode, normalizeCode, parseInviteLink, pendingHeadline, requestSubtitle, sinceLabel } from "./join";

describe("código da igreja", () => {
  it("máscara e normalização", () => {
    expect(maskCode("k7m")).toBe("K7M");
    expect(maskCode("k7m4q")).toBe("K7M-4Q");
    expect(maskCode("K7M-4QX-ZZ")).toBe("K7M-4QX");
    expect(normalizeCode("k7m-4qx")).toBe("K7M4QX");
    expect(isCompleteCode("K7M4QX")).toBe(true);
    expect(isCompleteCode("K7M4Q")).toBe(false);
  });

  it("explica o erro de digitação mais comum", () => {
    expect(codeProblem("K7M4Q0")).toMatch(/letra O nem o número zero/);
    expect(codeProblem("K1M4QX")).toMatch(/letra I nem o número um/);
    expect(codeProblem("K7M")).toBe("O código tem 6 letras e números.");
    expect(codeProblem("K7M4QX")).toBeNull();
  });

  it("aceita o link colado", () => {
    expect(parseInviteLink("https://servosapp.com/entrar?c=k7m4qx&i=abc")).toEqual({ code: "K7M4QX", invite: "abc" });
    expect(parseInviteLink("servos://entrar?c=K7M4QX")).toEqual({ code: "K7M4QX", invite: null });
    expect(parseInviteLink("K7M4QX")).toBeNull();
  });
});

describe("espera e pedidos", () => {
  it("quem aprova", () => {
    expect(pendingHeadline({ churchName: "Igreja Central", invitedByName: "Ramon Oliveira" }).body).toContain(
      "Ramon ou a liderança da Igreja Central",
    );
    expect(pendingHeadline({ churchName: "Igreja Central", invitedByName: null }).body).toContain("a liderança da Igreja Central aprovar");
  });

  it("tempo e origem do pedido", () => {
    const now = Date.parse("2026-09-29T12:00:00Z");
    expect(sinceLabel("2026-09-29T11:59:40Z", now)).toBe("agora");
    expect(sinceLabel("2026-09-29T11:30:00Z", now)).toBe("há 30 min");
    expect(sinceLabel("2026-09-28T12:00:00Z", now)).toBe("há 1 dia");
    expect(
      requestSubtitle({ invitedByName: "Ramon Oliveira", ministryName: "Mídia", createdAt: "2026-09-29T09:00:00Z" }, now),
    ).toBe("Convite de Ramon · Mídia · há 3 h");
    expect(requestSubtitle({ invitedByName: null, ministryName: null, createdAt: "2026-09-29T09:00:00Z" }, now)).toBe(
      "Pelo código da igreja · há 3 h",
    );
  });
});

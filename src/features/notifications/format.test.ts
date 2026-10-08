import type { AppNotification } from "@/api/endpoints";
import { groupNotifications, notificationWhen } from "./format";

// Formato real de GET /notifications/list (camelCase, createdAt pode vir null).
const n = (id: string, createdAt: string | null): AppNotification => ({
  id,
  title: "Você foi escalado",
  body: "Domingo, 19h",
  icon: null,
  type: "info",
  read: false,
  actionUrl: null,
  createdAt,
});

const now = new Date("2026-10-08T15:00:00Z"); // 12h em São Paulo

describe("notificações", () => {
  it("agrupa em Hoje, Ontem e Anteriores pelo dia da igreja", () => {
    const groups = groupNotifications(
      [n("a", "2026-10-08T13:00:00Z"), n("b", "2026-10-07T20:00:00Z"), n("c", "2026-09-30T12:00:00Z")],
      now,
    );
    expect(groups.map((g) => [g.title, g.data.map((x) => x.id)])).toEqual([
      ["Hoje", ["a"]],
      ["Ontem", ["b"]],
      ["Anteriores", ["c"]],
    ]);
  });

  it("não quebra com data ausente ou inválida", () => {
    expect(() => groupNotifications([n("x", null), n("y", "não é data")], now)).not.toThrow();
    expect(groupNotifications([n("x", null)], now)).toEqual([{ title: "Anteriores", data: [n("x", null)] }]);
    expect(notificationWhen(null, now)).toBe("");
    expect(notificationWhen("não é data", now)).toBe("");
  });

  it("mostra hora para hoje e data curta para os outros dias", () => {
    expect(notificationWhen("2026-10-08T13:05:00Z", now)).toBe("10:05");
    expect(notificationWhen("2026-10-06T13:05:00Z", now)).toBe("Ter, 6 out");
  });
});

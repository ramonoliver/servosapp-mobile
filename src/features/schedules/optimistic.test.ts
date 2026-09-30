import type { AssignmentCard, MobileOverview } from "@/api/contracts";
import { applyToOverview } from "./optimistic";

function card(id: string, date: string, needsResponse = true): AssignmentCard {
  return {
    assignmentId: id,
    scheduleId: `s-${id}`,
    status: needsResponse ? "PENDING" : "ACCEPTED",
    scheduleStatus: "PUBLISHED",
    needsResponse,
    eventName: "Culto",
    ministry: { id: "p", name: "Produção", color: null, icon: null },
    functionName: "Câmera",
    date,
    time: "18:00",
    arrivalTime: "",
    location: "",
    reconfirmRequested: false,
  };
}

const base: MobileOverview = {
  user: { id: "u", name: "Ramon", firstName: "Ramon", photoUrl: null, avatarColor: null },
  next: card("a", "2026-09-27"),
  pending: [card("b", "2026-10-04")],
  upcoming: [card("c", "2026-10-11", false)],
  leader: null,
  unreadNotifications: 0,
  generatedAt: "",
};

describe("applyToOverview", () => {
  it("confirmar a próxima muda o status e não tira ela do lugar", () => {
    const r = applyToOverview(base, "a", "ACCEPTED")!;
    expect(r.next).toMatchObject({ assignmentId: "a", status: "ACCEPTED", needsResponse: false });
  });

  it("responder uma pendência tira de Pendências e coloca em Próximas na ordem", () => {
    const r = applyToOverview(base, "b", "ACCEPTED")!;
    expect(r.pending).toEqual([]);
    expect(r.upcoming.map((c) => [c.assignmentId, c.status])).toEqual([
      ["b", "ACCEPTED"],
      ["c", "ACCEPTED"],
    ]);
  });

  it("id desconhecido não altera nada", () => {
    expect(applyToOverview(base, "zzz", "ACCEPTED")).toEqual(base);
  });

  it("sem cache ainda: não inventa dado", () => {
    expect(applyToOverview(undefined, "a", "ACCEPTED")).toBeUndefined();
  });
});

import type { Candidate, MinistryMemberView } from "@/api/contracts";
import { churchTimeOf, groupHistory, candidateLines, criticalChangeDialog, describeChange, filterTeam, lastServedLabel, overrideDialog, unavailabilityLabel } from "./copy";

const cand = (over: Partial<Candidate>): Candidate => ({
  userId: "u",
  name: "Rafael Souza",
  photoUrl: null,
  avatarColor: null,
  hasFunction: true,
  flags: [],
  lastServedDaysAgo: 21,
  ...over,
});

describe("candidatos (§23)", () => {
  it("disponível mostra a última escala", () => {
    expect(candidateLines(cand({}), "Câmera")).toEqual([{ text: "Disponível · Última escala: há 3 semanas", tone: "success" }]);
    expect(lastServedLabel(null)).toBe("Ainda não serviu aqui");
    expect(lastServedLabel(3)).toBe("Última escala: esta semana");
    expect(lastServedLabel(90)).toBe("Última escala: há 3 meses");
  });

  it("avisos com o motivo", () => {
    const c = cand({
      flags: [
        { kind: "conflict", scheduleId: "s", ministryName: "Louvor", eventName: "Culto das 18h", date: "2026-09-27", time: "17:00" },
        { kind: "no_function" },
      ],
    });
    expect(candidateLines(c, "Câmera")).toEqual([
      { text: "Conflito de horário · Louvor · Culto das 18h", tone: "warning" },
      { text: "Não tem a função Câmera", tone: "neutral" },
    ]);
  });

  it("override consciente só para conflito/indisponível, com texto do briefing", () => {
    expect(
      overrideDialog("Ramon Oliveira", [{ kind: "conflict", scheduleId: "s", ministryName: "Produção", eventName: "Culto", date: "d", time: "18:00" }]),
    ).toEqual({ title: "Conflito de horário", message: "Ramon já está escalado em Produção neste período (Culto, 18h). Escalar mesmo assim?" });
    expect(overrideDialog("João", [{ kind: "unavailable", reason: "Viagem" }])?.message).toBe(
      "João avisou que não pode servir nesta data (Viagem). Escalar mesmo assim?",
    );
    expect(overrideDialog("Ana", [{ kind: "no_function" }])).toBeNull();
  });
});

describe("indisponibilidade (§24)", () => {
  it("rótulos", () => {
    const base = { id: "1", endDate: null, allDay: true, startTime: null, endTime: null, reason: "Viagem", source: "user" };
    expect(unavailabilityLabel({ ...base, date: "2026-10-03" })).toMatchObject({ period: "Dia inteiro", reason: "Viagem" });
    expect(unavailabilityLabel({ ...base, date: "2026-10-03", endDate: "2026-10-10" }).period).toBe("3 a 10 out");
    expect(unavailabilityLabel({ ...base, date: "2026-09-28", endDate: "2026-10-02" }).period).toBe("28 set a 2 out");
    expect(unavailabilityLabel({ ...base, date: "2026-10-03", allDay: false, startTime: "08:00", endTime: "12:00" }).period).toBe("8h às 12h");
    expect(unavailabilityLabel({ ...base, date: "2026-10-03", reason: "", source: "decline" }).reason).toBe("Informado ao recusar uma escala");
    expect(unavailabilityLabel({ ...base, date: "2026-10-03" }).tile).toEqual({ weekday: "SÁB", day: "3", month: "OUT" });
  });
});

describe("equipe (§35)", () => {
  const m = (over: Partial<MinistryMemberView>): MinistryMemberView => ({
    membershipId: "x", userId: "x", name: "X", photoUrl: null, avatarColor: null, role: "MEMBER", functions: [], active: true, isMe: false, ...over,
  });
  const team = [
    m({ userId: "ramon", name: "Ramon", role: "LEADER", functions: ["Diretor"] }),
    m({ userId: "joao", name: "João", functions: ["Câmera"] }),
    m({ userId: "ex", name: "Ex Membro", active: false }),
  ];

  it("filtros e busca por nome ou função, sem acento", () => {
    expect(filterTeam(team, "all", "").map((x) => x.userId)).toEqual(["ramon", "joao"]);
    expect(filterTeam(team, "leaders", "").map((x) => x.userId)).toEqual(["ramon"]);
    expect(filterTeam(team, "members", "").map((x) => x.userId)).toEqual(["joao"]);
    expect(filterTeam(team, "inactive", "").map((x) => x.userId)).toEqual(["ex"]);
    expect(filterTeam(team, "all", "camera").map((x) => x.userId)).toEqual(["joao"]);
    expect(filterTeam(team, "all", "joão").map((x) => x.userId)).toEqual(["joao"]);
  });
});


describe("alteração crítica (§27)", () => {
  it("diz o que muda e quantas pessoas são afetadas", () => {
    expect(describeChange({ field: "arrival_time", from: "17:30", to: "17:00" })).toBe("Horário de chegada: 17:30 → 17:00");
    expect(criticalChangeDialog(12, [{ field: "time", from: "18:00", to: "19:00" }])).toEqual({
      title: "Esta alteração afeta pessoas que já confirmaram presença.",
      message: "12 pessoas já confirmaram esta escala.\n\nHorário: 18:00 → 19:00\n\nElas vão receber o aviso do que mudou e precisarão confirmar de novo.",
    });
  });
});

describe("histórico (P2)", () => {
  it("agrupa por dia no fuso da igreja", () => {
    const items = [
      { id: "3", at: "2026-09-29T13:05:00Z" }, // 10:05 em Brasília
      { id: "2", at: "2026-09-29T01:30:00Z" }, // 28/09 22:30 em Brasília
      { id: "1", at: "2026-09-22T12:00:00Z" },
    ];
    const groups = groupHistory(items, "2026-09-29");
    expect(groups.map((g) => [g.title, g.items.map((i) => i.id)])).toEqual([
      ["Hoje", ["3"]],
      ["Ontem", ["2"]],
      ["Terça-feira, 22 de setembro", ["1"]],
    ]);
    expect(churchTimeOf("2026-09-29T13:05:00Z")).toBe("10:05");
  });
});

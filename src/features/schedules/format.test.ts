import type { AssignmentCard } from "@/api/contracts";
import {
  addDays,
  churchToday,
  dateTile,
  dayAndTime,
  dayLabel,
  formatLongDate,
  formatShortDate,
  formatTime,
  greeting,
  groupPast,
  groupUpcoming,
} from "./format";
import { assignmentStatusMeta, attentionCopy, joinNames } from "./status";

const TODAY = "2026-09-25"; // sexta-feira

function card(date: string, id = date): AssignmentCard {
  return {
    assignmentId: id,
    scheduleId: id,
    status: "PENDING",
    scheduleStatus: "PUBLISHED",
    needsResponse: true,
    eventName: "Culto",
    ministry: { id: "p", name: "Produção", color: null, icon: null },
    functionName: "Câmera",
    date,
    time: "18:00",
    arrivalTime: "17:30",
    location: "",
    reconfirmRequested: false,
  };
}

describe("datas", () => {
  it("formata em pt-BR sem depender do fuso do aparelho", () => {
    expect(formatLongDate("2026-09-27")).toBe("Domingo, 27 de setembro");
    expect(formatShortDate("2026-10-03")).toBe("Sáb, 3 out");
    expect(dateTile("2026-09-27")).toEqual({ weekday: "DOM", day: "27", month: "SET" });
  });

  it("horário curto", () => {
    expect(formatTime("18:00")).toBe("18h");
    expect(formatTime("09:30")).toBe("9h30");
    expect(formatTime("")).toBe("");
  });

  it("dia relativo", () => {
    expect(dayAndTime(TODAY, "19:30", TODAY)).toBe("Hoje · 19h30");
    expect(dayAndTime("2026-09-26", "18:00", TODAY)).toBe("Amanhã · 18h");
    expect(dayAndTime("2026-09-27", "18:00", TODAY)).toBe("Domingo · 18h");
    expect(dayAndTime("2026-09-28", "20:00", TODAY)).toBe("Segunda · 20h");
  });

  it("rótulo de dia não ambíguo para pendências de semanas diferentes", () => {
    expect(dayLabel(TODAY, TODAY)).toBe("Hoje");
    expect(dayLabel("2026-09-27", TODAY)).toBe("Dom, 27 set");
    expect(dayLabel("2026-10-11", TODAY)).toBe("Dom, 11 out");
  });

  it("virada de mês e ano", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("hoje no fuso da igreja: 01h UTC ainda é o dia anterior em São Paulo", () => {
    expect(churchToday(new Date("2026-09-26T01:00:00Z"))).toBe("2026-09-25");
  });

  it("saudação por horário", () => {
    expect(greeting(8)).toBe("Bom dia");
    expect(greeting(14)).toBe("Boa tarde");
    expect(greeting(21)).toBe("Boa noite");
    expect(greeting(2)).toBe("Boa noite");
  });
});

describe("agrupamento (§19)", () => {
  it("HOJE · ESTA SEMANA · PRÓXIMA SEMANA · mês", () => {
    const groups = groupUpcoming(
      [card(TODAY), card("2026-09-26"), card("2026-09-27"), card("2026-10-02"), card("2026-10-11"), card("2027-01-10")],
      TODAY,
    );
    expect(groups.map((g) => [g.title, g.items.length])).toEqual([
      ["Hoje", 1],
      ["Esta semana", 1],
      ["Próxima semana", 2],
      ["Outubro", 1],
      ["Janeiro de 2027", 1],
    ]);
  });

  it("passadas por mês", () => {
    expect(groupPast([card("2026-09-20"), card("2026-09-13"), card("2026-08-30")], TODAY).map((g) => g.title)).toEqual([
      "Setembro",
      "Agosto",
    ]);
  });
});

describe("status (§16)", () => {
  it("todo status tem rótulo e ícone, não só cor", () => {
    for (const s of ["PENDING", "ACCEPTED", "DECLINED", "REPLACEMENT_PENDING", "REPLACED", "CANCELLED"] as const) {
      const meta = assignmentStatusMeta(s);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon).toBeTruthy();
    }
    expect(assignmentStatusMeta("ACCEPTED").label).toBe("Confirmado");
    expect(assignmentStatusMeta("PENDING").label).toBe("Aguardando");
  });

  it("escala cancelada prevalece sobre o status da pessoa", () => {
    expect(assignmentStatusMeta("ACCEPTED", "CANCELLED").label).toBe("Escala cancelada");
  });

  it("pendências dizem o problema exato", () => {
    expect(attentionCopy({ kind: "declined", assignmentId: "a", userId: "u", userName: "Pedro", functionName: "Câmera" })).toMatchObject({
      title: "Pedro recusou",
      detail: "Câmera",
    });
    expect(attentionCopy({ kind: "open_slots", functionName: "Câmera", count: 1 }).title).toBe("1 vaga de Câmera");
    expect(attentionCopy({ kind: "open_slots", functionName: "Foto", count: 2 }).title).toBe("2 vagas de Foto");
    expect(attentionCopy({ kind: "no_response", count: 2, userNames: ["Ana", "Bia"] })).toMatchObject({
      title: "2 pessoas ainda não responderam",
      detail: "Ana e Bia",
    });
  });

  it("lista de nomes humana", () => {
    expect(joinNames(["Ana"])).toBe("Ana");
    expect(joinNames(["Ana", "Bia", "Caio"])).toBe("Ana, Bia e Caio");
    expect(joinNames(["A", "B", "C", "D", "E"])).toBe("A, B, C e mais 2");
  });
});

describe("calendário", () => {
  const { monthWeeks, shiftMonth, monthLabel, dayA11yLabel } = jest.requireActual("./format") as typeof import("./format");

  it("navega entre meses atravessando o ano", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(monthLabel("2026-10")).toBe("Outubro de 2026");
  });

  it("semanas de domingo a sábado, sem dias de outro mês", () => {
    const weeks = monthWeeks("2026-10"); // 1º de outubro de 2026 é quinta
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[weeks.length - 1][6]).toBe("2026-10-31"); // 31/10/2026 é sábado
    expect(monthWeeks("2026-11")[4][1]).toBe("2026-11-30");
    expect(monthWeeks("2026-11")[4][2]).toBeNull();
  });

  it("rótulo acessível do dia", () => {
    expect(dayA11yLabel("2026-10-04", 2)).toBe("Domingo, 4 de outubro, 2 escalas");
    expect(dayA11yLabel("2026-10-05", 0)).toBe("Segunda-feira, 5 de outubro");
  });
});

import { buildCalendarEvent } from "./calendarEvent";

describe("salvar na agenda", () => {
  it("começa na chegada, no fuso da igreja, com as informações nas notas", () => {
    const e = buildCalendarEvent({
      eventName: "Culto das 18h",
      ministryName: "Produção",
      functionName: "Câmera",
      date: "2026-10-04",
      time: "18:00",
      arrivalTime: "17:30",
      location: "Templo principal",
      instructions: "Portão lateral.",
    });
    expect(e.title).toBe("Servir: Culto das 18h (Produção)");
    expect(e.startDate.toISOString()).toBe("2026-10-04T20:30:00.000Z");
    expect(e.endDate.toISOString()).toBe("2026-10-04T23:00:00.000Z"); // 18h + 2h
    expect(e.location).toBe("Templo principal");
    expect(e.notes).toBe("Função: Câmera\nChegada: 17h30\nInício: 18h\n\nPortão lateral.\n\nEscala do Servos");
  });

  it("usa o término quando existe e nunca termina antes de começar", () => {
    expect(buildCalendarEvent({ eventName: "E", ministryName: "M", functionName: null, date: "2026-10-04", time: "19:00", endTime: "21:30" }).endDate.toISOString()).toBe(
      "2026-10-05T00:30:00.000Z",
    );
    const odd = buildCalendarEvent({ eventName: "E", ministryName: "M", functionName: null, date: "2026-10-04", time: "19:00", endTime: "08:00" });
    expect(odd.endDate.getTime() - odd.startDate.getTime()).toBe(120 * 60_000);
  });
});

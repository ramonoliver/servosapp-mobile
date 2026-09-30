import { buildEventInput } from "./newEvent";

const base = { name: "Culto de domingo", kind: "weekly" as const, weekday: 0, date: null, time: "19:00", location: " Templo ", today: "2026-09-30" };

describe("buildEventInput", () => {
  it("monta culto semanal no formato canônico", () => {
    const r = buildEventInput(base);
    expect(r).toEqual({
      ok: true,
      data: { name: "Culto de domingo", type: "recurring", icon: "CalendarBlank", location: "Templo", base_time: "19:00", recurrence: "weekly:0" },
    });
  });

  it("monta evento de data única", () => {
    const r = buildEventInput({ ...base, kind: "once", date: "2026-10-12" });
    expect(r.ok && r.data.recurrence).toBe("once:2026-10-12");
    expect(r.ok && r.data.type).toBe("special");
  });

  it("recusa nome curto, sem horário, sem data e data passada", () => {
    expect(buildEventInput({ ...base, name: " a " }).ok).toBe(false);
    expect(buildEventInput({ ...base, time: null }).ok).toBe(false);
    expect(buildEventInput({ ...base, kind: "once" }).ok).toBe(false);
    expect(buildEventInput({ ...base, kind: "once", date: "2026-09-01" })).toEqual({ ok: false, error: "A data já passou." });
  });
});

import { birthDateStart, pickerStart } from "./dateField";

describe("campo de data", () => {
  it("com valor, o seletor abre no valor", () => {
    expect(pickerStart("1990-05-20", "date", { today: "2026-10-09" })).toBe("1990-05-20");
  });

  it("vazio: usa o ponto de partida pedido, depois o mínimo, o máximo e por fim hoje", () => {
    expect(pickerStart(null, "date", { emptyStart: "1996-01-01", maximumDate: "2026-10-09", today: "2026-10-09" })).toBe("1996-01-01");
    expect(pickerStart(null, "date", { minimumDate: "2026-11-01", today: "2026-10-09" })).toBe("2026-11-01");
    expect(pickerStart(null, "date", { maximumDate: "2026-10-09", today: "2026-10-09" })).toBe("2026-10-09");
    expect(pickerStart(null, "date", { today: "2026-10-09" })).toBe("2026-10-09");
  });

  it("hora vazia começa às 18:00", () => {
    expect(pickerStart(null, "time", { today: "2026-10-09" })).toBe("18:00");
  });

  it("nascimento: o seletor abre 30 anos antes, em 1º de janeiro", () => {
    expect(birthDateStart("2026-10-09")).toBe("1996-01-01");
  });
});

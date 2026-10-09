import { ministryNameError, parseFunctionNames } from "./newMinistry";

describe("novo ministério", () => {
  it("nome obrigatório e curto", () => {
    expect(ministryNameError("  ")).toBe("Dê um nome ao ministério.");
    expect(ministryNameError("x".repeat(61))).toBe("Use até 60 caracteres.");
    expect(ministryNameError("Louvor")).toBeNull();
  });

  it("funções separadas por vírgula ou linha, sem vazias nem repetidas", () => {
    expect(parseFunctionNames("Vocal, violão,\nBateria , vocal,, ")).toEqual(["Vocal", "violão", "Bateria"]);
    expect(parseFunctionNames("")).toEqual([]);
  });
});

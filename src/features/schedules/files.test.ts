import { fileSizeLabel } from "./files";

describe("tamanho do arquivo", () => {
  it("KB e MB em pt-BR", () => {
    expect(fileSizeLabel(0)).toBe("");
    expect(fileSizeLabel(200)).toBe("1 KB");
    expect(fileSizeLabel(320 * 1024)).toBe("320 KB");
    expect(fileSizeLabel(1.4 * 1024 * 1024)).toBe("1,4 MB");
  });
});

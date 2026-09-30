import { maskPhone } from "./format";

describe("celular", () => {
  it("máscara enquanto digita", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("1999")).toBe("(19) 99");
    expect(maskPhone("1932345678")).toBe("(19) 3234-5678");
    expect(maskPhone("19998765432")).toBe("(19) 99876-5432");
    expect(maskPhone("+55 (19) 99876-5432 ramal")).toBe("(55) 19998-7654");
  });
});

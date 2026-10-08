import { churchInviteMessage, churchStepError, DEFAULT_SERVICES, personStepError, servicesPayload } from "./signup";

describe("criar igreja", () => {
  it("passo da igreja: nome e pelo menos um culto", () => {
    expect(churchStepError(" ", DEFAULT_SERVICES)).toBe("Informe o nome da igreja.");
    expect(churchStepError("Igreja Vida", [])).toBe("Adicione pelo menos um culto da semana.");
    expect(churchStepError("Igreja Vida", DEFAULT_SERVICES)).toBeNull();
  });

  it("passo da pessoa: nome e sobrenome, e-mail e senha de 6", () => {
    expect(personStepError({ name: "Ana", email: "a@b.co", password: "123456" })).toBe("Informe nome e sobrenome.");
    expect(personStepError({ name: "Ana Souza", email: "ab.co", password: "123456" })).toBe("Informe um e-mail válido.");
    expect(personStepError({ name: "Ana Souza", email: "a@b.co", password: "12345" })).toBe("A senha precisa ter pelo menos 6 caracteres.");
    expect(personStepError({ name: "Ana Souza", email: "a@b.co", password: "123456" })).toBeNull();
  });

  it("cultos para o servidor: dia como texto, ordenados, sem repetidos", () => {
    expect(
      servicesPayload([
        { day: 3, time: "19:30" },
        { day: 0, time: "18:00" },
        { day: 0, time: "09:00" },
        { day: 3, time: "19:30" },
      ]),
    ).toEqual([
      { day: "0", time: "09:00" },
      { day: "0", time: "18:00" },
      { day: "3", time: "19:30" },
    ]);
  });

  it("mensagem de convite com o código e o link de entrada", () => {
    expect(churchInviteMessage("Igreja Vida", "K7M4QX")).toBe(
      "Estamos usando o Servos na Igreja Vida para organizar as escalas. Baixe o app e entre com o código K7M-4QX: https://servosapp.com/entrar?c=K7M4QX",
    );
  });
});

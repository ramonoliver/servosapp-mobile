import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import { Share } from "react-native";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import CreateChurchScreen from "@/app/criar-igreja";
import { useSession } from "@/auth/session";
import { track } from "@/lib/analytics";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("@/auth/session", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("@/api/endpoints", () => ({
  endpoints: { requestChurchSignupCode: jest.fn(), registerChurch: jest.fn() },
}));

jest.useFakeTimers();

const enterWithResponse = jest.fn();
const created = { token: "t", user: { id: "u1" }, churchCode: "ABC123" };

function setup() {
  jest.mocked(useSession).mockReturnValue({ enterWithResponse } as unknown as ReturnType<typeof useSession>);
  jest.mocked(endpoints.requestChurchSignupCode).mockResolvedValue({ success: true });
  jest.mocked(endpoints.registerChurch).mockResolvedValue(created as never);
  return userEvent.setup();
}

type User = ReturnType<typeof setup>;

async function fillChurch(user: User) {
  await user.type(screen.getByLabelText("Nome da igreja"), "Igreja Vida ");
  await user.press(screen.getByRole("button", { name: "Continuar" }));
}

async function fillPerson(user: User) {
  await user.type(screen.getByLabelText("Nome completo"), "Ana Souza");
  await user.type(screen.getByLabelText("E-mail"), "Ana@Vida.com");
  await user.type(screen.getByLabelText("Senha"), "segredo1");
  await user.press(screen.getByRole("button", { name: "Enviar código para o e-mail" }));
}

beforeEach(() => jest.clearAllMocks());

test("pede o nome da igreja antes de seguir", async () => {
  const user = setup();
  await render(<CreateChurchScreen />);

  await user.press(screen.getByRole("button", { name: "Continuar" }));

  expect(screen.getByText("Informe o nome da igreja.")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Sua igreja no Servos" })).toBeOnTheScreen();
});

test("exige pelo menos um culto da semana", async () => {
  const user = setup();
  await render(<CreateChurchScreen />);

  expect(screen.getAllByRole("button", { name: "Remover" })).toHaveLength(2);
  await user.press(screen.getAllByRole("button", { name: "Remover" })[0]);
  await user.press(screen.getByRole("button", { name: "Remover" }));
  expect(screen.queryByRole("button", { name: "Remover" })).not.toBeOnTheScreen();
  await fillChurch(user);

  expect(screen.getByText("Adicione pelo menos um culto da semana.")).toBeOnTheScreen();
});

test("valida os dados da pessoa antes de mandar o código", async () => {
  const user = setup();
  await render(<CreateChurchScreen />);
  await fillChurch(user);

  expect(screen.getByText("Você vai ser o administrador da Igreja Vida.")).toBeOnTheScreen();
  await user.type(screen.getByLabelText("Nome completo"), "Ana");
  await user.press(screen.getByRole("button", { name: "Enviar código para o e-mail" }));

  expect(screen.getByText("Informe nome e sobrenome.")).toBeOnTheScreen();
  expect(endpoints.requestChurchSignupCode).not.toHaveBeenCalled();
});

test("e-mail já cadastrado oferece ir para o login", async () => {
  jest.mocked(useSession).mockReturnValue({ enterWithResponse } as unknown as ReturnType<typeof useSession>);
  const user = userEvent.setup();
  jest.mocked(endpoints.requestChurchSignupCode).mockRejectedValue(
    new ApiError(409, "Este e-mail já tem conta no Servos.", undefined, { code: "EMAIL_IN_USE" }),
  );
  await render(<CreateChurchScreen />);
  await fillChurch(user);
  await fillPerson(user);

  expect(await screen.findByText("Este e-mail já tem conta no Servos.")).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Entrar com este e-mail" }));
  expect(router.replace).toHaveBeenCalledWith("/login");
});

test("cria a igreja com os cultos e entrega o código para convidar a equipe", async () => {
  const user = setup();
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  await render(<CreateChurchScreen />);

  await fillChurch(user);
  await fillPerson(user);
  expect(endpoints.requestChurchSignupCode).toHaveBeenCalledWith("Ana@Vida.com");
  expect(await screen.findByText(/Enviamos um código de 6 dígitos para ana@vida\.com/)).toBeOnTheScreen();

  await user.type(screen.getByLabelText("Código de 6 dígitos"), "654321");

  expect(endpoints.registerChurch).toHaveBeenCalledWith({
    churchName: "Igreja Vida",
    weeklyServices: [
      { day: "0", time: "18:00" },
      { day: "3", time: "19:30" },
    ],
    name: "Ana Souza",
    email: "Ana@Vida.com",
    phone: "",
    password: "segredo1",
    emailCode: "654321",
  });
  expect(track).toHaveBeenCalledWith("signup_submitted", { via: "church_created", status: "approved" });
  expect(await screen.findByRole("header", { name: "Igreja criada!" })).toBeOnTheScreen();
  expect(screen.getByText("ABC-123")).toBeOnTheScreen();

  await user.press(screen.getByRole("button", { name: "Compartilhar código" }));
  expect(share).toHaveBeenCalledWith({ message: expect.stringContaining("https://servosapp.com/entrar?c=ABC123") });

  await user.press(screen.getByRole("button", { name: "Começar" }));
  expect(enterWithResponse).toHaveBeenCalledWith(created);
});

test("código errado mantém a pessoa no passo do código", async () => {
  const user = setup();
  jest.mocked(endpoints.registerChurch).mockRejectedValue(new ApiError(400, "Código inválido ou expirado."));
  await render(<CreateChurchScreen />);
  await fillChurch(user);
  await fillPerson(user);

  const input = await screen.findByLabelText("Código de 6 dígitos");
  await user.type(input, "000000");

  expect(await screen.findByText("Código inválido ou expirado.")).toBeOnTheScreen();
  expect(input).toHaveDisplayValue("");
  expect(screen.getByRole("button", { name: "Criar igreja" })).toBeDisabled();
});

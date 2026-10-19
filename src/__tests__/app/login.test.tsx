import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import { ApiError } from "@/api/client";
import LoginScreen from "@/app/login";
import { useSession } from "@/auth/session";
import { track } from "@/lib/analytics";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("@/auth/session", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
// Apple/Google dependem de módulo nativo; o login social fica fora destes testes.
jest.mock("@/components/auth/SocialButtons", () => ({ SocialButtons: () => null }));

jest.useFakeTimers();

const signIn = jest.fn();

function setup(session: { signedOutReason?: string | null } = {}) {
  jest.mocked(useSession).mockReturnValue({
    signIn,
    signInWithSocial: jest.fn(),
    signedOutReason: session.signedOutReason ?? null,
  } as unknown as ReturnType<typeof useSession>);
  return userEvent.setup();
}

beforeEach(() => jest.clearAllMocks());

test("pede e-mail e senha antes de chamar o servidor", async () => {
  const user = setup();
  await render(<LoginScreen />);

  await user.press(screen.getByRole("button", { name: "Entrar" }));

  expect(screen.getByText("Informe seu e-mail e sua senha.")).toBeOnTheScreen();
  expect(signIn).not.toHaveBeenCalled();
});

test("entra com e-mail e senha", async () => {
  signIn.mockResolvedValue(undefined);
  const user = setup();
  await render(<LoginScreen />);

  await user.type(screen.getByLabelText("E-mail"), "ana@igreja.com");
  await user.type(screen.getByLabelText("Senha"), "segredo1");
  await user.press(screen.getByRole("button", { name: "Entrar" }));

  expect(signIn).toHaveBeenCalledWith("ana@igreja.com", "segredo1");
  expect(track).toHaveBeenCalledWith("login_succeeded", { method: "password" });
});

test("senha errada mostra mensagem clara, sem o texto do servidor", async () => {
  signIn.mockRejectedValue(new ApiError(401, "Unauthorized"));
  const user = setup();
  await render(<LoginScreen />);

  await user.type(screen.getByLabelText("E-mail"), "ana@igreja.com");
  await user.type(screen.getByLabelText("Senha"), "errada");
  await user.press(screen.getByRole("button", { name: "Entrar" }));

  expect(await screen.findByText("E-mail ou senha incorretos.")).toBeOnTheScreen();
  expect(track).not.toHaveBeenCalled();
});

test("cadastro recusado pela igreja mostra o motivo do servidor", async () => {
  signIn.mockRejectedValue(new ApiError(403, "Seu pedido para entrar foi recusado.", "JOIN_REJECTED"));
  const user = setup();
  await render(<LoginScreen />);

  await user.type(screen.getByLabelText("E-mail"), "ana@igreja.com");
  await user.type(screen.getByLabelText("Senha"), "segredo1");
  await user.press(screen.getByRole("button", { name: "Entrar" }));

  expect(await screen.findByText("Seu pedido para entrar foi recusado.")).toBeOnTheScreen();
});

test("avisa por que a sessão foi encerrada", async () => {
  setup({ signedOutReason: "Sua sessão expirou. Entre de novo." });
  await render(<LoginScreen />);

  expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão expirou. Entre de novo.");
});

test("leva o e-mail digitado para a entrada por código", async () => {
  const user = setup();
  await render(<LoginScreen />);

  await user.type(screen.getByLabelText("E-mail"), "  ana@igreja.com ");
  await user.press(screen.getByRole("button", { name: "Receber código por e-mail" }));

  expect(router.push).toHaveBeenCalledWith({ pathname: "/entrar-com-codigo", params: { email: "ana@igreja.com" } });
});

test("quem é novo encontra os dois caminhos de entrada", async () => {
  const user = setup();
  await render(<LoginScreen />);

  await user.press(screen.getByRole("button", { name: "Minha igreja ainda não usa o Servos" }));
  expect(router.push).toHaveBeenLastCalledWith("/criar-igreja");

  await user.press(screen.getByRole("button", { name: "Entrar com o código da igreja" }));
  expect(router.push).toHaveBeenLastCalledWith("/entrar");
});

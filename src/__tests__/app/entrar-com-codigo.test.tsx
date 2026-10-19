import { act, render, screen, userEvent } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import { ApiError } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import EmailCodeScreen from "@/app/entrar-com-codigo";
import { useSession } from "@/auth/session";
import { track } from "@/lib/analytics";

jest.mock("expo-router", () => ({ useLocalSearchParams: jest.fn() }));
jest.mock("@/auth/session", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/analytics", () => ({ track: jest.fn() }));
jest.mock("@/api/endpoints", () => ({ endpoints: { requestLoginCode: jest.fn() } }));

jest.useFakeTimers();

const signInWithCode = jest.fn();

function setup(params: { email?: string } = {}) {
  jest.mocked(useLocalSearchParams).mockReturnValue(params);
  jest.mocked(useSession).mockReturnValue({ signInWithCode } as unknown as ReturnType<typeof useSession>);
  jest.mocked(endpoints.requestLoginCode).mockResolvedValue({ success: true });
  return userEvent.setup();
}

beforeEach(() => jest.clearAllMocks());

test("recusa e-mail inválido sem chamar o servidor", async () => {
  const user = setup();
  await render(<EmailCodeScreen />);

  await user.type(screen.getByLabelText("E-mail"), "ana@igreja");
  await user.press(screen.getByRole("button", { name: "Enviar código" }));

  expect(screen.getByText("Informe um e-mail válido.")).toBeOnTheScreen();
  expect(endpoints.requestLoginCode).not.toHaveBeenCalled();
});

test("envia o código para o e-mail que veio do login", async () => {
  const user = setup({ email: "Ana@Igreja.com" });
  await render(<EmailCodeScreen />);

  expect(screen.getByLabelText("E-mail")).toHaveDisplayValue("Ana@Igreja.com");
  await user.press(screen.getByRole("button", { name: "Enviar código" }));

  expect(endpoints.requestLoginCode).toHaveBeenCalledWith("Ana@Igreja.com");
  expect(await screen.findByRole("header", { name: "Digite o código" })).toBeOnTheScreen();
  expect(screen.getByText(/Se houver uma conta com ana@igreja\.com/)).toBeOnTheScreen();
});

test("entra sozinho ao completar os 6 dígitos", async () => {
  signInWithCode.mockResolvedValue(undefined);
  const user = setup({ email: "ana@igreja.com" });
  await render(<EmailCodeScreen />);
  await user.press(screen.getByRole("button", { name: "Enviar código" }));

  await user.type(await screen.findByLabelText("Código de 6 dígitos"), "12a3456");

  expect(signInWithCode).toHaveBeenCalledWith("ana@igreja.com", "123456");
  expect(track).toHaveBeenCalledWith("login_succeeded", { method: "email_code" });
});

test("código errado mostra o erro e limpa o campo", async () => {
  signInWithCode.mockRejectedValue(new ApiError(400, "Código inválido ou expirado."));
  const user = setup({ email: "ana@igreja.com" });
  await render(<EmailCodeScreen />);
  await user.press(screen.getByRole("button", { name: "Enviar código" }));

  const input = await screen.findByLabelText("Código de 6 dígitos");
  await user.type(input, "000000");

  expect(await screen.findByText("Código inválido ou expirado.")).toBeOnTheScreen();
  expect(input).toHaveDisplayValue("");
  expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
});

test("só deixa reenviar depois de 45 segundos", async () => {
  const user = setup({ email: "ana@igreja.com" });
  await render(<EmailCodeScreen />);
  await user.press(screen.getByRole("button", { name: "Enviar código" }));

  expect(await screen.findByRole("button", { name: "Reenviar em 45s" })).toBeDisabled();

  // Um tique por vez: cada segundo agenda o próximo depois de renderizar.
  for (let i = 0; i < 45; i++) await act(() => jest.advanceTimersByTime(1000));

  const resend = screen.getByRole("button", { name: "Reenviar código" });
  expect(resend).toBeEnabled();
  await user.press(resend);
  expect(endpoints.requestLoginCode).toHaveBeenCalledTimes(2);
});

test("trocar e-mail volta para o primeiro passo", async () => {
  const user = setup({ email: "ana@igreja.com" });
  await render(<EmailCodeScreen />);
  await user.press(screen.getByRole("button", { name: "Enviar código" }));

  await user.press(await screen.findByRole("button", { name: "Trocar e-mail" }));

  expect(screen.getByRole("header", { name: "Entrar sem senha" })).toBeOnTheScreen();
  expect(screen.getByLabelText("E-mail")).toHaveDisplayValue("ana@igreja.com");
});

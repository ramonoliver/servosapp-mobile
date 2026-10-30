import { render, screen, userEvent } from "@testing-library/react-native";
import { googleConfig, signInWithGoogleProvider, SocialSignInCancelled } from "@/lib/socialAuth";
import { SocialButtons } from "./SocialButtons";

jest.mock("@/lib/socialAuth", () => {
  const actual = jest.requireActual("@/lib/socialAuth");
  return { ...actual, googleConfig: jest.fn(), signInWithGoogleProvider: jest.fn() };
});

jest.useFakeTimers();

const config = { webClientId: "web", iosClientId: "ios", firebaseApiKey: "key" };
const credential = { provider: "google" as const, idToken: "t", name: "Ana Souza", email: "ana@igreja.com" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(googleConfig).mockReturnValue(config);
});

test("sem configuração do Google, não mostra nada", async () => {
  jest.mocked(googleConfig).mockReturnValue(null);
  await render(<SocialButtons onCredential={jest.fn()} onError={jest.fn()} />);

  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
});

test("entra com o Google e entrega a credencial", async () => {
  jest.mocked(signInWithGoogleProvider).mockResolvedValue(credential);
  const onCredential = jest.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  await render(<SocialButtons onCredential={onCredential} onError={jest.fn()} />);

  await user.press(screen.getByRole("button", { name: "Continuar com o Google" }));

  expect(onCredential).toHaveBeenCalledWith(credential);
});

test("fechar a janela do Google não mostra erro", async () => {
  jest.mocked(signInWithGoogleProvider).mockRejectedValue(new SocialSignInCancelled());
  const onError = jest.fn();
  const user = userEvent.setup();
  await render(<SocialButtons onCredential={jest.fn()} onError={onError} />);

  await user.press(screen.getByRole("button", { name: "Continuar com o Google" }));

  expect(onError).not.toHaveBeenCalled();
});

test("falha no Google vira mensagem para a pessoa", async () => {
  jest.mocked(signInWithGoogleProvider).mockRejectedValue(new Error("Não foi possível abrir o Google."));
  const onError = jest.fn();
  const user = userEvent.setup();
  await render(<SocialButtons onCredential={jest.fn()} onError={onError} />);

  await user.press(screen.getByRole("button", { name: "Continuar com o Google" }));

  expect(onError).toHaveBeenCalledWith("Não foi possível abrir o Google.");
});

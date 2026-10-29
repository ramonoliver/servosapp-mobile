import { Platform } from "react-native";
import { appleCodeForAccountDeletion, SocialSignInCancelled } from "./socialAuth";

// O módulo nativo entra pelo carregador (o Jest daqui não roda import() dinâmico).
const isAvailable = jest.fn();
const signIn = jest.fn();
const loadApple = () => Promise.resolve({ isAvailableAsync: isAvailable, signInAsync: signIn });
const usesApple = (value: boolean) => jest.fn(() => Promise.resolve(value));

describe("appleCodeForAccountDeletion", () => {
  const originalOS = Platform.OS;
  const setOS = (os: string) => Object.defineProperty(Platform, "OS", { value: os, configurable: true });

  beforeEach(() => {
    setOS("ios");
    isAvailable.mockReset().mockResolvedValue(true);
    signIn.mockReset().mockResolvedValue({ authorizationCode: "code-1" });
  });
  afterAll(() => setOS(originalOS));

  it("login Apple no iPhone: pede um código novo, sem pedir nome nem e-mail", async () => {
    await expect(appleCodeForAccountDeletion(usesApple(true), loadApple)).resolves.toBe("code-1");
    expect(signIn).toHaveBeenCalledWith({ requestedScopes: [] });
  });

  it("conta sem Apple: não abre a janela da Apple", async () => {
    await expect(appleCodeForAccountDeletion(usesApple(false), loadApple)).resolves.toBeNull();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("não deu para saber se tem Apple: segue sem código", async () => {
    await expect(appleCodeForAccountDeletion(() => Promise.reject(new Error("offline")), loadApple)).resolves.toBeNull();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("fora do iPhone: nem consulta o servidor", async () => {
    setOS("android");
    const check = usesApple(true);
    await expect(appleCodeForAccountDeletion(check, loadApple)).resolves.toBeNull();
    expect(check).not.toHaveBeenCalled();
  });

  it("a pessoa fechou a janela da Apple: avisa quem chamou", async () => {
    signIn.mockRejectedValue(Object.assign(new Error("cancel"), { code: "ERR_REQUEST_CANCELED" }));
    await expect(appleCodeForAccountDeletion(usesApple(true), loadApple)).rejects.toBeInstanceOf(SocialSignInCancelled);
  });

  it("outro erro da Apple, ou recurso indisponível: segue sem código", async () => {
    signIn.mockRejectedValue(new Error("falhou"));
    await expect(appleCodeForAccountDeletion(usesApple(true), loadApple)).resolves.toBeNull();
    isAvailable.mockResolvedValue(false);
    await expect(appleCodeForAccountDeletion(usesApple(true), loadApple)).resolves.toBeNull();
  });

  it("sem o módulo da Apple no build: segue sem código", async () => {
    await expect(appleCodeForAccountDeletion(usesApple(true), () => Promise.reject(new Error("sem módulo")))).resolves.toBeNull();
  });
});

// Criar igreja pelo app: validação dos passos e o formato dos cultos que o
// servidor espera em /api/auth/register (dia "0"–"6", 0 = domingo).

export type Service = { day: number; time: string };

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** O mesmo padrão do servidor: domingo 18h e quarta 19h30. */
export const DEFAULT_SERVICES: Service[] = [
  { day: 0, time: "18:00" },
  { day: 3, time: "19:30" },
];

export function churchStepError(churchName: string, services: Service[]): string | null {
  if (!churchName.trim()) return "Informe o nome da igreja.";
  if (services.length === 0) return "Adicione pelo menos um culto da semana.";
  return null;
}

export function personStepError(p: { name: string; email: string; password: string }): string | null {
  if (p.name.trim().split(/\s+/).length < 2) return "Informe nome e sobrenome.";
  if (!/^\S+@\S+\.\S+$/.test(p.email.trim())) return "Informe um e-mail válido.";
  if (p.password.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
  return null;
}

export function servicesPayload(services: Service[]): { day: string; time: string }[] {
  const seen = new Set<string>();
  return [...services]
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
    .filter((s) => {
      const key = `${s.day}-${s.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({ day: String(s.day), time: s.time }));
}

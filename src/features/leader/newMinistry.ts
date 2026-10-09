// Novo ministério (admin, pastor, coordenação): regras da tela, puras.

export function ministryNameError(name: string): string | null {
  const n = name.trim();
  if (!n) return "Dê um nome ao ministério.";
  if (n.length > 60) return "Use até 60 caracteres.";
  return null;
}

/** "Vocal, violão\nBateria" → ["Vocal", "violão", "Bateria"], sem vazias nem repetidas. */
export function parseFunctionNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,\n]/)) {
    const name = raw.trim().slice(0, 40);
    const key = name.toLocaleLowerCase("pt-BR");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

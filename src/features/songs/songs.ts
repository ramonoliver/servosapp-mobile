import type { Song } from "@/api/contracts";

// Repertório e lista de músicas da escala — regras de tela. Puro.

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Busca por título, artista ou tema, sem acento. */
export function searchSongs(songs: readonly Song[], query: string): Song[] {
  const q = fold(query.trim());
  const list = [...songs].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  if (!q) return list;
  return list.filter((s) => fold(s.title).includes(q) || fold(s.artist || "").includes(q) || fold(s.theme || "").includes(q));
}

export interface DraftItem {
  songId: string;
  key: string;
}

/** Move um item da lista (reordenar sem arrastar — acessível). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const THEMES = ["Adoração", "Louvor", "Comunhão", "Ceia", "Ofertório", "Abertura", "Encerramento", "Natal", "Páscoa"];

export const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"];

/** Link digitado sem "https://" vira link de verdade; texto que não é link some. */
export function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") ? u.toString() : "";
  } catch {
    return "";
  }
}

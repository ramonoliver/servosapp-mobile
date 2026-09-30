import type { Song } from "@/api/contracts";
import { moveItem, normalizeUrl, searchSongs } from "./songs";

const song = (id: string, title: string, artist = "", theme = ""): Song => ({
  id, title, artist, theme, key: "G", bpm: null, lyrics_url: "", chords_url: "", video_url: "", notes: "", department_id: null,
});

describe("repertório", () => {
  it("busca sem acento por título, artista ou tema, em ordem alfabética", () => {
    const list = [song("1", "Rei de Glória", "Ministério X", "Adoração"), song("2", "Águas Purificadoras", "Diante do Trono"), song("3", "Bondade de Deus", "", "Louvor")];
    expect(searchSongs(list, "").map((s) => s.id)).toEqual(["2", "3", "1"]);
    expect(searchSongs(list, "aguas").map((s) => s.id)).toEqual(["2"]);
    expect(searchSongs(list, "trono").map((s) => s.id)).toEqual(["2"]);
    expect(searchSongs(list, "adoracao").map((s) => s.id)).toEqual(["1"]);
  });

  it("reordena sem arrastar", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
  });

  it("links", () => {
    expect(normalizeUrl("youtube.com/watch?v=1")).toBe("https://youtube.com/watch?v=1");
    expect(normalizeUrl(" https://cifraclub.com.br/x ")).toBe("https://cifraclub.com.br/x");
    expect(normalizeUrl("não é link")).toBe("");
    expect(normalizeUrl("")).toBe("");
  });
});

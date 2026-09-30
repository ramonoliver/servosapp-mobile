import type { ChatMessage } from "@/api/contracts";
import { chatTime, toBubbles } from "./chat";

const msg = (id: string, authorId: string, createdAt: string, mine = false): ChatMessage => ({
  id,
  text: id,
  createdAt,
  mine,
  fromLeader: false,
  author: { id: authorId, name: authorId, photoUrl: null, avatarColor: null },
});

describe("conversa: bolhas", () => {
  it("nome só no começo da sequência e separador por dia (fuso da igreja)", () => {
    const b = toBubbles(
      [
        msg("1", "ana", "2026-09-29T13:00:00Z"),
        msg("2", "ana", "2026-09-29T13:01:00Z"),
        msg("3", "eu", "2026-09-29T13:02:00Z", true),
        msg("4", "ana", "2026-09-29T13:03:00Z"),
        msg("5", "ana", "2026-09-30T02:30:00Z"), // 29/09 23h30 em Brasília
        msg("6", "ana", "2026-09-30T12:00:00Z"),
      ],
      (d) => `dia ${d}`,
    );
    expect(b.map((x) => x.showAuthor)).toEqual([true, false, false, true, false, true]);
    expect(b.map((x) => x.dayLabel)).toEqual(["dia 2026-09-29", null, null, null, null, "dia 2026-09-30"]);
    expect(chatTime("2026-09-29T13:05:00Z")).toBe("10:05");
  });
});

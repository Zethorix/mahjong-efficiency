import { describe, expect, test } from "bun:test";
import { applyDiscard, newHand, remainingCounts } from "../src/lib/game";
import { buildWall } from "../src/lib/tiles";

describe("wall", () => {
  test("136 tiles, 4 of each kind, 3 red fives", () => {
    const wall = buildWall();
    expect(wall.length).toBe(136);
    const byKind = new Map<number, number>();
    for (const t of wall) byKind.set(t.kind, (byKind.get(t.kind) ?? 0) + 1);
    expect([...byKind.values()].every((c) => c === 4)).toBe(true);
    expect(wall.filter((t) => t.red).length).toBe(3);
    expect(new Set(wall.filter((t) => t.red).map((t) => t.kind))).toEqual(
      new Set([4, 13, 22]), // 5m 5p 5s
    );
  });
});

describe("game flow", () => {
  test("dealing as South: East opponent discards before your first draw", () => {
    const g = newHand(1, true);
    expect(g.hand.length).toBe(14); // 13 + first draw
    expect(g.phase).toBe("discard");
    const east = g.opponents.find((o) => o.seat === 0)!;
    expect(east.discards.length).toBe(1);
    // West and North act after the player
    expect(g.opponents.find((o) => o.seat === 2)!.discards.length).toBe(0);
    expect(g.opponents.find((o) => o.seat === 3)!.discards.length).toBe(0);
  });

  test("discard advances the round: all opponents act, player draws again", () => {
    const g0 = newHand(0, true); // dealer: player acts first
    const g1 = applyDiscard(g0, g0.hand[0].id);
    if (g1.phase === "tenpai") return; // (astronomically unlikely)
    expect(g1.phase).toBe("discard");
    expect(g1.hand.length).toBe(14);
    expect(g1.discards.length).toBe(1);
    for (const o of g1.opponents) expect(o.discards.length).toBe(1);
    expect(g1.turn).toBe(2);
  });

  test("solo mode has no opponents and a fuller wall", () => {
    const g = newHand(0, false);
    expect(g.opponents.length).toBe(0);
    expect(g.wall.length).toBe(136 - 13 - 1);
  });

  test("remaining counts never exceed 4 or go negative", () => {
    let g = newHand(3, true);
    for (let i = 0; i < 20 && g.phase === "discard"; i++) {
      g = applyDiscard(g, g.hand[Math.floor(Math.random() * g.hand.length)].id);
    }
    const rem = remainingCounts(g);
    expect(rem.every((r) => r >= 0 && r <= 4)).toBe(true);
    expect(rem.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(136 - 13);
  });
});

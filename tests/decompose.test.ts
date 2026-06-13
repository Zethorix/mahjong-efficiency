import { describe, expect, test } from "bun:test";
import { decompose } from "../src/lib/decompose";
import { shanten, standardShanten } from "../src/lib/shanten";
import { buildWall, toCounts, KINDS } from "../src/lib/tiles";

function parse(str: string): number[] {
  const c = new Array(KINDS).fill(0);
  const offset = { m: 0, p: 9, s: 18, z: 27 } as const;
  for (const [, digits, suit] of str.matchAll(/(\d+)([mpsz])/g)) {
    for (const d of digits) c[offset[suit as keyof typeof offset] + Number(d) - 1]++;
  }
  return c;
}

describe("decompose", () => {
  test("complete hand: 4 melds + pair, no floaters", () => {
    const d = decompose(parse("123456789m12344p"));
    expect(d.mode).toBe("standard");
    expect(d.blocks.filter((b) => b.type === "meld").length).toBe(4);
    expect(d.blocks.filter((b) => b.type === "pair").length).toBe(1);
    expect(d.floaters.length).toBe(0);
  });

  test("chiitoi-shaped hand decomposes as pairs", () => {
    const d = decompose(parse("1199m1199p1199s1z"));
    expect(d.mode).toBe("chiitoi");
    expect(d.blocks.length).toBe(6);
    expect(d.floaters).toEqual([27]);
  });

  test("kokushi-shaped hand", () => {
    const d = decompose(parse("19m19p19s1234566z"));
    expect(d.mode).toBe("kokushi");
    expect(d.blocks.filter((b) => b.type === "pair").length).toBe(1);
  });

  test("block score matches standard shanten on random hands", () => {
    for (let i = 0; i < 200; i++) {
      const counts = toCounts(buildWall().slice(0, 13));
      const std = standardShanten([...counts]);
      if (Math.min(std, shanten([...counts])) !== std) continue; // skip chiitoi/kokushi-dominant hands
      const d = decompose(counts);
      if (d.mode !== "standard") continue;
      const melds = d.blocks.filter((b) => b.type === "meld").length;
      const partials = d.blocks.filter((b) => b.type === "partial").length;
      const pair = d.blocks.some((b) => b.type === "pair") ? 1 : 0;
      expect(8 - 2 * melds - partials - pair).toBe(std);
      // all tiles accounted for
      const used = d.blocks.reduce((a, b) => a + b.kinds.length, 0) + d.floaters.length;
      expect(used).toBe(13);
    }
  });
});

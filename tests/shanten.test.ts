import { describe, expect, test } from "bun:test";
import { shanten, chiitoiShanten, kokushiShanten } from "../src/lib/shanten";
import { computeUkeire } from "../src/lib/analysis";
import { KINDS } from "../src/lib/tiles";

/** Parse "123m456p789s11z" notation into counts[34]. */
function parse(str: string): number[] {
  const c = new Array(KINDS).fill(0);
  const offset = { m: 0, p: 9, s: 18, z: 27 } as const;
  for (const [, digits, suit] of str.matchAll(/(\d+)([mpsz])/g)) {
    for (const d of digits) c[offset[suit as keyof typeof offset] + Number(d) - 1]++;
  }
  return c;
}

describe("shanten", () => {
  test("complete standard hand is -1", () => {
    expect(shanten(parse("123456789m12344p"))).toBe(-1);
  });
  test("tenpai standard hand is 0", () => {
    expect(shanten(parse("123456789m1234p"))).toBe(0);
    expect(shanten(parse("123m456p789s1122z"))).toBe(0);
  });
  test("14-tile hand one discard from tenpai is 0", () => {
    expect(shanten(parse("123m456p789s11z22z3z"))).toBe(0);
  });
  test("disconnected hand", () => {
    expect(shanten(parse("147m147p147s1234z"))).toBe(6);
  });
  test("complete chiitoi is -1", () => {
    expect(shanten(parse("1199m1199p1199s11z"))).toBe(-1);
    expect(chiitoiShanten(parse("1199m1199p1199s11z"))).toBe(-1);
  });
  test("chiitoi needs distinct kinds", () => {
    // 5 pairs + a triplet: triplet's 3rd copy doesn't help chiitoi
    expect(chiitoiShanten(parse("1122334455m111p"))).toBe(1);
  });
  test("kokushi tenpai", () => {
    expect(kokushiShanten(parse("19m19p19s1234567z"))).toBe(0);
    expect(shanten(parse("19m19p19s1234567z"))).toBe(0);
    expect(kokushiShanten(parse("19m19p19s123456z6z"))).toBe(0);
  });
  test("typical opening hand values", () => {
    expect(shanten(parse("123m456p11s78s99s5z"))).toBe(1); // needs 6s/9s
    expect(shanten(parse("123m456p789s1145z"))).toBe(1);
  });
});

describe("ukeire", () => {
  test("shanpon tenpai waits on both pair kinds", () => {
    const counts = parse("123m456p789s1122z");
    const remaining = counts.map((v) => 4 - v);
    const u = computeUkeire(counts, remaining);
    expect(u.tiles.map((t) => t.kind).sort((a, b) => a - b)).toEqual([27, 28]);
    expect(u.total).toBe(4);
  });
  test("ryanmen tenpai waits on both sides", () => {
    const c = parse("123m456p789s23s44z"); // 23s ryanmen, 44z pair
    const rem = c.map((v) => 4 - v);
    const u = computeUkeire(c, rem);
    expect(u.tiles.map((t) => t.kind).sort((a, b) => a - b)).toEqual([18, 21]); // 1s, 4s
    expect(u.total).toBe(8);
  });
});

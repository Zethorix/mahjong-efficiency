// Shanten calculation. A hand is a counts[34] array (see tiles.ts for the
// kind encoding). Works for 13- and 14-tile hands: 0 = tenpai, -1 = complete.
import { KINDS } from "./tiles";

type MP = readonly [melds: number, partials: number];

// Memoized Pareto-optimal (melds, partials) decompositions of a single suit.
// The memo persists for the whole session; the state space of 9-tile suit
// count vectors is small in practice, so this makes repeated shanten calls
// (ukeire sweeps, exploration trees) cheap.
const decompMemo = new Map<string, MP[]>();

function pareto(pairs: MP[]): MP[] {
  const out: MP[] = [];
  for (const a of pairs) {
    if (pairs.some((b) => b !== a && b[0] >= a[0] && b[1] >= a[1] && (b[0] > a[0] || b[1] > a[1]))) {
      continue;
    }
    if (!out.some((b) => b[0] === a[0] && b[1] === a[1])) out.push(a);
  }
  return out;
}

function suitDecomp(c: number[]): MP[] {
  const key = c.join("");
  const hit = decompMemo.get(key);
  if (hit) return hit;

  let i = 0;
  while (i < 9 && c[i] === 0) i++;
  if (i === 9) {
    const base: MP[] = [[0, 0]];
    decompMemo.set(key, base);
    return base;
  }

  const results: MP[] = [];
  const recurse = (dm: number, dp: number) => {
    for (const [m, p] of suitDecomp(c)) results.push([m + dm, p + dp]);
  };

  // leave c[i] as a floater
  c[i]--;
  recurse(0, 0);
  c[i]++;
  // triplet
  if (c[i] >= 3) {
    c[i] -= 3;
    recurse(1, 0);
    c[i] += 3;
  }
  // run
  if (i < 7 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--; c[i + 1]--; c[i + 2]--;
    recurse(1, 0);
    c[i]++; c[i + 1]++; c[i + 2]++;
  }
  // pair as a partial set
  if (c[i] >= 2) {
    c[i] -= 2;
    recurse(0, 1);
    c[i] += 2;
  }
  // ryanmen / penchan
  if (i < 8 && c[i + 1] > 0) {
    c[i]--; c[i + 1]--;
    recurse(0, 1);
    c[i]++; c[i + 1]++;
  }
  // kanchan
  if (i < 7 && c[i + 2] > 0) {
    c[i]--; c[i + 2]--;
    recurse(0, 1);
    c[i]++; c[i + 2]++;
  }

  const front = pareto(results);
  decompMemo.set(key, front);
  return front;
}

function honorBlocks(counts: number[]): MP {
  let melds = 0;
  let partials = 0;
  for (let k = 27; k < KINDS; k++) {
    if (counts[k] >= 3) melds++;
    else if (counts[k] === 2) partials++;
  }
  return [melds, partials];
}

/** Best 2*melds + partials with melds + partials <= 4, given fixed honor blocks. */
function bestBlockScore(counts: number[]): number {
  const m = suitDecomp(counts.slice(0, 9));
  const p = suitDecomp(counts.slice(9, 18));
  const s = suitDecomp(counts.slice(18, 27));
  const [hm, hp] = honorBlocks(counts);
  let best = 0;
  for (const [m1, p1] of m) {
    for (const [m2, p2] of p) {
      for (const [m3, p3] of s) {
        const melds = Math.min(m1 + m2 + m3 + hm, 4);
        const partials = Math.min(p1 + p2 + p3 + hp, 4 - melds);
        const score = 2 * melds + partials;
        if (score > best) best = score;
      }
    }
  }
  return best;
}

/** Standard-form (4 sets + pair) shanten. */
export function standardShanten(counts: number[]): number {
  // no pair reserved
  let best = 8 - bestBlockScore(counts);
  // reserve each possible pair
  for (let k = 0; k < KINDS; k++) {
    if (counts[k] >= 2) {
      counts[k] -= 2;
      const sh = 8 - bestBlockScore(counts) - 1;
      counts[k] += 2;
      if (sh < best) best = sh;
    }
  }
  return best;
}

export function chiitoiShanten(counts: number[]): number {
  let pairs = 0;
  let kinds = 0;
  for (let k = 0; k < KINDS; k++) {
    if (counts[k] > 0) kinds++;
    if (counts[k] >= 2) pairs++;
  }
  return 6 - pairs + Math.max(0, 7 - kinds);
}

const TERMINALS_HONORS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

export function kokushiShanten(counts: number[]): number {
  let kinds = 0;
  let hasPair = false;
  for (const k of TERMINALS_HONORS) {
    if (counts[k] > 0) kinds++;
    if (counts[k] >= 2) hasPair = true;
  }
  return 13 - kinds - (hasPair ? 1 : 0);
}

/** Overall shanten: min of standard, seven pairs, thirteen orphans. */
export function shanten(counts: number[]): number {
  return Math.min(standardShanten(counts), chiitoiShanten(counts), kokushiShanten(counts));
}

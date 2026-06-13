import { KINDS } from "./tiles";
import { shanten } from "./shanten";

export interface Ukeire {
  /** kinds that advance the hand, with remaining copies of each */
  tiles: { kind: number; count: number }[];
  /** total remaining copies across all accepted kinds */
  total: number;
}

export interface DiscardOption {
  kind: number;
  shanten: number;
  ukeire: Ukeire;
  /**
   * Two-step ukeire: the sum over accepted draws of (remaining copies × best
   * ukeire of the resulting hand after its best response discard). A speed
   * metric: it blends immediate acceptance with the quality of the shape you
   * advance into, so it agrees with ukeire in direction and breaks ties
   * between equal-ukeire discards.
   */
  nested: number | null;
}

/** remaining[kind] = copies not visible to the player (4 - hand - discards). */
export function remainingFromVisible(visible: number[]): number[] {
  return visible.map((v) => Math.max(0, 4 - v));
}

/** Ukeire of a 13-tile hand. */
export function computeUkeire(counts: number[], remaining: number[]): Ukeire {
  const base = shanten(counts);
  const tiles: { kind: number; count: number }[] = [];
  let total = 0;
  for (let k = 0; k < KINDS; k++) {
    if (counts[k] >= 4 || remaining[k] <= 0) continue;
    counts[k]++;
    const improved = shanten(counts) < base;
    counts[k]--;
    if (improved) {
      tiles.push({ kind: k, count: remaining[k] });
      total += remaining[k];
    }
  }
  return { tiles, total };
}

/** Best ukeire total achievable from a 14-tile hand (over all discards). */
function bestUkeireAfterDiscard(counts: number[], remaining: number[]): number {
  // pass 1: discards that keep the minimum shanten (cheap, shanten only)
  let minShanten = Infinity;
  const candidates: number[] = [];
  for (let k = 0; k < KINDS; k++) {
    if (counts[k] === 0) continue;
    counts[k]--;
    const s = shanten(counts);
    counts[k]++;
    if (s < minShanten) {
      minShanten = s;
      candidates.length = 0;
    }
    if (s === minShanten) candidates.push(k);
  }
  // pass 2: ukeire only for those
  let best = 0;
  for (const k of candidates) {
    counts[k]--;
    const total = computeUkeire(counts, remaining).total;
    counts[k]++;
    if (total > best) best = total;
  }
  return best;
}

function nestedUkeire(counts13: number[], ukeire: Ukeire, remaining: number[]): number {
  let sum = 0;
  for (const { kind, count } of ukeire.tiles) {
    counts13[kind]++;
    remaining[kind]--;
    sum += count * bestUkeireAfterDiscard(counts13, remaining);
    counts13[kind]--;
    remaining[kind]++;
  }
  return sum;
}

export interface HandAnalysis {
  shanten: number; // best shanten over all discards
  options: DiscardOption[]; // sorted best-first
}

/**
 * Counterfactual analysis of a 14-tile hand: shanten and ukeire for every
 * possible discard. Nested ukeire is computed for discards that keep the best
 * shanten (it only matters as a tiebreaker among those).
 */
export function analyzeHand(counts14: number[], remaining: number[]): HandAnalysis {
  const options: DiscardOption[] = [];
  for (let k = 0; k < KINDS; k++) {
    if (counts14[k] === 0) continue;
    counts14[k]--;
    const s = shanten(counts14);
    const u = computeUkeire(counts14, remaining);
    counts14[k]++;
    options.push({ kind: k, shanten: s, ukeire: u, nested: null });
  }
  const best = Math.min(...options.map((o) => o.shanten));
  for (const o of options) {
    if (o.shanten !== best) continue;
    counts14[o.kind]--;
    o.nested = nestedUkeire(counts14, o.ukeire, remaining);
    counts14[o.kind]++;
  }
  options.sort(
    (a, b) =>
      a.shanten - b.shanten ||
      b.ukeire.total - a.ukeire.total ||
      (b.nested ?? 0) - (a.nested ?? 0),
  );
  return { shanten: best, options };
}

// Extracts the actual best block decomposition of a hand — the intermediate
// structure behind the shanten number: melds, the reserved pair, partial sets
// (proto-melds), and leftover floaters.
import { KINDS } from "./tiles";
import { standardShanten, chiitoiShanten, kokushiShanten } from "./shanten";

export interface Block {
  type: "meld" | "pair" | "partial";
  kinds: number[];
}

export interface Decomposition {
  /** which hand form the shanten minimum comes from */
  mode: "standard" | "chiitoi" | "kokushi";
  blocks: Block[];
  /** tiles not used by any block, one entry per tile */
  floaters: number[];
}

const TERMINALS_HONORS = new Set([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);

function floatersOf(counts: number[], blocks: Block[]): number[] {
  const used = new Array(KINDS).fill(0);
  for (const b of blocks) for (const k of b.kinds) used[k]++;
  const out: number[] = [];
  for (let k = 0; k < KINDS; k++) {
    for (let n = used[k]; n < counts[k]; n++) out.push(k);
  }
  return out;
}

function sortBlocks(blocks: Block[]): Block[] {
  const order = { meld: 0, pair: 1, partial: 2 };
  return [...blocks].sort((a, b) => order[a.type] - order[b.type] || a.kinds[0] - b.kinds[0]);
}

/**
 * Best standard-form decomposition: maximizes 2*melds + partials + pair flag
 * with melds + partials <= 4 (the same objective standardShanten optimizes),
 * preferring more melds, then a present pair, among equal scores.
 */
function standardDecomp(counts: number[]): Decomposition {
  const c = [...counts];
  let bestScore = -1;
  let bestMelds = -1;
  let bestPair = -1;
  let bestBlocks: Block[] = [];
  const cur: Block[] = [];

  function go(i: number, melds: number, partials: number, hasPair: boolean) {
    while (i < KINDS && c[i] === 0) i++;
    if (i === KINDS) {
      const score = 2 * melds + partials + (hasPair ? 1 : 0);
      const p = hasPair ? 1 : 0;
      if (
        score > bestScore ||
        (score === bestScore &&
          (melds > bestMelds || (melds === bestMelds && p > bestPair)))
      ) {
        bestScore = score;
        bestMelds = melds;
        bestPair = p;
        bestBlocks = cur.map((b) => ({ type: b.type, kinds: [...b.kinds] }));
      }
      return;
    }
    const inSuit = i < 27;
    const pos = i % 9;
    // leave one tile as a floater
    c[i]--;
    go(i, melds, partials, hasPair);
    c[i]++;
    // triplet (melds and partials share the 4-block cap; dropping a partial
    // instead is explored via the floater branch)
    if (melds + partials < 4 && c[i] >= 3) {
      c[i] -= 3;
      cur.push({ type: "meld", kinds: [i, i, i] });
      go(i, melds + 1, partials, hasPair);
      cur.pop();
      c[i] += 3;
    }
    // run
    if (melds + partials < 4 && inSuit && pos < 7 && c[i + 1] > 0 && c[i + 2] > 0) {
      c[i]--; c[i + 1]--; c[i + 2]--;
      cur.push({ type: "meld", kinds: [i, i + 1, i + 2] });
      go(i, melds + 1, partials, hasPair);
      cur.pop();
      c[i]++; c[i + 1]++; c[i + 2]++;
    }
    if (c[i] >= 2) {
      // the reserved pair (not subject to the 4-block cap)
      if (!hasPair) {
        c[i] -= 2;
        cur.push({ type: "pair", kinds: [i, i] });
        go(i, melds, partials, true);
        cur.pop();
        c[i] += 2;
      }
      // pair as a proto-triplet
      if (melds + partials < 4) {
        c[i] -= 2;
        cur.push({ type: "partial", kinds: [i, i] });
        go(i, melds, partials + 1, hasPair);
        cur.pop();
        c[i] += 2;
      }
    }
    // ryanmen / penchan
    if (melds + partials < 4 && inSuit && pos < 8 && c[i + 1] > 0) {
      c[i]--; c[i + 1]--;
      cur.push({ type: "partial", kinds: [i, i + 1] });
      go(i, melds, partials + 1, hasPair);
      cur.pop();
      c[i]++; c[i + 1]++;
    }
    // kanchan
    if (melds + partials < 4 && inSuit && pos < 7 && c[i + 2] > 0) {
      c[i]--; c[i + 2]--;
      cur.push({ type: "partial", kinds: [i, i + 2] });
      go(i, melds, partials + 1, hasPair);
      cur.pop();
      c[i]++; c[i + 2]++;
    }
  }
  go(0, 0, 0, false);
  const blocks = sortBlocks(bestBlocks);
  return { mode: "standard", blocks, floaters: floatersOf(counts, blocks) };
}

function chiitoiDecomp(counts: number[]): Decomposition {
  const blocks: Block[] = [];
  for (let k = 0; k < KINDS; k++) {
    if (counts[k] >= 2) blocks.push({ type: "pair", kinds: [k, k] });
  }
  return { mode: "chiitoi", blocks, floaters: floatersOf(counts, blocks) };
}

function kokushiDecomp(counts: number[]): Decomposition {
  const blocks: Block[] = [];
  for (const k of TERMINALS_HONORS) {
    if (counts[k] >= 2) {
      blocks.push({ type: "pair", kinds: [k, k] });
      break; // only one pair matters for thirteen orphans
    }
  }
  return { mode: "kokushi", blocks, floaters: floatersOf(counts, blocks) };
}

/** Decomposition matching whichever form gives the hand its shanten value. */
export function decompose(counts: number[]): Decomposition {
  const std = standardShanten([...counts]);
  const chii = chiitoiShanten(counts);
  const kok = kokushiShanten(counts);
  if (chii < std && chii <= kok) return chiitoiDecomp(counts);
  if (kok < std && kok < chii) return kokushiDecomp(counts);
  return standardDecomp(counts);
}

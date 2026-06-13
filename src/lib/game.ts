import { buildWall, toCounts, type Tile, type Wind } from "./tiles";
import { shanten } from "./shanten";

export interface Opponent {
  seat: Wind;
  hand: Tile[];
  discards: Tile[];
}

/** Snapshot taken at the moment of a player discard, for counterfactual review. */
export interface DiscardReview {
  counts14: number[];
  /** unseen copies per kind at decision time (4 - own hand - all discards) */
  remaining: number[];
  chosenKind: number;
  chosenRed: boolean;
  turn: number;
}

export type Phase = "idle" | "discard" | "tenpai" | "exhausted";

export interface GameState {
  wall: Tile[];
  hand: Tile[];
  drawnId: number | null;
  discards: Tile[];
  opponents: Opponent[];
  seat: Wind;
  phase: Phase;
  /** one snapshot per player discard, oldest first */
  reviews: DiscardReview[];
  turn: number;
}

/** Counts of every tile the player can see (own hand + every discard pile). */
export function visibleCounts(s: GameState): number[] {
  const c = toCounts(s.hand);
  for (const t of s.discards) c[t.kind]++;
  for (const o of s.opponents) for (const t of o.discards) c[t.kind]++;
  return c;
}

export function remainingCounts(s: GameState): number[] {
  return visibleCounts(s).map((v) => Math.max(0, 4 - v));
}

function clone(s: GameState): GameState {
  return {
    ...s,
    wall: [...s.wall],
    hand: [...s.hand],
    discards: [...s.discards],
    reviews: [...s.reviews],
    opponents: s.opponents.map((o) => ({
      ...o,
      hand: [...o.hand],
      discards: [...o.discards],
    })),
  };
}

/** Opponent draws and discards a random tile from their hand. */
function opponentTurn(o: Opponent, wall: Tile[]): boolean {
  const drawn = wall.pop();
  if (!drawn) return false;
  o.hand.push(drawn);
  const i = Math.floor(Math.random() * o.hand.length);
  o.discards.push(o.hand.splice(i, 1)[0]);
  return true;
}

function playerDraw(s: GameState): boolean {
  const drawn = s.wall.pop();
  if (!drawn) {
    s.phase = "exhausted";
    return false;
  }
  s.hand.push(drawn);
  s.drawnId = drawn.id;
  s.phase = "discard";
  return true;
}

export function newHand(seat: Wind, opponentsEnabled: boolean): GameState {
  const wall = buildWall();
  const hand = wall.splice(0, 13);
  const opponents: Opponent[] = opponentsEnabled
    ? [1, 2, 3].map((i) => ({
        seat: ((seat + i) % 4) as Wind,
        hand: wall.splice(0, 13),
        discards: [],
      }))
    : [];

  const s: GameState = {
    wall,
    hand,
    drawnId: null,
    discards: [],
    opponents,
    seat,
    phase: "idle",
    reviews: [],
    turn: 1,
  };
  // The round starts from the dealer (East). Opponents seated before the
  // player act before the player's first draw.
  for (const o of [...opponents].sort((a, b) => a.seat - b.seat)) {
    if (o.seat < seat) opponentTurn(o, s.wall);
  }
  playerDraw(s);
  return s;
}

/** Opponents after the player act, then the player draws. */
function advanceRound(s: GameState) {
  const order = [...s.opponents].sort(
    (a, b) => ((a.seat - s.seat + 4) % 4) - ((b.seat - s.seat + 4) % 4),
  );
  for (const o of order) {
    if (!opponentTurn(o, s.wall)) {
      s.phase = "exhausted";
      return;
    }
  }
  s.turn++;
  playerDraw(s);
}

export function applyDiscard(prev: GameState, tileId: number): GameState {
  const s = clone(prev);
  const i = s.hand.findIndex((t) => t.id === tileId);
  if (i === -1 || s.phase !== "discard") return prev;

  const chosen = s.hand[i];
  s.reviews.push({
    counts14: toCounts(s.hand),
    remaining: remainingCounts(s),
    chosenKind: chosen.kind,
    chosenRed: chosen.red,
    turn: s.turn,
  });
  s.hand.splice(i, 1);
  s.discards.push(chosen);
  s.drawnId = null;

  if (shanten(toCounts(s.hand)) <= 0) {
    s.phase = "tenpai";
    return s;
  }
  advanceRound(s);
  return s;
}

/** Keep practicing past tenpai. */
export function continuePlay(prev: GameState): GameState {
  if (prev.phase !== "tenpai") return prev;
  const s = clone(prev);
  advanceRound(s);
  return s;
}

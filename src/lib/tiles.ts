// Tile kinds are 0..33:
//   0-8   man 1-9
//   9-17  pin 1-9
//   18-26 sou 1-9
//   27-30 winds E S W N
//   31    haku (white dragon)
//   32    hatsu (green dragon)
//   33    chun (red dragon)
export const KINDS = 34;

export interface Tile {
  id: number; // unique within a wall (0..135)
  kind: number;
  red: boolean; // red five
}

export type Wind = 0 | 1 | 2 | 3; // E S W N

export const WIND_NAMES = ["East", "South", "West", "North"] as const;
export const WIND_KANJI = ["東", "南", "西", "北"] as const;

const HONOR_NAMES = ["East", "South", "West", "North", "Haku", "Hatsu", "Chun"];
const HONOR_FILES = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"];

export function suitOf(kind: number): "m" | "p" | "s" | "z" {
  if (kind < 9) return "m";
  if (kind < 18) return "p";
  if (kind < 27) return "s";
  return "z";
}

export function rankOf(kind: number): number {
  return kind < 27 ? (kind % 9) + 1 : kind - 26;
}

/** Short notation, e.g. "5m", "E", "Haku". */
export function kindLabel(kind: number): string {
  const s = suitOf(kind);
  return s === "z" ? HONOR_NAMES[kind - 27] : `${rankOf(kind)}${s}`;
}

/** SVG file basename for a tile. */
export function tileImage(kind: number, red = false): string {
  const s = suitOf(kind);
  if (s === "z") return HONOR_FILES[kind - 27];
  return red ? `r5${s}` : `${rankOf(kind)}${s}`;
}

export function isFiveOfSuit(kind: number): boolean {
  return kind < 27 && kind % 9 === 4;
}

/** Build the full 136-tile wall; one five per suit is red. */
export function buildWall(rng: () => number = Math.random): Tile[] {
  const wall: Tile[] = [];
  let id = 0;
  for (let kind = 0; kind < KINDS; kind++) {
    for (let copy = 0; copy < 4; copy++) {
      wall.push({ id: id++, kind, red: isFiveOfSuit(kind) && copy === 0 });
    }
  }
  // Fisher-Yates shuffle
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

/** counts[kind] for a list of tiles. */
export function toCounts(tiles: Iterable<Tile>): number[] {
  const c = new Array(KINDS).fill(0);
  for (const t of tiles) c[t.kind]++;
  return c;
}

/** Sort for display: by kind, red five before normal fives of same kind. */
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort(
    (a, b) => a.kind - b.kind || Number(b.red) - Number(a.red) || a.id - b.id,
  );
}

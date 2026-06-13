import { useEffect, useMemo, useState } from "react";
import { Shuffle, ArrowRight, ChevronDown } from "lucide-react";
import {
  applyDiscard,
  continuePlay,
  newHand,
  remainingCounts,
  type GameState,
  type Opponent,
} from "./lib/game";
import {
  sortTiles,
  toCounts,
  WIND_KANJI,
  WIND_NAMES,
  type Tile,
  type Wind,
} from "./lib/tiles";
import { shanten } from "./lib/shanten";
import { computeUkeire } from "./lib/analysis";
import { TileImg } from "./components/TileImg";
import { ReviewHistory } from "./components/AnalysisPanel";
import { CountsPanel, DOT_COLORS } from "./components/CountsPanel";
import { Button } from "./components/ui/button";
import { LabeledSwitch } from "./components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { InfoTip } from "./components/ui/tooltip";
import { cn } from "./lib/utils";

function SeatBadge({ seat, you }: { seat: Wind; you?: boolean }) {
  return (
    <span
      className={cn(
        "flex w-24 shrink-0 items-center gap-1.5 text-xs",
        you ? "text-emerald-300" : "text-zinc-400",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-md text-sm font-bold",
          you ? "bg-emerald-500/20" : "bg-zinc-800",
        )}
      >
        {WIND_KANJI[seat]}
      </span>
      <span className="leading-tight">
        {WIND_NAMES[seat]}
        {you && <span className="block text-[10px] text-emerald-400/80">you</span>}
      </span>
    </span>
  );
}

function DiscardRow({
  tiles,
  highlightKind,
  onHoverKind,
}: {
  tiles: Tile[];
  highlightKind: number | null;
  onHoverKind: (kind: number | null) => void;
}) {
  return (
    <div className="flex min-h-8 flex-1 flex-wrap content-start gap-1">
      {tiles.map((t) => (
        <span
          key={t.id}
          onMouseEnter={() => onHoverKind(t.kind)}
          onMouseLeave={() => onHoverKind(null)}
        >
          <TileImg
            kind={t.kind}
            red={t.red}
            size="sm"
            className={cn(
              "rounded-xs transition-shadow",
              highlightKind === t.kind && "ring-2 ring-amber-400/90",
            )}
          />
        </span>
      ))}
      {tiles.length === 0 && <span className="self-center text-xs text-white/30">—</span>}
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [seat, setSeat] = useState<Wind | "random">("random");
  const [opponentsEnabled, setOpponentsEnabled] = useState(true);
  const [showCounts, setShowCounts] = useState(true);
  /**
   * Tile kind under the cursor and where it's being hovered. Matching tiles
   * highlight in the other areas; hand tiles only highlight when the hover
   * comes from outside the hand.
   */
  const [hover, setHover] = useState<{
    kind: number;
    source: "hand" | "discard" | "wall";
  } | null>(null);

  // deal automatically on first load (random seat, opponents on)
  useEffect(() => {
    setGame((g) => g ?? newHand(Math.floor(Math.random() * 4) as Wind, true));
  }, []);

  // ---- derived ----
  const remaining = useMemo(() => (game ? remainingCounts(game) : null), [game]);
  const totalPenalty = useMemo(
    () => game?.reviews.reduce((a, r) => a + r.eff.penalty, 0) ?? 0,
    [game],
  );
  const handCounts = useMemo(() => (game ? toCounts(game.hand) : null), [game]);
  const currentShanten = useMemo(
    () => (handCounts ? shanten([...handCounts]) : null),
    [handCounts],
  );
  const waits = useMemo(() => {
    if (!game || !remaining || !handCounts || game.phase !== "tenpai") return null;
    return computeUkeire([...handCounts], remaining);
  }, [game, remaining, handCounts]);

  const deal = () => {
    setHover(null);
    const s = seat === "random" ? (Math.floor(Math.random() * 4) as Wind) : seat;
    setGame(newHand(s, opponentsEnabled));
  };
  const discard = (tileId: number) => {
    // the hovered tile unmounts on discard, so mouseleave never fires
    setHover(null);
    setGame((g) => (g ? applyDiscard(g, tileId) : g));
  };

  // hand display: 13 sorted + the drawn tile set apart
  const { sortedHand, drawnTile } = useMemo(() => {
    if (!game) return { sortedHand: [] as Tile[], drawnTile: null as Tile | null };
    const drawn = game.hand.find((t) => t.id === game.drawnId) ?? null;
    return {
      sortedHand: sortTiles(drawn ? game.hand.filter((t) => t !== drawn) : game.hand),
      drawnTile: drawn,
    };
  }, [game]);

  const seatRows: (Opponent | "you")[] | null = game
    ? [...Array(4).keys()]
        .map((w) =>
          w === game.seat ? ("you" as const) : game.opponents.find((o) => o.seat === w),
        )
        .filter((r): r is Opponent | "you" => r !== undefined)
    : null;

  const canDiscard = game?.phase === "discard";

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      {/* header */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <TileImg kind={33} size="xs" className="inline" />
          Riichi Efficiency Trainer
        </h1>
        <Button onClick={deal}>
          <Shuffle className="size-4" />
          New hand
        </Button>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Seat
          <select
            value={seat}
            onChange={(e) =>
              setSeat(
                e.target.value === "random" ? "random" : (Number(e.target.value) as Wind),
              )
            }
            className="h-8 rounded-md bg-zinc-800 px-2 text-sm ring-1 ring-zinc-700 outline-none focus:ring-emerald-500/60"
          >
            <option value="random">Random</option>
            {WIND_NAMES.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {game && (
          <div className="ml-auto flex items-center gap-3 text-xs text-zinc-400 tabular-nums">
            <span>Round: East</span>
            <span>Turn {game.turn}</span>
          </div>
        )}
      </header>

      {game && seatRows && (
        <Card className="bg-gradient-to-b from-felt-700 to-felt-900 ring-felt-800">
          <CardContent className="space-y-2.5 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-emerald-50/90">Table discards</CardTitle>
              <span className="grow" />
              {opponentsEnabled !== (game.opponents.length > 0) && (
                <span className="text-[11px] text-amber-200/90">
                  takes effect next hand —{" "}
                  <button
                    onClick={deal}
                    className="cursor-pointer underline underline-offset-2 hover:text-amber-100"
                  >
                    deal now
                  </button>
                </span>
              )}
              <LabeledSwitch
                label="Opponents"
                checked={opponentsEnabled}
                onCheckedChange={setOpponentsEnabled}
              />
            </div>
            {seatRows.map((row, i) =>
              row === "you" ? (
                <div key="you" className="flex items-start gap-3">
                  <SeatBadge seat={game.seat} you />
                  <DiscardRow
                    tiles={game.discards}
                    highlightKind={hover?.kind ?? null}
                    onHoverKind={(k) =>
                      setHover(k === null ? null : { kind: k, source: "discard" })
                    }
                  />
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3">
                  <SeatBadge seat={row.seat} />
                  <DiscardRow
                    tiles={row.discards}
                    highlightKind={hover?.kind ?? null}
                    onHoverKind={(k) =>
                      setHover(k === null ? null : { kind: k, source: "discard" })
                    }
                  />
                </div>
              ),
            )}
          </CardContent>
        </Card>
      )}

      {/* wall distribution */}
      {game && remaining && (
        <Card>
          <button
            onClick={() => setShowCounts((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left outline-none hover:bg-zinc-800/30 rounded-xl"
            aria-expanded={showCounts}
          >
            <CardTitle>Tiles remaining (unseen)</CardTitle>
            <span className="text-xs text-zinc-500 tabular-nums">
              {game.wall.length} in the live wall
            </span>
            {showCounts && (
              <span className="ml-auto flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className={cn("rounded-full", DOT_COLORS.hand)} />
                  your hand
                </span>
                <span className="flex items-center gap-1">
                  <span className={cn("rounded-full", DOT_COLORS.unseen)} />
                  unseen
                </span>
                <span className="flex items-center gap-1">
                  <span className={cn("rounded-full", DOT_COLORS.discarded)} />
                  discarded
                </span>
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-4 text-zinc-500 transition-transform",
                !showCounts && "ml-auto -rotate-90",
              )}
            />
          </button>
          {showCounts && (
            <CardContent>
              <CountsPanel
                remaining={remaining}
                inHand={handCounts ?? undefined}
                highlightKind={hover?.kind ?? null}
                onHoverKind={(k) =>
                  setHover(k === null ? null : { kind: k, source: "wall" })
                }
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* status banners */}
      {game?.phase === "tenpai" && waits && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/40">
          <span className="text-lg font-bold text-emerald-300">Tenpai!</span>
          <span className="text-sm text-emerald-200/80">waiting on</span>
          <div className="flex flex-wrap gap-1.5">
            {waits.tiles.map(({ kind, count }) => (
              <span key={kind} className="flex items-center gap-1">
                <TileImg kind={kind} size="sm" />
                <span className="text-xs text-emerald-200/80 tabular-nums">×{count}</span>
              </span>
            ))}
          </div>
          <span className="text-sm font-semibold text-emerald-300 tabular-nums">
            {waits.total} tiles
          </span>
          <span className="text-xs text-emerald-200/70 tabular-nums">
            {totalPenalty < 0.005
              ? "— played perfectly"
              : `— +${totalPenalty.toFixed(1)} expected draws vs optimal`}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setGame(continuePlay(game))}>
              Keep drawing <ArrowRight className="size-3.5" />
            </Button>
            <Button size="sm" onClick={deal}>
              <Shuffle className="size-3.5" /> New hand
            </Button>
          </div>
        </div>
      )}
      {game?.phase === "exhausted" && (
        <div className="flex items-center gap-3 rounded-xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-500/40">
          <span className="font-semibold text-rose-300">Wall exhausted</span>
          <span className="text-sm text-rose-200/70">no tiles left to draw.</span>
          <Button size="sm" className="ml-auto" onClick={deal}>
            <Shuffle className="size-3.5" /> New hand
          </Button>
        </div>
      )}

      {/* player hand */}
      {game && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-2 flex items-center gap-3 text-xs text-zinc-400">
              <span>
                Your hand — {WIND_NAMES[game.seat]} seat
                {canDiscard ? ", click a tile to discard" : ""}
              </span>
              {currentShanten !== null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium ring-1",
                    currentShanten <= 0
                      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                      : "bg-zinc-800 text-zinc-300 ring-zinc-700",
                  )}
                >
                  {currentShanten === -1
                    ? "Complete hand!"
                    : currentShanten === 0
                      ? "Tenpai"
                      : `${currentShanten}-shanten`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-1">
              {sortedHand.map((t) => (
                <button
                  key={t.id}
                  disabled={!canDiscard}
                  onClick={() => discard(t.id)}
                  onMouseEnter={() => setHover({ kind: t.kind, source: "hand" })}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "transition-transform duration-150 outline-none",
                    canDiscard &&
                      "cursor-pointer hover:-translate-y-2 focus-visible:-translate-y-2",
                  )}
                >
                  <TileImg
                    kind={t.kind}
                    red={t.red}
                    size="lg"
                    className={cn(
                      "rounded-xs transition-shadow",
                      hover !== null &&
                        hover.kind === t.kind &&
                        hover.source !== "hand" &&
                        "ring-2 ring-amber-400/90",
                    )}
                  />
                </button>
              ))}
              {drawnTile && (
                <button
                  disabled={!canDiscard}
                  onClick={() => discard(drawnTile.id)}
                  onMouseEnter={() => setHover({ kind: drawnTile.kind, source: "hand" })}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "ml-4 transition-transform duration-150 outline-none",
                    canDiscard &&
                      "cursor-pointer hover:-translate-y-2 focus-visible:-translate-y-2",
                  )}
                >
                  <TileImg
                    kind={drawnTile.kind}
                    red={drawnTile.red}
                    size="lg"
                    className={cn(
                      "rounded-xs transition-shadow",
                      hover !== null &&
                        hover.kind === drawnTile.kind &&
                        hover.source !== "hand" &&
                        "ring-2 ring-amber-400/90",
                    )}
                  />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* discard analysis */}
      {game && (
        <Card className="min-w-0">
          <CardHeader className="flex flex-wrap items-center gap-2">
            <CardTitle>Discard review</CardTitle>
            {game.reviews.length > 0 && (
              <span className="ml-auto">
                <InfoTip
                  label={
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        totalPenalty < 0.005 ? "text-emerald-300" : "text-amber-300",
                      )}
                    >
                      {totalPenalty < 0.005
                        ? `perfectly efficient · ${game.reviews.length} discards`
                        : `+${totalPenalty.toFixed(1)} expected draws vs optimal · ${game.reviews.length} discards`}
                    </span>
                  }
                >
                  Your efficiency score. Each discard takes about wall ÷ ukeire
                  expected draws to advance the hand; this sums how many extra
                  expected draws your picks cost compared to the best pick each
                  turn (shanten given up counts as a full extra advance). 0 means
                  you matched the engine every turn.
                </InfoTip>
              </span>
            )}
          </CardHeader>
          <CardContent>
            {game.reviews.length > 0 ? (
              <ReviewHistory reviews={game.reviews} />
            ) : (
              <p className="text-sm text-zinc-500">
                Make your first discard to see the efficiency breakdown of every
                counterfactual choice.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <footer className="pb-4 text-center text-[11px] text-zinc-600">
        Tile art from Wikimedia Commons (SVG planar illustrations of Mahjong tiles).
        Ukeire counts use only tiles you can see; red fives are tracked as normal fives
        for efficiency.
      </footer>
    </div>
  );
}

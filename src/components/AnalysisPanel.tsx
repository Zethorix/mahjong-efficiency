import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { analyzeHand, type DiscardOption, type Ukeire } from "../lib/analysis";
import { decompose } from "../lib/decompose";
import type { DiscardReview } from "../lib/game";
import { shanten } from "../lib/shanten";
import { kindLabel } from "../lib/tiles";
import { cn } from "../lib/utils";
import { TileImg } from "./TileImg";
import { InfoTip } from "./ui/tooltip";

const MAX_DEPTH = 4;

// shared column template so the header lines up with the rows
const COLS =
  "grid items-center gap-x-2 grid-cols-[1rem_2.25rem_5.25rem_6.5rem_4rem_minmax(0,1fr)_auto]";

function shantenLabel(s: number): string {
  if (s <= -1) return "Win";
  if (s === 0) return "Tenpai";
  return `${s}-shanten`;
}

function shantenBadgeClass(s: number, best: number): string {
  if (s <= 0) return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (s === best) return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
  return "bg-zinc-700/40 text-zinc-400 ring-zinc-600/40";
}

function UkeireChips({
  ukeire,
  openKind,
  onToggle,
}: {
  ukeire: Ukeire;
  openKind?: number | null;
  onToggle?: (kind: number) => void;
}) {
  if (ukeire.tiles.length === 0) {
    return <span className="text-xs text-zinc-500">no improving tiles</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ukeire.tiles.map(({ kind, count }) => {
        const open = openKind === kind;
        const chip = (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded px-0.5 py-0.5",
              onToggle && "hover:bg-zinc-700/60 transition-colors",
              open && "bg-emerald-500/20 ring-1 ring-emerald-500/40",
            )}
          >
            <TileImg kind={kind} size="xs" />
            <span className="text-[10px] font-medium text-zinc-400 tabular-nums">
              ×{count}
            </span>
          </span>
        );
        return onToggle ? (
          <button
            key={kind}
            onClick={() => onToggle(kind)}
            className="cursor-pointer"
            title={`Explore drawing ${kindLabel(kind)}`}
          >
            {chip}
          </button>
        ) : (
          <span key={kind}>{chip}</span>
        );
      })}
    </div>
  );
}

const BLOCK_STYLES = {
  meld: "ring-emerald-500/50 bg-emerald-500/10",
  pair: "ring-amber-400/50 bg-amber-400/10",
  partial: "ring-sky-500/40 bg-sky-500/10",
} as const;

const BLOCK_TITLES = {
  meld: "meld (complete set)",
  pair: "pair",
  partial: "partial set (one tile from a meld)",
} as const;

/**
 * The hand's structure as the shanten algorithm sees it: melds, the reserved
 * pair, partial sets, and floaters.
 */
function HandShape({ counts }: { counts: number[] }) {
  const d = useMemo(() => decompose(counts), [counts]);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {d.mode !== "standard" && (
        <span className="rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
          {d.mode === "chiitoi" ? "seven pairs" : "thirteen orphans"}
        </span>
      )}
      {d.blocks.map((b, i) => (
        <span
          key={i}
          title={BLOCK_TITLES[b.type]}
          className={cn("flex gap-px rounded-md px-1 py-0.5 ring-1", BLOCK_STYLES[b.type])}
        >
          {b.kinds.map((k, j) => (
            <TileImg key={j} kind={k} size="xs" />
          ))}
        </span>
      ))}
      {d.floaters.length > 0 && (
        <span
          title="floaters (not part of any block)"
          className="flex gap-px rounded-md px-1 py-0.5 ring-1 ring-zinc-700/60 opacity-45"
        >
          {d.floaters.map((k, j) => (
            <TileImg key={j} kind={k} size="xs" />
          ))}
        </span>
      )}
    </div>
  );
}

/** Column headers with hover-card explanations. */
function HeaderRow() {
  const headerTip = "justify-self-start text-left";
  return (
    <div
      className={cn(COLS, "px-2 pb-1 text-[10px] font-medium tracking-wide text-zinc-500")}
    >
      <span />
      <span>Cut</span>
      <InfoTip label="Shanten" className={headerTip}>
        How far the remaining 13 tiles are from tenpai after this discard. Tenpai
        means one tile away from a complete hand.
      </InfoTip>
      <InfoTip label="Ukeire" className={headerTip}>
        How many unseen tiles advance the hand toward tenpai — the sum of remaining
        copies of every accepted draw.
      </InfoTip>
      <InfoTip label="2-step" className={headerTip}>
        For each accepted draw: remaining copies × the best ukeire of the hand
        after that draw, summed up. Blends immediate acceptance with the quality
        of the shape you advance into; breaks ties between discards with equal
        ukeire.
      </InfoTip>
      <span>Accepted draws</span>
      <span />
    </div>
  );
}

/**
 * One candidate discard: shanten, ukeire, tiebreak score — expandable into
 * "what if I draw each accepted tile next" subtrees.
 */
function OptionRow({
  option,
  counts14,
  remaining,
  bestShanten,
  maxUkeire,
  maxNested,
  chosen,
  isBest,
  depth,
}: {
  option: DiscardOption;
  counts14: number[];
  remaining: number[];
  bestShanten: number;
  maxUkeire: number;
  maxNested: number;
  chosen?: boolean;
  isBest?: boolean;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const expandable = depth < MAX_DEPTH && option.ukeire.tiles.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg ring-1 ring-transparent",
        chosen && "bg-amber-500/5 ring-amber-500/30",
        isBest && !chosen && "bg-emerald-500/5 ring-emerald-500/20",
      )}
    >
      <div
        className={cn(
          COLS,
          "px-2 py-1.5",
          expandable && "cursor-pointer hover:bg-zinc-800/40 rounded-lg",
        )}
        onClick={expandable ? () => setOpen((v) => !v) : undefined}
        title={expandable ? "Click to explore follow-up draws" : undefined}
      >
        <span className="text-zinc-500">
          {expandable &&
            (open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />)}
        </span>
        <TileImg kind={option.kind} size="sm" />
        <span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 whitespace-nowrap",
              shantenBadgeClass(option.shanten, bestShanten),
            )}
          >
            {shantenLabel(option.shanten)}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 text-right text-sm font-semibold tabular-nums text-zinc-100">
            {option.ukeire.total}
          </span>
          {option.shanten === bestShanten && (
            <span className="h-1.5 w-12 rounded-full bg-zinc-800 overflow-hidden">
              <span
                className="block h-full rounded-full bg-sky-400/90"
                style={{ width: `${(100 * option.ukeire.total) / maxUkeire}%` }}
              />
            </span>
          )}
        </span>
        {option.nested !== null ? (
          <span
            className={cn(
              "justify-self-start rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ring-1",
              option.nested === maxNested && option.ukeire.total === maxUkeire
                ? "bg-violet-500/20 font-bold text-violet-200 ring-violet-400/40"
                : "bg-zinc-800 text-zinc-400 ring-zinc-700/60",
            )}
            title="Σ accepted copies × next-hand ukeire (tiebreaker among equal-shanten discards)"
          >
            {Math.round(option.nested)}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-600">–</span>
        )}
        <div className="min-w-0">
          <UkeireChips ukeire={option.ukeire} />
        </div>
        <span className="flex gap-1">
          {chosen && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 whitespace-nowrap">
              your pick
            </span>
          )}
          {isBest && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              best
            </span>
          )}
        </span>
      </div>
      {open && (
        <div className="mb-1 ml-9 border-l border-zinc-800 pl-3">
          <ShapeAfterCut counts14={counts14} discard={option.kind} />
          <DrawExplorer
            counts14={counts14}
            discard={option.kind}
            ukeire={option.ukeire}
            remaining={remaining}
            depth={depth}
          />
        </div>
      )}
    </div>
  );
}

/** Hand structure of the 13 tiles left after a hypothetical discard. */
function ShapeAfterCut({ counts14, discard }: { counts14: number[]; discard: number }) {
  const counts13 = useMemo(() => {
    const c = [...counts14];
    c[discard]--;
    return c;
  }, [counts14, discard]);
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
      <span className="shrink-0">hand shape:</span>
      <HandShape counts={counts13} />
    </div>
  );
}

/** After a hypothetical discard: pick an accepted draw to explore further. */
function DrawExplorer({
  counts14,
  discard,
  ukeire,
  remaining,
  depth,
}: {
  counts14: number[];
  discard: number;
  ukeire: Ukeire;
  remaining: number[];
  depth: number;
}) {
  const [openKind, setOpenKind] = useState<number | null>(null);
  const [showOthers, setShowOthers] = useState(false);

  const child = useMemo(() => {
    if (openKind === null) return null;
    const counts = [...counts14];
    counts[discard]--;
    counts[openKind]++;
    const rem = [...remaining];
    rem[openKind]--;
    return { counts, rem };
  }, [openKind, counts14, discard, remaining]);

  // draws that don't improve shanten but are still possible
  const others = useMemo(() => {
    const accepted = new Set(ukeire.tiles.map((t) => t.kind));
    const tiles: { kind: number; count: number }[] = [];
    for (let k = 0; k < remaining.length; k++) {
      const held = counts14[k] - (k === discard ? 1 : 0);
      if (!accepted.has(k) && remaining[k] > 0 && held < 4) {
        tiles.push({ kind: k, count: remaining[k] });
      }
    }
    return { tiles, total: tiles.reduce((a, t) => a + t.count, 0) };
  }, [counts14, discard, remaining, ukeire]);

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        then draw:
        <UkeireChips
          ukeire={ukeire}
          openKind={openKind}
          onToggle={(k) => setOpenKind((v) => (v === k ? null : k))}
        />
      </div>
      {!showOthers && others.tiles.length > 0 && (
        <button
          onClick={() => setShowOthers(true)}
          className="text-[11px] text-zinc-600 hover:text-zinc-400 cursor-pointer"
        >
          or another (non-improving) draw…
        </button>
      )}
      {showOthers && (
        <div className="flex items-start gap-2 text-[11px] text-zinc-500">
          <span className="shrink-0 pt-1">or draw:</span>
          <UkeireChips
            ukeire={others}
            openKind={openKind}
            onToggle={(k) => setOpenKind((v) => (v === k ? null : k))}
          />
        </div>
      )}
      {child && openKind !== null && (
        <div className="border-l border-zinc-800 pl-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
            after drawing <TileImg kind={openKind} size="xs" /> — best responses:
          </div>
          <OptionList counts14={child.counts} remaining={child.rem} depth={depth + 1} limit={5} />
        </div>
      )}
    </div>
  );
}

/** Ranked discard options for a 14-tile hand (recursive tree node). */
function OptionList({
  counts14,
  remaining,
  depth,
  limit,
  chosenKind,
  showHeader = false,
}: {
  counts14: number[];
  remaining: number[];
  depth: number;
  limit?: number;
  chosenKind?: number;
  showHeader?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const analysis = useMemo(
    () => analyzeHand([...counts14], [...remaining]),
    [counts14, remaining],
  );
  // bars only render on optimal-shanten rows, so normalize against those
  const maxUkeire = Math.max(
    1,
    ...analysis.options
      .filter((o) => o.shanten === analysis.shanten)
      .map((o) => o.ukeire.total),
  );
  // the violet pill marks the best tiebreak only among top-ukeire rows —
  // 2-step can be larger on a lower-ukeire row, which shouldn't steal it
  const maxNested = Math.max(
    ...analysis.options
      .filter((o) => o.shanten === analysis.shanten && o.ukeire.total === maxUkeire)
      .map((o) => o.nested ?? -Infinity),
  );
  const visible =
    limit && !showAll
      ? analysis.options.filter((o, i) => i < limit || o.kind === chosenKind)
      : analysis.options;
  const hidden = analysis.options.length - visible.length;

  return (
    <div className="space-y-0.5">
      {showHeader && <HeaderRow />}
      {visible.map((o) => (
        <OptionRow
          key={o.kind}
          option={o}
          counts14={counts14}
          remaining={remaining}
          bestShanten={analysis.shanten}
          maxUkeire={maxUkeire}
          maxNested={maxNested}
          chosen={chosenKind === o.kind}
          isBest={
            o.shanten === analysis.options[0].shanten &&
            o.ukeire.total === analysis.options[0].ukeire.total
          }
          depth={depth}
        />
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          show {hidden} more…
        </button>
      )}
    </div>
  );
}

/** One turn's review: collapsible header + full counterfactual table. */
function ReviewItem({
  review,
  open,
  onToggle,
}: {
  review: DiscardReview;
  open: boolean;
  onToggle: () => void;
}) {
  const keptCounts = useMemo(() => {
    const c = [...review.counts14];
    c[review.chosenKind]--;
    return c;
  }, [review]);
  const keptShanten = useMemo(() => shanten([...keptCounts]), [keptCounts]);

  return (
    <div className={cn("rounded-lg", open && "bg-zinc-800/20 ring-1 ring-zinc-800")}>
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800/40 outline-none"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-zinc-500" />
        )}
        <span className="font-medium text-zinc-300">Turn {review.turn}</span>
        <span>cut</span>
        <TileImg kind={review.chosenKind} red={review.chosenRed} size="xs" />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 whitespace-nowrap",
            keptShanten <= 0
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
              : "bg-zinc-700/40 text-zinc-400 ring-zinc-600/40",
          )}
        >
          {shantenLabel(keptShanten)}
        </span>
      </button>
      {open && (
        <div className="space-y-2 px-2 pb-2">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-800/40 px-2 py-1.5 text-xs text-zinc-400">
            <InfoTip label="You kept" className="shrink-0">
              The hand's structure as the shanten algorithm decomposes it:{" "}
              <span className="text-emerald-300">green = meld</span> (complete set),{" "}
              <span className="text-amber-300">amber = pair</span>,{" "}
              <span className="text-sky-300">blue = partial set</span> (one tile from
              a meld), <span className="text-zinc-500">dimmed = floaters</span> that
              contribute nothing yet.
            </InfoTip>
            <HandShape counts={keptCounts} />
          </div>
          <OptionList
            counts14={review.counts14}
            remaining={review.remaining}
            depth={0}
            chosenKind={review.chosenKind}
            showHeader
          />
        </div>
      )}
    </div>
  );
}

/** All discard reviews this hand, newest first; only the newest starts open. */
export function ReviewHistory({ reviews }: { reviews: DiscardReview[] }) {
  const latestTurn = reviews[reviews.length - 1].turn;
  const [openTurns, setOpenTurns] = useState<Set<number>>(() => new Set([latestTurn]));

  // each new discard: expand it, minimize the older ones
  useEffect(() => {
    setOpenTurns(new Set([latestTurn]));
  }, [latestTurn]);

  return (
    <div className="space-y-1">
      {[...reviews].reverse().map((r) => (
        <ReviewItem
          key={r.turn}
          review={r}
          open={openTurns.has(r.turn)}
          onToggle={() =>
            setOpenTurns((prev) => {
              const next = new Set(prev);
              if (next.has(r.turn)) next.delete(r.turn);
              else next.add(r.turn);
              return next;
            })
          }
        />
      ))}
    </div>
  );
}

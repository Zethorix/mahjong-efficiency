import { TileImg } from "./TileImg";
import { cn } from "../lib/utils";

const SUITS = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8], // man
  [9, 10, 11, 12, 13, 14, 15, 16, 17], // pin
  [18, 19, 20, 21, 22, 23, 24, 25, 26], // sou
];
const WINDS = [27, 28, 29, 30]; // E S W N
const DRAGONS = [31, 32, 33]; // haku hatsu chun

interface CellProps {
  kind: number;
  remaining: number[];
  inHand?: number[];
  highlightKind?: number | null;
  onHoverKind?: (kind: number | null) => void;
}

/** dot style per copy status (color + size) — shared with the legend in App */
export const DOT_COLORS = {
  hand: "size-[5px] bg-white",
  unseen: "size-1 bg-zinc-400",
  discarded: "size-1 bg-zinc-700",
} as const;

function Cell({ kind: k, remaining, inHand, highlightKind, onHoverKind }: CellProps) {
  const held = inHand?.[k] ?? 0;
  const unseen = remaining[k];
  const discarded = Math.max(0, 4 - unseen - held);
  return (
    <div
      onMouseEnter={() => onHoverKind?.(k)}
      onMouseLeave={() => onHoverKind?.(null)}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-md bg-zinc-800/60 px-1 pt-1 pb-0.5 transition-shadow",
        // exhausted kinds dull fully — unless you hold copies, then only
        // the tile art dulls so the in-hand marker stays readable
        remaining[k] === 0 && !(inHand && inHand[k] > 0) && "opacity-30",
        inHand && inHand[k] > 0 && "bg-zinc-600/70 ring-1 ring-zinc-500/70",
        highlightKind === k && "ring-2 ring-amber-400/80 opacity-100",
      )}
    >
      <span
        className="flex h-1.5 items-center gap-0.5"
        title={`${held} in hand · ${unseen} unseen · ${discarded} discarded`}
      >
        {Array.from({ length: held }, (_, i) => (
          <span key={`h${i}`} className={cn("rounded-full", DOT_COLORS.hand)} />
        ))}
        {Array.from({ length: unseen }, (_, i) => (
          <span key={`u${i}`} className={cn("rounded-full", DOT_COLORS.unseen)} />
        ))}
        {Array.from({ length: discarded }, (_, i) => (
          <span key={`d${i}`} className={cn("rounded-full", DOT_COLORS.discarded)} />
        ))}
      </span>
      <TileImg
        kind={k}
        size="sm"
        className={cn(remaining[k] === 0 && inHand && inHand[k] > 0 && "opacity-40")}
      />
      <span
        className={cn(
          "text-[11px] font-semibold tabular-nums",
          remaining[k] === 0 ? "text-zinc-500" : "text-zinc-300",
        )}
      >
        {remaining[k]}
      </span>
    </div>
  );
}

/** Remaining (unseen) copies of every tile kind. */
export function CountsPanel(props: Omit<CellProps, "kind">) {
  return (
    <div className="flex flex-wrap items-start gap-x-10 gap-y-3">
      {/* suits stacked on the left */}
      <div className="space-y-2">
        {SUITS.map((kinds) => (
          <div key={kinds[0]} className="flex flex-wrap gap-1.5">
            {kinds.map((k) => (
              <Cell key={k} kind={k} {...props} />
            ))}
          </div>
        ))}
      </div>
      {/* honors on the right: winds above, dragons below */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-4">
          {WINDS.map((k) => (
            <Cell key={k} kind={k} {...props} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {DRAGONS.map((k) => (
            <Cell key={k} kind={k} {...props} />
          ))}
        </div>
      </div>
    </div>
  );
}

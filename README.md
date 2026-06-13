# Riichi Efficiency Trainer

A static riichi mahjong tile-efficiency trainer. Deal a random 13-tile hand from a
full 136-tile wall (including 3 red fives), then discard and draw until tenpai.
After every discard you get a counterfactual breakdown of *all* possible discards —
shanten, ukeire, a 2-step expected-ukeire tiebreaker, and an expandable
exploration tree of follow-up draws.

No yaku — pure efficiency practice.

## Features

- **Full wall**: 136 tiles — 3 suits, winds, dragons, one red five per suit.
- **Opponents (toggle)**: three opponents draw and discard a random tile each turn;
  seat winds and turn order follow your chosen seat (round wind is East).
- **Tile counts (toggle)**: live count of unseen copies of every tile kind.
- **Discard review**: after each discard, every counterfactual discard is ranked by
  shanten → ukeire → 2-step ukeire (sum over accepted draws of remaining copies ×
  the best ukeire of the hand you advance into).
- **Exploration tree**: expand any discard to see its accepted draws, then expand a
  draw to see the best responses to it, recursively.

## Development

Uses [Bun](https://bun.sh) as the package manager.

```sh
bun install
bun run dev      # local dev server
bun test         # shanten/ukeire engine tests
bun run build    # static build into dist/
```

The tile art (committed under `public/tiles/`) comes from Wikimedia Commons,
[Category:SVG Planar illustrations of Mahjong tiles](https://commons.wikimedia.org/wiki/Category%3ASVG_Planar_illustrations_of_Mahjong_tiles).
`bun run fetch-tiles` re-downloads it; the red 5-man (not present on Commons) is
synthesized from `5m.svg`.

## Deploying to GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with Bun and
publishes `dist/` to GitHub Pages. In the repo settings, set **Pages → Source** to
**GitHub Actions** once. The Vite base is `./`, so the build works at any path.

## How the engine works

Shanten is the minimum over standard form (4 sets + pair), seven pairs, and
thirteen orphans. Standard shanten enumerates Pareto-optimal (melds, partial sets)
decompositions per suit with a session-wide memo, then combines suits and honors,
reserving each possible pair. Ukeire counts only tiles you cannot see (your hand
and all discard piles); opponents' hidden hands stay in the unseen pool, exactly
as a real player would count. Red fives are tracked as normal fives for
efficiency, since they only change hand value, not shape.

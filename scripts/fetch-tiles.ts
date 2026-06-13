/**
 * Downloads the riichi tile SVGs from Wikimedia Commons
 * (Category:SVG Planar illustrations of Mahjong tiles) into public/tiles/.
 *
 * The Commons set has no red 5-man, so we synthesize one by recoloring
 * 5m.svg with the red (#d71e1e) used by the official r5p/r5s files.
 */
import { mkdir } from "node:fs/promises";

const OUT = new URL("../public/tiles/", import.meta.url).pathname;
const UA = "mahjong-efficiency-trainer/1.0 (github pages hobby project)";

// local name -> Commons file name ("Mahjong <X>.svg")
const FILES: Record<string, string> = {
  // suits
  ...Object.fromEntries(
    ["m", "p", "s"].flatMap((suit) =>
      Array.from({ length: 9 }, (_, i) => [`${i + 1}${suit}`, `${i + 1}${suit}`]),
    ),
  ),
  // winds: E S W N
  ton: "E",
  nan: "S",
  sha: "W",
  pei: "N",
  // dragons: H = haku (blank), R = hatsu (green 發), T = chun (red 中)
  haku: "H",
  hatsu: "R",
  chun: "T",
  // red fives provided by Commons
  r5p: "r5p",
  r5s: "r5s",
};

await mkdir(OUT, { recursive: true });

// Resolve direct upload.wikimedia.org URLs in one API call (Special:FilePath
// redirects are aggressively rate-limited; the upload host is not).
const titles = Object.values(FILES)
  .map((r) => `File:Mahjong ${r}.svg`)
  .join("|");
const api = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=${encodeURIComponent(titles)}`;
const apiRes = await fetch(api, { headers: { "User-Agent": UA } });
const data = (await apiRes.json()) as {
  query: { pages: Record<string, { title: string; imageinfo?: { url: string }[] }> };
};
const urlByRemote = new Map<string, string>();
for (const page of Object.values(data.query.pages)) {
  const remote = page.title.replace(/^File:Mahjong /, "").replace(/\.svg$/, "");
  if (page.imageinfo?.[0]) urlByRemote.set(remote, page.imageinfo[0].url);
}

for (const [local, remote] of Object.entries(FILES)) {
  const dest = `${OUT}${local}.svg`;
  if (await Bun.file(dest).exists()) continue;
  const url = urlByRemote.get(remote);
  if (!url) throw new Error(`no Commons URL for Mahjong ${remote}.svg`);
  let text = "";
  for (let attempt = 0, wait = 2000; ; attempt++, wait *= 2) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    text = await res.text();
    if (res.ok && text.trimStart().startsWith("<svg")) break;
    if (attempt >= 5) throw new Error(`failed to fetch ${remote}: ${res.status}`);
    console.log(`  ${remote}: ${res.status}, retrying in ${wait}ms`);
    await Bun.sleep(wait);
  }
  await Bun.write(dest, text);
  console.log(`fetched ${local}.svg`);
  await Bun.sleep(500); // be polite to Commons
}

// Synthesize red 5m (Commons has r5p/r5s but no r5m). Matching those files:
// the entire face art turns #d71e1e — including the 伍 strokes, which carry no
// fill attribute (default black) — plus the small aka-dora dot marker.
const RED = "#d71e1e";
// the aka-dora dot from r5p.svg, shifted up-left into the gap between 伍 and 萬
const DOT =
  `<g><path transform="matrix(.016936,0,0,-.016936,2.34,51.9)" ` +
  `d="M494.609 1500.04C494.609 1418.09 428.16 1351.64 346.211 1351.64 ` +
  `264.301 1351.64 197.852 1418.09 197.852 1500.04 197.852 1581.99 264.301 ` +
  `1648.4 346.211 1648.4 428.16 1648.4 494.609 1581.99 494.609 1500.04Z` +
  `M494.609 1500.04" fill="${RED}"/></g>`;
const fiveMan = await Bun.file(`${OUT}5m.svg`).text();
const red5m = fiveMan
  .replaceAll("#b93c3c", RED)
  .replace(/<path(?![^>]*fill=)/g, `<path fill="${RED}"`)
  .replace("</svg>", `${DOT}</svg>`);
await Bun.write(`${OUT}r5m.svg`, red5m);
console.log("synthesized r5m.svg");

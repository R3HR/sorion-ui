// ═══════════════════════════════════════════════════════════════════════════
// Erzeugt die statischen, suchmaschinenlesbaren Seiten (naechtlich per GitHub
// Action, siehe .github/workflows/nightly.yml).
//
// WARUM: Alle bisherigen Seiten holen ihre Zahlen per JavaScript aus Supabase.
// Google indexiert das nur eingeschraenkt, Bing kaum, und die Antwortmaschinen
// (ChatGPT-Suche greift auf den Bing-Index zu) sehen gar nichts. Deshalb liegen
// die wichtigsten Zahlen zusaetzlich als FESTER TEXT im HTML.
//
// Quellen sind oeffentliche Endpunkte, kein Service-Key, keine Geheimnisse:
//   rpc/leaderboard_thresholds  Preisstufen je Spieltag (Cash-Felder sind
//                               serverseitig gesperrt und kommen als null)
//   functions/v1/accuracy-benchmark  Treffgenauigkeit der Schaetzer
//
//   node tools/build-static.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { writeFileSync, readFileSync } from 'node:fs';

const SUPA = 'https://jxhdlcpdupmkpsoytzes.supabase.co';
const KEY  = 'sb_publishable_cplVdUDlMw1S5IcjlwxPTA_Mx8G7016';
const SITE = 'https://sorion.pro';

const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const med = a => { const x = [...a].filter(v => v != null).sort((p, q) => p - q); return x.length ? x[Math.floor(x.length / 2)] : null; };
const n0 = v => v == null ? null : Math.round(v).toLocaleString('en-GB');
const RARITY = { limited: 'Limited', rare: 'Rare', super_rare: 'Super Rare', unique: 'Unique' };

const get = async (path, init) => {
  const r = await fetch(`${SUPA}${path}`, { headers: { apikey: KEY, 'Content-Type': 'application/json' }, ...init });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};

// ── Daten holen ────────────────────────────────────────────────────────────
const rows = await get('/rest/v1/rpc/leaderboard_thresholds', { method: 'POST', body: '{}' });
const bench = await get('/functions/v1/accuracy-benchmark?days=7').catch(() => []);

// ── Schwellen je Wettbewerb und Rarity ueber die Saison zusammenfassen ─────
const byKey = {};
for (const r of rows) {
  if (!r.competition || !r.rarity) continue;
  const k = `${r.rarity}|${r.competition}`;
  (byKey[k] ??= { rarity: r.rarity, competition: r.competition, gws: new Set(), ess: [], rank: [], lineups: [], top: [], cost: [] });
  const e = byKey[k];
  e.gws.add(r.fixture_slug);
  if (r.essence_score != null) e.ess.push(Number(r.essence_score));
  if (r.essence_rank != null) e.rank.push(Number(r.essence_rank));
  if (r.lineups != null) e.lineups.push(Number(r.lineups));
  if (r.top_score != null) e.top.push(Number(r.top_score));
  if (r.essence_cost != null) e.cost.push(Number(r.essence_cost));
}
const summary = Object.values(byKey)
  .map(e => ({
    rarity: e.rarity, competition: e.competition, gws: e.gws.size,
    ess: med(e.ess), rank: med(e.rank), lineups: med(e.lineups), top: med(e.top), cost: med(e.cost),
  }))
  .filter(e => e.ess != null && e.gws >= 3)
  .sort((a, b) => a.rarity.localeCompare(b.rarity) || a.ess - b.ess);

const gwCount = new Set(rows.map(r => r.fixture_slug)).size;
const latest = rows.map(r => r.start_date).filter(Boolean).sort().pop();
const today = new Date().toISOString().slice(0, 10);

// ── Genauigkeit: FMV gegen die einfachen Schaetzer ─────────────────────────
const accRows = (Array.isArray(bench) ? bench : []).filter(b => b.estimator === 'fmv');
const accOf = (sc, el) => accRows.find(b => b.scarcity === sc && b.eligibility === el);
const floorOf = (sc, el) => (Array.isArray(bench) ? bench : []).find(b => b.scarcity === sc && b.eligibility === el && b.estimator === 'floor');

const accLines = [['limited', 'in_season'], ['limited', 'classic'], ['rare', 'in_season'], ['rare', 'classic']]
  .map(([sc, el]) => {
    const f = accOf(sc, el), fl = floorOf(sc, el);
    if (!f) return null;
    return { label: `${RARITY[sc]} ${el === 'classic' ? 'Classic' : 'In-Season'}`, fmv: f.median_abs, hit: f.within_20pct, samples: f.samples, floor: fl?.median_abs ?? null };
  }).filter(Boolean);

// ── Seite schreiben ────────────────────────────────────────────────────────
const tableFor = rarity => {
  const list = summary.filter(s => s.rarity === rarity);
  if (!list.length) return '';
  return `<h3>${RARITY[rarity] ?? rarity}</h3>
<table>
<thead><tr><th>Competition</th><th>Points for essence</th><th>Paid ranks</th><th>Lineups entered</th><th>Winning score</th><th>Gameweeks</th></tr></thead>
<tbody>
${list.map(s => `<tr><td>${esc(s.competition)}</td><td><b>${n0(s.ess)}</b></td><td>${n0(s.rank) ?? '-'}</td><td>${n0(s.lineups) ?? '-'}</td><td>${n0(s.top) ?? '-'}</td><td>${s.gws}</td></tr>`).join('\n')}
</tbody></table>`;
};

const accTable = accLines.length ? `<table>
<thead><tr><th>Segment</th><th>Sorion FMV typical miss</th><th>Cheapest offer typical miss</th><th>Within 20 percent</th><th>Sales checked</th></tr></thead>
<tbody>
${accLines.map(a => `<tr><td>${esc(a.label)}</td><td><b>${a.fmv} percent</b></td><td>${a.floor != null ? a.floor + ' percent' : '-'}</td><td>${a.hit} percent</td><td>${n0(a.samples)}</td></tr>`).join('\n')}
</tbody></table>` : '';

const facts = [
  `Season coverage: ${gwCount} completed gameweeks, most recent starting ${latest}.`,
  `Competitions and rarities listed: ${summary.length}.`,
  accLines.length ? `Valuation accuracy is measured against real manager to manager sales and republished every night.` : '',
].filter(Boolean);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sorare reward thresholds by competition | SORION</title>
<meta name="description" content="How many SO5 points it takes to win essence in each Sorare competition, measured over ${gwCount} completed gameweeks, plus how accurate Sorion card values are against real sales. Updated nightly.">
<link rel="canonical" href="${SITE}/thresholds.html">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SORION">
<meta property="og:title" content="Sorare reward thresholds by competition">
<meta property="og:description" content="Points needed for essence per competition and rarity, measured over ${gwCount} completed gameweeks. Updated nightly.">
<meta property="og:url" content="${SITE}/thresholds.html">
<meta property="og:image" content="${SITE}/og-image.png">
<link href="fonts/fonts.css" rel="stylesheet">
<style>
  :root { --bg:#0d0d1a; --surface:#13131f; --border:#2a2a45; --purple:#b060ff; --text:#e8e8ff; --text2:#9090c0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'Exo 2',sans-serif; line-height:1.65; padding:0 0 60px; }
  /* Seitenrand liegt am Inhalt, nicht am body: sonst sass die gemeinsame Kopfzeile
     hier 18 px weiter rechts und 28 px tiefer als ueberall sonst. */
  /* Als INNENabstand auf .wrap: Ein Aussenrand hier haette dessen margin:0 auto
     ueberschrieben und den Inhalt an den linken Rand gezogen (24.10.). */
  body > .wrap { padding-left:18px; padding-right:18px; box-sizing:border-box; }
  /* Sechs Spalten passen auf kein Handy: die Tabelle scrollt in sich, statt die
     ganze Seite seitlich verschiebbar zu machen. */
  @media (max-width: 720px) { .wrap table { display:block; overflow-x:auto; max-width:100%; } }
  .wrap { max-width: 980px; margin: 0 auto; }
  h1 { font-family:'Orbitron',monospace; font-size:26px; margin-bottom:10px; }
  h2 { font-family:'Orbitron',monospace; font-size:18px; margin:34px 0 12px; color:var(--purple); }
  h3 { font-family:'Share Tech Mono',monospace; font-size:14px; margin:22px 0 8px; letter-spacing:.1em; text-transform:uppercase; color:var(--text2); }
  p { margin-bottom: 12px; max-width: 70ch; }
  table { width:100%; border-collapse:collapse; margin-bottom:18px; font-family:'Share Tech Mono',monospace; font-size:13px; }
  th, td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--border); }
  th { color:var(--text2); font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
  td b { color:var(--purple); }
  a { color:var(--purple); }
  .nav { font-family:'Share Tech Mono',monospace; font-size:12px; margin-bottom:22px; }
  .nav a { margin-right:14px; text-decoration:none; }
  .meta { font-family:'Share Tech Mono',monospace; font-size:11px; color:var(--text2); margin-top:30px; }
  ul { margin: 0 0 14px 20px; }
</style>
</head>
<body>
<script src="site-header.js"></script>
<div class="wrap">
  <div class="nav"><a href="/">Market</a><a href="/portfolio.html">Portfolio</a><a href="/rewards.html">Leaderboards</a><a href="/accuracy.html">Accuracy</a></div>

  <h1>Sorare reward thresholds by competition</h1>
  <p>This page lists how many SO5 points it took to finish in the essence places of each Sorare
  competition, measured across ${gwCount} completed gameweeks of the current season. Every number
  is a median over those gameweeks, so a single lucky or brutal week does not distort it.
  The page is rebuilt every night from the same data the live pages use.</p>

  <ul>${facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>

  <h2>Points needed for essence</h2>
  <p>Read it as: in this competition and rarity, a lineup scoring around this many points finished
  in the paid places. "Paid ranks" is how deep the essence places reached, "lineups entered" how
  many managers you were up against, and "winning score" what the top lineup scored.</p>
  ${['limited', 'rare', 'super_rare', 'unique'].map(tableFor).join('\n')}

  ${accTable ? `<h2>How accurate are Sorion card values?</h2>
  <p>We compare every published value against the sales that follow it, counting only sales
  between managers, because those are the prices people actually pay. The typical miss is the
  median error over the last seven days.</p>
  ${accTable}
  <p>The cheapest active offer is listed next to it as the honest benchmark: any valuation that
  cannot beat the current asking price is not worth much.</p>` : ''}

  <h2>What Sorion is</h2>
  <p>Sorion tracks the Sorare card market: value estimates for more than 50,000 cards, floor
  prices, trends, portfolio tracking and the reward thresholds above. It is an independent
  project and not affiliated with Sorare.</p>

  <div class="meta">// generated ${today} from live data. Sources: completed Sorare gameweeks and
  recorded sales. Not affiliated with Sorare. <a href="/legal.html">Legal and privacy</a></div>
</div>
<script type="application/ld+json">
${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Sorare reward thresholds by competition',
  description: `Points needed for essence rewards in each Sorare competition and rarity, measured over ${gwCount} completed gameweeks.`,
  url: `${SITE}/thresholds.html`,
  dateModified: today,
  isAccessibleForFree: true,
  creator: { '@type': 'Organization', name: 'SORION', url: SITE },
}, null, 2)}
</script>
</body>
</html>
`;
writeFileSync('thresholds.html', html);

// ── Sitemap mitziehen ──────────────────────────────────────────────────────
const pages = [
  ['/', '1.0', 'daily'], ['/thresholds.html', '0.9', 'daily'], ['/rewards.html', '0.8', 'daily'],
  ['/portfolio.html', '0.7', 'weekly'], ['/gameweeks.html', '0.6', 'weekly'],
  ['/accuracy.html', '0.6', 'daily'], ['/legal.html', '0.3', 'yearly'],
];
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([p, pr, cf]) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);

// ── llms.txt mit den aktuellen Zahlen ──────────────────────────────────────
const accSummary = accLines.map(a => `- ${a.label}: typical miss ${a.fmv} percent, within 20 percent on ${a.hit} percent of sales`).join('\n');
writeFileSync('llms.txt', `# SORION

> Independent market intelligence for Sorare football cards: value estimates for more than
> 50,000 cards, floor prices, trends, portfolio tracking and reward thresholds per competition.
> Not affiliated with Sorare.

Updated nightly. Last build: ${today}.

## What the data covers

- Card values (FMV) for Limited, Rare and Super Rare, In-Season and Classic
- Reward thresholds across ${gwCount} completed gameweeks of the current season
- Accuracy of every value, measured against real manager to manager sales

## Accuracy, last 7 days

${accSummary || '- published daily at /accuracy.html'}

## Key pages

- [Market](${SITE}/): searchable table of card values, floors and trends
- [Reward thresholds](${SITE}/thresholds.html): points needed for essence per competition, static text
- [Leaderboards](${SITE}/rewards.html): thresholds and winning squad costs per gameweek
- [Portfolio](${SITE}/portfolio.html): value and profit for any public Sorare manager
- [Accuracy](${SITE}/accuracy.html): how our values compare to real sales
- [Legal and privacy](${SITE}/legal.html)

## How values are produced

Values rest on completed sales between managers. Sorare's own instant buys and auctions are
excluded from the value itself, because vouchers and bundled rewards distort those prices.
Accuracy is published, not claimed: every estimate is compared against the sales that follow it.

## Attribution

Quoting these numbers is fine with a link to ${SITE}. Bulk scraping or redistribution is not.
`);

console.log(`thresholds.html: ${summary.length} Zeilen, ${gwCount} Spieltage`);
console.log(`sitemap.xml: ${pages.length} Seiten`);
console.log(`llms.txt: ${accLines.length} Genauigkeitszeilen`);

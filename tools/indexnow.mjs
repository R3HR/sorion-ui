// Meldet geaenderte Seiten direkt bei den Suchmaschinen an, die IndexNow
// unterstuetzen (Bing, Yandex, Seznam, Naver). Bing ist dabei der wichtige:
// die ChatGPT-Suche greift unter anderem auf dessen Index zurueck.
//
// Kein Konto, kein Login, keine Geheimnisse: Der Nachweis ist eine Datei mit
// dem Schluessel, die unter sorion.pro/<schluessel>.txt liegt.
//
//   node tools/indexnow.mjs
import { readdirSync, readFileSync } from 'node:fs';

const HOST = 'sorion.pro';
const keyFile = readdirSync('.').find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.log('Keine IndexNow-Schluesseldatei gefunden, uebersprungen.'); process.exit(0); }
const key = readFileSync(keyFile, 'utf8').trim();

const urlList = [
  `https://${HOST}/`,
  `https://${HOST}/thresholds.html`,
  `https://${HOST}/rewards.html`,
  `https://${HOST}/accuracy.html`,
  `https://${HOST}/gameweeks.html`,
  `https://${HOST}/portfolio.html`,
];

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList }),
});
// 200 und 202 sind beide Erfolg, 422 heisst meist: Schluesseldatei noch nicht erreichbar.
console.log(`IndexNow: HTTP ${res.status} fuer ${urlList.length} Adressen`);
if (!res.ok) console.log(await res.text().catch(() => ''));

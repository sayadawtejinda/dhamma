// Re-downloads every Myanmar Reader chapter from the teacher's Google Sheet
// and rewrites public/reader-chapters/{A|B}_{column}.json (58 files: sheets A
// and B, Chapter 1-29 = columns A..AC). Run this after editing the Sheet, then
// commit/push -- the app reads these static files (the Sheet script is only a
// fallback), so a Sheet edit does not reach students until this is run.
//
//   node scripts/refresh-reader-chapters.mjs          (shows what would change)
//   node scripts/refresh-reader-chapters.mjs --write  (rewrites the files)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WRITE = process.argv.includes('--write');
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbza8zaxRpAWwo2iTBJ4pppZ7swkpWuhHJARN6f88afeiQuYPc1hLYfa4JXHuS8TZKI/exec';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'reader-chapters');
const TOTAL_CHAPTERS = 29;

const columnName = (index) => {
  let name = '';
  let n = index;
  while (n >= 0) { name = String.fromCharCode(65 + (n % 26)) + name; n = Math.floor(n / 26) - 1; }
  return name;
};

const jobs = [];
for (const sheet of ['A', 'B']) {
  for (let i = 0; i < TOTAL_CHAPTERS; i++) jobs.push({ sheet, column: columnName(i) });
}

async function fetchColumn({ sheet, column }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${WEB_APP_URL}?sheetName=${sheet}&range=${column}:${column}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty or not an array');
      return rows;
    } catch (e) {
      if (attempt === 3) throw new Error(`${sheet}_${column}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}

// ည့် and ဉ့် are the one place the typing order matters to the app: it expects
// the asat BEFORE the dot below (ည + ် + ့). A Sheet typed the other way round
// (ည + ့ + ်) looks identical on screen but silently loses its pronunciation
// rules, so it is put in the app's order here. (Only ည and ဉ -- the app's
// rules for other letters, e.g. ယ့် and လ့်, are written for the other order.)
const fixYiOrder = (v) => (typeof v === 'string' ? v.replace(/([ညဉ])့်/g, '$1့်') : v);

const results = [];
const queue = [...jobs];
async function worker() {
  while (queue.length) {
    const job = queue.shift();
    const rows = (await fetchColumn(job)).map(fixYiOrder);
    results.push({ ...job, rows });
    process.stdout.write('.');
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log();

let changed = 0;
let created = 0;
results.sort((a, b) => (a.sheet + a.column).localeCompare(b.sheet + b.column));
for (const { sheet, column, rows } of results) {
  const file = join(OUT_DIR, `${sheet}_${column}.json`);
  const next = JSON.stringify(rows);
  const prev = existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
  if (prev === next) continue;
  if (prev === null) created++; else changed++;
  console.log(`${prev === null ? 'NEW    ' : 'CHANGED'} ${sheet}_${column}.json  (${prev ? JSON.parse(prev).length : 0} -> ${rows.length} rows)`);
  if (WRITE) writeFileSync(file, next);
}
console.log(`\n${changed} changed, ${created} new, ${results.length - changed - created} unchanged.${WRITE ? ' Files written.' : ' (dry run -- add --write to save)'}`);

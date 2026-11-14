// Saves the pictures you make in Gemini under the right names, ONE BY ONE, so their order can never get mixed up.
//   double-click name-pictures.bat
// It reads the picture plan that make-lessons.mjs wrote (abhidhamma-....-picture-plan.json, in Downloads), shows the next picture to
// make (lesson, number, and the prompt), waits for you to make it in Gemini, and when you press Enter it takes the NEWEST new picture
// (Downloads or Pictures\Screenshots) and files it as  Downloads\lesson-pictures\L03-P2.png  (for lesson 3, picture 2).
//   Enter = take the newest picture for this slot     r = take the newest picture again for the PREVIOUS slot (a better one)
//   s = skip this slot for now     q = stop (run it again later; slots that are done are skipped)
// The next step, add-lessons.bat, then reads the pictures by these names.
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, extname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { KEYED_RE, listKeyed } from './picture-slots.mjs';

const DOWNLOADS = join(homedir(), 'Downloads');
const OUT_DIR = process.env.LESSON_PICTURES || join(DOWNLOADS, 'lesson-pictures');
const SOURCES = [DOWNLOADS, join(homedir(), 'Pictures', 'Screenshots')];
const isPic = (f) => /\.(png|jpe?g)$/i.test(f) && !KEYED_RE.test(f);

const rl = createInterface({ input, output });
const ask = async (q, def = '') => { const a = (await rl.question(q + (def ? ` [${def}]` : '') + ': ')).trim(); return a || def; };
const die = (m) => { console.error('\n❌ ' + m); rl.close(); process.exit(1); };

const waitingPictures = () => SOURCES.filter(existsSync).flatMap(d => readdirSync(d).filter(isPic).map(f => join(d, f)).filter(p => statSync(p).isFile()))
  .map(p => ({ p, t: statSync(p).mtimeMs })).sort((a, b) => a.t - b.t);

// the plan file
const plans = existsSync(DOWNLOADS) ? readdirSync(DOWNLOADS).filter(f => /-picture-plan\.json$/i.test(f)).map(f => ({ f, t: statSync(join(DOWNLOADS, f)).mtimeMs })).sort((a, b) => b.t - a.t) : [];
console.log('\n🖼️  Name the pictures (one by one)\n');
const wanted = await ask('Picture plan file', plans[0]?.f || '');
const planPath = !wanted ? null : (isAbsolute(wanted) ? wanted : join(DOWNLOADS, wanted));
if (!planPath || !existsSync(planPath)) die('I could not find the picture plan (abhidhamma-....-picture-plan.json in Downloads). Run make-lessons.bat first and answer y to "Make a picture plan".');
const { style = '', plan } = JSON.parse(readFileSync(planPath, 'utf8').replace(/^﻿/, ''));
const slots = plan.flatMap(p => p.slots.map(s => ({ ...s, lesson: p.lesson, title: p.title, n: parseInt(s.name.split('-P')[1], 10) })));
mkdirSync(OUT_DIR, { recursive: true });

const done = () => listKeyed([OUT_DIR]);
const fileInto = (src, slot) => {
  for (const old of readdirSync(OUT_DIR)) if (old.toLowerCase().startsWith(slot.name.toLowerCase() + '.')) unlinkSync(join(OUT_DIR, old)); // a redo replaces it
  const ext = extname(src).toLowerCase().replace('.jpeg', '.jpg');
  const dest = join(OUT_DIR, slot.name + ext);
  copyFileSync(src, dest);
  unlinkSync(src);
  return dest;
};

// pictures that were already made before starting: the newest N, in the order they were made
const pending = slots.filter(s => !done().has(s.name));
console.log(`${slots.length} pictures in the plan, ${slots.length - pending.length} already named, ${pending.length} to go.`);
if (!pending.length) { console.log('Everything is named. Next: add-lessons.bat.'); rl.close(); process.exit(0); }
const early = parseInt(await ask('How many pictures are ALREADY made and waiting (the newest ones, made in the order of the plan)? 0 if none', '0'), 10) || 0;
let startAt = 0;
if (early > 0) {
  const waiting = waitingPictures().slice(-early);
  waiting.forEach((w, i) => { if (pending[i]) { console.log(`  ${pending[i].name}  <-  ${w.p.split(/[\\/]/).pop()}`); fileInto(w.p, pending[i]); } });
  startAt = Math.min(early, pending.length);
}

let lastShown = Date.now();
let prev = null;
for (let i = startAt; i < pending.length; i++) {
  const s = pending[i];
  console.log(`\n──────── Lesson ${s.lesson}, picture ${s.n} of ${plan.find(p => p.lesson === s.lesson).slots.length}  →  ${s.name}   (${i + 1}/${pending.length})`);
  console.log(`   ${s.title}`);
  console.log(`   PROMPT: ${s.prompt}${style ? '  ' + style : ''}`);
  lastShown = Date.now();
  for (;;) {
    const a = (await ask('Make it in Gemini, save/download it, then press Enter  (r = redo the previous, s = skip, q = stop)')).toLowerCase();
    if (a === 'q') { console.log('\nStopped. Run name-pictures.bat again to carry on.'); rl.close(); process.exit(0); }
    if (a === 's') break;
    if (a === 'r') {
      if (!prev) { console.log('   Nothing to redo yet.'); continue; }
      const w = waitingPictures().filter(x => x.t >= prev.shownAt).pop();
      if (!w) { console.log('   No new picture found. Save the better one first, then type r.'); continue; }
      console.log(`   ${prev.slot.name}  <-  ${w.p.split(/[\\/]/).pop()}  (replaced)`);
      fileInto(w.p, prev.slot);
      continue;
    }
    const fresh = waitingPictures().filter(x => x.t >= lastShown - 2000);
    const w = fresh.pop();
    if (!w) { console.log('   No new picture found (in Downloads or Pictures\\Screenshots). Save it there and press Enter again.'); continue; }
    console.log(`   ${s.name}  <-  ${w.p.split(/[\\/]/).pop()}`);
    fileInto(w.p, s);
    prev = { slot: s, shownAt: lastShown };
    break;
  }
}
console.log(`\nDone. ${done().size} named pictures are in ${OUT_DIR}.\nNext: double-click add-lessons.bat and choose 2 = Abhidhamma.`);
rl.close();
process.exit(0);

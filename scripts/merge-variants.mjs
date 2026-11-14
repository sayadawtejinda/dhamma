// Puts the age versions made in the Gemini Canvas Abhidhamma app (its "Export Data" file, full_app_backup_....json) into the lessons of a
// CLASS in the live app, matching them by title, and puts each lesson's pictures between the paragraphs. Nothing else is touched (no
// students, no scores, no other lessons). Before anything is written, the class lessons that will change are saved to
// Downloads\lesson-backups\ so everything can be put back.
//
//   double-click merge-variants.bat    (or:  node scripts/merge-variants.mjs [--dry] [--overwrite])
//   --dry        only show what would happen
//   --overwrite  also replace an age version the class lesson already has (normally it is kept)
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebaseConfig.js';
import { matchLesson, buildVariants, AGE_GROUPS } from './merge-variants-lib.mjs';

const DRY = process.argv.includes('--dry');
const OVERWRITE = process.argv.includes('--overwrite');
const ABHI = 'artifacts/lesson-translator-app-v6/public/data';
const rl = createInterface({ input, output });
const ask = async (q, def = '') => { const a = (await rl.question(q + (def ? ` [${def}]` : '') + ': ')).trim(); return a || def; };
const die = (m) => { console.error('\n❌ ' + m); rl.close(); process.exit(1); };

console.log(DRY ? '\n(--dry: nothing will be written)\n' : '\n🧩 Put the age versions into a class\n');
const downloads = join(homedir(), 'Downloads');
const backups = existsSync(downloads) ? readdirSync(downloads).filter(f => /backup.*\.json$/i.test(f)).map(f => ({ f, t: statSync(join(downloads, f)).mtimeMs })).sort((a, b) => b.t - a.t) : [];
const fileName = await ask('Backup file (the Canvas "Export Data" .json)', backups[0]?.f || '');
const filePath = isAbsolute(fileName) ? fileName : join(downloads, fileName);
if (!fileName || !existsSync(filePath)) die(`I could not find "${fileName}" in Downloads.`);
const data = JSON.parse(readFileSync(filePath, 'utf8').replace(/^﻿/, ''));
const source = (Array.isArray(data) ? data : (data.lessons || [])).filter(l => l && l.variants && Object.keys(l.variants).length);
if (!source.length) die('That file has no lessons with age versions in it.');
console.log(`${source.length} lesson(s) with age versions in the file.`);

const db = getFirestore(initializeApp(firebaseConfig));
await signInAnonymously(getAuth());
const classes = (await getDocs(collection(db, `${ABHI}/classes`))).docs.map(d => d.id).sort();
console.log('Classes: ' + classes.join(', '));
const classId = await ask('Which class are the lessons in');
if (!classes.includes(classId)) die(`There is no class called "${classId}".`);
const classLessons = (await getDocs(collection(db, `${ABHI}/classes/${classId}/lessons`))).docs.map(d => ({ id: d.id, ...d.data() }));

const plan = [];
console.log('');
for (const l of source) {
  const m = matchLesson(l, classLessons);
  const title = String(l.title).slice(0, 38);
  if (!m) { console.log(`  no lesson with this title in the class   ${title}`); continue; }
  if (m.ambiguous) { console.log(`  TWO class lessons have this title (not guessed)   ${title}`); continue; }
  const r = buildVariants(l.variants, m, { overwrite: OVERWRITE });
  if (!r.added.length) { console.log(`  nothing to add (already has its age versions)   ${title}`); continue; }
  console.log(`  OK  ${title.padEnd(40)} add ${r.added.map(g => g.slice(0, 3)).join('/')}${r.kept.length ? ` keep ${r.kept.map(g => g.slice(0, 3)).join('/')}` : ''}   pictures: ${r.names.length}`);
  if (!r.names.length) console.log('      (this lesson has no picture names, so the age versions get no pictures)');
  plan.push({ lesson: m, variants: r.variants });
}
if (!plan.length) die('Nothing to do.');
console.log(`\n${plan.length} lesson(s) of class "${classId}" will get age versions. Students, scores and other lessons are not touched.`);
if (DRY) { console.log('\n--dry: stopping here.'); rl.close(); process.exit(0); }
if (!(await ask('Go ahead? (y/n)', 'y')).toLowerCase().startsWith('y')) die('Nothing was changed.');

// the lessons that will change are saved first
const dir = join(downloads, 'lesson-backups');
mkdirSync(dir, { recursive: true });
const backupFile = join(dir, `${classId}-before-age-versions-${Date.now()}.json`);
writeFileSync(backupFile, JSON.stringify({ classId, lessons: plan.map(p => p.lesson) }, null, 2));
console.log(`Saved the current lessons first: ${backupFile}`);
for (const p of plan) {
  await setDoc(doc(db, `${ABHI}/classes/${classId}/lessons/${p.lesson.id}`), { variants: p.variants }, { merge: true });
}
console.log(`\n✅ ${plan.length} lesson(s) now have their age versions. Open the app and refresh to see them.`);
console.log(`   To put the lessons back as they were: ask Claude, with the file ${backupFile}`);
rl.close();
process.exit(0);

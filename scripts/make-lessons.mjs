// Makes the SmartStudy lessons file for you: the notebook's stories -> English lessons in the 4 reading levels,
// the formatted text, a title and 10 quiz questions per level, all asked from Gemini by this script (the same
// questions the SmartStudy teacher screen asks), saved as a .json that  add-lessons.bat  can load.
//
//   node scripts/make-lessons.mjs            (or double-click make-lessons.bat)
//   node scripts/make-lessons.mjs --dry      only show the stories that were found
//
// The Gemini key is read from scripts/gemini-key.txt (one line, never uploaded to GitHub) or the GEMINI_API_KEY variable.
// It is slow on purpose (free keys allow only a few requests a minute); each finished lesson is saved at once, so if it
// stops you can run it again with the same output name and it carries on after the last finished lesson.
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, isAbsolute, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { gemini, loadKey, GEMINI_KEY_FILE, GAP_MS } from './gemini.mjs';
import { AGE_LEVELS, LEVEL_SPECS, countWords, levelMaxWords, cleanLessonText, checkLevelText, alignAnswer, checkQuiz, baseRules, levelRules, quizSchema } from './lesson-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const LEVELS = ['storyteller', 'explorer', 'adventurer', 'voyager'];

const rl = createInterface({ input, output });
const ask = async (q, def = '') => { const a = (await rl.question(q + (def ? ` [${def}]` : '') + ': ')).trim(); return a || def; };
const die = (msg) => { console.error('\n❌ ' + msg); rl.close(); process.exit(1); };

const findFile = (name) => {
  const candidates = isAbsolute(name) ? [name] : [
    name, join(process.cwd(), name), join(homedir(), 'Downloads', name), join(homedir(), 'Desktop', name), join(homedir(), 'Documents', name),
    join(homedir(), 'Downloads', name + '.txt'),
  ];
  return candidates.find(p => existsSync(p) && statSync(p).isFile());
};

// ---- the stories --------------------------------------------------------------------------------------------------
// How the lessons are told apart (the first one that is found in the file is used):
//   1. marker lines:   === Title of lesson 1 ===      (a line that starts with ===; everything below it, up to the
//                                                      next === line, is that lesson)
//   2. the notebook's own 📖 title lines (the text after a "Thoughts" line is the notebook's remarks and is skipped)
function parseStories(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const marker = lines.some(l => /^\s*===\s*\S/.test(l));
  const stories = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (marker) {
      if (/^===\s*\S/.test(line)) {
        const title = line.replace(/^=+\s*/, '').replace(/\s*=+$/, '').replace(/^(lesson|သင်ခန်းစာ)\s*\d*\s*[:：.\-–]?\s*/i, '').trim();
        cur = { heading: title, body: [] };
        stories.push(cur);
        continue;
      }
      if (cur) cur.body.push(raw);
      continue;
    }
    if (line.includes('📖')) { cur = { heading: line.replace('📖', '').trim(), body: [] }; stories.push(cur); continue; }
    if (!cur) continue;
    if (line === 'Thoughts') { cur = null; continue; }
    if (line.startsWith('💡')) { cur = null; continue; }
    cur.body.push(raw);
  }
  return stories
    .map(s => ({ heading: s.heading, text: s.body.join('\n').trim() }))
    .filter(s => s.text.length > 80);
}

// ---- main ---------------------------------------------------------------------------------------------------------
console.log(DRY ? '\n(--dry: Gemini is not called)\n' : '\n📝 Make lessons with Gemini\n');
const abhi = (await ask('1 = SmartStudy lessons, 2 = Abhidhamma lessons', '1')) === '2';
const name = await ask('Stories file name (the notebook .txt)');
const file = findFile(name);
if (!file) die(`I could not find "${name}" (looked in this folder, Downloads, Desktop and Documents).`);
const stories = parseStories(readFileSync(file, 'utf8').replace(/^﻿/, ''));
if (!stories.length) die('No lessons found. Start each lesson with a line like:  === Title of the lesson ===');
console.log(`Found ${stories.length} stories:`);
stories.forEach((s, i) => console.log(`  ${i + 1}. ${s.heading.slice(0, 70)}  (${s.text.length} characters)`));
if (DRY) { rl.close(); process.exit(0); }

// Abhidhamma: the lesson is the Burmese text itself. Nothing is asked from Gemini here: add-lessons.bat adds the 5
// picture names to each lesson and then makes the 4 age versions (English text, discussion questions, quiz).
if (abhi) {
  const stampA = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const outA = await ask('Save the lessons as', `abhidhamma-${stampA}.json`);
  const fileA = isAbsolute(outA) ? outA : join(homedir(), 'Downloads', outA);
  const lessonsA = stories.map((s, i) => ({
    title: s.heading.replace(/^ကလေးများအတွက်\s*/, '').trim() || `Lesson ${i + 1}`,
    burmeseContent: s.text,
  }));
  writeFileSync(fileA, JSON.stringify({ lessons: lessonsA }, null, 2));
  console.log(`
Done: ${lessonsA.length} lesson(s) in ${fileA}`);
  console.log('Next: put the pictures in Pictures\\Screenshots (split-sheets.bat if they are sheets) and double-click add-lessons.bat, choose 2 = Abhidhamma.');
  rl.close();
  process.exit(0);
}

const key = loadKey();
if (!key) die(`No Gemini key. Save your key as one line in ${GEMINI_KEY_FILE} (get it at https://aistudio.google.com/apikey).`);

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const outName = await ask('Save the lessons as', `lessons-${stamp}.json`);
const outFile = isAbsolute(outName) ? outName : join(homedir(), 'Downloads', outName);
let done = [];
if (existsSync(outFile)) {
  try { done = (JSON.parse(readFileSync(outFile, 'utf8')).lessons || []).filter(l => LEVELS.every(k => l.questions?.[k]?.length === 10)); } catch (e) { done = []; }
  if (done.length) console.log(`${outFile} already has ${done.length} finished lesson(s); carrying on after them.`);
}
const lessons = [...done];
const save = () => writeFileSync(outFile, JSON.stringify({ classId: '', timestamp: Date.now(), lessons }, null, 2));
const minutes = Math.ceil(((stories.length - done.length) * 12 * GAP_MS) / 60000);
console.log(`\nAbout ${minutes} minute(s). You can leave it running.\n`);

for (let i = done.length; i < stories.length; i++) {
  console.log(`Lesson ${i + 1} of ${stories.length}: ${stories[i].heading.slice(0, 60)}`);
  try {
    lessons.push(await makeLesson(key, stories[i], i));
    save();
    console.log(`   ✅ saved (${lessons.length}/${stories.length})`);
  } catch (e) {
    console.error(`   ❌ lesson ${i + 1} failed: ${e.message}`);
    console.error('   Run it again with the same output name; it continues from here.');
    break;
  }
}
console.log(`\nDone: ${lessons.length} lesson(s) in ${outFile}`);
console.log('Next: put the pictures in Pictures\\Screenshots and double-click add-lessons.bat.');
rl.close();
process.exit(0);

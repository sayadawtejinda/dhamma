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

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
let MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'; // changed automatically if Google has retired it (see pickModel)
const GAP_MS = parseInt(process.env.GEMINI_GAP_MS || '4500', 10); // pause between requests
const LEVELS = ['storyteller', 'explorer', 'adventurer', 'voyager'];
const AGE_LEVELS = {
  storyteller: 'Storytellers (Ages 5+ / Beginner)',
  explorer: 'Explorers (Ages 6-8)',
  adventurer: 'Adventurers (Ages 9-11)',
  voyager: 'Voyagers (Ages 12+)',
};

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
// A story starts at a line with 📖 (the title line), and ends at the next 📖 or at a "Thoughts" line (the notebook's own
// remarks between answers).
function parseStories(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const stories = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
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

// ---- Gemini -------------------------------------------------------------------------------------------------------
// Google retires model names from time to time ("no longer available"). When that happens, ask Google which models
// this key may use and take the newest ordinary "flash" one.
async function pickModel(key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${key}`);
  if (!res.ok) throw new Error(`Could not list the Gemini models (HTTP ${res.status}). Is the key right?`);
  const list = ((await res.json()).models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /^gemini-[\d.]+-flash$/.test(n));
  const version = (n) => parseFloat((n.match(/^gemini-([\d.]+)-/) || [])[1]) || 0;
  list.sort((a, b) => version(b) - version(a));
  if (!list.length) throw new Error('No usable Gemini flash model was found for this key.');
  return list[0];
}
let lastCall = 0;
async function gemini(key, payload, tries = 6) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.status === 429 || res.status >= 500) {
        const back = Math.min(90, 10 * (attempt + 1));
        console.log(`   (Gemini asked to wait, trying again in ${back}s...)`);
        await new Promise(r => setTimeout(r, back * 1000));
        continue;
      }
      if (res.status === 404 && !globalThis.__modelPicked) {
        globalThis.__modelPicked = true;
        MODEL = await pickModel(key);
        console.log(`   (that model is gone; using ${MODEL} instead)`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const j = await res.json();
      const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      if (!text.trim()) throw new Error('empty answer');
      return text;
    } catch (e) {
      if (attempt === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error('Gemini did not answer');
}

const levelPrompt = (level) => `You are an expert children's educational writer. Rewrite the given lesson content in English so it is appropriate for this reading level: ${AGE_LEVELS[level]}. Adjust vocabulary difficulty, sentence length, and total word count to match this age group (younger levels: very short sentences, simple words, fewer words overall; older levels: richer vocabulary, longer sentences, more detail). Keep all facts and meaning accurate. Do not add headings. Return only the rewritten lesson text, nothing else.`;
const FORMAT_PROMPT = `You are an expert editor for children's learning materials. Your task is to take the provided raw lesson text and format it into visually appealing and readable English markdown. Crucially, do not change the original facts, meaning, or educational content. Only adjust the presentation. Do NOT use any headings (like # or ##). Use bold text (**text**) for important words or phrases. Use numbered (1.) or bulleted (-) lists if appropriate. Use italic text (*text*) if appropriate. Do NOT add any extra text, comments, or explanations outside of the formatted content. Only return the formatted markdown content.`;
const QUIZ_BASE = `You are a helpful educational assistant. Generate a quiz based on the provided lesson. The quiz must contain exactly 10 questions and use simple, clear English: Five Multiple Choice Questions (MCQ) with 4 options and a single correct answer. Five True/False (TF) questions. The response MUST be a JSON array matching the provided schema.`;
const QUIZ_PROMPTS = {
  storyteller: `(Ages 5+) ${QUIZ_BASE} Make extremely simple.`,
  explorer: `(Ages 6-8) ${QUIZ_BASE} Make simple.`,
  adventurer: `(Ages 9-11) ${QUIZ_BASE} Make standard.`,
  voyager: `(Ages 12+) ${QUIZ_BASE} Make challenging.`,
};
const QUIZ_SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: { type: { type: 'STRING', enum: ['mcq', 'tf'] }, text: { type: 'STRING' }, correct: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['type', 'text', 'correct'], propertyOrdering: ['type', 'text', 'options', 'correct'] } };

async function makeLesson(key, story, index) {
  const master = `${story.heading}\n\n${story.text}`;
  const content = {};
  for (const level of LEVELS) {
    process.stdout.write(`   ${level} text... `);
    content[level] = (await gemini(key, { contents: [{ parts: [{ text: master }] }], systemInstruction: { parts: [{ text: levelPrompt(level) }] } })).trim();
    console.log('ok');
  }
  process.stdout.write('   title... ');
  const title = (await gemini(key, { contents: [{ parts: [{ text: `Lesson content:\n${content.adventurer}\n\nSuggest one short, clear English title for this lesson (5 words or fewer). Return only the title text, nothing else.` }] }] })).replace(/["\n]/g, '').trim() || `Lesson ${index + 1}`;
  console.log(title);
  const formattedContent = {};
  for (const level of LEVELS) {
    process.stdout.write(`   formatting ${level}... `);
    formattedContent[level] = (await gemini(key, { contents: [{ parts: [{ text: `Format the following lesson content:\n\n${content[level]}` }] }], systemInstruction: { parts: [{ text: FORMAT_PROMPT }] } })).trim();
    console.log('ok');
  }
  const questions = {};
  for (const level of LEVELS) {
    process.stdout.write(`   quiz ${level}... `);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const text = await gemini(key, {
        contents: [{ parts: [{ text: `Generate a 10-question quiz for: "${title}". Content: "${content[level]}"` }] }],
        systemInstruction: { parts: [{ text: QUIZ_PROMPTS[level] }] },
        generationConfig: { responseMimeType: 'application/json', responseSchema: QUIZ_SCHEMA },
      });
      try {
        const q = JSON.parse(text);
        if (Array.isArray(q) && q.length === 10) { questions[level] = q; break; }
      } catch (e) { /* try again */ }
      if (attempt === 3) throw new Error(`Gemini did not give 10 questions for ${level}`);
    }
    console.log('ok');
  }
  return {
    lessonId: `L${index + 1}`, title, content, formattedContent, questions,
    imageUrl: '', headerImageUrl: '', image1Url: '', image2Url: '', image3Url: '', image4Url: '',
  };
}

// ---- main ---------------------------------------------------------------------------------------------------------
console.log(DRY ? '\n(--dry: Gemini is not called)\n' : '\n📝 Make lessons with Gemini\n');
const name = await ask('Stories file name (the notebook .txt)');
const file = findFile(name);
if (!file) die(`I could not find "${name}" (looked in this folder, Downloads, Desktop and Documents).`);
const stories = parseStories(readFileSync(file, 'utf8').replace(/^﻿/, ''));
if (!stories.length) die('No stories found. Each story should start with a line that has 📖 in it.');
console.log(`Found ${stories.length} stories:`);
stories.forEach((s, i) => console.log(`  ${i + 1}. ${s.heading.slice(0, 70)}  (${s.text.length} characters)`));
if (DRY) { rl.close(); process.exit(0); }

let key = process.env.GEMINI_API_KEY || '';
const keyFile = join(__dirname, 'gemini-key.txt');
if (!key && existsSync(keyFile)) key = readFileSync(keyFile, 'utf8').trim();
if (!key) die(`No Gemini key. Save your key as one line in ${keyFile} (get it at https://aistudio.google.com/apikey).`);

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
const minutes = Math.ceil(((stories.length - done.length) * 17 * GAP_MS) / 60000);
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

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
import { join, isAbsolute, dirname, basename, extname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { gemini, loadKey, GEMINI_KEY_FILE, GAP_MS } from './gemini.mjs';
import { parseMarkdownArticles, parseLooseText, looksLikeMarkdownArticle, naturalSort } from './article-md.mjs';
import { SLOTS_PER_LESSON, slotBase } from './picture-slots.mjs';
import { readdirSync } from 'node:fs';
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

// The file name may also be several files: a comma list ("a.md, b.md"), or a pattern with * ("article-*.md"), looked for in the same
// folders. They are used in natural order (article-2 before article-10).
const searchDirs = () => [process.cwd(), join(homedir(), 'Downloads'), join(homedir(), 'Desktop'), join(homedir(), 'Documents')];
function findFiles(spec) {
  const out = [];
  for (const part of spec.split(',').map(s => s.trim()).filter(Boolean)) {
    if (part.includes('*')) {
      const pat = isAbsolute(part) ? basename(part) : part;
      const re = new RegExp('^' + pat.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      const dirs = isAbsolute(part) ? [dirname(part)] : searchDirs();
      const hit = dirs.find(d => existsSync(d) && readdirSync(d).some(f => re.test(f)));
      if (hit) readdirSync(hit).filter(f => re.test(f)).sort(naturalSort).forEach(f => out.push(join(hit, f)));
    } else {
      const f = findFile(part);
      if (f) out.push(f);
    }
  }
  return [...new Set(out)];
}

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

const FORMAT_PROMPT = `You are an expert editor for children's learning materials. Your task is to take the provided raw lesson text and format it into visually appealing and readable English markdown. Crucially, do not change the original facts, meaning, or educational content. Only adjust the presentation. Do NOT use any headings (like # or ##). Use bold text (**text**) for important words or phrases. Use numbered (1.) or bulleted (-) lists if appropriate. Use italic text (*text*) if appropriate. Do NOT add any extra text, comments, or explanations outside of the formatted content. Only return the formatted markdown content.`;

// The same steps as the teacher screen of the "smartstudy Quiz - fixed" app (rules in lesson-rules.mjs).
// The story is in Burmese, so its word count says nothing about English length: the level limits alone are used.
const masterWordsOf = (text) => {
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return latin > text.length * 0.3 ? countWords(text) : 0;
};

// ONE call writes all 4 levels (as in the app); a level that breaks its limits is then redone on its own.
async function writeLevels(key, master) {
  const masterWords = masterWordsOf(master);
  const specText = LEVELS.map(l => {
    const sp = LEVEL_SPECS[l];
    return `"${l}" -- for ${sp.who}. ${Math.min(sp.minWords, levelMaxWords(l, masterWords))} to ${levelMaxWords(l, masterWords)} words in total, never more. No sentence longer than ${sp.maxSentenceWords} words, at most ${sp.maxSentences} sentences.\n${sp.rules.map(r => '  - ' + r).join('\n')}`;
  }).join('\n\n');
  const systemPrompt = `You are an expert children's educational writer. Rewrite the lesson you are given 4 times, once for each reading level below. Every fact you write must be true to the original; leaving things out is fine and often best, never add new facts. Plain text only: no title, no headings, no markdown, no quotation marks, no emojis.\n\nThe 4 levels:\n\n${specText}\n\nThe youngest level must be much shorter and simpler than the others. Return JSON with the 4 texts.`;
  const schema = { type: 'OBJECT', properties: Object.fromEntries(LEVELS.map(l => [l, { type: 'STRING' }])), required: LEVELS, propertyOrdering: LEVELS };
  let parsed = null;
  for (let attempt = 0; attempt < 3 && !parsed; attempt++) {
    const text = await gemini(key, { contents: [{ parts: [{ text: master }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: 'application/json', responseSchema: schema } });
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
  }
  if (!parsed) throw new Error('Gemini did not return the 4 levels');
  const out = {};
  for (const l of LEVELS) {
    let text = cleanLessonText(parsed[l] || '');
    let problems = text ? checkLevelText(text, l, masterWords) : ['it is empty'];
    const spec = LEVEL_SPECS[l];
    for (let attempt = 0; attempt < 2 && problems.length; attempt++) {
      console.log(`   ${l}: ${problems.join('; ')} -- writing that level again`);
      const prompt = `You are an expert children's educational writer. Rewrite the lesson you are given for ${spec.who} (${AGE_LEVELS[l]}).\n\nHARD LIMITS (they will be checked):\n- Between ${Math.min(spec.minWords, levelMaxWords(l, masterWords))} and ${levelMaxWords(l, masterWords)} words in total. Never more than ${levelMaxWords(l, masterWords)}. Do not make it much longer than the original lesson.\n- No sentence longer than ${spec.maxSentenceWords} words. No more than ${spec.maxSentences} sentences.\n\nHOW TO WRITE IT:\n${spec.rules.map(r => '- ' + r).join('\n')}\n- Every fact you do write must be true to the original lesson. It is fine, and often best, to leave things out; never add new facts.\n- Plain text only: no title, no headings, no markdown, no quotation marks, no emojis. Do not put a line break before a full stop.\n- Return ONLY the rewritten lesson text, nothing else.\n\nYour previous answer was rejected because ${problems.join('; ')}. Write it again, shorter and simpler, and respect every limit.`;
      const again = cleanLessonText(await gemini(key, { contents: [{ parts: [{ text: master }] }], systemInstruction: { parts: [{ text: prompt }] } }));
      const p2 = checkLevelText(again, l, masterWords);
      if (p2.length <= problems.length) { text = again; problems = p2; }
    }
    out[l] = { text, problems };
  }
  return out;
}

async function writeQuiz(key, title, text, level) {
  let questions = [], problems = [];
  const isSoft = (p) => /too long for this age|ask about the same thing/.test(p);
  for (let attempt = 0; attempt < 3; attempt++) {
    const fix = attempt === 0 ? '' : `\n\nYour previous quiz was rejected because ${problems.join('; ')}. Write the whole quiz again and fix this.`;
    const raw = await gemini(key, {
      contents: [{ parts: [{ text: `Lesson title: "${title}"\nLesson text:\n${text}` }] }],
      systemInstruction: { parts: [{ text: `${baseRules}\n${levelRules[level]}${fix}` }] },
      generationConfig: { responseMimeType: 'application/json', responseSchema: quizSchema, temperature: 0.4 },
    });
    try { questions = JSON.parse(raw); } catch (e) { questions = []; }
    problems = checkQuiz(questions, level);
    if (problems.filter(p => !isSoft(p)).length === 0) { problems = []; break; }
  }
  if (problems.length) throw new Error(`${level} quiz: ${problems.slice(0, 3).join('; ')}`);
  return questions.map(alignAnswer);
}

async function makeLesson(key, story, index) {
  const master = `${story.heading}\n\n${story.text}`;
  process.stdout.write('   writing the 4 reading levels... ');
  const levels = await writeLevels(key, master);
  const content = {};
  LEVELS.forEach(l => { content[l] = levels[l].text; });
  console.log(LEVELS.map(l => `${l} ${countWords(content[l])}`).join(', '));
  const warnings = LEVELS.filter(l => levels[l].problems.length).map(l => `${l}: ${levels[l].problems.join('; ')}`);
  if (warnings.length) console.log('   ⚠ please check: ' + warnings.join(' | '));
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
    questions[level] = await writeQuiz(key, title, content[level], level);
    console.log('ok');
  }
  return {
    lessonId: `L${index + 1}`, title, content, formattedContent, questions,
    imageUrl: '', headerImageUrl: '', image1Url: '', image2Url: '', image3Url: '', image4Url: '',
  };
}

// ---- main ---------------------------------------------------------------------------------------------------------
console.log(DRY ? '\n(--dry: Gemini is not called)\n' : '\n📝 Make lessons with Gemini\n');
const abhi = (await ask('1 = SmartStudy lessons, 2 = Abhidhamma lessons', '1')) === '2';
const name = await ask('Stories file name(s) (a notebook .txt, or .md articles: one name, a comma list, or article-*.md)');
const files = findFiles(name);
if (!files.length) die(`I could not find "${name}" (looked in this folder, Downloads, Desktop and Documents).`);
const file = files[0];
// Each file is read the way it is written: the old notebook files (=== lines or 📖 lines) as before, Markdown articles
// (# title, ## sections) as ONE lesson per article.
const stories = [];
for (const f of files) {
  const text = readFileSync(f, 'utf8').replace(/^﻿/, '');
  const found = looksLikeMarkdownArticle(text) || /\.md$/i.test(f)
    ? parseMarkdownArticles(text, basename(f, extname(f)))
    : (parseStories(text).length ? parseStories(text) : parseLooseText(text, basename(f, extname(f))));
  if (!found.length) console.log(`  (no lessons found in ${basename(f)})`);
  stories.push(...found.map(x => ({ ...x, from: basename(f) })));
}
if (!stories.length) die('No lessons found. Start each lesson with a line like:  === Title of the lesson ===   (or give Markdown articles that start with  # Title ).');
console.log(`Found ${stories.length} stories${files.length > 1 ? ` in ${files.length} files` : ''}:`);
stories.forEach((s, i) => console.log(`  ${i + 1}. ${s.heading.slice(0, 70)}  (${s.text.length} characters)`));
// the default output name comes from the STORIES file(s), not from the clock: run it again with the same files and it continues where it stopped
const stampBase = files.length > 1
  ? `${basename(files[0], extname(files[0])).replace(/[-_ ]?\d.*$/, '') || 'stories'}s-${files.length}`
  : basename(file, extname(file));
if (DRY) { rl.close(); process.exit(0); }

// Pictures that keep their order: for every lesson 5 picture slots (L01-P1 ... L01-P5) with a Gemini prompt for each. The pictures are
// then saved under those names (name-pictures.bat does it for you, one by one) and add-lessons.bat reads them by NAME, not by the time
// they were made, so the order can never get mixed up.
const PICTURE_STYLE = 'A warm, friendly hand-painted illustration for a children\'s Dhamma book, soft colours, no text or letters in the picture.';
async function makePicturePlan(lessons) {
  let key0 = loadKey();   // set to '' after the first failure: Gemini is busy or out of quota, so the other lessons use their own text instead of waiting again
  const plan = [];
  for (const [i, l] of lessons.entries()) {
    let scenes = [];
    if (key0) {
      try {
        process.stdout.write(`   picture ideas for lesson ${i + 1}... `);
        const raw = await gemini(key0, {
          contents: [{ parts: [{ text: `Lesson title: ${l.title}\n\nLesson text (Burmese):\n${l.burmeseContent.slice(0, 9000)}` }] }],
          systemInstruction: { parts: [{ text: `You plan the pictures of a children's Buddhist Abhidhamma lesson. Give exactly ${SLOTS_PER_LESSON} picture ideas that follow the lesson from beginning to end, in the order of the lesson. Each idea is one short English sentence (max 30 words) describing ONE clear scene a child can understand (people, objects, a simple visual metaphor from the lesson), with no text inside the picture. Return JSON.` }] },
          generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { scenes: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['scenes'] } },
        }, 2);
        scenes = (JSON.parse(raw).scenes || []).map(x => String(x).trim()).filter(Boolean).slice(0, SLOTS_PER_LESSON);
        console.log('ok');
      } catch (e) { console.log('failed (' + String(e.message).slice(0, 60) + ') - the picture ideas will be taken from the lesson text instead'); scenes = []; key0 = ''; }
    }
    if (scenes.length < SLOTS_PER_LESSON) {
      // fallback: five evenly spaced paragraphs of the lesson itself, to paste into Gemini
      const paras = l.burmeseContent.split(/\n{2,}/).map(x => x.replace(/\s+/g, ' ').trim()).filter(x => x.length > 20);
      scenes = [];
      for (let k = 0; k < SLOTS_PER_LESSON; k++) scenes.push('Illustrate this part of the lesson: ' + (paras[Math.min(paras.length - 1, Math.floor((k * paras.length) / SLOTS_PER_LESSON))] || l.title).slice(0, 220));
    }
    plan.push({ lesson: i + 1, key: slotBase(i + 1, 1).split('-')[0], title: l.title, slots: scenes.map((sc, k) => ({ name: slotBase(i + 1, k + 1), prompt: sc })) });
  }
  return plan;
}

// Abhidhamma: the lesson is the Burmese text itself. add-lessons.bat adds the 5
// picture names to each lesson and then makes the 4 age versions (English text, discussion questions, quiz).
if (abhi) {
  const outA = await ask('Save the lessons as', `abhidhamma-${stampBase.replace(/[^\p{L}\p{N}_-]+/gu, '-')}.json`);
  const fileA = isAbsolute(outA) ? outA : join(homedir(), 'Downloads', outA);
  const lessonsA = stories.map((s, i) => ({
    title: s.heading.replace(/^ကလေးများအတွက်\s*/, '').trim() || `Lesson ${i + 1}`,
    burmeseContent: s.text,
  }));
  const wantPlan = (await ask('Make a picture plan, so the pictures keep their order? (y/n)', 'y')).toLowerCase().startsWith('y');
  let planFile = null;
  let plan = null;
  if (wantPlan) {
    plan = await makePicturePlan(lessonsA);
    planFile = fileA.replace(/\.json$/i, '') + '-picture-plan.json';
    writeFileSync(planFile, JSON.stringify({ style: PICTURE_STYLE, lessonsFile: basename(fileA), plan }, null, 2));
    const txt = [`PICTURE PLAN for ${basename(fileA)}`, `Add this style line to every prompt:  ${PICTURE_STYLE}`, '',
      ...plan.flatMap(p => [`=== Lesson ${p.lesson}: ${p.title} ===`, ...p.slots.map(s => `${s.name}:  ${s.prompt}`), ''])].join('\n');
    writeFileSync(planFile.replace(/\.json$/i, '.txt'), txt);
  }
  writeFileSync(fileA, JSON.stringify({ ...(wantPlan ? { picturePlan: true } : {}), lessons: lessonsA }, null, 2));
  console.log(`
Done: ${lessonsA.length} lesson(s) in ${fileA}`);
  if (wantPlan) console.log(`Picture plan: ${planFile.replace(/\.json$/i, '.txt')}\nNext: double-click name-pictures.bat (it saves each picture you make under its right name), then add-lessons.bat, choose 2 = Abhidhamma.`);
  else console.log('Next: put the pictures in Pictures\\Screenshots (split-sheets.bat if they are sheets) and double-click add-lessons.bat, choose 2 = Abhidhamma.');
  rl.close();
  process.exit(0);
}

const key = loadKey();
if (!key) die(`No Gemini key. Save your key as one line in ${GEMINI_KEY_FILE} (get it at https://aistudio.google.com/apikey).`);

// the default name comes from the STORIES file, not from the clock: run it again with the same stories file and the lessons that are already
// finished are kept (it carries on after them) instead of everything being made again
const stamp = stampBase.replace(/[^\p{L}\p{N}_-]+/gu, '-');
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

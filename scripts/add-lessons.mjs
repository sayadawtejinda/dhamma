// One-step "add new lessons": renames the new pictures, uploads them to GitHub, puts the picture links into
// the lessons, and loads the lessons into SmartStudy or Abhidhamma. Start it by double-clicking
// add-lessons.bat in the project folder (or:  node scripts/add-lessons.mjs ). Add --dry to only look.
//
// What it asks:
//   1. SmartStudy or Abhidhamma
//   2. the class (SmartStudy: type the class id, a new one is created; Abhidhamma: pick an old class or type a new one)
//   3. the name of the lessons file (the .json you would otherwise import in the app)
// The pictures are always taken from C:\Users\sayad\Pictures\Screenshots (oldest first, 5 per lesson).
// They are renamed to continue the numbers (SmartStudy 4 digits, Abhidhamma 6 digits) in https://github.com/sayadawtejinda/dhammaschool (SmartStudy: 0151.png, 0152.png ...),
// pushed there, and once they are safely on GitHub (and the lessons are loaded) the used screenshots are deleted from the computer.
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, existsSync, readdirSync, copyFileSync, unlinkSync, statSync } from 'node:fs';
import { join, basename, extname, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { loadKey, GEMINI_KEY_FILE } from './gemini.mjs';
import { makeVariant, AGE_GROUPS } from './abhi-variants.mjs';

const DRY = process.argv.includes('--dry');
const SCREENSHOTS = process.env.LESSON_PICTURES || join(homedir(), 'Pictures', 'Screenshots');
const IMAGE_REPO = 'sayadawtejinda/dhammaschool';
const REPO_DIR = process.env.LESSON_IMAGE_REPO_DIR || join(homedir(), 'dhammaschool-images');
const RAW_BASE = (branch) => `https://raw.githubusercontent.com/${IMAGE_REPO}/${branch}/`;
const ABHI = 'artifacts/lesson-translator-app-v6/public/data';
const IMAGES_PER_LESSON = 5;
const abhiDocs = []; // the Abhidhamma lessons that were loaded, for the age-versions step

const rl = createInterface({ input, output });
const ask = async (q, def = '') => { const a = (await rl.question(q + (def ? ` [${def}]` : '') + ': ')).trim(); return a || def; };
const git = (args, cwd = REPO_DIR) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const die = (msg) => { console.error('\n❌ ' + msg); rl.close(); process.exit(1); };

// ---- the lessons file -------------------------------------------------------------------------------------------
function findLessonsFile(name) {
  const candidates = isAbsolute(name) ? [name] : [
    name, join(process.cwd(), name), join(homedir(), 'Downloads', name), join(homedir(), 'Desktop', name),
    join(homedir(), 'Documents', name), join(homedir(), 'Downloads', name + '.json'), join(process.cwd(), name + '.json'),
  ];
  return candidates.find(p => existsSync(p) && statSync(p).isFile());
}
const readLessons = (file) => {
  const data = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const list = Array.isArray(data) ? data : (data.lessons || []);
  if (!list.length) die('There are no lessons in that file.');
  return list;
};

// ---- the pictures -------------------------------------------------------------------------------------------------
const listScreenshots = () => {
  if (!existsSync(SCREENSHOTS)) die(`The folder ${SCREENSHOTS} does not exist.`);
  return readdirSync(SCREENSHOTS)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f) && statSync(join(SCREENSHOTS, f)).isFile())
    .sort((a, b) => statSync(join(SCREENSHOTS, a)).mtimeMs - statSync(join(SCREENSHOTS, b)).mtimeMs || (a < b ? -1 : 1));
};

function prepareRepo(digits) {
  if (!existsSync(join(REPO_DIR, '.git'))) {
    console.log(`Getting a copy of ${IMAGE_REPO} into ${REPO_DIR} (first time only)...`);
    execFileSync('git', ['clone', `https://github.com/${IMAGE_REPO}.git`, REPO_DIR], { stdio: 'inherit' });
  } else {
    // this folder is only a work copy for the pictures: throw away anything left over from an earlier failed run
    git(['reset', '--hard']);
    git(['clean', '-fdq']);
    git(['pull', '--ff-only']);
  }
  // commits need a name and an email; use the computer's Git ones, or fall back to these for this folder only
  const has = (k) => { try { return !!git(['config', k]); } catch (e) { return false; } };
  if (!has('user.name')) git(['config', 'user.name', 'sayadawtejinda']);
  if (!has('user.email')) git(['config', 'user.email', 'sayadawtejinda@gmail.com']);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  // SmartStudy pictures are numbered with 4 digits (0001.png ...), Abhidhamma's with 6 (001305.png ...): each series continues on its own
  const numbers = readdirSync(REPO_DIR).map(f => (f.match(new RegExp('^(\\d{' + digits + '})\\.(png|jpg|jpeg)$', 'i')) || [])[1]).filter(Boolean).map(n => parseInt(n, 10));
  return { branch, next: (numbers.length ? Math.max(...numbers) : 0) + 1 };
}

// ---- Firestore: connect -------------------------------------------------------------------------------------------
async function connect() {
  const app = initializeApp(firebaseConfig);
  await signInAnonymously(getAuth(app));
  return getFirestore(app);
}

// ---- main ---------------------------------------------------------------------------------------------------------
console.log(DRY ? '\n(--dry: nothing will be uploaded or changed)\n' : '\n📚 Add new lessons\n');
const which = (await ask('1 = SmartStudy, 2 = Abhidhamma', '1')) === '2' ? 'abhidhamma' : 'smartstudy';
const db = await connect();

// the class
let classId;
let classExists = false;
if (which === 'smartstudy') {
  const classes = (await getDocs(collection(db, `artifacts/${appId}/public/data/classes`))).docs.map(d => d.id).sort();
  console.log('SmartStudy classes now: ' + (classes.join(', ') || '(none)'));
  classId = await ask('Class id (an existing one, or a new one to create)');
  if (!classId) die('A class id is needed.');
  classExists = classes.includes(classId);
} else {
  const classes = (await getDocs(collection(db, `${ABHI}/classes`))).docs.map(d => d.id).sort();
  console.log('Abhidhamma classes now: ' + (classes.join(', ') || '(none)'));
  const old = (await ask('Is the class old or new? (o = old, n = new)', 'o')).toLowerCase().startsWith('n') ? false : true;
  classId = await ask(old ? 'Which class id' : 'New class id');
  if (!classId) die('A class id is needed.');
  classExists = classes.includes(classId);
  if (old && !classExists) die(`There is no Abhidhamma class called "${classId}". Run again and choose "new" for a new class.`);
  if (!old && classExists) console.log(`"${classId}" already exists; the new lessons will be added to it.`);
}

// the lessons file
const fileName = await ask('Lessons file name (the .json file)');
const file = findLessonsFile(fileName);
if (!file) die(`I could not find "${fileName}" (looked in this folder, Downloads, Desktop and Documents).`);
const lessons = readLessons(file);
console.log(`Found ${lessons.length} lesson(s) in ${file}`);

// how many pictures are needed
const IMG_RE = /\b(\d{4,6})\.(?:png|jpg|jpeg)\b/gi;
const SS_FIELDS = ['headerImageUrl', 'image1Url', 'image2Url', 'image3Url', 'image4Url'];
const needFor = (l) => (which === 'smartstudy'
  ? SS_FIELDS.filter(k => !String(l[k] || '').trim()).length
  : Math.max(0, IMAGES_PER_LESSON - [...String(l.burmeseContent || l.content || '').matchAll(IMG_RE)].length));
const needed = lessons.reduce((n, l) => n + needFor(l), 0);

const shots = listScreenshots();
console.log(`The lessons need ${needed} picture(s); ${shots.length} found in ${SCREENSHOTS}.`);
if (shots.length < needed) die(`${needed - shots.length} more picture(s) are needed in ${SCREENSHOTS}.`);
if (shots.length > needed) {
  const go = (await ask(`There are ${shots.length - needed} extra picture(s). Use only the first ${needed}? (y/n)`, 'y')).toLowerCase();
  if (!go.startsWith('y')) die('Stopped. Take the extra pictures out of the folder and run it again.');
}
const use = shots.slice(0, needed);

// numbering
const DIGITS = which === 'smartstudy' ? 4 : 6;
const { branch, next } = prepareRepo(DIGITS);
const pad = (n) => String(n).padStart(DIGITS, '0');
const newNames = use.map((f, i) => `${pad(next + i)}${extname(f).toLowerCase() === '.jpeg' ? '.jpg' : extname(f).toLowerCase()}`);
if (needed) console.log(`The pictures will be named ${newNames[0]} ... ${newNames[newNames.length - 1]} (the repo now ends at ${pad(next - 1)}).`);

// put the pictures into the lessons
let cursor = 0;
const takeName = () => newNames[cursor++];
const prepared = lessons.map(l => {
  const copy = JSON.parse(JSON.stringify(l));
  if (which === 'smartstudy') {
    SS_FIELDS.forEach(k => { if (!String(copy[k] || '').trim()) copy[k] = RAW_BASE(branch) + takeName(); });
  } else {
    let content = String(copy.burmeseContent || copy.content || '');
    const need = needFor(copy);
    for (let i = 0; i < need; i++) content += (content && !content.endsWith('\n') ? '\n' : '') + takeName();
    copy.burmeseContent = content;
    copy.imageBaseUrl = RAW_BASE(branch);
  }
  return copy;
});

console.log('\nSummary');
console.log(`  ${which === 'smartstudy' ? 'SmartStudy' : 'Abhidhamma'} class: ${classId} (${classExists ? 'existing' : 'NEW'})`);
console.log(`  ${prepared.length} lesson(s): ${prepared.map(l => l.title || '(no title)').slice(0, 5).join(' | ')}${prepared.length > 5 ? ' ...' : ''}`);
console.log(`  ${needed} picture(s) -> GitHub ${IMAGE_REPO}`);
if (DRY) { console.log('\n--dry: stopping here.'); rl.close(); process.exit(0); }
if (!(await ask('\nGo ahead? (y/n)', 'y')).toLowerCase().startsWith('y')) die('Nothing was changed.');

// 1. pictures -> GitHub
if (needed) {
  use.forEach((f, i) => copyFileSync(join(SCREENSHOTS, f), join(REPO_DIR, newNames[i])));
  try {
    git(['add', ...newNames]);
    git(['commit', '-m', `Add lesson pictures ${newNames[0]} - ${newNames[newNames.length - 1]}`]);
    git(['push']);
  } catch (e) {
    die(`Could not push the pictures to GitHub (${String(e.stderr || e.message).trim().split(/\r?\n/).slice(-2).join(' ')}). The lessons were NOT loaded. Fix the problem (is Git signed in?) and run it again; the copied pictures in ${REPO_DIR} can be left as they are.`);
  }
  console.log(`✅ ${needed} picture(s) pushed to GitHub.`);
}

// 2. lessons -> Firestore
if (which === 'smartstudy') {
  const ref = doc(db, 'artifacts', appId, 'public', 'data', 'classes', classId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data().lessons || []) : [];
  let n = Math.max(0, ...existing.map(l => parseInt(String(l.lessonId || '').substring(1), 10) || 0));
  const added = prepared.map(l => ({
    imageUrl: '', formattedContent: { storyteller: '', explorer: '', adventurer: '', voyager: '' }, questions: [],
    ...l, lessonId: `L${++n}`,
  }));
  if (existing.length + added.length > 50) die('A SmartStudy class can hold at most 50 lessons. The pictures are on GitHub already; nothing was loaded.');
  if (snap.exists()) await updateDoc(ref, { lessons: [...existing, ...added] });
  else await setDoc(ref, { classId, lessons: added, autoApprove: false }, { merge: true });
  // students read a class from a plain file; tell their screens this class changed since the file was built
  await setDoc(doc(db, `artifacts/${appId}/public/data/config/classMeta`), { versions: { [`ss:${classId}`]: Date.now() }, ...(snap.exists() ? {} : { autoApprove: { [classId]: false } }) }, { merge: true });
  console.log(`✅ ${added.length} lesson(s) added to SmartStudy class "${classId}" (now ${existing.length + added.length}).`);
} else {
  await setDoc(doc(db, `${ABHI}/classes/${classId}`), { classId, autoApprove: false, createdAt: serverTimestamp(), ...(classExists ? {} : { imageBaseUrl: RAW_BASE(branch) }) }, { merge: true });
  const existIds = new Set((await getDocs(collection(db, `${ABHI}/classes/${classId}/lessons`))).docs.map(d => d.id));
  const now = Date.now();
  let added = 0;
  for (const [i, l] of prepared.entries()) {
    const id = l.id && !existIds.has(l.id) ? l.id : `lesson_${now}_${i}`;
    await setDoc(doc(db, `${ABHI}/classes/${classId}/lessons/${id}`), {
      id, classId, title: l.title || `Lesson ${i + 1}`, burmeseContent: l.burmeseContent || '', imageBaseUrl: l.imageBaseUrl,
      variants: l.variants || {}, createdAt: Timestamp.fromMillis(now + i * 1000),
    });
    abhiDocs.push({ id, title: l.title || `Lesson ${i + 1}`, content: l.burmeseContent || '', hasVariants: Object.keys(l.variants || {}).length >= 4 });
    added++;
  }
  console.log(`✅ ${added} lesson(s) added to Abhidhamma class "${classId}".`);
}

// 3. the used screenshots are now safe on GitHub: delete them from the computer
if (needed) {
  use.forEach(f => unlinkSync(join(SCREENSHOTS, f)));
  console.log(`🗑️ The ${needed} used screenshot(s) were deleted from ${SCREENSHOTS}.`);
}
// 4. Abhidhamma: the 4 age versions (English text, discussion questions, quiz) -- what the app's Generate button does
if (which === 'abhidhamma' && abhiDocs.some(d => !d.hasVariants)) {
  const key = loadKey();
  if (!key) {
    console.log(`\nThe age versions were NOT made: no Gemini key (save it in ${GEMINI_KEY_FILE}), or use the Generate buttons in the app.`);
  } else if ((await ask('\nMake the 4 age versions of each lesson now with Gemini? About 3 minutes per lesson (y/n)', 'y')).toLowerCase().startsWith('y')) {
    for (const [n, d] of abhiDocs.filter(x => !x.hasVariants).entries()) {
      console.log(`Lesson ${n + 1}: ${d.title}`);
      const variants = {};
      for (const group of Object.keys(AGE_GROUPS)) {
        try {
          process.stdout.write(`   ${group}... `);
          variants[group] = await makeVariant(key, d.title, d.content, group);
          console.log('ok');
        } catch (e) { console.log('failed: ' + e.message); }
      }
      if (Object.keys(variants).length) {
        await setDoc(doc(db, `${ABHI}/classes/${classId}/lessons/${d.id}`), { variants }, { merge: true });
        console.log(`   saved ${Object.keys(variants).length} of 4 versions.`);
      }
    }
    console.log('If some versions failed, open that lesson in the app and press its Generate button for the missing ones.');
  }
}

console.log('\nAll done. Open the app and refresh to see the new lessons.');
rl.close();
process.exit(0);

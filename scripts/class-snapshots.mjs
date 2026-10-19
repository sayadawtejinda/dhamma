// The class leaderboards that students read as static files instead of from Firestore:
//   public/classSnapshots/smartstudy/{CLASS}.json             scores of every student in the class
//   public/classSnapshots/smartstudy-reflections/{CLASS}.json classmates' reflections
//   public/classSnapshots/abhidhamma.json                     lessons finished per student, per class
//
// Only what is NEW since the last run is read from Firestore and merged into these files, so a week in
// which nobody studied costs nothing: nothing is read, nothing changes, nothing is committed. A full
// rebuild from scratch happens once a month (or with --full) because edits and deletions are not seen by
// the incremental read. The state of the last run is kept in public/classSnapshots/_state.json.
import { collection, query, where, getDocs, getCountFromServer, Timestamp } from 'firebase/firestore';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CLASS_DIR = join(__dirname, '..', 'public', 'classSnapshots');
const SEP = '|~|';

export async function refreshClassSnapshots(db, appId, { full = false } = {}) {
  const publicDataPath = `/artifacts/${appId}/public/data`;
  mkdirSync(join(CLASS_DIR, 'smartstudy'), { recursive: true });
  mkdirSync(join(CLASS_DIR, 'smartstudy-reflections'), { recursive: true });
  const generatedAt = new Date().toISOString();
  const STATE_PATH = join(CLASS_DIR, '_state.json');
  let state = {};
  try { state = JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch (e) { state = {}; }
  const FULL = full || !state.fullAt || !state.since || Date.now() - state.fullAt > 30 * 24 * 60 * 60 * 1000;
  const runStartedMs = Date.now();
  const sinceMs = FULL ? 0 : state.since;

  const readClassFile = (dir, cid, key) => {
    try { return JSON.parse(readFileSync(join(CLASS_DIR, dir, `${encodeURIComponent(cid)}.json`), 'utf8'))[key] || []; } catch (e) { return []; }
  };
  let filesWritten = 0;
  const mergeInto = (byClass, dir, key) => {
    for (const [cid, rows] of Object.entries(byClass)) {
      const map = new Map((FULL ? [] : readClassFile(dir, cid, key)).map(x => [x.id, x]));
      rows.forEach(r => map.set(r.id, r));
      writeFileSync(join(CLASS_DIR, dir, `${encodeURIComponent(cid)}.json`), JSON.stringify({ generatedAt, [key]: Array.from(map.values()) }));
      filesWritten += 1;
    }
  };

  // SmartStudy scores
  const scoresSnap = FULL
    ? await getDocs(collection(db, `${publicDataPath}/scores`))
    : await getDocs(query(collection(db, `${publicDataPath}/scores`), where('timestamp', '>', sinceMs)));
  const ssByClass = {};
  scoresSnap.docs.forEach(d => {
    const s = d.data();
    if (!s.classId) return;
    (ssByClass[s.classId] = ssByClass[s.classId] || []).push({ id: d.id, classId: s.classId, studentName: s.studentName, studentAgeLevel: s.studentAgeLevel, lessonId: s.lessonId, score: s.score, timestamp: s.timestamp });
  });
  mergeInto(ssByClass, 'smartstudy', 'scores');

  // SmartStudy reflections
  const reflSnap = FULL
    ? await getDocs(collection(db, `${publicDataPath}/reflections`))
    : await getDocs(query(collection(db, `${publicDataPath}/reflections`), where('timestamp', '>', sinceMs)));
  const reflByClass = {};
  reflSnap.docs.forEach(d => {
    const r = d.data();
    if (!r.classId || !r.lessonId || !r.text) return;
    (reflByClass[r.classId] = reflByClass[r.classId] || []).push({ id: d.id, classId: r.classId, lessonId: r.lessonId, studentName: r.studentName, text: r.text, timestamp: r.timestamp });
  });
  mergeInto(reflByClass, 'smartstudy-reflections', 'reflections');

  // Abhidhamma: lesson counts from a count query (not by reading every lesson); each student's finished
  // lessons kept as a set in the state file, so a new score is just added to its set.
  const ABHI = 'artifacts/lesson-translator-app-v6/public/data';
  const abhiClassesSnap = await getDocs(collection(db, `${ABHI}/classes`));
  const abhiClasses = {};
  await Promise.all(abhiClassesSnap.docs.map(async c => {
    const cnt = await getCountFromServer(collection(db, `${ABHI}/classes/${c.id}/lessons`));
    abhiClasses[c.id] = { totalLessons: cnt.data().count, students: {} };
  }));
  const abhiScoresSnap = FULL
    ? await getDocs(collection(db, `${ABHI}/global_scores`))
    : await getDocs(query(collection(db, `${ABHI}/global_scores`), where('timestamp', '>', Timestamp.fromMillis(sinceMs))));
  const abhiSets = FULL ? {} : Object.fromEntries(Object.entries(state.abhiSets || {}).map(([k, v]) => [k, new Set(v)]));
  abhiScoresSnap.docs.forEach(d => {
    const s = d.data();
    const sn = s.studentName || s.name;
    if (!s.classId || !s.lessonId || !sn || !abhiClasses[s.classId]) return;
    const key = `${s.classId}${SEP}${sn}`;
    (abhiSets[key] = abhiSets[key] || new Set()).add(s.lessonId);
  });
  Object.entries(abhiSets).forEach(([k, set]) => {
    const i = k.indexOf(SEP);
    const cid = k.slice(0, i), sn = k.slice(i + SEP.length);
    if (abhiClasses[cid]) abhiClasses[cid].students[sn] = set.size;
  });
  // fixed order, so an unchanged result is recognised as unchanged
  const byKey = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  Object.keys(abhiClasses).forEach(cid => { abhiClasses[cid].students = byKey(abhiClasses[cid].students); });
  const abhiSorted = byKey(abhiClasses);
  let oldAbhi = null;
  try { oldAbhi = JSON.stringify(JSON.parse(readFileSync(join(CLASS_DIR, 'abhidhamma.json'), 'utf8')).classes); } catch (e) { /* none yet */ }
  if (FULL || oldAbhi !== JSON.stringify(abhiSorted)) { writeFileSync(join(CLASS_DIR, 'abhidhamma.json'), JSON.stringify({ generatedAt, classes: abhiSorted })); filesWritten += 1; }

  // Dhammaschool: classmates' answers, one file per lesson (a student opening a lesson reads just that file).
  // Answer timestamps are ISO strings, so the incremental read compares strings.
  const DS = 'artifacts/dhammaschool-app/public/data';
  mkdirSync(join(CLASS_DIR, 'dhammaschool'), { recursive: true });
  const dsSnap = (FULL || !state.dsSince)
    ? await getDocs(collection(db, `${DS}/answers`))
    : await getDocs(query(collection(db, `${DS}/answers`), where('timestamp', '>', state.dsSince)));
  const dsByLesson = {};
  dsSnap.docs.forEach(d => {
    const a = d.data();
    if (!a.lessonId) return;
    (dsByLesson[a.lessonId] = dsByLesson[a.lessonId] || []).push({ id: d.id, lessonId: a.lessonId, studentName: a.studentName, userId: a.userId, questionIndex: a.questionIndex, answerContent: a.answerContent, likes: a.likes || [], timestamp: a.timestamp });
  });
  mergeInto(dsByLesson, 'dhammaschool', 'answers');

  // Remember where this run got to -- only when something was read, so a quiet week changes nothing at all.
  if (FULL || scoresSnap.size > 0 || reflSnap.size > 0 || abhiScoresSnap.size > 0 || dsSnap.size > 0) {
    writeFileSync(STATE_PATH, JSON.stringify({ since: runStartedMs - 10 * 60 * 1000, dsSince: new Date(runStartedMs - 10 * 60 * 1000).toISOString(), fullAt: FULL ? runStartedMs : state.fullAt, abhiSets: Object.fromEntries(Object.entries(abhiSets).map(([k, v]) => [k, Array.from(v)])) }));
  }
  console.log(`Class snapshots (${FULL ? 'full rebuild' : 'incremental'}): ${scoresSnap.size} SmartStudy score(s), ${reflSnap.size} reflection(s), ${abhiScoresSnap.size} Abhidhamma score(s), ${dsSnap.size} Dhammaschool answer(s) read; ${filesWritten} file(s) written`);
  return { full: FULL, read: scoresSnap.size + reflSnap.size + abhiScoresSnap.size + dsSnap.size, filesWritten };
}

// ---- Each SmartStudy class as a plain file, so students read their lessons from GitHub, not from Firestore -------------
// A SmartStudy class document holds ALL of the class's lessons with their four levels and quizzes: 200-400 KB each (2.4 MB
// for the 12 classes), and Firestore charges for the data it sends out. This writes every class document to
//   public/classSnapshots/smartstudy-class/{CLASS}.json   = { builtAt, data: <the class document> }
//   public/classSnapshots/smartstudy-class/_classes.json  = the list of classes for the students' class picker
// and refreshes the tiny document config/classMeta that carries what changes during the week (the contest, which class is
// "open", and when each class's lessons were last edited). A student uses the file when it is newer than the last edit and
// otherwise (the teacher edited since) falls back to Firestore -- see getClassDocCached in SmartStudy.jsx.
export async function refreshClassDocSnapshots(db, appId) {
  const { collection, getDocs, getDoc, doc, setDoc } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, `artifacts/${appId}/public/data/classes`));
  const dir = join(CLASS_DIR, 'smartstudy-class');
  mkdirSync(dir, { recursive: true });
  const builtAt = Date.now();
  const plain = (v) => {
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
    return v;
  };
  const list = [], contests = {}, autoApprove = {};
  let written = 0;
  // a file built BEFORE the class's last lesson edit is refused by the students' app, so it is rewritten (new builtAt) even if its content is unchanged
  let versions = {};
  try { const m = await getDoc(doc(db, `artifacts/${appId}/public/data/config/classMeta`)); versions = (m.exists() && m.data().versions) || {}; } catch (e) { /* none */ }
  for (const d of snap.docs) {
    const data = plain(d.data());
    list.push({ id: d.id, displayName: data.displayName || null, lessonCount: (data.lessons || []).length });
    contests[d.id] = data.contest || null;
    autoApprove[d.id] = data.autoApprove === true;
    const file = join(dir, `${encodeURIComponent(d.id)}.json`);
    let old = null, oldBuiltAt = 0;
    try { const j = JSON.parse(readFileSync(file, 'utf8')); old = JSON.stringify(j.data); oldBuiltAt = j.builtAt || 0; } catch (e) { /* none yet */ }
    if (old === JSON.stringify(data) && !((versions[`ss:${d.id}`] || 0) > oldBuiltAt)) continue;
    writeFileSync(file, JSON.stringify({ builtAt, data }));
    written += 1;
  }
  list.sort((a, b) => (a.id < b.id ? -1 : 1));
  const listFile = join(dir, '_classes.json');
  let oldList = null;
  try { oldList = JSON.stringify(JSON.parse(readFileSync(listFile, 'utf8')).classes); } catch (e) { /* none yet */ }
  if (oldList !== JSON.stringify(list)) { writeFileSync(listFile, JSON.stringify({ builtAt, classes: list })); written += 1; }
  // what the app reads live (tiny): the contest of each class, which class is open, and the lesson-edit times (kept as they are)
  await setDoc(doc(db, `artifacts/${appId}/public/data/config/classMeta`), { contests, autoApprove, builtAt }, { merge: true });
  console.log(`SmartStudy class files: ${snap.size} classes, ${written} file(s) written`);
  return written;
}

// ---- Each Abhidhamma class (its lessons with all four age versions) as a plain file ---------------------------------------
// A lesson is about 55 KB (all four versions), 1-2 MB a class, 12 MB for all classes -- far too much to send out of Firestore
// to every student who opens a class. This writes public/classSnapshots/abhidhamma-class/{CLASS}.json =
// { builtAt, classData, lessons } (times as { seconds }, the way the app already reads them). A student uses the file when it
// is newer than the last lesson edit (config/classMeta versions "abhi:CLASS", set by the teacher's screen), else Firestore.
export async function refreshAbhidhammaClassFiles(db) {
  const { collection, getDocs, getDoc, doc } = await import('firebase/firestore');
  const ABHI = 'artifacts/lesson-translator-app-v6/public/data';
  const dir = join(CLASS_DIR, 'abhidhamma-class');
  let versions = {};
  try { const m = await getDoc(doc(db, 'artifacts/dhamma-tutoring-app/public/data/config/classMeta')); versions = (m.exists() && m.data().versions) || {}; } catch (e) { /* none */ }
  mkdirSync(dir, { recursive: true });
  const builtAt = Date.now();
  const plain = (v) => {
    if (v && typeof v.toMillis === 'function') return { seconds: Math.floor(v.toMillis() / 1000), nanoseconds: 0 };
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
    return v;
  };
  const classes = await getDocs(collection(db, `${ABHI}/classes`));
  let written = 0;
  for (const c of classes.docs) {
    const lessonsSnap = await getDocs(collection(db, `${ABHI}/classes/${c.id}/lessons`));
    const lessons = lessonsSnap.docs.map(d => plain({ id: d.id, ...d.data() }))
      .sort((a, b) => ((a.createdAt && a.createdAt.seconds) || 0) - ((b.createdAt && b.createdAt.seconds) || 0) || (a.id < b.id ? -1 : 1));
    const body = { classData: plain(c.data()), lessons };
    const file = join(dir, `${encodeURIComponent(c.id)}.json`);
    let old = null, oldBuiltAt = 0;
    try { const j = JSON.parse(readFileSync(file, 'utf8')); old = JSON.stringify({ classData: j.classData, lessons: j.lessons }); oldBuiltAt = j.builtAt || 0; } catch (e) { /* none yet */ }
    if (old === JSON.stringify(body) && !((versions[`abhi:${c.id}`] || 0) > oldBuiltAt)) continue;
    writeFileSync(file, JSON.stringify({ builtAt, ...body }));
    written += 1;
  }
  console.log(`Abhidhamma class files: ${classes.size} classes, ${written} file(s) written`);
  return written;
}

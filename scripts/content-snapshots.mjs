// The Myanmar Speaker app's course content (dictionary, categories, lessons, matching games, poems, welcome
// questions, audio speed) as ONE static file students read instead of Firestore:
//   public/contentSnapshots/myanmar-speaking.json
//
// About 300 small documents that change only when the teacher edits them, so the file is rebuilt each time
// this runs (a few hundred reads) and rewritten ONLY if the content is different -- a week without edits
// changes nothing and commits nothing. Students then read no content from Firestore at all.
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'contentSnapshots');

// Firestore timestamps (and anything nested) become plain milliseconds so the file is plain JSON.
const plain = (v) => {
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
};
// JSON with every object's keys sorted, so two reads of the same content compare equal.
const stable = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export async function refreshContentSnapshots(db) {
  const B = 'artifacts/myanmar-speaking-app/public/data';
  const list = async (name) => (await getDocs(collection(db, `${B}/${name}`))).docs.map(d => ({ id: d.id, data: plain(d.data()) })).sort(byId);
  const one = async (path) => { const s = await getDoc(doc(db, `${B}/${path}`)); return s.exists() ? plain(s.data()) : null; };
  const content = {
    dictionary: await list('myanmar_dictionary'),
    categories: await list('myanmar_categories'),
    lessons: await list('myanmar_lessons'),
    games: await list('myanmar_matching_games'),
    poems: await list('myanmar_poems'),
    welcome: await one('app_settings/welcome_questions'),
    audio: await one('app_settings/audio'),
  };
  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, 'myanmar-speaking.json');
  let old = null;
  try { const j = JSON.parse(readFileSync(file, 'utf8')); delete j.generatedAt; old = stable(j); } catch (e) { /* none yet */ }
  const now = stable(content);
  if (old === now) { console.log('Myanmar Speaker content: unchanged, nothing written'); return false; }
  writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), ...content }));
  console.log(`Myanmar Speaker content: written (${content.dictionary.length} words, ${content.lessons.length} lessons, ${content.poems.length} poems)`);
  return true;
}

// "Who earned a trophy" for the bell on every student's home page: the last 7 days of trophy
// announcements as one static file (public/announcementsSnapshot.json), so students read nothing live.
// The teacher's own bell stays live. Rewritten only when the list is different.
import { query, where, Timestamp } from 'firebase/firestore';
export async function refreshAnnouncementsSnapshot(db, appId) {
  const since = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const snap = await getDocs(query(collection(db, `artifacts/${appId}/public/data/announcements`), where('createdAt', '>=', since)));
  const list = snap.docs
    .map(d => { const a = d.data(); return { id: d.id, studentName: a.studentName, trophyCount: a.trophyCount, createdAtMs: a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0 }; })
    .filter(a => a.studentName && a.createdAtMs)
    .sort((x, y) => y.createdAtMs - x.createdAtMs || (x.id < y.id ? -1 : 1));
  const file = join(__dirname, '..', 'public', 'announcementsSnapshot.json');
  let old = null;
  try { old = JSON.stringify(JSON.parse(readFileSync(file, 'utf8')).announcements); } catch (e) { /* none yet */ }
  if (old === JSON.stringify(list)) { console.log('Trophy announcements: unchanged, nothing written'); return false; }
  writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), announcements: list }));
  console.log(`Trophy announcements: ${list.length} from the last 7 days written`);
  return true;
}

// Every student's Avatar look (skin, hair, outfit, accessory, background) as ONE static file
// (public/avatarSnapshot.json), so tapping a name in a leaderboard / profile can show that student's Avatar
// without reading anything from Firestore. About one read per student, once a week; rewritten only when
// a look changed. (The old "visit" inside the Avatar room is gone.)
export async function refreshAvatarSnapshot(db) {
  const snap = await getDocs(collection(db, 'artifacts/shrine-room-app/public/data/roster'));
  const KEYS = ['skin', 'hair', 'outfit', 'accessory', 'bg', 'homeBackground'];
  const avatars = {};
  snap.docs.forEach(d => {
    const data = d.data();
    const name = data.studentName;
    if (!name) return;
    const a = { ...(data.avatar || {}) };
    KEYS.forEach(k => { if (a[k] === undefined && data[`avatar.${k}`] !== undefined) a[k] = data[`avatar.${k}`]; });
    const look = {};
    KEYS.forEach(k => { if (a[k]) look[k] = a[k]; });
    if (Object.keys(look).length) avatars[name] = look;
  });
  const sorted = Object.fromEntries(Object.entries(avatars).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));
  const file = join(__dirname, '..', 'public', 'avatarSnapshot.json');
  let old = null;
  try { old = JSON.stringify(JSON.parse(readFileSync(file, 'utf8')).avatars); } catch (e) { /* none yet */ }
  if (old === JSON.stringify(sorted)) { console.log('Avatar looks: unchanged, nothing written'); return false; }
  writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), avatars: sorted }));
  console.log(`Avatar looks: ${Object.keys(sorted).length} students written`);
  return true;
}

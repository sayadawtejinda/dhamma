// One-time repair: Abhidhamma quiz scores (global_scores) must belong to the student's Tutoring ID (students/{uid}). A student whose browser got a
// new anonymous id part-way had older scores filed under that old id (Kevin: 10 lessons under 01548..., 10 under his Tutoring id), so the app showed
// 10 / 20. The old ids are on the student's record (authorizedUids). This sets userId of those score documents to the Tutoring id.
//   node scripts/migrate-abhi-scores-userid.mjs          (only says what it would change)
//   node scripts/migrate-abhi-scores-userid.mjs --write  (changes them)
// A score is skipped when the student already has a score for the same class + lesson under the Tutoring id (it would be counted twice).
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const WRITE = process.argv.includes('--write');
const db = getFirestore(initializeApp(firebaseConfig));
await signInAnonymously(getAuth(db.app));
const SC = collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'global_scores');
const students = await getDocs(collection(db, `artifacts/${appId}/public/data/students`));
let fixed = 0, skipped = 0, who = 0;
for (const sd of students.docs) {
  const s = sd.data();
  const old = (s.authorizedUids || []).filter(u => u && u !== sd.id);
  if (!old.length) continue;
  const rows = [];
  for (let i = 0; i < old.length; i += 30) (await getDocs(query(SC, where('userId', 'in', old.slice(i, i + 30))))).docs.forEach(d => rows.push(d));
  if (!rows.length) continue;
  const mine = await getDocs(query(SC, where('userId', '==', sd.id)));
  const have = new Set(mine.docs.map(d => `${d.data().classId}|${d.data().lessonId}`));
  let n = 0, sk = 0;
  for (const d of rows) {
    const k = `${d.data().classId}|${d.data().lessonId}`;
    if (have.has(k)) { sk++; continue; }
    have.add(k); n++;
    if (WRITE) await updateDoc(d.ref, { userId: sd.id });
  }
  who++; fixed += n; skipped += sk;
  console.log(`${s.name}: ${rows.length} score(s) under an old id -> ${n} ${WRITE ? 'moved' : 'would move'}, ${sk} skipped (already counted)`);
}
console.log(`${WRITE ? 'Moved' : 'Would move'} ${fixed} score(s) of ${who} student(s); ${skipped} skipped.`);
process.exit(0);

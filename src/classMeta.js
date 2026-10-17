import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// config/classMeta -- one TINY document with what changes during the week about the SmartStudy classes, so that students can
// read each class's lessons from a plain file on GitHub (see refreshClassDocSnapshots in scripts/class-snapshots.mjs) instead
// of the 200-400 KB class document:
//   versions   { "ss:CLASS": ms }   when the class's lessons were last edited (the file is used only if it is newer)
//   contests   { CLASS: contest }   the class's contest (what the class document's `contest` field says)
//   autoApprove{ CLASS: boolean }   which class is "open"
// The teacher's screens (and the contest payout) write here; the students only read.
const REF = () => doc(db, `artifacts/${appId}/public/data/config/classMeta`);
let cache = null; // { at, data }

export async function loadClassMeta(maxAgeMs = 60000) {
  if (cache && Date.now() - cache.at < maxAgeMs) return cache.data;
  const snap = await getDoc(REF());
  const data = snap.exists() ? snap.data() : {};
  cache = { at: Date.now(), data };
  return data;
}

// Merge a small patch into the document (nested maps are merged, not replaced).
export async function setClassMeta(patch) {
  cache = null;
  try { await setDoc(REF(), patch, { merge: true }); } catch (e) { console.error('Could not update class info:', e); }
}

// The lessons of a class were edited: from now on students read it from Firestore until the next file is built.
export const bumpLessonVersion = (classId) => setClassMeta({ versions: { [`ss:${classId}`]: Date.now() } });

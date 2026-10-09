// Closes Watch & Learn sessions that a student left open (closed the app or phone without
// reporting), the way the app itself would have when still open: at the end of the student's
// class plus 15 minutes, or 45 minutes after it started -- whichever comes first. Coins are
// paid for the time up to that moment (20 a minute, at most 1000), so the coin counting
// stops there too. Run every 15 minutes by .github/workflows/close-open-sessions.yml.
//
//   node scripts/close-open-sessions.mjs          (closes them)
//   node scripts/close-open-sessions.mjs --dry    (only says what it would close)
//
// Only Watch & Learn: its coins depend only on time. Other lessons need the student's own
// app records to work out trophies, which happens in the app (see handleAutoSubmitSession),
// the next time the student opens it.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, runTransaction, Timestamp, increment, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const DRY = process.argv.includes('--dry');
const P = `artifacts/${appId}/public/data`;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const MIN = 60 * 1000;
const COINS_PER_MINUTE = 20;
const COIN_CAP = 1000;

async function main() {
  await signInAnonymously(auth);
  const now = Date.now();
  const open = await getDocs(query(collection(db, `${P}/studySessions`), where('endTime', '==', null)));
  const wl = open.docs.filter(d => String(d.data().lessonLink || '').startsWith('watchandlearn://') && d.data().startTime?.toDate);
  console.log(`${open.size} open sessions, ${wl.length} Watch & Learn`);
  let closed = 0;
  for (const d of wl) {
    const s = d.data();
    const start = s.startTime.toDate().getTime();
    // the class this session belongs to: the student's first scheduled class that ends after it started
    let schedEnd = null;
    if (s.studentUid) {
      const sched = await getDocs(query(collection(db, `${P}/teacherSchedule`), where('studentUid', '==', s.studentUid), where('startTime', '>=', Timestamp.fromMillis(start - 12 * 60 * MIN))));
      const next = sched.docs.map(x => x.data()).filter(x => x.endTime?.toDate && x.endTime.toDate().getTime() > start)
        .sort((a, b) => a.endTime.toDate() - b.endTime.toDate())[0];
      if (next) schedEnd = next.endTime.toDate().getTime() + 15 * MIN;
    }
    let autoEnd = start + 45 * MIN;
    if (schedEnd && schedEnd < autoEnd) autoEnd = schedEnd;
    if (autoEnd <= start) autoEnd = start + MIN;
    if (now < autoEnd) { console.log(` - ${d.id}: still within its time (until ${new Date(autoEnd).toISOString()})`); continue; }
    console.log(` - ${d.id}: close at ${new Date(autoEnd).toISOString()} (${s.studentUid})`);
    if (DRY) continue;
    const claimed = await runTransaction(db, async (tx) => {
      const snap = await tx.get(d.ref);
      if (!snap.exists() || snap.data().endTime !== null) return false;
      tx.update(d.ref, { endTime: Timestamp.fromMillis(autoEnd), feedbackNotes: 'Automatically submitted (45 min max / end of class).', score: 'N/A' });
      return true;
    });
    if (!claimed) continue;
    closed++;
    if (s.lessonId) await updateDoc(doc(db, `${P}/lessons`, s.lessonId), { status: 'reported', reportedAt: serverTimestamp() }).catch(() => {});
    const coins = Math.min(COIN_CAP, Math.floor(Math.max(0, (autoEnd - start) / MIN) * COINS_PER_MINUTE));
    if (coins > 0 && s.studentUid) {
      const stu = await getDoc(doc(db, `${P}/students`, s.studentUid));
      await setDoc(doc(db, 'artifacts/watch-and-learn-app/public/data/roster', s.studentUid), { studentName: stu.exists() ? (stu.data().name || '') : '', coinBalance: increment(coins) }, { merge: true });
    }
  }
  console.log(DRY ? 'Dry run -- nothing changed.' : `Closed ${closed}.`);
  process.exit(0);
}
main().catch(e => { console.error('Closing open sessions failed:', e); process.exit(1); });

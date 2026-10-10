// Pays the prizes of SmartStudy 2-week contests that have ended.
//
// The teacher starts a contest for a class in SmartStudy's Teacher Dashboard; that writes
//   smartStudyContests/{classId}_{startMs} = { classId, startedAt, endsAt, prizes: [coins...], status: 'active' }
// and a summary `contest` on the class doc (which the students already read, so showing the
// banner costs them nothing). This runs every 15 minutes (close-open-sessions.yml): for each
// active contest whose end has passed it adds up each student's quiz scores earned inside the
// window (first attempt of each lesson in the window), ranks them, and gives each winner a
// teacher gift box holding the prize coins (the same box the teacher's own gifts use, so the
// student sees it pop up and opens it), then marks the contest paid and writes the winners on
// the class doc so students can see the results.
//
//   node scripts/pay-contest-prizes.mjs          (pays)
//   node scripts/pay-contest-prizes.mjs --dry    (only says what it would do)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const DRY = process.argv.includes('--dry');
const P = `artifacts/${appId}/public/data`;
const SHRINE_ROSTER = 'artifacts/shrine-room-app/public/data/roster';
const GIFTS = 'artifacts/shrine-room-app/public/data/teacherGifts';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const sanitize = (k) => (k || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');
const ms = (v) => (typeof v === 'number' ? v : v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : Date.parse(v) || 0);
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : Math.min(n % 10, 4) % 4] || 'th'}`;

async function standings(contest) {
  const snap = await getDocs(query(collection(db, `${P}/scores`), where('classId', '==', contest.classId)));
  const firstPerLesson = new Map(); // `${student}|${lesson}` -> earliest score in the window
  snap.docs.forEach(d => {
    const s = d.data();
    const t = ms(s.timestamp);
    if (!s.studentName || t < contest.startedAt || t > contest.endsAt) return;
    const k = `${s.studentName}|${s.lessonId}`;
    const cur = firstPerLesson.get(k);
    if (!cur || t < cur.t) firstPerLesson.set(k, { name: s.studentName, score: Number(s.score) || 0, t });
  });
  const byStudent = new Map();
  firstPerLesson.forEach(({ name, score, t }) => {
    const cur = byStudent.get(name) || { name, total: 0, last: 0 };
    cur.total += score;
    cur.last = Math.max(cur.last, t);
    byStudent.set(name, cur);
  });
  // highest total first; on a tie, whoever got there first
  return Array.from(byStudent.values()).filter(s => s.total > 0).sort((a, b) => b.total - a.total || a.last - b.last);
}

async function findTutoringUid(classId, name) {
  const r = await getDoc(doc(db, `${P}/classRoster`, `${classId}_${encodeURIComponent(name)}`));
  if (r.exists() && r.data().tutoringStudentUid) return r.data().tutoringStudentUid;
  const q = await getDocs(query(collection(db, `${P}/students`), where('name', '==', name)));
  return q.empty ? null : q.docs[0].id;
}

async function payOne(contest, rank, winner, coins) {
  const uid = await findTutoringUid(contest.classId, winner.name);
  const message = `🏆 ${ordinal(rank)} place in the ${contest.classId} contest! Congratulations!`.slice(0, 80);
  if (uid) {
    await setDoc(doc(collection(db, GIFTS)), { studentUid: uid, studentName: winner.name, coins, message, createdAt: serverTimestamp(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    await setDoc(doc(db, `${P}/students`, uid), { hasTeacherGift: true }, { merge: true });
    return 'gift box';
  }
  // not linked to a tutoring account: pay straight into the wallet
  await setDoc(doc(db, SHRINE_ROSTER, sanitize(winner.name)), { studentName: winner.name, coinBalance: increment(coins) }, { merge: true });
  return 'wallet';
}

async function main() {
  await signInAnonymously(auth);
  const now = Date.now();
  const active = await getDocs(query(collection(db, `${P}/smartStudyContests`), where('status', '==', 'active')));
  console.log(`${active.size} active contest(s)`);
  for (const d of active.docs) {
    const contest = { id: d.id, ...d.data() };
    if (contest.endsAt > now) { console.log(`${contest.id}: ends ${new Date(contest.endsAt).toISOString()}`); continue; }
    const ranked = await standings(contest);
    const prizes = contest.prizes || [];
    const winners = ranked.slice(0, prizes.length).map((w, i) => ({ rank: i + 1, name: w.name, total: w.total, coins: prizes[i] }));
    console.log(`${contest.id}: ended; ${ranked.length} students scored`);
    winners.forEach(w => console.log(`  #${w.rank} ${w.name}: ${w.total} points -> ${w.coins} coins`));
    if (DRY) continue;
    // claim it first so a second run can never pay twice
    const claimed = await runTransaction(db, async (tx) => {
      const s = await tx.get(d.ref);
      if (!s.exists() || s.data().status !== 'active') return false;
      tx.update(d.ref, { status: 'paying' });
      return true;
    });
    if (!claimed) continue;
    const how = [];
    for (const w of winners) how.push(await payOne(contest, w.rank, w, w.coins));
    await updateDoc(d.ref, { status: 'paid', paidAt: now, winners });
    await updateDoc(doc(db, `${P}/classes`, contest.classId), { contest: { id: contest.id, startedAt: contest.startedAt, endsAt: contest.endsAt, prizes, status: 'paid', paidAt: now, winners: winners.map(w => ({ rank: w.rank, name: w.name, total: w.total, coins: w.coins })) } }).catch(e => console.error('class doc update failed', e.message));
    console.log(`  paid ${winners.length} winner(s) (${how.join(', ')})`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

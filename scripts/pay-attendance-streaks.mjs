// The regular-attendance coin reward.
//
// Every scheduled class a student comes to, in a row, pays more coins (at most 500): the 1st class of a streak 100 coins, the 2nd 125, the 3rd 150 ...
// (+25 each time). Missing a scheduled class starts again from 100. Only a scheduled class counts (the weekly slot or the dated
// entry of that student, on that day); coming on another day earns nothing. A student with two classes a week uses the same rule:
// the streak goes on from one class to the next.
//
// Run once a day by .github/workflows/attendance-streaks.yml (morning, Pacific time): it works out the classes that have ended since
// the last run, who came, and pays each who came a teacher gift box (the same gift box the contest prizes use: the student sees it
// pop up on their Home page and opens it; the coins go into their wallet).
//
//   node scripts/pay-attendance-streaks.mjs          (pays)
//   node scripts/pay-attendance-streaks.mjs --dry    (only says what it would do)
//
// State: ONE small document, config/attendanceStreaks = { startedAtMs, processedThroughMs, students: { uid: { n, last } } }.
// The first run only starts the programme (nothing is paid for the past): classes from the start of that day on count.
process.env.TZ = process.env.TZ || 'America/Los_Angeles'; // the teacher's classes are in Pacific time (set before any date is made)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, getDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const DRY = process.argv.includes('--dry');
const BASE_COINS = 100;
const STEP_COINS = 25;
const MAX_COINS = 500; // the reward stops growing at 500 coins
const GRACE_MS = 30 * 60 * 1000; // a class counts once it has been over for half an hour
const P = `artifacts/${appId}/public/data`;
const GIFTS = 'artifacts/shrine-room-app/public/data/teacherGifts';
const STATE = doc(getFirestore(initializeApp(firebaseConfig)), `${P}/config/attendanceStreaks`);
const db = STATE.firestore;

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const toMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : 0));

async function main() {
  await signInAnonymously(getAuth(db.app));
  const now = Date.now();
  const cutoff = now - GRACE_MS;
  const snap = await getDoc(STATE);
  let state = snap.exists() ? snap.data() : null;
  // a dry run can pretend the programme started on a given day:  --dry --from=2026-10-12
  const fromArg = (process.argv.find(x => x.startsWith('--from=')) || '').slice(7);
  if (DRY && fromArg) state = { startedAtMs: Date.parse(fromArg), processedThroughMs: Date.parse(`${fromArg}T00:00:00`) , students: {} };
  if (!state || !state.processedThroughMs) {
    const startedAtMs = startOfDay(new Date());
    console.log(`Starting the programme: classes from ${new Date(startedAtMs).toString()} on count.`);
    if (!DRY) await setDoc(STATE, { startedAtMs, processedThroughMs: startedAtMs, students: {} });
    return;
  }
  const from = state.processedThroughMs;
  if (cutoff <= from) { console.log('Nothing new to look at.'); return; }
  const students = state.students || {};

  // the classes in the window: dated entries + the weekly slots (for a date that has no dated entry), from the day a slot was created
  const winStart = new Date(from - 24 * 3600 * 1000);
  const { Timestamp } = await import('firebase/firestore');
  const [schedSnap, recSnap, sessSnap] = await Promise.all([
    getDocs(query(collection(db, `${P}/teacherSchedule`), where('startTime', '>=', Timestamp.fromDate(winStart)), where('startTime', '<=', Timestamp.fromMillis(cutoff + 24 * 3600 * 1000)))),
    getDocs(collection(db, `${P}/recurringSchedule`)),
    getDocs(query(collection(db, `${P}/studySessions`), where('startTime', '>=', Timestamp.fromDate(winStart)))),
  ]);
  const real = schedSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.studentUid && e.studentUid !== 'offline' && e.startTime && e.endTime);
  const names = {};
  const classes = []; // { uid, name, start, end, override, day }
  const covered = new Set();
  real.forEach(e => {
    const s = e.startTime.toDate(); const en = e.endTime.toDate();
    names[e.studentUid] = e.studentName || names[e.studentUid];
    covered.add(`${e.studentUid}_${dayKey(s)}`);
    classes.push({ uid: e.studentUid, name: e.studentName, start: s.getTime(), end: en.getTime(), override: e.overrideStatus || null, day: dayKey(s) });
  });
  recSnap.docs.forEach(r => {
    const x = r.data();
    if (!x.studentUid || x.studentUid === 'offline' || x.studentInactive) return;
    names[x.studentUid] = x.studentName || names[x.studentUid];
    const [sh, sm] = String(x.startTime || '00:00').split(':').map(Number);
    const [eh, em] = String(x.endTime || '00:00').split(':').map(Number);
    const created = toMs(x.createdAt);
    for (let t = startOfDay(winStart); t <= cutoff + 24 * 3600 * 1000; t += 24 * 3600 * 1000) {
      const d = new Date(t + 12 * 3600 * 1000); // noon of that day, safe against clock changes
      if (d.getDay() !== x.dayOfWeek) continue;
      if (created && startOfDay(d) < startOfDay(new Date(created))) continue;
      const key = `${x.studentUid}_${dayKey(d)}`;
      if (covered.has(key)) continue;
      covered.add(key);
      classes.push({ uid: x.studentUid, name: x.studentName, start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm).getTime(), end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em).getTime(), override: null, day: dayKey(d) });
    }
  });
  const attendedDays = new Set();
  sessSnap.docs.forEach(d => { const x = d.data(); if (x.studentUid && x.startTime) attendedDays.add(`${x.studentUid}_${dayKey(x.startTime.toDate())}`); });

  // only the classes that ended in this run's window, oldest first
  const due = classes.filter(c => c.end > from && c.end <= cutoff).sort((a, b) => a.start - b.start);
  console.log(`${due.length} class(es) ended since ${new Date(from).toISOString()}`);
  const pay = []; // { uid, name, n, coins }
  due.forEach(c => {
    const st = students[c.uid] || { n: 0, last: 0 };
    const came = c.override === 'attended' || (c.override !== 'absent' && attendedDays.has(`${c.uid}_${c.day}`));
    if (came) {
      st.n += 1; st.last = c.start;
      const coins = Math.min(MAX_COINS, BASE_COINS + STEP_COINS * (st.n - 1));
      pay.push({ uid: c.uid, name: c.name || names[c.uid] || 'Student', n: st.n, coins });
      console.log(`  ${c.name || c.uid}: came (${c.day}) -> class ${st.n} in a row, ${coins} coins`);
    } else {
      if (st.n > 0) console.log(`  ${c.name || c.uid}: missed (${c.day}) -> streak of ${st.n} ends`);
      st.n = 0;
    }
    students[c.uid] = st;
  });

  if (DRY) {
    const top = Object.entries(students).filter(([, v]) => v.n > 0).sort((x, y) => y[1].n - x[1].n).slice(0, 8).map(([u, v]) => `${names[u] || u}: ${v.n}`);
    console.log(`(dry run: nothing written; ${pay.length} reward(s) would be paid, ${pay.reduce((n, p) => n + p.coins, 0)} coins) longest streaks now: ${top.join(' | ')}`);
    return;
  }
  // save the state FIRST, so a second run can never pay the same class twice
  await setDoc(STATE, { startedAtMs: state.startedAtMs, processedThroughMs: cutoff, students, updatedAt: serverTimestamp() }, { merge: true });
  for (const p of pay) {
    const message = (p.n === 1 ? '🌟 You came to class! Keep coming!' : `🔥 ${p.n} classes in a row! Great attendance!`).slice(0, 80);
    await setDoc(doc(collection(db, GIFTS)), { studentUid: p.uid, studentName: p.name, coins: p.coins, message, createdAt: serverTimestamp(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
    await setDoc(doc(db, `${P}/students`, p.uid), { hasTeacherGift: true }, { merge: true });
  }
  console.log(`Paid ${pay.length} attendance reward(s).`);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

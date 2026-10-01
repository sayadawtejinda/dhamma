// One-time seed migration: reads THIS WEEK's teacherSchedule docs (the
// window the live app already treats as "this week") and writes one
// recurringSchedule doc per distinct (student, dayOfWeek, startTime) slot
// found -- this week's already-correct schedule is exactly what the teacher
// said to use as the source, no guessing across history needed.
//
// Dry run by default (just logs what it would write). Pass --write to
// actually commit the writes.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const WRITE = process.argv.includes('--write');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const publicDataPath = `/artifacts/${appId}/public/data`;

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function pad(n) { return String(n).padStart(2, '0'); }
function hhmm(date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }

async function main() {
  await signInAnonymously(auth);

  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setDate(weekEnd.getDate() + 7);

  const snap = await getDocs(query(
    collection(db, `${publicDataPath}/teacherSchedule`),
    where('startTime', '>=', Timestamp.fromDate(weekStart)),
    where('startTime', '<', Timestamp.fromDate(weekEnd)),
  ));

  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Group by identity (studentUid, or studentName for offline).
  const byStudent = new Map();
  for (const e of entries) {
    if (!e.startTime || !e.endTime) continue;
    const key = e.studentUid === 'offline' ? `offline:${e.studentName}` : `uid:${e.studentUid}`;
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key).push(e);
  }

  const slotsToCreate = [];
  const flagged = [];

  for (const [key, list] of byStudent.entries()) {
    // De-dupe to distinct (dayOfWeek, startTime, endTime) slots -- a
    // recurring series materializes the SAME weekday+time every week, so
    // this week's docs for one student should collapse to 1 (or rarely 2,
    // per the teacher) distinct slots even if there happen to be multiple
    // dated docs this week for some reason.
    const distinct = new Map();
    for (const e of list) {
      const start = e.startTime.toDate();
      const end = e.endTime.toDate();
      const slotKey = `${start.getDay()}_${hhmm(start)}_${hhmm(end)}`;
      if (!distinct.has(slotKey)) {
        distinct.set(slotKey, {
          studentUid: e.studentUid,
          studentName: e.studentName,
          groupId: e.groupId || null,
          dayOfWeek: start.getDay(),
          startTime: hhmm(start),
          endTime: hhmm(end),
        });
      }
    }
    const slots = [...distinct.values()];
    slotsToCreate.push(...slots);
    if (slots.length > 2) {
      flagged.push({ key, count: slots.length, slots });
    }
  }

  console.log(`This week's teacherSchedule docs: ${entries.length}`);
  console.log(`Distinct students/offline-names found: ${byStudent.size}`);
  console.log(`recurringSchedule docs that would be created: ${slotsToCreate.length}`);
  if (flagged.length > 0) {
    console.log(`\n⚠️  ${flagged.length} student(s) with MORE than 2 distinct slots this week (review before writing):`);
    flagged.forEach(f => console.log(`  ${f.key}: ${f.count} slots`, JSON.stringify(f.slots.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`))));
  }

  console.log(`\nSample (first 10):`);
  slotsToCreate.slice(0, 10).forEach(s => console.log(`  ${s.studentName} (${s.studentUid}) — day ${s.dayOfWeek}, ${s.startTime}-${s.endTime}${s.groupId ? ` [group ${s.groupId}]` : ''}`));

  if (!WRITE) {
    console.log('\nDry run only -- re-run with --write to actually create these recurringSchedule docs.');
    process.exit(0);
  }

  const col = collection(db, `${publicDataPath}/recurringSchedule`);
  let created = 0;
  for (const s of slotsToCreate) {
    await addDoc(col, { ...s, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    created++;
  }
  console.log(`\n✅ Created ${created} recurringSchedule docs.`);
  process.exit(0);
}

main().catch(e => { console.error('Migration failed:', e); process.exit(1); });

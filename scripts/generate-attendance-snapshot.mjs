// Regenerates public/yearAttendanceSnapshot.json -- a static, precomputed
// copy of the "This Year's Attendance" leaderboard (see YearAttendanceBoard
// in src/TutoringApp.jsx). That board used to read the WHOLE class's whole
// year of schedule+session docs (~11,000+) live from Firestore every single
// time any student opened that tab -- a real, measured cost driver once a
// few students flipped between view tabs a handful of times in one sitting.
//
// Instead, this script runs the same computation ONCE here, and the app
// just fetches the resulting small JSON file (a normal static asset served
// by GitHub Pages, same as everything under public/) -- zero Firestore
// reads for that view, however many students open it or how often.
//
// Run manually with `npm run snapshot:attendance`, or automatically once a
// week by .github/workflows/weekly-attendance-snapshot.yml, which commits
// the refreshed file and pushes to main (triggering the normal deploy).
// The tradeoff the teacher explicitly accepted: this board can be up to a
// week stale, off by the one or two students who attended since the last
// run -- fine for a leaderboard, not something anyone needs to the second.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'yearAttendanceSnapshot.json');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const publicDataPath = `/artifacts/${appId}/public/data`;

// Same attendance rule as getStudentAttendanceForEntry in TutoringApp.jsx --
// kept in sync by hand since this script runs outside the React app.
function getStudentAttendanceForEntry(entry, studentUid, sessions) {
  if (entry.overrideStatus === 'attended') return 'attended';
  if (entry.overrideStatus === 'absent') return 'absent';
  if (entry.studentUid !== 'offline') {
    const entryDate = entry.startTime.toDate();
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
    const didAttend = (sessions || []).some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
    return didAttend ? 'attended' : 'absent';
  }
  return 'absent';
}

async function main() {
  await signInAnonymously(auth);

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const [studentsSnap, scheduleSnap, sessionsSnap] = await Promise.all([
    getDocs(collection(db, `${publicDataPath}/students`)),
    getDocs(query(collection(db, `${publicDataPath}/teacherSchedule`), where('startTime', '>=', Timestamp.fromDate(startOfYear)))),
    getDocs(query(collection(db, `${publicDataPath}/studySessions`), where('startTime', '>=', Timestamp.fromDate(startOfYear)))),
  ]);

  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const schedule = scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const now = new Date();
  const offlineNames = [...new Set(schedule.filter(s => s.studentUid === 'offline').map(s => s.studentName))];
  const offlineEntries = offlineNames.map(name => ({ id: `offline-${name}`, name, isOffline: true }));
  const onlineEntries = students.filter(s => s.isActive === true).map(s => ({ id: s.id, name: s.name, isOffline: false }));
  const allEntries = [...onlineEntries, ...offlineEntries];

  const computed = allEntries.map(entry => {
    let attended = 0, absent = 0;
    schedule.forEach(sched => {
      const entryDate = sched.startTime.toDate();
      if (entryDate > now || entryDate < startOfYear) return;
      const isMatch = entry.isOffline
        ? (sched.studentUid === 'offline' && sched.studentName === entry.name)
        : (sched.studentUid === entry.id);
      if (!isMatch) return;
      const status = getStudentAttendanceForEntry(sched, entry.id, sessions);
      if (status === 'attended') attended++; else absent++;
    });
    return { id: entry.id, name: entry.name, isOffline: entry.isOffline, attended, absent, total: attended + absent };
  });

  const rankedList = computed
    .filter(e => e.total > 0)
    .sort((a, b) => b.attended - a.attended);

  const snapshot = { generatedAt: new Date().toISOString(), rankedList };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${rankedList.length} entries to ${OUT_PATH}`);
  process.exit(0);
}

main().catch(e => { console.error('Snapshot generation failed:', e); process.exit(1); });

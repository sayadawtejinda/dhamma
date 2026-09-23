// Regenerates public/weeklySnapshot.json -- a static, precomputed copy of
// TWO whole-class leaderboards (see YearAttendanceBoard and TrophyBoard in
// src/TutoringApp.jsx) that both used to read the whole class's whole year
// of schedule+session docs live from Firestore every single time ANY
// student opened either tab -- a real, measured cost driver once a few
// students flipped between view tabs a handful of times in one sitting.
//
// Instead, this script runs the computation ONCE here, and the app just
// fetches the resulting small JSON file (a normal static asset served by
// GitHub Pages, same as everything under public/) -- zero Firestore reads
// for either view, however many students open them or how often.
//
// Run manually with `npm run snapshot:weekly`, or automatically once a week
// by .github/workflows/weekly-attendance-snapshot.yml, which commits the
// refreshed file and pushes to main (triggering the normal deploy). The
// tradeoff the teacher explicitly accepted: both boards can be up to a week
// stale -- fine for a leaderboard, not something anyone needs to the second.
// (Sending a ❤️ on the Trophies tab is still a live Firestore write -- only
// the DISPLAYED counts are the once-a-week snapshot.)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'weeklySnapshot.json');

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

  // "This Year's Attendance" board -- only students/classes with at least
  // one scheduled session this year show up at all.
  const attendanceRankedList = computed
    .filter(e => e.total > 0)
    .sort((a, b) => b.attended - a.attended);

  // "🏆 Trophies" board -- every active student, so a student with zero
  // trophies still finds their own "attended this year" number (used to
  // work out how many ❤️ they have left to give) and their row, even if the
  // app only ever DISPLAYS the ones with trophyCount > 0.
  const attendedById = Object.fromEntries(computed.filter(e => !e.isOffline).map(e => [e.id, e.attended]));
  const trophyList = students
    .filter(s => s.isActive === true)
    .map(s => ({
      id: s.id,
      name: s.name,
      trophyCount: s.trophyCount || 0,
      heartsReceived: s.heartsReceived || 0,
      heartsFromCounts: s.heartsFromCounts || {},
      attendedThisYear: attendedById[s.id] || 0,
    }));

  const snapshot = { generatedAt: new Date().toISOString(), attendanceRankedList, trophyList };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${attendanceRankedList.length} attendance rows and ${trophyList.length} trophy rows to ${OUT_PATH}`);
  process.exit(0);
}

main().catch(e => { console.error('Snapshot generation failed:', e); process.exit(1); });

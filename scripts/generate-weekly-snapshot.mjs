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
import { writeFileSync, mkdirSync } from 'node:fs';
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

// The app no longer creates a new dated teacherSchedule doc for every week
// (see recurringSchedule / migrate-to-recurring-schedule.mjs) -- a student's
// weekly slot is now one persistent doc that this script has to map onto
// real calendar dates itself for any week that doesn't already have a real
// dated teacherSchedule doc (i.e. every week from here on). Weeks that DO
// still have real dated docs (everything before this change shipped, plus
// the very week it shipped in, which is what seeded recurringSchedule) are
// left exactly as they were -- this only fills the gap going forward.
function synthesizeOccurrencesFromRecurringSchedule(recurringSlots, realSchedule, startOfYear, now) {
  const covered = new Set(); // `${studentKey}_${yyyy-mm-dd}`
  realSchedule.forEach(e => {
    const d = e.startTime.toDate();
    const key = e.studentUid === 'offline' ? `offline:${e.studentName}` : `uid:${e.studentUid}`;
    covered.add(`${key}_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  });

  const synthetic = [];
  for (const slot of recurringSlots) {
    const key = slot.studentUid === 'offline' ? `offline:${slot.studentName}` : `uid:${slot.studentUid}`;
    const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
    // Walk every date in range, pick out the ones matching this slot's weekday.
    const cursor = new Date(startOfYear);
    while (cursor <= now) {
      if (cursor.getDay() === slot.dayOfWeek) {
        const dateKey = `${key}_${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!covered.has(dateKey)) {
          const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), sh, sm);
          const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), eh, em);
          synthetic.push({
            id: `synthetic-${slot.id}-${dateKey}`,
            studentUid: slot.studentUid,
            studentName: slot.studentName,
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
            overrideStatus: null,
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return synthetic;
}

async function main() {
  await signInAnonymously(auth);

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const [studentsSnap, scheduleSnap, sessionsSnap, recurringSnap] = await Promise.all([
    getDocs(collection(db, `${publicDataPath}/students`)),
    getDocs(query(collection(db, `${publicDataPath}/teacherSchedule`), where('startTime', '>=', Timestamp.fromDate(startOfYear)))),
    getDocs(query(collection(db, `${publicDataPath}/studySessions`), where('startTime', '>=', Timestamp.fromDate(startOfYear)))),
    getDocs(collection(db, `${publicDataPath}/recurringSchedule`)),
  ]);

  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const realSchedule = scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const recurringSlots = recurringSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const now = new Date();
  const synthetic = synthesizeOccurrencesFromRecurringSchedule(recurringSlots, realSchedule, startOfYear, now);
  const schedule = [...realSchedule, ...synthetic];

  // Offline students are no longer counted in attendance at all (per the
  // teacher) -- they still appear in the live Today/This Week schedule view
  // in the app, just excluded from every tally here.
  const onlineEntries = students.filter(s => s.isActive === true).map(s => ({ id: s.id, name: s.name, isOffline: false }));
  const allEntries = onlineEntries;

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

  // Class-wide month / year attendance totals for the Teacher Dashboard's
  // summary boxes (the dashboard itself only keeps two weeks of schedule live).
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const attendanceTotals = { month: { attended: 0, absent: 0 }, year: { attended: 0, absent: 0 } };
  schedule.forEach(entry => {
    if (entry.studentUid === 'offline') return; // no longer counted (see allEntries above)
    const d = entry.startTime.toDate();
    if (d > now || d < startOfYear) return;
    const status = getStudentAttendanceForEntry(entry, entry.studentUid, sessions);
    const key = status === 'attended' ? 'attended' : 'absent';
    attendanceTotals.year[key]++;
    if (d >= startOfMonth) attendanceTotals.month[key]++;
  });

  const snapshot = { generatedAt: new Date().toISOString(), attendanceRankedList, trophyList, attendanceTotals };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));

  // ---- Class leaderboards for SmartStudy / Abhidhamma ----
  // Each class's scores, so a student's tab can show classmates' standings
  // from a static file (weekly) instead of reading every score live; the
  // student's OWN scores are still read live by the app and merged in. On
  // the Sunday Parami window the app reads Firestore directly instead.
  const CLASS_DIR = join(__dirname, '..', 'public', 'classSnapshots');
  mkdirSync(join(CLASS_DIR, 'smartstudy'), { recursive: true });
  const generatedAt = new Date().toISOString();
  const ssScoresSnap = await getDocs(collection(db, `${publicDataPath}/scores`));
  const ssByClass = {};
  ssScoresSnap.docs.forEach(d => {
    const s = d.data();
    if (!s.classId) return;
    (ssByClass[s.classId] = ssByClass[s.classId] || []).push({ id: d.id, classId: s.classId, studentName: s.studentName, studentAgeLevel: s.studentAgeLevel, lessonId: s.lessonId, score: s.score, timestamp: s.timestamp });
  });
  for (const [cid, scores] of Object.entries(ssByClass)) {
    writeFileSync(join(CLASS_DIR, 'smartstudy', `${encodeURIComponent(cid)}.json`), JSON.stringify({ generatedAt, scores }));
  }
  // Students' reflections, one static file per class, so a student reading a lesson
  // sees classmates' older reflections without any Firestore read (newer ones show
  // after the next weekly refresh; the student's own are always read live).
  mkdirSync(join(CLASS_DIR, 'smartstudy-reflections'), { recursive: true });
  const ssReflSnap = await getDocs(collection(db, `${publicDataPath}/reflections`));
  const reflByClass = {};
  ssReflSnap.docs.forEach(d => {
    const r = d.data();
    if (!r.classId || !r.lessonId || !r.text) return;
    (reflByClass[r.classId] = reflByClass[r.classId] || []).push({ id: d.id, classId: r.classId, lessonId: r.lessonId, studentName: r.studentName, text: r.text, timestamp: r.timestamp });
  });
  for (const [cid, reflections] of Object.entries(reflByClass)) {
    writeFileSync(join(CLASS_DIR, 'smartstudy-reflections', `${encodeURIComponent(cid)}.json`), JSON.stringify({ generatedAt, reflections }));
  }
  // ---- Per-student "weeks attended" (all time), for the Bodhi Tree and Shrine Room ----
  // Both used to read a student's whole schedule + whole session history every time
  // they were opened. One small static file replaces that (up to a week old).
  const [allSchedSnap, allSessSnap] = await Promise.all([
    getDocs(collection(db, `${publicDataPath}/teacherSchedule`)),
    getDocs(collection(db, `${publicDataPath}/studySessions`)),
  ]);
  const allRealSchedule = allSchedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const allSessions = allSessSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const allSchedule = [...allRealSchedule, ...synthesizeOccurrencesFromRecurringSchedule(recurringSlots, allRealSchedule, startOfYear, now)];
  const weekKeyOf = (date) => {
    const day = date.getDay();
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + ((day === 0 ? -6 : 1) - day));
    return monday.toISOString().slice(0, 10);
  };
  const sessionDays = new Set(allSessions.filter(s => s.startTime && s.studentUid).map(s => { const d = s.startTime.toDate(); return `${s.studentUid}_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }));
  const weeksByUid = {};
  allSchedule.forEach(e => {
    if (!e.studentUid || e.studentUid === 'offline' || !e.endTime || !e.startTime) return;
    if (e.endTime.toDate() >= now) return;
    const d = e.startTime.toDate();
    const attended = e.overrideStatus === 'attended' || (e.overrideStatus !== 'absent' && sessionDays.has(`${e.studentUid}_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
    if (!attended) return;
    (weeksByUid[e.studentUid] = weeksByUid[e.studentUid] || new Set()).add(weekKeyOf(d));
  });
  const attendedWeeks = {};
  Object.entries(weeksByUid).forEach(([uid, set]) => { attendedWeeks[uid] = set.size; });
  writeFileSync(join(__dirname, '..', 'public', 'studentWeekly.json'), JSON.stringify({ generatedAt, attendedWeeks }));

  // ---- "Who was active this week" for every app's online pill ----
  // Each app's pill used to read that app's whole roster collection (about 90
  // docs) whenever it was opened. Now a student's pill reads one of these static
  // files (the docs active in the last 14 days; the pill itself only lists the last
  // 7 days). The shared file name is the collection path with / turned into __ .
  const rosterTargets = [
    ...['animal-sound-app', 'shrine-room-app', 'bodhi-tree-app', 'burmese-consonant-game-app', 'burmese-learning-games-app', 'consonant-practice-app',
      'interactive-learning-quiz-app', 'myanmar-consonant-endings-app', 'myanmar-number-learning-app', 'myanmar-part1a-app', 'myanmar-part1and2-app',
      'myanmar-part1b-app', 'myanmar-part2a-app', 'myanmar-part2b-app', 'myanmar-poems-app', 'myanmar-reader-app', 'myanmar-sound-practice-app',
      'myanmar-spelling-app', 'myanmar-vowels-learning-app', 'reading-myanmar-app', 'speaking-myanmar-app', 'time-and-calendar-app',
      'watch-and-learn-app', 'myanmar-speaking-app'].map(a => ({ path: `artifacts/${a}/public/data/roster`, field: 'lastSeen' })),
    { path: `artifacts/${appId}/public/data/classRoster`, field: 'lastSeen' },
    { path: 'artifacts/lesson-translator-app-v6/public/data/classRoster', field: 'lastSeen' },
    { path: 'artifacts/dhammaschool-app/public/data/presence', field: 'lastActive' },
  ];
  const plain = (v) => {
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    if (Array.isArray(v)) return v.map(plain);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
    return v;
  };
  const msOf = (v) => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : (v && typeof v.seconds === 'number' ? v.seconds * 1000 : 0));
  const ROSTER_DIR = join(__dirname, '..', 'public', 'rosterSnapshots');
  mkdirSync(ROSTER_DIR, { recursive: true });
  const rosterCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const target of rosterTargets) {
    try {
      const snap = await getDocs(collection(db, target.path));
      const docs = snap.docs.filter(d => msOf(d.data()[target.field]) > rosterCutoff).map(d => ({ id: d.id, ...plain(d.data()) }));
      writeFileSync(join(ROSTER_DIR, `${target.path.replace(/\//g, '__')}.json`), JSON.stringify({ generatedAt, docs }));
    } catch (e) { console.error('Roster snapshot failed for', target.path, e.message); }
  }
  const ABHI = 'artifacts/lesson-translator-app-v6/public/data';
  const [abhiScoresSnap, abhiClassesSnap] = await Promise.all([
    getDocs(collection(db, `${ABHI}/global_scores`)),
    getDocs(collection(db, `${ABHI}/classes`)),
  ]);
  const abhiClasses = {};
  await Promise.all(abhiClassesSnap.docs.map(async c => {
    const lessons = await getDocs(collection(db, `${ABHI}/classes/${c.id}/lessons`));
    abhiClasses[c.id] = { totalLessons: lessons.size, students: {} };
  }));
  const abhiSets = {};
  abhiScoresSnap.docs.forEach(d => {
    const s = d.data();
    const sn = s.studentName || s.name;
    if (!s.classId || !s.lessonId || !sn || !abhiClasses[s.classId]) return;
    const k = `${s.classId} ${sn}`;
    (abhiSets[k] = abhiSets[k] || new Set()).add(s.lessonId);
  });
  Object.entries(abhiSets).forEach(([k, set]) => {
    const [cid, sn] = k.split(' ');
    abhiClasses[cid].students[sn] = set.size;
  });
  writeFileSync(join(CLASS_DIR, 'abhidhamma.json'), JSON.stringify({ generatedAt, classes: abhiClasses }));
  console.log(`Class snapshots: ${Object.keys(ssByClass).length} SmartStudy classes, ${Object.keys(abhiClasses).length} Abhidhamma classes`);
  console.log(`Wrote ${attendanceRankedList.length} attendance rows and ${trophyList.length} trophy rows to ${OUT_PATH}`);
  process.exit(0);
}

main().catch(e => { console.error('Snapshot generation failed:', e); process.exit(1); });

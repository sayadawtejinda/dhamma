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
import { getFirestore, collection, query, where, getDocs, getDoc, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { refreshClassSnapshots, refreshClassDocSnapshots, refreshAbhidhammaClassFiles, refreshDhammaschoolProgress, refreshFestivalDeeds, CLASS_DIR } from './class-snapshots.mjs';
import { refreshContentSnapshots, refreshAnnouncementsSnapshot, refreshAvatarSnapshot, refreshScheduleSnapshot } from './content-snapshots.mjs';

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
    // Walk every date in range, pick out the ones matching this slot's weekday -- but only from the day the slot was
    // created (a new student's slot must not be counted for the weeks before they ever came: that made brand-new
    // students look like "missed 10 weeks in a row" and switched them off).
    const createdMs = slot.createdAt && typeof slot.createdAt.toMillis === 'function' ? slot.createdAt.toMillis() : 0;
    const cursor = new Date(Math.max(startOfYear.getTime(), createdMs ? new Date(new Date(createdMs).getFullYear(), new Date(createdMs).getMonth(), new Date(createdMs).getDate()).getTime() : 0));
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

  // The weekly refresh is split over the week so Firebase is not read all at once:
  //   --only=core     (Monday)    attendance, trophies, weeks attended, each student's history
  //   --only=classes  (Tuesday)   SmartStudy / Abhidhamma / Dhammaschool class boards + trophy announcements
  //   --only=content  (Wednesday) Myanmar Speaker content + every student's Avatar look
  //   --only=roster   (Thursday)  the "active this week" lists / Shrine Room / Nature World pictures
  // No flag = everything (running it by hand).
  const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
  const want = (part) => !ONLY || ONLY === part;
  const generatedAt = new Date().toISOString();

  if (want('core')) {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  // Only what is NEW is read from Firebase. Every student's year of schedule + sessions already sits in
  // public/studentHistory/{uid}.json from the earlier runs, so a normal run reads just the schedule entries and
  // sessions from the last 3 weeks (about 1,000 documents) and adds them to what is on disk. About every 4 weeks (or
  // with --full, or when there is no state yet) everything is read again, which also catches entries that were deleted.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const STATE_PATH = join(__dirname, '..', 'public', 'weeklyState.json');
  const KEYS_PATH = join(__dirname, '..', 'public', 'studentWeeklyKeys.json');
  const HISTORY_DIR = join(__dirname, '..', 'public', 'studentHistory');
  mkdirSync(HISTORY_DIR, { recursive: true });
  let state = {};
  try { state = JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch (e) { state = {}; }
  const FULL = process.argv.includes('--full') || !state.lastRunMs || !state.fullAt || Date.now() - state.fullAt > 28 * DAY_MS;
  const sinceMs = FULL ? 0 : state.lastRunMs - 21 * DAY_MS;
  const sinceTs = Timestamp.fromMillis(sinceMs);
  console.log(FULL ? 'Attendance: reading everything (full run)' : `Attendance: reading only what is new since ${new Date(sinceMs).toISOString().slice(0, 10)}`);
  const schedRef = collection(db, `${publicDataPath}/teacherSchedule`);
  const sessRef = collection(db, `${publicDataPath}/studySessions`);
  const [studentsSnap, scheduleSnap, sessionsSnap, recurringSnap] = await Promise.all([
    getDocs(collection(db, `${publicDataPath}/students`)),
    getDocs(FULL ? schedRef : query(schedRef, where('startTime', '>=', sinceTs))),
    getDocs(FULL ? sessRef : query(sessRef, where('startTime', '>=', sinceTs))),
    getDocs(collection(db, `${publicDataPath}/recurringSchedule`)),
  ]);

  // the earlier runs' data, from the history files (their timestamps were saved as { _ms })
  const revive = (v) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v._ms === 'number') return Timestamp.fromMillis(v._ms);
    if (Array.isArray(v)) return v.map(revive);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
    return v;
  };
  const inYear = (e) => e.startTime && typeof e.startTime.toDate === 'function' && e.startTime.toDate() >= startOfYear;
  const prevLessonsByUid = {};
  const scheduleById = new Map();
  const sessionsById = new Map();
  if (!FULL) {
    for (const f of existsSync(HISTORY_DIR) ? readdirSync(HISTORY_DIR).filter(x => x.endsWith('.json')) : []) {
      try {
        const h = JSON.parse(readFileSync(join(HISTORY_DIR, f), 'utf8'));
        (h.schedule || []).forEach(e => scheduleById.set(e.id, revive(e)));
        (h.sessions || []).forEach(x => sessionsById.set(x.id, revive(x)));
        if (h.lessons && h.lessons.length) prevLessonsByUid[decodeURIComponent(f.replace(/\.json$/, ''))] = h.lessons;
      } catch (e) { /* a damaged file: the next full run rebuilds it */ }
    }
  }
  scheduleSnap.docs.forEach(d => scheduleById.set(d.id, { id: d.id, ...d.data() }));
  sessionsSnap.docs.forEach(d => sessionsById.set(d.id, { id: d.id, ...d.data() }));
  const allRealSchedule = [...scheduleById.values()];
  const allSessions = [...sessionsById.values()];

  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const realSchedule = allRealSchedule.filter(inYear);
  const recurringSlots = recurringSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const sessions = allSessions.filter(inYear);

  const now = new Date();
  const synthetic = synthesizeOccurrencesFromRecurringSchedule(recurringSlots, realSchedule, startOfYear, now);
  const schedule = [...realSchedule, ...synthetic];

  // ---- Automatic deactivation ----
  // A student who has missed their last 10 scheduled WEEKS in a row (a week counts as
  // attended if any class that week was) is switched to inactive; the teacher can switch
  // them back on from the student list, which starts a fresh count (reactivatedAt).
  // Safety: nothing is changed if it would deactivate more than a quarter of the class
  // (that would be a data problem, not absences).
  const MISSED_WEEKS_LIMIT = 10;
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const mondayOf = (d) => { const day = d.getDay(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((day === 0 ? -6 : 1) - day)).toISOString().slice(0, 10); };
  const sessionDayKeys = new Set(sessions.filter(s => s.studentUid && s.startTime).map(s => `${s.studentUid}_${dayKey(s.startTime.toDate())}`));
  const toMs = (v) => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : 0);
  const toDeactivate = [];
  students.filter(s => s.isActive === true).forEach(s => {
    const since = toMs(s.reactivatedAt);
    const weeks = {};
    schedule.forEach(e => {
      if (e.studentUid !== s.id || !e.endTime || !e.startTime || e.endTime.toDate() >= now) return;
      if (since && e.startTime.toDate().getTime() <= since) return;
      const attended = e.overrideStatus === 'attended' || (e.overrideStatus !== 'absent' && sessionDayKeys.has(`${s.id}_${dayKey(e.startTime.toDate())}`));
      const k = mondayOf(e.startTime.toDate());
      weeks[k] = weeks[k] || attended;
    });
    const last = Object.keys(weeks).sort().reverse().slice(0, MISSED_WEEKS_LIMIT);
    if (last.length === MISSED_WEEKS_LIMIT && last.every(k => !weeks[k])) toDeactivate.push(s);
  });
  const activeCount = students.filter(s => s.isActive === true).length;
  if (toDeactivate.length > 0 && toDeactivate.length <= activeCount * 0.25) {
    for (const s of toDeactivate) {
      await updateDoc(doc(db, `${publicDataPath}/students`, s.id), { isActive: false, autoDeactivatedAt: Date.now(), autoDeactivatedReason: `Missed ${MISSED_WEEKS_LIMIT} scheduled weeks in a row` });
      s.isActive = false;
    }
    console.log(`Auto-deactivated ${toDeactivate.length}: ${toDeactivate.map(s => s.name).join(', ')}`);
  } else if (toDeactivate.length > 0) {
    console.warn(`Skipped auto-deactivation: ${toDeactivate.length} of ${activeCount} would be deactivated (more than a quarter).`);
  }

  // Keep every weekly slot's studentInactive flag in step with its student, so the Weekly Schedule
  // can hide the slots of students who are off without reading the whole students list.
  const activeById = new Map(students.map(st => [st.id, st.isActive === true]));
  let flagged = 0;
  for (const r of recurringSnap.docs) {
    const d = r.data();
    if (d.studentUid === 'offline' || !activeById.has(d.studentUid)) continue;
    const inactive = !activeById.get(d.studentUid);
    if (!!d.studentInactive !== inactive) { await updateDoc(r.ref, { studentInactive: inactive }); flagged += 1; }
  }
  if (flagged > 0) console.log(`Updated the studentInactive flag on ${flagged} weekly slot(s).`);

  // Offline students are no longer counted in attendance at all (per the
  // teacher) -- they still appear in the live Today/This Week schedule view
  // in the app, just excluded from every tally here.
  const onlineEntries = students.filter(s => s.isActive === true).map(s => ({ id: s.id, name: s.name, isOffline: false }));
  const allEntries = onlineEntries;

  const computed = allEntries.map(entry => {
    let attended = 0, absent = 0, monthAttended = 0, monthAbsent = 0;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    schedule.forEach(sched => {
      const entryDate = sched.startTime.toDate();
      if (entryDate > now || entryDate < startOfYear) return;
      const isMatch = entry.isOffline
        ? (sched.studentUid === 'offline' && sched.studentName === entry.name)
        : (sched.studentUid === entry.id);
      if (!isMatch) return;
      const status = getStudentAttendanceForEntry(sched, entry.id, sessions);
      if (status === 'attended') attended++; else absent++;
      if (entryDate >= monthStart) { if (status === 'attended') monthAttended++; else monthAbsent++; }
    });
    return { id: entry.id, name: entry.name, isOffline: entry.isOffline, attended, absent, total: attended + absent, monthAttended, monthAbsent };
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
  // Every student who has come into the Trophies list gets 3 hearts from the teacher, once (they count towards the heart badges).
  for (const s of students.filter(x => x.isActive === true && (x.trophyCount || 0) > 0 && !x.teacherHeartsGiven)) {
    await updateDoc(doc(db, `${publicDataPath}/students`, s.id), { heartsReceived: increment(3), 'heartsFromCounts.Teacher_name': 'Teacher', 'heartsFromCounts.Teacher_count': increment(3), teacherHeartsGiven: true });
    s.heartsReceived = (s.heartsReceived || 0) + 3; s.teacherHeartsGiven = true;
    s.heartsFromCounts = { ...(s.heartsFromCounts || {}), Teacher_name: 'Teacher', Teacher_count: ((s.heartsFromCounts || {}).Teacher_count || 0) + 3 };
    console.log(`Teacher gave 3 hearts to ${s.name}`);
  }
  // Hearts to give = every class attended, over ALL years (the year changing takes nothing away): each year's count is kept in a small file.
  const CARRY_PATH = join(__dirname, 'heartsCarry.json');
  let carry = {}; try { carry = JSON.parse(readFileSync(CARRY_PATH, 'utf8')); } catch (e) { /* first run */ }
  const thisYear = String(now.getFullYear());
  Object.entries(attendedById).forEach(([uid, n]) => { if (n > 0) (carry[uid] = carry[uid] || {})[thisYear] = n; });
  writeFileSync(CARRY_PATH, JSON.stringify(carry));
  const attendedAllYears = Object.fromEntries(Object.entries(carry).map(([uid, y]) => [uid, Object.values(y).reduce((a, b) => a + b, 0)]));
  // The teacher-approved cups of the three Reading Myanmar parts (Lesson Bank unit counts on the student's record): cp = Consonant Practice (7),
  // bg = Burmese Consonant Game (19), vl = Myanmar Vowels (Basic 8 + Pro 3 = 11). The badges read these from the weekly file.
  // Abhidhamma lessons the teacher has confirmed (trophies): { byClass: { 'BASIC-ABHIDHAMMA-2': 35 }, legacy: 143 }. Entries that name their class
  // ('Abhidhamma Lesson_CLASS', 'Dhammapada Chapter-1') go in byClass; the old ones ('Basic Abhiddhamma-5', 'Basic Abhidhamma & ☸' ...) only give a floor.
  const abUnitsOf = (s) => {
    const byClass = {}; let legacy = 0;
    Object.entries(s.completedUnits || {}).forEach(([k, v]) => {
      const n = Number(v) || 0; if (!n) return;
      let m = /^Abhidhamma Lesson_(.+)$/.exec(k);
      if (m) { byClass[m[1].toUpperCase()] = Math.max(byClass[m[1].toUpperCase()] || 0, n); return; }
      if (/^Dhammapada Chapter-1$/i.test(k)) { byClass['DHAMMAPADA-1'] = Math.max(byClass['DHAMMAPADA-1'] || 0, n); return; }
      if (/^Basic Abhi/i.test(k)) legacy = Math.max(legacy, n);
    });
    return Object.keys(byClass).length || legacy ? { byClass, legacy } : null;
  };
  // Smart Study lessons the teacher has confirmed (trophies) per class: { TADINGYUT: 10 } from 'Smart Study Lesson_TADINGYUT'
  const ssUnitsOf = (s) => {
    const out = {};
    Object.entries(s.completedUnits || {}).forEach(([k, v]) => { const m = /^Smart Study Lesson_(.+)$/.exec(k); if (m && Number(v) > 0) out[m[1]] = Math.max(out[m[1]] || 0, Number(v)); });
    return out;
  };
  // Dhammaschool chapters the teacher has confirmed (trophies) in each grade: { 'GRADE-1': 40 }
  const dsUnitsOf = (s) => {
    const out = {};
    Object.entries(s.completedUnits || {}).forEach(([k, v]) => { const m = /^Dhamma\s*school.*_(GRADE-\d+)$/i.exec(k); if (m && Number(v) > 0) out[m[1].toUpperCase()] = Math.max(out[m[1].toUpperCase()] || 0, Number(v)); });
    return out;
  };
  const partUnitsOf = (s) => {
    const cu = s.completedUnits || {}; const get = (part) => Math.max(0, ...Object.entries(cu).filter(([k]) => k.endsWith(`Reading Myanmar_${part}`)).map(([, v]) => Number(v) || 0));
    // po = Myanmar Poems: trophies the teacher has confirmed, one per poem (the older entry is just called 'Poem')
    const po = Math.max(0, ...Object.entries(cu).filter(([k]) => k === 'Poem' || k.endsWith('_myanmarpoems')).map(([, v]) => Number(v) || 0));
    // rd = Myanmar Reader chapters the teacher has confirmed (half chapters are counted, so it is rounded down)
    const rd = Math.floor(Math.max(0, ...Object.entries(cu).filter(([k]) => /reader/i.test(k)).map(([, v]) => Number(v) || 0)));
    // the three quiz games of Speaking Myanmar (Part 3 Animal Sound, Part 4 Burmese Learning Games, Part 5 Interactive Learning Quiz)
    const spk = (part) => Math.max(0, ...Object.entries(cu).filter(([k]) => k.endsWith(`Speaking Myanmar_${part}`) || (part === 'animalsound' && k === 'Animal sound')).map(([, v]) => Number(v) || 0));
    const nl = spk('numberlearning');
    const u = { nl, cp: get('consonantpractice'), bg: get('burmesegame'), vl: get('vowelslearning'), po, rd, ga: spk('animalsound'), bl: spk('burmeselearninggames'), iq: spk('interactivequiz') };
    Object.keys(u).forEach(k => { if (!u[k]) delete u[k]; });
    return u;
  };
  const trophyList = students
    .filter(s => s.isActive === true)
    .map(s => ({
      id: s.id,
      name: s.name,
      trophyCount: s.trophyCount || 0,
      heartsReceived: s.heartsReceived || 0,
      heartsFromCounts: s.heartsFromCounts || {},
      attendedThisYear: attendedById[s.id] || 0,
      attendedTotal: attendedAllYears[s.id] || 0,
      ...(Object.keys(partUnitsOf(s)).length ? { partUnits: partUnitsOf(s) } : {}),
      ...(Object.keys(dsUnitsOf(s)).length ? { dsUnits: dsUnitsOf(s) } : {}),
      // the other names this student used in Smart Study classes (a renamed student's old scores are filed under them)
      ...(Object.values(s.smartStudyNames || {}).filter(x => x && x !== s.name).length ? { aliases: [...new Set(Object.values(s.smartStudyNames).filter(x => x && x !== s.name))] } : {}),
      ...(abUnitsOf(s) ? { abUnits: abUnitsOf(s) } : {}),
      ...(Object.keys(ssUnitsOf(s)).length ? { ssUnits: ssUnitsOf(s) } : {}),
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

  // This month's per-student totals, for the teacher's Attendance Reports.
  const attendanceMonthlyRankedList = computed
    .filter(e => e.monthAttended + e.monthAbsent > 0)
    .map(e => ({ id: e.id, name: e.name, isOffline: e.isOffline, attended: e.monthAttended, absent: e.monthAbsent, total: e.monthAttended + e.monthAbsent }))
    .sort((a, b) => b.attended - a.attended);

  // the offline names the teacher hid from the board (students read this from the file instead of Firebase)
  let hiddenOfflineNames = [];
  try { const cfg = await getDoc(doc(db, `${publicDataPath}/config/teacher`)); hiddenOfflineNames = (cfg.exists() && cfg.data().hiddenOfflineNames) || []; } catch (e) { /* none */ }
  const snapshot = { generatedAt: new Date().toISOString(), hiddenOfflineNames, attendanceRankedList, attendanceMonthlyRankedList, trophyList, attendanceTotals };
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2));

  // ---- Per-student "weeks attended" (all time), for the Bodhi Tree and Shrine Room ----
  // Both used to read a student's whole schedule + whole session history every time
  // they were opened. One small static file replaces that (up to a week old).
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
  // a normal run only sees this year, so the weeks found are added to the weeks kept from the earlier runs
  const keysByUid = {};
  if (!FULL) { try { Object.entries(JSON.parse(readFileSync(KEYS_PATH, 'utf8')).weeks || {}).forEach(([uid, list]) => { keysByUid[uid] = new Set(list); }); } catch (e) { /* none yet */ } }
  Object.entries(weeksByUid).forEach(([uid, set]) => { const k = (keysByUid[uid] = keysByUid[uid] || new Set()); set.forEach(w => k.add(w)); });
  writeFileSync(KEYS_PATH, JSON.stringify({ weeks: Object.fromEntries(Object.entries(keysByUid).map(([uid, set]) => [uid, [...set].sort()])) }));
  const attendedWeeks = {};
  Object.entries(keysByUid).forEach(([uid, set]) => { attendedWeeks[uid] = set.size; });
  // The teacher's own tree grants (scripts/treeOverrides.json): a minimum number of weeks for a student.
  try {
    const grants = JSON.parse(readFileSync(join(__dirname, 'treeOverrides.json'), 'utf8'));
    Object.entries(grants).forEach(([uid, weeks]) => { if (typeof weeks === 'number') attendedWeeks[uid] = Math.max(attendedWeeks[uid] || 0, weeks); });
  } catch (e) { /* no grants file */ }
  // The Bodhi Tree starts again every January: this calendar year's weeks of attendance (a week belongs to the year of its Monday).
  const treeYear = now.getFullYear();
  const yearWeeks = {};
  Object.entries(keysByUid).forEach(([uid, set]) => { let n = 0; set.forEach(k => { if (String(k).startsWith(String(treeYear))) n++; }); yearWeeks[uid] = n; });
  try {
    // the teacher's own grants (a minimum number of weeks) belong to the year they were made for: 2026
    if (treeYear === 2026) Object.entries(JSON.parse(readFileSync(join(__dirname, 'treeOverrides.json'), 'utf8'))).forEach(([uid, weeks]) => { if (typeof weeks === 'number') yearWeeks[uid] = Math.max(yearWeeks[uid] || 0, weeks); });
  } catch (e) { /* no grants file */ }
  writeFileSync(join(__dirname, '..', 'public', 'studentWeekly.json'), JSON.stringify({ generatedAt, year: treeYear, attendedWeeks, yearWeeks }));

  // ---- Each student's schedule + sessions for this year (their login used to read all of it) ----
  const serialize = (v) => {
    if (v && typeof v.toMillis === 'function') return { _ms: v.toMillis() };
    if (Array.isArray(v)) return v.map(serialize);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serialize(x)]));
    return v;
  };
  const histByUid = {};
  allSessions.filter(inYear).forEach(sx => { if (sx.studentUid) (histByUid[sx.studentUid] = histByUid[sx.studentUid] || { sessions: [], schedule: [] }).sessions.push(serialize(sx)); });
  // Lessons already reported, kept as a static list too (the live part of a student's lesson list is then only the open ones).
  // (a normal run reads only the lessons reported in the last 3 weeks and keeps the earlier ones from the history files)
  const lessonsRef = collection(db, `${publicDataPath}/lessons`);
  const lessonsSnapAll = await getDocs(FULL ? lessonsRef : query(lessonsRef, where('reportedAt', '>=', sinceTs)));
  const lessonsByUid = {};
  Object.entries(prevLessonsByUid).forEach(([uid, list]) => { lessonsByUid[uid] = new Map(list.map(l => [l.id, l])); });
  lessonsSnapAll.docs.forEach(d => {
    const l = d.data();
    if (!l.studentUid || l.status !== 'reported') return;
    (lessonsByUid[l.studentUid] = lessonsByUid[l.studentUid] || new Map()).set(d.id, serialize({ id: d.id, ...l }));
  });
  Object.entries(lessonsByUid).forEach(([uid, map]) => {
    const h = (histByUid[uid] = histByUid[uid] || { sessions: [], schedule: [] });
    h.lessons = [...map.values()];
  });
  allRealSchedule.filter(inYear).forEach(e => { if (e.studentUid && e.studentUid !== 'offline') (histByUid[e.studentUid] = histByUid[e.studentUid] || { sessions: [], schedule: [] }).schedule.push(serialize(e)); });
  for (const [uid, h] of Object.entries(histByUid)) {
    writeFileSync(join(HISTORY_DIR, `${encodeURIComponent(uid)}.json`), JSON.stringify({ generatedAtMs: Date.now(), lessons: [], ...h }));
  }

  // ---- The Teacher's Weekly Schedule for PAST weeks: one small file per week (public/weekFiles/{key}.json) ----
  // The key is the Sunday (UTC) that starts the 7-day bucket; the page picks the one or two buckets that cover the week it
  // shows (see weekBucketKeys in TutoringApp.jsx -- keep the two in step). Each file holds that week's schedule entries and,
  // for each session, just who it was and when. A normal run rewrites only the buckets wholly inside what it read fresh
  // (the last 3 weeks); older files stay as they were; a full run rewrites everything.
  {
    const WEEK_MS = 7 * DAY_MS;
    const REF_SUNDAY = Date.UTC(2024, 0, 7);
    const bucketStart = (ms) => REF_SUNDAY + Math.floor((ms - REF_SUNDAY) / WEEK_MS) * WEEK_MS;
    const WEEK_DIR = join(__dirname, '..', 'public', 'weekFiles');
    mkdirSync(WEEK_DIR, { recursive: true });
    const buckets = new Map();
    const bucketOf = (ms) => { const k = bucketStart(ms); if (!buckets.has(k)) buckets.set(k, { schedule: [], sessions: [] }); return buckets.get(k); };
    const freshSchedule = FULL ? allRealSchedule : scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const freshSessions = FULL ? allSessions : sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    freshSchedule.forEach(e => { if (e.startTime && typeof e.startTime.toMillis === 'function') bucketOf(e.startTime.toMillis()).schedule.push(serialize(e)); });
    freshSessions.forEach(x => { if (x.startTime && typeof x.startTime.toMillis === 'function' && x.studentUid) bucketOf(x.startTime.toMillis()).sessions.push({ studentUid: x.studentUid, startTime: { _ms: x.startTime.toMillis() } }); });
    // an empty week must still get a file (otherwise the page would fall back to reading Firebase for it)
    const firstKey = Math.min(...[...buckets.keys(), bucketStart(Date.now())]);
    for (let k = firstKey; k <= bucketStart(Date.now()); k += WEEK_MS) if (!buckets.has(k)) buckets.set(k, { schedule: [], sessions: [] });
    let wrote = 0;
    for (const [k, v] of buckets) {
      if (!FULL && k < sinceMs) continue; // partly older than what was read this time: leave the file from the earlier run
      writeFileSync(join(WEEK_DIR, `${new Date(k).toISOString().slice(0, 10)}.json`), JSON.stringify({ builtAt: Date.now(), ...v }));
      wrote++;
    }
    console.log(`Wrote ${wrote} week file(s) for the Teacher's Weekly Schedule`);
  }

  // What the teacher has GIVEN each student (badgesGiven on their record), copied to a file so friends who visit see it too.
  {
    const given = {};
    students.forEach(s => { if (s.name && s.badgesGiven && Object.keys(s.badgesGiven).length) given[s.name] = s.badgesGiven; });
    writeFileSync(join(__dirname, '..', 'public', 'badgesGiven.json'), JSON.stringify({ generatedAt, given }));
  }

  // Today's Schedule: the standing weekly slots (everyone, offline students too) as one static file -- the page picks today's.
  writeFileSync(join(__dirname, '..', 'public', 'todaySchedule.json'), JSON.stringify({
    generatedAt,
    slots: recurringSlots.filter(r => !r.studentInactive && r.studentName).map(r => ({ id: r.id, u: r.studentUid || null, n: r.studentName, d: r.dayOfWeek, s: r.startTime, e: r.endTime, c: r.createdAt && typeof r.createdAt.toMillis === 'function' ? r.createdAt.toMillis() : 0 })),
  }));

  writeFileSync(STATE_PATH, JSON.stringify({ lastRunMs: Date.now(), fullAt: FULL ? Date.now() : state.fullAt }));
  console.log(`Wrote ${attendanceRankedList.length} attendance rows and ${trophyList.length} trophy rows to ${OUT_PATH}`);
  }

  if (want('classes')) {
    // Each class's scores, so a student's tab can show classmates' standings from a static file instead of reading
    // every score live (see class-snapshots.mjs: only what is new is read, and a quiet week changes nothing).
    await refreshClassSnapshots(db, appId, { full: process.argv.includes('--full') });
    await refreshAnnouncementsSnapshot(db, appId);
    await refreshClassDocSnapshots(db, appId);
    await refreshAbhidhammaClassFiles(db);
    await refreshDhammaschoolProgress(db);
    await refreshFestivalDeeds(db);
  }
  if (want('content')) {
    await refreshContentSnapshots(db);
    await refreshAvatarSnapshot(db);
  }

  if (want('roster')) {
  await refreshScheduleSnapshot(db, appId);
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
  const msOf = (v) => (v && typeof v.toMillis === 'function') ? v.toMillis() : (typeof v === 'number' ? v : (typeof v === 'string' ? (Date.parse(v) || 0) : (v && typeof v.seconds === 'number' ? v.seconds * 1000 : 0)));
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
  }
  process.exit(0);
}

main().catch(e => { console.error('Snapshot generation failed:', e); process.exit(1); });

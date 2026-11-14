// The attendance rules, in one place with no Firebase in it, so they can be tested (scripts/test-attendance.mjs) and the weekly job
// can refuse to publish numbers that look wrong. Dates are always Pacific days: import ./class-timezone.mjs before this file.
//
// An entry is { studentUid, studentName, startTime, endTime, overrideStatus }, a session is { studentUid, startTime }; times only need
// toDate() and toMillis() (Firestore Timestamps have them).

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const NEAR_CLASS_MS = 14 * HOUR;          // a real class this close to a weekly slot's time is the same class
export const FIRST_SESSION_WINDOW_MS = 21 * DAY; // a first session this far before the slot was saved still counts (see below)

const dayStart = (ms) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const keyOf = (uid, name) => (uid === 'offline' ? `offline:${name}` : `uid:${uid}`);
const defaultMakeTs = (date) => ({ toDate: () => date, toMillis: () => date.getTime() });

// A class counts as attended when the teacher marked it so, or the student has a session on the same (Pacific) calendar day.
export function getStudentAttendanceForEntry(entry, studentUid, sessions) {
  if (entry.overrideStatus === 'attended') return 'attended';
  if (entry.overrideStatus === 'absent') return 'absent';
  if (entry.studentUid !== 'offline') {
    const entryDate = entry.startTime.toDate();
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59, 999);
    const didAttend = (sessions || []).some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
    return didAttend ? 'attended' : 'absent';
  }
  return 'absent';
}

// The app no longer creates a dated teacherSchedule doc for every week (see recurringSchedule): a student's weekly slot is one
// persistent doc that has to be mapped onto real calendar dates for every week that has no real dated doc.
//  * A date already covered by a real class of the same student (the same day, OR within NEAR_CLASS_MS of the slot's time, which
//    also keeps a late-evening class from being counted twice if a zone is ever wrong) is not made up again.
//  * It starts from the day the slot was saved (a new student must not be counted for weeks before they came), but a first session
//    up to FIRST_SESSION_WINDOW_MS before that moves the start back to that day: the first class is often attended before the slot
//    is saved. Never earlier than that, so one stray old session cannot make a new student look absent for months.
export function synthesizeOccurrencesFromRecurringSchedule(recurringSlots, realSchedule, startOfYear, now, sessions = [], makeTs = defaultMakeTs) {
  const firstSessionMs = {};
  sessions.forEach(x => {
    if (!x.studentUid || !x.startTime || typeof x.startTime.toMillis !== 'function') return;
    const t = x.startTime.toMillis();
    if (!(firstSessionMs[x.studentUid] <= t)) firstSessionMs[x.studentUid] = t;
  });
  const coveredDays = new Set();
  const realTimes = {};
  realSchedule.forEach(e => {
    const d = e.startTime.toDate();
    const key = keyOf(e.studentUid, e.studentName);
    coveredDays.add(`${key}_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    (realTimes[key] = realTimes[key] || []).push(d.getTime());
  });

  const synthetic = [];
  for (const slot of recurringSlots) {
    const key = keyOf(slot.studentUid, slot.studentName);
    const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
    let createdMs = slot.createdAt && typeof slot.createdAt.toMillis === 'function' ? slot.createdAt.toMillis() : 0;
    const firstMs = firstSessionMs[slot.studentUid];
    if (createdMs && firstMs && firstMs < createdMs && createdMs - firstMs <= FIRST_SESSION_WINDOW_MS) createdMs = firstMs;
    const cursor = new Date(Math.max(startOfYear.getTime(), createdMs ? dayStart(createdMs) : 0));
    while (cursor <= now) {
      if (cursor.getDay() === slot.dayOfWeek) {
        const dateKey = `${key}_${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        const start = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), sh, sm);
        const nearReal = (realTimes[key] || []).some(t => Math.abs(t - start.getTime()) < NEAR_CLASS_MS);
        if (!coveredDays.has(dateKey) && !nearReal) {
          const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), eh, em);
          synthetic.push({ id: `synthetic-${slot.id}-${dateKey}`, studentUid: slot.studentUid, studentName: slot.studentName, startTime: makeTs(start), endTime: makeTs(end), overrideStatus: null });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return synthetic;
}

// Each student's attended / absent / total for this year (and this month), up to now.
export function computeAttendance(entries, schedule, sessions, now, startOfYear) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return entries.map(entry => {
    let attended = 0, absent = 0, monthAttended = 0, monthAbsent = 0;
    schedule.forEach(sched => {
      const entryDate = sched.startTime.toDate();
      if (entryDate > now || entryDate < startOfYear) return;
      const isMatch = entry.isOffline ? (sched.studentUid === 'offline' && sched.studentName === entry.name) : (sched.studentUid === entry.id);
      if (!isMatch) return;
      const status = getStudentAttendanceForEntry(sched, entry.id, sessions);
      if (status === 'attended') attended++; else absent++;
      if (entryDate >= monthStart) { if (status === 'attended') monthAttended++; else monthAbsent++; }
    });
    return { id: entry.id, name: entry.name, isOffline: entry.isOffline, attended, absent, total: attended + absent, monthAttended, monthAbsent };
  });
}

// Sanity check against the list that is published now. Between two weekly runs a student's attended count only goes up and the
// scheduled count grows by a few classes: if many students go DOWN, or one jumps by a whole month of classes, the data or the rules
// are wrong and the run must stop BEFORE anything is written (the old, correct list stays up). Returns a list of problems.
export function checkAttendanceAgainstPrevious(previousRows, newRows, { maxDrops = Math.max(10, Math.ceil(previousRows.length * 0.15)), maxTotalJump = 8 } = {}) {
  const before = new Map(previousRows.map(r => [r.id, r]));
  const drops = [], jumps = [];
  newRows.forEach(r => {
    const p = before.get(r.id);
    if (!p) return;
    if (r.attended < p.attended) drops.push(`${r.name}: attended ${p.attended} -> ${r.attended}`);
    if (r.total - p.total > maxTotalJump) jumps.push(`${r.name}: classes ${p.total} -> ${r.total}`);
  });
  const problems = [];
  if (drops.length > maxDrops) problems.push(`${drops.length} students' attended counts went DOWN (more than ${maxDrops}): ${drops.slice(0, 8).join('; ')}`);
  if (jumps.length > 0) problems.push(`${jumps.length} students' class counts jumped by more than ${maxTotalJump}: ${jumps.slice(0, 8).join('; ')}`);
  return problems;
}

// ---- Bodhi Tree weeks (the weeks a student attended) ---------------------------------------------------------------------
// A "week key" is the Monday (Pacific date, YYYY-MM-DD) of the week a class falls in. Import ./class-timezone.mjs first.
export const weekKeyOf = (date) => {
  const day = date.getDay();
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + ((day === 0 ? -6 : 1) - day));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
};

// For every student: the set of week keys in which they attended at least one class that is over (same rule as the attendance counts:
// the teacher's mark, or a session on the same Pacific day). allSchedule = real + made-up weekly classes.
export function attendedWeekKeys(allSchedule, allSessions, now) {
  const dayOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const sessionDays = new Set(allSessions.filter(s => s.startTime && s.studentUid).map(s => `${s.studentUid}_${dayOf(s.startTime.toDate())}`));
  const byUid = {};
  allSchedule.forEach(e => {
    if (!e.studentUid || e.studentUid === 'offline' || !e.endTime || !e.startTime) return;
    if (e.endTime.toDate() >= now) return;
    const d = e.startTime.toDate();
    const attended = e.overrideStatus === 'attended' || (e.overrideStatus !== 'absent' && sessionDays.has(`${e.studentUid}_${dayOf(d)}`));
    if (!attended) return;
    (byUid[e.studentUid] = byUid[e.studentUid] || new Set()).add(weekKeyOf(d));
  });
  return byUid;
}

// The kept week keys of earlier runs + the weeks found now. The weeks of the CURRENT year are always worked out again from all of this
// year's classes, so a week that an earlier (wrong) run counted and the corrected rules do not is dropped; earlier years' weeks are kept.
export function mergeWeekKeys(previousByUid, foundByUid, year) {
  const out = {};
  Object.entries(previousByUid || {}).forEach(([uid, keys]) => { out[uid] = new Set([...keys].filter(k => !String(k).startsWith(String(year)))); });
  Object.entries(foundByUid).forEach(([uid, set]) => { const k = (out[uid] = out[uid] || new Set()); set.forEach(w => k.add(w)); });
  return out;
}

// { attendedWeeks (all time), yearWeeks (this year) } per student. grants = the teacher's own minimums (treeOverrides.json): they raise the
// all-time number, and the year number when they are for this year.
export function weekTotals(keysByUid, grants, year) {
  const attendedWeeks = {}, yearWeeks = {};
  Object.entries(keysByUid).forEach(([uid, set]) => {
    attendedWeeks[uid] = set.size;
    let n = 0; set.forEach(k => { if (String(k).startsWith(String(year))) n++; });
    yearWeeks[uid] = n;
  });
  Object.entries(grants || {}).forEach(([uid, weeks]) => {
    if (typeof weeks !== 'number') return;
    attendedWeeks[uid] = Math.max(attendedWeeks[uid] || 0, weeks);
    if (year === 2026) yearWeeks[uid] = Math.max(yearWeeks[uid] || 0, weeks);
  });
  return { attendedWeeks, yearWeeks };
}

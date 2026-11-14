// Tests for the attendance rules. Run with `npm run test:attendance`; the weekly workflow runs it first and stops if one fails.
// The cases are the mistakes that really happened: a UTC runner that counted days wrongly (a Sunday 5 pm class is Monday in UTC), made
// up a second "ghost" class beside every real one, and lost a new student's first class.
import './class-timezone.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertClassTimezone } from './class-timezone.mjs';
import { getStudentAttendanceForEntry, synthesizeOccurrencesFromRecurringSchedule, computeAttendance, checkAttendanceAgainstPrevious } from './attendance-rules.mjs';

const ts = (d) => ({ toDate: () => d, toMillis: () => d.getTime() });
const pt = (y, m, d, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi); // a Pacific time (the zone is forced by class-timezone.mjs)
const entry = (uid, start, extra = {}) => ({ id: `e${start.getTime()}`, studentUid: uid, studentName: uid, startTime: ts(start), endTime: ts(new Date(start.getTime() + 3600000)), ...extra });
const session = (uid, start) => ({ studentUid: uid, startTime: ts(start) });
const YEAR = pt(2026, 1, 1);
const NOW = pt(2026, 11, 10, 9, 0);

test('the zone is Pacific (winter -8, summer -7)', () => { assertClassTimezone(); });

test('a Saturday 4:50 pm class whose student joins at 5:05 pm (a different day in UTC) is attended', () => {
  const e = entry('a', pt(2026, 10, 3, 16, 50));
  assert.equal(getStudentAttendanceForEntry(e, 'a', [session('a', pt(2026, 10, 3, 17, 5))]), 'attended');
});
test('a session on another day, or by another student, is not attendance', () => {
  const e = entry('a', pt(2026, 10, 3, 17, 0));
  assert.equal(getStudentAttendanceForEntry(e, 'a', [session('a', pt(2026, 10, 4, 17, 0))]), 'absent');
  assert.equal(getStudentAttendanceForEntry(e, 'a', [session('b', pt(2026, 10, 3, 17, 0))]), 'absent');
});
test('the teacher override wins either way', () => {
  const e = entry('a', pt(2026, 10, 3, 17, 0), { overrideStatus: 'attended' });
  assert.equal(getStudentAttendanceForEntry(e, 'a', []), 'attended');
  assert.equal(getStudentAttendanceForEntry({ ...e, overrideStatus: 'absent' }, 'a', [session('a', pt(2026, 10, 3, 17, 0))]), 'absent');
});

test('a weekly slot is not made up again where a real class already is (no ghost class beside the real one)', () => {
  // real classes every Sunday 5 pm Pacific (stored as Monday 00:00/01:00 UTC), and a slot for the same time
  const real = []; for (let d = pt(2026, 10, 4, 17); d <= NOW; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 17)) real.push(entry('a', d));
  const slot = { id: 's1', studentUid: 'a', studentName: 'a', dayOfWeek: 0, startTime: '17:00', endTime: '18:00', createdAt: ts(pt(2026, 10, 1)) };
  const made = synthesizeOccurrencesFromRecurringSchedule([slot], real, YEAR, NOW, []);
  assert.equal(made.length, 0, `ghost classes: ${made.map(m => m.startTime.toDate().toISOString()).join(', ')}`);
});
test('a slot whose real class sits a few hours off (any zone mix-up) is still the same class', () => {
  const real = [entry('a', pt(2026, 10, 4, 21, 0))];
  const slot = { id: 's1', studentUid: 'a', studentName: 'a', dayOfWeek: 0, startTime: '17:00', endTime: '18:00', createdAt: ts(pt(2026, 10, 1)) };
  assert.equal(synthesizeOccurrencesFromRecurringSchedule([slot], real, YEAR, pt(2026, 10, 5), []).length, 0);
});
test('weeks with no real class are made from the slot, one per week, from the day it was saved', () => {
  const slot = { id: 's1', studentUid: 'a', studentName: 'a', dayOfWeek: 6, startTime: '17:00', endTime: '18:00', createdAt: ts(pt(2026, 10, 10, 8)) };
  const made = synthesizeOccurrencesFromRecurringSchedule([slot], [], YEAR, pt(2026, 11, 8), []);
  assert.deepEqual(made.map(m => m.startTime.toDate().getDate()), [10, 17, 24, 31, 7]); // Saturdays: Oct 10, 17, 24, 31 and Nov 7
  made.forEach(m => assert.equal(m.startTime.toDate().getHours(), 17));
});

test("a new student's first class, attended before the slot was saved, counts", () => {
  const slot = { id: 's1', studentUid: 'a', studentName: 'a', dayOfWeek: 6, startTime: '17:00', endTime: '18:00', createdAt: ts(pt(2026, 10, 5, 12)) };
  const sessions = [session('a', pt(2026, 10, 2, 15, 22)), session('a', pt(2026, 10, 3, 17, 46)), session('a', pt(2026, 10, 10, 17, 3))];
  const made = synthesizeOccurrencesFromRecurringSchedule([slot], [], YEAR, pt(2026, 10, 12), sessions);
  assert.deepEqual(made.map(m => m.startTime.toDate().getDate()), [3, 10]);
  const row = computeAttendance([{ id: 'a', name: 'a', isOffline: false }], made, sessions, pt(2026, 10, 12), YEAR)[0];
  assert.deepEqual([row.attended, row.total], [2, 2]);
});
test('one stray old session does not make a new student absent for months', () => {
  const slot = { id: 's1', studentUid: 'a', studentName: 'a', dayOfWeek: 6, startTime: '17:00', endTime: '18:00', createdAt: ts(pt(2026, 10, 5, 12)) };
  const made = synthesizeOccurrencesFromRecurringSchedule([slot], [], YEAR, pt(2026, 10, 12), [session('a', pt(2026, 3, 1, 10))]);
  assert.deepEqual(made.map(m => m.startTime.toDate().getDate()), [10]);
});

test('a year of weekly classes with one real absence is 44 of 45 (not 44 of 51)', () => {
  const real = []; const sessions = [];
  let n = 0;
  for (let d = pt(2026, 1, 4, 17); d <= NOW; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 17)) {
    n++; real.push(entry('a', d));
    if (d.getMonth() !== 7 || d.getDate() !== 2) sessions.push(session('a', new Date(d.getTime() + 4 * 60000)));
  }
  const slot = { id: 's1', studentUid: 'a', studentName: 'a', dayOfWeek: 0, startTime: '17:00', endTime: '18:00', createdAt: ts(pt(2026, 10, 1)) };
  const schedule = [...real, ...synthesizeOccurrencesFromRecurringSchedule([slot], real, YEAR, NOW, sessions)];
  const row = computeAttendance([{ id: 'a', name: 'a', isOffline: false }], schedule, sessions, NOW, YEAR)[0];
  assert.equal(row.total, n);
  assert.equal(row.absent, 1);
});

test('the check against the published list: normal growth passes, mass drops and big jumps stop the run', () => {
  const prev = Array.from({ length: 40 }, (_, i) => ({ id: `u${i}`, name: `S${i}`, attended: 10, total: 12 }));
  assert.deepEqual(checkAttendanceAgainstPrevious(prev, prev.map(r => ({ ...r, attended: 11, total: 14 }))), []);
  assert.equal(checkAttendanceAgainstPrevious(prev, prev.map(r => ({ ...r, attended: 5 }))).length, 1);
  assert.equal(checkAttendanceAgainstPrevious(prev, prev.map((r, i) => (i === 0 ? { ...r, total: 25 } : r))).length, 1);
  assert.deepEqual(checkAttendanceAgainstPrevious(prev, prev.map((r, i) => (i < 6 ? { ...r, attended: 9 } : r))), []); // a few honest corrections are fine
});

import { weekKeyOf, attendedWeekKeys, mergeWeekKeys, weekTotals } from './attendance-rules.mjs';
test('Bodhi weeks: a week is its Monday; a week counts once however many classes; an absent or future class does not count', () => {
  assert.equal(weekKeyOf(pt(2026, 11, 8, 17)), '2026-11-02');   // a Sunday belongs to the week that began the Monday before
  assert.equal(weekKeyOf(pt(2026, 11, 9, 0, 5)), '2026-11-09');
  assert.equal(weekKeyOf(pt(2026, 1, 1, 12)), '2025-12-29');    // the week of New Year's Day starts in the old year
  const sched = [entry('a', pt(2026, 11, 3, 17)), entry('a', pt(2026, 11, 5, 17)), entry('a', pt(2026, 11, 12, 17)), entry('a', pt(2026, 11, 20, 17)), entry('b', pt(2026, 11, 3, 17), { overrideStatus: 'attended' }), entry('a', pt(2026, 10, 27, 17), { overrideStatus: 'absent' })];
  const sessions = [session('a', pt(2026, 11, 3, 17, 1)), session('a', pt(2026, 11, 5, 17, 1)), session('a', pt(2026, 10, 27, 17, 1)), session('a', pt(2026, 11, 20, 17, 1))];
  const w = attendedWeekKeys(sched, sessions, NOW);              // NOW = Nov 10: the Nov 12 and Nov 20 classes are in the future
  assert.deepEqual([...w.a], ['2026-11-02']);                    // two classes in one week = one week; the 'absent' Oct 27 mark wins over a session
  assert.deepEqual([...w.b], ['2026-11-02']);                    // the teacher's mark counts
});
test('Bodhi weeks: this year is worked out again every run, so a week an old wrong run counted is dropped; earlier years stay', () => {
  const previous = { a: new Set(['2025-06-02', '2025-12-29', '2026-03-02', '2026-03-09', '2026-08-03']) };   // 03-09 and 08-03 were wrong
  const found = { a: new Set(['2026-03-02']) };
  const merged = mergeWeekKeys(previous, found, 2026);
  assert.deepEqual([...merged.a].sort(), ['2025-06-02', '2025-12-29', '2026-03-02']);
  const { attendedWeeks, yearWeeks } = weekTotals(merged, { zz: 5, a: 1 }, 2026);
  assert.equal(attendedWeeks.a, 3); assert.equal(yearWeeks.a, 1);          // the 2025-12-29 week is not "2026"
  assert.equal(attendedWeeks.zz, 5); assert.equal(yearWeeks.zz, 5);        // a teacher grant is a minimum, and counts for this year
  assert.equal(weekTotals({ a: new Set(['2026-01-05']) }, { a: 9 }, 2026).yearWeeks.a, 9);
});
test('Bodhi weeks can never be more than the classes attended (the mistake that showed in 15 students)', () => {
  const sched = [], sessions = [];
  for (let k = 0; k < 6; k++) { const d = pt(2026, 3, 2 + 7 * k, 17); sched.push(entry('a', d), entry('a', new Date(d.getTime() + 24 * 3600000))); if (k !== 2) sessions.push(session('a', d)); }
  const weeks = attendedWeekKeys(sched, sessions, NOW).a.size;
  const row = computeAttendance([{ id: 'a', name: 'a', isOffline: false }], sched, sessions, NOW, YEAR)[0];
  assert.ok(weeks <= row.attended, `${weeks} weeks > ${row.attended} classes`);
});

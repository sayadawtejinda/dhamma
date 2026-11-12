// "How many lessons has each student finished" for the weekly lists of SmartStudy, Abhidhamma and Dhammaschool.
// The student's pill used to show which lesson each classmate was on; now each row shows lessons finished, the most first,
// and only students who are still active (Tutoring record isActive). It all comes from files and the one student list the
// weekly run already reads, so a student opening the list costs no Firestore read.
//
// lessons finished = the larger of (a) what the teacher's reports have recorded for that app in the student's Tutoring
// record (completedUnits, summed over the app's classes) and (b) what the app itself has stored for the student
// (the class snapshot files under public/classSnapshots).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLASS_DIR } from './class-snapshots.mjs';

const key = (n) => String(n || '').trim().toLowerCase();
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { return null; } };
const PREFIX = { smartstudy: 'Smart Study Lesson_', abhidhamma: 'Abhidhamma Lesson_', dhammaschool: 'Dhammaschool Lesson_' };

export function loadLessonContext(students) {
  const byUid = new Map(), byName = new Map();
  students.forEach(s => {
    byUid.set(s.id, s);
    [s.name, ...Object.values(s.smartStudyNames || {})].filter(Boolean).forEach(n => { if (!byName.has(key(n))) byName.set(key(n), s); });
  });
  // smartstudy: distinct (class, lesson) pairs per student name, from the class score files
  const ss = new Map();
  const dir = join(CLASS_DIR, 'smartstudy');
  if (existsSync(dir)) readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
    ((readJson(join(dir, f)) || {}).scores || []).forEach(r => {
      if (!r.studentName || !r.lessonId) return;
      if (!ss.has(key(r.studentName))) ss.set(key(r.studentName), new Set());
      ss.get(key(r.studentName)).add(`${r.classId}|${r.lessonId}`);
    });
  });
  const asMap = (obj) => new Map(Object.entries(obj || {}).map(([n, ids]) => [key(n), new Set(ids)]));
  const ds = asMap((readJson(join(CLASS_DIR, 'dhammaschool-progress.json')) || {}).completions);
  // abhidhamma.json: class -> { totalLessons, students: { name: lessons finished } }; add a student's classes together
  const abhi = new Map();
  Object.values((readJson(join(CLASS_DIR, 'abhidhamma.json')) || {}).classes || {}).forEach(c => {
    Object.entries(c.students || {}).forEach(([n, cnt]) => abhi.set(key(n), (abhi.get(key(n)) || 0) + (Number(cnt) || 0)));
  });
  return { byUid, byName, own: { smartstudy: ss, dhammaschool: ds, abhidhamma: abhi } };
}

const recordedUnits = (student, app) => Object.entries(student?.completedUnits || {})
  .filter(([k]) => k.startsWith(PREFIX[app])).reduce((n, [, v]) => n + (Number(v) || 0), 0);

// docs: the roster docs of one app's list. Returns the same list, active students only, one row per student,
// each with `lessonsDone`, the most first. `nameOf(doc)` is the student's name in that app.
export function rankRoster(app, docs, ctx, nameOf, lastSeenOf) {
  const rows = new Map();
  const unmatched = [];
  docs.forEach(d => {
    const name = nameOf(d);
    const student = (d.tutoringStudentUid && ctx.byUid.get(d.tutoringStudentUid)) || ctx.byName.get(key(name));
    if (!student) { unmatched.push(name); return; }
    if (student.isActive !== true) return;
    const sizeOf = (v) => (v instanceof Set ? v.size : (Number(v) || 0));
    const own = sizeOf(ctx.own[app].get(key(name)));
    const nameAlso = student.name && key(student.name) !== key(name) ? sizeOf(ctx.own[app].get(key(student.name))) : 0;
    const lessonsDone = Math.max(recordedUnits(student, app), own, nameAlso);
    const prev = rows.get(student.id);
    if (!prev || lastSeenOf(d) > lastSeenOf(prev.doc)) rows.set(student.id, { doc: d, lessonsDone, student });
  });
  const list = [...rows.values()].map(r => ({ ...r.doc, lessonsDone: r.lessonsDone, tutoringId: r.student.id, tutoringName: r.student.name }))
    .sort((a, b) => b.lessonsDone - a.lessonsDone || String(nameOf(a)).localeCompare(String(nameOf(b))));
  return { list, unmatched };
}

// The Parami group's SmartStudy progress as static files:
//   public/paramiReportFull.json  every class (the teacher's editor in the app reads this one)
//   public/paramiReport.json      only the classes the teacher has CONFIRMED (config/paramiReport.hidden are left out);
//                                 shown by public/parami-report.html, so students read no Firestore at all
// (https://sayadawtejinda.github.io/dhamma/parami-report.html):
// for every active student of the "Parami" group, the SmartStudy classes they studied, how many lessons they
// finished in each, and their points in each. Points are counted the way the Global Leaderboard counts them: only the
// first attempt of a lesson counts. It is made from the class files already written by class-snapshots.mjs, so it
// costs only the reading of the group and the student list (about 130 small documents).
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CLASS_DIR } from './class-snapshots.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function refreshParamiReport(db, appId) {
  const base = `artifacts/${appId}/public/data`;
  const [groupsSnap, studentsSnap] = await Promise.all([getDocs(collection(db, `${base}/studentGroups`)), getDocs(collection(db, `${base}/students`))]);
  const group = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(g => (g.groupName || '').trim().toLowerCase() === 'parami');
  if (!group) { console.log('Parami report: no "Parami" group found'); return false; }
  const members = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => (group.studentUids || []).includes(s.id) && s.isActive === true);

  // class files: { scores: [{ studentName, studentAgeLevel, lessonId, score, timestamp }] }
  const dir = join(CLASS_DIR, 'smartstudy');
  const byName = {}; // name -> classId -> Map(first attempt per level+lesson)
  const classes = new Set();
  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const classId = decodeURIComponent(file.replace(/\.json$/, ''));
      let scores = [];
      try { scores = JSON.parse(readFileSync(join(dir, file), 'utf8')).scores || []; } catch (e) { continue; }
      for (const s of scores) {
        if (!s.studentName || !s.lessonId) continue;
        const key = `${s.studentAgeLevel || 'default'}|${s.lessonId}`;
        const perClass = ((byName[s.studentName] = byName[s.studentName] || {})[classId] = byName[s.studentName][classId] || new Map());
        const prev = perClass.get(key);
        if (!prev || s.timestamp < prev.timestamp) perClass.set(key, s);
      }
    }
  }
  const students = members.map(m => {
    const perClass = byName[m.name] || {};
    const list = Object.entries(perClass).map(([classId, map]) => {
      const lessons = new Set([...map.values()].map(x => x.lessonId)).size;
      const points = [...map.values()].reduce((n, x) => n + (x.score || 0), 0);
      classes.add(classId);
      return { classId, lessons, points };
    }).sort((a, b) => (a.classId < b.classId ? -1 : 1));
    return { name: m.name, classes: list };
  }).sort((a, b) => (a.name < b.name ? -1 : 1));

  const allClasses = [...classes].sort();
  // the classes the teacher confirmed to leave out (the app's "Confirm" writes this)
  let hidden = [];
  try { const s = await getDoc(doc(db, `${base}/config/paramiReport`)); hidden = (s.exists() && s.data().hidden) || []; } catch (e) { /* none */ }
  const shown = allClasses.filter(c => !hidden.includes(c));
  const publicStudents = students.map(s => ({ name: s.name, classes: s.classes.filter(c => !hidden.includes(c.classId)) }));

  const write = (name, payload, compareKey) => {
    const file = join(__dirname, '..', 'public', name);
    let old = null;
    try { old = JSON.stringify(compareKey(JSON.parse(readFileSync(file, 'utf8')))); } catch (e) { /* none yet */ }
    if (old === JSON.stringify(compareKey(payload))) return false;
    writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), ...payload }));
    return true;
  };
  const a1 = write('paramiReportFull.json', { classes: allClasses, students }, j => [j.classes, j.students]);
  const a2 = write('paramiReport.json', { classes: shown, students: publicStudents }, j => [j.classes, j.students]);
  console.log(`Parami report: ${students.length} students, ${allClasses.length} classes (${hidden.length} left out); ${a1 || a2 ? 'written' : 'unchanged'}`);
  return a1 || a2;
}

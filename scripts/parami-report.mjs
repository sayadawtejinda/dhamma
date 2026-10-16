// The Parami group's SmartStudy progress as ONE static file (public/paramiReport.json), shown by
// public/parami-report.html (https://sayadawtejinda.github.io/dhamma/parami-report.html):
// for every active student of the "Parami" group, the SmartStudy classes they studied, how many lessons they
// finished in each, and their points in each. Points are counted the way the Global Leaderboard counts them: only the
// first attempt of a lesson counts. It is made from the class files already written by class-snapshots.mjs, so it
// costs only the reading of the group and the student list (about 130 small documents).
import { collection, getDocs } from 'firebase/firestore';
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

  const out = { classes: [...classes].sort(), students };
  const file = join(__dirname, '..', 'public', 'paramiReport.json');
  let old = null;
  try { old = JSON.stringify(JSON.parse(readFileSync(file, 'utf8')).students); } catch (e) { /* none yet */ }
  if (old === JSON.stringify(students)) { console.log('Parami report: unchanged, nothing written'); return false; }
  writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), ...out }));
  console.log(`Parami report: ${students.length} students, ${classes.size} classes written`);
  return true;
}

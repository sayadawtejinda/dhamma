// Works the Bodhi Tree weeks out AGAIN for this year from the data already on disk (public/studentHistory/*.json = every student's schedule and
// sessions of this year) and the weekly slots (one small read from Firebase), with the same rules as the weekly job
// (scripts/attendance-rules.mjs), and rewrites public/studentWeekly.json and public/studentWeeklyKeys.json. It WRITES NOTHING to Firebase
// (no student record is touched): it only reads. The weeks of earlier years are kept as they are.
//   node scripts/rebuild-tree-weeks.mjs           (writes the two files)
//   node scripts/rebuild-tree-weeks.mjs --dry     (only shows what would change)
import './class-timezone.mjs';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
import { assertClassTimezone } from './class-timezone.mjs';
import { synthesizeOccurrencesFromRecurringSchedule, attendedWeekKeys, mergeWeekKeys, weekTotals } from './attendance-rules.mjs';

const DRY = process.argv.includes('--dry');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(root, 'public');
assertClassTimezone();

const revive = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v._ms === 'number') return Timestamp.fromMillis(v._ms);
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
  return v;
};
const dir = join(PUB, 'studentHistory');
const scheduleById = new Map(), sessionsById = new Map();
for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
  const h = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  (h.schedule || []).forEach(e => scheduleById.set(e.id, revive(e)));
  (h.sessions || []).forEach(x => sessionsById.set(x.id, revive(x)));
}
const allRealSchedule = [...scheduleById.values()], allSessions = [...sessionsById.values()];
console.log(`From the history files: ${allRealSchedule.length} classes and ${allSessions.length} sessions.`);

await signInAnonymously(getAuth(initializeApp(firebaseConfig)));
const db = getFirestore();
const recurringSlots = (await getDocs(collection(db, `artifacts/${appId}/public/data/recurringSchedule`))).docs.map(d => ({ id: d.id, ...d.data() }));
const now = new Date();
const startOfYear = new Date(now.getFullYear(), 0, 1);
const inYear = (e) => e.startTime && typeof e.startTime.toDate === 'function' && e.startTime.toDate() >= startOfYear;
const realThisYear = allRealSchedule.filter(inYear);
const synthetic = synthesizeOccurrencesFromRecurringSchedule(recurringSlots, realThisYear, startOfYear, now, allSessions.filter(inYear), Timestamp.fromDate);
const found = attendedWeekKeys([...allRealSchedule, ...synthetic], allSessions, now);

const KEYS = join(PUB, 'studentWeeklyKeys.json'), WEEKLY = join(PUB, 'studentWeekly.json');
const previous = {};
Object.entries(JSON.parse(readFileSync(KEYS, 'utf8')).weeks || {}).forEach(([uid, list]) => { previous[uid] = new Set(list); });
const merged = mergeWeekKeys(previous, found, now.getFullYear());
let grants = {};
try { grants = JSON.parse(readFileSync(join(root, 'scripts', 'treeOverrides.json'), 'utf8')); } catch (e) { /* none */ }
const before = JSON.parse(readFileSync(WEEKLY, 'utf8'));
const { attendedWeeks, yearWeeks } = weekTotals(merged, grants, now.getFullYear());

// who changes, and a safety check: the numbers must not move wildly (a few weeks fewer for some students is the correction; many students
// going DOWN a lot, or any going UP, means something is wrong)
const names = existsSync(join(PUB, 'studentNames.json')) ? Object.fromEntries(JSON.parse(readFileSync(join(PUB, 'studentNames.json'), 'utf8')).students.map(s => [s.id, s.name])) : {};
const changes = [];
for (const uid of new Set([...Object.keys(before.yearWeeks), ...Object.keys(yearWeeks)])) {
  const a = before.yearWeeks[uid] ?? 0, b = yearWeeks[uid] ?? 0;
  if (a !== b) changes.push({ name: names[uid] || uid, from: a, to: b, uid });
}
changes.sort((x, y) => (y.from - y.to) - (x.from - x.to));
console.log(`\nThis year's Bodhi Tree weeks change for ${changes.length} student(s):`);
changes.forEach(c => console.log(`  ${String(c.name).padEnd(24)} ${String(c.from).padStart(3)} -> ${String(c.to).padStart(3)}`));
const ups = changes.filter(c => c.to > c.from);
if (ups.length) console.log(`\n⚠ ${ups.length} student(s) go UP (check them before publishing): ${ups.map(c => c.name).join(', ')}`);
const bigDown = changes.filter(c => c.from - c.to > 12);
if (bigDown.length) console.log(`\n⚠ ${bigDown.length} student(s) go down by more than 12 weeks: ${bigDown.map(c => c.name).join(', ')}`);
if (DRY) { console.log('\n--dry: nothing was written.'); process.exit(0); }
writeFileSync(KEYS, JSON.stringify({ weeks: Object.fromEntries(Object.entries(merged).map(([uid, set]) => [uid, [...set].sort()])) }));
writeFileSync(WEEKLY, JSON.stringify({ generatedAt: before.generatedAt, year: now.getFullYear(), attendedWeeks, yearWeeks }));
console.log('\nWrote public/studentWeeklyKeys.json and public/studentWeekly.json (nothing in Firebase was changed).');
process.exit(0);

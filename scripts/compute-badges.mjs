// Works out which badges each student has earned (see src/badgeDefs.js) and writes public/badges.json.
// It reads ONLY files that are already in the project (the weekly snapshots, the roster files, the class boards), so it
// costs no Firebase read at all. Run by the weekly job after the other snapshots, or by hand:  node scripts/compute-badges.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BADGE_DEFS, dynamicBadge } from '../src/badgeDefs.js';
import { levelForWeeks } from '../src/bodhiLevels.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const readJson = (p) => { try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); } catch (e) { return null; } };
const roster = (app) => (readJson(`rosterSnapshots/artifacts__${app}__public__data__roster.json`) || {}).docs || [];
const byName = (docs) => { const m = new Map(); docs.forEach(d => { const n = d.studentName || d.name; if (n) m.set(n, d); }); return m; };

const snap = readJson('weeklySnapshot.json') || {};
const weekly = (readJson('studentWeekly.json') || {}).attendedWeeks || {};
const students = (snap.trophyList || []).filter(s => s.name);
const shrine = byName(roster('shrine-room-app'));
const poems = byName(roster('myanmar-poems-app'));
const reader = byName(roster('myanmar-reader-app'));
const vowels = byName(roster('myanmar-vowels-learning-app'));
const numbers = byName(roster('myanmar-number-learning-app'));
const consonants = byName(roster('burmese-consonant-game-app'));
const animals = byName(roster('animal-sound-app'));

// Smart Study: distinct lessons per student per class (the class boards), and the lessons in each class
const classLessons = {};
((readJson('classSnapshots/smartstudy-class/_classes.json') || {}).classes || []).forEach(c => { classLessons[c.id] = c.lessonCount || 0; });
const ssDone = {}; // name -> { classId -> Set(lessonId) }
const ssDir = join(ROOT, 'classSnapshots', 'smartstudy');
if (existsSync(ssDir)) {
  for (const f of readdirSync(ssDir).filter(x => x.endsWith('.json'))) {
    const j = readJson(`classSnapshots/smartstudy/${f}`) || {};
    for (const s of j.scores || []) {
      if (!s.studentName || !s.classId || !s.lessonId) continue;
      ((ssDone[s.studentName] = ssDone[s.studentName] || {})[s.classId] = (ssDone[s.studentName][s.classId] || new Set())).add(s.lessonId);
    }
  }
}
// Abhidhamma boards
const abhi = (readJson('classSnapshots/abhidhamma.json') || {}).classes || {};
// Dhammaschool: the chapters each student finished, and which chapters make up each grade (classSnapshots/dhammaschool-progress.json)
const dsProgress = readJson('classSnapshots/dhammaschool-progress.json') || { lessonsByClass: {}, completions: {} };

// weeks of attendance per calendar year (a week belongs to the year of its Monday), from the weekly list of attended weeks
const THIS_YEAR = new Date().getFullYear();
const weekKeys = (readJson('studentWeeklyKeys.json') || {}).weeks || {};
let grants = {};
try { grants = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'treeOverrides.json'), 'utf8')); } catch (e) { /* none */ }
const yearWeeksOf = (uid) => {
  const out = {};
  (weekKeys[uid] || []).forEach(k => { const y = Number(String(k).slice(0, 4)); out[y] = (out[y] || 0) + 1; });
  if (typeof grants[uid] === 'number') out[2026] = Math.max(out[2026] || 0, grants[uid]);
  return out;
};
const festivalDeeds = readJson('festivalDeeds.json') || { students: {} };
const BASIC_VOWELS = ['B-listen-1', 'B-listen-2', 'B-click-1', 'B-click-2', 'B-click-3'];
const out = {};
for (const st of students) {
  const n = st.name;
  const got = [];
  const at = (value, list) => list.forEach(([min, id]) => { if (value >= min) got.push(id); });
  at(st.trophyCount || 0, [[10, 'trophy-10'], [50, 'trophy-50'], [100, 'trophy-100'], [200, 'trophy-200'], [250, 'trophy-250'], [300, 'trophy-300'], [400, 'trophy-400'], [500, 'trophy-500']]);
  // Bodhi Tree: the level of THIS year's weeks, and a gold yearly badge for every finished year (from 2026 on)
  const yw = yearWeeksOf(st.id);
  const bodhi = levelForWeeks(yw[THIS_YEAR] || 0);
  if (bodhi >= 0) got.push(`bodhi-level:${THIS_YEAR}:${bodhi}`);
  for (let y = 2026; y < THIS_YEAR; y++) { const l = levelForWeeks(yw[y] || 0); if (l >= 0) got.push(`bodhi-year:${y}:${l}`); }
  at(weekly[st.id] || 0, [[10, 'weeks-10'], [25, 'weeks-25'], [50, 'weeks-50']]);
  at(st.heartsReceived || 0, [[10, 'hearts-10'], [50, 'hearts-50'], [100, 'hearts-100']]);
  const sh = shrine.get(n);
  if (sh) {
    at(sh.lotusCount || 0, [[100, 'lotus-100'], [500, 'lotus-500'], [1000, 'lotus-1000'], [2000, 'lotus-2000'], [3000, 'lotus-3000'], [4000, 'lotus-4000'], [5000, 'lotus-5000']]);
    // Shrine Room: friends visited. Nature World: gifts sent to friends and trees planted.
    at(new Set(sh.shrineVisitedFriends || []).size, [[10, 'shrine-visits'], [25, 'shrine-visits-25'], [50, 'shrine-visits-50'], [75, 'shrine-visits-75']]);
    const nw = sh.natureWorld || {};
    at(new Set(nw.giftedFriends || []).size, [[5, 'nature-gift-5'], [15, 'nature-gift-15'], [30, 'nature-gift-30'], [50, 'nature-gift-50'], [100, 'nature-gift-100'], [200, 'nature-gift-200']]);
    const trees = nw.placedTrees ? Object.keys(nw.placedTrees).length : 0;
    at(trees, [[8, 'nature-5'], [15, 'nature-15'], [30, 'nature-12'], [60, 'nature-25']]);
    const owned = new Set();
    Object.entries(sh.avatarOwned || {}).forEach(([cat, arr]) => (Array.isArray(arr) ? arr : []).forEach(x => owned.add(`${cat}:${x}`)));
    at(owned.size, [[20, 'avatar-10'], [35, 'avatar-25']]);
  }
  const po = poems.get(n);
  if (po) {
    const c = new Set(po.completedPoemIds || []).size;
    at(c, [[10, 'poems-10'], [25, 'poems-25'], [48, 'poem-master']]);
  }
  const rd = reader.get(n);
  if (rd) at(rd.furthestChapter || 0, [[10, 'reader-10'], [20, 'reader-20'], [29, 'reader-master']]);
  const vo = vowels.get(n);
  if (vo) {
    const g = new Set(vo.completedGames || []);
    if (BASIC_VOWELS.every(x => g.has(x))) got.push('vowels-basic');
    if (g.size >= 10) got.push('vowels-pro');
  }
  const nu = numbers.get(n);
  if (nu) at((nu.completedLevels || []).length, [[2, 'numbers-2'], [4, 'numbers-master']]);
  const co = consonants.get(n);
  if (co && (co.completedGames || []).length >= 6) got.push('consonants-6');
  const an = animals.get(n);
  if (an && (an.trophyWins || 0) >= 5) got.push('animals-master');
  // Smart Study: lessons finished, all classes together
  const ss = ssDone[n] || {};
  let ssTotal = 0;
  for (const set of Object.values(ss)) ssTotal += set.size;
  // festivals: good deeds (a kind thought, paying respect) and the festival lamps lit (public/festivalDeeds.json, weekly)
  const fd = (festivalDeeds.students || {})[n];
  if (fd) {
    at(fd.deeds || 0, [[25, 'deeds-25'], [50, 'deeds-50'], [100, 'deeds-100'], [200, 'deeds-200'], [300, 'deeds-300'], [500, 'deeds-500']]);
    at(fd.lamps || 0, [[10, 'lamps-10'], [50, 'lamps-50'], [100, 'lamps-100'], [200, 'lamps-200'], [500, 'lamps-500']]);
  }
  at(ssTotal, [[10, 'ss-10'], [25, 'ss-25'], [50, 'ss-50'], [100, 'ss-100'], [200, 'ss-200']]);
  // Abhidhamma: lessons finished, all classes together
  let abTotal = 0;
  for (const c of Object.values(abhi)) abTotal += (c.students || {})[n] || 0;
  at(abTotal, [[10, 'abhi-10'], [30, 'abhi-30'], [60, 'abhi-60'], [100, 'abhi-100']]);
  // Dhammaschool: chapters finished, and every finished grade
  const dsSet = new Set(dsProgress.completions[n] || []);
  at(dsSet.size, [[5, 'ds-5'], [20, 'ds-20'], [50, 'ds-50'], [100, 'ds-100']]);
  for (const [grade, lessonIds] of Object.entries(dsProgress.lessonsByClass || {})) {
    if (lessonIds.length >= 5 && lessonIds.every(id => dsSet.has(id))) got.push(`ds-grade:${grade}`);
  }
  if (got.length >= 20) got.push('all-rounder');
  const valid = got.filter(id => BADGE_DEFS.some(b => b.id === id) || dynamicBadge(id));
  if (valid.length) out[n] = valid;
}
// the three places of the three honours (trophies, lotus flowers in the Shrine Room, classes attended)
const top3 = (list, key, nameOf, idOf) => list.filter(x => (x[key] || 0) > 0).sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, 3)
  .map((x, i) => ({ id: idOf ? idOf(x) : undefined, name: nameOf(x), count: x[key] || 0, tier: i + 1 }));
const awards = {
  trophy: top3(students, 'trophyCount', x => x.name, x => x.id),
  holy: top3([...shrine.values()].filter(d => (d.studentName || d.id)), 'lotusCount', x => x.studentName || x.id),
  joy: top3((snap.attendanceRankedList || []).filter(s => !s.isOffline), 'attended', x => x.name, x => x.id),
};
writeFileSync(join(ROOT, 'badges.json'), JSON.stringify({ generatedAt: new Date().toISOString(), students: out, awards }));
const counts = {};
Object.values(out).forEach(l => l.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
console.log(`Badges: ${Object.keys(out).length} students; ${Object.values(out).reduce((a, l) => a + l.length, 0)} badges`);
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));

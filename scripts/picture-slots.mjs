// Picture names that keep the pictures in the right order. The pictures of lesson 3 are saved as L03-P1 ... L03-P5 (ending .png / .jpg),
// whatever the order they were made in. Used by name-pictures.mjs, split-sheets.py (same names) and add-lessons.mjs (reads them).
//
// Pictures you cut yourself are understood too: put them in a FOLDER named after the lesson inside Downloads\lesson-pictures
// (the folder name 3, 03, L03 or "lesson 3"), and they are taken in the order of their file names (a screenshot's name has its time,
// so the order you took them in), then by time. At most 5 are used; the first is P1.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SLOTS_PER_LESSON = 5;
export const KEYED_RE = /^L(\d{1,3})-P(\d)\.(png|jpe?g)$/i;
export const LESSON_FOLDER_RE = /^(?:L|lesson[ _-]*)?0*(\d{1,3})$/i;
const PIC_RE = /\.(png|jpe?g|webp)$/i;
export const slotBase = (lessonNo, k) => `L${String(lessonNo).padStart(2, '0')}-P${k}`;
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// every named picture in the given folders: Map("L03-P2" -> full path)  (the key is always written with 2 digits).
// Files named L03-P2.png win over a lesson folder's pictures.
export function listKeyed(dirs) {
  const found = new Map();
  const fromFolders = new Map();
  for (const d of dirs.filter(x => existsSync(x))) {
    for (const f of readdirSync(d)) {
      const full = join(d, f);
      let st; try { st = statSync(full); } catch { continue; }
      const m = f.match(KEYED_RE);
      if (m && st.isFile()) { found.set(slotBase(parseInt(m[1], 10), parseInt(m[2], 10)), full); continue; }
      const fm = f.match(LESSON_FOLDER_RE);
      if (fm && st.isDirectory()) {
        const pics = readdirSync(full).filter(x => PIC_RE.test(x) && statSync(join(full, x)).isFile())
          .map(x => ({ x, t: statSync(join(full, x)).mtimeMs })).sort((a, b) => natural(a.x, b.x) || a.t - b.t);
        pics.slice(0, SLOTS_PER_LESSON).forEach((p, i) => fromFolders.set(slotBase(parseInt(fm[1], 10), i + 1), join(full, p.x)));
      }
    }
  }
  for (const [k, v] of fromFolders) if (!found.has(k)) found.set(k, v);
  return found;
}

// For lessons that still need pictures: which keys are present, which are missing. needs = [{ no, count }] (lesson number, pictures wanted).
export function checkKeyed(needs, keyed) {
  const use = [], missing = [];
  for (const { no, count } of needs) {
    for (let k = 1; k <= count; k++) {
      const key = slotBase(no, k);
      if (keyed.has(key)) use.push(keyed.get(key)); else missing.push(key);
    }
  }
  return { use, missing };
}

// Decide where every lesson's pictures come from. needs = [{ no, count }]. keyed = listKeyed(...). pool = the loose pictures (oldest first).
//  * a lesson whose named pictures are ALL there uses them;
//  * a lesson with only SOME named pictures is a problem (reported, nothing is guessed);
//  * a lesson with none takes the next pictures from the loose pool, oldest first (the old way) -- unless strict is set (a picture plan).
// Returns { use: [paths in lesson order], rows: [{ no, count, source }], problems: [text] }.
export function planPictures(needs, keyed, pool, strict = false) {
  const use = [], rows = [], problems = [];
  let cursor = 0;
  for (const { no, count } of needs) {
    const have = Array.from({ length: count }, (_, k) => keyed.get(slotBase(no, k + 1)));
    const n = have.filter(Boolean).length;
    if (n === count) { use.push(...have); rows.push({ no, count, source: 'named' }); continue; }
    if (n > 0) { problems.push(`Lesson ${no} has only ${have.map((h, k) => (h ? `P${k + 1}` : null)).filter(Boolean).join(', ')} of its ${count} pictures (missing ${have.map((h, k) => (h ? null : `P${k + 1}`)).filter(Boolean).join(', ')}).`); rows.push({ no, count, source: 'partial' }); continue; }
    if (strict) { problems.push(`Lesson ${no} has no pictures (${slotBase(no, 1)} ... ${slotBase(no, count)}).`); rows.push({ no, count, source: 'none' }); continue; }
    const take = pool.slice(cursor, cursor + count);
    cursor += count;
    if (take.length < count) { problems.push(`Lesson ${no}: ${count - take.length} more loose picture(s) are needed.`); rows.push({ no, count, source: 'short' }); continue; }
    use.push(...take); rows.push({ no, count, source: 'loose' });
  }
  return { use, rows, problems, poolUsed: cursor };
}

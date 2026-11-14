// Picture names that keep the pictures in the right order. The pictures of lesson 3 are saved as L03-P1 ... L03-P5 (ending .png / .jpg),
// whatever the order they were made in. Used by name-pictures.mjs (saves them with these names) and add-lessons.mjs (reads them).
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SLOTS_PER_LESSON = 5;
export const KEYED_RE = /^L(\d{1,3})-P(\d)\.(png|jpe?g)$/i;
export const slotBase = (lessonNo, k) => `L${String(lessonNo).padStart(2, '0')}-P${k}`;

// every keyed picture in the given folders: Map("L03-P2" -> full path)  (the key is always written with 2 digits)
export function listKeyed(dirs) {
  const found = new Map();
  for (const d of dirs.filter(x => existsSync(x))) {
    for (const f of readdirSync(d)) {
      const m = f.match(KEYED_RE);
      if (!m) continue;
      const full = join(d, f);
      if (!statSync(full).isFile()) continue;
      found.set(slotBase(parseInt(m[1], 10), parseInt(m[2], 10)), full);
    }
  }
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

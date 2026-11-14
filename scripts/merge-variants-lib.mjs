// The parts of merge-variants.mjs that need no Firebase (so they can be tested): putting a lesson's pictures between the paragraphs of an
// age version, and matching a Canvas backup's lessons to the lessons of a class by title.

export const AGE_GROUPS = ['storytellers', 'explorers', 'adventurers', 'voyagers'];
const IMAGE_NAME_RE = /\b\d{4,6}\.(?:png|jpe?g)\b/gi;

export const imageNamesOf = (text) => Array.from(new Set(String(text || '').match(IMAGE_NAME_RE) || []));

// Puts the picture names between the paragraphs, spread evenly, in order: with 5 pictures and 5+ paragraphs one after each of the first
// ones spread out; with fewer paragraphs than pictures some paragraphs get two. Text that already has any of the names is left alone.
export function spreadImages(text, names) {
  const t = String(text || '').trim();
  if (!t || !names.length) return t;
  if (names.some(n => t.includes(n))) return t;
  const paras = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const after = paras.map(() => []);
  names.forEach((n, i) => after[Math.min(paras.length - 1, Math.floor((i * paras.length) / names.length))].push(n));
  return paras.map((p, i) => [p, ...after[i]].join('\n')).join('\n\n');
}

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

// Which lesson of the class is this backup lesson? Same title (spaces and capitals ignored). Returns the class lesson or null.
// A title that matches two class lessons is not guessed: it returns { ambiguous: [...] }.
export function matchLesson(backupLesson, classLessons) {
  const hits = classLessons.filter(c => norm(c.title) === norm(backupLesson.title));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return { ambiguous: hits };
  return null;
}

// The new variants of one lesson: the backup's age versions with the lesson's pictures put in. A group the class lesson already has (both
// texts present) is kept unless overwrite is set. Returns { variants, added: [groups], kept: [groups] }.
export function buildVariants(backupVariants, classLesson, { overwrite = false } = {}) {
  const names = imageNamesOf(classLesson.burmeseContent);
  const variants = { ...(classLesson.variants || {}) };
  const added = [], kept = [];
  for (const g of AGE_GROUPS) {
    const src = backupVariants && backupVariants[g];
    if (!src || !src.burmese || !src.english) continue;
    const have = variants[g] && variants[g].burmese && variants[g].english;
    if (have && !overwrite) { kept.push(g); continue; }
    variants[g] = { ...src, burmese: spreadImages(src.burmese, names), english: spreadImages(src.english, names) };
    added.push(g);
  }
  return { variants, added, kept, names };
}

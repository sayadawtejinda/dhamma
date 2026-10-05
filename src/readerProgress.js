// Myanmar Reader progress -- ONE definition, shared by the Tutoring app (the
// teacher's side: "completed up to Chapter N / 29", the Report form, trophy
// requests) and by Myanmar Reader itself (which chapter it points a student
// to next, which chapters count as done).
//
// The rule: how far a student has got is what the teacher has recognised, and
// that is the number of Reader trophies they hold. Chapters are done in order,
// and each chapter has two sheets, A then B, worth one trophy each. So the
// trophies, counted from the start, mark off Ch1 A, Ch1 B, Ch2 A, Ch2 B, ...
//
// A student's own reading never moves this on its own. Reading ahead is
// allowed, even all the way to Chapter 29, but it only counts once the teacher
// has recognised it with a trophy. (It used to be taken from the student's own
// score records, so one early Chapter 29 sheet showed a student as having
// completed all 29 chapters.)
//
// How progress is written, as a number (the same convention the app has always
// used): N = Chapter N's Sheet A is done; N.5 = Chapter N is finished, both
// sheets. 0 = nothing recognised yet.

export const READER_LESSON_KEYS = ['MyanmarReader', 'Myanmar Reader Lesson'];
export const READER_TOTAL_CHAPTERS = 29;
export const READER_SHEETS_PER_CHAPTER = 2;

// Trophies this student holds for Myanmar Reader (either title it has been
// known by, plus the lesson's own key if different).
export const readerTrophyCount = (earnedTrophies, extraKeys = []) =>
  Math.max(0, ...[...READER_LESSON_KEYS, ...extraKeys].map(k => Math.floor(Number((earnedTrophies || {})[k]) || 0)));

// Trophies -> the "completed up to" number.
export const readerProgressFromTrophies = (trophies) => {
  const t = Math.max(0, Math.floor(trophies || 0));
  if (t === 0) return 0;
  const chapter = Math.min(READER_TOTAL_CHAPTERS, Math.ceil(t / READER_SHEETS_PER_CHAPTER));
  const bothSheets = t % READER_SHEETS_PER_CHAPTER === 0;
  return chapter + (bothSheets ? 0.5 : 0);
};

// A sheet's place in the fixed reading order (0 = Ch1 A, 1 = Ch1 B, 2 = Ch2 A ...).
// A sheet whose place is below the trophy count already has its trophy.
export const readerSheetPosition = (chapterNum, sheetName) =>
  (Number(chapterNum) - 1) * READER_SHEETS_PER_CHAPTER + (sheetName === 'B' ? 1 : 0);

// From a student's own score records (one per chapter+sheet, possibly
// duplicated across an old name-keyed doc and a newer id-keyed doc): the
// sheets they have finished (score 700+) that still need a trophy asked for.
// Skips a sheet whose trophy they already hold (by place in the order) and
// any sheet that was already asked for. Returns one entry per sheet, each with
// every score doc to flag as requested once the request is made.
export const readerSheetsNeedingTrophy = (scoreDocs, trophiesHeld) => {
  const bySheet = new Map();
  (scoreDocs || []).forEach(d => {
    if (d.chapterNum == null || !d.sheetName) return;
    const key = `${d.chapterNum}_${d.sheetName}`;
    const entry = bySheet.get(key) || { key, chapterNum: Number(d.chapterNum), sheetName: d.sheetName, complete: false, requested: false, docs: [], score: 0 };
    if (d.isComplete) {
      entry.complete = true;
      entry.score = Math.max(entry.score, d.score || 0);
      if (d.trophyRequested) entry.requested = true;
      else entry.docs.push(d);
    }
    bySheet.set(key, entry);
  });
  return Array.from(bySheet.values())
    .filter(e => e.complete && !e.requested && readerSheetPosition(e.chapterNum, e.sheetName) >= trophiesHeld)
    .sort((a, b) => readerSheetPosition(a.chapterNum, a.sheetName) - readerSheetPosition(b.chapterNum, b.sheetName));
};

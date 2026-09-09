import React, { useState, useEffect, useMemo, useRef } from 'react';
import { signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  getDocs,
  deleteDoc,
  writeBatch,
  orderBy,
  limit,
  arrayUnion,
  increment,
  deleteField
} from 'firebase/firestore';
import { appId } from './firebaseConfig';
import { auth, db } from './firebase';

// --- Firebase Configuration ---
const initialAuthToken = null;

// --- Helper Functions ---

const playSound = (soundIndex) => {
  try {
    const audio = document.getElementById('notification-sound');

    if (!audio) return;
    const startTime = soundIndex * 2; 
    audio.currentTime = startTime;
    audio.play().catch(e => console.warn("Audio play failed:", e)); 
    setTimeout(() => {
      if (audio && !audio.paused) {
        audio.pause();
      }
    }, 2000);
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};

const stringToColor = (str) => {
  if (!str) return '#cccccc';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') { 
    return 'Pending...'; 
  }
  return timestamp.toDate().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const diffMs = end.toDate() - start.toDate();
  const diffMins = Math.round(diffMs / 60000);
  return `${diffMins} minutes`; 
};

const getUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const openLink = (url) => {
  if (!url) {
    console.warn("No URL provided to openLink.");
    return;
  }
  if (url.startsWith('smartstudy://')) {
    const [, rest] = url.split('smartstudy://');
    const [classId, lessonId] = rest.split('/');
    alert(`This lesson lives inside the "Lessons & Quiz" tab.\n\nGo to: Lessons & Quiz → Student → Class ID "${classId}" → find lesson ${lessonId}.\n\n(Automatic jump-to-lesson is coming in a future update.)`);
    return;
  }
  let correctedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    correctedUrl = `https://${url}`;
  }
  window.open(correctedUrl, '_blank', 'noopener,noreferrer');
};

// Safely extracts just the Class ID from a "smartstudy://" link. Tolerant of
// the old "smartstudy://CLASSID/LESSONID" format (used briefly before the
// picker was simplified to class-only) as well as the current
// "smartstudy://CLASSID" format — always returns just the class ID with no
// slash, so it's safe to use directly as a Firestore document ID segment.
const extractSmartStudyClassId = (link) => {
  if (!link || typeof link !== 'string' || !link.startsWith('smartstudy://')) return null;
  const rest = link.replace('smartstudy://', '');
  return rest.split('/')[0] || null;
};

const ABHIDHAMMA_APP_ID = 'lesson-translator-app-v6';

const extractAbhidhammaLessonId = (link) => {
  if (!link || !link.startsWith('abhidhamma://')) return null;
  return link.replace('abhidhamma://', '') || null;
};

// ── Dhammaschool app (standalone HTML app — opened via window.open, NOT mounted as React component) ──
const DHAMMASCHOOL_APP_ID = 'dhammaschool-app'; // Firestore appId used inside the HTML app's PATHS.*
const MYANMAR_SPEAKING_APP_ID = 'myanmar-speaking-app'; // Firestore appId used inside myanmar-speaking-app.jsx
const sanitizeMyanmarSpeakingKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');
// TODO: replace with the actual hosted URL once the Dhammaschool app app is deployed.
const DHAMMASCHOOL_APP_URL = 'https://sayadawtejinda.github.io/dhamma/Dhammaschool.html';

// ── Myanmar Speaking app (standalone HTML app — opened via window.open, NOT mounted as React component) ──
// TODO: replace with the actual hosted URL once the Myanmar Speaking app is deployed (same pattern as Dhammaschool app).
const MYANMAR_SPEAKING_APP_URL = 'https://sayadawtejinda.github.io/myanmar-wordcraft/';
// Loose match instead of a strict startsWith(MYANMAR_SPEAKING_APP_URL) — an
// older Lesson Bank entry may have been saved without the trailing slash, or
// with http:// instead of https://, and would otherwise silently fall through
// to the generic external-link opener (new tab, no auto-login, no minutes).
const isMyanmarSpeakingUrl = (u) => typeof u === 'string' && u.includes('myanmar-wordcraft');

// ── Myanmar Reader app (standalone HTML app — opened via window.open, NOT mounted as React component) ──
// TODO: replace with the actual hosted URL once the Myanmar Reader app is deployed (same pattern as Myanmar Speaking app).
const MYANMAR_READER_APP_URL = 'https://sayadawtejinda.github.io/myanmar-reader/';

const extractDhammaschoolClassId = (link) => {
  if (!link || !link.startsWith('dhammaschool://')) return null;
  return link.replace('dhammaschool://', '') || null;
};

const extractWatchLearnVideoKey = (link) => {
  if (!link || !link.startsWith('watchandlearn://')) return null;
  return link.replace('watchandlearn://', '') || null;
};

const sanitizeKey = (key) => {
  if (!key || typeof key !== 'string') return 'unknown_lesson';
  return key.replace(/[\.\#\$\/\[\]]/g, '_');
};

// A Lesson Bank entry can be sent to any class at Assign-time (the class isn't
// baked in when the entry is created), so the same bank entry/title gets reused
// across many different classes. Trophy tracking keyed on title alone would
// wrongly lump every class's trophies together under one number — folding the
// classId into the key keeps each class's trophies separate and correct.
const extractClassIdFromLink = (link) => {
  if (!link) return null;
  if (link.startsWith('smartstudy://')) return extractSmartStudyClassId(link);
  if (link.startsWith('abhidhamma://')) return extractAbhidhammaLessonId(link);
  if (link.startsWith('dhammaschool://')) return extractDhammaschoolClassId(link);
  if (link.startsWith('watchandlearn://')) return extractWatchLearnVideoKey(link);
  // Reading Myanmar / Speaking Myanmar / Myanmar Part 1 & 2 append a part
  // key the same way (e.g. "readingmyanmar://consonantpractice") -- this
  // was missing entirely, so every part's trophy silently collapsed onto
  // one shared bare-title key instead of six separate ones.
  const groupPartKey = extractGroupPartKey(link);
  if (groupPartKey) return groupPartKey;
  return null;
};

// ── Grouped apps (Reading Myanmar / Speaking Myanmar / Myanmar Part 1 & 2) ──
// Each bundles several games behind one "Choose a Part" screen (see
// ReadingMyanmarApp.jsx etc). A Lesson Bank entry for one of these is
// stored as the bare scheme (e.g. "readingmyanmar://"); the specific part
// is chosen at Assign Lesson time (same "not baked into the bank entry"
// idea as smartstudy://) and appended as "readingmyanmar://<partKey>" on
// the assigned lesson, so the student's copy jumps straight into that part
// instead of showing the chooser, and Available Lessons can show which
// part it is. These lists must stay in sync with the PARTS arrays in the
// three group files.
const READING_MYANMAR_PARTS = [
  { key: 'consonantpractice', label: 'Part 1: Consonant Practice' },
  { key: 'burmesegame', label: 'Part 2: Burmese Consonant Game' },
  { key: 'vowelslearning', label: 'Part 3: Myanmar Vowels' },
  { key: 'myanmarspelling', label: 'Part 4: Myanmar Spelling' },
  { key: 'consonantendings', label: 'Part 5: Consonant Endings' },
  { key: 'soundpractice', label: 'Part 6: Sound Practice' },
];
const SPEAKING_MYANMAR_PARTS = [
  { key: 'myanmarpoems', label: 'Part 1: Myanmar Poems' },
  { key: 'numberlearning', label: 'Part 2: Number Learning' },
  { key: 'animalsound', label: 'Part 3: Animal Sound Quiz' },
  { key: 'burmeselearninggames', label: 'Part 4: Burmese Learning Games' },
  { key: 'interactivequiz', label: 'Part 5: Interactive Learning Quiz' },
  { key: 'timeandcalendar', label: 'Part 6: Time and Calendar' },
];
const MYANMAR_PART1AND2_PARTS = [
  { key: 'part1a', label: 'Part 1A: Myanmar Learning & Game' },
  { key: 'part1b', label: 'Part 1B: Kindergarten Classroom' },
  { key: 'part2a', label: 'Part 2A: Chapters 15-28 Vocabulary' },
  { key: 'part2b', label: 'Part 2B: Chapters 15-29 Reading' },
];
const GROUP_PARTS_BY_SCHEME = {
  'readingmyanmar://': READING_MYANMAR_PARTS,
  'speakingmyanmar://': SPEAKING_MYANMAR_PARTS,
  'myanmarpart1and2://': MYANMAR_PART1AND2_PARTS,
};
// Reading Myanmar / Speaking Myanmar track no student name, score, or class
// id at all, so there's no live lesson count to derive a trophy max from
// the way Smart Study/Abhidhamma/Dhammaschool do. Each part's max is simply
// carried over from the old individual lesson it replaced (see
// GROUP_APP_MIGRATIONS) so "Trophy Status" has a real number to show
// instead of silently not rendering at all (which is what happened before
// this existed, since maxAvailable fell back to the bare Lesson Bank
// entry's own trophyLimit -- 0, since it was never individually set).
const GROUP_APP_PART_MAX = {
  'readingmyanmar://': {
    consonantpractice: 7,
    burmesegame: 19,
    vowelslearning: 11,
    myanmarspelling: 20,
    consonantendings: 7,
    soundpractice: 16, // Quiz Mode Levels 1-8, 2 trophies per level passed
  },
  'speakingmyanmar://': {
    myanmarpoems: 25,
    numberlearning: 16,
    animalsound: 5,
    burmeselearninggames: 20,
    interactivequiz: 5,
    timeandcalendar: 3,
  },
};
const extractGroupPartKey = (link) => {
  if (!link) return null;
  for (const scheme of Object.keys(GROUP_PARTS_BY_SCHEME)) {
    if (link.startsWith(scheme) && link !== scheme) return link.replace(scheme, '');
  }
  return null;
};
const groupPartLabel = (scheme, partKey) => {
  const parts = GROUP_PARTS_BY_SCHEME[scheme];
  const part = parts && parts.find(p => p.key === partKey);
  return part ? part.label : null;
};
const groupSchemeOfLink = (link) => {
  if (!link) return null;
  for (const scheme of Object.keys(GROUP_PARTS_BY_SCHEME)) {
    if (link === scheme || link.startsWith(scheme)) return scheme;
  }
  return null;
};
// Myanmar Sound Practice can be assigned standalone (myanmarsoundpractice://)
// or as Reading Myanmar's Part 6 -- either way its own Quiz Mode progress
// (see MYANMAR_SOUND_PRACTICE_APP_ID below) is what the Report auto-fill reads.
const MYANMAR_SOUND_PRACTICE_APP_ID = 'myanmar-sound-practice-app'; // Firestore appId used inside MyanmarSoundPracticeApp.jsx
const sanitizeSoundPracticeKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');
const isSoundPracticeUrl = (link) =>
  link === 'myanmarsoundpractice://' ||
  (groupSchemeOfLink(link) === 'readingmyanmar://' && extractGroupPartKey(link) === 'soundpractice');
// Same idea for Burmese Consonant Game -- standalone (burmesegame://) or as
// Reading Myanmar's Part 2. Its own roster doc's completedGames (Picture
// Game levels + per-group Pick/Click games) is what the Report auto-fill reads.
const BURMESE_GAME_APP_ID = 'burmese-consonant-game-app'; // Firestore appId used inside BurmeseConsonantGameApp.jsx
const sanitizeBurmeseGameKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');
const isBurmeseGameUrl = (link) =>
  link === 'burmesegame://' ||
  (groupSchemeOfLink(link) === 'readingmyanmar://' && extractGroupPartKey(link) === 'burmesegame');
const computeLessonKey = (title, link) => {
  const classId = extractClassIdFromLink(link);
  return sanitizeKey(classId ? `${title}_${classId}` : title);
};

// Single source of truth for "how many lesson-units has this student
// completed on this lesson" — Smart Study, Abhidhamma, and Dhammaschool all
// share the same idea (a class = several lessons, trophies awarded roughly
// every 5), and used to each compute this number slightly differently in
// different places (tracked completedUnits, a trophy-derived estimate, real
// recorded sessions, and — for Smart Study only — a live class-completion
// count), which could disagree with each other: a teacher fixing the
// trophy count wouldn't necessarily update every other display, so a
// student could see "✅ Completed" in one place and "Continue Lesson 1" in
// another for the exact same lesson. This takes the highest of every
// signal available, so every display -- Available Lessons, Active
// Session, the Completed badge, Continue/Start button text -- always
// agrees, and "Fix Previously Earned" alone is enough to correct all of
// them at once.
const getEffectiveCompletedUnit = (lesson, studentProfile, sessionsForLesson, ssCompletionCounts) => {
  if (!lesson) return 0;
  const lessonKey = computeLessonKey(lesson.title, lesson.link);
  const maxAvailable = lesson.trophyLimit || 0;
  const unitCount = lesson.unitCount || 0;
  const previouslyEarned = studentProfile?.earnedTrophies?.[lessonKey] || 0;
  const trackedCompletedUnit = studentProfile?.completedUnits?.[lessonKey] || 0;
  const derivedCompletedUnit = (unitCount > 0 && maxAvailable > 0)
    ? Math.min(unitCount, Math.ceil((previouslyEarned * unitCount) / maxAvailable))
    : 0;
  const highestSessionCompletedUnit = (sessionsForLesson || []).reduce(
    (max, s) => (typeof s.completedUnit === 'number' ? Math.max(max, s.completedUnit) : max), 0
  );
  const ssClassId = lesson.link?.startsWith('smartstudy://') ? extractSmartStudyClassId(lesson.link) : null;
  const ssCount = ssClassId != null ? (ssCompletionCounts?.[ssClassId] || 0) : 0;
  const effective = Math.max(trackedCompletedUnit, derivedCompletedUnit, highestSessionCompletedUnit, ssCount);
  return unitCount > 0 ? Math.min(unitCount, effective) : effective;
};

// One small chip per scheduled class for the whole year, in date order --
// green with the day-of-month number (attended), red with the day-of-month
// number (absent), or a small blank/outlined dot (hasn't happened yet).
// Replaces separate Month/Year boxes and "Attended:"/"Absent:" word labels
// entirely -- kept small enough that a full year of chips still fits, per
// the teacher's "pictures/colors over text for young readers" direction.
function AttendanceBar({ entries }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-px">
      {entries.map((e, i) => (
        <span
          key={i}
          className={`w-3 h-3 flex items-center justify-center rounded-sm text-[6px] leading-none font-bold ${
            e.status === 'attended' ? 'bg-emerald-500 text-white'
            : e.status === 'absent' ? 'bg-red-500 text-white'
            : 'w-1 h-1 self-center border border-gray-300'
          }`}
          title={e.date.toLocaleDateString()}
        >
          {e.status === 'upcoming' ? '' : e.day}
        </span>
      ))}
    </div>
  );
}

// Every other linked app counts in whole units, so "next" is always
// completed + 1. Myanmar Reader is the one exception: its completed number
// carries a chapter's two sheets as X (Sheet A of chapter X done) then X.5
// (Sheet B done too, chapter X fully finished) -- see the Myanmar Reader
// auto-fill effect below for where that value gets written. So the "next"
// chapter to show/study is the SAME chapter (continue with Sheet B) when the
// number is a whole one, and the FOLLOWING chapter (start Sheet A) once it
// has picked up the .5.
const getNextChapterNumber = (completedValue, isMyanmarReaderLesson) => {
  if (!isMyanmarReaderLesson) return completedValue + 1;
  if (completedValue <= 0) return 1;
  return Number.isInteger(completedValue) ? completedValue : Math.floor(completedValue) + 1;
};

// How many trophies a class with this many lessons is worth. Matches the
// teacher's real awarding pattern (confirmed against actual examples):
// 4 lessons -> 1 trophy, 10 -> 2, 11 -> 2, 29 -> 6 — i.e. round(lessons / 5),
// not floor(lessons / 5) (floor would give 4->0 and 29->5, both wrong).
const computeClassTrophyMax = (lessonCount) => {
  const n = lessonCount || 0;
  if (n <= 0) return 0;
  return Math.max(1, Math.round(n / 5));
};

// One-time migration map for the 4 old Gemini-link Lesson Bank entries being
// retired in favor of the real per-class Smart Study tracking. `fallback` is
// only ever used for a target class that has NO live Smart Study tracking at
// all (e.g. Mingala) -- every class that does exist live gets its trophies
// computed from real quizCompletions data instead, exactly like a normal
// Smart Study class, so a student's true progress decides the number, not
// this old fixed value.
const SMARTSTUDY_MIGRATION_MAP = {
  "10 Parami": [
    { classId: 'BUDDHA', fallback: 2 },
    { classId: 'PARAMI', fallback: 2 },
    { classId: 'NEW', fallback: 1 },
  ],
  " Heavenly World or Golden cage": [
    { classId: 'DEVA', fallback: 2 },
    { classId: 'KAMMA', fallback: 3 },
  ],
  "38 Blessings ": [
    { classId: 'MINGALA', fallback: 2 },
  ],
  "The Buddha's Eight Outer Victories": [
    { classId: 'OUTER VICTORIES', fallback: 2 },
    { classId: 'WASO', fallback: 2 },
  ],
};
const SMARTSTUDY_MIGRATION_NEW_TITLE = 'Smart Study';
// The Lesson Bank entry actually used to send Smart Study lessons to
// students -- confirmed directly by the teacher. Every per-class trophy key
// this migration writes MUST be computed from this exact title, or Assign
// Lesson will never see the value. This briefly had to point at a
// repurposed old lesson (" Heavenly World or Golden cage") while "Smart
// Study Lesson" couldn't be opened at all -- that turned out to be a
// separate, now-fixed bug (a stale-closure effect kept resetting the
// teacher's Lesson Bank selection back to whichever title sorts first
// alphabetically), so this now points back at the real entry.
const CANONICAL_SMARTSTUDY_TITLE = 'Smart Study Lesson';
// The other title this migration has, at various points, mistakenly keyed
// trophies under while chasing the entry-selection bugs above -- used only
// by the cleanup scan to find and remove those specific stray writes.
const PRIOR_WRONG_SMARTSTUDY_TITLE = ' Heavenly World or Golden cage';

// One-time migration map for old Gemini-link Abhidhamma lessons being
// retired in favor of the real per-class Abhidhamma tracking (same shape
// and reasoning as SMARTSTUDY_MIGRATION_MAP above). classId values are the
// REAL live document IDs (confirmed directly from the teacher's "Existing
// Classes" list -- these use ALL-CAPS-WITH-HYPHENS and single "dh", e.g.
// "BASIC-ABHIDHAMMA-3", NOT the old lesson's own Title Case / double-d
// spelling like "Basic Abhiddhamma-4"). The first version of this map used
// the human-readable old-lesson-style spelling as a guessed classId, which
// silently failed to match the real class and is exactly why Kevin's
// Previously Earned stayed at 0 after Apply. `forceFallback: true` means
// always use the student's own already-earned trophy count for that OLD
// lesson directly (never look up live progress) -- confirmed by the
// teacher for "THE GREAT BUDDHISTS" and "DHAMMAPADA-1" specifically: those
// classes exist and have lesson content, but have no real per-student
// completion data recorded yet, so a live lookup would wrongly compute 0
// and erase the trophies these students already earned. "Basic Abhiddhamma"
// (the original bare lesson) is deliberately NOT included -- not yet
// assigned to any class, to be migrated separately later.
const ABHIDHAMMA_MIGRATION_MAP = {
  'Basic Abhiddhamma-2': [{ classId: 'BASIC-ABHIDHAMMA-2' }],
  'Basic Abhiddhamma-3': [{ classId: 'BASIC-ABHIDHAMMA-2' }],
  'Basic Abhiddhamma-4': [{ classId: 'BASIC-ABHIDHAMMA-3' }],
  'Basic Abhiddhamma-5': [{ classId: 'BASIC-ABHIDHAMMA-4' }],
  // Note the single "d" in "Abhidhamma" here -- this old lesson's title is
  // spelled differently from the others (double "d") in the Lesson Bank.
  'Basic Abhidhamma-6': [{ classId: 'BASIC-ABHIDHAMMA-5' }],
  'Being Good and Being Kind': [{ classId: 'BEING GOOD AND BEING KIND' }],
  'The Great Buddhist Lady': [{ classId: 'THE GREAT BUDDHISTS', forceFallback: true }],
  'The Great Buddhist Layman': [{ classId: 'THE GREAT BUDDHISTS', forceFallback: true }],
  'Dhammapada Chapter-1': [{ classId: 'DHAMMAPADA-1', forceFallback: true }],
};
// The Lesson Bank entry actually used to send Abhidhamma lessons -- the
// teacher just rebuilt this from scratch (the old one was lost to a data
// import overwrite), so unlike Smart Study there's no ambiguity/duplicate
// to worry about here.
const CANONICAL_ABHIDHAMMA_TITLE = 'Abhidhamma Lesson';
const ABHIDHAMMA_MIGRATION_CLASS_IDS = [...new Set(Object.values(ABHIDHAMMA_MIGRATION_MAP).flat().map(t => t.classId))];

// One-time migration map for old Gemini-link Dhammaschool grade lessons
// (Myanmar-titled) into the real per-class Dhammaschool tracking. classId
// values (GRADE-1 .. GRADE-5) were given directly by the teacher as the
// real live class IDs -- Dhammaschool classes are a plain string field on
// each lesson doc, not a separate document id vs. display name like
// Abhidhamma, so no name-resolution ambiguity here.
const DHAMMASCHOOL_MIGRATION_MAP = {
  'ဓမ္မစကူးလ်-ပထမတန်း': [{ classId: 'GRADE-1' }],
  'ဓမ္မစကူးလ်(ဒုတိယတန်း)': [{ classId: 'GRADE-2' }],
  'ဓမ္မစကူးလ် (တတိယတန်း)': [{ classId: 'GRADE-3' }],
  'ဓမ္မစကူးလ်(စတုတ္ထတန်း)': [{ classId: 'GRADE-4' }],
  'ဓမ္မစကူးလ်-ပဉ္စမတန်း': [{ classId: 'GRADE-5' }],
};
// Confirmed directly by the teacher as the entry actually used to send
// Dhammaschool lessons.
const CANONICAL_DHAMMASCHOOL_TITLE = 'Dhammaschool Lesson';
const SMARTSTUDY_MIGRATION_CLASS_IDS = [...new Set(Object.values(SMARTSTUDY_MIGRATION_MAP).flat().map(t => t.classId))];

// One-time migration for the old individual sub-apps merged into Reading
// Myanmar / Speaking Myanmar (see GROUP_PARTS_BY_SCHEME above). Unlike every
// other migration here, these apps track no student name, score, or class
// id at all -- there is no live progress signal to compute from, so every
// value is a pure carry-over of the old trophy count (confirmed directly by
// the teacher). Both share the same shape, so one generic preview/apply
// pair (below) handles them rather than duplicating the logic twice.
const GROUP_APP_MIGRATIONS = [
  {
    id: 'readingMyanmar',
    label: 'Reading Myanmar',
    canonicalTitle: '📚 Reading Myanmar',
    map: {
      'Myanmar Consonant': 'consonantpractice',
      'ALL Consonants ': 'burmesegame',
      'Vowel Practice ': 'vowelslearning',
      'Reading machine for Myanmar Letter': 'myanmarspelling',
      'အသတ်သင်ခန်းစာ': 'consonantendings',
      'ကကာကိကီ': 'soundpractice',
    },
  },
  {
    id: 'speakingMyanmar',
    label: 'Speaking Myanmar',
    canonicalTitle: '🗣️ Speaking Myanmar',
    map: {
      'Poem': 'myanmarpoems',
      'All Number': 'numberlearning',
      'Animal sound': 'animalsound',
      'emoji Myanmar Language ': 'burmeselearninggames',
      'Human Anatomy': 'interactivequiz',
      'Time ': 'timeandcalendar',
    },
  },
];

// A "Group" schedule entry creates one normal individual entry per member
// (same shape as a regular Online Student entry) tagged with a shared
// `groupId` + `groupBatchKey`, rather than one special shared doc -- every
// existing per-student attendance/session/dashboard query already works on
// a real studentUid, so this needs no special-casing anywhere else. The
// groupId is only ever read by the schedule views that cluster same-
// occurrence entries back together for a collapsed group display.
const getStudentAttendanceForEntry = (entry, studentUid, sessions) => {
  if (entry.overrideStatus === 'attended') return 'attended';
  if (entry.overrideStatus === 'absent') return 'absent';
  if (entry.studentUid !== 'offline') {
    const entryDate = entry.startTime.toDate();
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
    const didAttend = (sessions || []).some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
    return didAttend ? 'attended' : 'absent';
  }
  return 'absent'; // legacy 'offline' placeholder entries count as absent unless overridden
};

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Paths ---
const publicDataPath = `/artifacts/${appId}/public/data`;
const configCollection = collection(db, `${publicDataPath}/config`);
const studentsCollection = collection(db, `${publicDataPath}/students`);
const lessonsCollection = collection(db, `${publicDataPath}/lessons`); 
const sessionsCollection = collection(db, `${publicDataPath}/studySessions`);
const lessonBankCollection = collection(db, `${publicDataPath}/lessonBank`); 
const teacherScheduleCollection = collection(db, `${publicDataPath}/teacherSchedule`); 
const groupsCollection = collection(db, `${publicDataPath}/studentGroups`);
const announcementsCollection = collection(db, `${publicDataPath}/announcements`);
const starAnnouncementsCollection = collection(db, `${publicDataPath}/starAnnouncements`);
const greetingsCollection = collection(db, `${publicDataPath}/greetings`);
const teacherConfigDoc = doc(configCollection, 'teacher');

// --- Components ---

function ConfirmationModal({ 
  isOpen, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor = "bg-red-600 hover:bg-red-700" 
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">{title}</h3>
        <div className="text-gray-700 mb-6 whitespace-pre-wrap">{message}</div>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={onConfirm} className={`px-5 py-2 rounded-lg text-white font-semibold ${confirmColor} shadow-md`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrophyResetModal({ isOpen, onReset, onDecline }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-[100]">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4 text-center">
        <h3 className="text-2xl font-bold mb-4 text-gray-900">Reset Legacy Trophies?</h3>
        <p className="text-gray-700 mb-6 whitespace-pre-wrap">
          You have just imported data. Would you like to reset all previously awarded trophies for all students to start fresh according to the new rules?
          <br/><br/>
          If you select <strong>"No, Keep Them"</strong>, current trophy counts will be retained and you will not be asked again.
        </p>
        <div className="flex flex-col space-y-3">
          <button onClick={onReset} className="w-full px-5 py-3 rounded-lg text-white font-bold bg-red-500 hover:bg-red-600 shadow-md transition-colors">
            Yes, Reset All Trophies
          </button>
          <button onClick={onDecline} className="w-full px-5 py-3 rounded-lg text-gray-800 font-bold bg-gray-200 hover:bg-gray-300 shadow-md transition-colors">
            No, Keep Them
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentAttendanceModal({ isOpen, onClose, student }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDuration, setTotalDuration] = useState(0); 

  useEffect(() => {
    if (isOpen && student?.id) {
      setLoading(true);
      const q = query(sessionsCollection, where("studentUid", "==", student.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalMinutes = 0; 
        const history = snapshot.docs
          .map(doc => doc.data())
          .filter(s => s.endTime && s.startTime)
          .sort((a, b) => a.startTime.toDate() - b.startTime.toDate()); 
        
        history.forEach(entry => {
          if (entry.startTime && entry.endTime) {
            const diffMs = entry.endTime.toDate() - entry.startTime.toDate();
            totalMinutes += Math.round(diffMs / 60000);
          }
        });
            
        setAttendance(history);
        setTotalDuration(totalMinutes); 
        setLoading(false);
      }, (error) => {
        console.error("Error fetching attendance: ", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold mb-4 text-indigo-700">
          Study History: {student?.name}
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-2 mb-6">
          {loading ? (
            <p className="text-gray-600">Loading history...</p>
          ) : attendance.length === 0 ? (
            <p className="text-gray-600">No completed study sessions found.</p>
          ) : (
            attendance.map((entry, index) => (
              <div key={index} className="bg-gray-100 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{entry.lessonTitle}</p>
                <p className="text-sm text-gray-700">Completed: {formatTimestamp(entry.endTime)}</p>
                <p className="text-sm text-gray-700">Duration: {getDuration(entry.startTime, entry.endTime)}</p>
                <p className="text-xs text-gray-600 mt-1 truncate">Feedback: {entry.feedbackNotes || 'N/A'}</p>
              </div>
            ))
          )}
        </div>
        {!loading && (
          <div className="mb-6 p-3 bg-indigo-50 rounded-lg text-center">
            <p className="text-lg font-semibold text-indigo-800">
              Total Study Time: {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </p>
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditScheduleModal({ isOpen, onClose, onSave, entry, students }) {
  const [studentType, setStudentType] = useState('online');
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [updateType, setUpdateType] = useState('single'); 

  useEffect(() => {
    if (entry) {
      setUpdateType('single');

      if (entry.studentUid === 'offline') {
        setStudentType('offline');
        setSelectedStudentUid('');
        setManualStudentName(entry.studentName);
        setStudentSearch(''); 
      } else {
        setStudentType('online');
        setSelectedStudentUid(entry.studentUid);
        setManualStudentName('');
        const foundName = students.find(s => s.id === entry.studentUid)?.name;
        setStudentSearch(String(foundName || '')); 
      }
    
      setIsStudentDropdownOpen(false); 

      const startTime = (entry.startTime && typeof entry.startTime.toDate === 'function') 
        ? entry.startTime.toDate() : new Date(); 
      
      const endTime = (entry.endTime && typeof entry.endTime.toDate === 'function')
        ? entry.endTime.toDate() : new Date(startTime.getTime() + 60 * 60 * 1000);

      setManualDate(toLocalDateString(startTime));
      
      const formatTime = (date) => {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      };
      setManualStartTime(formatTime(startTime));
      setManualEndTime(formatTime(endTime));
    }
  }, [entry, students]);

  if (!isOpen || !entry) return null;
  
  const filteredStudents = useMemo(() => {
    const searchStr = String(studentSearch || '').toLowerCase(); 
    if (!searchStr) return students; 
    return students.filter(s =>
      s.isActive === true && s.name && typeof s.name === 'string' && s.name.toLowerCase().startsWith(searchStr) 
    );
  }, [students, studentSearch]);

  const handleSaveClick = (e) => {
    e.preventDefault();
    let studentUid = '';
    let studentName = '';

    if (studentType === 'online') {
      if (!selectedStudentUid) return;
      studentUid = selectedStudentUid;
      studentName = students.find(s => s.id === studentUid)?.name || 'Unknown Student';
    } else {
      if (!manualStudentName) return;
      studentUid = 'offline';
      studentName = manualStudentName;
    }

    const [year, month, day] = manualDate.split('-').map(Number);
    const [startHour, startMinute] = manualStartTime.split(':').map(Number);
    const [endHour, endMinute] = manualEndTime.split(':').map(Number);

    const newStartTime = Timestamp.fromDate(new Date(year, month - 1, day, startHour, startMinute));
    const newEndTime = Timestamp.fromDate(new Date(year, month - 1, day, endHour, endMinute));

    onSave({
      id: entry.id,
      studentUid: studentUid,
      studentName: studentName,
      startTime: newStartTime,
      endTime: newEndTime,
      isRecurring: entry.isRecurring, 
      recurrenceId: entry.recurrenceId, 
      updateType: updateType 
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <form onSubmit={handleSaveClick} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Edit Schedule Entry</h3>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Student Type</label>
          <select 
            value={studentType} 
            onChange={(e) => setStudentType(e.target.value)}
            className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="online">Online Student</option>
            <option value="offline">Offline Student</option>
          </select>
        </div>
        
        {studentType === 'online' ? (
          <div className="mb-4 relative">
            <label className="block text-gray-700 mb-2">Select Student</label>
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value); 
                if (selectedStudentUid) setSelectedStudentUid(null); 
                setIsStudentDropdownOpen(true);
              }}
              onFocus={() => setIsStudentDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsStudentDropdownOpen(false), 200)} 
              placeholder="Type to search..."
              className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isStudentDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setStudentSearch(student.name);
                        setSelectedStudentUid(student.id);
                        setIsStudentDropdownOpen(false);
                      }}
                      className="p-3 hover:bg-indigo-50 cursor-pointer"
                    >
                      {student.name} ({student.displayId})
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500">No students found.</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Student Name</label>
            <input type="text" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value)} placeholder="e.g., Offline Student" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Date</label>
          <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">Start Time</label>
            <input type="time" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">End Time</label>
            <input type="time" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {entry.isRecurring && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="font-semibold text-yellow-800 mb-3">Recurring Entry</p>
            <p className="text-sm text-yellow-700 mb-3">This is a recurring entry. How would you like to update it?</p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="radio" name="updateType" value="single" checked={updateType === 'single'}
                  onChange={() => setUpdateType('single')} className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                Update This Entry Only
              </label>
              <label className="flex items-center">
                <input 
                  type="radio" name="updateType" value="all" checked={updateType === 'all'}
                  onChange={() => setUpdateType('all')} className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                Update All Future Entries
              </label>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
            Cancel
          </button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 shadow-md">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Report Components ---

function StarAnnouncementModal({ isOpen, onClose, students, onSend }) {
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const filtered = students.filter(s => s.isActive === true && s.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUid || !message.trim()) return;
    onSend(selectedUid, duration, message.trim());
    setSearch(''); setSelectedUid(''); setDuration(1); setMessage('');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">⭐ Announce Outstanding Student</h3>
        <div className="mb-4 relative">
          <label className="block text-gray-700 mb-2">Select Student</label>
          <input
            type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUid(''); setIsDropdownOpen(true); }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            placeholder="Type to search..."
            className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filtered.length > 0 ? filtered.map(s => (
                <div key={s.id} onClick={() => { setSearch(s.name); setSelectedUid(s.id); setIsDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer">
                  {s.name}
                </div>
              )) : <div className="p-3 text-gray-500">No students found.</div>}
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Show for</label>
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => setDuration(1)} className={`w-1/2 p-2 rounded-lg font-semibold ${duration === 1 ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>1 Week</button>
            <button type="button" onClick={() => setDuration(2)} className={`w-1/2 p-2 rounded-lg font-semibold ${duration === 2 ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>2 Weeks</button>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows="3" placeholder="e.g., This student has perfect attendance!" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600 shadow-md">Send</button>
        </div>
      </form>
    </div>
  );
}

function AttendanceReports({ students, teacherSchedule, sessions }) {
  const [period, setPeriod] = useState('monthly'); 

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    if (period === 'monthly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const pastSchedules = teacherSchedule.filter(s => {
      const d = s.startTime.toDate();
      return d >= startDate && d <= now;
    });

    const offlineNames = [...new Set(pastSchedules.filter(s => s.studentUid === 'offline').map(s => s.studentName))];
    const offlineStudents = offlineNames.map(name => ({ id: 'offline', name: name, displayId: 'Offline' }));
    const allStudentsToReport = [...students.filter(s => s.isActive), ...offlineStudents];

    const report = allStudentsToReport.map(student => {
      const studentSchedules = pastSchedules.filter(s => s.studentUid === student.id || (s.studentUid === 'offline' && s.studentName === student.name));
      let attended = 0;
      let absent = 0;

      studentSchedules.forEach(entry => {
        if (entry.overrideStatus === 'attended') {
          attended++;
        } else if (entry.overrideStatus === 'absent') {
          absent++;
        } else if (entry.studentUid !== 'offline') {
          const entryDate = entry.startTime.toDate();
          const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 0, 0, 0);
          const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
          const didAttend = sessions.some(s => s.studentUid === student.id && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
          if (didAttend) attended++;
          else absent++;
        } else {
          absent++; 
        }
      });

      return {
        name: student.name,
        displayId: student.displayId,
        total: studentSchedules.length,
        attended,
        absent
      };
    });

    return report.filter(r => r.total > 0).sort((a, b) => (b.attended / b.total) - (a.attended / a.total));
  }, [period, students, teacherSchedule, sessions]);

  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-indigo-200 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-indigo-800">Attendance Overview</h3>
        <div className="flex rounded-lg bg-gray-100 p-1 shadow-inner">
          <button onClick={() => setPeriod('monthly')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${period === 'monthly' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>This Month</button>
          <button onClick={() => setPeriod('yearly')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${period === 'yearly' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>This Year</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-indigo-50 text-indigo-800 border-b-2 border-indigo-200">
              <th className="p-3 font-semibold rounded-tl-lg">Student Name</th>
              <th className="p-3 font-semibold text-center">Total Scheduled</th>
              <th className="p-3 font-semibold text-center text-emerald-600">Attended</th>
              <th className="p-3 font-semibold text-center text-red-600">Absent</th>
              <th className="p-3 font-semibold text-center rounded-tr-lg">Rate</th>
            </tr>
          </thead>
          <tbody>
            {reportData.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-gray-500 font-medium">No scheduled sessions for this period.</td></tr>
            ) : (
              reportData.map((row, idx) => {
                const rate = Math.round((row.attended / row.total) * 100);
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-800">
                      {row.name} 
                      {row.displayId === 'Offline' && <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Offline</span>}
                    </td>
                    <td className="p-3 text-center font-bold text-gray-700">{row.total}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{row.attended}</td>
                    <td className="p-3 text-center font-bold text-red-600">{row.absent}</td>
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2 py-1 rounded-full text-sm shadow-sm ${rate >= 80 ? 'bg-emerald-100 text-emerald-800' : rate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{rate}%</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeacherDashboard({ user, announcements, onOpenSmartStudy, onOpenAbhidhamma, onOpenMyanmarReader, onOpenDhammaschool, onOpenConsonantPractice, onOpenBurmeseGame, onOpenMyanmarSpeaking, onOpenNumberLearning, onOpenVowelsLearning, onOpenAnimalSound, onOpenBurmeseLearningGames, onOpenInteractiveQuiz, onOpenMyanmarPoems, onOpenConsonantEndings, onOpenTimeAndCalendar, onOpenMyanmarSpelling, onOpenMyanmarSoundPractice, onOpenReadingMyanmar, onOpenSpeakingMyanmar, onOpenMyanmarPart1And2, onOpenWatchAndLearn, onOpenBodhiTree }) {
  const [students, setStudents] = useState([]);
  const [lessonBank, setLessonBank] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [teacherSchedule, setTeacherSchedule] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [viewMode, setViewMode] = useState('send'); 
  const [reportTab, setReportTab] = useState('feedback'); 
  const [showAllReports, setShowAllReports] = useState(false); 
  const [teacherConfigData, setTeacherConfigData] = useState(null);
  const [recoveryPasscodeInput, setRecoveryPasscodeInput] = useState('');
  const [recoveryPasscodeSaving, setRecoveryPasscodeSaving] = useState(false);

  const handleSaveRecoveryPasscode = async () => {
    const code = recoveryPasscodeInput.trim();
    if (!code) { alert('Please enter a passcode.'); return; }
    setRecoveryPasscodeSaving(true);
    try {
      await setDoc(teacherConfigDoc, { passcode: code }, { merge: true });
      setRecoveryPasscodeInput('');
      alert('Recovery passcode saved! Write it down somewhere safe — you\'ll need it if you ever get logged out as teacher.');
    } catch (error) {
      console.error('Error saving recovery passcode:', error);
      alert('Error saving passcode. Please try again.');
    }
    setRecoveryPasscodeSaving(false);
  };
  
  const [newBankLessonTitle, setNewBankLessonTitle] = useState('');
  const [newBankLessonLink, setNewBankLessonLink] = useState('');
  const [newBankLessonDetails, setNewBankLessonDetails] = useState(''); 
  const [newBankLessonTrophyLimit, setNewBankLessonTrophyLimit] = useState(0);
  const [newBankLessonUnitLabel, setNewBankLessonUnitLabel] = useState('Chapter');
  const [newBankLessonUnitCount, setNewBankLessonUnitCount] = useState(0);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [smartStudyClasses, setSmartStudyClasses] = useState(null); // null = not loaded yet
  const [pickerLoading, setPickerLoading] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null); 
  const [mergeSourceId, setMergeSourceId] = useState(null); 
  const [mergeTargetId, setMergeTargetId] = useState(null); 
  const [mergeNewTitle, setMergeNewTitle] = useState(''); 
  const [mergeSourceTitle, setMergeSourceTitle] = useState('');
  const [mergeTargetTitle, setMergeTargetTitle] = useState('');
  const [isMerging, setIsMerging] = useState(false); 
  const draggedLessonIdRef = useRef(null);

  const [sendActionType, setSendActionType] = useState('lesson'); 
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [selectedBankLessonId, setSelectedBankLessonId] = useState('');
  const [sendSmartStudyClassId, setSendSmartStudyClassId] = useState(''); // class chosen in Send Action for smartstudy:// lessons
  const [sendGroupPartKey, setSendGroupPartKey] = useState(''); // part chosen in Send Action for readingmyanmar:// / speakingmyanmar:// / myanmarpart1and2:// lessons
  const [sendWatchLearnVideoKey, setSendWatchLearnVideoKey] = useState(''); // video chosen in Send Action for watchandlearn:// lessons
  const [watchLearnVideos, setWatchLearnVideos] = useState([]);
  // SmartStudy completion counts for the selected student (loaded when student+lesson are selected)
  const [ssStudentClassCount, setSsStudentClassCount] = useState(null);   // per-class (e.g. BUDDHA)
  const [ssStudentTotalCount, setSsStudentTotalCount] = useState(null);   // all classes combined
  const [abhiStudentCount, setAbhiStudentCount] = useState(null);
  const [abhiStudentScore, setAbhiStudentScore] = useState(null);
  const [abhiTotalCount,   setAbhiTotalCount]   = useState(null); // total lessons in the abhi class
  const [sendAbhidhammaClassId, setSendAbhidhammaClassId] = useState(''); // class chosen in Send Action for abhidhamma:// lessons
  const [sendDhammaschoolClassId, setSendDhammaschoolClassId] = useState(''); // class chosen in Send Action for dhammaschool:// lessons
  const [dhammaschoolClasses, setDhammaschoolClasses] = useState(null); // null = not yet loaded; [{classId, lessonCount}]
  const [dhammaschoolLoading, setDhammaschoolLoading] = useState(false);
  const [dhammaschoolStudentProgress, setDhammaschoolStudentProgress] = useState(null); // { completedCount:number, totalLessons:number, score:number }
  const [abhidhammaClasses, setAbhidhammaClasses] = useState(null);   // null = not yet loaded
  const [abhidhammaLoading, setAbhidhammaLoading] = useState(false);
  const [sendTargetType, setSendTargetType] = useState('student'); 
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [fullScreenRosterGroup, setFullScreenRosterGroup] = useState(null);
  const [sendStudentSearch, setSendStudentSearch] = useState(''); 
  const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false); 
  const [directTrophyAmount, setDirectTrophyAmount] = useState(1);
  const [isReconcilingAllClasses, setIsReconcilingAllClasses] = useState(false);
  const [wholeAppMaxAvailable, setWholeAppMaxAvailable] = useState(null); // sum of each class's own max-available

  // When no specific class is chosen, "Max Available" for the whole app must be
  // the SUM of each class's own max-available (floor(classLessons/5) per class)
  // — NOT floor(totalLessonsAcrossAllClasses/5) or a manually-typed number.
  // Flooring per-class first and then summing always gives a number <= flooring
  // the grand total first (each class's remainder gets thrown away separately
  // instead of combined), so using the grand-total floor — or an independently
  // typed "Max Trophies Available" — reliably overstates what the per-class
  // trophy math actually adds up to. This keeps the whole-app number and the
  // sum of individual class numbers always in agreement.
  useEffect(() => {
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
    if (!lesson) { setWholeAppMaxAvailable(null); return; }
    if (lesson.link === 'abhidhamma://' && !sendAbhidhammaClassId) {
      (async () => {
        const classes = await loadAbhidhammaClasses();
        setWholeAppMaxAvailable((classes || []).reduce((total, c) => total + computeClassTrophyMax(c.lessonCount), 0));
      })();
    } else if (lesson.link === 'smartstudy://' && !sendSmartStudyClassId) {
      (async () => {
        const classes = await loadSmartStudyClassList();
        setWholeAppMaxAvailable((classes || []).reduce((total, c) => total + computeClassTrophyMax(c.lessonCount), 0));
      })();
    } else if (lesson.link === 'dhammaschool://' && !sendDhammaschoolClassId) {
      (async () => {
        const classes = await loadDhammaschoolClasses();
        // Dhammaschool's rate is 2 trophies per lesson, not round(lessons/5).
        setWholeAppMaxAvailable((classes || []).reduce((total, c) => total + c.lessonCount * 2, 0));
      })();
    } else {
      setWholeAppMaxAvailable(null);
    }
  }, [selectedBankLessonId, sendAbhidhammaClassId, sendSmartStudyClassId, sendDhammaschoolClassId]);

  const [lastTrophyAward, setLastTrophyAward] = useState(null);
  const undoTimerRef = useRef(null);
  
  const [newGroupName, setNewGroupName] = useState('');
  
  const [scheduleStudentType, setScheduleStudentType] = useState('online');
  const [scheduleSelectedGroupId, setScheduleSelectedGroupId] = useState('');
  const [scheduleSelectedStudentUid, setScheduleSelectedStudentUid] = useState('');
  const [scheduleStudentSearch, setScheduleStudentSearch] = useState(''); 
  const [isScheduleDropdownOpen, setIsScheduleDropdownOpen] = useState(false); 
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualDate, setManualDate] = useState(toLocalDateString(new Date()));
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('10:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurEndDate, setRecurEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3); 
    return toLocalDateString(d);
  });

  const [showDeleteModal, setShowDeleteModal] = useState({ isOpen: false, id: null, title: '', type: '' });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [editingEntry, setEditingEntry] = useState(null); 
  const [showTrophyResetPrompt, setShowTrophyResetPrompt] = useState(false);
  const [showStarModal, setShowStarModal] = useState(false);
  const [greetingToast, setGreetingToast] = useState(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', confirmColor: 'bg-indigo-600 hover:bg-indigo-700'
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileContent, setImportFileContent] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const importFileRef = useRef(null); 
  
  const prevSessionsRef = useRef([]); 
  const hasAutoSelectedSendStudentRef = useRef(false);
  const hasAutoSelectedScheduleStudentRef = useRef(false);
  const hasAutoSelectedBankLessonRef = useRef(false);
  const hasAutoSelectedGroupRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(teacherConfigDoc, (docSnap) => {
      if (docSnap.exists()) setTeacherConfigData(docSnap.data());
    });
    return () => unsubscribe();
  }, []);

  // Same 🔔 the student side has, showing everyone's trophy announcements
  // from the past week -- lets the teacher glance back at what was awarded
  // without digging through each student's page. "Seen" state lives on the
  // teacher's own config doc (there's no per-student profile to hang it on
  // here), same arrayUnion pattern as the student side.
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
  useEffect(() => {
    if (!announcements) return;
    const seenIds = teacherConfigData?.seenAnnouncements || [];
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const recent = announcements
      .filter(a => {
        const ms = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : nowMs);
        return (nowMs - ms) < ONE_WEEK_MS;
      })
      .sort((a, b) => {
        const aMs = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const bMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return bMs - aMs;
      })
      .map(a => ({ ...a, _unseen: !seenIds.includes(a.id) }));
    setVisibleAnnouncements(recent);
  }, [announcements, teacherConfigData]);
  const unreadAnnouncementCount = visibleAnnouncements.filter(a => a._unseen).length;
  const dismissAnnouncement = async (id) => {
    try { await setDoc(teacherConfigDoc, { seenAnnouncements: arrayUnion(id) }, { merge: true }); }
    catch (error) { console.error("Error dismissing announcement:", error); }
  };
  const dismissAllAnnouncements = async () => {
    const newIds = visibleAnnouncements.map(a => a.id);
    if (newIds.length === 0) return;
    try { await setDoc(teacherConfigDoc, { seenAnnouncements: arrayUnion(...newIds) }, { merge: true }); }
    catch (error) { console.error("Error dismissing all announcements:", error); }
  };

  useEffect(() => {
    const q = query(studentsCollection);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name)); 
      setStudents(studentList);
      
      const firstActiveStudent = studentList.find(s => s.isActive === true);
      
      if (!hasAutoSelectedSendStudentRef.current && firstActiveStudent) {
        setSelectedStudentUid(firstActiveStudent.id);
        setSendStudentSearch(firstActiveStudent.name); 
        hasAutoSelectedSendStudentRef.current = true;
      }
      if (!hasAutoSelectedScheduleStudentRef.current && firstActiveStudent) {
        setScheduleSelectedStudentUid(firstActiveStudent.id);
        setScheduleStudentSearch(firstActiveStudent.name); 
        hasAutoSelectedScheduleStudentRef.current = true;
      }
    });
    return () => unsubscribe();
  }, [user.uid]);
  
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(lessonBankCollection, where("teacherUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bankList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.title.localeCompare(b.title)); 
      setLessonBank(bankList);

      // BUG (found while chasing why "Smart Study Lesson" kept snapping back
      // to a different lesson the instant it was picked): this effect's
      // dependency array is only [user.uid], so this onSnapshot callback is
      // never recreated -- it permanently closes over `selectedBankLessonId`
      // as it was at mount time (''). The old `if (!selectedBankLessonId...)`
      // check therefore evaluated true on EVERY single snapshot forever, not
      // just the first one, so any time the lesson bank changed for any
      // reason (including the weekly auto-refresh effect right below) this
      // silently reset the teacher's actual selection back to bankList[0]
      // (alphabetically first -- which a title with a leading space, like
      // " Heavenly World or Golden cage", reliably wins). A ref survives
      // across renders without needing to be a dependency, so it actually
      // only fires once, matching the same working pattern already used for
      // hasAutoSelectedSendStudentRef above.
      if (!hasAutoSelectedBankLessonRef.current && bankList.length > 0) {
        setSelectedBankLessonId(bankList[0].id);
        hasAutoSelectedBankLessonRef.current = true;
      }
    }, (error) => {
      console.error("Error fetching lesson bank: ", error);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // The videos inside 🎥 Watch & Learn (see WatchAndLearnApp.jsx) live in
  // Firestore, not a static list like Reading Myanmar/Speaking Myanmar's
  // parts -- fetched here so Send Action can offer a "choose a Video"
  // picker for the one Lesson Bank entry that now covers all of them.
  useEffect(() => {
    const q = query(collection(db, `${publicDataPath}/watchAndLearnVideos`), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWatchLearnVideos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Lessons keep getting added to SmartStudy/Abhidhamma, so a whole-app
  // Lesson Bank entry's "Total Number" and "Max Trophies Available" go stale
  // over time. This silently refreshes both — from live class data, using the
  // same round-based trophy formula everywhere — for any SmartStudy/Abhidhamma
  // entry that hasn't been auto-refreshed in the last 7 days. The teacher can
  // still open the app picker manually any time for an on-demand refresh.
  useEffect(() => {
    if (!lessonBank || lessonBank.length === 0) return;
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const staleEntries = lessonBank.filter(l => {
      const isWholeAppEntry = l.link === 'smartstudy://' || l.link === 'abhidhamma://';
      if (!isWholeAppEntry) return false;
      const lastRefreshed = l.lastAutoRefreshedAt?.toMillis ? l.lastAutoRefreshedAt.toMillis() : 0;
      return (now - lastRefreshed) > ONE_WEEK_MS;
    });
    if (staleEntries.length === 0) return;

    (async () => {
      for (const entry of staleEntries) {
        try {
          const classes = entry.link === 'smartstudy://'
            ? await fetchFreshSmartStudyClasses()
            : await fetchFreshAbhidhammaClasses();
          const totalLessons = (classes || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0);
          const totalTrophies = (classes || []).reduce((sum, c) => sum + computeClassTrophyMax(c.lessonCount), 0);
          await updateDoc(doc(db, `${publicDataPath}/lessonBank`, entry.id), {
            unitCount: totalLessons,
            trophyLimit: totalTrophies,
            lastAutoRefreshedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error(`Error auto-refreshing Lesson Bank entry "${entry.title}":`, e);
        }
      }
    })();
  }, [lessonBank]);
  
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(groupsCollection, where("teacherUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          // Parami runs large enough (shared/rented devices, students who
          // need to find their own ID quickly during class) that it needs
          // to be the first thing the teacher sees, not buried alphabetically.
          const aIsParami = (a.groupName || '').trim().toLowerCase() === 'parami';
          const bIsParami = (b.groupName || '').trim().toLowerCase() === 'parami';
          if (aIsParami !== bIsParami) return aIsParami ? -1 : 1;
          return a.groupName.localeCompare(b.groupName);
        });
      setGroups(groupList);

      // Bug fix (same class of bug as the Lesson Bank one): this effect
      // only depends on [user.uid], so this callback permanently closes
      // over `selectedGroupId` as it was at mount time -- the old
      // `if (!selectedGroupId...)` check evaluated true on every snapshot
      // forever, not just the first, silently resetting the teacher's
      // actual group selection back to groupList[0] any time the groups
      // list changed for any reason. A ref survives across renders without
      // needing to be a dependency, so it actually only fires once.
      if (!hasAutoSelectedGroupRef.current && groupList.length > 0) {
        setSelectedGroupId(groupList[0].id);
        hasAutoSelectedGroupRef.current = true;
      }
    }, (error) => {
      console.error("Error fetching groups: ", error);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Live "student greeted you" toast — students say Mangalabar when they
  // enter their dashboard; this only reacts to greetings added AFTER the
  // listener attaches (skips the initial snapshot) so opening the teacher
  // dashboard doesn't replay every greeting sent since forever.
  useEffect(() => {
    if (!user?.uid) return;
    let hasLoadedInitial = false;
    // Not scoped by teacherUid — this app's students/lessons collections
    // aren't teacher-scoped either (single-teacher deployment), so greetings
    // follow the same pattern.
    const unsubscribe = onSnapshot(greetingsCollection, (snapshot) => {
      if (!hasLoadedInitial) {
        hasLoadedInitial = true;
        return;
      }
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setGreetingToast({ studentName: data.studentName || 'A student' });
          setTimeout(() => setGreetingToast(null), 5000);
        }
      });
    }, (error) => {
      console.error("Error listening for greetings: ", error);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const q = query(sessionsCollection); 
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionList);
      
      const prevCompleted = prevSessionsRef.current.filter(s => s.endTime).length;
      const currentCompleted = sessionList.filter(s => s.endTime).length;

      if (currentCompleted > prevCompleted && prevSessionsRef.current.length > 0) {
        playSound(3); 
      }
      prevSessionsRef.current = sessionList;
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(teacherScheduleCollection, where("teacherUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate());
      setTeacherSchedule(scheduleList);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (editingLessonId) {
      const lesson = lessonBank.find(l => l.id === editingLessonId);
      if (lesson) {
        setNewBankLessonTitle(lesson.title);
        setNewBankLessonLink(lesson.link);
        setNewBankLessonDetails(lesson.details || ''); 
        setNewBankLessonTrophyLimit(lesson.trophyLimit || 0);
        setNewBankLessonUnitLabel(lesson.unitLabel || 'Chapter');
        setNewBankLessonUnitCount(lesson.unitCount || 0);
      }
    } else {
      setNewBankLessonTitle('');
      setNewBankLessonLink('');
      setNewBankLessonDetails(''); 
      setNewBankLessonTrophyLimit(0);
      setNewBankLessonUnitLabel('Chapter');
      setNewBankLessonUnitCount(0);
    }
  }, [editingLessonId, lessonBank]);

  // --- Smart Study app picker (reads directly from Firestore; only loads
  // the class ID list, and only when the teacher opens the picker, so this
  // never loads all Smart Study lesson content up front). ---
  // Fetch this student's SmartStudy completion counts whenever the
  // student/lesson/class selection changes in Send Action.
  useEffect(() => {
    setSsStudentClassCount(null);
    setSsStudentTotalCount(null);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
    if (!lesson?.link?.startsWith('smartstudy://')) return;
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    let isMounted = true;
    (async () => {
      try {
        // Enumerate every class this student is actually linked to, and the
        // exact alias name used in each, straight from classRoster's
        // `tutoringStudentUid` link -- this is the definitive source (every
        // roster doc records which tutoring student it belongs to and what
        // name they registered under in Smart Study for that class), rather
        // than guessing from `smartStudyNames`, which can be missing an old
        // alias entirely. Guessing from a possibly-incomplete name list is
        // exactly what made this total visibly jump (e.g. 21 then 61) as
        // more names got discovered across re-renders.
        const rosterSnap = await getDocs(query(
          collection(db, 'artifacts', appId, 'public', 'data', 'classRoster'),
          where('tutoringStudentUid', '==', student.id)
        ));
        const classAliasPairs = rosterSnap.docs
          .map(d => ({ classId: d.data().classId, name: d.data().studentName }))
          .filter(p => p.classId && p.name);
        // Belt-and-suspenders: also always check the student's current name
        // directly (no classId restriction) in case a class was never
        // linked via roster at all.
        const namesToTryDirectly = [...new Set([student.name, ...Object.values(student.smartStudyNames || {})].filter(Boolean))];

        const distinctClassLesson = new Set(); // all-class total
        const distinctForClass = new Set();    // per-class (selected class)
        const addResults = (snap, classIdHint) => {
          snap.docs.forEach(d => {
            const cId = classIdHint || d.data().classId;
            const lId = d.data().lessonId;
            if (cId && lId) {
              distinctClassLesson.add(`${cId}-${lId}`);
              if (sendSmartStudyClassId && cId === sendSmartStudyClassId) distinctForClass.add(lId);
            }
          });
        };
        for (const { classId, name } of classAliasPairs) {
          const snap = await getDocs(query(
            collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
            where('classId', '==', classId),
            where('studentName', '==', name)
          ));
          addResults(snap, classId);
        }
        for (const name of namesToTryDirectly) {
          const snap = await getDocs(query(
            collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
            where('studentName', '==', name)
          ));
          addResults(snap, null);
        }
        if (isMounted) {
          setSsStudentTotalCount(distinctClassLesson.size);
          if (sendSmartStudyClassId) setSsStudentClassCount(distinctForClass.size);
        }
      } catch (e) {
        console.error('Error fetching SmartStudy student completions:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedStudentUid, selectedBankLessonId, sendSmartStudyClassId, lessonBank, students]);

  // Dhammaschool app — student progress across the whole selected class
  useEffect(() => {
    setDhammaschoolStudentProgress(null);
    if (!sendDhammaschoolClassId || !selectedStudentUid) return;
    const student = students.find(s => s.id === selectedStudentUid);
    if (!student) return;
    (async () => {
      try {
        // Lessons belonging to this class (classId field on each lesson doc)
        const lessonsSnap = await getDocs(query(
          collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'),
          where('classId', '==', sendDhammaschoolClassId)
        ));
        const classLessonIds = lessonsSnap.docs.map(d => d.id);
        const totalLessons = classLessonIds.length;

        // Dhammaschool app uses its own anonymous Firebase session per device/browser
        // (separate from TutoringApp's studentUid), so completions must be matched
        // by studentName, not by a doc ID built from studentUid.
        const completionsSnap = await getDocs(query(
          collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lesson_completions'),
          where('studentName', '==', student.name)
        ));
        const completedLessonIds = new Set(completionsSnap.docs.map(d => d.data().lessonId).filter(lid => classLessonIds.includes(lid)));

        let totalScore = 0;
        for (const lid of classLessonIds) {
          try {
            const scoresSnap = await getDocs(query(
              collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'game_scores'),
              where('lessonId', '==', lid),
              where('studentName', '==', student.name)
            ));
            let best = 0;
            scoresSnap.docs.forEach(d => { best = Math.max(best, Number(d.data().score) || 0); });
            totalScore += best;
          } catch (e) {}
        }
        setDhammaschoolStudentProgress({ completedCount: completedLessonIds.size, totalLessons, score: totalScore });
      } catch (e) {
        console.error('Dhammaschool progress fetch:', e);
        setDhammaschoolStudentProgress({ completedCount: 0, totalLessons: 0, score: 0 });
      }
    })();
  }, [sendDhammaschoolClassId, selectedStudentUid]);

  // Abhidhamma student progress for Assign Lesson — handles old & new format
  useEffect(()=>{
    setAbhiStudentCount(null);setAbhiStudentScore(null);setAbhiTotalCount(null);
    if(!sendAbhidhammaClassId)return;
    // Load total lesson count for the class
    getDocs(collection(db,'artifacts','lesson-translator-app-v6','public','data','classes',sendAbhidhammaClassId,'lessons'))
      .then(snap=>setAbhiTotalCount(snap.size)).catch(()=>setAbhiTotalCount(0));
    if(!selectedStudentUid)return;
    const student=students.find(s=>s.id===selectedStudentUid);if(!student)return;
    const allNames=[...new Set([student.name,...(Object.values(student?.abhidhammaNames||{}))].filter(Boolean))];
    (async()=>{
      let pts=0;const done=new Set();
      const ABHI_COL=collection(db,'artifacts','lesson-translator-app-v6','public','data','global_scores');
      for(const nm of allNames){
        try{
          const [s1,s2]=await Promise.all([getDocs(query(ABHI_COL,where('name','==',nm))),getDocs(query(ABHI_COL,where('studentName','==',nm)))]);
          [...s1.docs,...s2.docs].forEach(d=>{const dt=d.data();if(dt.classId&&dt.classId!==sendAbhidhammaClassId)return;pts+=(Number(dt.score)||0);if(dt.lessonId)done.add(dt.lessonId);});
        }catch(e){}
      }
      setAbhiStudentScore(pts);setAbhiStudentCount(done.size);
    })();
  },[sendAbhidhammaClassId,selectedStudentUid]);

  const loadDhammaschoolClasses = async () => {
    if (dhammaschoolClasses !== null) return dhammaschoolClasses;
    setDhammaschoolLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'));
      const counts = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.isPublic) return; // only count lessons the teacher made public
        const cid = (data.classId && data.classId.trim()) ? data.classId.trim() : 'GENERAL';
        counts[cid] = (counts[cid] || 0) + 1;
      });
      const list = Object.entries(counts)
        .map(([classId, lessonCount]) => ({ classId, lessonCount }))
        .sort((a, b) => a.classId.localeCompare(b.classId));
      setDhammaschoolClasses(list);
      setDhammaschoolLoading(false);
      return list;
    } catch (err) {
      console.error('Error loading Dhammaschool classes:', err);
      setDhammaschoolClasses([]);
      setDhammaschoolLoading(false);
      return [];
    }
  };

  const loadAbhidhammaClasses = async () => {
    if (abhidhammaClasses !== null) return abhidhammaClasses;
    setAbhidhammaLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes'));
      const list = await Promise.all(snap.docs.map(async d => {
        let lessonCount = 0;
        try {
          const lessonsSnap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes', d.id, 'lessons'));
          lessonCount = lessonsSnap.size;
        } catch (e) {}
        return { classId: d.id, displayName: d.data().displayName || d.id, lessonCount };
      }));
      list.sort((a, b) => a.classId.localeCompare(b.classId));
      setAbhidhammaClasses(list);
      setAbhidhammaLoading(false);
      return list;
    } catch (err) {
      console.error('Error loading Abhidhamma classes:', err);
      setAbhidhammaClasses([]);
      setAbhidhammaLoading(false);
      return [];
    }
  };

  const loadSmartStudyClassList = async () => {
    if (smartStudyClasses !== null) return smartStudyClasses; // already loaded/cached
    setPickerLoading(true);
    try {
      const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
      const list = snap.docs.map(d => ({ classId: d.id, lessonCount: (d.data().lessons || []).length }));
      list.sort((a, b) => a.classId.localeCompare(b.classId));
      setSmartStudyClasses(list);
      setPickerLoading(false);
      return list;
    } catch (err) {
      console.error('Error loading Smart Study classes:', err);
      setSmartStudyClasses([]);
      setPickerLoading(false);
      return [];
    }
  };

  // Always-fresh variants (skip the state cache above) — used only by the
  // weekly Lesson Bank auto-refresh, so a stale in-memory cache from earlier
  // in the session can never cause it to "refresh" with old numbers.
  const fetchFreshAbhidhammaClasses = async () => {
    const snap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes'));
    return Promise.all(snap.docs.map(async d => {
      let lessonCount = 0;
      try {
        const lessonsSnap = await getDocs(collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'classes', d.id, 'lessons'));
        lessonCount = lessonsSnap.size;
      } catch (e) {}
      return { classId: d.id, lessonCount };
    }));
  };
  const fetchFreshSmartStudyClasses = async () => {
    const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
    return snap.docs.map(d => ({ classId: d.id, lessonCount: (d.data().lessons || []).length }));
  };

  const handleSaveLessonToBank = async (e) => {
    e.preventDefault();
    if (!newBankLessonTitle || !newBankLessonLink) return;
    
    const lessonData = {
      teacherUid: user.uid,
      title: newBankLessonTitle,
      link: newBankLessonLink,
      details: newBankLessonDetails, 
      trophyLimit: parseInt(newBankLessonTrophyLimit) || 0,
      unitLabel: newBankLessonUnitLabel || 'Chapter',
      unitCount: parseInt(newBankLessonUnitCount) || 0
    };
    try {
      if (editingLessonId) {
        const lessonDoc = doc(db, `${publicDataPath}/lessonBank`, editingLessonId);
        try {
          await updateDoc(lessonDoc, lessonData);
        } catch (updateError) {
          // The lesson being edited was deleted (by this teacher or another
          // session) before the edit was saved -- re-create it instead of
          // silently losing the edit.
          await addDoc(lessonBankCollection, { ...lessonData, createdAt: serverTimestamp() });
        }
        setEditingLessonId(null);
      } else {
        await addDoc(lessonBankCollection, {
          ...lessonData,
          createdAt: serverTimestamp()
        });
      }
      setNewBankLessonTitle('');
      setNewBankLessonLink('');
      setNewBankLessonDetails('');
      setNewBankLessonTrophyLimit(0);
      setNewBankLessonUnitLabel('Chapter');
      setNewBankLessonUnitCount(0);
    } catch (error) {
      console.error("Error saving lesson to bank:", error);
    }
  };

  const handleSendLesson = async (e) => {
    e.preventDefault();
    const lessonToSend = lessonBank.find(l => l.id === selectedBankLessonId);
    // Use the class chosen right here in Assign Lesson (not anything baked into
    // the bank entry) to compute the correct lesson count / trophy target —
    // this is what lets one bank entry be sent to any class, with the right
    // numbers every time, for all three linked apps.
    const ssSelectedClass = (sendSmartStudyClassId && smartStudyClasses)
      ? (smartStudyClasses || []).find(c => c.classId === sendSmartStudyClassId)
      : null;
    const classLessonCountForSend = (() => {
      if (lessonToSend?.link === 'smartstudy://' && ssSelectedClass) return ssSelectedClass.lessonCount || 0;
      if (lessonToSend?.link === 'abhidhamma://' && sendAbhidhammaClassId && abhiTotalCount != null) return abhiTotalCount;
      if (lessonToSend?.link === 'dhammaschool://' && sendDhammaschoolClassId && dhammaschoolStudentProgress?.totalLessons != null) return dhammaschoolStudentProgress.totalLessons;
      return null;
    })();
    const effectiveLessonUnitCount = classLessonCountForSend != null ? classLessonCountForSend : (lessonToSend?.unitCount || 0);
    // Dhammaschool's real trophy rate is 2 per lesson (confirmed by the
    // teacher), not the round(lessons/5) formula Smart Study/Abhidhamma use.
    const effectiveLessonTrophyLimit = classLessonCountForSend != null
      ? (lessonToSend?.link === 'dhammaschool://' ? classLessonCountForSend * 2 : computeClassTrophyMax(classLessonCountForSend))
      : (lessonToSend?.trophyLimit || 0);
    // For lessons stored without a classId, substitute the one chosen here in
    // the Send Action class picker.
    const effectiveLessonLink = (() => {
      if (!lessonToSend?.link) return '';
      if (lessonToSend.link === 'smartstudy://' && sendSmartStudyClassId) return `smartstudy://${sendSmartStudyClassId}`;
      if (lessonToSend.link === 'abhidhamma://' && sendAbhidhammaClassId) return `abhidhamma://${sendAbhidhammaClassId}`;
      if (lessonToSend.link === 'dhammaschool://' && sendDhammaschoolClassId) return `dhammaschool://${sendDhammaschoolClassId}`;
      if (GROUP_PARTS_BY_SCHEME[lessonToSend.link] && sendGroupPartKey) return `${lessonToSend.link}${sendGroupPartKey}`;
      if (lessonToSend.link === 'watchandlearn://' && sendWatchLearnVideoKey) return `watchandlearn://${sendWatchLearnVideoKey}`;
      return lessonToSend.link;
    })();

    if (!lessonToSend) return;

    // Only replaces a PREVIOUS assignment of the exact same class/link, not
    // every past lesson with this title -- Smart Study/Abhidhamma/
    // Dhammaschool assign one class at a time under the same bank title, so
    // matching on title alone would delete (and hide from Available
    // Lessons) a still-relevant earlier class the moment a different one is
    // sent. The student's per-class trophy/completed progress lives on
    // their own profile doc either way and was never affected by this.
    const deleteExistingLessons = async (sUid, title, link) => {
      const q = query(lessonsCollection, where("studentUid", "==", sUid), where("title", "==", title), where("link", "==", link));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    };

    if (sendTargetType === 'group') {
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group || group.studentUids.length === 0) return;
      
      const targetStudents = students.filter(s => group.studentUids.includes(s.id));
      const studentNames = targetStudents.map(s => s.name).join(', ');

      const executeSend = async () => {
        try {
          for (const studentUid of group.studentUids) {
            await deleteExistingLessons(studentUid, lessonToSend.title, effectiveLessonLink);
            await addDoc(lessonsCollection, {
              studentUid: studentUid,
              teacherUid: user.uid,
              title: lessonToSend.title,
              link: effectiveLessonLink,
              details: lessonToSend.details,
              trophyLimit: effectiveLessonTrophyLimit,
              unitLabel: lessonToSend.unitLabel || 'Chapter',
              unitCount: effectiveLessonUnitCount,
              status: 'pending',
              sentAt: serverTimestamp()
            });
          }
          playSound(2);
        } catch (error) {
          console.error("Error sending lesson to group:", error);
        }
      };
      
      setShowConfirmModal({
        isOpen: true,
        title: 'Send to Group',
        message: `Are you sure you want to assign "${lessonToSend.title}" to "${group.groupName}" (${targetStudents.length} students)?\n(${studentNames})\n\nNote: If they already have this lesson, the old one will be replaced.`,
        onConfirm: () => {
          executeSend();
          setShowConfirmModal({ isOpen: false });
        },
        confirmText: 'Send',
        confirmColor: 'bg-indigo-500 hover:bg-indigo-600'
      });
      
    } else {
      const student = students.find(s => s.id === selectedStudentUid);
      if (!selectedStudentUid || !student) return;
      
      const executeSend = async () => {
        try {
          await deleteExistingLessons(selectedStudentUid, lessonToSend.title, effectiveLessonLink);
          await addDoc(lessonsCollection, {
            studentUid: selectedStudentUid,
            teacherUid: user.uid,
            title: lessonToSend.title,
            link: effectiveLessonLink,
            details: lessonToSend.details,
            trophyLimit: effectiveLessonTrophyLimit,
            unitLabel: lessonToSend.unitLabel || 'Chapter',
            unitCount: effectiveLessonUnitCount,
            status: 'pending',
            sentAt: serverTimestamp()
          });
          playSound(2);
        } catch (error) {
          console.error("Error sending lesson:", error);
        }
      };
      
      setShowConfirmModal({
        isOpen: true,
        title: 'Assign Lesson',
        message: `Are you sure you want to assign "${lessonToSend.title}" to ${student.name}?\n\nNote: If they already have this lesson, the old one will be replaced.`,
        onConfirm: () => {
          executeSend();
          setShowConfirmModal({ isOpen: false });
        },
        confirmText: 'Send',
        confirmColor: 'bg-indigo-500 hover:bg-indigo-600'
      });
    }
  };

  // Substitutes the class chosen in Send Action into a bare bank-entry link
  // (e.g. 'abhidhamma://' -> 'abhidhamma://BEING_GOOD_AND_BEING_KIND'), matching
  // what handleSendLesson actually sends to the student.
  const getEffectiveLinkForSend = (lesson) => {
    if (!lesson?.link) return '';
    if (lesson.link === 'smartstudy://' && sendSmartStudyClassId) return `smartstudy://${sendSmartStudyClassId}`;
    if (lesson.link === 'abhidhamma://' && sendAbhidhammaClassId) return `abhidhamma://${sendAbhidhammaClassId}`;
    if (lesson.link === 'dhammaschool://' && sendDhammaschoolClassId) return `dhammaschool://${sendDhammaschoolClassId}`;
    if (GROUP_PARTS_BY_SCHEME[lesson.link] && sendGroupPartKey) return `${lesson.link}${sendGroupPartKey}`;
    if (lesson.link === 'watchandlearn://' && sendWatchLearnVideoKey) return `watchandlearn://${sendWatchLearnVideoKey}`;
    return lesson.link;
  };

  // Single source of truth for "how many trophies can this lesson give, and
  // under what key are they tracked" — used identically by the Trophy Status
  // display and the actual award function, so they can never disagree.
  const getClassSpecificTrophyInfo = (lesson) => {
    if (!lesson) return { maxAvailable: 0, unitCount: 0, lessonKey: '', classId: null };
    const effectiveLink = getEffectiveLinkForSend(lesson);
    const classId = extractClassIdFromLink(effectiveLink);

    let lessonCount = null;
    if (lesson.link === 'smartstudy://' && sendSmartStudyClassId && smartStudyClasses) {
      const c = (smartStudyClasses || []).find(cl => cl.classId === sendSmartStudyClassId);
      lessonCount = c ? c.lessonCount : null;
    } else if (lesson.link?.startsWith('abhidhamma://') && sendAbhidhammaClassId && abhiTotalCount != null) {
      lessonCount = abhiTotalCount;
    } else if (lesson.link?.startsWith('dhammaschool://') && sendDhammaschoolClassId && dhammaschoolStudentProgress?.totalLessons != null) {
      lessonCount = dhammaschoolStudentProgress.totalLessons;
    }

    const isLinkedApp = lesson.link === 'smartstudy://' || lesson.link?.startsWith('abhidhamma://') || lesson.link?.startsWith('dhammaschool://');
    const groupPartMax = GROUP_APP_PART_MAX[lesson.link]?.[classId];
    // Dhammaschool's real trophy rate is 2 per lesson (confirmed by the
    // teacher -- a 40-lesson grade is worth 80), not the round(lessons/5)
    // formula Smart Study/Abhidhamma use.
    const maxAvailable = lessonCount != null
      ? (lesson.link?.startsWith('dhammaschool://') ? lessonCount * 2 : computeClassTrophyMax(lessonCount))
      : groupPartMax != null
        ? groupPartMax
        : (isLinkedApp && wholeAppMaxAvailable != null ? wholeAppMaxAvailable : (lesson.trophyLimit || 0));
    const unitCount = lessonCount != null ? lessonCount : (lesson.unitCount || 0);
    const lessonKey = computeLessonKey(lesson.title, effectiveLink);
    return { maxAvailable, unitCount, lessonKey, classId };
  };

  // One-click bulk reconciliation: for a student who has fully finished a
  // class (every lesson done, "all completed" in Abhidhamma), it's safe to
  // assume the teacher already gave that class's trophies in full — so this
  // sets Previously Earned = Max Available for every FULLY-completed class in
  // one pass, without touching classes that are only partially done (those
  // still need a manual look, since partial trophy history can't be
  // reconstructed automatically).
  const handleReconcileAllAbhidhammaClasses = async () => {
    const student = students.find(s => s.id === selectedStudentUid);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
    if (!student || !lesson) return;
    setIsReconcilingAllClasses(true);
    try {
      const classes = await loadAbhidhammaClasses();
      const allNames = [...new Set([student.name, ...(Object.values(student?.abhidhammaNames || {}))].filter(Boolean))];
      const ABHI_COL = collection(db, 'artifacts', 'lesson-translator-app-v6', 'public', 'data', 'global_scores');

      const updates = {};
      const confirmedClassIds = [];
      const skippedClassIds = [];

      for (const c of (classes || [])) {
        const totalLessons = c.lessonCount || 0;
        if (totalLessons === 0) continue;

        const done = new Set();
        for (const nm of allNames) {
          try {
            const [s1, s2] = await Promise.all([
              getDocs(query(ABHI_COL, where('name', '==', nm))),
              getDocs(query(ABHI_COL, where('studentName', '==', nm)))
            ]);
            [...s1.docs, ...s2.docs].forEach(d => {
              const dt = d.data();
              if (dt.classId && dt.classId !== c.classId) return;
              if (dt.lessonId) done.add(dt.lessonId);
            });
          } catch (e) {}
        }

        if (done.size >= totalLessons) {
          const classMax = computeClassTrophyMax(totalLessons);
          const classKey = computeLessonKey(lesson.title, `abhidhamma://${c.classId}`);
          updates[`earnedTrophies.${classKey}`] = classMax;
          confirmedClassIds.push(c.classId);
        } else {
          skippedClassIds.push(c.classId);
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, `${publicDataPath}/students`, student.id), updates);
      }

      alert(
        `Confirmed trophies for ${confirmedClassIds.length} fully-completed class(es):\n${confirmedClassIds.join(', ') || '(none)'}\n\n` +
        `Skipped ${skippedClassIds.length} not-yet-fully-completed class(es) — check those manually:\n${skippedClassIds.join(', ') || '(none)'}`
      );
    } catch (err) {
      console.error('Error reconciling all classes:', err);
      alert('Error reconciling. Please try again.');
    }
    setIsReconcilingAllClasses(false);
  };

  const handleAwardDirectTrophies = async (e) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentUid);
    const lesson = lessonBank.find(l => l.id === selectedBankLessonId);

    if (!student || !lesson) return;

    const { maxAvailable, lessonKey } = getClassSpecificTrophyInfo(lesson);
    const previouslyEarned = student.earnedTrophies?.[lessonKey] || 0;
    const remaining = Math.max(0, maxAvailable - previouslyEarned);

    const amountToAward = parseInt(directTrophyAmount);

    if (isNaN(amountToAward) || amountToAward <= 0 || amountToAward > remaining) {
        alert("Invalid trophy amount.");
        return;
    }

    const executeAward = async () => {
        try {
            const studentDocRef = doc(db, `${publicDataPath}/students`, student.id);
            const newTotalEarned = previouslyEarned + amountToAward;
            const prevCompletedUnit = student.completedUnits?.[lessonKey] || 0;
            const unitCount = getClassSpecificTrophyInfo(lesson).unitCount;
            let newCompletedUnit = prevCompletedUnit;

            const updateData = {
                trophyCount: increment(amountToAward),
                justEarnedTrophy: true
            };
            updateData[`earnedTrophies.${lessonKey}`] = increment(amountToAward);

            if (unitCount > 0 && maxAvailable > 0) {
                newCompletedUnit = Math.min(unitCount, Math.ceil((newTotalEarned * unitCount) / maxAvailable));
                if (newCompletedUnit > prevCompletedUnit) {
                    updateData[`completedUnits.${lessonKey}`] = newCompletedUnit;
                }
            }

            await updateDoc(studentDocRef, updateData);

            const expires = new Date();
            expires.setDate(expires.getDate() + 1);
            const newTotal = (student.trophyCount || 0) + amountToAward;

            const announcementRef = await addDoc(announcementsCollection, {
                studentName: student.name,
                trophyCount: newTotal,
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expires),
                id: getUUID()
            });

            playSound(2); 
            alert(`Successfully awarded ${amountToAward} trophies to ${student.name}.`);
            setDirectTrophyAmount(1);

            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            setLastTrophyAward({
                studentId: student.id,
                studentName: student.name,
                amount: amountToAward,
                lessonKey: lessonKey,
                announcementId: announcementRef.id,
                prevCompletedUnit: prevCompletedUnit,
                unitChanged: newCompletedUnit > prevCompletedUnit
            });
            undoTimerRef.current = setTimeout(() => {
                setLastTrophyAward(null);
            }, 30000);
        } catch (err) {
            console.error("Error awarding direct trophies", err);
        }
    };

    setShowConfirmModal({
      isOpen: true,
      title: 'Award Trophies Directly',
      message: `Are you sure you want to directly award ${amountToAward} ${amountToAward > 1 ? 'trophies' : 'trophy'} to ${student.name} for the lesson "${lesson.title}"?`,
      onConfirm: () => {
        executeAward();
        setShowConfirmModal({ isOpen: false });
      },
      confirmText: 'Award',
      confirmColor: 'bg-yellow-500 hover:bg-yellow-600'
    });
  };
const handleUndoTrophyAward = async () => {
    if (!lastTrophyAward) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, lastTrophyAward.studentId);
      const updateData = {
        trophyCount: increment(-lastTrophyAward.amount)
      };
      updateData[`earnedTrophies.${lastTrophyAward.lessonKey}`] = increment(-lastTrophyAward.amount);
      if (lastTrophyAward.unitChanged) {
        updateData[`completedUnits.${lastTrophyAward.lessonKey}`] = lastTrophyAward.prevCompletedUnit;
      }
      await updateDoc(studentDocRef, updateData);

      if (lastTrophyAward.announcementId) {
        await deleteDoc(doc(db, `${publicDataPath}/announcements`, lastTrophyAward.announcementId));
      }

      alert(`Successfully undid the award of ${lastTrophyAward.amount} trophy(s) for ${lastTrophyAward.studentName}.`);
    } catch (e) {
      console.error("Error undoing trophy award:", e);
    }
    setLastTrophyAward(null);
  };

  const handleSendSubmit = (e) => {
    e.preventDefault();
    if (sendActionType === 'lesson') {
        handleSendLesson(e);
    } else {
        handleAwardDirectTrophies(e);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    
    let studentUid = null;
    let studentName = '';
    let groupMembers = null; // [{id, name}], only set for scheduleStudentType === 'group'

    if (scheduleStudentType === 'online') {
      if (!scheduleSelectedStudentUid) return;
      studentUid = scheduleSelectedStudentUid;
      studentName = students.find(s => s.id === studentUid)?.name || 'Unknown Student';
    } else if (scheduleStudentType === 'group') {
      if (!scheduleSelectedGroupId) return;
      const group = groups.find(g => g.id === scheduleSelectedGroupId);
      if (!group) return;
      // Create ONE normal individual entry per member (same shape as a
      // regular Online Student entry, tagged with a shared groupId) rather
      // than a special shared doc -- every existing per-student attendance/
      // session/dashboard query already works on a real studentUid, so
      // nothing else needs to know groups exist at all. Snapshot membership
      // now; it changing later shouldn't retroactively change who this
      // occurrence's entries belong to.
      groupMembers = group.studentUids
        .map(uid => students.find(s => s.id === uid))
        .filter(Boolean)
        .map(s => ({ id: s.id, name: s.name }));
      if (groupMembers.length === 0) return;
      studentName = group.groupName; // only used for the confirm dialog text below
    } else {
      if (!manualStudentName) return;
      studentUid = 'offline';
      studentName = manualStudentName;
    }

    if (!manualDate || !manualStartTime || !manualEndTime) return;

    const executeAdd = async () => {
      const [startHour, startMinute] = manualStartTime.split(':').map(Number);
      const [endHour, endMinute] = manualEndTime.split(':').map(Number);

      try {
        const [year, month, day] = manualDate.split('-').map(Number);
        const baseStartDate = new Date(year, month - 1, day, startHour, startMinute);

        const occurrenceDates = [];
        if (isRecurring) {
          if (!recurEndDate) return;
          const [endYear, endMonth, endDay] = recurEndDate.split('-').map(Number);
          const finalEntryDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59);
          let currentLoopDate = new Date(baseStartDate.getTime());
          while (currentLoopDate <= finalEntryDate) {
            occurrenceDates.push(new Date(currentLoopDate.getTime()));
            currentLoopDate.setDate(currentLoopDate.getDate() + 7);
          }
        } else {
          occurrenceDates.push(baseStartDate);
        }
        const recurrenceId = isRecurring ? getUUID() : null;

        let batch = writeBatch(db);
        let opCount = 0;
        const addToBatch = async (data) => {
          batch.set(doc(teacherScheduleCollection), data);
          opCount++;
          if (opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
        };

        for (const occDate of occurrenceDates) {
          const currentStartTime = new Date(occDate.getTime());
          currentStartTime.setHours(startHour, startMinute);
          const currentEndTime = new Date(occDate.getTime());
          currentEndTime.setHours(endHour, endMinute);

          if (groupMembers) {
            // Distinguishes this specific occurrence's entries from any
            // other occurrence of the same group (e.g. next week's class),
            // so schedule views can cluster "the same class session"
            // without accidentally merging different days together.
            const groupBatchKey = `${scheduleSelectedGroupId}_${currentStartTime.getTime()}`;
            for (const member of groupMembers) {
              await addToBatch({
                teacherUid: user.uid,
                studentUid: member.id,
                studentName: member.name,
                startTime: Timestamp.fromDate(currentStartTime),
                endTime: Timestamp.fromDate(currentEndTime),
                isRecurring: !!isRecurring,
                recurrenceId,
                overrideStatus: null,
                groupId: scheduleSelectedGroupId,
                groupBatchKey,
              });
            }
          } else {
            await addToBatch({
              teacherUid: user.uid,
              studentUid,
              studentName,
              startTime: Timestamp.fromDate(currentStartTime),
              endTime: Timestamp.fromDate(currentEndTime),
              isRecurring: !!isRecurring,
              recurrenceId,
              overrideStatus: null,
            });
          }
        }
        await batch.commit();
        setManualStudentName('');
        setScheduleSelectedGroupId('');
      } catch (error) {
        console.error("Error adding to schedule:", error);
      }
    };

    setShowConfirmModal({
      isOpen: true,
      title: 'Add Schedule Entry',
      message: groupMembers
        ? `Are you sure you want to add this schedule entry for the "${studentName}" group (${groupMembers.length} students)?`
        : `Are you sure you want to add this schedule entry for ${studentName}?`,
      onConfirm: () => {
        executeAdd();
        setShowConfirmModal({ isOpen: false });
      },
      confirmText: 'Add',
      confirmColor: 'bg-emerald-500 hover:bg-emerald-600'
    });
  };

const handleSendStarAnnouncement = async (studentUid, durationWeeks, message) => {
    const student = students.find(s => s.id === studentUid);
    if (!student) return;
    const expires = new Date();
    expires.setDate(expires.getDate() + (durationWeeks * 7));
    try {
      await addDoc(starAnnouncementsCollection, {
        studentUid: studentUid,
        studentName: student.name,
        message: message,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expires)
      });
      setShowStarModal(false);
    } catch (e) {
      console.error("Error sending star announcement:", e);
    }
  };
  const handleToggleStudentActive = async (studentId, currentStatus) => {
    const studentDoc = doc(db, `${publicDataPath}/students`, studentId);
    try {
      await updateDoc(studentDoc, {
        isActive: !currentStatus 
      });
    } catch (error) {
      console.error("Error changing student status:", error);
    }
  };

  const handleApproveNameChange = async (studentId, newName) => {
    if (!newName || !newName.trim()) return;
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, studentId), {
        name: newName.trim(),
        pendingName: null
      });
    } catch (error) {
      console.error("Error approving name change:", error);
    }
  };

  const handleRejectNameChange = async (studentId) => {
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, studentId), { pendingName: null });
    } catch (error) {
      console.error("Error rejecting name change:", error);
    }
  };

  const handleApproveStudent = async (studentId) => {
    const studentDocRef = doc(db, `${publicDataPath}/students`, studentId); 
    try {
      const studentDoc = await getDoc(studentDocRef);
      const studentData = studentDoc.data();
      
      const dataToUpdate = { isActive: true };
      if (studentData.dailySubmissionCount === undefined) dataToUpdate.dailySubmissionCount = 0;
      if (studentData.lastSubmissionDate === undefined) dataToUpdate.lastSubmissionDate = null;
      if (studentData.completedCount === undefined) dataToUpdate.completedCount = 0;
      if (studentData.trophyCount === undefined) dataToUpdate.trophyCount = 0;
      if (studentData.earnedTrophies === undefined) dataToUpdate.earnedTrophies = {};
      
      await updateDoc(studentDocRef, dataToUpdate);

      // The "Parami" group runs large enough that the teacher can't manually
      // re-send every lesson to each new joiner during class — so accepting
      // here also auto-forwards whatever was sent to the group in the last
      // 24 hours, instead of leaving the new student with no lesson at all.
      const paramiGroup = groups.find(g => (g.groupName || '').trim().toLowerCase() === 'parami');
      if (paramiGroup) {
        setShowConfirmModal({
          isOpen: true,
          title: 'Add to Parami Group?',
          message: `Add ${studentData?.name || 'this student'} to the "Parami" group?\n\nIf a lesson was sent to Parami in the last 24 hours, it will be sent to them too.`,
          onConfirm: async () => {
            setShowConfirmModal({ isOpen: false });
            try {
              await handleToggleStudentInGroup(paramiGroup.id, studentId, true);

              const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
              const memberUids = (paramiGroup.studentUids || []).filter(uid => uid !== studentId);
              let recentLesson = null;
              for (let i = 0; i < memberUids.length; i += 30) {
                const chunk = memberUids.slice(i, i + 30);
                if (chunk.length === 0) continue;
                const q = query(lessonsCollection, where('studentUid', 'in', chunk), where('sentAt', '>=', cutoff));
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                  const lessonData = d.data();
                  if (!lessonData.sentAt) return;
                  if (!recentLesson || lessonData.sentAt.toMillis() > recentLesson.sentAt.toMillis()) {
                    recentLesson = lessonData;
                  }
                });
              }

              if (recentLesson) {
                await addDoc(lessonsCollection, {
                  studentUid: studentId,
                  teacherUid: recentLesson.teacherUid,
                  title: recentLesson.title,
                  link: recentLesson.link,
                  details: recentLesson.details,
                  trophyLimit: recentLesson.trophyLimit,
                  unitLabel: recentLesson.unitLabel || 'Chapter',
                  unitCount: recentLesson.unitCount,
                  status: 'pending',
                  sentAt: serverTimestamp()
                });
              }
            } catch (e) {
              console.error('Error adding approved student to Parami group:', e);
            }
          },
          confirmText: 'Add',
          confirmColor: 'bg-indigo-500 hover:bg-indigo-600'
        });
      }
    } catch (error) {
      console.error("Error approving student:", error);
    }
  };

  const handleApproveTrophy = async (studentId, studentName, amount = 1, lessonTitle = null, sessionId = null, lessonLink = null) => {
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentId);
      
      const updateData = {
        trophyRequested: false,
        trophyCount: increment(amount),
        justEarnedTrophy: true,
        requestedTrophyAmount: 0,
        requestedTrophyLessonId: null,
        requestedTrophyLessonTitle: null,
        requestedTrophyLessonLink: null,
        requestedTrophySessionId: null
      };
      
      if (lessonTitle) {
        updateData[`earnedTrophies.${computeLessonKey(lessonTitle, lessonLink)}`] = increment(amount);
      }
      
      await updateDoc(studentDocRef, updateData);
      
      if (sessionId) {
        const sessionRef = doc(db, `${publicDataPath}/studySessions`, sessionId);
        try {
          await updateDoc(sessionRef, { awardedTrophies: increment(amount) });
        } catch(e) {
          console.error("Error updating session trophies:", e);
        }
      }

      const expires = new Date();
      expires.setDate(expires.getDate() + 1); 
      const studentDoc = await getDoc(studentDocRef);
      const newTotal = studentDoc.data().trophyCount || 1;
      
      await addDoc(announcementsCollection, { 
        studentName: studentName, trophyCount: newTotal, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(expires), id: getUUID() 
      });
      
    } catch (error) {
      console.error("Error approving trophy:", error);
    }
  };

  const handleRejectTrophy = async (studentId, sessionId, lessonTitle, lessonLink = null) => {
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentId);
      const updateData = {
        trophyRequested: false,
        requestedTrophyAmount: 0,
        requestedTrophyLessonId: null,
        requestedTrophyLessonTitle: null,
        requestedTrophyLessonLink: null,
        requestedTrophySessionId: null
      };

      if (sessionId && lessonTitle) {
        const sessionDoc = await getDoc(doc(db, `${publicDataPath}/studySessions`, sessionId));
        if (sessionDoc.exists()) {
          const previousCompletedUnit = sessionDoc.data().previousCompletedUnit || 0;
          updateData[`completedUnits.${computeLessonKey(lessonTitle, lessonLink)}`] = previousCompletedUnit;
        }
      }

      await updateDoc(studentDocRef, updateData);
    } catch (error) {
      console.error("Error rejecting trophy:", error);
    }
  };

  const handleResetAllTrophies = async () => {
    try {
        const batch = writeBatch(db);
        students.forEach(student => {
            const sRef = doc(db, `${publicDataPath}/students`, student.id);
            batch.update(sRef, {
                trophyCount: 0,
                earnedTrophies: {},
                trophyRequested: false,
                requestedTrophyAmount: 0
            });
        });
        const configRef = doc(db, `${publicDataPath}/config`, 'teacher');
        batch.set(configRef, { hasDeclinedTrophyReset: true }, { merge: true });
        
        await batch.commit();
        setShowTrophyResetPrompt(false);
        alert("All legacy trophies have been successfully reset.");
    } catch(e) {
        console.error("Error resetting trophies", e);
    }
  };

  const handleDeclineTrophyReset = async () => {
    try {
        const configRef = doc(db, `${publicDataPath}/config`, 'teacher');
        await setDoc(configRef, { hasDeclinedTrophyReset: true }, { merge: true });
        setShowTrophyResetPrompt(false);
    } catch(e) {
        console.error("Error updating config", e);
    }
  };
  
  const openDeleteModal = (id, title, type) => {
    let message = `Are you sure you want to delete "${title}"? This cannot be undone.`;
    if (type === 'student') {
      message = `Are you sure you want to permanently delete the student "${title}"? This action cannot be undone.`;
    }
    
    setShowDeleteModal({ 
      isOpen: true, id: id, title: title, type: type, message: message
    });
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal({ isOpen: false, id: null, title: '', type: '' });
  };
  
  const handleDeleteItem = async () => {
    const { id, type } = showDeleteModal;
    if (!id || !type) return;
    
    let docRef;
    if (type === 'lessonBank') docRef = doc(db, `${publicDataPath}/lessonBank`, id);
    else if (type === 'teacherSchedule') docRef = doc(db, `${publicDataPath}/teacherSchedule`, id);
    else if (type === 'student') docRef = doc(db, `${publicDataPath}/students`, id);
    else if (type === 'group') docRef = doc(db, `${publicDataPath}/studentGroups`, id);
    else return;
    
    try {
      await deleteDoc(docRef);
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };
  const handleLessonDragStart = (lesson) => {
    draggedLessonIdRef.current = lesson.id;
    setMergeSourceId(lesson.id);
    setMergeSourceTitle(lesson.title);
  };

  const handleLessonDragEnd = () => {
    draggedLessonIdRef.current = null;
    if (!mergeTargetId) {
      setMergeSourceId(null);
      setMergeSourceTitle('');
    }
  };

  const handleLessonDrop = (targetLesson) => {
    const sourceId = draggedLessonIdRef.current;
    if (!sourceId || sourceId === targetLesson.id) return;
    const sourceLesson = lessonBank.find(l => l.id === sourceId);
    if (sourceLesson && sourceLesson.link === targetLesson.link) {
      setMergeTargetId(targetLesson.id);
      setMergeTargetTitle(targetLesson.title);
      setMergeNewTitle(`${sourceLesson.title} / ${targetLesson.title}`);
    } else {
      alert("These two lessons have different links and cannot be merged.");
      setMergeSourceId(null);
      setMergeSourceTitle('');
    }
  };
  
  const cancelMerge = () => {
    setMergeSourceId(null);
    setMergeTargetId(null);
    setMergeSourceTitle('');
    setMergeTargetTitle('');
    setMergeNewTitle('');
  };
  
  const executeMergeLessons = async () => {
    if (!mergeSourceId || !mergeTargetId || !mergeNewTitle.trim()) return;
    const lessonA = lessonBank.find(l => l.id === mergeSourceId);
    const lessonB = lessonBank.find(l => l.id === mergeTargetId);
    if (!lessonA || !lessonB) return;
    
    setIsMerging(true);
    try {
      const newTitle = mergeNewTitle.trim();
      const keyA = sanitizeKey(lessonA.title);
      const keyB = sanitizeKey(lessonB.title);
      const newKey = sanitizeKey(newTitle);
      const newTrophyLimit = (parseInt(lessonA.trophyLimit) || 0) + (parseInt(lessonB.trophyLimit) || 0);
      const newUnitCount = (parseInt(lessonA.unitCount) || 0) + (parseInt(lessonB.unitCount) || 0);
      
      const studentsSnap = await getDocs(studentsCollection);
      const batch = writeBatch(db);
      
      studentsSnap.docs.forEach(studentDoc => {
        const data = studentDoc.data();
        const earned = data.earnedTrophies || {};
        const completed = data.completedUnits || {};
        
        const earnedA = earned[keyA] || 0;
        const earnedB = earned[keyB] || 0;
        const completedA = completed[keyA] || 0;
        const completedB = completed[keyB] || 0;
        
        if (earnedA === 0 && earnedB === 0 && completedA === 0 && completedB === 0) return; 
        
        const update = {};
        if (keyA !== newKey) update[`earnedTrophies.${keyA}`] = deleteField();
        if (keyB !== newKey) update[`earnedTrophies.${keyB}`] = deleteField();
        update[`earnedTrophies.${newKey}`] = earnedA + earnedB;
        
        if (keyA !== newKey) update[`completedUnits.${keyA}`] = deleteField();
        if (keyB !== newKey) update[`completedUnits.${keyB}`] = deleteField();
        update[`completedUnits.${newKey}`] = completedA + completedB;
        
        batch.update(studentDoc.ref, update);
      });
      
      const lessonADocRef = doc(db, `${publicDataPath}/lessonBank`, lessonA.id);
      batch.update(lessonADocRef, {
        title: newTitle,
        trophyLimit: newTrophyLimit,
        unitCount: newUnitCount
      });
      
      const lessonBDocRef = doc(db, `${publicDataPath}/lessonBank`, lessonB.id);
      batch.delete(lessonBDocRef);
      
      await batch.commit();
      alert(`Successfully merged into "${newTitle}".`);
      cancelMerge();
    } catch (error) {
      console.error("Error merging lessons:", error);
      alert("An error occurred while merging.");
    }
    setIsMerging(false);
  };
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await addDoc(groupsCollection, {
        teacherUid: user.uid, groupName: name, studentUids: [], createdAt: serverTimestamp()
      });
      setNewGroupName(''); 
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };
  
  const handleToggleStudentInGroup = async (groupId, studentId, isChecked) => {
    try {
      const groupDocRef = doc(db, `${publicDataPath}/studentGroups`, groupId);
      const groupDocSnap = await getDoc(groupDocRef);
      if (!groupDocSnap.exists()) return;
      
      const currentUids = groupDocSnap.data().studentUids || [];
      let updatedUids = [];
      
      if (isChecked) {
        if (!currentUids.includes(studentId)) updatedUids = [...currentUids, studentId];
        else updatedUids = currentUids; 
      } else {
        updatedUids = currentUids.filter(uid => uid !== studentId);
      }
      
      await updateDoc(groupDocRef, { studentUids: updatedUids });
    } catch (error) {
      console.error("Error updating group members:", error);
    }
  };
  
  const handleUpdateSchedule = async (updatedData) => {
    const { id, studentUid, studentName, startTime, endTime, isRecurring, recurrenceId, updateType } = updatedData;
    
    try {
      if (isRecurring && updateType === 'all') {
        const batch = writeBatch(db);
        const q = query(
          teacherScheduleCollection,
          where("recurrenceId", "==", recurrenceId),
          where("startTime", ">=", editingEntry.startTime) 
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(docSnap => {
          const entry = docSnap.data();
          const entryDate = entry.startTime.toDate();
          
          const newStartHour = startTime.toDate().getHours();
          const newStartMinute = startTime.toDate().getMinutes();
          const newEndHour = endTime.toDate().getHours();
          const newEndMinute = endTime.toDate().getMinutes();

          const newEntryStartTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), newStartHour, newStartMinute);
          const newEntryEndTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), newEndHour, newEndMinute);
          
          batch.update(docSnap.ref, {
            studentUid: studentUid, studentName: studentName,
            startTime: Timestamp.fromDate(newEntryStartTime), endTime: Timestamp.fromDate(newEntryEndTime)
          });
        });
        await batch.commit();
      } else {
        const docRef = doc(db, `${publicDataPath}/teacherSchedule`, id);
        const dataToUpdate = { studentUid, studentName, startTime, endTime };
        
        if (isRecurring && updateType === 'single') {
          dataToUpdate.isRecurring = false;
          dataToUpdate.recurrenceId = null;
          dataToUpdate.overrideStatus = null; 
        }
        await updateDoc(docRef, dataToUpdate);
      }
      closeEditModal(); 
    } catch (error) {
      console.error("Error updating schedule:", error);
    }
  };
  
  const [isRepairingData, setIsRepairingData] = useState(false);
  const handleRepairTeacherUid = async () => {
    if (!user?.uid) return;
    setIsRepairingData(true);
    try {
      // If teacher access was ever recovered (e.g. after being locked out), the
      // Firebase UID recognized as "the teacher" can change — but existing
      // lessonBank/teacherSchedule/studentGroups documents still carry the OLD
      // uid in their teacherUid field, so the uid-filtered queries that load
      // them return nothing (data looks "gone" even though it's still there).
      // This finds every doc in those 3 collections — regardless of its current
      // teacherUid — and rewrites it to match this session's uid, since this
      // app supports only one teacher account at a time.
      const collections = [
        { ref: lessonBankCollection, path: `${publicDataPath}/lessonBank` },
        { ref: teacherScheduleCollection, path: `${publicDataPath}/teacherSchedule` },
        { ref: groupsCollection, path: `${publicDataPath}/studentGroups` },
      ];
      let fixedCount = 0;
      for (const { ref, path } of collections) {
        const snap = await getDocs(ref);
        const toFix = snap.docs.filter(d => d.data().teacherUid !== user.uid);
        for (let i = 0; i < toFix.length; i += 400) {
          const chunk = toFix.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(d => batch.update(doc(db, path, d.id), { teacherUid: user.uid }));
          await batch.commit();
        }
        fixedCount += toFix.length;
      }
      alert(fixedCount > 0
        ? `Repaired ${fixedCount} item(s). Your Lesson Bank, Schedule, and Groups should now show up correctly.`
        : `Nothing needed fixing — all your data already matches this account.`);
    } catch (error) {
      console.error('Error repairing teacherUid data:', error);
      alert('Error while repairing data. Please try again, or let your developer know.');
    }
    setIsRepairingData(false);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const fetchAndConvert = async (collectionRef) => {
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => {
          const data = doc.data();
          const id = doc.id;
          Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
              data[key] = data[key].toDate().toISOString();
            }
          });
          return { id, ...data };
        });
      };
      
      const [lessonBankData, studentsData, scheduleData, sessionsData, groupsData, starAnnouncementsData] = await Promise.all([
        fetchAndConvert(query(lessonBankCollection, where("teacherUid", "==", user.uid))),
        fetchAndConvert(studentsCollection),
        fetchAndConvert(query(teacherScheduleCollection, where("teacherUid", "==", user.uid))),
        fetchAndConvert(sessionsCollection), 
        fetchAndConvert(query(groupsCollection, where("teacherUid", "==", user.uid))),
        fetchAndConvert(starAnnouncementsCollection)
      ]);
      
      const backupData = {
        lessonBank: lessonBankData, students: studentsData, schedule: scheduleData, sessions: sessionsData, groups: groupsData, starAnnouncements: starAnnouncementsData
      };
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
    }
    setIsExporting(false);
  };

  const handleImportFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportFileContent(e.target.result);
        setShowImportModal(true);
      };
      reader.readAsText(file);
    }
    if(importFileRef.current) importFileRef.current.value = null;
  };
  
  const confirmImportData = async () => {
    if (!importFileContent) return;
    setIsImporting(true);
    setShowImportModal(false);
    
    try {
      const data = JSON.parse(importFileContent);
      const convertItem = (itemData) => {
        const data = { ...itemData };
        delete data.id; 
        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data[key])) {
            data[key] = Timestamp.fromDate(new Date(data[key]));
          }
        });
        return data;
      };

      // Backups can come from a different Firebase project (e.g. an old environment).
      // teacherUid values inside the backup belong to that old project's teacher account
      // and won't match this project's teacher, so lessonBank/schedule/groups queries
      // (which filter by teacherUid) would silently show nothing. Rewrite teacherUid to
      // the current logged-in teacher on import so everything shows up correctly.
      const convertTeacherItem = (itemData) => {
        const converted = convertItem(itemData);
        converted.teacherUid = user.uid;
        return converted;
      };

      // Build a flat list of { path, id, data } write operations across all collections.
      const ops = [];
      data.lessonBank?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/lessonBank`, id: item.id, data: convertTeacherItem(item) }); });
      data.students?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/students`, id: item.id, data: convertItem(item) }); });
      data.schedule?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/teacherSchedule`, id: item.id, data: convertTeacherItem(item) }); });
      data.sessions?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/studySessions`, id: item.id, data: convertItem(item) }); });
      data.groups?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/studentGroups`, id: item.id, data: convertTeacherItem(item) }); });
      data.starAnnouncements?.forEach(item => { if(item.id) ops.push({ path: `${publicDataPath}/starAnnouncements`, id: item.id, data: convertItem(item) }); });

      // Firestore allows at most 500 operations per batch. Chunk into groups of 400
      // (safety margin) and commit each chunk sequentially so large backups don't
      // silently fail as a single oversized batch.
      const CHUNK_SIZE = 400;
      const totalOps = ops.length;
      let written = 0;
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          batch.set(doc(db, op.path, op.id), op.data);
        });
        await batch.commit();
        written += chunk.length;
      }

      if (!teacherConfigData?.hasDeclinedTrophyReset) {
         setShowTrophyResetPrompt(true);
      }
      alert(`Import complete. ${written} of ${totalOps} records restored.`);
    } catch (error) {
      console.error("Error importing data:", error);
      alert(`Import failed: ${error.message || error}. Please check the browser console (F12) for details, or contact support.`);
    }
    setImportFileContent(null);
    setIsImporting(false);
  };

  // ── Trophy Data Audit ──
  // Two checks, neither of which writes anything -- purely diagnostic, so
  // it's always safe to run.
  //
  // 1) Live scan: flags any earnedTrophies value that exceeds its lesson's
  //    own trophyLimit -- a state that should be logically impossible, so
  //    seeing it at all means something (a bad manual edit, a bug like the
  //    per-class-summing one this was built in response to) let a number
  //    go higher than it should. Only checks bare-title keys (lessons
  //    without a Smart Study/Abhidhamma/Dhammaschool class concept),
  //    since a per-class key's real max requires knowing that specific
  //    class's live lesson count, which wasn't worth the extra fetches for
  //    a first pass.
  //
  // 2) Backup comparison: upload an older exported backup and compare each
  //    student's earnedTrophies/completedUnits key-by-key against the
  //    current live data (matched by student NAME, not ID, since an old
  //    backup can come from a different Firebase project with different
  //    IDs -- see confirmImportData's teacherUid rewrite for the same
  //    reason). Surfaces every case where the old backup shows MORE than
  //    what's live now -- exactly the shape of bug that lost Long Phan's
  //    6 Abhidhamma trophies during whatever long-ago migration never
  //    finished carrying them over.
  const [trophyAuditResults, setTrophyAuditResults] = useState(null);
  const [isRunningTrophyAudit, setIsRunningTrophyAudit] = useState(false);
  const [auditBackupFileContent, setAuditBackupFileContent] = useState(null);
  const [auditBackupFileName, setAuditBackupFileName] = useState('');
  const auditBackupFileRef = useRef(null);

  const runLiveTrophyAudit = () => {
    setIsRunningTrophyAudit(true);
    const findings = [];
    students.forEach(student => {
      const earned = student.earnedTrophies || {};
      Object.entries(earned).forEach(([key, value]) => {
        if (!value || value <= 0) return;
        // Only bare-title keys (no class suffix): find a lessonBank entry
        // whose own sanitized title matches this key exactly.
        const matchingLesson = lessonBank.find(l => sanitizeKey(l.title) === key);
        if (!matchingLesson) return;
        const max = matchingLesson.trophyLimit || 0;
        if (max > 0 && value > max) {
          findings.push({
            type: 'impossible',
            studentName: student.name,
            lessonTitle: matchingLesson.title,
            key,
            liveValue: value,
            max
          });
        }
      });
    });
    setTrophyAuditResults(prev => ({ ...(prev || {}), impossibleStates: findings, liveScanDone: true }));
    setIsRunningTrophyAudit(false);
  };

  const handleAuditBackupFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAuditBackupFileContent(e.target.result);
        setAuditBackupFileName(file.name);
      };
      reader.readAsText(file);
    }
    if (auditBackupFileRef.current) auditBackupFileRef.current.value = null;
  };

  const runBackupComparisonAudit = () => {
    if (!auditBackupFileContent) return;
    setIsRunningTrophyAudit(true);
    try {
      const backup = JSON.parse(auditBackupFileContent);
      const oldStudents = backup.students || [];
      // The live `students` list comes from a Firestore listener that can
      // still be mid-load (especially right after opening this tab) --
      // comparing against it too early falsely reported every one of a
      // student's trophies as "0, possible data loss" once, even though
      // the data was actually all there once the listener caught up. If
      // live has noticeably fewer students than the backup being compared
      // against, that's a strong sign it hasn't finished loading yet, so
      // refuse to run rather than produce a misleading report.
      if (oldStudents.length > 0 && students.length < oldStudents.length * 0.9) {
        alert(`Live student list looks incomplete (${students.length} loaded vs ${oldStudents.length} in the backup) -- it may still be loading. Wait a few seconds and try again.`);
        setIsRunningTrophyAudit(false);
        return;
      }
      const findings = [];
      oldStudents.forEach(oldStudent => {
        const liveStudent = students.find(s => (s.name || '').trim().toLowerCase() === (oldStudent.name || '').trim().toLowerCase());
        if (!liveStudent) {
          findings.push({ type: 'missing_student', studentName: oldStudent.name });
          return;
        }
        ['earnedTrophies', 'completedUnits'].forEach(field => {
          const oldMap = oldStudent[field] || {};
          const liveMap = liveStudent[field] || {};
          Object.entries(oldMap).forEach(([key, oldValue]) => {
            const liveValue = liveMap[key] || 0;
            if ((oldValue || 0) !== liveValue) {
              findings.push({
                type: 'mismatch',
                field,
                studentName: liveStudent.name,
                key,
                oldValue: oldValue || 0,
                liveValue,
                lostData: (oldValue || 0) > liveValue
              });
            }
          });
        });
      });
      // Worst (data possibly lost) first, then by student name.
      findings.sort((a, b) => {
        if (a.type === 'missing_student' || b.type === 'missing_student') return a.type === 'missing_student' ? -1 : 1;
        if (a.lostData !== b.lostData) return a.lostData ? -1 : 1;
        return (a.studentName || '').localeCompare(b.studentName || '');
      });
      setTrophyAuditResults(prev => ({ ...(prev || {}), backupComparison: findings, backupFileName: auditBackupFileName }));
    } catch (err) {
      alert(`Could not read that backup file: ${err.message || err}`);
    }
    setIsRunningTrophyAudit(false);
  };

  // ── Smart Study migration (retiring 4 old Gemini-link lessons) ──
  // Preview-first, exactly like the audit above: computes what WOULD change
  // and shows it, writes nothing until the teacher explicitly applies it.
  // Only ever raises a per-class earnedTrophies value up to what a student
  // has actually earned live in Smart Study (or the fallback, for a class
  // with no live tracking) -- it never lowers anything, and it never touches
  // the old bare-title keys, so trophyCount and everything already awarded
  // stays exactly as-is.
  const [ssMigrationPreview, setSsMigrationPreview] = useState(null);
  const [isRunningSsMigration, setIsRunningSsMigration] = useState(false);
  const [isApplyingSsMigration, setIsApplyingSsMigration] = useState(false);

  const runSmartStudyMigrationPreview = async () => {
    setIsRunningSsMigration(true);
    setSsMigrationPreview(null);
    try {
      const classesSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'classes'));
      const liveClasses = {};
      classesSnap.docs.forEach(d => { liveClasses[d.id] = (d.data().lessons || []).length; });

      const completionCache = {};
      const getCompletedCount = async (classId, names) => {
        const distinct = new Set();
        for (const name of names) {
          if (!name) continue;
          const cacheKey = `${classId}::${name}`;
          if (!(cacheKey in completionCache)) {
            const q = query(
              collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
              where('classId', '==', classId),
              where('studentName', '==', name)
            );
            const snap = await getDocs(q);
            completionCache[cacheKey] = snap.docs.map(d => d.data().lessonId);
          }
          completionCache[cacheKey].forEach(id => distinct.add(id));
        }
        return distinct.size;
      };
      // Same name-resolution as SmartStudyProgressBadge: a student linked to a
      // Smart Study class before `smartStudyNames` existed on their profile
      // has their old Smart Study name recorded only in the classRoster doc,
      // not on the profile -- missing this step is what made the first
      // preview undercount everyone so badly.
      const rosterNameCache = {};
      const resolveNamesForClass = async (student, classId) => {
        const profileSmartStudyName = student.smartStudyNames?.[classId] || null;
        const names = new Set([student.name, profileSmartStudyName].filter(Boolean));
        if (!profileSmartStudyName) {
          const rosterCacheKey = `${classId}::${student.name}`;
          if (!(rosterCacheKey in rosterNameCache)) {
            try {
              const rosterRef = doc(db, 'artifacts', appId, 'public', 'data', 'classRoster', `${classId}_${encodeURIComponent(student.name)}`);
              const snap = await getDoc(rosterRef);
              rosterNameCache[rosterCacheKey] = snap.exists() ? (snap.data().studentName || null) : null;
            } catch (e) {
              rosterNameCache[rosterCacheKey] = null;
            }
          }
          if (rosterNameCache[rosterCacheKey]) names.add(rosterNameCache[rosterCacheKey]);
        }
        return [...names];
      };

      // Assign Lesson computes each student's trophy key from the Lesson
      // Bank entry's own title, so this MUST match whichever entry is
      // actually used to send Smart Study lessons to students. The teacher
      // confirmed "Smart Study Lesson" is that entry going forward (an old
      // lesson had briefly been repurposed with a smartstudy:// link as a
      // workaround while that entry was unusable, which is what made two
      // earlier Apply attempts write under the wrong title) -- so the title
      // is now fixed rather than auto-detected.
      const ssTitleForKeys = CANONICAL_SMARTSTUDY_TITLE;

      const rows = [];
      for (const student of students) {
        const earned = student.earnedTrophies || {};
        for (const oldTitle of Object.keys(SMARTSTUDY_MIGRATION_MAP)) {
          const oldValue = earned[oldTitle] || 0;
          if (oldValue <= 0) continue;
          for (const target of SMARTSTUDY_MIGRATION_MAP[oldTitle]) {
            const { classId, fallback } = target;
            const newKey = sanitizeKey(`${ssTitleForKeys}_${classId}`);
            const currentNew = earned[newKey] || 0;
            const lessonCount = liveClasses[classId];
            let deserved, basis, liveCompleted = null, liveTotal = null;
            if (lessonCount != null && lessonCount > 0) {
              const names = await resolveNamesForClass(student, classId);
              const completed = await getCompletedCount(classId, names);
              const maxAvailable = computeClassTrophyMax(lessonCount);
              deserved = Math.floor((completed * maxAvailable) / lessonCount);
              basis = 'live';
              liveCompleted = completed;
              liveTotal = lessonCount;
            } else {
              deserved = fallback;
              basis = 'fallback';
            }
            const proposedNew = Math.max(currentNew, deserved);
            rows.push({
              studentId: student.id,
              studentName: student.name,
              oldTitle,
              oldValue,
              classId,
              newKey,
              basis,
              liveCompleted,
              liveTotal,
              deserved,
              currentNew,
              proposedNew,
              willChange: proposedNew > currentNew,
            });
          }
        }
      }
      rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.oldTitle.localeCompare(b.oldTitle) || a.classId.localeCompare(b.classId));
      setSsMigrationPreview({ rows, liveClasses });
    } catch (err) {
      console.error('Error running Smart Study migration preview:', err);
      alert(`Could not run the migration preview: ${err.message || err}`);
    }
    setIsRunningSsMigration(false);
  };

  const applySmartStudyMigration = async () => {
    if (!ssMigrationPreview) return;
    const changingRows = ssMigrationPreview.rows.filter(r => r.willChange);
    if (changingRows.length === 0) {
      alert('Nothing to apply -- no student needs a higher trophy count than they already have.');
      return;
    }
    if (!window.confirm(`This will set new "Smart Study" per-class trophy values for ${changingRows.length} student/class combination(s), only where that raises the number. It will NOT change any existing trophy already given. Continue?`)) return;
    setIsApplyingSsMigration(true);
    try {
      const ssEntrySnap = await getDocs(query(lessonBankCollection, where('link', '==', 'smartstudy://')));
      if (ssEntrySnap.empty) {
        await addDoc(lessonBankCollection, {
          teacherUid: user.uid,
          title: SMARTSTUDY_MIGRATION_NEW_TITLE,
          link: 'smartstudy://',
          details: '',
          trophyLimit: 0,
          unitLabel: 'Lesson',
          unitCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      const batch = writeBatch(db);
      changingRows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.newKey}`]: row.proposedNew });
      });
      await batch.commit();
      alert(`Done. Updated ${changingRows.length} trophy value(s) under the new "Smart Study" entry. The old lesson trophies were left untouched.`);
      setSsMigrationPreview(null);
    } catch (err) {
      console.error('Error applying Smart Study migration:', err);
      alert(`Migration failed: ${err.message || err}`);
    }
    setIsApplyingSsMigration(false);
  };

  // One-off cleanup for earlier Apply attempts, which wrote trophies under
  // two different wrong titles while chasing entry-selection bugs: a
  // placeholder "Smart Study" entry the code created itself, and later the
  // repurposed " Heavenly World or Golden cage" entry used as a stand-in
  // while "Smart Study Lesson" couldn't be opened at all. IMPORTANT: this
  // must stay narrowly scoped to these SPECIFIC known-bad titles -- a
  // broader "any non-canonical title" sweep would also catch real,
  // already-earned trophies recorded under "Smart Study Lesson" from
  // ordinary day-to-day use (e.g. a student's real NEW/WASO trophies),
  // which must never be touched. Safe to run more than once: once the
  // specific stray keys are gone, it just reports nothing left.
  const [ssCleanupPreview, setSsCleanupPreview] = useState(null);
  const [isRunningSsCleanup, setIsRunningSsCleanup] = useState(false);
  const [myanmarReaderScaleFixPreview, setMyanmarReaderScaleFixPreview] = useState(null);
  const [isFixingMyanmarReaderScale, setIsFixingMyanmarReaderScale] = useState(false);
  const runSsCleanupScan = async () => {
    setIsRunningSsCleanup(true);
    try {
      const strayKeys = new Set(SMARTSTUDY_MIGRATION_CLASS_IDS.flatMap(classId => [
        sanitizeKey(`${SMARTSTUDY_MIGRATION_NEW_TITLE}_${classId}`),
        sanitizeKey(`${PRIOR_WRONG_SMARTSTUDY_TITLE}_${classId}`),
      ]));
      const rows = [];
      students.forEach(student => {
        const earned = student.earnedTrophies || {};
        Object.keys(earned).forEach(key => {
          if (strayKeys.has(key)) {
            rows.push({ studentId: student.id, studentName: student.name, key, value: earned[key] });
          }
        });
      });
      // Also check for a duplicate placeholder Lesson Bank entry created by
      // an Apply that ran before `lessonBank` had loaded and so found no
      // existing smartstudy:// entry.
      const ssEntrySnap = await getDocs(query(lessonBankCollection, where('link', '==', 'smartstudy://')));
      const ssDocs = ssEntrySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const duplicateEntry = ssDocs.length > 1 ? ssDocs.find(d => d.title === SMARTSTUDY_MIGRATION_NEW_TITLE) : null;
      setSsCleanupPreview({ rows, duplicateEntry: duplicateEntry || null });
    } catch (err) {
      console.error('Error scanning for stray Smart Study data:', err);
      alert(`Scan failed: ${err.message || err}`);
    }
    setIsRunningSsCleanup(false);
  };
  const applySsCleanup = async () => {
    if (!ssCleanupPreview) return;
    const { rows, duplicateEntry } = ssCleanupPreview;
    if (rows.length === 0 && !duplicateEntry) return;
    if (!window.confirm(`Remove ${rows.length} incorrectly-keyed trophy field(s)${duplicateEntry ? ' and 1 duplicate placeholder Lesson Bank entry' : ''} left by earlier Apply attempts? This does not touch any real trophy value or the real "Smart Study Lesson" entry.`)) return;
    setIsRunningSsCleanup(true);
    try {
      const batch = writeBatch(db);
      rows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.key}`]: deleteField() });
      });
      await batch.commit();
      if (duplicateEntry) {
        await deleteDoc(doc(db, `${publicDataPath}/lessonBank`, duplicateEntry.id));
      }
      alert(`Removed ${rows.length} stray field(s)${duplicateEntry ? ' and the duplicate Lesson Bank entry' : ''}.`);
      setSsCleanupPreview(null);
    } catch (err) {
      console.error('Error cleaning up stray Smart Study keys:', err);
      alert(`Cleanup failed: ${err.message || err}`);
    }
    setIsRunningSsCleanup(false);
  };

  // One-time fix: Myanmar Reader used to be sent as two separate Lesson Bank
  // entries ("Sheet A" and "Sheet B", 29 chapters each, trophies tracked
  // separately) that got merged into one real Myanmar Reader Lesson entry.
  // The merge summed each student's two old completedUnits values together
  // (e.g. 19 + 19 = 38) and the merged Lesson Bank entry's "Total Number"
  // (unitCount) was left at the summed 58 instead of the real 29-chapter
  // total.
  //
  // Editing "Total Number" by hand in Edit Lesson only changes the Lesson
  // Bank's own master entry -- it does NOT reach any student who was already
  // sent this lesson, because each assignment stores its OWN snapshot of
  // unitCount/trophyLimit at send time (see handleSendLesson's addDoc) that
  // never re-reads the Lesson Bank afterwards. That split is exactly what
  // made a hand edit "get confusing": the teacher's Assign-Lesson preview
  // (which reads the live Lesson Bank entry) and a student's own Available
  // Lessons card (which reads their already-sent snapshot) could show two
  // different totals. This preview covers all three places that need to
  // agree: the Lesson Bank entry itself, every student's already-sent
  // assignment doc, and each student's summed completedUnits number (halved
  // back to the real 29-chapter scale). None of this touches any trophy
  // already earned.
  const runMyanmarReaderScaleFixPreview = async () => {
    setIsFixingMyanmarReaderScale(true);
    try {
      const lessonKey = computeLessonKey('Myanmar Reader Lesson', MYANMAR_READER_APP_URL);
      const REAL_CHAPTER_COUNT = 29;

      const bankEntry = lessonBank.find(l => l.title === 'Myanmar Reader Lesson' && l.link === MYANMAR_READER_APP_URL) || null;

      const assignedSnap = await getDocs(query(
        lessonsCollection,
        where('title', '==', 'Myanmar Reader Lesson'),
        where('link', '==', MYANMAR_READER_APP_URL)
      ));
      const assignedDocs = assignedSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => (d.unitCount || 0) !== REAL_CHAPTER_COUNT)
        .map(d => ({
          docId: d.id,
          studentName: students.find(s => s.id === d.studentUid)?.name || d.studentUid,
          oldUnitCount: d.unitCount || 0,
        }));

      const completedUnitRows = students
        .map(student => ({
          studentId: student.id,
          studentName: student.name,
          oldValue: student.completedUnits?.[lessonKey] || 0,
        }))
        .filter(r => r.oldValue > 0)
        .map(r => ({ ...r, newValue: r.oldValue / 2 }));

      setMyanmarReaderScaleFixPreview({
        bankEntry: bankEntry ? { id: bankEntry.id, oldUnitCount: bankEntry.unitCount || 0 } : null,
        assignedDocs,
        completedUnitRows,
        realChapterCount: REAL_CHAPTER_COUNT,
      });
    } catch (err) {
      console.error('Error previewing Myanmar Reader scale fix:', err);
      alert(`Preview failed: ${err.message || err}`);
    }
    setIsFixingMyanmarReaderScale(false);
  };
  const applyMyanmarReaderScaleFix = async () => {
    const preview = myanmarReaderScaleFixPreview;
    if (!preview) return;
    const totalChanges = (preview.bankEntry ? 1 : 0) + preview.assignedDocs.length + preview.completedUnitRows.length;
    if (totalChanges === 0) return;
    if (!window.confirm(`Fix Myanmar Reader's Total Number to ${preview.realChapterCount} everywhere (Lesson Bank entry, ${preview.assignedDocs.length} already-sent assignment(s)) and halve the stored progress number for ${preview.completedUnitRows.length} student(s)? This does not touch any trophy already earned.`)) return;
    setIsFixingMyanmarReaderScale(true);
    try {
      const lessonKey = computeLessonKey('Myanmar Reader Lesson', MYANMAR_READER_APP_URL);
      const batch = writeBatch(db);
      if (preview.bankEntry) {
        batch.update(doc(db, `${publicDataPath}/lessonBank`, preview.bankEntry.id), { unitCount: preview.realChapterCount });
      }
      preview.assignedDocs.forEach(row => {
        batch.update(doc(db, `${publicDataPath}/lessons`, row.docId), { unitCount: preview.realChapterCount });
      });
      preview.completedUnitRows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`completedUnits.${lessonKey}`]: row.newValue });
      });
      await batch.commit();
      alert(`Fixed Myanmar Reader's Total Number and progress numbers.`);
      setMyanmarReaderScaleFixPreview(null);
    } catch (err) {
      console.error('Error fixing Myanmar Reader progress scale:', err);
      alert(`Fix failed: ${err.message || err}`);
    }
    setIsFixingMyanmarReaderScale(false);
  };

  // One-time migration: 5 separate bare-link Lesson Bank entries (each just
  // a YouTube link with no content of its own -- "watch this and report how
  // much you watched") consolidated into one "🎥 Watch & Learn" entry with
  // a real list screen (WatchAndLearnApp.jsx). Each student's trophies
  // earned across all 5 old titles are summed into the one new title, never
  // decreasing anything already there. New unitCount/trophyLimit are a
  // reasonable combination of the 5 old ones' own scales (they used
  // Minutes/Movies at very different scales -- see the note in the preview
  // UI) rather than an exact conversion; the teacher can adjust "Total
  // Number"/"Max Trophies" afterward via Edit Lesson if a different rate is
  // wanted.
  const WATCH_LEARN_OLD_TITLES = ['Animated Buddhist Stories', 'Kyaw Hein 🎦 ', 'Story', 'Watch 🎥 ', 'Combine Link'];
  const WATCH_LEARN_NEW_TITLE = '🎥 Watch & Learn';
  const WATCH_LEARN_LINK = 'watchandlearn://';
  const WATCH_LEARN_UNIT_COUNT = 3000;
  const WATCH_LEARN_TROPHY_LIMIT = 350;
  const [watchLearnMigrationPreview, setWatchLearnMigrationPreview] = useState(null);
  const [isApplyingWatchLearnMigration, setIsApplyingWatchLearnMigration] = useState(false);
  const runWatchLearnMigrationPreview = () => {
    const newKey = sanitizeKey(WATCH_LEARN_NEW_TITLE);
    const rows = students
      .map(student => {
        const earned = student.earnedTrophies || {};
        const sumOld = WATCH_LEARN_OLD_TITLES.reduce((sum, t) => sum + (earned[sanitizeKey(t)] || 0), 0);
        const currentNew = earned[newKey] || 0;
        return { studentId: student.id, studentName: student.name, sumOld, currentNew, proposedNew: Math.max(currentNew, sumOld) };
      })
      .filter(r => r.sumOld > 0 || r.currentNew > 0);
    const bankEntry = lessonBank.find(l => l.title === WATCH_LEARN_NEW_TITLE && l.link === WATCH_LEARN_LINK) || null;
    setWatchLearnMigrationPreview({ rows, bankEntryExists: !!bankEntry });
  };
  const applyWatchLearnMigration = async () => {
    if (!watchLearnMigrationPreview) return;
    const { rows, bankEntryExists } = watchLearnMigrationPreview;
    const changedRows = rows.filter(r => r.proposedNew > r.currentNew);
    if (changedRows.length === 0 && bankEntryExists) return;
    setIsApplyingWatchLearnMigration(true);
    try {
      const newKey = sanitizeKey(WATCH_LEARN_NEW_TITLE);
      const batch = writeBatch(db);
      changedRows.forEach(row => {
        batch.update(doc(db, `${publicDataPath}/students`, row.studentId), { [`earnedTrophies.${newKey}`]: row.proposedNew });
      });
      await batch.commit();
      if (!bankEntryExists) {
        await addDoc(lessonBankCollection, {
          title: WATCH_LEARN_NEW_TITLE,
          link: WATCH_LEARN_LINK,
          unitLabel: 'Minute',
          unitCount: WATCH_LEARN_UNIT_COUNT,
          trophyLimit: WATCH_LEARN_TROPHY_LIMIT,
          details: '',
          teacherUid: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      // Seed the new app's own video list from the real links on the old
      // bare-link Lesson Bank entries -- Apply only migrated trophy totals
      // above, it never copied the actual watchable URLs anywhere, so
      // without this the new app opens empty even after migrating.
      const videosCollection = collection(db, `${publicDataPath}/watchAndLearnVideos`);
      const existingVideosSnap = await getDocs(videosCollection);
      const existingTitles = new Set(existingVideosSnap.docs.map(d => (d.data().title || '').trim()));
      const oldEntries = lessonBank.filter(l => WATCH_LEARN_OLD_TITLES.includes(l.title) && l.link);
      let nextOrder = existingVideosSnap.docs.length > 0
        ? Math.max(...existingVideosSnap.docs.map(d => d.data().order || 0)) + 1
        : 0;
      let addedVideoCount = 0;
      for (const entry of oldEntries) {
        const title = entry.title.trim();
        if (existingTitles.has(title)) continue;
        await addDoc(videosCollection, { title, link: entry.link, order: nextOrder, createdAt: serverTimestamp() });
        nextOrder += 1;
        addedVideoCount += 1;
      }
      alert(`Applied — set ${changedRows.length} student trophy total(s)${!bankEntryExists ? ', created the "🎥 Watch & Learn" Lesson Bank entry,' : ''} and added ${addedVideoCount} video(s) to the Watch & Learn list.`);
      setWatchLearnMigrationPreview(null);
    } catch (err) {
      console.error('Error applying Watch & Learn migration:', err);
      alert(`Apply failed: ${err.message || err}`);
    }
    setIsApplyingWatchLearnMigration(false);
  };
  const handleDeleteOldWatchLearnLessons = async () => {
    const targets = lessonBank.filter(l => WATCH_LEARN_OLD_TITLES.includes(l.title));
    if (targets.length === 0) {
      alert('None of the old video-link lessons were found in the Lesson Bank (maybe already deleted).');
      return;
    }
    if (!window.confirm(`Delete these ${targets.length} old Lesson Bank entries?\n\n${targets.map(t => `- ${t.title}`).join('\n')}\n\nStudents' already-earned trophies for them are NOT touched -- this only removes them from the Lesson Bank / Assign Lesson list.`)) {
      return;
    }
    try {
      const batch = writeBatch(db);
      targets.forEach(t => batch.delete(doc(db, `${publicDataPath}/lessonBank`, t.id)));
      await batch.commit();
      alert(`Deleted ${targets.length} old Lesson Bank entries.`);
    } catch (err) {
      console.error('Error deleting old Watch & Learn lessons:', err);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  // "Kind and Respectful" is also an old Gemini-link Smart Study lesson, but
  // it was never given a migration mapping above (no per-class equivalent
  // was worked out for it) -- the teacher confirmed it should be deleted
  // anyway. Its students' existing bare-key trophies are untouched by
  // deletion either way (deleting a Lesson Bank entry never touches student
  // data), they just won't have a live per-class Smart Study equivalent.
  const OLD_SMARTSTUDY_TITLES_TO_DELETE = [...Object.keys(SMARTSTUDY_MIGRATION_MAP), 'Kind and Respectful'];
  const handleDeleteOldSmartStudyLessons = async () => {
    const targets = lessonBank.filter(l => OLD_SMARTSTUDY_TITLES_TO_DELETE.includes(l.title));
    if (targets.length === 0) {
      alert('None of the old lessons were found in the Lesson Bank (maybe already deleted).');
      return;
    }
    if (!window.confirm(`Delete these ${targets.length} old Lesson Bank entries?\n\n${targets.map(t => `- ${t.title}`).join('\n')}\n\nStudents' already-earned trophies for them are NOT touched -- this only removes them from the Lesson Bank / Assign Lesson list.`)) {
      return;
    }
    try {
      await Promise.all(targets.map(t => deleteDoc(doc(db, `${publicDataPath}/lessonBank`, t.id))));
      alert(`Deleted ${targets.length} old lesson(s).`);
    } catch (err) {
      console.error('Error deleting old Smart Study lessons:', err);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  // ── Abhidhamma migration (same preview-first pattern as Smart Study) ──
  const [abhiMigrationPreview, setAbhiMigrationPreview] = useState(null);
  const [isRunningAbhiMigration, setIsRunningAbhiMigration] = useState(false);
  const [isApplyingAbhiMigration, setIsApplyingAbhiMigration] = useState(false);

  const runAbhidhammaMigrationPreview = async () => {
    setIsRunningAbhiMigration(true);
    setAbhiMigrationPreview(null);
    try {
      // Live classes are keyed by an internal document id, not necessarily
      // the human-readable name the teacher gave each class -- resolve by
      // matching displayName (falling back to the doc id itself) so a
      // typo'd or unresolved target is obvious in the preview rather than
      // silently computing against the wrong (or a nonexistent) class.
      const classesSnap = await getDocs(collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'classes'));
      const liveClasses = await Promise.all(classesSnap.docs.map(async d => {
        let lessonCount = 0;
        try {
          const lessonsSnap = await getDocs(collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'classes', d.id, 'lessons'));
          lessonCount = lessonsSnap.size;
        } catch (e) {}
        return { classId: d.id, displayName: (d.data().displayName || d.id).trim(), lessonCount };
      }));
      const resolveClass = (givenName) => {
        const norm = givenName.trim().toLowerCase();
        return liveClasses.find(c => c.displayName.toLowerCase() === norm || c.classId.toLowerCase() === norm) || null;
      };

      const scoresCache = {};
      const getCompletedCount = async (resolvedClassId, names) => {
        const distinct = new Set();
        for (const name of names) {
          if (!name) continue;
          const cacheKey = `${resolvedClassId}::${name}`;
          if (!(cacheKey in scoresCache)) {
            const ABHI_COL = collection(db, 'artifacts', ABHIDHAMMA_APP_ID, 'public', 'data', 'global_scores');
            const [s1, s2] = await Promise.all([
              getDocs(query(ABHI_COL, where('name', '==', name))),
              getDocs(query(ABHI_COL, where('studentName', '==', name))),
            ]);
            scoresCache[cacheKey] = [...s1.docs, ...s2.docs]
              .filter(d => !d.data().classId || d.data().classId === resolvedClassId)
              .map(d => d.data().lessonId)
              .filter(Boolean);
          }
          scoresCache[cacheKey].forEach(id => distinct.add(id));
        }
        return distinct.size;
      };

      const rows = [];
      for (const student of students) {
        const earned = student.earnedTrophies || {};
        for (const oldTitle of Object.keys(ABHIDHAMMA_MIGRATION_MAP)) {
          const oldValue = earned[oldTitle] || 0;
          if (oldValue <= 0) continue;
          for (const target of ABHIDHAMMA_MIGRATION_MAP[oldTitle]) {
            const { classId: givenClassName, forceFallback } = target;
            const resolved = resolveClass(givenClassName);
            const newKey = sanitizeKey(`${CANONICAL_ABHIDHAMMA_TITLE}_${resolved ? resolved.classId : givenClassName}`);
            const currentNew = earned[newKey] || 0;
            let deserved, basis, liveCompleted = null, liveTotal = null;
            if (!resolved) {
              deserved = oldValue;
              basis = 'not-found';
            } else if (forceFallback) {
              deserved = oldValue;
              basis = 'fallback';
              liveTotal = resolved.lessonCount;
            } else if (resolved.lessonCount > 0) {
              const names = [...new Set([student.name, student.abhidhammaNames?.[resolved.classId]].filter(Boolean))];
              const completed = await getCompletedCount(resolved.classId, names);
              const maxAvailable = computeClassTrophyMax(resolved.lessonCount);
              deserved = Math.floor((completed * maxAvailable) / resolved.lessonCount);
              basis = 'live';
              liveCompleted = completed;
              liveTotal = resolved.lessonCount;
            } else {
              deserved = oldValue;
              basis = 'fallback';
            }
            const proposedNew = Math.max(currentNew, deserved);
            rows.push({
              studentId: student.id,
              studentName: student.name,
              oldTitle,
              oldValue,
              classId: resolved ? resolved.displayName : givenClassName,
              newKey,
              basis,
              liveCompleted,
              liveTotal,
              deserved,
              currentNew,
              proposedNew,
              willChange: proposedNew > currentNew,
            });
          }
        }
      }
      rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.oldTitle.localeCompare(b.oldTitle) || a.classId.localeCompare(b.classId));
      setAbhiMigrationPreview({ rows });
    } catch (err) {
      console.error('Error running Abhidhamma migration preview:', err);
      alert(`Could not run the migration preview: ${err.message || err}`);
    }
    setIsRunningAbhiMigration(false);
  };

  const applyAbhidhammaMigration = async () => {
    if (!abhiMigrationPreview) return;
    // A class fed by more than one old lesson (e.g. "The Great Buddhist
    // Lady" and "...Layman" both feeding "THE GREAT BUDDHISTS") can produce
    // two rows targeting the exact same newKey with different proposed
    // values -- writing both in one batch would let whichever happens to
    // apply last silently win instead of the correct (higher) one, so
    // collapse to the single highest proposedNew per (student, key) first.
    const byKey = {};
    abhiMigrationPreview.rows.filter(r => r.willChange).forEach(r => {
      const k = `${r.studentId}::${r.newKey}`;
      if (!byKey[k] || r.proposedNew > byKey[k].proposedNew) byKey[k] = r;
    });
    const changingRows = Object.values(byKey);
    if (changingRows.length === 0) {
      alert('Nothing to apply -- no student needs a higher trophy count than they already have.');
      return;
    }
    if (!window.confirm(`This will set new "Abhidhamma Lesson" per-class trophy values for ${changingRows.length} student/class combination(s), only where that raises the number. It will NOT change any existing trophy already given. Continue?`)) return;
    setIsApplyingAbhiMigration(true);
    try {
      const abhiEntrySnap = await getDocs(query(lessonBankCollection, where('link', '==', 'abhidhamma://')));
      if (abhiEntrySnap.empty) {
        await addDoc(lessonBankCollection, {
          teacherUid: user.uid,
          title: CANONICAL_ABHIDHAMMA_TITLE,
          link: 'abhidhamma://',
          details: '',
          trophyLimit: 0,
          unitLabel: 'Lesson',
          unitCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      const batch = writeBatch(db);
      changingRows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.newKey}`]: row.proposedNew });
      });
      await batch.commit();
      alert(`Done. Updated ${changingRows.length} trophy value(s) under "${CANONICAL_ABHIDHAMMA_TITLE}". The old lesson trophies were left untouched.`);
      setAbhiMigrationPreview(null);
    } catch (err) {
      console.error('Error applying Abhidhamma migration:', err);
      alert(`Migration failed: ${err.message || err}`);
    }
    setIsApplyingAbhiMigration(false);
  };

  const handleDeleteOldAbhidhammaLessons = async () => {
    const targets = lessonBank.filter(l => Object.keys(ABHIDHAMMA_MIGRATION_MAP).includes(l.title));
    if (targets.length === 0) {
      alert('None of the old Abhidhamma lessons were found in the Lesson Bank (maybe already deleted).');
      return;
    }
    if (!window.confirm(`Delete these ${targets.length} old Lesson Bank entries?\n\n${targets.map(t => `- ${t.title}`).join('\n')}\n\nStudents' already-earned trophies for them are NOT touched -- this only removes them from the Lesson Bank / Assign Lesson list.`)) {
      return;
    }
    try {
      await Promise.all(targets.map(t => deleteDoc(doc(db, `${publicDataPath}/lessonBank`, t.id))));
      alert(`Deleted ${targets.length} old lesson(s).`);
    } catch (err) {
      console.error('Error deleting old Abhidhamma lessons:', err);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  // Cleanup for the first Abhidhamma Apply, which used the old lessons'
  // own Title-Case/double-d spelling as a guessed classId (e.g. "Basic
  // Abhiddhamma-3") instead of the real live document ID ("BASIC-
  // ABHIDHAMMA-3") -- that guess never matched a real class, so those
  // writes landed under a key nothing reads. Narrowly scoped to these
  // specific wrong guesses only.
  const PRIOR_WRONG_ABHIDHAMMA_CLASSIDS = ['Basic Abhiddhamma-2', 'Basic Abhiddhamma-3', 'Basic Abhiddhamma-4'];
  const [abhiCleanupPreview, setAbhiCleanupPreview] = useState(null);
  const [isRunningAbhiCleanup, setIsRunningAbhiCleanup] = useState(false);
  const runAbhiCleanupScan = () => {
    setIsRunningAbhiCleanup(true);
    const strayKeys = new Set(PRIOR_WRONG_ABHIDHAMMA_CLASSIDS.map(classId => sanitizeKey(`${CANONICAL_ABHIDHAMMA_TITLE}_${classId}`)));
    const rows = [];
    students.forEach(student => {
      const earned = student.earnedTrophies || {};
      Object.keys(earned).forEach(key => {
        if (strayKeys.has(key)) {
          rows.push({ studentId: student.id, studentName: student.name, key, value: earned[key] });
        }
      });
    });
    setAbhiCleanupPreview(rows);
    setIsRunningAbhiCleanup(false);
  };
  const applyAbhiCleanup = async () => {
    if (!abhiCleanupPreview || abhiCleanupPreview.length === 0) return;
    if (!window.confirm(`Remove ${abhiCleanupPreview.length} incorrectly-keyed trophy field(s) left by the first Abhidhamma Apply? This does not touch any real trophy value.`)) return;
    setIsRunningAbhiCleanup(true);
    try {
      const batch = writeBatch(db);
      abhiCleanupPreview.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.key}`]: deleteField() });
      });
      await batch.commit();
      alert(`Removed ${abhiCleanupPreview.length} stray field(s).`);
      setAbhiCleanupPreview(null);
    } catch (err) {
      console.error('Error cleaning up stray Abhidhamma keys:', err);
      alert(`Cleanup failed: ${err.message || err}`);
    }
    setIsRunningAbhiCleanup(false);
  };

  // ── Dhammaschool migration (same preview-first pattern as the other two) ──
  const [dsMigrationPreview, setDsMigrationPreview] = useState(null);
  const [isRunningDsMigration, setIsRunningDsMigration] = useState(false);
  const [isApplyingDsMigration, setIsApplyingDsMigration] = useState(false);

  const runDhammaschoolMigrationPreview = async () => {
    setIsRunningDsMigration(true);
    setDsMigrationPreview(null);
    try {
      const classIds = [...new Set(Object.values(DHAMMASCHOOL_MIGRATION_MAP).flat().map(t => t.classId))];
      const classLessonIdsByClass = {};
      for (const classId of classIds) {
        const lessonsSnap = await getDocs(query(
          collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'),
          where('classId', '==', classId)
        ));
        classLessonIdsByClass[classId] = lessonsSnap.docs.map(d => d.id);
      }

      const completionsCache = {};
      const getCompletedCount = async (classId, name) => {
        if (!(name in completionsCache)) {
          const snap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lesson_completions'),
            where('studentName', '==', name)
          ));
          completionsCache[name] = snap.docs.map(d => d.data().lessonId);
        }
        const classLessonIds = classLessonIdsByClass[classId] || [];
        return completionsCache[name].filter(lid => classLessonIds.includes(lid)).length;
      };

      const rows = [];
      for (const student of students) {
        const earned = student.earnedTrophies || {};
        for (const oldTitle of Object.keys(DHAMMASCHOOL_MIGRATION_MAP)) {
          const oldValue = earned[oldTitle] || 0;
          if (oldValue <= 0) continue;
          for (const target of DHAMMASCHOOL_MIGRATION_MAP[oldTitle]) {
            const { classId } = target;
            const newKey = sanitizeKey(`${CANONICAL_DHAMMASCHOOL_TITLE}_${classId}`);
            const currentNew = earned[newKey] || 0;
            const lessonCount = (classLessonIdsByClass[classId] || []).length;
            let deserved, basis, liveCompleted = null, liveTotal = null;
            if (lessonCount > 0) {
              const completed = await getCompletedCount(classId, student.name);
              // Dhammaschool's own trophy rate is NOT the round(lessons/5)
              // formula the other apps use -- confirmed directly by the
              // teacher: a fully-completed 40-lesson grade is worth 80
              // trophies (2 per lesson), matching every old grade lesson's
              // own trophyLimit (all 80, for 40-chapter content).
              const maxAvailable = lessonCount * 2;
              const liveDeserved = Math.floor((completed * maxAvailable) / lessonCount);
              // Many of these students actually studied via Google Slides
              // outside the live app, so real completion data is missing or
              // very incomplete for most of them even though they were
              // legitimately awarded trophies at the time -- never let a low
              // live number erase what they already earned; fall back to
              // their old trophy count (capped to the new class's own max)
              // whenever it's higher than what live data alone would give.
              const oldValueCapped = Math.min(oldValue, maxAvailable);
              deserved = Math.max(liveDeserved, oldValueCapped);
              basis = liveDeserved >= oldValueCapped ? 'live' : 'fallback';
              liveCompleted = completed;
              liveTotal = lessonCount;
            } else {
              deserved = oldValue;
              basis = 'not-found';
            }
            const proposedNew = Math.max(currentNew, deserved);
            rows.push({
              studentId: student.id,
              studentName: student.name,
              oldTitle,
              oldValue,
              classId,
              newKey,
              basis,
              liveCompleted,
              liveTotal,
              deserved,
              currentNew,
              proposedNew,
              willChange: proposedNew > currentNew,
            });
          }
        }
      }
      rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.oldTitle.localeCompare(b.oldTitle) || a.classId.localeCompare(b.classId));
      setDsMigrationPreview({ rows });
    } catch (err) {
      console.error('Error running Dhammaschool migration preview:', err);
      alert(`Could not run the migration preview: ${err.message || err}`);
    }
    setIsRunningDsMigration(false);
  };

  const applyDhammaschoolMigration = async () => {
    if (!dsMigrationPreview) return;
    const byKey = {};
    dsMigrationPreview.rows.filter(r => r.willChange).forEach(r => {
      const k = `${r.studentId}::${r.newKey}`;
      if (!byKey[k] || r.proposedNew > byKey[k].proposedNew) byKey[k] = r;
    });
    const changingRows = Object.values(byKey);
    if (changingRows.length === 0) {
      alert('Nothing to apply -- no student needs a higher trophy count than they already have.');
      return;
    }
    if (!window.confirm(`This will set new "Dhammaschool Lesson" per-class trophy values for ${changingRows.length} student/class combination(s), only where that raises the number. It will NOT change any existing trophy already given. Continue?`)) return;
    setIsApplyingDsMigration(true);
    try {
      const dsEntrySnap = await getDocs(query(lessonBankCollection, where('link', '==', 'dhammaschool://')));
      if (dsEntrySnap.empty) {
        await addDoc(lessonBankCollection, {
          teacherUid: user.uid,
          title: CANONICAL_DHAMMASCHOOL_TITLE,
          link: 'dhammaschool://',
          details: '',
          trophyLimit: 0,
          unitLabel: 'Lesson',
          unitCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      const batch = writeBatch(db);
      changingRows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.newKey}`]: row.proposedNew });
      });
      await batch.commit();
      alert(`Done. Updated ${changingRows.length} trophy value(s) under "${CANONICAL_DHAMMASCHOOL_TITLE}". The old lesson trophies were left untouched.`);
      setDsMigrationPreview(null);
    } catch (err) {
      console.error('Error applying Dhammaschool migration:', err);
      alert(`Migration failed: ${err.message || err}`);
    }
    setIsApplyingDsMigration(false);
  };

  const handleDeleteOldDhammaschoolLessons = async () => {
    const targets = lessonBank.filter(l => Object.keys(DHAMMASCHOOL_MIGRATION_MAP).includes(l.title));
    if (targets.length === 0) {
      alert('None of the old Dhammaschool lessons were found in the Lesson Bank (maybe already deleted).');
      return;
    }
    if (!window.confirm(`Delete these ${targets.length} old Lesson Bank entries?\n\n${targets.map(t => `- ${t.title}`).join('\n')}\n\nStudents' already-earned trophies for them are NOT touched -- this only removes them from the Lesson Bank / Assign Lesson list.`)) {
      return;
    }
    try {
      await Promise.all(targets.map(t => deleteDoc(doc(db, `${publicDataPath}/lessonBank`, t.id))));
      alert(`Deleted ${targets.length} old lesson(s).`);
    } catch (err) {
      console.error('Error deleting old Dhammaschool lessons:', err);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  // ── Reading Myanmar / Speaking Myanmar migration (shared, no live data) ──
  const [selectedGroupAppMigrationId, setSelectedGroupAppMigrationId] = useState(GROUP_APP_MIGRATIONS[0].id);
  const [groupAppMigrationPreview, setGroupAppMigrationPreview] = useState(null);
  const [isApplyingGroupAppMigration, setIsApplyingGroupAppMigration] = useState(false);
  const selectedGroupAppMigration = GROUP_APP_MIGRATIONS.find(m => m.id === selectedGroupAppMigrationId);

  const runGroupAppMigrationPreview = () => {
    const config = selectedGroupAppMigration;
    const rows = [];
    students.forEach(student => {
      const earned = student.earnedTrophies || {};
      Object.entries(config.map).forEach(([oldTitle, partKey]) => {
        const oldValue = earned[oldTitle] || 0;
        if (oldValue <= 0) return;
        const newKey = sanitizeKey(`${config.canonicalTitle}_${partKey}`);
        const currentNew = earned[newKey] || 0;
        const proposedNew = Math.max(currentNew, oldValue);
        rows.push({
          studentId: student.id,
          studentName: student.name,
          oldTitle,
          oldValue,
          partKey,
          newKey,
          currentNew,
          proposedNew,
          willChange: proposedNew > currentNew,
        });
      });
    });
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName) || a.oldTitle.localeCompare(b.oldTitle));
    setGroupAppMigrationPreview({ appId: config.id, rows });
  };

  const applyGroupAppMigration = async () => {
    if (!groupAppMigrationPreview || groupAppMigrationPreview.appId !== selectedGroupAppMigrationId) return;
    const changingRows = groupAppMigrationPreview.rows.filter(r => r.willChange);
    if (changingRows.length === 0) {
      alert('Nothing to apply -- no student needs a higher trophy count than they already have.');
      return;
    }
    const config = selectedGroupAppMigration;
    if (!window.confirm(`This will set new "${config.canonicalTitle}" per-part trophy values for ${changingRows.length} student/part combination(s), only where that raises the number. It will NOT change any existing trophy already given. Continue?`)) return;
    setIsApplyingGroupAppMigration(true);
    try {
      const batch = writeBatch(db);
      changingRows.forEach(row => {
        const studentRef = doc(db, `${publicDataPath}/students`, row.studentId);
        batch.update(studentRef, { [`earnedTrophies.${row.newKey}`]: row.proposedNew });
      });
      await batch.commit();
      alert(`Done. Updated ${changingRows.length} trophy value(s) under "${config.canonicalTitle}". The old lesson trophies were left untouched.`);
      setGroupAppMigrationPreview(null);
    } catch (err) {
      console.error('Error applying group app migration:', err);
      alert(`Migration failed: ${err.message || err}`);
    }
    setIsApplyingGroupAppMigration(false);
  };

  const handleDeleteOldGroupAppLessons = async (config) => {
    const targets = lessonBank.filter(l => Object.keys(config.map).includes(l.title));
    if (targets.length === 0) {
      alert('None of the old lessons were found in the Lesson Bank (maybe already deleted).');
      return;
    }
    if (!window.confirm(`Delete these ${targets.length} old Lesson Bank entries?\n\n${targets.map(t => `- ${t.title}`).join('\n')}\n\nStudents' already-earned trophies for them are NOT touched -- this only removes them from the Lesson Bank / Assign Lesson list.`)) {
      return;
    }
    try {
      await Promise.all(targets.map(t => deleteDoc(doc(db, `${publicDataPath}/lessonBank`, t.id))));
      alert(`Deleted ${targets.length} old lesson(s).`);
    } catch (err) {
      console.error('Error deleting old lessons:', err);
      alert(`Delete failed: ${err.message || err}`);
    }
  };

  const completedSessions = sessions
    .filter(s => s.endTime)
    .sort((a, b) => b.startTime.toDate() - a.startTime.toDate());
    
  const futureScheduleEntries = teacherSchedule.filter(
    entry => entry.startTime.toDate() > new Date()
  );

  const expiringSchedules = useMemo(() => {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); 
    
    const latestSchedules = {};
    teacherSchedule.forEach(entry => {
      const key = entry.studentUid === 'offline' ? `offline-${entry.studentName}` : entry.studentUid;
      if (!latestSchedules[key] || entry.startTime.toDate() > latestSchedules[key].startTime.toDate()) {
        latestSchedules[key] = entry;
      }
    });
    
    const expiring = [];
    Object.values(latestSchedules).forEach(entry => {
      const lastDate = entry.startTime.toDate();
      if (lastDate > now && lastDate <= twoWeeksFromNow) {
        expiring.push(entry);
      }
    });
    
    return expiring.sort((a,b) => a.startTime.toDate() - b.startTime.toDate()); 
  }, [teacherSchedule]);

  const pendingStudents = useMemo(() => students.filter(s => s.isActive === 'pending'), [students]);
  const pendingNameChanges = useMemo(() => students.filter(s => s.pendingName), [students]);
  const currentStudents = useMemo(() => students.filter(s => s.isActive === true || s.isActive === false), [students]);
  const trophyRequests = useMemo(() => students.filter(s => s.trophyRequested === true), [students]);
  
  const totalStudents = currentStudents.length;
  const activeStudents = currentStudents.filter(s => s.isActive === true).length;
  
  const filteredSendStudents = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    const scheduledTodayUids = new Set();
    const scheduledThisHourUids = new Set();

    teacherSchedule.forEach(entry => {
      if (entry.studentUid !== 'offline') {
        const entryStart = entry.startTime.toDate();
        const entryEnd = entry.endTime.toDate();
        
        if (entryStart.toDateString() === todayStr) {
          scheduledTodayUids.add(entry.studentUid);
          
          const nowMs = now.getTime();
          if (nowMs >= entryStart.getTime() - (15 * 60000) && nowMs <= entryEnd.getTime()) {
             scheduledThisHourUids.add(entry.studentUid);
          }
        }
      }
    });

    const searchStr = String(sendStudentSearch || '').toLowerCase(); 
    let baseList = students.filter(s => s.isActive === true);
    
    if (searchStr) {
      baseList = baseList.filter(s => s.name && typeof s.name === 'string' && s.name.toLowerCase().includes(searchStr));
    }
    
    return baseList.sort((a, b) => {
      const aThisHour = scheduledThisHourUids.has(a.id);
      const bThisHour = scheduledThisHourUids.has(b.id);
      if (aThisHour && !bThisHour) return -1;
      if (!aThisHour && bThisHour) return 1;

      const aToday = scheduledTodayUids.has(a.id);
      const bToday = scheduledTodayUids.has(b.id);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [students, sendStudentSearch, teacherSchedule]);
  
  const filteredScheduleStudents = useMemo(() => {
    const searchStr = String(scheduleStudentSearch || '').toLowerCase(); 
    if (!searchStr) return students.filter(s => s.isActive === true); 
    return students.filter(s =>
      s.isActive === true && s.name && typeof s.name === 'string' && s.name.toLowerCase().startsWith(searchStr) 
    );
  }, [students, scheduleStudentSearch]);

  const attendanceSummary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let weekAttended = 0, weekAbsent = 0;
    let monthAttended = 0, monthAbsent = 0;
    let yearAttended = 0, yearAbsent = 0;

    const tally = (isAttended, isAbsent, entryDate) => {
      if (entryDate >= startOfWeek) {
        if (isAttended) weekAttended++;
        if (isAbsent) weekAbsent++;
      }
      if (entryDate >= startOfMonth) {
        if (isAttended) monthAttended++;
        if (isAbsent) monthAbsent++;
      }
      if (entryDate >= startOfYear) {
        if (isAttended) yearAttended++;
        if (isAbsent) yearAbsent++;
      }
    };

    teacherSchedule.forEach(entry => {
       const entryDate = entry.startTime.toDate();
       if (entryDate > now) return;

       const status = getStudentAttendanceForEntry(entry, entry.studentUid, sessions);
       tally(status === 'attended', status === 'absent', entryDate);
    });

    return { weekAttended, weekAbsent, monthAttended, monthAbsent, yearAttended, yearAbsent };
  }, [teacherSchedule, sessions]);

  const openAttendanceModal = (student) => {
    if (student.id !== 'offline' && student.displayId) {
      setSelectedStudentForHistory(student);
      setShowAttendanceModal(true);
    }
  };
  
  const closeAttendanceModal = () => {
    setShowAttendanceModal(false);
    setSelectedStudentForHistory(null);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };
  
  const closeEditModal = () => {
    setEditingEntry(null);
    setShowEditModal(false);
  };
  
  const handleRenewSchedule = (entry) => {
    if (entry.studentUid === 'offline') {
      setScheduleStudentType('offline');
      setManualStudentName(entry.studentName);
      setScheduleSelectedStudentUid('');
      setScheduleStudentSearch(''); 
    } else {
      setScheduleStudentType('online');
      setScheduleSelectedStudentUid(entry.studentUid);
      setScheduleStudentSearch(entry.studentName); 
      setManualStudentName('');
    }
    
    const lastDate = entry.startTime.toDate();
    const nextDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    setManualDate(toLocalDateString(nextDate));
    
    const formatTime = (date) => {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };
    setManualStartTime(formatTime(entry.startTime.toDate()));
    setManualEndTime(formatTime(entry.endTime.toDate()));
    
    setIsRecurring(true);
    
    const newEndDate = new Date(nextDate.getTime());
    newEndDate.setMonth(newEndDate.getMonth() + 3);
    setRecurEndDate(toLocalDateString(newEndDate));
  };

  return (
    <div className="p-6">
      <div className="fixed top-4 right-4 z-[9500]">
        <button
          onClick={() => setShowNotifDropdown(v => !v)}
          className="relative bg-white hover:bg-gray-50 border border-gray-200 rounded-full w-11 h-11 flex items-center justify-center shadow-lg text-xl"
          title="Notifications"
        >
          🔔
          {unreadAnnouncementCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
              {unreadAnnouncementCount > 9 ? '9+' : unreadAnnouncementCount}
            </span>
          )}
        </button>
        {showNotifDropdown && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-2 px-1">
              <p className="font-bold text-gray-700 text-sm">Notifications (past week)</p>
              {visibleAnnouncements.length > 0 && (
                <button onClick={dismissAllAnnouncements} className="text-xs text-gray-400 hover:text-gray-700 font-semibold">
                  Dismiss All
                </button>
              )}
            </div>
            {visibleAnnouncements.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No notifications this week.</p>
            )}
            <div className="space-y-2">
              {visibleAnnouncements.map(ann => (
                <div key={ann.id} className={`p-3 rounded-lg border text-sm relative ${ann._unseen ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                  <button onClick={() => dismissAnnouncement(ann.id)} className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-600 text-xs">✕</button>
                  <p className="font-bold text-yellow-900 pr-4">🎉 {ann.studentName}</p>
                  <p className="text-yellow-800">earned their <span className="font-black text-yellow-600">{ann.trophyCount}</span>th trophy! 🏆</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {fullScreenRosterGroup && (() => {
        // Some Parami students share a rented/borrowed device and need to
        // find their own ID quickly during class -- a big, projector-
        // friendly list of just this group's names + IDs, nothing else on
        // screen to distract from that.
        const rosterStudents = students
          .filter(s => (fullScreenRosterGroup.studentUids || []).includes(s.id) && !s.hideFromGroupRoster)
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-cyan-800">{fullScreenRosterGroup.groupName}</h2>
              <button
                onClick={() => setFullScreenRosterGroup(null)}
                className="bg-gray-800 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-900"
              >
                ✕ Close
              </button>
            </div>
            {rosterStudents.length === 0 ? (
              <p className="text-xl text-gray-500">No students in this group yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {rosterStudents.map(student => (
                  <div key={student.id} className="bg-cyan-50 border-2 border-cyan-200 rounded-2xl p-5 text-center">
                    <p className="text-xl font-bold text-gray-800 break-words">{student.name}</p>
                    <p className="text-2xl font-mono font-extrabold text-cyan-700 mt-2 tracking-wider">{student.displayId}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
      <ConfirmationModal
        isOpen={showConfirmModal.isOpen} onClose={() => setShowConfirmModal({ isOpen: false })}
        onConfirm={showConfirmModal.onConfirm} title={showConfirmModal.title}
        message={showConfirmModal.message} confirmText={showConfirmModal.confirmText}
        confirmColor={showConfirmModal.confirmColor}
      />
      <ConfirmationModal 
        isOpen={showDeleteModal.isOpen} onClose={closeDeleteModal}
        onConfirm={handleDeleteItem} title={`Delete ${showDeleteModal.type === 'lessonBank' ? 'Lesson' : (showDeleteModal.type === 'student' ? 'Student' : (showDeleteModal.type === 'group' ? 'Group' : 'Entry'))}`}
        message={showDeleteModal.message || `Are you sure you want to delete "${showDeleteModal.title}"? This cannot be undone.`}
        confirmText="Delete" confirmColor="bg-red-600 hover:bg-red-700"
      />
      <ConfirmationModal
        isOpen={showImportModal} onClose={() => setShowImportModal(false)}
        onConfirm={confirmImportData} title="Import Data"
        message="Warning: This will overwrite existing data with data from the backup file. This action cannot be undone. Are you sure?"
        confirmText="Import" confirmColor="bg-indigo-500 hover:bg-indigo-600"
      />
      <TrophyResetModal 
        isOpen={showTrophyResetPrompt} 
        onReset={handleResetAllTrophies} 
        onDecline={handleDeclineTrophyReset} 
      />
      <StarAnnouncementModal
        isOpen={showStarModal}
        onClose={() => setShowStarModal(false)}
        students={students}
        onSend={handleSendStarAnnouncement}
      />
      {greetingToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9600] max-w-md w-[90%]">
          <div className="bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-400 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <span className="text-3xl">🙏</span>
            <div className="flex-1">
              <p className="font-bold text-emerald-900">{greetingToast.studentName}</p>
              <p className="text-emerald-800 text-sm">Mangalabar ဘုန်းဘုန်း</p>
            </div>
            <button onClick={() => setGreetingToast(null)} className="text-emerald-500 hover:text-emerald-800 text-lg">✕</button>
          </div>
        </div>
      )}
      {mergeTargetId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4 text-purple-700">Merge Two Lessons</h3>
            <p className="text-sm text-gray-600 mb-4">
              "{mergeSourceTitle}" and "{mergeTargetTitle}" will be merged. Trophy counts will be combined automatically.
            </p>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">New Title</label>
              <input
                type="text"
                value={mergeNewTitle}
                onChange={(e) => setMergeNewTitle(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelMerge} disabled={isMerging} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={executeMergeLessons} disabled={isMerging || !mergeNewTitle.trim()} className="px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 shadow-md disabled:opacity-50">
                {isMerging ? 'Merging...' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <StudentAttendanceModal isOpen={showAttendanceModal} onClose={closeAttendanceModal} student={selectedStudentForHistory} />
      <EditScheduleModal isOpen={showEditModal} onClose={closeEditModal} onSave={handleUpdateSchedule} entry={editingEntry} students={students.filter(s => s.isActive)} />
      
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-3xl font-bold text-indigo-700">Teacher Dashboard</h2>
        {onOpenBodhiTree && (
          <button
            onClick={() => onOpenBodhiTree({ mode: 'teacher' })}
            className="flex items-center justify-center text-2xl bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors border border-emerald-200"
            title="My Bodhi Tree"
          >
            🌳
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-gray-300">
        <nav className="flex flex-wrap space-x-4">
          <button onClick={() => setViewMode('send')} className={`py-2 px-4 font-medium ${viewMode === 'send' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>Send Action</button>
          <button onClick={() => setViewMode('schedule')} className={`py-2 px-4 font-medium flex items-center ${viewMode === 'schedule' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-600 hover:text-emerald-600'}`}>
            My Schedule
            {expiringSchedules.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">{expiringSchedules.length}</span>
            )}
          </button>
          <button onClick={() => setViewMode('bank')} className={`py-2 px-4 font-medium ${viewMode === 'bank' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-gray-600 hover:text-sky-600'}`}>Lesson Bank</button>
          <button onClick={() => setViewMode('reports')} className={`py-2 px-4 font-medium ${viewMode === 'reports' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-600 hover:text-amber-600'}`}>Reports</button>
          <button onClick={() => setViewMode('students')} className={`relative py-2 px-4 font-medium ${viewMode === 'students' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-gray-600 hover:text-rose-600'}`}>
            Students
            {(pendingStudents.length > 0 || trophyRequests.length > 0) && (
              <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">{pendingStudents.length + trophyRequests.length}</span>
            )}
            {/* Small dot specifically for students requesting a name change —
                separate from the count badge above, which is for approvals
                and trophy requests, so a rename request never gets missed
                inside that number. */}
            {pendingNameChanges.length > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white animate-pulse"
                title={`${pendingNameChanges.length} student(s) requesting a name change`}
              ></span>
            )}
          </button>
          <button onClick={() => setViewMode('groups')} className={`py-2 px-4 font-medium ${viewMode === 'groups' ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-600 hover:text-cyan-600'}`}>
            Groups
          </button>
          <button onClick={() => setViewMode('settings')} className={`py-2 px-4 font-medium ${viewMode === 'settings' ? 'border-b-2 border-violet-500 text-violet-600' : 'text-gray-600'}`}>Settings</button>
          <button onClick={() => setViewMode('apps')} className={`py-2 px-4 font-medium ${viewMode === 'apps' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}>Apps</button>
        </nav>
      </div>

      {viewMode === 'apps' && (
        <div className="bg-blue-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-blue-200 max-w-lg mx-auto">
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Other Apps</h3>
          <p className="text-sm text-gray-600 mb-6">Open a connected app. More apps can be added here later.</p>
          <button
            onClick={() => onOpenSmartStudy && onOpenSmartStudy({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <span className="flex items-center text-lg font-bold text-blue-800">📚 Smart Study app</span>
            <span className="text-blue-500 text-xl">→</span>
          </button>
          <button
            onClick={() => onOpenAbhidhamma && onOpenAbhidhamma({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-amber-200 hover:border-amber-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-amber-800">📚 Abhidhamma app</span>
            <span className="text-amber-500 text-xl">→</span>
          </button>
          {/* Dhammaschool app — now mounted inline in the same project as
              SmartStudy/Abhidhamma/Myanmar Reader, so this switches the view
              instead of opening a new tab. */}
          <button
            onClick={() => onOpenDhammaschool && onOpenDhammaschool({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-orange-800">📖 Dhammaschool app</span>
            <span className="text-orange-500 text-xl">→</span>
          </button>
          {/* Myanmar Consonant Practice — mounted inline like the others above.
              No teacher/student distinction yet (no Firebase wiring in this
              app currently — that, plus trophy/score integration, comes in a
              later pass), so this just switches straight to it. */}
          {/* Burmese Consonant Learning Game — mounted inline like the others.
              No Firebase/trophy wiring yet either, same as Consonant Practice
              above (comes in a later pass). */}
          {/* Myanmar Number Learning / Vowels Learning — mounted inline like
              the others above, same "no Firebase/trophy wiring yet" note as
              Consonant Practice / Burmese Game. */}
          {/* Combined group entry — bundles Consonant Practice, Burmese
              Consonant Game, Vowels, Spelling, Consonant Endings and Sound
              Practice behind one "Choose a Part" screen so a teacher can
              assign all six as a single lesson. The individual apps above
              stay available too. */}
          <button
            onClick={() => onOpenReadingMyanmar && onOpenReadingMyanmar({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-blue-800">📚 Reading Myanmar app</span>
            <span className="text-blue-500 text-xl">→</span>
          </button>
          {/* Second combined group — bundles Myanmar Poems, Number Learning,
              Animal Sound Quiz, Burmese Learning Games, Interactive Learning
              Quiz and Time and Calendar behind one "Choose a Part" screen. */}
          <button
            onClick={() => onOpenSpeakingMyanmar && onOpenSpeakingMyanmar({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-orange-800">🗣️ Speaking Myanmar app</span>
            <span className="text-orange-500 text-xl">→</span>
          </button>
          {/* Third combined group — bundles Myanmar Part 1A, 1B, 2A and 2B
              behind one "Choose a Part" screen. */}
          <button
            onClick={() => onOpenMyanmarPart1And2 && onOpenMyanmarPart1And2({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-indigo-800">📘 Myanmar Part 1 & 2 app</span>
            <span className="text-indigo-500 text-xl">→</span>
          </button>
          {/* Watch & Learn — a plain list of external video links (no
              content of its own). Opening it here in teacher mode also
              shows the "Add a video" form, so new videos can be added
              without a code change. */}
          <button
            onClick={() => onOpenWatchAndLearn && onOpenWatchAndLearn({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-orange-800">🎥 Watch & Learn app</span>
            <span className="text-orange-500 text-xl">→</span>
          </button>
          {/* Myanmar Speaking app — now mounted inline in the same project as
              the other apps above, instead of opening the separately-hosted
              myanmar-wordcraft deployment in a new tab. */}
          <button
            onClick={() => onOpenMyanmarSpeaking && onOpenMyanmarSpeaking({})}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-purple-800">🗣️ Myanmar Speaker app</span>
            <span className="text-purple-500 text-xl">→</span>
          </button>
          {/* Myanmar Reader app — now mounted inline in the same project as
              SmartStudy/Abhidhamma, so this switches the view instead of
              opening a new tab. */}
          <button
            onClick={() => onOpenMyanmarReader && onOpenMyanmarReader({ mode: 'teacher' })}
            className="w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-teal-200 hover:border-teal-400 hover:shadow-md transition-all mt-3"
          >
            <span className="flex items-center text-lg font-bold text-teal-800">📗 Myanmar Reader app</span>
            <span className="text-teal-500 text-xl">→</span>
          </button>
        </div>
      )}

      {viewMode === 'schedule' && (
         <div className="flex flex-col md:flex-row gap-4 mb-6">
           <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide">This Week's Attendance</p>
                <div className="mt-1">
                  <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.weekAttended}</span>
                  <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.weekAbsent}</span>
                </div>
              </div>
           </div>
           <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100 flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-indigo-800 uppercase tracking-wide">This Month's Attendance</p>
                <div className="mt-1">
                  <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.monthAttended}</span>
                  <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.monthAbsent}</span>
                </div>
              </div>
           </div>
           <div className="bg-violet-50 p-4 rounded-xl shadow-sm border border-violet-100 flex-1 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-violet-800 uppercase tracking-wide">This Year's Attendance</p>
                <div className="mt-1">
                  <span className="text-gray-600 text-sm">Attended:</span> <span className="font-bold text-lg text-emerald-600 mr-4">{attendanceSummary.yearAttended}</span>
                  <span className="text-gray-600 text-sm">Absent:</span> <span className="font-bold text-lg text-red-600">{attendanceSummary.yearAbsent}</span>
                </div>
              </div>
           </div>
        </div>
      )}

      {viewMode === 'send' && (
        <form onSubmit={handleSendSubmit} className="bg-indigo-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-indigo-200">
          <h3 className="text-xl font-semibold mb-4 text-indigo-700">Send Action</h3>

          {lastTrophyAward && (
            <div className="mb-4 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-yellow-800 font-semibold">
                Awarded {lastTrophyAward.amount} trophy(s) to {lastTrophyAward.studentName}.
              </p>
              <button type="button" onClick={handleUndoTrophyAward} className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg shadow-md flex-shrink-0">
                ↩ Undo (within 30s)
              </button>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Action Type</label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button type="button" onClick={() => setSendActionType('lesson')} className={`w-1/2 p-2 rounded-lg font-semibold ${sendActionType === 'lesson' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>Assign Lesson</button>
              <button type="button" onClick={() => { setSendActionType('trophy'); setSendTargetType('student'); }} className={`w-1/2 p-2 rounded-lg font-semibold ${sendActionType === 'trophy' ? 'bg-white shadow text-yellow-600' : 'text-gray-600'}`}>Award Trophies Only</button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Target</label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button type="button" onClick={() => setSendTargetType('student')} className={`w-1/2 p-2 rounded-lg font-semibold ${sendTargetType === 'student' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>Single Student</button>
              <button type="button" disabled={sendActionType === 'trophy'} onClick={() => setSendTargetType('group')} className={`w-1/2 p-2 rounded-lg font-semibold ${sendTargetType === 'group' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`} title={sendActionType === 'trophy' ? "Trophies can only be awarded directly to a single student." : ""}>Group</button>
            </div>
          </div>
          
          {sendTargetType === 'student' ? (
            <div className="mb-4 relative">
              <label className="block text-gray-700 mb-2">Select Student</label>
              <input
                type="text" value={sendStudentSearch}
                onChange={(e) => {
                  setSendStudentSearch(e.target.value);
                  if (selectedStudentUid) setSelectedStudentUid(null); 
                  setIsSendDropdownOpen(true);
                }}
                onFocus={() => setIsSendDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsSendDropdownOpen(false), 200)} 
                placeholder="Type to search..."
                className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {isSendDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSendStudents.length > 0 ? (
                    filteredSendStudents.map(student => {
                      const now = new Date();
                      let isScheduledToday = false;
                      let isScheduledThisHour = false;
                      
                      teacherSchedule.forEach(entry => {
                        if (entry.studentUid === student.id) {
                          const entryStart = entry.startTime.toDate();
                          const entryEnd = entry.endTime.toDate();
                          if (entryStart.toDateString() === now.toDateString()) {
                            isScheduledToday = true;
                            const nowMs = now.getTime();
                            if (nowMs >= entryStart.getTime() - (15 * 60000) && nowMs <= entryEnd.getTime()) {
                              isScheduledThisHour = true;
                            }
                          }
                        }
                      });

                      return (
                        <div
                          key={student.id} onClick={() => { setSendStudentSearch(student.name); setSelectedStudentUid(student.id); setIsSendDropdownOpen(false); hasAutoSelectedSendStudentRef.current = true; }}
                          className={`p-3 cursor-pointer flex justify-between items-center ${isScheduledThisHour ? 'bg-rose-50 border-l-4 border-rose-500 hover:bg-rose-100' : isScheduledToday ? 'bg-indigo-50 hover:bg-indigo-100 border-l-4 border-indigo-500' : 'hover:bg-gray-50'}`}
                        >
                          <div>
                            <span className={isScheduledToday || isScheduledThisHour ? 'font-bold text-indigo-900' : ''}>{student.name}</span>
                            <span className="text-gray-500 text-sm ml-2">({student.displayId})</span>
                          </div>
                          {isScheduledThisHour ? (
                            <span className="text-xs font-semibold bg-rose-200 text-rose-800 px-2 py-1 rounded-md">Scheduled This Hour</span>
                          ) : isScheduledToday ? (
                            <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-1 rounded-md">Scheduled Today</span>
                          ) : null}
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-3 text-gray-500">No students found.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Select Group</label>
              <select value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); hasAutoSelectedGroupRef.current = true; }} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="" disabled>-- Select a group --</option>
                {groups.map(group => <option key={group.id} value={group.id}>{group.groupName} ({group.studentUids.length} students)</option>)}
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Select Lesson from Bank</label>
            <select value={selectedBankLessonId} onChange={(e) => { setSelectedBankLessonId(e.target.value); hasAutoSelectedBankLessonRef.current = true; setSendSmartStudyClassId(''); setSendAbhidhammaClassId(''); setSendGroupPartKey(''); setSendWatchLearnVideoKey(''); }} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="" disabled>-- Select a lesson --</option>
              {lessonBank.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title} ({lesson.details})</option>)}
            </select>
          </div>

          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'smartstudy://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📚 Smart Study app — choose a Class ID</label>
                {smartStudyClasses === null ? (
                  <button type="button" onClick={loadSmartStudyClassList}
                    className="w-full p-3 border rounded-lg bg-sky-50 text-sky-700 font-semibold hover:bg-sky-100"
                  >
                    Load Smart Study classes…
                  </button>
                ) : pickerLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading classes…</p>
                ) : smartStudyClasses.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No Smart Study classes found yet.</p>
                ) : (
                  <select
                    value={sendSmartStudyClassId}
                    onChange={(e) => setSendSmartStudyClassId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="" disabled>-- Choose a class --</option>
                    {smartStudyClasses.map(c => (
                      <option key={c.classId} value={c.classId}>{c.classId} ({c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'})</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'abhidhamma://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📚 Abhidhamma app — choose a Class ID</label>
                {abhidhammaClasses === null ? (
                  <button type="button" onClick={loadAbhidhammaClasses}
                    className="w-full p-3 border rounded-lg bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100"
                  >
                    Load Abhidhamma classes…
                  </button>
                ) : abhidhammaLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading classes…</p>
                ) : abhidhammaClasses.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No Abhidhamma classes found yet.</p>
                ) : (
                  <select
                    value={sendAbhidhammaClassId}
                    onChange={(e) => setSendAbhidhammaClassId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" disabled>-- Choose a class --</option>
                    {abhidhammaClasses.map(c => (
                      <option key={c.classId} value={c.classId}>{c.displayName || c.classId}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {/* Dhammaschool app — class picker (mirrors SmartStudy/Abhidhamma "choose a Class ID") */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'dhammaschool://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">📖 Dhammaschool app — choose a Class ID</label>
                {dhammaschoolClasses === null ? (
                  <button type="button" onClick={loadDhammaschoolClasses}
                    className="w-full p-3 border rounded-lg bg-orange-50 text-orange-700 font-semibold hover:bg-orange-100"
                  >
                    Load Dhammaschool classes…
                  </button>
                ) : dhammaschoolLoading ? (
                  <p className="text-gray-500 text-sm p-2">Loading classes…</p>
                ) : dhammaschoolClasses.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No public lessons found in Dhammaschool app yet.</p>
                ) : (
                  <select
                    value={sendDhammaschoolClassId}
                    onChange={(e) => setSendDhammaschoolClassId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="" disabled>-- Choose a class --</option>
                    {dhammaschoolClasses.map(c => (
                      <option key={c.classId} value={c.classId}>{c.classId} ({c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'})</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}


          {/* Grouped apps (Reading Myanmar / Speaking Myanmar / Myanmar Part 1 & 2)
              — choose which part to send, same "not baked into the bank
              entry" idea as Smart Study's class picker, but the part list
              is static (no Firestore fetch needed). */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            const scheme = selectedLesson ? groupSchemeOfLink(selectedLesson.link) : null;
            if (!selectedLesson || !scheme || selectedLesson.link !== scheme) return null;
            const parts = GROUP_PARTS_BY_SCHEME[scheme];
            const appLabel = selectedLesson.title || 'this app';
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">{appLabel} — choose a Part</label>
                <select
                  value={sendGroupPartKey}
                  onChange={(e) => setSendGroupPartKey(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>-- Choose a part --</option>
                  {parts.map(p => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* 🎥 Watch & Learn -- consolidates 5 old bare-link lessons (see the
              migration in Data Management) that each used to have their own
              trophy limit; picking a specific video here (not baked into the
              one shared Lesson Bank entry, same idea as the pickers above)
              keeps each video's trophies tracked separately again, same as
              before the merge. */}
          {(() => {
            const selectedLesson = lessonBank.find(l => l.id === selectedBankLessonId);
            if (!selectedLesson || selectedLesson.link !== 'watchandlearn://') return null;
            return (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">🎥 Watch & Learn — choose a Video</label>
                {watchLearnVideos.length === 0 ? (
                  <p className="text-gray-500 text-sm p-2">No videos added yet -- add one from the 🎥 Watch & Learn app (teacher mode) first.</p>
                ) : (
                  <select
                    value={sendWatchLearnVideoKey}
                    onChange={(e) => setSendWatchLearnVideoKey(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="" disabled>-- Choose a video --</option>
                    {watchLearnVideos.map(v => (
                      <option key={v.id} value={sanitizeKey(v.title)}>{v.title}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}

          {/* Abhidhamma student progress (when abhi class selected) */}


          {selectedStudentUid && selectedBankLessonId && sendTargetType === 'student' && (() => {
              const student = students.find(s => s.id === selectedStudentUid);
              const lesson = lessonBank.find(l => l.id === selectedBankLessonId);
              if (!student || !lesson) return null;

              const isAbhiForTrophy = lesson.link?.startsWith('abhidhamma://');
              const isDhammaschoolForTrophy = lesson.link?.startsWith('dhammaschool://');
              const ssClassForTrophy = (sendSmartStudyClassId && smartStudyClasses)
                ? (smartStudyClasses || []).find(c => c.classId === sendSmartStudyClassId)
                : null;
              const abhiClassForTrophy = (isAbhiForTrophy && sendAbhidhammaClassId && abhiTotalCount != null)
                ? { classId: sendAbhidhammaClassId, lessonCount: abhiTotalCount }
                : null;
              const dhammaschoolClassForTrophy = (isDhammaschoolForTrophy && sendDhammaschoolClassId && dhammaschoolStudentProgress?.totalLessons != null)
                ? { classId: sendDhammaschoolClassId, lessonCount: dhammaschoolStudentProgress.totalLessons }
                : null;
              const groupPartForTrophy = (GROUP_PARTS_BY_SCHEME[lesson.link] && sendGroupPartKey)
                ? { classId: groupPartLabel(lesson.link, sendGroupPartKey) || sendGroupPartKey }
                : null;
              const anyClassForTrophy = ssClassForTrophy || abhiClassForTrophy || dhammaschoolClassForTrophy || groupPartForTrophy;
              const effectiveUnitCountForDisplay = anyClassForTrophy
                ? (anyClassForTrophy.lessonCount || 0)
                : (lesson.unitCount || 0);

              // Same class-aware key/limit logic used by the actual award
              // function (getClassSpecificTrophyInfo) — this is what fixes the
              // "Previously Earned" number being a cross-class total instead of
              // this specific class's own trophies.
              //
              // For the no-class-selected aggregate view specifically: two
              // different attempts at summing per-class keys on top of the
              // bare legacy key each ended up double-counting for real
              // students (Abhidhamma's legacy bare key already held a
              // student's full historical total from before per-class
              // tracking existed, so adding newer per-class keys on top
              // overshot past Max Available). Reverted to the plain original
              // lookup -- correct for the cases checked so far -- until
              // there's a confirmed case showing exactly what the bare key
              // is missing.
              const { maxAvailable, lessonKey } = getClassSpecificTrophyInfo(lesson);
              const previouslyEarned = student.earnedTrophies?.[lessonKey] || 0;
              const remaining = Math.max(0, maxAvailable - previouslyEarned);

              const trackedCompletedUnit = student.completedUnits?.[lessonKey] || 0;
              const derivedCompletedUnit = (effectiveUnitCountForDisplay > 0 && maxAvailable > 0)
                ? Math.min(effectiveUnitCountForDisplay, Math.ceil((previouslyEarned * effectiveUnitCountForDisplay) / maxAvailable))
                : 0;
              const completedUnit = Math.max(trackedCompletedUnit, derivedCompletedUnit);

              const latestSessionForLesson = completedSessions.find(
                s => s.studentUid === student.id && s.lessonTitle === lesson.title && typeof s.completedUnit === 'number' && s.completedUnit > 0
              );
              const showNowFinished = latestSessionForLesson && latestSessionForLesson.completedUnit < completedUnit;

              return (
                  <div className="mb-4 space-y-3">

                    {lesson.unitCount > 0 && (
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-indigo-800 font-bold mb-1">
                          Student Progress on this {anyClassForTrophy ? `${anyClassForTrophy.classId} ` : ''}Lesson:
                        </p>
                        {(() => {
                          const displayedCompleted = isAbhiForTrophy
                            ? (abhiStudentCount ?? completedUnit)
                            : isDhammaschoolForTrophy
                              // Many Dhammaschool students studied via Google
                              // Slides outside the live app, so live
                              // completedCount is often stuck at 0 even for a
                              // student who's fully done and already has the
                              // trophies to prove it -- take whichever of the
                              // two is higher instead of always trusting live.
                              ? Math.max(dhammaschoolStudentProgress?.completedCount || 0, completedUnit)
                              : ssClassForTrophy
                                ? (ssStudentClassCount ?? completedUnit)
                                : (ssStudentTotalCount ?? completedUnit);
                          const displayedTotal = isAbhiForTrophy
                            ? (abhiTotalCount ?? effectiveUnitCountForDisplay)
                            : effectiveUnitCountForDisplay;
                          const unitLabel = (isAbhiForTrophy || isDhammaschoolForTrophy) ? 'Lesson' : (lesson.unitLabel || 'Lesson');
                          return displayedCompleted > 0 ? (
                            <p className="text-sm text-indigo-700">
                              {student.name} completed up to {unitLabel} {displayedCompleted} / {displayedTotal}.
                            </p>
                          ) : (
                            <p className="text-sm text-indigo-700">No progress reported yet for this lesson.</p>
                          );
                        })()}
                      </div>
                    )}

                    {maxAvailable > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 font-bold mb-2">
                          Trophy Status{anyClassForTrophy ? ` for ${anyClassForTrophy.classId}` : ' for this Lesson'}:
                        </p>
                        <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                          <li>Max Available: <strong>{maxAvailable}</strong></li>
                          <li>Previously Earned: <strong>{previouslyEarned}</strong></li>
                          <li>Remaining to Award: <strong>{remaining}</strong></li>
                        </ul>

                        {/* Bulk one-click action: only shows in the "whole app" view (no
                            specific class chosen) — auto-confirms trophies for every class
                            this student has fully finished, so the teacher doesn't have to
                            enter "Fix Previously Earned" one class at a time. */}
                        {lesson.link === 'abhidhamma://' && !sendAbhidhammaClassId && (
                          <button
                            type="button"
                            disabled={isReconcilingAllClasses}
                            onClick={handleReconcileAllAbhidhammaClasses}
                            className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-700 disabled:opacity-50 mb-3"
                          >
                            {isReconcilingAllClasses ? 'Checking every class...' : '⚡ Confirm trophies for every fully-completed class'}
                          </button>
                        )}
                        
                        {sendActionType === 'trophy' && remaining > 0 && (
                            <div className="flex items-center space-x-3 mt-3 border-t border-yellow-200 pt-3">
                                <label className="text-yellow-800 font-bold">Amount to Award:</label>
                                <input 
                                  type="number" min="1" max={remaining} 
                                  value={directTrophyAmount} 
                                  onChange={(e) => setDirectTrophyAmount(e.target.value)} 
                                  className="w-24 p-2 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-600 text-center font-bold text-yellow-900"
                                />
                            </div>
                        )}
                        {sendActionType === 'trophy' && remaining === 0 && (
                            <p className="text-red-500 font-bold mt-2">No trophies remaining to award for this lesson.</p>
                        )}
                      </div>
                    )}
                  </div>
              );
          })()}

          {sendActionType === 'lesson' ? (
             <button type="submit" className="w-full bg-indigo-500 text-white p-3 rounded-lg font-semibold hover:bg-indigo-600 transition-transform transform hover:scale-105 shadow-md">
               Assign Lesson
             </button>
          ) : (
             <button type="submit" className="w-full bg-yellow-500 text-white p-3 rounded-lg font-bold hover:bg-yellow-600 transition-transform transform hover:scale-105 shadow-md">
               Award Trophies Directly
             </button>
          )}
        </form>
      )}

      {viewMode === 'schedule' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleAddSchedule} className="bg-emerald-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-emerald-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Add Manual Schedule Entry</h3>
              <button type="button" onClick={() => setShowStarModal(true)} title="Announce Outstanding Student" className="text-2xl hover:scale-110 transition-transform">⭐</button>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Student Type</label>
              <select value={scheduleStudentType} onChange={(e) => setScheduleStudentType(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="online">Online Student</option>
                <option value="offline">Offline Student</option>
                <option value="group">Group</option>
              </select>
            </div>

            {scheduleStudentType === 'group' && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Select Group</label>
                <select value={scheduleSelectedGroupId} onChange={(e) => setScheduleSelectedGroupId(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="" disabled>-- Select a group --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.groupName} ({g.studentUids.length} students)</option>)}
                </select>
              </div>
            )}

            {scheduleStudentType === 'online' ? (
              <div className="mb-4 relative">
                <label className="block text-gray-700 mb-2">Select Student</label>
                <input
                  type="text" value={scheduleStudentSearch}
                  onChange={(e) => {
                    setScheduleStudentSearch(e.target.value); 
                    if (scheduleSelectedStudentUid) setScheduleSelectedStudentUid(null); 
                    setIsScheduleDropdownOpen(true);
                  }}
                  onFocus={() => setIsScheduleDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsScheduleDropdownOpen(false), 200)} 
                  placeholder="Type to search..." className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isScheduleDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredScheduleStudents.length > 0 ? (
                      filteredScheduleStudents.map(student => (
                        <div
                          key={student.id} onClick={() => { setScheduleStudentSearch(student.name); setScheduleSelectedStudentUid(student.id); setIsScheduleDropdownOpen(false); hasAutoSelectedScheduleStudentRef.current = true; }}
                          className="p-3 hover:bg-indigo-50 cursor-pointer"
                        >
                          {student.name} ({student.displayId})
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500">No students found.</div>
                    )}
                  </div>
                )}
              </div>
            ) : scheduleStudentType === 'offline' ? (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Student Name</label>
                <input type="text" value={manualStudentName} onChange={(e) => setManualStudentName(e.target.value)} placeholder="e.g., Offline Student" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ) : null}

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Date</label>
              <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Start Time</label>
                <input type="time" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">End Time</label>
                <input type="time" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div className="mb-4 space-y-2">
              <div className="flex items-center">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <label className="ml-2 block text-sm text-gray-900">Repeat weekly</label>
              </div>
              {isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repeat until</label>
                  <input type="date" value={recurEndDate} onChange={(e) => setRecurEndDate(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md">
              Add to Schedule
            </button>
          </form>
          
          <div className="space-y-8">
            {expiringSchedules.length > 0 && (
              <div className="bg-yellow-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-yellow-300">
                <h3 className="text-xl font-semibold mb-4 text-yellow-800">Schedules Needing Renewal</h3>
                <p className="text-sm text-yellow-700 mb-4">The following weekly schedules will expire within 2 weeks.</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {expiringSchedules.map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-semibold">{entry.studentName}</p>
                        <p className="text-sm text-gray-600">Expires on: {formatTimestamp(entry.startTime)}</p>
                      </div>
                      <button onClick={() => handleRenewSchedule(entry)} className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-600 shadow-md text-sm flex-shrink-0 w-full sm-w-auto">
                        Renew
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          
            <div className="bg-emerald-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-emerald-200">
               <h3 className="text-xl font-semibold mb-4 text-gray-800">Upcoming Scheduled Sessions</h3>
               <div className="space-y-3 max-h-96 overflow-y-auto">
                 {futureScheduleEntries.length === 0 ? <p>No upcoming sessions.</p> :
                  futureScheduleEntries.map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-lg group">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{entry.studentName}</p>
                          <p className="text-sm text-gray-600">{formatTimestamp(entry.startTime)}</p>
                          {entry.isRecurring && (
                            <span className="text-xs font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Recurring</span>
                          )}
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openDeleteModal(entry.id, entry.studentName, 'teacherSchedule')} className="text-red-500 hover:text-red-700" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                       </div>
                    </div>
                  ))
                 }
               </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleCreateGroup} className="bg-cyan-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-cyan-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Group</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Group Name</label>
              <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Grade 10A" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <button type="submit" className="w-full bg-cyan-500 text-white p-3 rounded-lg font-semibold hover:bg-cyan-600 transition-transform transform hover:scale-105 shadow-md">
              Create Group
            </button>
          </form>
          
          <div className="bg-cyan-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-cyan-200">
             <h3 className="text-xl font-semibold mb-4 text-gray-800">Manage Groups</h3>
             <div className="space-y-6 max-h-[600px] overflow-y-auto">
               {groups.length === 0 ? <p>No groups created yet.</p> : (
                 groups.map(group => (
                   <div key={group.id} className="bg-white p-4 rounded-lg border border-gray-200">
                     <div className="flex justify-between items-center mb-3">
                       <h4 className="text-lg font-semibold text-cyan-800">{group.groupName}</h4>
                       <div className="flex items-center gap-3">
                         <button onClick={() => setFullScreenRosterGroup(group)} className="text-cyan-700 hover:text-cyan-900 text-sm font-semibold whitespace-nowrap" title="Show this group's IDs full-screen">
                           🖥️ Show IDs
                         </button>
                         <button onClick={() => openDeleteModal(group.id, group.groupName, 'group')} className="text-red-500 hover:text-red-700" title="Delete Group">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                       </div>
                     </div>
                     <p className="text-sm text-gray-600 mb-3">Add or remove students from this group:</p>
                     <div className="space-y-2 max-h-48 overflow-y-auto">
                       {students.filter(s => s.isActive).map(student => {
                         const isChecked = group.studentUids.includes(student.id);
                         return (
                           <label key={student.id} className="flex items-center p-2 bg-gray-50 rounded-lg">
                             <input type="checkbox" checked={isChecked} onChange={(e) => handleToggleStudentInGroup(group.id, student.id, e.target.checked)} className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
                             <span className="ml-3 text-gray-800">{student.name} ({student.displayId})</span>
                           </label>
                         );
                       })}
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      {viewMode === 'settings' && (
        <div className="bg-violet-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-violet-200 max-w-lg mx-auto">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Data Management</h3>
          <p className="text-sm text-gray-600 mb-6">Your data is stored securely in the cloud. You can download a backup of your data as a JSON file.</p>

          <div className="mb-8 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
            <h4 className="text-lg font-semibold mb-2 text-orange-800">🔧 Missing Lesson Bank / Schedule / Groups?</h4>
            <p className="text-sm text-gray-700 mb-3">
              If you were ever locked out and had teacher access recovered, your existing data may still be tagged with your old account ID and won't show up. This finds and re-tags it to your current account — safe to run any time, even if nothing needs fixing.
            </p>
            <button onClick={handleRepairTeacherUid} disabled={isRepairingData} className="w-full bg-orange-500 text-white p-3 rounded-lg font-semibold hover:bg-orange-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50">
              {isRepairingData ? 'Repairing...' : 'Repair My Data'}
            </button>
          </div>
          
          <div className="mb-8">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Export Data</h4>
            <p className="text-sm text-gray-600 mb-4">Download all your data as a JSON file.</p>
            <button onClick={handleExportData} disabled={isExporting} className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50">
              {isExporting ? 'Exporting...' : 'Download Data Backup'}
            </button>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 text-gray-700">Import Data</h4>
            <p className="text-sm text-red-600 font-medium mb-4">Warning: This action will import and overwrite existing data. Cannot be undone.</p>
            <input 
              type="file" accept=".json" ref={importFileRef} onChange={handleImportFileSelect} disabled={isImporting}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            {isImporting && <p className="text-indigo-600 mt-4">Importing data, please wait...</p>}
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔍 Trophy Data Audit</h4>
            <p className="text-sm text-gray-600 mb-4">
              Read-only checks — nothing here writes any data. Use this to find other trophy mix-ups without checking every student one by one.
            </p>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Scan for impossible trophy counts</p>
              <p className="text-sm text-gray-500 mb-3">Flags any student whose earned trophies for a lesson exceed that lesson's own Max Available — a state that should never happen.</p>
              <button
                onClick={runLiveTrophyAudit}
                disabled={isRunningTrophyAudit}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningTrophyAudit ? 'Scanning...' : 'Scan Live Data'}
              </button>
              {trophyAuditResults?.liveScanDone && (
                trophyAuditResults.impossibleStates.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-semibold mt-3">✅ No impossible trophy counts found.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {trophyAuditResults.impossibleStates.map((f, i) => (
                      <div key={i} className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                        <strong>{f.studentName}</strong> — {f.lessonTitle}: has <strong className="text-red-700">{f.liveValue}</strong> trophies, but Max Available is only <strong>{f.max}</strong>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Compare against an old backup</p>
              <p className="text-sm text-gray-500 mb-3">Upload a previous "Download Data Backup" file (matched by student name) to see exactly which trophy/lesson numbers differ from right now — this doesn't touch live data at all, it just shows the differences.</p>
              <input
                type="file" accept=".json" ref={auditBackupFileRef} onChange={handleAuditBackupFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 mb-3"
              />
              {auditBackupFileName && (
                <p className="text-xs text-gray-500 mb-3">Selected: {auditBackupFileName}</p>
              )}
              <button
                onClick={runBackupComparisonAudit}
                disabled={isRunningTrophyAudit || !auditBackupFileContent}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningTrophyAudit ? 'Comparing...' : 'Compare to Old Backup'}
              </button>
              {trophyAuditResults?.backupComparison && (
                trophyAuditResults.backupComparison.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-semibold mt-3">✅ No differences found — everything matches the old backup.</p>
                ) : (
                  <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                    {trophyAuditResults.backupComparison.map((f, i) => (
                      <div key={i} className={`text-sm rounded-lg p-2 border ${f.type === 'missing_student' ? 'bg-gray-50 border-gray-200' : f.lostData ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        {f.type === 'missing_student' ? (
                          <><strong>{f.studentName}</strong> — in the old backup, but no matching student found live (name may have changed).</>
                        ) : (
                          <>
                            <strong>{f.studentName}</strong> — {f.field === 'earnedTrophies' ? 'trophies' : 'completed'} for "{f.key}": old backup had <strong className={f.lostData ? 'text-red-700' : ''}>{f.oldValue}</strong>, live now has <strong>{f.liveValue}</strong>
                            {f.lostData && <span className="ml-1 text-red-700 font-semibold">— possible data loss</span>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔄 Migrate Old Lessons into Smart Study</h4>
            <p className="text-sm text-gray-600 mb-4">
              One-time move for 4 old Gemini-link lessons ("10 Parami", "Heavenly World or Golden cage", "38 Blessings", "The Buddha's Eight Outer Victories") into the real per-class Smart Study tracking. Step 1 only calculates and shows a preview — nothing is written until you press Apply. Step 2 (deleting the old lessons) is separate and only removes them from the Lesson Bank; it never touches any student's already-earned trophies.
            </p>

            <div className="mb-5 p-4 bg-amber-50 rounded-lg border border-amber-300">
              <p className="font-semibold text-gray-800 mb-1">⚠️ 0. Clean up the first Apply (wrong title was used)</p>
              <p className="text-sm text-gray-600 mb-3">The very first Apply wrote trophies under a placeholder "Smart Study" title before we knew the real Lesson Bank entry is titled "Smart Study Lesson" — those values are stranded under a key nothing reads (which is why nothing changed on Aaron's page). Run this once to remove them, then redo Preview → Apply below so they get written under the correct key.</p>
              <button
                onClick={runSsCleanupScan}
                disabled={isRunningSsCleanup}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {isRunningSsCleanup ? 'Scanning...' : 'Scan for Stray Keys'}
              </button>
              {ssCleanupPreview && (
                ssCleanupPreview.rows.length === 0 && !ssCleanupPreview.duplicateEntry ? (
                  <p className="text-sm text-emerald-600 font-semibold mt-3">✅ Nothing to clean up.</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mt-3 mb-2">
                      {ssCleanupPreview.rows.length} stray field(s) found across {new Set(ssCleanupPreview.rows.map(r => r.studentId)).size} student(s).
                      {ssCleanupPreview.duplicateEntry && <> Also found a duplicate Lesson Bank entry titled "{ssCleanupPreview.duplicateEntry.title}" (unused placeholder).</>}
                    </p>
                    <button
                      onClick={applySsCleanup}
                      disabled={isRunningSsCleanup}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      Remove {ssCleanupPreview.rows.length} Stray Field(s){ssCleanupPreview.duplicateEntry ? ' + Duplicate Entry' : ''}
                    </button>
                  </>
                )
              )}
            </div>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Preview the Smart Study trophy migration</p>
              <p className="text-sm text-gray-500 mb-3">For every affected student, checks their real live progress in each mapped Smart Study class (or uses the old fixed number only if that class has no Smart Study tracking at all), and shows what would change.</p>
              <button
                onClick={runSmartStudyMigrationPreview}
                disabled={isRunningSsMigration}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningSsMigration ? 'Calculating...' : 'Run Migration Preview'}
              </button>

              {ssMigrationPreview && (
                <div className="mt-4">
                  {ssMigrationPreview.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No students currently have trophies under these 4 old lessons.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left border">Student</th>
                              <th className="p-2 text-left border">Old Lesson</th>
                              <th className="p-2 text-left border">→ Class</th>
                              <th className="p-2 text-left border">Basis</th>
                              <th className="p-2 text-left border">Current New</th>
                              <th className="p-2 text-left border">Proposed New</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ssMigrationPreview.rows.map((r, i) => (
                              <tr key={i} className={r.willChange ? 'bg-emerald-50' : ''}>
                                <td className="p-2 border">{r.studentName}</td>
                                <td className="p-2 border">{r.oldTitle.trim()}</td>
                                <td className="p-2 border">{r.classId}</td>
                                <td className="p-2 border">
                                  {r.basis === 'live'
                                    ? `live (${r.liveCompleted}/${r.liveTotal} lessons)`
                                    : <span className="text-amber-700">fallback (no live class found)</span>}
                                </td>
                                <td className="p-2 border">{r.currentNew}</td>
                                <td className="p-2 border font-semibold">
                                  {r.proposedNew}{r.willChange && <span className="text-emerald-700 ml-1">(+{r.proposedNew - r.currentNew})</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={applySmartStudyMigration}
                        disabled={isApplyingSsMigration || ssMigrationPreview.rows.every(r => !r.willChange)}
                        className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isApplyingSsMigration ? 'Applying...' : `Apply — set ${ssMigrationPreview.rows.filter(r => r.willChange).length} value(s)`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Delete the 5 old lessons from the Lesson Bank</p>
              <p className="text-sm text-gray-500 mb-3">"10 Parami", "Heavenly World or Golden cage", "38 Blessings", "The Buddha's Eight Outer Victories", and "Kind and Respectful" (no migration mapping — deleted anyway per teacher request). Only do this after Step 1's Apply has been run. Removes them from the Lesson Bank / Assign Lesson list only — does not touch any student's data.</p>
              <button
                onClick={handleDeleteOldSmartStudyLessons}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete Old Lessons
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔄 Migrate Old Lessons into Abhidhamma</h4>
            <p className="text-sm text-gray-600 mb-4">
              Same one-time move as Smart Study above, for the old Gemini-link Abhidhamma lessons ("Basic Abhiddhamma-2" through "-5", "Being Good and Being Kind", "The Great Buddhist Lady"/"Layman", "Dhammapada Chapter-1") into the real per-class Abhidhamma tracking under the "Abhidhamma Lesson" entry. "Basic Abhiddhamma" (the original bare lesson) isn't included yet — not assigned to a class.
            </p>

            <div className="mb-5 p-4 bg-amber-50 rounded-lg border border-amber-300">
              <p className="font-semibold text-gray-800 mb-1">⚠️ 0. Clean up the first Apply (wrong class ID guessed)</p>
              <p className="text-sm text-gray-600 mb-3">The first Apply guessed the old lessons' own spelling ("Basic Abhiddhamma-3") as the class ID instead of the real one ("BASIC-ABHIDHAMMA-3"), so those values are stranded under a key nothing reads. Run this once to remove them, then redo Preview → Apply below.</p>
              <button
                onClick={runAbhiCleanupScan}
                disabled={isRunningAbhiCleanup}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {isRunningAbhiCleanup ? 'Scanning...' : 'Scan for Stray Keys'}
              </button>
              {abhiCleanupPreview && (
                abhiCleanupPreview.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-semibold mt-3">✅ Nothing to clean up.</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mt-3 mb-2">{abhiCleanupPreview.length} stray field(s) found across {new Set(abhiCleanupPreview.map(r => r.studentId)).size} student(s).</p>
                    <button
                      onClick={applyAbhiCleanup}
                      disabled={isRunningAbhiCleanup}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      Remove {abhiCleanupPreview.length} Stray Field(s)
                    </button>
                  </>
                )
              )}
            </div>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Preview the Abhidhamma trophy migration</p>
              <p className="text-sm text-gray-500 mb-3">Checks real live progress in each mapped Abhidhamma class where available; "THE GREAT BUDDHISTS" and "DHAMMAPADA-1" have no completion data recorded yet, so those always carry over the student's existing trophy count directly instead.</p>
              <button
                onClick={runAbhidhammaMigrationPreview}
                disabled={isRunningAbhiMigration}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningAbhiMigration ? 'Calculating...' : 'Run Migration Preview'}
              </button>

              {abhiMigrationPreview && (
                <div className="mt-4">
                  {abhiMigrationPreview.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No students currently have trophies under these old lessons.</p>
                  ) : (
                    <>
                      {abhiMigrationPreview.rows.some(r => r.basis === 'not-found') && (
                        <p className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 mb-3">
                          ⚠️ Some target classes weren't found live (shown as "not found" below) — double-check those class names before applying.
                        </p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left border">Student</th>
                              <th className="p-2 text-left border">Old Lesson</th>
                              <th className="p-2 text-left border">→ Class</th>
                              <th className="p-2 text-left border">Basis</th>
                              <th className="p-2 text-left border">Current New</th>
                              <th className="p-2 text-left border">Proposed New</th>
                            </tr>
                          </thead>
                          <tbody>
                            {abhiMigrationPreview.rows.map((r, i) => (
                              <tr key={i} className={r.willChange ? 'bg-emerald-50' : ''}>
                                <td className="p-2 border">{r.studentName}</td>
                                <td className="p-2 border">{r.oldTitle.trim()}</td>
                                <td className="p-2 border">{r.classId}</td>
                                <td className="p-2 border">
                                  {r.basis === 'live'
                                    ? `live (${r.liveCompleted}/${r.liveTotal} lessons)`
                                    : r.basis === 'not-found'
                                      ? <span className="text-red-700 font-semibold">not found — check class name</span>
                                      : <span className="text-amber-700">fallback (carried over from old trophy)</span>}
                                </td>
                                <td className="p-2 border">{r.currentNew}</td>
                                <td className="p-2 border font-semibold">
                                  {r.proposedNew}{r.willChange && <span className="text-emerald-700 ml-1">(+{r.proposedNew - r.currentNew})</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={applyAbhidhammaMigration}
                        disabled={isApplyingAbhiMigration || abhiMigrationPreview.rows.every(r => !r.willChange)}
                        className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isApplyingAbhiMigration ? 'Applying...' : `Apply — set ${new Set(abhiMigrationPreview.rows.filter(r => r.willChange).map(r => `${r.studentId}::${r.newKey}`)).size} value(s)`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Delete the old lessons from the Lesson Bank</p>
              <p className="text-sm text-gray-500 mb-3">Only do this after Step 1's Apply has been run. Removes them from the Lesson Bank / Assign Lesson list only — does not touch any student's data. "Basic Abhiddhamma" is not included (not migrated yet).</p>
              <button
                onClick={handleDeleteOldAbhidhammaLessons}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete Old Lessons
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔄 Migrate Old Lessons into Dhammaschool</h4>
            <p className="text-sm text-gray-600 mb-4">
              Same one-time move as above, for the 5 old Myanmar-titled Dhammaschool grade lessons into the real per-class Dhammaschool tracking under the "Dhammaschool Lesson" entry (GRADE-1 through GRADE-5).
            </p>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Preview the Dhammaschool trophy migration</p>
              <p className="text-sm text-gray-500 mb-3">Checks real live progress in each mapped grade class.</p>
              <button
                onClick={runDhammaschoolMigrationPreview}
                disabled={isRunningDsMigration}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isRunningDsMigration ? 'Calculating...' : 'Run Migration Preview'}
              </button>

              {dsMigrationPreview && (
                <div className="mt-4">
                  {dsMigrationPreview.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No students currently have trophies under these old lessons.</p>
                  ) : (
                    <>
                      {dsMigrationPreview.rows.some(r => r.basis === 'not-found') && (
                        <p className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 mb-3">
                          ⚠️ Some target classes weren't found live (shown as "not found" below) — double-check those class IDs before applying.
                        </p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left border">Student</th>
                              <th className="p-2 text-left border">Old Lesson</th>
                              <th className="p-2 text-left border">→ Class</th>
                              <th className="p-2 text-left border">Basis</th>
                              <th className="p-2 text-left border">Current New</th>
                              <th className="p-2 text-left border">Proposed New</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dsMigrationPreview.rows.map((r, i) => (
                              <tr key={i} className={r.willChange ? 'bg-emerald-50' : ''}>
                                <td className="p-2 border">{r.studentName}</td>
                                <td className="p-2 border">{r.oldTitle.trim()}</td>
                                <td className="p-2 border">{r.classId}</td>
                                <td className="p-2 border">
                                  {r.basis === 'live'
                                    ? `live (${r.liveCompleted}/${r.liveTotal} lessons)`
                                    : r.basis === 'fallback'
                                      ? <span className="text-amber-700">fallback (old trophy, live: {r.liveCompleted}/{r.liveTotal})</span>
                                      : <span className="text-red-700 font-semibold">not found — check class ID</span>}
                                </td>
                                <td className="p-2 border">{r.currentNew}</td>
                                <td className="p-2 border font-semibold">
                                  {r.proposedNew}{r.willChange && <span className="text-emerald-700 ml-1">(+{r.proposedNew - r.currentNew})</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={applyDhammaschoolMigration}
                        disabled={isApplyingDsMigration || dsMigrationPreview.rows.every(r => !r.willChange)}
                        className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isApplyingDsMigration ? 'Applying...' : `Apply — set ${new Set(dsMigrationPreview.rows.filter(r => r.willChange).map(r => `${r.studentId}::${r.newKey}`)).size} value(s)`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Delete the old lessons from the Lesson Bank</p>
              <p className="text-sm text-gray-500 mb-3">Only do this after Step 1's Apply has been run. Removes them from the Lesson Bank / Assign Lesson list only — does not touch any student's data.</p>
              <button
                onClick={handleDeleteOldDhammaschoolLessons}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete Old Lessons
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔄 Migrate Old Lessons into Reading/Speaking Myanmar</h4>
            <p className="text-sm text-gray-600 mb-4">
              These apps track no student name, score, or class id at all, so there's no live progress to check — every value here is a direct carry-over of the old trophy count.
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Which app</label>
              <select
                value={selectedGroupAppMigrationId}
                onChange={(e) => { setSelectedGroupAppMigrationId(e.target.value); setGroupAppMigrationPreview(null); }}
                className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {GROUP_APP_MIGRATIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Preview the {selectedGroupAppMigration.label} trophy migration</p>
              <button
                onClick={runGroupAppMigrationPreview}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600"
              >
                Run Migration Preview
              </button>

              {groupAppMigrationPreview && groupAppMigrationPreview.appId === selectedGroupAppMigrationId && (
                <div className="mt-4">
                  {groupAppMigrationPreview.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No students currently have trophies under these old lessons.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left border">Student</th>
                              <th className="p-2 text-left border">Old Lesson</th>
                              <th className="p-2 text-left border">→ Part</th>
                              <th className="p-2 text-left border">Current New</th>
                              <th className="p-2 text-left border">Proposed New</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupAppMigrationPreview.rows.map((r, i) => (
                              <tr key={i} className={r.willChange ? 'bg-emerald-50' : ''}>
                                <td className="p-2 border">{r.studentName}</td>
                                <td className="p-2 border">{r.oldTitle.trim()}</td>
                                <td className="p-2 border">{r.partKey}</td>
                                <td className="p-2 border">{r.currentNew}</td>
                                <td className="p-2 border font-semibold">
                                  {r.proposedNew}{r.willChange && <span className="text-emerald-700 ml-1">(+{r.proposedNew - r.currentNew})</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        onClick={applyGroupAppMigration}
                        disabled={isApplyingGroupAppMigration || groupAppMigrationPreview.rows.every(r => !r.willChange)}
                        className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isApplyingGroupAppMigration ? 'Applying...' : `Apply — set ${groupAppMigrationPreview.rows.filter(r => r.willChange).length} value(s)`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Delete the old {selectedGroupAppMigration.label} lessons from the Lesson Bank</p>
              <p className="text-sm text-gray-500 mb-3">Only do this after Step 1's Apply has been run. Removes them from the Lesson Bank / Assign Lesson list only — does not touch any student's data.</p>
              <button
                onClick={() => handleDeleteOldGroupAppLessons(selectedGroupAppMigration)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete Old Lessons
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔧 Fix Myanmar Reader Progress Scale</h4>
            <p className="text-sm text-gray-600 mb-4">
              Myanmar Reader used to be two separate Lesson Bank entries (Sheet A + Sheet B, 29 chapters each). Merging them into one summed each student's old progress together (e.g. 19 + 19 = 38), and left "Total Number" at the summed 58 instead of the real 29 chapters. Editing "Total Number" by hand in Edit Lesson only changes this Lesson Bank entry — it does not reach any student already sent this lesson (each keeps its own snapshot from when it was sent), which is what made a hand edit confusing. This one preview covers everywhere that number lives: the Lesson Bank entry, every already-sent assignment, and each student's summed progress number. It does not touch any trophy already earned.
            </p>
            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">Preview the fix</p>
              <button
                onClick={runMyanmarReaderScaleFixPreview}
                disabled={isFixingMyanmarReaderScale}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50"
              >
                {isFixingMyanmarReaderScale ? 'Working...' : 'Run Preview'}
              </button>

              {myanmarReaderScaleFixPreview && (() => {
                const preview = myanmarReaderScaleFixPreview;
                const totalChanges = (preview.bankEntry ? 1 : 0) + preview.assignedDocs.length + preview.completedUnitRows.length;
                return (
                <div className="mt-4">
                  {totalChanges === 0 ? (
                    <p className="text-sm text-gray-500">Nothing to fix — Myanmar Reader's Total Number already reads {preview.realChapterCount} everywhere.</p>
                  ) : (
                    <>
                      {preview.bankEntry && (
                        <p className="text-sm text-gray-700 mb-2">
                          Lesson Bank "Total Number": <strong>{preview.bankEntry.oldUnitCount}</strong> → <strong>{preview.realChapterCount}</strong>
                        </p>
                      )}
                      {preview.assignedDocs.length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Already-sent assignments to fix ({preview.assignedDocs.length}):</p>
                          <table className="min-w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left border">Student</th>
                                <th className="p-2 text-left border">Current Total Number</th>
                                <th className="p-2 text-left border">Fixed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.assignedDocs.map((r) => (
                                <tr key={r.docId} className="bg-emerald-50">
                                  <td className="p-2 border">{r.studentName}</td>
                                  <td className="p-2 border">{r.oldUnitCount}</td>
                                  <td className="p-2 border font-semibold">{preview.realChapterCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {preview.completedUnitRows.length > 0 && (
                        <div className="overflow-x-auto mb-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Progress numbers to halve ({preview.completedUnitRows.length}):</p>
                          <table className="min-w-full text-sm border">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left border">Student</th>
                                <th className="p-2 text-left border">Current (stored)</th>
                                <th className="p-2 text-left border">Fixed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.completedUnitRows.map((r) => (
                                <tr key={r.studentId} className="bg-emerald-50">
                                  <td className="p-2 border">{r.studentName}</td>
                                  <td className="p-2 border">{r.oldValue}</td>
                                  <td className="p-2 border font-semibold">{r.newValue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <button
                        onClick={applyMyanmarReaderScaleFix}
                        disabled={isFixingMyanmarReaderScale}
                        className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isFixingMyanmarReaderScale ? 'Fixing...' : `Apply — fix ${totalChanges} thing(s)`}
                      </button>
                    </>
                  )}
                </div>
                );
              })()}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔄 Migrate Old Lessons into 🎥 Watch & Learn</h4>
            <p className="text-sm text-gray-600 mb-4">
              "Animated Buddhist Stories", "Kyaw Hein 🎦", "Story", "Watch 🎥", and "Combine Link" were 5 separate bare-link Lesson Bank entries — no content of their own, just a YouTube link a student watches and reports back on. This combines them into one "🎥 Watch & Learn" entry with a real list screen (more videos can be added there later, right from the app, without needing a new Lesson Bank entry each time). Each student's trophies already earned across all 5 old titles are summed into the new one — never lowered, and nothing is deleted from the old titles unless you use Step 2 below.
            </p>
            <div className="mb-5 p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">1. Preview and apply the trophy migration</p>
              <button
                onClick={runWatchLearnMigrationPreview}
                className="bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-600"
              >
                Run Migration Preview
              </button>

              {watchLearnMigrationPreview && (
                <div className="mt-4">
                  {!watchLearnMigrationPreview.bankEntryExists && (
                    <p className="text-sm text-indigo-700 mb-2">The "🎥 Watch & Learn" Lesson Bank entry doesn't exist yet — Apply will create it (Total Number: {WATCH_LEARN_UNIT_COUNT} Minutes, Max Trophies: {WATCH_LEARN_TROPHY_LIMIT}).</p>
                  )}
                  {watchLearnMigrationPreview.rows.length === 0 ? (
                    <p className="text-sm text-gray-500">No students currently have trophies under these old titles.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left border">Student</th>
                            <th className="p-2 text-left border">Sum of Old Titles</th>
                            <th className="p-2 text-left border">Current New</th>
                            <th className="p-2 text-left border">Proposed New</th>
                          </tr>
                        </thead>
                        <tbody>
                          {watchLearnMigrationPreview.rows.map((r) => (
                            <tr key={r.studentId} className={r.proposedNew > r.currentNew ? 'bg-emerald-50' : ''}>
                              <td className="p-2 border">{r.studentName}</td>
                              <td className="p-2 border">{r.sumOld}</td>
                              <td className="p-2 border">{r.currentNew}</td>
                              <td className="p-2 border font-semibold">
                                {r.proposedNew}{r.proposedNew > r.currentNew && <span className="text-emerald-700 ml-1">(+{r.proposedNew - r.currentNew})</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    onClick={applyWatchLearnMigration}
                    disabled={isApplyingWatchLearnMigration}
                    className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isApplyingWatchLearnMigration ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-violet-200">
              <p className="font-semibold text-gray-800 mb-1">2. Delete the old lessons from the Lesson Bank</p>
              <p className="text-sm text-gray-500 mb-3">Only do this after Step 1's Apply has been run. Removes them from the Lesson Bank / Assign Lesson list only — does not touch any student's data.</p>
              <button
                onClick={handleDeleteOldWatchLearnLessons}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete Old Lessons
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-violet-200">
            <h4 className="text-lg font-semibold mb-3 text-gray-700">🔑 Teacher Account Recovery Passcode</h4>
            <p className="text-sm text-gray-600 mb-2">
              Teacher access is normally tied to this browser/device. If you ever get logged out (cleared browser data, new device, etc.), this passcode lets you reclaim teacher access instead of needing a database edit.
            </p>
            <p className="text-sm font-semibold mb-4">
              {teacherConfigData?.passcode
                ? <span className="text-emerald-600">✓ A recovery passcode is set.</span>
                : <span className="text-red-600">⚠ No recovery passcode set yet — set one now so you're never locked out.</span>}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={recoveryPasscodeInput}
                onChange={(e) => setRecoveryPasscodeInput(e.target.value)}
                placeholder={teacherConfigData?.passcode ? 'New passcode (replaces old one)' : 'Choose a passcode'}
                className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleSaveRecoveryPasscode}
                disabled={recoveryPasscodeSaving}
                className="px-5 py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50 flex-shrink-0"
              >
                {recoveryPasscodeSaving ? 'Saving...' : (teacherConfigData?.passcode ? 'Change' : 'Set Passcode')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'reports' && (
        <div className="space-y-6">
          <div className="flex space-x-4 mb-2">
            <button
              onClick={() => setReportTab('feedback')}
              className={`px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors ${reportTab === 'feedback' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'}`}
            >
              Feedback Reports
            </button>
            <button
              onClick={() => setReportTab('attendance')}
              className={`px-5 py-2.5 rounded-lg font-semibold shadow-md transition-colors ${reportTab === 'attendance' ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'}`}
            >
              Attendance Reports
            </button>
          </div>

          {reportTab === 'feedback' && (() => {
            const oneMonthAgo = new Date();
            oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
            const recentSessions = showAllReports
              ? completedSessions
              : completedSessions.filter(s => s.endTime.toDate() >= oneMonthAgo);
            const hiddenCount = completedSessions.length - recentSessions.length;

            return (
              <div className="bg-amber-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-amber-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Student Feedback Reports</h3>
                {!showAllReports && (
                  <p className="text-sm text-gray-600 mb-4">Showing reports from the last 30 days.</p>
                )}
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {recentSessions.length === 0 ? <p className="text-gray-500 font-medium">No feedback yet.</p> :
                    recentSessions.map(session => {
                      const student = students.find(s => s.id === session.studentUid);
                      return (
                        <div key={session.id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-900">
                            {session.lessonTitle}
                            {session.lessonLink && extractSmartStudyClassId(session.lessonLink) && (
                              <span className="text-sm font-semibold text-blue-600 ml-1">— {extractSmartStudyClassId(session.lessonLink)}</span>
                            )}
                            {session.lessonLink && session.lessonLink.startsWith('abhidhamma://') && extractAbhidhammaLessonId(session.lessonLink) && (
                              <span className="text-sm font-semibold text-blue-600 ml-1">— {extractAbhidhammaLessonId(session.lessonLink)}</span>
                            )}
                            {session.lessonLink && session.lessonLink.startsWith('dhammaschool://') && extractDhammaschoolClassId(session.lessonLink) && (
                              <span className="text-sm font-semibold text-blue-600 ml-1">— {extractDhammaschoolClassId(session.lessonLink)}</span>
                            )}
                          </p>
                          <p className="text-sm font-medium text-indigo-700">Student: {student ? student.name : 'Unknown'}</p>
                          <p className="text-sm text-gray-600">Completed: {formatTimestamp(session.endTime)}</p>
                          <p className="text-sm text-gray-600">Duration: {getDuration(session.startTime, session.endTime)}</p>
                          <div className="mt-2 p-3 bg-white rounded-lg border">
                            <p className="text-sm font-semibold">Feedback:</p>
                            <p className="text-sm text-gray-700 mb-1">{session.feedbackNotes || 'N/A'}</p>
                            <p className="text-sm font-semibold mt-2">Score:</p>
                            <p className="text-sm text-gray-700">{session.score || 'N/A'}</p>
                            {session.completedUnit && session.completedUnit > 0 ? (
                              <p className="text-sm font-semibold text-indigo-600 mt-2">
                                {student ? student.name : 'This student'} completed up to {session.lessonUnitLabel || 'Chapter'} {Math.max(session.previousCompletedUnit || 0, session.completedUnit)}{session.lessonUnitCount ? ` / ${session.lessonUnitCount}` : ''}.
                                {session.completedUnit < (session.previousCompletedUnit || 0) && (
                                  <> Now finished {session.lessonUnitLabel || 'Chapter'} {session.completedUnit}.</>
                                )}
                              </p>
                            ) : null}
                            {session.awardedTrophies && session.awardedTrophies > 0 ? (
                              <p className="text-sm font-semibold text-yellow-600 mt-2">🏆 Trophies Awarded: {session.awardedTrophies}</p>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
                {!showAllReports && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllReports(true)}
                    className="mt-4 w-full bg-amber-500 text-white p-3 rounded-lg font-semibold hover:bg-amber-600 shadow-md"
                  >
                    Show Older Reports ({hiddenCount} more)
                  </button>
                )}
                {showAllReports && (
                  <button
                    onClick={() => setShowAllReports(false)}
                    className="mt-4 w-full bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold hover:bg-gray-400 shadow-md"
                  >
                    Show Only Last 30 Days
                  </button>
                )}
              </div>
            );
          })()}

          {reportTab === 'attendance' && (
            <AttendanceReports students={students} teacherSchedule={teacherSchedule} sessions={sessions} />
          )}
        </div>
      )}

      {viewMode === 'students' && (
        <div className="bg-rose-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-rose-200">
          
          {trophyRequests.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-yellow-800">
                🏆 Trophy Requests <span className="ml-3 text-base font-normal">({trophyRequests.length} pending)</span>
              </h3>
              <div className="space-y-4">
                {trophyRequests.map(student => {
                  const amount = student.requestedTrophyAmount || 1;
                  const lessonTitle = student.requestedTrophyLessonTitle || 'a lesson';
                  return (
                    <div key={student.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-yellow-100 border border-yellow-300 shadow-sm">
                      <div>
                        <p className="font-bold text-yellow-900 text-lg">{student.name} is requesting {amount > 1 ? `${amount} Trophies` : 'a Trophy'} for "{lessonTitle}"!</p>
                        <p className="text-sm text-yellow-700 mt-1 font-semibold">Current Total: {student.trophyCount || 0}</p>
                      </div>
                      <div className="flex space-x-3 mt-3 sm:mt-0">
                        <button 
                          onClick={() => handleApproveTrophy(student.id, student.name, amount, student.requestedTrophyLessonTitle, student.requestedTrophySessionId, student.requestedTrophyLessonLink)} 
                          className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md bg-yellow-500 hover:bg-yellow-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectTrophy(student.id, student.requestedTrophySessionId, student.requestedTrophyLessonTitle, student.requestedTrophyLessonLink)}
                          className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md bg-gray-400 hover:bg-gray-500 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingStudents.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Pending Student Accounts <span className="ml-3 text-base font-normal text-yellow-700">({pendingStudents.length} waiting)</span>
              </h3>
              <div className="space-y-4">
                {pendingStudents.map(student => (
                  <div key={student.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div>
                      <p className="font-semibold text-yellow-900">{student.name}</p>
                      <p className="text-sm text-gray-600">ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-md">{student.displayId}</span></p>
                    </div>
                    <div className="flex space-x-3 mt-2 sm:mt-0">
                      <button onClick={() => handleApproveStudent(student.id)} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-md bg-emerald-500 hover:bg-emerald-600">Approve</button>
                      <button onClick={() => openDeleteModal(student.id, student.name, 'student')} className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors shadow-md bg-red-500 hover:bg-red-600">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Current Students <span className="ml-3 text-base font-normal text-gray-600">(Total: {totalStudents}, Active: {activeStudents})</span>
            </h3>
            <div className="space-y-4">
              {currentStudents.map(student => (
                <div key={student.id} className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg ${student.isActive ? 'bg-white' : 'bg-gray-100'}`}>
                  <button onClick={() => openAttendanceModal(student)} disabled={!student.isActive || !student.displayId} className="text-left w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                    <div className="flex items-center">
                      <p className={`font-semibold text-lg ${student.isActive ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-500 line-through'}`}>{student.name}</p>
                      {student.trophyCount > 0 && (
                        <span className="ml-3 text-2xl" title={`${student.trophyCount} Trophies`}>🏆 <span className="text-lg font-bold text-yellow-600">{student.trophyCount}</span></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-md">{student.displayId}</span></p>
                  </button>
                  {student.pendingName && (
                    <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:ml-3 flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2">
                      <span className="text-yellow-800 text-sm font-semibold">
                        Wants to rename to "<strong>{student.pendingName}</strong>"
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleApproveNameChange(student.id, student.pendingName); }} className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600">Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRejectNameChange(student.id); }} className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600">Reject</button>
                    </div>
                  )}
                  <div className="flex space-x-3 mt-2 sm:mt-0">
                    <button onClick={() => handleToggleStudentActive(student.id, student.isActive)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md ${student.isActive ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-red-700'}`}>
                      {student.isActive ? 'Active' : 'Deactivated'}
                    </button>
                    <button onClick={() => openDeleteModal(student.id, student.name, 'student')} title="Delete Permanently" className="px-3 py-2 rounded-lg text-sm font-medium text-white transition-opacity shadow-md bg-red-600 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'bank' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleSaveLessonToBank} className="bg-sky-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-sky-200">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">{editingLessonId ? 'Edit Lesson' : 'Lesson Bank Management'}</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Lesson Title</label>
              <input type="text" value={newBankLessonTitle} onChange={(e) => setNewBankLessonTitle(e.target.value)} placeholder="e.g., Algebra Chapter 1" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="mb-4 relative">
              <label className="block text-gray-700 mb-2">Lesson Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBankLessonLink.startsWith('smartstudy://') ? '' : newBankLessonLink}
                  onChange={(e) => setNewBankLessonLink(e.target.value)}
                  placeholder="https://..."
                  disabled={newBankLessonLink.startsWith('smartstudy://')}
                  className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowLinkPicker(v => !v)}
                  className="px-4 py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 shadow-md flex-shrink-0"
                  title="Choose an app, or enter a link manually"
                >
                  🔗 ▾
                </button>
              </div>
              {newBankLessonLink.startsWith('smartstudy://') && (() => {
                const cId = extractSmartStudyClassId(newBankLessonLink);
                return (
                  <div className="mt-2 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-sky-800 font-semibold">📚 Smart Study app{cId ? ` → Class ${cId}` : ''}</span>
                    <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                  </div>
                );
              })()}
              {newBankLessonLink.startsWith('abhidhamma://') && (() => {
                const cId = extractAbhidhammaLessonId(newBankLessonLink);
                return (
                  <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-amber-800 font-semibold">📚 Abhidhamma app{cId ? ` → Class ${cId}` : ''}</span>
                    <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                  </div>
                );
              })()}
              {newBankLessonLink.startsWith('dhammaschool://') && (() => {
                const cId = extractDhammaschoolClassId(newBankLessonLink);
                return (
                  <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-orange-800 font-semibold">📖 Dhammaschool app{cId ? ` → Class ${cId}` : ''}</span>
                    <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                  </div>
                );
              })()}
              {newBankLessonLink === 'readingmyanmar://' && (
                <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-blue-800 font-semibold">📚 Reading Myanmar app</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}
              {newBankLessonLink === 'speakingmyanmar://' && (
                <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-orange-800 font-semibold">🗣️ Speaking Myanmar app</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}
              {newBankLessonLink === 'myanmarpart1and2://' && (
                <div className="mt-2 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-indigo-800 font-semibold">📘 Myanmar Part 1 & 2 app</span>
                  <button type="button" onClick={() => setNewBankLessonLink('')} className="text-xs text-red-600 hover:text-red-800 font-semibold">Clear</button>
                </div>
              )}

              {showLinkPicker && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl p-3 max-h-96 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setShowLinkPicker(false)}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 border border-gray-200 mb-2 font-semibold text-gray-700"
                  >
                    ✏️ Input link manually
                  </button>
                  <p className="text-xs text-gray-500 font-semibold mt-3 mb-1 uppercase">Or choose app</p>
                  {/* Class ID is chosen later, at Assign Lesson time — not here.
                      That way one Lesson Bank entry can be sent to any class.
                      "Total Number" is still auto-filled immediately though —
                      it's set to the app's whole lesson count (summed across
                      every class), since Trophy Status and other calculations
                      key off of it before a specific class is even chosen. */}
                  <button
                    type="button"
                    onClick={async () => {
                      setNewBankLessonLink('smartstudy://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Smart Study Lesson');
                      setShowLinkPicker(false);
                      const list = await loadSmartStudyClassList();
                      setNewBankLessonUnitCount(String((list || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0)));
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-sky-50 border border-transparent hover:border-sky-200 font-semibold text-gray-800"
                  >
                    📚 Smart Study app
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setNewBankLessonLink('abhidhamma://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Abhidhamma Lesson');
                      setShowLinkPicker(false);
                      const list = await loadAbhidhammaClasses();
                      setNewBankLessonUnitCount(String((list || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0)));
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200 font-semibold text-gray-800 mt-1"
                  >
                    📚 Abhidhamma app
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setNewBankLessonLink('dhammaschool://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Dhammaschool Lesson');
                      setShowLinkPicker(false);
                      const list = await loadDhammaschoolClasses();
                      setNewBankLessonUnitCount(String((list || []).reduce((sum, c) => sum + (c.lessonCount || 0), 0)));
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 font-semibold text-gray-800 mt-1"
                  >
                    📖 Dhammaschool app
                  </button>
                  {/* Myanmar Speaking app and Myanmar Reader app don't have Firestore-backed
                      classes/lessons like the other three — they're simple external apps, so
                      picking them just sets the Lesson Bank link directly to their real hosted
                      URL. handleStartLesson's generic http(s) fallback opens them like any
                      other plain link (still gets a study session + Report button, same as
                      any external URL lesson). */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!MYANMAR_SPEAKING_APP_URL) {
                        alert('Myanmar Speaking app URL is not set up yet.');
                        return;
                      }
                      setNewBankLessonLink(MYANMAR_SPEAKING_APP_URL);
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Myanmar Speaking Lesson');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-purple-50 border border-transparent hover:border-purple-200 font-semibold text-gray-800 mt-1"
                  >
                    🗣️ Myanmar Speaker app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!MYANMAR_READER_APP_URL) {
                        alert('Myanmar Reader app URL is not set up yet.');
                        return;
                      }
                      setNewBankLessonLink(MYANMAR_READER_APP_URL);
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('Myanmar Reader Lesson');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-teal-50 border border-transparent hover:border-teal-200 font-semibold text-gray-800 mt-1"
                  >
                    📗 Myanmar Reader app
                  </button>
                  {/* Consonant Practice and Burmese Consonant Game are mounted
                      inline (like SmartStudy/Abhidhamma/Dhammaschool), not real
                      hosted URLs — so they get their own custom link scheme,
                      handled specially in handleStartLesson/Continue, same
                      idea as smartstudy://, abhidhamma://, dhammaschool://. */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewBankLessonLink('readingmyanmar://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('📚 Reading Myanmar app — Choose a Part');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 font-semibold text-gray-800 mt-1"
                  >
                    📚 Reading Myanmar app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBankLessonLink('speakingmyanmar://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('🗣️ Speaking Myanmar app — Choose a Part');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200 font-semibold text-gray-800 mt-1"
                  >
                    🗣️ Speaking Myanmar app
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBankLessonLink('myanmarpart1and2://');
                      if (!newBankLessonTitle.trim()) setNewBankLessonTitle('📘 Myanmar Part 1 & 2 app — Choose a Part');
                      setShowLinkPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 font-semibold text-gray-800 mt-1"
                  >
                    📘 Myanmar Part 1 & 2 app
                  </button>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Details / Instructions</label>
              <input type="text" value={newBankLessonDetails} onChange={(e) => setNewBankLessonDetails(e.target.value)} placeholder="e.g., Complete the workbook" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 mb-2">Unit Name</label>
                <select value={newBankLessonUnitLabel} onChange={(e) => setNewBankLessonUnitLabel(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Chapter">Chapter</option>
                  <option value="Lesson">Lesson</option>
                  <option value="Level">Level</option>
                  <option value="Unit">Unit</option>
                  <option value="Page">Page</option>
                  <option value="Poem">Poem</option>
                  <option value="Movie">Movie</option>
                  <option value="Story">Story</option>
                  <option value="Game">Game</option>
                  <option value="Minute">Minute</option>
                  <option value="Old">Old</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Total Number
                  {(newBankLessonLink.startsWith('smartstudy://') || newBankLessonLink.startsWith('abhidhamma://') || newBankLessonLink.startsWith('dhammaschool://')) && (
                    <span className="ml-2 text-xs font-normal text-emerald-600">(auto-filled: total lessons across the whole app)</span>
                  )}
                </label>
                <input type="number" min="0" value={newBankLessonUnitCount} onChange={(e) => setNewBankLessonUnitCount(e.target.value)} placeholder="e.g., 20" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Max Trophies Available</label>
              <input type="number" min="0" value={newBankLessonTrophyLimit} onChange={(e) => setNewBankLessonTrophyLimit(e.target.value)} placeholder="0 for none" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {parseInt(newBankLessonTrophyLimit) > 0 && parseInt(newBankLessonUnitCount) > 0 && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                  {(() => {
                    const tCount = parseInt(newBankLessonTrophyLimit);
                    const uCount = parseInt(newBankLessonUnitCount);
                    const rate = tCount / uCount;
                    if (rate >= 1) {
                      const rounded = Math.round(rate * 10) / 10;
                      return `Every 1 ${newBankLessonUnitLabel} completed ≈ ${rounded} Trophy(s).`;
                    }
                    return `Every ${Math.ceil(uCount / tCount)} ${newBankLessonUnitLabel}(s) completed = 1 Trophy.`;
                  })()}
                </p>
              )}
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-transform transform hover:scale-105 shadow-md">
              {editingLessonId ? 'Update Lesson' : 'Add to Bank'}
            </button>
            {editingLessonId && (
              <button type="button" onClick={() => setEditingLessonId(null)} className="w-full bg-gray-500 text-white p-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors mt-3 shadow-md">
                Cancel Edit
              </button>
            )}
          </form>
          
          <div className="bg-sky-50/70 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-sky-200">
             <h3 className="text-xl font-semibold mb-4 text-gray-800">Lesson Bank List</h3>
             <div className="space-y-3 max-h-96 overflow-y-auto">
               {lessonBank.length === 0 ? <p>No lessons in bank.</p> : 
                lessonBank.map(l => (
                  <div 
                    key={l.id} 
                    draggable
                    onDragStart={() => handleLessonDragStart(l)}
                    onDragEnd={handleLessonDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleLessonDrop(l)}
                    className={`bg-white p-3 rounded-lg group cursor-move ${mergeSourceId === l.id ? 'ring-2 ring-purple-500 opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <button
                        onClick={() => openLink(l.link)}
                        className="text-left w-full"
                        title="Click to open link. Drag onto another lesson to merge."
                      >
                        <p className="font-semibold group-hover:text-indigo-600 transition-colors">
                          {l.title} {l.trophyLimit > 0 && <span className="ml-2 text-sm text-yellow-600">🏆 Max: {l.trophyLimit}</span>}
                        </p>
                        <p className="text-sm text-gray-600">{l.details}</p>
                        <p className="text-sm text-indigo-600 truncate">{l.link}</p>
                      </button>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => setEditingLessonId(l.id)} className="text-indigo-600 hover:text-indigo-800" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => openDeleteModal(l.id, l.title, 'lessonBank')} className="text-red-500 hover:text-red-700" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
               }
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Auto-tracks how many Smart Study lessons a student has completed for a
// given class, directly from Smart Study's own quizCompletions collection —
// no manual "Report" needed for smartstudy:// linked lessons.
//
// The studentName passed in is the Tutoring profile name. After a student
// links their Tutoring & Smart Study accounts the roster entry may have been
// renamed, so we also look up the Smart Study roster name (the name used in
// quizCompletions) via the classRoster collection and query with whichever
// name(s) appear there, falling back to the Tutoring name if nothing is found.
function SmartStudyProgressBadge({ classId, studentName, smartStudyNames, compact, onCountChange }) {
  const [completedCount, setCompletedCount] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [badError, setBadError] = useState(false);

  useEffect(() => {
    if (!classId || !studentName) return;
    if (classId.includes('/')) { setBadError(true); return; }

    // Names we know about synchronously (no Firestore round-trip needed).
    // smartStudyNames[classId] is the old SmartStudy name stored at link time.
    const profileSmartStudyName = smartStudyNames?.[classId] || null;
    const initialNames = [...new Set([studentName, profileSmartStudyName].filter(Boolean))];

    const distinctIds = new Set();
    const unsubs = [];
    let live = true; // false once cleanup runs
    let settled = 0;
    // totalExpected starts at initialNames.length; if a roster fetch adds a
    // new name later we increment it first so we don't publish prematurely.
    let totalExpected = initialNames.length;

    const trySetCount = () => {
      if (settled >= totalExpected) setCompletedCount(distinctIds.size);
    };

    const addNameSubscription = (name) => {
      if (!name || !live) return;
      try {
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'quizCompletions'),
          where('classId', '==', classId),
          where('studentName', '==', name)
        );
        let firstFire = true;
        const unsub = onSnapshot(q, (snap) => {
          snap.docs.forEach(d => distinctIds.add(d.data().lessonId));
          if (firstFire) { firstFire = false; settled++; }
          trySetCount();
        }, (err) => {
          console.error('Error loading Smart Study completions:', err);
          if (firstFire) { firstFire = false; settled++; }
          trySetCount();
        });
        unsubs.push(unsub);
      } catch (err) {
        console.error('Error setting up Smart Study progress listener:', err);
        settled++;
        trySetCount();
      }
    };

    // Subscribe immediately with known names
    initialNames.forEach(name => addNameSubscription(name));

    // Also do a non-blocking roster lookup to pick up old-linked students
    // whose profile pre-dates the smartStudyNames field (they were linked before
    // smartStudyNames was added, so their old SmartStudy name isn't in the profile
    // but IS in the roster doc).
    if (!profileSmartStudyName) {
      totalExpected++; // hold count until roster check completes
      const rosterRef = doc(
        db, 'artifacts', appId, 'public', 'data', 'classRoster',
        `${classId}_${encodeURIComponent(studentName)}`
      );
      getDoc(rosterRef).then(snap => {
        if (!live) return;
        const rosterName = snap.exists() ? snap.data().studentName : null;
        if (rosterName && !initialNames.includes(rosterName)) {
          // Found a distinct old name — subscribe for it
          totalExpected++; // one more name to settle
          addNameSubscription(rosterName);
        }
        settled++; // roster check itself is now settled
        trySetCount();
      }).catch(() => {
        if (!live) return;
        settled++;
        trySetCount();
      });
    }

    return () => {
      live = false;
      unsubs.forEach(u => u());
    };
  }, [classId, studentName, smartStudyNames]);

  // Notify parent of count changes so lessons can compute 'Start/Continue Lesson X'
  useEffect(() => {
    if (completedCount !== null && onCountChange) onCountChange(completedCount);
  }, [completedCount, onCountChange]);

  useEffect(() => {
    if (!classId || classId.includes('/')) return;
    try {
      getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'classes', classId))
        .then(snap => setTotalCount(snap.exists() ? (snap.data().lessons || []).length : null))
        .catch(() => setTotalCount(null));
    } catch (err) {
      console.error('Error fetching Smart Study class:', err);
    }
  }, [classId]);

  // Trophies for Smart Study now only ever come through the same "Report" +
  // Lesson-completed flow as every other linked app (Abhidhamma/
  // Dhammaschool/Myanmar Reader) — this used to also auto-request trophies
  // live, straight from this badge, the moment completedCount crossed a
  // threshold, entirely separate from the Report button. That caused a
  // request loop: rejecting a request only cleared trophyRequested, it never
  // advanced completedUnits, so the very next re-render saw "not yet
  // requested" again and immediately fired a fresh request — denying it did
  // nothing but produce another identical request a moment later. Removed
  // for good; see handleSubmitFeedback for the one real path a Smart Study
  // trophy request can come from now.

  // Headless tracker only -- it used to render a visible badge, stripped
  // down to just reporting completedCount up to the parent (see comment
  // above) but left without a return for the non-null case, so React threw
  // "nothing was returned from render" once completedCount actually
  // resolved.
  return null;
}

function StudentDashboard({ user, studentProfile, studentUid, announcements, onOpenSmartStudy, onOpenAbhidhamma, onOpenMyanmarReader, onOpenDhammaschool, onOpenMyanmarSpeaking, onOpenConsonantPractice, onOpenBurmeseGame, onOpenNumberLearning, onOpenVowelsLearning, onOpenAnimalSound, onOpenBurmeseLearningGames, onOpenInteractiveQuiz, onOpenMyanmarPoems, onOpenConsonantEndings, onOpenTimeAndCalendar, onOpenMyanmarSpelling, onOpenMyanmarSoundPractice, onOpenReadingMyanmar, onOpenSpeakingMyanmar, onOpenMyanmarPart1And2, onOpenBodhiTree, onOpenWatchAndLearn, onLogout }) {
  const [myLessons, setMyLessons] = useState([]);
  const [ssCompletionCounts, setSsCompletionCounts] = useState({}); // classId → SmartStudy completedCount
  const [mySessions, setMySessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [score, setScore] = useState('');
  const [requestTrophyChecked, setRequestTrophyChecked] = useState(false);
  const [requestTrophyAmount, setRequestTrophyAmount] = useState(1);
  const [completedUnitInput, setCompletedUnitInput] = useState('');
  const [todayCompletedInput, setTodayCompletedInput] = useState('');
  const [trophyTapCount, setTrophyTapCount] = useState(0);
  const [redoSession, setRedoSession] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [elapsedTick, setElapsedTick] = useState(Date.now());
  // Shown once per calendar day, the first time a student lands on their
  // dashboard that day -- not on every refresh/remount, which used to show
  // it again and again all day. Tracked in localStorage per student (this
  // device), so a different student logging in on the same device still
  // gets their own greeting.
  const GREETING_PROMPT_KEY = `dhamma_greeted_teacher_on_${studentUid}`;
  const [showGreetingPrompt, setShowGreetingPrompt] = useState(() => {
    try {
      return localStorage.getItem(GREETING_PROMPT_KEY) !== new Date().toDateString();
    } catch (e) {
      return true;
    }
  });

  // Parami runs large enough that some students share a rented/borrowed
  // device -- ask (once) whether this is their own device or not, so a
  // rented one can be auto-logged-out after inactivity below. Scoped to
  // Parami specifically via a direct membership query (not the `groups`
  // state, which is teacher-owned and empty for a student's own session).
  const [isInParamiGroup, setIsInParamiGroup] = useState(false);
  useEffect(() => {
    if (!studentUid) return;
    let isMounted = true;
    (async () => {
      try {
        const snap = await getDocs(query(groupsCollection, where('studentUids', 'array-contains', studentUid)));
        const inParami = snap.docs.some(d => (d.data().groupName || '').trim().toLowerCase() === 'parami');
        if (isMounted) setIsInParamiGroup(inParami);
      } catch (e) {}
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  const RENTAL_DEVICE_LOGOUT_MS = 60 * 60 * 1000; // 1 hour
  useEffect(() => {
    if (studentProfile?.isRentalDevice !== true) return;
    let timer = setTimeout(() => onLogout && onLogout(), RENTAL_DEVICE_LOGOUT_MS);
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onLogout && onLogout(), RENTAL_DEVICE_LOGOUT_MS);
    };
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [studentProfile?.isRentalDevice, onLogout]);

  const handleGreetTeacher = async () => {
    setShowGreetingPrompt(false);
    try { localStorage.setItem(GREETING_PROMPT_KEY, new Date().toDateString()); } catch (e) {}
    try {
      await addDoc(greetingsCollection, {
        studentUid,
        studentName: studentProfile?.name || 'Student',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Error sending greeting:', e);
    }
  };

const getEffectivePreviousUnit = (lessonKey, sessionForCalc) => {
    const session = sessionForCalc || activeSession;
    if (!session) return 0;
    const unitCount = session.lessonUnitCount || 0;
    const trophyLimit = session.lessonTrophyLimit || 0;
    const completedUnitsMap = studentProfile.completedUnits || {};
    const tracked = completedUnitsMap[lessonKey] || 0;
    if (unitCount > 0 && trophyLimit > 0) {
      const earnedTrophiesMap = studentProfile.earnedTrophies || {};
      const earned = earnedTrophiesMap[lessonKey] || 0;
      const derived = Math.min(unitCount, Math.ceil((earned * unitCount) / trophyLimit));
      return Math.max(tracked, derived);
    }
    return tracked;
  };
  const handleCompletedUnitChange = (value, skipTodaySync) => {
    setCompletedUnitInput(value);
    const targetSession = redoSession || activeSession;
    if (!targetSession) return;
    const unitCount = targetSession.lessonUnitCount || 0;
    const trophyLimit = targetSession.lessonTrophyLimit || 0;

    const lessonKey = computeLessonKey(targetSession.lessonTitle, targetSession.lessonLink);
    const previousHighestUnit = getEffectivePreviousUnit(lessonKey, targetSession);
    // parseFloat (not parseInt) -- Myanmar Reader reports half-chapter (.5)
    // progress when only one of a chapter's two sheets is done.
    const enteredUnit = parseFloat(value) || 0;

    if (!skipTodaySync) {
      setTodayCompletedInput(String(Math.max(0, enteredUnit - previousHighestUnit)));
    }

    if (unitCount <= 0 || trophyLimit <= 0) return;

    const earnedTrophiesMap = studentProfile.earnedTrophies || {};
    const previouslyEarned = earnedTrophiesMap[lessonKey] || 0;
    const effectiveUnit = Math.max(previousHighestUnit, enteredUnit);

    const deservedSoFar = Math.min(trophyLimit, Math.floor((effectiveUnit * trophyLimit) / unitCount));
    const newlyAvailable = Math.max(0, deservedSoFar - previouslyEarned);

    setRequestTrophyAmount(newlyAvailable > 0 ? newlyAvailable : 1);
    setRequestTrophyChecked(newlyAvailable > 0);
  };

  const handleTodayCountChange = (value) => {
    setTodayCompletedInput(value);
    const targetSession = redoSession || activeSession;
    if (!targetSession) return;
    const lessonKey = computeLessonKey(targetSession.lessonTitle, targetSession.lessonLink);
    const previousHighestUnit = getEffectivePreviousUnit(lessonKey, targetSession);
    const unitCount = targetSession.lessonUnitCount || 0;
    const todayCount = parseFloat(value) || 0;
    let newUnit = previousHighestUnit + todayCount;
    if (unitCount > 0) newUnit = Math.min(unitCount, newUnit);
    handleCompletedUnitChange(String(newUnit), true);
  };
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingNameText, setEditingNameText] = useState('');

  const [praiseModalInfo, setPraiseModalInfo] = useState({ isOpen: false, newTrophy: false, totalTrophies: 0, message: '', emoji: '' });
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  const [isLessonOverlayOpen, setIsLessonOverlayOpen] = useState(false);
  const [heartsAnimGivers, setHeartsAnimGivers] = useState([]);
  const hasCheckedHeartsRef = useRef(false);

  useEffect(() => {
    if (studentProfile) {
      setEditingNameText(studentProfile.name || '');
      
      if (studentProfile.justEarnedTrophy) {
        playSound(0);
        setPraiseModalInfo({ 
          isOpen: true, 
          newTrophy: true, 
          totalTrophies: studentProfile.trophyCount, 
          message: "Congratulations!", 
          emoji: '🏆' 
        });
        
        const resetTrophyFlag = async () => {
          try {
            await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), {
              justEarnedTrophy: false
            });
          } catch(e) {}
        };
        resetTrophyFlag();
      }
    }
  }, [studentProfile, studentUid]);

  useEffect(() => {
    if (hasCheckedHeartsRef.current) return;
    if (!studentProfile) return;
    hasCheckedHeartsRef.current = true;

    const currentHearts = studentProfile.heartsReceived || 0;
    const seenHearts = studentProfile.heartsSeenCount || 0;

    if (currentHearts <= seenHearts) return;

    const heartsFromCountsNow = studentProfile.heartsFromCounts || {};
    const giverKeysNow = [...new Set(Object.keys(heartsFromCountsNow).map(k => k.replace(/_name$|_count$/, '')))];
    const giversNow = giverKeysNow.map(k => ({
      name: heartsFromCountsNow[`${k}_name`],
      count: heartsFromCountsNow[`${k}_count`] || 0
    })).filter(g => g.name);

    if (giversNow.length === 0) return;

    setHeartsAnimGivers(giversNow);

    const markSeen = async () => {
      try {
        await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), {
          heartsSeenCount: currentHearts
        });
      } catch (e) {}
    };
    markSeen();

    const clearTimer = setTimeout(() => setHeartsAnimGivers([]), 4500);
    return () => clearTimeout(clearTimer);
  }, [studentProfile, studentUid]);

  const autoSubmitTimerRef = useRef(null);
  const lessonsSectionRef = useRef(null);
  const activeSessionRef = useRef(null);
  const firstLessonRef = useRef(null);
  const hasInitialScrolledRef = useRef(false);

  useEffect(() => {
    if (hasInitialScrolledRef.current) return;
    const timer = setTimeout(() => {
      if (hasInitialScrolledRef.current) return;
      hasInitialScrolledRef.current = true;
      if (activeSessionRef.current) {
        activeSessionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstLessonRef.current) {
        firstLessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (lessonsSectionRef.current) {
        lessonsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [activeSession, myLessons]);

  const [mySchedule, setMySchedule] = useState([]);
  const [alarmRingCount, setAlarmRingCount] = useState(0); 
  const triggeredAlarmsRef = useRef(new Set()); 
  const alarmTimerRef = useRef(null);

  const prevLessonCount = useRef(0); 

  useEffect(() => {
    if (!studentUid) return;
    // Query by studentUid only and filter status on the client, so no
    // composite index is required (see note on the sessions query above).
    const q = query(lessonsCollection, where("studentUid", "==", studentUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lessonList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(l => l.status === 'pending' || l.status === 'started');
      
      if (lessonList.length > prevLessonCount.current && prevLessonCount.current > 0) {
        playSound(1); 
        setTimeout(() => {
          if (lessonsSectionRef.current) {
            lessonsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
      prevLessonCount.current = lessonList.length;
      
      lessonList.sort((a, b) => {
        const dateA = a.sentAt?.toDate ? a.sentAt.toDate() : new Date(0);
        const dateB = b.sentAt?.toDate ? b.sentAt.toDate() : new Date(0);
        return dateB - dateA; 
      });

      setMyLessons(lessonList);
    }, (error) => {
      console.error("Error fetching student lessons: ", error);
    });
    return () => unsubscribe();
  }, [studentUid]);

  useEffect(() => {
    if (!studentUid) return;

    const activeQ = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
    const unsubActive = onSnapshot(activeQ, (snapshot) => {
      const activeDoc = snapshot.docs[0];
      setActiveSession(activeDoc ? { id: activeDoc.id, ...activeDoc.data() } : null);
    }, (error) => {
      console.error("Error fetching active session:", error);
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // NOTE: Combining an equality filter (studentUid) with a range filter
    // (startTime >=) in Firestore requires a composite index. To avoid the
    // query failing silently when that index is missing, we query by
    // studentUid only and filter the date range on the client.
    const recentQ = query(
      sessionsCollection,
      where("studentUid", "==", studentUid)
    );
    const unsubRecent = onSnapshot(recentQ, (snapshot) => {
      // Use start of year so the attendance count matches the teacher's view
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
      const sessionList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.endTime && s.startTime && typeof s.startTime.toDate === 'function' && s.startTime.toDate().getTime() >= startOfYear);
      setMySessions(sessionList);
    }, (error) => {
      console.error("Error fetching recent sessions:", error);
    });

    return () => {
      unsubActive();
      unsubRecent();
    };
  }, [studentUid]);
  
  useEffect(() => {
    if (announcements && studentProfile) {
      const seenIds = studentProfile.seenAnnouncements || [];
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      // Shown in the 🔔 dropdown: everyone else's trophy announcements from
      // the past week, newest first — read or not (so a student can still
      // glance back at what they already saw), while the red dot only counts
      // the unseen ones.
      const recent = announcements
        .filter(a => a.studentName !== studentProfile.name)
        .filter(a => {
          const ms = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : nowMs);
          return (nowMs - ms) < ONE_WEEK_MS;
        })
        .sort((a, b) => {
          const aMs = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const bMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return bMs - aMs;
        })
        .map(a => ({ ...a, _unseen: !seenIds.includes(a.id) }));
      setVisibleAnnouncements(recent);
    }
  }, [announcements, studentProfile]);
  const unreadAnnouncementCount = visibleAnnouncements.filter(a => a._unseen).length;

  useEffect(() => {
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    if (!activeSession || showFeedbackModal) return;

    const now = new Date();
    // Guard: startTime can be null briefly after addDoc with serverTimestamp()
    if (!activeSession.startTime?.toDate) return;
    const sessionStartTime = activeSession.startTime.toDate();
    
    let relevantScheduleEndTime = null;
    const currentOrLastSchedule = mySchedule
      .filter(entry => entry.endTime?.toDate && entry.endTime.toDate() > sessionStartTime) 
      .sort((a, b) => (a.endTime?.toDate?.()?.getTime?.() ?? 0) - (b.endTime?.toDate?.()?.getTime?.() ?? 0))[0]; 
      
    if (currentOrLastSchedule) {
      const scheduleEnd = new Date(currentOrLastSchedule.endTime.toDate().getTime() + 15 * 60 * 1000);
      if (scheduleEnd > now || (now.getTime() - scheduleEnd.getTime()) < 5 * 60 * 1000) { 
        relevantScheduleEndTime = scheduleEnd;
      }
    }

    const maxDurationEndTime = new Date(sessionStartTime.getTime() + 45 * 60 * 1000); 
    const scheduleTriggerEndTime = relevantScheduleEndTime;

    let autoSubmitTime = maxDurationEndTime; 

    if (scheduleTriggerEndTime && scheduleTriggerEndTime < autoSubmitTime) {
      autoSubmitTime = scheduleTriggerEndTime;
    }

    const timeRemaining = autoSubmitTime.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      handleAutoSubmitSession(activeSession, autoSubmitTime);
    } else {
      autoSubmitTimerRef.current = setTimeout(() => {
        handleAutoSubmitSession(activeSession, autoSubmitTime);
      }, timeRemaining);
    }
    
    return () => {
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, [activeSession, showFeedbackModal, mySchedule]);

  useEffect(() => {
    if (!studentUid) return;
    const q = query(teacherScheduleCollection, where("studentUid", "==", studentUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMySchedule(scheduleList);
    }, (error) => {
      console.error("Error fetching student schedule:", error);
    });
    return () => unsubscribe();
  }, [studentUid]);

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      mySchedule.forEach(entry => {
        const startTime = entry.startTime.toDate();
        const diffMins = (now.getTime() - startTime.getTime()) / 60000;
        
        if (diffMins >= 0 && diffMins < 1 && alarmRingCount === 0) {
          const today = new Date().toDateString();
          const alarmId = `${entry.id}-${today}`;
          
          if (!triggeredAlarmsRef.current.has(alarmId)) {
            triggeredAlarmsRef.current.add(alarmId);
            setAlarmRingCount(5); 
          }
        }
      });
    };
    
    const intervalId = setInterval(checkSchedule, 30 * 1000); 
    return () => clearInterval(intervalId);
  }, [mySchedule, alarmRingCount]); 

  const stopAlarm = () => {
    if (alarmRingCount > 0) {
      setAlarmRingCount(0); 
    }
  };

  useEffect(() => {
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);

    if (alarmRingCount > 0) {
      playSound(3); 
      alarmTimerRef.current = setTimeout(() => {
        setAlarmRingCount(count => count - 1);
      }, 10 * 1000); 
      document.addEventListener('mousedown', stopAlarm);
      document.addEventListener('touchstart', stopAlarm);
    } else {
      document.removeEventListener('mousedown', stopAlarm);
      document.removeEventListener('touchstart', stopAlarm);
    }
    
    return () => {
      if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
      document.removeEventListener('mousedown', stopAlarm);
      document.removeEventListener('touchstart', stopAlarm);
    };
  }, [alarmRingCount]); 
  useEffect(() => {
    if (!activeSession || showFeedbackModal) return;
    const intervalId = setInterval(() => setElapsedTick(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [activeSession, showFeedbackModal]);
  useEffect(() => {
    // Keeps nowTick fresh so the 1-hour "Report" (redo) button window
    // expires on its own without requiring a manual page refresh.
    const intervalId = setInterval(() => setNowTick(Date.now()), 30 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Myanmar Reader sessions are sent as a plain external link (no
  // myanmarreader:// protocol / classId parsing like the other linked apps),
  // so there's nothing else already pre-filling Score/Lesson completed for
  // them. This queries Myanmar Reader's own Firestore scores directly —
  // written live as the student reads (score 0–1000 per chapter+sheet,
  // isComplete once it crosses 700) — and fills in whichever chapter+sheet
  // they most recently studied (by timestamp), whether or not it's finished.
  //
  // Score holds only the raw score ("0/1000") -- which chapter/sheet it was
  // goes in "What did you study?" instead, so the two fields each hold one
  // clear thing rather than Score carrying both.
  //
  // A chapter has two sheets (A and B). Lesson completed reports as the
  // chapter number itself once Sheet A is done (e.g. 20 = chapter 20's
  // Sheet A done, continue with its Sheet B), then N.5 once Sheet B is also
  // done (20.5 = chapter 20 fully finished, continue with chapter 21's
  // Sheet A) -- see getNextChapterNumber, which reads this same value
  // everywhere it's shown. Trophies themselves are NOT derived from this
  // number for Myanmar Reader -- see the separate "pending" sheet-completion
  // count below -- Lesson completed here only drives the "completed up to
  // Chapter X / 29" progress display and which chapter is shown/unlocked
  // next.
  const [myanmarReaderPendingScoreDocs, setMyanmarReaderPendingScoreDocs] = useState([]);
  useEffect(() => {
    const session = redoSession || activeSession;
    if (!showFeedbackModal || !session || !studentProfile?.name) { setMyanmarReaderPendingScoreDocs([]); return; }
    if (!MYANMAR_READER_APP_URL || !session.lessonLink?.startsWith(MYANMAR_READER_APP_URL)) { setMyanmarReaderPendingScoreDocs([]); return; }
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'artifacts', 'myanmar-reader-app', 'public', 'data', 'scores'),
          where('studentName', '==', studentProfile.name)
        ));
        if (snap.empty) { setMyanmarReaderPendingScoreDocs([]); return; }
        const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Most recently studied chapter+sheet, complete or not — this is what
        // gets reported. Re-studying an OLD chapter still updates this (its
        // timestamp becomes the newest), so Score always reflects whatever
        // was just done.
        let latest = null;
        allDocs.forEach(dt => {
          const ts = dt.timestamp?.toMillis ? dt.timestamp.toMillis() : 0;
          if (!latest || ts > latest._ts) latest = { ...dt, _ts: ts };
        });

        // Which sheets are done for every chapter, recomputed directly from
        // each sheet's own isComplete flag (not the chapterComplete stamp
        // alone), since older completions from before that stamp existed
        // wouldn't have it set and would otherwise never show up here.
        const sheetStatus = {}; // chapterNum -> { A: bool, B: bool }
        allDocs.forEach(dt => {
          if (dt.chapterNum == null || !dt.sheetName) return;
          sheetStatus[dt.chapterNum] = sheetStatus[dt.chapterNum] || {};
          if (dt.isComplete) sheetStatus[dt.chapterNum][dt.sheetName] = true;
        });

        if (latest) {
          setScore(`${latest.score ?? 0}/1000`);
          setFeedbackNotes(`Chapter ${latest.chapterNum} (Sheet ${latest.sheetName})`);
          const latestStatus = sheetStatus[latest.chapterNum] || {};
          const bothSheetsDone = !!(latestStatus.A && latestStatus.B);
          // Chapter N with only Sheet A done reports as N itself; once Sheet B
          // is also done it becomes N.5 (chapter N fully finished) -- matches
          // getNextChapterNumber's reading of this same value everywhere else
          // (a whole number means "continue this chapter's Sheet B", a .5
          // means "start the next chapter's Sheet A").
          const lessonCompletedValue = latest.chapterNum + (bothSheetsDone ? 0.5 : 0);
          handleCompletedUnitChange(String(lessonCompletedValue), true);
          setTodayCompletedInput(bothSheetsDone ? '1' : '0.5');
        }

        // Every completed (score 700+) sheet not yet turned into a trophy
        // request is its own pending trophy -- 1 for Sheet A, 1 more for
        // Sheet B, so a full chapter is worth 2 total, same as before, but
        // each sheet is requested as soon as it's done rather than waiting
        // for its sibling sheet to also finish.
        const pending = allDocs.filter(d => d.isComplete && !d.trophyRequested);
        setMyanmarReaderPendingScoreDocs(pending);
        setRequestTrophyAmount(pending.length > 0 ? pending.length : 1);
        setRequestTrophyChecked(pending.length > 0);
      } catch (e) { console.error('Myanmar Reader auto-fill error:', e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFeedbackModal, redoSession, activeSession, studentProfile?.name]);


  const attendanceSummary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);

    const yearEntries = [];

    mySchedule.forEach(entry => {
       const entryDate = entry.startTime.toDate();
       // Not reached yet, or (for a group entry) nobody's toggled this
       // student either way -- shown blank, not counted as attended/absent.
       const rawStatus = entryDate > now ? null : getStudentAttendanceForEntry(entry, studentUid, mySessions);
       const status = rawStatus === 'attended' ? 'attended' : rawStatus === 'absent' ? 'absent' : 'upcoming';

       if (entryDate >= startOfYear && entryDate <= endOfYear) yearEntries.push({ date: entryDate, status, day: entryDate.getDate() });
    });

    yearEntries.sort((a, b) => a.date - b.date);
    const countOf = (list, key) => list.filter(e => e.status === key).length;

    return {
      yearAttended: countOf(yearEntries, 'attended'),
      yearAbsent: countOf(yearEntries, 'absent'),
      yearEntries,
    };
  }, [mySchedule, mySessions, studentUid]);

  const handleStartLesson = async (lesson) => {
    if (lesson.link && lesson.link.startsWith('dhammaschool://')) {
      const classId = extractDhammaschoolClassId(lesson.link);
      // Mounted inline now (same project as SmartStudy/Abhidhamma/Myanmar
      // Reader) — switch to it directly instead of opening a new tab. The
      // app auto-selects this class and shows all its lessons (student
      // picks which one to start, mirroring how SmartStudy/AbhidhammaApp
      // hand off to a class rather than one specific lesson).
      if (onOpenDhammaschool) {
        onOpenDhammaschool({ studentName: studentProfile?.name || '', classId: classId || '' });
      }
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Session for time-tracking + Report button (same pattern as other apps)
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Lesson',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) { console.error("Error starting Dhammaschool session:", e); }
      return;
    }

    const simpleAppSchemes = ['consonantpractice://', 'burmesegame://', 'numberlearning://', 'vowelslearning://', 'animalsound://', 'burmeselearninggames://', 'interactivequiz://', 'myanmarpoems://', 'consonantendings://', 'timeandcalendar://', 'myanmarspelling://', 'myanmarsoundpractice://', 'readingmyanmar://', 'speakingmyanmar://', 'myanmarpart1and2://', 'watchandlearn://'];
    if (simpleAppSchemes.some(scheme => lesson.link === scheme || lesson.link.startsWith(scheme))) {
      const openerByLink = {
        'consonantpractice://': onOpenConsonantPractice,
        'burmesegame://': onOpenBurmeseGame,
        'numberlearning://': onOpenNumberLearning,
        'vowelslearning://': onOpenVowelsLearning,
        'animalsound://': onOpenAnimalSound,
        'burmeselearninggames://': onOpenBurmeseLearningGames,
        'interactivequiz://': onOpenInteractiveQuiz,
        'myanmarpoems://': onOpenMyanmarPoems,
        'consonantendings://': onOpenConsonantEndings,
        'timeandcalendar://': onOpenTimeAndCalendar,
        'myanmarspelling://': onOpenMyanmarSpelling,
        'myanmarsoundpractice://': onOpenMyanmarSoundPractice,
        'readingmyanmar://': onOpenReadingMyanmar,
        'speakingmyanmar://': onOpenSpeakingMyanmar,
        'myanmarpart1and2://': onOpenMyanmarPart1And2,
        'watchandlearn://': onOpenWatchAndLearn,
      };
      const matchedScheme = groupSchemeOfLink(lesson.link) || (lesson.link.startsWith('watchandlearn://') ? 'watchandlearn://' : lesson.link);
      const opener = openerByLink[matchedScheme];
      const initialPart = extractGroupPartKey(lesson.link);
      if (opener) opener({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Session for time-tracking + Report button (same pattern as other apps)
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Game',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) { console.error("Error starting game session:", e); }
      return;
    }

    if (lesson.link && lesson.link.startsWith('abhidhamma://')) {
      const lessonId = extractAbhidhammaLessonId(lesson.link);
      if (onOpenAbhidhamma) {
        const ageGroupMap = { storyteller:'storytellers', explorer:'explorers', adventurer:'adventurers', voyager:'voyagers' };
        onOpenAbhidhamma({
          mode: 'student',
          lessonId,
          studentName: studentProfile?.name,
          ageGroup: studentProfile?.smartStudyAgeLevel || null,
        });
      }
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Create a session for time-tracking and Report button
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Lesson',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) { console.error("Error starting Abhidhamma session:", e); }
      return;
    }

    if (lesson.link && lesson.link.startsWith('smartstudy://')) {
      const classId = extractSmartStudyClassId(lesson.link);
      if (onOpenSmartStudy) {
        onOpenSmartStudy({
          mode: 'student',
          classId,
          studentName: studentProfile?.name,
          studentUid,
          ageLevel: studentProfile?.smartStudyAgeLevel || null,
          onAgeLevelChosen: async (level) => {
            try {
              await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { smartStudyAgeLevel: level });
            } catch (e) {
              console.error('Error saving age level:', e);
            }
          }
        });
      }
      if (lesson.status === 'pending') {
        try { await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' }); } catch (e) {}
      }
      // Create a study session for the Smart Study lesson too — so the
      // student sees the Report button, and study time is captured for
      // Student Feedback Reports. Progress/trophies are still auto-tracked
      // via SmartStudyProgressBadge; no manual chapter count is needed.
      try {
        const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
        const activeCheckSnap = await getDocs(activeCheckQuery);
        if (activeCheckSnap.empty) {
          await addDoc(sessionsCollection, {
            studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link,
            lessonTrophyLimit: lesson.trophyLimit || 0,
            lessonUnitCount: lesson.unitCount || 0,
            lessonUnitLabel: lesson.unitLabel || 'Chapter',
            startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
          });
        }
      } catch (e) {
        console.error("Error starting Smart Study session:", e);
      }
      return;
    }

    if (activeSession) {
      return;
    }

    try {
      const activeCheckQuery = query(sessionsCollection, where("studentUid", "==", studentUid), where("endTime", "==", null));
      const activeCheckSnap = await getDocs(activeCheckQuery);
      if (!activeCheckSnap.empty) {
        alert("There is still an active session. Please wait a moment and try again, or submit a report first.");
        return;
      }
    } catch (error) {
      console.error("Error checking for existing active session:", error);
      return;
    }

    let formattedUrl = lesson.link;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    // Myanmar Reader is mounted inline in the same project now (like
    // SmartStudy/Abhidhamma) — switch to it directly instead of opening a
    // new tab, passing the student's exact TutoringApp name the same way
    // the URL param used to (so nothing else about the identity/roster
    // logic on that side needs to change).
    const isMyanmarReaderLesson = MYANMAR_READER_APP_URL && formattedUrl.startsWith(MYANMAR_READER_APP_URL);
    if (isMyanmarSpeakingUrl(formattedUrl) && onOpenMyanmarSpeaking && studentProfile?.name) {
      onOpenMyanmarSpeaking({ studentName: studentProfile.name });
    } else if (isMyanmarReaderLesson && onOpenMyanmarReader && studentProfile?.name) {
      onOpenMyanmarReader({ studentName: studentProfile.name });
    } else {
      // Only this genuine window.open fallback actually opens another tab --
      // both branches above mount their app inline in this same page, so
      // only this one needs the "opened in another tab, come back here when
      // done" overlay.
      openLink(formattedUrl);
      setIsLessonOverlayOpen(true);
    }
    
    try {
      await addDoc(sessionsCollection, {
        studentUid: studentUid, lessonId: lesson.id, lessonTitle: lesson.title, lessonLink: lesson.link, 
        lessonTrophyLimit: lesson.trophyLimit || 0,
        lessonUnitCount: lesson.unitCount || 0,
        lessonUnitLabel: lesson.unitLabel || 'Chapter',
        startTime: serverTimestamp(), endTime: null, feedbackNotes: null, score: null, awardedTrophies: 0
      });
      if (lesson.status === 'pending') {
        await updateDoc(doc(db, `${publicDataPath}/lessons`, lesson.id), { status: 'started' });
      }
    } catch (error) {
      console.error("Error starting lesson:", error);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setRedoSession(null);
    setFeedbackNotes('');
    setScore('');
    setCompletedUnitInput('');
    setTodayCompletedInput('');
    setTrophyTapCount(0);
    setShowFeedbackModal(true);

    // Auto-fetch SmartStudy Score and Lesson completed so the feedback modal
    // is pre-filled. Works both when the session link has a classId
    // (e.g. smartstudy://BUDDHA — fetches that class only) AND when it doesn't
    // (smartstudy:// — fetches across all classes, same as myTotalLessonsCompletedAllClasses).
    if (activeSession.lessonLink?.startsWith('smartstudy://')) {
      const ssClassId = extractSmartStudyClassId(activeSession.lessonLink) || null;
      const ssName = studentProfile?.name;
      if (ssName) {
        try {
          const allNames = [...new Set([ssName, ...(Object.values(studentProfile?.smartStudyNames || {}))].filter(Boolean))];
          let totalPts = 0;
          const completedLessonIds = new Set(); // key = lessonId (per-class) or "classId-lessonId" (all-class)
          for (const name of allNames) {
            // If we have a classId: filter by class (matches myLessonsCompleted in SmartStudy)
            // If no classId:         query all classes (matches myTotalLessonsCompletedAllClasses)
            const q = ssClassId
              ? query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('classId', '==', ssClassId), where('studentName', '==', name))
              : query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('studentName', '==', name));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
              totalPts += (Number(d.data().score) || 0);
              const cId = d.data().classId; const lId = d.data().lessonId;
              if (lId) completedLessonIds.add(ssClassId ? lId : `${cId}-${lId}`);
            });
          }
          if (totalPts > 0) setScore(`${totalPts.toLocaleString()} pts`);
          if (completedLessonIds.size > 0) {
            setCompletedUnitInput(String(completedLessonIds.size));
          }
        } catch (e) {
          console.error('Error fetching SmartStudy score/completions for report modal:', e);
        }
      }
    }
    // Dhammaschool app: fetch total score + completed-lesson count across the whole class for auto-fill
    if (activeSession.lessonLink?.startsWith('dhammaschool://')) {
      const dhammaschoolClassId = activeSession.lessonLink.replace('dhammaschool://', '');
      const stuName = studentProfile?.name;
      if (stuName && dhammaschoolClassId) {
        try {
          const lessonsSnap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lessons'),
            where('classId', '==', dhammaschoolClassId)
          ));
          const classLessonIds = lessonsSnap.docs.map(d => d.id);
          let totalScore = 0;
          // Dhammaschool app uses its own anonymous Firebase session per device/browser
          // (separate from TutoringApp's studentUid), so completions/scores must be
          // matched by studentName, not by UID.
          const completionsSnap = await getDocs(query(
            collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'lesson_completions'),
            where('studentName', '==', stuName)
          ));
          const completedLessonIds = new Set(completionsSnap.docs.map(d => d.data().lessonId).filter(lid => classLessonIds.includes(lid)));
          for (const lid of classLessonIds) {
            try {
              const scoresSnap = await getDocs(query(
                collection(db, 'artifacts', DHAMMASCHOOL_APP_ID, 'public', 'data', 'game_scores'),
                where('lessonId', '==', lid),
                where('studentName', '==', stuName)
              ));
              let best = 0;
              scoresSnap.docs.forEach(d => { best = Math.max(best, Number(d.data().score) || 0); });
              totalScore += best;
            } catch (e) {}
          }
          if (totalScore > 0) setScore(`${totalScore.toLocaleString()} pts`);
          if (completedLessonIds.size > 0) setCompletedUnitInput(String(completedLessonIds.size));
        } catch (e) { console.error('Dhammaschool score fetch:', e); }
      }
    }

    // Abhidhamma: fetch score + lesson count from global_scores
    // Handles both new format (has classId) and old AbhidhammaApp5 format (no classId)
    if (activeSession.lessonLink?.startsWith('abhidhamma://')) {
      const abhiClassId = activeSession.lessonLink.replace('abhidhamma://', '');
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const allNames = [...new Set([stuName, ...(Object.values(studentProfile?.abhidhammaNames||{}))].filter(Boolean))];
          let totalPts=0; const doneLessons=new Set();
          const ABHI_COL = collection(db,'artifacts','lesson-translator-app-v6','public','data','global_scores');
          for (const nm of allNames) {
            // Try with name field (old AbhidhammaApp5 used 'name', new uses 'studentName')
            const [snap1, snap2] = await Promise.all([
              getDocs(query(ABHI_COL, where('name','==',nm))),
              getDocs(query(ABHI_COL, where('studentName','==',nm)))
            ]);
            [...snap1.docs, ...snap2.docs].forEach(d=>{
              const dt=d.data();
              // Include if classId matches OR if no classId (old format)
              if(dt.classId && dt.classId !== abhiClassId) return;
              totalPts += (Number(dt.score)||0);
              if(dt.lessonId) doneLessons.add(dt.lessonId);
            });
          }
          if(totalPts>0) setScore(`${totalPts.toLocaleString()} pts`);
          if(doneLessons.size>0) setCompletedUnitInput(String(doneLessons.size));
        } catch(e) { console.error('Abhi score fetch:', e); }
      }
    }

    // Myanmar Speaking app: fetch today's studied minutes (written by
    // myanmar-speaking-app.jsx as the student uses it) and drop it straight
    // into "Today completed" — there's no chapter/unit structure here, so
    // minutes studied today is what the teacher reviews before awarding a trophy.
    if (isMyanmarSpeakingUrl(activeSession.lessonLink)) {
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const todayKey = new Date().toISOString().split('T')[0];
          const docId = `${sanitizeMyanmarSpeakingKey(stuName)}_${todayKey}`;
          const minutesSnap = await getDoc(doc(db, 'artifacts', MYANMAR_SPEAKING_APP_ID, 'public', 'data', 'daily_minutes', docId));
          if (minutesSnap.exists() && typeof minutesSnap.data().minutes === 'number') {
            // Feeds "Today, completed" through the same path as every other
            // app (adds to the previous cumulative total, capped by the
            // Lesson Bank's "Total Number") — this only works out to a
            // sensible trophy calc when the teacher sets that lesson's Unit
            // Name to "Minute", per the Lesson Bank's Unit Name dropdown.
            handleTodayCountChange(String(minutesSnap.data().minutes));
          }
        } catch (e) { console.error('Myanmar Speaking minutes fetch:', e); }
      }
    }

    // Myanmar Sound Practice: fetch which Quiz Mode Levels (1-8) this
    // student has already passed, and drop the count straight into
    // "completed" -- same "2 trophies per unit" ratio as everywhere else,
    // just driven by the Lesson Bank's Total Number/Unit Name for this
    // lesson (16 / "Level") instead of a live class lesson count.
    if (isSoundPracticeUrl(activeSession.lessonLink)) {
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const rosterSnap = await getDoc(doc(db, 'artifacts', MYANMAR_SOUND_PRACTICE_APP_ID, 'public', 'data', 'roster', sanitizeSoundPracticeKey(stuName)));
          const passedLevels = rosterSnap.exists() && Array.isArray(rosterSnap.data().passedLevels) ? rosterSnap.data().passedLevels : [];
          if (passedLevels.length > 0) setCompletedUnitInput(String(passedLevels.length));
        } catch (e) { console.error('Myanmar Sound Practice progress fetch:', e); }
      }
    }

    // Burmese Consonant Game: fetch total completed games (Picture Game
    // levels + per-group Pick/Click games) and drop the count into "completed".
    if (isBurmeseGameUrl(activeSession.lessonLink)) {
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const rosterSnap = await getDoc(doc(db, 'artifacts', BURMESE_GAME_APP_ID, 'public', 'data', 'roster', sanitizeBurmeseGameKey(stuName)));
          const completedGames = rosterSnap.exists() && Array.isArray(rosterSnap.data().completedGames) ? rosterSnap.data().completedGames : [];
          if (completedGames.length > 0) setCompletedUnitInput(String(completedGames.length));
        } catch (e) { console.error('Burmese Consonant Game progress fetch:', e); }
      }
    }
  };

  const handleOpenRedoReport = async (session) => {
    setRedoSession(session);
    const lessonKey = computeLessonKey(session.lessonTitle, session.lessonLink);
    const prevUnit = getEffectivePreviousUnit(lessonKey, session);
    setCompletedUnitInput(session.completedUnit ? String(session.completedUnit) : '');
    setTodayCompletedInput(session.completedUnit ? String(Math.max(0, session.completedUnit - prevUnit)) : '');
    setTrophyTapCount(0);
    const isPlaceholderNote = !session.feedbackNotes
      || session.feedbackNotes.startsWith('Automatically submitted')
      || session.feedbackNotes === 'Submitted without writing.';
    setFeedbackNotes(isPlaceholderNote ? '' : session.feedbackNotes);
    setScore(session.score && session.score !== 'N/A' ? session.score : '');
    setShowFeedbackModal(true);

    // Re-fetch fresh SmartStudy data so redo report always shows current counts
    if (session.lessonLink?.startsWith('smartstudy://')) {
      const ssClassId = extractSmartStudyClassId(session.lessonLink) || null;
      const ssName = studentProfile?.name;
      if (ssName) {
        try {
          const allNames = [...new Set([ssName, ...(Object.values(studentProfile?.smartStudyNames || {}))].filter(Boolean))];
          let totalPts = 0;
          const completedIds = new Set();
          for (const name of allNames) {
            const q = ssClassId
              ? query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('classId', '==', ssClassId), where('studentName', '==', name))
              : query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'),
                  where('studentName', '==', name));
            const snap = await getDocs(q);
            snap.docs.forEach(d => {
              totalPts += (Number(d.data().score) || 0);
              const cId = d.data().classId; const lId = d.data().lessonId;
              if (lId) completedIds.add(ssClassId ? lId : `${cId}-${lId}`);
            });
          }
          if (totalPts > 0) setScore(`${totalPts.toLocaleString()} pts`);
          if (completedIds.size > 0) setCompletedUnitInput(String(completedIds.size));
        } catch (e) {
          console.error('Error fetching SmartStudy data for redo report:', e);
        }
      }
    }
    // Abhidhamma redo fetch — handle old and new format
    if (session.lessonLink?.startsWith('abhidhamma://')) {
      const abhiClassId = session.lessonLink.replace('abhidhamma://','');
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const allNames=[...new Set([stuName,...(Object.values(studentProfile?.abhidhammaNames||{}))].filter(Boolean))];
          let pts=0; const done=new Set();
          const ABHI_COL=collection(db,'artifacts','lesson-translator-app-v6','public','data','global_scores');
          for(const nm of allNames){
            const [s1,s2]=await Promise.all([getDocs(query(ABHI_COL,where('name','==',nm))),getDocs(query(ABHI_COL,where('studentName','==',nm)))]);
            [...s1.docs,...s2.docs].forEach(d=>{const dt=d.data();if(dt.classId&&dt.classId!==abhiClassId)return;pts+=(Number(dt.score)||0);if(dt.lessonId)done.add(dt.lessonId);});
          }
          if(pts>0) setScore(`${pts.toLocaleString()} pts`);
          if(done.size>0) setCompletedUnitInput(String(done.size));
        }catch(e){console.error('Abhi redo:',e);}
      }
    }
    // Myanmar Sound Practice redo fetch — same passedLevels-count logic as handleEndSession
    if (isSoundPracticeUrl(session.lessonLink)) {
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const rosterSnap = await getDoc(doc(db, 'artifacts', MYANMAR_SOUND_PRACTICE_APP_ID, 'public', 'data', 'roster', sanitizeSoundPracticeKey(stuName)));
          const passedLevels = rosterSnap.exists() && Array.isArray(rosterSnap.data().passedLevels) ? rosterSnap.data().passedLevels : [];
          if (passedLevels.length > 0) setCompletedUnitInput(String(passedLevels.length));
        } catch (e) { console.error('Myanmar Sound Practice redo fetch:', e); }
      }
    }
    // Burmese Consonant Game redo fetch — same completedGames-count logic as handleEndSession
    if (isBurmeseGameUrl(session.lessonLink)) {
      const stuName = studentProfile?.name;
      if (stuName) {
        try {
          const rosterSnap = await getDoc(doc(db, 'artifacts', BURMESE_GAME_APP_ID, 'public', 'data', 'roster', sanitizeBurmeseGameKey(stuName)));
          const completedGames = rosterSnap.exists() && Array.isArray(rosterSnap.data().completedGames) ? rosterSnap.data().completedGames : [];
          if (completedGames.length > 0) setCompletedUnitInput(String(completedGames.length));
        } catch (e) { console.error('Burmese Consonant Game redo fetch:', e); }
      }
    }
  };

  const handleAutoSubmitSession = async (sessionToSubmit, calculatedEndTime) => {
    if (!sessionToSubmit || !sessionToSubmit.id) return; 
    
    let finalEndTime;
    if (calculatedEndTime) {
      finalEndTime = Timestamp.fromDate(calculatedEndTime);
    } else {
      finalEndTime = Timestamp.fromDate(new Date(sessionToSubmit.startTime.toDate().getTime() + 45 * 60 * 1000));
    }
    
    if (finalEndTime.toDate() <= sessionToSubmit.startTime.toDate()) {
      finalEndTime = Timestamp.fromDate(new Date(sessionToSubmit.startTime.toDate().getTime() + 1 * 60 * 1000));
    }

    const autoFeedbackNotes = "Automatically submitted (45 min max / end of class).";
    const autoScore = "N/A";

    try {
      const sessionDoc = await getDoc(doc(db, `${publicDataPath}/studySessions`, sessionToSubmit.id));
      if (!sessionDoc.exists() || sessionDoc.data().endTime !== null) return;
      
      await updateDoc(doc(db, `${publicDataPath}/studySessions`, sessionToSubmit.id), {
        endTime: finalEndTime, feedbackNotes: autoFeedbackNotes, score: autoScore
      });
      playSound(0); 
    } catch (error) {
      console.error("Error auto-submitting session:", error);
    }
  };
  
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    const targetSession = redoSession || activeSession;
    if (!targetSession) return;
    
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    
    const notes = feedbackNotes.trim() || "Submitted without writing."; 
    
    const lessonKey = computeLessonKey(targetSession.lessonTitle, targetSession.lessonLink);
    const earnedTrophiesMap = studentProfile.earnedTrophies || {};
    const previouslyEarned = earnedTrophiesMap[lessonKey] || 0;
    const maxAvailable = targetSession.lessonTrophyLimit || 0;
    const remainingTrophies = Math.max(0, maxAvailable - previouslyEarned);

    const previousHighestUnit = getEffectivePreviousUnit(lessonKey, targetSession);
    const enteredUnit = parseFloat(completedUnitInput) || 0;
    const newHighestUnit = Math.max(previousHighestUnit, enteredUnit);
    
    try {
      await updateDoc(doc(db, `${publicDataPath}/studySessions`, targetSession.id), {
        endTime: serverTimestamp(), feedbackNotes: notes, score: score, completedUnit: enteredUnit,
        lessonUnitLabel: targetSession.lessonUnitLabel || 'Chapter',
        previousCompletedUnit: previousHighestUnit
      });
      playSound(0); 

      const studentDocRef = doc(db, `${publicDataPath}/students`, studentUid);
      const studentUpdateData = {};

      if (enteredUnit > 0) {
        studentUpdateData[`completedUnits.${lessonKey}`] = newHighestUnit;
      }

      const isMyanmarReaderSession = MYANMAR_READER_APP_URL && targetSession.lessonLink?.startsWith(MYANMAR_READER_APP_URL);

      if (isMyanmarReaderSession) {
        // One trophy per completed sheet (Sheet A and Sheet B each count
        // separately) that hasn't already been turned into a request —
        // myanmarReaderPendingScoreDocs was computed when the modal opened.
        if (myanmarReaderPendingScoreDocs.length > 0) {
          studentUpdateData.trophyRequested = true;
          studentUpdateData.requestedTrophyAmount = myanmarReaderPendingScoreDocs.length;
          studentUpdateData.requestedTrophyLessonId = targetSession.lessonId;
          studentUpdateData.requestedTrophyLessonTitle = targetSession.lessonTitle;
          studentUpdateData.requestedTrophyLessonLink = targetSession.lessonLink || null;
          studentUpdateData.requestedTrophySessionId = targetSession.id;
          // Mark each completed sheet as requested on Myanmar Reader's own
          // Firestore, so the same completion never gets counted into a
          // second request in a future session.
          try {
            const batch = writeBatch(db);
            myanmarReaderPendingScoreDocs.forEach(d => {
              batch.update(doc(db, 'artifacts', 'myanmar-reader-app', 'public', 'data', 'scores', d.id), { trophyRequested: true });
            });
            await batch.commit();
          } catch (e) { console.error('Error marking Myanmar Reader trophies as requested:', e); }
        }
      } else {
        const unitCount = targetSession.lessonUnitCount || 0;
        if (unitCount > 0 && maxAvailable > 0) {
          const deservedSoFar = Math.min(maxAvailable, Math.floor((newHighestUnit * maxAvailable) / unitCount));
          const autoAmount = Math.max(0, deservedSoFar - previouslyEarned);
          if (autoAmount > 0) {
            studentUpdateData.trophyRequested = true;
            studentUpdateData.requestedTrophyAmount = autoAmount;
            studentUpdateData.requestedTrophyLessonId = targetSession.lessonId;
            studentUpdateData.requestedTrophyLessonTitle = targetSession.lessonTitle;
            studentUpdateData.requestedTrophyLessonLink = targetSession.lessonLink || null;
            studentUpdateData.requestedTrophySessionId = targetSession.id;
          }
        }
      }

      if (Object.keys(studentUpdateData).length > 0) {
        await updateDoc(studentDocRef, studentUpdateData);
      }
      
      setPraiseModalInfo({ 
        isOpen: true, 
        newTrophy: false, 
        totalTrophies: studentProfile?.trophyCount || 0, 
        message: "Session complete!", 
        emoji: '👍' 
      });
      
    } catch (error) {
      } finally {
      setShowFeedbackModal(false);
      setRedoSession(null);
      setFeedbackNotes('');
      setScore('');
      setRequestTrophyChecked(false);
      setRequestTrophyAmount(1);
      setCompletedUnitInput('');
      setTodayCompletedInput('');
      setTrophyTapCount(0);
      setMyanmarReaderPendingScoreDocs([]);
    }
  };

  const handleUpdateStudentName = async () => {
    const trimmed = editingNameText.trim();
    if (!trimmed || !studentUid) return;
    
    try {
      const studentDocRef = doc(db, `${publicDataPath}/students`, studentUid);
      if (trimmed === studentProfile?.name) {
        // No actual change — just clear any stale pending request
        await updateDoc(studentDocRef, { pendingName: null });
      } else {
        // Name changes require teacher approval — store as pendingName,
        // the displayed name stays the same until the teacher approves it.
        await updateDoc(studentDocRef, { pendingName: trimmed });
      }
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating student profile:", error);
    }
  };

  const handleCancelPendingNameRequest = async () => {
    if (!studentUid) return;
    try {
      await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { pendingName: null });
    } catch (error) {
      console.error("Error cancelling pending name request:", error);
    }
  };

  const dismissAnnouncement = async (id) => {
    try {
      const studentRef = doc(db, `${publicDataPath}/students`, studentUid);
      await updateDoc(studentRef, {
        seenAnnouncements: arrayUnion(id)
      });
    } catch (error) {
      console.error("Error dismissing announcement:", error);
    }
  };
  
  const dismissAllAnnouncements = async () => {
    try {
      const newIds = visibleAnnouncements.map(a => a.id);
      if (newIds.length === 0) return;
      const studentRef = doc(db, `${publicDataPath}/students`, studentUid);
      await updateDoc(studentRef, {
        seenAnnouncements: arrayUnion(...newIds)
      });
    } catch(error) {
      console.error("Error dismissing all announcements:", error);
    }
  };

  if (studentProfile?.isActive === 'pending') {
    return <PendingScreen name={studentProfile.name} />;
  }
  if (studentProfile?.isActive === false) {
    return <DeactivatedScreen />;
  }
  
  const feedbackSession = redoSession || activeSession;
  const activeLessonKeyForModal = feedbackSession ? computeLessonKey(feedbackSession.lessonTitle, feedbackSession.lessonLink) : '';
  const earnedTrophiesMapForModal = studentProfile?.earnedTrophies || {};
  const previouslyEarnedForModal = feedbackSession ? (earnedTrophiesMapForModal[activeLessonKeyForModal] || 0) : 0;
  const maxAvailableForModal = (() => {
    if (!feedbackSession) return 0;
    // For SmartStudy sessions, derive trophy limit from the session's unitCount
    // (set correctly when lesson was sent via effectiveLessonUnitCount).
    // floor(10 lessons / 5) = 2 trophies — no reference to TeacherDashboard state.
    if (feedbackSession.lessonLink?.startsWith('smartstudy://') && feedbackSession.lessonUnitCount > 0) {
      return computeClassTrophyMax(feedbackSession.lessonUnitCount);
    }
    return feedbackSession.lessonTrophyLimit || 0;
  })();
  const remainingTrophiesForModal = Math.max(0, maxAvailableForModal - previouslyEarnedForModal);
  const previousHighestUnitForModal = feedbackSession ? getEffectivePreviousUnit(activeLessonKeyForModal, feedbackSession) : 0;

  const completedSessions = mySessions
    .filter(s => s.endTime && s.startTime)
    .sort((a, b) => {
      const bT = b.startTime?.toDate?.()?.getTime?.() ?? 0;
      const aT = a.startTime?.toDate?.()?.getTime?.() ?? 0;
      return bT - aT;
    });
    
  const availableLessons = myLessons; 

  return (
    <div className="p-6 relative">
      {isLessonOverlayOpen && (
        <div className="fixed inset-0 z-[9999] bg-indigo-900/95 flex flex-col justify-center items-center p-6 text-center">
           <h2 className="text-white text-2xl md:text-4xl font-bold mb-8">Lesson opened in another tab.</h2>
           <button onClick={() => setIsLessonOverlayOpen(false)} className="bg-red-500 hover:bg-red-600 px-8 py-5 rounded-2xl font-black text-white text-2xl transition-transform transform hover:scale-105 shadow-2xl">
             Close & Return to Dashboard
           </button>
        </div>
      )}
{heartsAnimGivers.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 h-64 z-50 pointer-events-none overflow-hidden">
          <style>{`
            @keyframes heartBubbleUp {
              0% { transform: translateY(0) scale(0.6); opacity: 0; }
              10% { opacity: 1; transform: translateY(-10px) scale(1); }
              85% { opacity: 1; }
              100% { transform: translateY(-220px) scale(0.9); opacity: 0; }
            }
          `}</style>
          {heartsAnimGivers.flatMap((g, gIdx) =>
            Array.from({ length: Math.min(g.count, 5) }).map((_, i) => {
              const leftPercent = 15 + ((gIdx * 5 + i) * 13) % 70;
              const delay = (gIdx * 0.3 + i * 0.25);
              return (
                <div
                  key={`${gIdx}-${i}`}
                  className="absolute bottom-4 flex flex-col items-center"
                  style={{
                    left: `${leftPercent}%`,
                    animation: `heartBubbleUp 3.5s ease-in ${delay}s 1 both`
                  }}
                >
                  <span className="text-3xl drop-shadow-md">❤️</span>
                  <span className="mt-1 text-xs font-bold text-rose-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {g.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
      <PraiseModal 
        isOpen={praiseModalInfo.isOpen}
        onClose={() => setPraiseModalInfo({ isOpen: false, newTrophy: false, totalTrophies: 0, message: '', emoji: '' })}
        newTrophy={praiseModalInfo.newTrophy} totalTrophies={praiseModalInfo.totalTrophies} message={praiseModalInfo.message} emoji={praiseModalInfo.emoji}
      />
      
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <form onSubmit={handleSubmitFeedback} className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <h3 className="text-xl font-semibold mb-4">Lesson Feedback</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">What did you study? (Optional)</label>
              <textarea
                value={feedbackNotes} onChange={(e) => setFeedbackNotes(e.target.value)} rows="4"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g., I finished Algebra Chapter 1."
              ></textarea>
            </div>
            {(()=>{ return (
            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-gray-700 mb-2 text-sm">Score</label>
                <input
                  type="text" value={score} onChange={(e) => setScore(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="10/10"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 text-sm">Today, completed</label>
                <input
                  type="number" min="0" step="0.5"
                  value={todayCompletedInput}
                  onChange={(e) => handleTodayCountChange(e.target.value)}
                  placeholder="e.g., 3"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="relative">
                <label className="block text-gray-700 mb-2 text-sm">Lesson completed</label>
                {requestTrophyChecked && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-900 text-sm font-bold px-4 py-2 rounded-xl shadow-lg whitespace-nowrap z-20 animate-bounce">
                    🏆 +{requestTrophyAmount} {requestTrophyAmount > 1 ? 'Trophies' : 'Trophy'}!
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <input
                    type="number" min="0" max={feedbackSession?.lessonUnitCount || undefined}
                    value={completedUnitInput}
                    onChange={(e) => {
                      const cap = feedbackSession?.lessonUnitCount || 0;
                      let v = e.target.value;
                      if (cap > 0 && parseFloat(v) > cap) v = String(cap);
                      handleCompletedUnitChange(v);
                    }}
                    step="0.5"
                    placeholder="e.g., 5"
                    className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {maxAvailableForModal > 0 && (feedbackSession?.lessonUnitCount || 0) > 0 && remainingTrophiesForModal > 0 && (
                    <button
                      type="button"
                      title="Tap for next trophy number"
                      onClick={() => {
                        const nextTapCount = Math.min(remainingTrophiesForModal, trophyTapCount + 1);
                        setTrophyTapCount(nextTapCount);
                        const neededUnit = Math.min(
                          feedbackSession.lessonUnitCount,
                          Math.ceil(((previouslyEarnedForModal + nextTapCount) * feedbackSession.lessonUnitCount) / maxAvailableForModal)
                        );
                        handleCompletedUnitChange(String(neededUnit));
                      }}
                      className="text-2xl flex-shrink-0 hover:scale-110 transition-transform"
                    >
                      🏆
                    </button>
                  )}
                </div>
              </div>

              {parseFloat(completedUnitInput) > 0 && (
                <p className="col-span-3 text-sm font-semibold text-emerald-700 mt-1">
                  {parseFloat(completedUnitInput) < previousHighestUnitForModal ? (
                    <>
                      You completed up to {feedbackSession?.lessonUnitLabel || 'Chapter'} {previousHighestUnitForModal}. Now you finished {feedbackSession?.lessonUnitLabel || 'Chapter'} {completedUnitInput}.
                    </>
                  ) : (
                    <>You completed up to {feedbackSession?.lessonUnitLabel || 'Chapter'} {completedUnitInput}.</>
                  )}
                </p>
              )}
            </div>
              );
            })()}
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="text-sm font-semibold">
                {maxAvailableForModal > 0 && (
                  <span className="text-yellow-700">
                    🏆 {previouslyEarnedForModal}{requestTrophyChecked && requestTrophyAmount > 0 ? `+${requestTrophyAmount}` : ''} / {maxAvailableForModal}
                    {remainingTrophiesForModal === 0 && <span className="ml-2 text-emerald-600">✅ All earned</span>}
                  </span>
                )}
              </div>
              <div className="flex space-x-3 ml-auto">
                <button type="button" onClick={() => { setShowFeedbackModal(false); setRedoSession(null); }} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 shadow-md">
                  Submit Report
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Once-per-day "greet your teacher" prompt. Sends a greeting doc the
          teacher's dashboard shows as a live toast (see greetingToast in
          TeacherDashboard). Image-only, no text -- young children don't
          read the text, so tapping the "Mangalabar" button under the
          picture of greeting a teacher is the whole interaction. */}
      {showGreetingPrompt && (
        <div className="fixed inset-0 bg-black/40 z-[9700] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-3 max-w-sm w-full text-center overflow-hidden">
            <img src="images/0001.jpg" alt="" className="w-full rounded-xl mb-3" />
            <button onClick={handleGreetTeacher} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl shadow-md">
              Mangalabar 🙏
            </button>
          </div>
        </div>
      )}

      {/* Log Out confirmation -- for a borrowed/shared device. A picture
          instead of a plain confirm() dialog, same reasoning as the
          greeting prompt: icons/pictures over text for young readers. */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[9700] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-3 max-w-sm w-full text-center overflow-hidden">
            <img src="images/0002.png" alt="" className="w-full rounded-xl mb-3" />
            <p className="text-sm text-gray-500 mb-3">Use this if you're on a borrowed or shared device. You can log back in anytime with your Student ID.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl shadow-md">
                Cancel
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); onLogout && onLogout(); }} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-time device-type question for Parami group members only --
          answer decides whether the inactivity auto-logout above applies. */}
      {isInParamiGroup && studentProfile?.isRentalDevice === undefined && (
        <div className="fixed inset-0 bg-black/40 z-[9700] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <p className="text-4xl mb-3">📱</p>
            <p className="text-lg font-bold text-gray-800 mb-5">This device is:</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { isRentalDevice: false }).catch(() => {})}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md text-lg"
              >
                🙋 Mine
              </button>
              <button
                onClick={() => updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { isRentalDevice: true }).catch(() => {})}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md text-lg"
              >
                🤝 Shared / Borrowed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 Notifications — fixed top-right, above where the Log Out button
          sits further down the page. Replaces the old always-visible
          "Awesome News Update" cards with a compact bell + unread dot, so
          trophy announcements for OTHER students don't take up permanent
          space on the dashboard. */}
      <div className="fixed top-4 right-4 z-[9500]">
        <button
          onClick={() => setShowNotifDropdown(v => !v)}
          className="relative bg-white hover:bg-gray-50 border border-gray-200 rounded-full w-11 h-11 flex items-center justify-center shadow-lg text-xl"
          title="Notifications"
        >
          🔔
          {unreadAnnouncementCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
              {unreadAnnouncementCount > 9 ? '9+' : unreadAnnouncementCount}
            </span>
          )}
        </button>
        {showNotifDropdown && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-2 px-1">
              <p className="font-bold text-gray-700 text-sm">Notifications (past week)</p>
              {visibleAnnouncements.length > 0 && (
                <button onClick={dismissAllAnnouncements} className="text-xs text-gray-400 hover:text-gray-700 font-semibold">
                  Dismiss All
                </button>
              )}
            </div>
            {visibleAnnouncements.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No notifications this week.</p>
            )}
            <div className="space-y-2">
              {visibleAnnouncements.map(ann => (
                <div key={ann.id} className={`p-3 rounded-lg border text-sm relative ${ann._unseen ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
                  <button onClick={() => dismissAnnouncement(ann.id)} className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-600 text-xs">✕</button>
                  <p className="font-bold text-yellow-900 pr-4">🎉 {ann.studentName}</p>
                  <p className="text-yellow-800">earned their <span className="font-black text-yellow-600">{ann.trophyCount}</span>th trophy! 🏆</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <h2 className="text-3xl font-bold mb-6 text-emerald-700">
        {studentProfile?.name}'s 🏡
      </h2>
      
      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-emerald-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        {isEditingName ? (
          <div className="space-y-3 w-full md:w-auto flex-1">
            <h3 className="text-lg font-semibold text-emerald-800 mb-4">Edit Profile</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={editingNameText} onChange={(e) => setEditingNameText(e.target.value)} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex space-x-3 pt-4 justify-end">
              <button onClick={() => { setIsEditingName(false); setEditingNameText(studentProfile.pendingName || studentProfile.name); }} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={handleUpdateStudentName} className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 shadow-md">
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-between items-center flex-wrap gap-4">
              <div>
                  <div className="flex items-center flex-wrap gap-3 mb-2">
                    <h3 className="text-2xl font-semibold text-emerald-800">{studentProfile?.name}</h3>
                    <button
                      onClick={() => { setEditingNameText(studentProfile?.pendingName || studentProfile?.name || ''); setIsEditingName(true); }}
                      className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors border border-emerald-200 flex-shrink-0"
                      title="Edit Profile"
                      aria-label="Edit Profile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    {studentProfile?.trophyCount > 0 && (
                        <span className="text-4xl font-bold text-yellow-600 px-2 py-1 drop-shadow-sm" title={`${studentProfile.trophyCount} Trophies`}>🏆 {studentProfile.trophyCount}</span>
                    )}
                  </div>
                  {studentProfile?.pendingName && (
                    <div className="mb-2 inline-flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-1.5">
                      <span className="text-yellow-800 text-sm font-semibold">
                        ⏳ Name change to "<strong>{studentProfile.pendingName}</strong>" is pending teacher approval.
                      </span>
                      <button onClick={handleCancelPendingNameRequest} className="text-xs text-red-600 hover:text-red-800 font-semibold underline">Cancel</button>
                    </div>
                  )}
                  <p className="text-gray-600 text-lg mt-2">Your ID: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded-md font-bold text-gray-800">{studentProfile?.displayId}</span></p>

                  <div className="mt-4">
                    <div className="bg-indigo-50 p-3 rounded-xl shadow-sm border border-indigo-100">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-bold text-lg text-emerald-600">{attendanceSummary.yearAttended}</span>
                          <span className="font-bold text-lg text-red-600">{attendanceSummary.yearAbsent}</span>
                        </div>
                        <AttendanceBar entries={attendanceSummary.yearEntries} />
                    </div>
                  </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {onOpenBodhiTree && (
                  <button
                    onClick={() => onOpenBodhiTree({ studentUid, studentName: studentProfile?.name || '' })}
                    className="flex items-center justify-center space-x-1 text-2xl bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-lg transition-colors border border-emerald-200"
                    title="My Bodhi Tree"
                  >
                    🌳
                  </button>
                )}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center justify-center space-x-1 text-gray-600 hover:text-red-700 bg-gray-100 hover:bg-red-50 px-4 py-2.5 rounded-lg font-semibold transition-colors border border-gray-200"
                  title="Log out of this device (e.g. borrowed/shared device)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h6a1 1 0 100-2H4V5h5a1 1 0 000-2H3zm10.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H7a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Log Out</span>
                </button>
                {!studentProfile?.hideFromGroupRoster && (
                  <button
                    onClick={() => {
                      if (window.confirm("🙈 Stop showing your name/ID on the teacher's group screen? Make sure you remember your own Student ID first — you won't see it listed there anymore.")) {
                        updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { hideFromGroupRoster: true }).catch(() => {});
                      }
                    }}
                    className="flex items-center justify-center space-x-1 text-gray-600 hover:text-amber-700 bg-gray-100 hover:bg-amber-50 px-4 py-2.5 rounded-lg font-semibold transition-colors border border-gray-200"
                    title="Stop showing my ID on the teacher's group screen"
                  >
                    <span className="text-lg">🙈</span>
                    <span>Hide My ID</span>
                  </button>
                )}
              </div>
          </div>
        )}
      </div>

      {activeSession && (() => {
        // Same getEffectiveCompletedUnit() used by Available Lessons and the
        // Completed badge there, so the Active Session box (the "Studying
        // Lesson N" text and the Continue button below) never contradicts
        // them -- e.g. showing "Studying Lesson 11" or a plain "Continue
        // Lesson 1" for a 10-lesson class the teacher just marked fully
        // complete via Fix Previously Earned.
        const activeUnitCount = activeSession.lessonUnitCount || 0;
        const pseudoLesson = { title: activeSession.lessonTitle, link: activeSession.lessonLink, unitCount: activeUnitCount, trophyLimit: activeSession.lessonTrophyLimit || 0 };
        const sessionsForActive = completedSessions.filter(s => s.lessonTitle === activeSession.lessonTitle);
        const activeEffectiveCompleted = getEffectiveCompletedUnit(pseudoLesson, studentProfile, sessionsForActive, ssCompletionCounts);
        const isActiveFullyComplete = activeUnitCount > 0 && activeEffectiveCompleted >= activeUnitCount;
        const isMyanmarReaderActive = !!(MYANMAR_READER_APP_URL && activeSession.lessonLink === MYANMAR_READER_APP_URL);
        const activeNextChapter = Math.min(activeUnitCount, getNextChapterNumber(activeEffectiveCompleted, isMyanmarReaderActive));
        return (
        <div ref={activeSessionRef} className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-xl shadow-lg mb-8">
          <h3 className="text-xl font-bold mb-3">Active Session</h3>
          <p className="text-lg mb-4">
            {activeSession.lessonTitle}
            {activeSession.lessonLink && extractSmartStudyClassId(activeSession.lessonLink) && (
              <span className="text-base font-semibold text-blue-700 ml-1">— {extractSmartStudyClassId(activeSession.lessonLink)}</span>
            )}
            {activeSession.lessonLink && activeSession.lessonLink.startsWith('abhidhamma://') && extractAbhidhammaLessonId(activeSession.lessonLink) && (
              <span className="text-base font-semibold text-blue-700 ml-1">— {extractAbhidhammaLessonId(activeSession.lessonLink)}</span>
            )}
            {activeSession.lessonLink && activeSession.lessonLink.startsWith('dhammaschool://') && extractDhammaschoolClassId(activeSession.lessonLink) && (
              <span className="text-base font-semibold text-blue-700 ml-1">— {extractDhammaschoolClassId(activeSession.lessonLink)}</span>
            )}
          </p>
          {activeUnitCount > 0 && (
            <p className="text-sm mb-4 font-semibold">
              {isActiveFullyComplete
                ? <>✅ Completed — all {activeUnitCount} {activeSession.lessonUnitLabel || 'Chapter'}{activeUnitCount === 1 ? '' : 's'}</>
                : <>Studying {activeSession.lessonUnitLabel || 'Chapter'} {activeNextChapter}</>
              }
            </p>
          )}

          <p className="text-sm mb-4">Started: {formatTimestamp(activeSession.startTime)}</p>
          {activeSession.startTime && typeof activeSession.startTime.toDate === 'function' && (
            <p className="text-sm mb-4 font-semibold">
              Studying for: {(() => {
                const elapsedMs = activeSession.startTime?.toDate ? Math.max(0, elapsedTick - activeSession.startTime.toDate().getTime()) : 0;
                const totalSeconds = Math.floor(elapsedMs / 1000);
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                return `${mins}m ${secs}s`;
              })()}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button 
              onClick={() => {
                let url = activeSession.lessonLink;
                if (url && url.startsWith('smartstudy://')) {
                  if (onOpenSmartStudy) {
                    onOpenSmartStudy({
                      mode: 'student',
                      classId: extractSmartStudyClassId(url),
                      studentName: studentProfile?.name,
                      studentUid,
                      ageLevel: studentProfile?.smartStudyAgeLevel || null,
                      onAgeLevelChosen: async (level) => {
                        try {
                          await updateDoc(doc(db, `${publicDataPath}/students`, studentUid), { smartStudyAgeLevel: level });
                        } catch (e) { console.error('Error saving age level:', e); }
                      }
                    });
                  }
                  return;
                }
                if (url && url.startsWith('abhidhamma://')) {
                  if (onOpenAbhidhamma) {
                    const ageGroupMap = { storyteller:'storytellers', explorer:'explorers', adventurer:'adventurers', voyager:'voyagers' };
                    onOpenAbhidhamma({
                      mode: 'student',
                      lessonId: extractAbhidhammaLessonId(url),
                      studentName: studentProfile?.name,
                      ageGroup: studentProfile?.smartStudyAgeLevel || null,
                    });
                  }
                  return;
                }
                if (url && url.startsWith('dhammaschool://')) {
                  if (onOpenDhammaschool) {
                    onOpenDhammaschool({
                      studentName: studentProfile?.name || '',
                      classId: extractDhammaschoolClassId(url) || '',
                    });
                  }
                  return;
                }
                if (url && url.startsWith('consonantpractice://')) {
                  if (onOpenConsonantPractice) onOpenConsonantPractice({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('burmesegame://')) {
                  if (onOpenBurmeseGame) onOpenBurmeseGame({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('numberlearning://')) {
                  if (onOpenNumberLearning) onOpenNumberLearning({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('vowelslearning://')) {
                  if (onOpenVowelsLearning) onOpenVowelsLearning({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('animalsound://')) {
                  if (onOpenAnimalSound) onOpenAnimalSound({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('burmeselearninggames://')) {
                  if (onOpenBurmeseLearningGames) onOpenBurmeseLearningGames({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('interactivequiz://')) {
                  if (onOpenInteractiveQuiz) onOpenInteractiveQuiz({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('myanmarpoems://')) {
                  if (onOpenMyanmarPoems) onOpenMyanmarPoems({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('consonantendings://')) {
                  if (onOpenConsonantEndings) onOpenConsonantEndings({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('timeandcalendar://')) {
                  if (onOpenTimeAndCalendar) onOpenTimeAndCalendar({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('myanmarspelling://')) {
                  if (onOpenMyanmarSpelling) onOpenMyanmarSpelling({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('myanmarsoundpractice://')) {
                  if (onOpenMyanmarSoundPractice) onOpenMyanmarSoundPractice({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (url && url.startsWith('readingmyanmar://')) {
                  const initialPart = extractGroupPartKey(url);
                  if (onOpenReadingMyanmar) onOpenReadingMyanmar({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
                  return;
                }
                if (url && url.startsWith('speakingmyanmar://')) {
                  const initialPart = extractGroupPartKey(url);
                  if (onOpenSpeakingMyanmar) onOpenSpeakingMyanmar({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
                  return;
                }
                if (url && url.startsWith('myanmarpart1and2://')) {
                  const initialPart = extractGroupPartKey(url);
                  if (onOpenMyanmarPart1And2) onOpenMyanmarPart1And2({ studentName: studentProfile?.name || '', ...(initialPart ? { initialPart } : {}) });
                  return;
                }
                if (url && url.startsWith('watchandlearn://')) {
                  if (onOpenWatchAndLearn) onOpenWatchAndLearn({ studentName: studentProfile?.name || '' });
                  return;
                }
                if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
                if (isMyanmarSpeakingUrl(url) && onOpenMyanmarSpeaking && studentProfile?.name) {
                  onOpenMyanmarSpeaking({ studentName: studentProfile.name });
                  return;
                }
                if (MYANMAR_READER_APP_URL && url.startsWith(MYANMAR_READER_APP_URL) && onOpenMyanmarReader && studentProfile?.name) {
                  onOpenMyanmarReader({ studentName: studentProfile.name });
                  return;
                }
                // Only the genuine window.open fallback below actually opens
                // another tab -- every branch above mounts its app inline in
                // this same page, so only this one needs the "opened in
                // another tab, come back here when done" overlay.
                openLink(url);
                setIsLessonOverlayOpen(true);
              }} 
              disabled={!activeSession.lessonLink} 
              className="w-full sm:w-1/2 bg-blue-500 text-white p-4 rounded-lg font-bold hover:bg-blue-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50"
            >
              {isActiveFullyComplete ? '✅ Completed — Continue' : 'Continue'}
            </button>
            <div className="w-full sm:w-1/2">
               <button 
                 onClick={handleEndSession} 
                 className="w-full text-white bg-red-500 hover:bg-red-600 p-4 rounded-lg font-bold transition-transform transform hover:scale-105 shadow-md"
               >
                 Report
               </button>
            </div>
          </div>
        </div>
        );
      })()}

      <div ref={lessonsSectionRef} className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-8 border border-gray-200 relative">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Available Lessons</h3>
        {availableLessons.length === 0 ? (
          <p className="text-gray-500">No new lessons from the teacher.</p>
        ) : (
          <div className={`space-y-4 ${activeSession ? 'opacity-60 pointer-events-none select-none' : ''}`}>
            {availableLessons.map((lesson, index) => {
              const isNew = lesson.status === 'pending';
              const divBg = isNew ? 'bg-emerald-50' : 'bg-yellow-50'; 
              const divBorder = isNew ? 'border-emerald-200' : 'border-yellow-200';
              const textHColor = isNew ? 'text-emerald-900' : 'text-yellow-900';
              const textPColor = isNew ? 'text-emerald-700' : 'text-yellow-700';
              const buttonBg = isNew ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-yellow-500 hover:bg-yellow-600';
              
              const lessonKeyList = computeLessonKey(lesson.title, lesson.link);
              const earnedTrophiesMapList = studentProfile?.earnedTrophies || {};
              const previouslyEarnedList = earnedTrophiesMapList[lessonKeyList] || 0;
              const maxAvailableList = lesson.trophyLimit || 0;
              const remainingList = Math.max(0, maxAvailableList - previouslyEarnedList);
              const sessionsForLessonList = completedSessions.filter(s => s.lessonTitle === lesson.title);
              const completedUnitList = getEffectiveCompletedUnit(lesson, studentProfile, sessionsForLessonList, ssCompletionCounts);
              const isMyanmarReaderLessonList = !!(MYANMAR_READER_APP_URL && lesson.link === MYANMAR_READER_APP_URL);
              const nextUnitNumberRaw = getNextChapterNumber(completedUnitList, isMyanmarReaderLessonList);
              const nextUnitNumber = lesson.unitCount > 0 ? Math.min(lesson.unitCount, nextUnitNumberRaw) : nextUnitNumberRaw;
              const latestSessionForLesson = completedSessions.find(s => s.lessonTitle === lesson.title && typeof s.completedUnit === 'number' && s.completedUnit > 0);
              const showNowFinished = !!latestSessionForLesson;
              const isSmartStudyLesson = !!(lesson.link && lesson.link.startsWith('smartstudy://'));
              const ssClassIdForBtn = isSmartStudyLesson ? extractSmartStudyClassId(lesson.link) : null;
              const buttonText = isNew
                ? (lesson.unitCount > 0 ? `Start ${lesson.unitLabel || 'Chapter'} ${nextUnitNumber}` : 'Start Lesson')
                : (lesson.unitCount > 0 ? `Continue ${lesson.unitLabel || 'Chapter'} ${nextUnitNumber}` : 'Continue Lesson');

              const recentCompletedSession = mySessions
                .filter(s => s.lessonTitle === lesson.title && s.endTime && s.startTime)
                .sort((a, b) => {
                  const bT = b.endTime?.toDate?.()?.getTime?.() ?? 0;
                  const aT = a.endTime?.toDate?.()?.getTime?.() ?? 0;
                  return bT - aT;
                })[0];
              const canRedoReport = recentCompletedSession
                && recentCompletedSession.endTime?.toDate
                && (nowTick - recentCompletedSession.endTime.toDate().getTime()) < 60 * 60 * 1000;

              return (
                <div key={lesson.id} ref={index === 0 ? firstLessonRef : null} className={`${divBg} ${divBorder} border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-lg ${textHColor}`}>{lesson.title}</p>
                      {isSmartStudyLesson && ssClassIdForBtn && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {ssClassIdForBtn}</span>
                      )}
                      {lesson.link && lesson.link.startsWith('abhidhamma://') && extractAbhidhammaLessonId(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {extractAbhidhammaLessonId(lesson.link)}</span>
                      )}
                      {lesson.link && lesson.link.startsWith('dhammaschool://') && extractDhammaschoolClassId(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {extractDhammaschoolClassId(lesson.link)}</span>
                      )}
                      {lesson.link && groupSchemeOfLink(lesson.link) && extractGroupPartKey(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {groupPartLabel(groupSchemeOfLink(lesson.link), extractGroupPartKey(lesson.link))}</span>
                      )}
                      {lesson.link && lesson.link.startsWith('watchandlearn://') && extractWatchLearnVideoKey(lesson.link) && (
                        <span className="text-sm font-semibold text-blue-600 ml-1">— {extractWatchLearnVideoKey(lesson.link)}</span>
                      )}
                      {lesson.unitCount > 0 && completedUnitList >= lesson.unitCount && (
                        <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">✅ Completed</span>
                      )}
                    </div>
                    <p className={`text-sm ${textPColor}`}>Sent: {formatTimestamp(lesson.sentAt)}</p>
                    {lesson.details && <p className={`text-sm ${textPColor} font-medium mt-1`}>Lesson ID: {lesson.details}</p>}
                    {lesson.link && lesson.link.startsWith('smartstudy://') && (
                      <SmartStudyProgressBadge
                        classId={extractSmartStudyClassId(lesson.link)}
                        studentName={studentProfile?.name}
                        smartStudyNames={studentProfile?.smartStudyNames || null}
                        onCountChange={(count) => setSsCompletionCounts(prev => {
                          // Bail out (return the SAME object reference) once the
                          // count stops changing -- this callback is a fresh
                          // function identity every render, so SmartStudyProgressBadge's
                          // effect (which depends on it) re-fires every render;
                          // without this guard, spreading into a new object every
                          // time re-renders the parent, recreating the callback,
                          // re-firing the effect -- an infinite loop ("Maximum
                          // update depth exceeded").
                          const key = extractSmartStudyClassId(lesson.link);
                          if (prev[key] === count) return prev;
                          return { ...prev, [key]: count };
                        })}
                      />
                    )}
                    {/* One unified message for every app (Smart Study, Abhidhamma,
                        Dhammaschool included) — same line, not split across a
                        <br/>, so it always reads as a single clear sentence:
                        "You completed up to X / Y. Now you finished X." Uses the
                        same getEffectiveCompletedUnit() number as the Completed
                        badge and the Continue button above, so they can never
                        disagree with each other. */}
                    {lesson.unitCount > 0 && (completedUnitList > 0 || showNowFinished) && (
                      <p className="text-sm font-bold text-indigo-700 mt-1">
                        You completed up to {lesson.unitLabel || 'Chapter'} {completedUnitList}{lesson.unitCount > 0 ? ` / ${lesson.unitCount}` : ''}.
                        {showNowFinished && ` Now you finished ${lesson.unitLabel || 'Chapter'} ${latestSessionForLesson.completedUnit}.`}
                      </p>
                    )}
                    {maxAvailableList > 0 && lesson.unitCount > 0 && (
                      <p className={`text-xs ${textPColor} italic mt-1`}>
                        Note: {(() => {
                          const rate = maxAvailableList / lesson.unitCount;
                          if (rate >= 1) {
                            const rounded = Math.round(rate * 10) / 10;
                            return `Every 1 ${lesson.unitLabel || 'Chapter'} completed ≈ ${rounded} Trophy(s).`;
                          }
                          return `Every ${Math.ceil(lesson.unitCount / maxAvailableList)} ${lesson.unitLabel || 'Chapter'}(s) completed = 1 Trophy.`;
                        })()}
                      </p>
                    )}
                    {maxAvailableList > 0 && remainingList > 0 && (
                      <div className="mt-3">
                         <span className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm font-bold px-3 py-1.5 rounded-full shadow-sm">
                           🏆 Remaining Trophies: <span className="text-lg mx-1">{remainingList}</span>
                         </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start sm:items-end mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto gap-2">
                    <button
                      onClick={() => handleStartLesson(lesson)}
                      disabled={!!activeSession}
                      className={`px-5 py-3 rounded-lg text-white font-semibold ${buttonBg} transition-transform transform hover:scale-105 shadow-md flex-shrink-0 w-full sm:w-auto disabled:opacity-50`}
                    >
                      {buttonText}
                    </button>
                    {/* Same 1-hour "Report" window for every linked app, including
                        SmartStudy — handleOpenRedoReport already re-fetches fresh
                        SmartStudy-specific data when needed, so there's no reason
                        this needed to be a special "always show" case. */}
                    {canRedoReport && !activeSession && (
                      <button
                        onClick={() => handleOpenRedoReport(recentCompletedSession)}
                        className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-500 hover:bg-red-600 shadow-md flex-shrink-0 w-full sm:w-auto"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
        <h3 className="text-xl font-semibold mb-1 text-gray-800">Completed Session History</h3>
        <p className="text-sm text-gray-500 mb-4">Showing the last 30 days.</p>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {completedSessions.length === 0 ? (
            <p className="text-gray-500">No completed sessions yet.</p>
          ) : (
            completedSessions.map(session => (
              <div key={session.id} className="bg-emerald-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900">{session.lessonTitle}</p>
                <p className="text-sm text-gray-600">Started: {formatTimestamp(session.startTime)}</p>
                <p className="text-sm text-gray-600">Finished: {formatTimestamp(session.endTime)}</p>
                <p className="text-sm text-gray-600">Duration: {getDuration(session.startTime, session.endTime)}</p>
                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold">Feedback:</p>
                  <p className="text-sm text-gray-700 mb-1">{session.feedbackNotes || 'N/A'}</p>
                  <p className="text-sm font-semibold mt-2">Score:</p>
                  <p className="text-sm text-gray-700">{session.score || 'N/A'}</p>
                  {session.completedUnit && session.completedUnit > 0 ? (
                     <p className="text-sm font-semibold text-indigo-600 mt-2">You completed up to {session.lessonUnitLabel || 'Chapter'} {session.completedUnit}.</p>
                  ) : null}
                  {session.awardedTrophies && session.awardedTrophies > 0 ? (
                     <p className="text-sm font-semibold text-yellow-600 mt-2">🏆 Trophies Awarded: {session.awardedTrophies}</p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EntryDetailsModal({ isOpen, onClose, entry }) {
  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <h3 className="text-xl font-semibold mb-4 text-indigo-700">Session Details</h3>
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <span className="block text-sm font-medium text-gray-600">Time:</span>
            <span className="block font-semibold text-gray-900">
              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg">
            <span className="block text-sm font-medium text-gray-600">Student:</span>
            <span className="block font-semibold text-gray-900">
              {entry.studentName}
            </span>
          </div>
          {entry.isRecurring && (
            <div className="p-3 bg-violet-100 rounded-lg">
              <p className="font-medium text-violet-800">This is a recurring session.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </div>
  );
}

function AttendanceCountModal({ isOpen, onClose, data }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm mx-4 text-center">
        <h3 className="text-xl font-semibold mb-4 text-indigo-700">Attendance Check</h3>
        {data.loading ? (
          <p className="text-gray-600">Calculating...</p>
        ) : data.error ? (
          <p className="text-red-600">Error fetching data.</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-800 mb-2">{data.name}</p>
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {data.attended} / {data.total}
            </div>
            <p className="text-gray-600 mb-6">sessions attended</p>
            {data.starMessages && data.starMessages.length > 0 && (
              <div className="text-left mb-2">
                <p className="font-semibold text-yellow-700 mb-2">⭐ Special Mentions</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {data.starMessages.map((m, i) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-sm text-gray-800">{m.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTimestamp(m.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-center">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Close</button>
        </div>
      </div>
    </div>
  );
}

const praiseMessages = [
  "Great job!", "Well done!", "Session complete!", "Keep up the good work!", 
  "Awesome effort!", "You're a star!", "Amazing!", "Fantastic work!"
];
const praiseEmojis = ['👍', '🎉', '🤩', '✨', '🚀', '🌟', '🥳'];

const getRandomPraise = () => ({ 
  message: praiseMessages[Math.floor(Math.random() * praiseMessages.length)],
  emoji: praiseEmojis[Math.floor(Math.random() * praiseEmojis.length)]
});

function PraiseModal({ isOpen, onClose, newTrophy, totalTrophies, message, emoji }) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;
  const title = newTrophy ? "Congratulations!" : message;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[110]">
      <div className="bg-transparent p-6 w-full max-w-sm mx-4 text-center flex flex-col items-center">
        <div className="text-[150px] leading-none mb-4 animate-bounce drop-shadow-2xl">{newTrophy ? '🏆' : emoji}</div>
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full">
          <h3 className="text-3xl font-black mb-4 text-emerald-700">{title}</h3>
          {newTrophy ? (
            <p className="text-xl text-gray-800 mb-6 font-medium">You earned a new trophy!<br />You now have <span className="font-bold text-yellow-600">{totalTrophies}</span> trophies.</p>
          ) : (
            <p className="text-lg text-gray-700 mb-6 font-medium">Session complete!<br />Keep up the good work!</p>
          )}
          <div className="flex justify-center">
            <button onClick={onClose} className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-600 shadow-lg w-full">Awesome!</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodaySchedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const q = query(
      teacherScheduleCollection,
      where("startTime", ">=", Timestamp.fromDate(startOfDay)),
      where("startTime", "<=", Timestamp.fromDate(endOfDay))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate());
      setSchedule(scheduleList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching today's schedule:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) { 
      const start = new Date();
      start.setHours(hour, 0, 0);
      const end = new Date();
      end.setHours(hour + 1, 0, 0);

      const timeLabel = `${start.toLocaleString('en-US', { hour: 'numeric', hour12: true })} - ${end.toLocaleString('en-US', { hour: 'numeric', hour12: true })}`;

      const entries = schedule.filter(e => { 
        const entryStartHour = e.startTime.toDate().getHours();
        return entryStartHour === hour;
      });

      if (entries.length > 0) { 
        slots.push(
          <div key={hour} className="w-full text-left p-4 rounded-lg bg-red-100 border border-red-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-red-800">{timeLabel}</span>
              <span className="font-bold text-red-900">BUSY</span>
            </div>
            <div className="space-y-2">
              {entries.map(entry => (
                <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left p-2 rounded-lg bg-white hover:bg-red-50 transition-colors">
                  <p className="text-sm text-red-700 font-medium">{entry.studentName}</p>
                </button>
              ))}
            </div>
          </div>
        );
      } else {
        slots.push(
          <div key={hour} className="w-full p-4 rounded-lg bg-emerald-100 border border-emerald-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-emerald-800">{timeLabel}</span>
              <span className="font-bold text-emerald-900">FREE</span>
            </div>
          </div>
        );
      }
    }
    return slots;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <EntryDetailsModal isOpen={!!selectedEntry} onClose={() => setSelectedEntry(null)} entry={selectedEntry} />
      
      <h2 className="text-3xl font-bold mb-6 text-violet-700">Today's Schedule</h2>
      <p className="text-lg text-gray-600 mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {loading ? (
        <p className="text-gray-600">Loading today's schedule...</p>
      ) : (
        <div className="space-y-3">{renderTimeSlots()}</div>
      )}
    </div>
  );
}

function WeeklySchedule({ role, targetStudentUid }) {
  const [schedule, setSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const [showCountModal, setShowCountModal] = useState(false);
  const [modalData, setModalData] = useState({ name: '', attended: 0, total: 0, loading: false });
  const [showOverrideModal, setShowOverrideModal] = useState({ isOpen: false, entry: null, newStatus: null });
  const [expandedGroupBatchKey, setExpandedGroupBatchKey] = useState(null);
  const myEntryRef = useRef(null);
  const hasScrolledToMineRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(studentsCollection, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(groupsCollection, (snap) => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);
  
  const getWeekStart = (offset = 0) => {
    const today = new Date();
    today.setDate(today.getDate() + (offset * 7)); 
    const dayOfWeek = today.getDay(); 
    const startDate = new Date(today.setDate(today.getDate() - dayOfWeek));
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  };

  const [weekStartDate, setWeekStartDate] = useState(getWeekStart(weekOffset));

  useEffect(() => {
    setWeekStartDate(getWeekStart(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const q = query(
      teacherScheduleCollection,
      where("startTime", ">=", Timestamp.fromDate(weekStartDate)),
      where("startTime", "<", Timestamp.fromDate(weekEndDate))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate());
      setSchedule(scheduleList);
    });
    
    const qSessions = query(
      sessionsCollection,
      where("startTime", ">=", Timestamp.fromDate(weekStartDate)), 
      where("startTime", "<", Timestamp.fromDate(weekEndDate))   
    );
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionList);
    });

    return () => {
      unsubscribe();
      unsubSessions();
    };
  }, [weekStartDate]);
  useEffect(() => {
    if (hasScrolledToMineRef.current || !targetStudentUid) return;
    const timer = setTimeout(() => {
      if (myEntryRef.current) {
        myEntryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToMineRef.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [schedule, targetStudentUid]);

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(weekStartDate);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [weekStartDate]);

  const openCountModal = async (studentUid, studentName) => {
    setModalData({ name: studentName, attended: 0, total: 0, loading: true });
    setShowCountModal(true);

    try {
      let scheduleQuery;
      if (studentUid === 'offline') {
          scheduleQuery = query(teacherScheduleCollection, where("studentName", "==", studentName));
      } else {
          scheduleQuery = query(teacherScheduleCollection, where("studentUid", "==", studentUid));
      }
      
      const scheduleSnapshot = await getDocs(scheduleQuery);
      let allScheduled = scheduleSnapshot.docs.map(d => d.data());
      
      const now = new Date();
      allScheduled = allScheduled.filter(e => e.startTime.toDate() <= now);

      if (studentUid === 'offline') {
          allScheduled = allScheduled.filter(e => e.studentUid === 'offline');
      }

      let allSessions = [];
      if (studentUid !== 'offline') {
          const sessionQuery = query(sessionsCollection, where("studentUid", "==", studentUid));
          const sessionSnapshot = await getDocs(sessionQuery);
          allSessions = sessionSnapshot.docs.map(d => d.data());
      }

      let attendedCount = 0;
      allScheduled.forEach(entry => {
        if (entry.overrideStatus === 'attended') {
            attendedCount++;
        } else if (entry.overrideStatus === 'absent') {
            
        } else if (studentUid !== 'offline') {
            const entryDate = entry.startTime.toDate();
            const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 0, 0, 0);
            const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);

            const attended = allSessions.find(s =>
                s.startTime.toDate() >= startOfDay &&
                s.startTime.toDate() <= endOfDay
            );
            if (attended) attendedCount++;
        }
      });
      
      let starMessages = [];
      try {
        const starQuery = studentUid === 'offline'
          ? query(starAnnouncementsCollection, where("studentName", "==", studentName))
          : query(starAnnouncementsCollection, where("studentUid", "==", studentUid));
        const starSnap = await getDocs(starQuery);
        starMessages = starSnap.docs
          .map(d => d.data())
          .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      } catch (e) {
        console.error("Error fetching star messages:", e);
      }

      setModalData({ name: studentName, attended: attendedCount, total: allScheduled.length, starMessages, loading: false });
    } catch (e) {
      console.error("Error fetching attendance count:", e);
      setModalData({ name: studentName, attended: 0, total: 0, loading: false, error: true }); 
    }
  }
  
  const openOverrideModal = (entry, newStatus) => {
    let statusText = '';
    if (newStatus === 'attended') statusText = 'Attended';
    else if (newStatus === 'absent') statusText = 'Absent';
    else statusText = 'Automatic';
    
    setShowOverrideModal({
      isOpen: true, entry: entry, newStatus: newStatus, title: 'Confirm Attendance',
      message: `Are you sure you want to mark ${entry.studentName} as ${statusText.toLowerCase()}?`, confirmText: 'Confirm'
    });
  };

  const confirmOverride = async () => {
    const { entry, newStatus } = showOverrideModal;
    if (!entry) return;

    try {
      const docRef = doc(db, `${publicDataPath}/teacherSchedule`, entry.id);
      await updateDoc(docRef, { overrideStatus: newStatus });
    } catch (error) {
      console.error("Error overriding attendance:", error);
    }
    
    setShowOverrideModal({ isOpen: false, entry: null, newStatus: null });
  };

  // Used for marking one member within an expanded group cluster -- no
  // confirmation dialog, unlike openOverrideModal/confirmOverride above,
  // since correcting one of several members is low-stakes and should be a
  // single tap, not a popup each time.
  const quickSetAttendance = async (entry, status) => {
    try {
      const docRef = doc(db, `${publicDataPath}/teacherSchedule`, entry.id);
      await updateDoc(docRef, { overrideStatus: status });
    } catch (error) {
      console.error("Error setting attendance:", error);
    }
  };

  // For a mistakenly-created entry itself (wrong student, wrong time) --
  // separate from the Attended/Absent/Reset buttons above, which only
  // change the attendance mark on an entry that's otherwise correct.
  const handleDeleteScheduleEntry = async (entry) => {
    if (!window.confirm(`Delete this schedule entry for ${entry.studentName} (${formatTime(entry.startTime)} - ${formatTime(entry.endTime)})? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, `${publicDataPath}/teacherSchedule`, entry.id));
    } catch (error) {
      console.error("Error deleting schedule entry:", error);
    }
  };

  return (
    <div className="p-6">
      <AttendanceCountModal isOpen={showCountModal} onClose={() => setShowCountModal(false)} data={modalData} />
      <ConfirmationModal
        isOpen={showOverrideModal.isOpen} onClose={() => setShowOverrideModal({ isOpen: false, entry: null, newStatus: null })}
        onConfirm={confirmOverride} title={showOverrideModal.title} message={showOverrideModal.message}
        confirmText={showOverrideModal.confirmText} confirmColor="bg-indigo-600 hover:bg-indigo-700"
      />
      
      <h2 className="text-3xl font-bold mb-6 text-violet-700">Teacher's Weekly Schedule</h2>
      
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setWeekOffset(o => o - 1)} className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow-md">&larr; Previous Week</button>
        <h3 className="text-lg font-semibold text-gray-700">
          {weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &nbsp;-&nbsp; {new Date(weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </h3>
        <button onClick={() => setWeekOffset(o => o + 1)} className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 shadow-md">Next Week &rarr;</button>
      </div>

      <div className="space-y-6">
        {daysOfWeek.map(day => {
          const dayEntries = schedule.filter(entry => {
            const entryDate = entry.startTime.toDate();
            return entryDate.getDate() === day.getDate() && entryDate.getMonth() === day.getMonth() && entryDate.getFullYear() === day.getFullYear();
          });

          // Cluster same-occurrence Group entries into one display item for
          // the teacher's view (the teacher picked "Group" once, so it
          // should look like one class session, not N separate rows) -- a
          // student's own schedule never clusters, every entry there is
          // simply theirs like any other online entry.
          const displayItems = targetStudentUid
            ? dayEntries.map(entry => ({ isCluster: false, entry, sortTime: entry.startTime.toDate() }))
            : (() => {
                const clusters = {};
                const items = [];
                dayEntries.forEach(entry => {
                  if (entry.groupBatchKey) {
                    if (!clusters[entry.groupBatchKey]) {
                      const cluster = { isCluster: true, groupBatchKey: entry.groupBatchKey, entries: [], sortTime: entry.startTime.toDate() };
                      clusters[entry.groupBatchKey] = cluster;
                      items.push(cluster);
                    }
                    clusters[entry.groupBatchKey].entries.push(entry);
                  } else {
                    items.push({ isCluster: false, entry, sortTime: entry.startTime.toDate() });
                  }
                });
                items.forEach(item => { if (item.isCluster) item.entries.sort((a, b) => a.studentName.localeCompare(b.studentName)); });
                return items.sort((a, b) => a.sortTime - b.sortTime);
              })();

          return (
            <div key={day.toISOString()} className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200">
              <h4 className="font-bold text-lg text-gray-800 border-b pb-2 mb-3">
                {day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h4>
              <div className="space-y-2">
                {displayItems.length === 0 ? (
                  <p className="text-gray-500">No sessions scheduled.</p>
                ) : (
                  displayItems.map(item => {
                    if (item.isCluster) {
                      const first = item.entries[0];
                      const groupName = groups.find(g => g.id === first.groupId)?.groupName || 'Group';
                      const isPast = first.endTime.toDate() < new Date();
                      const statuses = item.entries.map(e => getStudentAttendanceForEntry(e, e.studentUid, sessions));
                      const attendedCount = statuses.filter(s => s === 'attended').length;
                      const absentCount = statuses.filter(s => s === 'absent').length;
                      const isExpanded = expandedGroupBatchKey === item.groupBatchKey;

                      return (
                        <div key={item.groupBatchKey} className={`rounded-lg ${absentCount > 0 ? 'bg-orange-50' : 'bg-violet-50'}`}>
                          <button
                            onClick={() => setExpandedGroupBatchKey(isExpanded ? null : item.groupBatchKey)}
                            className="w-full text-left p-3"
                          >
                            <p className="font-semibold text-violet-900">
                              <span className="mr-1">{isExpanded ? '▾' : '▸'}</span>
                              {groupName}
                            </p>
                            <p className="text-sm text-gray-700">
                              {formatTime(first.startTime)} - {formatTime(first.endTime)}
                              {first.isRecurring && <span className="ml-2 text-xs font-medium bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">Recurring</span>}
                              <span className="ml-2 text-xs font-bold text-emerald-700">{attendedCount} attended</span>
                              <span className="ml-2 text-xs font-bold text-red-700">{absentCount} absent</span>
                              <span className="ml-2 text-xs text-gray-500">/ {item.entries.length} total</span>
                            </p>
                          </button>

                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-1">
                              {item.entries.map((entry, i) => {
                                const status = statuses[i];
                                return (
                                  <div key={entry.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                                    <span className="text-sm font-medium text-gray-800">{entry.studentName}</span>
                                    <div className="flex items-center gap-1">
                                      {role === 'teacher' && isPast && (
                                        <>
                                          <button
                                            onClick={() => quickSetAttendance(entry, 'attended')}
                                            className={`text-xs font-semibold px-2 py-1 rounded-full ${status === 'attended' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                          >
                                            ✓ Attended
                                          </button>
                                          <button
                                            onClick={() => quickSetAttendance(entry, 'absent')}
                                            className={`text-xs font-semibold px-2 py-1 rounded-full ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                                          >
                                            ✕ Absent
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const entry = item.entry;
                    const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
                    const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

                    const isOnline = entry.studentUid !== 'offline';
                    const isPast = entry.endTime.toDate() < new Date();
                    let attendanceStatus = 'upcoming';
                    let bgColor = 'bg-violet-50';
                    let attendanceTime = null;

                    if (entry.overrideStatus === 'attended') {
                        attendanceStatus = 'attended'; bgColor = 'bg-emerald-100';
                    } else if (entry.overrideStatus === 'absent') {
                        attendanceStatus = 'absent'; bgColor = 'bg-red-100';
                    } else if (isOnline) {
                      const attendedSession = sessions
                        .filter(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay)
                        .sort((a, b) => a.startTime.toDate() - b.startTime.toDate())[0];

                      if (attendedSession) {
                        attendanceStatus = 'attended'; bgColor = 'bg-emerald-100'; attendanceTime = attendedSession.startTime;
                      } else if (isPast) {
                        attendanceStatus = 'absent'; bgColor = 'bg-red-100';
                      }
                    } else {
                      if (isPast) {
                        attendanceStatus = 'unmarked'; bgColor = 'bg-orange-50';
                      }
                    }

                    const isMine = targetStudentUid && entry.studentUid === targetStudentUid;

                    return (
                      <div key={entry.id} ref={isMine ? myEntryRef : null} className={`p-3 rounded-lg flex items-center justify-between ${bgColor} ${isMine ? 'ring-2 ring-indigo-500' : ''}`}>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: stringToColor(entry.studentName) }}></div>
                          <button onClick={() => openCountModal(entry.studentUid, entry.studentName)} className="text-left disabled:cursor-not-allowed">
                            <p className={`font-semibold ${attendanceStatus === 'absent' ? 'text-red-900' : (attendanceStatus === 'attended' ? 'text-emerald-900' : 'text-violet-900')}`}>
                              {entry.studentName}{isMine && <span className="ml-2 text-xs font-bold text-indigo-600">(You)</span>}
                            </p>
                            <p className="text-sm text-gray-700">
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                               {entry.isRecurring && <span className="ml-2 text-xs font-medium bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full">Recurring</span>}
                              {attendanceStatus === 'attended' && <span className="ml-2 text-xs font-bold text-emerald-700">(Attended{attendanceTime ? ` at ${formatTime(attendanceTime)}` : ''})</span>}
                              {attendanceStatus === 'absent' && <span className="ml-2 text-xs font-bold text-red-700">(Absent)</span>}
                            </p>
                          </button>
                        </div>

                        {role === 'teacher' && (
                          <div className="flex space-x-1 flex-shrink-0">
                            {isPast && attendanceStatus !== 'attended' && (
                              <button onClick={() => openOverrideModal(entry, 'attended')} title="Mark Attended" className="p-1 rounded-full text-emerald-600 hover:bg-emerald-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                            {isPast && attendanceStatus !== 'absent' && (
                              <button onClick={() => openOverrideModal(entry, 'absent')} title="Mark Absent" className="p-1 rounded-full text-red-600 hover:bg-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                            {isPast && entry.overrideStatus && (
                              <button onClick={() => openOverrideModal(entry, null)} title="Reset to Automatic" className="p-1 rounded-full text-indigo-600 hover:bg-indigo-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 3a1 1 0 011 1v2.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L8 6.586V4a1 1 0 011-1zM12 10a1 1 0 01-1 1H8a1 1 0 010-2h3a1 1 0 011 1zM11.414 13.293a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L10 13.586l1.293-1.293a1 1 0 011.414 1.414l-3 3z" clipRule="evenodd" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                            {/* Delete the entry itself -- for when it was created wrong
                                (wrong student / wrong time), not just marked wrong.
                                Always available, not gated on isPast, since a mistaken
                                entry is usually noticed before its time arrives. */}
                            <button onClick={() => handleDeleteScheduleEntry(entry)} title="Delete this entry" className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-red-700">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function YearAttendanceBoard({ role, targetStudentUid }) {
  const [students, setStudents] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [hiddenOfflineNames, setHiddenOfflineNames] = useState([]);
  const myRowRef = useRef(null);
  const hasScrolledToMineRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(studentsCollection, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    // Only this year's schedule is needed here — a single range filter on one
    // field doesn't require a composite index, and cuts the download size a
    // lot for classes with years of history.
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(teacherScheduleCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setTeacherSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(sessionsCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(teacherConfigDoc, (docSnap) => {
      if (docSnap.exists()) setHiddenOfflineNames(docSnap.data().hiddenOfflineNames || []);
    });
    return () => unsub();
  }, []);

  const toggleHideOffline = async (name) => {
    try {
      const updated = hiddenOfflineNames.includes(name)
        ? hiddenOfflineNames.filter(n => n !== name)
        : [...hiddenOfflineNames, name];
      await setDoc(teacherConfigDoc, { hiddenOfflineNames: updated }, { merge: true });
    } catch (e) {
      console.error("Error updating hidden list:", e);
    }
  };

  const rankedList = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const offlineNames = [...new Set(teacherSchedule.filter(s => s.studentUid === 'offline').map(s => s.studentName))];
    const offlineEntries = offlineNames.map(name => ({ id: `offline-${name}`, name, isOffline: true }));
    const onlineEntries = students.filter(s => s.isActive === true).map(s => ({ id: s.id, name: s.name, isOffline: false }));
    const allEntries = [...onlineEntries, ...offlineEntries];

    const computed = allEntries.map(entry => {
      let attended = 0, absent = 0;
      teacherSchedule.forEach(sched => {
        const entryDate = sched.startTime.toDate();
        if (entryDate > now || entryDate < startOfYear) return;

        const isMatch = entry.isOffline
          ? (sched.studentUid === 'offline' && sched.studentName === entry.name)
          : (sched.studentUid === entry.id);
        if (!isMatch) return;

        const status = getStudentAttendanceForEntry(sched, entry.id, sessions);
        if (status === 'attended') attended++; else absent++;
      });
      return { ...entry, attended, absent, total: attended + absent };
    });

    return computed.filter(e => e.total > 0).sort((a, b) => b.attended - a.attended);
  }, [students, teacherSchedule, sessions]);

  const visibleList = rankedList.filter(e => !e.isOffline || !hiddenOfflineNames.includes(e.name));

  useEffect(() => {
    if (hasScrolledToMineRef.current || !targetStudentUid) return;
    const timer = setTimeout(() => {
      if (myRowRef.current) {
        myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToMineRef.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [visibleList, targetStudentUid]);

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <h2 className="text-3xl font-bold mb-6 text-indigo-700">This Year's Attendance</h2>
      <div className="space-y-3">
        {visibleList.length === 0 ? (
          <p className="text-gray-500">No attendance data yet this year.</p>
        ) : (
          visibleList.map((entry, idx) => {
            const isMine = targetStudentUid && !entry.isOffline && entry.id === targetStudentUid;
            return (
            <div key={entry.id} ref={isMine ? myRowRef : null} className={`bg-white p-4 rounded-xl shadow-md flex items-center justify-between border ${isMine ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-100'}`}>
              <div className="flex items-center">
                <span className="text-xl font-bold text-indigo-400 w-8">{idx + 1}</span>
                <div className="w-3 h-3 rounded-full mx-3 flex-shrink-0" style={{ backgroundColor: stringToColor(entry.name) }}></div>
                <div>
                  <p className="font-semibold text-gray-900">{entry.name} {isMine && <span className="ml-2 text-xs font-bold text-indigo-600">(You)</span>} {entry.isOffline && <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Offline</span>}</p>
                  <p className="text-sm text-gray-600">Attended {entry.attended} / {entry.total}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-emerald-600">{entry.attended}</span>
                {role === 'teacher' && entry.isOffline && (
                  <button onClick={() => toggleHideOffline(entry.name)} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200">
                    Hide
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
      {role === 'teacher' && hiddenOfflineNames.length > 0 && (
        <div className="mt-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="font-semibold text-gray-700 mb-3">Hidden Offline Students</p>
          <div className="flex flex-wrap gap-2">
            {hiddenOfflineNames.map(name => (
              <button key={name} onClick={() => toggleHideOffline(name)} className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                {name} (Unhide)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrophyBoard({ role, targetStudentUid, studentProfile }) {
  const [students, setStudents] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [expandedGivers, setExpandedGivers] = useState(null);
  const myRowRef = useRef(null);
  const hasScrolledToMineRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(studentsCollection, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(teacherScheduleCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setTeacherSchedule(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const q = query(sessionsCollection, where("startTime", ">=", Timestamp.fromDate(startOfYear)));
    const unsub = onSnapshot(q, (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const rankedList = useMemo(() => {
    return students
      .filter(s => s.isActive === true && (s.trophyCount || 0) > 0)
      .sort((a, b) => (b.trophyCount || 0) - (a.trophyCount || 0));
  }, [students]);
  useEffect(() => {
    if (hasScrolledToMineRef.current || role !== 'student' || !targetStudentUid) return;
    const timer = setTimeout(() => {
      if (myRowRef.current) {
        myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToMineRef.current = true;
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [rankedList, role, targetStudentUid]);

  const myAttendedThisYear = useMemo(() => {
    if (role !== 'student' || !targetStudentUid) return 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    let attended = 0;
    teacherSchedule.forEach(sched => {
      if (sched.studentUid !== targetStudentUid) return;
      const entryDate = sched.startTime.toDate();
      if (entryDate > now || entryDate < startOfYear) return;
      if (sched.overrideStatus === 'attended') attended++;
      else if (sched.overrideStatus === 'absent') return;
      else {
        const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
        const didAttend = sessions.some(s => s.studentUid === targetStudentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
        if (didAttend) attended++;
      }
    });
    return attended;
  }, [teacherSchedule, sessions, targetStudentUid, role]);

  const heartsGivenSoFar = studentProfile?.heartsGivenCount || 0;
  const remainingHearts = role === 'student' ? Math.max(0, myAttendedThisYear - heartsGivenSoFar) : null;

  const handleHeart = async (recipientId) => {
    if (role === 'student' && remainingHearts <= 0) return;
    const giverName = role === 'student' ? (studentProfile?.name || 'A student') : 'Teacher';
    const giverKey = sanitizeKey(giverName);
    try {
      const recipientRef = doc(db, `${publicDataPath}/students`, recipientId);
      const updateData = { heartsReceived: increment(1) };
      updateData[`heartsFromCounts.${giverKey}_name`] = giverName;
      updateData[`heartsFromCounts.${giverKey}_count`] = increment(1);
      await updateDoc(recipientRef, updateData);
      if (role === 'student' && targetStudentUid) {
        const giverRef = doc(db, `${publicDataPath}/students`, targetStudentUid);
        await updateDoc(giverRef, { heartsGivenCount: increment(1) });
      }
    } catch (e) {
      console.error("Error sending heart:", e);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <h2 className="text-3xl font-bold mb-2 text-yellow-600">🏆 Trophies Awarded</h2>
      {role === 'student' && (
        <p className="text-sm text-gray-600 mb-6">
          You can send <span className="font-bold text-rose-600">{remainingHearts}</span> more ❤️ this year (based on {myAttendedThisYear} attended sessions).
        </p>
      )}
      <div className="space-y-3">
        {rankedList.length === 0 ? (
          <p className="text-gray-500">No trophies awarded yet.</p>
        ) : (
          rankedList.map((student, idx) => {
            const isSelf = role === 'student' && student.id === targetStudentUid;
            const heartsFromCounts = student.heartsFromCounts || {};
            const giverKeys = [...new Set(Object.keys(heartsFromCounts).map(k => k.replace(/_name$|_count$/, '')))];
            const givers = giverKeys.map(k => ({
              name: heartsFromCounts[`${k}_name`],
              count: heartsFromCounts[`${k}_count`] || 0
            })).filter(g => g.name).sort((a, b) => b.count - a.count);
            const isExpanded = expandedGivers === student.id;
            return (
              <div key={student.id} ref={isSelf ? myRowRef : null} className={`bg-white p-4 rounded-xl shadow-md border ${isSelf ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-yellow-400 w-8">{idx + 1}</span>
                    <div className="w-3 h-3 rounded-full mx-3 flex-shrink-0" style={{ backgroundColor: stringToColor(student.name) }}></div>
                    <div>
                      <p className="font-semibold text-gray-900">{student.name} {isSelf && <span className="ml-2 text-xs font-bold text-indigo-600">(You)</span>}</p>
                      <p className="text-sm text-yellow-700 font-bold">🏆 {student.trophyCount}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleHeart(student.id)}
                    disabled={isSelf || (role === 'student' && remainingHearts <= 0)}
                    title={isSelf ? "You can't heart yourself" : (role === 'student' && remainingHearts <= 0 ? "No hearts remaining this year" : "Send a heart")}
                    className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-transform hover:scale-105"
                  >
                    <span className="text-xl">❤️</span>
                    <span className="font-bold text-rose-600">{student.heartsReceived || 0}</span>
                  </button>
                </div>
                {isSelf && givers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => setExpandedGivers(isExpanded ? null : student.id)} className="text-sm text-rose-600 font-semibold hover:underline">
                      {isExpanded ? 'Hide' : 'See'} who sent you hearts ({givers.length})
                    </button>
                    {isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {givers.map((g, i) => (
                          <span key={i} className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-full border border-rose-200">{g.name} × {g.count}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RoleSelection({ user, onSelectRole, onStudentLogin, teacherUid, onRecoverTeacher }) {
  const [studentName, setStudentName] = useState('');
  const [studentIdLogin, setStudentIdLogin] = useState('');
  const [formError, setFormError] = useState(''); 
  const [view, setView] = useState('new'); 
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPasscode, setRecoveryPasscode] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  // Hidden trigger: tapping "Welcome" 5 times reveals the recovery passcode
  // box directly — no visible "Locked out?" link, so a student or anyone
  // else looking at this screen has no way to even know a recovery path
  // exists. Resets if there's a pause between taps (avoids someone stumbling
  // into it by repeatedly tapping over a long session).
  const [welcomeTapCount, setWelcomeTapCount] = useState(0);
  const welcomeTapTimerRef = useRef(null);
  const handleWelcomeTap = () => {
    if (welcomeTapTimerRef.current) clearTimeout(welcomeTapTimerRef.current);
    const next = welcomeTapCount + 1;
    if (next >= 5) {
      setShowRecovery(true);
      setWelcomeTapCount(0);
      return;
    }
    setWelcomeTapCount(next);
    welcomeTapTimerRef.current = setTimeout(() => setWelcomeTapCount(0), 2000);
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!recoveryPasscode.trim()) { setFormError('Please enter the recovery passcode.'); return; }
    setRecoverySubmitting(true);
    await onRecoverTeacher(recoveryPasscode.trim(), setFormError);
    setRecoverySubmitting(false);
  };

  useEffect(() => {
    const savedId = localStorage.getItem('lastStudentId');
    if (savedId) {
      setStudentIdLogin(savedId);
    }
  }, []);

  const handleSelectStudent = (e) => {
    e.preventDefault();
    setFormError(''); 
    if (studentName.trim()) {
      onSelectRole('student', studentName.trim(), setFormError); 
    } else {
      setFormError('Please enter your name.'); 
    }
  };
  
  const handleStudentLogin = (e) => {
    e.preventDefault();
    setFormError(''); 
    if (studentIdLogin.trim()) {
      onStudentLogin(studentIdLogin.trim().toUpperCase(), (errorMsg) => { 
        if(errorMsg) setFormError(errorMsg); 
      });
    } else {
      setFormError('Please enter your Student ID.'); 
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md w-full">
        {/* Looks and behaves like a plain heading — no underline, no pointer
            cursor, no color change — so there's nothing visually suggesting
            it's tappable. See handleWelcomeTap for what 5 quick taps does. */}
        <h2
          onClick={handleWelcomeTap}
          className="text-2xl font-bold text-center mb-6 text-gray-800 select-none"
        >
          Welcome
        </h2>

        {!teacherUid && (
          <>
            <button onClick={() => { setFormError(''); onSelectRole('teacher', '', setFormError); }} className="w-full bg-indigo-500 text-white p-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors shadow-md">
              I am a Teacher
            </button>
            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink mx-4 text-gray-500">OR</span><div className="flex-grow border-t border-gray-300"></div>
            </div>
          </>
        )}

        {/* Teacher account already exists on this app, but this browser/device
            isn't recognized as it (e.g. cleared storage, new device, another
            app on the same origin signed this session out). A known recovery
            passcode re-associates teacher access with this browser instead of
            needing a manual database fix. No visible entry point into this —
            reached only via the 5-tap "Welcome" trigger above, on purpose. */}
        {teacherUid && showRecovery && (
          <div className="mb-6 text-center">
              <form onSubmit={handleRecoverySubmit} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-left">
                <p className="text-sm font-semibold text-indigo-800 mb-2">Enter your Teacher recovery passcode:</p>
                <input
                  type="password"
                  value={recoveryPasscode}
                  onChange={(e) => setRecoveryPasscode(e.target.value)}
                  placeholder="Recovery passcode"
                  autoFocus
                  className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowRecovery(false); setFormError(''); setRecoveryPasscode(''); }} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={recoverySubmitting} className="flex-1 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 disabled:opacity-50">
                    {recoverySubmitting ? 'Checking...' : 'Recover Access'}
                  </button>
                </div>
              </form>
          </div>
        )}

        <div>
          <div className="flex mb-4 rounded-lg bg-gray-100 p-1">
            <button onClick={() => setView('new')} className={`w-1/2 p-2 rounded-lg font-semibold ${view === 'new' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>New Student</button>
            <button onClick={() => setView('existing')} className={`w-1/2 p-2 rounded-lg font-semibold ${view === 'existing' ? 'bg-white shadow text-emerald-600' : 'text-gray-600'}`}>Existing Account</button>
          </div>
          
          {view === 'new' && (
            <form onSubmit={handleSelectStudent}>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Create New Student Account</h3>
              {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>} 
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Your Name</label>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="e.g., John Doe" className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors shadow-md">Create Account</button>
            </form>
          )}
          
          {view === 'existing' && (
             <form onSubmit={handleStudentLogin}>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Login with Existing Account</h3>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Your Student ID</label>
                <input type="text" value={studentIdLogin} onChange={(e) => setStudentIdLogin(e.target.value)} placeholder="ABC123" className="w-full p-3 border rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>} 
              <button type="submit" className="w-full bg-emerald-500 text-white p-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors shadow-md">Login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingScreen({ name }) {
  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-200 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Welcome, {name}!</h2>
        <p className="text-lg text-gray-700">Your account is waiting for approval from the teacher.</p>
        <p className="text-gray-600 mt-4">Please check back later.</p>
        <div className="mt-6 text-5xl">👍</div>
      </div>
    </div>
  );
}

function DeactivatedScreen() {
  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-red-200 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-700">Account Deactivated</h2>
        <p className="text-lg text-gray-700">Your account has been deactivated by the teacher.</p>
        <p className="text-gray-600 mt-4">Please contact the teacher if you believe this is an error.</p>
        <div className="mt-6 text-5xl">🚫</div>
      </div>
    </div>
  );
}

export default function TutoringApp({ onOpenSmartStudy, onOpenAbhidhamma, onOpenMyanmarReader, onOpenDhammaschool, onOpenConsonantPractice, onOpenBurmeseGame, onOpenMyanmarSpeaking, onOpenNumberLearning, onOpenVowelsLearning, onOpenAnimalSound, onOpenBurmeseLearningGames, onOpenInteractiveQuiz, onOpenMyanmarPoems, onOpenConsonantEndings, onOpenTimeAndCalendar, onOpenMyanmarSpelling, onOpenMyanmarSoundPractice, onOpenReadingMyanmar, onOpenSpeakingMyanmar, onOpenMyanmarPart1And2, onOpenBodhiTree, onOpenWatchAndLearn }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [role, setRole] = useState(null); 
  const [studentProfile, setStudentProfile] = useState(null);
  const [teacherUid, setTeacherUid] = useState(null); 
  const [targetStudentUid, setTargetStudentUid] = useState(null); 
  const [view, setView] = useState('login'); 
  const [announcements, setAnnouncements] = useState([]); 
  const [starAnnouncements, setStarAnnouncements] = useState([]);
  const [dismissedStars, setDismissedStars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedStarAnnouncements') || '[]');
    } catch (e) { return []; }
  });
  
  const [displayedStar, setDisplayedStar] = useState(null);
  const handledStarIdsRef = useRef(new Set());
  const hasShownStarThisSessionRef = useRef(false);
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [navIndex, setNavIndex] = useState(0);
  // These four used to share one bottom-center button with Login/Register,
  // cycling through all five on every click -- a student trying to log in
  // could need up to four clicks just to reach the login option. Now they
  // live in their own small square (below the 🔔), and Login/Register is
  // its own always-visible button below.
  const navItems = [
    { label: 'Today', target: 'today' },
    { label: 'Week', target: 'weekly' },
    { label: 'Year', target: 'attendance' },
    { label: '🏆', target: 'trophies' }
  ];
  const handleNavClick = () => {
    setView(navItems[navIndex].target);
    setNavIndex((navIndex + 1) % navItems.length);
  };
  const handleLoginButtonClick = () => {
    if (role === 'teacher') {
      setView('teacher');
    } else if (role === 'student') {
      setView('student');
    } else {
      const savedId = localStorage.getItem('lastStudentId');
      if (savedId) {
        handleStudentLoginById(savedId, () => setView('login'));
      } else {
        setView('login');
      }
    }
  };

  useEffect(() => {
    if (!auth) return;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setIsAuthReady(true);
      } else {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Error signing in:", error);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !db) return; 
    
    const unsubscribe = onSnapshot(teacherConfigDoc, 
      (doc) => {
        if (doc.exists()) {
          setTeacherUid(doc.data().uid);
        } else {
          setTeacherUid(''); 
        }
      }, 
      (error) => {
        console.error("Error fetching teacher config:", error);
        setTeacherUid('');
      }
    );
    return () => unsubscribe();
  }, [isAuthReady]);

  useEffect(() => {
    if (isAuthReady && user && teacherUid !== null) { 
      checkUserRole(user.uid)
        .catch(err => {
          console.error("Critical error during user role check:", err);
          setRole(null);
          setView('today'); 
        })
        .finally(() => {
          setRoleCheckDone(true);
        });
    }
  }, [user, isAuthReady, teacherUid]);
  
  useEffect(() => {
    if (role === 'student' && targetStudentUid) {
      console.log('[DIAG] Attaching student profile listener for uid:', targetStudentUid);
      const studentDocRef = doc(db, `${publicDataPath}/students`, targetStudentUid);
      
      const unsubscribe = onSnapshot(studentDocRef, (doc) => {
        console.log('[DIAG] Student profile snapshot fired. exists:', doc.exists(), 'uid:', targetStudentUid, 'fromCache:', doc.metadata?.fromCache);
        if (doc.exists()) {
          setStudentProfile(doc.data());
        } else {
          console.warn('[DIAG] Student doc does NOT exist — resetting role/view. uid was:', targetStudentUid);
          setRole(null);
          setTargetStudentUid(null);
          setStudentProfile(null);
          if (view !== 'login') setView('today'); 
        }
      }, (error) => {
        console.error("[DIAG] Error listening to student profile:", error);
        setRole(null);
        setTargetStudentUid(null);
        setStudentProfile(null);
        if (view !== 'login') setView('today');
      });

      return () => { console.log('[DIAG] Unsubscribing student profile listener for uid:', targetStudentUid); unsubscribe(); };
    }
  }, [role, targetStudentUid]); 
  
  useEffect(() => {
    if (!db || !isAuthReady) return; 
    
    const q = query(
      announcementsCollection, 
      where("expiresAt", ">", Timestamp.now()), 
      orderBy("expiresAt", "desc"), 
      limit(5)
    );
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const annList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(annList);
    }, (error) => {
      console.error("Error fetching announcements:", error);
    });
    
    return () => unsubscribe();
  }, [isAuthReady]); 

  useEffect(() => {
    if (!db || !isAuthReady) return;
    
    const q = query(
      starAnnouncementsCollection,
      where("expiresAt", ">", Timestamp.now()),
      orderBy("expiresAt", "desc"),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStarAnnouncements(list);
    }, (error) => {
      console.error("Error fetching star announcements:", error);
    });
    
    return () => unsubscribe();
  }, [isAuthReady]);

  const dismissStarAnnouncement = async (id) => {
    setDismissedStars(prev => [...prev, id]);
    if (role === 'student' && targetStudentUid) {
      try {
        await updateDoc(doc(db, `${publicDataPath}/students`, targetStudentUid), {
          seenStarAnnouncements: arrayUnion(id)
        });
      } catch (e) {
        console.error("Error saving seen star announcement:", e);
      }
    } else {
      try {
        const updated = [...dismissedStars, id];
        localStorage.setItem('dismissedStarAnnouncements', JSON.stringify(updated));
      } catch (e) {}
    }
  };
  const seenStarIds = role === 'student'
    ? [...dismissedStars, ...(studentProfile?.seenStarAnnouncements || [])]
    : dismissedStars;
  const starDataReady = roleCheckDone && (role !== 'student' || !!studentProfile);

  useEffect(() => {
    if (!starDataReady || displayedStar || hasShownStarThisSessionRef.current) return;
    const next = starAnnouncements.find(a => !seenStarIds.includes(a.id) && !handledStarIdsRef.current.has(a.id));
    if (!next) return;
    handledStarIdsRef.current.add(next.id);
    hasShownStarThisSessionRef.current = true;
    setDisplayedStar(next);
    dismissStarAnnouncement(next.id);
  }, [starAnnouncements, seenStarIds, starDataReady, displayedStar]);

  useEffect(() => {
    if (!displayedStar) return;
    const timer = setTimeout(() => setDisplayedStar(null), 10000);
    return () => clearTimeout(timer);
  }, [displayedStar?.id]);

  const checkUserRole = async (uid) => {
    console.log('[DIAG] checkUserRole called. uid:', uid, 'current targetStudentUid:', targetStudentUid, 'current view:', view);
    if (!uid || targetStudentUid) { console.log('[DIAG] checkUserRole bailed early (no uid, or targetStudentUid already set)'); return; }

    try { 
      if (teacherUid && uid === teacherUid) {
        console.log('[DIAG] checkUserRole: matched as TEACHER');
        setRole('teacher');
        if(view !== 'teacher') setView('teacher');
        return;
      }

      // If someone explicitly logged in with a displayId (Existing Account flow),
      // honour that choice on refresh — even if this Firebase auth uid also
      // belongs to a different student's primary doc.  Keeps "logged out as A,
      // logged in as B, refresh" from snapping back to A.
      const savedDisplayId = localStorage.getItem('lastStudentId');
      if (savedDisplayId) {
        console.log('[DIAG] checkUserRole: found lastStudentId in localStorage, preferring displayId login:', savedDisplayId);
        handleStudentLoginById(savedDisplayId, () => {
          localStorage.removeItem('lastStudentId');
          setView('login');
        });
        return;
      }

      const studentDocRef = doc(db, `${publicDataPath}/students`, uid);
      const studentDoc = await getDoc(studentDocRef);
      
      if (studentDoc.exists()) {
        console.log('[DIAG] checkUserRole: matched as STUDENT (own uid doc)');
        setRole('student');
        setTargetStudentUid(uid); 
        if(view !== 'student') setView('student');
      } else {
        const q = query(studentsCollection, where("authorizedUids", "array-contains", uid));
        const linkedSnapshot = await getDocs(q);

        if (!linkedSnapshot.empty) {
            const linkedDoc = linkedSnapshot.docs[0];
            console.log('[DIAG] checkUserRole: matched as STUDENT (linked authorizedUids), doc id:', linkedDoc.id);
            setRole('student');
            setTargetStudentUid(linkedDoc.id); 
            setView('student');
            return; 
        }

        console.log('[DIAG] checkUserRole: NOT recognized as teacher or student. Leaving role null.');
        setRole(null); 
        if (view !== 'login') setView('today'); 
      }
    } catch (error) { 
      console.error("[DIAG] Error checking user role:", error);
      setRole(null);
      if (view !== 'login') setView('today'); 
    }
  };

  const handleRecoverTeacherAccess = async (passcode, setFormError) => {
    if (!user) return;
    try {
      const configSnap = await getDoc(teacherConfigDoc);
      if (!configSnap.exists() || !configSnap.data().passcode) {
        setFormError('No recovery passcode has been set for this account yet. Ask whoever manages this app to set one, or fix it directly in the database.');
        return;
      }
      if (configSnap.data().passcode !== passcode) {
        setFormError('Incorrect passcode.');
        return;
      }
      // Correct passcode — reclaim teacher status for this browser/device.
      await setDoc(teacherConfigDoc, { uid: user.uid }, { merge: true });
      setTeacherUid(user.uid);
      setRole('teacher');
      setView('teacher');
    } catch (error) {
      console.error('Error recovering teacher access:', error);
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleSelectRole = async (selectedRole, studentName = '', setFormError) => {
    if (!user) return;
    const uid = user.uid;
    
    if (setFormError) setFormError('');

    if (selectedRole === 'teacher' && !teacherUid) {
      try {
        await setDoc(teacherConfigDoc, { uid: uid });
        setTeacherUid(uid);
        setRole('teacher');
        setView('teacher');
      } catch (error) {
        console.error("Error creating teacher account:", error);
        if (setFormError) setFormError('An error occurred. Please try again.');
      }
    } else if (selectedRole === 'student') {
      // Generate a numeric-only 6-digit display ID (all existing IDs are numeric —
      // uid.substring(0,6) previously produced alphanumeric IDs since Firebase
      // anonymous auth UIDs are base62 strings, not numeric).
      const generateNumericDisplayId = async () => {
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidate = String(Math.floor(100000 + Math.random() * 900000)); // 100000-999999
          const dupSnap = await getDocs(query(studentsCollection, where("displayId", "==", candidate)));
          if (dupSnap.empty) return candidate;
        }
        // Extremely unlikely fallback: timestamp-derived digits
        return String(Date.now()).slice(-6);
      };
      const displayId = await generateNumericDisplayId();
      const newStudentProfile = {
        name: studentName, displayId: displayId, isActive: 'pending', createdAt: serverTimestamp(),
        trophyCount: 0, completedCount: 0, dailySubmissionCount: 0, lastSubmissionDate: null,
        trophyRequested: false, justEarnedTrophy: false, seenAnnouncements: []
      };
      try {
        await setDoc(doc(db, `${publicDataPath}/students`, uid), newStudentProfile);
        setRole('student');
        setTargetStudentUid(uid); 
        setView('student');
      } catch (error) {
        console.error("Error creating new student account:", error);
        if (setFormError) setFormError('An error occurred. Please try again.');
      }
    }
  };
  
  const handleStudentLogout = () => {
    try { localStorage.removeItem('lastStudentId'); } catch (e) {}
    setRole(null);
    setTargetStudentUid(null);
    setStudentProfile(null);
    setView('login');
  };

  const handleStudentLoginById = async (displayId, onError) => {
    console.log('[DIAG] handleStudentLoginById called with displayId:', displayId);
    const q = query(studentsCollection, where("displayId", "==", displayId));
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log('[DIAG] No student found with that displayId');
        onError('Invalid Student ID.'); 
      } else {
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();
        const studentDocId = studentDoc.id; 
        console.log('[DIAG] Found student doc id:', studentDocId, 'isActive:', studentData.isActive, 'current session uid:', user?.uid);
        
        if (studentData.isActive === true || studentData.isActive === 'pending') {
          setRole('student');
          setTargetStudentUid(studentDocId); 
          setView('student');
          console.log('[DIAG] Set role=student, targetStudentUid=', studentDocId, ', view=student');

          if (user && user.uid !== studentDocId) {
            try {
               const studentRef = doc(db, `${publicDataPath}/students`, studentDocId);
               await updateDoc(studentRef, { authorizedUids: arrayUnion(user.uid) });
               console.log('[DIAG] Linked current session uid to student doc via authorizedUids');
            } catch (err) {
               console.error("[DIAG] Error linking account:", err);
            }
          }
          
          localStorage.setItem('lastStudentId', displayId);

        } else if (studentData.isActive === false) {
          onError('This account has been deactivated.'); 
        } else {
          onError('An error occurred. Please try again.');
        }
      }
    } catch (e) {
      console.error("Error logging in by ID:", e);
      onError('An error occurred. Please try again.'); 
    }
  };

  const renderContent = () => {
    if (!db) {
      return (
        <div className="flex justify-center items-center min-h-screen p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg text-center shadow-md max-w-lg">
            <strong className="font-bold text-lg">Initialization Failed!</strong>
            <p className="mt-2">Could not connect to the database. This can happen due to an invalid configuration or network issues.</p>
            <p className="mt-1">Please check the console (F12) for errors and contact the administrator.</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthReady || !user || teacherUid === null) { 
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-xl font-semibold text-indigo-600">Loading System...</div>
        </div>
      );
    }

    switch (view) {
      case 'teacher':
        if (role !== 'teacher') return <TodaySchedule role={role} />; 
        return <TeacherDashboard user={user} announcements={announcements} onOpenSmartStudy={onOpenSmartStudy} onOpenAbhidhamma={onOpenAbhidhamma} onOpenMyanmarReader={onOpenMyanmarReader} onOpenDhammaschool={onOpenDhammaschool} onOpenConsonantPractice={onOpenConsonantPractice} onOpenBurmeseGame={onOpenBurmeseGame} onOpenMyanmarSpeaking={onOpenMyanmarSpeaking} onOpenNumberLearning={onOpenNumberLearning} onOpenVowelsLearning={onOpenVowelsLearning} onOpenAnimalSound={onOpenAnimalSound} onOpenBurmeseLearningGames={onOpenBurmeseLearningGames} onOpenInteractiveQuiz={onOpenInteractiveQuiz} onOpenMyanmarPoems={onOpenMyanmarPoems} onOpenConsonantEndings={onOpenConsonantEndings} onOpenTimeAndCalendar={onOpenTimeAndCalendar} onOpenMyanmarSpelling={onOpenMyanmarSpelling} onOpenMyanmarSoundPractice={onOpenMyanmarSoundPractice} onOpenReadingMyanmar={onOpenReadingMyanmar} onOpenSpeakingMyanmar={onOpenSpeakingMyanmar} onOpenMyanmarPart1And2={onOpenMyanmarPart1And2} onOpenWatchAndLearn={onOpenWatchAndLearn} onOpenBodhiTree={onOpenBodhiTree} />;
      case 'student':
        if (role !== 'student') return <TodaySchedule role={role} />; 
        if (!studentProfile) {
          return (
            <div className="flex justify-center items-center min-h-screen">
              <div className="text-xl font-semibold text-emerald-600">Loading Student Profile...</div>
            </div>
          );
        }
        return <StudentDashboard user={user} studentProfile={studentProfile} studentUid={targetStudentUid} announcements={announcements} onOpenSmartStudy={onOpenSmartStudy} onOpenAbhidhamma={onOpenAbhidhamma} onOpenMyanmarReader={onOpenMyanmarReader} onOpenDhammaschool={onOpenDhammaschool} onOpenMyanmarSpeaking={onOpenMyanmarSpeaking} onOpenConsonantPractice={onOpenConsonantPractice} onOpenBurmeseGame={onOpenBurmeseGame} onOpenNumberLearning={onOpenNumberLearning} onOpenVowelsLearning={onOpenVowelsLearning} onOpenAnimalSound={onOpenAnimalSound} onOpenBurmeseLearningGames={onOpenBurmeseLearningGames} onOpenInteractiveQuiz={onOpenInteractiveQuiz} onOpenMyanmarPoems={onOpenMyanmarPoems} onOpenConsonantEndings={onOpenConsonantEndings} onOpenTimeAndCalendar={onOpenTimeAndCalendar} onOpenMyanmarSpelling={onOpenMyanmarSpelling} onOpenMyanmarSoundPractice={onOpenMyanmarSoundPractice} onOpenReadingMyanmar={onOpenReadingMyanmar} onOpenSpeakingMyanmar={onOpenSpeakingMyanmar} onOpenMyanmarPart1And2={onOpenMyanmarPart1And2} onOpenBodhiTree={onOpenBodhiTree} onOpenWatchAndLearn={onOpenWatchAndLearn} onLogout={handleStudentLogout} />;
      case 'weekly': 
        return <WeeklySchedule role={role} targetStudentUid={targetStudentUid} />;
      case 'attendance':
        return <YearAttendanceBoard role={role} targetStudentUid={targetStudentUid} />;
      case 'trophies':
        return <TrophyBoard role={role} targetStudentUid={targetStudentUid} studentProfile={studentProfile} />;
      case 'login': 
        return <RoleSelection user={user} onSelectRole={(role, name, setError) => handleSelectRole(role, name, setError)} onStudentLogin={handleStudentLoginById} teacherUid={teacherUid} onRecoverTeacher={handleRecoverTeacherAccess} />;
      case 'today': 
      default:
        return <TodaySchedule role={role} />;
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 font-sans">
      <audio id="notification-sound" src="https://raw.githubusercontent.com/nathantun93/bell/main/message.mp3" preload="auto"></audio>
      {displayedStar && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%]">
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-2xl shadow-2xl p-5">
            <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest mb-1">⭐ Outstanding Student</p>
            <p className="text-lg font-bold text-yellow-900 mb-1">{displayedStar.studentName}</p>
            <p className="text-yellow-800 mb-3">{displayedStar.message}</p>
            <div className="flex justify-center">
              <button onClick={() => setDisplayedStar(null)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-2 rounded-lg shadow-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthReady && user && (
        <>
          {/* Small square, no taller than the 🔔 (StudentDashboard's bell
              sits at top-4, so this is positioned just below it) -- cycles
              Today/Week/Year/Trophies one at a time on tap, short labels so
              it stays compact on phones. */}
          <div className="fixed top-16 right-4 z-[9400]">
            <button
              onClick={handleNavClick}
              title={navItems[navIndex].target === 'today' ? "Today's Schedule" : navItems[navIndex].target === 'weekly' ? 'Weekly Schedule' : navItems[navIndex].target === 'attendance' ? 'This Year Attended' : 'Trophies Awarded'}
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl w-11 h-11 flex items-center justify-center shadow-lg text-[11px] font-bold text-indigo-700 leading-none"
            >
              {navItems[navIndex].label}
            </button>
          </div>
          {(role === 'teacher' || role === 'student') && view !== role && (
            // Same top-left circular 🏡 spot every other sub-app uses to exit
            // back to this dashboard -- moved here from a separate
            // bottom-center button so there's only ever one 🏡 convention,
            // and it stays reachable from Weekly/Year/Trophies too (those
            // views have no home button of their own otherwise). Hidden while
            // already on the dashboard itself (view === role) -- no point
            // showing a way "home" when already there.
            <button
              onClick={handleLoginButtonClick}
              title="Home"
              aria-label="Home"
              className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
            >
              🏡
            </button>
          )}
          {role !== 'teacher' && role !== 'student' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
              <button onClick={handleLoginButtonClick} className="px-6 py-3 rounded-full bg-indigo-600 text-white font-semibold shadow-lg hover:bg-indigo-700 transition-colors">
                Login / Register
              </button>
            </div>
          )}
        </>
      )}

      <main>
        {renderContent()}
      </main>
    </div>
  );
}

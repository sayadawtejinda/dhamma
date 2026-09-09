import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import OnlineStatusWidget from './OnlineStatusWidget';

// "Reading Myanmar" bundles 6 previously-separate apps behind one shared
// entry point in the Lesson Bank, so a teacher assigns ONE lesson instead
// of six. Each part is still its own existing component (unchanged) —
// this file just adds a "Choose a Part" landing screen in front of them,
// a way to jump back to that landing screen from inside any part instead
// of leaving the group entirely, and ONE shared online-status feed for
// the whole group (visible from the chooser screen AND from inside any
// part, showing which part each online student is currently on). Each
// part still has its own online badge built in from when it was a
// standalone app — that's suppressed here via `hideOwnOnlineBadge` so it
// doesn't show twice.
//
// Individual parts are still lazy-loaded (not downloaded until picked),
// same as every other app in this project.
const ConsonantPracticeApp = lazy(() => import('./ConsonantPracticeApp'));
const BurmeseConsonantGameApp = lazy(() => import('./BurmeseConsonantGameApp'));
const MyanmarVowelsLearningApp = lazy(() => import('./MyanmarVowelsLearningApp'));
const MyanmarSpellingApp = lazy(() => import('./MyanmarSpellingApp'));
const MyanmarConsonantEndingsApp = lazy(() => import('./MyanmarConsonantEndingsApp'));
const MyanmarSoundPracticeApp = lazy(() => import('./MyanmarSoundPracticeApp'));

// Labels are placeholders ("Part 1", "Part 2", ...) — easy to rename later
// in one place once final names are picked.
const READING_PARTS = [
  { key: 'consonantpractice', label: 'Part 1', subtitle: 'Consonant Practice', color: 'sky', Component: ConsonantPracticeApp },
  { key: 'burmesegame', label: 'Part 2', subtitle: 'Burmese Consonant Game', color: 'fuchsia', Component: BurmeseConsonantGameApp },
  { key: 'vowelslearning', label: 'Part 3', subtitle: 'Myanmar Vowels', color: 'amber', Component: MyanmarVowelsLearningApp },
  { key: 'myanmarspelling', label: 'Part 4', subtitle: 'Myanmar Spelling', color: 'violet', Component: MyanmarSpellingApp },
  { key: 'consonantendings', label: 'Part 5', subtitle: 'Consonant Endings', color: 'teal', Component: MyanmarConsonantEndingsApp },
  { key: 'soundpractice', label: 'Part 6', subtitle: 'Sound Practice', color: 'rose', Component: MyanmarSoundPracticeApp },
];
const partLabelByKey = (key) => {
  const p = READING_PARTS.find(p => p.key === key);
  return p ? `${p.label}: ${p.subtitle}` : null;
};

const READING_MYANMAR_ROSTER_PATH = 'artifacts/reading-myanmar-app/public/data/roster';
const sanitizeReadingKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

function ReadingMyanmarLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-xl font-semibold text-blue-600">Loading...</div>
    </div>
  );
}

export default function ReadingMyanmarApp({ entryRequest, onExit }) {
  const [activePart, setActivePart] = useState(() => entryRequest?.initialPart || null);
  const studentName = entryRequest?.studentName || null;
  const activePartRef = useRef(activePart);
  activePartRef.current = activePart;

  // One shared heartbeat/listener for the whole group, instead of each of
  // the 6 parts pinging its own separate roster. Records which part the
  // student is currently on so the chooser screen can show it.
  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, READING_MYANMAR_ROSTER_PATH, sanitizeReadingKey(studentName));
    const ping = () => setDoc(rosterRef, { studentName, isOnline: true, currentPart: activePartRef.current, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    ping();
    const interval = setInterval(ping, 30000);
    const goOffline = () => { updateDoc(rosterRef, { isOnline: false, currentPart: null, lastSeen: serverTimestamp() }).catch(() => {}); };
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [studentName]);

  // Re-ping immediately whenever the student switches parts, so the
  // roster's "currently on" field updates without waiting for the next
  // 30s heartbeat.
  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, READING_MYANMAR_ROSTER_PATH, sanitizeReadingKey(studentName));
    setDoc(rosterRef, { studentName, isOnline: true, currentPart: activePart, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [activePart, studentName]);

  const activePartData = READING_PARTS.find(p => p.key === activePart);

  // Consonant Practice (Part 1) already shows the shared OnlineStatusWidget
  // itself, with its own coin balance + "N consonants" activity -- richer
  // than this generic group-wide one, so it takes over instead of stacking
  // two pills. The other parts aren't migrated to their own widget yet, so
  // this group-wide one (same shared component, just less detail) still
  // covers them, and the "Choose a Part" landing screen where no part is
  // active yet.
  const showGroupBadge = activePart !== 'consonantpractice';
  const OnlineBadge = (
    <OnlineStatusWidget
      rosterPath={READING_MYANMAR_ROSTER_PATH}
      studentName={studentName}
      hidden={!showGroupBadge}
      panelTitle="📚 Students"
      renderActivity={s => (
        <span className="text-gray-600">{partLabelByKey(s.currentPart) || 'Choose a Part screen'}</span>
      )}
    />
  );

  if (!activePartData) {
    return (
      <div className="min-h-screen bg-blue-50">
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={onExit}
            className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
            aria-label="Back to Tutoring Dashboard"
          >
            🏡
          </button>
        </div>
        <div className="max-w-2xl mx-auto p-4 md:p-8 pt-16">
          <h2 className="text-3xl font-bold text-blue-700 mb-2 text-center">📚 Reading Myanmar app — Choose a Part</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Pick a part below. You can come back to this screen anytime.</p>
          <div className="space-y-3">
            {READING_PARTS.map(part => (
              <button
                key={part.key}
                onClick={() => setActivePart(part.key)}
                className={`w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-${part.color}-200 hover:border-${part.color}-400 hover:shadow-md transition-all`}
              >
                <span className={`text-lg font-bold text-${part.color}-800`}>{part.label}: {part.subtitle}</span>
                <span className={`text-${part.color}-500 text-xl`}>→</span>
              </button>
            ))}
          </div>
        </div>
        {OnlineBadge}
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<ReadingMyanmarLoading />}>
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={() => setActivePart(null)}
            className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
          >
            ← Choose a Part
          </button>
        </div>
        <activePartData.Component entryRequest={entryRequest} onExit={() => setActivePart(null)} hideOwnOnlineBadge={showGroupBadge} />
      </Suspense>
      {OnlineBadge}
    </>
  );
}

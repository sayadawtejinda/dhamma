import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import OnlineStatusWidget from './OnlineStatusWidget';

// "Speaking Myanmar" — the second combined group, same pattern as
// ReadingMyanmarApp.jsx: bundles 6 previously-separate apps behind one
// Lesson Bank entry with a "Choose a Part" landing screen, plus ONE
// shared online-status feed for the whole group (visible from the
// chooser screen AND from inside any part, showing which part each
// online student is currently on). Each part's own built-in online badge
// is suppressed via `hideOwnOnlineBadge` so it doesn't show twice.
const MyanmarPoemsApp = lazy(() => import('./MyanmarPoemsApp'));
const MyanmarNumberLearningApp = lazy(() => import('./MyanmarNumberLearningApp'));
const AnimalSoundApp = lazy(() => import('./AnimalSoundApp'));
const BurmeseLearningGamesApp = lazy(() => import('./BurmeseLearningGamesApp'));
const InteractiveLearningQuizApp = lazy(() => import('./InteractiveLearningQuizApp'));
const TimeAndCalendarApp = lazy(() => import('./TimeAndCalendarApp'));

// Labels are placeholders ("Part 1", "Part 2", ...) — easy to rename later
// in one place once final names are picked.
const SPEAKING_PARTS = [
  { key: 'myanmarpoems', label: 'Part 1', subtitle: 'Myanmar Poems', color: 'emerald', Component: MyanmarPoemsApp },
  { key: 'numberlearning', label: 'Part 2', subtitle: 'Number Learning', color: 'indigo', Component: MyanmarNumberLearningApp },
  { key: 'animalsound', label: 'Part 3', subtitle: 'Animal Sound Quiz', color: 'sky', Component: AnimalSoundApp },
  { key: 'burmeselearninggames', label: 'Part 4', subtitle: 'Burmese Learning Games', color: 'lime', Component: BurmeseLearningGamesApp },
  { key: 'interactivequiz', label: 'Part 5', subtitle: 'Interactive Learning Quiz', color: 'rose', Component: InteractiveLearningQuizApp },
  { key: 'timeandcalendar', label: 'Part 6', subtitle: 'Time and Calendar', color: 'cyan', Component: TimeAndCalendarApp },
];
const partLabelByKey = (key) => {
  const p = SPEAKING_PARTS.find(p => p.key === key);
  return p ? `${p.label}: ${p.subtitle}` : null;
};

const SPEAKING_MYANMAR_ROSTER_PATH = 'artifacts/speaking-myanmar-app/public/data/roster';
const sanitizeSpeakingKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

function SpeakingMyanmarLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-xl font-semibold text-orange-600">Loading...</div>
    </div>
  );
}

export default function SpeakingMyanmarApp({ entryRequest, onExit }) {
  const [activePart, setActivePart] = useState(() => entryRequest?.initialPart || null);
  const studentName = entryRequest?.studentName || null;
  const activePartRef = useRef(activePart);
  activePartRef.current = activePart;

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, SPEAKING_MYANMAR_ROSTER_PATH, sanitizeSpeakingKey(studentName));
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

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, SPEAKING_MYANMAR_ROSTER_PATH, sanitizeSpeakingKey(studentName));
    setDoc(rosterRef, { studentName, isOnline: true, currentPart: activePart, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [activePart, studentName]);

  const activePartData = SPEAKING_PARTS.find(p => p.key === activePart);

  // Myanmar Poems (Part 1), Number Learning (Part 2), Animal Sound Quiz
  // (Part 3), and Burmese Learning Games (Part 4) already show the shared
  // OnlineStatusWidget themselves -- with their own coin balance/levels-
  // done activity, richer than this generic group-wide one -- so each
  // takes over instead of stacking two pills. The other parts aren't
  // migrated to their own widget yet, so this group-wide one (same shared
  // component, just less detail) still covers them, and the "Choose a
  // Part" landing screen where no part is active yet.
  const OWN_WIDGET_PARTS = ['myanmarpoems', 'numberlearning', 'animalsound', 'burmeselearninggames', 'interactivequiz'];
  const showGroupBadge = !OWN_WIDGET_PARTS.includes(activePart);
  const OnlineBadge = (
    <OnlineStatusWidget
      rosterPath={SPEAKING_MYANMAR_ROSTER_PATH}
      studentName={studentName}
      hidden={!showGroupBadge}
      panelTitle="🗣️ Students"
      renderActivity={s => (
        <span className="text-gray-600">{partLabelByKey(s.currentPart) || 'Choose a Part screen'}</span>
      )}
    />
  );

  if (!activePartData) {
    return (
      <div className="min-h-screen bg-orange-50">
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
          <h2 className="text-3xl font-bold text-orange-700 mb-2 text-center">🗣️ Speaking Myanmar app — Choose a Part</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Pick a part below. You can come back to this screen anytime.</p>
          <div className="space-y-3">
            {SPEAKING_PARTS.map(part => (
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
      <Suspense fallback={<SpeakingMyanmarLoading />}>
        <div className="fixed top-3 left-3 z-[9999] flex items-center gap-2">
          <button
            onClick={onExit}
            className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
            aria-label="Back to Tutoring Dashboard"
          >
            🏡
          </button>
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

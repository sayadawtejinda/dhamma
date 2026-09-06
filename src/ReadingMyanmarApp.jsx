import React, { lazy, Suspense, useState } from 'react';

// "Reading Myanmar" bundles 6 previously-separate apps behind one shared
// entry point in the Lesson Bank, so a teacher assigns ONE lesson instead
// of six. Each part is still its own existing component (unchanged) —
// this file just adds a "Choose a Part" landing screen in front of them
// and a way to jump back to that landing screen from inside any part
// instead of leaving the group entirely.
//
// No group-level online/roster feed here — each part already tracks and
// shows its own online status, and adding a second one on top of that
// just showed as a duplicated "online" badge.
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

function ReadingMyanmarLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-xl font-semibold text-blue-600">Loading...</div>
    </div>
  );
}

export default function ReadingMyanmarApp({ entryRequest, onExit }) {
  const [activePart, setActivePart] = useState(null);
  const activePartData = READING_PARTS.find(p => p.key === activePart);

  if (!activePartData) {
    return (
      <div className="min-h-screen bg-blue-50">
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
          >
            ← Back to Tutoring Dashboard
          </button>
        </div>
        <div className="max-w-2xl mx-auto p-4 md:p-8 pt-16">
          <h2 className="text-3xl font-bold text-blue-700 mb-2 text-center">📚 Reading Myanmar — Choose a Part</h2>
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
      </div>
    );
  }

  return (
    <Suspense fallback={<ReadingMyanmarLoading />}>
      <div className="fixed top-3 left-3 z-[9999]">
        <button
          onClick={() => setActivePart(null)}
          className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
        >
          ← Choose a Part
        </button>
      </div>
      <activePartData.Component entryRequest={entryRequest} onExit={() => setActivePart(null)} />
    </Suspense>
  );
}

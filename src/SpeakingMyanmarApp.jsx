import React, { lazy, Suspense, useState } from 'react';

// "Speaking Myanmar" — the second combined group, same pattern as
// ReadingMyanmarApp.jsx: bundles 6 previously-separate apps behind one
// Lesson Bank entry with a "Choose a Part" landing screen. Each part is
// still its own existing component, unchanged. No group-level online
// feed here either — each part already tracks and shows its own online
// status.
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

function SpeakingMyanmarLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-xl font-semibold text-orange-600">Loading...</div>
    </div>
  );
}

export default function SpeakingMyanmarApp({ entryRequest, onExit }) {
  const [activePart, setActivePart] = useState(null);
  const activePartData = SPEAKING_PARTS.find(p => p.key === activePart);

  if (!activePartData) {
    return (
      <div className="min-h-screen bg-orange-50">
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
          >
            ← Back to Tutoring Dashboard
          </button>
        </div>
        <div className="max-w-2xl mx-auto p-4 md:p-8 pt-16">
          <h2 className="text-3xl font-bold text-orange-700 mb-2 text-center">🗣️ Speaking Myanmar — Choose a Part</h2>
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
      </div>
    );
  }

  return (
    <Suspense fallback={<SpeakingMyanmarLoading />}>
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

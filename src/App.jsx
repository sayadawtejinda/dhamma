import React, { useState, Suspense, lazy } from 'react';
import TutoringApp from './TutoringApp';

// Every sub-app below is lazy-loaded (its JS is only downloaded the first
// time it's actually opened) AND only mounted while it's the active app —
// switching to a different app unmounts the previous one, so its
// Firestore listeners, roster heartbeat, and any audio/timers actually
// stop instead of continuing to run in the background. Mounting everything
// eagerly (the original design) meant every app's Firestore listeners
// started firing the instant the page loaded regardless of whether the
// visitor ever touched that app -- with this many apps, that was dozens of
// simultaneous Firestore connections on every page load, which is what was
// causing the site to hang/spin. Keeping every opened app mounted forever
// (an intermediate design) traded that outage for the same problem at a
// smaller scale -- background apps kept pinging their roster and playing
// audio after the visitor navigated away. Unmounting on switch avoids
// both; each app resets to its own starting screen when reopened, which
// is an acceptable trade-off now that most of these are grouped behind a
// "Choose a Part" screen anyway.
const SmartStudyApp = lazy(() => import('./SmartStudy'));
const AbhidhammaApp = lazy(() => import('./AbhidhammaApp'));
const MyanmarReaderApp = lazy(() => import('./MyanmarReaderApp'));
const DhammaschoolApp = lazy(() => import('./DhammaschoolApp'));
const ConsonantPracticeApp = lazy(() => import('./ConsonantPracticeApp'));
const BurmeseConsonantGameApp = lazy(() => import('./BurmeseConsonantGameApp'));
const MyanmarSpeakingApp = lazy(() => import('./myanmar-speaking-app'));
const MyanmarNumberLearningApp = lazy(() => import('./MyanmarNumberLearningApp'));
const MyanmarVowelsLearningApp = lazy(() => import('./MyanmarVowelsLearningApp'));
const AnimalSoundApp = lazy(() => import('./AnimalSoundApp'));
const BurmeseLearningGamesApp = lazy(() => import('./BurmeseLearningGamesApp'));
const InteractiveLearningQuizApp = lazy(() => import('./InteractiveLearningQuizApp'));
const MyanmarPoemsApp = lazy(() => import('./MyanmarPoemsApp'));
const MyanmarConsonantEndingsApp = lazy(() => import('./MyanmarConsonantEndingsApp'));
const TimeAndCalendarApp = lazy(() => import('./TimeAndCalendarApp'));
const MyanmarSpellingApp = lazy(() => import('./MyanmarSpellingApp'));
const MyanmarSoundPracticeApp = lazy(() => import('./MyanmarSoundPracticeApp'));
// Combined "Reading Myanmar" group — bundles ConsonantPracticeApp,
// BurmeseConsonantGameApp, MyanmarVowelsLearningApp, MyanmarSpellingApp,
// MyanmarConsonantEndingsApp and MyanmarSoundPracticeApp behind one Lesson
// Bank entry with a "Choose a Part" landing screen (see ReadingMyanmarApp.jsx).
// The 6 apps above stay wired individually too for now, so nothing already
// working changes — this is purely an additional entry point.
const ReadingMyanmarApp = lazy(() => import('./ReadingMyanmarApp'));
// Second combined group — bundles MyanmarPoemsApp, MyanmarNumberLearningApp,
// AnimalSoundApp, BurmeseLearningGamesApp, InteractiveLearningQuizApp and
// TimeAndCalendarApp the same way (see SpeakingMyanmarApp.jsx).
const SpeakingMyanmarApp = lazy(() => import('./SpeakingMyanmarApp'));
// Third combined group — bundles MyanmarPart1AApp, MyanmarPart1BApp,
// MyanmarPart2AApp and MyanmarPart2BApp the same way (see
// MyanmarPart1And2App.jsx).
const MyanmarPart1And2App = lazy(() => import('./MyanmarPart1And2App'));

function LoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-indigo-50">
      <div className="text-xl font-semibold text-indigo-600">Loading...</div>
    </div>
  );
}

export default function App() {
  const [activeApp, setActiveApp] = useState('tutoring');

  const [smartStudyRequest, setSmartStudyRequest] = useState(null);
  const [abhidhammaRequest, setAbhidhammaRequest] = useState(null);
  const [myanmarReaderRequest, setMyanmarReaderRequest] = useState(null);
  const [dhammaschoolRequest, setDhammaschoolRequest] = useState(null);
  const [consonantPracticeRequest, setConsonantPracticeRequest] = useState(null);
  const [burmeseGameRequest, setBurmeseGameRequest] = useState(null);
  const [myanmarSpeakingRequest, setMyanmarSpeakingRequest] = useState(null);
  const [numberLearningRequest, setNumberLearningRequest] = useState(null);
  const [vowelsLearningRequest, setVowelsLearningRequest] = useState(null);
  const [animalSoundRequest, setAnimalSoundRequest] = useState(null);
  const [burmeseLearningGamesRequest, setBurmeseLearningGamesRequest] = useState(null);
  const [interactiveQuizRequest, setInteractiveQuizRequest] = useState(null);
  const [myanmarPoemsRequest, setMyanmarPoemsRequest] = useState(null);
  const [consonantEndingsRequest, setConsonantEndingsRequest] = useState(null);
  const [timeAndCalendarRequest, setTimeAndCalendarRequest] = useState(null);
  const [myanmarSpellingRequest, setMyanmarSpellingRequest] = useState(null);
  const [myanmarSoundPracticeRequest, setMyanmarSoundPracticeRequest] = useState(null);
  const [readingMyanmarRequest, setReadingMyanmarRequest] = useState(null);
  const [speakingMyanmarRequest, setSpeakingMyanmarRequest] = useState(null);
  const [myanmarPart1And2Request, setMyanmarPart1And2Request] = useState(null);

  const openMyanmarSpelling = (request) => {
    setMyanmarSpellingRequest(request || {});
    setActiveApp('myanmarspelling');
  };
  const closeMyanmarSpelling = () => {
    setActiveApp('tutoring');
    setMyanmarSpellingRequest(null);
  };

  const openMyanmarSoundPractice = (request) => {
    setMyanmarSoundPracticeRequest(request || {});
    setActiveApp('myanmarsoundpractice');
  };
  const closeMyanmarSoundPractice = () => {
    setActiveApp('tutoring');
    setMyanmarSoundPracticeRequest(null);
  };

  const openReadingMyanmar = (request) => {
    setReadingMyanmarRequest(request || {});
    setActiveApp('readingmyanmar');
  };
  const closeReadingMyanmar = () => {
    setActiveApp('tutoring');
    setReadingMyanmarRequest(null);
  };

  const openSpeakingMyanmar = (request) => {
    setSpeakingMyanmarRequest(request || {});
    setActiveApp('speakingmyanmar');
  };
  const closeSpeakingMyanmar = () => {
    setActiveApp('tutoring');
    setSpeakingMyanmarRequest(null);
  };

  const openMyanmarPart1And2 = (request) => {
    setMyanmarPart1And2Request(request || {});
    setActiveApp('myanmarpart1and2');
  };
  const closeMyanmarPart1And2 = () => {
    setActiveApp('tutoring');
    setMyanmarPart1And2Request(null);
  };

  const openConsonantEndings = (request) => {
    setConsonantEndingsRequest(request || {});
    setActiveApp('consonantendings');
  };
  const closeConsonantEndings = () => {
    setActiveApp('tutoring');
    setConsonantEndingsRequest(null);
  };

  const openTimeAndCalendar = (request) => {
    setTimeAndCalendarRequest(request || {});
    setActiveApp('timeandcalendar');
  };
  const closeTimeAndCalendar = () => {
    setActiveApp('tutoring');
    setTimeAndCalendarRequest(null);
  };

  const openInteractiveQuiz = (request) => {
    setInteractiveQuizRequest(request || {});
    setActiveApp('interactivequiz');
  };
  const closeInteractiveQuiz = () => {
    setActiveApp('tutoring');
    setInteractiveQuizRequest(null);
  };

  const openMyanmarPoems = (request) => {
    setMyanmarPoemsRequest(request || {});
    setActiveApp('myanmarpoems');
  };
  const closeMyanmarPoems = () => {
    setActiveApp('tutoring');
    setMyanmarPoemsRequest(null);
  };

  const openAnimalSound = (request) => {
    setAnimalSoundRequest(request || {});
    setActiveApp('animalsound');
  };
  const closeAnimalSound = () => {
    setActiveApp('tutoring');
    setAnimalSoundRequest(null);
  };

  const openBurmeseLearningGames = (request) => {
    setBurmeseLearningGamesRequest(request || {});
    setActiveApp('burmeselearninggames');
  };
  const closeBurmeseLearningGames = () => {
    setActiveApp('tutoring');
    setBurmeseLearningGamesRequest(null);
  };

  const openNumberLearning = (request) => {
    setNumberLearningRequest(request || {});
    setActiveApp('numberlearning');
  };
  const closeNumberLearning = () => {
    setActiveApp('tutoring');
    setNumberLearningRequest(null);
  };

  const openVowelsLearning = (request) => {
    setVowelsLearningRequest(request || {});
    setActiveApp('vowelslearning');
  };
  const closeVowelsLearning = () => {
    setActiveApp('tutoring');
    setVowelsLearningRequest(null);
  };

  const openMyanmarSpeaking = (request) => {
    setMyanmarSpeakingRequest(request || {});
    setActiveApp('myanmarspeaking');
  };
  const closeMyanmarSpeaking = () => {
    setActiveApp('tutoring');
    setMyanmarSpeakingRequest(null);
  };

  const openBurmeseGame = (request) => {
    setBurmeseGameRequest(request || {});
    setActiveApp('burmesegame');
  };
  const closeBurmeseGame = () => {
    setActiveApp('tutoring');
    setBurmeseGameRequest(null);
  };

  const openConsonantPractice = (request) => {
    setConsonantPracticeRequest(request || {});
    setActiveApp('consonantpractice');
  };
  const closeConsonantPractice = () => {
    setActiveApp('tutoring');
    setConsonantPracticeRequest(null);
  };

  const openDhammaschool = (request) => {
    setDhammaschoolRequest(request || { mode: 'teacher' });
    setActiveApp('dhammaschool');
  };
  const closeDhammaschool = () => {
    setActiveApp('tutoring');
    setDhammaschoolRequest(null);
  };

  const openMyanmarReader = (request) => {
    setMyanmarReaderRequest(request || { mode: 'teacher' });
    setActiveApp('myanmarreader');
  };
  const closeMyanmarReader = () => {
    setActiveApp('tutoring');
    setMyanmarReaderRequest(null);
  };

  const openSmartStudy = (request) => {
    setSmartStudyRequest(request || { mode: 'teacher' });
    setActiveApp('smartstudy');
  };
  const closeSmartStudy = () => {
    setActiveApp('tutoring');
    setSmartStudyRequest(null);
  };

  const openAbhidhamma = (request) => {
    setAbhidhammaRequest(request || { mode: 'teacher' });
    setActiveApp('abhidhamma');
  };
  const closeAbhidhamma = () => {
    setActiveApp('tutoring');
    setAbhidhammaRequest(null);
  };

  return (
    <div className="min-h-screen">
      {/* The Tutoring Dashboard is the home screen, so it's the only app
          that's always mounted/eagerly loaded. Every other app below is
          lazy-loaded and only mounted while it's the active app, and
          unmounted the moment the visitor switches away from it. */}
      <div style={{ display: activeApp === 'tutoring' ? 'block' : 'none' }}>
        <TutoringApp
          onOpenSmartStudy={openSmartStudy}
          onOpenAbhidhamma={openAbhidhamma}
          onOpenMyanmarReader={openMyanmarReader}
          onOpenDhammaschool={openDhammaschool}
          onOpenConsonantPractice={openConsonantPractice}
          onOpenBurmeseGame={openBurmeseGame}
          onOpenMyanmarSpeaking={openMyanmarSpeaking}
          onOpenNumberLearning={openNumberLearning}
          onOpenVowelsLearning={openVowelsLearning}
          onOpenAnimalSound={openAnimalSound}
          onOpenBurmeseLearningGames={openBurmeseLearningGames}
          onOpenInteractiveQuiz={openInteractiveQuiz}
          onOpenMyanmarPoems={openMyanmarPoems}
          onOpenConsonantEndings={openConsonantEndings}
          onOpenTimeAndCalendar={openTimeAndCalendar}
          onOpenMyanmarSpelling={openMyanmarSpelling}
          onOpenMyanmarSoundPractice={openMyanmarSoundPractice}
          onOpenReadingMyanmar={openReadingMyanmar}
          onOpenSpeakingMyanmar={openSpeakingMyanmar}
          onOpenMyanmarPart1And2={openMyanmarPart1And2}
        />
      </div>

      <Suspense fallback={<LoadingFallback />}>
        {activeApp === 'smartstudy' && (
          <div>
            {activeApp === 'smartstudy' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeSmartStudy}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <SmartStudyApp entryRequest={smartStudyRequest} onExit={closeSmartStudy} />
          </div>
        )}

        {activeApp === 'abhidhamma' && (
          <div>
            {activeApp === 'abhidhamma' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeAbhidhamma}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <AbhidhammaApp entryRequest={abhidhammaRequest} onExit={closeAbhidhamma} />
          </div>
        )}

        {activeApp === 'myanmarreader' && (
          <div>
            {activeApp === 'myanmarreader' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarReader}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarReaderApp entryRequest={myanmarReaderRequest} onExit={closeMyanmarReader} />
          </div>
        )}

        {activeApp === 'dhammaschool' && (
          <div>
            {activeApp === 'dhammaschool' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeDhammaschool}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <DhammaschoolApp entryRequest={dhammaschoolRequest} onExit={closeDhammaschool} />
          </div>
        )}

        {activeApp === 'consonantpractice' && (
          <div>
            {activeApp === 'consonantpractice' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeConsonantPractice}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <ConsonantPracticeApp entryRequest={consonantPracticeRequest} onExit={closeConsonantPractice} />
          </div>
        )}

        {activeApp === 'burmesegame' && (
          <div>
            {activeApp === 'burmesegame' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeBurmeseGame}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <BurmeseConsonantGameApp entryRequest={burmeseGameRequest} onExit={closeBurmeseGame} />
          </div>
        )}

        {activeApp === 'myanmarspeaking' && (
          <div>
            {activeApp === 'myanmarspeaking' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarSpeaking}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarSpeakingApp entryRequest={myanmarSpeakingRequest} onExit={closeMyanmarSpeaking} />
          </div>
        )}

        {activeApp === 'numberlearning' && (
          <div>
            {activeApp === 'numberlearning' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeNumberLearning}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarNumberLearningApp entryRequest={numberLearningRequest} onExit={closeNumberLearning} />
          </div>
        )}

        {activeApp === 'vowelslearning' && (
          <div>
            {activeApp === 'vowelslearning' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeVowelsLearning}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarVowelsLearningApp entryRequest={vowelsLearningRequest} onExit={closeVowelsLearning} />
          </div>
        )}

        {activeApp === 'animalsound' && (
          <div>
            {activeApp === 'animalsound' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeAnimalSound}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <AnimalSoundApp entryRequest={animalSoundRequest} onExit={closeAnimalSound} />
          </div>
        )}

        {activeApp === 'burmeselearninggames' && (
          <div>
            {activeApp === 'burmeselearninggames' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeBurmeseLearningGames}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <BurmeseLearningGamesApp entryRequest={burmeseLearningGamesRequest} onExit={closeBurmeseLearningGames} />
          </div>
        )}

        {activeApp === 'interactivequiz' && (
          <div>
            {activeApp === 'interactivequiz' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeInteractiveQuiz}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <InteractiveLearningQuizApp entryRequest={interactiveQuizRequest} onExit={closeInteractiveQuiz} />
          </div>
        )}

        {activeApp === 'myanmarpoems' && (
          <div>
            {activeApp === 'myanmarpoems' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarPoems}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarPoemsApp entryRequest={myanmarPoemsRequest} onExit={closeMyanmarPoems} />
          </div>
        )}

        {activeApp === 'consonantendings' && (
          <div>
            {activeApp === 'consonantendings' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeConsonantEndings}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarConsonantEndingsApp entryRequest={consonantEndingsRequest} onExit={closeConsonantEndings} />
          </div>
        )}

        {activeApp === 'timeandcalendar' && (
          <div>
            {activeApp === 'timeandcalendar' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeTimeAndCalendar}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <TimeAndCalendarApp entryRequest={timeAndCalendarRequest} onExit={closeTimeAndCalendar} />
          </div>
        )}

        {activeApp === 'myanmarspelling' && (
          <div>
            {activeApp === 'myanmarspelling' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarSpelling}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarSpellingApp entryRequest={myanmarSpellingRequest} onExit={closeMyanmarSpelling} />
          </div>
        )}

        {activeApp === 'myanmarsoundpractice' && (
          <div>
            {activeApp === 'myanmarsoundpractice' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarSoundPractice}
                  className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
                >
                  ← Back to Tutoring Dashboard
                </button>
              </div>
            )}
            <MyanmarSoundPracticeApp entryRequest={myanmarSoundPracticeRequest} onExit={closeMyanmarSoundPractice} />
          </div>
        )}

        {activeApp === 'readingmyanmar' && (
          <div>
            <ReadingMyanmarApp entryRequest={readingMyanmarRequest} onExit={closeReadingMyanmar} />
          </div>
        )}

        {activeApp === 'speakingmyanmar' && (
          <div>
            <SpeakingMyanmarApp entryRequest={speakingMyanmarRequest} onExit={closeSpeakingMyanmar} />
          </div>
        )}

        {activeApp === 'myanmarpart1and2' && (
          <div>
            <MyanmarPart1And2App entryRequest={myanmarPart1And2Request} onExit={closeMyanmarPart1And2} />
          </div>
        )}
      </Suspense>
    </div>
  );
}

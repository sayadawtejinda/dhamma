import React, { useState, useEffect, Suspense, lazy } from 'react';
import TutoringApp from './TutoringApp';

// Every sub-app below is lazy-loaded (its JS is only downloaded the first
// time it's actually opened, not bundled into the initial page load) AND
// only mounted into the tree once opened (see openedApps below) — mounting
// eagerly meant every app's Firestore listeners (data + the online-roster
// heartbeat) started firing the instant the page loaded, regardless of
// whether the visitor ever touched that app. With this many apps, that was
// dozens of simultaneous Firestore connections on every single page load,
// which is what was causing the site to hang/spin.
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

function LoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-indigo-50">
      <div className="text-xl font-semibold text-indigo-600">Loading...</div>
    </div>
  );
}

export default function App() {
  const [activeApp, setActiveApp] = useState('tutoring');
  // Once an app has been opened, it stays mounted for the rest of the
  // session (so switching away and back never loses in-progress state) --
  // but it isn't mounted, and its code isn't even downloaded, until that
  // first open.
  const [openedApps, setOpenedApps] = useState(() => new Set());
  useEffect(() => {
    if (activeApp === 'tutoring') return;
    setOpenedApps(prev => (prev.has(activeApp) ? prev : new Set(prev).add(activeApp)));
  }, [activeApp]);

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
          lazy-loaded and only mounted once opened (see openedApps above),
          so it stays mounted afterward (switching away and back never loses
          in-progress state) without ever having started up unasked. */}
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
        />
      </div>

      <Suspense fallback={<LoadingFallback />}>
        {openedApps.has('smartstudy') && (
          <div style={{ display: activeApp === 'smartstudy' ? 'block' : 'none' }}>
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

        {openedApps.has('abhidhamma') && (
          <div style={{ display: activeApp === 'abhidhamma' ? 'block' : 'none' }}>
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

        {openedApps.has('myanmarreader') && (
          <div style={{ display: activeApp === 'myanmarreader' ? 'block' : 'none' }}>
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

        {openedApps.has('dhammaschool') && (
          <div style={{ display: activeApp === 'dhammaschool' ? 'block' : 'none' }}>
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

        {openedApps.has('consonantpractice') && (
          <div style={{ display: activeApp === 'consonantpractice' ? 'block' : 'none' }}>
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

        {openedApps.has('burmesegame') && (
          <div style={{ display: activeApp === 'burmesegame' ? 'block' : 'none' }}>
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

        {openedApps.has('myanmarspeaking') && (
          <div style={{ display: activeApp === 'myanmarspeaking' ? 'block' : 'none' }}>
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

        {openedApps.has('numberlearning') && (
          <div style={{ display: activeApp === 'numberlearning' ? 'block' : 'none' }}>
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

        {openedApps.has('vowelslearning') && (
          <div style={{ display: activeApp === 'vowelslearning' ? 'block' : 'none' }}>
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

        {openedApps.has('animalsound') && (
          <div style={{ display: activeApp === 'animalsound' ? 'block' : 'none' }}>
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

        {openedApps.has('burmeselearninggames') && (
          <div style={{ display: activeApp === 'burmeselearninggames' ? 'block' : 'none' }}>
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

        {openedApps.has('interactivequiz') && (
          <div style={{ display: activeApp === 'interactivequiz' ? 'block' : 'none' }}>
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

        {openedApps.has('myanmarpoems') && (
          <div style={{ display: activeApp === 'myanmarpoems' ? 'block' : 'none' }}>
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

        {openedApps.has('consonantendings') && (
          <div style={{ display: activeApp === 'consonantendings' ? 'block' : 'none' }}>
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

        {openedApps.has('timeandcalendar') && (
          <div style={{ display: activeApp === 'timeandcalendar' ? 'block' : 'none' }}>
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

        {openedApps.has('myanmarspelling') && (
          <div style={{ display: activeApp === 'myanmarspelling' ? 'block' : 'none' }}>
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

        {openedApps.has('myanmarsoundpractice') && (
          <div style={{ display: activeApp === 'myanmarsoundpractice' ? 'block' : 'none' }}>
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

        {openedApps.has('readingmyanmar') && (
          <div style={{ display: activeApp === 'readingmyanmar' ? 'block' : 'none' }}>
            <ReadingMyanmarApp entryRequest={readingMyanmarRequest} onExit={closeReadingMyanmar} />
          </div>
        )}

        {openedApps.has('speakingmyanmar') && (
          <div style={{ display: activeApp === 'speakingmyanmar' ? 'block' : 'none' }}>
            <SpeakingMyanmarApp entryRequest={speakingMyanmarRequest} onExit={closeSpeakingMyanmar} />
          </div>
        )}
      </Suspense>
    </div>
  );
}

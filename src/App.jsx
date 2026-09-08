import React, { useState, useEffect, Suspense } from 'react';
import TutoringApp from './TutoringApp';
import InstallAppBanner from './InstallAppBanner';

// A React.lazy()+Suspense replacement. React.lazy's own resolution somehow
// gets permanently stuck on this site -- the dynamic import() itself
// resolves fine (confirmed via manual testing: the chunk fetches, links,
// and its default export is a real function within milliseconds) but the
// Suspense boundary never swaps the fallback for the real content, forever,
// with no console error of any kind. A plain useState-driven re-render
// (confirmed working reliably even in the exact same stuck scenario, e.g.
// the notifications-bell dropdown) doesn't depend on whatever internal
// mechanism React.lazy/Suspense uses to schedule that swap, so doing the
// import manually and setting state ourselves sidesteps the hang entirely.
function lazyLoad(importer) {
  return function LazyMount(props) {
    const [Comp, setComp] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
      let cancelled = false;
      importer()
        .then((mod) => { if (!cancelled) setComp(() => mod.default); })
        .catch((err) => { if (!cancelled) setError(err); });
      return () => { cancelled = true; };
    }, []);
    if (error) throw error;
    if (!Comp) return <LoadingFallback />;
    return <Comp {...props} />;
  };
}

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
const SmartStudyApp = lazyLoad(() => import('./SmartStudy'));
const AbhidhammaApp = lazyLoad(() => import('./AbhidhammaApp'));
const MyanmarReaderApp = lazyLoad(() => import('./MyanmarReaderApp'));
const DhammaschoolApp = lazyLoad(() => import('./DhammaschoolApp'));
const ConsonantPracticeApp = lazyLoad(() => import('./ConsonantPracticeApp'));
const BurmeseConsonantGameApp = lazyLoad(() => import('./BurmeseConsonantGameApp'));
const MyanmarSpeakingApp = lazyLoad(() => import('./myanmar-speaking-app'));
const MyanmarNumberLearningApp = lazyLoad(() => import('./MyanmarNumberLearningApp'));
const MyanmarVowelsLearningApp = lazyLoad(() => import('./MyanmarVowelsLearningApp'));
const AnimalSoundApp = lazyLoad(() => import('./AnimalSoundApp'));
const BurmeseLearningGamesApp = lazyLoad(() => import('./BurmeseLearningGamesApp'));
const InteractiveLearningQuizApp = lazyLoad(() => import('./InteractiveLearningQuizApp'));
const MyanmarPoemsApp = lazyLoad(() => import('./MyanmarPoemsApp'));
const MyanmarConsonantEndingsApp = lazyLoad(() => import('./MyanmarConsonantEndingsApp'));
const TimeAndCalendarApp = lazyLoad(() => import('./TimeAndCalendarApp'));
const MyanmarSpellingApp = lazyLoad(() => import('./MyanmarSpellingApp'));
const MyanmarSoundPracticeApp = lazyLoad(() => import('./MyanmarSoundPracticeApp'));
// Combined "Reading Myanmar" group — bundles ConsonantPracticeApp,
// BurmeseConsonantGameApp, MyanmarVowelsLearningApp, MyanmarSpellingApp,
// MyanmarConsonantEndingsApp and MyanmarSoundPracticeApp behind one Lesson
// Bank entry with a "Choose a Part" landing screen (see ReadingMyanmarApp.jsx).
// The 6 apps above stay wired individually too for now, so nothing already
// working changes — this is purely an additional entry point.
const ReadingMyanmarApp = lazyLoad(() => import('./ReadingMyanmarApp'));
// Second combined group — bundles MyanmarPoemsApp, MyanmarNumberLearningApp,
// AnimalSoundApp, BurmeseLearningGamesApp, InteractiveLearningQuizApp and
// TimeAndCalendarApp the same way (see SpeakingMyanmarApp.jsx).
const SpeakingMyanmarApp = lazyLoad(() => import('./SpeakingMyanmarApp'));
// Third combined group — bundles MyanmarPart1AApp, MyanmarPart1BApp,
// MyanmarPart2AApp and MyanmarPart2BApp the same way (see
// MyanmarPart1And2App.jsx).
const MyanmarPart1And2App = lazyLoad(() => import('./MyanmarPart1And2App'));
// Bodhi Tree — first piece of the planned gamified student "Home": a tree
// that grows from a student's real attendance history. Deliberately its
// own standalone app (not part of TutoringApp.jsx) per the teacher's
// request, so the gamification layer can grow independently later.
const BodhiTreeApp = lazyLoad(() => import('./BodhiTreeApp'));

// Catches a failed lazy-chunk load (e.g. the browser has an old page open
// from before a new deploy replaced that chunk's file) so it shows a
// recoverable message instead of a blank crashed screen.
//
// A plain window.location.reload() isn't enough to actually recover: it can
// re-fetch the exact same stale, cached index.html (from the browser's disk
// cache or GitHub Pages' CDN) that references the old, now-deleted chunk
// file, so the same failure just repeats forever until the visitor does a
// manual hard-refresh themselves. Reloading via a cache-busted URL instead
// forces a real network fetch of the current index.html, which references
// the current build's chunk hashes.
function hardReload() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now().toString());
    window.location.replace(url.toString());
  } catch (e) {
    window.location.reload();
  }
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error('App crashed:', error);
    // The one real failure mode here: the browser holding an old, now-
    // superseded build whose chunk files a newer deploy already replaced,
    // so a lazy import 404s. Rather than making every visitor notice the
    // error screen and click Reload themselves, auto-reload once -- a
    // sessionStorage guard stops it from looping if the crash turns out to
    // be something else that a reload won't fix.
    const msg = String(error?.message || '');
    const looksLikeStaleChunk = error?.name === 'ChunkLoadError'
      || /dynamically imported module|failed to fetch|loading chunk|importing a module script failed/i.test(msg);
    if (looksLikeStaleChunk) {
      try {
        if (!sessionStorage.getItem('dhamma_auto_reload_attempted')) {
          sessionStorage.setItem('dhamma_auto_reload_attempted', '1');
          hardReload();
        }
      } catch (e) {}
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-indigo-50 p-4 text-center">
          <div className="text-xl font-semibold text-indigo-600">Something went wrong loading this page.</div>
          <p className="text-sm text-indigo-500">This can happen right after an update. Reloading usually fixes it.</p>
          <button
            onClick={hardReload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold text-sm hover:bg-indigo-700"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingFallback() {
  // Some of these apps (Smart Study especially) are large, so the first
  // download after a fresh deploy or on a slow connection can take a
  // moment. If it's still loading after a while, offer a reload instead
  // of leaving the visitor staring at a spinner with no way out -- a
  // reload re-fetches the current chunk list fresh, which also recovers
  // from the one real failure mode here: the browser holding an old,
  // now-superseded build that references chunk files a newer deploy
  // already replaced.
  const [showReload, setShowReload] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowReload(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-indigo-50">
      <div className="text-xl font-semibold text-indigo-600">Loading...</div>
      {showReload && (
        <div className="text-center">
          <p className="text-sm text-indigo-500 mb-2">Taking longer than usual.</p>
          <button
            onClick={hardReload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold text-sm hover:bg-indigo-700"
          >
            Reload page
          </button>
        </div>
      )}
    </div>
  );
}

// These five are large, complex apps with substantial internal state and
// initialization logic (role/login screens, class pickers, live listeners)
// that's expensive -- and in Smart Study/Abhidhamma's case, apparently not
// reliable -- to redo from scratch every time they're reopened. They're
// kept mounted (hidden) once opened instead of being unmounted on switch,
// same as before; every other app is simpler and unmounts on switch so
// its resources (audio, roster heartbeat) actually stop.
const KEEP_ALIVE_APPS = new Set(['smartstudy', 'abhidhamma', 'myanmarreader', 'dhammaschool', 'myanmarspeaking']);

export default function App() {
  const [activeApp, setActiveApp] = useState('tutoring');
  const [openedKeepAliveApps, setOpenedKeepAliveApps] = useState(() => new Set());
  // A fresh mount only happens via an actual page load, so getting here at
  // all means this page's own chunk loaded fine -- clear the auto-reload
  // guard so a stale-chunk crash on a DIFFERENT lazy-loaded app later in
  // this same visit (e.g. opening Smart Study after Tutoring loaded fine)
  // is still allowed one automatic reload of its own.
  useEffect(() => {
    try { sessionStorage.removeItem('dhamma_auto_reload_attempted'); } catch (e) {}
  }, []);
  useEffect(() => {
    if (!KEEP_ALIVE_APPS.has(activeApp) || openedKeepAliveApps.has(activeApp)) return;
    setOpenedKeepAliveApps(prev => new Set(prev).add(activeApp));
  }, [activeApp, openedKeepAliveApps]);

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
  const [bodhiTreeRequest, setBodhiTreeRequest] = useState(null);

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

  const openBodhiTree = (request) => {
    setBodhiTreeRequest(request || {});
    setActiveApp('bodhitree');
  };
  const closeBodhiTree = () => {
    setActiveApp('tutoring');
    setBodhiTreeRequest(null);
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
          onOpenBodhiTree={openBodhiTree}
        />
      </div>

      <AppErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {openedKeepAliveApps.has('smartstudy') && (
          <div style={{ display: activeApp === 'smartstudy' ? 'block' : 'none' }}>
            {activeApp === 'smartstudy' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeSmartStudy}
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
                </button>
              </div>
            )}
            <SmartStudyApp entryRequest={smartStudyRequest} onExit={closeSmartStudy} />
          </div>
        )}

        {openedKeepAliveApps.has('abhidhamma') && (
          <div style={{ display: activeApp === 'abhidhamma' ? 'block' : 'none' }}>
            {activeApp === 'abhidhamma' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeAbhidhamma}
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
                </button>
              </div>
            )}
            <AbhidhammaApp entryRequest={abhidhammaRequest} onExit={closeAbhidhamma} />
          </div>
        )}

        {openedKeepAliveApps.has('myanmarreader') && (
          <div style={{ display: activeApp === 'myanmarreader' ? 'block' : 'none' }}>
            {activeApp === 'myanmarreader' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarReader}
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
                </button>
              </div>
            )}
            <MyanmarReaderApp entryRequest={myanmarReaderRequest} onExit={closeMyanmarReader} />
          </div>
        )}

        {openedKeepAliveApps.has('dhammaschool') && (
          <div style={{ display: activeApp === 'dhammaschool' ? 'block' : 'none' }}>
            {activeApp === 'dhammaschool' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeDhammaschool}
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
                </button>
              </div>
            )}
            <BurmeseConsonantGameApp entryRequest={burmeseGameRequest} onExit={closeBurmeseGame} />
          </div>
        )}

        {openedKeepAliveApps.has('myanmarspeaking') && (
          <div style={{ display: activeApp === 'myanmarspeaking' ? 'block' : 'none' }}>
            {activeApp === 'myanmarspeaking' && (
              <div className="fixed top-3 left-3 z-[9999]">
                <button
                  onClick={closeMyanmarSpeaking}
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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
                  className="w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
                  aria-label="Back to Tutoring Dashboard"
                >
                  🏡
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

        {activeApp === 'bodhitree' && (
          <div>
            <BodhiTreeApp entryRequest={bodhiTreeRequest} onExit={closeBodhiTree} />
          </div>
        )}
      </Suspense>
      </AppErrorBoundary>
      <InstallAppBanner />
    </div>
  );
}

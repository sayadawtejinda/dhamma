import React, { useState } from 'react';
import TutoringApp from './TutoringApp';
import SmartStudyApp from './SmartStudy';
import AbhidhammaApp from './AbhidhammaApp';
import MyanmarReaderApp from './MyanmarReaderApp';
import DhammaschoolApp from './DhammaschoolApp';
import ConsonantPracticeApp from './ConsonantPracticeApp';
import BurmeseConsonantGameApp from './BurmeseConsonantGameApp';
import MyanmarSpeakingApp from './myanmar-speaking-app';
import MyanmarNumberLearningApp from './MyanmarNumberLearningApp';
import MyanmarVowelsLearningApp from './MyanmarVowelsLearningApp';
import AnimalSoundApp from './AnimalSoundApp';
import BurmeseLearningGamesApp from './BurmeseLearningGamesApp';
import InteractiveLearningQuizApp from './InteractiveLearningQuizApp';
import MyanmarPoemsApp from './MyanmarPoemsApp';
import MyanmarConsonantEndingsApp from './MyanmarConsonantEndingsApp';
import TimeAndCalendarApp from './TimeAndCalendarApp';

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
      {/* All apps stay mounted so switching never loses in-progress state. */}
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
        />
      </div>

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
    </div>
  );
}

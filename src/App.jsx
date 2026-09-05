import React, { useState } from 'react';
import TutoringApp from './TutoringApp';
import SmartStudyApp from './SmartStudy';
import AbhidhammaApp from './AbhidhammaApp';
import MyanmarReaderApp from './MyanmarReaderApp';
import DhammaschoolApp from './DhammaschoolApp';
import ConsonantPracticeApp from './ConsonantPracticeApp';

export default function App() {
  const [activeApp, setActiveApp] = useState('tutoring');
  const [smartStudyRequest, setSmartStudyRequest] = useState(null);
  const [abhidhammaRequest, setAbhidhammaRequest] = useState(null);
  const [myanmarReaderRequest, setMyanmarReaderRequest] = useState(null);
  const [dhammaschoolRequest, setDhammaschoolRequest] = useState(null);
  const [consonantPracticeRequest, setConsonantPracticeRequest] = useState(null);

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
    </div>
  );
}

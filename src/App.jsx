import React, { useState } from 'react';
import TutoringApp from './TutoringApp';
import SmartStudyApp from './SmartStudy';
import AbhidhammaApp from './AbhidhammaApp';

export default function App() {
  const [activeApp, setActiveApp] = useState('tutoring');
  const [smartStudyRequest, setSmartStudyRequest] = useState(null);
  const [abhidhammaRequest, setAbhidhammaRequest] = useState(null);

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
    </div>
  );
}

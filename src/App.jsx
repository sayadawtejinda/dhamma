import React, { useState } from 'react';
import TutoringApp from './TutoringApp';
import SmartStudyApp from './SmartStudy';

export default function App() {
  const [activeApp, setActiveApp] = useState('tutoring');
  const [smartStudyRequest, setSmartStudyRequest] = useState(null);

  const openSmartStudy = (request) => {
    setSmartStudyRequest(request || { mode: 'teacher' });
    setActiveApp('smartstudy');
  };

  const closeSmartStudy = () => {
    setActiveApp('tutoring');
    setSmartStudyRequest(null);
  };

  return (
    <div className="min-h-screen">
      {/* Both stay mounted so switching apps never loses in-progress state (e.g. an active quiz). */}
      <div style={{ display: activeApp === 'tutoring' ? 'block' : 'none' }}>
        <TutoringApp onOpenSmartStudy={openSmartStudy} />
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
    </div>
  );
}

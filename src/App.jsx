import React, { useState } from 'react';
import TutoringApp from './TutoringApp';
import SmartStudyApp from './SmartStudy';

export default function App() {
  const [activeTab, setActiveTab] = useState('tutoring');

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-[200] bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="flex">
          <button
            onClick={() => setActiveTab('tutoring')}
            className={`flex-1 py-3 px-4 font-bold text-sm sm:text-base transition-colors ${
              activeTab === 'tutoring'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 Tutoring Dashboard
          </button>
          <button
            onClick={() => setActiveTab('smartstudy')}
            className={`flex-1 py-3 px-4 font-bold text-sm sm:text-base transition-colors ${
              activeTab === 'smartstudy'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            📚 Lessons & Quiz
          </button>
        </div>
      </div>

      {/* Both stay mounted so switching tabs never loses in-progress state (e.g. an active quiz). */}
      <div style={{ display: activeTab === 'tutoring' ? 'block' : 'none' }}>
        <TutoringApp />
      </div>
      <div style={{ display: activeTab === 'smartstudy' ? 'block' : 'none' }}>
        <SmartStudyApp />
      </div>
    </div>
  );
}

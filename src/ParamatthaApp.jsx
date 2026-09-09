import React, { useState } from 'react';
import MyanmarVersion from './Paramattha1App.jsx';
import VietnameseVersion from './Paramattha2App.jsx';

// These two are independently-generated apps (not a single codebase with
// swappable text) -- their internal logic has already drifted apart in
// places (see the commit that added this file for specifics), so this
// wraps them as two full alternatives behind one language switch rather
// than attempting a deeper merge that could silently mix up citta data
// between the two. A future edit made to only one of Paramattha1App.jsx /
// Paramattha2App.jsx will NOT automatically appear in the other language.
const LANGUAGES = [
  { key: 'my', label: 'မြန်မာ', Component: MyanmarVersion },
  { key: 'vi', label: 'Tiếng Việt', Component: VietnameseVersion },
];

export default function ParamatthaApp() {
  const [lang, setLang] = useState(null);

  if (!lang) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <h1 className="text-2xl font-bold text-slate-800">အဘိဓမ္မာ ပရမတ္ထတရား (၄) ပါး</h1>
          <p className="text-slate-500 text-sm">Choose a language / ဘာသာစကားရွေးပါ / Chọn ngôn ngữ</p>
          <div className="space-y-3">
            {LANGUAGES.map(l => (
              <button
                key={l.key}
                onClick={() => setLang(l.key)}
                className="w-full py-3 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 font-bold text-lg text-slate-700 transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const Active = LANGUAGES.find(l => l.key === lang)?.Component;
  return (
    <div className="relative">
      <button
        onClick={() => setLang(null)}
        className="fixed top-3 left-3 z-[10000] bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg"
        title="Switch language"
      >
        🌐 {LANGUAGES.find(l => l.key === lang)?.label}
      </button>
      <Active />
    </div>
  );
}

import React, { useState } from 'react';
import ParamatthaCore from './Paramattha1App.jsx';
import VietnameseVersion from './Paramattha2App.jsx';

// Paramattha1App.jsx is being migrated, section by section, from hardcoded
// Myanmar text to a lang-aware dictionary (see src/paramatthaStrings.js) --
// it's the same component for 'my' and (eventually) 'en', just with a
// different lang prop, so a piece of text only shows translated once it's
// actually been migrated (everything else falls back to Myanmar -- see the
// fallback logic in paramatthaStrings.js's t()).
//
// 'en' is NOT added to LANGUAGES below yet -- translation coverage is still
// tiny (a handful of dropdown labels as of the commit that added this
// comment), so flipping it on now would show real students mostly-Myanmar
// text under an "English" button, which is worse than not offering English
// at all. Add an 'en' entry here once enough of Paramattha1App.jsx's text
// (citta names, category dropdowns, and the desc/explanation paragraphs)
// has been migrated that the English mode is actually usable end to end.
//
// VietnameseVersion is a separate, still fully Myanmar-independent,
// pre-existing file (see the commit that added this file for why it wasn't
// merged into the same codebase) -- a future edit to ParamatthaCore will
// NOT automatically appear there.
const LANGUAGES = [
  { key: 'my', label: 'မြန်မာ', Component: (props) => <ParamatthaCore {...props} lang="my" /> },
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

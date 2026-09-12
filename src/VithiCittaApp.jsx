import React, { useState } from 'react';
import VithiCittaMyanmarCore from './VithiCitta1App.jsx';
import VithiCittaVietnameseVersion from './VithiCitta2App.jsx';

// Both language versions are separate, fully independent components (unlike
// Paramattha's Myanmar/English lang-dict migration) -- an edit to one will
// NOT automatically appear in the other. See src/ParamatthaApp.jsx for the
// precedent this mirrors.
const LANGUAGES = [
  { key: 'my', label: 'မြန်မာ', Component: VithiCittaMyanmarCore },
  { key: 'vi', label: 'Tiếng Việt', Component: VithiCittaVietnameseVersion },
];

export default function VithiCittaApp() {
  // No separate "choose a language" page -- the 🌐 button below cycles
  // straight through LANGUAGES in place (my -> vi -> my -> ...).
  const [langIdx, setLangIdx] = useState(0);
  const current = LANGUAGES[langIdx];
  const Active = current.Component;
  const cycleLang = () => setLangIdx(prev => (prev + 1) % LANGUAGES.length);

  return (
    <div className="relative">
      <button
        onClick={cycleLang}
        className="fixed top-3 left-3 z-[10000] bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg"
        title="Switch language"
      >
        🌐 {current.label}
      </button>
      <Active />
    </div>
  );
}

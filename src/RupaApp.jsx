import React, { useState } from 'react';
import RupaMyanmarCore from './Rupa1App.jsx';
import RupaVietnameseVersion from './Rupa2App.jsx';

// Both language versions are separate, fully independent components (unlike
// Paramattha's Myanmar/English lang-dict migration) -- an edit to one will
// NOT automatically appear in the other. See src/VithiCittaApp.jsx for the
// precedent this mirrors.
const LANGUAGES = [
  { key: 'my', label: 'မြန်မာ', Component: RupaMyanmarCore },
  { key: 'vi', label: 'Tiếng Việt', Component: RupaVietnameseVersion },
];

export default function RupaApp() {
  // No separate "choose a language" page -- the 🌐 button below cycles
  // straight through LANGUAGES in place (my -> vi -> my -> ...).
  const [langIdx, setLangIdx] = useState(0);
  const current = LANGUAGES[langIdx];
  const Active = current.Component;
  const cycleLang = () => setLangIdx(prev => (prev + 1) % LANGUAGES.length);

  // Lives here in the wrapper (not in either language component) so it
  // survives the full unmount/remount that happens when `Active` changes --
  // this is the language-neutral "which top-level page" snapshot (active
  // tab/door/origin/kotthasa) reported by whichever language component is
  // currently mounted, fed back in as that component's `initialPage` so
  // switching language keeps the user on the same page instead of
  // resetting to the default screen.
  const [pageState, setPageState] = useState(null);

  return (
    <div className="relative">
      <button
        onClick={cycleLang}
        className="fixed top-3 left-3 z-[10000] bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg"
        title="Switch language"
      >
        🌐 {current.label}
      </button>
      <Active initialPage={pageState} onPageChange={setPageState} />
    </div>
  );
}

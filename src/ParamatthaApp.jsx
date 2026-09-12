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
  // No separate "choose a language" page -- the 🌐 button below cycles
  // straight through LANGUAGES in place (my -> vi -> my -> ...). Adding a
  // 3rd entry (e.g. 'en', once its translation coverage is ready) needs no
  // change here -- it just joins the cycle.
  const [langIdx, setLangIdx] = useState(0);
  const current = LANGUAGES[langIdx];
  const Active = current.Component;
  const cycleLang = () => setLangIdx(prev => (prev + 1) % LANGUAGES.length);

  // Lives here in the wrapper (not in either language component) so it
  // survives the full unmount/remount that happens when `Active` changes --
  // the language-neutral "which top-level page" snapshot (open dropdown/
  // category menu, expanded akusala/missaka/bodhi group, which of the
  // vithi/bhumi/paticca floating panels is open) reported by whichever
  // language component is currently mounted, fed back in as that
  // component's `initialPage` so switching language keeps the user on the
  // same page instead of resetting to the default screen.
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

import React from 'react';
import RupaMyanmarCore from './Rupa1App.jsx';
import RupaVietnameseVersion from './Rupa2App.jsx';

// Full-screen overlay opened by the "ရုပ်" floating button on the Paramattha page. It follows Paramattha's current
// language (Rupa1App for Myanmar, Rupa2App for Vietnamese; English will join once its translation exists, until then
// it shows the Myanmar one). The Rupa page state (tab/door/origin/kotthasa) is kept by the caller so a language
// switch re-opens the same view.
export default function RupaOverlay({ lang, onClose, initialPage, onPageChange }) {
  const Comp = lang === 'vi' ? RupaVietnameseVersion : RupaMyanmarCore;
  return (
    <div className="fixed inset-0 z-[9000] bg-white overflow-auto">
      <button
        onClick={onClose}
        className="fixed top-3 right-3 z-[10001] bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold w-9 h-9 rounded-full shadow-lg"
        title="✕"
      >
        ✕
      </button>
      <Comp initialPage={initialPage} onPageChange={onPageChange} />
    </div>
  );
}

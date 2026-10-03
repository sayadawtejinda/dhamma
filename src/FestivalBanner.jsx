import React, { useState } from 'react';
import { useFestivalSettings, getActiveFestivals } from './festivals';

// Announcement board on the student home page, one per festival that is
// open right now. Tapping it opens that festival. Nothing renders outside
// festival dates, and the dates come from one cached settings read (see
// festivals.js), so a closed festival costs nothing on the home page.
const prettyDate = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// A student who doesn't want the big board can close it; it then shrinks to
// a small tappable chip (so the festival stays reachable) for the rest of
// that festival, remembered on this device only.
const dismissKey = (id) => `festival_banner_closed_${id}`;
const readDismissed = (id) => { try { return localStorage.getItem(dismissKey(id)) === '1'; } catch (e) { return false; } };

export default function FestivalBanners({ onOpenFestival, studentUid, studentName }) {
  const settings = useFestivalSettings();
  const [closed, setClosed] = useState({});
  const isClosed = (id) => closed[id] ?? readDismissed(id);
  const setBannerClosed = (id, value) => {
    setClosed(prev => ({ ...prev, [id]: value }));
    try { value ? localStorage.setItem(dismissKey(id), '1') : localStorage.removeItem(dismissKey(id)); } catch (e) { /* storage blocked -- just not remembered */ }
  };
  if (!onOpenFestival || !settings) return null;
  const open = getActiveFestivals(settings);
  if (open.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2 mb-3 px-1">
      <style>{`
        @keyframes fbGlow { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(255,190,70,.7)) } 50% { transform: scale(1.12); filter: drop-shadow(0 0 20px rgba(255,200,90,1)) } }
        @keyframes fbTwinkle { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
        @keyframes fbShine { 0% { transform: translateX(-120%) } 100% { transform: translateX(380%) } }
      `}</style>
      {open.map(f => isClosed(f.id) ? (
        <button
          key={f.id}
          onClick={() => onOpenFestival({ studentUid, studentName, festival: f })}
          className="flex items-center gap-2 rounded-full border-2 border-amber-300 bg-indigo-950 text-amber-100 text-sm font-bold px-4 py-2 shadow-lg hover:scale-105 transition-transform"
        >
          <span>{f.icon}</span><span>{f.title}</span><span className="text-amber-300">→</span>
        </button>
      ) : (
        <div key={f.id} className="relative w-full max-w-lg">
        <button
          onClick={(e) => { e.stopPropagation(); setBannerClosed(f.id, true); }}
          aria-label="Close this announcement"
          title="Close"
          className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-gray-800 text-white text-sm font-bold shadow-lg hover:bg-gray-900 flex items-center justify-center"
        >
          ✕
        </button>
        <button
          onClick={() => onOpenFestival({ studentUid, studentName, festival: f })}
          className="relative w-full overflow-hidden rounded-2xl border-2 border-amber-300 text-white shadow-xl hover:scale-[1.01] transition-transform px-3 py-2 flex items-center gap-3 text-left"
          style={{ background: 'linear-gradient(160deg,#0b1030 0%,#241a5e 55%,#5a2a5e 100%)' }}
        >
          {[[22, 20], [46, 70], [60, 18], [78, 66], [92, 24]].map(([x, y], i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: 2, height: 2, animation: `fbTwinkle ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite` }} />
          ))}
          <span className="absolute inset-y-0 left-0 w-1/4 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)', animation: 'fbShine 4.5s ease-in-out infinite' }} />
          {/* One slim row (icon, name and dates, Enter) -- short enough that
              a phone held sideways still shows the rest of the home page. */}
          <span className="relative text-3xl leading-none flex-shrink-0" style={{ animation: 'fbGlow 2.4s ease-in-out infinite' }}>{f.icon}</span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-sm font-black text-amber-100 leading-tight truncate">{f.title}</span>
            <span className="block text-[11px] text-indigo-300 leading-tight">Festival time · Open {prettyDate(f.start)} – {prettyDate(f.end)}</span>
          </span>
          <span className="relative flex-shrink-0 bg-amber-400 text-indigo-950 font-black text-xs rounded-full px-3 py-1.5 shadow">Enter →</span>
        </button>
        </div>
      ))}
    </div>
  );
}

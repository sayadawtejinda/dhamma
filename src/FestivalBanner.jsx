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
    <div className="flex flex-col items-center gap-4 my-6 px-1">
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
        <div key={f.id} className="relative w-full max-w-md">
        <button
          onClick={(e) => { e.stopPropagation(); setBannerClosed(f.id, true); }}
          aria-label="Close this announcement"
          title="Close"
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-gray-800 text-white font-bold shadow-lg hover:bg-gray-900 flex items-center justify-center"
        >
          ✕
        </button>
        <button
          onClick={() => onOpenFestival({ studentUid, studentName, festival: f })}
          className="relative w-full overflow-hidden rounded-3xl border-2 border-amber-300 text-white text-center shadow-2xl hover:scale-[1.02] transition-transform px-6 py-6"
          style={{ background: 'linear-gradient(160deg,#0b1030 0%,#241a5e 55%,#5a2a5e 100%)' }}
        >
          {[[12, 18], [28, 70], [47, 12], [66, 74], [84, 22], [92, 62], [8, 56], [74, 10]].map(([x, y], i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: 3, height: 3, animation: `fbTwinkle ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite` }} />
          ))}
          <span className="absolute inset-y-0 left-0 w-1/3 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)', animation: 'fbShine 4.5s ease-in-out infinite' }} />
          <div className="relative text-6xl" style={{ animation: 'fbGlow 2.4s ease-in-out infinite' }}>{f.icon}</div>
          <div className="relative mt-2 text-xs font-bold tracking-widest text-amber-300">FESTIVAL TIME</div>
          <div className="relative mt-1 text-2xl font-black text-amber-100 leading-tight">{f.title}</div>
          <div className="relative mt-1 text-sm text-indigo-200">{f.tagline}</div>
          <div className="relative mt-2 text-xs text-indigo-300">Open {prettyDate(f.start)} – {prettyDate(f.end)}</div>
          <div className="relative mt-4 inline-block bg-amber-400 text-indigo-950 font-black rounded-full px-6 py-2 shadow-lg">Enter the festival →</div>
        </button>
        </div>
      ))}
    </div>
  );
}

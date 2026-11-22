import React, { useEffect, useState } from 'react';

// A little green firefly that drifts around the screen while the teacher's new lesson is waiting
// (not opened yet) and the student is in some other app. A note hangs under it; tapping either
// one does the same as the 📖 Latest Lesson button. TutoringApp reports the state through
// window.__lessonWaiting + the 'tutoring-lesson-waiting' event and offers window.__tutoringOpenLatest.
export default function LessonFirefly({ activeApp, onGoHome }) {
  const [waiting, setWaiting] = useState(() => !!window.__lessonWaiting);
  useEffect(() => {
    const on = (e) => setWaiting(!!e.detail);
    window.addEventListener('tutoring-lesson-waiting', on);
    return () => window.removeEventListener('tutoring-lesson-waiting', on);
  }, []);
  if (!waiting || activeApp === 'tutoring') return null;

  const go = () => {
    onGoHome();
    setTimeout(() => { try { window.__tutoringOpenLatest && window.__tutoringOpenLatest(); } catch (e) { /* ignore */ } }, 120);
  };
  return (
    <>
      <style>{`
        @keyframes ffDrift { 0% { transform: translate(0,0) } 20% { transform: translate(-22vw,-9vh) } 40% { transform: translate(-8vw,-24vh) } 60% { transform: translate(-30vw,-14vh) } 80% { transform: translate(-14vw,-3vh) } 100% { transform: translate(0,0) } }
        @keyframes ffGlow { 0%,100% { opacity: .55; filter: drop-shadow(0 0 4px #86efac) } 50% { opacity: 1; filter: drop-shadow(0 0 16px #4ade80) } }
        @keyframes ffTag { 0%,100% { transform: rotate(-3deg) } 50% { transform: rotate(3deg) } }
      `}</style>
      <div className="fixed z-[9990]" style={{ right: '6vw', bottom: '14vh', animation: 'ffDrift 14s ease-in-out infinite' }}>
        <button type="button" onClick={go} aria-label="Your teacher sent a lesson - open it" className="flex flex-col items-center" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <span style={{ fontSize: 34, lineHeight: 1, animation: 'ffGlow 1.1s ease-in-out infinite' }}>🟢</span>
          <span style={{ width: 2, height: 14, background: '#16a34a' }} />
          <span className="bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg px-3 py-1.5 shadow-lg border border-emerald-300 whitespace-nowrap" style={{ animation: 'ffTag 2s ease-in-out infinite', transformOrigin: 'top center' }}>
            📖 Your lesson is ready! Tap to study
          </span>
        </button>
      </div>
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { onSoundProblemChange, isSoundProblem, refreshAllSound } from './soundGuard';

// The 🔄 sound button of every app that makes a sound (Myanmar Reader has its own, with a page reload). Small and quiet while all is
// well; when the sound guard (soundGuard.js) notices trouble it turns yellow, pulses and says what to do.
const SOUND_APPS = new Set([
  'smartstudy', 'abhidhamma', 'dhammaschool', 'consonantpractice', 'burmesegame', 'myanmarspeaking', 'numberlearning', 'vowelslearning',
  'animalsound', 'burmeselearninggames', 'interactivequiz', 'myanmarpoems', 'consonantendings', 'timeandcalendar', 'myanmarspelling',
  'myanmarsoundpractice', 'readingmyanmar', 'speakingmyanmar', 'myanmarpart1and2', 'shrineroom', 'festival', 'bodhitree',
]);

export default function SoundGuardButton({ activeApp }) {
  const [problem, setProblem] = useState(isSoundProblem());
  const [note, setNote] = useState(null);
  const lastTapRef = useRef(0);
  useEffect(() => onSoundProblemChange(setProblem), []);

  if (activeApp === 'myanmarreader') return null;                  // it has its own
  if (!SOUND_APPS.has(activeApp) && !problem && !note) return null; // a silent screen shows it only if something went wrong

  const tap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 10000) {
      // second tap: the last resort
      if (window.confirm('Reload the page? You will go back to the start.')) window.location.reload();
      return;
    }
    lastTapRef.current = now;
    refreshAllSound();
    setNote('Sound refreshed. Still no sound? Tap 🔄 once more.');
    setTimeout(() => setNote(null), 7000);
  };

  return (
    <>
      <button
        type="button"
        onClick={tap}
        title="Sound not working? Tap to refresh the sound"
        className={`fixed z-[9990] rounded-full border shadow-md text-xl flex items-center justify-center transition-all active:scale-95 ${problem ? 'bg-yellow-300 border-yellow-500 animate-pulse ring-4 ring-yellow-200' : 'bg-white/70 hover:bg-white border-gray-300 opacity-70 hover:opacity-100'}`}
        style={{ left: 12, bottom: 12, width: 44, height: 44 }}
      >
        🔄
      </button>
    </>
  );
}

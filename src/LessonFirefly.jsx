import React, { useEffect, useRef, useState } from 'react';

// A friendly reminder that the teacher's new lesson is waiting (not opened yet) while the student is in
// another app. It shows for 5 seconds, hides for 10, then comes back in a different style (10 styles:
// firefly, aeroplane with a banner, boy with a flag, balloon, ...). It is never in the way: it only
// appears briefly, the student can drag it somewhere else, and tapping the note does the same as the
// 📖 Latest Lesson button. TutoringApp reports the state through window.__lessonWaiting + the
// 'tutoring-lesson-waiting' event and offers window.__tutoringOpenLatest.
const SHOW_MS = 5000;
const HIDE_MS = 10000;
const NOTE = '📖 Your lesson is ready! Tap to study';

// kind: 'hang' = object with the note hanging under it | 'trail' = object pulling the note behind it |
//       'flag' = a boy holding a flag with the note on it. move: 'LR' | 'RL' | 'rise' | 'drift'
const STYLES = [
  { id: 'firefly', obj: '🟢', kind: 'hang', move: 'drift', glow: true },
  { id: 'plane', obj: '✈️', kind: 'trail', move: 'LR', top: [12, 40] },
  { id: 'boyflag', obj: '🧒', kind: 'flag', move: 'RL', top: [62, 72] },
  { id: 'balloon', obj: '🎈', kind: 'hang', move: 'rise' },
  { id: 'bird', obj: '🐦', kind: 'trail', move: 'RL', top: [15, 50], flip: true },
  { id: 'butterfly', obj: '🦋', kind: 'hang', move: 'drift' },
  { id: 'rocket', obj: '🚀', kind: 'trail', move: 'LR', top: [10, 45] },
  { id: 'kite', obj: '🪁', kind: 'hang', move: 'rise' },
  { id: 'bee', obj: '🐝', kind: 'hang', move: 'drift' },
  { id: 'girlflag', obj: '👧', kind: 'flag', move: 'LR', top: [62, 72] },
];

const rnd = (a, b) => a + Math.random() * (b - a);

export default function LessonFirefly({ activeApp, onGoHome }) {
  const [waiting, setWaiting] = useState(() => !!window.__lessonWaiting);
  const [show, setShow] = useState(false);
  const [style, setStyle] = useState(STYLES[0]);
  const [seed, setSeed] = useState({ top: 30, left: 60 });
  const [drag, setDrag] = useState(null);       // { x, y } once the student moved it
  const [dragging, setDragging] = useState(false);
  const [tick, setTick] = useState(0);
  const timer = useRef(null);
  const downRef = useRef(null);
  const lastIdx = useRef(-1);

  useEffect(() => {
    const on = (e) => setWaiting(!!e.detail);
    window.addEventListener('tutoring-lesson-waiting', on);
    return () => window.removeEventListener('tutoring-lesson-waiting', on);
  }, []);

  const active = waiting && activeApp !== 'tutoring';

  // 5 s on, 10 s off, a new style each time
  useEffect(() => {
    clearTimeout(timer.current);
    if (!active) { setShow(false); return undefined; }
    const appear = () => {
      let i; do { i = Math.floor(Math.random() * STYLES.length); } while (i === lastIdx.current && STYLES.length > 1);
      lastIdx.current = i;
      const st = STYLES[i];
      setStyle(st);
      setSeed({ top: st.top ? rnd(st.top[0], st.top[1]) : rnd(20, 60), left: rnd(15, 70) });
      setDrag(null);
      setShow(true);
      timer.current = setTimeout(vanish, SHOW_MS);
    };
    const vanish = () => { setShow(false); timer.current = setTimeout(appear, HIDE_MS); };
    appear();
    return () => clearTimeout(timer.current);
  }, [active, tick]);

  if (!active || !show) return null;

  const go = () => {
    onGoHome();
    setTimeout(() => { try { window.__tutoringOpenLatest && window.__tutoringOpenLatest(); } catch (e) { /* ignore */ } }, 120);
  };

  // dragging: a tap opens the lesson, a drag only moves the picture
  const onDown = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    downRef.current = { sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, moved: false, w: r.width, h: r.height };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const onMove = (e) => {
    const d = downRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
    if (!d.moved) { d.moved = true; setDragging(true); clearTimeout(timer.current); }
    setDrag({ x: Math.max(0, Math.min(window.innerWidth - d.w, e.clientX - d.ox)), y: Math.max(0, Math.min(window.innerHeight - d.h, e.clientY - d.oy)) });
  };
  const onUp = () => {
    const d = downRef.current;
    downRef.current = null;
    if (!d) return;
    if (d.moved) {
      setDragging(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { setShow(false); timer.current = setTimeout(() => setTick(t => t + 1), HIDE_MS); }, SHOW_MS);
    } else {
      go();
    }
  };

  const note = (
    <span className="bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg px-3 py-1.5 shadow-lg border border-emerald-300 whitespace-nowrap select-none">{NOTE}</span>
  );
  const objStyle = { fontSize: 38, lineHeight: 1, display: 'inline-block', transform: style.flip ? 'scaleX(-1)' : undefined, animation: style.glow ? 'ffGlow 1.1s ease-in-out infinite' : 'ffBob 1.2s ease-in-out infinite' };

  let body;
  if (style.kind === 'trail') {
    // the object leads, the note trails behind on a short string
    const lr = style.move === 'LR';
    body = (
      <div className="flex items-center" style={{ flexDirection: lr ? 'row' : 'row-reverse' }}>
        {note}
        <span style={{ width: 16, height: 2, background: '#16a34a' }} />
        <span style={objStyle}>{style.obj}</span>
      </div>
    );
  } else if (style.kind === 'flag') {
    body = (
      <div className="flex items-end">
        <span style={{ ...objStyle, fontSize: 44, animation: 'ffStep .5s ease-in-out infinite' }}>{style.obj}</span>
        <span style={{ width: 3, height: 54, background: '#78350f', borderRadius: 2 }} />
        <span className="self-start" style={{ marginTop: 2, transformOrigin: 'left center', animation: 'ffWave 1s ease-in-out infinite' }}>{note}</span>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col items-center">
        <span style={objStyle}>{style.obj}</span>
        <span style={{ width: 2, height: 14, background: '#16a34a' }} />
        <span style={{ animation: 'ffTag 2s ease-in-out infinite', transformOrigin: 'top center', display: 'inline-block' }}>{note}</span>
      </div>
    );
  }

  const anim = { LR: 'ffLR', RL: 'ffRL', rise: 'ffRise', drift: 'ffDrift' }[style.move];
  const pos = drag
    ? { left: drag.x, top: drag.y }
    : style.move === 'rise' ? { left: `${seed.left}%`, top: 0 } : style.move === 'drift' ? { left: `${seed.left}%`, top: `${seed.top}%` } : { left: 0, top: `${seed.top}%` };

  return (
    <>
      <style>{`
        @keyframes ffLR { from { transform: translateX(-110%) } to { transform: translateX(calc(100vw + 10%)) } }
        @keyframes ffRL { from { transform: translateX(calc(100vw + 10%)) } to { transform: translateX(-110%) } }
        @keyframes ffRise { from { transform: translateY(105vh) } to { transform: translateY(-30vh) } }
        @keyframes ffDrift { 0% { transform: translate(0,0) } 25% { transform: translate(-14vw,-8vh) } 50% { transform: translate(-4vw,-16vh) } 75% { transform: translate(-18vw,-6vh) } 100% { transform: translate(-6vw,4vh) } }
        @keyframes ffGlow { 0%,100% { opacity: .55; filter: drop-shadow(0 0 4px #86efac) } 50% { opacity: 1; filter: drop-shadow(0 0 16px #4ade80) } }
        @keyframes ffBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes ffStep { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-4px) rotate(4deg) } }
        @keyframes ffWave { 0%,100% { transform: skewY(-3deg) } 50% { transform: skewY(3deg) } }
        @keyframes ffTag { 0%,100% { transform: rotate(-3deg) } 50% { transform: rotate(3deg) } }
      `}</style>
      <div className="fixed z-[9990]" style={{ ...pos, animation: drag ? 'none' : `${anim} ${SHOW_MS}ms linear forwards`, touchAction: 'none' }}>
        <div
          role="button" aria-label="Your teacher sent a lesson - open it (or drag to move)"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { downRef.current = null; setDragging(false); }}
          style={{ cursor: dragging ? 'grabbing' : 'pointer', touchAction: 'none' }}
        >
          {body}
        </div>
      </div>
    </>
  );
}

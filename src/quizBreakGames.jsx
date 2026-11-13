import React, { useState, useEffect, useRef } from 'react';
import coinDropSound from '../audio/coin-drop.mp3';

// The short coin games played between the two halves of a Smart Study quiz (and, later, any other app's quiz).
// Every game takes the same props and works the same way, so a new game only has to be added to QUIZ_BREAK_GAMES below:
//   coinsLeft -- coins the student can still earn from this lesson (the games never pay past it)
//   onDone(total) -- called with the coins won when the student taps Continue
// The coins themselves are paid by the app that shows the game (SmartStudy.jsx), exactly as before.
export const BIRD_COIN_CAP = 30; // most game coins one student can ever earn from one lesson

const GameButton = ({ children, onClick, disabled = false, className = '' }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`font-bold rounded-xl py-3 px-4 shadow-md active:scale-95 transition disabled:opacity-60 ${className}`}>{children}</button>
);

const playCoinSound = (ref) => {
  try { if (!ref.current) ref.current = new Audio(coinDropSound); ref.current.currentTime = 0; ref.current.play().catch(() => {}); } catch (e) { /* sound is optional */ }
};

// ---------------------------------------------------------------------------------------------------------------
// Game 1: cages with little birds pop up here and there. Tap one to open it -- the bird says thank you and drops 2 or 3 coins.
const BIRD_CAGES = 7;
const BIRD_FIRST_MS = 800;
const BIRD_EVERY_MS = 1500;
const BIRD_VISIBLE_MS = 3200;
const BIRD_THANKS = ['Thank you!', 'Thanks!', 'Thank you, friend!', 'You are kind!'];
export const BirdRescueGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [cages] = useState(() => Array.from({ length: BIRD_CAGES }, (_, i) => ({
    id: i, x: 4 + Math.random() * 62, y: 18 + Math.random() * 54,
    bird: ['🐦', '🐤', '🦜', '🕊️', '🐥'][i % 5], thanks: BIRD_THANKS[i % BIRD_THANKS.length],
  })));
  const [state, setState] = useState(() => Array(BIRD_CAGES).fill('waiting')); // waiting | visible | opened | missed
  const [won, setWon] = useState(() => Array(BIRD_CAGES).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    cages.forEach((c) => {
      const start = BIRD_FIRST_MS + c.id * BIRD_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === c.id && v === 'waiting' ? 'visible' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === c.id && v === 'visible' ? 'missed' : v))), start + BIRD_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [cages]);
  useEffect(() => { if (!finished && state.every(v => v === 'opened' || v === 'missed')) setFinished(true); }, [state, finished]);

  const openCage = (id) => {
    if (state[id] !== 'visible') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'opened' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#7dd3fc 0%,#bae6fd 55%,#86efac 100%)' }}>
      <style>{`
        @keyframes cagePop { 0% { transform: scale(0) } 70% { transform: scale(1.15) } 100% { transform: scale(1) } }
        @keyframes birdHop { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes birdFly { 0% { transform: translate(0,0) scale(1); opacity: 1 } 100% { transform: translate(110px,-190px) scale(1.5) rotate(18deg); opacity: 0 } }
        @keyframes thankRise { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-sky-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🐦 Free the birds! Tap the cages</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {cages.map((c, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'missed') return null;
        const opened = st === 'opened';
        return (
          <div key={c.id} className="absolute" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
            <button
              onClick={() => openCage(c.id)}
              disabled={opened}
              aria-label="Open the cage"
              className="relative block"
              style={{ width: 76, height: 92, animation: opened ? 'none' : 'cagePop .35s ease-out', transform: opened ? 'rotate(-16deg) translateY(-8px)' : 'none', opacity: opened ? 0.35 : 1, transition: 'transform .4s, opacity .6s' }}
            >
              <span className="absolute left-1/2 text-3xl select-none" style={{ top: '30%', marginLeft: -16, animation: opened ? 'birdFly 1.3s ease-in forwards' : 'birdHop .7s ease-in-out infinite' }}>{c.bird}</span>
              <svg viewBox="0 0 80 96" width="76" height="92" className="relative">
                <path d="M12 58 Q12 14 40 14 Q68 14 68 58 Z" fill="rgba(255,255,255,0.18)" stroke="#8d6e63" strokeWidth="3" />
                <g stroke="#8d6e63" strokeWidth="2.5"><line x1="26" y1="17" x2="26" y2="58" /><line x1="40" y1="14" x2="40" y2="58" /><line x1="54" y1="17" x2="54" y2="58" /></g>
                <rect x="8" y="58" width="64" height="12" rx="5" fill="#a1887f" stroke="#6d4c41" strokeWidth="2" />
                <circle cx="40" cy="8" r="5" fill="none" stroke="#8d6e63" strokeWidth="3" />
              </svg>
            </button>
            {opened && (
              <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-center whitespace-nowrap" style={{ top: -28, animation: 'thankRise 1.8s ease-out forwards' }}>
                <div className="bg-white text-sky-900 font-bold text-sm rounded-full px-3 py-1 shadow">{c.thanks}</div>
                {won[i] > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won[i]} 🪙</div>}
              </div>
            )}
          </div>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{total > 0 ? '🎉' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{total > 0 ? `You freed ${won.filter(w => w > 0).length} birds!` : 'Nice try!'}</h2>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the bird coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 2: a garden. Rose and jasmine bushes stand all over the screen and flowers blossom here and there on them. Tap a flower
// to pick it -- it floats over to the Buddha statue as an offering, and the student gets 2 or 3 coins. Seven flowers in all,
// same timing and coins as the birds.
const FLOWERS = 7;
const FLOWER_FIRST_MS = 800;
const FLOWER_EVERY_MS = 1500;
const FLOWER_VISIBLE_MS = 3200;
const FLOWER_THANKS = ['Sadhu!', 'Sadhu! Sadhu!', 'What a kind offering!', 'Lovely flower!'];
const FLOWER_SIZE = 'clamp(44px, 9vmin, 80px)'; // easy to tap on a phone, still in proportion on a big screen
const STATUE = { x: 50, y: 80 };                // where picked flowers go (% of the screen)
// the bushes: centre in % of the screen; size is in vmin, so a bush is never stretched
const BUSHES = [
  { x: 18, y: 34, kind: 'rose' }, { x: 80, y: 30, kind: 'jasmine' }, { x: 50, y: 50, kind: 'rose' },
  { x: 16, y: 66, kind: 'jasmine' }, { x: 84, y: 64, kind: 'rose' },
];
const BUSH_W = 36, BUSH_H = 18; // vmin
const BUSH_COLORS = { rose: ['#16a34a', '#15803d'], jasmine: ['#22c55e', '#16a34a'] };

// A flower drawn as a picture (so it looks the same on every phone): a rose is a red rosette, jasmine a small white star.
const GardenFlower = ({ kind }) => (kind === 'rose' ? (
  <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#e11d48" /><circle cx="20" cy="20" r="12" fill="#f43f5e" /><circle cx="20" cy="20" r="7.5" fill="#e11d48" />
    <path d="M20 13 Q26 17 22 22 Q17 25 15 19" fill="none" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" /><circle cx="20" cy="20" r="2.4" fill="#9f1239" />
  </svg>
) : (
  <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
    {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="20" cy="9.5" rx="5.6" ry="9.5" fill="#fff" stroke="#d1d5db" strokeWidth="1" transform={`rotate(${a} 20 20)`} />)}
    <circle cx="20" cy="20" r="4" fill="#fde047" />
  </svg>
));

// seven flowers, spread over the bushes (never more than two to a bush) and not too close to each other on a bush
const gardenSpots = () => {
  const order = [...BUSHES.keys()].sort(() => Math.random() - 0.5);
  const spots = [];
  for (let i = 0; i < FLOWERS; i++) {
    const b = order[i % order.length];
    let s = null;
    for (let tries = 0; tries < 60 && !s; tries++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      const c = { bush: b, dx: Math.cos(a) * r * BUSH_W * 0.36, dy: Math.sin(a) * r * BUSH_H * 0.28 };
      if (spots.every(p => p.bush !== b || Math.hypot(p.dx - c.dx, p.dy - c.dy) > 9)) s = c;
    }
    spots.push(s || { bush: b, dx: (i % 2 ? 1 : -1) * 6, dy: 0 });
  }
  return spots.sort(() => Math.random() - 0.5);
};
export const FlowerOfferingGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [flowers] = useState(() => gardenSpots().map((p, i) => ({ id: i, ...p, kind: BUSHES[p.bush].kind, thanks: FLOWER_THANKS[i % FLOWER_THANKS.length] })));
  const [state, setState] = useState(() => Array(FLOWERS).fill('waiting')); // waiting | visible | picked | missed
  const [won, setWon] = useState(() => Array(FLOWERS).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const offered = state.filter(v => v === 'picked').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    flowers.forEach((f) => {
      const start = FLOWER_FIRST_MS + f.id * FLOWER_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === f.id && v === 'waiting' ? 'visible' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === f.id && v === 'visible' ? 'missed' : v))), start + FLOWER_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [flowers]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'picked' || v === 'missed')) return undefined;
    const t = setTimeout(() => setFinished(true), 1100); // let the last flower reach the statue first
    return () => clearTimeout(t);
  }, [state, finished]);

  const pick = (id) => {
    if (state[id] !== 'visible') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'picked' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fde68a 0%,#fef3c7 38%,#bbf7d0 100%)' }}>
      <style>{`
        @keyframes flowerPop { 0% { transform: scale(0) rotate(-40deg) } 70% { transform: scale(1.25) rotate(8deg) } 100% { transform: scale(1) rotate(0) } }
        @keyframes flowerSway { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
        @keyframes sadhuRise { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes statueGlow { 0%,100% { filter: drop-shadow(0 0 0 rgba(253,224,71,0)) } 50% { filter: drop-shadow(0 0 14px rgba(253,224,71,.95)) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🌹 Pick the flowers for the Buddha</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the bushes */}
      {BUSHES.map((b, i) => (
        <svg key={i} viewBox="0 0 100 50" aria-hidden="true" className="absolute pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${BUSH_W}vmin`, height: `${BUSH_H}vmin`, transform: 'translate(-50%,-50%)' }}>
          <ellipse cx="50" cy="46" rx="46" ry="4" fill="#000" opacity=".12" />
          <g fill={BUSH_COLORS[b.kind][0]}><circle cx="50" cy="26" r="22" /><circle cx="24" cy="33" r="16" /><circle cx="76" cy="33" r="16" /><circle cx="37" cy="21" r="14" /><circle cx="63" cy="21" r="14" /><rect x="12" y="32" width="76" height="13" rx="6" /></g>
          <g fill={BUSH_COLORS[b.kind][1]} opacity=".6"><circle cx="40" cy="34" r="9" /><circle cx="62" cy="28" r="8" /><circle cx="22" cy="30" r="6" /><circle cx="78" cy="36" r="7" /></g>
        </svg>
      ))}
      {/* the altar and the Buddha statue */}
      <div className="absolute pointer-events-none" style={{ left: `${STATUE.x}%`, bottom: 0, width: '26vmin', transform: 'translateX(-50%)' }}>
        <svg viewBox="0 0 60 66" className="w-full block" aria-hidden="true">
          <g style={{ animation: offered > 0 ? 'statueGlow 1.6s ease-in-out infinite' : 'none' }}>
            <ellipse cx="30" cy="35" rx="18" ry="5" fill="#facc15" />
            <path d="M14 35 Q14 18 30 18 Q46 18 46 35 Z" fill="#fbbf24" />
            <circle cx="30" cy="10" r="8" fill="#fcd34d" />
            <path d="M22 4 Q30 -4 38 4" fill="none" stroke="#b45309" strokeWidth="1.4" /><circle cx="30" cy="-1" r="2" fill="#f59e0b" />
            <path d="M22 28 Q30 22 38 28" fill="none" stroke="#b45309" strokeWidth="1.4" />
          </g>
          <rect x="8" y="35" width="44" height="9" rx="2" fill="#a16207" /><rect x="13" y="44" width="34" height="22" fill="#854d0e" />
        </svg>
        <div className="absolute text-center leading-none" style={{ left: 0, right: 0, top: '58%', fontSize: 'clamp(14px, 3vmin, 24px)' }}>
          {Array.from({ length: offered }, (_, i) => <span key={i}>{i % 2 ? '🌹' : '🤍'}</span>)}
        </div>
      </div>
      {flowers.map((f, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'missed') return null;
        const picked = st === 'picked';
        const b = BUSHES[f.bush];
        return (
          <div key={f.id} className="absolute" style={{ left: picked ? `${STATUE.x}%` : `calc(${b.x}% + ${f.dx}vmin)`, top: picked ? `${STATUE.y}%` : `calc(${b.y}% + ${f.dy}vmin)`, transition: picked ? 'left .9s ease-in-out, top .9s ease-in, opacity .5s .7s, transform .9s' : 'none', opacity: picked ? 0 : 1, transform: picked ? 'scale(.5)' : 'none', zIndex: 5 }}>
            <button onClick={() => pick(f.id)} disabled={picked} aria-label="Pick the flower" className="block" style={{ width: FLOWER_SIZE, height: FLOWER_SIZE, marginLeft: `calc(${FLOWER_SIZE} / -2)`, marginTop: `calc(${FLOWER_SIZE} / -2)`, animation: picked ? 'none' : 'flowerPop .35s ease-out' }}>
              <span className="block w-full h-full" style={{ animation: picked ? 'none' : 'flowerSway 1.2s ease-in-out infinite' }}><GardenFlower kind={f.kind} /></span>
            </button>
            {picked && (
              <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-center whitespace-nowrap" style={{ top: `calc(${FLOWER_SIZE} / -2 - 3.2rem)`, animation: 'sadhuRise 1.8s ease-out forwards' }}>
                <div className="bg-white text-amber-900 font-bold text-sm rounded-full px-3 py-1 shadow">{f.thanks}</div>
                {won[i] > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won[i]} 🪙</div>}
              </div>
            )}
          </div>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{offered > 0 ? '🙏' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{offered > 0 ? `You offered ${offered} flower${offered === 1 ? '' : 's'} to the Buddha!` : 'Nice try!'}</h2>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the flower coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 3: keep the world clean. Bottles, cans and other litter fall through the park. Tap one to pick it up -- it jumps into the
// recycling bin and the student gets 2 or 3 coins. Seven pieces in all, same timing and coins as the birds; litter that is
// not picked up before it lands just rolls away (no coins).
const LITTER = 7;
const LITTER_FIRST_MS = 800;
const LITTER_EVERY_MS = 1500;
const LITTER_FALL_MS = 3200;
const LITTER_SIZE = 'clamp(48px, 10vmin, 84px)';
const LITTER_THANKS = ['Thank you!', 'So clean!', 'Great job!', 'The Earth says thanks!'];
const LITTER_ICONS = ['🍾', '🥫', '🥤', '🧃', '🛍️', '🍼', '🧴'];
const BIN = { x: 50, y: 84 }; // where picked litter goes (% of the screen)
const litterColumns = () => {
  const xs = [];
  while (xs.length < LITTER) {
    let x = 8 + Math.random() * 78;
    for (let tries = 0; tries < 20 && xs.length && Math.abs(x - xs[xs.length - 1]) < 24; tries++) x = 8 + Math.random() * 78;
    xs.push(x);
  }
  return xs;
};
// A piece that was just picked up: it starts where the student tapped it and jumps into the bin.
const PickedLitter = ({ it, from, won, stageRef }) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); return () => cancelAnimationFrame(r); }, []);
  const st = stageRef.current;
  const w = st ? st.clientWidth : 0, h = st ? st.clientHeight : 0;
  const start = from || { x: w * it.x / 100, y: h * 0.2 };
  return (
    <div className="absolute pointer-events-none" style={{ zIndex: 6, left: go ? w * BIN.x / 100 : start.x, top: go ? h * BIN.y / 100 : start.y, opacity: go ? 0 : 1, transform: go ? 'scale(.4)' : 'scale(1)', transition: 'left .8s ease-in-out, top .8s ease-in, opacity .4s .5s, transform .8s' }}>
      <span className="block select-none" style={{ fontSize: LITTER_SIZE, lineHeight: 1, transform: 'translate(-50%,-50%)' }}>{it.icon}</span>
      <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${LITTER_SIZE} / -2 - 3.2rem)`, animation: 'litterThanks 1.8s ease-out forwards' }}>
        <div className="bg-white text-emerald-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.thanks}</div>
        {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
      </div>
    </div>
  );
};
export const LitterPickingGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const icons = [...LITTER_ICONS].sort(() => Math.random() - 0.5);
    return litterColumns().map((x, i) => ({ id: i, x, icon: icons[i % icons.length], spin: (i % 2 ? 1 : -1) * (160 + Math.random() * 200), thanks: LITTER_THANKS[i % LITTER_THANKS.length] }));
  });
  const [state, setState] = useState(() => Array(LITTER).fill('waiting')); // waiting | falling | picked | missed
  const [won, setWon] = useState(() => Array(LITTER).fill(0));
  const [from, setFrom] = useState(() => Array(LITTER).fill(null));        // px position where a piece was picked up
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const cleaned = state.filter(v => v === 'picked').length;
  const soundRef = useRef(null);
  const stageRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = LITTER_FIRST_MS + it.id * LITTER_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'falling' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'falling' ? 'missed' : v))), start + LITTER_FALL_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'picked' || v === 'missed')) return undefined;
    const t = setTimeout(() => setFinished(true), 1000); // let the last piece reach the bin first
    return () => clearTimeout(t);
  }, [state, finished]);

  const pickUp = (id) => {
    if (state[id] !== 'falling') return;
    // remember where the piece is right now so it can jump from there into the bin
    try {
      const a = itemRefs.current[id].getBoundingClientRect(), s = stageRef.current.getBoundingClientRect();
      setFrom(f => f.map((v, i) => (i === id ? { x: a.left - s.left + a.width / 2, y: a.top - s.top + a.height / 2 } : v)));
    } catch (e) { /* the piece then simply starts from the top */ }
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'picked' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div ref={stageRef} className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#7dd3fc 0%,#e0f2fe 52%,#86efac 52%,#4ade80 100%)' }}>
      <style>{`
        @keyframes litterFall { 0% { top: -14%; } 100% { top: 80%; } }
        @keyframes litterTumble { 0% { transform: rotate(0) } 100% { transform: rotate(var(--spin)) } }
        @keyframes litterThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes binBounce { 0%,100% { transform: scale(1) } 40% { transform: scale(1.12) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">♻️ Keep the world clean! Pick up the litter</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the park: sun, hills and a few trees */}
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-x-0 pointer-events-none" style={{ top: '30%', height: '24%', width: '100%' }} aria-hidden="true">
        <path d="M0 60 L0 34 Q18 8 36 30 Q56 2 76 28 Q90 14 100 26 L100 60 Z" fill="#22c55e" opacity=".55" />
      </svg>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '12%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '6%', top: '40%', fontSize: 'clamp(36px, 8vmin, 70px)' }}>🌳</div>
      <div className="absolute pointer-events-none" style={{ right: '5%', top: '42%', fontSize: 'clamp(32px, 7vmin, 62px)' }}>🌳</div>
      {/* the recycling bin */}
      <div className="absolute pointer-events-none" style={{ left: `${BIN.x}%`, bottom: '2%', width: 'clamp(70px, 16vmin, 130px)', transform: 'translateX(-50%)' }}>
        <svg viewBox="0 0 60 70" className="w-full block" aria-hidden="true" key={cleaned} style={{ animation: cleaned > 0 ? 'binBounce .4s ease-out' : 'none' }}>
          <rect x="6" y="14" width="48" height="8" rx="3" fill="#15803d" />
          <rect x="24" y="9" width="12" height="6" rx="2" fill="#166534" />
          <path d="M10 22 L14 66 Q14 68 17 68 L43 68 Q46 68 46 66 L50 22 Z" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
          <text x="30" y="52" textAnchor="middle" fontSize="22" fill="#f0fdf4">♻</text>
        </svg>
        {cleaned > 0 && <div className="absolute -top-2 -right-2 bg-white text-emerald-700 font-black text-sm rounded-full w-7 h-7 flex items-center justify-center shadow">{cleaned}</div>}
      </div>
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'missed') return null;
        if (st === 'picked') return <PickedLitter key={it.id} it={it} from={from[i]} won={won[i]} stageRef={stageRef} />;
        return (
          <div key={it.id} ref={el => { itemRefs.current[it.id] = el; }} className="absolute" style={{ left: `${it.x}%`, top: '-14%', animation: `litterFall ${LITTER_FALL_MS}ms linear forwards`, zIndex: 5 }}>
            <button onClick={() => pickUp(it.id)} aria-label="Pick up the litter" className="block" style={{ width: LITTER_SIZE, height: LITTER_SIZE, marginLeft: `calc(${LITTER_SIZE} / -2)`, marginTop: `calc(${LITTER_SIZE} / -2)` }}>
              <span className="block select-none text-center" style={{ fontSize: LITTER_SIZE, lineHeight: 1, '--spin': `${it.spin}deg`, animation: `litterTumble ${LITTER_FALL_MS}ms linear forwards` }}>{it.icon}</span>
            </button>
          </div>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{cleaned > 0 ? '🌍' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{cleaned > 0 ? `You picked up ${cleaned} piece${cleaned === 1 ? '' : 's'} of litter!` : 'Nice try!'}</h2>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the clean-up coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 4: protect the animals (compassion). Arrows, spears and knives drift slowly towards a little group of animals. Tap one to
// break it before it arrives -- the student gets 2 or 3 coins. One that is not stopped only frightens the animals ("Ouch!"):
// nothing is shown that is cruel, and there are no coins for it. Seven in all, same timing and coins as the birds.
const THREATS = 7;
const THREAT_FIRST_MS = 800;
const THREAT_EVERY_MS = 1500;
const THREAT_TRAVEL_MS = 3600;                 // how long one takes to arrive: slow enough to catch
const THREAT_SIZE = 'clamp(54px, 11vmin, 92px)';
const ANIMAL_SIZE = 'clamp(46px, 10vmin, 84px)';
const ANIMALS = [{ e: '🐰', x: 36, y: 74 }, { e: '🦌', x: 50, y: 70 }, { e: '🐑', x: 64, y: 74 }, { e: '🐥', x: 43, y: 84 }, { e: '🐿️', x: 57, y: 84 }];
const THREAT_KINDS = ['arrow', 'spear', 'knife'];
const THREAT_THANKS = ['Saved them!', 'Well done!', 'So kind!', 'The animals are safe!'];

// the three drawn pointing to the right; the game turns them to face the animals
const ThreatPicture = ({ kind }) => (
  <svg viewBox="0 0 100 40" width="100%" height="100%" aria-hidden="true">
    {kind === 'arrow' && (<g>
      <line x1="8" y1="20" x2="82" y2="20" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
      <path d="M96 20 L78 9 L78 31 Z" fill="#78909c" stroke="#455a64" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 20 L20 8 L26 8 L18 20 L26 32 L20 32 Z" fill="#ef5350" stroke="#b71c1c" strokeWidth="1.5" strokeLinejoin="round" />
    </g>)}
    {kind === 'spear' && (<g>
      <line x1="4" y1="20" x2="78" y2="20" stroke="#6d4c41" strokeWidth="6" strokeLinecap="round" />
      <path d="M98 20 L70 8 Q74 20 70 32 Z" fill="#b0bec5" stroke="#455a64" strokeWidth="2" strokeLinejoin="round" />
      <rect x="60" y="15" width="8" height="10" rx="2" fill="#fbc02d" stroke="#f57f17" strokeWidth="1.5" />
    </g>)}
    {kind === 'knife' && (<g>
      <rect x="4" y="14" width="30" height="12" rx="5" fill="#6d4c41" stroke="#3e2723" strokeWidth="2" />
      <rect x="32" y="9" width="6" height="22" rx="2" fill="#fbc02d" stroke="#f57f17" strokeWidth="1.5" />
      <path d="M38 12 L90 20 L38 28 Z" fill="#cfd8dc" stroke="#546e7a" strokeWidth="2" strokeLinejoin="round" />
    </g>)}
  </svg>
);

// where each threat starts: a random place on the left, right or top edge, aiming at the group of animals
const threatRoutes = () => {
  const kinds = Array.from({ length: THREATS }, (_, i) => THREAT_KINDS[i % THREAT_KINDS.length]).sort(() => Math.random() - 0.5);
  let lastSide = '';
  return kinds.map((kind, id) => {
    let side = ['left', 'right', 'top'][Math.floor(Math.random() * 3)];
    if (side === lastSide) side = ['left', 'right', 'top'].find(s => s !== side && Math.random() < 0.6) || 'top';
    lastSide = side;
    const from = side === 'left' ? { x: -10, y: 12 + Math.random() * 40 } : side === 'right' ? { x: 110, y: 12 + Math.random() * 40 } : { x: 14 + Math.random() * 72, y: -12 };
    const to = { x: 42 + Math.random() * 16, y: 68 + Math.random() * 8 };
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;   // (screen proportions are close enough for the picture)
    return { id, kind, from, to, angle, thanks: THREAT_THANKS[id % THREAT_THANKS.length] };
  });
};

// one threat on its way: it starts at its edge and, one frame later, is set moving to the animals
const FlyingThreat = ({ t, onTap, btnRef }) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); return () => cancelAnimationFrame(r); }, []);
  return (
    <div className="absolute" style={{ zIndex: 5, left: `${go ? t.to.x : t.from.x}%`, top: `${go ? t.to.y : t.from.y}%`, transition: go ? `left ${THREAT_TRAVEL_MS}ms linear, top ${THREAT_TRAVEL_MS}ms linear` : 'none' }}>
      <button ref={btnRef} onClick={onTap} aria-label="Break it to protect the animals" className="block" style={{ width: THREAT_SIZE, height: THREAT_SIZE, marginLeft: `calc(${THREAT_SIZE} / -2)`, marginTop: `calc(${THREAT_SIZE} / -2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="block" style={{ width: '100%', height: '60%', transform: `rotate(${t.angle}deg)` }}><ThreatPicture kind={t.kind} /></span>
      </button>
    </div>
  );
};

export const AnimalRescueGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [threats] = useState(threatRoutes);
  const [state, setState] = useState(() => Array(THREATS).fill('waiting')); // waiting | coming | saved | hit
  const [won, setWon] = useState(() => Array(THREATS).fill(0));
  const [bursts, setBursts] = useState([]);                                  // where a threat was broken: { id, x, y, text, coins }
  const [scare, setScare] = useState(0);                                     // counts up each time the animals are frightened
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const saved = state.filter(v => v === 'saved').length;
  const hits = state.filter(v => v === 'hit').length;
  const soundRef = useRef(null);
  const stageRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const timers = [];
    threats.forEach((t) => {
      const start = THREAT_FIRST_MS + t.id * THREAT_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === t.id && v === 'waiting' ? 'coming' : v))), start));
      timers.push(setTimeout(() => {
        setState(st => { if (st[t.id] !== 'coming') return st; setScare(n => n + 1); return st.map((v, i) => (i === t.id ? 'hit' : v)); });
      }, start + THREAT_TRAVEL_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [threats]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'saved' || v === 'hit')) return undefined;
    const t = setTimeout(() => setFinished(true), 900);
    return () => clearTimeout(t);
  }, [state, finished]);

  const breakIt = (id) => {
    if (state[id] !== 'coming') return;
    let at = null;
    try {
      const a = itemRefs.current[id].getBoundingClientRect(), s = stageRef.current.getBoundingClientRect();
      at = { x: a.left - s.left + a.width / 2, y: a.top - s.top + a.height / 2 };
    } catch (e) { /* the burst then appears near the animals */ }
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'saved' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    setBursts(b => [...b, { id, x: at ? at.x : 0, y: at ? at.y : 0, pct: !at, thanks: threats[id].thanks, coins }]);
    playCoinSound(soundRef);
  };

  return (
    <div ref={stageRef} className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 45%,#bbf7d0 45%,#4ade80 100%)' }}>
      <style>{`
        @keyframes animalShake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-7px) } 40% { transform: translateX(7px) } 60% { transform: translateX(-5px) } 80% { transform: translateX(5px) } }
        @keyframes animalHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes burstRise { 0% { transform: translateY(0) scale(.6); opacity: 0 } 15% { opacity: 1; transform: translateY(-6px) scale(1.1) } 100% { transform: translateY(-50px) scale(1); opacity: 0 } }
        @keyframes sparkle { 0% { transform: scale(.3) rotate(0); opacity: 1 } 100% { transform: scale(1.8) rotate(90deg); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🐰 Protect the animals! Tap what comes</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the meadow */}
      <div className="absolute pointer-events-none" style={{ left: '4%', top: '34%', fontSize: 'clamp(40px, 9vmin, 76px)' }}>🌳</div>
      <div className="absolute pointer-events-none" style={{ right: '4%', top: '36%', fontSize: 'clamp(36px, 8vmin, 68px)' }}>🌳</div>
      <div className="absolute pointer-events-none" style={{ right: '10%', top: '12%', fontSize: 'clamp(36px, 8vmin, 70px)' }}>☀️</div>
      {/* the animals */}
      {ANIMALS.map((a, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%,-50%)', fontSize: ANIMAL_SIZE, lineHeight: 1, zIndex: 3 }}>
          <span key={scare} className="block" style={{ animation: scare > 0 ? 'animalShake .6s ease-in-out' : `animalHappy ${1.6 + i * 0.2}s ease-in-out infinite` }}>{a.e}</span>
        </div>
      ))}
      {scare > 0 && <div key={'o' + scare} className="absolute pointer-events-none text-center" style={{ left: '50%', top: '57%', transform: 'translateX(-50%)', zIndex: 4, animation: 'burstRise 1.4s ease-out forwards' }}><div className="bg-white text-rose-700 font-bold text-sm rounded-full px-3 py-1 shadow">😢 Ouch! Be careful!</div></div>}
      {threats.map((t, i) => state[i] === 'coming' ? (
        <FlyingThreat key={t.id} t={t} onTap={() => breakIt(t.id)} btnRef={el => { itemRefs.current[t.id] = el; }} />
      ) : null)}
      {bursts.map(b => (
        <div key={b.id} className="absolute pointer-events-none text-center" style={{ zIndex: 6, left: b.pct ? '50%' : b.x, top: b.pct ? '60%' : b.y }}>
          <span className="block" style={{ fontSize: 'clamp(40px, 9vmin, 72px)', lineHeight: 1, transform: 'translate(-50%,-50%)', animation: 'sparkle .8s ease-out forwards' }}>✨</span>
          <div className="absolute left-0 whitespace-nowrap" style={{ top: '-3.6rem', transform: 'translateX(-50%)', animation: 'burstRise 1.8s ease-out forwards' }}>
            <div className="bg-white text-emerald-900 font-bold text-sm rounded-full px-3 py-1 shadow">{b.thanks}</div>
            {b.coins > 0 && <div className="font-black text-yellow-600 drop-shadow">+{b.coins} 🪙</div>}
          </div>
        </div>
      ))}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{saved > 0 ? '🐰💚' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{saved > 0 ? `You protected the animals ${saved} time${saved === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-500 mb-2">{hits > 0 ? 'Some of them got a fright. Next time, be quick!' : 'Not one of them got frightened. Wonderful!'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 5: the honest woodcutter (contentment). Each round an iron, a gold and a silver axe fall from the sky. Only the plain iron
// axe is the right one: tap it for 2 or 3 coins and the next round comes. Tap the gold or silver one (greed) and every axe
// vanishes -- the game ends with the coins won so far. Seven rounds; pick the iron axe all seven times and the river spirit
// gives all three axes (the story's ending) plus a bonus of 5 coins. Coins never go past the lesson's limit.
const AXE_ROUNDS = 7;
const AXE_FIRST_MS = 800;
const AXE_FALL_MS = 3800;
const AXE_NEXT_MS = 900;
const AXE_BONUS = 5;
const AXE_SIZE = 'clamp(60px, 13vmin, 104px)';
const AXE_COLORS = { iron: ['#6b7280', '#374151'], gold: ['#facc15', '#a16207'], silver: ['#f1f5f9', '#64748b'] };
const AXE_THANKS = ['Content with iron!', 'Honest and happy!', 'Well chosen!', 'Simple is enough!'];
const AxeIcon = ({ kind, size = AXE_SIZE }) => {
  const [fill, edge] = AXE_COLORS[kind];
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" style={{ width: size, height: size, display: 'block', filter: kind === 'iron' ? 'none' : 'drop-shadow(0 0 5px rgba(255,255,255,.9))' }}>
      <rect x="22" y="8" width="5" height="36" rx="2" fill="#92400e" stroke="#78350f" strokeWidth="1.2" transform="rotate(-28 24 26)" />
      <path d="M8 8 Q20 3 30 12 L33 21 Q22 24 12 20 Z" fill={fill} stroke={edge} strokeWidth="1.6" strokeLinejoin="round" transform="translate(-1 -1)" />
      {kind !== 'iron' && <path d="M13 11 Q19 8 25 12" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".9" />}
    </svg>
  );
};
const AXE_KINDS = ['iron', 'gold', 'silver'];
const axeRound = () => {
  const kinds = [...AXE_KINDS].sort(() => Math.random() - 0.5);
  const xs = [20, 50, 80].map(x => x + (Math.random() - 0.5) * 8);
  return kinds.map((kind, i) => ({ kind, x: xs[i] }));
};
// The iron axe that was just chosen: it starts where it was tapped and flies up to the row of axes already collected.
const ChosenAxe = ({ from, thanks, won, target, stageRef }) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true))); return () => cancelAnimationFrame(r); }, []);
  const st = stageRef.current;
  const w = st ? st.clientWidth : 0, h = st ? st.clientHeight : 0;
  return (
    <div className="absolute pointer-events-none" style={{ zIndex: 6, left: go ? w * target.x / 100 : from.x, top: go ? h * target.y / 100 : from.y, opacity: go ? 0 : 1, transform: `translate(-50%,-50%) scale(${go ? 0.4 : 1})`, transition: 'left .9s ease-in-out, top .9s ease-in-out, opacity .4s .6s, transform .9s' }}>
      <AxeIcon kind="iron" />
      <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${AXE_SIZE} * -0.5 - 3rem)`, animation: 'axeThanks 1.8s ease-out forwards' }}>
        <div className="bg-white text-emerald-900 font-bold text-sm rounded-full px-3 py-1 shadow">{thanks}</div>
        {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
      </div>
    </div>
  );
};
export const WoodcutterAxeGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(() => Array.from({ length: AXE_ROUNDS }, axeRound));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState('waiting');   // waiting | falling | picked | missed | greed
  const [picks, setPicks] = useState(0);
  const [won, setWon] = useState(0);
  const [from, setFrom] = useState(null);          // px position where the iron axe was tapped
  const [thanks, setThanks] = useState('');
  const [lastWon, setLastWon] = useState(0);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const soundRef = useRef(null);
  const stageRef = useRef(null);
  const axeRefs = useRef([]);

  // each round: a short pause, then the three axes fall; if none is taken they land in the river and the next round follows
  useEffect(() => {
    setPhase('waiting');
    const t = setTimeout(() => setPhase('falling'), round === 0 ? AXE_FIRST_MS : 300);
    return () => clearTimeout(t);
  }, [round]);
  useEffect(() => {
    if (phase !== 'falling') return undefined;
    const t = setTimeout(() => setPhase(p => (p === 'falling' ? 'missed' : p)), AXE_FALL_MS + 100);
    return () => clearTimeout(t);
  }, [phase, round]);
  useEffect(() => {
    if (phase === 'picked' || phase === 'missed') {
      const t = setTimeout(() => { if (round + 1 < AXE_ROUNDS) setRound(r => r + 1); else setFinished(true); }, phase === 'picked' ? AXE_NEXT_MS + 400 : AXE_NEXT_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'greed') {
      const t = setTimeout(() => setFinished(true), 2200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, round]);

  const allSeven = picks === AXE_ROUNDS;
  const bonus = allSeven ? Math.max(0, Math.min(AXE_BONUS, coinsLeft - won)) : 0;
  const total = won + bonus;

  const take = (i) => {
    if (phase !== 'falling') return;
    const kind = rounds[round][i].kind;
    if (kind !== 'iron') { setPhase('greed'); return; }
    try {
      const a = axeRefs.current[i].getBoundingClientRect(), s = stageRef.current.getBoundingClientRect();
      setFrom({ x: a.left - s.left + a.width / 2, y: a.top - s.top + a.height / 2 });
    } catch (e) { setFrom({ x: 100, y: 100 }); }
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - won)); // 2 or 3, never past the lesson's limit
    setWon(w => w + coins);
    setLastWon(coins);
    setPicks(p => p + 1);
    setThanks(AXE_THANKS[round % AXE_THANKS.length]);
    setPhase('picked');
    playCoinSound(soundRef);
  };

  const TARGET = { x: 50, y: 15 };
  return (
    <div ref={stageRef} className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 55%,#86efac 55%,#4ade80 80%)' }}>
      <style>{`
        @keyframes axeFall { 0% { top: -16%; } 100% { top: 76%; } }
        @keyframes axeSpin { 0% { transform: rotate(-12deg) } 50% { transform: rotate(12deg) } 100% { transform: rotate(-12deg) } }
        @keyframes axeThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes axePoof { 0% { transform: scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: scale(1.6); opacity: 0 } }
        @keyframes riverWave { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-3%) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🪓 Take only the plain iron axe</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the axes taken so far */}
      <div className="absolute inset-x-0 flex justify-center gap-1 pointer-events-none" style={{ top: '9%', zIndex: 4 }} aria-label={`${picks} of ${AXE_ROUNDS} iron axes`}>
        {Array.from({ length: AXE_ROUNDS }, (_, i) => (
          <div key={i} className="rounded-full bg-white/60 flex items-center justify-center" style={{ width: 'clamp(28px, 6vmin, 44px)', height: 'clamp(28px, 6vmin, 44px)', opacity: i < picks ? 1 : 0.4 }}>
            <AxeIcon kind="iron" size="80%" />
          </div>
        ))}
      </div>
      {/* the woodland and the river */}
      <div className="absolute pointer-events-none" style={{ right: '7%', top: '8%', fontSize: 'clamp(36px, 8vmin, 70px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '4%', top: '38%', fontSize: 'clamp(40px, 9vmin, 76px)' }}>🌲</div>
      <div className="absolute pointer-events-none" style={{ right: '4%', top: '40%', fontSize: 'clamp(36px, 8vmin, 70px)' }}>🌲</div>
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '20%', background: 'linear-gradient(180deg,#38bdf8,#0284c7)', zIndex: 1 }}>
        <div style={{ height: 10, margin: '6px -3% 0', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 24px,transparent 24px 48px)', borderRadius: 6, animation: 'riverWave 4s ease-in-out infinite' }} />
      </div>
      {phase === 'falling' && rounds[round].map((ax, i) => (
        <div key={`${round}-${i}`} ref={el => { axeRefs.current[i] = el; }} className="absolute" style={{ left: `${ax.x}%`, top: '-16%', animation: `axeFall ${AXE_FALL_MS}ms linear forwards`, zIndex: 5 }}>
          <button onClick={() => take(i)} aria-label={`${ax.kind} axe`} className="block" style={{ width: AXE_SIZE, height: AXE_SIZE, marginLeft: `calc(${AXE_SIZE} / -2)`, marginTop: `calc(${AXE_SIZE} / -2)` }}>
            <div style={{ animation: 'axeSpin 1.2s ease-in-out infinite' }}><AxeIcon kind={ax.kind} /></div>
          </button>
        </div>
      ))}
      {phase === 'picked' && from && <ChosenAxe key={round} from={from} thanks={thanks} won={lastWon} target={TARGET} stageRef={stageRef} />}
      {phase === 'greed' && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
          <div className="text-center" style={{ animation: 'axeThanks 2.2s ease-out forwards' }}>
            <div style={{ fontSize: 'clamp(50px, 14vmin, 110px)', animation: 'axePoof 1.4s ease-out forwards' }}>💨</div>
            <div className="bg-white text-red-700 font-extrabold rounded-2xl px-4 py-2 shadow-lg">Oh no! Wanting more made every axe vanish!</div>
          </div>
        </div>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            {allSeven ? (
              <>
                <div className="flex justify-center gap-1 mb-2">{AXE_KINDS.map(k => <AxeIcon key={k} kind={k} size="clamp(48px, 12vmin, 72px)" />)}</div>
                <h2 className="text-2xl font-extrabold mb-1">The river spirit gives you all three axes!</h2>
                <p className="text-sm text-gray-600 mb-2">You were content with the iron axe seven times.</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-2">{phase === 'greed' ? '💨' : '🪓'}</div>
                <h2 className="text-2xl font-extrabold mb-1">{picks > 0 ? `You took ${picks} iron axe${picks === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
                <p className="text-sm text-gray-600 mb-2">{phase === 'greed' ? 'Wanting the gold and silver made the axes vanish.' : 'Be happy with what you need.'}</p>
              </>
            )}
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 6: the diligent ant (effort). While the other little creatures play, the ant gathers food. Food appears on the ground; tap
// it and the ant runs to it and carries it home to the nest -- 2 or 3 coins. Food not gathered in time is simply left (no coins).
// Seven pieces in all, same timing and coins as the birds.
const ANT_FOODS = 7;
const ANT_FIRST_MS = 800;
const ANT_EVERY_MS = 1500;
const ANT_VISIBLE_MS = 3400;
const ANT_FOOD_SIZE = 'clamp(44px, 9vmin, 76px)';
const ANT_ICONS = ['🍞', '🍎', '🍇', '🌽', '🍯', '🍉', '🥕'];
const ANT_THANKS = ['Hard worker!', 'Busy ant!', 'Food for everyone!', 'Well done, little ant!'];
const NEST = { x: 10, y: 78 };
const antSpots = () => {
  const out = [];
  for (let i = 0; i < ANT_FOODS; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 24 + Math.random() * 64, y: 58 + Math.random() * 26 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 18)) { p = c; break; }
    }
    out.push(p || { x: 24 + Math.random() * 64, y: 58 + Math.random() * 26 });
  }
  return out;
};
const PLAYMATES = [
  { e: '🦗', x: 30, y: 36, anim: 'antHop 1.1s ease-in-out infinite' },
  { e: '🦋', x: 62, y: 24, anim: 'antFlutter 3.2s ease-in-out infinite' },
  { e: '🐞', x: 80, y: 42, anim: 'antHop 1.6s ease-in-out .3s infinite' },
  { e: '🐛', x: 46, y: 46, anim: 'antWiggle 1.4s ease-in-out infinite' },
];
// A piece of food that was just gathered: it rides to the nest and fades.
const CarriedFood = ({ it, won }) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 750); return () => clearTimeout(t); }, []);
  return (
    <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${go ? NEST.x : it.x}%`, top: `${go ? NEST.y : it.y}%`, opacity: go ? 0 : 1, transform: `translate(-50%,-50%) scale(${go ? 0.5 : 1})`, transition: 'left .8s ease-in-out, top .8s ease-in-out, opacity .4s .5s, transform .8s' }}>
      <span className="block select-none" style={{ fontSize: ANT_FOOD_SIZE, lineHeight: 1 }}>{it.icon}</span>
      <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${ANT_FOOD_SIZE} / -2 - 3.2rem)`, animation: 'antThanks 1.8s ease-out forwards' }}>
        <div className="bg-white text-emerald-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.thanks}</div>
        {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
      </div>
    </div>
  );
};
export const AntGatheringGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const icons = [...ANT_ICONS].sort(() => Math.random() - 0.5);
    return antSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, icon: icons[i % icons.length], thanks: ANT_THANKS[i % ANT_THANKS.length] }));
  });
  const [state, setState] = useState(() => Array(ANT_FOODS).fill('waiting')); // waiting | shown | gathered | missed
  const [won, setWon] = useState(() => Array(ANT_FOODS).fill(0));
  const [ant, setAnt] = useState({ ...NEST, flip: false });
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const gathered = state.filter(v => v === 'gathered').length;
  const soundRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = ANT_FIRST_MS + it.id * ANT_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'shown' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'shown' ? 'missed' : v))), start + ANT_VISIBLE_MS));
    });
    timersRef.current = timers;
    return () => { timers.forEach(clearTimeout); timersRef.current.forEach(clearTimeout); };
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'gathered' || v === 'missed')) return undefined;
    const t = setTimeout(() => setFinished(true), 1500); // let the ant bring the last piece home
    return () => clearTimeout(t);
  }, [state, finished]);

  const gather = (id) => {
    if (state[id] !== 'shown') return;
    const it = items[id];
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'gathered' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
    setAnt(a => ({ x: it.x, y: it.y, flip: it.x < a.x }));              // run to the food ...
    timersRef.current.push(setTimeout(() => setAnt({ ...NEST, flip: true }), 750)); // ... and carry it home
    timersRef.current.push(setTimeout(() => setAnt(a => ({ ...a, flip: false })), 1600));
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 40%,#bbf7d0 40%,#86efac 70%,#a16207 100%)' }}>
      <style>{`
        @keyframes antHop { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
        @keyframes antFlutter { 0%,100% { transform: translate(0,0) } 33% { transform: translate(24px,-12px) } 66% { transform: translate(-18px,10px) } }
        @keyframes antWiggle { 0%,100% { transform: rotate(-8deg) } 50% { transform: rotate(8deg) } }
        @keyframes antPop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes antThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes antLegs { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🐜 Help the ant gather food</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '6%', top: '22%', fontSize: 'clamp(36px, 8vmin, 70px)' }}>🌳</div>
      {/* the others are playing */}
      {PLAYMATES.map((p, i) => (
        <div key={i} className="absolute pointer-events-none select-none" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: 'clamp(28px, 6vmin, 52px)', lineHeight: 1, animation: p.anim, zIndex: 2 }}>{p.e}</div>
      ))}
      {/* the nest: a little mound, with a counter */}
      <div className="absolute pointer-events-none" style={{ left: `${NEST.x}%`, top: `${NEST.y + 4}%`, transform: 'translate(-50%,-50%)', zIndex: 3 }}>
        <div style={{ width: 'clamp(70px, 16vmin, 130px)', height: 'clamp(38px, 8vmin, 66px)', borderRadius: '50% 50% 8% 8%', background: 'radial-gradient(circle at 50% 70%,#451a03 0 16%,#a16207 17%)' }} />
        {gathered > 0 && <div className="absolute -top-3 -right-2 bg-white text-emerald-700 font-black text-sm rounded-full w-7 h-7 flex items-center justify-center shadow">{gathered}</div>}
      </div>
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'missed') return null;
        if (st === 'gathered') return <CarriedFood key={it.id} it={it} won={won[i]} />;
        return (
          <button key={it.id} onClick={() => gather(it.id)} aria-label="Gather the food" className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: ANT_FOOD_SIZE, height: ANT_FOOD_SIZE, transform: 'translate(-50%,-50%)', animation: 'antPop .35s ease-out', zIndex: 5 }}>
            <span className="block select-none" style={{ fontSize: ANT_FOOD_SIZE, lineHeight: 1 }}>{it.icon}</span>
          </button>
        );
      })}
      {/* the ant */}
      <div className="absolute pointer-events-none" style={{ left: `${ant.x}%`, top: `${ant.y}%`, zIndex: 7, transition: 'left .7s ease-in-out, top .7s ease-in-out', transform: 'translate(-50%,-50%)' }}>
        <span className="block select-none" style={{ fontSize: 'clamp(34px, 7vmin, 60px)', lineHeight: 1, transform: ant.flip ? 'scaleX(-1)' : 'none', animation: 'antLegs .3s linear infinite' }}>🐜</span>
      </div>
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{gathered > 0 ? '🐜' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{gathered > 0 ? `The ant gathered ${gathered} piece${gathered === 1 ? '' : 's'} of food!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{gathered > 0 ? 'A little effort every day fills the nest.' : 'Be quick, the ant is waiting.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 7: give the thirsty animals water (kindness). Birds, deer and other animals appear on the dry ground with a little water
// drop over their heads. Tap one: the water pours down, it drinks and is happy -- 2 or 3 coins. One that is not given water in
// time just wanders off (no coins). Seven animals in all, same timing and coins as the birds.
const THIRSTY = 7;
const THIRSTY_FIRST_MS = 800;
const THIRSTY_EVERY_MS = 1500;
const THIRSTY_VISIBLE_MS = 3400;
const THIRSTY_SIZE = 'clamp(54px, 11vmin, 92px)';
const THIRSTY_ANIMALS = ['🐦', '🦌', '🐇', '🐿️', '🦜', '🐑', '🐘', '🦆', '🐕'];
const THIRSTY_THANKS = ['Ahh, so refreshing!', 'Thank you, kind friend!', 'Glug glug, thank you!', 'Now I feel better!'];
const thirstySpots = () => {
  const out = [];
  for (let i = 0; i < THIRSTY; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 12 + Math.random() * 76, y: 40 + Math.random() * 42 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 20)) { p = c; break; }
    }
    out.push(p || { x: 12 + Math.random() * 76, y: 40 + Math.random() * 42 });
  }
  return out;
};
// An animal that was just given water: a splash of drops falls on it, then it hops happily and the thanks appears.
const DrinkingAnimal = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <span className="block select-none" style={{ fontSize: THIRSTY_SIZE, lineHeight: 1, animation: 'thirstHappy .6s ease-in-out .5s 3' }}>{it.icon}</span>
    <div className="absolute left-1/2 -translate-x-1/2 select-none" style={{ top: `calc(${THIRSTY_SIZE} * -0.9)`, fontSize: 'clamp(26px, 5vmin, 44px)', animation: 'thirstPour 1s ease-in forwards' }}>💦</div>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${THIRSTY_SIZE} / -2 - 3.4rem)`, animation: 'thirstThanks 2.2s ease-out forwards' }}>
      <div className="bg-white text-sky-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.thanks}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const WaterAnimalsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const icons = [...THIRSTY_ANIMALS].sort(() => Math.random() - 0.5);
    return thirstySpots().map((p, i) => ({ id: i, x: p.x, y: p.y, icon: icons[i % icons.length], thanks: THIRSTY_THANKS[i % THIRSTY_THANKS.length] }));
  });
  const [state, setState] = useState(() => Array(THIRSTY).fill('waiting')); // waiting | thirsty | watered | gone
  const [won, setWon] = useState(() => Array(THIRSTY).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const watered = state.filter(v => v === 'watered').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = THIRSTY_FIRST_MS + it.id * THIRSTY_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'thirsty' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'thirsty' ? 'gone' : v))), start + THIRSTY_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'watered' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last animal finish drinking
    return () => clearTimeout(t);
  }, [state, finished]);

  const giveWater = (id) => {
    if (state[id] !== 'thirsty') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'watered' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fde68a 0%,#fef3c7 35%,#fcd34d 35%,#d6a85a 100%)' }}>
      <style>{`
        @keyframes thirstPop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes thirstDrop { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-6px) } }
        @keyframes thirstPour { 0% { transform: translate(-50%,-30px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-50%,24px) scale(1.2); opacity: 0 } }
        @keyframes thirstHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-16px) } }
        @keyframes thirstThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-sky-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">💧 Give the thirsty animals water</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '5%', top: '24%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🌵</div>
      <div className="absolute pointer-events-none" style={{ right: '4%', top: '90%', fontSize: 'clamp(28px, 6vmin, 50px)' }}>🪨</div>
      {/* the water jug, with a counter */}
      <div className="absolute pointer-events-none" style={{ left: '6%', bottom: '3%', fontSize: 'clamp(40px, 9vmin, 76px)', lineHeight: 1 }}>🏺
        {watered > 0 && <span className="absolute -top-2 -right-3 bg-white text-sky-700 font-black text-sm rounded-full w-7 h-7 flex items-center justify-center shadow">{watered}</span>}
      </div>
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'watered') return <DrinkingAnimal key={it.id} it={it} won={won[i]} />;
        return (
          <button key={it.id} onClick={() => giveWater(it.id)} aria-label="Give water to the animal" className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: THIRSTY_SIZE, height: THIRSTY_SIZE, transform: 'translate(-50%,-50%)', animation: 'thirstPop .35s ease-out', zIndex: 5 }}>
            <span className="block select-none" style={{ fontSize: THIRSTY_SIZE, lineHeight: 1 }}>{it.icon}</span>
            <span className="absolute left-1/2 select-none" style={{ top: '-30%', fontSize: 'clamp(22px, 4.5vmin, 38px)', animation: 'thirstDrop 1s ease-in-out infinite' }}>💧</span>
          </button>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{watered > 0 ? '💧' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{watered > 0 ? `You gave water to ${watered} animal${watered === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{watered > 0 ? 'A kind heart helps every living being.' : 'Be quick, they are thirsty.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 8: help a friend up (helping others). Boys and girls play in the park and one by one a friend trips and falls. Tap the
// friend to help them up: a helping hand reaches out, they stand and smile -- 2 or 3 coins. A friend who is not helped in time
// gets up alone and walks off (no coins). Seven friends in all, same timing and coins as the birds.
const FRIENDS = 7;
const FRIEND_FIRST_MS = 800;
const FRIEND_EVERY_MS = 1500;
const FRIEND_VISIBLE_MS = 3400;
const FRIEND_SIZE = 'clamp(54px, 11vmin, 92px)';
const FRIEND_KIDS = ['👦', '👧', '👦🏽', '👧🏽', '👦🏻', '👧🏻', '🧒', '🧒🏽'];
const FRIEND_THANKS = ['Thank you, friend!', 'You are so kind!', 'Thanks for helping me!', "I'm okay now!"];
const FRIEND_TRIPPED_ON = ['🍌', '🪨', '🧱'];
const friendSpots = () => {
  const out = [];
  for (let i = 0; i < FRIENDS; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 12 + Math.random() * 76, y: 42 + Math.random() * 40 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 20)) { p = c; break; }
    }
    out.push(p || { x: 12 + Math.random() * 76, y: 42 + Math.random() * 40 });
  }
  return out;
};
// A friend who was just helped up: the helping hand, then standing up happily with the thanks.
const HelpedFriend = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <span className="block select-none" style={{ fontSize: FRIEND_SIZE, lineHeight: 1, animation: 'friendUp .7s ease-out both, friendHappy .6s ease-in-out .7s 2' }}>{it.icon}</span>
    <div className="absolute left-1/2 -translate-x-1/2 select-none" style={{ top: `calc(${FRIEND_SIZE} * -0.5)`, fontSize: 'clamp(26px, 5vmin, 44px)', animation: 'friendHand 1s ease-out forwards' }}>🤝</div>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${FRIEND_SIZE} / -2 - 3.4rem)`, animation: 'friendThanks 2.2s ease-out forwards' }}>
      <div className="bg-white text-emerald-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.thanks}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const HelpFriendsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const kids = [...FRIEND_KIDS].sort(() => Math.random() - 0.5);
    return friendSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, icon: kids[i % kids.length], thanks: FRIEND_THANKS[i % FRIEND_THANKS.length], trip: FRIEND_TRIPPED_ON[i % FRIEND_TRIPPED_ON.length], tilt: i % 2 ? 80 : -80 }));
  });
  const [state, setState] = useState(() => Array(FRIENDS).fill('waiting')); // waiting | fallen | helped | gone
  const [won, setWon] = useState(() => Array(FRIENDS).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const helped = state.filter(v => v === 'helped').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = FRIEND_FIRST_MS + it.id * FRIEND_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'fallen' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'fallen' ? 'gone' : v))), start + FRIEND_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'helped' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last friend finish standing up
    return () => clearTimeout(t);
  }, [state, finished]);

  const helpUp = (id) => {
    if (state[id] !== 'fallen') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'helped' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 38%,#bbf7d0 38%,#4ade80 100%)' }}>
      <style>{`
        @keyframes friendPop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes friendCry { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-6px) } }
        @keyframes friendUp { 0% { transform: rotate(var(--tilt, 80deg)) } 100% { transform: rotate(0deg) } }
        @keyframes friendHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes friendHand { 0% { transform: translate(-50%,20px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-50%,-10px) scale(1.2); opacity: 0 } }
        @keyframes friendThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🤝 Help your friends up</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '4%', top: '24%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🌳</div>
      <div className="absolute pointer-events-none" style={{ right: '3%', top: '28%', fontSize: 'clamp(30px, 7vmin, 58px)' }}>🌳</div>
      {helped > 0 && <div className="absolute pointer-events-none bg-white text-emerald-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>🤝 {helped}</div>}
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'helped') return <div key={it.id} style={{ '--tilt': `${it.tilt}deg` }}><HelpedFriend it={it} won={won[i]} /></div>;
        return (
          <button key={it.id} onClick={() => helpUp(it.id)} aria-label="Help your friend up" className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: FRIEND_SIZE, height: FRIEND_SIZE, transform: 'translate(-50%,-50%)', animation: 'friendPop .35s ease-out', zIndex: 5 }}>
            <span className="block select-none" style={{ fontSize: FRIEND_SIZE, lineHeight: 1, transform: `rotate(${it.tilt}deg)` }}>{it.icon}</span>
            <span className="absolute select-none" style={{ right: '-18%', bottom: '-6%', fontSize: 'clamp(20px, 4vmin, 34px)' }}>{it.trip}</span>
            <span className="absolute left-1/2 select-none" style={{ top: '-32%', fontSize: 'clamp(22px, 4.5vmin, 38px)', animation: 'friendCry 1s ease-in-out infinite' }}>😢</span>
          </button>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{helped > 0 ? '🤝' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{helped > 0 ? `You helped ${helped} friend${helped === 1 ? '' : 's'} up!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{helped > 0 ? 'Helping each other makes everyone happy.' : 'Be quick, your friends need you.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 9: paying respect (gratitude and reverence). Those we respect appear one by one -- grandparents, parents, teachers, the
// Buddha, the Dhamma, the Sangha and the rest of the ten most respected (Paccekabuddha, Great Disciples, Arahants, Elders, Dhamma teachers, Benefactors). Tap one to bow to them with joined hands: they bless you back --
// 2 or 3 coins. Someone not honoured in time just waits for another day (no coins). Seven of them per game, picked at random,
// same timing and coins as the birds.
const RESPECT_COUNT = 7;
const RESPECT_FIRST_MS = 800;
const RESPECT_EVERY_MS = 1500;
const RESPECT_VISIBLE_MS = 3400;
const RESPECT_SIZE = 'clamp(54px, 11vmin, 92px)';
const DISCIPLE_BLESS = 'May you grow in wisdom and goodness!';
const RESPECT_WHO = [
  { icon: '👴', name: 'Grandfather', bless: 'May you be happy and well!' },
  { icon: '👵', name: 'Grandmother', bless: 'May you be happy and well!' },
  { icon: '👨', name: 'Father', bless: 'May you always be safe!' },
  { icon: '👩', name: 'Mother', bless: 'May you always be safe!' },
  { icon: '👨‍🏫', name: 'Teacher', bless: 'May you learn and grow!' },
  { icon: '👩‍🏫', name: 'Teacher', bless: 'May you learn and grow!' },
  { icon: '🧘', name: 'Buddha', bless: 'May you be free from suffering!', holy: true },
  { icon: '☸️', name: 'Dhamma', bless: 'May you walk the path of peace!', holy: true },
  { icon: '🪷', name: 'Sangha', bless: 'May you be peaceful and happy!', holy: true },
  { icon: '🧘', name: 'Paccekabuddha', bless: 'May you be free from suffering!', holy: true },
  { icon: '🧘', name: 'Great Disciples', bless: DISCIPLE_BLESS, monk: true },
  { icon: '🧘', name: 'Arahants', bless: DISCIPLE_BLESS, monk: true },
  { icon: '🧓', name: 'Elder', bless: 'May you be healthy and happy!' },
  { icon: '📖', name: 'Dhamma Teacher', bless: 'May you walk the path of peace!' },
  { icon: '🎁', name: 'Benefactor', bless: 'May goodness come back to you!' },
];
const respectSpots = () => {
  const out = [];
  for (let i = 0; i < RESPECT_COUNT; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 14 + Math.random() * 72, y: 36 + Math.random() * 40 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 22)) { p = c; break; }
    }
    out.push(p || { x: 14 + Math.random() * 72, y: 36 + Math.random() * 40 });
  }
  return out;
};
const RespectLabel = ({ it }) => (
  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-xs rounded-full px-2 py-0.5 shadow" style={{ top: '100%', background: it.who.holy ? '#fef3c7' : it.who.monk ? '#fed7aa' : '#ffffff', color: '#78350f' }}>{it.who.name}</span>
);
// Someone who was just honoured: they bow back with joined hands and bless the child.
const HonouredPerson = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <span className="block select-none" style={{ fontSize: RESPECT_SIZE, lineHeight: 1, animation: 'respectBow 1.4s ease-in-out both' }}>{it.who.icon}</span>
    <RespectLabel it={it} />
    <div className="absolute left-1/2 -translate-x-1/2 select-none" style={{ top: `calc(${RESPECT_SIZE} * -0.6)`, fontSize: 'clamp(28px, 5.5vmin, 48px)', animation: 'respectHands 1.2s ease-out forwards' }}>🙏</div>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${RESPECT_SIZE} / -2 - 3.4rem)`, animation: 'respectBless 2.2s ease-out forwards' }}>
      <div className="bg-white text-amber-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.who.bless}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const PayRespectGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const who = [...RESPECT_WHO].sort(() => Math.random() - 0.5).slice(0, RESPECT_COUNT);
    return respectSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, who: who[i] }));
  });
  const [state, setState] = useState(() => Array(RESPECT_COUNT).fill('waiting')); // waiting | shown | honoured | gone
  const [won, setWon] = useState(() => Array(RESPECT_COUNT).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const honoured = state.filter(v => v === 'honoured').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = RESPECT_FIRST_MS + it.id * RESPECT_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'shown' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'shown' ? 'gone' : v))), start + RESPECT_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'honoured' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last blessing finish
    return () => clearTimeout(t);
  }, [state, finished]);

  const payRespect = (id) => {
    if (state[id] !== 'shown') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'honoured' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fde68a 0%,#fff7ed 40%,#fed7aa 40%,#fdba74 100%)' }}>
      <style>{`
        @keyframes respectPop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes respectBow { 0%,100% { transform: rotate(0deg) } 30%,60% { transform: rotate(14deg) translateY(4px) } }
        @keyframes respectHands { 0% { transform: translate(-50%,10px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-50%,-16px) scale(1.2); opacity: 0 } }
        @keyframes respectBless { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🙏 Pay respect</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '6%', top: '14%', fontSize: 'clamp(30px, 7vmin, 56px)' }}>🪷</div>
      {honoured > 0 && <div className="absolute pointer-events-none bg-white text-amber-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>🙏 {honoured}</div>}
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'honoured') return <HonouredPerson key={it.id} it={it} won={won[i]} />;
        return (
          <button key={it.id} onClick={() => payRespect(it.id)} aria-label={`Pay respect to ${it.who.name}`} className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: RESPECT_SIZE, height: RESPECT_SIZE, transform: 'translate(-50%,-50%)', animation: 'respectPop .35s ease-out', zIndex: 5 }}>
            <span className="block select-none" style={{ fontSize: RESPECT_SIZE, lineHeight: 1 }}>{it.who.icon}</span>
            <RespectLabel it={it} />
          </button>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{honoured > 0 ? '🙏' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{honoured > 0 ? `You paid respect ${honoured} time${honoured === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{honoured > 0 ? 'Respect and gratitude bring happiness.' : 'Be quick, they are waiting.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-amber-500 hover:bg-amber-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 10: the ten kinds of giving (dana). One person in need appears at a time -- a child, a poor person, a monk and so on --
// saying what they would like. Two gifts wait on the tray; tap the one they like, quickly, before the time bar runs out: they
// are glad and you get 2 or 3 coins. A wrong gift is politely refused (try another while there is time); no gift in time means no
// coins. Seven people per game, picked at random, never past the lesson's coin limit.
const DANA_COUNT = 7;
const DANA_ROUND_MS = 5500;
const DANA_BETWEEN_MS = 1500;
const DANA_SIZE = 'clamp(80px, 18vmin, 140px)';
const DANA_THANKS = ['Sadhu! Thank you!', 'So kind of you!', 'This is just what I needed!', 'May you be happy!'];
const DANA_GIFTS = {
  food: { icon: '🍚', name: 'Food', pali: 'Annadana' },
  drink: { icon: '🥤', name: 'Drink', pali: 'Panadana' },
  home: { icon: '🏠', name: 'Shelter', pali: 'Gharadana' },
  cloth: { icon: '👘', name: 'Clothing', pali: 'Vatthadana' },
  shoes: { icon: '👟', name: 'Shoes', pali: 'Yanadana' },
  flowers: { icon: '💐', name: 'Flowers', pali: 'Maladana' },
  ointment: { icon: '🧴', name: 'Ointment', pali: 'Vilepanadana' },
  bed: { icon: '🛏️', name: 'A bed', pali: 'Seyyadana' },
  scent: { icon: '🌿', name: 'Fragrance', pali: 'Gandhadana' },
  lamp: { icon: '🪔', name: 'A lamp', pali: 'Padipadana' },
};
const DANA_PEOPLE = [
  { icon: '🧒', who: 'A hungry child', says: 'I am so hungry!', wants: 'food' },
  { icon: '🚶', who: 'A thirsty traveller', says: 'I am so thirsty!', wants: 'drink' },
  { icon: '👨‍👩‍👧', who: 'A family with no home', says: 'We have nowhere to stay.', wants: 'home' },
  { icon: '🥶', who: 'A poor person', says: 'I am so cold!', wants: 'cloth' },
  { icon: '🚶‍♀️', who: 'A woman with bare feet', says: 'The road hurts my feet.', wants: 'shoes' },
  { icon: '🧘', who: 'A monk', says: 'Flowers for the Buddha shrine, please.', wants: 'flowers' },
  { icon: '🧓', who: 'A sick old man', says: 'My skin is sore.', wants: 'ointment' },
  { icon: '😴', who: 'A tired traveller', says: 'I have nowhere to sleep.', wants: 'bed' },
  { icon: '👵', who: 'A grandmother', says: 'I would love something fragrant.', wants: 'scent' },
  { icon: '🧑‍🦯', who: 'A person in the dark', says: 'I cannot see in the dark.', wants: 'lamp' },
];
const shuffleDana = (a) => [...a].sort(() => Math.random() - 0.5);
// The seven people of one game, each with two gifts on the tray (the wanted one and one other, shuffled).
const makeDanaRounds = () => shuffleDana(DANA_PEOPLE).slice(0, DANA_COUNT).map((p, i) => {
  const others = shuffleDana(Object.keys(DANA_GIFTS).filter(k => k !== p.wants)).slice(0, 1);
  return { ...p, id: i, options: shuffleDana([p.wants, ...others]), thanks: DANA_THANKS[i % DANA_THANKS.length] };
});
export const TenGiftsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(makeDanaRounds);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState('play'); // play | glad | late
  const [refused, setRefused] = useState([]); // gifts already refused in this round
  const [shake, setShake] = useState(0);
  const [won, setWon] = useState(() => Array(DANA_COUNT).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const gaveCount = useRef(0);
  const soundRef = useRef(null);
  const cur = rounds[round];

  // the time bar: a person not helped in time leaves
  useEffect(() => {
    if (finished || phase !== 'play') return undefined;
    const t = setTimeout(() => setPhase('late'), DANA_ROUND_MS);
    return () => clearTimeout(t);
  }, [round, phase, finished]);
  // after the person has been helped (or has left), the next one comes
  useEffect(() => {
    if (finished || phase === 'play') return undefined;
    const t = setTimeout(() => {
      if (round + 1 >= DANA_COUNT) { setFinished(true); return; }
      setRound(r => r + 1); setPhase('play'); setRefused([]);
    }, DANA_BETWEEN_MS);
    return () => clearTimeout(t);
  }, [phase, round, finished]);

  const choose = (key) => {
    if (phase !== 'play' || refused.includes(key)) return;
    if (key !== cur.wants) { setRefused(r => [...r, key]); setShake(s => s + 1); return; }
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    gaveCount.current += 1;
    setPhase('glad');
    setWon(w => w.map((v, i) => (i === round ? coins : v)));
    playCoinSound(soundRef);
  };

  const gave = gaveCount.current;
  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 460, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 38%,#fde68a 38%,#fbbf24 100%)' }}>
      <style>{`
        @keyframes danaPop { 0% { transform: scale(.3); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes danaHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-16px) } }
        @keyframes danaNo { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-10px) } 75% { transform: translateX(10px) } }
        @keyframes danaLeave { 0% { transform: translateX(0); opacity: 1 } 100% { transform: translateX(80px); opacity: 0 } }
        @keyframes danaBar { 0% { width: 100% } 100% { width: 0% } }
        @keyframes danaGift { 0% { transform: translateY(40px) scale(.7); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🎁 Give quickly! {round + 1}/{DANA_COUNT}</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      {!finished && (
        <div key={round} className="absolute inset-x-0 flex flex-col items-center px-4" style={{ top: '14%' }}>
          {/* the time bar */}
          <div className="w-full max-w-sm h-3 bg-white/60 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-red-500 rounded-full" style={{ width: '100%', animation: phase === 'play' ? `danaBar ${DANA_ROUND_MS}ms linear forwards` : 'none', ...(phase !== 'play' ? { width: 0 } : {}) }} />
          </div>
          <div className="bg-white text-amber-900 font-bold text-sm sm:text-base rounded-2xl px-4 py-2 shadow text-center max-w-sm mb-2">
            {phase === 'glad' ? `✅ ${cur.thanks}` : phase === 'late' ? 'Too late... they had to go.' : `"${cur.says}"`}
            {phase === 'glad' && won[round] > 0 && <div className="font-black text-yellow-600">+{won[round]} 🪙</div>}
          </div>
          <div key={shake} className="select-none" style={{ fontSize: DANA_SIZE, lineHeight: 1, animation: phase === 'glad' ? 'danaHappy .6s ease-in-out 3' : phase === 'late' ? 'danaLeave .8s ease-in forwards' : (shake ? 'danaNo .4s' : 'danaPop .35s ease-out') }}>{cur.icon}</div>
          <div className="bg-white/90 text-amber-900 font-bold text-xs rounded-full px-3 py-1 shadow mt-1">{cur.who}</div>
        </div>
      )}
      {/* the tray of two gifts */}
      {!finished && (
        <div className="absolute inset-x-0 bottom-0 pb-5 px-3 z-10">
          <div className="text-center font-bold text-amber-900 text-sm mb-2">Which gift do they like?</div>
          <div className="flex items-stretch justify-center gap-2 sm:gap-4">
            {cur.options.map((k) => {
              const g = DANA_GIFTS[k];
              const refusedNow = refused.includes(k);
              const isRight = phase !== 'play' && k === cur.wants;
              return (
                <button key={k} onClick={() => choose(k)} disabled={phase !== 'play' || refusedNow} aria-label={`Give ${g.name}`}
                  className={`flex flex-col items-center rounded-2xl px-3 py-2 shadow-lg border-4 w-28 sm:w-36 ${isRight ? 'bg-green-100 border-green-500' : refusedNow ? 'bg-gray-200 border-gray-300 opacity-40' : 'bg-white border-amber-300 active:scale-95'}`}>
                  <span className="select-none" style={{ fontSize: 'clamp(40px, 10vmin, 64px)', lineHeight: 1, animation: 'danaGift .4s ease-out' }}>{g.icon}</span>
                  <span className="text-amber-900 font-extrabold text-sm leading-tight">{g.name}</span>
                  <span className="text-amber-700 text-[11px] leading-tight">{g.pali}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{gave > 0 ? '🎁' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{gave > 0 ? `You gave ${gave} gift${gave === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{gave > 0 ? 'Giving what people truly need brings happiness to everyone.' : 'Be quick, they need your help.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-amber-500 hover:bg-amber-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 11: return what was left behind (honesty and care for others). Someone walks away and forgets their belongings on the
// ground. Tap the item: you run after them, they turn around and are glad to get it back -- 2 or 3 coins. An item not returned in
// time is left behind (no coins). Seven items per game, same timing and coins as the birds.
const LOST_COUNT = 7;
const LOST_FIRST_MS = 800;
const LOST_EVERY_MS = 1500;
const LOST_VISIBLE_MS = 3400;
const LOST_SIZE = 'clamp(46px, 9.5vmin, 80px)';
const LOST_THANKS = ['Thank you for returning it!', 'You are so honest!', 'I forgot it, thank you!', 'What a kind child!'];
const LOST_KINDS = [
  { item: '👜', name: 'Bag' }, { item: '🎒', name: 'Backpack' }, { item: '🧢', name: 'Cap' }, { item: '☂️', name: 'Umbrella' },
  { item: '👓', name: 'Glasses' }, { item: '🧸', name: 'Toy' }, { item: '📚', name: 'Books' }, { item: '🧣', name: 'Scarf' },
  { item: '🔑', name: 'Keys' }, { item: '🍱', name: 'Lunch box' },
];
const LOST_OWNERS = ['🚶', '🚶‍♀️', '👴', '👵', '🧑', '👩'];
const lostSpots = () => {
  const out = [];
  for (let i = 0; i < LOST_COUNT; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 12 + Math.random() * 56, y: 44 + Math.random() * 36 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 22)) { p = c; break; }
    }
    out.push(p || { x: 12 + Math.random() * 56, y: 44 + Math.random() * 36 });
  }
  return out;
};
// An item that was just returned: the owner comes back to take it and says thanks.
const ReturnedItem = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <span className="block select-none" style={{ fontSize: LOST_SIZE, lineHeight: 1, animation: 'lostHappy .6s ease-in-out .6s 3' }}>{it.owner}</span>
    <span className="absolute select-none" style={{ right: '-40%', bottom: 0, fontSize: 'clamp(26px, 5vmin, 44px)', animation: 'lostGive 1s ease-out forwards' }}>{it.kind.item}</span>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${LOST_SIZE} / -2 - 3.4rem)`, animation: 'lostThanks 2.2s ease-out forwards' }}>
      <div className="bg-white text-emerald-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.thanks}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const ReturnLostItemsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const kinds = [...LOST_KINDS].sort(() => Math.random() - 0.5);
    const owners = [...LOST_OWNERS].sort(() => Math.random() - 0.5);
    return lostSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, kind: kinds[i % kinds.length], owner: owners[i % owners.length], thanks: LOST_THANKS[i % LOST_THANKS.length] }));
  });
  const [state, setState] = useState(() => Array(LOST_COUNT).fill('waiting')); // waiting | lost | returned | gone
  const [won, setWon] = useState(() => Array(LOST_COUNT).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const returned = state.filter(v => v === 'returned').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = LOST_FIRST_MS + it.id * LOST_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'lost' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'lost' ? 'gone' : v))), start + LOST_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'returned' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last owner say thanks
    return () => clearTimeout(t);
  }, [state, finished]);

  const giveBack = (id) => {
    if (state[id] !== 'lost') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'returned' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 38%,#d6d3d1 38%,#a8a29e 100%)' }}>
      <style>{`
        @keyframes lostPop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes lostBlink { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-6px) } }
        @keyframes lostWalk { 0% { transform: translateX(0) } 100% { transform: translateX(150px) } }
        @keyframes lostHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes lostGive { 0% { transform: translateX(40px) scale(.8); opacity: 0 } 40% { opacity: 1 } 100% { transform: translateX(0) scale(1); opacity: 1 } }
        @keyframes lostThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🎒 Return what they forgot</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '5%', top: '22%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🌳</div>
      {returned > 0 && <div className="absolute pointer-events-none bg-white text-emerald-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>🎒 {returned}</div>}
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'returned') return <ReturnedItem key={it.id} it={it} won={won[i]} />;
        return (
          <React.Fragment key={it.id}>
            {/* the owner, walking away without noticing */}
            <div className="absolute pointer-events-none select-none" style={{ left: `${it.x + 12}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)', zIndex: 4 }}>
              <span className="block" style={{ fontSize: LOST_SIZE, lineHeight: 1, animation: `lostWalk ${LOST_VISIBLE_MS}ms linear forwards` }}>{it.owner}</span>
            </div>
            <button onClick={() => giveBack(it.id)} aria-label={`Return the ${it.kind.name}`} className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: LOST_SIZE, height: LOST_SIZE, transform: 'translate(-50%,-50%)', animation: 'lostPop .35s ease-out', zIndex: 5 }}>
              <span className="block select-none" style={{ fontSize: LOST_SIZE, lineHeight: 1 }}>{it.kind.item}</span>
              <span className="absolute left-1/2 select-none" style={{ top: '-30%', fontSize: 'clamp(20px, 4vmin, 34px)', animation: 'lostBlink 1s ease-in-out infinite' }}>❗</span>
            </button>
          </React.Fragment>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{returned > 0 ? '🎒' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{returned > 0 ? `You returned ${returned} thing${returned === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{returned > 0 ? 'Honesty and kindness make everyone trust you.' : 'Be quick, they are walking away.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 12: help mum and dad (gratitude and helping at home). Mum and dad are busy with housework, one after another. Tap them to
// run over and lend a hand: the job gets done and they smile and thank you -- 2 or 3 coins. A parent not helped in time just carries
// on alone (no coins). Seven jobs per game, same timing and coins as the birds.
const HOME_COUNT = 7;
const HOME_FIRST_MS = 800;
const HOME_EVERY_MS = 1500;
const HOME_VISIBLE_MS = 3400;
const HOME_SIZE = 'clamp(54px, 11vmin, 92px)';
const HOME_THANKS = ['Thank you, dear!', 'What a helpful child!', 'You make me so happy!', 'Now it is easy!'];
const HOME_JOBS = [
  { who: '👩‍🍳', tool: '🍲', name: 'Mum is cooking' },
  { who: '👨', tool: '🧹', name: 'Dad is sweeping' },
  { who: '👩', tool: '🧺', name: 'Mum is doing laundry' },
  { who: '👨‍🌾', tool: '🪵', name: 'Dad is carrying wood' },
  { who: '👩‍🌾', tool: '🪴', name: 'Mum is watering plants' },
  { who: '👨‍🔧', tool: '🔧', name: 'Dad is fixing things' },
  { who: '👩', tool: '🛒', name: 'Mum is carrying shopping' },
  { who: '👨', tool: '🍽️', name: 'Dad is washing dishes' },
  { who: '👩', tool: '🧽', name: 'Mum is cleaning' },
  { who: '👨', tool: '🧳', name: 'Dad is carrying bags' },
];
const homeSpots = () => {
  const out = [];
  for (let i = 0; i < HOME_COUNT; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 14 + Math.random() * 72, y: 40 + Math.random() * 38 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 22)) { p = c; break; }
    }
    out.push(p || { x: 14 + Math.random() * 72, y: 40 + Math.random() * 38 });
  }
  return out;
};
const HomeLabel = ({ it }) => (
  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-xs rounded-full px-2 py-0.5 shadow bg-white" style={{ top: '100%', color: '#78350f' }}>{it.job.name}</span>
);
// A parent who was just helped: the job is done, they smile and say thanks.
const HelpedParent = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <span className="block select-none" style={{ fontSize: HOME_SIZE, lineHeight: 1, animation: 'homeHappy .6s ease-in-out .4s 3' }}>{it.job.who}</span>
    <HomeLabel it={it} />
    <div className="absolute left-1/2 -translate-x-1/2 select-none" style={{ top: `calc(${HOME_SIZE} * -0.6)`, fontSize: 'clamp(28px, 5.5vmin, 48px)', animation: 'homeHands 1.2s ease-out forwards' }}>🤝</div>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${HOME_SIZE} / -2 - 3.4rem)`, animation: 'homeThanks 2.2s ease-out forwards' }}>
      <div className="bg-white text-amber-900 font-bold text-sm rounded-full px-3 py-1 shadow">✅ {it.thanks}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const HelpParentsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const jobs = [...HOME_JOBS].sort(() => Math.random() - 0.5).slice(0, HOME_COUNT);
    return homeSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, job: jobs[i], thanks: HOME_THANKS[i % HOME_THANKS.length] }));
  });
  const [state, setState] = useState(() => Array(HOME_COUNT).fill('waiting')); // waiting | busy | helped | gone
  const [won, setWon] = useState(() => Array(HOME_COUNT).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const helped = state.filter(v => v === 'helped').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = HOME_FIRST_MS + it.id * HOME_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'busy' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'busy' ? 'gone' : v))), start + HOME_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'helped' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last parent finish saying thanks
    return () => clearTimeout(t);
  }, [state, finished]);

  const help = (id) => {
    if (state[id] !== 'busy') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'helped' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fef3c7 0%,#fffbeb 34%,#fcd9a8 34%,#e8b878 100%)' }}>
      <style>{`
        @keyframes homePop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes homeWork { 0%,100% { transform: rotate(-10deg) } 50% { transform: rotate(10deg) } }
        @keyframes homeBusy { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-6px) } }
        @keyframes homeHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes homeHands { 0% { transform: translate(-50%,10px) scale(.6); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-50%,-16px) scale(1.2); opacity: 0 } }
        @keyframes homeThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🏠 Help mum and dad</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>🪟</div>
      <div className="absolute pointer-events-none" style={{ left: '6%', top: '14%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🏠</div>
      {helped > 0 && <div className="absolute pointer-events-none bg-white text-amber-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>🤝 {helped}</div>}
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'helped') return <HelpedParent key={it.id} it={it} won={won[i]} />;
        return (
          <button key={it.id} onClick={() => help(it.id)} aria-label={`Help: ${it.job.name}`} className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: HOME_SIZE, height: HOME_SIZE, transform: 'translate(-50%,-50%)', animation: 'homePop .35s ease-out', zIndex: 5 }}>
            <span className="block select-none" style={{ fontSize: HOME_SIZE, lineHeight: 1 }}>{it.job.who}</span>
            <span className="absolute select-none" style={{ right: '-28%', bottom: '4%', fontSize: 'clamp(28px, 5.5vmin, 48px)', animation: 'homeWork .8s ease-in-out infinite' }}>{it.job.tool}</span>
            <span className="absolute left-1/2 select-none" style={{ top: '-30%', fontSize: 'clamp(20px, 4vmin, 34px)', animation: 'homeBusy 1s ease-in-out infinite' }}>💦</span>
            <HomeLabel it={it} />
          </button>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{helped > 0 ? '🏠' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{helped > 0 ? `You helped ${helped} time${helped === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{helped > 0 ? 'Helping our parents is a way of thanking them.' : 'Be quick, mum and dad are busy.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-amber-500 hover:bg-amber-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 13: the alms round (offering food to the Sangha). Monks and novices walk by, one after another, with their alms bowls.
// Tap one to put food in the bowl: the food drops in, they give a blessing -- 2 or 3 coins. A monk who is not offered food in time
// walks on (no coins). Seven monks and novices per game, same timing and coins as the birds.
const ALMS_COUNT = 7;
const ALMS_FIRST_MS = 800;
const ALMS_EVERY_MS = 1500;
const ALMS_VISIBLE_MS = 3400;
const ALMS_SIZE = 'clamp(54px, 11vmin, 92px)';
const ALMS_FOODS = ['🍚', '🍌', '🍎', '🥭', '🍞', '🥥', '🍊', '🍉'];
const ALMS_BLESS = ['Sadhu, sadhu, sadhu!', 'May you be well and happy!', 'May your merit grow!', 'Be peaceful and happy!'];
const ALMS_WHO = ['Venerable monk', 'Novice', 'Venerable monk', 'Novice', 'Venerable monk', 'Novice', 'Venerable monk'];
const almsSpots = () => {
  const out = [];
  for (let i = 0; i < ALMS_COUNT; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 26 + Math.random() * 56, y: 46 + Math.random() * 34 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 22)) { p = c; break; }
    }
    out.push(p || { x: 26 + Math.random() * 56, y: 46 + Math.random() * 34 });
  }
  return out;
};
// A monk drawn in SVG for the alms round: shaved head, saffron robe covering both shoulders, a round black alms bowl held in front.
const MonkSvg = ({ size, mouth = false }) => (
  <svg viewBox="0 0 100 140" width={size} height={`calc(${size} * 1.4)`} style={{ display: 'block' }} aria-hidden="true">
    {/* feet */}
    <ellipse cx="40" cy="134" rx="9" ry="4" fill="#d9a77a" />
    <ellipse cx="60" cy="134" rx="9" ry="4" fill="#d9a77a" />
    {/* the robe covers both shoulders, down to the ankles */}
    <path d="M20 132 L22 64 Q26 52 42 50 L58 50 Q74 52 78 64 L80 132 Q50 138 20 132 Z" fill="#d9731a" />
    {/* the folded cloth across the chest */}
    <path d="M42 50 L58 50 Q74 52 78 64 L78 84 Q58 74 36 68 Q30 58 42 50 Z" fill="#c2410c" />
    <path d="M40 58 Q58 60 74 70 M38 66 Q58 68 76 79" stroke="#9a3412" strokeWidth="1.6" fill="none" />
    <path d="M30 128 Q50 134 70 128 M31 114 Q50 120 69 114 M32 100 Q50 104 68 100" stroke="#b35a10" strokeWidth="2" fill="none" />
    {/* neck and head */}
    <rect x="44" y="40" width="12" height="12" rx="4" fill="#e0ac7c" />
    <circle cx="50" cy="26" r="16" fill="#e8b887" />
    <ellipse cx="34.5" cy="28" rx="3" ry="5" fill="#e0ac7c" />
    <ellipse cx="65.5" cy="28" rx="3" ry="5" fill="#e0ac7c" />
    {/* calm face, eyes down */}
    <path d="M42 26 Q45 28 48 26 M52 26 Q55 28 58 26" stroke="#5b3a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d={mouth ? 'M44 34 Q50 40 56 34' : 'M45 35 Q50 38 55 35'} stroke="#8a4b2a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* the round black alms bowl: rounded bottom, narrower mouth */}
    <path d="M33 88 C24 96 27 118 50 118 C73 118 76 96 67 88 Z" fill="#111111" />
    <ellipse cx="50" cy="88" rx="17" ry="4.5" fill="#262626" stroke="#555" strokeWidth="1" />
    <path d="M33 100 Q34 110 42 114" stroke="#666" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* hands holding the bowl at its sides */}
    <ellipse cx="29" cy="100" rx="5" ry="6" fill="#e0ac7c" />
    <ellipse cx="71" cy="100" rx="5" ry="6" fill="#e0ac7c" />
  </svg>
);
const AlmsLabel = ({ it }) => (
  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-xs rounded-full px-2 py-0.5 shadow bg-orange-100" style={{ top: '100%', color: '#7c2d12' }}>{it.who}</span>
);
// A monk who was just offered food: it drops into the bowl and he blesses the giver.
const BlessingMonk = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <MonkSvg size={it.who === 'Novice' ? `calc(${ALMS_SIZE} * 0.8)` : ALMS_SIZE} mouth />
    <AlmsLabel it={it} />
    <div className="absolute left-1/2 -translate-x-1/2 select-none" style={{ top: `calc(${ALMS_SIZE} * -0.9)`, fontSize: 'clamp(28px, 5.5vmin, 48px)', animation: 'almsDrop 1s ease-in forwards' }}>{it.food}</div>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${ALMS_SIZE} / -2 - 3.4rem)`, animation: 'almsBless 2.2s ease-out forwards' }}>
      <div className="bg-white text-orange-900 font-bold text-sm rounded-full px-3 py-1 shadow">🙏 {it.bless}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const AlmsRoundGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const foods = [...ALMS_FOODS].sort(() => Math.random() - 0.5);
    const who = [...ALMS_WHO].sort(() => Math.random() - 0.5);
    return almsSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, who: who[i], food: foods[i % foods.length], bless: ALMS_BLESS[i % ALMS_BLESS.length] }));
  });
  const [state, setState] = useState(() => Array(ALMS_COUNT).fill('waiting')); // waiting | walking | offered | gone
  const [won, setWon] = useState(() => Array(ALMS_COUNT).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const offered = state.filter(v => v === 'offered').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = ALMS_FIRST_MS + it.id * ALMS_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'walking' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'walking' ? 'gone' : v))), start + ALMS_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'offered' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last blessing finish
    return () => clearTimeout(t);
  }, [state, finished]);

  const offer = (id) => {
    if (state[id] !== 'walking') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'offered' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fdba74 0%,#fed7aa 36%,#d6b98c 36%,#b08d5c 100%)' }}>
      <style>{`
        @keyframes almsPop { 0% { opacity: 0 } 100% { opacity: 1 } }
        @keyframes almsWalk { 0% { transform: translateX(40px) } 100% { transform: translateX(-40px) } }
        @keyframes almsStep { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes almsDrop { 0% { transform: translate(-50%,-30px) scale(.8); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-50%,40px) scale(.9); opacity: 0 } }
        @keyframes almsBless { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-orange-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🥣 Offer alms food to the Sangha</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>🌅</div>
      <div className="absolute pointer-events-none" style={{ left: '4%', top: '20%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🌴</div>
      {/* the giver's basket, with a counter */}
      <div className="absolute pointer-events-none" style={{ left: '5%', bottom: '3%', fontSize: 'clamp(40px, 9vmin, 76px)', lineHeight: 1 }}>🧺
        {offered > 0 && <span className="absolute -top-2 -right-3 bg-white text-orange-700 font-black text-sm rounded-full w-7 h-7 flex items-center justify-center shadow">{offered}</span>}
      </div>
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'offered') return <BlessingMonk key={it.id} it={it} won={won[i]} />;
        return (
          <div key={it.id} className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, zIndex: 5, transform: 'translate(-50%,-50%)' }}>
            <div style={{ animation: `almsPop .35s ease-out, almsWalk ${ALMS_VISIBLE_MS}ms linear forwards` }}>
              <button onClick={() => offer(it.id)} aria-label={`Offer food to the ${it.who}`} className="relative block">
                <div style={{ animation: 'almsStep .6s ease-in-out infinite' }}><MonkSvg size={it.who === 'Novice' ? `calc(${ALMS_SIZE} * 0.8)` : ALMS_SIZE} /></div>
                <AlmsLabel it={it} />
              </button>
            </div>
          </div>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{offered > 0 ? '🥣' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{offered > 0 ? `You offered food to ${offered} monk${offered === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{offered > 0 ? 'Offering alms with a kind heart makes great merit.' : 'Be quick, the monks are walking by.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-orange-500 hover:bg-orange-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 14: the duck that lays a golden egg every day (greed). One day = about 2.6 seconds: the duck lays one golden egg, tap it to
// pick it up (2 or 3 coins). From the second day a big pile of golden eggs and a tempting voice say "take MANY eggs at once" -- but taking
// them ends the game: the duck runs away, and there are no more eggs or coins. Seven days in all; the end screen shows how many eggs were missed
// by being greedy ("he who wants too much gets too little").
const DUCK_DAYS = 7;
const DUCK_FIRST_MS = 500;
const DUCK_DAY_MS = 2600;
const DUCK_LAY_MS = 450;     // the egg appears this long after the day starts
const DUCK_EGG_MS = 2000;    // and stays this long
const DUCK_SIZE = 'clamp(70px, 16vmin, 130px)';
const DUCK_EGG_SIZE = 'clamp(34px, 8vmin, 58px)';
const duckEggSpot = () => ({ x: (Math.random() < 0.5 ? 18 : 60) + Math.random() * 22, y: 66 + Math.random() * 14 });
const GoldenEgg = ({ size }) => (
  <span className="block relative" style={{ width: size, height: `calc(${size} * 1.25)`, borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%', background: 'radial-gradient(circle at 35% 30%, #fff7b0 0%, #fde047 35%, #f59e0b 100%)', border: '2px solid #b45309', boxShadow: '0 0 14px 4px rgba(253,224,71,.8)' }}>
    <span className="absolute select-none" style={{ top: '-30%', right: '-35%', fontSize: `calc(${size} * 0.5)`, animation: 'duckTwinkle .9s ease-in-out infinite' }}>✨</span>
  </span>
);
export const GoldenEggDuckGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [spots] = useState(() => Array.from({ length: DUCK_DAYS }, duckEggSpot));
  const [state, setState] = useState(() => Array(DUCK_DAYS).fill('waiting')); // waiting | egg | got | missed
  const [won, setWon] = useState(() => Array(DUCK_DAYS).fill(0));
  const [day, setDay] = useState(0);          // 0 until the first day starts, then 1..7
  const [killed, setKilled] = useState(false);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const eggs = state.filter(v => v === 'got').length;
  const soundRef = useRef(null);

  useEffect(() => {
    if (killed) return undefined;
    const timers = [];
    for (let d = 0; d < DUCK_DAYS; d++) {
      const start = DUCK_FIRST_MS + d * DUCK_DAY_MS;
      timers.push(setTimeout(() => setDay(d + 1), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === d && v === 'waiting' ? 'egg' : v))), start + DUCK_LAY_MS));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === d && v === 'egg' ? 'missed' : v))), start + DUCK_LAY_MS + DUCK_EGG_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [killed]);
  useEffect(() => {
    if (finished || killed || !state.every(v => v === 'got' || v === 'missed')) return undefined;
    const t = setTimeout(() => setFinished(true), 1200);
    return () => clearTimeout(t);
  }, [state, finished, killed]);
  useEffect(() => {
    if (!killed) return undefined;
    const t = setTimeout(() => setFinished(true), 3000); // let the child see what happened
    return () => clearTimeout(t);
  }, [killed]);

  const pick = (id) => {
    if (state[id] !== 'egg') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'got' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };
  const missedByGreed = killed ? DUCK_DAYS - eggs - state.filter(v => v === 'missed').length : 0;

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: killed ? 'linear-gradient(180deg,#9ca3af 0%,#d1d5db 38%,#a8a29e 38%,#78716c 100%)' : 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 38%,#bbf7d0 38%,#86efac 100%)', transition: 'background .8s' }}>
      <style>{`
        @keyframes duckBob { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-6px) } }
        @keyframes duckPop { 0% { transform: translateY(-40px) scale(.3); opacity: 0 } 60% { transform: translateY(6px) scale(1.1); opacity: 1 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes duckTwinkle { 0%,100% { transform: scale(.7); opacity: .6 } 50% { transform: scale(1.2); opacity: 1 } }
        @keyframes duckWin { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes duckShake { 0%,100% { transform: translate(-50%,0) rotate(0) } 25% { transform: translate(-50%,0) rotate(-12deg) } 75% { transform: translate(-50%,0) rotate(12deg) } }
        @keyframes duckRun { 0% { transform: translate(-50%,0) } 100% { transform: translate(-260%,-12px) } }
        @keyframes duckBeg { 0%,100% { transform: scale(1) } 50% { transform: scale(1.07) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-sky-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🦆 {killed ? 'The duck ran away' : (day > 0 ? `Day ${day} of ${DUCK_DAYS}` : 'The golden egg duck')}</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ left: '6%', top: '14%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>{killed ? '☁️' : '🌳'}</div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>{killed ? '🌙' : '☀️'}</div>
      {/* the duck, always in the middle of the field */}
      <div className="absolute select-none" style={{ left: '50%', top: '44%', fontSize: DUCK_SIZE, lineHeight: 1, zIndex: 3, animation: killed ? 'duckRun 1.8s ease-in forwards' : 'duckBob 1.4s ease-in-out infinite' }}>{killed ? '🦆💨' : '🦆'}</div>
      {killed && (
        <div className="absolute text-center" style={{ left: '50%', top: '30%', transform: 'translateX(-50%)', zIndex: 8 }}>
          <div className="bg-white text-gray-800 font-bold text-sm sm:text-base rounded-2xl px-4 py-2 shadow-lg whitespace-nowrap">💨 The duck ran away! No more golden eggs.</div>
        </div>
      )}
      {!killed && day > 0 && !finished && <div className="absolute pointer-events-none bg-white text-yellow-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>🥚 {eggs}</div>}
      {state.map((st, i) => {
        if (killed || st === 'waiting' || st === 'missed') return null;
        const sp = spots[i];
        if (st === 'got') {
          return (
            <div key={i} className="absolute pointer-events-none text-center whitespace-nowrap" style={{ left: `${sp.x}%`, top: `${sp.y}%`, transform: 'translate(-50%,-50%)', zIndex: 6, animation: 'duckWin 1.6s ease-out forwards' }}>
              <div className="font-black text-yellow-600 drop-shadow">+{won[i]} 🪙</div>
            </div>
          );
        }
        return (
          <button key={i} onClick={() => pick(i)} aria-label="Pick up the golden egg" className="absolute" style={{ left: `${sp.x}%`, top: `${sp.y}%`, transform: 'translate(-50%,-50%)', zIndex: 5, padding: 14, animation: 'duckPop .5s ease-out' }}>
            <GoldenEgg size={DUCK_EGG_SIZE} />
          </button>
        );
      })}
      {/* the temptation: ALL the gold now -- from day 2 on */}
      {!killed && !finished && day >= 2 && (
        <>
          <div className="absolute left-1/2 text-center" style={{ transform: 'translateX(-50%)', top: '13%', zIndex: 7, width: 'min(62%, 340px)', pointerEvents: 'none' }}>
            <div className="bg-white text-red-700 font-extrabold text-xs sm:text-base rounded-2xl px-3 py-2 shadow-lg">😈 Look at all the golden eggs! Why wait for one a day? Take MANY at once and be rich!</div>
            <div className="select-none mt-1" style={{ fontSize: 'clamp(22px, 6vmin, 36px)', letterSpacing: 2, filter: 'drop-shadow(0 0 8px rgba(253,224,71,.9))' }}>🥚🥚🥚🥚🥚🥚🥚🥚</div>
          </div>
          <button
            onClick={() => setKilled(true)}
            aria-label="Take many golden eggs at once"
            className="absolute left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-full shadow-xl px-4 py-2 text-sm sm:text-base"
            style={{ bottom: '3%', zIndex: 7, animation: 'duckBeg 1s ease-in-out infinite', maxWidth: '88%' }}
          >😈 Take MANY golden eggs now!</button>
        </>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{killed ? '😢' : '🥚'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{killed ? 'Too greedy!' : (eggs > 0 ? `You collected ${eggs} golden egg${eggs === 1 ? '' : 's'}!` : 'Nice try!')}</h2>
            <p className="text-sm text-gray-600 mb-2">{killed
              ? `You wanted many eggs at once, so the duck ran away and ${missedByGreed} more golden egg${missedByGreed === 1 ? '' : 's'} never came. If we want too much, we get less.`
              : (eggs > 0 ? 'You were patient and content with one egg a day. Being content brings the most.' : 'Be quick, the golden egg only stays a little while.')}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 15: the cunning heron (nothing is free; do not believe a stranger's kind words). The pond is drying up; seven fish. Seven times
// the heron comes with a free offer (a free ride to a big lake) -- it is a trick to eat them. The two answers are thrown up in arcs
// from each side; "No thanks!" gives 2 or 3 coins, "Go with them" gives nothing and a fish is eaten (the number of fish lost is
// shown all the time and on the end screen). No answer in time: nothing happens, no coins.
const HERON_ROUNDS = 7;
const HERON_ASK_MS = 5500;
const HERON_RESULT_MS = 1900;
const HERON_TRICKS = [
  'Come to my big lake -- it is free, I will carry you there!',
  'A free, safe trip! Just hop on my back, one pond at a time.',
  'Free water and free food at my lake, no cost at all!',
  'Trust me, I only want to help you, for nothing in return!',
  'A free ride to a pond full of rain. No charge, little fish!',
  'Believe me, little fish: the big lake is full of food, and I carry you for free!',
  'Your pond is dying. I will take you somewhere safe, free, one at a time!',
];
const makeHeronRounds = () => {
  const items = HERON_TRICKS.map(says => ({ trick: true, who: '🦩', name: 'Heron', says }));
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items.map(x => ({ ...x, flip: Math.random() < 0.5 })); // which answer comes up on the left
};
export const CunningHeronGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(makeHeronRounds);
  const [r, setR] = useState(0);
  const [phase, setPhase] = useState('ask');         // ask | result
  const [outcome, setOutcome] = useState(null);      // wise | eaten | joined | missedFair | late
  const [outcomes, setOutcomes] = useState([]);
  const [won, setWon] = useState([]);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const soundRef = useRef(null);
  const total = won.reduce((a, b) => a + b, 0);
  const eaten = outcomes.filter(o => o === 'eaten').length;
    const it = rounds[r];

  // the time to choose runs out: nothing is decided, no coins
  useEffect(() => {
    if (finished || phase !== 'ask') return undefined;
    const t = setTimeout(() => settle('late', 0), HERON_ASK_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]); // eslint-disable-line react-hooks/exhaustive-deps
  // after the result is shown: next visitor, or the end
  useEffect(() => {
    if (finished || phase !== 'result') return undefined;
    const t = setTimeout(() => {
      if (r + 1 >= HERON_ROUNDS) setFinished(true);
      else { setR(r + 1); setPhase('ask'); setOutcome(null); }
    }, HERON_RESULT_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]);

  function settle(kind, coins) {
    setOutcome(kind);
    setOutcomes(o => [...o, kind]);
    setWon(w => [...w, coins]);
    setPhase('result');
  }
  const choose = (goWith) => {
    if (phase !== 'ask') return;
    if (goWith) settle('eaten', 0);
    else { settle('wise', Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total))); playCoinSound(soundRef); }
  };
  const lastCoins = won[won.length - 1] || 0;
  const message = {
    wise: 'No thanks! You did not believe the lie. Nothing is free.',
    eaten: `Oh no! The heron lied and ate the fish. ${eaten} fish lost. Do not believe a stranger's free offer!`,
    late: 'Too slow to decide. The heron flew off, for now.',
  }[outcome] || '';

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fde68a 0%,#fef3c7 40%,#d6b98c 40%,#b8956a 100%)' }}>
      <style>{`
        @keyframes heronBar { 0% { width: 100% } 100% { width: 0% } }
        @keyframes heronIn { 0% { transform: translateY(-30px) scale(.6); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes heronSwim { 0%,100% { transform: translateX(-8px) } 50% { transform: translateX(8px) } }
        @keyframes heronArcA { 0% { left: 10%; top: 94%; animation-timing-function: cubic-bezier(.2,.7,.4,1) } 45% { left: 24%; top: var(--peak); animation-timing-function: cubic-bezier(.6,0,.8,.3) } 100% { left: 38%; top: 94% } }
        @keyframes heronArcB { 0% { left: 90%; top: 94%; animation-timing-function: cubic-bezier(.2,.7,.4,1) } 45% { left: 76%; top: var(--peak); animation-timing-function: cubic-bezier(.6,0,.8,.3) } 100% { left: 62%; top: 94% } }
        @keyframes heronUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-40px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-sky-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🦩 The cunning heron</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none bg-white font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%', color: eaten > 0 ? '#b91c1c' : '#047857', zIndex: 6 }}>{eaten > 0 ? `💀 ${eaten} fish lost` : '🐟 No fish lost'}</div>
      {/* the small drying pond with the fish left in it */}
      <div className="absolute left-1/2 -translate-x-1/2 rounded-[50%] flex items-center justify-center flex-wrap gap-1 px-4" style={{ bottom: '24%', width: 'min(86%, 420px)', height: 'clamp(70px, 16vh, 120px)', background: 'radial-gradient(circle at 50% 40%, #7dd3fc, #0284c7)', border: '5px solid #a8845a', boxShadow: 'inset 0 4px 10px rgba(0,0,0,.25)' }}>
        {Array.from({ length: HERON_ROUNDS - eaten }, (_, i) => <span key={i} className="select-none" style={{ fontSize: 'clamp(18px, 4vmin, 30px)', animation: `heronSwim ${1.4 + (i % 3) * 0.4}s ease-in-out infinite` }}>🐟</span>)}
        {eaten > 0 && <span className="absolute -right-1 -top-2 select-none" style={{ fontSize: 'clamp(18px, 4vmin, 28px)' }}>🦴</span>}
      </div>
      {!finished && it && (
        <>
          {/* the visitor and what they say */}
          <div key={r} className="absolute left-1/2 text-center" style={{ top: '13%', transform: 'translateX(-50%)', width: 'min(90%, 420px)', zIndex: 5, animation: 'heronIn .4s ease-out' }}>
            <div className="select-none" style={{ fontSize: 'clamp(54px, 13vmin, 100px)', lineHeight: 1 }}>{phase === 'result' && outcome === 'eaten' ? '😋' : it.who}</div>
            <div className="mt-1 font-bold text-xs rounded-full px-2 py-0.5 inline-block shadow bg-white" style={{ color: '#78350f' }}>{it.name}</div>
            <div className="mt-2 bg-white text-gray-800 font-bold text-sm sm:text-base rounded-2xl px-4 py-3 shadow-lg">{phase === 'ask' ? `“${it.says}”` : message}</div>
            {phase === 'result' && lastCoins > 0 && <div className="font-black text-yellow-600 drop-shadow mt-1" style={{ animation: 'heronUp 1.8s ease-out forwards' }}>+{lastCoins} 🪙</div>}
          </div>
          {phase === 'ask' && (
            <>
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden bg-white/60" style={{ top: '62%', width: 'min(80%, 360px)', height: 10, zIndex: 5 }}>
                <div key={r} className="h-full bg-red-500" style={{ animation: `heronBar ${HERON_ASK_MS}ms linear forwards` }} />
              </div>
              {/* the two answers are thrown up from the bottom in arcs, one from each side, and fall back down on the same side:
                  the child taps one while it flies (a wrong tap is allowed -- it counts) */}
              {[{ go: true, label: '✅ Go with them', cls: 'bg-emerald-500', peak: '50%' }, { go: false, label: '🙅 No thanks!', cls: 'bg-rose-500', peak: '58%' }].map((a, k) => (
                <button
                  key={`${r}-${a.go}`}
                  onClick={() => choose(a.go)}
                  className={`absolute font-extrabold text-white rounded-full shadow-xl px-4 py-3 whitespace-nowrap ${a.cls}`}
                  style={{ zIndex: 6, transform: 'translate(-50%,-50%)', '--peak': a.peak, animation: `${(k === 0) !== it.flip ? 'heronArcA' : 'heronArcB'} ${HERON_ASK_MS}ms linear forwards` }}
                >{a.label}</button>
              ))}
            </>
          )}
        </>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{eaten === 0 ? '🐟' : '🦩'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{eaten === 0 ? 'Every fish is safe!' : `${HERON_ROUNDS - eaten} fish stayed safe`}</h2>
            <p className="text-sm text-gray-600 mb-2">{eaten === 0 ? 'You did not believe the heron. A free ride was only a trick to eat you. Nothing is free.' : `💀 ${eaten} fish went with the heron and ${eaten === 1 ? 'was' : 'were'} eaten. The heron lied: a free ride was only a trick to eat them. Do not believe a stranger's kind words. Nothing is free.`}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 16: sharing the water. A big, kind elephant lives by a pond. Small animals come to drink one after another, but they are afraid
// of the big elephant. The child taps each little animal to invite it kindly ("Come and drink!"): the elephant welcomes it, it drinks and
// says thank you -- 2 or 3 coins. An animal that is not invited in time is frightened and runs away (no coins). Seven animals per game,
// same timing and coins as the birds.
const SHARE_COUNT = 7;
const SHARE_FIRST_MS = 800;
const SHARE_EVERY_MS = 1500;
const SHARE_VISIBLE_MS = 3400;
const SHARE_SCARED_MS = 1100;
const SHARE_SIZE = 'clamp(44px, 9.5vmin, 76px)';
const SHARE_ANIMALS = [
  { e: '🐇', name: 'Rabbit' }, { e: '🐿️', name: 'Squirrel' }, { e: '🐥', name: 'Chick' }, { e: '🐸', name: 'Frog' },
  { e: '🐢', name: 'Turtle' }, { e: '🐭', name: 'Mouse' }, { e: '🦔', name: 'Hedgehog' }, { e: '🐒', name: 'Monkey' },
  { e: '🦌', name: 'Fawn' }, { e: '🐑', name: 'Lamb' },
];
const SHARE_THANKS = ['Thank you, Elephant!', 'The water is so good!', 'You are kind!', 'Thank you for sharing!'];
const shareSpots = () => {
  const out = [];
  for (let i = 0; i < SHARE_COUNT; i++) {
    let p = null;
    for (let tries = 0; tries < 40; tries++) {
      const left = Math.random() < 0.5;
      const c = { x: left ? 8 + Math.random() * 20 : 72 + Math.random() * 20, y: 46 + Math.random() * 38 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 18)) { p = c; break; }
    }
    out.push(p || { x: Math.random() < 0.5 ? 14 : 84, y: 46 + Math.random() * 38 });
  }
  return out;
};
const ShareLabel = ({ it }) => (
  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-xs rounded-full px-2 py-0.5 shadow bg-white" style={{ top: '100%', color: '#075985' }}>{it.animal.name}</span>
);
export const ShareWaterGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const animals = [...SHARE_ANIMALS].sort(() => Math.random() - 0.5).slice(0, SHARE_COUNT);
    return shareSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, animal: animals[i], thanks: SHARE_THANKS[i % SHARE_THANKS.length], toRight: p.x < 50 ? -1 : 1 }));
  });
  const [state, setState] = useState(() => Array(SHARE_COUNT).fill('waiting')); // waiting | here | drinking | scared | gone
  const [won, setWon] = useState(() => Array(SHARE_COUNT).fill(0));
  const [invite, setInvite] = useState(null);      // the animal the elephant is welcoming right now
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const shared = state.filter(v => v === 'drinking').length;
  const scaredCount = state.filter(v => v === 'scared' || v === 'gone').length;   // 'gone' only follows 'scared'
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = SHARE_FIRST_MS + it.id * SHARE_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'here' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'here' ? 'scared' : v))), start + SHARE_VISIBLE_MS));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'scared' ? 'gone' : v))), start + SHARE_VISIBLE_MS + SHARE_SCARED_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'drinking' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last animal finish drinking
    return () => clearTimeout(t);
  }, [state, finished]);

  const call = (id) => {
    if (state[id] !== 'here') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'drinking' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    setInvite(id);
    setTimeout(() => setInvite(cur => (cur === id ? null : cur)), 1600);
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 30%,#d9f99d 30%,#a3d977 100%)' }}>
      <style>{`
        @keyframes shwPop { 0% { opacity: 0; transform: scale(.4) } 100% { opacity: 1; transform: scale(1) } }
        @keyframes shwShy { 0%,100% { transform: translateX(-3px) } 50% { transform: translateX(3px) } }
        @keyframes shwRun { 0% { transform: translateX(0) rotate(0); opacity: 1 } 100% { transform: translateX(calc(var(--run) * 120px)) rotate(calc(var(--run) * 14deg)); opacity: 0 } }
        @keyframes shwDrink { 0%,100% { transform: translateY(0) } 50% { transform: translateY(5px) } }
        @keyframes shwUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes shwSway { 0%,100% { transform: translateX(-50%) rotate(-3deg) } 50% { transform: translateX(-50%) rotate(3deg) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-sky-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🐘 Invite the little ones to drink</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '7%', top: '9%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '5%', top: '14%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🌳</div>
      {/* the pond, with the elephant standing at its edge */}
      <div className="absolute rounded-[50%]" style={{ left: '50%', top: '58%', transform: 'translateX(-50%)', width: 'min(44%, 280px)', height: 'clamp(70px, 18vh, 130px)', background: 'radial-gradient(circle at 50% 40%, #7dd3fc, #0369a1)', border: '5px solid #a8845a', boxShadow: 'inset 0 4px 10px rgba(0,0,0,.25)' }} />
      <div className="absolute select-none" style={{ left: '50%', top: '30%', fontSize: 'clamp(70px, 17vmin, 130px)', lineHeight: 1, transform: 'translateX(-50%)', animation: 'shwSway 2.4s ease-in-out infinite', zIndex: 3 }}>🐘</div>
      {invite != null && (
        <div className="absolute text-center whitespace-nowrap" style={{ left: '50%', top: '19%', transform: 'translateX(-50%)', zIndex: 8, animation: 'shwPop .3s ease-out' }}>
          <div className="bg-white text-sky-900 font-bold text-sm rounded-full px-3 py-1 shadow-lg">🐘 Come, little {items[invite].animal.name.toLowerCase()}, drink with me!</div>
        </div>
      )}
      {shared > 0 && <div className="absolute pointer-events-none bg-white text-sky-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>💧 {shared}</div>}
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        const pos = { left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' };
        if (st === 'drinking') {
          return (
            <div key={it.id} className="absolute pointer-events-none" style={{ ...pos, zIndex: 6 }}>
              <span className="block select-none" style={{ fontSize: SHARE_SIZE, lineHeight: 1, animation: 'shwDrink .5s ease-in-out infinite' }}>{it.animal.e}</span>
              <span className="absolute select-none" style={{ left: it.toRight === -1 ? '90%' : '-40%', bottom: '-6%', fontSize: 'clamp(18px, 4vmin, 30px)' }}>💧</span>
              <ShareLabel it={it} />
              <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${SHARE_SIZE} * -0.9)`, animation: 'shwUp 2.2s ease-out forwards' }}>
                <div className="bg-white text-sky-900 font-bold text-sm rounded-full px-3 py-1 shadow">🙏 {it.thanks}</div>
                {won[i] > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won[i]} 🪙</div>}
              </div>
            </div>
          );
        }
        if (st === 'scared') {
          return (
            <div key={it.id} className="absolute pointer-events-none" style={{ ...pos, zIndex: 5 }}>
              <div style={{ '--run': it.x < 50 ? -1 : 1, animation: `shwRun ${SHARE_SCARED_MS}ms ease-in forwards` }}>
                <span className="block select-none" style={{ fontSize: SHARE_SIZE, lineHeight: 1 }}>{it.animal.e}</span>
                <span className="absolute select-none" style={{ right: '-20%', top: '-24%', fontSize: 'clamp(18px, 4vmin, 30px)' }}>😱</span>
              </div>
            </div>
          );
        }
        return (
          <button key={it.id} onClick={() => call(it.id)} aria-label={`Invite the ${it.animal.name} to drink`} className="absolute" style={{ ...pos, zIndex: 5, animation: 'shwPop .35s ease-out' }}>
            <div style={{ animation: 'shwShy .5s ease-in-out infinite' }}>
              <span className="block select-none" style={{ fontSize: SHARE_SIZE, lineHeight: 1 }}>{it.animal.e}</span>
              <span className="absolute select-none" style={{ right: '-26%', top: '-22%', fontSize: 'clamp(16px, 3.6vmin, 26px)' }}>💧❓</span>
            </div>
            <ShareLabel it={it} />
          </button>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{shared > 0 ? '🐘' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{shared > 0 ? `You shared the water with ${shared} animal${shared === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{shared > 0
              ? `A kind invitation makes the little ones brave. Sharing makes everyone happy.${scaredCount > 0 ? ` ${scaredCount} ran away frightened because nobody invited them.` : ''}`
              : 'The little animals were afraid of the big elephant. Invite them quickly and kindly.'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 17: the school of many skills (learn something useful). Seven lessons, three or four about making an honest living (farming,
// carpentry, sewing, pottery, cooking, healing, teaching, Right Livelihood), half about the Dhamma (Four Noble Truths, Eightfold
// Path, Five Precepts, loving-kindness, breathing meditation, giving/morality/mind training, Three Jewels, kamma). Each lesson first
// shows a short teaching card (no timer, read at your own pace), then asks one question with two answers. A right answer gives 2 or 3
// coins; a wrong one shows the right answer and gives none. The student learns first, so the coins are earned by learning.
const SCHOOL_ROUNDS = 7;
const SCHOOL_RESULT_MS = 2300;
const SCHOOL_LESSONS = [
  { kind: 'Livelihood', emoji: '🌾', title: 'Farming', teach: 'A farmer ploughs the field, sows the seed and waters the plants. After the rains the rice is harvested and shared with everyone.', q: 'What does a farmer grow in the field?', right: 'Rice and vegetables', wrong: 'Bricks and roofs' },
  { kind: 'Livelihood', emoji: '🪚', title: 'Carpentry', teach: 'A carpenter measures, saws and joins wood to make doors, chairs and houses. A good carpenter measures twice and cuts once.', q: 'What does a carpenter work with?', right: 'Wood', wrong: 'Cloth' },
  { kind: 'Livelihood', emoji: '🧵', title: 'Sewing', teach: 'A tailor measures the body, cuts the cloth and sews it with a needle and thread to make clothes. Robes for monks are sewn this way too.', q: 'Who makes clothes from cloth?', right: 'A tailor', wrong: 'A potter' },
  { kind: 'Livelihood', emoji: '🏺', title: 'Pottery', teach: 'A potter shapes wet clay with the hands, lets it dry, then bakes it in a hot kiln. Pots, cups and water jars are made like this.', q: 'What is a clay pot made from?', right: 'Clay from the earth', wrong: 'Paper' },
  { kind: 'Livelihood', emoji: '🍲', title: 'Cooking', teach: 'A cook washes the food, cooks it well and keeps the kitchen clean, so that people who eat it stay healthy and strong.', q: 'Why must a cook keep the kitchen clean?', right: 'So the food is safe to eat', wrong: 'So the food lasts for years' },
  { kind: 'Livelihood', emoji: '🩺', title: 'Healing', teach: 'A doctor or nurse studies medicine to look after sick people. The Buddha praised caring for the sick as a very good deed.', q: 'Who does a doctor look after?', right: 'Sick people', wrong: 'Only rich people' },
  { kind: 'Livelihood', emoji: '📚', title: 'Teaching', teach: 'A teacher shares what they know, so that students learn to read, write, count and think wisely. Teaching is a gift that never runs out.', q: 'What does a teacher share?', right: 'Knowledge', wrong: 'Only toys' },
  { kind: 'Livelihood', emoji: '⚖️', title: 'Right Livelihood', teach: 'The Buddha taught Right Livelihood: earn your living honestly, without harming others. Selling weapons, living beings, meat, alcohol or poison is wrong livelihood.', q: 'Which job is Right Livelihood?', right: 'Growing vegetables', wrong: 'Selling weapons' },
  { kind: 'Dhamma', emoji: '☸️', title: 'Four Noble Truths', teach: 'The Buddha taught four truths: there is suffering, suffering has a cause, suffering can end, and there is a path that leads to its end.', q: 'How many Noble Truths did the Buddha teach?', right: 'Four', wrong: 'Nine' },
  { kind: 'Dhamma', emoji: '🛤️', title: 'Noble Eightfold Path', teach: 'The path to the end of suffering has eight parts: right view, intention, speech, action, livelihood, effort, mindfulness and concentration.', q: 'How many parts does the Noble Eightfold Path have?', right: 'Eight', wrong: 'Three' },
  { kind: 'Dhamma', emoji: '🙏', title: 'Five Precepts', teach: 'Lay Buddhists keep five precepts: not to kill, not to steal, not to lie, not to misuse sensual pleasures, and not to take alcohol or drugs.', q: 'Which one is a precept?', right: 'Do not steal', wrong: 'Do not sleep' },
  { kind: 'Dhamma', emoji: '💗', title: 'Loving-kindness (Metta)', teach: 'Metta is loving-kindness. We sit quietly and wish, "May all beings be happy and free from suffering", for ourselves, our family and everyone.', q: 'What do we wish for others in Metta?', right: 'Happiness', wrong: 'Trouble' },
  { kind: 'Dhamma', emoji: '🌬️', title: 'Breathing meditation', teach: 'Sit calmly with a straight back and know each in-breath and each out-breath. When the mind wanders, gently bring it back to the breath.', q: 'In breathing meditation, what do we watch?', right: 'The breath', wrong: 'A video' },
  { kind: 'Dhamma', emoji: '🎁', title: 'Dana, Sila, Bhavana', teach: 'There are three ways to make merit: Dana is giving, Sila is keeping the precepts, and Bhavana is training the mind by meditation.', q: 'What is Dana?', right: 'Giving', wrong: 'Sleeping' },
  { kind: 'Dhamma', emoji: '💎', title: 'The Three Jewels', teach: 'The Three Jewels are the Buddha, the Dhamma (his teaching) and the Sangha (the noble community). We take refuge in them.', q: 'The Three Jewels are the Buddha, the Dhamma and the...', right: 'Sangha', wrong: 'Nibbana' },
  { kind: 'Dhamma', emoji: '🌱', title: 'Kamma', teach: 'Kamma means action done on purpose. Good actions of body, speech and mind bring happy results later; bad actions bring unhappy results.', q: 'What do good actions bring?', right: 'Happy results', wrong: 'Unhappy results' },
];
const shuffled = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const makeSchoolRounds = () => {
  const nLive = Math.random() < 0.5 ? 3 : 4; // 3 or 4 livelihood lessons, the rest Dhamma
  const pick = (kind, n) => shuffled(SCHOOL_LESSONS.filter(l => l.kind === kind)).slice(0, n);
  return shuffled([...pick('Livelihood', nLive), ...pick('Dhamma', SCHOOL_ROUNDS - nLive)]).map(l => ({ ...l, flip: Math.random() < 0.5 }));
};
export const SchoolOfSkillsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(makeSchoolRounds);
  const [r, setR] = useState(0);
  const [phase, setPhase] = useState('learn');   // learn | quiz | result
  const [picked, setPicked] = useState(null);    // 'right' | 'wrong'
  const [results, setResults] = useState([]);    // true / false for each lesson
  const [won, setWon] = useState([]);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const soundRef = useRef(null);
  const total = won.reduce((a, b) => a + b, 0);
  const learned = results.filter(Boolean).length;
  const it = rounds[r];

  // after the answer is shown: next lesson, or the end
  useEffect(() => {
    if (finished || phase !== 'result') return undefined;
    const t = setTimeout(() => {
      if (r + 1 >= SCHOOL_ROUNDS) setFinished(true);
      else { setR(r + 1); setPhase('learn'); setPicked(null); }
    }, SCHOOL_RESULT_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]);

  const answer = (isRight) => {
    if (phase !== 'quiz') return;
    const coins = isRight ? Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)) : 0;
    if (coins > 0) playCoinSound(soundRef);
    setPicked(isRight ? 'right' : 'wrong');
    setResults(x => [...x, isRight]);
    setWon(w => [...w, coins]);
    setPhase('result');
  };
  const lastCoins = won[won.length - 1] || 0;
  const options = it ? (it.flip ? [['wrong', it.wrong], ['right', it.right]] : [['right', it.right], ['wrong', it.wrong]]) : [];
  const isLivelihood = it && it.kind === 'Livelihood';

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#e0f2fe 0%,#fef9c3 100%)' }}>
      <style>{`
        @keyframes schoolIn { 0% { transform: translateY(-24px) scale(.7); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes schoolUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-40px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-sky-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🎓 School of many skills</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the skills learned so far, on a shelf */}
      <div className="absolute inset-x-0 flex items-center justify-center gap-1 flex-wrap px-4" style={{ top: 62, zIndex: 4 }}>
        {Array.from({ length: SCHOOL_ROUNDS }, (_, i) => (
          <span key={i} className="select-none rounded-full flex items-center justify-center" style={{ width: 'clamp(26px, 6vmin, 36px)', height: 'clamp(26px, 6vmin, 36px)', background: i < results.length ? (results[i] ? '#86efac' : '#fecaca') : (i === r ? '#fde047' : 'rgba(255,255,255,.7)'), fontSize: 'clamp(14px, 3.4vmin, 20px)' }}>{i < results.length ? rounds[i].emoji : ''}</span>
        ))}
      </div>
      {!finished && it && (
        <div key={r} className="absolute left-1/2 text-center" style={{ top: 112, transform: 'translateX(-50%)', width: 'min(92%, 440px)', zIndex: 5, animation: 'schoolIn .4s ease-out' }}>
          <div className="select-none" style={{ fontSize: 'clamp(54px, 12vmin, 90px)', lineHeight: 1 }}>{it.emoji}</div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="font-extrabold text-sm rounded-full px-3 py-0.5 shadow bg-white" style={{ color: '#78350f' }}>{it.title}</span>
            <span className="font-bold text-xs rounded-full px-2 py-0.5 shadow text-white" style={{ background: isLivelihood ? '#d97706' : '#7c3aed' }}>{isLivelihood ? '🛠️ Livelihood' : '☸️ Dhamma'}</span>
          </div>
          {phase === 'learn' && (
            <>
              <div className="mt-3 bg-white text-gray-800 font-semibold text-sm sm:text-base rounded-2xl px-4 py-3 shadow-lg text-left">{it.teach}</div>
              <div className="mt-4 flex justify-center">
                <GameButton onClick={() => setPhase('quiz')} className="bg-emerald-500 hover:bg-emerald-600 text-white w-full max-w-[260px] text-lg">I learned it! →</GameButton>
              </div>
            </>
          )}
          {phase === 'quiz' && (
            <>
              <div className="mt-3 bg-white text-gray-800 font-bold text-sm sm:text-base rounded-2xl px-4 py-3 shadow-lg">{it.q}</div>
              <div className="mt-3 flex flex-col gap-3 items-center">
                {options.map(([k, label]) => (
                  <GameButton key={k} onClick={() => answer(k === 'right')} className="bg-sky-500 hover:bg-sky-600 text-white w-full max-w-[320px]">{label}</GameButton>
                ))}
              </div>
            </>
          )}
          {phase === 'result' && (
            <>
              <div className="mt-3 bg-white text-gray-800 font-bold text-sm sm:text-base rounded-2xl px-4 py-3 shadow-lg">
                {picked === 'right' ? `Well done! ${it.right}.` : `Not quite. The answer is: ${it.right}.`}
              </div>
              {lastCoins > 0 && <div className="font-black text-yellow-600 drop-shadow mt-2" style={{ animation: 'schoolUp 2s ease-out forwards' }}>+{lastCoins} 🪙</div>}
            </>
          )}
        </div>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{learned >= SCHOOL_ROUNDS ? '🎓' : '📖'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{learned >= SCHOOL_ROUNDS ? 'You learned every skill!' : `You learned ${learned} of ${SCHOOL_ROUNDS} skills`}</h2>
            <p className="text-sm text-gray-600 mb-2">A good living and a good heart go together. Skills help us look after our family, and the Dhamma helps us look after our mind.</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 18: the ten wrong deeds and the ten right deeds (duccarita and sucarita: 3 of body, 4 of speech, 3 of mind). Seven rounds (of the ten pairs), one
// for each pair: a bad deed and its good opposite (killing / protecting life, stealing / guarding others' things, ...) are thrown up
// from the two sides in arcs and fall back down, like the heron game. Tap the GOOD deed while it flies for 2 or 3 coins. Tapping the
// bad deed, or being too slow, gives no coins; the box then says which was which, so the child learns the ten pairs.
const TEN_ROUNDS = 7; // seven pairs per game, picked at random from the ten
const TEN_ASK_MS = 5000;
const TEN_RESULT_MS = 2600;
const TEN_PAIRS = [
  { part: 'Body', badName: 'Killing (pāṇātipāta)', goodName: 'Protecting life (the opposite of killing)', bad: ['🗡️', 'Killing'], good: ['🕊️', 'Helping others live long'] },
  { part: 'Body', badName: 'Stealing (adinnādāna)', goodName: 'Guarding other people\'s things (the opposite of stealing)', bad: ['🦹', 'Stealing'], good: ['🛡️', 'Guarding others\' things'] },
  { part: 'Body', badName: 'Sexual misconduct (kāmesumicchācāra)', goodName: 'Respecting other people\'s families (the opposite of misconduct)', bad: ['💔', 'Misconduct with others\' families'], good: ['🏠', 'Respecting others\' families'] },
  { part: 'Speech', badName: 'Lying (musāvāda)', goodName: 'Telling the truth (the opposite of lying)', bad: ['🤥', 'Lying'], good: ['🗣️', 'Telling the truth'] },
  { part: 'Speech', badName: 'Slander (pisuṇāvācā)', goodName: 'Words that unite friends (the opposite of slander)', bad: ['🐍', 'Words that divide friends'], good: ['🤝', 'Words that unite friends'] },
  { part: 'Speech', badName: 'Harsh speech (pharusāvācā)', goodName: 'Gentle, kind words (the opposite of harsh speech)', bad: ['😠', 'Harsh, rude words'], good: ['🌸', 'Gentle, kind words'] },
  { part: 'Speech', badName: 'Idle chatter (samphappalāpa)', goodName: 'Useful, meaningful words (the opposite of idle chatter)', bad: ['💬', 'Idle, useless chatter'], good: ['📖', 'Useful, meaningful words'] },
  { part: 'Mind', badName: 'Greed (abhijjhā)', goodName: 'Contentment and giving (the opposite of greed)', bad: ['🤑', 'Wanting others\' things'], good: ['🎁', 'Contentment and giving'] },
  { part: 'Mind', badName: 'Ill-will (byāpāda)', goodName: 'Loving-kindness (the opposite of ill-will)', bad: ['🔥', 'Anger and ill-will'], good: ['💗', 'Loving-kindness'] },
  { part: 'Mind', badName: 'Wrong view (micchādiṭṭhi)', goodName: 'Right view: kamma is real (the opposite of wrong view)', bad: ['🌫️', 'Wrong view'], good: ['☸️', 'Right view: kamma is real'] },
];
const PART_EMOJI = { Body: '🧍', Speech: '🗣️', Mind: '🧠' };
const makeTenRounds = (pairs) => () => {
  const items = [...pairs];
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items.slice(0, TEN_ROUNDS).map(x => ({ ...x, flip: Math.random() < 0.5 })); // which one is thrown up from the left
};
// the same game for any list of ten good/bad pairs; cfg = { pairs, title, partText(pair), prompt, doneAll, doneSome(n), doneText }
const ArcDeedsGame = ({ cfg, onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(makeTenRounds(cfg.pairs));
  const [r, setR] = useState(0);
  const [phase, setPhase] = useState('ask');      // ask | result
  const [outcome, setOutcome] = useState(null);   // good | bad | late
  const [outcomes, setOutcomes] = useState([]);
  const [won, setWon] = useState([]);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const soundRef = useRef(null);
  const total = won.reduce((a, b) => a + b, 0);
  const goodCount = outcomes.filter(o => o === 'good').length;
  const it = rounds[r];

  // too slow: nothing is chosen, no coins
  useEffect(() => {
    if (finished || phase !== 'ask') return undefined;
    const t = setTimeout(() => settle('late', 0), TEN_ASK_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]); // eslint-disable-line react-hooks/exhaustive-deps
  // after the result is shown: next pair, or the end
  useEffect(() => {
    if (finished || phase !== 'result') return undefined;
    const t = setTimeout(() => {
      if (r + 1 >= TEN_ROUNDS) setFinished(true);
      else { setR(r + 1); setPhase('ask'); setOutcome(null); }
    }, TEN_RESULT_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]);

  function settle(kind, coins) {
    setOutcome(kind);
    setOutcomes(o => [...o, kind]);
    setWon(w => [...w, coins]);
    setPhase('result');
  }
  const choose = (isGood) => {
    if (phase !== 'ask') return;
    if (isGood) { settle('good', Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total))); playCoinSound(soundRef); }
    else settle('bad', 0);
  };
  const lastCoins = won[won.length - 1] || 0;
  const message = it ? {
    good: `Well done! ${it.goodName}.`,
    bad: `That is the wrong deed: ${it.badName}. The good deed is: ${it.goodName}.`,
    late: `Too slow. The wrong deed was ${it.badName}. The good deed is: ${it.goodName}.`,
  }[outcome] || '' : '';

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#312e81 0%,#6d28d9 45%,#f0abfc 100%)' }}>
      <style>{`
        @keyframes tenBar { 0% { width: 100% } 100% { width: 0% } }
        @keyframes tenIn { 0% { transform: translateY(-24px) scale(.8); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes tenArcA { 0% { left: 22%; top: 94%; animation-timing-function: cubic-bezier(.2,.7,.4,1) } 45% { left: 28%; top: var(--peak); animation-timing-function: cubic-bezier(.6,0,.8,.3) } 100% { left: 34%; top: 94% } }
        @keyframes tenArcB { 0% { left: 78%; top: 94%; animation-timing-function: cubic-bezier(.2,.7,.4,1) } 45% { left: 72%; top: var(--peak); animation-timing-function: cubic-bezier(.6,0,.8,.3) } 100% { left: 66%; top: 94% } }
        @keyframes tenUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-40px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/85 text-violet-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">{cfg.title}</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the ten pairs: green = the good deed was chosen, red = missed */}
      <div className="absolute inset-x-0 flex items-center justify-center gap-1 px-3" style={{ top: 62, zIndex: 4 }}>
        {Array.from({ length: TEN_ROUNDS }, (_, i) => (
          <span key={i} className="rounded-full" style={{ width: 'clamp(14px, 4vmin, 22px)', height: 'clamp(14px, 4vmin, 22px)', background: i < outcomes.length ? (outcomes[i] === 'good' ? '#4ade80' : '#f87171') : (i === r ? '#fde047' : 'rgba(255,255,255,.55)') }} />
        ))}
      </div>
      {!finished && it && (
        <>
          <div key={r} className="absolute left-1/2 text-center" style={{ top: '14%', transform: 'translateX(-50%)', width: 'min(92%, 420px)', zIndex: 5, animation: 'tenIn .4s ease-out' }}>
            <div className="select-none" style={{ fontSize: 'clamp(44px, 11vmin, 80px)', lineHeight: 1 }}>{it.icon || PART_EMOJI[it.part]}</div>
            <div className="mt-1 font-bold text-xs rounded-full px-3 py-0.5 inline-block shadow bg-white" style={{ color: '#5b21b6' }}>{cfg.partText(it)}</div>
            <div className="mt-2 bg-white text-gray-800 font-bold text-sm sm:text-base rounded-2xl px-4 py-3 shadow-lg">{phase === 'ask' ? cfg.prompt : message}</div>
            {phase === 'result' && lastCoins > 0 && <div className="font-black text-yellow-300 drop-shadow mt-1" style={{ animation: 'tenUp 2s ease-out forwards' }}>+{lastCoins} 🪙</div>}
          </div>
          {phase === 'ask' && (
            <>
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden bg-white/50" style={{ top: 92, width: 'min(80%, 360px)', height: 8, zIndex: 5 }}>
                <div key={r} className="h-full bg-yellow-300" style={{ animation: `tenBar ${TEN_ASK_MS}ms linear forwards` }} />
              </div>
              {/* the good deed and the bad deed are thrown up from the bottom in arcs, one from each side, and fall back down on the same side */}
              {[{ good: true, d: it.good, cls: 'bg-emerald-500', peak: '52%' }, { good: false, d: it.bad, cls: 'bg-rose-500', peak: '60%' }].map((a, k) => (
                <button
                  key={`${r}-${a.good}`}
                  onClick={() => choose(a.good)}
                  className="absolute font-extrabold text-white rounded-2xl shadow-xl px-3 py-2 text-center leading-tight bg-indigo-500"
                  style={{ zIndex: 6, transform: 'translate(-50%,-50%)', width: 'clamp(120px, 38vw, 170px)', fontSize: 'clamp(12px, 3.2vw, 15px)', '--peak': a.peak, animation: `${(k === 0) !== it.flip ? 'tenArcA' : 'tenArcB'} ${TEN_ASK_MS}ms linear forwards` }}
                ><span className="block text-2xl">{a.d[0]}</span>{a.d[1]}</button>
              ))}
            </>
          )}
        </>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{goodCount >= TEN_ROUNDS ? '🌟' : '☸️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{goodCount >= TEN_ROUNDS ? cfg.doneAll : cfg.doneSome(goodCount)}</h2>
            <p className="text-sm text-gray-600 mb-2">{cfg.doneText}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

export const TenDeedsGame = (props) => <ArcDeedsGame cfg={{
  pairs: TEN_PAIRS, title: '☸️ Ten wrong, ten right deeds', partText: (it) => `Deeds of the ${it.part.toLowerCase()}`, prompt: 'Tap the GOOD deed before it falls!',
  doneAll: 'All seven good deeds!', doneSome: (n) => `${n} of ${TEN_ROUNDS} good deeds chosen`,
  doneText: 'Three deeds of the body, four of the speech and three of the mind. Leave the wrong deeds, do the right deeds, and your life becomes happy.',
}} {...props} />;

// ---------------------------------------------------------------------------------------------------------------
// Game 19: the ten ways of making merit (puñña-kiriya-vatthu), played like game 18. Each way is thrown up beside its opposite
// (giving / greed, morality / misconduct, calming the mind / laziness, respect / rudeness, helping at home / only playing, sharing
// merit / not wanting others to get merit, rejoicing / jealousy, learning the Dhamma / learning wrong deeds, explaining the Dhamma / teaching others wrong deeds,
// right view / wrong view). Tap the way of making merit for 2 or 3 coins.
const MERIT_PAIRS = [
  { icon: '🎁', part: 'Dana', badName: 'Greed and stinginess', goodName: 'Giving (dāna)', bad: ['🤑', 'Wanting everything for myself'], good: ['🎁', 'Giving to others (dāna)'] },
  { icon: '🙏', part: 'Sila', badName: 'Breaking the precepts, doing wrong deeds', goodName: 'Good conduct (sīla)', bad: ['⚠️', 'Doing wrong deeds'], good: ['🙏', 'Keeping good conduct (sīla)'] },
  { icon: '🧘', part: 'Bhavana', badName: 'Laziness', goodName: 'Calming the mind by meditation (bhāvanā)', bad: ['😴', 'Being lazy'], good: ['🧘', 'Calming the mind (bhāvanā)'] },
  { icon: '🧎', part: 'Apacayana', badName: 'Rudeness', goodName: 'Respecting parents and elders (apacāyana)', bad: ['😤', 'Being rude to elders'], good: ['🧎', 'Respecting parents and elders'] },
  { icon: '🧹', part: 'Veyyavacca', badName: 'Only wanting to play', goodName: 'Helping with the housework (veyyāvacca)', bad: ['🎮', 'Only wanting to play'], good: ['🧹', 'Helping with the housework'] },
  { icon: '🤲', part: 'Pattidana', badName: 'Not wanting others to receive merit', goodName: 'Sharing merit with others (pattidāna)', bad: ['🔒', 'Not wanting others to get merit'], good: ['🤲', 'Sharing merit with everyone'] },
  { icon: '😊', part: 'Pattanumodana', badName: 'Jealousy', goodName: 'Rejoicing in the good deeds of others (pattānumodanā)', bad: ['😒', 'Being jealous of others'], good: ['😊', 'Rejoicing in good deeds of others'] },
  { icon: '👂', part: 'Dhammassavana', badName: 'Learning wrong deeds', goodName: 'Learning the Dhamma (dhammassavana)', bad: ['🙉', 'Learning wrong deeds'], good: ['👂', 'Learning the Dhamma'] },
  { icon: '📢', part: 'Dhammadesana', badName: 'Teaching others wrong deeds', goodName: 'Explaining the Dhamma to others (dhammadesanā)', bad: ['🤐', 'Teaching others wrong deeds'], good: ['📢', 'Explaining the Dhamma to others'] },
  { icon: '☸️', part: 'Ditthujukamma', badName: 'Wrong view', goodName: 'Straightening the view: knowing that kamma is real (diṭṭhujukamma)', bad: ['🌫️', 'Believing kamma is nothing'], good: ['☸️', 'Right view: kamma is real'] },
];
export const TenMeritGame = (props) => <ArcDeedsGame cfg={{
  pairs: MERIT_PAIRS, title: '🪷 Ten ways to make merit', partText: (it) => `Making merit: ${it.part}`, prompt: 'Tap the way to make MERIT before it falls!',
  doneAll: 'All seven ways of merit!', doneSome: (n) => `${n} of ${TEN_ROUNDS} ways of merit chosen`,
  doneText: 'Giving, good conduct, meditation, respect, service, sharing merit, rejoicing, listening, teaching and straight view: ten ways to make merit and a happy life.',
}} {...props} />;

// ---------------------------------------------------------------------------------------------------------------
// Game 20: the tiger in the trap (do not trust sad stories and big promises). A tiger is caught in a trap and begs the passer-by
// (the child) to let it out with a different plea each time (seven in all, e.g. "I will not eat you", "my cubs are waiting"). Two
// answers are thrown up in arcs from the two sides, like the heron game: "Save the tiger" or "Do not save it". Not saving gives 2 or
// 3 coins (you stay safe). Saving costs nothing but the coins: the tiger breaks its promise and chases the child away (nothing cruel
// is shown). No answer in time: nothing happens, no coins. The end screen links it to today's tricksters who beg for pity.
const TIGER_ROUNDS = 7;
const TIGER_ASK_MS = 5500;
const TIGER_RESULT_MS = 2300;
const TIGER_PLEAS = [
  'Please save me! I promise I will never eat you!',
  'I am so hungry and weak... I am only a poor tiger. Please help me!',
  'Pull me out and I will be your friend forever!',
  'Look at my tears. I am so sorry for my bad deeds. I have changed!',
  'My little cubs are waiting for me at home. Have pity on me!',
  'I swear on all the gods, I will never hurt you!',
  'You are so kind and good. Only a kind person like you can save me!',
];
const makeTigerRounds = () => {
  const items = TIGER_PLEAS.map(says => ({ says }));
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items.map(x => ({ ...x, flip: Math.random() < 0.5 })); // which answer comes up on the left
};
export const TigerInTrapGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(makeTigerRounds);
  const [r, setR] = useState(0);
  const [phase, setPhase] = useState('ask');       // ask | result
  const [outcome, setOutcome] = useState(null);    // wise | fooled | late
  const [outcomes, setOutcomes] = useState([]);
  const [won, setWon] = useState([]);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const soundRef = useRef(null);
  const total = won.reduce((a, b) => a + b, 0);
  const fooled = outcomes.filter(o => o === 'fooled').length;
  const it = rounds[r];

  // the time to choose runs out: nothing is decided, no coins
  useEffect(() => {
    if (finished || phase !== 'ask') return undefined;
    const t = setTimeout(() => settle('late', 0), TIGER_ASK_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]); // eslint-disable-line react-hooks/exhaustive-deps
  // after the result is shown: next plea, or the end
  useEffect(() => {
    if (finished || phase !== 'result') return undefined;
    const t = setTimeout(() => {
      if (r + 1 >= TIGER_ROUNDS) setFinished(true);
      else { setR(r + 1); setPhase('ask'); setOutcome(null); }
    }, TIGER_RESULT_MS);
    return () => clearTimeout(t);
  }, [r, phase, finished]);

  function settle(kind, coins) {
    setOutcome(kind);
    setOutcomes(o => [...o, kind]);
    setWon(w => [...w, coins]);
    setPhase('result');
  }
  const choose = (save) => {
    if (phase !== 'ask') return;
    if (save) settle('fooled', 0);
    else { settle('wise', Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total))); playCoinSound(soundRef); }
  };
  const lastCoins = won[won.length - 1] || 0;
  const message = {
    wise: 'You did not save it. Good! A tiger stays a tiger, and sweet words are not a reason to trust it.',
    fooled: `Oh no! The tiger broke its promise and chased you away! You were fooled ${fooled} ${fooled === 1 ? 'time' : 'times'}. Do not trust sad stories and big promises!`,
    late: 'Too slow to decide. The tiger is still in the trap, for now.',
  }[outcome] || '';

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bbf7d0 0%,#86efac 40%,#a16207 40%,#78350f 100%)' }}>
      <style>{`
        @keyframes tigerBar { 0% { width: 100% } 100% { width: 0% } }
        @keyframes tigerIn { 0% { transform: translateY(-30px) scale(.6); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes tigerArcA { 0% { left: 22%; top: 94%; animation-timing-function: cubic-bezier(.2,.7,.4,1) } 45% { left: 28%; top: var(--peak); animation-timing-function: cubic-bezier(.6,0,.8,.3) } 100% { left: 34%; top: 94% } }
        @keyframes tigerArcB { 0% { left: 78%; top: 94%; animation-timing-function: cubic-bezier(.2,.7,.4,1) } 45% { left: 72%; top: var(--peak); animation-timing-function: cubic-bezier(.6,0,.8,.3) } 100% { left: 66%; top: 94% } }
        @keyframes tigerUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-40px); opacity: 0 } }
        @keyframes tigerShake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-emerald-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🐯 The tiger in the trap</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none bg-white font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%', color: fooled > 0 ? '#b91c1c' : '#047857', zIndex: 6 }}>{fooled > 0 ? `😢 Fooled ${fooled} ${fooled === 1 ? 'time' : 'times'}` : '🛡️ Not fooled yet'}</div>
      {/* the trap: a deep pit with the tiger inside, and the passer-by standing at the edge */}
      <div className="absolute left-1/2 -translate-x-1/2 rounded-[50%] flex items-center justify-center" style={{ bottom: '26%', width: 'min(70%, 300px)', height: 'clamp(60px, 13vh, 100px)', background: 'radial-gradient(circle at 50% 40%, #44403c, #1c1917)', border: '5px solid #92400e', boxShadow: 'inset 0 4px 12px rgba(0,0,0,.5)' }}>
        <span className="select-none" style={{ fontSize: 'clamp(30px, 8vmin, 54px)', animation: !finished && phase === 'ask' ? 'tigerShake 1.2s ease-in-out infinite' : 'none' }}>{phase === 'result' && outcome === 'fooled' ? '🐅' : '🐯'}</span>
      </div>
      <span className="absolute select-none" style={{ left: 'calc(50% + min(35%, 150px) - 8px)', bottom: '30%', fontSize: 'clamp(28px, 7vmin, 46px)' }}>🧑</span>
      {!finished && it && (
        <>
          <div key={r} className="absolute left-1/2 text-center" style={{ top: '13%', transform: 'translateX(-50%)', width: 'min(90%, 420px)', zIndex: 5, animation: 'tigerIn .4s ease-out' }}>
            <div className="select-none" style={{ fontSize: 'clamp(54px, 13vmin, 100px)', lineHeight: 1 }}>{phase === 'result' && outcome === 'fooled' ? '😾' : (phase === 'result' && outcome === 'wise' ? '😿' : '🐯')}</div>
            <div className="mt-1 font-bold text-xs rounded-full px-2 py-0.5 inline-block shadow bg-white" style={{ color: '#78350f' }}>Tiger in the trap</div>
            <div className="mt-2 bg-white text-gray-800 font-bold text-sm sm:text-base rounded-2xl px-4 py-3 shadow-lg">{phase === 'ask' ? `“${it.says}”` : message}</div>
            {phase === 'result' && lastCoins > 0 && <div className="font-black text-yellow-600 drop-shadow mt-1" style={{ animation: 'tigerUp 1.8s ease-out forwards' }}>+{lastCoins} 🪙</div>}
          </div>
          {phase === 'ask' && (
            <>
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden bg-white/60" style={{ top: '62%', width: 'min(80%, 360px)', height: 10, zIndex: 5 }}>
                <div key={r} className="h-full bg-red-500" style={{ animation: `tigerBar ${TIGER_ASK_MS}ms linear forwards` }} />
              </div>
              {/* the two answers are thrown up from the bottom in arcs, one from each side, and fall back down on the same side */}
              {[{ save: true, label: '🪢 Save the tiger', cls: 'bg-emerald-500', peak: '50%' }, { save: false, label: '🙅 Do not save it', cls: 'bg-rose-500', peak: '58%' }].map((a, k) => (
                <button
                  key={`${r}-${a.save}`}
                  onClick={() => choose(a.save)}
                  className={`absolute font-extrabold text-white rounded-full shadow-xl px-3 py-3 text-center leading-tight ${a.cls}`}
                  style={{ zIndex: 6, transform: 'translate(-50%,-50%)', width: 'clamp(120px, 38vw, 170px)', fontSize: 'clamp(13px, 3.4vw, 16px)', '--peak': a.peak, animation: `${(k === 0) !== it.flip ? 'tigerArcA' : 'tigerArcB'} ${TIGER_ASK_MS}ms linear forwards` }}
                >{a.label}</button>
              ))}
            </>
          )}
        </>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{fooled === 0 ? '🛡️' : '🐯'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{fooled === 0 ? 'You were never fooled!' : `Fooled ${fooled} ${fooled === 1 ? 'time' : 'times'}`}</h2>
            <p className="text-sm text-gray-600 mb-2">Tricksters today beg for pity with sad stories, big promises and kind words, just like the tiger. Do not trust them quickly: think first, and ask a parent or teacher.</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 21: finish the proverb (English proverbs for students). The first half of a proverb is shown; pick the right second half
// out of two. A right answer gives 2 or 3 coins, shows the whole proverb with its meaning, and the next proverb comes. A wrong
// answer ends the game (the right ending is shown; the coins won so far are kept). Seven proverbs per game, picked at random from
// a bigger list; finish all seven and the end screen says so. To add proverbs: add a line [start, right ending, wrong ending, meaning].
const PROVERB_ROUNDS = 7;
const PROVERB_RESULT_MS = 2800;
const PROVERBS = [
  ['A stitch in time', 'saves nine.', 'makes a hole.', 'Fix a small problem at once, before it becomes a big one.'],
  ['Practice makes', 'perfect.', 'problems.', 'The more you practise, the better you become.'],
  ['Slow and steady', 'wins the race.', 'loses the race.', 'Work carefully and keep going; do not rush.'],
  ['Honesty is', 'the best policy.', 'the hardest rule.', 'Telling the truth is always the wisest way.'],
  ['Where there is a will,', 'there is a way.', 'there is a wall.', 'If you really want to do something, you will find a way.'],
  ['Look before', 'you leap.', 'you sleep.', 'Think carefully before you act.'],
  ['Rome was not built', 'in a day.', 'with one stone.', 'Big things take a long time and many steps.'],
  ['Actions speak', 'louder than words.', 'softer than whispers.', 'What you do matters more than what you say.'],
  ['Early to bed and early to rise', 'makes a man healthy, wealthy and wise.', 'makes a man tired and shy.', 'Good daily habits bring a good life.'],
  ['Do not count your chickens', 'before they hatch.', 'before breakfast.', 'Do not be sure of something before it has really happened.'],
  ['Every cloud has', 'a silver lining.', 'a thunderbolt.', 'There is something good even in a sad or hard time.'],
  ['A friend in need is', 'a friend indeed.', 'a friend to avoid.', 'A true friend helps you when you are in trouble.'],
  ['Better late', 'than never.', 'than early.', 'It is better to do something late than not to do it at all.'],
  ['Two heads are', 'better than one.', 'too many to think.', 'Two people thinking together can solve a problem better.'],
  ['The early bird', 'catches the worm.', 'sleeps till noon.', 'Those who start early get the best chance.'],
  ['Do not judge a book', 'by its cover.', 'by its length.', 'Do not judge people or things by how they look.'],
  ['All that glitters is', 'not gold.', 'pure gold.', 'Something that looks beautiful may not be valuable.'],
  ['Many hands', 'make light work.', 'make more mess.', 'A job is easy when many people help.'],
  ['A rolling stone', 'gathers no moss.', 'grows very tall.', 'A person who keeps moving from place to place and job to job gains little.'],
  ['Birds of a feather', 'flock together.', 'fly alone.', 'People with the same nature stay together.'],
  ['Prevention is', 'better than cure.', 'worse than cure.', 'It is better to stop a problem than to fix it later.'],
  ['Do not put all your eggs', 'in one basket.', 'in the river.', 'Do not risk everything on one thing.'],
  ['If at first you do not succeed,', 'try, try again.', 'give up and rest.', 'Do not give up; keep trying.'],
  ['Knowledge is', 'power.', 'a burden.', 'Learning makes you strong and wise.'],
  ['Time and tide', 'wait for no man.', 'wait for everyone.', 'Time does not stop for anyone, so use it well.'],
  ['Too many cooks', 'spoil the broth.', 'cook it faster.', 'Too many people in charge of one job can spoil it.'],
  ['Waste not,', 'want not.', 'want more.', 'If you do not waste things, you will always have enough.'],
  ['A penny saved is', 'a penny earned.', 'a penny lost.', 'Saving money is as good as earning it.'],
  ['Little strokes', 'fell great oaks.', 'plant small seeds.', 'Small steps, kept up for long, can do great things.'],
  ['Empty vessels make', 'the most noise.', 'the best music.', 'People who know little often talk the loudest.'],
  ['As you sow,', 'so shall you reap.', 'so shall you sleep.', 'What you do now will come back to you as your result.'],
  ['Do not cry over', 'spilt milk.', 'a good meal.', 'Do not be sad about what is done and cannot be changed.'],
  ['The pen is mightier than', 'the sword.', 'the paper.', 'Words and ideas are stronger than force.'],
  ['Well begun is', 'half done.', 'never done.', 'A good start makes the rest of the job easier.'],
  ['Laughter is', 'the best medicine.', 'a bad habit.', 'Being happy and laughing helps us feel well.'],
  ['Strike while', 'the iron is hot.', 'the sun is high.', 'Act at the right moment, while the chance is there.'],
  ['Health is', 'wealth.', 'no use.', 'Being healthy is worth more than money.'],
  ['Patience is', 'a virtue.', 'a waste of time.', 'Waiting calmly is a good quality.'],
  ['No pain,', 'no gain.', 'no rain.', 'You must work hard to get good results.'],
  ['A bad workman', 'blames his tools.', 'uses the best tools.', 'Someone who does a poor job blames anything but himself.'],
  ['Beggars cannot be', 'choosers.', 'singers.', 'If you are given a gift, do not complain about it.'],
  ['One good turn', 'deserves another.', 'ends the story.', 'If someone helps you, help them in return.'],
  ['Better safe', 'than sorry.', 'than rich.', 'Be careful now so you do not regret it later.'],
  ['Where there is smoke,', 'there is fire.', 'there is rain.', 'Rumours usually have some reason behind them.'],
  ['Honesty and kindness', 'cost nothing but are worth everything.', 'are only for the weak.', 'Being honest and kind costs you nothing and gives a lot.'],
];
const PROVERB_PICS = { // start of the proverb -> [picture of the right ending, picture of the wrong ending]
  'A stitch in time': ['🧵', '🕳️'],
  'Practice makes': ['🏆', '🤯'],
  'Slow and steady': ['🐢🏆', '🐢😢'],
  'Honesty is': ['😇👍', '😰'],
  'Where there is a will,': ['🛤️', '🧱'],
  'Look before': ['👀🏃', '😴'],
  'Rome was not built': ['🏛️📅', '🪨'],
  'Actions speak': ['🔊', '🤫'],
  'Early to bed and early to rise': ['💪💰🧠', '😴😳'],
  'Do not count your chickens': ['🥚🐣', '🍳'],
  'Every cloud has': ['☁️✨', '⚡'],
  'A friend in need is': ['🤝', '🏃💨'],
  'Better late': ['🏃⏰', '🌅'],
  'Two heads are': ['🧠🧠', '😵‍💫'],
  'The early bird': ['🐦🪱', '😴🌞'],
  'Do not judge a book': ['📕', '📏'],
  'All that glitters is': ['🪨✨', '🥇'],
  'Many hands': ['🙌😊', '🗑️'],
  'A rolling stone': ['🪨💨', '📈'],
  'Birds of a feather': ['🐦🐦🐦', '🐦'],
  'Prevention is': ['🛡️', '🤒'],
  'Do not put all your eggs': ['🥚🧺', '🥚🌊'],
  'If at first you do not succeed,': ['🔁💪', '🏳️'],
  'Knowledge is': ['📚⚡', '🎒😩'],
  'Time and tide': ['⏳🌊', '⏳👥'],
  'Too many cooks': ['👨‍🍳👩‍🍳🥣', '⏩🍳'],
  'Waste not,': ['🍚✅', '🛍️'],
  'A penny saved is': ['🪙💰', '🪙😢'],
  'Little strokes': ['🪓🌳', '🌱'],
  'Empty vessels make': ['🥁🔊', '🎻'],
  'As you sow,': ['🌾', '😴'],
  'Do not cry over': ['🥛😢', '🍽️'],
  'The pen is mightier than': ['⚔️', '📄'],
  'Well begun is': ['🏁', '♾️'],
  'Laughter is': ['😂💊', '🙈'],
  'Strike while': ['🔨🔥', '☀️'],
  'Health is': ['💪💎', '🚫'],
  'Patience is': ['🧘', '🗑️⏰'],
  'No pain,': ['💪🏅', '🌧️'],
  'A bad workman': ['🔧😤', '🧰✨'],
  'Beggars cannot be': ['🙏🎁', '🎤'],
  'One good turn': ['🤝🔄', '🔚'],
  'Better safe': ['⛑️', '💰'],
  'Where there is smoke,': ['🔥💨', '🌧️'],
  'Honesty and kindness': ['💝', '💪🚫'],
};
const makeProverbRounds = () => {
  const items = [...PROVERBS];
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items.slice(0, PROVERB_ROUNDS).map(([start, right, wrong, meaning]) => { const pic = PROVERB_PICS[start] || ['✅', '❌']; return { start, right, wrong, meaning, rightPic: pic[0], wrongPic: pic[1], flip: Math.random() < 0.5 }; });
};
export const FinishProverbGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [rounds] = useState(makeProverbRounds);
  const [r, setR] = useState(0);
  const [phase, setPhase] = useState('ask');      // ask | result
  const [ok, setOk] = useState(true);             // was the last answer right
  const [won, setWon] = useState([]);             // coins per right answer
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const soundRef = useRef(null);
  const total = won.reduce((a, b) => a + b, 0);
  const rightCount = won.length;                  // one entry per right answer
  const it = rounds[r];

  // after the whole proverb is shown: the next one, or the end (a wrong answer ends the game)
  useEffect(() => {
    if (finished || phase !== 'result') return undefined;
    const t = setTimeout(() => {
      if (!ok || r + 1 >= PROVERB_ROUNDS) setFinished(true);
      else { setR(r + 1); setPhase('ask'); }
    }, PROVERB_RESULT_MS);
    return () => clearTimeout(t);
  }, [r, phase, ok, finished]);

  const choose = (isRight) => {
    if (phase !== 'ask') return;
    setOk(isRight);
    if (isRight) {
      const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total));
      setWon(w => [...w, coins]);
      if (coins > 0) playCoinSound(soundRef);
    }
    setPhase('result');
  };
  const lastCoins = ok ? (won[won.length - 1] || 0) : 0;
  const options = it ? (it.flip ? [[false, it.wrong, it.wrongPic], [true, it.right, it.rightPic]] : [[true, it.right, it.rightPic], [false, it.wrong, it.wrongPic]]) : [];

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fef3c7 0%,#fde68a 100%)' }}>
      <style>{`
        @keyframes proverbIn { 0% { transform: translateY(-24px) scale(.8); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        @keyframes proverbUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-40px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/85 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">📜 Finish the proverb</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* seven steps: green = finished right, red = the wrong answer that ended the game */}
      <div className="absolute inset-x-0 flex items-center justify-center gap-1 px-3" style={{ top: 62, zIndex: 4 }}>
        {Array.from({ length: PROVERB_ROUNDS }, (_, i) => (
          <span key={i} className="rounded-full" style={{ width: 'clamp(16px, 4.5vmin, 24px)', height: 'clamp(16px, 4.5vmin, 24px)', background: i < rightCount ? '#4ade80' : (i === r && phase === 'result' && !ok ? '#f87171' : (i === r && !finished ? '#f59e0b' : 'rgba(120,53,15,.25)')) }} />
        ))}
      </div>
      {!finished && it && (
        <div key={r} className="absolute left-1/2 text-center" style={{ top: 100, transform: 'translateX(-50%)', width: 'min(92%, 440px)', zIndex: 5, animation: 'proverbIn .4s ease-out' }}>
          <div className="select-none" style={{ fontSize: 'clamp(44px, 10vmin, 76px)', lineHeight: 1 }}>{phase === 'result' ? (ok ? it.rightPic : '🤔') : '📜'}</div>
          <div className="mt-3 bg-white text-amber-900 font-extrabold text-xl sm:text-2xl rounded-2xl px-4 py-4 shadow-lg" style={{ lineHeight: 1.3 }}>
            {it.start} <span style={{ color: phase === 'result' ? (ok ? '#047857' : '#b91c1c') : '#a8a29e' }}>{phase === 'result' ? it.right : '…'}</span>
          </div>
          {phase === 'ask' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {options.map(([good, label, pic]) => (
                <GameButton key={String(good)} onClick={() => choose(good)} className="bg-white hover:bg-amber-100 text-amber-900 border-4 border-amber-400 flex flex-col items-center justify-center gap-1 text-sm sm:text-base leading-tight">
                  <span className="select-none" style={{ fontSize: 'clamp(40px, 11vmin, 64px)', lineHeight: 1.1 }}>{pic}</span>
                  <span>{label}</span>
                </GameButton>
              ))}
            </div>
          )}
          {phase === 'result' && (
            <>
              <div className="mt-3 bg-white/90 text-gray-800 font-semibold text-sm sm:text-base rounded-2xl px-4 py-3 shadow">
                {ok ? 'Right! ' : 'Not quite. The proverb ends this way. '}<span className="font-bold">Meaning:</span> {it.meaning}
              </div>
              {lastCoins > 0 && <div className="font-black text-yellow-600 drop-shadow mt-2" style={{ animation: 'proverbUp 2s ease-out forwards' }}>+{lastCoins} 🪙</div>}
            </>
          )}
        </div>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{rightCount >= PROVERB_ROUNDS ? '🏆' : '📜'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{rightCount >= PROVERB_ROUNDS ? 'All seven proverbs finished!' : (rightCount > 0 ? `${rightCount} proverb${rightCount === 1 ? '' : 's'} finished` : 'Nice try!')}</h2>
            <p className="text-sm text-gray-600 mb-2">{rightCount >= PROVERB_ROUNDS ? 'You know your proverbs. Wise old sayings help us live well.' : 'A wrong ending stops the game, so think carefully before you choose. Try again later!'}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Game 22: the brave puppy. A Paccekabuddha lives in the forest, and his puppy goes to fetch his alms food. On the way, wild beasts
// (a tiger, a snake, a boar, a wolf, a bear, a leopard, a lion) hide in bushes, behind trees and rocks and pop out one after another.
// Tap the beast: the puppy runs up and barks "Woof!" and the beast runs away -- 2 or 3 coins. A beast that is not barked at in time
// slips back into hiding (no coins). Nothing is hurt or shown cruelly; seven beasts per game, same timing and coins as the birds.
const PUPPY_BEASTS = [
  { emoji: '🐅', name: 'tiger' }, { emoji: '🐍', name: 'snake' }, { emoji: '🐗', name: 'boar' }, { emoji: '🐺', name: 'wolf' },
  { emoji: '🐻', name: 'bear' }, { emoji: '🐆', name: 'leopard' }, { emoji: '🦁', name: 'lion' },
];
const PUPPY_SPOTS = [
  { x: 14, y: 30, hide: '🌳' }, { x: 84, y: 28, hide: '🌿' }, { x: 10, y: 48, hide: '🪨' }, { x: 88, y: 46, hide: '🌳' },
  { x: 20, y: 64, hide: '🌿' }, { x: 80, y: 62, hide: '🪨' }, { x: 30, y: 40, hide: '🌳' },
];
const PUPPY_COUNT = 7;
const PUPPY_FIRST_MS = 900;
const PUPPY_EVERY_MS = 1600;
const PUPPY_VISIBLE_MS = 3200;
const PUPPY_BEAST_SIZE = 'clamp(40px, 10vmin, 70px)';
const PUPPY_HIDE_SIZE = 'clamp(46px, 11vmin, 76px)';
export const BravePuppyGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [order] = useState(() => {   // which hiding place each beast uses (all different), and the beasts in a random order
    const a = PUPPY_SPOTS.map((_, i) => i), b = [...PUPPY_BEASTS];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return a.map((spot, i) => ({ spot, beast: b[i] }));
  });
  const [state, setState] = useState(() => Array(PUPPY_COUNT).fill('waiting')); // waiting | out | fled | missed
  const [won, setWon] = useState(() => Array(PUPPY_COUNT).fill(0));
  const [bark, setBark] = useState(null);       // index of the beast the puppy is barking at (for the "Woof!" bubble)
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const fled = state.filter(v => v === 'fled').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    for (let i = 0; i < PUPPY_COUNT; i++) {
      const start = PUPPY_FIRST_MS + i * PUPPY_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, k) => (k === i && v === 'waiting' ? 'out' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, k) => (k === i && v === 'out' ? 'missed' : v))), start + PUPPY_VISIBLE_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (finished || !state.every(v => v === 'fled' || v === 'missed')) return undefined;
    const t = setTimeout(() => setFinished(true), 1200);
    return () => clearTimeout(t);
  }, [state, finished]);

  const barkAt = (i) => {
    if (state[i] !== 'out') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, k) => (k === i ? 'fled' : v)));
    setWon(w => w.map((v, k) => (k === i ? coins : v)));
    setBark(i); setTimeout(() => setBark(b => (b === i ? null : b)), 1000);
    playCoinSound(soundRef);
  };
  // the puppy walks up the path a little with every beast sent away
  const puppyY = 84 - fled * 6;

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bbf7d0 0%,#86efac 45%,#4ade80 100%)' }}>
      <style>{`
        @keyframes puppyPop { 0% { transform: translate(-50%,10px) scale(.3); opacity: 0 } 60% { transform: translate(-50%,-6px) scale(1.15); opacity: 1 } 100% { transform: translate(-50%,0) scale(1); opacity: 1 } }
        @keyframes puppyRun { 0% { transform: translate(-50%,0) scale(1); opacity: 1 } 100% { transform: translate(var(--dx),-30px) scale(.5); opacity: 0 } }
        @keyframes puppyUp { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes puppyWag { 0%,100% { transform: translate(-50%,-50%) rotate(-6deg) } 50% { transform: translate(-50%,-50%) rotate(6deg) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-green-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🐕 The brave puppy</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the forest path up to the Paccekabuddha's hut */}
      <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: '16%', bottom: 0, width: 'clamp(44px, 12vmin, 90px)', background: 'linear-gradient(180deg,#d6b98c,#b8956a)', opacity: .85, zIndex: 1 }} />
      <div className="absolute text-center select-none" style={{ left: '50%', top: '7%', transform: 'translateX(-50%)', fontSize: 'clamp(30px, 8vmin, 56px)', zIndex: 2 }}>🛖🧘</div>
      <div className="absolute pointer-events-none bg-white/80 text-green-900 font-bold text-xs sm:text-sm rounded-full px-3 py-1 shadow" style={{ right: '3%', bottom: '3%' }}>🛡️ {fled} / {PUPPY_COUNT}</div>
      {/* hiding places and the beasts that pop out of them */}
      {order.map(({ spot, beast }, i) => {
        const sp = PUPPY_SPOTS[spot];
        const st = state[i];
        return (
          <React.Fragment key={i}>
            <span className="absolute select-none pointer-events-none" style={{ left: `${sp.x}%`, top: `${sp.y}%`, transform: 'translate(-50%,-50%)', fontSize: PUPPY_HIDE_SIZE, zIndex: 3 }}>{sp.hide}</span>
            {st === 'out' && (
              <button onClick={() => barkAt(i)} aria-label={`A ${beast.name}! Bark!`} className="absolute" style={{ left: `${sp.x}%`, top: `${sp.y - 7}%`, transform: 'translate(-50%,0)', zIndex: 5, padding: 12, animation: 'puppyPop .4s ease-out' }}>
                <span className="block select-none" style={{ fontSize: PUPPY_BEAST_SIZE, lineHeight: 1 }}>{beast.emoji}</span>
              </button>
            )}
            {st === 'fled' && (
              <>
                <span className="absolute pointer-events-none select-none" style={{ left: `${sp.x}%`, top: `${sp.y - 7}%`, '--dx': sp.x < 50 ? '-260%' : '160%', fontSize: PUPPY_BEAST_SIZE, zIndex: 5, animation: 'puppyRun .9s ease-in forwards' }}>{beast.emoji}💨</span>
                <div className="absolute pointer-events-none font-black text-yellow-600 drop-shadow whitespace-nowrap" style={{ left: `${sp.x}%`, top: `${sp.y - 12}%`, transform: 'translateX(-50%)', zIndex: 6, animation: 'puppyUp 1.6s ease-out forwards' }}>+{won[i]} 🪙</div>
              </>
            )}
          </React.Fragment>
        );
      })}
      {/* the puppy with the alms bowl, and its bark */}
      <div className="absolute select-none pointer-events-none" style={{ left: '50%', top: `${puppyY}%`, fontSize: 'clamp(40px, 10vmin, 70px)', lineHeight: 1, zIndex: 4, transition: 'top .8s ease', animation: 'puppyWag 1s ease-in-out infinite' }}>🐕🍲</div>
      {bark !== null && (
        <div className="absolute pointer-events-none bg-white text-gray-800 font-black rounded-2xl px-3 py-1 shadow-lg whitespace-nowrap" style={{ left: '50%', top: `${puppyY - 9}%`, transform: 'translateX(-50%)', zIndex: 7 }}>Woof! Woof! 🐶</div>
      )}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{fled >= PUPPY_COUNT ? '🐕' : '🧘'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{fled > 0 ? `${fled} beast${fled === 1 ? '' : 's'} sent away!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{fled >= PUPPY_COUNT
              ? 'The brave puppy kept the path safe and brought the alms food to the Paccekabuddha. Courage and loyalty protect those we love.'
              : (fled > 0 ? 'The puppy was brave and barked when the beasts came. Watch every hiding place to keep the path safe.' : 'Be quick: when a beast peeks out, tap it so the puppy can bark.')}</p>
            <p className="text-lg font-bold text-yellow-600 mb-4">{total > 0 ? `🪙 +${total} coins for your Shrine Room wallet` : (coinsLeft <= 0 ? 'You have already earned all the coins for this lesson. Great job!' : 'No coins this time.')}</p>
            <GameButton disabled={leaving} onClick={() => { setLeaving(true); onDone(total); }} className="bg-sky-500 hover:bg-sky-600 text-white w-full text-xl">Continue →</GameButton>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// The games, in the order they are handed out. A lesson always gets the same game (so a retake feels familiar and the
// coin cap stays one per lesson), but neighbouring lessons get different ones, so the break does not become boring.
// To add a game: write it above with the same two props and put it in this list.
export const QUIZ_BREAK_GAMES = [BirdRescueGame, FlowerOfferingGame, LitterPickingGame, AnimalRescueGame, WoodcutterAxeGame, AntGatheringGame, WaterAnimalsGame, HelpFriendsGame, PayRespectGame, TenGiftsGame, ReturnLostItemsGame, HelpParentsGame, AlmsRoundGame, GoldenEggDuckGame, CunningHeronGame, ShareWaterGame, SchoolOfSkillsGame, TenDeedsGame, TenMeritGame, TigerInTrapGame, FinishProverbGame, BravePuppyGame];
const hashOf = (s) => { let h = 0; String(s ?? '').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return h; };
export const quizBreakGameFor = (lessonId) => QUIZ_BREAK_GAMES[hashOf(lessonId) % QUIZ_BREAK_GAMES.length];
export const QuizBreakGame = ({ lessonId, ...rest }) => {
  const Game = quizBreakGameFor(lessonId);
  return <Game {...rest} />;
};

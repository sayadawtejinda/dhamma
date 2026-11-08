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
// Game 10: the ten kinds of giving (dana). People in need appear one by one, each with a little bubble showing what would help
// them: food, a drink, a home, clothing, transport, flowers, ointment, a bed, fragrance, a lamp. Tap the person to give it: the gift
// goes to them and they are glad -- 2 or 3 coins. Someone not helped in time walks on (no coins). Seven of the ten kinds per game,
// picked at random, same timing and coins as the birds.
const DANA_COUNT = 7;
const DANA_FIRST_MS = 800;
const DANA_EVERY_MS = 1500;
const DANA_VISIBLE_MS = 3400;
const DANA_SIZE = 'clamp(54px, 11vmin, 92px)';
const DANA_THANKS = ['Sadhu! Thank you!', 'So kind of you!', 'This is just what I needed!', 'May you be happy!'];
const DANA_KINDS = [
  { person: '🧒', gift: '🍚', name: 'Food', pali: 'Annadana' },
  { person: '🚶', gift: '🥤', name: 'Drink', pali: 'Panadana' },
  { person: '👨‍👩‍👧', gift: '🏠', name: 'Shelter', pali: 'Gharadana' },
  { person: '🥶', gift: '👘', name: 'Clothing', pali: 'Vatthadana' },
  { person: '🚶‍♀️', gift: '👟', name: 'Shoes', pali: 'Yanadana' },
  { person: '🧘', gift: '💐', name: 'Flowers', pali: 'Maladana' },
  { person: '🧓', gift: '🧴', name: 'Ointment', pali: 'Vilepanadana' },
  { person: '😴', gift: '🛏️', name: 'A bed', pali: 'Seyyadana' },
  { person: '👵', gift: '🌿', name: 'Fragrance', pali: 'Gandhadana' },
  { person: '🧑‍🦯', gift: '🪔', name: 'A lamp', pali: 'Padipadana' },
];
const danaSpots = () => {
  const out = [];
  for (let i = 0; i < DANA_COUNT; i++) {
    let p = null;
    for (let tries = 0; tries < 30; tries++) {
      const c = { x: 14 + Math.random() * 72, y: 40 + Math.random() * 38 };
      if (out.every(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.4) > 22)) { p = c; break; }
    }
    out.push(p || { x: 14 + Math.random() * 72, y: 40 + Math.random() * 38 });
  }
  return out;
};
const DanaLabel = ({ it }) => (
  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-xs rounded-full px-2 py-0.5 shadow bg-white" style={{ top: '100%', color: '#78350f' }}>{it.kind.name} · {it.kind.pali}</span>
);
// Someone who was just given their gift: the gift floats to them, they hop happily and say thanks.
const GladPerson = ({ it, won }) => (
  <div className="absolute pointer-events-none" style={{ zIndex: 6, left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}>
    <span className="block select-none" style={{ fontSize: DANA_SIZE, lineHeight: 1, animation: 'danaHappy .6s ease-in-out .5s 3' }}>{it.kind.person}</span>
    <DanaLabel it={it} />
    <div className="absolute left-1/2 -translate-x-1/2 select-none" style={{ top: `calc(${DANA_SIZE} * -0.7)`, fontSize: 'clamp(28px, 5.5vmin, 48px)', animation: 'danaGive 1s ease-in forwards' }}>{it.kind.gift}</div>
    <div className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap" style={{ top: `calc(${DANA_SIZE} / -2 - 3.4rem)`, animation: 'danaThanks 2.2s ease-out forwards' }}>
      <div className="bg-white text-amber-900 font-bold text-sm rounded-full px-3 py-1 shadow">{it.thanks}</div>
      {won > 0 && <div className="font-black text-yellow-600 drop-shadow">+{won} 🪙</div>}
    </div>
  </div>
);
export const TenGiftsGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [items] = useState(() => {
    const kinds = [...DANA_KINDS].sort(() => Math.random() - 0.5).slice(0, DANA_COUNT);
    return danaSpots().map((p, i) => ({ id: i, x: p.x, y: p.y, kind: kinds[i], thanks: DANA_THANKS[i % DANA_THANKS.length] }));
  });
  const [state, setState] = useState(() => Array(DANA_COUNT).fill('waiting')); // waiting | shown | helped | gone
  const [won, setWon] = useState(() => Array(DANA_COUNT).fill(0));
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const total = won.reduce((a, b) => a + b, 0);
  const helped = state.filter(v => v === 'helped').length;
  const soundRef = useRef(null);

  useEffect(() => {
    const timers = [];
    items.forEach((it) => {
      const start = DANA_FIRST_MS + it.id * DANA_EVERY_MS;
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'waiting' ? 'shown' : v))), start));
      timers.push(setTimeout(() => setState(st => st.map((v, i) => (i === it.id && v === 'shown' ? 'gone' : v))), start + DANA_VISIBLE_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, [items]);
  useEffect(() => {
    if (finished || !state.every(v => v === 'helped' || v === 'gone')) return undefined;
    const t = setTimeout(() => setFinished(true), 1800); // let the last person finish saying thanks
    return () => clearTimeout(t);
  }, [state, finished]);

  const give = (id) => {
    if (state[id] !== 'shown') return;
    const coins = Math.max(0, Math.min(2 + Math.floor(Math.random() * 2), coinsLeft - total)); // 2 or 3, never past the lesson's limit
    setState(st => st.map((v, i) => (i === id ? 'helped' : v)));
    setWon(w => w.map((v, i) => (i === id ? coins : v)));
    playCoinSound(soundRef);
  };

  return (
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 38%,#fde68a 38%,#fbbf24 100%)' }}>
      <style>{`
        @keyframes danaPop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
        @keyframes danaNeed { 0%,100% { transform: translate(-50%,0) } 50% { transform: translate(-50%,-6px) } }
        @keyframes danaHappy { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-16px) } }
        @keyframes danaGive { 0% { transform: translate(-50%,-40px) scale(.7); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-50%,24px) scale(1.2); opacity: 0 } }
        @keyframes danaThanks { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🎁 Give to those in need</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      <div className="absolute pointer-events-none" style={{ right: '8%', top: '10%', fontSize: 'clamp(40px, 9vmin, 80px)' }}>☀️</div>
      <div className="absolute pointer-events-none" style={{ left: '5%', top: '22%', fontSize: 'clamp(34px, 8vmin, 66px)' }}>🌳</div>
      {helped > 0 && <div className="absolute pointer-events-none bg-white text-amber-700 font-black text-sm rounded-full px-3 py-1 shadow" style={{ left: '4%', bottom: '3%' }}>🎁 {helped}</div>}
      {items.map((it, i) => {
        const st = state[i];
        if (st === 'waiting' || st === 'gone') return null;
        if (st === 'helped') return <GladPerson key={it.id} it={it} won={won[i]} />;
        return (
          <button key={it.id} onClick={() => give(it.id)} aria-label={`Give ${it.kind.name}`} className="absolute" style={{ left: `${it.x}%`, top: `${it.y}%`, width: DANA_SIZE, height: DANA_SIZE, transform: 'translate(-50%,-50%)', animation: 'danaPop .35s ease-out', zIndex: 5 }}>
            <span className="block select-none" style={{ fontSize: DANA_SIZE, lineHeight: 1 }}>{it.kind.person}</span>
            <span className="absolute left-1/2 select-none bg-white/90 rounded-full px-1" style={{ top: '-34%', fontSize: 'clamp(22px, 4.5vmin, 38px)', animation: 'danaNeed 1s ease-in-out infinite' }}>{it.kind.gift}</span>
            <DanaLabel it={it} />
          </button>
        );
      })}
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 px-4">
          <div className="bg-white text-gray-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-2">{helped > 0 ? '🎁' : '🌤️'}</div>
            <h2 className="text-2xl font-extrabold mb-1">{helped > 0 ? `You gave ${helped} gift${helped === 1 ? '' : 's'}!` : 'Nice try!'}</h2>
            <p className="text-sm text-gray-600 mb-2">{helped > 0 ? 'Giving with a kind heart brings happiness to everyone.' : 'Be quick, they need your help.'}</p>
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
// The games, in the order they are handed out. A lesson always gets the same game (so a retake feels familiar and the
// coin cap stays one per lesson), but neighbouring lessons get different ones, so the break does not become boring.
// To add a game: write it above with the same two props and put it in this list.
export const QUIZ_BREAK_GAMES = [BirdRescueGame, FlowerOfferingGame, LitterPickingGame, AnimalRescueGame, WoodcutterAxeGame, AntGatheringGame, WaterAnimalsGame, HelpFriendsGame, PayRespectGame, TenGiftsGame, ReturnLostItemsGame];
const hashOf = (s) => { let h = 0; String(s ?? '').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return h; };
export const quizBreakGameFor = (lessonId) => QUIZ_BREAK_GAMES[hashOf(lessonId) % QUIZ_BREAK_GAMES.length];
export const QuizBreakGame = ({ lessonId, ...rest }) => {
  const Game = quizBreakGameFor(lessonId);
  return <Game {...rest} />;
};

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
// The games, in the order they are handed out. A lesson always gets the same game (so a retake feels familiar and the
// coin cap stays one per lesson), but neighbouring lessons get different ones, so the break does not become boring.
// To add a game: write it above with the same two props and put it in this list.
export const QUIZ_BREAK_GAMES = [BirdRescueGame, FlowerOfferingGame, LitterPickingGame];
const hashOf = (s) => { let h = 0; String(s ?? '').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return h; };
export const quizBreakGameFor = (lessonId) => QUIZ_BREAK_GAMES[hashOf(lessonId) % QUIZ_BREAK_GAMES.length];
export const QuizBreakGame = ({ lessonId, ...rest }) => {
  const Game = quizBreakGameFor(lessonId);
  return <Game {...rest} />;
};

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
// Game 2: a big tree. Flowers blossom here and there in its crown. Tap a flower to pick it -- it floats over to the Buddha
// statue as an offering, and the student gets 2 or 3 coins. Seven flowers in all, same timing and coins as the birds.
const FLOWERS = 7;
const FLOWER_FIRST_MS = 800;
const FLOWER_EVERY_MS = 1500;
const FLOWER_VISIBLE_MS = 3200;
const FLOWER_THANKS = ['Sadhu!', 'Sadhu! Sadhu!', 'What a kind offering!', 'Lovely flower!'];
const FLOWER_SIZE = 'clamp(44px, 9vmin, 80px)'; // a flower is easy to tap on a phone and still in proportion to the tree on a big screen
const STATUE = { x: 80, y: 80 }; // where picked flowers go (% of the stage)
// seven spots in the tree's crown, none too close to another
const crownSpots = () => {
  const spots = [];
  let guard = 0;
  while (spots.length < FLOWERS && guard++ < 400) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    const s = { x: 40 + Math.cos(a) * r * 28, y: 32 + Math.sin(a) * r * 24 };
    if (spots.every(p => Math.hypot(p.x - s.x, (p.y - s.y) * 0.8) > 15)) spots.push(s);
  }
  while (spots.length < FLOWERS) spots.push({ x: 14 + spots.length * 9, y: 20 + (spots.length % 3) * 14 });
  return spots;
};
export const FlowerOfferingGame = ({ onDone, coinsLeft = BIRD_COIN_CAP }) => {
  const [flowers] = useState(() => crownSpots().map((p, i) => ({ id: i, ...p, icon: ['🌸', '🌼', '🌺', '🏵️', '🌷'][i % 5], thanks: FLOWER_THANKS[i % FLOWER_THANKS.length] })));
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
    <div className="relative overflow-hidden text-white h-screen" style={{ height: '100dvh', minHeight: 420, background: 'linear-gradient(180deg,#fde68a 0%,#fef3c7 40%,#bbf7d0 100%)' }}>
      <style>{`
        @keyframes flowerPop { 0% { transform: scale(0) rotate(-40deg) } 70% { transform: scale(1.25) rotate(8deg) } 100% { transform: scale(1) rotate(0) } }
        @keyframes flowerSway { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
        @keyframes sadhuRise { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px); opacity: 0 } }
        @keyframes statueGlow { 0%,100% { filter: drop-shadow(0 0 0 rgba(253,224,71,0)) } 50% { filter: drop-shadow(0 0 14px rgba(253,224,71,.95)) } }
      `}</style>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-3 z-10">
        <div className="bg-white/80 text-amber-900 font-bold text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 ml-12 sm:ml-16 min-w-0 truncate">🌸 Pick the flowers for the Buddha</div>
        <div className="bg-yellow-300 text-yellow-900 font-black text-sm sm:text-base rounded-full px-3 sm:px-4 py-2 shadow whitespace-nowrap flex-shrink-0">🪙 {total}{coinsLeft <= 0 ? ' (limit reached)' : ''}</div>
      </div>
      {/* the stage: a tall box in the middle of the screen, everything inside is positioned in % of it */}
      <div className="absolute left-1/2 bottom-0" style={{ transform: 'translateX(-50%)', height: 'min(88dvh, 125vw)', aspectRatio: '4 / 5' }}>
        <svg viewBox="0 0 100 125" className="absolute inset-0 w-full h-full" aria-hidden="true">
          {/* ground */}
          <ellipse cx="50" cy="125" rx="70" ry="22" fill="#86efac" />
          {/* trunk and branches */}
          <path d="M34 125 Q36 96 38 78 Q40 66 36 54 L44 54 Q43 68 45 80 Q47 98 48 125 Z" fill="#8d6e63" />
          <path d="M38 76 Q28 66 20 56 M42 70 Q54 60 64 50 M40 62 Q40 52 40 44" fill="none" stroke="#8d6e63" strokeWidth="3.5" strokeLinecap="round" />
          {/* the crown */}
          <g fill="#22c55e"><circle cx="40" cy="40" r="26" /><circle cx="22" cy="48" r="17" /><circle cx="58" cy="46" r="19" /><circle cx="30" cy="26" r="16" /><circle cx="52" cy="24" r="17" /></g>
          <g fill="#16a34a" opacity=".55"><circle cx="34" cy="50" r="11" /><circle cx="54" cy="38" r="9" /><circle cx="26" cy="32" r="8" /><circle cx="46" cy="52" r="8" /></g>
          {/* the altar and the Buddha statue */}
          <rect x="66" y="98" width="30" height="8" rx="2" fill="#a16207" />
          <rect x="70" y="106" width="22" height="19" fill="#854d0e" />
          <g style={{ animation: offered > 0 ? 'statueGlow 1.6s ease-in-out infinite' : 'none' }}>
            <ellipse cx="81" cy="96" rx="12" ry="4" fill="#facc15" />
            <path d="M70 96 Q70 84 81 84 Q92 84 92 96 Z" fill="#fbbf24" />
            <circle cx="81" cy="76" r="6.2" fill="#fcd34d" />
            <path d="M75 71 Q81 64 87 71" fill="none" stroke="#b45309" strokeWidth="1.2" />
            <circle cx="81" cy="64.5" r="1.6" fill="#f59e0b" />
            <path d="M76 90 Q81 86 86 90" fill="none" stroke="#b45309" strokeWidth="1.2" />
          </g>
        </svg>
        {/* flowers offered so far lie in front of the statue */}
        <div className="absolute pointer-events-none text-lg leading-none" style={{ left: '62%', top: '90%', width: '34%', textAlign: 'center' }}>
          {Array.from({ length: offered }, (_, i) => <span key={i}>🌸</span>)}
        </div>
        {flowers.map((f, i) => {
          const st = state[i];
          if (st === 'waiting' || st === 'missed') return null;
          const picked = st === 'picked';
          return (
            <div key={f.id} className="absolute" style={{ left: `${picked ? STATUE.x : f.x}%`, top: `${picked ? STATUE.y + 6 : f.y}%`, transition: picked ? 'left .9s ease-in-out, top .9s ease-in, opacity .5s .7s, transform .9s' : 'none', opacity: picked ? 0 : 1, transform: picked ? 'scale(.5)' : 'none', zIndex: 5 }}>
              <button onClick={() => pick(f.id)} disabled={picked} aria-label="Pick the flower" className="block" style={{ width: FLOWER_SIZE, height: FLOWER_SIZE, marginLeft: `calc(${FLOWER_SIZE} / -2)`, marginTop: `calc(${FLOWER_SIZE} / -2)`, animation: picked ? 'none' : 'flowerPop .35s ease-out' }}>
                <span className="block select-none" style={{ fontSize: FLOWER_SIZE, lineHeight: 1, animation: picked ? 'none' : 'flowerSway 1.2s ease-in-out infinite' }}>{f.icon}</span>
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
      </div>
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
// The games, in the order they are handed out. A lesson always gets the same game (so a retake feels familiar and the
// coin cap stays one per lesson), but neighbouring lessons get different ones, so the break does not become boring.
// To add a game: write it above with the same two props and put it in this list.
export const QUIZ_BREAK_GAMES = [BirdRescueGame, FlowerOfferingGame];
const hashOf = (s) => { let h = 0; String(s ?? '').split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return h; };
export const quizBreakGameFor = (lessonId) => QUIZ_BREAK_GAMES[hashOf(lessonId) % QUIZ_BREAK_GAMES.length];
export const QuizBreakGame = ({ lessonId, ...rest }) => {
  const Game = quizBreakGameFor(lessonId);
  return <Game {...rest} />;
};

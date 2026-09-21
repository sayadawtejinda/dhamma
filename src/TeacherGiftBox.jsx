import React, { useEffect, useRef, useState } from 'react';
import { spawnFlyingCoins } from './flyingCoins';

// A present from the teacher, shown inside the Shrine Room. Tap the closed
// box: the lid pops off, light pours out, fireworks burst if there's a trophy
// inside, the coins swirl up into the wallet, and the box is gone about five
// seconds after it was opened. The database work (paying out the gift and
// deleting it so it can't be opened twice) is done by `onOpen`; this
// component only runs the show.
const SPARK_COLORS = ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#fb923c', '#c084fc'];
const BURSTS = [
  { x: 0, y: -120, delay: 0.35 },
  { x: -130, y: -40, delay: 0.75 },
  { x: 130, y: -50, delay: 1.1 },
  { x: -60, y: -150, delay: 1.5 },
  { x: 70, y: -140, delay: 1.9 },
];

const Fireworks = ({ trophies }) => (
  <>
    {BURSTS.map((b, bi) => (
      <div key={bi} className="absolute left-1/2 top-1/2 pointer-events-none" style={{ transform: `translate(${b.x}px, ${b.y}px)` }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const ang = (i / 14) * Math.PI * 2;
          const dist = 55 + (i % 3) * 22;
          const isTrophy = trophies > 0 && i % 7 === 0;
          return (
            <span
              key={i}
              className="absolute"
              style={{
                left: 0, top: 0,
                fontSize: isTrophy ? 26 : 12,
                color: SPARK_COLORS[(i + bi) % SPARK_COLORS.length],
                '--tx': `${Math.cos(ang) * dist}px`,
                '--ty': `${Math.sin(ang) * dist}px`,
                animation: `giftSpark 1.1s ease-out ${b.delay}s both`,
              }}
            >
              {isTrophy ? '🏆' : '●'}
            </span>
          );
        })}
      </div>
    ))}
  </>
);

const GiftBoxSvg = ({ open }) => (
  <svg viewBox="0 0 160 150" width="200" height="188" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="giftBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f43f5e" /><stop offset="1" stopColor="#be123c" />
      </linearGradient>
      <linearGradient id="giftLid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fb7185" /><stop offset="1" stopColor="#e11d48" />
      </linearGradient>
      <linearGradient id="giftRibbon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <rect x="18" y="66" width="124" height="76" rx="8" fill="url(#giftBody)" />
    <rect x="72" y="66" width="16" height="76" fill="url(#giftRibbon)" />
    <g style={{ transformOrigin: '80px 60px', transition: 'transform 0.6s cubic-bezier(.3,1.6,.5,1), opacity 0.5s ease 0.3s', transform: open ? 'translate(34px,-70px) rotate(24deg)' : 'none', opacity: open ? 0.0 : 1 }}>
      <rect x="10" y="44" width="140" height="28" rx="8" fill="url(#giftLid)" />
      <rect x="72" y="44" width="16" height="28" fill="url(#giftRibbon)" />
      <ellipse cx="62" cy="38" rx="20" ry="13" fill="url(#giftRibbon)" transform="rotate(-20 62 38)" />
      <ellipse cx="98" cy="38" rx="20" ry="13" fill="url(#giftRibbon)" transform="rotate(20 98 38)" />
      <circle cx="80" cy="42" r="8" fill="#f59e0b" />
    </g>
  </svg>
);

export default function TeacherGiftBox({ gift, onOpen, onCoinsLanded, onDone }) {
  const [phase, setPhase] = useState('closed'); // closed -> opening -> open -> leaving
  const boxRef = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const handleTap = async () => {
    if (phase !== 'closed') return;
    setPhase('opening');
    const ok = await onOpen(gift);
    if (!ok) { onDone(false); return; }
    setPhase('open');
    if (gift.coins > 0) later(() => spawnFlyingCoins(boxRef.current, Math.min(14, 6 + Math.round(gift.coins / 40))), 700);
    if (gift.coins > 0) later(() => onCoinsLanded(gift.coins), 1900);
    later(() => setPhase('leaving'), 4200);
    later(() => onDone(true), 5000);
  };

  const opened = phase === 'open' || phase === 'leaving';
  if (phase === 'closed') {
    return (
      <>
        <style>{`@keyframes giftBounce { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-14px) rotate(3deg); } }
@keyframes giftGlow { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .8; transform: scale(1.25); } }`}</style>
        <button
          onClick={handleTap}
          aria-label="A gift from your teacher"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          style={{ animation: 'giftBounce 1.6s ease-in-out infinite' }}
        >
          <span className="absolute inset-0 rounded-full bg-yellow-300 blur-2xl" style={{ animation: 'giftGlow 1.6s ease-in-out infinite' }} />
          <span className="relative block" ref={boxRef}><GiftBoxSvg open={false} /></span>
        </button>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: 'rgba(15,10,30,0.55)', opacity: phase === 'leaving' ? 0 : 1, transition: 'opacity 0.8s ease' }}
    >
      <style>{`@keyframes giftSpark { 0% { transform: translate(0,0) scale(1); opacity: 1; } 80% { opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0; } }
@keyframes giftRays { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes giftPop { 0% { transform: scale(0.7); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes giftMsgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {opened && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[420px] h-[420px] max-w-[95vw] rounded-full"
            style={{ background: 'conic-gradient(from 0deg, rgba(253,224,71,0), rgba(253,224,71,0.55), rgba(253,224,71,0), rgba(253,224,71,0.55), rgba(253,224,71,0), rgba(253,224,71,0.55), rgba(253,224,71,0), rgba(253,224,71,0.55), rgba(253,224,71,0))', animation: 'giftRays 6s linear infinite', maskImage: 'radial-gradient(circle, black 25%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, black 25%, transparent 68%)' }} />
        </div>
      )}
      <div ref={boxRef} className="relative" style={{ animation: 'giftPop 0.5s ease-out' }}>
        <GiftBoxSvg open={opened} />
      </div>
      {opened && <Fireworks trophies={gift.trophies || 0} />}
      {opened && (gift.message || gift.trophies > 0) && (
        <div className="absolute left-0 right-0 bottom-[22%] text-center px-6 pointer-events-none" style={{ animation: 'giftMsgIn 0.6s ease-out 0.9s both' }}>
          {gift.trophies > 0 && <p className="text-3xl drop-shadow-lg">{'🏆'.repeat(Math.min(gift.trophies, 5))}</p>}
          {gift.message && <p className="text-white font-bold text-lg drop-shadow-lg">{gift.message}</p>}
        </div>
      )}
    </div>
  );
}

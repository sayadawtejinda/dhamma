import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, runTransaction, increment } from 'firebase/firestore';
import { db } from './firebase';
import { spawnFlyingCoins } from './flyingCoins';
import { GiftBoxSvg } from './TeacherGiftBox';

// A present from the teacher that appears ON TOP of whatever the student is
// doing -- same idea as the trophy celebration, so it no longer waits for them
// to walk into the Shrine Room. (The Shrine Room still shows any gift that was
// left unopened.) The teacher's send marks the student's profile; the home
// app notices that through the profile listener it already has and mounts this
// -- so nothing extra is read until a gift has actually arrived.
//
// Closed: a dark sky with colours flashing and firework bursts, and the box
// bouncing in the middle. Tap it: it opens, the number of coins it holds is
// shown, and the coins fly into the wallet badge shown here, with sound.
const TEACHER_GIFTS_PATH = 'artifacts/shrine-room-app/public/data/teacherGifts';
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');
const COLORS = ['#fde047', '#f472b6', '#60a5fa', '#34d399', '#fb923c', '#c084fc'];
const BURSTS = [[15, 20], [82, 16], [50, 8], [10, 58], [90, 56], [28, 82], [72, 84], [50, 44]].map(([x, y], i) => ({ id: i, x, y, delay: (i % 4) * 0.45 }));

// A short rising chime made on the spot (no sound file needed).
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.75);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch (e) { /* sound is optional */ }
}

export default function TeacherGiftPopup({ studentUid, studentName, onClose }) {
  const [gifts, setGifts] = useState(null); // null = still loading
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('closed'); // closed -> opening -> open
  const [balance, setBalance] = useState(null);
  const [shownCoins, setShownCoins] = useState(0);
  const boxRef = useRef(null);
  const badgeRef = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // One read of the student's waiting gifts and of their wallet, only now
  // that a gift is known to have arrived.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snap, rSnap] = await Promise.all([
          getDocs(query(collection(db, TEACHER_GIFTS_PATH), where('studentUid', '==', studentUid))),
          getDoc(doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName))),
        ]);
        if (cancelled) return;
        const now = Date.now();
        const live = [];
        snap.docs.forEach(d => {
          const g = { id: d.id, ...d.data() };
          if (g.expiresAt && g.expiresAt < now) { deleteDoc(d.ref).catch(() => {}); return; }
          live.push(g);
        });
        live.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setBalance(rSnap.exists() ? (rSnap.data().coinBalance ?? 0) : 0);
        if (live.length === 0) { onClose(); return; }
        setGifts(live);
      } catch (e) {
        console.error('Could not load the teacher gift:', e);
        if (!cancelled) onClose();
      }
    })();
    return () => { cancelled = true; };
  }, [studentUid, studentName]);

  const gift = gifts ? gifts[index] : null;

  const openGift = async () => {
    if (!gift || phase !== 'closed') return;
    setPhase('opening');
    let ok = false;
    try {
      const giftRef = doc(db, TEACHER_GIFTS_PATH, gift.id);
      const rosterRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName));
      // Pay out and delete in one transaction so it can't be opened twice
      // (e.g. also from the Shrine Room, or another device).
      ok = await runTransaction(db, async (tx) => {
        const snap = await tx.get(giftRef);
        if (!snap.exists()) return false;
        const g = snap.data();
        if ((g.coins || 0) > 0) tx.set(rosterRef, { studentName, coinBalance: increment(g.coins) }, { merge: true });
        tx.delete(giftRef);
        return true;
      });
    } catch (e) {
      console.error('Could not open the teacher gift:', e);
    }
    if (!ok) { next(); return; }
    const coins = gift.coins || 0;
    setPhase('open');
    playChime();
    // Count the number up while the coins fly to the wallet badge.
    const steps = 20;
    for (let i = 1; i <= steps; i++) later(() => setShownCoins(Math.round((coins * i) / steps)), 250 + i * 40);
    if (coins > 0) {
      later(() => spawnFlyingCoins(boxRef.current, Math.min(14, 6 + Math.round(coins / 40)), '🪙', true, badgeRef.current), 900);
      later(() => setBalance(b => (b ?? 0) + coins), 2300);
      // Wallets already on screen in the app underneath catch up too.
      window.dispatchEvent(new CustomEvent('dhamma-wallet-gift', { detail: { coins, giftId: gift.id } }));
    }
  };

  const next = () => {
    setPhase('closed');
    setShownCoins(0);
    if (gifts && index + 1 < gifts.length) setIndex(index + 1);
    else onClose();
  };

  if (!gift) return null;
  const left = gifts.length - index - 1;
  const opened = phase === 'open';

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 45%, #2a1b5e 0%, #0b0720 75%)' }}>
      <style>{`
        @keyframes tgHue { 0% { filter: hue-rotate(0deg) } 100% { filter: hue-rotate(360deg) } }
        @keyframes tgFlash { 0%,100% { opacity: .25 } 50% { opacity: .85 } }
        @keyframes tgRays { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes tgSpark { 0% { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1 } 100% { transform: rotate(var(--a)) translateX(95px) scale(.2); opacity: 0 } }
        @keyframes tgBounce { 0%,100% { transform: translateY(0) rotate(-3deg) } 50% { transform: translateY(-16px) rotate(3deg) } }
        @keyframes tgPop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.2); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes tgOpenGlow { 0%,100% { transform: scale(1); opacity: .7 } 50% { transform: scale(1.15); opacity: 1 } }
      `}</style>

      {/* flashing rainbow rays */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ animation: 'tgHue 5s linear infinite' }}>
        <div className="w-[170vmax] h-[170vmax] rounded-full" style={{ background: 'conic-gradient(from 0deg, rgba(253,224,71,.0), rgba(253,224,71,.4), rgba(244,114,182,.0), rgba(96,165,250,.4), rgba(52,211,153,.0), rgba(192,132,252,.4), rgba(253,224,71,.0))', animation: 'tgRays 14s linear infinite, tgFlash 1.4s ease-in-out infinite' }} />
      </div>
      {/* firework bursts, forever until closed */}
      {BURSTS.map(b => (
        <div key={b.id} className="absolute pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="absolute rounded-full" style={{ width: 9, height: 9, background: COLORS[(i + b.id) % COLORS.length], '--a': `${(i / 16) * 360}deg`, animation: `tgSpark 1.3s ease-out ${b.delay}s infinite` }} />
          ))}
        </div>
      ))}

      {/* wallet badge the coins fly into */}
      <div className="fixed top-3 right-3 z-10 flex items-center gap-2 bg-white/95 rounded-full shadow-lg px-4 py-2 font-black text-amber-600">
        <span ref={badgeRef}>🪙</span>
        <span>{balance ?? '…'}</span>
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        {!opened ? (
          <>
            <p className="mb-4 text-2xl font-black text-amber-200 drop-shadow-lg">🎉 A gift from your teacher! 🎉</p>
            <button onClick={openGift} disabled={phase === 'opening'} aria-label="Open the gift from your teacher" className="relative" style={{ animation: 'tgBounce 1.5s ease-in-out infinite' }}>
              <span className="absolute inset-0 rounded-full bg-yellow-300 blur-3xl" style={{ animation: 'tgOpenGlow 1.4s ease-in-out infinite' }} />
              <span className="relative block" ref={boxRef}><GiftBoxSvg open={false} /></span>
            </button>
            <p className="mt-5 text-base font-bold text-white">{phase === 'opening' ? 'Opening…' : 'Tap the gift to open it'}</p>
          </>
        ) : (
          <>
            <div className="relative" ref={boxRef} style={{ animation: 'tgPop .5s ease-out' }}>
              <span className="absolute inset-0 rounded-full bg-yellow-300 blur-3xl" style={{ animation: 'tgOpenGlow 1.4s ease-in-out infinite' }} />
              <span className="relative block"><GiftBoxSvg open /></span>
            </div>
            {(gift.coins || 0) > 0 && (
              <p className="mt-4 text-5xl font-black text-amber-300 drop-shadow-lg" style={{ animation: 'tgPop .6s ease-out .2s both' }}>+{shownCoins} 🪙</p>
            )}
            {gift.message && <p className="mt-3 max-w-xs text-lg font-bold text-white drop-shadow">{gift.message}</p>}
            <button onClick={next} className="mt-6 px-8 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black shadow-lg" style={{ animation: 'tgPop .5s ease-out 2.4s both' }}>
              {left > 0 ? `Next gift (${left} more)` : 'Thank you, teacher!'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

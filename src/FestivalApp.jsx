import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './firebase';
import { spawnFlyingCoins } from './flyingCoins';
import { localDateKey, festivalStatus } from './festivals';
import { CharacterSvg } from './AvatarCharacter';
import bigBellSound from '../audio/big-bellburmese.mp3';

// Seasonal festival app (first one: Thadingyut, the festival of lights).
// What each festival contains -- dates, lamps, who to pay respect to,
// limited-edition Avatar rewards -- lives in festivals.js, so the next
// festival is a config entry, not a new app. Like AvatarApp/NatureWorldApp
// it has no wallet of its own: coins go straight into the same Shrine Room
// roster doc everything else deposits into, and rewards are written into the
// same `avatarOwned` field the Avatar shop already reads.
//
// Firestore cost: one read of the student's progress doc and one of their
// roster doc on open; lamp taps and respects are queued and saved together
// in ONE transaction a few seconds after the last tap (and straight away
// when leaving or hiding the page), not one write per tap.
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const PROGRESS_PATH = 'artifacts/festival-app/public/data/progress';
const SHRINE_STARTER_COINS = 20;
// Students have to wait this long on each respect before the button works, so
// it isn't just tapped through.
const RESPECT_WAIT_SECONDS = 5;
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');

// Lamp positions as % of the scene (x from left, y from top): an arc in
// front of the pagoda, two on its platform, two on side posts.
const LAMP_SPOTS = [
  { x: 8, y: 72 }, { x: 20, y: 82 }, { x: 32, y: 90 }, { x: 44, y: 94 },
  { x: 56, y: 94 }, { x: 68, y: 90 }, { x: 80, y: 82 }, { x: 92, y: 72 },
  { x: 36, y: 79 }, { x: 64, y: 79 }, { x: 17, y: 60 }, { x: 83, y: 60 },
];

const requirementMet = (req, festival, state) => {
  if (req.type === 'lamps') return state.lampsTotal >= req.count;
  if (req.type === 'kadawAll') return festival.kadaw.recipients.every(r => state.kadawEver.includes(r.id));
  return false;
};

// Saves everything queued since the last save, once, atomically. Anything
// already counted (same lamp/person today, from another tab or device) is
// ignored here, so the coins can never be claimed twice.
async function saveFestivalProgress({ festival, studentUid, studentName, lampIdxs, kadawIds }) {
  const dateKey = localDateKey();
  const progRef = doc(db, PROGRESS_PATH, `${festival.id}_${studentUid}`);
  const rosterRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName));
  const recipientIds = festival.kadaw.recipients.map(r => r.id);
  return runTransaction(db, async (tx) => {
    const pSnap = await tx.get(progRef);
    const rSnap = await tx.get(rosterRef);
    const p = pSnap.exists() ? pSnap.data() : {};
    const r = rSnap.exists() ? rSnap.data() : {};

    const litToday = new Set(p.lamps?.[dateKey] || []);
    const wasAllLit = litToday.size >= festival.lamps.perDay;
    const newLamps = lampIdxs.filter(i => Number.isInteger(i) && i >= 0 && i < festival.lamps.perDay && !litToday.has(i));
    newLamps.forEach(i => litToday.add(i));

    const kadawToday = new Set(p.kadaw?.[dateKey] || []);
    const newKadaw = kadawIds.filter(id => recipientIds.includes(id) && !kadawToday.has(id));
    newKadaw.forEach(id => kadawToday.add(id));

    let coins = newLamps.length * festival.lamps.coins + newKadaw.length * festival.kadaw.coins;
    // Each new respect also earns lotus flowers. These are the festival's own
    // -- Shrine Room's separate daily lotus limit does not apply to them.
    const lotus = newKadaw.length * (festival.kadaw.lotus || 0);
    const allLitBonus = !wasAllLit && litToday.size >= festival.lamps.perDay;
    if (allLitBonus) coins += festival.lamps.allLitBonus;

    const state = {
      lampsTotal: (p.lampsTotal || 0) + newLamps.length,
      kadawEver: Array.from(new Set([...(p.kadawEver || []), ...newKadaw])),
    };
    const alreadyUnlocked = p.unlocked || [];
    const newlyUnlocked = festival.rewards.filter(rw => !alreadyUnlocked.includes(rw.id) && requirementMet(rw.requires, festival, state));

    // Items owned before this save (same legacy flat-name fallback AvatarApp
    // reads, so an old purchase stored under a literal "avatarOwned.outfit"
    // field isn't shadowed), plus anything this very save adds.
    const ownedPatch = {};
    const ownedNow = (cat) => ownedPatch[cat] || r.avatarOwned?.[cat] || r[`avatarOwned.${cat}`] || [];
    const addOwned = (cat, id) => { ownedPatch[cat] = Array.from(new Set([...ownedNow(cat), id])); };
    newlyUnlocked.forEach(rw => addOwned(rw.category, rw.item.id));

    // The daily gift box: all of today's respects done, and no box yet today.
    // It holds the next Avatar item they don't own, or bonus coins once they
    // own the whole set.
    const giftDays = p.giftDays || {};
    let dailyGift = null;
    if (festival.dailyGift && kadawToday.size >= recipientIds.length && !giftDays[dateKey]) {
      const next = festival.dailyGift.pool.find(entry => !ownedNow(entry.category).includes(entry.item.id));
      if (next) {
        addOwned(next.category, next.item.id);
        dailyGift = { kind: 'item', category: next.category, item: next.item };
      } else {
        coins += festival.dailyGift.bonusCoins;
        dailyGift = { kind: 'coins', coins: festival.dailyGift.bonusCoins };
      }
    }

    if (newLamps.length === 0 && newKadaw.length === 0 && newlyUnlocked.length === 0 && !dailyGift) {
      return { balance: r.coinBalance ?? SHRINE_STARTER_COINS, coins: 0, lotus: 0, newlyUnlocked: [], dailyGift: null, lampsTotal: state.lampsTotal, kadawEver: state.kadawEver };
    }

    tx.set(progRef, {
      studentUid, studentName, festivalId: festival.id,
      lamps: { [dateKey]: Array.from(litToday) },
      kadaw: { [dateKey]: Array.from(kadawToday) },
      lampsTotal: state.lampsTotal,
      kadawEver: state.kadawEver,
      unlocked: [...alreadyUnlocked, ...newlyUnlocked.map(rw => rw.id)],
      ...(dailyGift ? { giftDays: { [dateKey]: dailyGift.item ? dailyGift.item.id : 'coins' } } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const rosterPatch = { studentName };
    const hadBalance = r.coinBalance != null;
    const base = hadBalance ? r.coinBalance : SHRINE_STARTER_COINS;
    // A roster doc with no balance yet gets the usual starter coins on top,
    // same as every other app that deposits into it for the first time.
    rosterPatch.coinBalance = hadBalance ? increment(coins) : base + coins;
    if (Object.keys(ownedPatch).length > 0) rosterPatch.avatarOwned = ownedPatch;
    if (lotus > 0) rosterPatch.lotusCount = increment(lotus);
    tx.set(rosterRef, rosterPatch, { merge: true });

    return { balance: base + coins, coins, lotus, newlyUnlocked, dailyGift, lampsTotal: state.lampsTotal, kadawEver: state.kadawEver };
  });
}

// Firework bursts behind the opened gift: fixed spots and colours so the show
// doesn't re-roll on every render.
const FIREWORK_COLORS = ['#fbbf24', '#f472b6', '#60a5fa', '#4ade80', '#f87171', '#c084fc'];
const FIREWORK_BURSTS = [[18, 22], [80, 18], [50, 10], [12, 62], [88, 58], [30, 84], [70, 86], [50, 40]].map(([x, y], i) => ({
  id: i, x, y, delay: (i % 4) * 0.35,
  colors: [FIREWORK_COLORS[i % 6], FIREWORK_COLORS[(i + 2) % 6], FIREWORK_COLORS[(i + 4) % 6]],
}));

function Pagoda({ glow }) {
  return (
    <svg viewBox="0 0 200 300" className="h-full w-auto" style={{ filter: `drop-shadow(0 0 ${8 + glow * 34}px rgba(255,196,80,${0.25 + glow * 0.6}))`, transition: 'filter 0.8s' }}>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b8860b" />
          <stop offset="0.45" stopColor="#ffd966" />
          <stop offset="1" stopColor="#a8760a" />
        </linearGradient>
      </defs>
      <rect x="14" y="268" width="172" height="28" rx="3" fill="url(#gold)" />
      <rect x="30" y="252" width="140" height="18" rx="3" fill="url(#gold)" />
      <rect x="46" y="238" width="108" height="16" rx="3" fill="url(#gold)" />
      <path d="M62,238 Q62,150 100,118 Q138,150 138,238 Z" fill="url(#gold)" />
      <rect x="84" y="104" width="32" height="12" rx="4" fill="url(#gold)" />
      <rect x="88" y="92" width="24" height="11" rx="4" fill="url(#gold)" />
      <rect x="92" y="81" width="16" height="10" rx="4" fill="url(#gold)" />
      <path d="M100,26 L94,80 L106,80 Z" fill="url(#gold)" />
      <ellipse cx="100" cy="30" rx="15" ry="4" fill="#ffe08a" />
      <circle cx="100" cy="20" r="4" fill="#ffd966" />
    </svg>
  );
}

export default function FestivalApp({ entryRequest, onExit }) {
  const isTeacherPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  // The opener (home-page banner or the teacher's Festival apps screen)
  // passes in the festival with its current dates applied.
  const festival = entryRequest?.festival || null;

  const [loading, setLoading] = useState(!isTeacherPreview);
  const [coinBalance, setCoinBalance] = useState(isTeacherPreview ? null : 0);
  const [lit, setLit] = useState(() => new Set());
  const [kadawToday, setKadawToday] = useState(() => new Set());
  const [lampsTotal, setLampsTotal] = useState(0);
  const [kadawEver, setKadawEver] = useState([]);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [floaters, setFloaters] = useState([]);
  const [lanterns, setLanterns] = useState([]);
  const [panel, setPanel] = useState(null); // null | 'kadaw' | 'rewards'
  const [kadawTarget, setKadawTarget] = useState(null);
  const [kadawStage, setKadawStage] = useState('pray'); // 'pray' | 'blessed'
  const [celebration, setCelebration] = useState(null); // newly unlocked rewards
  // Daily gift box: null | { kind: 'item'|'coins', item?, category?, coins? }
  const [giftBox, setGiftBox] = useState(null);
  const [giftOpened, setGiftOpened] = useState(false);
  const [giftTakenToday, setGiftTakenToday] = useState(false);
  const [ownedFestivalIds, setOwnedFestivalIds] = useState([]);
  const [respectWait, setRespectWait] = useState(0);
  const [toast, setToast] = useState(null);

  const pendingRef = useRef({ lamps: new Set(), kadaw: new Set() });
  const flushTimerRef = useRef(null);
  const retriesRef = useRef(0);
  const bellRef = useRef(null);
  const mountedRef = useRef(true);

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2600); };
  // A teacher gift opened in the popup over this screen pays into the same wallet.
  useEffect(() => {
    const onGift = (e) => { setCoinBalance(b => (b == null ? b : b + (e.detail?.coins || 0))); };
    window.addEventListener('dhamma-wallet-gift', onGift);
    return () => window.removeEventListener('dhamma-wallet-gift', onGift);
  }, []);


  const stars = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 55, size: 1 + Math.random() * 2, delay: Math.random() * 4,
  })), []);

  // One read of each doc on open.
  useEffect(() => {
    if (isTeacherPreview || !festival) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [pSnap, rSnap] = await Promise.all([
          getDoc(doc(db, PROGRESS_PATH, `${festival.id}_${studentUid}`)),
          getDoc(doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName))),
        ]);
        if (cancelled) return;
        const dateKey = localDateKey();
        const p = pSnap.exists() ? pSnap.data() : {};
        setLit(new Set(p.lamps?.[dateKey] || []));
        setKadawToday(new Set(p.kadaw?.[dateKey] || []));
        setLampsTotal(p.lampsTotal || 0);
        setKadawEver(p.kadawEver || []);
        setUnlockedIds(p.unlocked || []);
        setGiftTakenToday(!!p.giftDays?.[dateKey]);
        const rd = rSnap.exists() ? rSnap.data() : {};
        setOwnedFestivalIds(['outfit', 'accessory'].flatMap(cat => rd.avatarOwned?.[cat] || rd[`avatarOwned.${cat}`] || []).filter(id => String(id).startsWith('festival-')));
        setCoinBalance(rSnap.exists() ? (rd.coinBalance ?? SHRINE_STARTER_COINS) : SHRINE_STARTER_COINS);
      } catch (e) {
        console.error('Error loading festival data:', e);
        setCoinBalance(0);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [studentUid, studentName, isTeacherPreview, festival]);

  const flush = async () => {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    const lampIdxs = Array.from(pendingRef.current.lamps);
    const kadawIds = Array.from(pendingRef.current.kadaw);
    if (isTeacherPreview || !festival || (lampIdxs.length === 0 && kadawIds.length === 0)) return;
    pendingRef.current = { lamps: new Set(), kadaw: new Set() };
    try {
      const res = await saveFestivalProgress({ festival, studentUid, studentName, lampIdxs, kadawIds });
      retriesRef.current = 0;
      if (!mountedRef.current) return;
      setCoinBalance(res.balance);
      setLampsTotal(res.lampsTotal);
      setKadawEver(res.kadawEver);
      if (res.newlyUnlocked.length > 0) {
        setUnlockedIds(prev => [...prev, ...res.newlyUnlocked.map(rw => rw.id)]);
        setOwnedFestivalIds(prev => [...prev, ...res.newlyUnlocked.map(rw => rw.item.id)]);
        setCelebration(res.newlyUnlocked);
      }
      if (res.dailyGift) {
        setGiftTakenToday(true);
        if (res.dailyGift.item) setOwnedFestivalIds(prev => [...prev, res.dailyGift.item.id]);
        setGiftOpened(false);
        setGiftBox(res.dailyGift);
      }
    } catch (e) {
      console.error('Could not save festival progress:', e);
      // Put it back and try again shortly rather than silently dropping coins.
      lampIdxs.forEach(i => pendingRef.current.lamps.add(i));
      kadawIds.forEach(id => pendingRef.current.kadaw.add(id));
      if (retriesRef.current < 3 && mountedRef.current) {
        retriesRef.current += 1;
        showToast('Saving… check your internet connection.');
        flushTimerRef.current = setTimeout(flush, 5000);
      }
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const scheduleFlush = () => {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => flushRef.current(), 4000);
  };

  // Save whatever is still queued if the student leaves or hides the tab.
  useEffect(() => {
    mountedRef.current = true;
    const onHide = () => { if (document.visibilityState === 'hidden') flushRef.current(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      flushRef.current();
      if (bellRef.current) { bellRef.current.pause(); bellRef.current = null; }
    };
  }, []);

  const releaseLanterns = () => {
    const batch = Array.from({ length: 14 }, (_, i) => ({ id: `${Date.now()}-${i}`, x: 5 + Math.random() * 90, delay: Math.random() * 2.2, size: 28 + Math.random() * 22 }));
    setLanterns(batch);
    setTimeout(() => setLanterns([]), 7500);
  };

  const gainCoins = (n) => { if (!isTeacherPreview) setCoinBalance(b => (b ?? 0) + n); };

  const handleLamp = (i, e) => {
    if (lit.has(i)) return;
    const point = { x: e.clientX, y: e.clientY };
    const nextLit = new Set(lit).add(i);
    setLit(nextLit);
    setLampsTotal(t => t + 1);
    let earned = festival.lamps.coins;
    const completesAll = nextLit.size >= festival.lamps.perDay;
    if (completesAll) earned += festival.lamps.allLitBonus;
    gainCoins(earned);
    if (!isTeacherPreview) spawnFlyingCoins(point, 6, '🪙', true);
    const fid = `${Date.now()}-${i}`;
    setFloaters(prev => [...prev, { id: fid, x: point.x, y: point.y, text: `+${festival.lamps.coins}` }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== fid)), 1100);
    if (completesAll) {
      releaseLanterns();
      showToast(`🏮 All lamps lit! Bonus +${festival.lamps.allLitBonus} 🪙`);
    }
    pendingRef.current.lamps.add(i);
    scheduleFlush();
  };

  const openKadaw = (recipient) => {
    setKadawTarget(recipient);
    setKadawStage('pray');
    setRespectWait(kadawToday.has(recipient.id) ? 0 : RESPECT_WAIT_SECONDS);
  };
  // The button stays locked while this counts down.
  useEffect(() => {
    if (respectWait <= 0) return;
    const t = setTimeout(() => setRespectWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [respectWait]);

  const handleKadaw = (e) => {
    const r = kadawTarget;
    if (!r || respectWait > 0) return;
    try {
      if (!bellRef.current) bellRef.current = new Audio(bigBellSound);
      bellRef.current.currentTime = 0;
      bellRef.current.play().catch(() => {});
    } catch (err) { /* sound is optional */ }
    if (kadawToday.has(r.id)) { setKadawStage('blessedAgain'); return; }
    setKadawStage('blessed');
    setKadawToday(prev => new Set(prev).add(r.id));
    setKadawEver(prev => (prev.includes(r.id) ? prev : [...prev, r.id]));
    gainCoins(festival.kadaw.coins);
    if (!isTeacherPreview) spawnFlyingCoins({ x: e.clientX, y: e.clientY }, 6, '🪙', false);
    pendingRef.current.kadaw.add(r.id);
    // The fifth respect of the day brings the gift box -- save at once so it
    // drops in straight away instead of after the usual short delay.
    const countAfter = kadawToday.size + 1;
    if (countAfter >= festival.kadaw.recipients.length) {
      if (isTeacherPreview) {
        const first = festival.dailyGift?.pool?.[0];
        if (first) { setGiftOpened(false); setGiftBox({ kind: 'item', category: first.category, item: first.item }); }
      } else {
        flushRef.current();
      }
    } else {
      scheduleFlush();
    }
  };

  if (!festival || (!isTeacherPreview && festivalStatus(festival) !== 'open')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-indigo-950 text-white px-6 text-center">
        <div className="text-6xl">🌙</div>
        <p className="text-lg font-semibold">This festival is not open right now.</p>
        <button onClick={onExit} className="px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 font-semibold">🏡 Back</button>
      </div>
    );
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-indigo-950 text-indigo-200">Lighting the lamps…</div>;
  }

  const litCount = lit.size;
  const glow = litCount / festival.lamps.perDay;
  const daysLeft = Math.max(0, Math.round((new Date(`${festival.end}T23:59:59`) - new Date()) / 86400000));
  const rewardState = { lampsTotal, kadawEver };
  const kadawDoneCount = festival.kadaw.recipients.filter(r => kadawToday.has(r.id)).length;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden text-white" style={{ background: 'linear-gradient(180deg,#070b22 0%,#17104a 45%,#3a1b5c 78%,#5a2a52 100%)' }}>
      <style>{`
        @keyframes fsTwinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
        @keyframes fsFlicker { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .85 } 35% { transform: translate(-50%,-50%) scale(1.12); opacity: 1 } 70% { transform: translate(-50%,-50%) scale(.94); opacity: .75 } }
        @keyframes fsHint { 0%,100% { box-shadow: 0 0 0 0 rgba(255,214,102,.0) } 50% { box-shadow: 0 0 0 10px rgba(255,214,102,.22) } }
        @keyframes fsFloat { 0% { transform: translate(-50%,0); opacity: 1 } 100% { transform: translate(-50%,-60px); opacity: 0 } }
        @keyframes fsRise { 0% { transform: translateY(0) rotate(-4deg); opacity: 0 } 10% { opacity: 1 } 100% { transform: translateY(-115vh) rotate(6deg); opacity: .9 } }
        @keyframes fsPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.12) } }
        @keyframes fsDrop { 0% { transform: translateY(-110vh) rotate(-10deg) } 100% { transform: translateY(0) rotate(0) } }
        @keyframes fsPop { 0% { transform: scale(.6); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fsSpark { 0% { transform: rotate(var(--angle)) translateX(0) scale(1); opacity: 1 } 100% { transform: rotate(var(--angle)) translateX(80px) scale(.2); opacity: 0 } }
        .fs-star { position: absolute; border-radius: 9999px; background: #fff; animation: fsTwinkle 3s ease-in-out infinite; }
      `}</style>

      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      {/* Just my own name and coin count. The shared OnlineStatusWidget would
          read the whole class roster collection every time this opens, which is
          far more than anything here needs -- so it is deliberately not used.
          The id lets flying coins land on it, same as that widget's badge. */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-white/90 text-gray-800 rounded-full shadow-lg px-4 py-2 text-sm font-bold">
        {isTeacherPreview ? (
          <span className="text-indigo-700">🧑‍🏫 Teacher</span>
        ) : (
          <>
            <span className="truncate max-w-[110px]">{studentName}</span>
            <span id="online-status-coin-badge" className="text-amber-600">🪙 {coinBalance ?? 0}</span>
          </>
        )}
      </div>

      {/* Sky */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map(s => (
          <span key={s.id} className="fs-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
        ))}
        <div className="absolute rounded-full" style={{ right: '12%', top: '9%', width: 74, height: 74, background: 'radial-gradient(circle at 35% 35%,#fffbe6,#ffe9a8 60%,#f3cf6a)', boxShadow: '0 0 60px 22px rgba(255,233,168,.35)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-14 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-black text-amber-200 drop-shadow">{festival.icon} {festival.title}</h1>
        <p className="text-xs sm:text-sm text-indigo-200">{festival.tagline}{!isTeacherPreview && daysLeft >= 0 ? ` · ${daysLeft + 1} day${daysLeft === 0 ? '' : 's'} left` : ''}</p>
        <div className="mt-2 inline-flex items-center gap-3 bg-black/30 rounded-full px-4 py-1.5 text-sm font-semibold">
          <span>🪔 {litCount}/{festival.lamps.perDay} today</span>
          <span className="opacity-40">|</span>
          <span>🙏 {kadawDoneCount}/{festival.kadaw.recipients.length}</span>
        </div>
        {isTeacherPreview && (
          <p className="mt-2 mx-auto max-w-md text-xs text-amber-100 bg-amber-500/20 border border-amber-300/40 rounded-lg px-3 py-1.5">
            👀 Teacher preview — nothing is saved. Students see this from {festival.start} to {festival.end}.
          </p>
        )}
      </div>

      {/* Scene */}
      <div className="relative z-10 flex-1" style={{ minHeight: 380 }}>
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '4%', height: '88%' }}>
          <Pagoda glow={glow} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[18%] pointer-events-none" style={{ background: 'linear-gradient(180deg,transparent,rgba(20,8,40,.75))' }} />
        {LAMP_SPOTS.slice(0, festival.lamps.perDay).map((spot, i) => (i >= 10 ? (
          <div key={`post-${i}`} className="absolute pointer-events-none rounded-sm" style={{ left: `${spot.x}%`, top: `${spot.y}%`, bottom: '6%', width: 4, marginLeft: -2, marginTop: 18, background: 'linear-gradient(180deg,#8d6e63,#3e2723)' }} />
        ) : null))}
        {LAMP_SPOTS.slice(0, festival.lamps.perDay).map((spot, i) => {
          const isLit = lit.has(i);
          return (
            <button
              key={i}
              onClick={(e) => handleLamp(i, e)}
              disabled={isLit}
              aria-label={isLit ? 'Lit lamp' : 'Light this lamp'}
              className="absolute z-20 rounded-full flex items-center justify-center"
              style={{
                left: `${spot.x}%`, top: `${spot.y}%`, width: 54, height: 54, marginLeft: -27, marginTop: -27,
                animation: isLit ? 'none' : `fsHint 2.4s ease-in-out ${(i % 5) * 0.35}s infinite`,
              }}
            >
              {isLit && (
                <span className="absolute pointer-events-none rounded-full" style={{
                  left: '50%', top: '38%', width: 120, height: 120,
                  background: 'radial-gradient(circle,rgba(255,210,90,.75) 0%,rgba(255,150,40,.28) 45%,transparent 70%)',
                  animation: `fsFlicker ${1.4 + (i % 4) * 0.25}s ease-in-out infinite`,
                }} />
              )}
              <span className="relative text-4xl select-none" style={isLit ? { filter: 'drop-shadow(0 0 6px rgba(255,190,70,.9))' } : { filter: 'grayscale(.7) brightness(.5)' }}>🪔</span>
            </button>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="relative z-20 flex items-center justify-center gap-3 px-4 pb-5 pt-2">
        <button onClick={() => setPanel('kadaw')} className="flex-1 max-w-[200px] bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black rounded-2xl py-3 shadow-lg" style={{ animation: kadawDoneCount === 0 ? 'fsPulse 2.2s ease-in-out infinite' : 'none' }}>
          🙏 Pay Respect
        </button>
        <button onClick={() => setPanel('rewards')} className="flex-1 max-w-[200px] bg-white/15 hover:bg-white/25 border border-white/30 font-bold rounded-2xl py-3">
          🎁 Rewards
        </button>
      </div>

      {/* Floating +coins */}
      {floaters.map(f => (
        <div key={f.id} className="fixed z-[9990] pointer-events-none font-black text-amber-300 text-lg drop-shadow" style={{ left: f.x, top: f.y - 24, animation: 'fsFloat 1s ease-out forwards' }}>{f.text} 🪙</div>
      ))}

      {/* Sky lanterns when every lamp is lit */}
      {lanterns.map(l => (
        <div key={l.id} className="fixed z-[9980] pointer-events-none" style={{ left: `${l.x}%`, bottom: -60, fontSize: l.size, animation: `fsRise 6.5s ease-in ${l.delay}s forwards`, opacity: 0 }}>🏮</div>
      ))}

      {/* Paying respect panel */}
      {panel === 'kadaw' && !kadawTarget && (
        <div className="fixed inset-0 z-[9970] bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setPanel(null)}>
          <div className="w-full max-w-md bg-indigo-950 border border-amber-300/40 rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-amber-200 text-center">🙏 Pay Respect</h2>
            <p className="text-xs text-indigo-200 text-center mb-4">Once each, every day</p>
            <div className="grid grid-cols-2 gap-3">
              {festival.kadaw.recipients.map(r => {
                const done = kadawToday.has(r.id);
                return (
                  <button key={r.id} onClick={() => openKadaw(r)} className={`rounded-2xl border-2 p-3 text-center transition ${done ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-amber-300/50 bg-white/5 hover:bg-white/10'}`}>
                    <div className="text-4xl">{r.emoji}</div>
                    <div className="text-sm font-bold mt-1">{r.name}</div>
                    <div className={`text-xs font-bold mt-1 ${done ? 'text-emerald-300' : 'text-amber-300'}`}>{done ? '✅ Done today' : `🪙 +${festival.kadaw.coins}  🪷 +${festival.kadaw.lotus}`}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPanel(null)} className="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">Close</button>
          </div>
        </div>
      )}

      {/* One respect, step by step */}
      {kadawTarget && (
        <div className="fixed inset-0 z-[9975] bg-black/80 flex items-center justify-center px-4" onClick={() => { setKadawTarget(null); }}>
          <div className="w-full max-w-sm bg-indigo-950 border border-amber-300/40 rounded-3xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-6xl" style={{ animation: kadawStage === 'pray' ? 'fsPulse 2s ease-in-out infinite' : 'none' }}>{kadawStage === 'pray' ? '🙇' : '🌸'}</div>
            <h3 className="mt-2 text-lg font-black text-amber-200">{kadawTarget.emoji} {kadawTarget.name}</h3>
            {kadawStage === 'pray' ? (
              <>
                <p className="mt-3 text-base leading-relaxed">{kadawTarget.prayer}</p>
                <p className="mt-3 text-xs text-indigo-300">Read it slowly and say it quietly in your heart, with your hands together.</p>
                <button onClick={handleKadaw} disabled={respectWait > 0} className="mt-4 w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black disabled:opacity-50 disabled:cursor-not-allowed">
                  {respectWait > 0 ? `🙏 Take a quiet moment… ${respectWait}` : '🙏 I Pay Respect'}
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-base leading-relaxed text-amber-100">{kadawTarget.blessing}</p>
                <p className="mt-3 text-sm font-bold text-emerald-300">
                  {kadawStage === 'blessedAgain'
                    ? 'You already paid respect today 🌸 Come back tomorrow.'
                    : isTeacherPreview ? `🪙 +${festival.kadaw.coins}  🪷 +${festival.kadaw.lotus} (preview)` : `🪙 +${festival.kadaw.coins}  🪷 +${festival.kadaw.lotus} — thank you for being grateful.`}
                </p>
                <button onClick={() => setKadawTarget(null)} className="mt-4 w-full py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 font-bold">Sadhu 🙏</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rewards panel */}
      {panel === 'rewards' && (
        <div className="fixed inset-0 z-[9970] bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setPanel(null)}>
          <div className="w-full max-w-md bg-indigo-950 border border-amber-300/40 rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-amber-200 text-center">🎁 Limited-edition rewards</h2>
            <p className="text-xs text-indigo-200 text-center mb-4">Only available during this festival · they are yours to keep</p>
            {festival.dailyGift && (
              <div className="mb-3 rounded-2xl border-2 border-amber-300/70 bg-amber-400/10 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🎁</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">Daily gift box</div>
                    <div className="text-xs text-indigo-200">Pay respect to all {festival.kadaw.recipients.length} every day to get one new Avatar item. One box a day.</div>
                  </div>
                </div>
                <p className={`mt-2 text-xs font-bold ${giftTakenToday ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {giftTakenToday ? '✅ Today\'s gift is opened. Come back tomorrow!' : `Today: ${kadawDoneCount} / ${festival.kadaw.recipients.length} respects`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {festival.dailyGift.pool.map(entry => {
                    const got = ownedFestivalIds.includes(entry.item.id);
                    return (
                      <span key={entry.item.id} title={got ? entry.item.name : 'Surprise!'} className={`w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-sm font-black ${got ? '' : 'bg-white/10 text-indigo-200'}`} style={got ? { background: entry.item.swatch || entry.item.color } : undefined}>
                        {got ? '' : '?'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {festival.rewards.map(rw => {
                const got = unlockedIds.includes(rw.id);
                const req = rw.requires;
                const cur = req.type === 'lamps' ? lampsTotal : festival.kadaw.recipients.filter(r => kadawEver.includes(r.id)).length;
                const need = req.type === 'lamps' ? req.count : festival.kadaw.recipients.length;
                const pct = Math.min(100, Math.round((Math.min(cur, need) / need) * 100));
                return (
                  <div key={rw.id} className={`rounded-2xl border-2 p-3 ${got ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/20 bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full border border-white/30 flex-shrink-0" style={{ background: rw.item.swatch || rw.item.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{rw.item.name}</div>
                        <div className="text-xs text-indigo-200">
                          {req.type === 'lamps' ? `Light ${req.count} lamps in total` : 'Pay respect to all five'}
                        </div>
                      </div>
                    </div>
                    {got ? (
                      <p className="mt-2 text-xs font-bold text-emerald-300">✅ Yours! Wear it in 🧑‍🎨 Avatar → {rw.category === 'outfit' ? 'Outfit' : 'Accessory'}.</p>
                    ) : (
                      <>
                        <div className="mt-2 h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
                        <p className="mt-1 text-xs text-indigo-200">{isTeacherPreview ? 'Preview' : `${Math.min(cur, need)} / ${need}`}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-indigo-300 text-center">
              Every day: {festival.lamps.perDay} lamps × {festival.lamps.coins} 🪙 (+{festival.lamps.allLitBonus} 🪙 bonus for lighting all) and {festival.kadaw.recipients.length} respects × ({festival.kadaw.coins} 🪙 + {festival.kadaw.lotus} 🪷).
            </p>
            <button onClick={() => setPanel(null)} className="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">Close</button>
          </div>
        </div>
      )}

      {/* Daily gift box: drops in at once, opens with fireworks */}
      {giftBox && (
        <div className="fixed inset-0 z-[9998] bg-black/80 flex flex-col items-center justify-center px-4 overflow-hidden">
          {giftOpened && FIREWORK_BURSTS.map(b => (
            <div key={b.id} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="absolute rounded-full" style={{ width: 8, height: 8, background: b.colors[i % b.colors.length], '--angle': `${(i / 14) * 360}deg`, animation: `fsSpark 1.2s ease-out ${b.delay}s infinite` }} />
              ))}
            </div>
          ))}
          {!giftOpened ? (
            <button onClick={() => setGiftOpened(true)} className="relative flex flex-col items-center" aria-label="Open your gift">
              <span className="text-[150px] leading-none select-none" style={{ animation: 'fsDrop 0.9s cubic-bezier(.3,1.4,.5,1) both, fsPulse 1.6s ease-in-out 0.9s infinite', filter: 'drop-shadow(0 0 30px rgba(255,200,80,.9))' }}>🎁</span>
              <span className="mt-4 text-xl font-black text-amber-200">Your daily gift box!</span>
              <span className="mt-1 text-sm text-indigo-200">Tap to open</span>
            </button>
          ) : (
            <div className="relative w-full max-w-sm bg-indigo-950 border-2 border-amber-300 rounded-3xl p-6 text-center" style={{ animation: 'fsPop 0.5s ease-out both' }}>
              <h3 className="text-xl font-black text-amber-200">🎉 You got a new gift!</h3>
              {giftBox.kind === 'item' ? (
                <>
                  <div className="mx-auto mt-3 w-44 h-44 rounded-2xl" style={{ background: 'linear-gradient(180deg,#1b1245,#3a1b5c)' }}>
                    <CharacterSvg
                      skinColor="#FFE0B2"
                      hair={{ style: 'short', color: '#3E2723' }}
                      outfitColor={giftBox.category === 'outfit' ? giftBox.item.color : '#42A5F5'}
                      outfitPattern={giftBox.category === 'outfit' ? giftBox.item.pattern : undefined}
                      accessory={giftBox.category === 'accessory' ? giftBox.item : { kind: 'none', color: null }}
                      className="w-44 h-44"
                    />
                  </div>
                  <p className="mt-3 text-lg font-black">{giftBox.item.name}</p>
                  <p className="text-sm text-indigo-200">{isTeacherPreview ? 'Preview only.' : `It is now in your 🧑‍🎨 Avatar ${giftBox.category === 'outfit' ? 'Outfit' : 'Accessory'} shop. Wear it!`}</p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-5xl">🪙</p>
                  <p className="mt-2 text-lg font-black">+{giftBox.coins} bonus coins</p>
                  <p className="text-sm text-indigo-200">You already have every festival item!</p>
                </>
              )}
              <button onClick={() => { setGiftBox(null); setGiftOpened(false); }} className="mt-4 w-full py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black">Sadhu!</button>
            </div>
          )}
        </div>
      )}

      {/* Reward unlocked */}
      {celebration && (
        <div className="fixed inset-0 z-[9995] bg-black/80 flex items-center justify-center px-4" onClick={() => setCelebration(null)}>
          <div className="w-full max-w-sm bg-indigo-950 border-2 border-amber-300 rounded-3xl p-6 text-center">
            <div className="text-6xl" style={{ animation: 'fsPulse 1.4s ease-in-out infinite' }}>🎉</div>
            <h3 className="mt-2 text-xl font-black text-amber-200">New reward!</h3>
            {celebration.map(rw => (
              <p key={rw.id} className="mt-2 font-bold">{rw.item.name}</p>
            ))}
            <p className="mt-2 text-sm text-indigo-200">Find it in 🧑‍🎨 Avatar and wear it.</p>
            <button onClick={() => setCelebration(null)} className="mt-4 w-full py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black">Sadhu!</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold z-[9996] max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}

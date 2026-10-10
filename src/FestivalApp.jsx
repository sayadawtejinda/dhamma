import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './firebase';
import { spawnFlyingCoins } from './flyingCoins';
import { localDateKey, festivalStatus, loadFestivalSettings, getFestivalList } from './festivals';
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

// Fire balloons drift across the whole sky (x, y in % of the scene).
const BALLOON_SPOTS = [
  { x: 10, y: 26 }, { x: 28, y: 14 }, { x: 44, y: 30 }, { x: 60, y: 12 }, { x: 76, y: 28 },
  { x: 90, y: 16 }, { x: 16, y: 54 }, { x: 36, y: 62 }, { x: 64, y: 56 }, { x: 84, y: 50 },
];

// Waso flowers growing around the Deer Park (% of the scene).
const FLOWER_SPOTS = [
  { x: 8, y: 62 }, { x: 22, y: 54 }, { x: 36, y: 66 }, { x: 14, y: 80 }, { x: 28, y: 90 },
  { x: 92, y: 62 }, { x: 78, y: 54 }, { x: 64, y: 66 }, { x: 86, y: 80 }, { x: 72, y: 90 },
];

// Water pots standing on the ground, left and right of the Bodhi tree (% of the scene).
const POT_SPOTS = [
  { x: 8, y: 80 }, { x: 19, y: 88 }, { x: 30, y: 82 }, { x: 14, y: 70 }, { x: 28, y: 94 },
  { x: 92, y: 80 }, { x: 81, y: 88 }, { x: 70, y: 82 }, { x: 86, y: 70 }, { x: 72, y: 94 },
];

// ---- Pasukula tree ----------------------------------------------------------
// Every student has their own 10 packets each day (which two win is decided by
// a fixed shuffle from their id and the date, so it cannot be re-rolled by
// reloading). One shared doc per festival only holds the pasukula that
// students have thrown and nobody has taken yet: gifts: [{ c, u, n }]. It is
// read only when a student opens a winning "thrown" packet or throws one.
const PASUKULA_PATH = 'artifacts/festival-app/public/data/pasukula';
const hashString = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seededRandom = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pasukulaFound = (prog, dateKey) => { const v = prog?.pasukula?.[dateKey]; return v && typeof v === 'object' ? v : {}; };
// Which packets win for this student today: [0] = a thrown pasukula, [1] = the merit fund.
const winningPackets = (festival, studentUid, dateKey) => {
  const rnd = seededRandom(hashString(`${festival.id}|${studentUid}|${dateKey}`));
  const idx = Array.from({ length: festival.pasukula.packets }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, festival.pasukula.winners);
};

// Opens one of the two winning packets (the other eight are empty, and are
// just shown as empty on the student's own screen -- see PasukulaPanel).
// Whatever was found is recorded per packet, so a packet can't pay twice.
// Returns { coins, from } or { already, coins }.
async function openPasukulaPacket({ festival, studentUid, studentName, slotIdx }) {
  const cfg = festival.pasukula;
  const dateKey = localDateKey();
  const poolRef = doc(db, PASUKULA_PATH, festival.id);
  const progRef = doc(db, PROGRESS_PATH, `${festival.id}_${studentUid}`);
  const rosterRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName));
  const winners = winningPackets(festival, studentUid, dateKey);
  return runTransaction(db, async (tx) => {
    const progSnap = await tx.get(progRef);
    const prog = progSnap.exists() ? progSnap.data() : {};
    const found = pasukulaFound(prog, dateKey);
    if (found[slotIdx] !== undefined) return { already: true, coins: found[slotIdx] };
    const rSnap = await tx.get(rosterRef);
    let coins = 0; let from = null;
    let poolUpdate = null;
    if (slotIdx === winners[0]) {
      // a pasukula another student threw (the oldest waiting one that is not their own) ...
      const poolSnap = await tx.get(poolRef);
      const gifts = poolSnap.exists() ? (poolSnap.data().gifts || []) : [];
      const at = gifts.findIndex(g => g.u !== studentUid);
      if (at >= 0) { coins = gifts[at].c; from = gifts[at].n || 'a friend'; poolUpdate = gifts.filter((_, i) => i !== at); }
      else { coins = pickOne(cfg.autoAmounts); from = 'the merit fund'; } // ... or the merit fund when there is none
    } else if (slotIdx === winners[1]) {
      coins = pickOne(cfg.autoAmounts); from = 'the merit fund';
    } else {
      return { error: true };
    }
    if (poolUpdate) tx.set(poolRef, { gifts: poolUpdate, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(progRef, { studentUid, studentName, festivalId: festival.id, pasukula: { [dateKey]: { ...found, [slotIdx]: coins } } }, { merge: true });
    const r = rSnap.exists() ? rSnap.data() : {};
    const hadBalance = r.coinBalance != null;
    tx.set(rosterRef, { studentName, coinBalance: hadBalance ? increment(coins) : SHRINE_STARTER_COINS + coins }, { merge: true });
    return { coins, from };
  });
}

// Throws some of the student's own coins for another student to find (once a day).
async function throwPasukula({ festival, studentUid, studentName, amount }) {
  const cfg = festival.pasukula;
  const dateKey = localDateKey();
  const poolRef = doc(db, PASUKULA_PATH, festival.id);
  const progRef = doc(db, PROGRESS_PATH, `${festival.id}_${studentUid}`);
  const rosterRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName));
  return runTransaction(db, async (tx) => {
    const poolSnap = await tx.get(poolRef);
    const progSnap = await tx.get(progRef);
    const rSnap = await tx.get(rosterRef);
    const prog = progSnap.exists() ? progSnap.data() : {};
    if (prog.pasukulaThrown?.[dateKey] !== undefined) return { already: true };
    const r = rSnap.exists() ? rSnap.data() : {};
    const hadBalance = r.coinBalance != null;
    const balance = hadBalance ? r.coinBalance : SHRINE_STARTER_COINS;
    if (!Number.isInteger(amount) || amount < 1) return { invalid: true };
    if (amount > balance) return { notEnough: true, balance };
    const gifts = poolSnap.exists() ? (poolSnap.data().gifts || []) : [];
    if (gifts.length >= cfg.maxWaiting) return { full: true };
    tx.set(poolRef, { gifts: [...gifts, { c: amount, u: studentUid, n: studentName }], updatedAt: serverTimestamp() }, { merge: true });
    tx.set(progRef, { studentUid, studentName, festivalId: festival.id, pasukulaThrown: { [dateKey]: amount } }, { merge: true });
    tx.set(rosterRef, { studentName, coinBalance: hadBalance ? increment(-amount) : balance - amount }, { merge: true });
    return { thrown: amount, balance: balance - amount };
  });
}

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

// The Pasukula tree: 10 packets a day, open them one by one -- two of them hold
// coins. `found` = what the winning packets held ({ packetNumber: coins }).
function PasukulaPanel({ festival, studentUid, studentName, isTeacherPreview, found, thrownToday, balance, onClose, onFound, onThrown, onCoins, spawnAt }) {
  const cfg = festival.pasukula;
  const dateKey = localDateKey();
  const emptyKey = `pasukula_empty_${festival.id}_${studentUid || 'preview'}_${dateKey}`;
  const [empties, setEmpties] = useState(() => { try { return JSON.parse(localStorage.getItem(emptyKey) || '[]'); } catch (e) { return []; } });
  const [previewFound, setPreviewFound] = useState({});
  const [busy, setBusy] = useState(false);
  const [lastOpened, setLastOpened] = useState(null); // { idx, coins, from }
  const [amount, setAmount] = useState('');
  const [throwing, setThrowing] = useState(false);
  const [note, setNote] = useState('');
  const winners = useMemo(() => winningPackets(festival, studentUid || 'preview', dateKey), [festival, studentUid, dateKey]);
  const shownFound = isTeacherPreview ? previewFound : found;
  const isOpened = (i) => shownFound[i] !== undefined || empties.includes(i);
  const openedCount = Array.from({ length: cfg.packets }).filter((_, i) => isOpened(i)).length;
  const foundTotal = Object.values(shownFound).reduce((a, b) => a + b, 0);

  const pick = async (idx, e) => {
    if (busy || isOpened(idx)) return;
    setNote('');
    const point = { x: e.clientX, y: e.clientY };
    if (!winners.includes(idx)) {
      // An empty packet needs no server visit; it is only remembered on this device for today.
      const next = [...empties, idx];
      setEmpties(next);
      try { localStorage.setItem(emptyKey, JSON.stringify(next)); } catch (err) { /* ignore */ }
      setLastOpened({ idx, coins: 0 });
      return;
    }
    if (isTeacherPreview) {
      const coins = pickOne(cfg.autoAmounts);
      setPreviewFound(prev => ({ ...prev, [idx]: coins }));
      setLastOpened({ idx, coins, from: 'the merit fund (preview)' });
      return;
    }
    setBusy(true);
    try {
      const res = await openPasukulaPacket({ festival, studentUid, studentName, slotIdx: idx });
      if (res.error) { setNote('Something went wrong. Please try again.'); }
      else {
        onFound(idx, res.coins);
        setLastOpened({ idx, coins: res.coins, from: res.from });
        if (!res.already) { onCoins(res.coins); spawnAt(point, res.coins); }
      }
    } catch (err) { console.error(err); setNote('Could not open it. Check your internet connection and try again.'); }
    setBusy(false);
  };

  const doThrow = async () => {
    const n = parseInt(amount, 10);
    if (!Number.isInteger(n) || n < 1) { setNote('Type how many coins you want to throw.'); return; }
    if (isTeacherPreview) { setNote('Teacher preview: nothing is thrown.'); return; }
    if (n > balance) { setNote(`You only have ${balance} coins.`); return; }
    setBusy(true); setNote('');
    try {
      const res = await throwPasukula({ festival, studentUid, studentName, amount: n });
      if (res.thrown) { onCoins(-res.thrown); onThrown(res.thrown); setThrowing(false); setNote(`🎉 You threw ${res.thrown} coins. Sadhu! Another student will find them.`); }
      else if (res.already) { onThrown(0); setThrowing(false); setNote('You already threw pasukula today. Come back tomorrow. 🌸'); }
      else if (res.full) { setNote('So many gifts are waiting already! Try again tomorrow. 🌸'); }
      else if (res.notEnough) { setNote(`You only have ${res.balance} coins.`); }
      else { setNote('Type a number of coins.'); }
    } catch (err) { console.error(err); setNote('Could not throw it. Check your internet connection and try again.'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[9970] bg-black/75 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-indigo-950 border border-amber-300/40 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black text-amber-200 text-center">🧧 Pasukula Tree</h2>
        <p className="text-xs text-indigo-200 text-center mb-3">Open all {cfg.packets} packets, one by one. {cfg.winners} of them hold coins, the rest are empty. New packets tomorrow!</p>

        <div className="grid grid-cols-5 gap-2 my-3">
          {Array.from({ length: cfg.packets }).map((_, i) => {
            const coins = shownFound[i];
            const won = coins !== undefined;
            const empty = empties.includes(i);
            return (
              <button
                key={i}
                disabled={busy || won || empty}
                onClick={(e) => pick(i, e)}
                aria-label={won ? `Packet with ${coins} coins` : empty ? 'Empty packet' : 'Open this packet'}
                className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center leading-tight ${won ? 'bg-amber-300 border-amber-100 text-indigo-950' : empty ? 'bg-white/10 border-white/15 text-indigo-300' : 'bg-red-600/80 hover:bg-red-500 border-amber-300/70'}`}
                style={!won && !empty ? { animation: `fsPulse ${2 + (i % 3) * 0.4}s ease-in-out ${i * 0.15}s infinite` } : undefined}
              >
                {won ? (<><span className="text-lg">🪙</span><span className="text-sm font-black">{coins}</span></>) : empty ? (<span className="text-[11px] font-bold">empty</span>) : (<span className="text-2xl">🧧</span>)}
              </button>
            );
          })}
        </div>

        <p className="text-center text-sm font-bold text-amber-200">
          {openedCount >= cfg.packets ? `All opened! You found 🪙 ${foundTotal} today. Come back tomorrow.` : `Opened ${openedCount} / ${cfg.packets}${foundTotal > 0 ? ` · found 🪙 ${foundTotal}` : ''}`}
        </p>
        {lastOpened && (
          <div className="mt-2 text-center rounded-xl bg-white/5 border border-white/15 p-2" style={{ animation: 'fsPop .35s ease-out both' }}>
            {lastOpened.coins > 0 ? (
              <>
                <p className="text-lg font-black text-amber-300">🎉 It has {lastOpened.coins} coins!</p>
                <p className="text-xs text-indigo-200">{lastOpened.from ? `A gift from ${lastOpened.from}. Sadhu!` : 'Sadhu!'}</p>
              </>
            ) : (
              <p className="text-sm font-bold text-indigo-200">🌸 This packet is empty. Open the next one!</p>
            )}
          </div>
        )}

        {!thrownToday && !throwing && (
          <div className="mt-4 rounded-2xl border border-amber-300/50 bg-white/5 p-3 text-center">
            <p className="text-sm font-bold">Would you like to throw pasukula too?</p>
            <p className="text-xs text-indigo-200 mt-1">Throw as many of your coins as you like. Another student may find them in a packet.</p>
            <button onClick={() => setThrowing(true)} className="mt-2 w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black">🧧 Yes, I will throw</button>
          </div>
        )}
        {!thrownToday && throwing && (
          <div className="mt-4 rounded-2xl border border-amber-300/50 bg-white/5 p-3 text-center">
            <p className="text-sm font-bold">How many coins? <span className="text-amber-300">(You have 🪙 {balance})</span></p>
            <input type="number" min="1" max={balance} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2 w-full text-center text-xl font-black text-indigo-950 rounded-xl px-3 py-2" placeholder="0" />
            <div className="mt-2 flex gap-2">
              <button disabled={busy} onClick={doThrow} className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black disabled:opacity-50">🧧 Throw it</button>
              <button onClick={() => setThrowing(false)} className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold">Back</button>
            </div>
          </div>
        )}
        {thrownToday && !note && <p className="mt-4 text-center text-xs font-bold text-emerald-300">🧧 You already threw pasukula today.</p>}
        {note && <p className="mt-3 text-center text-sm font-bold text-amber-100">{note}</p>}
        <button onClick={onClose} className="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">Close</button>
      </div>
    </div>
  );
}

// A fire balloon: a real hot-air balloon (striped envelope, ropes, basket and a flame),
// big enough that no student mistakes it for a small party balloon.
const BALLOON_PALETTES = [
  ['#e53935', '#ffca28'], ['#fb8c00', '#fff176'], ['#8e24aa', '#ffb300'], ['#d81b60', '#ffe082'], ['#039be5', '#ffee58'],
];
function HotAirBalloon({ palette = 0, size = 78 }) {
  const [c1, c2] = BALLOON_PALETTES[palette % BALLOON_PALETTES.length];
  const clip = `hab${palette}`;
  const stripes = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 60 84" width={size} height={size * 1.4} style={{ overflow: 'visible', filter: 'drop-shadow(0 0 12px rgba(255,170,60,.9))' }} aria-hidden="true">
      <defs>
        <clipPath id={clip}><path d="M30 2 C6 2 2 26 11 40 C15 47 21 52 23 56 L37 56 C39 52 45 47 49 40 C58 26 54 2 30 2 Z" /></clipPath>
        <radialGradient id={`${clip}g`} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity=".18" /></radialGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {stripes.map(i => <rect key={i} x={2 + i * 9.4} y="0" width="9.6" height="60" fill={i % 2 ? c2 : c1} />)}
        <rect x="0" y="0" width="60" height="60" fill={`url(#${clip}g)`} />
      </g>
      <path d="M23 56 L37 56 L35 59 L25 59 Z" fill="#6d4c41" />
      <line x1="25" y1="59" x2="26.5" y2="68" stroke="#5d4037" strokeWidth="0.8" />
      <line x1="35" y1="59" x2="33.5" y2="68" stroke="#5d4037" strokeWidth="0.8" />
      <rect x="24" y="68" width="12" height="9" rx="1.5" fill="#a1672f" stroke="#6d4c41" strokeWidth="0.8" />
      <path d="M24 71.5 H36 M24 74.5 H36" stroke="#6d4c41" strokeWidth="0.5" />
      <ellipse cx="30" cy="61" rx="3" ry="4.2" fill="#ffd54f" opacity=".95" style={{ animation: 'fsFlicker2 .5s ease-in-out infinite', transformOrigin: '30px 61px' }} />
      <ellipse cx="30" cy="61.5" rx="1.5" ry="2.6" fill="#fff8e1" />
    </svg>
  );
}

// A clay water pot for pouring water on the Bodhi tree's roots.
function WaterPot() {
  return (
    <svg viewBox="0 0 50 56" width="58" height="64" aria-hidden="true">
      <defs>
        <linearGradient id="potBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b9602c" /><stop offset=".45" stopColor="#e08a4a" /><stop offset="1" stopColor="#9a4a20" /></linearGradient>
      </defs>
      <ellipse cx="25" cy="53" rx="15" ry="3" fill="rgba(0,0,0,.25)" />
      <path d="M13 20 C5 29 8 48 25 52 C42 48 45 29 37 20 Z" fill="url(#potBody)" />
      <path d="M10 33 Q25 38 40 33" stroke="#6d3412" strokeWidth="1.4" fill="none" />
      <path d="M12 40 Q25 45 38 40" stroke="#f5c27a" strokeWidth="1" fill="none" strokeDasharray="2 2" />
      <rect x="18" y="12" width="14" height="10" rx="2" fill="#c4672f" />
      <ellipse cx="25" cy="12" rx="9" ry="3.2" fill="#8e3f1b" />
      <ellipse cx="25" cy="12" rx="7" ry="2.2" fill="#6ec6ee" />
      <path d="M16 26 Q14 34 17 42" stroke="rgba(255,255,255,.4)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Tiny deterministic random, so the tree is drawn the same way every render.
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// Nyaung-yay Thwin: the great Bodhi tree in the morning light, its roots on a low brick
// terrace, and a pool of water that grows as pots are poured (`glow`, 0-1).
function BodhiScene({ glow }) {
  const rnd = seeded(7);
  const leaves = Array.from({ length: 150 }, () => {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
    return { x: 200 + Math.cos(a) * 128 * r, y: 82 + Math.sin(a) * 66 * r, s: 0.55 + rnd() * 0.7, rot: (rnd() - 0.5) * 120, tone: Math.floor(rnd() * 4) };
  });
  const tones = ['#2e7d32', '#388e3c', '#4caf50', '#66bb6a'];
  return (
    <svg viewBox="0 0 400 270" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="bdSun" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff3b0" stopOpacity=".95" /><stop offset="1" stopColor="#ffd54f" stopOpacity="0" /></radialGradient>
        <linearGradient id="bdGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8bc34a" /><stop offset="1" stopColor="#558b2f" /></linearGradient>
        <linearGradient id="bdTrunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4e342e" /><stop offset=".5" stopColor="#795548" /><stop offset="1" stopColor="#3e2723" /></linearGradient>
      </defs>
      {/* morning light behind the tree, stronger as the tree is watered */}
      <circle cx="200" cy="90" r="130" fill="url(#bdSun)" opacity={0.35 + glow * 0.55} />
      {/* far hills */}
      <path d="M0 170 Q60 130 130 160 T260 150 T400 165 L400 270 L0 270 Z" fill="#a5d6a7" opacity=".7" />
      <path d="M0 190 Q90 160 180 185 T400 180 L400 270 L0 270 Z" fill="#81c784" opacity=".8" />
      {/* ground */}
      <path d="M0 200 Q200 176 400 200 L400 270 L0 270 Z" fill="url(#bdGround)" />
      {/* the trunk and roots */}
      <path d="M176 200 C182 150 188 120 190 86 L212 86 C214 120 220 150 226 200 C216 196 208 190 201 190 C194 190 186 196 176 200 Z" fill="url(#bdTrunk)" />
      <path d="M172 204 C184 196 190 188 198 192 M230 204 C218 196 212 188 204 192" stroke="#4e342e" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* the canopy of heart-shaped Bodhi leaves */}
      {leaves.map((l, i) => (
        <path key={i} d="M0 -5 C-7 -11 -12 -1 -3 5 L0 15 L3 5 C12 -1 7 -11 0 -5 Z" fill={tones[l.tone]} opacity={0.92} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.s})`} />
      ))}
      {/* low brick terrace around the roots, and the water poured onto it */}
      <ellipse cx="201" cy="206" rx="64" ry="13" fill="#a1887f" />
      <ellipse cx="201" cy="203" rx="60" ry="11" fill="#bcaaa4" />
      <ellipse cx="201" cy="204" rx="50" ry="8.5" fill="#6ec6ee" opacity={0.15 + glow * 0.7} />
      <ellipse cx="201" cy="204" rx="30" ry="4" fill="#fff" opacity={glow * 0.35} />
      {/* a few prayer flags and flowers on the ground */}
      {[[40, 232], [80, 246], [320, 238], [362, 228], [150, 250], [250, 252]].map(([fx, fy], i) => (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <circle r="3.2" fill={['#f8bbd0', '#fff59d', '#ffffff'][i % 3]} />
          <circle r="1.2" fill="#f9a825" />
        </g>
      ))}
    </svg>
  );
}

// A bunch of Waso flowers (golden blossoms on a green stem) to offer to the Buddha.
function WasoFlower() {
  const blossoms = [[25, 12, 7], [14, 20, 6], [36, 20, 6], [19, 31, 5.5], [31, 31, 5.5], [25, 24, 6]];
  return (
    <svg viewBox="0 0 50 66" width="56" height="74" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 8px rgba(255,214,70,.9))' }} aria-hidden="true">
      <path d="M25 62 C24 50 25 42 25 30 M25 44 C18 40 14 36 14 28 M25 44 C32 40 36 36 36 28" stroke="#558b2f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="18" cy="52" rx="7" ry="3" fill="#7cb342" transform="rotate(-25 18 52)" />
      <ellipse cx="32" cy="54" rx="7" ry="3" fill="#7cb342" transform="rotate(25 32 54)" />
      {blossoms.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy={-r * 0.75} rx={r * 0.55} ry={r * 0.8} fill="#ffd600" stroke="#f9a825" strokeWidth="0.5" transform={`rotate(${a})`} />)}
          <circle r={r * 0.32} fill="#ef6c00" />
        </g>
      ))}
    </svg>
  );
}

function Ascetic({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="3" rx="12" ry="3" fill="rgba(0,0,0,.35)" />
      <path d="M-11 2 Q-11 -13 0 -15 Q11 -13 11 2 Z" fill="#a9825a" />
      <path d="M-11 2 Q0 7 11 2 Q0 0 -11 2 Z" fill="#7d5a38" />
      <ellipse cx="0" cy="-8" rx="3.4" ry="2" fill="#e0b088" />
      <circle cx="0.8" cy="-18.5" r="4.7" fill="#e0b088" />
      <path d="M-4.6 -20 Q0.8 -29 6 -20 Z" fill="#3a2a1a" />
      <circle cx="0.8" cy="-26" r="2.6" fill="#3a2a1a" />
    </g>
  );
}

function Deer({ x, y, s = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx="0" cy="3" rx="16" ry="3" fill="rgba(0,0,0,.3)" />
      <ellipse cx="0" cy="-12" rx="14" ry="8" fill="#b9793a" />
      <path d="M-9 -8 L-9 3 M-4 -6 L-4 3 M5 -6 L5 3 M10 -8 L10 3" stroke="#8d5a28" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 -17 Q16 -26 17 -29" stroke="#b9793a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="19" cy="-30" rx="5.6" ry="4" fill="#c88a4a" />
      <circle cx="21" cy="-31" r="0.9" fill="#222" />
      <path d="M17 -34 Q14 -42 11 -40 M17 -34 Q19 -43 22 -42 M16 -37 Q12 -38 9 -36" stroke="#6d4c41" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="-3" cy="-14" r="1" fill="#f5deb3" /><circle cx="3" cy="-11" r="1" fill="#f5deb3" /><circle cx="-7" cy="-10" r="1" fill="#f5deb3" />
    </g>
  );
}

// The Deer Park at Isipatana at dusk on the Waso full moon: the Buddha teaching the first
// sermon to the five ascetics, the golden Wheel of the Dhamma turning in front of Him, deer
// resting nearby. `glow` (0-1, flowers offered today) brightens the halo and the wheel.
function DeerParkScene({ glow }) {
  const rnd = seeded(11);
  const trees = [-6, 52, 110, 290, 348, 406].map((x, i) => ({ x, h: 60 + (i % 3) * 14, w: 30 + (i % 2) * 8 }));
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 400 270" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="dpHalo" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff6c8" /><stop offset=".5" stopColor="#ffd15c" stopOpacity=".55" /><stop offset="1" stopColor="#ffb300" stopOpacity="0" /></radialGradient>
        <linearGradient id="dpGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f7d3a" /><stop offset="1" stopColor="#1d4a22" /></linearGradient>
        <linearGradient id="dpTrunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a2a1a" /><stop offset=".5" stopColor="#5b4128" /><stop offset="1" stopColor="#2c2013" /></linearGradient>
      </defs>
      {trees.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.h} width="16" height={200 - t.h} fill="url(#dpTrunk)" />
          <ellipse cx={t.x + 8} cy={t.h - 8} rx={t.w + 22} ry="40" fill={i % 2 ? '#1e5a2c' : '#17491f'} />
          <ellipse cx={t.x + 22} cy={t.h + 18} rx={t.w + 6} ry="28" fill="#206a30" opacity=".9" />
        </g>
      ))}
      <path d="M0 196 Q200 170 400 196 L400 270 L0 270 Z" fill="url(#dpGround)" />
      {/* the five ascetics, listening */}
      {[{ x: 122, y: 220, s: 1 }, { x: 278, y: 220, s: 1 }, { x: 84, y: 240, s: 1.1 }, { x: 316, y: 240, s: 1.1 }, { x: 200, y: 264, s: 1.1 }].map((m, i) => <Ascetic key={i} {...m} />)}
      <Deer x={40} y={226} s={0.9} />
      <Deer x={364} y={230} s={0.9} flip />
      {/* the Buddha, seated, teaching */}
      <g transform="translate(200 172)">
        <circle cx="0" cy="-46" r="42" fill="url(#dpHalo)" opacity={0.45 + glow * 0.5}>
          <animate attributeName="r" values="40;45;40" dur="5s" repeatCount="indefinite" />
        </circle>
        <ellipse cx="0" cy="5" rx="40" ry="7" fill="rgba(0,0,0,.35)" />
        {[-28, -14, 0, 14, 28].map((px, i) => <ellipse key={px} cx={px} cy={2} rx="10" ry="5.5" fill={i % 2 ? '#fbd0e0' : '#fff0f5'} stroke="#e7a3bd" strokeWidth="0.6" />)}
        <ellipse cx="0" cy="-3" rx="32" ry="7.5" fill="#e08a12" />
        <path d="M-21 -3 Q-23 -38 0 -44 Q23 -38 21 -3 Z" fill="#f0a020" />
        <path d="M-6 -42 L11 -10" stroke="#c9770b" strokeWidth="1.4" fill="none" />
        <ellipse cx="-5" cy="-24" rx="3.4" ry="2.4" fill="#eebb86" /><ellipse cx="5" cy="-24" rx="3.4" ry="2.4" fill="#eebb86" />
        <circle cx="0" cy="-53" r="8" fill="#eebb86" />
        <path d="M-3 -60.5 Q0 -70 3 -60.5 Z" fill="#eebb86" />
        <path d="M-5 -54.4 Q-2.6 -53 -1 -54.4 M1 -54.4 Q2.6 -53 5 -54.4" stroke="#7a4b24" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M-2 -50 Q0 -48.6 2 -50" stroke="#9a5a30" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      </g>
      {/* the golden Wheel of the Dhamma in front of the Buddha */}
      <g transform="translate(200 224) scale(0.72)" opacity={0.8 + glow * 0.2}>
        <ellipse cx="0" cy="6" rx="26" ry="5" fill="rgba(0,0,0,.35)" />
        <g style={{ transformOrigin: '0px -16px' }}>
          <animateTransform attributeName="transform" type="rotate" from="0 0 -16" to="360 0 -16" dur="24s" repeatCount="indefinite" />
          <circle cx="0" cy="-16" r="19" fill="none" stroke="#ffc400" strokeWidth="4" />
          <circle cx="0" cy="-16" r="13" fill="none" stroke="#ffd95a" strokeWidth="1.5" />
          <circle cx="0" cy="-16" r="4.5" fill="#ffb300" stroke="#ff8f00" strokeWidth="1" />
          {spokes.map(a => <line key={a} x1="0" y1="-16" x2="0" y2="-34" stroke="#ffc400" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${a} 0 -16)`} />)}
          {spokes.map(a => <circle key={`r${a}`} cx="0" cy="-35" r="1.8" fill="#ffd95a" transform={`rotate(${a + 22.5} 0 -16)`} />)}
        </g>
      </g>
      {[[60, 150], [130, 120], [270, 130], [335, 160], [200, 100], [95, 190], [305, 185]].map(([fx, fy], i) => (
        <circle key={i} cx={fx} cy={fy} r="1.5" fill="#fff59d" style={{ animation: `fsTwinkle ${2.4 + (i % 4) * 0.7}s ease-in-out ${i * 0.4}s infinite` }} />
      ))}
    </svg>
  );
}

// Tazaungdaing's scene: the Buddha seated in a big, quiet forest on the Tazaungmon full
// moon night (the day of the Samannaphala Sutta), monks sitting around Him listening in
// stillness. `glow` (0-1, how many balloons have gone up today) brightens His halo.
function Monk({ x, y, s = 1, tone = '#d9741c' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="3" rx="12" ry="3" fill="rgba(0,0,0,.35)" />
      <path d="M-11 2 Q-11 -13 0 -15 Q11 -13 11 2 Z" fill={tone} />
      <path d="M-11 2 Q0 7 11 2 Q0 0 -11 2 Z" fill="#a8500f" />
      <path d="M-4 -14 L7 -3" stroke="#b4560f" strokeWidth="1.2" fill="none" />
      <ellipse cx="0" cy="-6" rx="3.4" ry="2" fill="#e9b684" />
      <circle cx="0.8" cy="-18.5" r="4.7" fill="#e9b684" />
      <path d="M-3.6 -21 Q0.8 -24.6 5 -21" fill="none" stroke="#c99061" strokeWidth="0.8" />
    </g>
  );
}

function ForestScene({ glow }) {
  const crowns = [-10, 30, 70, 112, 150, 196, 240, 282, 322, 364, 410];
  const monks = [
    { x: 146, y: 206, s: 0.95 }, { x: 254, y: 206, s: 0.95 },
    { x: 108, y: 220, s: 1.05 }, { x: 292, y: 220, s: 1.05 },
    { x: 70, y: 234, s: 1.15 }, { x: 330, y: 234, s: 1.15 },
    { x: 168, y: 236, s: 1.12 }, { x: 232, y: 236, s: 1.12 },
    { x: 30, y: 246, s: 1.22 }, { x: 370, y: 246, s: 1.22 },
    { x: 120, y: 250, s: 1.25 }, { x: 280, y: 250, s: 1.25 },
  ];
  const haloOpacity = 0.45 + glow * 0.5;
  return (
    <svg viewBox="0 0 400 270" preserveAspectRatio="xMidYMax meet" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="tzHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff6c8" stopOpacity="1" />
          <stop offset="0.45" stopColor="#ffd15c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb300" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tzGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f6b4a" />
          <stop offset="1" stopColor="#0b3a2a" />
        </linearGradient>
        <linearGradient id="tzBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2b8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff2b8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tzTrunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a2a1a" />
          <stop offset="0.5" stopColor="#5b4128" />
          <stop offset="1" stopColor="#2c2013" />
        </linearGradient>
      </defs>

      {/* far tree line: soft dark crowns across the top */}
      {crowns.map((cx, i) => (
        <g key={i} opacity={0.9}>
          <ellipse cx={cx} cy={22 + (i % 3) * 8} rx={34 + (i % 2) * 8} ry={26 + (i % 3) * 5} fill={i % 2 ? '#0a3025' : '#0d3b2d'} />
          <ellipse cx={cx + 12} cy={46 + (i % 2) * 8} rx={30} ry={22} fill="#0b3328" />
        </g>
      ))}
      {/* two great trunks framing the scene */}
      <rect x="-6" y="30" width="34" height="230" fill="url(#tzTrunk)" />
      <rect x="372" y="30" width="34" height="230" fill="url(#tzTrunk)" />
      <ellipse cx="12" cy="40" rx="62" ry="36" fill="#0b3a2b" />
      <ellipse cx="388" cy="40" rx="62" ry="36" fill="#0b3a2b" />
      <ellipse cx="40" cy="78" rx="40" ry="24" fill="#0e4430" />
      <ellipse cx="360" cy="78" rx="40" ry="24" fill="#0e4430" />
      {/* slender trees behind */}
      {[64, 98, 302, 336].map((tx, i) => (
        <g key={tx}>
          <rect x={tx} y={70 + (i % 2) * 6} width="7" height="150" fill="#33261a" opacity="0.85" />
          <ellipse cx={tx + 3.5} cy={66 + (i % 2) * 6} rx="26" ry="20" fill="#0c3a2b" opacity="0.95" />
        </g>
      ))}

      {/* the ground, and a soft light falling on the Buddha from above */}
      <path d="M0 196 Q200 168 400 196 L400 270 L0 270 Z" fill="url(#tzGround)" />
      <path d="M170 0 L230 0 L292 200 L108 200 Z" fill="url(#tzBeam)" opacity={0.35 + glow * 0.4} />

      {/* the monks, listening */}
      {monks.map((m, i) => <Monk key={i} x={m.x} y={m.y} s={m.s} tone={i % 3 === 0 ? '#c8641a' : '#d9741c'} />)}

      {/* the Buddha, seated in the middle on a lotus */}
      <g transform="translate(200 196)">
        <circle cx="0" cy="-48" r="44" fill="url(#tzHalo)" opacity={haloOpacity}>
          <animate attributeName="r" values="42;47;42" dur="5s" repeatCount="indefinite" />
        </circle>
        <ellipse cx="0" cy="5" rx="44" ry="8" fill="rgba(0,0,0,.35)" />
        {[-30, -15, 0, 15, 30].map((px, i) => (
          <ellipse key={px} cx={px} cy={2 + Math.abs(px) * 0.05} rx="11" ry="6" fill={i % 2 ? '#fbd0e0' : '#fff0f5'} stroke="#e7a3bd" strokeWidth="0.6" />
        ))}
        <ellipse cx="0" cy="-3" rx="34" ry="8" fill="#e08a12" />
        <path d="M-22 -3 Q-24 -40 0 -46 Q24 -40 22 -3 Z" fill="#f0a020" />
        <path d="M-6 -44 L12 -10" stroke="#c9770b" strokeWidth="1.4" fill="none" />
        <ellipse cx="0" cy="-11" rx="10" ry="4" fill="#eebb86" />
        <circle cx="0" cy="-55" r="8.4" fill="#eebb86" />
        <path d="M-3 -63 Q0 -73 3 -63 Z" fill="#eebb86" />
        <path d="M-5 -56.4 Q-2.6 -55 -1 -56.4 M1 -56.4 Q2.6 -55 5 -56.4" stroke="#7a4b24" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M-2 -52 Q0 -50.6 2 -52" stroke="#9a5a30" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      </g>

      {/* a few fireflies */}
      {[[60, 150], [130, 120], [270, 130], [335, 160], [200, 100], [95, 190], [305, 185]].map(([fx, fy], i) => (
        <circle key={i} cx={fx} cy={fy} r="1.6" fill="#f6ff9a" style={{ animation: `fsTwinkle ${2.4 + (i % 4) * 0.7}s ease-in-out ${i * 0.4}s infinite` }} />
      ))}
    </svg>
  );
}

export default function FestivalApp({ entryRequest, onExit }) {
  const isTeacherPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  // The opener (home-page banner or the teacher's Festival apps screen)
  // passes in the festival with its current dates applied.
  const baseFestival = entryRequest?.festival || null;
  // The dates / on-off switch the home page used may be up to a few minutes old
  // (they are cached on the device to save reads), so a student entering a
  // festival gets ONE fresh read of the teacher's settings first. If the teacher
  // has switched the festival off or moved the dates since, it closes here.
  const [liveFestival, setLiveFestival] = useState(null);
  const [settingsChecked, setSettingsChecked] = useState(!entryRequest?.studentUid);
  const festival = liveFestival || baseFestival;

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
  const [risers, setRisers] = useState([]);
  const [pourPhase, setPourPhase] = useState({}); // water pots on their way to the tree: { index: 'walk' | 'pour' }
  const [pasukulaFoundMap, setPasukulaFoundMap] = useState({}); // winning packets opened today: { packetNumber: coins }
  const [pasukulaThrown, setPasukulaThrown] = useState(false);
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

  useEffect(() => {
    if (isTeacherPreview || !baseFestival) return;
    let cancelled = false;
    loadFestivalSettings(true).then(st => {
      if (cancelled) return;
      const fresh = getFestivalList(st || {}).find(f => f.id === baseFestival.id);
      if (fresh) setLiveFestival(fresh);
      setSettingsChecked(true);
    }).catch(() => { if (!cancelled) setSettingsChecked(true); });
    return () => { cancelled = true; };
  }, [baseFestival?.id, isTeacherPreview]);

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
        setPasukulaFoundMap(pasukulaFound(p, dateKey));
        setPasukulaThrown(p.pasukulaThrown?.[dateKey] !== undefined);
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
  }, [studentUid, studentName, isTeacherPreview, festival?.id]);

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
    if (festival.lamps.style === 'pot' || festival.lamps.style === 'flower') {
      setPourPhase(prev => ({ ...prev, [i]: 'walk' }));
      setTimeout(() => setPourPhase(prev => ({ ...prev, [i]: 'pour' })), 1000);
      setTimeout(() => setPourPhase(prev => { const n = { ...prev }; delete n[i]; return n; }), 3400);
    }
    if (festival.lamps.style === 'balloon') {
      setRisers(prev => [...prev, { id: fid, x: point.x, y: point.y }]);
      setTimeout(() => setRisers(prev => prev.filter(r => r.id !== fid)), 3200);
    }
    setFloaters(prev => [...prev, { id: fid, x: point.x, y: point.y, text: `+${festival.lamps.coins}` }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== fid)), 1100);
    if (completesAll) {
      releaseLanterns();
      if (festival.lamps.allLitBonus > 0) showToast(`${festival.lamps.icon || '🏮'} All ${festival.lamps.noun || 'lamp'}s done! Bonus +${festival.lamps.allLitBonus} 🪙`);
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
  if (loading || !settingsChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-indigo-950 text-indigo-200">Lighting the lamps…</div>;
  }

  const litCount = lit.size;
  const glow = litCount / festival.lamps.perDay;
  const daysLeft = Math.max(0, Math.round((new Date(`${festival.end}T23:59:59`) - new Date()) / 86400000));
  const rewardState = { lampsTotal, kadawEver };
  const kadawDoneCount = festival.kadaw.recipients.filter(r => kadawToday.has(r.id)).length;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden text-white" style={{ background: festival.scene === 'deer-park' ? 'linear-gradient(180deg,#24153f 0%,#6b3358 30%,#e8964f 60%,#2d5e34 100%)' : festival.scene === 'bodhi-water' ? 'linear-gradient(180deg,#ffd9a0 0%,#fff0c8 30%,#cfe9d6 62%,#9ccc9c 100%)' : festival.scene === 'balloons-night' ? 'linear-gradient(180deg,#04141f 0%,#07302d 40%,#0d4a3a 72%,#0a3024 100%)' : 'linear-gradient(180deg,#070b22 0%,#17104a 45%,#3a1b5c 78%,#5a2a52 100%)' }}>
      <style>{`
        @keyframes fsTwinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
        @keyframes fsFlicker { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: .85 } 35% { transform: translate(-50%,-50%) scale(1.12); opacity: 1 } 70% { transform: translate(-50%,-50%) scale(.94); opacity: .75 } }
        @keyframes fsHint { 0%,100% { box-shadow: 0 0 0 0 rgba(255,214,102,.0) } 50% { box-shadow: 0 0 0 10px rgba(255,214,102,.22) } }
        @keyframes fsFloat { 0% { transform: translate(-50%,0); opacity: 1 } 100% { transform: translate(-50%,-60px); opacity: 0 } }
        @keyframes fsRise { 0% { transform: translateY(0) rotate(-4deg); opacity: 0 } 10% { opacity: 1 } 100% { transform: translateY(-115vh) rotate(6deg); opacity: .9 } }
        @keyframes fsPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.12) } }
        @keyframes fsDrop { 0% { transform: translateY(-110vh) rotate(-10deg) } 100% { transform: translateY(0) rotate(0) } }
        @keyframes fsPop { 0% { transform: scale(.6); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fsFlicker2 { 0%,100% { transform: scaleY(1) scaleX(1) } 50% { transform: scaleY(1.25) scaleX(.85) } }
        @keyframes fsDrip { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(70px); opacity: 0 } }
        @keyframes fsBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes fsRiseAway { 0% { transform: translate(-50%,-50%) scale(1); opacity: 1 } 100% { transform: translate(-50%,-115vh) scale(.5); opacity: 0 } }
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
        {festival.scene !== 'bodhi-water' && stars.map(s => (
          <span key={s.id} className="fs-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
        ))}
        <div className="absolute rounded-full" style={{ right: '12%', top: '9%', width: 74, height: 74, background: 'radial-gradient(circle at 35% 35%,#fffbe6,#ffe9a8 60%,#f3cf6a)', boxShadow: '0 0 60px 22px rgba(255,233,168,.35)' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-14 px-4 text-center">
        <h1 className={`text-xl sm:text-2xl font-black drop-shadow ${festival.scene === 'bodhi-water' ? 'text-emerald-900' : 'text-amber-200'}`}>{festival.icon} {festival.title}</h1>
        <p className={`text-xs sm:text-sm ${festival.scene === 'bodhi-water' ? 'text-emerald-800 font-semibold' : 'text-indigo-200'}`}>{festival.tagline}{!isTeacherPreview && daysLeft >= 0 ? ` · ${daysLeft + 1} day${daysLeft === 0 ? '' : 's'} left` : ''}</p>
        <div className={`mt-2 inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-semibold ${festival.scene === 'bodhi-water' ? 'bg-white/70 text-emerald-900' : 'bg-black/30'}`}>
          <span>{festival.lamps.icon || '🪔'} {litCount}/{festival.lamps.perDay} today</span>
          <span className="opacity-40">|</span>
          <span>🙏 {kadawDoneCount}/{festival.kadaw.recipients.length}</span>
        </div>
        {isTeacherPreview && (
          <p className={`mt-2 mx-auto max-w-md text-xs rounded-lg px-3 py-1.5 border ${festival.scene === 'bodhi-water' ? 'text-amber-900 bg-amber-100 border-amber-300' : 'text-amber-100 bg-amber-500/20 border-amber-300/40'}`}>
            👀 Teacher preview — nothing is saved. Students see this from {festival.start} to {festival.end}.
          </p>
        )}
      </div>

      {/* Scene */}
      <div className="relative z-10 flex-1" style={{ minHeight: 380 }}>
        {festival.scene === 'deer-park' ? (
          <DeerParkScene glow={glow} />
        ) : festival.scene === 'bodhi-water' ? (
          <BodhiScene glow={glow} />
        ) : festival.scene === 'balloons-night' ? (
          <ForestScene glow={glow} />
        ) : (
          <>
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '4%', height: '88%' }}>
              <Pagoda glow={glow} />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[18%] pointer-events-none" style={{ background: 'linear-gradient(180deg,transparent,rgba(20,8,40,.75))' }} />
          </>
        )}
        {festival.lamps.style === 'lamp' || !festival.lamps.style ? LAMP_SPOTS.slice(0, festival.lamps.perDay).map((spot, i) => (i >= 10 ? (
          <div key={`post-${i}`} className="absolute pointer-events-none rounded-sm" style={{ left: `${spot.x}%`, top: `${spot.y}%`, bottom: '6%', width: 4, marginLeft: -2, marginTop: 18, background: 'linear-gradient(180deg,#8d6e63,#3e2723)' }} />
        ) : null)) : null}
        {(festival.lamps.style === 'flower' ? FLOWER_SPOTS : festival.lamps.style === 'pot' ? POT_SPOTS : festival.lamps.style === 'balloon' ? BALLOON_SPOTS : LAMP_SPOTS).slice(0, festival.lamps.perDay).map((spot, i) => {
          const isLit = lit.has(i);
          if (festival.lamps.style === 'balloon') {
            if (isLit) return null;
            return (
              <button key={i} onClick={(e) => handleLamp(i, e)} aria-label="Send up this fire balloon" className="absolute z-20 flex items-center justify-center" style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: 84, height: 112, marginLeft: -42, marginTop: -56, animation: `fsBob ${2.6 + (i % 4) * 0.4}s ease-in-out ${(i % 5) * 0.3}s infinite` }}>
                <HotAirBalloon palette={i} />
              </button>
            );
          }
          if (festival.lamps.style === 'flower') {
            const phase = pourPhase[i];
            if (isLit && !phase) return null;
            const flying = phase === 'walk' || phase === 'pour';
            return (
              <div key={i} className="absolute z-20" style={{ left: `${flying ? 50 : spot.x}%`, top: `${flying ? 62 : spot.y}%`, width: 60, height: 78, marginLeft: -30, marginTop: -39, transition: 'left 1s ease-in-out, top 1s ease-in-out, opacity 0.9s, transform 0.9s', opacity: phase === 'pour' ? 0 : 1, transform: phase === 'pour' ? 'scale(0.3)' : 'scale(1)' }}>
                <button onClick={(e) => handleLamp(i, e)} disabled={isLit} aria-label="Offer this Waso flower to the Buddha" className="relative block w-full h-full" style={{ animation: !isLit ? `fsBob ${2.4 + (i % 4) * 0.3}s ease-in-out ${(i % 5) * 0.25}s infinite` : 'none' }}>
                  <WasoFlower />
                </button>
              </div>
            );
          }
          if (festival.lamps.style === 'pot') {
            const phase = pourPhase[i];
            if (isLit && !phase) return null;
            const toLeft = spot.x < 50;
            const atTree = phase === 'walk' || phase === 'pour';
            const left = atTree ? (toLeft ? 38 : 62) : spot.x;
            const top = atTree ? 70 : spot.y;
            return (
              <div key={i} className="absolute z-20" style={{ left: `${left}%`, top: `${top}%`, width: 64, height: 70, marginLeft: -32, marginTop: -35, transition: 'left 0.95s ease-in-out, top 0.95s ease-in-out' }}>
                <button onClick={(e) => handleLamp(i, e)} disabled={isLit} aria-label="Carry this pot to the Bodhi tree and pour the water" className="relative block w-full h-full"
                  style={{ transform: phase === 'pour' ? `rotate(${toLeft ? 62 : -62}deg)` : 'none', transition: 'transform 0.6s ease-in-out', transformOrigin: '50% 30%', animation: !isLit ? `fsBob ${2.4 + (i % 4) * 0.3}s ease-in-out ${(i % 5) * 0.25}s infinite` : 'none' }}>
                  <WaterPot />
                </button>
                {phase === 'pour' && [0, 1, 2, 3, 4].map(k => (
                  <span key={k} className="absolute pointer-events-none rounded-full" style={{ left: toLeft ? 58 + k * 2 : 4 - k * 2, top: 20, width: 5, height: 9, background: '#4fc3f7', animation: `fsDrip 0.8s ease-in ${k * 0.15}s infinite` }} />
                ))}
              </div>
            );
          }
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
          {festival.kadaw.button || '🙏 Pay Respect'}
        </button>
        {festival.pasukula && (
          <button onClick={() => setPanel('pasukula')} className="flex-1 max-w-[200px] bg-red-500 hover:bg-red-400 text-white font-black rounded-2xl py-3 shadow-lg" style={{ animation: Object.keys(pasukulaFoundMap).length === 0 ? 'fsPulse 2.2s ease-in-out infinite' : 'none' }}>
            🧧 Pasukula
          </button>
        )}
        <button onClick={() => setPanel('rewards')} className={`flex-1 max-w-[200px] font-bold rounded-2xl py-3 border ${festival.scene === 'bodhi-water' ? 'bg-white/80 hover:bg-white text-emerald-900 border-emerald-300' : 'bg-white/15 hover:bg-white/25 border-white/30'}`}>
          🎁 Rewards
        </button>
      </div>

      {/* Floating +coins */}
      {floaters.map(f => (
        <div key={f.id} className="fixed z-[9990] pointer-events-none font-black text-amber-300 text-lg drop-shadow" style={{ left: f.x, top: f.y - 24, animation: 'fsFloat 1s ease-out forwards' }}>{f.text} 🪙</div>
      ))}

      {/* A fire balloon floating up and away */}
      {risers.map(r => (
        <div key={r.id} className="fixed z-[9985] pointer-events-none" style={{ left: r.x, top: r.y, animation: 'fsRiseAway 3s ease-in forwards' }}><HotAirBalloon palette={Math.abs(Math.floor(r.x)) % 5} size={72} /></div>
      ))}

      {/* Sky lanterns when every lamp is lit */}
      {lanterns.map(l => (
        <div key={l.id} className="fixed z-[9980] pointer-events-none" style={{ left: `${l.x}%`, bottom: -60, fontSize: l.size, animation: `fsRise 6.5s ease-in ${l.delay}s forwards`, opacity: 0 }}>🏮</div>
      ))}

      {/* Paying respect panel */}
      {panel === 'kadaw' && !kadawTarget && (
        <div className="fixed inset-0 z-[9970] bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setPanel(null)}>
          <div className="w-full max-w-md bg-indigo-950 border border-amber-300/40 rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-amber-200 text-center">{festival.kadaw.button || '🙏 Pay Respect'}</h2>
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
                  {respectWait > 0 ? `🙏 Take a quiet moment… ${respectWait}` : (festival.kadaw.actionLabel || '🙏 I Pay Respect')}
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-base leading-relaxed text-amber-100">{kadawTarget.blessing}</p>
                <p className="mt-3 text-sm font-bold text-emerald-300">
                  {kadawStage === 'blessedAgain'
                    ? 'You already did this today 🌸 Come back tomorrow.'
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
                    <div className="text-xs text-indigo-200">Complete all {festival.kadaw.recipients.length} {festival.kadaw.doneWord ? festival.kadaw.doneWord.toLowerCase() : 'respects'} every day to get one new Avatar item. One box a day.</div>
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
                          {req.type === 'lamps' ? (festival.lamps.style === 'balloon' ? `Send up ${req.count} fire balloons in total` : `Light ${req.count} lamps in total`) : `Complete all ${festival.kadaw.recipients.length}`}
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
              Every day: {festival.lamps.perDay} {festival.lamps.noun || 'lamp'}s × {festival.lamps.coins} 🪙{festival.lamps.allLitBonus > 0 ? ` (+${festival.lamps.allLitBonus} 🪙 bonus for all)` : ''} and {festival.kadaw.recipients.length} {festival.kadaw.doneWord ? festival.kadaw.doneWord.toLowerCase() : 'respects'} × ({festival.kadaw.coins} 🪙 + {festival.kadaw.lotus} 🪷).
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

      {panel === 'pasukula' && festival.pasukula && (
        <PasukulaPanel
          festival={festival}
          studentUid={studentUid}
          studentName={studentName}
          isTeacherPreview={isTeacherPreview}
          found={pasukulaFoundMap}
          thrownToday={pasukulaThrown}
          balance={coinBalance ?? 0}
          onClose={() => setPanel(null)}
          onFound={(idx, c) => setPasukulaFoundMap(prev => ({ ...prev, [idx]: c }))}
          onThrown={() => setPasukulaThrown(true)}
          onCoins={(n) => setCoinBalance(b => Math.max(0, (b ?? 0) + n))}
          spawnAt={(point) => spawnFlyingCoins(point, 8, '🪙', true)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold z-[9996] max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// A student's personal shrine room -- decorate an altar with offerings
// bought using coins, earned mainly by lighting the lamp once a day.
// Built the same way BodhiTreeApp.jsx is: a fully independent app (not
// part of TutoringApp.jsx), duplicating the small bits of attendance logic
// it needs (getWeekKey/getAttendanceStatus) rather than importing them, so
// it stands alone.

const publicDataPath = `/artifacts/${appId}/public/data`;
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const getAttendanceStatus = (entry, sessions) => {
  if (entry.overrideStatus === 'attended') return 'attended';
  if (entry.overrideStatus === 'absent') return 'absent';
  if (entry.studentUid !== 'offline') {
    const entryDate = entry.startTime.toDate();
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
    const didAttend = (sessions || []).some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
    return didAttend ? 'attended' : 'absent';
  }
  return 'absent';
};
function getWeekKey(date) {
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}
// Same week thresholds as BodhiTreeApp.jsx's title scale -- used here only
// to gate the two Bodhi-tied shrine items, not to show a title itself.
const BODHI_WEEK_MILESTONES = [1, 3, 5, 7, 9, 13, 20, 30, 40, 50];
const BODHI_MILESTONES = BODHI_WEEK_MILESTONES.map(w => w * 7);
const getBodhiStageIndex = (days) => {
  const clamped = Math.max(0, Math.min(BODHI_MILESTONES[BODHI_MILESTONES.length - 1], days));
  let idx = 0;
  for (let i = 0; i < BODHI_MILESTONES.length; i++) if (clamped >= BODHI_MILESTONES[i]) idx = i;
  return idx;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

// --- Buddha statue artwork: Myanmar-style seated meditation figure with
// visible crossed legs, hands resting in dhyana mudra, a flame-tip
// ushnisha, elongated ears, a soft halo, and a lotus base with petals --
// one shared silhouette recolored per statue material. ---
const buddhaSvg = (skinColor, robeColor, baseColor, haloColor, accentColor) => `
  <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="62" r="50" fill="${haloColor}" opacity="0.35"/>
    <g fill="${baseColor}">
      <ellipse cx="100" cy="218" rx="75" ry="12"/>
      <path d="M32,218 Q50,196 66,218 Z"/>
      <path d="M60,218 Q78,192 96,218 Z"/>
      <path d="M104,218 Q122,192 140,218 Z"/>
      <path d="M134,218 Q150,196 168,218 Z"/>
    </g>
    <path d="M45,206 C40,178 55,158 100,158 C145,158 160,178 155,206
             C150,214 130,208 130,196 C130,186 118,182 100,182
             C82,182 70,186 70,196 C70,208 50,214 45,206 Z" fill="${robeColor}"/>
    <path d="M100,80 C72,88 60,116 62,158 L138,158 C140,116 128,88 100,80 Z" fill="${robeColor}"/>
    <path d="M100,90 L100,155" stroke="${baseColor}" stroke-width="2" opacity="0.5"/>
    <path d="M62,145 C50,148 44,158 46,172 L60,172 Z" fill="${robeColor}"/>
    <path d="M138,145 C150,148 156,158 154,172 L140,172 Z" fill="${robeColor}"/>
    <ellipse cx="100" cy="176" rx="17" ry="8" fill="${skinColor}"/>
    <circle cx="88" cy="176" r="6" fill="${skinColor}"/>
    <circle cx="112" cy="176" r="6" fill="${skinColor}"/>
    <rect x="91" y="70" width="18" height="16" fill="${skinColor}"/>
    <path d="M70,50 C60,56 60,74 70,79" stroke="${skinColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M130,50 C140,56 140,74 130,79" stroke="${skinColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="52" r="28" fill="${skinColor}"/>
    <path d="M86,50 Q92,47 98,50" stroke="${accentColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M102,50 Q108,47 114,50" stroke="${accentColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M100,24 C92,24 88,14 94,4 C96,10 100,10 100,4 C100,10 104,10 106,4 C112,14 108,24 100,24 Z" fill="${skinColor}"/>
    <circle cx="100" cy="56" r="1.8" fill="${accentColor}"/>
  </svg>
`;

// --- Shop catalog ---
const BUDDHA_OPTIONS = [
  { id: 'wood', name: 'Wooden Buddha', cost: 0, requiresBodhiStage: 0, svg: buddhaSvg('#8D6E63', '#5D4037', '#4E342E', '#D7CCC8', '#3E2723') },
  { id: 'golden', name: 'Golden Buddha', cost: 30, requiresBodhiStage: 0, svg: buddhaSvg('#FFD54F', '#FFA000', '#FF8F00', '#FFF3C4', '#8D5A00') },
  { id: 'jade', name: 'Jade Buddha', cost: 25, requiresBodhiStage: 5, svg: buddhaSvg('#66BB6A', '#2E7D32', '#1B5E20', '#C8E6C9', '#0D3D14') },
];
const OFFERING_OPTIONS = [
  { id: 'flower', name: 'Lotus Flower', emoji: '🪷', cost: 10 },
  { id: 'water', name: 'Water Offering', emoji: '🥛', cost: 5 },
  { id: 'lamp', name: 'Oil Lamp', emoji: '🪔', cost: 15 },
  { id: 'candle', name: 'Candle', emoji: '🕯️', cost: 8 },
  { id: 'fruit', name: 'Fruit Offering', emoji: '🍊', cost: 8 },
  { id: 'bell', name: 'Bell', emoji: '🔔', cost: 20 },
  { id: 'canopy', name: 'Golden Canopy', emoji: '🎐', cost: 25, requiresBodhiStage: 9 },
];
const ALL_OFFERING_IDS = OFFERING_OPTIONS.map(o => o.id);
const findOffering = (id) => OFFERING_OPTIONS.find(o => o.id === id);
const findBuddha = (id) => BUDDHA_OPTIONS.find(o => o.id === id);

const SLOT_COUNT = 6;
const STARTER_COINS = 20;
const DAILY_LAMP_REWARD = 5;

function playBellSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 2);
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 2);
  } catch (e) { /* ignore -- e.g. no AudioContext support */ }
}

// Fractal Bodhi tree drawn once as a static backdrop (purely decorative --
// unlike BodhiTreeApp.jsx's canvas, this one doesn't grow with attendance).
function BodhiBackdropCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    function drawBranch(len, angle, depth) {
      ctx.beginPath();
      ctx.save();
      ctx.strokeStyle = '#5D4037';
      ctx.fillStyle = '#2E7D32';
      ctx.lineWidth = Math.max(1.5, 12 * (len / 80));
      ctx.rotate((angle * Math.PI) / 180);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();
      ctx.translate(0, -len);
      if (len < 8) {
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      drawBranch(len * 0.75, 25, depth + 1);
      drawBranch(len * 0.75, -25, depth + 1);
      ctx.restore();
    }

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.save();
    ctx.translate(canvas.clientWidth / 2, canvas.clientHeight);
    drawBranch(75, 0, 0);
    ctx.restore();
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-70" />;
}

export default function ShrineRoomApp({ entryRequest, onExit }) {
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [placedItems, setPlacedItems] = useState({}); // { slotIndex: offeringId }
  const [buddhaId, setBuddhaId] = useState(null);
  const [lastLampLitDate, setLastLampLitDate] = useState(null);
  const [bodhiStageIndex, setBodhiStageIndex] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [ringing, setRinging] = useState(false);
  const [toast, setToast] = useState(null);

  const rosterRef = studentUid ? doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName)) : null;

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };

  const persist = (patch) => {
    if (!rosterRef) return;
    setDoc(rosterRef, { studentName, ...patch }, { merge: true }).catch(() => {});
  };

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let isMounted = true;
    (async () => {
      try {
        const [rosterSnap, scheduleSnap, sessionsSnap] = await Promise.all([
          rosterRef ? getDoc(rosterRef) : Promise.resolve(null),
          getDocs(query(collection(db, `${publicDataPath}/teacherSchedule`), where('studentUid', '==', studentUid))),
          getDocs(query(collection(db, `${publicDataPath}/studySessions`), where('studentUid', '==', studentUid))),
        ]);

        const schedule = scheduleSnap.docs.map(d => d.data());
        const sessions = sessionsSnap.docs.map(d => d.data());
        const now = new Date();
        const attendedWeeks = new Set(
          schedule
            .filter(e => e.endTime?.toDate?.() < now && getAttendanceStatus(e, sessions) === 'attended')
            .map(e => getWeekKey(e.startTime.toDate()))
        );
        if (isMounted) setBodhiStageIndex(getBodhiStageIndex(attendedWeeks.size * 7));

        if (rosterSnap && rosterSnap.exists()) {
          const data = rosterSnap.data();
          if (isMounted) {
            setCoinBalance(data.coinBalance ?? STARTER_COINS);
            setPlacedItems(data.placedItems || {});
            setBuddhaId(data.buddhaId || null);
            setLastLampLitDate(data.lastLampLitDate || null);
          }
          if (data.coinBalance == null) persist({ coinBalance: STARTER_COINS });
        } else {
          if (isMounted) setCoinBalance(STARTER_COINS);
          persist({ coinBalance: STARTER_COINS, placedItems: {}, buddhaId: null });
        }
      } catch (e) {
        console.error('Error loading Shrine Room data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  const awardCoins = (delta) => {
    setCoinBalance(prev => {
      const next = Math.max(0, prev + delta);
      persist({ coinBalance: next });
      return next;
    });
  };

  const handleBuyBuddha = (option) => {
    if (option.requiresBodhiStage > bodhiStageIndex) {
      showToast(`Grow your Bodhi Tree further to unlock this.`);
      return;
    }
    if (buddhaId === option.id) return;
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    awardCoins(-option.cost);
    setBuddhaId(option.id);
    persist({ buddhaId: option.id });
    showToast(`${option.name} placed on the altar.`);
  };

  const handleBuyOffering = (option) => {
    if (option.requiresBodhiStage != null && option.requiresBodhiStage > bodhiStageIndex) {
      showToast(`Grow your Bodhi Tree further to unlock this.`);
      return;
    }
    const emptySlot = Array.from({ length: SLOT_COUNT }).findIndex((_, i) => !placedItems[i]);
    if (emptySlot === -1) { showToast('Your altar is full -- remove something first.'); return; }
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    awardCoins(-option.cost);
    setPlacedItems(prev => {
      const next = { ...prev, [emptySlot]: option.id };
      persist({ placedItems: next });
      return next;
    });
    showToast(`${option.name} placed on your altar.`);
  };

  const handleRemoveItem = (slotIndex) => {
    setPlacedItems(prev => {
      const next = { ...prev };
      delete next[slotIndex];
      persist({ placedItems: next });
      return next;
    });
  };

  const handleDragStart = (e, offeringId) => {
    e.dataTransfer.setData('text/plain', offeringId);
  };
  // Dragging a shop item onto a slot still has to pay for it -- this used
  // to skip handleBuyOffering entirely and place the item for free, the
  // same coin/lock checks as a click-to-buy have to happen here too.
  const handleDrop = (e, slotIndex) => {
    e.preventDefault();
    setDragOverSlot(null);
    const offeringId = e.dataTransfer.getData('text/plain');
    const option = findOffering(offeringId);
    if (!option || placedItems[slotIndex]) return;
    if (option.requiresBodhiStage != null && option.requiresBodhiStage > bodhiStageIndex) {
      showToast(`Grow your Bodhi Tree further to unlock this.`);
      return;
    }
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    awardCoins(-option.cost);
    setPlacedItems(prev => {
      const next = { ...prev, [slotIndex]: offeringId };
      persist({ placedItems: next });
      return next;
    });
    showToast(`${option.name} placed on your altar.`);
    if (offeringId === 'bell') { playBellSound(); setRinging(true); setTimeout(() => setRinging(false), 1200); }
  };

  const hasLampPlaced = Object.values(placedItems).includes('lamp');
  const canLightLampToday = hasLampPlaced && lastLampLitDate !== todayKey();

  const handleLightLamp = () => {
    if (!canLightLampToday) return;
    const key = todayKey();
    setLastLampLitDate(key);
    persist({ lastLampLitDate: key });
    awardCoins(DAILY_LAMP_REWARD);
    showToast(`🪔 Lamp lit! +${DAILY_LAMP_REWARD} coins.`);
  };

  const handleRingBell = () => {
    if (!Object.values(placedItems).includes('bell')) return;
    playBellSound();
    setRinging(true);
    setTimeout(() => setRinging(false), 1200);
  };

  const buddha = findBuddha(buddhaId);
  const dimmed = hasLampPlaced && lastLampLitDate === todayKey();

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 pt-6 pb-16 transition-colors duration-1000 ${dimmed ? 'bg-gradient-to-b from-indigo-200 via-amber-100 to-amber-200' : 'bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100'}`}>
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <div className="fixed top-3 right-3 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-amber-200">
        <span className="font-bold text-amber-700">🪙 {coinBalance}</span>
      </div>

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center">{studentName}'s Shrine Room</h1>
      <p className="text-emerald-600 text-sm mb-6">🙏 Decorate your own altar and make daily offerings</p>

      {loading ? (
        <p className="text-emerald-700">Loading your shrine...</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-4xl items-center lg:items-start justify-center">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative w-full max-w-xl h-96">
              <BodhiBackdropCanvas />

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-32 rounded-t-2xl border-4 border-amber-700 shadow-xl flex items-end justify-center pb-3"
                style={{ background: 'linear-gradient(to bottom, #fde68a, #d4af37)' }}
              >
                {buddha ? (
                  <div
                    className={`w-24 h-28 -mt-20 drop-shadow-lg ${ringing ? 'animate-pulse' : ''}`}
                    dangerouslySetInnerHTML={{ __html: buddha.svg }}
                  />
                ) : (
                  <button
                    onClick={() => setShopOpen(true)}
                    className="mb-2 text-xs font-semibold text-amber-800 bg-white/70 hover:bg-white px-3 py-2 rounded-lg border border-dashed border-amber-600"
                  >
                    🛒 Open the shop to pick a Buddha image
                  </button>
                )}
              </div>
            </div>

            {shopOpen ? (
              // Shopping mode -- every slot shown (including empty ones) as
              // a drop target, and placed items get a remove (×) button.
              <div className="grid grid-cols-6 gap-2 -mt-4 z-10">
                {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                  const offeringId = placedItems[i];
                  const offering = offeringId ? findOffering(offeringId) : null;
                  return (
                    <div
                      key={i}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSlot(i); }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={(e) => handleDrop(e, i)}
                      onClick={() => { if (offeringId === 'bell') handleRingBell(); }}
                      className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl relative
                        ${dragOverSlot === i ? 'border-emerald-500 bg-emerald-50 scale-105' : 'border-dashed border-amber-400 bg-white/60'}
                        ${offering?.id === 'lamp' && lastLampLitDate === todayKey() ? 'animate-pulse' : ''}
                        transition-transform`}
                      title={offering ? offering.name : 'Empty slot'}
                    >
                      {offering && <span>{offering.emoji}</span>}
                      {offering && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveItem(i); }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center shadow"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Display mode -- only occupied slots, no border/remove
              // button, so an empty or half-full altar doesn't look cluttered
              // with dashed placeholders.
              Object.keys(placedItems).length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 -mt-4 z-10">
                  {Object.entries(placedItems).map(([i, offeringId]) => {
                    const offering = findOffering(offeringId);
                    if (!offering) return null;
                    return (
                      <div
                        key={i}
                        onClick={() => { if (offeringId === 'bell') handleRingBell(); }}
                        className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl bg-white/60 ${offeringId === 'lamp' && lastLampLitDate === todayKey() ? 'animate-pulse' : ''} ${offeringId === 'bell' ? 'cursor-pointer' : ''}`}
                        title={offering.name}
                      >
                        {offering.emoji}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {hasLampPlaced && (
              <button
                onClick={handleLightLamp}
                disabled={!canLightLampToday}
                className={`mt-6 px-5 py-2.5 rounded-xl font-semibold shadow-md ${canLightLampToday ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                {canLightLampToday ? `🪔 Light the Lamp (+${DAILY_LAMP_REWARD} coins)` : '🪔 Lamp lit for today -- come back tomorrow'}
              </button>
            )}

            <button
              onClick={() => setShopOpen(prev => !prev)}
              className="mt-4 flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-700 font-semibold px-5 py-2.5 rounded-xl shadow-md border-2 border-amber-300"
            >
              {shopOpen ? '✕ Close Shop' : '🛒 Merit Shop'}
            </button>
          </div>

          {/* Merit Shop -- only shown while shopping, as a side panel (not a
              popup covering the altar) so items can be dragged straight
              from here onto the altar slots to the left. */}
          {shopOpen && (
          <div className="w-full lg:w-72 flex-shrink-0 bg-white/85 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-amber-200 p-4 lg:sticky lg:top-24">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-lg font-bold text-amber-700">🛒 Merit Shop</h2>
              <button onClick={() => setShopOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">🪙 {coinBalance} coins available -- tap or drag an item onto the altar</p>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Buddha Image</h3>
            <div className="space-y-2 mb-5">
              {BUDDHA_OPTIONS.map(option => {
                const locked = option.requiresBodhiStage > bodhiStageIndex;
                const owned = buddhaId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleBuyBuddha(option)}
                    disabled={owned}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border ${owned ? 'bg-emerald-50 border-emerald-300' : locked ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-9" dangerouslySetInnerHTML={{ __html: option.svg }} />
                      <span className="font-semibold text-gray-800">{option.name}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700">
                      {owned ? 'Placed' : locked ? `🔒 Bodhi Tree` : option.cost === 0 ? 'Free' : `🪙 ${option.cost}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Offerings</h3>
            <div className="space-y-2">
              {OFFERING_OPTIONS.map(option => {
                const locked = option.requiresBodhiStage != null && option.requiresBodhiStage > bodhiStageIndex;
                return (
                  <button
                    key={option.id}
                    draggable={!locked}
                    onDragStart={(e) => handleDragStart(e, option.id)}
                    onClick={() => handleBuyOffering(option)}
                    disabled={locked}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border ${locked ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-grab'}`}
                  >
                    <span className="font-semibold text-gray-800">{option.emoji} {option.name}</span>
                    <span className="text-sm font-bold text-amber-700">{locked ? '🔒 Bodhi Tree' : `🪙 ${option.cost}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}

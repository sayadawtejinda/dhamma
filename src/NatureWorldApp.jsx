import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, increment, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import OnlineStatusWidget from './OnlineStatusWidget';

// A student's own growing "nature world" -- buy land plots, then plant
// trees on them one at a time, all paid for with coins earned from
// studying. First piece of a bigger idea the teacher wants to grow over
// many future passes (animals wandering around, a pond with fish, etc.) --
// this pass deliberately keeps to land + trees only, in 2D (CSS/emoji, not
// a 3D game engine -- see the chat this was designed in for why).
//
// Same "no wallet of its own" pattern as AvatarApp.jsx: spends directly out
// of the same Shrine Room coin balance every other app already deposits
// into, on the exact same roster doc, just with its own `natureWorld`
// field alongside `avatar`/`coinBalance`/etc.
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');

// Landscape-first by design (a wide plot of land, not a tall one) -- the
// teacher specifically wants a phone held sideways to see the whole world
// at once. GRID_COLS/GRID_ROWS is the maximum a world can ever grow to;
// FREE_PLOTS start already unlocked so a brand-new world isn't empty.
// Sized up (from 6x4, then 8x5) once scenery items (rocks/pond/path) joined
// trees in the shop, so there's room for a garden that isn't wall-to-wall
// trees, and to match the wide landscape view the teacher wants.
const GRID_COLS = 12;
const GRID_ROWS = 5;
const MAX_PLOTS = GRID_COLS * GRID_ROWS;
const FREE_PLOTS = 10;
// Cost to unlock the NEXT plot grows by 50% with every plot already bought
// (see PLOT_COST_GROWTH), so the first few are cheap and a big world takes
// a long time.
// At most this many plots can be bought per week (Monday-based week).
const LAND_PLOTS_PER_WEEK = 2;
const currentWeekKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const FIRST_PLOT_COST = 40;
const PLOT_COST_GROWTH = 1.5; // each plot bought makes the next one cost 150% of the last
const plotCost = (alreadyUnlocked) => Math.round(FIRST_PLOT_COST * Math.pow(PLOT_COST_GROWTH, Math.max(0, alreadyUnlocked - FREE_PLOTS)));

const TREE_OPTIONS = [
  { id: 'pine', name: 'Pine Tree', emoji: '🌲', cost: 10, kind: 'tree' },
  { id: 'oak', name: 'Oak Tree', emoji: '🌳', cost: 15, kind: 'tree' },
  { id: 'palm', name: 'Palm Tree', emoji: '🌴', cost: 15, kind: 'tree' },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', cost: 12, kind: 'tree' },
  { id: 'bare', name: 'Bare Tree', emoji: '🪾', cost: 12, kind: 'tree' },
  { id: 'island', name: 'Palm Island', emoji: '🏝️', cost: 20, kind: 'tree' },
];
// Scenery (rock/pond/path) is no longer sold, but land that already has some
// still needs to draw it -- so these stay defined, just out of the shop.
const DECOR_OPTIONS = [
  { id: 'rock', name: 'Rock', emoji: '🪨', cost: 6, kind: 'decor' },
  { id: 'pond', name: 'Pond', emoji: '🌊', cost: 18, kind: 'decor' },
  { id: 'path', name: 'Path Stone', emoji: '🟫', cost: 4, kind: 'decor' },
];
// Plants that only come as visitor gifts (see GiftBox) -- not sold in the shop.
// A gift never grows; it sits at full size with the giver's name attached.
const GIFT_OPTIONS = [
  { id: 'gift-cherry', name: 'Cherry Blossom', emoji: '🌸', kind: 'gift' },
  { id: 'gift-sunflower', name: 'Sunflower', emoji: '🌻', kind: 'gift' },
  { id: 'gift-tulip', name: 'Tulip', emoji: '🌷', kind: 'gift' },
  { id: 'gift-mushroom', name: 'Mushroom', emoji: '🍄', kind: 'gift' },
  { id: 'gift-potted', name: 'Potted Plant', emoji: '🪴', kind: 'gift' },
  { id: 'gift-shell', name: 'Seashell', emoji: '🐚', kind: 'gift' },
  { id: 'gift-hibiscus', name: 'Hibiscus', emoji: '🌺', kind: 'gift' },
  { id: 'gift-blossom', name: 'Daisy', emoji: '🌼', kind: 'gift' },
  { id: 'gift-clover', name: 'Lucky Clover', emoji: '🍀', kind: 'gift' },
  { id: 'gift-rose', name: 'Rose', emoji: '🌹', kind: 'gift' },
];
const GIFT_BAG_MAX = 30;
// One gift per visiting friend, ever -- keyed by the visitor's name, so
// coming back again doesn't bring another. (Older keys were name + visit
// time; those still count as "already opened" for that name.)
// A visiting classmate only ever gives one gift, however many times they drop
// by -- but a gift the TEACHER personally sends (see TutoringApp's Send Gift
// -> Visit) is its own event each time, so a student visited three separate
// weeks gets three trees, one per visit.
const giftKeyFor = (visit) => visit.teacher ? `teacher:${visit.name}-${visit.visitedAt}` : `gift:${visit.name}`;
const hasOpenedGiftFrom = (opened, visit) => (opened || []).some(k => k === giftKeyFor(visit) || (!visit.teacher && k.startsWith(`${visit.name}-`)));
// Which gift a given visit brings is fixed by the visit itself, so the same
// visitor always shows the same present however many times it's looked at.
const giftForVisit = (key) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GIFT_OPTIONS[h % GIFT_OPTIONS.length];
};
const ITEM_OPTIONS = [...TREE_OPTIONS, ...DECOR_OPTIONS, ...GIFT_OPTIONS];
const findTree = (id) => ITEM_OPTIONS.find(t => t.id === id);

// Same 3 tree shapes, recolored with a CSS filter so a whole plot of land
// doesn't end up looking like a single shade of green -- no extra art
// assets needed.
const COLOR_OPTIONS = [
  { id: 'green', name: 'Green', filter: 'none' },
  { id: 'gold', name: 'Golden', filter: 'hue-rotate(60deg) saturate(1.4)' },
  { id: 'red', name: 'Red', filter: 'hue-rotate(300deg) saturate(1.6)' },
  { id: 'blue', name: 'Blue', filter: 'hue-rotate(170deg) saturate(1.6)' },
  { id: 'purple', name: 'Purple', filter: 'hue-rotate(250deg) saturate(1.5)' },
];
const findColor = (id) => COLOR_OPTIONS.find(c => c.id === id) || COLOR_OPTIONS[0];

// Trees grow week by week, reaching full size after 10 weeks.
const TREE_MAX_GROWTH_WEEKS = 10;
const treeGrowthScale = (plantedAt) => {
  const weeks = Math.min(TREE_MAX_GROWTH_WEEKS, Math.floor((Date.now() - (plantedAt || Date.now())) / (7 * 24 * 60 * 60 * 1000)));
  return 0.55 + (weeks / TREE_MAX_GROWTH_WEEKS) * 0.95;
};

// A little rabbit that hops from plot to plot across the land the student
// owns -- purely decorative, no coins. Picks a random unlocked plot every few
// seconds and glides there, facing the way it's heading.
function Bunny({ unlockedCount, startDelayMs = 0 }) {
  const cellOf = (i) => ({
    left: ((i % GRID_COLS) + 0.5) / GRID_COLS * 100,
    top: (Math.floor(i / GRID_COLS) + 0.5) / GRID_ROWS * 100,
  });
  const randomCell = () => Math.floor(Math.random() * Math.max(1, unlockedCount));
  const [pos, setPos] = useState(() => cellOf(randomCell()));
  // 🐇 (side view) faces left by default, so it's mirrored when heading right.
  const [facingRight, setFacingRight] = useState(false);
  // Touching it shows the front-facing 🐰 for a moment.
  const [surprised, setSurprised] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer;
    const hop = () => {
      if (cancelled) return;
      setPos(prev => {
        const next = cellOf(randomCell());
        if (next.left > prev.left + 0.5) setFacingRight(true);
        else if (next.left < prev.left - 0.5) setFacingRight(false);
        return next;
      });
      timer = setTimeout(hop, 2200 + Math.random() * 2800);
    };
    timer = setTimeout(hop, startDelayMs + 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [unlockedCount]);
  useEffect(() => {
    if (!surprised) return;
    const t = setTimeout(() => setSurprised(false), 1400);
    return () => clearTimeout(t);
  }, [surprised]);
  return (
    <div
      className="absolute z-10 cursor-pointer"
      onClick={(e) => { e.stopPropagation(); setSurprised(true); }}
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 2.2s ease-in-out, top 2.2s ease-in-out',
      }}
    >
      <span className="inline-block text-2xl sm:text-3xl drop-shadow" style={{ animation: 'natureBunnyHop 0.45s ease-in-out infinite' }}>
        <span className="inline-block" style={{ transform: surprised || !facingRight ? 'none' : 'scaleX(-1)' }}>{surprised ? '🐰' : '🐇'}</span>
      </span>
    </div>
  );
}

// Sky over the whole world: rain, snow or sunshine, picked at random each time
// the world is opened and changing again every couple of minutes. Purely
// decorative and never blocks a tap.
const WEATHER_TYPES = ['rain', 'snow', 'sun'];
function Weather() {
  const [type, setType] = useState(() => WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)]);
  useEffect(() => {
    const timer = setInterval(() => {
      setType(prev => {
        const others = WEATHER_TYPES.filter(w => w !== prev);
        return others[Math.floor(Math.random() * others.length)];
      });
    }, 120000);
    return () => clearInterval(timer);
  }, []);
  const particles = useMemo(() => Array.from({ length: type === 'snow' ? 38 : 55 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: -Math.random() * 10,
    duration: type === 'snow' ? 7 + Math.random() * 6 : 0.7 + Math.random() * 0.7,
    size: type === 'snow' ? 12 + Math.random() * 16 : 0,
    sway: (Math.random() - 0.5) * 60,
  })), [type]);
  return (
    <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes natureRainFall { from { transform: translateY(-8vh); } to { transform: translateY(108vh); } }
        @keyframes natureSnowFall { from { transform: translate(0, -8vh) rotate(0deg); } to { transform: translate(var(--sway), 108vh) rotate(360deg); } }
        @keyframes natureSunPulse { 0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 14px rgba(255,200,0,0.9)); } 50% { transform: scale(1.1) rotate(12deg); filter: drop-shadow(0 0 30px rgba(255,190,0,1)); } }
      `}</style>
      {type === 'rain' && (
        <>
          <div className="absolute inset-0 bg-slate-700/10" />
          {particles.map(p => (
            <span key={p.id} className="absolute top-0 w-[2px] h-5 rounded-full bg-sky-500/60"
              style={{ left: `${p.left}%`, animation: `natureRainFall ${p.duration}s linear ${p.delay}s infinite` }} />
          ))}
        </>
      )}
      {type === 'snow' && (
        <>
          <div className="absolute inset-0 bg-sky-100/20" />
          {particles.map(p => (
            <span key={p.id} className="absolute top-0 select-none"
              style={{ left: `${p.left}%`, fontSize: p.size, '--sway': `${p.sway}px`, animation: `natureSnowFall ${p.duration}s linear ${p.delay}s infinite` }}>❄️</span>
          ))}
        </>
      )}
      {type === 'sun' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-200/25 via-transparent to-transparent" />
          <span className="absolute top-14 right-6 text-7xl select-none" style={{ animation: 'natureSunPulse 4s ease-in-out infinite' }}>☀️</span>
        </>
      )}
    </div>
  );
}

// A visitor's gift, wrapped up: the lid lifts and sparkles when opened.
function GiftBox({ opened, onClick }) {
  return (
    <button onClick={onClick} className="relative w-11 h-11 flex-shrink-0 hover:scale-110 transition-transform" aria-label="Open the gift" style={{ animation: opened ? 'none' : 'natureGiftWobble 2.2s ease-in-out infinite' }}>
      <span className="absolute left-1 right-1 bottom-0 h-6 rounded-md bg-gradient-to-b from-pink-400 to-rose-500 shadow-md" />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-2 h-6 bg-yellow-300/90" />
      <span className="absolute left-0 right-0 h-3 rounded-md bg-gradient-to-b from-pink-300 to-pink-500 shadow transition-all duration-500 origin-left"
        style={{ bottom: 22, transform: opened ? 'translateY(-14px) rotate(-28deg)' : 'none' }}>
        <span className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-3 bg-yellow-300/90" />
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-base leading-none">🎀</span>
      </span>
      {opened && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg" style={{ animation: 'natureGiftSparkle 1.4s ease-out forwards' }}>✨</span>}
    </button>
  );
}

// Five seconds of hearts falling. A fresh random mix of colours, sizes, spots
// and speeds every time, so no two gifts look alike.
const HEART_EMOJIS = ['💝', '❤️', '🩷', '🧡', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '💗', '💖'];
function HeartRain({ onDone }) {
  const hearts = useMemo(() => {
    const palette = [...HEART_EMOJIS].sort(() => Math.random() - 0.5).slice(0, 6 + Math.floor(Math.random() * 4));
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      emoji: palette[Math.floor(Math.random() * palette.length)],
      left: Math.random() * 100,
      delay: Math.random() * 2.6,
      duration: 1.8 + Math.random() * 1.6,
      size: 18 + Math.random() * 26,
      drift: (Math.random() - 0.5) * 120,
    }));
  }, []);
  useEffect(() => {
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="fixed inset-0 z-[10010] pointer-events-none overflow-hidden" aria-hidden="true">
      <style>{`@keyframes natureHeartFall { 0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--drift), 108vh) rotate(40deg); opacity: 1; } }`}</style>
      {hearts.map(h => (
        <span key={h.id} className="absolute top-0 select-none"
          style={{ left: `${h.left}%`, fontSize: h.size, '--drift': `${h.drift}px`, opacity: 0, animation: `natureHeartFall ${h.duration}s ease-in ${h.delay}s forwards` }}>{h.emoji}</span>
      ))}
    </div>
  );
}

const DEFAULT_WORLD = { landUnlocked: FREE_PLOTS, placedTrees: {}, giftBag: [], giftsOpened: [] };

export default function NatureWorldApp({ entryRequest, onExit }) {
  const isTeacherPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(isTeacherPreview ? 500 : 0);
  const [world, setWorld] = useState(DEFAULT_WORLD);
  const [toast, setToast] = useState(null);
  const [shopSlot, setShopSlot] = useState(null); // plot index currently shopping, or null
  const [shopCategory, setShopCategory] = useState(null); // 'tree' | 'decor' | null (category picker)
  const [shopPickedTree, setShopPickedTree] = useState(null); // tree option chosen, now picking a color

  // Ambient sky life -- purely decorative, no coins/interaction. Spawns a
  // "wave" every so often: usually a solo bird, sometimes a small flock,
  // occasionally a butterfly instead. Each flyer removes itself once its
  // flight animation finishes.
  const [flyers, setFlyers] = useState([]);
  // Touching a bird or butterfly startles it: it flaps off fast and is gone.
  const [fleeing, setFleeing] = useState({}); // id -> { x, y } where it was when touched
  const startleFlyer = (id, e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setFleeing(prev => (prev[id] ? prev : { ...prev, [id]: { x: r.left, y: r.top } }));
    setTimeout(() => setFlyers(prev => prev.filter(f => f.id !== id)), 1000);
  };
  useEffect(() => {
    let cancelled = false;
    const spawnWave = () => {
      if (cancelled) return;
      const isButterfly = Math.random() < 0.25;
      const count = isButterfly ? 1 : (Math.random() < 0.5 ? 1 : 2 + Math.floor(Math.random() * 3)); // solo or a flock of 2-4
      const wave = Date.now();
      const newFlyers = Array.from({ length: count }).map((_, i) => {
        const id = `${wave}-${i}`;
        const duration = isButterfly ? 14 + Math.random() * 6 : 9 + Math.random() * 5;
        const top = 4 + Math.random() * 22; // stays within the sky band
        const rtl = Math.random() < 0.5;
        return { id, emoji: isButterfly ? '🦋' : '🕊️', duration, top: top + i * 3, delay: i * 0.4, rtl };
      });
      setFlyers(prev => [...prev, ...newFlyers]);
      const maxDuration = Math.max(...newFlyers.map(f => f.duration + f.delay));
      setTimeout(() => {
        if (cancelled) return;
        setFlyers(prev => prev.filter(f => !newFlyers.some(nf => nf.id === f.id)));
      }, (maxDuration + 0.5) * 1000);
      setTimeout(spawnWave, 7000 + Math.random() * 9000);
    };
    const initialTimer = setTimeout(spawnWave, 2000);
    return () => { cancelled = true; clearTimeout(initialTimer); };
  }, []);

  const [recentVisitors, setRecentVisitors] = useState([]);
  const [showVisitorsPanel, setShowVisitorsPanel] = useState(false);
  const [heartRainId, setHeartRainId] = useState(null);
  // Opening a visitor's gift shakes out hearts, and the plant inside goes into
  // the gift bag (once per visit -- reopening just replays the hearts).
  const openGift = (visit) => {
    if (heartRainId) return;
    const key = giftKeyFor(visit);
    const already = hasOpenedGiftFrom(world.giftsOpened, visit);
    if (!already) {
      const bag = world.giftBag || [];
      if (bag.length >= GIFT_BAG_MAX) { showToast('Your gift bag is full -- plant some first!'); return; }
      const gift = giftForVisit(key);
      const nextBag = [...bag, { id: gift.id, from: visit.name, key }];
      const nextOpened = [...(world.giftsOpened || []), key].slice(-300);
      setWorld(prev => ({ ...prev, giftBag: nextBag, giftsOpened: nextOpened }));
      persist({ natureWorld: { giftBag: nextBag, giftsOpened: nextOpened } });
      showToast(`${gift.emoji} ${gift.name} from ${visit.name} -- it's in your gift bag!`);
    }
    setHeartRainId(Date.now());
  };
  const [visitingStudentName, setVisitingStudentName] = useState(null);
  const [visitingWorld, setVisitingWorld] = useState(null);
  const [visitLoading, setVisitLoading] = useState(false);

  const rosterRef = studentUid ? doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName)) : null;

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let isMounted = true;
    (async () => {
      try {
        const snap = rosterRef ? await getDoc(rosterRef) : null;
        if (snap && snap.exists()) {
          const data = snap.data();
          if (isMounted) {
            setCoinBalance(data.coinBalance ?? 0);
            setWorld({ ...DEFAULT_WORLD, ...(data.natureWorld || {}) });
            setRecentVisitors(data.natureWorldRecentVisitors || []);
          }
        }
      } catch (e) {
        console.error('Error loading Nature World data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  // setDoc(ref, {'natureWorld.x': v}, {merge:true}) does NOT nest -- unlike
  // updateDoc, a plain setDoc merge treats a dotted string key as a LITERAL
  // field name (one containing a literal "."), not a nested path (same
  // gotcha AvatarApp.jsx hit and documented). Every persist() call below
  // must pass a genuinely nested object -- setDoc's recursive merge then
  // only touches the exact path given, leaving sibling fields (other
  // plots, other roster fields) alone.
  const persist = (patch) => {
    if (!rosterRef) return;
    setDoc(rosterRef, { studentName, ...patch }, { merge: true }).catch(() => {});
  };

  const handleBuyLand = () => {
    if (world.landUnlocked >= MAX_PLOTS) { showToast('Your whole plot of land is already unlocked!'); return; }
    const weekKey = currentWeekKey();
    const boughtThisWeek = world.landWeekKey === weekKey ? (world.landWeekCount || 0) : 0;
    if (!isTeacherPreview && boughtThisWeek >= LAND_PLOTS_PER_WEEK) { showToast(`You can buy ${LAND_PLOTS_PER_WEEK} plots a week. Come back next week!`); return; }
    const cost = plotCost(world.landUnlocked);
    if (!isTeacherPreview && coinBalance < cost) { showToast('Not enough coins.'); return; }
    if (!isTeacherPreview) {
      setCoinBalance(prev => Math.max(0, prev - cost));
      persist({ coinBalance: increment(-cost) });
    }
    const nextWorld = { ...world, landUnlocked: world.landUnlocked + 1, landWeekKey: weekKey, landWeekCount: boughtThisWeek + 1 };
    setWorld(nextWorld);
    persist({ natureWorld: { landUnlocked: nextWorld.landUnlocked, landWeekKey: weekKey, landWeekCount: nextWorld.landWeekCount } });
    showToast('🟫 New land unlocked!');
  };

  const handlePlantTree = (option, color) => {
    if (shopSlot == null) return;
    if (!isTeacherPreview && coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    if (!isTeacherPreview) {
      setCoinBalance(prev => Math.max(0, prev - option.cost));
      persist({ coinBalance: increment(-option.cost) });
    }
    const treeData = color ? { id: option.id, colorId: color.id, plantedAt: Date.now() } : { id: option.id, plantedAt: Date.now() };
    const nextTrees = { ...world.placedTrees, [shopSlot]: treeData };
    setWorld(prev => ({ ...prev, placedTrees: nextTrees }));
    persist({ natureWorld: { placedTrees: { [shopSlot]: treeData } } });
    showToast(`${option.name} placed!`);
    setShopSlot(null);
    setShopCategory(null);
    setShopPickedTree(null);
  };

  const handlePlantGift = (bagIndex) => {
    if (shopSlot == null) return;
    const bag = world.giftBag || [];
    const item = bag[bagIndex];
    const option = item && findTree(item.id);
    if (!item || !option) return;
    const nextBag = bag.filter((_, i) => i !== bagIndex);
    const data = { id: item.id, from: item.from, plantedAt: Date.now() };
    const nextTrees = { ...world.placedTrees, [shopSlot]: data };
    setWorld(prev => ({ ...prev, placedTrees: nextTrees, giftBag: nextBag }));
    persist({ natureWorld: { placedTrees: { [shopSlot]: data }, giftBag: nextBag } });
    setShopSlot(null); setShopCategory(null); setShopPickedTree(null);
    showToast(`${option.emoji} Planted -- a gift from ${item.from}!`);
  };

  // Tapping a gift plant tells who gave it, and offers to pick it back up
  // into the bag (a gift is never thrown away).
  const handlePickUpGift = (slotIndex) => {
    const placed = world.placedTrees[slotIndex];
    const option = placed && findTree(placed.id);
    if (!option) return;
    if (!window.confirm(`${option.emoji} ${option.name} -- a gift from ${placed.from || 'a friend'}.\n\nPut it back in your gift bag?`)) return;
    const bag = world.giftBag || [];
    if (bag.length >= GIFT_BAG_MAX) { showToast('Your gift bag is full.'); return; }
    const nextBag = [...bag, { id: placed.id, from: placed.from || 'a friend', key: `back-${Date.now()}` }];
    const nextTrees = { ...world.placedTrees };
    delete nextTrees[slotIndex];
    setWorld(prev => ({ ...prev, placedTrees: nextTrees, giftBag: nextBag }));
    persist({ natureWorld: { placedTrees: { [slotIndex]: deleteField() }, giftBag: nextBag } });
  };

  const handleRemoveTree = (slotIndex) => {
    if (!window.confirm('Are you sure you want to remove this item? The coins you spent on it will not be refunded.')) return;
    const nextTrees = { ...world.placedTrees };
    delete nextTrees[slotIndex];
    setWorld(prev => ({ ...prev, placedTrees: nextTrees }));
    persist({ natureWorld: { placedTrees: { [slotIndex]: deleteField() } } });
  };

  // Fetches another student's world read-only and records the visit on
  // their own roster doc -- same pattern as Shrine Room/Avatar/Bodhi Tree.
  const handleVisitStudent = async (targetName) => {
    if (!targetName || targetName === studentName) return;
    setVisitingStudentName(targetName);
    setVisitingWorld(null);
    setVisitLoading(true);
    try {
      const targetRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(targetName));
      const snap = await getDoc(targetRef);
      const data = snap.exists() ? snap.data() : {};
      setVisitingWorld(snap.exists() ? { ...DEFAULT_WORLD, ...(data.natureWorld || {}) } : null);
      if (studentName) {
        const others = (data.natureWorldRecentVisitors || []).filter(v => v.name !== studentName);
        const nextVisitors = [{ name: studentName, visitedAt: Date.now() }, ...others].slice(0, 10);
        setDoc(targetRef, { natureWorldRecentVisitors: nextVisitors }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.error('Error visiting Nature World:', e);
      showToast('Could not open their Nature World.');
      setVisitingStudentName(null);
    }
    setVisitLoading(false);
  };
  const closeVisit = () => { setVisitingStudentName(null); setVisitingWorld(null); };

  const renderGrid = (w, { interactive }) => (
    <div className="relative w-full">
    <div
      className="grid gap-0 w-full"
      style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: MAX_PLOTS }).map((_, i) => {
        const unlocked = i < w.landUnlocked;
        const placed = unlocked ? w.placedTrees[i] : null;
        const tree = placed ? findTree(placed.id) : null;
        const color = placed ? findColor(placed.colorId) : null;
        return (
          <div
            key={i}
            onClick={() => {
              if (!interactive || !unlocked) return;
              if (tree) { if (tree.kind === 'gift') handlePickUpGift(i); else handleRemoveTree(i); return; }
              setShopSlot(i);
              setShopCategory('tree');
            }}
            title={tree && tree.kind === 'gift' ? `${tree.name} -- a gift from ${placed.from || 'a friend'}` : !interactive ? undefined : !unlocked ? 'Locked land' : tree ? `${tree.name} -- tap to remove` : 'Tap to plant or place something'}
            className={`aspect-square flex items-center justify-center text-2xl sm:text-3xl transition-transform border ${
              unlocked
                ? 'bg-gradient-to-b from-lime-200 to-green-300 border-green-400' + (interactive ? ' hover:scale-105 cursor-pointer' : '')
                : 'bg-gray-100 border-dashed border-gray-300'
            }`}
          >
            {tree && tree.kind === 'tree' ? (
              <span className="inline-block" style={{ transform: `scale(${treeGrowthScale(placed.plantedAt)})` }}>
                <span className="inline-block" style={{ animation: 'natureTreeSway 3.2s ease-in-out infinite', filter: color.filter }}>{tree.emoji}</span>
              </span>
            ) : tree && tree.kind === 'gift' ? (
              <span className="inline-block" style={{ animation: 'natureTreeSway 3.6s ease-in-out infinite' }}>{tree.emoji}</span>
            ) : tree ? (
              <span className="inline-block">{tree.emoji}</span>
            ) : unlocked ? (
              interactive ? <span className="text-gray-400 text-lg">+</span> : null
            ) : (
              <span className="text-gray-300">🔒</span>
            )}
          </div>
        );
      })}
    </div>
    <Bunny unlockedCount={w.landUnlocked} />
    <Bunny unlockedCount={w.landUnlocked} startDelayMs={1300} />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-20 pb-16 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100">
      <style>{`
        @keyframes natureTreeSway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        @keyframes natureFlyLTR { 0% { transform: translateX(-10vw) scaleX(-1) translateY(0); } 25% { transform: translateX(30vw) scaleX(-1) translateY(-10px); } 50% { transform: translateX(60vw) scaleX(-1) translateY(6px); } 75% { transform: translateX(90vw) scaleX(-1) translateY(-6px); } 100% { transform: translateX(120vw) scaleX(-1) translateY(0); } }
        @keyframes natureFlyRTL { 0% { transform: translateX(120vw) translateY(0); } 25% { transform: translateX(80vw) translateY(-10px); } 50% { transform: translateX(50vw) translateY(6px); } 75% { transform: translateX(20vw) translateY(-6px); } 100% { transform: translateX(-10vw) translateY(0); } }
        @keyframes natureBunnyHop { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes natureFleeLTR { 0% { transform: translate(0, 0) scaleX(-1); } 12% { transform: translate(-8px, 6px) scaleX(-1); } 100% { transform: translate(70vw, -80vh) scaleX(-1); opacity: 0; } }
        @keyframes natureFleeRTL { 0% { transform: translate(0, 0); } 12% { transform: translate(8px, 6px); } 100% { transform: translate(-70vw, -80vh); opacity: 0; } }
        @keyframes natureGiftWobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
        @keyframes natureGiftSparkle { 0% { opacity: 0; transform: translate(-50%, 6px) scale(0.6); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -26px) scale(1.5); } }
        @keyframes natureFlap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
      {/* Ambient sky life -- birds (solo or in a small flock) and the
          occasional butterfly drift across the top of the screen. Purely
          decorative: no coins; tapping one startles it away. The strip itself
          ignores taps -- only the birds can be touched. */}
      <div className="fixed inset-x-0 top-0 h-40 z-30 pointer-events-none overflow-hidden">
        {flyers.map(f => (
          <div
            key={f.id}
            onClick={(e) => startleFlyer(f.id, e)}
            className="text-2xl p-2 cursor-pointer pointer-events-auto"
            style={fleeing[f.id] ? {
              position: 'fixed',
              left: fleeing[f.id].x,
              top: fleeing[f.id].y,
              animation: `${f.rtl ? 'natureFleeRTL' : 'natureFleeLTR'} 0.9s ease-in forwards`,
            } : {
              position: 'absolute',
              top: `${f.top}%`,
              left: 0,
              animation: `${f.rtl ? 'natureFlyRTL' : 'natureFlyLTR'} ${f.duration}s linear ${f.delay}s forwards`,
            }}
          >
            <span className="inline-block" style={{ animation: 'natureFlap 0.5s ease-in-out infinite' }}>{f.emoji}</span>
          </div>
        ))}
      </div>
      <Weather />
      {heartRainId && <HeartRain key={heartRainId} onDone={() => setHeartRainId(null)} />}
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <OnlineStatusWidget
        rosterPath={SHRINE_ROSTER_PATH}
        studentName={isTeacherPreview ? null : studentName}
        isTeacherMode={isTeacherPreview}
        coinBalance={isTeacherPreview ? null : coinBalance}
        coinIcon="🪙"
        panelTitle="🌿 Students"
        teacherLabel="🧑‍🏫 Teacher"
        showInactiveWarning={false}
        renderActivity={(s) => !isTeacherPreview && s.studentName !== studentName && (
          <button
            onClick={(e) => { e.stopPropagation(); handleVisitStudent(s.studentName); }}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5"
          >
            👣 Visit
          </button>
        )}
      />

      {!isTeacherPreview && (
        <button
          onClick={() => setShowVisitorsPanel(true)}
          className="fixed top-16 right-3 z-50 flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-semibold px-3 py-2 rounded-full shadow-lg border-2 border-emerald-300"
        >
          👣 Visitors{recentVisitors.length > 0 ? ` (${recentVisitors.length})` : ''}
        </button>
      )}

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center">
        {studentName}'s Nature World
      </h1>
      <p className="text-emerald-600 text-sm mb-2 text-center">
        🌱 Buy land, then plant trees with coins you've earned
      </p>
      {/* Landscape hint -- true orientation-lock isn't reliable across
          browsers without a user gesture + Fullscreen API (and doesn't
          work at all on iOS Safari), so this is a nudge, not an
          enforcement -- the grid itself still works fine in portrait,
          just showing less width at once. */}
      <p className="sm:hidden text-xs text-amber-600 font-semibold mb-4 flex items-center gap-1">
        📱 Turn your phone sideways for the widest view!
      </p>

      {/* Scenery backdrop -- layered hills/mountains behind the plot grid so
          it doesn't float on plain white; purely decorative, no interaction. */}
      <div className="w-full max-w-3xl -mb-2" aria-hidden="true">
        <svg viewBox="0 0 600 90" className="w-full h-auto block" preserveAspectRatio="none">
          <path d="M0,90 L0,55 L60,20 L130,55 L200,15 L280,55 L340,30 L420,60 L480,25 L560,55 L600,40 L600,90 Z" fill="#a7c4d9" />
          <path d="M0,90 L0,70 L80,45 L150,70 L230,40 L310,68 L390,48 L470,72 L540,50 L600,68 L600,90 Z" fill="#8fb896" />
          <path d="M0,90 L0,80 L100,66 L220,82 L320,64 L440,82 L520,68 L600,80 L600,90 Z" fill="#6fa476" />
        </svg>
      </div>

      {loading ? (
        <p className="text-emerald-700">Loading your world...</p>
      ) : (
        <>
          <div className="w-full max-w-3xl">
            {renderGrid(world, { interactive: true })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleBuyLand}
              disabled={world.landUnlocked >= MAX_PLOTS}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-3 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {world.landUnlocked >= MAX_PLOTS ? '🟫 Land Fully Unlocked' : `🟫 Unlock Land (🪙 ${plotCost(world.landUnlocked)})`}
            </button>
          </div>
        </>
      )}

      {/* Shop -- opens when an empty unlocked plot is tapped. Category first
          (Trees vs Scenery), then the item, then (trees only) a color. */}
      {shopSlot != null && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4" onClick={() => { setShopSlot(null); setShopCategory(null); setShopPickedTree(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6" onClick={(e) => e.stopPropagation()}>
            {!shopPickedTree ? (
              <>
                <h2 className="text-lg font-bold text-emerald-800 mb-4 text-center">🌱 Plant a Tree</h2>
                <div className="space-y-2 mb-2">
                  {TREE_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setShopPickedTree(option)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    >
                      <span className="font-semibold text-gray-800 flex items-center gap-2">
                        <span className="text-xl">{option.emoji}</span>
                        {option.name}
                      </span>
                      <span className="text-sm font-bold text-emerald-700">🪙 {option.cost}</span>
                    </button>
                  ))}
                </div>
                {(world.giftBag || []).length > 0 && (
                  <div className="mb-3 rounded-xl border border-pink-200 bg-pink-50 p-2">
                    <p className="text-xs font-bold text-pink-700 mb-1.5 px-1">🎁 Gift bag (free)</p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                      {world.giftBag.map((g, gi) => {
                        const opt = findTree(g.id);
                        return opt ? (
                          <button key={g.key || gi} onClick={() => handlePlantGift(gi)} className="flex items-center gap-1.5 bg-white border border-pink-200 hover:bg-pink-100 rounded-lg px-2 py-1.5 text-left">
                            <span className="text-xl">{opt.emoji}</span>
                            <span className="text-[11px] font-semibold text-gray-700 leading-tight truncate">{g.from}</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <button onClick={() => { setShopSlot(null); setShopCategory(null); setShopPickedTree(null); }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl mt-2">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-emerald-800 mb-4 text-center">{shopPickedTree.emoji} Pick a Color</h2>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => handlePlantTree(shopPickedTree, color)}
                      className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    >
                      <span className="text-2xl" style={{ filter: color.filter }}>{shopPickedTree.emoji}</span>
                      <span className="text-xs font-semibold text-gray-700">{color.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShopPickedTree(null)} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl mt-2">
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Visitors -- who has come to see MY world recently. */}
      {showVisitorsPanel && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowVisitorsPanel(false)}>
          <button onClick={() => setShowVisitorsPanel(false)} className="fixed top-3 right-3 z-[10002] w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl font-bold shadow-lg flex items-center justify-center" aria-label="Close">×</button>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-emerald-800 mb-4">👣 Recent Visitors</h2>
            {recentVisitors.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No one has visited your world yet.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto text-left">
                {recentVisitors.map((v, i) => {
                  const isOpened = hasOpenedGiftFrom(world.giftsOpened, v);
                  const gift = giftForVisit(giftKeyFor(v));
                  return (
                    <div key={i} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                      <GiftBox opened={isOpened} onClick={() => openGift(v)} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-800 block truncate">{v.name}{v.teacher ? ' 🧑‍🏫' : ''}</span>
                        <span className="text-xs text-gray-400">{new Date(v.visitedAt).toLocaleString()}</span>
                      </div>
                      {isOpened && <span className="text-2xl" title={gift.name}>{gift.emoji}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowVisitorsPanel(false)} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Visit -- a read-only peek at another student's world. */}
      {visitingStudentName && (
        <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={closeVisit}>
          <button onClick={closeVisit} className="fixed top-3 right-3 z-[10002] w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl font-bold shadow-lg flex items-center justify-center" aria-label="Close">×</button>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-emerald-800 mb-4">🌿 {visitingStudentName}'s Nature World</h2>
            {visitLoading ? (
              <p className="text-sm text-gray-400 py-8">Opening...</p>
            ) : !visitingWorld ? (
              <p className="text-sm text-gray-400 py-8">They haven't started a Nature World yet.</p>
            ) : (
              renderGrid(visitingWorld, { interactive: false })
            )}
            <button onClick={closeVisit} className="mt-5 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl">
              Close
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10002] bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

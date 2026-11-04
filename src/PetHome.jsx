import React, { useEffect, useRef, useState } from 'react';
import { petKindOf, petHunger, mealsOf, HUNGRY_PHRASES, THANKS_PHRASES, LOVE_PHRASES } from './petCatalog';
import { feedPet } from './petActions';
import { playPetSound } from './petSounds';
import PetSprite, { PET_SPRITE_CSS } from './PetSprite';

// The student's pets wandering across the bottom of their home page. Nothing here reads Firebase: the pets
// come from the profile the home page already has, and what a pet is doing (walking, sleeping, begging for
// food...) is decided on the device from the clock and from how long ago it was last fed. The one write is
// feeding a hungry pet when the student taps it (see petActions.js).

const PET_CSS = `
@keyframes petBob { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-5px) rotate(3deg); } }
@keyframes petRun { 0%,100% { transform: translateY(0) rotate(-6deg) scaleX(1.06); } 50% { transform: translateY(-9px) rotate(5deg) scaleX(.96); } }
@keyframes petHop { 0%,100% { transform: translateY(0) scale(1.05,.92); } 40% { transform: translateY(-22px) scale(.95,1.08); } 70% { transform: translateY(-22px); } }
@keyframes petFly { 0%,100% { transform: translateY(-14px) rotate(-8deg); } 25% { transform: translateY(-48px) rotate(6deg); } 50% { transform: translateY(-30px) rotate(-6deg); } 75% { transform: translateY(-58px) rotate(6deg); } }
@keyframes petScamper { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-4px) rotate(6deg); } }
@keyframes petWaddle { 0%,100% { transform: rotate(-11deg); } 50% { transform: rotate(11deg); } }
@keyframes petSleep { 0%,100% { transform: translateY(5px) scale(1,.8); } 50% { transform: translateY(5px) scale(1.03,.85); } }
@keyframes petPlay { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-24px) rotate(10deg); } }
@keyframes petGroom { 0%,100% { transform: rotate(-9deg) translateY(2px); } 50% { transform: rotate(9deg) translateY(2px); } }
@keyframes petTalk { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12) translateY(-3px); } }
@keyframes petBeg { 0%,100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-12px) rotate(6deg); } }
@keyframes petEat { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(4px) rotate(9deg); } }
@keyframes petHappy { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.12); } }
@keyframes petFloat { 0% { transform: translate(-50%,0) scale(.7); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(-50%,-56px) scale(1.15); opacity: 0; } }
@keyframes petToy { 0%,100% { transform: translate(0,0) rotate(0deg); } 25% { transform: translate(calc(var(--d) * 12px),-26px) rotate(120deg); } 50% { transform: translate(calc(var(--d) * 22px),0) rotate(240deg); } 75% { transform: translate(calc(var(--d) * 10px),-14px) rotate(330deg); } }
@keyframes petBubble { 0% { transform: translate(-50%,6px) scale(.7); opacity: 0; } 100% { transform: translate(-50%,0) scale(1); opacity: 1; } }
.pet-a-walk { animation: petBob .5s ease-in-out infinite; }
.pet-a-run { animation: petRun .3s ease-in-out infinite; }
.pet-a-hop { animation: petHop .75s ease-in-out infinite; }
.pet-a-fly { animation: petFly 1.6s ease-in-out infinite; }
.pet-a-scamper { animation: petScamper .2s ease-in-out infinite; }
.pet-a-waddle { animation: petWaddle .55s ease-in-out infinite; }
.pet-a-sleep { animation: petSleep 3.2s ease-in-out infinite; opacity: .88; }
.pet-a-play { animation: petPlay .6s ease-in-out infinite; }
.pet-a-groom { animation: petGroom .35s ease-in-out infinite; }
.pet-a-talk { animation: petTalk .45s ease-in-out infinite; }
.pet-a-beg { animation: petBeg .6s ease-in-out infinite; }
.pet-a-eat { animation: petEat .35s ease-in-out infinite; }
.pet-a-happy { animation: petHappy .5s ease-in-out 3; }
.pet-a-sit { transform: scale(1,.95); }
@media (prefers-reduced-motion: reduce) { [class*="pet-a-"] { animation: none !important; } }
`;

const sleepFor = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const isNight = () => { const h = new Date().getHours(); return h >= 21 || h < 6; };

// Chooses what the pet does next: its own tastes (acts), a lot more sleep at night, and a hungry pet asks for food.
function chooseAct(kind, hunger) {
  const weights = { ...kind.acts };
  if (isNight()) { Object.keys(weights).forEach(k => { weights[k] = k === 'sleep' ? weights[k] * 8 + 4 : weights[k] * 0.3; }); }
  if (hunger === 2) { weights.sleep = 0; weights.beg = 6; }
  else if (hunger === 1) weights.beg = 1.2;
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [act, w] of entries) { r -= w; if (r <= 0) return act; }
  return entries[0][0];
}

const MOVE_ACTS = ['walk', 'run', 'hop', 'scamper', 'waddle', 'fly'];
// the last place the child touched the screen (the pets of the home page come to it, see HomePets)
let lastTap = null;

// where the child last put this pet down (kept on this device only)
const readSpot = (pet) => { try { return JSON.parse(localStorage.getItem(`petSpot_${pet.id}`) || 'null'); } catch (e) { return null; } };

function RoamingPet({ pet, studentUid, layerRef, lane = 0, sizePx, bottomPx, hideName, onFed, foodRef, persist = false, maxScale }) {
  const kind = petKindOf(pet);
  const spot = persist ? readSpot(pet) : null;
  const [x, setX] = useState(() => (spot && typeof spot.x === 'number' ? spot.x : 8 + Math.random() * 82));
  const [bottom, setBottom] = useState(() => (spot && typeof spot.b === 'number' ? spot.b : (bottomPx != null ? bottomPx : 6 + lane * 38)));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ id: null, sx: 0, sy: 0, moved: false, lastX: 0, x: 0, b: 0 });
  const justDraggedRef = useRef(false);
  const [dir, setDir] = useState(Math.random() < 0.5 ? 1 : -1);
  const [action, setAction] = useState('sit');   // the animation class
  const [moveDur, setMoveDur] = useState(0);
  const [say, setSay] = useState(null);
  const [hearts, setHearts] = useState(0);
  const [showFood, setShowFood] = useState(false);
  const busyRef = useRef(false);
  const petRef = useRef(pet);
  petRef.current = pet;
  const xRef = useRef(x);
  xRef.current = x;
  const bottomRef = useRef(bottom);
  bottomRef.current = bottom;
  const homeBottomRef = useRef(bottom);   // the height this pet lives at (where it was put, or its lane); it drifts back there after visiting a child
  const lastComeRef = useRef(0);
  const comeToRef = useRef(null);

  useEffect(() => {
    let alive = true;
    let timer = null;
    const wait = (ms) => new Promise(r => { timer = setTimeout(r, ms); });
    const idle = () => { if (alive && !busyRef.current) setAction('sit'); };
    (async () => {
      await wait(400 + Math.random() * 2500);
      while (alive) {
        const layer = layerRef.current;
        if (!layer || layer.getClientRects().length === 0 || document.hidden || busyRef.current) { await wait(2500); continue; }
        const hunger = petHunger(petRef.current);
        if (persist && lastTap && Date.now() - lastTap.t < 25000 && Date.now() - lastComeRef.current > 12000 && Math.random() < 0.3) {
          await comeToRef.current?.(lastTap.x, lastTap.y, 0);   // the child is busy with something: go and keep them company
          await wait(1000);
          continue;
        }
        if (persist && bottomRef.current > homeBottomRef.current + 10 && Date.now() - lastComeRef.current > 8000) {
          // back down to where this pet lives
          const mode = kind.moves[0];
          setMoveDur(1.6); setAction(mode); setBottom(homeBottomRef.current);
          await wait(1800);
          idle();
          continue;
        }
        const act = chooseAct(kind, hunger);
        if (MOVE_ACTS.includes(act)) {
          const mode = act;
          let target = rand(12, 88);
          const from = xRef.current;
          if (Math.abs(target - from) < 14) target = from < 50 ? from + rand(16, 40) : from - rand(16, 40);
          target = Math.max(12, Math.min(88, target));
          const px = Math.abs(target - from) / 100 * (layerRef.current?.clientWidth || window.innerWidth);
          const speed = kind.speed * (hunger === 2 ? 0.7 : 1) * (mode === 'run' ? 1.5 : 1);
          const dur = Math.max(1, Math.min(14, px / speed));
          setDir(target > from ? 1 : -1);
          setMoveDur(dur);
          setAction(mode);
          setX(target);
          await wait(dur * 1000 + 250);
          idle();
        } else if (act === 'sleep') {
          setAction('sleep');
          await wait((isNight() ? rand(14, 26) : rand(8, 15)) * 1000);
          idle();
        } else if (act === 'talk') {
          setSay(pick(kind.phrases || kind.says));
          setAction('talk');
          await wait(3000);
          if (!busyRef.current) setSay(null);
          idle();
        } else if (act === 'beg') {
          setSay(pick(HUNGRY_PHRASES));
          setAction('beg');
          await wait(3500);
          if (!busyRef.current) setSay(null);
          idle();
        } else if (act === 'play' || act === 'groom') {
          setAction(act);
          await wait(rand(3.5, 6) * 1000);
          idle();
        } else {
          setAction('sit');
          await wait(rand(3, 6) * 1000);
        }
        await wait(rand(0.4, 1.8) * 1000);
      }
    })();
    return () => { alive = false; clearTimeout(timer); };
  }, [kind]);

  // Tap: a hungry pet is fed; a pet that is not hungry just enjoys the attention.
  const onTap = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const p = petRef.current;
    try {
      if (studentUid && petHunger(p) > 0) {
        setSay(null); setAction('eat'); setShowFood(true);
        let result = 'error';
        if (foodRef && mealsOf(foodRef.current?.foods, foodRef.current?.any, p.kind) < 1) result = 'nofood'; // no stock: do not even try
        else { try { result = await feedPet({ studentUid, petId: p.id }); } catch (e) { console.error('Feeding failed:', e); } }
        const ok = result === 'fed';
        if (ok && onFed) onFed(p.id);
        if (result === 'nofood') { setShowFood(false); setAction('beg'); setSay(`No ${kind.foodName ? kind.foodName.toLowerCase() : 'food'} left 🥺`); await sleepFor(2800); return; }
        await sleepFor(2600);
        setShowFood(false);
        setAction('happy');
        playPetSound(p.kind);
        if (ok) { setHearts(n => n + 1); setSay(pick(THANKS_PHRASES)); }
        await sleepFor(1800);
      } else {
        setAction('happy'); setHearts(n => n + 1); setSay(pick(LOVE_PHRASES));
        playPetSound(p.kind);
        await sleepFor(2200);
      }
    } finally {
      setSay(null); setAction('sit'); busyRef.current = false;
    }
  };

  // A touch on the screen: this pet comes over, rubs itself against the child's hand lovingly, and now and then asks for food.
  comeToRef.current = async (cx, cy, delayMs = 0) => {
    if (busyRef.current || dragRef.current.id !== null) return;
    busyRef.current = true;
    lastComeRef.current = Date.now();
    try {
      if (delayMs) await sleepFor(delayMs);
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spriteH = 90;
      const side = Math.random() < 0.5 ? -1 : 1;
      const targetPx = Math.max(rect.left + 40, Math.min(rect.right - 40, cx + side * (46 + Math.random() * 40)));
      const tx = ((targetPx - rect.left) / rect.width) * 100;
      const tb = Math.max(0, Math.min(rect.height - spriteH, rect.bottom - cy - 8));
      const fromPx = (xRef.current / 100) * rect.width;
      const dist = Math.hypot(targetPx - fromPx, tb - bottomRef.current);
      const mode = kind.moves.includes('run') ? 'run' : kind.moves[0];
      const speed = kind.speed * (mode === 'run' ? 1.5 : 1.25);
      const dur = Math.max(0.6, Math.min(6, dist / speed));
      setSay(null); setShowFood(false);
      setDir(targetPx > fromPx ? 1 : -1);
      setMoveDur(dur); setAction(mode); setX(tx); setBottom(tb);
      await sleepFor(dur * 1000 + 150);
      setDir(cx > targetPx ? 1 : -1);      // look at the child's hand
      setAction('nuzzle'); setHearts(n => n + 1);
      await sleepFor(3000 + Math.random() * 2500);
      if (petHunger(petRef.current) > 0 ? Math.random() < 0.7 : Math.random() < 0.15) {
        setSay(pick(HUNGRY_PHRASES)); setAction('beg');
        await sleepFor(3600);
        setSay(null);
      }
    } finally {
      lastComeRef.current = Date.now();
      busyRef.current = false;
      setAction('sit');
    }
  };
  useEffect(() => {
    if (!persist) return undefined;
    const onCome = (e) => {
      if (Math.random() > 0.8) return;   // not every pet every time
      comeToRef.current?.(e.detail.x, e.detail.y, 150 + Math.random() * 900);
    };
    window.addEventListener('pet-come', onCome);
    return () => window.removeEventListener('pet-come', onCome);
  }, [persist]);

  // Carrying a pet: press and drag it anywhere on the screen, let go and it carries on from there. A short tap (no drag) is still a tap.
  const onPointerDown = (e) => {
    if (busyRef.current) return;
    dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, lastX: e.clientX, x: xRef.current, b: bottom };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (d.id !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
      d.moved = true; busyRef.current = true; setDragging(true); setMoveDur(0); setSay(null); setAction('beg');
    }
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spriteH = e.currentTarget.offsetHeight || 80;
    const nx = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    const nb = Math.max(0, Math.min(rect.height - spriteH, rect.bottom - e.clientY - spriteH * 0.5));
    if (Math.abs(e.clientX - d.lastX) > 3) { setDir(e.clientX > d.lastX ? 1 : -1); d.lastX = e.clientX; }
    d.x = nx; d.b = nb;
    setX(nx); setBottom(nb);
  };
  const endDrag = async (e) => {
    const d = dragRef.current;
    if (d.id !== e.pointerId) return;
    dragRef.current = { ...d, id: null };
    if (!d.moved) return;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 80);
    setDragging(false);
    homeBottomRef.current = d.b;
    lastComeRef.current = Date.now();
    if (persist) { try { localStorage.setItem(`petSpot_${pet.id}`, JSON.stringify({ x: d.x, b: d.b })); } catch (err) { /* ignore */ } }
    setAction('happy'); setHearts(n => n + 1);
    await sleepFor(1100);
    busyRef.current = false;
    setAction('sit');
  };

  const hungry = petHunger(pet) === 2;
  return (
    <div
      className="absolute"
      style={{ left: `${x}%`, bottom, transform: 'translateX(-50%)', transition: dragging ? 'none' : `left ${moveDur}s linear, bottom ${moveDur}s linear`, zIndex: dragging ? 80 : 25 + lane }}
    >
      {say && (
        <div className="absolute left-1/2 whitespace-nowrap text-xs sm:text-sm font-bold bg-white text-gray-800 border border-gray-300 rounded-2xl px-3 py-1 shadow-md" style={{ bottom: '100%', marginBottom: 4, animation: 'petBubble .25s ease-out both', pointerEvents: 'none' }}>
          {say}
        </div>
      )}
      {!say && hungry && action !== 'eat' && (
        <div className="absolute left-1/2 text-lg" style={{ bottom: '100%', marginBottom: 2, animation: 'petBeg .8s ease-in-out infinite', pointerEvents: 'none' }}>🍖</div>
      )}
      {action === 'sleep' && <div className="absolute text-base font-bold text-indigo-700" style={{ left: '70%', bottom: '90%', animation: 'petFloat 2.4s ease-out infinite', pointerEvents: 'none' }}>💤</div>}
      {hearts > 0 && <div key={hearts} className="absolute text-2xl" style={{ left: '50%', bottom: '80%', animation: 'petFloat 1.6s ease-out forwards', pointerEvents: 'none' }}>❤️</div>}
      {action === 'play' && <span className="absolute" style={{ '--d': dir, left: dir === 1 ? '96%' : '-30%', bottom: 4, fontSize: 'clamp(26px, 5.5vw, 40px)', lineHeight: 1, animation: 'petToy .8s ease-in-out infinite', pointerEvents: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))' }}>{kind.toy}</span>}
      {showFood && <span className="absolute text-2xl" style={{ left: dir === 1 ? '85%' : '-25%', bottom: 0, animation: 'petEat .35s ease-in-out infinite', pointerEvents: 'none' }}>{kind.food}</span>}
      <button
        type="button"
        onClick={() => { if (justDraggedRef.current) return; onTap(); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-pet="1"
        className="block pointer-events-auto select-none"
        style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1, WebkitTapHighlightColor: 'transparent', touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
        title={`${pet.name} -- tap to ${hungry || petHunger(pet) > 0 ? 'feed' : 'cuddle'}, or drag to carry it`}
      >
        <span style={{ display: 'block', width: (() => { const sc = Math.min(kind.scale || 1, maxScale || 9); return sizePx ? `${Math.round(sizePx * sc)}px` : `calc(clamp(84px, 19vw, 140px) * ${sc})`; })(), transform: `scaleX(${dir})`, transition: 'transform .25s', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.18))' }}>
          <PetSprite kind={pet.kind} state={action} />
        </span>
      </button>
      {!hideName && <div className="text-center text-[10px] sm:text-xs font-bold text-white bg-black/45 rounded-full px-2 mt-0.5 mx-auto w-max max-w-[110px] truncate pointer-events-none">{pet.name}</div>}
    </div>
  );
}

export default function HomePets({ pets, studentUid, foodStock = { foods: {}, any: 0 } }) {
  const layerRef = useRef(null);
  const foodRef = useRef(foodStock);
  foodRef.current = foodStock;
  const list = Array.isArray(pets) ? pets.slice(0, 6) : [];
  const hasPets = !!studentUid && list.length > 0;
  // A touch anywhere on the home page calls the pets: they walk over to that spot (see RoamingPet's comeToRef).
  useEffect(() => {
    if (!hasPets) return undefined;
    let last = 0;
    const onDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('[data-pet]')) return;   // touching a pet itself is its own thing
      const now = Date.now();
      if (now - last < 1500) return;
      last = now;
      lastTap = { x: e.clientX, y: e.clientY, t: now };
      window.dispatchEvent(new CustomEvent('pet-come', { detail: { x: e.clientX, y: e.clientY } }));
    };
    document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', onDown, { capture: true });
  }, [hasPets]);
  if (!hasPets) return null;
  return (
    <>
      <style>{PET_CSS + PET_SPRITE_CSS}</style>
      <div ref={layerRef} className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 25 }}>
        {list.map((pet, i) => <RoamingPet key={pet.id} pet={pet} studentUid={studentUid} layerRef={layerRef} lane={i % 3} foodRef={foodRef} persist />)}
      </div>
    </>
  );
}

// A small grassy yard with ONE pet wandering in it -- used by the Pet app (shop: a sample pet to watch and tap; My Pets: your own pet,
// which can be fed here too). Same behaviour as on the home page.
export function PetYard({ pet, studentUid, height = 130, sizePx = 92, onFed, hideName = false, foodStock = { foods: {}, any: 0 } }) {
  const layerRef = useRef(null);
  const foodRef = useRef(foodStock);
  foodRef.current = foodStock;
  return (
    <>
      <style>{PET_CSS + PET_SPRITE_CSS}</style>
      <div ref={layerRef} className="relative w-full overflow-hidden rounded-xl" style={{ height, background: 'linear-gradient(#cfeaff 0%, #e6f6ff 58%, #b7e08c 58%, #9fd078 100%)' }}>
        <RoamingPet pet={pet} studentUid={studentUid} layerRef={layerRef} sizePx={sizePx} bottomPx={hideName ? 8 : 16} hideName={hideName} onFed={onFed} foodRef={foodRef} maxScale={1.12} />
      </div>
    </>
  );
}

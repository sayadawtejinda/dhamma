import React, { useEffect, useRef, useState } from 'react';
import { petKindOf, petHunger, HUNGRY_PHRASES, THANKS_PHRASES, LOVE_PHRASES } from './petCatalog';
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

function RoamingPet({ pet, studentUid, layerRef, lane = 0, sizePx, bottomPx, hideName, onFed, foodRef }) {
  const kind = petKindOf(pet);
  const [x, setX] = useState(() => 8 + Math.random() * 82);
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
          setSay(pick(kind.phrases || kind.says)); setAction('talk');
          await wait(3000);
          if (!busyRef.current) setSay(null);
          idle();
        } else if (act === 'beg') {
          setSay(pick(HUNGRY_PHRASES)); setAction('beg');
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
        if (foodRef && foodRef.current < 1) result = 'nofood'; // no stock: do not even try
        else { try { result = await feedPet({ studentUid, petId: p.id }); } catch (e) { console.error('Feeding failed:', e); } }
        const ok = result === 'fed';
        if (ok && onFed) onFed(p.id);
        if (result === 'nofood') { setShowFood(false); setAction('beg'); setSay('No food left 🥺 (Pet Shop)'); await sleepFor(2800); return; }
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

  const hungry = petHunger(pet) === 2;
  return (
    <div
      className="absolute"
      style={{ left: `${x}%`, bottom: bottomPx != null ? bottomPx : 6 + lane * 38, transform: 'translateX(-50%)', transition: `left ${moveDur}s linear`, zIndex: 25 + lane }}
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
        onClick={onTap}
        className="block pointer-events-auto select-none cursor-pointer"
        style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}
        title={`${pet.name} -- tap to ${hungry || petHunger(pet) > 0 ? 'feed' : 'cuddle'}`}
      >
        <span style={{ display: 'block', width: sizePx ? `${sizePx}px` : 'clamp(84px, 19vw, 140px)', transform: `scaleX(${dir})`, transition: 'transform .25s', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.18))' }}>
          <PetSprite kind={pet.kind} state={action} />
        </span>
      </button>
      {!hideName && <div className="text-center text-[10px] sm:text-xs font-bold text-white bg-black/45 rounded-full px-2 mt-0.5 mx-auto w-max max-w-[110px] truncate pointer-events-none">{pet.name}</div>}
    </div>
  );
}

export default function HomePets({ pets, studentUid, foodStock = 0 }) {
  const layerRef = useRef(null);
  const foodRef = useRef(foodStock);
  foodRef.current = foodStock;
  const list = Array.isArray(pets) ? pets.slice(0, 6) : [];
  if (!studentUid || list.length === 0) return null;
  return (
    <>
      <style>{PET_CSS + PET_SPRITE_CSS}</style>
      <div ref={layerRef} className="fixed inset-x-0 bottom-0 pointer-events-none overflow-hidden" style={{ height: 230, zIndex: 25 }} aria-hidden={false}>
        {list.map((pet, i) => <RoamingPet key={pet.id} pet={pet} studentUid={studentUid} layerRef={layerRef} lane={i % 3} foodRef={foodRef} />)}
      </div>
    </>
  );
}

// A small grassy yard with ONE pet wandering in it -- used by the Pet app (shop: a sample pet to watch and tap; My Pets: your own pet,
// which can be fed here too). Same behaviour as on the home page.
export function PetYard({ pet, studentUid, height = 130, sizePx = 92, onFed, hideName = false, foodStock = 0 }) {
  const layerRef = useRef(null);
  const foodRef = useRef(foodStock);
  foodRef.current = foodStock;
  return (
    <>
      <style>{PET_CSS + PET_SPRITE_CSS}</style>
      <div ref={layerRef} className="relative w-full overflow-hidden rounded-xl" style={{ height, background: 'linear-gradient(#cfeaff 0%, #e6f6ff 58%, #b7e08c 58%, #9fd078 100%)' }}>
        <RoamingPet pet={pet} studentUid={studentUid} layerRef={layerRef} sizePx={sizePx} bottomPx={hideName ? 8 : 16} hideName={hideName} onFed={onFed} foodRef={foodRef} />
      </div>
    </>
  );
}

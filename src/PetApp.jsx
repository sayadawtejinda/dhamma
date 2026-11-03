import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';
import { PET_KINDS, MAX_PETS, petKindOf, petHunger, formatCoins } from './petCatalog';
import { buyPet, feedPet, renamePet } from './petActions';
import PetSprite, { PET_SPRITE_CSS } from './PetSprite';
import { PetYard } from './PetHome';

// Pet Shop + My Pets. Coins come out of the Shrine Room wallet (the same coins every other app deposits into,
// like the Avatar shop). The pets live on the student's profile doc, so the home page shows them with no extra
// reads. Opening this screen reads two documents (the wallet and the profile); nothing else.
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');
const STUDENTS_PATH = `artifacts/${appId}/public/data/students`;

const APP_CSS = `
@keyframes petAppBounce { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-8px) rotate(4deg); } }
.pet-app-bounce { animation: petAppBounce 1.4s ease-in-out infinite; display: inline-block; }
@media (prefers-reduced-motion: reduce) { .pet-app-bounce { animation: none; } }
`;

const hungerLabel = (level) => (level === 0 ? { text: 'Full and happy', icon: '😋', cls: 'text-emerald-600' }
  : level === 1 ? { text: 'Getting peckish', icon: '🙂', cls: 'text-amber-600' }
  : { text: 'Very hungry!', icon: '😢', cls: 'text-red-600' });

export default function PetApp({ entryRequest, onExit }) {
  const isPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(isPreview ? 50000 : 0);
  const [pets, setPets] = useState([]);
  const [tab, setTab] = useState('shop');
  const [adopting, setAdopting] = useState(null);   // kind id being confirmed
  const [petName, setPetName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [renaming, setRenaming] = useState(null);   // { id, value }
  const [, setTick] = useState(0);

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const [w, s] = await Promise.all([
          getDoc(doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName))),
          getDoc(doc(db, STUDENTS_PATH, studentUid)),
        ]);
        if (!alive) return;
        setCoins(w.exists() ? (w.data().coinBalance ?? 0) : 0);
        setPets(Array.isArray(s.data()?.pets) ? s.data().pets : []);
      } catch (e) { console.error('Error loading pets:', e); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [studentUid]);

  useEffect(() => {
    const onGift = (e) => setCoins(c => c + (e.detail?.coins || 0));
    window.addEventListener('dhamma-wallet-gift', onGift);
    const t = setInterval(() => setTick(x => x + 1), 60000); // hunger labels move on with the clock
    return () => { window.removeEventListener('dhamma-wallet-gift', onGift); clearInterval(t); };
  }, []);

  const openAdopt = (kindId) => {
    if (isPreview) { showToast('Preview mode -- nothing can be bought here.'); return; }
    const info = PET_KINDS[kindId];
    if (pets.length >= MAX_PETS) { showToast(`Your home is full (${MAX_PETS} pets).`); return; }
    if (coins < info.price) { showToast(`You need ${formatCoins(info.price - coins)} more coins.`); return; }
    setPetName(info.name);
    setAdopting(kindId);
  };

  const confirmAdopt = async () => {
    if (!adopting || busy) return;
    setBusy(true);
    try {
      const result = await buyPet({ studentUid, studentName, kind: adopting, petName });
      if (result.ok) {
        setCoins(result.balance);
        setPets(prev => [...prev, result.pet]);
        setAdopting(null);
        setTab('mine');
        showToast(`🎉 ${result.pet.name} is now at your home!`);
      } else if (result.reason === 'coins') {
        setCoins(result.balance ?? coins); setAdopting(null); showToast('Not enough coins.');
      } else if (result.reason === 'full') {
        setAdopting(null); showToast(`Your home is full (${MAX_PETS} pets).`);
      } else { setAdopting(null); showToast('Something went wrong. Please try again.'); }
    } catch (e) {
      console.error('Error adopting pet:', e);
      showToast('Something went wrong. Please try again.');
    }
    setBusy(false);
  };

  const handleFeed = async (pet) => {
    if (isPreview || busy) return;
    setBusy(true);
    try {
      const ok = await feedPet({ studentUid, petId: pet.id });
      if (ok) { setPets(prev => prev.map(p => (p.id === pet.id ? { ...p, fedAt: Date.now() } : p))); showToast(`${pet.name} enjoyed the ${petKindOf(pet).food}! ❤️`); }
      else showToast(`${pet.name} is not hungry right now.`);
    } catch (e) { console.error('Feeding failed:', e); showToast('Something went wrong. Please try again.'); }
    setBusy(false);
  };

  const submitRename = async () => {
    if (!renaming || isPreview) { setRenaming(null); return; }
    const clean = renaming.value.trim().slice(0, 16);
    if (!clean) { setRenaming(null); return; }
    try {
      if (await renamePet({ studentUid, petId: renaming.id, name: clean })) setPets(prev => prev.map(p => (p.id === renaming.id ? { ...p, name: clean } : p)));
    } catch (e) { console.error('Rename failed:', e); }
    setRenaming(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading your pets...</div>;

  const adoptInfo = adopting ? PET_KINDS[adopting] : null;
  const shopList = Object.entries(PET_KINDS).sort((a, b) => a[1].price - b[1].price);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-50 pb-16">
      <style>{APP_CSS + PET_SPRITE_CSS}</style>
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-emerald-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onExit} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">← Back</button>
          <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-emerald-700">🐾 Pets</h1>
          <div className="px-4 py-2 rounded-full bg-amber-100 border border-amber-300 font-extrabold text-amber-700 shadow-sm" title="Your Shrine Room coins">🪙 {formatCoins(coins)}</div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-2">
          <button onClick={() => setTab('shop')} className={`flex-1 py-2 rounded-xl font-bold ${tab === 'shop' ? 'bg-emerald-500 text-white shadow' : 'bg-white text-emerald-700 border border-emerald-200'}`}>🏪 Pet Shop</button>
          <button onClick={() => setTab('mine')} className={`flex-1 py-2 rounded-xl font-bold ${tab === 'mine' ? 'bg-emerald-500 text-white shadow' : 'bg-white text-emerald-700 border border-emerald-200'}`}>🏠 My Pets ({pets.length}/{MAX_PETS})</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        {isPreview && <p className="mb-4 text-sm text-center bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-3 py-2">Preview mode -- a student's own coins and pets show here.</p>}

        {tab === 'shop' && (
          <>
            <p className="text-sm text-gray-600 mb-4 text-center">Adopt a pet with your coins. It will live on your home page, play, sleep and ask you for food. You can have up to {MAX_PETS}.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {shopList.map(([id, info]) => {
                const affordable = coins >= info.price;
                return (
                  <div key={id} className="bg-white rounded-2xl shadow-md border border-emerald-100 p-3 flex flex-col items-center text-center">
                    <PetYard pet={{ id: `demo_${id}`, kind: id, name: info.name, boughtAt: Date.now(), fedAt: Date.now() }} height={140} sizePx={112} hideName />
                    <p className="mt-1 font-extrabold text-gray-800">{info.name}</p>
                    <p className="text-xs text-gray-500 min-h-[48px] mt-1">{info.blurb}</p>
                    <div className="mt-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-extrabold text-sm">🪙 {formatCoins(info.price)}</div>
                    <button
                      onClick={() => openAdopt(id)}
                      className={`mt-2 w-full py-2 rounded-xl font-bold ${affordable ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow' : 'bg-gray-200 text-gray-500'}`}
                    >
                      {affordable ? 'Adopt' : `Need ${formatCoins(info.price - coins)} more`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'mine' && (
          pets.length === 0 ? (
            <div className="text-center bg-white rounded-2xl shadow p-8 border border-emerald-100">
              <p className="text-6xl mb-3">🏠</p>
              <p className="font-bold text-gray-700">You have no pets yet.</p>
              <button onClick={() => setTab('shop')} className="mt-4 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow">Visit the Pet Shop</button>
            </div>
          ) : (
            <div className="space-y-3">
              {pets.map(pet => {
                const info = petKindOf(pet);
                const level = petHunger(pet);
                const label = hungerLabel(level);
                const days = Math.max(0, Math.floor((Date.now() - (pet.boughtAt || Date.now())) / 86400000));
                return (
                  <div key={pet.id} className="bg-white rounded-2xl shadow-md border border-emerald-100 p-4 flex items-center gap-4">
                    <div className="w-36 sm:w-44 flex-shrink-0"><PetYard pet={pet} studentUid={isPreview ? null : studentUid} height={124} sizePx={96} hideName onFed={(petId) => setPets(prev => prev.map(p => (p.id === petId ? { ...p, fedAt: Date.now() } : p)))} /></div>
                    <div className="flex-1 min-w-0">
                      {renaming?.id === pet.id ? (
                        <div className="flex gap-2">
                          <input
                            autoFocus value={renaming.value} maxLength={16}
                            onChange={(e) => setRenaming({ id: pet.id, value: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }}
                            className="flex-1 min-w-0 px-3 py-1 border-2 border-emerald-300 rounded-lg font-bold text-gray-800"
                          />
                          <button onClick={submitRename} className="px-3 rounded-lg bg-emerald-500 text-white font-bold">OK</button>
                        </div>
                      ) : (
                        <p className="font-extrabold text-lg text-gray-800 truncate">
                          {pet.name}
                          <button onClick={() => setRenaming({ id: pet.id, value: pet.name })} className="ml-2 text-sm text-gray-400 hover:text-emerald-600" title="Rename">✏️</button>
                        </p>
                      )}
                      <p className="text-xs text-gray-500">{info.name} · with you {days === 0 ? 'since today' : `${days} day${days === 1 ? '' : 's'}`}</p>
                      <p className={`text-sm font-bold ${label.cls}`}>{label.icon} {label.text}</p>
                    </div>
                    <button
                      onClick={() => handleFeed(pet)}
                      disabled={level === 0 || busy}
                      className={`px-4 py-3 rounded-xl font-bold shadow ${level === 0 ? 'bg-gray-200 text-gray-400' : 'bg-orange-400 hover:bg-orange-500 text-white'}`}
                    >
                      <span className="text-2xl block leading-none">{info.food}</span>
                      <span className="text-xs">{level === 0 ? 'Full' : 'Feed'}</span>
                    </button>
                  </div>
                );
              })}
              <p className="text-xs text-gray-500 text-center pt-2">Your pets wander around your home page. Tap a hungry pet there to feed it, or tap a happy one to cuddle it.</p>
            </div>
          )
        )}
      </div>

      {adoptInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-40 mx-auto"><PetSprite kind={adopting} state="happy" /></div>
            <h2 className="mt-2 text-xl font-extrabold text-gray-800">Adopt this {adoptInfo.name.toLowerCase()}?</h2>
            <p className="text-sm text-gray-500 mt-1">Give your new pet a name:</p>
            <input
              value={petName} maxLength={16} onChange={(e) => setPetName(e.target.value)}
              className="mt-2 w-full px-4 py-2 text-center border-2 border-emerald-300 rounded-xl font-bold text-gray-800"
            />
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 space-y-1">
              <p className="font-extrabold text-base">Price: 🪙 {formatCoins(adoptInfo.price)}</p>
              <p>You have 🪙 {formatCoins(coins)} → after: 🪙 {formatCoins(coins - adoptInfo.price)}</p>
            </div>
            <p className="mt-3 text-xs text-red-600 font-semibold">These coins will be spent. Do you really want to adopt it?</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setAdopting(null)} disabled={busy} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">No, cancel</button>
              <button onClick={confirmAdopt} disabled={busy} className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow disabled:opacity-60">{busy ? 'Adopting...' : 'Yes, adopt!'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl text-sm font-bold max-w-[90vw] text-center">{toast}</div>}
    </div>
  );
}

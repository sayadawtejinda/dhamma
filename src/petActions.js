import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';
import { MAX_PETS, PET_KINDS, PET_SELL_PRICE, STARTER_MEALS, foodPacksFor, newPetId, petCanEat } from './petCatalog';

// The only three things that ever write pet data. Each is ONE transaction over the stored documents (never
// this screen's copy), so a double tap or a second tab cannot spend twice, feed twice or lose a pet.
const STUDENTS_PATH = `artifacts/${appId}/public/data/students`;
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');

const studentRef = (uid) => doc(db, STUDENTS_PATH, uid);
const walletRef = (name) => doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(name));

// Buys a pet out of the Shrine Room wallet (the same coins every other app deposits into).
// Resolves { ok: true, pet, balance } or { ok: false, reason: 'coins' | 'full' | 'kind', balance? }.
export async function buyPet({ studentUid, studentName, kind, petName }) {
  const info = PET_KINDS[kind];
  if (!info) return { ok: false, reason: 'kind' };
  const sRef = studentRef(studentUid);
  const wRef = walletRef(studentName);
  return runTransaction(db, async (tx) => {
    const [sSnap, wSnap] = await Promise.all([tx.get(sRef), tx.get(wRef)]);
    const pets = Array.isArray(sSnap.data()?.pets) ? sSnap.data().pets : [];
    if (pets.length >= MAX_PETS) return { ok: false, reason: 'full' };
    const balance = wSnap.exists() ? (wSnap.data().coinBalance ?? 0) : 0;
    if (balance < info.price) return { ok: false, reason: 'coins', balance };
    const now = Date.now();
    const pet = { id: newPetId(kind), kind, name: (petName || info.name).trim().slice(0, 16) || info.name, boughtAt: now, fedAt: now };
    const foods = { ...(sSnap.data()?.petFoods || {}) };
    foods[kind] = (foods[kind] || 0) + STARTER_MEALS;
    tx.set(wRef, { studentName, coinBalance: balance - info.price }, { merge: true });
    // petMax = the most pets this student has had at once: the Pets & Kindness badges are counted from it, so selling a pet never takes a badge away
    const petMax = Math.max(sSnap.data()?.petMax || 0, pets.length + 1);
    tx.set(sRef, { pets: [...pets, pet], petFoods: foods, petMax }, { merge: true });
    return { ok: true, pet, balance: balance - info.price, foods };
  });
}

// Gives a pet one meal of ITS OWN food (or, failing that, any old "any pet" food) -- only when it is not still full from the last one.
// Resolves 'fed' | 'nofood' | 'full' | 'gone'.
export async function feedPet({ studentUid, petId }) {
  const sRef = studentRef(studentUid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sRef);
    const data = snap.data() || {};
    const pets = Array.isArray(data.pets) ? data.pets : [];
    const i = pets.findIndex(p => p.id === petId);
    if (i < 0) return 'gone';
    if (!petCanEat(pets[i])) return 'full';
    const kind = pets[i].kind;
    const foods = { ...(data.petFoods || {}) };
    const patch = {};
    if ((foods[kind] || 0) >= 1) { foods[kind] -= 1; patch.petFoods = foods; }
    else if ((data.petFood || 0) >= 1) patch.petFood = data.petFood - 1;
    else return 'nofood';
    patch.pets = pets.map((p, j) => (j === i ? { ...p, fedAt: Date.now() } : p));
    tx.set(sRef, patch, { merge: true });
    return 'fed';
  });
}

// Buys a pack of one animal's food out of the Shrine Room wallet -- only for a kind of animal the student has adopted.
// Resolves { ok, balance, foods } or { ok: false, reason: 'coins' | 'pack' | 'nopet' }.
export async function buyFood({ studentUid, studentName, kind, packId }) {
  const pack = foodPacksFor(kind).find(p => p.id === packId);
  if (!pack) return { ok: false, reason: 'pack' };
  const sRef = studentRef(studentUid);
  const wRef = walletRef(studentName);
  return runTransaction(db, async (tx) => {
    const [sSnap, wSnap] = await Promise.all([tx.get(sRef), tx.get(wRef)]);
    const pets = Array.isArray(sSnap.data()?.pets) ? sSnap.data().pets : [];
    if (!pets.some(p => p.kind === kind)) return { ok: false, reason: 'nopet' };
    const balance = wSnap.exists() ? (wSnap.data().coinBalance ?? 0) : 0;
    if (balance < pack.price) return { ok: false, reason: 'coins', balance };
    const foods = { ...(sSnap.data()?.petFoods || {}) };
    foods[kind] = (foods[kind] || 0) + pack.meals;
    tx.set(wRef, { studentName, coinBalance: balance - pack.price }, { merge: true });
    tx.set(sRef, { petFoods: foods }, { merge: true });
    return { ok: true, balance: balance - pack.price, foods };
  });
}

// Sells a pet back for PET_SELL_PRICE coins (into the Shrine Room wallet). Resolves { ok, balance, pets } or { ok: false, reason: 'gone' }.
export async function sellPet({ studentUid, studentName, petId }) {
  const sRef = studentRef(studentUid);
  const wRef = walletRef(studentName);
  return runTransaction(db, async (tx) => {
    const [sSnap, wSnap] = await Promise.all([tx.get(sRef), tx.get(wRef)]);
    const pets = Array.isArray(sSnap.data()?.pets) ? sSnap.data().pets : [];
    if (!pets.some(p => p.id === petId)) return { ok: false, reason: 'gone' };
    const balance = (wSnap.exists() ? (wSnap.data().coinBalance ?? 0) : 0) + PET_SELL_PRICE;
    const rest = pets.filter(p => p.id !== petId);
    tx.set(wRef, { studentName, coinBalance: balance }, { merge: true });
    tx.set(sRef, { pets: rest }, { merge: true });
    return { ok: true, balance, pets: rest };
  });
}

// Sends a pet to rest in its little house (it leaves the home screen and does not get hungry meanwhile) or brings it out again.
// Resolves the new list of pets, or null when the pet is gone.
export async function setPetHome({ studentUid, petId, home }) {
  const sRef = studentRef(studentUid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sRef);
    const pets = Array.isArray(snap.data()?.pets) ? snap.data().pets : [];
    if (!pets.some(p => p.id === petId)) return null;
    const now = Date.now();
    const next = pets.map(p => {
      if (p.id !== petId) return p;
      if (home) return { ...p, home: true, homeAt: now };
      // coming out: the time spent resting does not count towards hunger
      const { homeAt, home: _h, ...rest } = p;
      return { ...rest, fedAt: (p.fedAt || p.boughtAt || now) + Math.max(0, now - (homeAt || now)) };
    });
    tx.set(sRef, { pets: next }, { merge: true });
    return next;
  });
}

export async function renamePet({ studentUid, petId, name }) {
  const clean = (name || '').trim().slice(0, 16);
  if (!clean) return false;
  const sRef = studentRef(studentUid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sRef);
    const pets = Array.isArray(snap.data()?.pets) ? snap.data().pets : [];
    if (!pets.some(p => p.id === petId)) return false;
    tx.set(sRef, { pets: pets.map(p => (p.id === petId ? { ...p, name: clean } : p)) }, { merge: true });
    return true;
  });
}

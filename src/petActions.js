import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';
import { MAX_PETS, PET_KINDS, newPetId, petCanEat } from './petCatalog';

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
    tx.set(wRef, { studentName, coinBalance: balance - info.price }, { merge: true });
    tx.set(sRef, { pets: [...pets, pet] }, { merge: true });
    return { ok: true, pet, balance: balance - info.price };
  });
}

// Gives a pet its meal -- only when it is not still full from the last one. Resolves true when it was fed.
export async function feedPet({ studentUid, petId }) {
  const sRef = studentRef(studentUid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(sRef);
    const pets = Array.isArray(snap.data()?.pets) ? snap.data().pets : [];
    const i = pets.findIndex(p => p.id === petId);
    if (i < 0 || !petCanEat(pets[i])) return false;
    const next = pets.map((p, j) => (j === i ? { ...p, fedAt: Date.now() } : p));
    tx.set(sRef, { pets: next }, { merge: true });
    return true;
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

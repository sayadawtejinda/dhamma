// One-time: record the houses students ALREADY own as "sold", so nobody else can buy them any more.
// Reads the Shrine Room roster (avatar ownership), writes only the new homeClaims/owners doc. No student data is changed.
// node scripts/seed-home-claims.mjs [--write]   (without --write it only prints what it found)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);
await signInAnonymously(auth);
const snap = await getDocs(collection(db, 'artifacts/shrine-room-app/public/data/roster'));
const owners = {};
snap.docs.forEach(d => {
  const x = d.data();
  const list = (x.avatarOwned && x.avatarOwned.homeBackground) || x['avatarOwned.homeBackground'] || [];
  list.filter(id => id !== 'default').forEach(id => { (owners[id] = owners[id] || []).push(x.studentName || d.id); });
});
Object.entries(owners).forEach(([id, names]) => console.log(id.padEnd(18), names.length, 'owner(s):', names.join(', ')));
if (process.argv.includes('--write')) {
  const out = {};
  Object.entries(owners).forEach(([id, names]) => { out[id] = { name: names[0], owners: names, seeded: true }; });
  await setDoc(doc(db, `artifacts/${appId}/public/data/homeClaims`, 'owners'), out, { merge: true });
  console.log('written to homeClaims/owners');
}
process.exit(0);

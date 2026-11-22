// Read-only: prints every Myanmar Vowels roster doc whose studentName contains --name=...
// node scripts/mvl-student-check.mjs --name=Ryden
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebaseConfig.js';
const name = ((process.argv.find(a => a.startsWith('--name=')) || '--name=').slice(7)).toLowerCase();
const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const snap = await getDocs(collection(db, 'artifacts/myanmar-vowels-learning-app/public/data/roster'));
for (const d of snap.docs) {
  const x = d.data();
  if (!String(x.studentName || x.name || '').toLowerCase().includes(name)) continue;
  const lastSeen = x.lastSeen?.toDate ? x.lastSeen.toDate().toISOString() : x.lastSeen;
  console.log(JSON.stringify({ id: d.id, ...x, lastSeen }, null, 1));
}
process.exit(0);

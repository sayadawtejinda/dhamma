// Run after the Parami report files were pushed to GitHub: marks the confirmed request as published.
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig, appId } from '../src/firebaseConfig.js';
const requestedAt = Number(process.argv[2]);
if (!requestedAt) process.exit(0);
const app = initializeApp(firebaseConfig);
await signInAnonymously(getAuth(app));
await setDoc(doc(getFirestore(app), `artifacts/${appId}/public/data/config/paramiReport`), { publishedAt: Date.now(), publishedRequest: requestedAt }, { merge: true });
console.log('Parami report: marked published');
process.exit(0);

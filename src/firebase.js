import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

// Initialized once and shared by every part of the app (Tutoring Dashboard
// and Smart Study) so they use the same Firebase project/session instead of
// creating duplicate app instances.
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 'debug' floods the console with internal Firestore protocol messages,
// making it very hard to see real errors or our own diagnostic logs.
// 'error' only shows things that actually matter.
try {
  setLogLevel('error');
} catch (e) {
  console.error('Firebase setLogLevel failed:', e);
}

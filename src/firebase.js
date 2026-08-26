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

try {
  setLogLevel('debug');
} catch (e) {
  console.error('Firebase setLogLevel failed:', e);
}

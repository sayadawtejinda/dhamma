import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel, enableNetwork, disableNetwork } from 'firebase/firestore';
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

// Several apps (Dhammaschool, SmartStudy, Abhidhamma, Myanmar Reader,
// Myanmar Speaking) never unmount once opened -- they just sit hidden in
// the background for as long as the tab stays open. After the device/tab
// has been asleep or backgrounded for a while (laptop sleep, mobile browser
// throttling a background tab), Firestore's underlying connection can come
// back in a stuck state where every onSnapshot listener keeps showing the
// last data it had and stops updating, with no error -- the app looks
// "frozen" until the page is refreshed. Forcing the connection to drop and
// re-establish itself when the tab becomes visible again (only after a
// real gap, not a quick tab switch) fixes this without needing a reload.
if (typeof document !== 'undefined') {
  let hiddenSince = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenSince = Date.now();
    } else {
      if (hiddenSince && Date.now() - hiddenSince > 60000) {
        disableNetwork(db).then(() => enableNetwork(db)).catch(() => {});
      }
      hiddenSince = null;
    }
  });
}


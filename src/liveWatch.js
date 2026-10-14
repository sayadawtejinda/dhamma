import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// The teacher's "👁️ Live view" switch. While it is OFF (the normal state) nobody writes a repeating
// "I am online" heartbeat and nobody listens live, so presence costs nothing. When the teacher wants to
// watch (a class is on), he turns it ON for a few hours: apps opened from then on send their heartbeat and
// the teacher's online pills go live. It switches itself off when the time is up.
//
// One tiny document, config/liveWatch = { untilMs }. Every open device listens to it (one read when
// opened, one more each time the teacher flips the switch).
const listeners = new Set();
let untilMs = 0;
let started = false;

export const isLiveWatchOn = () => Date.now() < untilMs;

export function startLiveWatchListener(db, appId) {
  if (started) return;
  started = true;
  onSnapshot(doc(db, `artifacts/${appId}/public/data/config/liveWatch`), (snap) => {
    untilMs = snap.exists() ? (snap.data().untilMs || 0) : 0;
    listeners.forEach(fn => fn());
  }, (e) => { started = false; console.error('Live view switch could not be read:', e); });
}

export function setLiveWatch(db, appId, on, hours = 3) {
  return setDoc(doc(db, `artifacts/${appId}/public/data/config/liveWatch`), { untilMs: on ? Date.now() + hours * 60 * 60 * 1000 : 0 });
}

// true while the switch is on (re-checked every minute, so it also turns itself off on time)
export function useLiveWatch() {
  const [on, setOn] = useState(isLiveWatchOn());
  useEffect(() => {
    const check = () => setOn(isLiveWatchOn());
    listeners.add(check);
    const t = setInterval(check, 60000);
    check();
    return () => { listeners.delete(check); clearInterval(t); };
  }, []);
  return on;
}

export const liveWatchUntilMs = () => untilMs;

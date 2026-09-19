import { getDocs, onSnapshot } from 'firebase/firestore';

// "Who's online" only matters while the Parami group meets: Sunday 2-3 PM
// California time (with a buffer on both sides for early/late joiners).
// Every other time students visit about once a week and never overlap, so
// live presence -- a heartbeat write every 30s per student plus a live
// listener pushing every one of those writes to every open device -- was
// pure cost. Judged in California time (not the device's), so it lines up
// for students in any US time zone.
const CLASS_TIME_ZONE = 'America/Los_Angeles';
const CLASS_DAY = 'Sun';
const LIVE_FROM_MINUTES = 12 * 60 + 30; // 12:30 PM
const LIVE_UNTIL_MINUTES = 16 * 60;     // 4:00 PM

export const isOnlineStatusDay = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: CLASS_TIME_ZONE, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (type) => parts.find(p => p.type === type)?.value;
    const minutes = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
    return get('weekday') === CLASS_DAY && minutes >= LIVE_FROM_MINUTES && minutes < LIVE_UNTIL_MINUTES;
  } catch (e) {
    return false;
  }
};

// Heartbeat interval for a `setInterval(ping, ms)`: the normal interval during
// class time, otherwise 0 (callers skip the interval and just ping
// once on open, so "active this week" still gets recorded).
export const presenceIntervalMs = (normalMs) => (isOnlineStatusDay() ? normalMs : 0);

// Drop-in for onSnapshot(collectionRef, onNext, onError): a live listener
// only for the teacher during class time (`isTeacher` true); everyone else --
// students, and everyone outside class time -- gets ONE read when opened
// (still shows the weekly picture, without keeping a listener open). Returns
// an unsubscribe fn.
export function listenLiveOrOnce(ref, onNext, onError, isTeacher = false) {
  if (isTeacher && isOnlineStatusDay()) return onSnapshot(ref, onNext, onError);
  let cancelled = false;
  getDocs(ref)
    .then(snap => { if (!cancelled) onNext(snap); })
    .catch(e => { if (!cancelled && onError) onError(e); });
  return () => { cancelled = true; };
}

import { getDocs, onSnapshot } from 'firebase/firestore';

// "Who's online" only matters on the day the Parami group meets (Sunday, in
// the viewing device's own local time). Every other day students visit
// about once a week and never overlap, so live presence -- a heartbeat write
// every 30s per student plus a live listener pushing every one of those
// writes to every open device -- was pure cost. Change ONLINE_STATUS_DAYS to
// move or add days (0 = Sunday ... 6 = Saturday).
export const ONLINE_STATUS_DAYS = [0];

export const isOnlineStatusDay = () => ONLINE_STATUS_DAYS.includes(new Date().getDay());

// Heartbeat interval for a `setInterval(ping, ms)`: the normal interval on an
// online-status day, otherwise 0 (callers skip the interval and just ping
// once on open, so "active this week" still gets recorded).
export const presenceIntervalMs = (normalMs) => (isOnlineStatusDay() ? normalMs : 0);

// Drop-in for onSnapshot(collectionRef, onNext, onError): live on an
// online-status day, otherwise ONE read when opened (still shows the weekly
// picture, without keeping a listener open). Returns an unsubscribe fn.
export function listenLiveOrOnce(ref, onNext, onError) {
  if (isOnlineStatusDay()) return onSnapshot(ref, onNext, onError);
  let cancelled = false;
  getDocs(ref)
    .then(snap => { if (!cancelled) onNext(snap); })
    .catch(e => { if (!cancelled && onError) onError(e); });
  return () => { cancelled = true; };
}

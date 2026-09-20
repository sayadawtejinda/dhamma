import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { appId } from './firebaseConfig';

// "Outstanding Student" announcements, shown as a slim strip across the very
// top of the screen in whatever app is open (not a box on the home page, and
// pointer-events-none so it never blocks the lesson underneath): one message
// scrolls slowly from right to left, then the strip disappears. The next one
// comes 5 minutes later, at most 5 a day. Counted per device, not per
// student, so nothing has to be written back to Firebase.
const STAR_PATH = `artifacts/${appId}/public/data/starAnnouncements`;
const GAP_MS = 5 * 60 * 1000;
const MAX_PER_DAY = 5;
const FIRST_DELAY_MS = 10 * 1000;
const CHECK_EVERY_MS = 20 * 1000;
const REFETCH_EVERY_MS = 30 * 60 * 1000;
const STORE_KEY = 'starTickerState_v1';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const loadState = () => {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    return { date: s.date || '', count: s.count || 0, lastShownAt: s.lastShownAt || 0, shownToday: s.shownToday || [] };
  } catch (e) { return { date: '', count: 0, lastShownAt: 0, shownToday: [] }; }
};
const saveState = (s) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* private mode -- just shows a bit more often */ } };

export default function StarTicker() {
  const [current, setCurrent] = useState(null);
  const listRef = useRef([]);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setAuthReady(true); });
    return () => unsub();
  }, []);

  // A plain read now and then (not a live listener) -- announcements change
  // rarely, and this runs on every open device.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    const fetchList = async () => {
      const st = loadState();
      if (st.date === todayKey() && st.count >= MAX_PER_DAY) return; // nothing more to show today
      try {
        const snap = await getDocs(query(
          collection(db, STAR_PATH),
          where('expiresAt', '>', Timestamp.now()),
          orderBy('expiresAt', 'desc'),
          limit(10)
        ));
        if (cancelled) return;
        // Student-written ones only count once the teacher approved them.
        listRef.current = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.status !== 'pending' && a.status !== 'rejected' && a.message);
      } catch (e) { console.error('Could not load announcements:', e); }
    };
    fetchList();
    const interval = setInterval(fetchList, REFETCH_EVERY_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [authReady]);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = () => {
      if (current) return;
      const list = listRef.current;
      if (!list.length) return;
      const now = Date.now();
      const state = loadState();
      if (state.date !== todayKey()) { state.date = todayKey(); state.count = 0; state.shownToday = []; }
      if (state.count >= MAX_PER_DAY) return;
      if (state.lastShownAt ? now - state.lastShownAt < GAP_MS : now - startedAt < FIRST_DELAY_MS) return;
      // Each announcement at most once a day on this device -- never the
      // same one again and again.
      const next = list.find(a => !state.shownToday.includes(a.id));
      if (!next) return;
      saveState({ date: state.date, count: state.count + 1, lastShownAt: now, shownToday: [...state.shownToday, next.id] });
      setCurrent(next);
    };
    const interval = setInterval(tick, CHECK_EVERY_MS);
    const first = setTimeout(tick, FIRST_DELAY_MS + 1500);
    return () => { clearInterval(interval); clearTimeout(first); };
  }, [current]);

  const text = current ? `⭐ ${current.studentName}: ${current.message}` : '';
  const seconds = Math.min(40, Math.max(14, Math.round(text.length * 0.25) + 10));

  // Backup for animationend, which browsers skip when the tab is in the
  // background -- otherwise the strip could sit there forever.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setCurrent(null), (seconds + 2) * 1000);
    return () => clearTimeout(t);
  }, [current, seconds]);

  if (!current) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[99999] h-9 overflow-hidden pointer-events-none bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 border-b-2 border-amber-500 shadow-md">
      <style>{`@keyframes starTickerMove { from { transform: translate(100vw, -50%); } to { transform: translate(-100%, -50%); } }`}</style>
      <div
        className="absolute left-0 top-1/2 whitespace-nowrap text-sm font-bold text-amber-900"
        style={{ animation: `starTickerMove ${seconds}s linear forwards`, willChange: 'transform' }}
        onAnimationEnd={() => setCurrent(null)}
      >
        {text}
      </div>
    </div>
  );
}

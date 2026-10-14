import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
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
const CACHE_MS = 24 * 60 * 60 * 1000; // the list is read from Firestore at most once a day per device
const LIST_KEY = 'starTickerList_v1';
const STORE_KEY = 'starTickerState_v1';
const FLASHED_KEY = 'starTickerFlashed_v1';
const FLASH_WINDOW_MS = 2 * 60 * 1000;
const loadFlashed = () => { try { return JSON.parse(localStorage.getItem(FLASHED_KEY) || '[]'); } catch (e) { return []; } };
const saveFlashed = (ids) => { try { localStorage.setItem(FLASHED_KEY, JSON.stringify(ids.slice(-40))); } catch (e) { /* ignore */ } };

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
  const [flashQueue, setFlashQueue] = useState([]);
  const listRef = useRef([]);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (u) setAuthReady(true); });
    return () => unsub();
  }, []);

  // The moment the teacher approves an announcement it is shown once on every screen that is
  // open (the writer's too), straight away -- not waiting for the 5-minute gap or the daily
  // limit. A tiny listener: it only ever receives the one or two announcements approved in
  // the last couple of minutes. Its normal turn (when its slot starts) is not affected.
  useEffect(() => {
    if (!authReady) return;
    const since = Timestamp.fromMillis(Date.now() - FLASH_WINDOW_MS);
    const unsub = onSnapshot(query(collection(db, STAR_PATH), where('flashAt', '>', since)), (snap) => {
      snap.docChanges().forEach(ch => {
        if (ch.type === 'removed') return;
        const a = { id: ch.doc.id, ...ch.doc.data() };
        if (a.status !== 'approved' || !a.message) return;
        const flashedAt = a.flashAt?.toMillis ? a.flashAt.toMillis() : Date.now();
        if (Date.now() - flashedAt > FLASH_WINDOW_MS) return;
        const flashed = loadFlashed();
        if (flashed.includes(a.id)) return;
        saveFlashed([...flashed, a.id]);
        // already running now: the normal ticker must not repeat it today
        const startsMs = a.startsAt?.toMillis ? a.startsAt.toMillis() : 0;
        if (startsMs <= Date.now()) {
          const st = loadState();
          if (st.date === todayKey() && !st.shownToday.includes(a.id)) saveState({ ...st, shownToday: [...st.shownToday, a.id] });
        }
        setFlashQueue(q => [...q, a]);
      });
    }, (e) => console.error('Announcement flash listener:', e));
    return () => unsub();
  }, [authReady]);
  // The writer's own announcement, handed over by their dashboard when it was approved while
  // they were away.
  useEffect(() => {
    const onFlash = (e) => {
      const a = e.detail;
      if (!a || !a.id || !a.message) return;
      const flashed = loadFlashed();
      if (flashed.includes(a.id)) return;
      saveFlashed([...flashed, a.id]);
      setFlashQueue(q => [...q, a]);
    };
    window.addEventListener('dhamma-star-flash', onFlash);
    return () => window.removeEventListener('dhamma-star-flash', onFlash);
  }, []);
  useEffect(() => {
    if (current || flashQueue.length === 0) return;
    setCurrent(flashQueue[0]);
    setFlashQueue(q => q.slice(1));
  }, [current, flashQueue]);

  // One plain read per device per day (not a live listener, not on every open): the list is kept in
  // localStorage and reused all day. New approvals still appear at once through the flash listener above.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    const usable = (a) => a.status !== 'pending' && a.status !== 'rejected' && a.message
      // Student-written ones only count once the teacher approved them; an approved one may be waiting
      // for a free slot (startsAt in the future) and joins when its turn comes.
      && (!a.startsMs || a.startsMs <= Date.now()) && (!a.expiresMs || a.expiresMs > Date.now());
    const apply = (rows) => { listRef.current = rows.filter(usable); };
    const fetchList = async () => {
      try {
        const c = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
        if (c && Array.isArray(c.rows) && Date.now() - c.at < CACHE_MS && Date.now() >= c.at) { apply(c.rows); return; }
      } catch (e) { /* no cache */ }
      try {
        const snap = await getDocs(query(
          collection(db, STAR_PATH),
          where('expiresAt', '>', Timestamp.now()),
          orderBy('expiresAt', 'desc'),
          limit(10)
        ));
        if (cancelled) return;
        const rows = snap.docs.map(d => {
          const x = d.data();
          return { id: d.id, studentName: x.studentName, message: x.message, status: x.status || null,
            startsMs: x.startsAt?.toMillis ? x.startsAt.toMillis() : 0, expiresMs: x.expiresAt?.toMillis ? x.expiresAt.toMillis() : 0 };
        });
        try { localStorage.setItem(LIST_KEY, JSON.stringify({ at: Date.now(), rows })); } catch (e) { /* ignore */ }
        apply(rows);
      } catch (e) { console.error('Could not load announcements:', e); }
    };
    fetchList();
    return () => { cancelled = true; };
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

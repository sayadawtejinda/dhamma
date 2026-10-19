import { getDocs, getDoc, Timestamp } from 'firebase/firestore';

// A saved-copy replacement for a live onSnapshot on a collection / query (used on the teacher's dashboard).
//  - The documents are kept on this device; they are read from Firebase again only when the copy is older than `ttlMs`
//    (default 1 hour) or when "Refresh" is pressed -- opening the screen again meanwhile costs no reads at all.
//  - The teacher's OWN writes (every write announces itself, see firestoreCounted.js) bring just the one changed document
//    up to date (one read), so what the teacher does shows at once.
//  - What other people change (a student starting a lesson) shows up with the next hourly read or Refresh.
// It calls `onNext` with an object shaped like a snapshot (docs with id/data(), size, empty, forEach).
const PREFIX = 'lc_v1_';
const serialize = (v) => {
  if (v && typeof v.toMillis === 'function' && typeof v.toDate === 'function') return { _ms: v.toMillis() };
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serialize(x)]));
  return v;
};
const revive = (v) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v._ms === 'number') return Timestamp.fromMillis(v._ms);
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
  return v;
};
const pathOf = (q) => {
  try { return String(q.path || q._query.path.canonicalString()); } catch (e) { return ''; }
};
const listeners = new Set();
export const refreshCachedListeners = () => listeners.forEach(l => l.reload());
export const cachedListenUpdatedAt = () => { let m = 0; listeners.forEach(l => { if (l.at && (!m || l.at < m)) m = l.at; }); return m; };

export function cachedListen(key, q, onNext, onError, ttlMs = 60 * 60 * 1000) {
  const collPath = pathOf(q);
  let docs = new Map();   // id -> serialized data
  let at = 0;
  let dead = false;
  let timer = null;
  const store = () => { try { localStorage.setItem(PREFIX + key, JSON.stringify({ at, docs: Object.fromEntries(docs) })); } catch (e) { /* too big: memory only */ } };
  const emit = () => {
    if (dead) return;
    const list = [...docs.entries()].map(([id, data]) => { const d = revive(data); return { id, data: () => d, exists: () => true }; });
    onNext({ docs: list, size: list.length, empty: list.length === 0, forEach: (f) => list.forEach(f), docChanges: () => [] });
  };
  const fetchAll = async () => {
    try {
      const snap = await getDocs(q);
      if (dead) return;
      docs = new Map(snap.docs.map(d => [d.id, serialize(d.data())]));
      at = Date.now(); l.at = at; store(); emit();
    } catch (e) { if (onError) onError(e); else console.error('Could not read', key, e); }
  };
  const l = { at: 0, reload: () => fetchAll() };
  listeners.add(l);

  try {
    const c = JSON.parse(localStorage.getItem(PREFIX + key) || 'null');
    if (c && c.docs && c.at && Date.now() - c.at < ttlMs) { docs = new Map(Object.entries(c.docs)); at = c.at; l.at = at; emit(); }
  } catch (e) { /* no copy */ }
  if (!at) fetchAll();
  // while the screen stays open, read again once the copy is an hour old
  timer = setInterval(() => { if (Date.now() - at >= ttlMs) fetchAll(); }, 5 * 60 * 1000);

  // the teacher's own change to one document of this collection
  let pending = new Map();
  let flushTimer = null;
  const onWrite = (ev) => {
    const { ref, deleted } = ev.detail || {};
    if (!ref || !ref.path) return;
    const parts = String(ref.path).split('/');
    const id = parts.pop();
    if (parts.join('/') !== collPath) return;
    pending.set(id, { ref, deleted });
    clearTimeout(flushTimer);
    flushTimer = setTimeout(async () => {
      const batch = pending; pending = new Map();
      for (const [docId, { ref: r, deleted: del }] of batch) {
        if (del) { docs.delete(docId); continue; }
        try { const s = await getDoc(r); if (s.exists()) docs.set(docId, serialize(s.data())); else docs.delete(docId); } catch (e) { /* next hourly read fixes it */ }
      }
      if (dead) return;
      store(); emit();
    }, 400);
  };
  window.addEventListener('dhamma-write', onWrite);

  return () => { dead = true; clearInterval(timer); clearTimeout(flushTimer); window.removeEventListener('dhamma-write', onWrite); listeners.delete(l); };
}

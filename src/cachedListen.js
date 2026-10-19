import { getDocs, getDoc, Timestamp } from 'firebase/firestore';

// A saved-copy replacement for a live onSnapshot on a collection / query (used on the teacher's dashboard).
//  - The documents are kept on this device; they are read from Firebase again only when "Refresh" is pressed (or, if the copy
//    is older than `ttlMs` -- 30 days unless a call says otherwise -- when the screen is opened) -- opening the screen again meanwhile costs no reads at all.
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

// `opts.accept(data)`: after the teacher's/student's own write, a changed document is kept only if it still belongs to this query.
// `q` may also be ONE document (then `onNext` gets a document-like snapshot: id, exists(), data()). `opts.refetchOnWrite`: for a
// small query whose matches can change by a write (e.g. "status == pending"), read it again after the teacher's own write.
const inflight = new Map();
export function cachedListen(key, q, onNext, onError, ttlMs = 30 * 24 * 60 * 60 * 1000, opts = {}) {
  const isDoc = q && q.type === 'document';
  const collPath = isDoc ? String(q.path).split('/').slice(0, -1).join('/') : pathOf(q);
  let docs = new Map();   // id -> serialized data
  let at = 0;
  let dead = false;
  const store = () => { try { localStorage.setItem(PREFIX + key, JSON.stringify({ at, docs: Object.fromEntries(docs) })); } catch (e) { /* too big: memory only */ } };
  const emit = () => {
    if (dead) return;
    const list = [...docs.entries()].map(([id, data]) => { const d = revive(data); return { id, data: () => d, exists: () => true }; });
    if (isDoc) { const one = list[0]; onNext({ id: q.id, exists: () => !!one, data: () => (one ? one.data() : undefined) }); return; }
    onNext({ docs: list, size: list.length, empty: list.length === 0, forEach: (f) => list.forEach(f), docChanges: () => [] });
  };
  const fetchAll = async () => {
    try {
      let pendingRead = inflight.get(key);
      if (!pendingRead) {
        pendingRead = (async () => {
          if (isDoc) { const one = await getDoc(q); return new Map(one.exists() ? [[one.id, serialize(one.data())]] : []); }
          const snap = await getDocs(q);
          return new Map(snap.docs.map(d => [d.id, serialize(d.data())]));
        })();
        inflight.set(key, pendingRead);
        pendingRead.finally(() => inflight.delete(key));
      }
      const got = await pendingRead;
      if (dead) return;
      docs = new Map(got);
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
  // (nothing is read while the screen just sits open: a copy older than an hour is read again only when the screen is opened)

  // the teacher's own change to one document of this collection
  let pending = new Map();
  let flushTimer = null;
  const onWrite = (ev) => {
    const { ref, deleted } = ev.detail || {};
    if (!ref || !ref.path) return;
    const parts = String(ref.path).split('/');
    const id = parts.pop();
    if (parts.join('/') !== collPath) return;
    if (isDoc && ref.path !== q.path) return;
    if (isDoc || opts.refetchOnWrite) { clearTimeout(flushTimer); flushTimer = setTimeout(fetchAll, 400); return; }
    pending.set(id, { ref, deleted });
    clearTimeout(flushTimer);
    flushTimer = setTimeout(async () => {
      const batch = pending; pending = new Map();
      for (const [docId, { ref: r, deleted: del }] of batch) {
        if (del) { docs.delete(docId); continue; }
        try {
          const s = await getDoc(r);
          if (s.exists() && (!opts.accept || opts.accept(s.data()))) docs.set(docId, serialize(s.data())); else docs.delete(docId);
        } catch (e) { /* Refresh fixes it */ }
      }
      if (dead) return;
      store(); emit();
    }, 400);
  };
  window.addEventListener('dhamma-write', onWrite);

  return () => { dead = true; clearTimeout(flushTimer); window.removeEventListener('dhamma-write', onWrite); listeners.delete(l); };
}

// One-time read of a query/document from the saved copy (read from Firebase only if there is no copy younger than ttlMs).
export function cachedGetDocs(key, q, ttlMs, opts = {}) {
  return new Promise((resolve, reject) => {
    let done = false;
    let off = null;
    off = cachedListen(key, q, (snap) => {
      if (done) return;
      done = true;
      resolve(snap);
      setTimeout(() => { if (off) off(); }, 0);
    }, (e) => { if (!done) { done = true; reject(e); } }, ttlMs, opts);
  });
}

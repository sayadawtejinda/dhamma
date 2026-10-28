// Every file imports Firestore through here (see the alias in vite.config.js). It is the real Firestore plus a counter of
// how many documents were READ from the server -- kept only in this browser (nothing is written to Firebase, so counting
// costs nothing). See it with ?reads=1 on the address (a small badge appears), or window.__reads in the console.
import { getDocs as _getDocs, getDoc as _getDoc, onSnapshot as _onSnapshot, getCountFromServer as _getCount } from '@firebase/firestore';
export * from '@firebase/firestore';

const DAY = () => new Date().toDateString();
const KEY = 'readCounter_v1';
let state = { day: DAY(), total: 0, by: {} };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.day === DAY()) state = s; } catch (e) { /* none */ }
let saveTimer = null;
let badge = null;
let visible = true;
let interactive = false;
try { localStorage.removeItem('showReads'); } catch (e) { /* the old ?reads=1 switch is gone */ }

const nameOf = (ref) => {
  try {
    const p = ref.path || (ref._query && ref._query.path && ref._query.path.canonicalString && ref._query.path.canonicalString()) || '';
    const parts = String(p).split('/').filter(Boolean);
    if (ref.type === 'document') parts.pop();
    return parts.slice(-1)[0] || (ref._query && ref._query.collectionGroup) || '?';
  } catch (e) { return '?'; }
};

function add(ref, n) {
  if (!n) return;
  if (state.day !== DAY()) state = { day: DAY(), total: 0, by: {} };
  const k = nameOf(ref);
  state.total += n;
  state.by[k] = (state.by[k] || 0) + n;
  // every single read of 30+ documents is written down with the time, so the details box shows WHAT cost a lot and WHEN
  // (open the screen, press the button, look at the time here)
  if (n >= 30) { (state.big = state.big || []).push({ t: new Date().toTimeString().slice(0, 8), k, n }); if (state.big.length > 40) state.big.shift(); }
  if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } paint(); }, 1500);
}

// The full list, in a box whose text can be selected, with a Copy button (an alert() could not be copied).
function showDetails() {
  const text = 'reads ' + state.day + ': ' + state.total + String.fromCharCode(10) + Object.entries(state.by).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ': ' + v).join(String.fromCharCode(10)) + (state.big && state.big.length ? String.fromCharCode(10) + String.fromCharCode(10) + 'BIG READS (30+ at once), newest last:' + String.fromCharCode(10) + state.big.map(b => b.t + '  ' + b.k + ': ' + b.n).join(String.fromCharCode(10)) : '');
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:100000;background:#fff;color:#000;border:2px solid #333;border-radius:10px;padding:10px;font:13px monospace;max-height:70vh;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,.4)';
  const ta = document.createElement('textarea');
  ta.value = text; ta.readOnly = true; ta.style.cssText = 'width:100%;height:40vh;font:13px monospace;user-select:text';
  const copy = document.createElement('button');
  copy.textContent = 'Copy'; copy.style.cssText = 'margin:6px 6px 0 0;padding:6px 14px;background:#2563eb;color:#fff;border-radius:6px';
  copy.onclick = async () => { try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch (e) { ta.select(); document.execCommand('copy'); copy.textContent = 'Copied'; } };
  const reset = document.createElement('button');
  reset.textContent = 'Reset counter'; reset.style.cssText = 'margin:6px 6px 0 0;padding:6px 14px;background:#d97706;color:#fff;border-radius:6px';
  reset.onclick = () => { window.__resetReads(); box.remove(); };
  const close = document.createElement('button');
  close.textContent = 'Close'; close.style.cssText = 'margin:6px 0 0 0;padding:6px 14px;background:#555;color:#fff;border-radius:6px';
  close.onclick = () => box.remove();
  box.append(ta, copy, reset, close);
  document.body.appendChild(box);
  ta.focus(); ta.select();
}

function paint() {
  // The little counter is on every screen, so the teacher sees each student's numbers on Zoom without sending anything. Only the
  // teacher's dashboard opens the details with one tap; a student has to tap it 3 times quickly, so nobody opens it by accident.
  if (!visible) { if (badge) { badge.remove(); badge = null; } return; }
  if (!badge) {
    badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;background:rgba(0,0,0,.75);color:#fff;font:11px monospace;padding:3px 6px;border-radius:6px;cursor:pointer;max-width:70vw';
    // the teacher's dashboard: one tap opens the details; a student must tap it 3 times quickly (so a stray tap does nothing, but a
    // student can still open the box and copy the numbers for the teacher)
    let taps = [];
    badge.onclick = () => {
      if (interactive) { showDetails(); return; }
      const now = Date.now();
      taps = taps.filter(x => now - x < 1500); taps.push(now);
      if (taps.length >= 3) { taps = []; showDetails(); }
    };
    document.body.appendChild(badge);
  }
  badge.style.pointerEvents = 'auto';
  const top = Object.entries(state.by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(' · ');
  badge.textContent = `reads today: ${state.total}  ${top}`;
}
if (typeof window !== 'undefined') {
  window.__reads = () => state;
  window.__setReadsVisible = (v) => { visible = !!v; paint(); };
  window.__setReadsInteractive = (v) => { interactive = !!v; paint(); };
  window.__resetReads = () => { state = { day: DAY(), total: 0, by: {}, big: [] }; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } paint(); };
  setTimeout(paint, 2000);
}

export async function getDocs(q, ...rest) {
  const snap = await _getDocs(q, ...rest);
  if (!snap.metadata || !snap.metadata.fromCache) add(q, Math.max(1, snap.size));
  return snap;
}
export async function getDoc(ref, ...rest) {
  const snap = await _getDoc(ref, ...rest);
  if (!snap.metadata || !snap.metadata.fromCache) add(ref, 1);
  return snap;
}
export async function getCountFromServer(q, ...rest) {
  const r = await _getCount(q, ...rest);
  add(q, Math.max(1, Math.ceil((r.data().count || 0) / 1000)));
  return r;
}
export function onSnapshot(ref, ...args) {
  const count = (snap) => {
    try {
      if (!snap || (snap.metadata && (snap.metadata.fromCache || snap.metadata.hasPendingWrites))) return;
      add(ref, typeof snap.docChanges === 'function' ? Math.max(snap.docChanges().length, snap.size === 0 ? 1 : 0) : 1);
    } catch (e) { /* counting must never break the app */ }
  };
  const wrapped = args.map((a, i) => {
    if (typeof a === 'function' && i === args.findIndex(x => typeof x === 'function')) return (snap) => { count(snap); return a(snap); };
    if (a && typeof a === 'object' && typeof a.next === 'function') return { ...a, next: (snap) => { count(snap); return a.next(snap); } };
    return a;
  });
  return _onSnapshot(ref, ...wrapped);
}

// ---- every write announces itself ('dhamma-write'), so a screen that keeps a saved copy of a collection (cachedListen.js)
// can bring just that one document up to date after the teacher's own change, without reading the whole collection. ----
import { updateDoc as _updateDoc, setDoc as _setDoc, addDoc as _addDoc, deleteDoc as _deleteDoc, writeBatch as _writeBatch, runTransaction as _runTransaction } from '@firebase/firestore';
const announce = (ref, deleted) => { try { if (ref && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dhamma-write', { detail: { ref, deleted: !!deleted } })); } catch (e) { /* never break a write */ } };
export async function updateDoc(ref, ...rest) { const r = await _updateDoc(ref, ...rest); announce(ref); return r; }
export async function setDoc(ref, ...rest) { const r = await _setDoc(ref, ...rest); announce(ref); return r; }
export async function deleteDoc(ref) { const r = await _deleteDoc(ref); announce(ref, true); return r; }
export async function addDoc(ref, data) { const r = await _addDoc(ref, data); announce(r); return r; }
export function writeBatch(dbArg) {
  const b = _writeBatch(dbArg);
  const touched = [];
  const w = {
    set: (ref, ...a) => { touched.push([ref, false]); b.set(ref, ...a); return w; },
    update: (ref, ...a) => { touched.push([ref, false]); b.update(ref, ...a); return w; },
    delete: (ref) => { touched.push([ref, true]); b.delete(ref); return w; },
    commit: async () => { const r = await b.commit(); touched.forEach(([ref, del]) => announce(ref, del)); return r; },
  };
  return w;
}
export async function runTransaction(dbArg, fn, opts) {
  const touched = [];
  const r = await _runTransaction(dbArg, (tx) => {
    const w = {
      get: (ref) => tx.get(ref),
      set: (ref, ...a) => { touched.push([ref, false]); tx.set(ref, ...a); return w; },
      update: (ref, ...a) => { touched.push([ref, false]); tx.update(ref, ...a); return w; },
      delete: (ref) => { touched.push([ref, true]); tx.delete(ref); return w; },
    };
    return fn(w);
  }, opts);
  touched.forEach(([ref, del]) => announce(ref, del));
  return r;
}

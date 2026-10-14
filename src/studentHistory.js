// A student's schedule and study sessions for this year, in two parts: everything up
// to the last weekly snapshot comes from a static file (public/studentHistory/<uid>.json,
// rewritten every week by scripts/generate-weekly-snapshot.mjs -- no Firestore read),
// and only the last ~8 days before that snapshot, plus everything since, is read live.
// A student's login used to read their whole schedule and session history (hundreds of
// docs) every time. The older part can be up to a few days old by design.
//
// The live part needs a Firestore index on studentUid + startTime. Until it exists the
// query is refused for free and the old full read is used instead.
import { onSnapshot, query, where, Timestamp } from 'firebase/firestore';

const DAY_MS = 24 * 60 * 60 * 1000;
const historyCache = new Map();

const revive = (v) => {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 1 && typeof v._ms === 'number') return Timestamp.fromMillis(v._ms);
    const out = {};
    keys.forEach(k => { out[k] = revive(v[k]); });
    return out;
  }
  return v;
};

export function loadStudentHistory(studentUid) {
  if (!historyCache.has(studentUid)) {
    historyCache.set(studentUid, fetch(`${import.meta.env.BASE_URL}studentHistory/${encodeURIComponent(studentUid)}.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j && typeof j.generatedAtMs === 'number' ? { generatedAtMs: j.generatedAtMs, sessions: revive(j.sessions || []), schedule: revive(j.schedule || []), lessons: Array.isArray(j.lessons) ? revive(j.lessons) : null } : null))
      .catch(() => null));
  }
  return historyCache.get(studentUid);
}

const mergeById = (older, live) => {
  const byId = new Map(older.map(x => [x.id, x]));
  live.forEach(x => byId.set(x.id, x));
  return Array.from(byId.values());
};

// A student's lessons: everything already REPORTED up to the last weekly snapshot comes from the static
// file; live are only the lessons still open (pending/started, any age) and the ones reported since about a
// week before the snapshot. The student's open lessons are what matters day to day, the long tail of
// finished ones does not need a read every time the home page opens.
// The live part needs a Firestore index on studentUid + reportedAt (and the existing studentUid + status).
// Until the index exists, or if the file has no lessons yet, the old full read is used instead.
export function listenLessonsWithHistory({ collectionRef, studentUid, onList }) {
  let cancelled = false;
  let unsubs = [];
  const toList = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const readAll = () => {
    unsubs = [onSnapshot(query(collectionRef, where('studentUid', '==', studentUid)), (snap) => onList(toList(snap)), (e) => console.error('Error fetching student lessons:', e))];
  };
  (async () => {
    const hist = await loadStudentHistory(studentUid);
    if (cancelled) return;
    if (!hist || !hist.lessons) { readAll(); return; }
    const since = Timestamp.fromMillis(hist.generatedAtMs - 8 * DAY_MS);
    let open = [], recent = [], gotOpen = false, gotRecent = false, failed = false;
    const emit = () => { if (gotOpen && gotRecent && !cancelled) onList(mergeById(mergeById(hist.lessons, recent), open)); };
    const fail = (e) => {
      if (failed) return;
      failed = true;
      if (e && e.code === 'failed-precondition') console.warn('Index for lessons missing -- reading everything:', e.message);
      else console.error('Error fetching student lessons:', e);
      unsubs.forEach(u => u());
      if (!cancelled) readAll();
    };
    unsubs = [
      onSnapshot(query(collectionRef, where('studentUid', '==', studentUid), where('status', 'in', ['pending', 'started'])), (snap) => { open = toList(snap); gotOpen = true; emit(); }, fail),
      onSnapshot(query(collectionRef, where('studentUid', '==', studentUid), where('reportedAt', '>=', since)), (snap) => { recent = toList(snap); gotRecent = true; emit(); }, fail),
    ];
  })();
  return () => { cancelled = true; unsubs.forEach(u => u()); };
}

// kind: 'sessions' | 'schedule'. onList gets the full merged list on every change.
export function listenWithHistory({ collectionRef, studentUid, kind, onList }) {
  let unsub = () => {};
  let cancelled = false;
  const toList = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const readAll = () => {
    unsub = onSnapshot(query(collectionRef, where('studentUid', '==', studentUid)), (snap) => onList(toList(snap)), (e) => console.error(`Error fetching student ${kind}:`, e));
  };
  (async () => {
    const hist = await loadStudentHistory(studentUid);
    if (cancelled) return;
    if (!hist) { readAll(); return; }
    const since = Timestamp.fromMillis(hist.generatedAtMs - 8 * DAY_MS);
    unsub = onSnapshot(
      query(collectionRef, where('studentUid', '==', studentUid), where('startTime', '>=', since)),
      (snap) => onList(mergeById(hist[kind], toList(snap))),
      (e) => {
        if (e && e.code === 'failed-precondition') { console.warn(`Index for ${kind} missing -- reading everything:`, e.message); if (!cancelled) readAll(); }
        else console.error(`Error fetching student ${kind}:`, e);
      }
    );
  })();
  return () => { cancelled = true; unsub(); };
}

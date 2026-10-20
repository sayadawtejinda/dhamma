import React, { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { listenLiveOrOnce, isOnlineStatusDay } from './presenceDay';
import { useLiveWatch } from './liveWatch';
import { AvatarPeekModal } from './AvatarPeek';
import { X } from 'lucide-react';
import { HolyRankBadge } from './Awards';
import { db } from './firebase';

// One shared "who's online" pill + panel, used the same way in every app in
// this project (MyanmarReaderApp.jsx's version -- name + 🪙 coins + online
// count on a small fixed pill, opening a panel of everyone active in the
// last 7 days -- was the best-liked one, and is the template here). Each
// app still runs its OWN presence heartbeat (writing isOnline/lastSeen/
// whatever else onto its OWN roster doc, since that data differs per app);
// this component only reads that roster collection and renders it, so a
// future tweak to the LOOK of "online status" only has to happen once,
// here, instead of being copied by hand into every app again.
//
// Three states, not just online/offline: "online now" (seen within
// ONLINE_MS), "inactive" (seen recently but not within ONLINE_MS -- a
// student who's stuck/idle, worth a teacher's attention), and "active this
// week" (seen longer ago than WARNING_MS but within the last 7 days).

const ONLINE_MS = 3 * 60 * 1000;
const WARNING_MS = 8 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') { const ms = Date.parse(ts); return Number.isNaN(ms) ? 0 : ms; }
  return 0;
}

// The roster-reading half, usable on its own (e.g. just to show a count
// somewhere) without the pill/panel UI. `filterDocs`, if given, runs first
// on the raw roster docs -- e.g. a collection that also holds
// not-yet-approved students, which shouldn't count as "online" at all.
// `lastSeenField` lets a roster that names its heartbeat field something
// other than `lastSeen` (e.g. Dhammaschool's `lastActive`) plug in unchanged.
// A student's pill reads a static file instead (see scripts/generate-weekly-snapshot.mjs):
// "who was active this week" as of the last weekly refresh, with no Firestore read.
// Outside that, i.e. for the teacher, during the Sunday class window (when live "online"
// dots matter) and for any roster without a file, it reads the roster collection as before.
const rosterSnapshotCache = new Map();
export const loadRosterSnapshot = (rosterPath) => {
  if (!rosterSnapshotCache.has(rosterPath)) {
    rosterSnapshotCache.set(rosterPath, fetch(`${import.meta.env.BASE_URL}rosterSnapshots/${rosterPath.replace(/\//g, '__')}.json`)
      .then(r => (r.ok ? r.json() : null)).then(j => (j && j.docs) || null).catch(() => null));
  }
  return rosterSnapshotCache.get(rosterPath);
};

export function useOnlineRoster(rosterPath, filterDocs, lastSeenField = 'lastSeen', isTeacherMode = false, rankField = null) {
  const liveWatchOn = useLiveWatch();
  const [rosterDocs, setRosterDocs] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!rosterPath) return;
    let unsub = () => {};
    let cancelled = false;
    const readLive = () => {
      unsub = listenLiveOrOnce(collection(db, rosterPath), (snap) => {
        setRosterDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (e) => console.error('Online roster listen error:', e), isTeacherMode);
    };
    // Only the teacher gets the live picture, and only while his Live view switch is on; otherwise (and for
    // students) it is the weekly file, which costs no read.
    if (isTeacherMode && liveWatchOn) { readLive(); }
    else {
      loadRosterSnapshot(rosterPath).then(docs => {
        if (cancelled) return;
        if (docs) setRosterDocs(docs); else readLive();
      });
    }
    return () => { cancelled = true; unsub(); };
  }, [rosterPath, isTeacherMode, liveWatchOn]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const roster = (filterDocs ? rosterDocs.filter(filterDocs) : rosterDocs).map(s => {
    const lastSeenMs = toMillis(s[lastSeenField]);
    const since = lastSeenMs > 0 ? nowTick - lastSeenMs : Infinity;
    return {
      ...s,
      _isOnlineNow: since < ONLINE_MS,
      _isWarning: since >= ONLINE_MS && since < WARNING_MS,
      _isActiveThisWeek: lastSeenMs > 0 && since < WEEK_MS,
    };
  });

  const weeklyRosterList = roster
    .filter(s => s._isActiveThisWeek)
    .sort((a, b) => {
      if (a._isWarning !== b._isWarning) return a._isWarning ? -1 : 1;
      if (a._isOnlineNow !== b._isOnlineNow) return a._isOnlineNow ? -1 : 1;
      return toMillis(b[lastSeenField]) - toMillis(a[lastSeenField]);
    });

  const onlineCount = roster.filter(s => s._isOnlineNow).length;
  const warningCount = roster.filter(s => s._isWarning).length;

  // `rankField` (e.g. the Shrine Room's lotus count): EVERY student, the highest first, instead of just who was active this week
  const rankedAll = rankField
    ? roster.filter(s => (s.studentName || s.name)).slice().sort((a, b) => (b[rankField] || 0) - (a[rankField] || 0))
    : null;
  return { weeklyRosterList, onlineCount, warningCount, rankedAll };
}

// `renderActivity(entry)` is optional -- return JSX for a row's right side
// (e.g. MyanmarReaderApp's "Chapter 3 (A) · 420"); omit it for apps with no
// natural "what are they doing right now" signal, and rows just show
// Online now / Inactive / Active this week instead.
export default function OnlineStatusWidget({
  rosterPath,
  studentName,
  isTeacherMode,
  coinBalance,
  coinIcon = '🪙',
  onCoinClick,
  renderActivity,
  panelTitle = '📚 Students',
  teacherLabel = '👩‍🏫 Teacher',
  filterDocs,
  hidden,
  lastSeenField = 'lastSeen',
  // Some apps (e.g. Shrine Room) aren't used to monitor whether a student
  // is stuck/idle -- there's nothing there a teacher would "warn" a
  // student about -- so the inactive badge/label doesn't apply there.
  showInactiveWarning = true,
  // A second balance shown right next to the first (e.g. Shrine Room shows
  // its lotus count via `coinBalance` above, plus its actual Merit Shop
  // coin balance here) -- keeping both in this one always-visible pill
  // means a student can watch the coin number tick down while shopping,
  // instead of it living in a separate badge that a shop panel can cover.
  secondaryBalance,
  secondaryIcon = '🪙',
  // How the "active students" count reads on the pill (e.g. Nature World
  // shows it as "visit 46 👥" since tapping it lists who to visit).
  weeklyLabel = (n) => <>👥 {n} this week</>,
  // A line under the list's heading (e.g. what the ✅ marks mean).
  panelNote,
  // true: the pill sits at the top centre instead of the top right corner (SmartStudy, where the
  // buttons of the lesson list already fill the right corner).
  centered = false,
  // true: only the name and wallet, no "this week" / online list button (the Avatar room)
  hideRoster = false,
  // A pointing finger for beginners: on the list button, then (inside the list) at the first friend's button.
  // Shown for the first 3 times the student opens this app, then never again (remembered on this device).
  guideKey = null,
  // Name of a roster number (e.g. 'lotusCount'): the list then shows every student ranked by it (top three wear a Dhamma wheel).
  rankField = null,
  // A room can decide what a tap on a NAME does (e.g. open that friend's room with their Avatar); return false to fall back to the Avatar window.
  onNameTap = null,
}) {
  const liveWatchOn = useLiveWatch();
  const { weeklyRosterList, onlineCount, warningCount: rawWarningCount, rankedAll } = useOnlineRoster(rosterPath, filterDocs, lastSeenField, isTeacherMode, rankField);
  const shownList = rankedAll || weeklyRosterList;
  const warningCount = showInactiveWarning ? rawWarningCount : 0;
  const [showPanel, setShowPanel] = useState(false);
  const [peekName, setPeekName] = useState(null);
  const [guideOn] = useState(() => {
    if (!guideKey || isTeacherMode || !studentName) return false;
    try {
      const k = `visitGuide_${guideKey}_${studentName}`;
      const n = parseInt(localStorage.getItem(k) || '0', 10) || 0;
      if (n >= 3) return false;
      localStorage.setItem(k, String(n + 1));
      return true;
    } catch (e) { return false; }
  });
  const firstFriendId = guideOn ? (weeklyRosterList.find(s => (s.studentName || s.name) !== studentName) || {}).id : null;

  if (hidden || (!isTeacherMode && !studentName)) return null;

  return (
    <>
      <div className={`fixed top-2 ${centered ? 'left-1/2 -translate-x-1/2 max-w-[calc(100vw-9rem)] flex-wrap justify-center' : 'right-2'} z-[9800] flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-sm`}>
        {isTeacherMode ? (
          <span className="font-bold text-indigo-600">{teacherLabel}</span>
        ) : (
          <span className="font-bold text-gray-700">{studentName}</span>
        )}
        {!isTeacherMode && coinBalance != null && (
          onCoinClick ? (
            <button
              id="online-status-coin-badge"
              onClick={onCoinClick}
              className="flex items-center gap-1 text-amber-600 font-bold hover:underline"
              title="Click to deposit into your Shrine Room wallet"
            >
              <span>{coinIcon}</span>{coinBalance}
            </button>
          ) : (
            <span id="online-status-coin-badge" className="flex items-center gap-1 text-amber-600 font-bold" title="Gold coins earned">
              <span>{coinIcon}</span>{coinBalance}
            </span>
          )
        )}
        {!isTeacherMode && secondaryBalance != null && (
          <span className="flex items-center gap-1 text-amber-600 font-bold" title="Coins available to spend">
            <span>{secondaryIcon}</span>{secondaryBalance}
          </span>
        )}
        {!hideRoster && <span className="relative">
          {guideOn && !showPanel && <span aria-hidden="true" className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full -mt-1 text-4xl leading-none drop-shadow-lg animate-bounce z-[9999]">👆</span>}
          <button onClick={() => setShowPanel(true)} className="flex items-center gap-1 text-emerald-600 font-bold hover:underline">
          {(isTeacherMode && liveWatchOn)
            ? <><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online</>
            : weeklyLabel(weeklyRosterList.length)}
          {warningCount > 0 && (
            <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full ml-1">{warningCount} inactive</span>
          )}
        </button></span>}
      </div>
      <AvatarPeekModal name={peekName} onClose={() => setPeekName(null)} />
      {showPanel && (
        <div className="fixed inset-0 z-[9950] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white -mx-6 -mt-6 px-6 pt-6 pb-3 mb-1 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{panelTitle} {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
              <button onClick={() => setShowPanel(false)} className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white" aria-label="Close"><X size={20} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">{rankedAll ? 'Everyone, the most first (updated weekly).' : 'Showing everyone active in the last 7 days.'}</p>
            {panelNote && <p className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-3">{panelNote}</p>}
            <div className="space-y-2">
              {shownList.map((s, idx) => {
                const isWarning = showInactiveWarning && s._isWarning;
                return (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${isWarning ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    {rankedAll && <HolyRankBadge rank={idx + 1} />}
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s._isOnlineNow ? 'bg-emerald-500' : isWarning ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                    <button type="button" className="font-bold text-gray-800 hover:underline text-left" title="See their Avatar" onClick={(e) => { e.stopPropagation(); const handled = onNameTap ? onNameTap(s) : false; if (handled === false || !onNameTap) setPeekName(s.studentName || s.name); }}>{s.studentName || s.name}</button>
                  </div>
                  <div className="text-right text-sm flex items-center justify-end gap-1">
                    {s.id === firstFriendId && <span aria-hidden="true" className="text-3xl leading-none animate-bounce">👉</span>}
                    {isWarning ? (
                      <span className="text-red-600 font-bold text-xs">Inactive (please warn student)</span>
                    ) : renderActivity ? (
                      renderActivity(s)
                    ) : (
                      <span className="text-gray-400 italic">{s._isOnlineNow ? 'Online now' : 'Active this week'}</span>
                    )}
                  </div>
                </div>
                );
              })}
              {shownList.length === 0 && <p className="text-center text-gray-400 py-6">No students active this week yet.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

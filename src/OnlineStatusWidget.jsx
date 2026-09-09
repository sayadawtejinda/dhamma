import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { X } from 'lucide-react';
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
export function useOnlineRoster(rosterPath, filterDocs, lastSeenField = 'lastSeen') {
  const [rosterDocs, setRosterDocs] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!rosterPath) return;
    const unsub = onSnapshot(collection(db, rosterPath), (snap) => {
      setRosterDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => console.error('Online roster listen error:', e));
    return () => unsub();
  }, [rosterPath]);

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

  return { weeklyRosterList, onlineCount, warningCount };
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
  renderActivity,
  panelTitle = '📚 Students',
  teacherLabel = '👩‍🏫 Teacher',
  filterDocs,
  hidden,
  lastSeenField = 'lastSeen',
}) {
  const { weeklyRosterList, onlineCount, warningCount } = useOnlineRoster(rosterPath, filterDocs, lastSeenField);
  const [showPanel, setShowPanel] = useState(false);

  if (hidden || (!isTeacherMode && !studentName)) return null;

  return (
    <>
      <div className="fixed top-2 right-2 z-[9800] flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-sm">
        {isTeacherMode ? (
          <span className="font-bold text-indigo-600">{teacherLabel}</span>
        ) : (
          <span className="font-bold text-gray-700">{studentName}</span>
        )}
        {!isTeacherMode && coinBalance != null && (
          <span className="flex items-center gap-1 text-amber-600 font-bold" title="Gold coins earned">
            <span>🪙</span>{coinBalance}
          </span>
        )}
        <button onClick={() => setShowPanel(true)} className="flex items-center gap-1 text-emerald-600 font-bold hover:underline">
          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
          {warningCount > 0 && (
            <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-full ml-1">{warningCount} inactive</span>
          )}
        </button>
      </div>
      {showPanel && (
        <div className="fixed inset-0 z-[9950] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">{panelTitle} {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Showing everyone active in the last 7 days.</p>
            <div className="space-y-2">
              {weeklyRosterList.map(s => (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${s._isWarning ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s._isOnlineNow ? 'bg-emerald-500' : s._isWarning ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-gray-800">{s.studentName || s.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    {s._isWarning ? (
                      <span className="text-red-600 font-bold text-xs">Inactive (please warn student)</span>
                    ) : renderActivity ? (
                      renderActivity(s)
                    ) : (
                      <span className="text-gray-400 italic">{s._isOnlineNow ? 'Online now' : 'Active this week'}</span>
                    )}
                  </div>
                </div>
              ))}
              {weeklyRosterList.length === 0 && <p className="text-center text-gray-400 py-6">No students active this week yet.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

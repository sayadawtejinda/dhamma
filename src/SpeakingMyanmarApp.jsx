import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// "Speaking Myanmar" — the second combined group, same pattern as
// ReadingMyanmarApp.jsx: bundles 6 previously-separate apps behind one
// Lesson Bank entry with a "Choose a Part" landing screen, plus ONE
// shared online-status feed for the whole group (visible from the
// chooser screen AND from inside any part, showing which part each
// online student is currently on). Each part's own built-in online badge
// is suppressed via `hideOwnOnlineBadge` so it doesn't show twice.
const MyanmarPoemsApp = lazy(() => import('./MyanmarPoemsApp'));
const MyanmarNumberLearningApp = lazy(() => import('./MyanmarNumberLearningApp'));
const AnimalSoundApp = lazy(() => import('./AnimalSoundApp'));
const BurmeseLearningGamesApp = lazy(() => import('./BurmeseLearningGamesApp'));
const InteractiveLearningQuizApp = lazy(() => import('./InteractiveLearningQuizApp'));
const TimeAndCalendarApp = lazy(() => import('./TimeAndCalendarApp'));

// Labels are placeholders ("Part 1", "Part 2", ...) — easy to rename later
// in one place once final names are picked.
const SPEAKING_PARTS = [
  { key: 'myanmarpoems', label: 'Part 1', subtitle: 'Myanmar Poems', color: 'emerald', Component: MyanmarPoemsApp },
  { key: 'numberlearning', label: 'Part 2', subtitle: 'Number Learning', color: 'indigo', Component: MyanmarNumberLearningApp },
  { key: 'animalsound', label: 'Part 3', subtitle: 'Animal Sound Quiz', color: 'sky', Component: AnimalSoundApp },
  { key: 'burmeselearninggames', label: 'Part 4', subtitle: 'Burmese Learning Games', color: 'lime', Component: BurmeseLearningGamesApp },
  { key: 'interactivequiz', label: 'Part 5', subtitle: 'Interactive Learning Quiz', color: 'rose', Component: InteractiveLearningQuizApp },
  { key: 'timeandcalendar', label: 'Part 6', subtitle: 'Time and Calendar', color: 'cyan', Component: TimeAndCalendarApp },
];
const partLabelByKey = (key) => {
  const p = SPEAKING_PARTS.find(p => p.key === key);
  return p ? `${p.label}: ${p.subtitle}` : null;
};

const SPEAKING_MYANMAR_ROSTER_PATH = 'artifacts/speaking-myanmar-app/public/data/roster';
const sanitizeSpeakingKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

function SpeakingMyanmarLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="text-xl font-semibold text-orange-600">Loading...</div>
    </div>
  );
}

export default function SpeakingMyanmarApp({ entryRequest, onExit }) {
  const [activePart, setActivePart] = useState(() => entryRequest?.initialPart || null);
  const studentName = entryRequest?.studentName || null;
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [nowForOnlineCheck, setNowForOnlineCheck] = useState(Date.now());
  const activePartRef = useRef(activePart);
  activePartRef.current = activePart;

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, SPEAKING_MYANMAR_ROSTER_PATH, sanitizeSpeakingKey(studentName));
    const ping = () => setDoc(rosterRef, { studentName, isOnline: true, currentPart: activePartRef.current, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    ping();
    const interval = setInterval(ping, 30000);
    const goOffline = () => { updateDoc(rosterRef, { isOnline: false, currentPart: null, lastSeen: serverTimestamp() }).catch(() => {}); };
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [studentName]);

  useEffect(() => {
    if (!studentName) return;
    const rosterRef = doc(db, SPEAKING_MYANMAR_ROSTER_PATH, sanitizeSpeakingKey(studentName));
    setDoc(rosterRef, { studentName, isOnline: true, currentPart: activePart, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [activePart, studentName]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, SPEAKING_MYANMAR_ROSTER_PATH), (snap) => {
      setOnlineStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => console.error('Speaking Myanmar roster listen error:', e));
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowForOnlineCheck(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isRosterEntryOnline = (s) => {
    const lastSeenMs = s.lastSeen?.toMillis ? s.lastSeen.toMillis() : (s.lastSeen?.seconds ? s.lastSeen.seconds * 1000 : 0);
    return lastSeenMs > 0 && (nowForOnlineCheck - lastSeenMs) < 5 * 60 * 1000;
  };
  const weeklyRosterList = onlineStudents
    .filter(s => {
      const lastSeenMs = s.lastSeen?.toMillis ? s.lastSeen.toMillis() : (s.lastSeen?.seconds ? s.lastSeen.seconds * 1000 : 0);
      return lastSeenMs > 0 && (nowForOnlineCheck - lastSeenMs) < 7 * 24 * 60 * 60 * 1000;
    })
    .map(s => ({ ...s, _isOnlineNow: isRosterEntryOnline(s) }))
    .sort((a, b) => {
      if (a._isOnlineNow !== b._isOnlineNow) return b._isOnlineNow ? 1 : -1;
      const aMs = a.lastSeen?.toMillis ? a.lastSeen.toMillis() : 0;
      const bMs = b.lastSeen?.toMillis ? b.lastSeen.toMillis() : 0;
      return bMs - aMs;
    });
  const onlineCount = onlineStudents.filter(isRosterEntryOnline).length;

  const activePartData = SPEAKING_PARTS.find(p => p.key === activePart);

  const OnlineBadge = (
    <>
      <button
        onClick={() => setShowOnlinePanel(true)}
        className="fixed top-16 right-4 z-[9990] flex items-center gap-1 text-sm font-bold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl shadow-lg border border-gray-200 text-emerald-600 hover:underline"
      >
        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>{onlineCount} online
      </button>
      {showOnlinePanel && (
        <div className="fixed inset-0 z-[9995] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOnlinePanel(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">🗣️ Students {onlineCount > 0 && <span className="text-emerald-600">({onlineCount} online)</span>}</h2>
              <button onClick={() => setShowOnlinePanel(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Showing everyone active in the last 7 days, and which part they're on.</p>
            <div className="space-y-2">
              {weeklyRosterList.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s._isOnlineNow ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-gray-800">{s.studentName}</span>
                  </div>
                  <span className="text-xs text-gray-400 text-right">
                    {s._isOnlineNow ? (partLabelByKey(s.currentPart) || 'Choose a Part screen') : 'Active this week'}
                  </span>
                </div>
              ))}
              {weeklyRosterList.length === 0 && <p className="text-center text-gray-400 py-6">No students active this week yet.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!activePartData) {
    return (
      <div className="min-h-screen bg-orange-50">
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
          >
            ← Back to Tutoring Dashboard
          </button>
        </div>
        <div className="max-w-2xl mx-auto p-4 md:p-8 pt-16">
          <h2 className="text-3xl font-bold text-orange-700 mb-2 text-center">🗣️ Speaking Myanmar app — Choose a Part</h2>
          <p className="text-sm text-gray-500 text-center mb-6">Pick a part below. You can come back to this screen anytime.</p>
          <div className="space-y-3">
            {SPEAKING_PARTS.map(part => (
              <button
                key={part.key}
                onClick={() => setActivePart(part.key)}
                className={`w-full flex items-center justify-between bg-white p-4 rounded-xl border-2 border-${part.color}-200 hover:border-${part.color}-400 hover:shadow-md transition-all`}
              >
                <span className={`text-lg font-bold text-${part.color}-800`}>{part.label}: {part.subtitle}</span>
                <span className={`text-${part.color}-500 text-xl`}>→</span>
              </button>
            ))}
          </div>
        </div>
        {OnlineBadge}
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<SpeakingMyanmarLoading />}>
        <div className="fixed top-3 left-3 z-[9999]">
          <button
            onClick={() => setActivePart(null)}
            className="px-4 py-2 bg-gray-800 text-white rounded-full shadow-lg font-semibold text-sm hover:bg-gray-900"
          >
            ← Choose a Part
          </button>
        </div>
        <activePartData.Component entryRequest={entryRequest} onExit={() => setActivePart(null)} hideOwnOnlineBadge />
      </Suspense>
      {OnlineBadge}
    </>
  );
}

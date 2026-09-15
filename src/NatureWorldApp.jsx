import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import OnlineStatusWidget from './OnlineStatusWidget';

// A student's own growing "nature world" -- buy land plots, then plant
// trees on them one at a time, all paid for with coins earned from
// studying. First piece of a bigger idea the teacher wants to grow over
// many future passes (animals wandering around, a pond with fish, etc.) --
// this pass deliberately keeps to land + trees only, in 2D (CSS/emoji, not
// a 3D game engine -- see the chat this was designed in for why).
//
// Same "no wallet of its own" pattern as AvatarApp.jsx: spends directly out
// of the same Shrine Room coin balance every other app already deposits
// into, on the exact same roster doc, just with its own `natureWorld`
// field alongside `avatar`/`coinBalance`/etc.
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');

// Landscape-first by design (a wide plot of land, not a tall one) -- the
// teacher specifically wants a phone held sideways to see the whole world
// at once. GRID_COLS/GRID_ROWS is the maximum a world can ever grow to;
// FREE_PLOTS start already unlocked so a brand-new world isn't empty.
const GRID_COLS = 6;
const GRID_ROWS = 4;
const MAX_PLOTS = GRID_COLS * GRID_ROWS;
const FREE_PLOTS = 8;
// Cost to unlock the NEXT plot rises slowly with how much land is already
// owned, so early expansion is cheap and a fully-grown world is a real
// long-term goal.
const plotCost = (alreadyUnlocked) => 15 + Math.floor(alreadyUnlocked / 2) * 5;

const TREE_OPTIONS = [
  { id: 'pine', name: 'Pine Tree', emoji: '🌲', cost: 10 },
  { id: 'maple', name: 'Maple Tree', emoji: '🍁', cost: 12 },
  { id: 'oak', name: 'Oak Tree', emoji: '🌳', cost: 15 },
  { id: 'palm', name: 'Palm Tree', emoji: '🌴', cost: 15 },
  { id: 'blossom', name: 'Cherry Blossom', emoji: '🌸', cost: 20 },
  { id: 'coconut', name: 'Coconut Tree', emoji: '🥥', cost: 18 },
];
const findTree = (id) => TREE_OPTIONS.find(t => t.id === id);

const DEFAULT_WORLD = { landUnlocked: FREE_PLOTS, placedTrees: {} };

export default function NatureWorldApp({ entryRequest, onExit }) {
  const isTeacherPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(isTeacherPreview ? 500 : 0);
  const [world, setWorld] = useState(DEFAULT_WORLD);
  const [toast, setToast] = useState(null);
  const [shopSlot, setShopSlot] = useState(null); // plot index currently choosing a tree, or null

  const [recentVisitors, setRecentVisitors] = useState([]);
  const [showVisitorsPanel, setShowVisitorsPanel] = useState(false);
  const [visitingStudentName, setVisitingStudentName] = useState(null);
  const [visitingWorld, setVisitingWorld] = useState(null);
  const [visitLoading, setVisitLoading] = useState(false);

  const rosterRef = studentUid ? doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName)) : null;

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let isMounted = true;
    (async () => {
      try {
        const snap = rosterRef ? await getDoc(rosterRef) : null;
        if (snap && snap.exists()) {
          const data = snap.data();
          if (isMounted) {
            setCoinBalance(data.coinBalance ?? 0);
            setWorld({ ...DEFAULT_WORLD, ...(data.natureWorld || {}) });
            setRecentVisitors(data.natureWorldRecentVisitors || []);
          }
        }
      } catch (e) {
        console.error('Error loading Nature World data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  const persist = (patch) => {
    if (!rosterRef) return;
    setDoc(rosterRef, { studentName, ...patch }, { merge: true }).catch(() => {});
  };

  const handleBuyLand = () => {
    if (world.landUnlocked >= MAX_PLOTS) { showToast('Your whole plot of land is already unlocked!'); return; }
    const cost = plotCost(world.landUnlocked);
    if (!isTeacherPreview && coinBalance < cost) { showToast('Not enough coins.'); return; }
    if (!isTeacherPreview) {
      setCoinBalance(prev => Math.max(0, prev - cost));
      persist({ coinBalance: increment(-cost) });
    }
    const nextWorld = { ...world, landUnlocked: world.landUnlocked + 1 };
    setWorld(nextWorld);
    persist({ 'natureWorld.landUnlocked': nextWorld.landUnlocked });
    showToast('🟫 New land unlocked!');
  };

  const handlePlantTree = (option) => {
    if (shopSlot == null) return;
    if (!isTeacherPreview && coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    if (!isTeacherPreview) {
      setCoinBalance(prev => Math.max(0, prev - option.cost));
      persist({ coinBalance: increment(-option.cost) });
    }
    const nextTrees = { ...world.placedTrees, [shopSlot]: { id: option.id, plantedAt: Date.now() } };
    setWorld(prev => ({ ...prev, placedTrees: nextTrees }));
    persist({ [`natureWorld.placedTrees.${shopSlot}`]: { id: option.id, plantedAt: Date.now() } });
    showToast(`${option.name} planted!`);
    setShopSlot(null);
  };

  const handleRemoveTree = (slotIndex) => {
    const nextTrees = { ...world.placedTrees };
    delete nextTrees[slotIndex];
    setWorld(prev => ({ ...prev, placedTrees: nextTrees }));
    persist({ 'natureWorld.placedTrees': nextTrees });
  };

  // Fetches another student's world read-only and records the visit on
  // their own roster doc -- same pattern as Shrine Room/Avatar/Bodhi Tree.
  const handleVisitStudent = async (targetName) => {
    if (!targetName || targetName === studentName) return;
    setVisitingStudentName(targetName);
    setVisitingWorld(null);
    setVisitLoading(true);
    try {
      const targetRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(targetName));
      const snap = await getDoc(targetRef);
      const data = snap.exists() ? snap.data() : {};
      setVisitingWorld(snap.exists() ? { ...DEFAULT_WORLD, ...(data.natureWorld || {}) } : null);
      if (studentName) {
        const others = (data.natureWorldRecentVisitors || []).filter(v => v.name !== studentName);
        const nextVisitors = [{ name: studentName, visitedAt: Date.now() }, ...others].slice(0, 10);
        setDoc(targetRef, { natureWorldRecentVisitors: nextVisitors }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.error('Error visiting Nature World:', e);
      showToast('Could not open their Nature World.');
      setVisitingStudentName(null);
    }
    setVisitLoading(false);
  };
  const closeVisit = () => { setVisitingStudentName(null); setVisitingWorld(null); };

  const renderGrid = (w, { interactive }) => (
    <div
      className="grid gap-2 w-full"
      style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: MAX_PLOTS }).map((_, i) => {
        const unlocked = i < w.landUnlocked;
        const tree = unlocked && w.placedTrees[i] ? findTree(w.placedTrees[i].id) : null;
        return (
          <div
            key={i}
            onClick={() => {
              if (!interactive || !unlocked) return;
              if (tree) { handleRemoveTree(i); return; }
              setShopSlot(i);
            }}
            title={!interactive ? undefined : !unlocked ? 'Locked land' : tree ? `${tree.name} -- tap to remove` : 'Tap to plant a tree'}
            className={`aspect-square rounded-lg flex items-center justify-center text-2xl sm:text-3xl transition-transform ${
              unlocked
                ? 'bg-gradient-to-b from-lime-200 to-green-300 border border-green-400' + (interactive ? ' hover:scale-105 cursor-pointer' : '')
                : 'bg-gray-100 border border-dashed border-gray-300'
            }`}
          >
            {tree ? (
              <span className="inline-block" style={{ animation: 'natureTreeSway 3.2s ease-in-out infinite' }}>{tree.emoji}</span>
            ) : unlocked ? (
              interactive ? <span className="text-gray-400 text-lg">+</span> : null
            ) : (
              <span className="text-gray-300">🔒</span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-20 pb-16 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100">
      <style>{`
        @keyframes natureTreeSway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
      `}</style>
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <OnlineStatusWidget
        rosterPath={SHRINE_ROSTER_PATH}
        studentName={isTeacherPreview ? null : studentName}
        isTeacherMode={isTeacherPreview}
        coinBalance={isTeacherPreview ? null : coinBalance}
        coinIcon="🪙"
        panelTitle="🌿 Students"
        teacherLabel="🧑‍🏫 Teacher"
        showInactiveWarning={false}
        renderActivity={(s) => !isTeacherPreview && s.studentName !== studentName && (
          <button
            onClick={(e) => { e.stopPropagation(); handleVisitStudent(s.studentName); }}
            className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5"
          >
            👣 Visit
          </button>
        )}
      />

      {!isTeacherPreview && (
        <button
          onClick={() => setShowVisitorsPanel(true)}
          className="fixed top-16 right-3 z-50 flex items-center gap-1 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-semibold px-3 py-2 rounded-full shadow-lg border-2 border-emerald-300"
        >
          👣 Visitors{recentVisitors.length > 0 ? ` (${recentVisitors.length})` : ''}
        </button>
      )}

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center">
        {studentName}'s Nature World
      </h1>
      <p className="text-emerald-600 text-sm mb-2 text-center">
        🌱 Buy land, then plant a tree at a time with coins you've earned
      </p>
      {/* Landscape hint -- true orientation-lock isn't reliable across
          browsers without a user gesture + Fullscreen API (and doesn't
          work at all on iOS Safari), so this is a nudge, not an
          enforcement -- the grid itself still works fine in portrait,
          just showing less width at once. */}
      <p className="sm:hidden text-xs text-amber-600 font-semibold mb-4 flex items-center gap-1">
        📱 Turn your phone sideways for the widest view!
      </p>

      {loading ? (
        <p className="text-emerald-700">Loading your world...</p>
      ) : (
        <>
          <div className="w-full max-w-3xl">
            {renderGrid(world, { interactive: true })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleBuyLand}
              disabled={world.landUnlocked >= MAX_PLOTS}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-3 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {world.landUnlocked >= MAX_PLOTS ? '🟫 Land Fully Unlocked' : `🟫 Unlock Land (🪙 ${plotCost(world.landUnlocked)})`}
            </button>
          </div>
        </>
      )}

      {/* Tree shop -- opens when an empty unlocked plot is tapped. */}
      {shopSlot != null && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4" onClick={() => setShopSlot(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-emerald-800 mb-4 text-center">🌱 Plant a Tree</h2>
            <div className="space-y-2 mb-2">
              {TREE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePlantTree(option)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                >
                  <span className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-xl">{option.emoji}</span>
                    {option.name}
                  </span>
                  <span className="text-sm font-bold text-emerald-700">🪙 {option.cost}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShopSlot(null)} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl mt-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Visitors -- who has come to see MY world recently. */}
      {showVisitorsPanel && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowVisitorsPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-emerald-800 mb-4">👣 Recent Visitors</h2>
            {recentVisitors.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No one has visited your world yet.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto text-left">
                {recentVisitors.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <span className="font-semibold text-gray-800">{v.name}</span>
                    <span className="text-xs text-gray-400">{new Date(v.visitedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowVisitorsPanel(false)} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Visit -- a read-only peek at another student's world. */}
      {visitingStudentName && (
        <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={closeVisit}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-emerald-800 mb-4">🌿 {visitingStudentName}'s Nature World</h2>
            {visitLoading ? (
              <p className="text-sm text-gray-400 py-8">Opening...</p>
            ) : !visitingWorld ? (
              <p className="text-sm text-gray-400 py-8">They haven't started a Nature World yet.</p>
            ) : (
              renderGrid(visitingWorld, { interactive: false })
            )}
            <button onClick={closeVisit} className="mt-5 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-xl">
              Close
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10002] bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

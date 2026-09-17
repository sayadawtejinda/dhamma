import React, { useEffect, useState } from 'react';
import { collection, doc, addDoc, deleteDoc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';
import OnlineStatusWidget from './OnlineStatusWidget';

// A tiny "menu of external video links" app -- these aren't real lessons
// with any content or progress tracking of their own, just a link to a
// YouTube video/channel/playlist the student watches outside this app.
// Trophies for watching keep working exactly like they did for the five
// old bare-link Lesson Bank entries this consolidates (see the "Fix Watch
// & Learn videos" migration in Data Management): the student reports back
// how many minutes they watched via the normal Report flow, same as any
// other linked app.
//
// The list itself lives in Firestore (not hardcoded) specifically so the
// teacher can add more videos later without needing a code change --
// exactly what was asked for when there were only 5 to start.
const publicDataPath = `/artifacts/${appId}/public/data`;
const videosCollection = collection(db, `${publicDataPath}/watchAndLearnVideos`);

// Coins (no more trophies -- see TutoringApp.jsx's handleSubmitFeedback,
// which computes them from time-open-to-report and pays them into this
// roster) are earned here but spent in Shrine Room, same wallet-then-
// deposit shape as every other simple app's coin economy. Roster is
// uid-keyed from the start (TutoringApp already knows studentUid, so
// there's no pre-existing name-keyed data to migrate from).
const WATCH_LEARN_ROSTER_PATH = 'artifacts/watch-and-learn-app/public/data/roster';
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');

export default function WatchAndLearnApp({ entryRequest, onExit }) {
  const isTeacherMode = entryRequest?.mode === 'teacher';
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    const q = query(videosCollection, orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (e) => { console.error('Error loading videos:', e); setLoading(false); });
    return () => unsub();
  }, []);

  // Presence + coin balance -- mirrors every other simple app's roster
  // ping (isOnline/lastSeen every 60s, offline on unload), just also
  // listening live for this student's own coin total.
  useEffect(() => {
    if (isTeacherMode || !studentUid || !studentName) return;
    const rosterRef = doc(db, WATCH_LEARN_ROSTER_PATH, studentUid);
    const unsubBalance = onSnapshot(rosterRef, (snap) => {
      setCoinBalance(snap.exists() ? (snap.data().coinBalance || 0) : 0);
    }, () => {});
    const ping = () => setDoc(rosterRef, {
      studentName, isOnline: true, lastSeen: serverTimestamp(),
    }, { merge: true }).catch(() => {});
    ping();
    const interval = setInterval(ping, 60000);
    const goOffline = () => { updateDoc(rosterRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {}); };
    window.addEventListener('beforeunload', goOffline);
    return () => { clearInterval(interval); goOffline(); window.removeEventListener('beforeunload', goOffline); };
  }, [isTeacherMode, studentUid, studentName]);

  const handleDepositToShrineRoom = async () => {
    const depositable = coinBalance;
    if (depositable <= 0) { window.alert('You have no coins to deposit right now.'); return; }
    const confirmed = window.confirm(`Deposit ${depositable} coin(s) into your Shrine Room wallet?`);
    if (!confirmed) return;
    try {
      const shrineRef = doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName));
      const shrineSnap = await getDoc(shrineRef);
      const SHRINE_STARTER_COINS = 20;
      await setDoc(shrineRef, {
        studentName,
        coinBalance: shrineSnap.exists() ? increment(depositable) : SHRINE_STARTER_COINS + depositable,
      }, { merge: true });
      await setDoc(doc(db, WATCH_LEARN_ROSTER_PATH, studentUid), { coinBalance: increment(-depositable) }, { merge: true });
      window.alert(`🪙 Deposited ${depositable} coin(s) into your Shrine Room wallet!`);
    } catch (e) {
      console.error('Error depositing coins to Shrine Room:', e);
      window.alert('⚠️ Something went wrong depositing your coins. Please try again.');
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    const link = newLink.trim();
    if (!title || !link) return;
    setIsSaving(true);
    try {
      const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.order || 0)) + 1 : 0;
      await addDoc(videosCollection, { title, link, order: nextOrder, createdAt: serverTimestamp() });
      setNewTitle('');
      setNewLink('');
    } catch (e) {
      console.error('Error adding video:', e);
      alert('Could not add that video. Please try again.');
    }
    setIsSaving(false);
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Remove this video from the list? Students will no longer see it here.')) return;
    try {
      await deleteDoc(doc(db, `${publicDataPath}/watchAndLearnVideos`, videoId));
    } catch (e) {
      console.error('Error deleting video:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 px-4 pt-20 pb-16">
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <OnlineStatusWidget
        rosterPath={WATCH_LEARN_ROSTER_PATH}
        studentName={isTeacherMode ? null : studentName}
        isTeacherMode={isTeacherMode}
        coinBalance={isTeacherMode ? null : coinBalance}
        coinIcon="🪙"
        onCoinClick={isTeacherMode ? null : handleDepositToShrineRoom}
        panelTitle="🎥 Students"
        teacherLabel="🧑‍🏫 Teacher"
      />

      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-orange-800 text-center mb-1">🎥 Watch &amp; Learn</h1>
        <p className="text-orange-600 text-sm text-center mb-6">Tap a video to watch, then tell your teacher how much you watched</p>

        {loading ? (
          <p className="text-center text-orange-700">Loading...</p>
        ) : videos.length === 0 ? (
          <p className="text-center text-orange-500">No videos yet.</p>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between gap-3 border border-orange-100">
                <p className="font-semibold text-gray-800 flex-1">{v.title}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={v.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-transform hover:scale-105"
                  >
                    ▶️ Watch
                  </a>
                  {isTeacherMode && (
                    <button
                      onClick={() => handleDeleteVideo(v.id)}
                      className="text-red-500 hover:text-red-700 w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50"
                      title="Remove this video"
                      aria-label="Remove this video"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isTeacherMode && (
          <form onSubmit={handleAddVideo} className="mt-8 bg-white rounded-2xl shadow-md p-4 border border-orange-100">
            <p className="font-semibold text-gray-800 mb-3">Add a video</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (e.g. Animated Buddhist Stories)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <input
                type="text"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Link (e.g. https://youtube.com/...)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="submit"
                disabled={isSaving || !newTitle.trim() || !newLink.trim()}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md disabled:opacity-50"
              >
                {isSaving ? 'Adding...' : '+ Add Video'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

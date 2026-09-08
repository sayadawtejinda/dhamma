import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// A fully independent app (deliberately NOT part of TutoringApp.jsx) --
// first piece of the "gamified student home" idea: a Bodhi tree that grows
// from a student's real attendance history. First-piece scope only: show
// the tree at its real current age and a satisfying "water it" moment when
// a student opens this. The daily-login streak / shop / room-based layout
// ideas are separate, later pieces.

const publicDataPath = `/artifacts/${appId}/public/data`;

// Same "did this student attend this schedule entry" question TutoringApp's
// getStudentAttendanceForEntry answers -- duplicated (not imported) since
// this app is meant to stand alone.
const getAttendanceStatus = (entry, sessions) => {
  if (entry.overrideStatus === 'attended') return 'attended';
  if (entry.overrideStatus === 'absent') return 'absent';
  if (entry.studentUid !== 'offline') {
    const entryDate = entry.startTime.toDate();
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
    const didAttend = (sessions || []).some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
    return didAttend ? 'attended' : 'absent';
  }
  return 'absent';
};

// 1 attended class = 7 "tree-age days" -- confirmed by the teacher: most
// students attend once a week, so a tree ages roughly like a real one from
// real attendance history instead of raw login count (a student who only
// attends occasionally shouldn't have as old a tree as one who attends
// every week, even if both have opened this app the same number of times).
const STAGES = [
  { minDays: 0, emoji: '🌰', label: 'Just Planted' },
  { minDays: 7, emoji: '🌱', label: 'Sprouting' },
  { minDays: 28, emoji: '🌿', label: 'Growing Sapling' },
  { minDays: 70, emoji: '🪴', label: 'Young Tree' },
  { minDays: 140, emoji: '🌳', label: 'Strong Tree' },
  { minDays: 280, emoji: '🌳', label: 'Bodhi Tree' },
  { minDays: 500, emoji: '🌳✨', label: 'Sacred Bodhi Tree' },
];
const getStage = (days) => {
  let stage = STAGES[0];
  for (const s of STAGES) { if (days >= s.minDays) stage = s; }
  return stage;
};
const getNextStage = (days) => STAGES.find(s => s.minDays > days) || null;

export default function BodhiTreeApp({ entryRequest, onExit }) {
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [treeAgeDays, setTreeAgeDays] = useState(0);
  const [showWater, setShowWater] = useState(false);
  const [watered, setWatered] = useState(false);

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let isMounted = true;
    (async () => {
      try {
        const [scheduleSnap, sessionsSnap] = await Promise.all([
          getDocs(query(collection(db, `${publicDataPath}/teacherSchedule`), where('studentUid', '==', studentUid))),
          getDocs(query(collection(db, `${publicDataPath}/studySessions`), where('studentUid', '==', studentUid))),
        ]);
        const schedule = scheduleSnap.docs.map(d => d.data());
        const sessions = sessionsSnap.docs.map(d => d.data());
        const now = new Date();
        const attendedCount = schedule.filter(e =>
          e.endTime?.toDate?.() < now && getAttendanceStatus(e, sessions) === 'attended'
        ).length;
        if (isMounted) setTreeAgeDays(attendedCount * 7);
      } catch (e) {
        console.error('Error loading Bodhi tree data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  useEffect(() => {
    // Purely a delightful ritual moment on entering -- the tree's real age
    // already comes from real attendance recorded elsewhere, so tapping
    // this doesn't write anything; it just plays once per visit.
    const timer = setTimeout(() => setShowWater(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const stage = getStage(treeAgeDays);
  const nextStage = getNextStage(treeAgeDays);
  const daysToNext = nextStage ? nextStage.minDays - treeAgeDays : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 flex flex-col items-center px-6 pt-6 pb-16">
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center">{studentName}'s Bodhi Tree</h1>
      <p className="text-emerald-600 text-sm mb-6">🙏 Grows a little every time you come to class</p>

      {loading ? (
        <p className="text-emerald-700">Loading your tree...</p>
      ) : (
        <>
          <div className={`text-[130px] leading-none my-2 transition-transform duration-700 ease-out ${watered ? 'scale-110' : 'scale-100'}`}>
            {stage.emoji}
          </div>
          <p className="text-xl font-bold text-emerald-800">{stage.label}</p>
          <p className="text-emerald-600 mb-1">{treeAgeDays} day{treeAgeDays === 1 ? '' : 's'} old</p>
          {nextStage && (
            <p className="text-sm text-emerald-500 mb-6">
              {Math.ceil(daysToNext / 7)} more class{Math.ceil(daysToNext / 7) === 1 ? '' : 'es'} until it grows again!
            </p>
          )}

          <div className="mt-4 min-h-[64px] flex items-center">
            {showWater && !watered && (
              <button
                onClick={() => setWatered(true)}
                className="bg-sky-500 hover:bg-sky-600 text-white text-lg font-bold px-8 py-4 rounded-full shadow-lg animate-bounce"
              >
                💧 Water the Tree
              </button>
            )}
            {watered && (
              <p className="text-sky-700 font-semibold text-lg text-center">
                💦 Thank you for watering!<br />See you next class 🙏
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

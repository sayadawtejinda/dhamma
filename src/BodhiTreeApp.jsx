import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// A fully independent app (deliberately NOT part of TutoringApp.jsx) --
// first piece of the "gamified student home" idea: a Bodhi tree that grows
// from a student's real attendance history. The animated canvas tree
// (growth stages, golden aura, birds/butterflies at full maturity) is
// adapted from a reference widget the teacher supplied -- same visual
// design, redriven here by real attendance instead of a demo +1/+5 Day
// button. More requirements to layer on later (per the teacher).

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

// +7 "tree-age days" per CALENDAR WEEK the student attended at least one
// scheduled class -- not per attended class. A student scheduled twice a
// week who attends both still only grows 7 days that week (attending
// every scheduled class in a week is what "counts" as that week's growth,
// not a multiplier); a week with zero attendance grows nothing. Confirmed
// by the teacher. The canvas animation's own growth curve maxes out at 120
// days (full maturity, birds/butterflies), matching the reference widget --
// a student well past that still sees the true day count in text, just the
// same fully-grown visual as anyone else at 120+.
// Monday-start week key so every schedule entry in the same calendar week
// (regardless of which day it falls on) maps to the same bucket.
function getWeekKey(date) {
  const day = date.getDay(); // 0=Sun..6=Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}
// Student rank/title (not a description of the tree itself) -- per the
// teacher's request, 10 tiers keyed to the same day thresholds the app
// already used for its early growth stages, extended with one more (160)
// to fit the 4 titles from their first message into a full 10-tier scale.
const MILESTONES = [0, 1, 5, 10, 20, 30, 40, 80, 120, 160];
const STAGE_NAMES = [
  'Little Planter',
  'Sprout Caretaker',
  'Budding Gardener',
  'Plant Lover',
  'Green Custodian',
  'Nature Guardian',
  'Bodhi Protector',
  'Tree Mentor',
  'Wisdom Cultivator',
  'Bodhi Master',
];
const getStageName = (days) => {
  const clamped = Math.max(0, Math.min(160, days));
  let idx = 0;
  for (let i = 0; i < MILESTONES.length; i++) if (clamped >= MILESTONES[i]) idx = i;
  return STAGE_NAMES[idx];
};
const getNextMilestone = (days) => MILESTONES.find(m => m > days) || null;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mapRange = (v, inMin, inMax, outMin, outMax) => {
  const t = clamp((v - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * t;
};
const withAlpha = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const COLORS = {
  surface: '#f0f9f4',
  groundNear: '#ddd0ac',
  groundFar: '#c7b585',
  soilLine: '#a6875a',
  trunk: '#5d4037',
  leaf: '#22c55e',
  aura: '#fbbf24',
  butterfly: '#ec4899',
  bird: '#334155',
  barTrack: '#e2e8f0',
  barFill: '#16a34a',
};

// Fullness of the canopy -- tune these to make the tree bushier. Requested
// by the teacher (branchFactor/leafCount naming matches the Three.js sample
// they were given, but this canvas is 2D, so branches fan across an arc
// instead of spinning around a 3D axis). leafCount is PER twig tip and this
// whole tree is redrawn every animation frame, so push it up gradually and
// watch for slowdown on an actual phone before going much past ~10-12 --
// with branchFactor 3 and the deepest growth stage (maxDepth 5 in the
// mapRange call below), that's already 3^5 = 243 tips.
const TREE_PARAMS = {
  branchFactor: 3,   // sub-branches per branch point (was a fixed 2, sometimes 3)
  branchSpread: 0.85, // radians the branchFactor children fan across
  leafCount: 6,      // small leaves scattered per twig tip (was 1 big leaf)
  leafSize: 1,       // multiplier on the base leaf size
};

// The procedural fractal-branch tree + weather/wildlife canvas, adapted
// almost directly from the reference widget's drawing code -- only the
// WH.* helper calls (clamp/map/lerp/getColor/transparent) were swapped for
// plain equivalents, since that helper library only exists inside the
// widget-generator sandbox it was built in.
function TreeCanvas({ days }) {
  const canvasRef = useRef(null);
  const daysRef = useRef(days);
  useEffect(() => { daysRef.current = days; }, [days]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let currentFactor = 0;
    let lastTime = performance.now();

    const particles = Array.from({ length: 25 }, () => ({
      x: (Math.random() - 0.5) * 300,
      y: -Math.random() * 200,
      radius: Math.random() * 2.5 + 1,
      alpha: Math.random(),
      speedY: -(Math.random() * 0.4 + 0.2),
      speedX: (Math.random() - 0.5) * 0.3,
    }));
    const butterflies = [
      { x: -80, y: -120, vx: 0.8, vy: 0.3, phase: 0 },
      { x: 90, y: -150, vx: -0.6, vy: 0.4, phase: 2 },
    ];
    const birds = [
      { x: -160, y: -220, vx: 1.2, vy: -0.2, flap: 0 },
      { x: 140, y: -240, vx: -1.0, vy: 0.1, flap: 1.5 },
    ];

    // drawBranch runs every animation frame (60/sec) while the tree grows,
    // so its branch/leaf jitter must NOT come from Math.random() -- that
    // would reroll a new random shape every single frame and make the
    // whole tree flicker instead of growing smoothly. seededRandom(seed)
    // gives the same "random-looking" number for the same seed every time,
    // so each branch/leaf keeps its own fixed shape across frames while
    // still varying from its siblings.
    function seededRandom(seed) {
      const x = Math.sin(seed * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    }

    function drawBranch(len, thick, angle, depth, maxDepth, seed) {
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.strokeStyle = COLORS.trunk;
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.translate(0, -len);

      if (depth < maxDepth) {
        const subLen = len * 0.72;
        const subThick = Math.max(1, thick * 0.68);
        const n = TREE_PARAMS.branchFactor;
        for (let i = 0; i < n; i++) {
          // Fan the children evenly across branchSpread radians (centered
          // on straight-up), with a little jitter so it doesn't look
          // mechanically symmetric.
          const childSeed = seed * 7.13 + i * 3.7 + depth * 1.9;
          const t = n === 1 ? 0 : (i / (n - 1)) - 0.5;
          const branchAngle = t * TREE_PARAMS.branchSpread + (seededRandom(childSeed) - 0.5) * 0.12;
          const lenJitter = 0.85 + seededRandom(childSeed + 0.33) * 0.15;
          drawBranch(subLen * lenJitter, subThick, branchAngle, depth + 1, maxDepth, childSeed);
        }
      } else {
        const leafRadius = Math.min(10, 3 + currentFactor * 7) * TREE_PARAMS.leafSize;
        ctx.fillStyle = COLORS.leaf;
        for (let l = 0; l < TREE_PARAMS.leafCount; l++) {
          const leafSeed = seed * 5.3 + l * 2.1;
          const lx = (seededRandom(leafSeed) - 0.5) * leafRadius * 2.4;
          const ly = -seededRandom(leafSeed + 0.17) * leafRadius * 1.8;
          const rot = seededRandom(leafSeed + 0.41) * Math.PI;
          ctx.beginPath();
          ctx.ellipse(lx, ly, leafRadius * 0.25, leafRadius * 0.42, rot, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function frame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      const time = now / 1000;
      lastTime = now;

      const targetDays = daysRef.current || 0;
      const targetFactor = clamp(targetDays, 0, 120) / 120;
      currentFactor = lerp(currentFactor, targetFactor, dt * 3.5);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const cx = width / 2;
      const groundY = height - 40;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(0, 0, width, height);

      const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
      groundGrad.addColorStop(0, COLORS.groundNear);
      groundGrad.addColorStop(1, COLORS.groundFar);
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, width, height - groundY);

      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.strokeStyle = COLORS.soilLine;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, groundY);

      if (currentFactor < 0.008) {
        ctx.fillStyle = COLORS.trunk;
        ctx.beginPath();
        ctx.ellipse(0, -3, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentFactor < 0.04) {
        const sproutH = mapRange(currentFactor, 0.008, 0.04, 5, 20);
        ctx.strokeStyle = COLORS.leaf;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -sproutH);
        ctx.stroke();
        ctx.fillStyle = COLORS.leaf;
        ctx.beginPath();
        ctx.ellipse(-4, -sproutH, 4, 2, -0.4, 0, Math.PI * 2);
        ctx.ellipse(4, -sproutH, 4, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const maxDepth = Math.min(5, Math.floor(mapRange(currentFactor, 0.04, 1, 2, 5)));
        const trunkLen = mapRange(currentFactor, 0.04, 1, 25, 75);
        const trunkThick = mapRange(currentFactor, 0.04, 1, 4, 18);

        if (targetDays >= 80) {
          const auraAlpha = mapRange(Math.min(targetDays, 120), 80, 120, 0.25, 0.5);
          const auraRadius = 80 + Math.sin(time * 2) * 8 + currentFactor * 60;
          const radGrad = ctx.createRadialGradient(0, -trunkLen * 1.8, 10, 0, -trunkLen * 1.8, auraRadius);
          radGrad.addColorStop(0, withAlpha(COLORS.aura, auraAlpha));
          radGrad.addColorStop(1, withAlpha(COLORS.aura, 0));
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(0, -trunkLen * 1.8, auraRadius, 0, Math.PI * 2);
          ctx.fill();

          particles.forEach((p) => {
            p.y += p.speedY;
            p.x += p.speedX + Math.sin(time + p.y) * 0.2;
            if (p.y < -trunkLen * 3) {
              p.y = -10;
              p.x = (Math.random() - 0.5) * 120;
            }
            ctx.fillStyle = withAlpha(COLORS.aura, p.alpha * auraAlpha * 1.5);
            ctx.beginPath();
            ctx.arc(p.x, p.y - 20, p.radius, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        drawBranch(trunkLen, trunkThick, 0, 1, maxDepth, 1);

        if (targetDays >= 120) {
          butterflies.forEach((b) => {
            b.x += b.vx + Math.sin(time * 3 + b.phase) * 0.5;
            b.y += b.vy + Math.cos(time * 2 + b.phase) * 0.5;
            if (b.x > 140) b.vx = -Math.abs(b.vx);
            if (b.x < -140) b.vx = Math.abs(b.vx);
            if (b.y < -200) b.vy = Math.abs(b.vy);
            if (b.y > -80) b.vy = -Math.abs(b.vy);

            const wing = Math.sin(time * 12 + b.phase) * 5;
            ctx.fillStyle = COLORS.butterfly;
            ctx.beginPath();
            ctx.ellipse(b.x - wing, b.y, 4, 2, 0, 0, Math.PI * 2);
            ctx.ellipse(b.x + wing, b.y, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
          });

          birds.forEach((b) => {
            b.x += b.vx;
            b.y += Math.sin(time * 2 + b.flap) * 0.4;
            if (b.x > 200) b.x = -200;
            if (b.x < -200) b.x = 200;

            const wingY = Math.sin(time * 8 + b.flap) * 6;
            ctx.strokeStyle = COLORS.bird;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(b.x - 8, b.y + wingY);
            ctx.quadraticCurveTo(b.x - 4, b.y - 4, b.x, b.y);
            ctx.quadraticCurveTo(b.x + 4, b.y - 4, b.x + 8, b.y + wingY);
            ctx.stroke();
          });
        }
      }

      ctx.restore();

      const barW = width * 0.6, barH = 8, barX = (width - barW) / 2, barY = height - 20;
      ctx.fillStyle = COLORS.barTrack;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = COLORS.barFill;
      ctx.fillRect(barX, barY, barW * currentFactor, barH);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      const cssHeight = 320;
      canvas.width = Math.max(1, rect.width) * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = '100%';
      canvas.style.height = `${cssHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="w-full rounded-2xl shadow-inner" />;
}

// The teacher's own tree isn't tied to any student's attendance -- it just
// grows one day at a time, every calendar day, so it's something to check
// in on regardless of who attended what. `baselineDays` is a manually-set
// anchor (0 until the teacher edits it) and `baselineSetAt` is when that
// anchor was set; the displayed age is always baselineDays plus however
// many calendar days have passed since, so editing the count just moves
// the anchor forward (or back) without losing the "grows every day" feel.
const teacherTreeDocRef = () => doc(db, `${publicDataPath}/teacherBodhiTree`, 'main');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function BodhiTreeApp({ entryRequest, onExit }) {
  const isTeacherMode = entryRequest?.mode === 'teacher';
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [treeAgeDays, setTreeAgeDays] = useState(0);
  const [showWater, setShowWater] = useState(false);
  const [watered, setWatered] = useState(false);
  const [teacherBaseline, setTeacherBaseline] = useState({ baselineDays: 0, baselineSetAt: Date.now() });
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [editDaysInput, setEditDaysInput] = useState('');
  const [isSavingDays, setIsSavingDays] = useState(false);

  useEffect(() => {
    if (isTeacherMode) {
      let isMounted = true;
      (async () => {
        try {
          const snap = await getDoc(teacherTreeDocRef());
          const data = snap.exists() ? snap.data() : { baselineDays: 0, baselineSetAt: Date.now() };
          if (isMounted) {
            setTeacherBaseline(data);
            const elapsedDays = Math.floor((Date.now() - (data.baselineSetAt || Date.now())) / MS_PER_DAY);
            setTreeAgeDays(Math.max(0, (data.baselineDays || 0) + elapsedDays));
          }
        } catch (e) {
          console.error('Error loading teacher Bodhi tree data:', e);
        }
        if (isMounted) setLoading(false);
      })();
      return () => { isMounted = false; };
    }
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
        const attendedWeeks = new Set(
          schedule
            .filter(e => e.endTime?.toDate?.() < now && getAttendanceStatus(e, sessions) === 'attended')
            .map(e => getWeekKey(e.startTime.toDate()))
        );
        if (isMounted) setTreeAgeDays(attendedWeeks.size * 7);
      } catch (e) {
        console.error('Error loading Bodhi tree data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid, isTeacherMode]);

  const handleStartEditDays = () => {
    setEditDaysInput(String(treeAgeDays));
    setIsEditingDays(true);
  };
  const handleSaveEditDays = async () => {
    const newDays = Math.max(0, parseInt(editDaysInput, 10) || 0);
    setIsSavingDays(true);
    try {
      const newBaseline = { baselineDays: newDays, baselineSetAt: Date.now() };
      await setDoc(teacherTreeDocRef(), newBaseline, { merge: true });
      setTeacherBaseline(newBaseline);
      setTreeAgeDays(newDays);
      setIsEditingDays(false);
    } catch (e) {
      console.error('Error saving teacher Bodhi tree days:', e);
    }
    setIsSavingDays(false);
  };

  useEffect(() => {
    // Purely a delightful ritual moment on entering -- the tree's real age
    // already comes from real attendance recorded elsewhere, so tapping
    // this doesn't write anything; it just plays once per visit.
    const timer = setTimeout(() => setShowWater(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const stageName = getStageName(treeAgeDays);
  const nextMilestone = getNextMilestone(treeAgeDays);
  const daysToNext = nextMilestone != null ? nextMilestone - treeAgeDays : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 flex flex-col items-center px-6 pt-6 pb-16">
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center">
        {isTeacherMode ? "Teacher's Bodhi Tree" : `${studentName}'s Bodhi Tree`}
      </h1>
      <p className="text-emerald-600 text-sm mb-6">
        {isTeacherMode ? '🙏 Grows a little every day' : '🙏 Grows a little every time you come to class'}
      </p>

      {loading ? (
        <p className="text-emerald-700">Loading your tree...</p>
      ) : (
        <>
          <div className="w-full max-w-xl">
            <TreeCanvas days={treeAgeDays} />
          </div>
          <p className="text-xl font-bold text-emerald-800 mt-4">{stageName}</p>

          {isEditingDays ? (
            <div className="w-full max-w-sm flex flex-col items-center gap-2 mb-1">
              <span className="text-emerald-700 font-bold text-lg">{editDaysInput} day{Number(editDaysInput) === 1 ? '' : 's'} old</span>
              <input
                type="range"
                min="0"
                max="500"
                value={editDaysInput}
                onChange={(e) => setEditDaysInput(e.target.value)}
                className="w-full accent-emerald-500"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button onClick={handleSaveEditDays} disabled={isSavingDays} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-1.5 rounded-lg disabled:opacity-50">
                  {isSavingDays ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setIsEditingDays(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold px-4 py-1.5 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-emerald-600 mb-1 flex items-center gap-2">
              {treeAgeDays} day{treeAgeDays === 1 ? '' : 's'} old
              {isTeacherMode && (
                <button onClick={handleStartEditDays} className="text-emerald-500 hover:text-emerald-700" title="Edit day count">
                  ✏️
                </button>
              )}
            </p>
          )}

          {!isTeacherMode && nextMilestone != null && (
            <p className="text-sm text-emerald-500 mb-6">
              {Math.ceil(daysToNext / 7)} more week{Math.ceil(daysToNext / 7) === 1 ? '' : 's'} of attendance until it grows again!
            </p>
          )}
          {isTeacherMode && nextMilestone != null && (
            <p className="text-sm text-emerald-500 mb-6">
              {daysToNext} more day{daysToNext === 1 ? '' : 's'} until it grows again!
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
                💦 Thank you for watering!<br />{isTeacherMode ? 'See you tomorrow 🙏' : 'See you next class 🙏'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

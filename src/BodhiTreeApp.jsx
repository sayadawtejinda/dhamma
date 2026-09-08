import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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

// 1 attended class = 7 "tree-age days" -- confirmed by the teacher. The
// canvas animation's own growth curve maxes out at 120 days (full maturity,
// birds/butterflies), matching the reference widget -- a student well past
// that still sees the true day count in text, just the same fully-grown
// visual as anyone else at 120+.
const MILESTONES = [0, 1, 5, 10, 20, 30, 40, 80, 120];
const STAGE_NAMES = [
  'Dormant Seed',
  'Seed Sprouting',
  'Sprout',
  'Small Sapling',
  'Bushy Plant',
  'Young Bodhi Tree',
  'Mature Bodhi Tree',
  'Radiant Bodhi Tree',
  'Sacred Canopy',
];
const getStageName = (days) => {
  const clamped = Math.max(0, Math.min(120, days));
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

    function drawBranch(len, thick, angle, depth, maxDepth) {
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
        drawBranch(subLen, subThick, 0.32, depth + 1, maxDepth);
        drawBranch(subLen, subThick, -0.35, depth + 1, maxDepth);
        if (depth > 1) drawBranch(subLen * 0.8, subThick, 0.05, depth + 1, maxDepth);
      } else {
        const leafRadius = Math.min(10, 3 + currentFactor * 7);
        ctx.fillStyle = COLORS.leaf;
        ctx.beginPath();
        ctx.ellipse(0, 0, leafRadius * 0.6, leafRadius, 0.2, 0, Math.PI * 2);
        ctx.fill();
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

        drawBranch(trunkLen, trunkThick, 0, 1, maxDepth);

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

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center">{studentName}'s Bodhi Tree</h1>
      <p className="text-emerald-600 text-sm mb-6">🙏 Grows a little every time you come to class</p>

      {loading ? (
        <p className="text-emerald-700">Loading your tree...</p>
      ) : (
        <>
          <div className="w-full max-w-xl">
            <TreeCanvas days={treeAgeDays} />
          </div>
          <p className="text-xl font-bold text-emerald-800 mt-4">{stageName}</p>
          <p className="text-emerald-600 mb-1">{treeAgeDays} day{treeAgeDays === 1 ? '' : 's'} old</p>
          {nextMilestone != null && (
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

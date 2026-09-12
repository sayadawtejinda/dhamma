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
// Student rank/title (not a description of the tree itself). The teacher's
// thresholds are in WEEKS of attendance (1/3/5/7/9/13/20/30/40/50) -- since
// treeAgeDays is already "attended weeks x 7" (see getWeekKey/attendedWeeks
// above), a week threshold converts to a day threshold by x7.
const WEEK_MILESTONES = [1, 3, 5, 7, 9, 13, 20, 30, 40, 50];
const MILESTONES = WEEK_MILESTONES.map(w => w * 7);
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
const getStageIndex = (days) => {
  const clamped = Math.max(0, Math.min(MILESTONES[MILESTONES.length - 1], days));
  let idx = 0;
  for (let i = 0; i < MILESTONES.length; i++) if (clamped >= MILESTONES[i]) idx = i;
  return idx;
};
const getStageName = (days) => STAGE_NAMES[getStageIndex(days)];
const getNextMilestone = (days) => MILESTONES.find(m => m > days) || null;

// One badge SVG per title tier (teacher-supplied artwork, same order as
// STAGE_NAMES). width/height are stripped so each scales to its container
// via CSS instead of being locked to the original 200x200 -- the badge
// shows small next to the tree and full-size in the tap-to-expand popup.
const stripFixedSize = (svg) => svg.replace(/\s(width|height)="\d+"/g, '');
const LEVEL_BADGES_SVG = [
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E8F5E9" stroke="#81C784" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <ellipse cx="100" cy="140" rx="35" ry="10" fill="#8D6E63"/>
  <path d="M100,140 L100,105" stroke="#388E3C" stroke-width="5" stroke-linecap="round"/>
  <path d="M100,120 Q80,100 70,105 Q70,85 100,105 Z" fill="#4CAF50"/>
  <path d="M100,110 Q120,90 130,95 Q130,75 100,95 Z" fill="#66BB6A"/>
  <path id="textPath1" d="M 25,100 A 75,75 0 0,1 175,100" fill="none"/>
  <text font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#1B5E20" text-anchor="middle">
    <textPath href="#textPath1" startOffset="50%">LEVEL 1: LITTLE PLANTER</textPath>
  </text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E8F5E9" stroke="#66BB6A" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#4CAF50" stroke-width="2" stroke-dasharray="5,5"/>
  <path d="M100,135 L100,90" stroke="#388E3C" stroke-width="6" stroke-linecap="round"/>
  <path d="M100,110 Q75,90 70,70 Q95,75 100,100 Z" fill="#4CAF50"/>
  <path d="M100,100 Q125,80 130,60 Q105,65 100,90 Z" fill="#81C784"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#4CAF50"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 2: SPROUT CARETAKER</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FFFDE7" stroke="#FBC02D" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#FDD835" stroke-width="2"/>
  <path d="M75,110 L82,140 L118,140 L125,110 Z" fill="#8D6E63"/>
  <path d="M100,110 L100,75" stroke="#388E3C" stroke-width="5"/>
  <circle cx="100" cy="70" r="12" fill="#81C784"/>
  <path d="M100,95 Q80,85 75,95 Q90,105 100,95 Z" fill="#4CAF50"/>
  <path d="M100,90 Q120,80 125,90 Q110,100 100,90 Z" fill="#4CAF50"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#FBC02D"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#333333" text-anchor="middle">LVL 3: BUDDING GARDENER</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FCE4EC" stroke="#EC407A" stroke-width="8"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#F48FB1" stroke-width="2"/>
  <path d="M100,135 C100,135 60,105 60,80 C60,65 72,55 85,55 C93,55 98,60 100,65 C102,60 107,55 115,55 C128,55 140,65 140,80 C140,105 100,135 100,135 Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
  <path d="M100,70 L100,120" stroke="#A5D6A7" stroke-width="2"/>
  <rect x="20" y="145" width="160" height="26" rx="6" fill="#EC407A"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 4: PLANT LOVER</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E0F2F1" stroke="#00897B" stroke-width="8"/>
  <circle cx="100" cy="100" r="80" fill="#B2DFDB"/>
  <path d="M100,50 L135,65 V100 C135,125 100,140 100,140 C100,140 65,125 65,100 V65 Z" fill="#26A69A"/>
  <circle cx="100" cy="88" r="18" fill="#004D40"/>
  <rect x="97" y="95" width="6" height="15" fill="#8D6E63"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#00897B"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 5: GREEN CUSTODIAN</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#E8F5E9" stroke="#2E7D32" stroke-width="8"/>
  <circle cx="100" cy="90" r="35" fill="#81C784"/>
  <path d="M100,55 C80,70 80,110 100,125 C120,110 120,70 100,55 Z" fill="#388E3C"/>
  <rect x="96" y="120" width="8" height="18" fill="#5D4037"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#2E7D32"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 6: NATURE GUARDIAN</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#EFEBE9" stroke="#8D6E63" stroke-width="8"/>
  <circle cx="100" cy="100" r="80" fill="#D7CCC8" stroke="#6D4C41" stroke-width="2"/>
  <path d="M100,50 C120,70 130,90 120,110 C110,122 104,125 100,125 C96,125 90,122 80,110 C70,90 80,70 100,50 Z" fill="#388E3C"/>
  <path d="M100,50 Q100,40 100,35" stroke="#1B5E20" stroke-width="2"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#6D4C41"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 7: BODHI PROTECTOR</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#ECEFF1" stroke="#78909C" stroke-width="8"/>
  <circle cx="100" cy="80" r="30" fill="#4CAF50"/>
  <circle cx="80" cy="95" r="22" fill="#388E3C"/>
  <circle cx="120" cy="95" r="22" fill="#388E3C"/>
  <rect x="94" y="100" width="12" height="35" fill="#4E342E"/>
  <polygon points="100,35 103,42 110,42 105,46 107,53 100,49 93,53 95,46 90,42 97,42" fill="#FFD54F"/>
  <rect x="20" y="145" width="160" height="26" rx="6" fill="#546E7A"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 8: TREE MENTOR</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FFF8E1" stroke="#FFB300" stroke-width="8"/>
  <path d="M100,45 L100,135 M55,90 L145,90 M68,58 L132,122 M132,58 L68,122" stroke="#FFE082" stroke-width="3" stroke-dasharray="4,4"/>
  <path d="M100,55 C122,75 130,95 120,115 C110,126 104,130 100,130 C96,130 90,126 80,115 C70,95 78,75 100,55 Z" fill="#2E7D32" stroke="#FFB300" stroke-width="2"/>
  <rect x="10" y="145" width="180" height="26" rx="6" fill="#FFB300"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 9: WISDOM CULTIVATOR</text>
</svg>`),
  stripFixedSize(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="90" fill="#FFF8E1" stroke="#FFD54F" stroke-width="8"/>
  <circle cx="100" cy="100" r="80" fill="#FFECB3" stroke="#FFA000" stroke-width="3"/>
  <polygon points="100,28 103,37 112,37 105,42 107,51 100,46 93,51 95,42 88,37 97,37" fill="#FFC107"/>
  <path d="M100,55 C125,80 135,105 125,125 C115,138 105,142 100,142 C95,142 85,138 75,125 C65,105 75,80 100,55 Z" fill="#2E7D32" stroke="#1B5E20" stroke-width="2"/>
  <path d="M100,55 Q100,45 100,40" stroke="#1B5E20" stroke-width="2" stroke-linecap="round"/>
  <path d="M100,70 L100,135 M100,90 L112,82 M100,102 L115,96 M100,114 L110,112 M100,90 L88,82 M100,102 L85,96 M100,114 L90,112" stroke="#A5D6A7" stroke-width="2" stroke-linecap="round"/>
  <rect x="20" y="145" width="160" height="26" rx="6" fill="#FFA000"/>
  <text x="100" y="162" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LVL 10: BODHI MASTER</text>
</svg>`),
];

// Small badge next to the tree showing the student's current title tier;
// tap to see it full-size (per the teacher's "small by default, tap to
// enlarge" request).
function BodhiBadge({ treeAgeDays }) {
  const [expanded, setExpanded] = useState(false);
  const idx = getStageIndex(treeAgeDays);
  const svg = LEVEL_BADGES_SVG[idx];
  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        className="absolute top-2 right-2 w-16 h-16 cursor-pointer drop-shadow-md hover:scale-110 transition-transform"
        title={`Your badge: ${STAGE_NAMES[idx]} (tap to enlarge)`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-6"
          onClick={() => setExpanded(false)}
        >
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-64 h-64" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-3 text-lg font-bold text-emerald-800">{STAGE_NAMES[idx]}</p>
            <button
              onClick={() => setExpanded(false)}
              className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

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
// by the teacher, matching the same "keeps forking into 2" shape the Shrine
// Room's simpler backdrop tree uses (2 trunks -> 4 -> 8 -> 16 -> 32 -> 64 ->
// 128 tips at full maturity) instead of the old wider 3-way fan. A plain
// binary fork like this is CHEAPER than a 3-way fan for the same visual
// fullness (2^n grows slower than 3^n), and the actual per-frame cost is
// now bounded regardless of tip count -- see the drawTreeToCache/imageBitmap
// caching in TreeCanvas below, which redraws this recursion only while the
// tree's growth factor is actually changing (a few seconds around opening
// the app), not on every one of the animation loop's frames forever after.
const TREE_PARAMS = {
  branchFactor: 2,   // sub-branches per branch point
  branchSpread: 0.85, // radians the branchFactor children fan across
  leafCount: 6,      // small leaves scattered per twig tip (was 1 big leaf)
  leafSize: 1,       // multiplier on the base leaf size
  // The very first split off the trunk uses thicker, barely-tapered limbs
  // and a narrower spread than the canopy forks above it -- reads as two
  // big trunks merged at the base (the look the teacher liked on the Shrine
  // Room's tree) before the bushier canopy fans out.
  trunkSplitSpread: 0.55,
  trunkSplitTaper: 0.85,
  trunkSplitLenFactor: 0.82,
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
    // The branch/leaf fractal is the only expensive part of this drawing
    // (hundreds of strokes/fills once the canopy is fully forked out) --
    // everything else per frame (ground, aura glow, drifting particles,
    // birds/butterflies) is a handful of shapes. Rendering the fractal to
    // this offscreen canvas only when the tree's growth factor has actually
    // moved since the last time (see needsTreeRedraw below), then just
    // stamping that bitmap onto the visible canvas every frame, keeps the
    // steady-state cost (tree fully grown, animation loop still running
    // forever for the birds/butterflies) independent of how bushy the
    // canopy is -- a bushier tree only costs more during the few seconds
    // it's actively growing in, never after it settles.
    const treeCache = document.createElement('canvas');
    const treeCacheCtx = treeCache.getContext('2d');
    let cachedFactor = null;
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

    // tctx (target ctx) is explicit, not closed over -- this gets called
    // against the offscreen treeCacheCtx (see needsTreeRedraw below), never
    // directly against the visible canvas's ctx.
    function drawBranch(tctx, leafFactor, len, thick, angle, depth, maxDepth, seed) {
      tctx.save();
      tctx.rotate(angle);
      tctx.beginPath();
      tctx.moveTo(0, 0);
      tctx.lineTo(0, -len);
      tctx.strokeStyle = COLORS.trunk;
      tctx.lineWidth = thick;
      tctx.lineCap = 'round';
      tctx.stroke();
      tctx.translate(0, -len);

      if (depth < maxDepth) {
        const n = TREE_PARAMS.branchFactor;
        const spread = TREE_PARAMS.branchSpread;
        const subLen = len * 0.72;
        const subThick = Math.max(1, thick * 0.68);
        for (let i = 0; i < n; i++) {
          // Fan the children evenly across branchSpread radians (centered
          // on straight-up), with a little jitter so it doesn't look
          // mechanically symmetric.
          const childSeed = seed * 7.13 + i * 3.7 + depth * 1.9;
          const t = n === 1 ? 0 : (i / (n - 1)) - 0.5;
          const branchAngle = t * spread + (seededRandom(childSeed) - 0.5) * 0.12;
          const lenJitter = 0.85 + seededRandom(childSeed + 0.33) * 0.15;
          drawBranch(tctx, leafFactor, subLen * lenJitter, subThick, branchAngle, depth + 1, maxDepth, childSeed);
        }
      } else {
        const leafRadius = Math.min(10, 3 + leafFactor * 7) * TREE_PARAMS.leafSize;
        tctx.fillStyle = COLORS.leaf;
        for (let l = 0; l < TREE_PARAMS.leafCount; l++) {
          const leafSeed = seed * 5.3 + l * 2.1;
          const lx = (seededRandom(leafSeed) - 0.5) * leafRadius * 2.4;
          const ly = -seededRandom(leafSeed + 0.17) * leafRadius * 1.8;
          const rot = seededRandom(leafSeed + 0.41) * Math.PI;
          tctx.beginPath();
          tctx.ellipse(lx, ly, leafRadius * 0.25, leafRadius * 0.42, rot, 0, Math.PI * 2);
          tctx.fill();
        }
      }
      tctx.restore();
    }

    function frame(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      const time = now / 1000;
      lastTime = now;

      const targetDays = daysRef.current || 0;
      const targetFactor = clamp(targetDays, 0, 120) / 120;
      // Slow enough (~3s to settle) that the maxDepth/trunkLen/trunkThick
      // stages below visibly step through one at a time -- sprout, trunk
      // splitting into its two big limbs, then each canopy level fanning
      // out in turn -- instead of the whole tree popping into its final
      // shape within a couple of frames.
      currentFactor = lerp(currentFactor, targetFactor, dt * 1.1);

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
        const maxDepth = Math.min(8, Math.floor(mapRange(currentFactor, 0.04, 1, 2, 8)));
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

        // Resize the offscreen cache to match the visible canvas (e.g. after
        // a window/container resize), which forces a redraw at the new
        // size, then redraw the fractal onto it only if the growth factor
        // has moved enough to actually change its shape since last time --
        // not on every one of this loop's frames forever.
        if (treeCache.width !== canvas.width || treeCache.height !== canvas.height) {
          treeCache.width = canvas.width;
          treeCache.height = canvas.height;
          cachedFactor = null;
        }
        if (cachedFactor === null || Math.abs(currentFactor - cachedFactor) > 0.0008) {
          treeCacheCtx.setTransform(1, 0, 0, 1, 0, 0);
          treeCacheCtx.clearRect(0, 0, treeCache.width, treeCache.height);
          treeCacheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          treeCacheCtx.save();
          treeCacheCtx.translate(cx, groundY);

          // A few short buttress roots fanning out along the soil line, so
          // the trunk reads as planted in the ground instead of just
          // resting on top of it.
          treeCacheCtx.strokeStyle = COLORS.trunk;
          treeCacheCtx.lineCap = 'round';
          const rootCount = 5;
          for (let i = 0; i < rootCount; i++) {
            const rootSeed = i * 4.7 + 1.3;
            const t = (i / (rootCount - 1)) - 0.5; // -0.5..0.5
            const spread = t * 1.5; // radians either side of straight down
            const rootLen = trunkThick * (1.8 + seededRandom(rootSeed) * 0.8);
            const dx = Math.sin(spread) * rootLen;
            const dy = Math.abs(Math.cos(spread)) * rootLen * 0.35;
            treeCacheCtx.lineWidth = Math.max(1.5, trunkThick * 0.35 * (1 - Math.abs(t) * 0.4));
            treeCacheCtx.beginPath();
            treeCacheCtx.moveTo(0, 0);
            treeCacheCtx.lineTo(dx, dy);
            treeCacheCtx.stroke();
          }

          // The trunk forks after only HALF its own length instead of at
          // the very top -- a real Bodhi tree's trunk splits low and wide,
          // not as one tall stick with a canopy stuck on top of it. Only
          // this single straight base stub is shortened here; the two big
          // limbs it forks into (and everything above them) are still
          // sized off the FULL trunkLen, same as before -- so the fork
          // moves down without shrinking the canopy that grows above it.
          const baseTrunkLen = trunkLen * 0.5;
          treeCacheCtx.strokeStyle = COLORS.trunk;
          treeCacheCtx.lineWidth = trunkThick;
          treeCacheCtx.lineCap = 'round';
          treeCacheCtx.beginPath();
          treeCacheCtx.moveTo(0, 0);
          treeCacheCtx.lineTo(0, -baseTrunkLen);
          treeCacheCtx.stroke();
          treeCacheCtx.save();
          treeCacheCtx.translate(0, -baseTrunkLen);
          const limbLen = trunkLen * TREE_PARAMS.trunkSplitLenFactor;
          const limbThick = Math.max(1, trunkThick * TREE_PARAMS.trunkSplitTaper);
          for (let i = 0; i < 2; i++) {
            const childSeed = 1 * 7.13 + i * 3.7 + 1 * 1.9; // matches the depth=1, seed=1 formula below
            const t = i - 0.5; // n=2 -> (i/(n-1))-0.5
            const branchAngle = t * TREE_PARAMS.trunkSplitSpread + (seededRandom(childSeed) - 0.5) * 0.12;
            const lenJitter = 0.85 + seededRandom(childSeed + 0.33) * 0.15;
            drawBranch(treeCacheCtx, currentFactor, limbLen * lenJitter, limbThick, branchAngle, 2, maxDepth, childSeed);
          }
          treeCacheCtx.restore();
          treeCacheCtx.restore();
          cachedFactor = currentFactor;
        }
        // Stamp the cached bitmap in raw device-pixel space (both canvases
        // share the same backing size, and the cache already baked in the
        // dpr scale + cx/groundY translate above), then restore ctx's
        // current CSS-pixel transform (the cx/groundY translate from just
        // above this if/else chain) for the wildlife drawn after it.
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(treeCache, 0, 0);
        ctx.restore();

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
      // Guard against measuring before layout has settled (e.g. right after
      // this lazy-loaded app first mounts, before its container has taken
      // its final width) -- baking in a too-narrow width here made the tree
      // render tall and squeezed-looking the first time an app was opened,
      // fine on every reopen after since the page layout was already
      // settled by then. Skipping a zero/near-zero measurement and letting
      // the ResizeObserver below fire again once the real size is known
      // fixes it at the source instead of just papering over one symptom.
      if (rect.width < 10) return;
      const cssHeight = 320;
      canvas.width = Math.max(1, rect.width) * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = '100%';
      canvas.style.height = `${cssHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
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
          <div className="w-full max-w-xl relative">
            <TreeCanvas days={treeAgeDays} />
            {!isTeacherMode && <BodhiBadge treeAgeDays={treeAgeDays} />}
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

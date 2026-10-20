import React, { useEffect, useId, useState } from 'react';
import { BADGE_GROUPS, badgeMeta, ladderOf, ladderRank } from './badgeDefs';
import { LEVEL_BADGES_SVG } from './bodhiLevels';
import { useBadgeData, givenOf } from './badgeData';

// The badge shelf: every badge a student has earned, drawn in rows at the bottom of their Home page (and shown when a friend
// visits). Which badges each student has comes from ONE static file (public/badges.json, written weekly by
// scripts/compute-badges.mjs from files already on GitHub), so this costs no Firebase read.

// The badges a student HAS = the ones the teacher has given (see badgeData.js). `profile` is the student's own live record when we
// have it (their Home page); a friend looking at someone else's Home sees the weekly copy of what was given.
export function useBadges(name, profile) {
  const data = useBadgeData();
  if (!data || !name) return [];
  const given = givenOf(data, name, profile);
  const list = Object.keys(given).filter(k => !k.startsWith('award-')).map(badgeMeta).filter(Boolean);
  // Bodhi Tree: only this year's HIGHEST level given is shown (each new level replaces the one before; earlier years live on as their
  // gold yearly badge); every yearly badge is kept
  const nowYear = new Date().getFullYear();
  const top = Math.max(-1, ...list.filter(b => b.shape === 'bodhi' && b.year === nowYear).map(b => b.level));
  return list.filter(b => b.shape !== 'bodhi' || (b.year === nowYear && b.level === top));
}

const METALS = {
  gold: { light: '#fff6b0', mid: '#f5c518', dark: '#a87a06', edge: '#7a5600' },
  silver: { light: '#ffffff', mid: '#cdd3da', dark: '#7d8791', edge: '#56606a' },
  bronze: { light: '#f7cf9e', mid: '#cd7f32', dark: '#8a4b17', edge: '#5e3210' },
};

const star = (cx, cy, points, outer, inner, rot = -90) => Array.from({ length: points * 2 }, (_, i) => {
  const a = ((rot + (i * 180) / points) * Math.PI) / 180;
  const r = i % 2 === 0 ? outer : inner;
  return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
}).join(' ');

// the outline of each kind of badge; `fill`/`stroke` come from the metal
function Shape({ shape, fill, stroke, uid, m }) {
  const sw = 3;
  const light = m ? m.light : '#fff';
  switch (shape) {
    // ---- pictures: a trophy cup, a football, a golf flag, a microphone, music notes, a light bulb, a rocket ... ----
    case 'lamp': return (<g>
      <path d="M50 8 C60 22 66 32 50 44 C34 32 40 22 50 8 Z" fill="#ffb300" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M50 22 C55 30 55 36 50 40 C45 36 45 30 50 22 Z" fill="#fff59d" />
      <path d="M12 52 H88 C88 76 70 86 50 86 C30 86 12 76 12 52 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M88 56 C98 56 98 68 86 70" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" /><path d="M88 56 C98 56 98 68 86 70" fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round" />
      <rect x="38" y="86" width="24" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <path d="M22 58 C26 70 38 76 50 77" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="3.5" strokeLinecap="round" />
    </g>);
    case 'cup': return (<g>
      <path d="M26 20 C6 18 6 54 32 56" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round" /><path d="M26 20 C6 18 6 54 32 56" fill="none" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      <path d="M74 20 C94 18 94 54 68 56" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round" /><path d="M74 20 C94 18 94 54 68 56" fill="none" stroke={fill} strokeWidth="5" strokeLinecap="round" />
      <path d="M24 8 H76 V42 C76 66 63 80 50 82 C37 80 24 66 24 42 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <rect x="44" y="80" width="12" height="12" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <rect x="28" y="90" width="44" height="8" rx="2" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <path d="M33 18 C32 36 38 56 46 68" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
    </g>);
    case 'soccer': return (<g>
      <defs><clipPath id={`${uid}-c`}><circle cx="50" cy="50" r="43" /></clipPath></defs>
      <circle cx="50" cy="50" r="43" fill="#fff" stroke={stroke} strokeWidth={sw} />
      <g clipPath={`url(#${uid}-c)`} fill={stroke} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round">
        <polygon points="50,33 66,45 60,64 40,64 34,45" />
        {[0, 72, 144, 216, 288].map(a => <polygon key={a} transform={`rotate(${a} 50 50)`} points="44,-2 56,-2 62,10 50,16 38,10" />)}
        {[36, 108, 180, 252, 324].map(a => <line key={a} transform={`rotate(${a} 50 50)`} x1="50" y1="17" x2="50" y2="33" fill="none" />)}
      </g>
      <circle cx="50" cy="50" r="43" fill={fill} fillOpacity="0.28" />
      <ellipse cx="36" cy="26" rx="12" ry="6" fill="#fff" fillOpacity="0.55" transform="rotate(-30 36 26)" />
    </g>);
    case 'golf': return (<g>
      <ellipse cx="50" cy="82" rx="44" ry="14" fill={fill} stroke={stroke} strokeWidth={sw} />
      <ellipse cx="56" cy="80" rx="9" ry="3.4" fill={stroke} />
      <line x1="56" y1="80" x2="56" y2="10" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
      <polygon points="56,10 90,24 56,38" fill={fill} stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="28" cy="76" r="8" fill="#fff" stroke={stroke} strokeWidth="2.4" />
      {[[25, 74], [30, 73], [27, 79], [32, 78]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill={stroke} fillOpacity="0.6" />)}
    </g>);
    case 'mic': return (<g>
      <path d="M24 42 C24 70 76 70 76 42" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" /><path d="M24 42 C24 70 76 70 76 42" fill="none" stroke={fill} strokeWidth="4" strokeLinecap="round" />
      <rect x="34" y="6" width="32" height="56" rx="16" fill={fill} stroke={stroke} strokeWidth={sw} />
      {[18, 28, 38, 48].map(y => <line key={y} x1="38" y1={y} x2="62" y2={y} stroke={stroke} strokeWidth="1.6" strokeOpacity="0.55" />)}
      <line x1="50" y1="68" x2="50" y2="86" stroke={stroke} strokeWidth="6" strokeLinecap="round" /><line x1="50" y1="68" x2="50" y2="86" stroke={fill} strokeWidth="2.6" strokeLinecap="round" />
      <rect x="30" y="86" width="40" height="9" rx="4.5" fill={fill} stroke={stroke} strokeWidth="2.6" />
    </g>);
    case 'music': return (<g>
      <polygon points="42,24 82,12 82,28 42,40" fill={fill} stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" />
      <line x1="42" y1="34" x2="42" y2="76" stroke={stroke} strokeWidth="6" strokeLinecap="round" /><line x1="42" y1="34" x2="42" y2="76" stroke={fill} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="82" y1="22" x2="82" y2="68" stroke={stroke} strokeWidth="6" strokeLinecap="round" /><line x1="82" y1="22" x2="82" y2="68" stroke={fill} strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="30" cy="78" rx="14" ry="10" transform="rotate(-20 30 78)" fill={fill} stroke={stroke} strokeWidth={sw} />
      <ellipse cx="70" cy="70" rx="14" ry="10" transform="rotate(-20 70 70)" fill={fill} stroke={stroke} strokeWidth={sw} />
    </g>);
    case 'bulb': return (<g>
      <path d="M50 6 C74 6 86 24 86 40 C86 54 76 60 72 70 H28 C24 60 14 54 14 40 C14 24 26 6 50 6 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <rect x="30" y="72" width="40" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <rect x="34" y="82" width="32" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <path d="M40 90 Q50 100 60 90" fill={fill} stroke={stroke} strokeWidth="2.4" />
      <path d="M40 56 L44 36 L50 46 L56 36 L60 56" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" strokeOpacity="0.8" />
      <path d="M26 24 C28 18 34 14 40 12" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
    </g>);
    case 'rocket': return (<g>
      <path d="M36 66 L14 84 L38 78 Z" fill={fill} stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" /><path d="M64 66 L86 84 L62 78 Z" fill={fill} stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M50 4 C70 20 72 50 64 76 H36 C28 50 30 20 50 4 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <circle cx="50" cy="38" r="9" fill="#bfe9ff" stroke={stroke} strokeWidth="2.6" />
      <path d="M40 78 Q50 100 60 78 Z" fill="#ff9f43" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
    </g>);
    case 'crown': return (<g>
      <path d="M10 76 L14 28 L36 50 L50 18 L64 50 L86 28 L90 76 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <rect x="10" y="76" width="80" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth={sw} />
      {[[14, 26], [50, 16], [86, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill="#fff" stroke={stroke} strokeWidth="2" />)}
      {[[30, 83], [50, 83], [70, 83]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill={stroke} />)}
    </g>);
    case 'cap': return (<g>
      <path d="M24 46 V70 C24 80 76 80 76 70 V46 L50 58 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <polygon points="50,12 96,34 50,56 4,34" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <line x1="88" y1="37" x2="88" y2="66" stroke={stroke} strokeWidth="3" /><circle cx="88" cy="70" r="5" fill={fill} stroke={stroke} strokeWidth="2.4" />
    </g>);
    case 'gift': return (<g>
      <rect x="14" y="44" width="72" height="46" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x="9" y="32" width="82" height="16" rx="3" fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x="44" y="32" width="12" height="58" fill="#fff" fillOpacity="0.75" stroke={stroke} strokeWidth="2" />
      <ellipse cx="36" cy="24" rx="15" ry="9" transform="rotate(-25 36 24)" fill={fill} stroke={stroke} strokeWidth="2.6" /><ellipse cx="64" cy="24" rx="15" ry="9" transform="rotate(25 64 24)" fill={fill} stroke={stroke} strokeWidth="2.6" />
      <circle cx="50" cy="29" r="5.5" fill="#fff" stroke={stroke} strokeWidth="2.2" />
    </g>);
    case 'feet': return (<g>
      {[[34, 62, 0], [66, 38, 12]].map(([x, y, r], i) => (<g key={i} transform={`rotate(${r} ${x} ${y})`}>
        <ellipse cx={x} cy={y + 8} rx="13" ry="18" fill={fill} stroke={stroke} strokeWidth="2.6" />
        {[[-9, -16, 4], [-3, -21, 4], [4, -22, 4], [10, -19, 3.4], [15, -12, 3]].map(([dx, dy, rr], j) => <circle key={j} cx={x + dx - 1} cy={y + dy + 6} r={rr} fill={fill} stroke={stroke} strokeWidth="2" />)}
      </g>))}
    </g>);
    case 'tree': return (<g>
      <rect x="43" y="66" width="14" height="28" rx="2" fill="#8d5a2b" stroke={stroke} strokeWidth="2.4" />
      <circle cx="30" cy="54" r="20" fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx="70" cy="54" r="20" fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx="50" cy="34" r="26" fill={fill} stroke={stroke} strokeWidth={sw} />
      <path d="M34 28 C38 20 46 16 54 17" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
    </g>);
    case 'target': return (<g>
      <circle cx="46" cy="54" r="40" fill={fill} stroke={stroke} strokeWidth={sw} />
      <circle cx="46" cy="54" r="29" fill="#fff" stroke={stroke} strokeWidth="2.2" />
      <circle cx="46" cy="54" r="18" fill={fill} stroke={stroke} strokeWidth="2.2" />
      <circle cx="46" cy="54" r="7" fill="#fff" stroke={stroke} strokeWidth="2.2" />
      <line x1="46" y1="54" x2="88" y2="10" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <polygon points="88,10 80,12 86,18" fill={stroke} /><polygon points="74,14 88,10 84,24" fill="#fff" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </g>);
    case 'quill': return (<g>
      <path d="M86 6 C52 8 22 38 18 80 C44 70 76 46 86 6 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M18 92 L66 34" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
      {[[36, 52], [46, 40], [56, 28]].map(([x, y], i) => <line key={i} x1={x} y1={y + 14} x2={x + 16} y2={y} stroke={stroke} strokeWidth="1.6" strokeOpacity="0.6" />)}
    </g>);
    case 'shirt': return (<g>
      <path d="M32 8 L8 26 L22 44 L30 38 V92 H70 V38 L78 44 L92 26 L68 8 C64 20 36 20 32 8 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M32 8 C36 20 64 20 68 8" fill="none" stroke={stroke} strokeWidth="2.4" />
      <polygon points={star(50, 62, 5, 11, 4.6)} fill="#fff" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </g>);
    case 'wheel': return (<g>
      <circle cx="50" cy="50" r="43" fill="none" stroke={stroke} strokeWidth="10" /><circle cx="50" cy="50" r="43" fill="none" stroke={fill} strokeWidth="6.5" />
      {Array.from({ length: 8 }, (_, i) => <g key={i} transform={`rotate(${i * 45} 50 50)`}><path d="M47 22 L48.4 8 L51.6 8 L53 22 Z" fill={fill} stroke={stroke} strokeWidth="1.2" /><line x1="50" y1="24" x2="50" y2="38" stroke={stroke} strokeWidth="5" strokeLinecap="round" /><line x1="50" y1="24" x2="50" y2="38" stroke={fill} strokeWidth="2" strokeLinecap="round" /></g>)}
      <circle cx="50" cy="50" r="14" fill={fill} stroke={stroke} strokeWidth="2.6" /><circle cx="50" cy="50" r="6" fill="#fff6d6" stroke={stroke} strokeWidth="1.6" />
    </g>);
    case 'school': return (<g>
      <polygon points="50,6 94,40 6,40" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <rect x="12" y="40" width="76" height="52" fill={fill} stroke={stroke} strokeWidth={sw} />
      <rect x="42" y="60" width="16" height="32" rx="3" fill="#fff" fillOpacity="0.85" stroke={stroke} strokeWidth="2.2" />
      {[[20, 52], [66, 52]].map(([x, y], i) => <rect key={i} x={x} y={y} width="14" height="14" rx="2" fill="#bfe9ff" stroke={stroke} strokeWidth="2.2" />)}
      <circle cx="50" cy="28" r="6" fill="#fff" stroke={stroke} strokeWidth="2" />
    </g>);
    case 'shield': return <path d="M50 6 L88 18 V50 C88 74 70 90 50 96 C30 90 12 74 12 50 V18 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    case 'crest': return (<g><path d="M50 14 L88 24 V52 C88 74 70 90 50 97 C30 90 12 74 12 52 V24 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /><path d="M26 18 L32 4 L41 13 L50 1 L59 13 L68 4 L74 18 Z" fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" /></g>);
    case 'hexagon': return <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    case 'heart': return <path d="M50 90 C8 62 4 34 22 20 C34 11 46 17 50 28 C54 17 66 11 78 20 C96 34 92 62 50 90 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    case 'flower': return (<g>{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="50" cy="22" rx="12" ry="19" transform={`rotate(${i * 45} 50 50)`} fill={fill} stroke={stroke} strokeWidth="2.4" />)}<circle cx="50" cy="50" r="27" fill={fill} stroke={stroke} strokeWidth={sw} /></g>);
    case 'circle': return (<g><circle cx="50" cy="50" r="44" fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx="50" cy="50" r="37" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 3" /></g>);
    case 'leaf': return (<g><path d="M50 5 C90 20 94 64 50 95 C6 64 10 20 50 5 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /><path d="M50 14 V90" stroke={stroke} strokeWidth="1.5" strokeOpacity="0.6" /></g>);
    case 'diamond': return <polygon points="50,3 93,50 50,97 7,50" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    case 'scroll': return (<g><rect x="16" y="16" width="68" height="68" rx="6" fill={fill} stroke={stroke} strokeWidth={sw} /><rect x="9" y="8" width="82" height="13" rx="6.5" fill={fill} stroke={stroke} strokeWidth="2.4" /><rect x="9" y="79" width="82" height="13" rx="6.5" fill={fill} stroke={stroke} strokeWidth="2.4" /></g>);
    case 'book': return (<g><path d="M50 22 C36 12 18 14 8 19 V78 C18 73 36 72 50 83 C64 72 82 73 92 78 V19 C82 14 64 12 50 22 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /><path d="M50 22 V83" stroke={stroke} strokeWidth="2" /></g>);
    case 'badge8': return <polygon points={star(50, 50, 16, 47, 38)} fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />;
    case 'ticket': return (<g><rect x="6" y="22" width="88" height="56" rx="12" fill={fill} stroke={stroke} strokeWidth={sw} /><line x1="22" y1="30" x2="22" y2="70" stroke={stroke} strokeWidth="1.6" strokeDasharray="3 3" /><line x1="78" y1="30" x2="78" y2="70" stroke={stroke} strokeWidth="1.6" strokeDasharray="3 3" /></g>);
    case 'paw': return (<g><ellipse cx="50" cy="64" rx="30" ry="26" fill={fill} stroke={stroke} strokeWidth={sw} />{[[20, 36], [38, 20], [62, 20], [80, 36]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="9" ry="12" fill={fill} stroke={stroke} strokeWidth="2.4" />)}</g>);
    case 'bolt': return (<g><rect x="9" y="9" width="82" height="82" rx="24" fill={fill} stroke={stroke} strokeWidth={sw} />{[[20, 20], [80, 20], [20, 80], [80, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill={stroke} />)}</g>);
    case 'lotusgate': return (<g><path d="M12 95 V48 C12 20 30 5 50 5 C70 5 88 20 88 48 V95 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /><path d="M20 95 V50 C20 28 34 14 50 14 C66 14 80 28 80 50 V95" fill="none" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.6" /></g>);
    case 'pennant': return <path d="M18 5 H82 V68 L50 96 L18 68 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    case 'burst': return <polygon points={star(50, 50, 12, 48, 33)} fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />;
    case 'rosette': return (<g><path d="M30 70 L20 98 L36 90 L44 98 L50 74 Z" fill="#c0392b" stroke={stroke} strokeWidth="1.6" /><path d="M70 70 L80 98 L64 90 L56 98 L50 74 Z" fill="#e74c3c" stroke={stroke} strokeWidth="1.6" />{Array.from({ length: 14 }, (_, i) => { const a = (i * 360) / 14; const x = 50 + Math.cos((a * Math.PI) / 180) * 36; const y = 44 + Math.sin((a * Math.PI) / 180) * 36; return <circle key={i} cx={x} cy={y} r="8" fill={fill} stroke={stroke} strokeWidth="2" />; })}<circle cx="50" cy="44" r="34" fill={fill} stroke={stroke} strokeWidth={sw} /></g>);
    default: return <circle cx="50" cy="50" r="44" fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

export function BadgeSvg({ badge, size = 56 }) {
  const uid = useId().replace(/:/g, '');
  // the Bodhi Tree level badges are the teacher's own artwork (see bodhiLevels.js)
  if (badge.shape === 'bodhi') {
    return <div style={{ width: size, height: size, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }} role="img" aria-label={badge.name} dangerouslySetInnerHTML={{ __html: LEVEL_BADGES_SVG[badge.level] }} />;
  }
  if (badge.shape === 'bodhiyear') {
    // the same level artwork turned gold, with the year on a ribbon
    return (
      <div style={{ width: size, height: size, position: 'relative', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }} role="img" aria-label={badge.name}>
        <div style={{ width: '100%', height: '100%', filter: 'sepia(1) saturate(4.2) hue-rotate(-12deg) brightness(1.12) contrast(1.05)' }} dangerouslySetInnerHTML={{ __html: LEVEL_BADGES_SVG[badge.level] }} />
        <span style={{ position: 'absolute', left: '50%', bottom: '2%', transform: 'translateX(-50%)', background: 'linear-gradient(180deg,#fff1a6,#e0a800)', color: '#5a3a00', fontWeight: 900, fontSize: Math.max(9, size * 0.2), padding: '0 8px', borderRadius: 6, border: '1.5px solid #8a6a00', lineHeight: 1.25, letterSpacing: 1 }}>{badge.year}</span>
      </div>
    );
  }
  const m = METALS[badge.metal] || METALS.gold;
  const gid = `bg-${uid}`;
  const centerY = badge.shape === 'rosette' ? 46 : badge.shape === 'scroll' ? 52 : 54;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={badge.name} style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>
      <defs>
        <linearGradient id={gid} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={m.light} /><stop offset="0.5" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </linearGradient>
      </defs>
      <Shape shape={badge.shape} fill={`url(#${gid})`} stroke={m.edge} uid={uid} m={m} />
      <ellipse cx="38" cy="22" rx="16" ry="6" fill="#fff" fillOpacity="0.28" transform="rotate(-20 38 22)" />
      {badge.icon && <text x="50" y={centerY} textAnchor="middle" dominantBaseline="central" fontSize={badge.shape === 'scroll' ? 30 : 36} style={{ fontFamily: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif' }}>{badge.icon}</text>}
      {badge.master && (
        <g fill="#fff" stroke={m.edge} strokeWidth="0.8">
          <polygon points="86,6 88.5,13 96,15.5 88.5,18 86,25 83.5,18 76,15.5 83.5,13" />
          <polygon points="12,70 13.6,74.4 18,76 13.6,77.6 12,82 10.4,77.6 6,76 10.4,74.4" />
        </g>
      )}
    </svg>
  );
}

// Badges in rows, grouped by the app they belong to (a group per line), master badges first inside a group.
// No big coloured panel: it would cover the student's home picture. Each badge sits on its own small rounded chip, and the whole shelf
// can be folded away (remembered on this device) with the button above it.
const SHELF_KEY = 'badgeShelfOpen';
export function BadgeShelf({ name, profile = null, title = '🎖️ Badges', compact = false }) {
  const badges = useBadges(name, profile);
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(SHELF_KEY) !== '0'; } catch (e) { return true; } });
  const [picked, setPicked] = useState(null); // the ladder whose badges are all shown
  const toggle = () => { setOpen(o => { try { localStorage.setItem(SHELF_KEY, o ? '0' : '1'); } catch (e) { /* ignore */ } return !o; }); };
  if (badges.length === 0) return null;
  const rank = { gold: 0, silver: 1, bronze: 2 };
  // one badge per ladder: the highest one; a tap shows the lower ones too
  const ladders = new Map();
  badges.forEach(b => { const k = ladderOf(b.id); (ladders.get(k) || ladders.set(k, []).get(k)).push(b); });
  ladders.forEach(list => list.sort((a, b) => ladderRank(a.id) - ladderRank(b.id)));
  const tops = [...ladders.values()].map(list => ({ ...list[list.length - 1], _ladder: ladderOf(list[0].id), _count: list.length }));
  const groups = compact ? [{ id: 'all-in-one', title: '', items: tops }] : BADGE_GROUPS.map(g => ({ ...g, items: tops.filter(b => b.group === g.id) })).filter(g => g.items.length > 0);
  const chip = 'bg-white/85 backdrop-blur-sm shadow rounded-2xl';
  return (
    <div className="mb-6 pb-16">
      <button type="button" onClick={toggle} className={`inline-flex items-center gap-2 ${chip} px-4 py-1.5 font-extrabold text-amber-900`}>
        {title} <span className="text-sm font-bold text-amber-700">· {badges.length}</span> <span className="text-xs text-gray-500">{open ? '▲ hide' : '▼ show'}</span>
      </button>
      {open && (
        <div className={compact ? 'mt-2 flex flex-wrap gap-1.5' : 'mt-2 flex flex-wrap items-start gap-x-4 gap-y-2'}>
          {groups.map(g => (
            <div key={g.id} className={compact ? 'contents' : 'max-w-full'}>
              {!compact && <p className={`inline-block ${chip} px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 mb-1`}>{g.title}</p>}
              <div className="flex flex-wrap gap-1.5">
                {g.items.slice().sort((a, b) => (rank[a.metal] ?? 3) - (rank[b.metal] ?? 3)).map(b => (
                  <button key={b.id} type="button" onClick={() => setPicked(picked === b._ladder ? null : b._ladder)} className={`relative flex flex-col items-center w-[66px] px-1 pt-1.5 pb-1 ${chip} focus:outline-none`} title={`${b.name} — ${b.desc}`}>
                    <BadgeSvg badge={b} size={compact ? 42 : 50} />
                    {b._count > 1 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-extrabold leading-[18px] text-center shadow">{b._count}</span>}
                    <span className="text-[9px] font-bold text-amber-900 text-center leading-tight mt-0.5 break-words">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {picked && ladders.get(picked) && (
            <div className={`w-full ${chip} px-2 py-2 flex flex-wrap gap-1.5 items-start`}>
              {ladders.get(picked).map(b => (
                <div key={b.id} className="flex flex-col items-center w-[84px]" title={b.desc}>
                  <BadgeSvg badge={b} size={46} />
                  <span className="text-[10px] font-extrabold text-amber-900 text-center leading-tight">{b.name}</span>
                  <span className="text-[9px] text-gray-500 text-center leading-tight">{b.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

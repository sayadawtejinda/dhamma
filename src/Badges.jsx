import React, { useEffect, useId, useState } from 'react';
import { BADGE_GROUPS, badgeMeta } from './badgeDefs';

// The badge shelf: every badge a student has earned, drawn in rows at the bottom of their Home page (and shown when a friend
// visits). Which badges each student has comes from ONE static file (public/badges.json, written weekly by
// scripts/compute-badges.mjs from files already on GitHub), so this costs no Firebase read.

let badgesPromise = null;
const loadBadges = () => {
  if (!badgesPromise) {
    badgesPromise = fetch(`${import.meta.env.BASE_URL}badges.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => ({ students: (j && j.students) || {}, generatedAt: (j && j.generatedAt) || null }))
      .catch(() => { badgesPromise = null; return { students: {}, generatedAt: null }; });
  }
  return badgesPromise;
};

export function useBadges(name) {
  const [data, setData] = useState(null);
  useEffect(() => { let off = false; loadBadges().then(d => { if (!off) setData(d); }); return () => { off = true; }; }, []);
  if (!data || !name) return [];
  return (data.students[name] || []).map(badgeMeta).filter(Boolean);
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
function Shape({ shape, fill, stroke, uid }) {
  const sw = 3;
  switch (shape) {
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
      <Shape shape={badge.shape} fill={`url(#${gid})`} stroke={m.edge} uid={uid} />
      <ellipse cx="38" cy="22" rx="16" ry="6" fill="#fff" fillOpacity="0.28" transform="rotate(-20 38 22)" />
      <text x="50" y={centerY} textAnchor="middle" dominantBaseline="central" fontSize={badge.shape === 'scroll' ? 30 : 36} style={{ fontFamily: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif' }}>{badge.icon}</text>
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
export function BadgeShelf({ name, title = '🎖️ Badges', compact = false }) {
  const badges = useBadges(name);
  const [open, setOpen] = useState(null);
  if (badges.length === 0) return null;
  const rank = { gold: 0, silver: 1, bronze: 2 };
  return (
    <div className="rounded-2xl p-3 mb-6" style={{ background: 'linear-gradient(180deg,#fffaf0,#f3e7c9)', border: '2px solid #d9b866' }}>
      <p className="font-extrabold text-amber-900 mb-2">{title} <span className="text-sm font-bold text-amber-700">· {badges.length}</span></p>
      <div className={compact ? 'flex flex-wrap gap-1.5' : 'space-y-2'}>
        {(compact ? [{ id: 'all-in-one', title: '', items: badges }] : BADGE_GROUPS.map(g => ({ ...g, items: badges.filter(b => b.group === g.id) })).filter(g => g.items.length > 0)).map(g => (
          <div key={g.id} className={compact ? 'contents' : ''}>
            {!compact && <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-0.5">{g.title}</p>}
            <div className="flex flex-wrap gap-2">
              {g.items.slice().sort((a, b) => (rank[a.metal] ?? 3) - (rank[b.metal] ?? 3)).map(b => (
                <button key={b.id} type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="flex flex-col items-center w-[60px] focus:outline-none" title={`${b.name} — ${b.desc}`}>
                  <BadgeSvg badge={b} size={compact ? 44 : 52} />
                  <span className="text-[9px] font-bold text-amber-900 text-center leading-tight mt-0.5 break-words">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {open && (() => { const b = badges.find(x => x.id === open); return b ? <p className="mt-2 text-xs font-semibold text-amber-900 bg-white/70 rounded-lg px-2 py-1">🎖️ {b.name} — {b.desc}</p> : null; })()}
    </div>
  );
}

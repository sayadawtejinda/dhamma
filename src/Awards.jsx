import React, { useEffect, useState } from 'react';

// Two honours, gold / silver / bronze, for the three students at the top:
//   - TROPHY awards (cup) for the most trophies          -- from the weekly file public/weeklySnapshot.json
//   - HOLY awards (Dhamma wheel) for the most lotus flowers in the Shrine Room -- from the weekly roster file
// Both come from static files written by the weekly job, so showing them costs no Firebase read at all.

export const AWARDS = [
  { tier: 1, metal: 'gold', en: 'Apex Excellence Award', emoji: '🥇' },
  { tier: 2, metal: 'silver', en: 'Triumph Crown Award', emoji: '🥈' },
  { tier: 3, metal: 'bronze', en: 'Luminary Star Award', emoji: '🥉' },
];
export const HOLY_AWARDS = [
  { tier: 1, metal: 'gold', en: 'Supreme Holy Award', emoji: '🥇' },
  { tier: 2, metal: 'silver', en: 'Noble Holy Award', emoji: '🥈' },
  { tier: 3, metal: 'bronze', en: 'Devoted Holy Award', emoji: '🥉' },
];

// For the three students who came to class most often this year: a happy sun (school is a joy, learning is a joy).
export const JOY_AWARDS = [
  { tier: 1, metal: 'gold', en: 'Radiant Joy Award', emoji: '🥇' },
  { tier: 2, metal: 'silver', en: 'Cheerful Heart Award', emoji: '🥈' },
  { tier: 3, metal: 'bronze', en: 'Happy Learner Award', emoji: '🥉' },
];
const LISTS = { trophy: AWARDS, holy: HOLY_AWARDS, joy: JOY_AWARDS };

const METALS = {
  gold: { light: '#fff6b0', mid: '#f5c518', dark: '#a87a06', edge: '#7a5600', plate: ['#fff1a6', '#e8b923', '#c99710'] },
  silver: { light: '#ffffff', mid: '#cdd3da', dark: '#7d8791', edge: '#56606a', plate: ['#ffffff', '#cfd5dc', '#a2abb5'] },
  bronze: { light: '#f7cf9e', mid: '#cd7f32', dark: '#8a4b17', edge: '#5e3210', plate: ['#f3c392', '#cd8a47', '#a5662a'] },
};

// ---- who the winners are (one fetch each, kept for the whole visit) ----
let topPromise = null;
const loadTop = () => {
  if (!topPromise) {
    const base = import.meta.env.BASE_URL;
    topPromise = Promise.all([
      fetch(`${base}weeklySnapshot.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}rosterSnapshots/artifacts__shrine-room-app__public__data__roster.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([snap, shrine]) => {
      const trophy = ((snap && snap.trophyList) || []).filter(s => (s.trophyCount || 0) > 0)
        .sort((a, b) => (b.trophyCount || 0) - (a.trophyCount || 0)).slice(0, 3)
        .map((s, i) => ({ id: s.id, name: s.name, count: s.trophyCount || 0, tier: i + 1 }));
      const holy = ((shrine && shrine.docs) || []).filter(d => (d.studentName || d.id) && (d.lotusCount || 0) > 0)
        .sort((a, b) => (b.lotusCount || 0) - (a.lotusCount || 0)).slice(0, 3)
        .map((d, i) => ({ name: d.studentName || d.id, count: d.lotusCount || 0, tier: i + 1 }));
      const joy = ((snap && snap.attendanceRankedList) || []).filter(s => !s.isOffline && (s.attended || 0) > 0)
        .sort((a, b) => (b.attended || 0) - (a.attended || 0)).slice(0, 3)
        .map((s, i) => ({ id: s.id, name: s.name, count: s.attended || 0, tier: i + 1 }));
      return { trophy, holy, joy, generatedAt: (snap && snap.generatedAt) || (shrine && shrine.generatedAt) || null };
    }).catch(() => { topPromise = null; return { trophy: [], holy: [], joy: [], generatedAt: null }; });
  }
  return topPromise;
};

export function useTopThree() {
  const [data, setData] = useState({ trophy: [], holy: [], joy: [], generatedAt: null });
  useEffect(() => { let off = false; loadTop().then(d => { if (!off) setData(d); }); return () => { off = true; }; }, []);
  return data;
}

// Every award one student holds: [{ kind: 'trophy' | 'holy', tier, name, count, info, generatedAt }]
export function useAwards({ name, id } = {}) {
  const { trophy, holy, joy, generatedAt } = useTopThree();
  const list = [];
  const t = trophy.find(s => (id && s.id === id) || (name && s.name === name));
  if (t) list.push({ kind: 'trophy', tier: t.tier, name: t.name, count: t.count, info: AWARDS[t.tier - 1], generatedAt });
  const h = name ? holy.find(s => s.name === name) : null;
  if (h) list.push({ kind: 'holy', tier: h.tier, name: h.name, count: h.count, info: HOLY_AWARDS[h.tier - 1], generatedAt });
  const j = (joy || []).find(s => (id && s.id === id) || (name && s.name === name));
  if (j) list.push({ kind: 'joy', tier: j.tier, name: j.name, count: j.count, info: JOY_AWARDS[j.tier - 1], generatedAt });
  return list;
}

// ---- the drawings ----
export function TrophyCup({ tier = 1, size = 96, className = '' }) {
  const m = METALS[AWARDS[tier - 1].metal];
  const gid = `cup-${tier}`;
  return (
    <svg viewBox="0 0 100 124" width={size} height={size * 1.24} className={className} role="img" aria-label={AWARDS[tier - 1].en}>
      <defs>
        <linearGradient id={`${gid}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.dark} /><stop offset="0.28" stopColor={m.light} /><stop offset="0.6" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <linearGradient id={`${gid}-p`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b3d17" /><stop offset="1" stopColor="#3f220b" />
        </linearGradient>
        <radialGradient id={`${gid}-g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff8c8" stopOpacity="0.9" /><stop offset="1" stopColor="#fff8c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="48" rx="46" ry="44" fill={`url(#${gid}-g)`} />
      <path d="M26 20 C4 18 4 56 30 58" fill="none" stroke={m.edge} strokeWidth="7" strokeLinecap="round" />
      <path d="M26 20 C4 18 4 56 30 58" fill="none" stroke={m.mid} strokeWidth="4" strokeLinecap="round" />
      <path d="M74 20 C96 18 96 56 70 58" fill="none" stroke={m.edge} strokeWidth="7" strokeLinecap="round" />
      <path d="M74 20 C96 18 96 56 70 58" fill="none" stroke={m.mid} strokeWidth="4" strokeLinecap="round" />
      <path d="M24 10 H76 V44 C76 70 63 84 50 86 C37 84 24 70 24 44 Z" fill={`url(#${gid}-b)`} stroke={m.edge} strokeWidth="2" />
      <ellipse cx="50" cy="10" rx="26" ry="4.5" fill={m.light} stroke={m.edge} strokeWidth="1.5" />
      <path d="M33 20 C32 40 38 60 46 74" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
      {tier === 1 && <polygon points="50,24 55,37 69,37 58,45 62,58 50,50 38,58 42,45 31,37 45,37" fill="#fff6b0" stroke={m.edge} strokeWidth="1.5" />}
      {tier === 2 && <path d="M33 56 L36 33 L44 44 L50 29 L56 44 L64 33 L67 56 Z" fill="#ffffff" stroke={m.edge} strokeWidth="1.6" strokeLinejoin="round" />}
      {tier === 3 && (
        <g fill="none" stroke={m.edge} strokeWidth="2" strokeLinecap="round">
          <path d="M35 58 C28 50 28 38 36 30" /><path d="M65 58 C72 50 72 38 64 30" />
          <polygon points="50,32 54,42 65,42 56,48 60,58 50,52 40,58 44,48 35,42 46,42" fill="#fff0d4" stroke={m.edge} strokeWidth="1.4" />
        </g>
      )}
      <rect x="44" y="85" width="12" height="14" fill={`url(#${gid}-b)`} stroke={m.edge} strokeWidth="1.5" />
      <ellipse cx="50" cy="99" rx="14" ry="3.5" fill={m.mid} stroke={m.edge} strokeWidth="1.2" />
      <rect x="28" y="100" width="44" height="9" rx="2" fill={`url(#${gid}-b)`} stroke={m.edge} strokeWidth="1.5" />
      <rect x="22" y="109" width="56" height="12" rx="3" fill={`url(#${gid}-p)`} stroke="#2e1707" strokeWidth="1.5" />
      <rect x="30" y="112" width="40" height="6" rx="1.5" fill={m.plate[1]} stroke={m.edge} strokeWidth="0.8" />
    </svg>
  );
}

// The Dhamma wheel (Dhammacakka): rim with studs, eight spokes, a hub with a gem, on a small stand.
export function DhammaWheel({ tier = 1, size = 96, className = '' }) {
  const m = METALS[HOLY_AWARDS[tier - 1].metal];
  const gid = `wheel-${tier}`;
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  const studs = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 100 112" width={size} height={size * 1.12} className={className} role="img" aria-label={HOLY_AWARDS[tier - 1].en}>
      <defs>
        <radialGradient id={`${gid}-r`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={m.light} /><stop offset="0.5" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </radialGradient>
        <linearGradient id={`${gid}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.dark} /><stop offset="0.4" stopColor={m.light} /><stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <radialGradient id={`${gid}-g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff8c8" stopOpacity="0.85" /><stop offset="1" stopColor="#fff8c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="48" r="47" fill={`url(#${gid}-g)`} />
      <g transform="translate(50 48)">
        <circle r="42" fill="none" stroke={m.edge} strokeWidth="9" />
        <circle r="42" fill="none" stroke={`url(#${gid}-r)`} strokeWidth="6.5" />
        <circle r="34" fill="none" stroke={m.edge} strokeWidth="1.8" />
        {studs.map(a => (
          <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 38} cy={Math.sin((a * Math.PI) / 180) * 38} r="1.7" fill={m.light} stroke={m.edge} strokeWidth="0.5" />
        ))}
        {spokes.map(a => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M-3.2 -11 L-1.6 -33 L1.6 -33 L3.2 -11 Z" fill={`url(#${gid}-s)`} stroke={m.edge} strokeWidth="1" strokeLinejoin="round" />
            <circle cy="-36" r="3.4" fill={`url(#${gid}-r)`} stroke={m.edge} strokeWidth="1" />
          </g>
        ))}
        <circle r="12" fill={`url(#${gid}-r)`} stroke={m.edge} strokeWidth="2" />
        <circle r="7.2" fill="none" stroke={m.edge} strokeWidth="1" />
        <circle r="4.2" fill="#fff6d6" stroke={m.edge} strokeWidth="1.2" />
      </g>
      <path d="M34 98 L66 98 L72 110 L28 110 Z" fill={`url(#${gid}-s)`} stroke={m.edge} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="44" y="90" width="12" height="9" fill={m.mid} stroke={m.edge} strokeWidth="1.2" />
    </svg>
  );
}

// A smiling sun: rays all around, a round face with eyes, rosy cheeks and a smile, on a small stand.
export function JoySun({ tier = 1, size = 96, className = '' }) {
  const m = METALS[JOY_AWARDS[tier - 1].metal];
  const gid = `sun-${tier}`;
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="0 0 100 112" width={size} height={size * 1.12} className={className} role="img" aria-label={JOY_AWARDS[tier - 1].en}>
      <defs>
        <radialGradient id={`${gid}-f`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={m.light} /><stop offset="0.55" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </radialGradient>
        <linearGradient id={`${gid}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.dark} /><stop offset="0.4" stopColor={m.light} /><stop offset="1" stopColor={m.dark} />
        </linearGradient>
        <radialGradient id={`${gid}-g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff8c8" stopOpacity="0.85" /><stop offset="1" stopColor="#fff8c8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="48" r="47" fill={`url(#${gid}-g)`} />
      <g transform="translate(50 48)">
        {rays.map(a => (
          <path key={a} transform={`rotate(${a})`} d="M-6 -30 L0 -46 L6 -30 Z" fill={`url(#${gid}-f)`} stroke={m.edge} strokeWidth="1.2" strokeLinejoin="round" />
        ))}
        <circle r="31" fill={`url(#${gid}-f)`} stroke={m.edge} strokeWidth="2.4" />
        <circle r="26" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.5" />
        <ellipse cx="-10" cy="-7" rx="3.6" ry="4.8" fill="#3b2a0c" />
        <ellipse cx="10" cy="-7" rx="3.6" ry="4.8" fill="#3b2a0c" />
        <circle cx="-9" cy="-9" r="1.3" fill="#fff" /><circle cx="11" cy="-9" r="1.3" fill="#fff" />
        <ellipse cx="-17" cy="6" rx="5" ry="3.2" fill="#ff8a80" fillOpacity="0.7" />
        <ellipse cx="17" cy="6" rx="5" ry="3.2" fill="#ff8a80" fillOpacity="0.7" />
        <path d="M-13 6 Q0 24 13 6" fill="#7a1f1f" stroke="#3b2a0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-8 11 Q0 17 8 11" fill="#ff7b7b" />
      </g>
      <path d="M34 98 L66 98 L72 110 L28 110 Z" fill={`url(#${gid}-s)`} stroke={m.edge} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="44" y="92" width="12" height="7" fill={m.mid} stroke={m.edge} strokeWidth="1.2" />
    </svg>
  );
}

export function AwardEmblem({ kind, tier, size }) {
  if (kind === 'holy') return <DhammaWheel tier={tier} size={size} />;
  if (kind === 'joy') return <JoySun tier={tier} size={size} />;
  return <TrophyCup tier={tier} size={size} />;
}

// a small medal (with ribbon) for the corner of an Avatar picture; the holy one carries a tiny wheel
export function AwardMedal({ kind = 'trophy', tier = 1, size = 26 }) {
  const list = LISTS[kind] || AWARDS;
  const m = METALS[list[tier - 1].metal];
  const gid = `medal-${kind}-${tier}`;
  return (
    <svg viewBox="0 0 40 52" width={size} height={size * 1.3} aria-label={list[tier - 1].en} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))' }}>
      <defs>
        <radialGradient id={gid} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={m.light} /><stop offset="0.55" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </radialGradient>
      </defs>
      <path d="M9 0 L20 22 L14 24 L2 2 Z" fill={kind === 'holy' ? '#b9770e' : kind === 'joy' ? '#e67e22' : '#c0392b'} /><path d="M31 0 L20 22 L26 24 L38 2 Z" fill={kind === 'holy' ? '#e08e0b' : kind === 'joy' ? '#f5a623' : '#e74c3c'} />
      <circle cx="20" cy="33" r="15" fill={`url(#${gid})`} stroke={m.edge} strokeWidth="2" />
      <circle cx="20" cy="33" r="10.5" fill="none" stroke={m.edge} strokeOpacity="0.55" strokeWidth="1.2" />
      {kind === 'joy' ? (
        <g transform="translate(20 33)" fill="none" stroke="#fffbe0" strokeLinecap="round">
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1="-8" x2="0" y2="-11" strokeWidth="1.6" transform={`rotate(${i * 45})`} />)}
          <circle cx="-2.8" cy="-1.5" r="1.1" fill="#fffbe0" stroke="none" /><circle cx="2.8" cy="-1.5" r="1.1" fill="#fffbe0" stroke="none" />
          <path d="M-4 2 Q0 6.5 4 2" strokeWidth="1.5" />
        </g>
      ) : kind === 'holy' ? (
        <g transform="translate(20 33)" stroke="#fffbe0" strokeWidth="1.6" strokeLinecap="round" fill="none">
          {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1="-3" x2="0" y2="-8.5" transform={`rotate(${i * 45})`} />)}
          <circle r="2.2" fill="#fffbe0" stroke="none" />
        </g>
      ) : (
        <polygon points="20,24 22.6,30 29,30 23.8,34 25.8,40.5 20,36.6 14.2,40.5 16.2,34 11,30 17.4,30" fill="#fffbe0" stroke={m.edge} strokeWidth="0.9" />
      )}
    </svg>
  );
}

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; } };

// the engraved plaque: wooden frame, metal plate, the award, the student's name and what was achieved
export function AwardPlaque({ award, compact = false }) {
  const { kind, tier, name, count, info, generatedAt } = award;
  const m = METALS[info.metal];
  const engraved = { color: '#3b2a0c', textShadow: '0 1px 0 rgba(255,255,255,.65), 0 -1px 0 rgba(0,0,0,.25)' };
  const what = kind === 'holy' ? `🪷 ${count} lotus flowers` : kind === 'joy' ? `☀️ ${count} classes` : `🏆 ${count} trophies`;
  return (
    <div
      className="rounded-2xl p-1.5 shadow-xl w-full"
      style={{ background: 'linear-gradient(135deg,#7b4a21,#b27535 45%,#6b3d17)', border: '2px solid #4a2a0e' }}
    >
      <div
        className="rounded-xl px-3 py-2"
        style={{ background: `linear-gradient(160deg, ${m.plate[0]}, ${m.plate[1]} 55%, ${m.plate[2]})`, border: `2px solid ${m.edge}`, boxShadow: 'inset 0 0 10px rgba(0,0,0,.25)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0"><AwardEmblem kind={kind} tier={tier} size={compact ? 46 : 64} /></div>
          <div className="text-left min-w-0 flex-1">
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} tracking-wider font-extrabold uppercase leading-tight`} style={engraved}>{info.en}</p>
            <div className="my-1 h-px" style={{ background: `linear-gradient(90deg, ${m.edge}, transparent)` }} />
            <p className={`${compact ? 'text-sm' : 'text-lg'} font-black break-words leading-tight`} style={engraved}>{name}</p>
            <p className={`${compact ? 'text-[11px]' : 'text-sm'} font-bold mt-0.5`} style={engraved}>{what}</p>
            {!compact && generatedAt && <p className="text-[11px] mt-0.5 font-semibold opacity-80" style={engraved}>{fmtDate(generatedAt)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// the three winners together, gold in the middle
export function HallOfExcellence({ renderName }) {
  const { trophy } = useTopThree();
  if (trophy.length === 0) return null;
  const order = [trophy[1], trophy[0], trophy[2]].filter(Boolean);
  const heights = { 1: 'h-20', 2: 'h-14', 3: 'h-10' };
  return (
    <div className="mb-6 rounded-2xl p-4" style={{ background: 'linear-gradient(180deg,#fff8e1,#ffe9b0)', border: '2px solid #e0b43a' }}>
      <p className="text-center font-extrabold text-amber-800 mb-3">🏛️ Hall of Excellence</p>
      <div className="flex items-end justify-center gap-2 sm:gap-5">
        {order.map(s => (
          <div key={s.id} className="flex flex-col items-center w-24 sm:w-32">
            <TrophyCup tier={s.tier} size={s.tier === 1 ? 84 : 64} />
            <p className="text-xs font-bold text-gray-800 text-center break-words mt-1">{renderName ? renderName(s.name) : s.name}</p>
            <p className="text-xs font-black text-amber-700">🏆 {s.count}</p>
            <div className={`w-full ${heights[s.tier]} mt-1 rounded-t-lg flex items-start justify-center pt-1 text-white font-black text-lg`} style={{ background: `linear-gradient(180deg, ${METALS[AWARDS[s.tier - 1].metal].mid}, ${METALS[AWARDS[s.tier - 1].metal].dark})` }}>{s.tier}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// the rank of a student in the Shrine Room list (1-3 wear a wheel)
export function HolyRankBadge({ rank }) {
  if (rank > 3) return <span className="w-8 text-center text-sm font-bold text-gray-400">{rank}</span>;
  return <span className="w-8 flex justify-center"><DhammaWheel tier={rank} size={26} /></span>;
}

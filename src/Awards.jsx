import React, { useEffect, useState } from 'react';

// The three students with the most trophies get an honour: a golden / silver / bronze trophy with an engraved plaque, shown on
// their Home page, next to their Avatar (and a small medal wherever their Avatar picture appears). Everything comes from the
// weekly static file (public/weeklySnapshot.json, the same one the Trophies board uses), so it costs no Firebase read at all.

export const AWARDS = [
  {
    tier: 1, key: 'apex', metal: 'gold',
    my: 'စွမ်းရည်ပြောင်မြောက် အထွတ်အထိပ်ဆု', en: 'Apex Excellence Award',
    note: 'အခက်ခဲဆုံး စိန်ခေါ်မှုတွေကို ကျော်ဖြတ်ပြီး ထိပ်ဆုံးကို ရောက်ရှိသူ',
    emoji: '🥇',
  },
  {
    tier: 2, key: 'triumph', metal: 'silver',
    my: 'ထာဝရ အောင်ပွဲခံ ဆုတံဆိပ်', en: 'Triumph Crown Award',
    note: 'အကြိမ်ကြိမ် ကြိုးစား အောင်မြင်မှု ရယူနိုင်ခဲ့သူ',
    emoji: '🥈',
  },
  {
    tier: 3, key: 'luminary', metal: 'bronze',
    my: 'စံပြကြယ်ပွင့် ဆု', en: 'Luminary Star Award',
    note: 'အများအတွက် စံနမူနာ ဖြစ်လောက်အောင် ထူးချွန်သူ',
    emoji: '🥉',
  },
];

const METALS = {
  gold: { light: '#fff6b0', mid: '#f5c518', dark: '#a87a06', edge: '#7a5600', plate: ['#fff1a6', '#e8b923', '#c99710'] },
  silver: { light: '#ffffff', mid: '#cdd3da', dark: '#7d8791', edge: '#56606a', plate: ['#ffffff', '#cfd5dc', '#a2abb5'] },
  bronze: { light: '#f7cf9e', mid: '#cd7f32', dark: '#8a4b17', edge: '#5e3210', plate: ['#f3c392', '#cd8a47', '#a5662a'] },
};

// ---- who the top three are (one fetch of the weekly file, kept for the whole visit) ----
let topPromise = null;
const loadTop = () => {
  if (!topPromise) {
    topPromise = fetch(`${import.meta.env.BASE_URL}weeklySnapshot.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const list = ((j && j.trophyList) || []).filter(s => (s.trophyCount || 0) > 0)
          .sort((a, b) => (b.trophyCount || 0) - (a.trophyCount || 0))
          .slice(0, 3)
          .map((s, i) => ({ id: s.id, name: s.name, count: s.trophyCount || 0, tier: i + 1 }));
        return { top: list, generatedAt: (j && j.generatedAt) || null };
      })
      .catch(() => { topPromise = null; return { top: [], generatedAt: null }; });
  }
  return topPromise;
};

export function useTopThree() {
  const [data, setData] = useState({ top: [], generatedAt: null });
  useEffect(() => { let off = false; loadTop().then(d => { if (!off) setData(d); }); return () => { off = true; }; }, []);
  return data;
}

// the award of one student (by name or by id), or null
export function useAward({ name, id } = {}) {
  const { top, generatedAt } = useTopThree();
  const hit = top.find(s => (id && s.id === id) || (name && s.name === name));
  return hit ? { ...hit, award: AWARDS[hit.tier - 1], generatedAt } : null;
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
      {/* glow */}
      <ellipse cx="50" cy="48" rx="46" ry="44" fill={`url(#${gid}-g)`} />
      {/* handles */}
      <path d="M26 20 C4 18 4 56 30 58" fill="none" stroke={m.edge} strokeWidth="7" strokeLinecap="round" />
      <path d="M26 20 C4 18 4 56 30 58" fill="none" stroke={m.mid} strokeWidth="4" strokeLinecap="round" />
      <path d="M74 20 C96 18 96 56 70 58" fill="none" stroke={m.edge} strokeWidth="7" strokeLinecap="round" />
      <path d="M74 20 C96 18 96 56 70 58" fill="none" stroke={m.mid} strokeWidth="4" strokeLinecap="round" />
      {/* bowl */}
      <path d="M24 10 H76 V44 C76 70 63 84 50 86 C37 84 24 70 24 44 Z" fill={`url(#${gid}-b)`} stroke={m.edge} strokeWidth="2" />
      <ellipse cx="50" cy="10" rx="26" ry="4.5" fill={m.light} stroke={m.edge} strokeWidth="1.5" />
      <path d="M33 20 C32 40 38 60 46 74" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
      {/* emblem: star (1), crown (2), laurel star (3) */}
      {tier === 1 && <polygon points="50,24 55,37 69,37 58,45 62,58 50,50 38,58 42,45 31,37 45,37" fill="#fff6b0" stroke={m.edge} strokeWidth="1.5" />}
      {tier === 2 && <path d="M33 56 L36 33 L44 44 L50 29 L56 44 L64 33 L67 56 Z" fill="#ffffff" stroke={m.edge} strokeWidth="1.6" strokeLinejoin="round" />}
      {tier === 3 && (
        <g fill="none" stroke={m.edge} strokeWidth="2" strokeLinecap="round">
          <path d="M35 58 C28 50 28 38 36 30" /><path d="M65 58 C72 50 72 38 64 30" />
          <polygon points="50,32 54,42 65,42 56,48 60,58 50,52 40,58 44,48 35,42 46,42" fill="#fff0d4" stroke={m.edge} strokeWidth="1.4" />
        </g>
      )}
      {/* stem and base */}
      <rect x="44" y="85" width="12" height="14" fill={`url(#${gid}-b)`} stroke={m.edge} strokeWidth="1.5" />
      <ellipse cx="50" cy="99" rx="14" ry="3.5" fill={m.mid} stroke={m.edge} strokeWidth="1.2" />
      <rect x="28" y="100" width="44" height="9" rx="2" fill={`url(#${gid}-b)`} stroke={m.edge} strokeWidth="1.5" />
      <rect x="22" y="109" width="56" height="12" rx="3" fill={`url(#${gid}-p)`} stroke="#2e1707" strokeWidth="1.5" />
      <rect x="30" y="112" width="40" height="6" rx="1.5" fill={m.plate[1]} stroke={m.edge} strokeWidth="0.8" />
    </svg>
  );
}

// a small medal (with ribbon) for the corner of an Avatar picture
export function AwardMedal({ tier = 1, size = 26 }) {
  const m = METALS[AWARDS[tier - 1].metal];
  const gid = `medal-${tier}`;
  return (
    <svg viewBox="0 0 40 52" width={size} height={size * 1.3} aria-label={AWARDS[tier - 1].en} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))' }}>
      <defs>
        <radialGradient id={gid} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={m.light} /><stop offset="0.55" stopColor={m.mid} /><stop offset="1" stopColor={m.dark} />
        </radialGradient>
      </defs>
      <path d="M9 0 L20 22 L14 24 L2 2 Z" fill="#c0392b" /><path d="M31 0 L20 22 L26 24 L38 2 Z" fill="#e74c3c" />
      <circle cx="20" cy="33" r="15" fill={`url(#${gid})`} stroke={m.edge} strokeWidth="2" />
      <circle cx="20" cy="33" r="10.5" fill="none" stroke={m.edge} strokeOpacity="0.55" strokeWidth="1.2" />
      <polygon points="20,24 22.6,30 29,30 23.8,34 25.8,40.5 20,36.6 14.2,40.5 16.2,34 11,30 17.4,30" fill="#fffbe0" stroke={m.edge} strokeWidth="0.9" />
    </svg>
  );
}

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; } };

// the engraved plaque: wooden frame, metal plate, the student's name, the award and what was achieved
export function AwardPlaque({ tier = 1, name, count, generatedAt, compact = false }) {
  const a = AWARDS[tier - 1];
  const m = METALS[a.metal];
  const engraved = { color: '#3b2a0c', textShadow: '0 1px 0 rgba(255,255,255,.65), 0 -1px 0 rgba(0,0,0,.25)' };
  return (
    <div
      className="rounded-2xl p-2 shadow-xl max-w-md w-full"
      style={{ background: 'linear-gradient(135deg,#7b4a21,#b27535 45%,#6b3d17)', border: '2px solid #4a2a0e' }}
    >
      <div
        className="rounded-xl px-4 py-3 text-center"
        style={{ background: `linear-gradient(160deg, ${m.plate[0]}, ${m.plate[1]} 55%, ${m.plate[2]})`, border: `2px solid ${m.edge}`, boxShadow: 'inset 0 0 12px rgba(0,0,0,.25)' }}
      >
        <div className="flex items-center justify-center gap-3">
          <TrophyCup tier={tier} size={compact ? 52 : 74} />
          <div className="text-left min-w-0">
            <p className="text-[11px] tracking-widest font-bold uppercase" style={engraved}>{a.en}</p>
            <p className={`${compact ? 'text-sm' : 'text-base'} font-extrabold leading-snug`} style={engraved}>{a.my}</p>
          </div>
        </div>
        <div className="my-2 h-px" style={{ background: `linear-gradient(90deg, transparent, ${m.edge}, transparent)` }} />
        <p className="text-xl font-black break-words" style={engraved}>{name}</p>
        <p className="text-sm font-bold mt-1" style={engraved}>🏆 {count} ဆုဖလား ရရှိမှု</p>
        {!compact && <p className="text-xs mt-1 font-semibold" style={engraved}>{a.note}</p>}
        {!compact && generatedAt && <p className="text-[11px] mt-1 font-semibold opacity-80" style={engraved}>{fmtDate(generatedAt)}</p>}
      </div>
    </div>
  );
}

// the three winners together, gold in the middle
export function HallOfExcellence({ renderName }) {
  const { top } = useTopThree();
  if (top.length === 0) return null;
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const heights = { 1: 'h-20', 2: 'h-14', 3: 'h-10' };
  return (
    <div className="mb-6 rounded-2xl p-4" style={{ background: 'linear-gradient(180deg,#fff8e1,#ffe9b0)', border: '2px solid #e0b43a' }}>
      <p className="text-center font-extrabold text-amber-800 mb-3">🏛️ ထူးချွန်ကျောင်းသား ၃ ဦး · Hall of Excellence</p>
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
      <p className="text-[11px] text-center text-amber-700 mt-2">{AWARDS.map(a => `${a.emoji} ${a.my}`).join('   ')}</p>
    </div>
  );
}

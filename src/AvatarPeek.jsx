import React, { useEffect, useState } from 'react';
import { CharacterSvg } from './AvatarCharacter';
import { getHomeBackground } from './homeBackgrounds';
import { useAwards, AwardMedal, AwardEmblem } from './Awards';
import { BadgeShelf } from './Badges';
import { SKIN_OPTIONS, HAIR_OPTIONS, BG_OPTIONS, ALL_OUTFITS, ALL_ACCESSORIES, AVATAR_DEFAULT_CONFIG, findAvatarOption } from './AvatarApp';

// Tap a student's name anywhere -> see their Avatar. The looks come from ONE static file written by the
// weekly job (public/avatarSnapshot.json), so this costs nothing in Firestore: it is fetched once per
// visit and kept in memory. (Up to a week old, which is fine for a look.)
let looksPromise = null;
const loadLooks = () => {
  if (!looksPromise) {
    looksPromise = fetch(`${import.meta.env.BASE_URL}avatarSnapshot.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j && j.avatars) || {})
      .catch(() => { looksPromise = null; return {}; });
  }
  return looksPromise;
};

export function useAvatarLook(name) {
  const [looks, setLooks] = useState(null);
  useEffect(() => { let off = false; loadLooks().then(l => { if (!off) setLooks(l); }); return () => { off = true; }; }, []);
  if (!looks) return undefined; // still loading
  return { ...AVATAR_DEFAULT_CONFIG, ...(looks[name] || {}) };
}

// The drawn Avatar on its coloured square.
export function AvatarThumb({ name, size = 72, className = '', look = null }) {
  const weekly = useAvatarLook(name);
  const won = useAwards({ name }); // the winners (most trophies / most lotus flowers) wear a small medal
  // `look`: the student's own, always-fresh look (kept on their profile); everyone else's comes from the weekly file
  const cfg = look && Object.keys(look).length ? { ...AVATAR_DEFAULT_CONFIG, ...look } : weekly;
  if (!cfg) return <div style={{ width: size, height: size }} className={className} />;
  const outfit = findAvatarOption(ALL_OUTFITS, cfg.outfit);
  return (
    <div className={`relative rounded-2xl border-2 border-white shadow flex items-center justify-center flex-shrink-0 ${className}`} style={{ width: size, height: size, background: findAvatarOption(BG_OPTIONS, cfg.bg).color }}>
      {won.map(w => (
        <span key={w.kind} className={`absolute z-10 pointer-events-none ${w.kind === 'holy' ? '-bottom-2 -left-2' : w.kind === 'joy' ? '-top-3 -right-2' : '-bottom-2 -right-2'}`}><AwardMedal kind={w.kind} tier={w.tier} size={Math.max(18, Math.round(size * 0.3))} /></span>
      ))}
      <CharacterSvg
        skinColor={findAvatarOption(SKIN_OPTIONS, cfg.skin).color}
        hair={findAvatarOption(HAIR_OPTIONS, cfg.hair)}
        outfitColor={outfit.color}
        outfitPattern={outfit.pattern}
        accessory={findAvatarOption(ALL_ACCESSORIES, cfg.accessory)}
        className=""
        style={{ width: size * 0.8, height: size * 0.8 }}
      />
    </div>
  );
}

// A name you can tap to see that student's Avatar: <PeekName name="Aaron" className="font-bold" />
export function PeekName({ name, children, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className={`cursor-pointer hover:underline ${className}`} title="See their Avatar" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{children ?? name}</span>
      {open && <AvatarPeekModal name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

// Trophies and weeks of attendance for the visited home, from two static weekly files (cached after the first look).
let extrasPromise = null;
const loadExtras = () => {
  if (!extrasPromise) {
    const base = import.meta.env.BASE_URL;
    extrasPromise = Promise.all([
      fetch(`${base}weeklySnapshot.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}studentWeekly.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}scheduleSnapshot.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([snap, weekly, sched]) => {
      const byName = {};
      ((snap && snap.trophyList) || []).forEach(e => { if (e.name) byName[e.name] = { id: e.id, trophies: e.trophyCount || 0 }; });
      return { byName, weeks: (weekly && weekly.attendedWeeks) || {}, slots: (sched && sched.slots) || {} };
    });
  }
  return extrasPromise;
};

// Visiting a student's home page: their home picture, Avatar, name, trophies and tree -- as it was last week
// (all from static weekly files, nothing is read from Firestore).
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtTime = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h)) return '';
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
// Go and look at this student's Shrine Room / Bodhi Tree / Nature World (last week's picture, from static files).
const goVisit = (app, name, uid) => window.dispatchEvent(new CustomEvent('dhamma-visit-student', { detail: { app, name, uid } }));

// One rule everywhere: tap a NAME -> that student's Avatar window; tap the AVATAR in it -> their home page.
export function AvatarPeekModal({ name, onClose }) {
  const [home, setHome] = useState(false);
  const cfg = useAvatarLook(name || '');
  const won = useAwards({ name });
  if (!name) return null;
  if (home) return <HomeVisitModal name={name} onClose={onClose} />;
  const bg = getHomeBackground(cfg && cfg.homeBackground).image;
  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col items-center justify-center p-6"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)), url(${import.meta.env.BASE_URL}${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      onClick={onClose}
    >
      <button onClick={onClose} className="fixed top-3 right-3 z-[10051] w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl font-bold shadow-lg flex items-center justify-center" aria-label="Close">×</button>
      <div className="flex flex-col items-center" onClick={(ev) => ev.stopPropagation()}>
        <button type="button" onClick={() => setHome(true)} className="rounded-3xl hover:scale-105 active:scale-95 transition-transform focus:outline-none" title="Visit their home">
          <AvatarThumb name={name} size={168} />
        </button>
        <span className="mt-3 text-lg font-extrabold text-emerald-800 bg-white/90 px-3 py-1 rounded-xl shadow text-center break-words max-w-[80vw]">{name}</span>
        {won.length > 0 && (
          <span className="mt-2 flex gap-2 flex-wrap justify-center">
            {won.map(w => (
              <span key={w.kind} className="flex flex-col items-center bg-white/90 rounded-2xl px-2 py-1 shadow">
                <AwardEmblem kind={w.kind} tier={w.tier} size={46} />
                <span className="text-[10px] font-extrabold text-amber-800 text-center leading-tight max-w-[110px]">{w.info.en}</span>
              </span>
            ))}
          </span>
        )}
        <button type="button" onClick={() => setHome(true)} className="mt-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-full shadow-lg animate-pulse">🏡 Tap the Avatar to visit home</button>
      </div>
    </div>
  );
}

// A student's home page, as it was last week (their picture, Avatar, trophies, tree, class time, badges, the three rooms).
export function HomeVisitModal({ name, onClose }) {
  const cfg = useAvatarLook(name || '');
  const [extras, setExtras] = useState(null);
  useEffect(() => { if (name) loadExtras().then(setExtras); }, [name]);
  if (!name) return null;
  const e = extras && extras.byName[name];
  const weeks = e ? extras.weeks[e.id] : null;
  const bg = getHomeBackground(cfg && cfg.homeBackground).image;
  const slots = (e && extras.slots[e.id]) || [];
  const won = useAwards({ name });
  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col items-start p-6 overflow-y-auto"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${bg})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}
      onClick={onClose}
    >
      <button onClick={onClose} className="fixed top-3 right-3 z-[10051] w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl font-bold shadow-lg flex items-center justify-center" aria-label="Close">×</button>
      <div className="flex flex-col items-center w-44" onClick={(ev) => ev.stopPropagation()}>
        <AvatarThumb name={name} size={110} />
        <span className="mt-1 text-sm font-bold text-emerald-700 bg-white/85 backdrop-blur-sm px-2 py-0.5 rounded-xl shadow-sm text-center break-words max-w-full">{name} 🏡</span>
        {won.map(w => (
          <span key={w.kind} className="mt-2 flex flex-col items-center bg-white/85 rounded-2xl px-2 py-1 shadow-sm">
            <AwardEmblem kind={w.kind} tier={w.tier} size={52} />
            <span className="text-[11px] font-extrabold text-amber-800 text-center leading-tight">{w.info.en}</span>
          </span>
        ))}
        <span className="mt-2 flex gap-2 text-sm font-bold">
          <span className="bg-white/85 px-2 py-0.5 rounded-full shadow-sm">🏆 {e ? e.trophies : 0}</span>
          <span className="bg-white/85 px-2 py-0.5 rounded-full shadow-sm">🌳 {weeks != null ? weeks : 0}</span>
        </span>
        {slots.length > 0 && (
          <span className="mt-2 text-xs font-bold bg-white/85 px-2 py-1 rounded-xl shadow-sm text-center">
            {slots.map((x, i) => <span key={i} className="block">🗓️ {DAY_NAMES[x.d]} {fmtTime(x.s)}</span>)}
          </span>
        )}
        <span className="mt-3 flex gap-2">
          {[['shrine', '🛕'], ['bodhi', '🌳'], ['nature', '🌿']].map(([app, icon]) => (
            <button key={app} onClick={() => { onClose && onClose(); goVisit(app, name, e && e.id); }} className="w-12 h-12 text-2xl rounded-xl bg-white/90 hover:bg-white shadow-lg border border-gray-200 flex items-center justify-center">{icon}</button>
          ))}
        </span>
      </div>
      <div className="mt-4 w-full max-w-md" onClick={(ev) => ev.stopPropagation()}><BadgeShelf name={name} title="🎖️ Badges" compact /></div>
    </div>
  );
}

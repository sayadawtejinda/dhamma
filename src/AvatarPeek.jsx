import React, { useEffect, useState } from 'react';
import { CharacterSvg } from './AvatarCharacter';
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
export function AvatarThumb({ name, size = 72, className = '' }) {
  const cfg = useAvatarLook(name);
  if (!cfg) return <div style={{ width: size, height: size }} className={className} />;
  const outfit = findAvatarOption(ALL_OUTFITS, cfg.outfit);
  return (
    <div className={`rounded-2xl border-2 border-white shadow flex items-center justify-center flex-shrink-0 ${className}`} style={{ width: size, height: size, background: findAvatarOption(BG_OPTIONS, cfg.bg).color }}>
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

// A small pop-up with a bigger Avatar and the name.
export function AvatarPeekModal({ name, onClose }) {
  if (!name) return null;
  return (
    <div className="fixed inset-0 z-[10050] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="fixed top-3 right-3 z-[10051] w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white text-2xl font-bold shadow-lg flex items-center justify-center" aria-label="Close">×</button>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center"><AvatarThumb name={name} size={180} /></div>
        <h2 className="text-lg font-bold text-indigo-800 mt-4">🧑‍🎨 {name}</h2>
      </div>
    </div>
  );
}

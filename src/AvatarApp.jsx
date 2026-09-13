import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';
import { HOME_BACKGROUNDS } from './homeBackgrounds';
import OnlineStatusWidget from './OnlineStatusWidget';

// Avatar deliberately has no wallet of its own -- it spends directly out of
// the same Shrine Room coin balance every other app already deposits into,
// so it's a second place to spend the same coins, not a new currency to
// juggle. Same roster doc ShrineRoomApp.jsx itself reads/writes, just with
// its own `avatar` field added alongside coinBalance/lotusCount/etc.
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').trim().replace(/[.$#/\[\]]/g, '_');

// Home backgrounds are the one shop category that isn't purely cosmetic to
// the avatar itself -- the Tutoring home page (see StudentDashboard in
// TutoringApp.jsx) needs to know which one is equipped, and that component
// reads the student's own profile doc (by studentUid), not this roster doc
// (keyed by name). So equipping one still spends from/records into the same
// roster doc as every other category (one coin balance, one place avatar
// ownership lives), but ALSO mirrors the selected id onto the student's
// profile doc purely so the home page can pick it up without its own extra
// Firestore listener. See handleEquip's homeBackground special-case below.
const STUDENTS_COLLECTION_PATH = `artifacts/${appId}/public/data/students`;

// --- Catalog -----------------------------------------------------------
// One free ("cost: 0") default per category so a brand-new avatar already
// looks complete, plus several purchasable options. Skin tone is free --
// it's who the student already is, not a shop item.
const SKIN_OPTIONS = [
  { id: 'light', color: '#FFE0B2' },
  { id: 'medium', color: '#FFCC80' },
  { id: 'tan', color: '#D7A86E' },
  { id: 'deep', color: '#8D5524' },
];
const HAIR_OPTIONS = [
  { id: 'short-black', name: 'Short & Black', style: 'short', color: '#3E2723', cost: 0 },
  { id: 'short-brown', name: 'Short & Brown', style: 'short', color: '#6D4C41', cost: 15 },
  { id: 'bun-black', name: 'Bun', style: 'bun', color: '#3E2723', cost: 20 },
  { id: 'long-black', name: 'Long & Black', style: 'long', color: '#212121', cost: 25 },
  { id: 'long-gold', name: 'Long & Golden', style: 'long', color: '#F9A825', cost: 40 },
];
const OUTFIT_OPTIONS = [
  { id: 'blue', name: 'Blue Robe', color: '#42A5F5', cost: 0 },
  { id: 'green', name: 'Green Robe', color: '#66BB6A', cost: 15 },
  { id: 'purple', name: 'Purple Robe', color: '#AB47BC', cost: 20 },
  { id: 'pink', name: 'Pink Robe', color: '#EC407A', cost: 20 },
  { id: 'gold', name: 'Golden Robe', color: '#FFB300', cost: 40 },
];
const ACCESSORY_OPTIONS = [
  { id: 'none', name: 'None', kind: 'none', color: null, cost: 0 },
  { id: 'headband-red', name: 'Red Headband', kind: 'headband', color: '#E53935', cost: 12 },
  { id: 'headband-blue', name: 'Blue Headband', kind: 'headband', color: '#1E88E5', cost: 12 },
  { id: 'flower', name: 'Flower', kind: 'flower', color: '#EC407A', cost: 18 },
  { id: 'glasses', name: 'Glasses', kind: 'glasses', color: null, cost: 22 },
];
const BG_OPTIONS = [
  { id: 'sky', name: 'Sky', color: '#BBDEFB', cost: 0 },
  { id: 'sunset', name: 'Sunset', color: '#FFCCBC', cost: 15 },
  { id: 'forest', name: 'Forest', color: '#C8E6C9', cost: 15 },
  { id: 'night', name: 'Night', color: '#5C6BC0', cost: 25 },
];
const find = (list, id) => list.find(o => o.id === id) || list[0];

// setDoc(ref, {'avatar.hair': 'x'}, {merge: true}) does NOT nest -- unlike
// updateDoc, a plain setDoc merge treats a dotted string key as a LITERAL
// field name (one containing a literal "." character), not a nested path.
// Every equip/purchase before this fix was written that way, so real
// students' choices and purchases never actually survived a reload -- the
// shop always fell back to the free defaults, and re-clicking an already-
// owned item would silently charge coins for it again. Read those old
// flat-named fields here as a one-time fallback (new writes go through
// persist()'s real nested objects below, which self-heals the document the
// next time that student equips or buys anything).
const CATEGORY_KEYS = ['skin', 'hair', 'outfit', 'accessory', 'bg', 'homeBackground'];
function readNestedWithLegacyFallback(data, prefix) {
  const result = { ...(data[prefix] || {}) };
  for (const key of CATEGORY_KEYS) {
    if (result[key] === undefined && data[`${prefix}.${key}`] !== undefined) {
      result[key] = data[`${prefix}.${key}`];
    }
  }
  return result;
}

// --- Hand-drawn layered character (same recolor-by-parameter approach as
// ShrineRoomApp's buddhaSvg) instead of stacking emoji on top of each
// other, which never quite look like they belong together. Every part is
// driven purely by the config passed in, so equipping a new item is just
// swapping one color/shape parameter, not re-drawing anything.
function CharacterSvg({ skinColor, hair, outfitColor, accessory, className }) {
  const hairPath = hair.style === 'short'
    ? <path d="M58,72 Q58,24 100,24 Q142,24 142,72 L142,54 Q100,32 58,54 Z" fill={hair.color} />
    : hair.style === 'long'
    ? <path d="M52,72 Q46,18 100,18 Q154,18 148,72 L152,145 Q140,156 134,122 L134,70 Q100,44 66,70 L66,122 Q60,156 48,145 Z" fill={hair.color} />
    : hair.style === 'bun'
    ? <>
        <circle cx="100" cy="14" r="13" fill={hair.color} />
        <path d="M58,72 Q58,26 100,26 Q142,26 142,72 L142,54 Q100,34 58,54 Z" fill={hair.color} />
      </>
    : null;

  let accessoryMarkup = null;
  if (accessory.kind === 'headband') {
    accessoryMarkup = <rect x="56" y="53" width="88" height="11" rx="5.5" fill={accessory.color} />;
  } else if (accessory.kind === 'flower') {
    accessoryMarkup = (
      <>
        <circle cx="136" cy="54" r="10" fill={accessory.color} />
        <circle cx="136" cy="54" r="4" fill="#FFF59D" />
      </>
    );
  } else if (accessory.kind === 'glasses') {
    accessoryMarkup = (
      <g stroke="#37474F" strokeWidth="3.5" fill="none">
        <circle cx="80" cy="98" r="12" />
        <circle cx="120" cy="98" r="12" />
        <line x1="92" y1="98" x2="108" y2="98" />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="100" cy="224" rx="58" ry="9" fill="#00000022" />
      <path d="M55,240 C49,174 60,148 100,148 C140,148 151,174 145,240 Z" fill={outfitColor} />
      <circle cx="68" cy="108" r="8" fill={skinColor} opacity="0.55" />
      <circle cx="132" cy="108" r="8" fill={skinColor} opacity="0.55" />
      <circle cx="100" cy="95" r="55" fill={skinColor} />
      <circle cx="80" cy="98" r="5" fill="#3E2723" />
      <circle cx="120" cy="98" r="5" fill="#3E2723" />
      <path d="M82,120 Q100,132 118,120" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round" />
      {hairPath}
      {accessoryMarkup}
    </svg>
  );
}

const DEFAULT_CONFIG = { skin: 'light', hair: 'short-black', outfit: 'blue', accessory: 'none', bg: 'sky', homeBackground: 'default' };
const CATEGORIES = [
  { key: 'hair', label: '💇 Hair', options: HAIR_OPTIONS },
  { key: 'outfit', label: '👘 Outfit', options: OUTFIT_OPTIONS },
  { key: 'accessory', label: '✨ Accessory', options: ACCESSORY_OPTIONS },
  { key: 'bg', label: '🎨 Background', options: BG_OPTIONS },
  { key: 'homeBackground', label: '🏠 Home Wallpaper', options: HOME_BACKGROUNDS },
];

export default function AvatarApp({ entryRequest, onExit }) {
  const isTeacherPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(isTeacherPreview ? 500 : 0);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [owned, setOwned] = useState({ hair: ['short-black'], outfit: ['blue'], accessory: ['none'], bg: ['sky'], homeBackground: ['default'] });
  const [activeCategory, setActiveCategory] = useState('hair');
  const [toast, setToast] = useState(null);

  const rosterRef = studentUid ? doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName)) : null;

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let isMounted = true;
    (async () => {
      try {
        const snap = rosterRef ? await getDoc(rosterRef) : null;
        if (snap && snap.exists()) {
          const data = snap.data();
          if (isMounted) {
            const avatarData = readNestedWithLegacyFallback(data, 'avatar');
            const avatarOwnedData = readNestedWithLegacyFallback(data, 'avatarOwned');
            setCoinBalance(data.coinBalance ?? 0);
            setConfig({ ...DEFAULT_CONFIG, ...avatarData });
            setOwned({
              hair: ['short-black', ...(avatarOwnedData.hair || [])],
              outfit: ['blue', ...(avatarOwnedData.outfit || [])],
              accessory: ['none', ...(avatarOwnedData.accessory || [])],
              bg: ['sky', ...(avatarOwnedData.bg || [])],
              homeBackground: ['default', ...(avatarOwnedData.homeBackground || [])],
            });
          }
        }
      } catch (e) {
        console.error('Error loading avatar data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  const persist = (patch) => {
    if (!rosterRef) return;
    setDoc(rosterRef, { studentName, ...patch }, { merge: true }).catch(() => {});
  };

  // Home Wallpaper is the one category the Tutoring home page itself needs
  // to know about -- mirror the equipped id onto the student's own profile
  // doc (see STUDENTS_COLLECTION_PATH above) whenever it changes, alongside
  // the normal roster-doc persist every other category uses.
  const mirrorHomeBackgroundToProfile = (id) => {
    if (!studentUid) return;
    setDoc(doc(db, STUDENTS_COLLECTION_PATH, studentUid), { homeBackground: id }, { merge: true }).catch(() => {});
  };

  const isOwned = (categoryKey, id) => owned[categoryKey]?.includes(id);

  const handleEquip = (categoryKey, option) => {
    if (isTeacherPreview) { showToast('Preview mode -- changes here are not saved.'); }
    const owns = isTeacherPreview || isOwned(categoryKey, option.id);
    if (owns) {
      setConfig(prev => ({ ...prev, [categoryKey]: option.id }));
      persist({ avatar: { [categoryKey]: option.id } });
      if (categoryKey === 'homeBackground') mirrorHomeBackgroundToProfile(option.id);
      return;
    }
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    setCoinBalance(prev => prev - option.cost);
    setOwned(prev => ({ ...prev, [categoryKey]: [...prev[categoryKey], option.id] }));
    setConfig(prev => ({ ...prev, [categoryKey]: option.id }));
    if (categoryKey === 'homeBackground') mirrorHomeBackgroundToProfile(option.id);
    persist({
      coinBalance: increment(-option.cost),
      avatar: { [categoryKey]: option.id },
      avatarOwned: { [categoryKey]: [...(owned[categoryKey] || []), option.id] },
    });
    showToast(`${option.name} equipped!`);
  };

  const handleSkinChange = (skinId) => {
    setConfig(prev => ({ ...prev, skin: skinId }));
    persist({ avatar: { skin: skinId } });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading your avatar...</div>;
  }

  const skin = find(SKIN_OPTIONS, config.skin);
  const hair = find(HAIR_OPTIONS, config.hair);
  const outfit = find(OUTFIT_OPTIONS, config.outfit);
  const accessory = find(ACCESSORY_OPTIONS, config.accessory);
  const bg = find(BG_OPTIONS, config.bg);
  const activeCat = CATEGORIES.find(c => c.key === activeCategory);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-20 pb-16 bg-gradient-to-b from-indigo-50 via-white to-indigo-50">
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <OnlineStatusWidget
        rosterPath={SHRINE_ROSTER_PATH}
        studentName={isTeacherPreview ? null : studentName}
        isTeacherMode={isTeacherPreview}
        coinBalance={isTeacherPreview ? null : coinBalance}
        coinIcon="🪙"
        panelTitle="🧑‍🎨 Students"
        teacherLabel="🧑‍🏫 Teacher"
        showInactiveWarning={false}
      />

      <h1 className="text-2xl font-bold text-indigo-800 mb-1">{studentName}'s Avatar</h1>
      <p className="text-sm text-gray-500 mb-6">Your own little reflection -- dress it up with coins you've earned.</p>

      {/* Big preview */}
      <div
        className="w-56 h-56 rounded-3xl shadow-xl border-4 border-white flex items-center justify-center mb-4 transition-colors duration-500"
        style={{ background: bg.color }}
      >
        <CharacterSvg skinColor={skin.color} hair={hair} outfitColor={outfit.color} accessory={accessory} className="w-44 h-44" />
      </div>

      {/* Skin tone -- free, always available */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-xs font-semibold text-gray-500 mr-1">Skin tone:</span>
        {SKIN_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSkinChange(opt.id)}
            className={`w-8 h-8 rounded-full border-2 ${config.skin === opt.id ? 'border-indigo-600 scale-110' : 'border-white'} shadow transition-transform`}
            style={{ background: opt.color }}
            title={opt.id}
          />
        ))}
      </div>

      <h2 className="text-lg font-bold text-indigo-700 mb-3">🏪 Avatar Shop</h2>

      {/* Category tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
              activeCategory === cat.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Shop grid for the active category */}
      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 gap-3">
        {activeCat.options.map(option => {
          const owns = isTeacherPreview || isOwned(activeCategory, option.id);
          const equipped = config[activeCategory] === option.id;
          const swatchColor = option.color || '#CFD8DC';
          return (
            <button
              key={option.id}
              onClick={() => handleEquip(activeCategory, option)}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition ${
                equipped ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              {option.image ? (
                <img src={option.image} alt="" className="w-full h-16 object-cover rounded-lg border border-black/10" />
              ) : (
                <span className="w-10 h-10 rounded-full border border-black/10" style={{ background: swatchColor }} />
              )}
              <span className="text-sm font-semibold text-gray-700 text-center">{option.name}</span>
              {equipped ? (
                <span className="text-xs font-bold text-indigo-600">✅ Equipped</span>
              ) : owns ? (
                <span className="text-xs font-bold text-emerald-600">Owned -- tap to equip</span>
              ) : (
                <span className="text-xs font-bold text-amber-600">🪙 {option.cost}</span>
              )}
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-semibold z-[9950]">
          {toast}
        </div>
      )}
    </div>
  );
}

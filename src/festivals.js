// Festival definitions -- add the next festival (Kathina, Waso, Water
// Festival, ...) as another entry here; it then shows up automatically on
// the teacher's "Festival apps" screen, where the teacher sets its start
// and end dates (and can switch it off). A festival is open to students
// from its start date to its end date, both included, judged by the
// device's own date. FestivalApp.jsx reads everything it shows from here.
// Rewards a student already won stay in their Avatar wardrobe for good.
export const FESTIVALS = [
  {
    id: 'thadingyut-2026',
    enabled: true,
    scene: 'lamps-night',
    icon: '🪔',
    title: 'Thadingyut Festival of Lights',
    tagline: 'Light the lamps, pay respect, and win festival gifts!',
    // Default dates -- the teacher can change them any time from the
    // "Festival apps" screen (saved in Firestore, see saveFestivalSetting).
    // Full moon of Thadingyut 2026 is taken as 26 Oct.
    start: '2026-10-23',
    end: '2026-10-29',
    // Lamps scattered around the pagoda -- every student gets the same
    // `perDay` lamps again each new day; tapping one lights it for `coins`.
    lamps: { perDay: 12, coins: 5, allLitBonus: 30 },
    // Paying respect -- once per person per day, each answered with a
    // blessing and a few coins. The Triple Gem comes first.
    kadaw: {
      coins: 10,
      recipients: [
        {
          id: 'triple-gem', emoji: '🛕', name: 'The Triple Gem',
          prayer: 'I pay my respect to the Buddha, the Dhamma and the Sangha, the Triple Gem. Namo Buddhassa, Namo Dhammassa, Namo Sanghassa.',
          blessing: 'May your good deeds keep growing every day. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'mother', emoji: '👩', name: 'Mother',
          prayer: 'Dear Mother, thank you for your love and care. I am grateful for everything you do for me. I bow to you with respect.',
          blessing: 'May you be healthy, happy and wise, my dear child.',
        },
        {
          id: 'father', emoji: '👨', name: 'Father',
          prayer: 'Dear Father, thank you for working so hard to look after me. I am grateful for everything you do for me. I bow to you with respect.',
          blessing: 'May you be healthy, safe and kind, my dear child.',
        },
        {
          id: 'grandparents', emoji: '👴', name: 'Grandparents',
          prayer: 'Dear Grandparents, thank you for your warm love and for taking care of me. I bow to you with respect.',
          blessing: 'May you grow up healthy and become a good person, my dear grandchild.',
        },
        {
          id: 'teacher', emoji: '🧑‍🏫', name: 'Teacher',
          prayer: 'Dear Teacher, thank you for teaching me with patience. I bow to you with respect.',
          blessing: 'May your wisdom grow, and may your heart stay kind.',
        },
      ],
    },
    // Limited-edition Avatar items, handed out when the requirement is met.
    // They stay in the wardrobe after the festival ends; AvatarApp only
    // lists a festival item once the student owns it.
    rewards: [
      {
        id: 'thadingyut-2026-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-thadingyut-2026-robe', name: '🪔 Festival Lights Robe', color: '#F97316', pattern: 'lights', cost: 0, festival: true },
      },
      {
        id: 'thadingyut-2026-lantern',
        category: 'accessory',
        requires: { type: 'kadawAll' },
        item: { id: 'festival-thadingyut-2026-lantern', name: '🏮 Festival Lantern', kind: 'lantern', color: '#FBBF24', cost: 0, festival: true },
      },
    ],
  },
];

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

const pad = (n) => String(n).padStart(2, '0');
export const localDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---- Teacher-set dates ---------------------------------------------------
// One small Firestore doc holds the teacher's overrides, { [festivalId]:
// { start, end, enabled } }. It is read ONCE per page load (cached below),
// so the whole student body costs one read each per visit -- not one per
// home-page render. Without an override the dates above are used.
const SETTINGS_DOC = doc(db, `artifacts/${appId}/public/data/festivalSettings`, 'dates');
let settingsCache = null;
let settingsPromise = null;
const settingsListeners = new Set();
const notify = () => settingsListeners.forEach(fn => fn(settingsCache));

export function loadFestivalSettings() {
  if (settingsCache) return Promise.resolve(settingsCache);
  if (!settingsPromise) {
    settingsPromise = getDoc(SETTINGS_DOC)
      .then(snap => { settingsCache = snap.exists() ? snap.data() : {}; notify(); return settingsCache; })
      .catch(e => { console.error('Could not read festival settings:', e); settingsCache = {}; notify(); return settingsCache; });
  }
  return settingsPromise;
}

export async function saveFestivalSetting(festivalId, patch) {
  await setDoc(SETTINGS_DOC, { [festivalId]: patch }, { merge: true });
  settingsCache = { ...(settingsCache || {}), [festivalId]: { ...(settingsCache?.[festivalId] || {}), ...patch } };
  notify();
}

// null until loaded, then the settings object.
export function useFestivalSettings() {
  const [settings, setSettings] = useState(settingsCache);
  useEffect(() => {
    settingsListeners.add(setSettings);
    loadFestivalSettings();
    return () => { settingsListeners.delete(setSettings); };
  }, []);
  return settings;
}

const resolveFestival = (def, settings) => {
  const o = settings?.[def.id] || {};
  return { ...def, start: o.start || def.start, end: o.end || def.end, enabled: o.enabled ?? def.enabled };
};
// Every festival with the teacher's dates applied (for the Festival apps screen).
export const getFestivalList = (settings) => FESTIVALS.map(f => resolveFestival(f, settings));

export function festivalStatus(f, now = new Date()) {
  const today = localDateKey(now);
  if (!f.enabled) return 'off';
  if (today < f.start) return 'upcoming';
  if (today > f.end) return 'ended';
  return 'open';
}
// Festivals open right now -- what students see on their home page.
export const getActiveFestivals = (settings, now = new Date()) =>
  getFestivalList(settings).filter(f => festivalStatus(f, now) === 'open');

// Every limited-edition Avatar item across all festivals, by category, so
// AvatarApp can draw (and list, once owned) items from festivals that have
// already closed.
export const FESTIVAL_AVATAR_ITEMS = FESTIVALS.reduce((acc, f) => {
  (f.rewards || []).forEach(r => { (acc[r.category] = acc[r.category] || []).push(r.item); });
  return acc;
}, {});

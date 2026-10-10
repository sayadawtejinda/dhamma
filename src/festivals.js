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
      coins: 20,
      lotus: 1, // 🪷 per respect paid -- festival lotus is separate from Shrine Room's own daily limit
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
        item: { id: 'festival-thadingyut-2026-robe', name: '🪔 Festival Lights Robe', color: '#F97316', swatch: 'linear-gradient(135deg,#FFC107,#FB8C00 55%,#7B1FA2)', pattern: 'lights', cost: 0, festival: true },
      },
    ],
    // The daily gift box: once a student has paid respect to everyone in a
    // day, a gift box drops in and holds ONE new Avatar item -- the next one
    // in this list they don't own yet (so a gift is never a repeat), one box
    // a day. If they already own everything, the box holds bonus coins.
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-thadingyut-2026-skylantern', name: '🏮 Sky Lantern', kind: 'skylantern', color: '#FF9800', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thadingyut-2026-lotus', name: '🪷 Lotus Garden Robe', color: '#26A69A', swatch: 'linear-gradient(135deg,#4DB6AC,#00695C 60%,#F8BBD0)', pattern: 'lotus', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thadingyut-2026-starglasses', name: '⭐ Star Glasses', kind: 'starglasses', color: '#FFD54F', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thadingyut-2026-night', name: '🌙 Night Sky Robe', color: '#3949AB', swatch: 'linear-gradient(135deg,#3949AB,#1A1055 65%,#FFE082)', pattern: 'night', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thadingyut-2026-lantern', name: '🏮 Festival Lantern', kind: 'lantern', color: '#FBBF24', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thadingyut-2026-checks', name: '🟥 Checkered Gold Robe', color: '#C62828', swatch: 'linear-gradient(135deg,#FFC107 50%,#C62828 50%)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thadingyut-2026-lampglasses', name: '🔶 Lamp Glasses', kind: 'lampglasses', color: '#FF9800', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'tazaungdaing-2026',
    enabled: true,
    scene: 'balloons-night',
    icon: '🏮',
    title: 'Tazaungdaing Festival of Fire Balloons',
    tagline: 'Send up the fire balloons, offer robes, and share pasukula!',
    // Default dates -- the teacher sets the real ones on the "Festival apps"
    // screen. Full moon of Tazaungmon 2026 is taken as 24 Nov.
    start: '2026-11-21',
    end: '2026-11-27',
    // Fire balloons drifting in the sky -- tap one and it floats up and away.
    // Same `perDay` balloons again every new day, `coins` each.
    lamps: { perDay: 10, coins: 5, allLitBonus: 0, style: 'balloon', icon: '🏮', noun: 'balloon' },
    // Three offerings, once each per day (same rhythm as Thadingyut's respects).
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Make Offerings',
      doneWord: 'Offerings',
      button: '🙏 Make Offerings',
      actionLabel: '🙏 I Offer With Respect',
      recipients: [
        {
          id: 'kathina', emoji: '🧡', name: 'Kathina Robe to the Sangha',
          prayer: 'At the end of the rains retreat, I offer this Kathina robe to the Sangha with a happy heart. May this offering bring peace and merit to everyone.',
          blessing: 'May the merit of your Kathina offering bring you a long, healthy and happy life. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'mathoe', emoji: '🧵', name: 'Mathoe Robe to the Buddha',
          prayer: 'In one night, many hands spin, weave and sew a robe. I offer this Mathoe robe to the Buddha with respect and faith.',
          blessing: 'May your faith and your good heart keep growing. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'samannaphala', emoji: '📿', name: 'Respect to the Monks (Samannaphala Sutta)',
          prayer: 'Venerable monks, thank you for teaching the Dhamma, including the Samannaphala Sutta, the fruits of the life of a monk. I bow to you with respect.',
          blessing: 'May you understand the Dhamma more and more every day. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    // Pasukula: every student gets their own 10 gift packets each day and may
    // open ONE. Two of the ten win (chosen by chance, different for each
    // student and day): one holds a pasukula thrown by another student (the
    // oldest waiting one) and the other holds a gift of 50 / 75 / 100 coins
    // from the merit fund. If nobody has thrown anything, both are merit-fund
    // gifts. After opening, a student may throw some of their own coins for
    // another student to find.
    pasukula: { packets: 10, winners: 2, autoAmounts: [50, 75, 100], maxWaiting: 300 },
    rewards: [
      {
        id: 'tazaungdaing-2026-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-tazaungdaing-2026-robe', name: '🏮 Fire Balloon Robe', color: '#D81B60', swatch: 'linear-gradient(135deg,#FF8A65,#D81B60 55%,#4A148C)', pattern: 'lights', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-tazaungdaing-2026-balloon', name: '🏮 Fire Balloon', kind: 'skylantern', color: '#E91E63', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-tazaungdaing-2026-kathina', name: '🧡 Kathina Robe', color: '#EF6C00', swatch: 'linear-gradient(135deg,#FFB74D,#EF6C00 60%,#8D3B00)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-tazaungdaing-2026-glasses', name: '🎆 Balloon Glasses', kind: 'starglasses', color: '#FF7043', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-tazaungdaing-2026-mathoe', name: '🧵 Weaving-Night Robe', color: '#6D4C41', swatch: 'linear-gradient(135deg,#A1887F,#6D4C41 60%,#FFE082)', pattern: 'lotus', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-tazaungdaing-2026-lantern', name: '🏮 Tazaungdaing Lantern', kind: 'lantern', color: '#FF8F00', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-tazaungdaing-2026-midnight', name: '🌌 Midnight Balloon Robe', color: '#283593', swatch: 'linear-gradient(135deg,#3949AB,#1A1055 65%,#FF8A65)', pattern: 'night', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'nyaungyay-2027',
    enabled: true,
    scene: 'bodhi-water',
    icon: '🌳',
    title: 'Nyaung-yay Thwin: Watering the Bodhi Tree',
    tagline: 'Carry the water pots to the Bodhi tree, pour water on its roots, and pay respect on the four great days of the Buddha!',
    // Default dates -- the teacher sets the real ones on the "Festival apps" screen.
    // Full moon of Kason 2027 is taken as 20 May.
    start: '2027-05-17',
    end: '2027-05-23',
    // Clay water pots stand on the ground. Tap one: it is carried to the Bodhi tree and
    // the water is poured over the roots. The same pots again every new day.
    lamps: { perDay: 10, coins: 5, allLitBonus: 0, style: 'pot', icon: '🏺', noun: 'water pot' },
    // Paying respect to the four great days of the Buddha's life (birth, enlightenment, passing away, and the prophecy), once each per day.
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Pay Respect',
      doneWord: 'Respects',
      recipients: [
        {
          id: 'born', emoji: '🌸', name: 'The Day He Was Born',
          prayer: 'I pay my respect to the day the Bodhisatta was born in Lumbini Garden, for the good of the whole world.',
          blessing: 'May your heart be as pure and gentle as a newborn lotus. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'awakened', emoji: '🌳', name: 'The Day He Became the Buddha',
          prayer: 'I pay my respect to the day the Buddha became fully awakened under the Bodhi tree and found the end of suffering.',
          blessing: 'May your wisdom grow like the great Bodhi tree. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'passed', emoji: '🪷', name: 'The Day He Passed Away',
          prayer: 'I pay my respect to the day the Buddha passed away at Kusinara, and left us the Dhamma to be our guide.',
          blessing: 'May you remember the Dhamma every day and be mindful. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'prophecy', emoji: '✨', name: 'The Day He Received the Prophecy',
          prayer: 'I pay my respect to the day the young hermit Sumedha received the prophecy from Buddha Dipankara that he would one day become a Buddha.',
          blessing: 'May every good wish you make with a pure heart come true. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'nyaungyay-2027-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-nyaungyay-2027-robe', name: '🏺 Water Pot Robe', color: '#2E7D32', swatch: 'linear-gradient(135deg,#A5D6A7,#2E7D32 60%,#8D6E63)', pattern: 'lotus', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-nyaungyay-2027-leafglasses', name: '🍃 Bodhi Leaf Glasses', kind: 'starglasses', color: '#43A047', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-nyaungyay-2027-bodhi', name: '🌳 Bodhi Tree Robe', color: '#558B2F', swatch: 'linear-gradient(135deg,#9CCC65,#33691E 60%,#FFD54F)', pattern: 'lights', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-nyaungyay-2027-lantern', name: '💧 Water Lantern', kind: 'lantern', color: '#29B6F6', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-nyaungyay-2027-dawn', name: '🌅 Dawn Water Robe', color: '#0288D1', swatch: 'linear-gradient(135deg,#FFCC80,#0288D1 65%,#01579B)', pattern: 'night', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-nyaungyay-2027-skylantern', name: '🪷 Lotus Lantern', kind: 'skylantern', color: '#F48FB1', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-nyaungyay-2027-gold', name: '🟨 Golden Bodhi Robe', color: '#F9A825', swatch: 'linear-gradient(135deg,#FFE082 50%,#F9A825 50%)', pattern: 'checks', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'waso-2027',
    enabled: true,
    scene: 'deer-park',
    icon: '☸️',
    title: 'Waso Festival: the Day of the First Sermon',
    tagline: 'Offer Waso flowers to the Buddha and pay respect to the Triple Gem!',
    // Default dates -- the teacher sets the real ones on the "Festival apps" screen.
    // Full moon of Waso 2027 is taken as 18 July.
    start: '2027-07-15',
    end: '2027-07-21',
    // Waso flowers to offer to the Buddha. Tap one: it floats to the Buddha and is offered.
    // The same flowers again every new day.
    lamps: { perDay: 10, coins: 5, allLitBonus: 0, style: 'flower', icon: '🌼', noun: 'flower' },
    // The great things that happened on the Waso full moon, and the Triple Gem, who all
    // come together on this day. Once each per day.
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Pay Respect',
      doneWord: 'Respects',
      recipients: [
        {
          id: 'conception', emoji: '🤰', name: 'The Day of Conception',
          prayer: 'I pay my respect to the day the Bodhisatta, in the Tusita heaven, took rebirth in the womb of Queen Maha Maya, the beginning of his last life.',
          blessing: 'May your good deeds carry you towards a bright and noble life. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'renunciation', emoji: '🌲', name: 'The Day of Leaving Home',
          prayer: 'I pay my respect to the day the Bodhisatta left his palace and went to the forest, to find the way out of suffering for all beings.',
          blessing: 'May you have courage to choose what is good, even when it is hard. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'first-sermon', emoji: '☸️', name: 'The Day of the First Sermon',
          prayer: 'I pay my respect to the day the Buddha taught the Dhammacakkappavattana Sutta to the five ascetics at Isipatana, setting the Wheel of the Dhamma in motion.',
          blessing: 'May the Wheel of the Dhamma turn in your heart, and may you walk the Middle Way. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'triple-gem', emoji: '🛕', name: 'The Triple Gem',
          prayer: 'On this day the Buddha, the Dhamma and the Sangha came together for the first time. I pay my respect to the Buddha, the Dhamma and the Sangha, the Triple Gem. Namo Buddhassa, Namo Dhammassa, Namo Sanghassa.',
          blessing: 'May the Triple Gem protect you and may your good deeds keep growing every day. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'waso-2027-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-waso-2027-robe', name: '🌼 Waso Flower Robe', color: '#F9A825', swatch: 'linear-gradient(135deg,#FFF59D,#F9A825 60%,#E65100)', pattern: 'lotus', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-waso-2027-wheelglasses', name: '☸️ Dhamma Wheel Glasses', kind: 'starglasses', color: '#FBC02D', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-waso-2027-wheel', name: '☸️ Dhamma Wheel Robe', color: '#F57F17', swatch: 'linear-gradient(135deg,#FFE082 50%,#F57F17 50%)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-waso-2027-lantern', name: '🌼 Waso Flower Lantern', kind: 'lantern', color: '#FDD835', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-waso-2027-deerpark', name: '🦌 Deer Park Robe', color: '#558B2F', swatch: 'linear-gradient(135deg,#C5E1A5,#33691E 60%,#FFD54F)', pattern: 'lights', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-waso-2027-moonlantern', name: '🌕 Full Moon Lantern', kind: 'skylantern', color: '#FFF176', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-waso-2027-moon', name: '🌕 Waso Full Moon Robe', color: '#4527A0', swatch: 'linear-gradient(135deg,#7E57C2,#311B92 65%,#FFF59D)', pattern: 'night', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'thingyan-2027',
    enabled: true,
    scene: 'thingyan-water',
    icon: '💦',
    title: 'Thingyan Water Festival',
    tagline: 'Gently sprinkle water on your friends, pay respect to your elders, and meditate for the new year!',
    // Default dates -- the teacher sets the real ones on the "Festival apps" screen.
    start: '2027-04-13',
    end: '2027-04-17',
    // Sprinkling water on friends with a silver bowl and a thabyay twig: up to `perDay` friends
    // a day (each friend once), `coins` for each. The friend is told who sprinkled them.
    lamps: { perDay: 10, coins: 5, allLitBonus: 0, style: 'splash', icon: '💦', noun: 'splash' },
    // Two things to do once a day: pay respect to grandparents and elders, and sit in
    // meditation for 5 minutes (more coins and lotus, since it takes real time).
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Pay Respect and Meditate',
      doneWord: 'Respects',
      recipients: [
        {
          id: 'elders', emoji: '👵', name: 'Pay Respect to Grandparents and Elders',
          prayer: 'At Thingyan I bow down to my grandparents and all my elders, who have cared for me and taught me. I ask their forgiveness for anything I did wrong in the past year.',
          blessing: 'May you be healthy and happy, and may your kind heart bring joy to your whole family. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'meditation', emoji: '🧘', name: 'Meditate for 5 Minutes', coins: 80, lotus: 4, sitMinutes: 5,
          prayer: 'Sit comfortably with your back straight and your hands resting in your lap. Close your eyes gently. Breathe in and out naturally and know: "breathing in... breathing out...". Stay with your breath for 5 minutes. When your mind wanders, kindly bring it back to the breath. Keep this page open while you sit.',
          blessing: 'Well done! You sat for 5 whole minutes and made your mind calm and clear for the new year. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'thingyan-2027-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-thingyan-2027-robe', name: '💦 Thingyan Splash Robe', color: '#039BE5', swatch: 'linear-gradient(135deg,#B3E5FC,#039BE5 60%,#01579B)', pattern: 'checks', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-thingyan-2027-thabyay', name: '🌿 Thabyay Glasses', kind: 'starglasses', color: '#43A047', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thingyan-2027-padauk', name: '🌼 Padauk Flower Robe', color: '#F9A825', swatch: 'linear-gradient(135deg,#FFF59D,#F9A825 60%,#E65100)', pattern: 'lotus', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thingyan-2027-silverbowl', name: '🥣 Silver Bowl Lantern', kind: 'lantern', color: '#B0BEC5', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thingyan-2027-water', name: '🌊 Water Festival Robe', color: '#0277BD', swatch: 'linear-gradient(135deg,#81D4FA,#0277BD 65%,#01579B)', pattern: 'lights', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thingyan-2027-sprinkle', name: '💧 Sprinkle Lantern', kind: 'skylantern', color: '#4FC3F7', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thingyan-2027-newyear', name: '🎊 New Year Robe', color: '#E53935', swatch: 'linear-gradient(135deg,#FFCDD2,#E53935 60%,#FFC107)', pattern: 'night', cost: 0, festival: true } },
      ],
    },
  },
];

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
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

// The settings doc can only be read once the anonymous sign-in has finished.
// On a slower phone the home page can ask before that happens; the read then
// fails, and the old code remembered that failure as "no teacher settings"
// for the rest of the visit -- so the phone fell back to the built-in default
// dates and showed no announcement even while the teacher's dates were open.
// Now the read waits for sign-in, retries a few times, never remembers a
// failure, and refreshes after 15 minutes so a long-open tab hears about a
// date the teacher changed.
// The read is also kept on the device (localStorage) so reopening the app or
// reloading within the hour costs no Firestore read at all -- this home-page
// check runs for every student, so it is the festival's one always-on cost.
const SETTINGS_TTL_MS = 10 * 60 * 1000;
const SETTINGS_STORE_KEY = 'festival_settings_cache_v1';
let settingsLoadedAt = 0;
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_STORE_KEY) || 'null');
  if (saved && saved.data && Date.now() - saved.at < SETTINGS_TTL_MS) { settingsCache = saved.data; settingsLoadedAt = saved.at; }
} catch (e) { /* no storage -- just reads from Firestore */ }
const rememberSettings = () => {
  try { localStorage.setItem(SETTINGS_STORE_KEY, JSON.stringify({ at: settingsLoadedAt, data: settingsCache })); } catch (e) { /* ignore */ }
};
const waitForSignIn = () => new Promise(resolve => {
  if (auth.currentUser) { resolve(); return; }
  const timer = setTimeout(() => { unsub(); resolve(); }, 15000);
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) { clearTimeout(timer); unsub(); resolve(); }
  });
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchFestivalSettings() {
  for (let attempt = 0; attempt < 4; attempt++) {
    await waitForSignIn();
    try {
      const snap = await getDoc(SETTINGS_DOC);
      settingsCache = snap.exists() ? snap.data() : {};
      settingsLoadedAt = Date.now();
      rememberSettings();
      notify();
      return settingsCache;
    } catch (e) {
      console.error('Could not read festival settings (will retry):', e);
      await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}

// `force` skips the device cache -- used by the teacher's Festival apps screen.
export function loadFestivalSettings(force = false) {
  if (!force && settingsCache && Date.now() - settingsLoadedAt < SETTINGS_TTL_MS) return Promise.resolve(settingsCache);
  if (!settingsPromise) {
    settingsPromise = fetchFestivalSettings().then(result => {
      settingsPromise = null; // a failure is not remembered; the next call tries again
      // Only after every retry has failed: show the built-in dates for now.
      if (!result && !settingsCache) { settingsCache = {}; settingsLoadedAt = 0; notify(); }
      return settingsCache;
    });
  }
  return settingsPromise;
}

export async function saveFestivalSetting(festivalId, patch) {
  await setDoc(SETTINGS_DOC, { [festivalId]: patch }, { merge: true });
  settingsCache = { ...(settingsCache || {}), [festivalId]: { ...(settingsCache?.[festivalId] || {}), ...patch } };
  settingsLoadedAt = Date.now();
  rememberSettings();
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
  (f.dailyGift?.pool || []).forEach(r => { (acc[r.category] = acc[r.category] || []).push(r.item); });
  return acc;
}, {});

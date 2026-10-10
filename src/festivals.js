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
    lamps: {
      perDay: 10, coins: 5, allLitBonus: 0, style: 'splash', icon: '💦', noun: 'splash',
      button: '💦 Splash Water', panelTitle: '💦 Sprinkle Water on Friends',
      panelIntro: 'Gently sprinkle water with your silver bowl. Each friend once a day, up to 10 friends.',
      rowButton: '💦 Splash', rowDone: '✅ Splashed', doneAll: 'All 10 splashes done today. Come back tomorrow! 🌸',
      receiveTitle: 'You were splashed!', receiveText: 'gently sprinkled water on you. Happy Thingyan! 🌸', receiverCoins: 2,
    },
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
  {
    id: 'htamane-2027',
    enabled: true,
    scene: 'htamane-fire',
    icon: '🍲',
    title: 'Htamane Festival',
    tagline: 'Stir the great pot of htamane, share it with 10 friends, and make three good resolutions!',
    // Default dates -- the teacher sets the real ones on the "Festival apps" screen.
    // Full moon of Tabodwe 2027 is taken as 21 January.
    start: '2027-01-19',
    end: '2027-01-23',
    // First stir the htamane in the big pot (tap it until it is ready), then give a plate to
    // up to `perDay` friends a day (each friend once), `coins` for each. The friend gets
    // `receiverCoins` coins and is told who gave it.
    lamps: {
      perDay: 10, coins: 5, allLitBonus: 0, style: 'share', stir: true, icon: '🍲', noun: 'plate',
      button: '🍲 Share Htamane', panelTitle: '🍲 Share Htamane with Friends',
      panelIntro: 'Give a plate of warm htamane to your friends. Each friend once a day, up to 10 friends.',
      rowButton: '🍲 Give', rowDone: '✅ Given', doneAll: 'All 10 plates shared today. Come back tomorrow! 🌸',
      receiveTitle: 'You were given htamane!', receiveText: 'shared a plate of htamane with you. Happy Htamane Festival! 🍲', receiverCoins: 2,
    },
    // Three resolutions from the Ovada Patimokkha, which the Buddha taught on the full moon of
    // Tabodwe to 1,250 arahants. Once each per day.
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Make Resolutions',
      button: '🙏 Make Resolutions',
      actionLabel: '🙏 I Make This Resolution',
      doneWord: 'Resolutions',
      recipients: [
        {
          id: 'avoid-evil', emoji: '🚫', name: 'I Will Not Do Evil',
          prayer: 'On the full moon of Tabodwe, 1,250 arahants came together around the Buddha, and He taught the Ovada Patimokkha. The first teaching is: "Not to do any evil." I make a firm resolution: I will not do bad deeds with my body, my words or my mind.',
          blessing: 'May you stay far from every bad deed and always be safe. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'do-good', emoji: '🌱', name: 'I Will Do Good Deeds',
          prayer: 'The second teaching of the Ovada Patimokkha is: "To do good." I make a firm resolution: I will do good deeds every day, share with others, and help anyone who needs help.',
          blessing: 'May every good deed you do come back to you as happiness. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'pure-mind', emoji: '🤍', name: 'I Will Keep My Mind Pure',
          prayer: 'The third teaching of the Ovada Patimokkha is: "To purify the mind." I make a firm resolution: I will keep my mind clean and white, free from anger, greed and jealousy.',
          blessing: 'May your mind be as clear and white as the full moon. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'htamane-2027-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-htamane-2027-robe', name: '🍲 Htamane Robe', color: '#E65100', swatch: 'linear-gradient(135deg,#FFE0B2,#E65100 60%,#6D4C41)', pattern: 'lights', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-htamane-2027-sesame', name: '🥜 Sesame Glasses', kind: 'starglasses', color: '#FFB74D', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-htamane-2027-golden', name: '🟧 Golden Htamane Robe', color: '#EF6C00', swatch: 'linear-gradient(135deg,#FFE082 50%,#EF6C00 50%)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-htamane-2027-bonfire', name: '🔥 Bonfire Lantern', kind: 'lantern', color: '#FF7043', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-htamane-2027-moon', name: '🌕 Tabodwe Full Moon Robe', color: '#37474F', swatch: 'linear-gradient(135deg,#78909C,#263238 65%,#FFF59D)', pattern: 'night', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-htamane-2027-paddle', name: '🥄 Paddle Lantern', kind: 'skylantern', color: '#A1887F', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-htamane-2027-warm', name: '🧣 Warm Season Robe', color: '#C62828', swatch: 'linear-gradient(135deg,#FFCDD2,#C62828 60%,#FFC107)', pattern: 'lotus', cost: 0, festival: true } },
      ],
    },
  },
  // ---- Western festivals for students who live in the West -----------------------------
  // No religious teaching other than Dhamma: kindness, loving-kindness, gratitude, giving.
  {
    id: 'halloween-2026',
    enabled: true,
    scene: 'halloween-night',
    icon: '🎃',
    title: 'Happy Halloween',
    tagline: 'Be kind to the shy little ghosts, send loving-kindness, and share treats with your friends!',
    // Default dates -- the teacher sets the real ones on the "Festival apps" screen.
    start: '2026-10-28',
    end: '2026-10-31',
    // Ten shy ghosts: tap one and send it a kind thought -- it smiles and becomes a glowing pumpkin.
    // Then "Trick or Treat": give treats to up to 10 friends a day (each friend once).
    lamps: {
      perDay: 10, coins: 5, allLitBonus: 20, style: 'tap', icon: '👻', noun: 'ghost',
      emoji: '👻', doneEmoji: '🎃',
      rewardText: 'Cheer up {n} little ghosts in total',
    },
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Kind Thoughts',
      button: '💛 Kind Thoughts',
      actionLabel: '💛 I Send This Kind Thought',
      doneWord: 'Kind Thoughts',
      recipients: [
        {
          id: 'metta-all', emoji: '💛', name: 'Loving-Kindness to Everyone',
          prayer: 'May all beings be happy. May all beings be safe. May all beings be free from fear. I send my loving-kindness to my family, my friends, the ghosts in the stories, and every living being.',
          blessing: 'Loving-kindness makes the night bright and friendly. May you be happy and well. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'brave', emoji: '🦁', name: 'A Brave and Calm Mind',
          prayer: 'Ghosts in stories cannot hurt me. When I feel scared, I breathe in and out slowly and I stay calm. A calm mind is the bravest mind. I make a firm resolution to keep my mind calm.',
          blessing: 'Well done! A calm mind is never afraid for long. May you always be brave and kind.',
        },
        {
          id: 'safe', emoji: '🔦', name: 'Be Safe and Kind on Halloween Night',
          prayer: 'When I go out for treats I stay with my family, I look both ways before I cross, and I say "thank you" at every door. I will not scare or tease anyone in a way that hurts.',
          blessing: 'Kind and careful children make every night happy. May you be safe!',
        },
        {
          id: 'share-candy', emoji: '🍬', name: 'Sharing My Treats',
          prayer: 'Sharing makes the sweet things even sweeter. I make a firm resolution to share my treats with others and to think of children who have none.',
          blessing: 'A generous heart is the best treat of all. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'halloween-2026-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-halloween-2026-robe', name: '🎃 Pumpkin Robe', color: '#EF6C00', swatch: 'linear-gradient(135deg,#FFCC80,#EF6C00 60%,#4E342E)', pattern: 'lights', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-halloween-2026-ghostglasses', name: '👻 Friendly Ghost Glasses', kind: 'starglasses', color: '#E1BEE7', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-halloween-2026-night', name: '🦇 Midnight Bat Robe', color: '#4A148C', swatch: 'linear-gradient(135deg,#7B1FA2,#311B92 65%,#FFB300)', pattern: 'night', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-halloween-2026-lantern', name: '🎃 Jack-o-Lantern', kind: 'lantern', color: '#FB8C00', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-halloween-2026-checks', name: '🟧 Orange and Black Robe', color: '#212121', swatch: 'linear-gradient(135deg,#FB8C00 50%,#212121 50%)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-halloween-2026-moon', name: '🌕 Harvest Moon Lantern', kind: 'skylantern', color: '#FFE082', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-halloween-2026-candy', name: '🍬 Candy Robe', color: '#EC407A', swatch: 'linear-gradient(135deg,#F8BBD0,#EC407A 60%,#7B1FA2)', pattern: 'lotus', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'thanksgiving-2026',
    enabled: true,
    scene: 'thanksgiving-table',
    icon: '🦃',
    title: 'Thanksgiving: Day of Gratitude',
    tagline: 'Put your thanks on the table, say thank you to the people who help you, and send thank-you cards to friends!',
    // Fourth Thursday of November 2026 is 26 November.
    start: '2026-11-23',
    end: '2026-11-26',
    lamps: {
      perDay: 10, coins: 5, allLitBonus: 20, style: 'tap', icon: '🍂', noun: 'thank-you',
      emoji: '🍂', doneEmoji: ['🍎', '🌽', '🥧', '🍠', '🍇'],
      rewardText: 'Put {n} thank-yous on the table in total',
    },
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Say Thank You',
      button: '💛 Say Thank You',
      actionLabel: '💛 I Say Thank You',
      doneWord: 'Thank-yous',
      recipients: [
        {
          id: 'parents', emoji: '👨‍👩‍👧', name: 'Mother and Father',
          prayer: 'Dear Mother and Father, thank you for my home, my food and your love. I am grateful for everything you do for me. I will help you and make you proud.',
          blessing: 'May you be healthy and happy, and may your kind child bring you joy.',
        },
        {
          id: 'farmers', emoji: '🌾', name: 'Everyone Who Made My Food',
          prayer: 'Many people worked to bring this food to my table: farmers, drivers, shop workers and cooks. Thank you all. I will never waste my food and I will eat with a grateful heart.',
          blessing: 'A grateful heart makes every meal taste better. May no one go hungry.',
        },
        {
          id: 'teachers', emoji: '🧑‍🏫', name: 'Teachers',
          prayer: 'Dear teachers, thank you for teaching me with patience. Because of you I can read, think and learn the Dhamma. I bow to you with respect.',
          blessing: 'May your wisdom grow, and may your heart stay kind.',
        },
        {
          id: 'friends', emoji: '🧒', name: 'My Friends',
          prayer: 'Dear friends, thank you for playing with me, for helping me and for sharing. A good friend is a great blessing. I will be a good friend to you too.',
          blessing: 'May you always have true, kind friends. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'thanksgiving-2026-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-thanksgiving-2026-robe', name: '🍂 Autumn Leaves Robe', color: '#D84315', swatch: 'linear-gradient(135deg,#FFE0B2,#E65100 55%,#5D4037)', pattern: 'lotus', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-thanksgiving-2026-cornglasses', name: '🌽 Harvest Glasses', kind: 'starglasses', color: '#FDD835', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thanksgiving-2026-harvest', name: '🍎 Harvest Robe', color: '#C62828', swatch: 'linear-gradient(135deg,#FFCDD2,#C62828 60%,#FFA000)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thanksgiving-2026-lantern', name: '🕯️ Table Candle Lantern', kind: 'lantern', color: '#FFB74D', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thanksgiving-2026-gold', name: '🍁 Golden Maple Robe', color: '#EF6C00', swatch: 'linear-gradient(135deg,#FFE082,#EF6C00 60%,#BF360C)', pattern: 'lights', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-thanksgiving-2026-leaf', name: '🍂 Falling Leaf Lantern', kind: 'skylantern', color: '#FF8A65', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-thanksgiving-2026-pie', name: '🥧 Pumpkin Pie Robe', color: '#F9A825', swatch: 'linear-gradient(135deg,#FFF59D,#F9A825 60%,#8D6E63)', pattern: 'night', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'winter-2026',
    enabled: true,
    scene: 'winter-snow',
    icon: '⛄',
    title: 'Winter Festival of Giving',
    tagline: 'Light the tree of kindness, give gifts of love to your friends, and share with those in need!',
    start: '2026-12-21',
    end: '2026-12-25',
    // Ten gift boxes: tap one to light a bulb on the tree. Then give a gift to up to 10 friends a day.
    lamps: {
      perDay: 10, coins: 5, allLitBonus: 20, style: 'share', icon: '🎁', noun: 'gift',
      button: '🎁 Give a Gift', panelTitle: '🎁 Give a Gift to Friends',
      panelIntro: 'Give a gift of kindness to your friends. Each friend once a day, up to 10 friends.',
      rowButton: '🎁 Give', rowDone: '✅ Given', doneAll: 'All 10 gifts given today. Come back tomorrow! ❄️',
      receiveTitle: 'You received a gift!', receiveText: 'gave you a gift of kindness. Happy winter holidays! ⛄', receiverCoins: 2,
    },
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'Gifts of Kindness',
      button: '💝 Kind Deeds',
      actionLabel: '💝 I Promise This Kind Deed',
      doneWord: 'Kind Deeds',
      recipients: [
        {
          id: 'family', emoji: '🏠', name: 'Be Kind to My Family',
          prayer: 'The best gift for my family is my help and my kind words. I make a firm resolution: today I will help at home without being asked and I will speak gently.',
          blessing: 'A kind child makes the whole house warm in winter. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'needy', emoji: '🧣', name: 'Share With Those in Need',
          prayer: 'Winter is cold and some people have no warm coat or no warm meal. I make a firm resolution to share what I can: a coin, a toy, a coat or a kind word.',
          blessing: 'Giving is the beginning of all merit. May your gifts warm many hearts.',
        },
        {
          id: 'birds', emoji: '🐦', name: 'Care for Birds and Animals',
          prayer: 'Birds and animals find little food in the snow. I make a firm resolution to be kind to every animal, to feed the birds and never to hurt any living being.',
          blessing: 'May all animals be safe, warm and well fed.',
        },
        {
          id: 'lonely', emoji: '🤝', name: 'A Friend for the Lonely',
          prayer: 'Some children feel lonely. I make a firm resolution to smile, to say hello and to invite someone who is alone to play with me.',
          blessing: 'One kind hello can change a whole day. Sadhu! Sadhu! Sadhu!',
        },
      ],
    },
    rewards: [
      {
        id: 'winter-2026-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-winter-2026-robe', name: '⛄ Snowman Robe', color: '#1E88E5', swatch: 'linear-gradient(135deg,#FFFFFF,#90CAF9 55%,#1565C0)', pattern: 'lights', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-winter-2026-snowglasses', name: '❄️ Snowflake Glasses', kind: 'starglasses', color: '#81D4FA', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-winter-2026-tree', name: '🎄 Tree of Lights Robe', color: '#2E7D32', swatch: 'linear-gradient(135deg,#A5D6A7,#2E7D32 60%,#FFC107)', pattern: 'lights', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-winter-2026-lantern', name: '🕯️ Winter Candle Lantern', kind: 'lantern', color: '#FFCA28', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-winter-2026-scarf', name: '🧣 Cozy Scarf Robe', color: '#C62828', swatch: 'linear-gradient(135deg,#FFFFFF 50%,#C62828 50%)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-winter-2026-star', name: '⭐ Winter Star Lantern', kind: 'skylantern', color: '#FFF176', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-winter-2026-night', name: '🌌 Snowy Night Robe', color: '#283593', swatch: 'linear-gradient(135deg,#5C6BC0,#1A237E 65%,#E3F2FD)', pattern: 'night', cost: 0, festival: true } },
      ],
    },
  },
  {
    id: 'newyear-2027',
    enabled: true,
    scene: 'newyear-fireworks',
    icon: '🎆',
    title: 'Happy New Year',
    tagline: 'Launch the fireworks, make good resolutions for the new year, and send good wishes to your friends!',
    start: '2026-12-29',
    end: '2027-01-02',
    lamps: {
      perDay: 10, coins: 5, allLitBonus: 20, style: 'share', icon: '🎆', noun: 'wish',
      button: '🎉 Send Good Wishes', panelTitle: '🎉 Send Good Wishes to Friends',
      panelIntro: 'Send a New Year wish to your friends. Each friend once a day, up to 10 friends.',
      rowButton: '🎉 Send', rowDone: '✅ Sent', doneAll: 'All 10 wishes sent today. Come back tomorrow! 🎆',
      receiveTitle: 'A New Year wish for you!', receiveText: 'sent you a good wish for the new year. Happy New Year! 🎆', receiverCoins: 2,
    },
    kadaw: {
      coins: 20,
      lotus: 1,
      title: 'New Year Resolutions',
      button: '🌟 Resolutions',
      actionLabel: '🌟 I Make This Resolution',
      doneWord: 'Resolutions',
      recipients: [
        {
          id: 'kind', emoji: '💛', name: 'I Will Be Kind',
          prayer: 'In the new year I make a firm resolution: I will speak kindly, I will help others and I will send loving-kindness to everyone, even to people who are hard to love.',
          blessing: 'May your kindness grow bigger every day. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'learn', emoji: '📚', name: 'I Will Keep Learning',
          prayer: 'In the new year I make a firm resolution: I will study with all my heart, I will learn the Dhamma and I will finish my lessons every week.',
          blessing: 'May your wisdom grow like a bright new light.',
        },
        {
          id: 'meditate', emoji: '🧘', name: 'I Will Meditate',
          prayer: 'In the new year I make a firm resolution: I will sit quietly and watch my breath every day, even for a few minutes, so that my mind becomes calm and clear.',
          blessing: 'A calm mind makes the whole year peaceful. Sadhu! Sadhu! Sadhu!',
        },
        {
          id: 'grateful', emoji: '🙏', name: 'I Will Be Grateful',
          prayer: 'In the new year I make a firm resolution: I will say thank you every day to my parents, my teachers and my friends, and I will remember how lucky I am.',
          blessing: 'A grateful heart finds happiness everywhere.',
        },
      ],
    },
    rewards: [
      {
        id: 'newyear-2027-robe',
        category: 'outfit',
        requires: { type: 'lamps', count: 40 },
        item: { id: 'festival-newyear-2027-robe', name: '🎆 Fireworks Robe', color: '#4527A0', swatch: 'linear-gradient(135deg,#7E57C2,#1A1055 55%,#FFD54F)', pattern: 'night', cost: 0, festival: true },
      },
    ],
    dailyGift: {
      bonusCoins: 50,
      pool: [
        { category: 'accessory', item: { id: 'festival-newyear-2027-glasses', name: '🎉 Party Glasses', kind: 'starglasses', color: '#FF4081', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-newyear-2027-gold', name: '✨ Midnight Gold Robe', color: '#F9A825', swatch: 'linear-gradient(135deg,#FFF59D,#F9A825 60%,#1A1055)', pattern: 'lights', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-newyear-2027-lantern', name: '🎇 Sparkler Lantern', kind: 'lantern', color: '#FFD740', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-newyear-2027-confetti', name: '🎊 Confetti Robe', color: '#00ACC1', swatch: 'linear-gradient(135deg,#FF8A80 33%,#FFD740 33% 66%,#40C4FF 66%)', pattern: 'checks', cost: 0, festival: true } },
        { category: 'accessory', item: { id: 'festival-newyear-2027-sky', name: '🚀 Rocket Lantern', kind: 'skylantern', color: '#EF5350', cost: 0, festival: true } },
        { category: 'outfit', item: { id: 'festival-newyear-2027-clock', name: '🕛 Midnight Clock Robe', color: '#263238', swatch: 'linear-gradient(135deg,#78909C,#263238 65%,#FFD740)', pattern: 'lotus', cost: 0, festival: true } },
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

// Special Avatar items the teacher can give to outstanding students (from the gift box form
// in Send / Gifts). They are not tied to any festival: hidden in the wardrobe until owned.
export const SPECIAL_AWARD_ITEMS = [
  { category: 'outfit', item: { id: 'festival-special-champion', name: '🏆 Dhamma Champion Robe', color: '#FFB300', swatch: 'linear-gradient(135deg,#FFF59D,#FFB300 55%,#E65100)', pattern: 'lights', cost: 0, festival: true } },
  { category: 'outfit', item: { id: 'festival-special-scholar', name: '📜 Star Scholar Robe', color: '#3949AB', swatch: 'linear-gradient(135deg,#9FA8DA,#3949AB 55%,#FFD54F)', pattern: 'night', cost: 0, festival: true } },
  { category: 'outfit', item: { id: 'festival-special-lotus', name: '🪷 Golden Lotus Robe', color: '#EC407A', swatch: 'linear-gradient(135deg,#FCE4EC,#EC407A 55%,#FFC107)', pattern: 'lotus', cost: 0, festival: true } },
  { category: 'outfit', item: { id: 'festival-special-royal', name: '👑 Royal Purple Robe', color: '#6A1B9A', swatch: 'linear-gradient(135deg,#CE93D8,#6A1B9A 55%,#FFD54F)', pattern: 'checks', cost: 0, festival: true } },
  { category: 'outfit', item: { id: 'festival-special-diamond', name: '💎 Diamond Wisdom Robe', color: '#00ACC1', swatch: 'linear-gradient(135deg,#E0F7FA,#00ACC1 55%,#1A237E)', pattern: 'lights', cost: 0, festival: true } },
  { category: 'outfit', item: { id: 'festival-special-rainbow', name: '🌈 Rainbow Sage Robe', color: '#43A047', swatch: 'linear-gradient(135deg,#FF8A80,#FFD740 30%,#69F0AE 60%,#40C4FF)', pattern: 'checks', cost: 0, festival: true } },
  { category: 'accessory', item: { id: 'festival-special-crown', name: '👑 Golden Crown Glasses', kind: 'starglasses', color: '#FFC107', cost: 0, festival: true } },
  { category: 'accessory', item: { id: 'festival-special-wisdom', name: '💡 Wisdom Lantern', kind: 'lantern', color: '#FFEB3B', cost: 0, festival: true } },
  { category: 'accessory', item: { id: 'festival-special-star', name: '🌟 Shining Star Lantern', kind: 'skylantern', color: '#FFD54F', cost: 0, festival: true } },
];

// What a student's roster doc holds for one category after a gift item is added.
export const ownedAfterGift = (data, category, id) => {
  const now = (data && (data.avatarOwned?.[category] || data[`avatarOwned.${category}`])) || [];
  return Array.from(new Set([...now, id]));
};

// Every limited-edition Avatar item across all festivals, by category, so
// AvatarApp can draw (and list, once owned) items from festivals that have
// already closed.
export const FESTIVAL_AVATAR_ITEMS = FESTIVALS.reduce((acc, f) => {
  (f.rewards || []).forEach(r => { (acc[r.category] = acc[r.category] || []).push(r.item); });
  (f.dailyGift?.pool || []).forEach(r => { (acc[r.category] = acc[r.category] || []).push(r.item); });
  return acc;
}, {});
SPECIAL_AWARD_ITEMS.forEach(r => { (FESTIVAL_AVATAR_ITEMS[r.category] = FESTIVAL_AVATAR_ITEMS[r.category] || []).push(r.item); });

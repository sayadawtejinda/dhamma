// Festival calendar -- the ONLY file that needs editing to open, move, or
// close a festival, or to add the next one (Kathina, Waso, Water Festival,
// ...). FestivalApp.jsx reads everything it shows from here.
//
// Nothing is stored in Firestore for this on purpose: whether a festival is
// "open" is decided from the device's own date, so checking it costs zero
// reads however many students open the home page. Once `end` has passed the
// home-page button simply stops showing and the festival is gone (rewards a
// student already won stay in their Avatar wardrobe for good).
//
// Dates are local calendar days (YYYY-MM-DD), inclusive on both ends.
// `enabled: false` is the manual off-switch if a festival should be shut
// before its end date (needs a redeploy, like any code change).
export const FESTIVALS = [
  {
    id: 'thadingyut-2026',
    enabled: true,
    scene: 'lamps-night',
    icon: '🪔',
    title: 'Thadingyut Festival of Lights',
    titleMy: 'သီတင်းကျွတ် မီးထွန်းပွဲတော်',
    // Full moon of Thadingyut 2026 is taken as 26 Oct; the festival runs the
    // day before it, the day itself, and the Kadaw day after, with a few
    // days of slack either side. Move these two dates if the calendar differs.
    start: '2026-10-23',
    end: '2026-10-29',
    // Lamps scattered around the pagoda -- every student gets the same
    // `perDay` lamps again each new day; tapping one lights it for `coins`.
    lamps: { perDay: 12, coins: 5, allLitBonus: 30 },
    // Paying respect (ကန်တော့) -- once per person per day, each answered
    // with a blessing and a few coins.
    kadaw: {
      coins: 10,
      recipients: [
        {
          id: 'mother', emoji: '👩', name: 'Mother', nameMy: 'မိခင် (အမေ)',
          prayerMy: 'မေမေ့ကို ကျေးဇူးတင်ပါတယ်။ မေမေ့မေတ္တာကြောင့် ကျွန်တော်/ကျွန်မ ကြီးပြင်းလာရပါတယ်။ ကန်တော့ပါတယ် မေမေ။',
          blessingMy: 'သားသမီးလေး ကျန်းမာချမ်းသာပါစေ၊ စိတ်ချမ်းသာပါစေ၊ ပညာတော်ပါစေ။',
        },
        {
          id: 'father', emoji: '👨', name: 'Father', nameMy: 'ဖခင် (အဖေ)',
          prayerMy: 'ဖေဖေ့ကို ကျေးဇူးတင်ပါတယ်။ ဖေဖေ ပင်ပန်းခံ ကျွေးမွေးစောင့်ရှောက်ခဲ့လို့ ကျွန်တော်/ကျွန်မ ကြီးပြင်းလာရပါတယ်။ ကန်တော့ပါတယ် ဖေဖေ။',
          blessingMy: 'သားသမီးလေး ကျန်းမာချမ်းသာပါစေ၊ ဘေးရန်ကင်းပါစေ၊ လိမ္မာပါစေ။',
        },
        {
          id: 'grandparents', emoji: '👴', name: 'Grandparents', nameMy: 'ဘိုးဘွား',
          prayerMy: 'ဘိုးဘိုး ဘွားဘွားတို့ကို ကျေးဇူးတင်ပါတယ်။ ချစ်ခင်စွာ ပြုစုစောင့်ရှောက်ခဲ့လို့ ကန်တော့ပါတယ် ဘိုးဘိုး ဘွားဘွား။',
          blessingMy: 'မြေးလေး အသက်ရှည် ကျန်းမာပါစေ၊ ကောင်းမြတ်တဲ့လူ ဖြစ်ပါစေ။',
        },
        {
          id: 'teacher', emoji: '🧑‍🏫', name: 'Teacher', nameMy: 'ဆရာ',
          prayerMy: 'ပညာသင်ကြားပေးတဲ့ ဆရာ့ကို ကျေးဇူးတင်ပါတယ်။ ကန်တော့ပါတယ် ဆရာ။',
          blessingMy: 'ပညာတိုးပွားပါစေ၊ စိတ်ထားကောင်းပါစေ၊ ကောင်းကျိုးချမ်းသာတွေ ရပါစေ။',
        },
        {
          id: 'triple-gem', emoji: '🛕', name: 'The Triple Gem', nameMy: 'ရတနာသုံးပါး',
          prayerMy: 'ဗုဒ္ဓံ ပူဇေမိ၊ ဓမ္မံ ပူဇေမိ၊ သံဃံ ပူဇေမိ။ ဘုရား တရား သံဃာ ရတနာသုံးပါးကို ရိုသေစွာ ကန်တော့ပါတယ်။',
          blessingMy: 'ကုသိုလ်ကောင်းမှု အစဉ်တိုးပွားပါစေ။ သာဓု သာဓု သာဓု။',
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

const pad = (n) => String(n).padStart(2, '0');
export const localDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getActiveFestival(now = new Date()) {
  const today = localDateKey(now);
  return FESTIVALS.find(f => f.enabled && f.start <= today && today <= f.end) || null;
}

// For the teacher's preview button: the open festival if there is one, else
// the next one coming up, else the most recent one.
export function getFestivalForPreview(now = new Date()) {
  const today = localDateKey(now);
  const live = getActiveFestival(now);
  if (live) return live;
  const enabled = FESTIVALS.filter(f => f.enabled);
  const upcoming = enabled.filter(f => f.start > today).sort((a, b) => a.start.localeCompare(b.start))[0];
  return upcoming || enabled.sort((a, b) => b.end.localeCompare(a.end))[0] || null;
}

// Every limited-edition Avatar item across all festivals, by category, so
// AvatarApp can draw (and list, once owned) items from festivals that have
// already closed.
export const FESTIVAL_AVATAR_ITEMS = FESTIVALS.reduce((acc, f) => {
  (f.rewards || []).forEach(r => { (acc[r.category] = acc[r.category] || []).push(r.item); });
  return acc;
}, {});

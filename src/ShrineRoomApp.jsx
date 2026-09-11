import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { appId } from './firebaseConfig';

// A student's personal shrine room -- decorate an altar with offerings
// bought using coins, earned mainly by lighting the lamp once a day.
// Built the same way BodhiTreeApp.jsx is: a fully independent app (not
// part of TutoringApp.jsx), duplicating the small bits of attendance logic
// it needs (getWeekKey/getAttendanceStatus) rather than importing them, so
// it stands alone.

const publicDataPath = `/artifacts/${appId}/public/data`;
const SHRINE_ROSTER_PATH = 'artifacts/shrine-room-app/public/data/roster';
const sanitizeShrineKey = (key) => (key || 'unknown').replace(/[.$#/\[\]]/g, '_');

const getAttendanceStatus = (entry, sessions) => {
  if (entry.overrideStatus === 'attended') return 'attended';
  if (entry.overrideStatus === 'absent') return 'absent';
  if (entry.studentUid !== 'offline') {
    const entryDate = entry.startTime.toDate();
    const startOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    const endOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 23, 59, 59);
    const didAttend = (sessions || []).some(s => s.studentUid === entry.studentUid && s.startTime.toDate() >= startOfDay && s.startTime.toDate() <= endOfDay);
    return didAttend ? 'attended' : 'absent';
  }
  return 'absent';
};
function getWeekKey(date) {
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}
// Same week thresholds as BodhiTreeApp.jsx's title scale -- used here only
// to gate the two Bodhi-tied shrine items, not to show a title itself.
const BODHI_WEEK_MILESTONES = [1, 3, 5, 7, 9, 13, 20, 30, 40, 50];
const BODHI_MILESTONES = BODHI_WEEK_MILESTONES.map(w => w * 7);
const getBodhiStageIndex = (days) => {
  const clamped = Math.max(0, Math.min(BODHI_MILESTONES[BODHI_MILESTONES.length - 1], days));
  let idx = 0;
  for (let i = 0; i < BODHI_MILESTONES.length; i++) if (clamped >= BODHI_MILESTONES[i]) idx = i;
  return idx;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

// Audio files live at this GitHub repo, one per chant, named after the
// chant's English/Myanmar title (not the internal `title.romanized` key
// used above, which doesn't match 1:1) -- filenames contain spaces,
// parentheses, and Myanmar script, so they need percent-encoding to be a
// valid URL. Only "Offering of Water" was given as a working example; the
// rest are assumed to follow the same naming pattern in that repo.
const chantAudioUrl = (filename) => `https://raw.githubusercontent.com/nathantun93/bell/main/${encodeURIComponent(filename)}.mp3`;

// --- Chanting text, from the teacher's Chanting.md, in the 3 formats it
// was supplied in (Myanmar words spelled with English letters, Myanmar
// script, and an English meaning-translation). Order follows the
// liturgical order in that file.
const CHANT_ITEMS = [
  {
    title: { romanized: 'Yay-Taw-Kat (Offering of Water)', myanmar: 'ရေတော်ကပ်', english: 'Offering of Water (Yay-Taw-Kat)' },
    audioUrl: chantAudioUrl('Offering of Water'),
    text: {
      romanized: `Araha-tadi nawa-gunay-hi – Ara-ham a-sa-shi-thaw ko-par-thaw gun-taw-to-hnet, Sa-man-na-ga-tam – pyit-sone-taw-mu-thaw, Na-tham – lu-nat-to-e ko-kway-yar-phit-taw-mu-thaw, Buddham – thet-taw-htin-shar sab-ban-nyu-myat-swar-bu-yar-ko, Ud-dis-sa – yi-hmat-yway, Ce-ti-yas-sa – dha-tu-ce-ti, dhamma-ce-ti, ud-dis-sa-ce-ti, pa-ri-bhaw-ga ce-ti-taw-myat-arr, Sud-dha si-ta-la pa-san-nam – thant-shin-ay-mya kyi-lin-hla-thaw, Imam pa-ni-yam pa-ri-bhaw-ja-ni-yam – e-thauk-taw-yay thone-saung-taw-yay-ko, Sak-kac-cam – yo-yo-thay-thay, De-mi – Nib-ban-yi-hman hlu-dan-par-e Ashin-buyar. Pu-ze-mi – Nib-ban-ko-myaw pu-zaw-par-e Ashin-buyar.

Me – ta-pyit-taw-e, Idam pun-nyam – e-kaung-mu-the, A-sa-wak-kha-ya-wa-ham – a-tha-vaw-ta-yar lay-par-to-e kon-yar kon-kyaung-phit-thaw mag-nyan phola-nyan myat-nib-ban-ko ay-kan-yauk-aung yuet-saung-naing-the, Ho-tu – phit-par-say-tha-dee.`,
      myanmar: `အရဟတာဒိ နဝဂုဏေဟိ – အရဟံအစရှိသော ကိုးပါးသော ဂုဏ်တော်တို့နှင့်၊ သမန္နာဂတံ – ပြည့်စုံတော်မူသော၊ နာထံ – လူနတ်တို့၏ ကိုးကွယ်ရာဖြစ်တော်မူသော၊ ဗုဒ္ဓံ – သက်တော်ထင်ရှား သဗ္ဗညုမြတ်စွာဘုရားကို၊ ဥဒ္ဒိဿ – ရည်မှတ်၍၊ စေတိယဿ – ဓာတုစေတီ, ဓမ္မစေတီ, ဥဒ္ဒိဿစေတီ, ပရိဘောဂစေတီတော်မြတ်အား၊ သုဒ္ဓ,သီတလ,ပသန္နံ – သန့်ရှင်းအေးမြ ကြည်လင်လှသော၊ ဣမံ ပါနီယ ပရိဘောဇနီယံ – ဤသောက်တော်ရေ သုံးဆောင်တော်ရေကို၊ သက္ကစ္စံ – ရိုရိုသေသေ၊ ဒေမိ – နိဗ္ဗာန်ရည်မှန်း လှူဒါန်းပါ၏ အရှင်ဘုရား။ ပူဇေမိ – နိဗ္ဗာန်ကိုမျှော် ပူဇော်ပါ၏ အရှင်ဘုရား။

မေ – တပည့်တော်၏၊ ဣဒံ ပုညံ – ဤကောင်းမှုသည်၊ အာသဝက္ခယာဝဟံ – အာသဝေါတရားလေးပါးတို့၏ ကုန်ရာကုန်ကြောင်းဖြစ်သော မဂ်ဉာဏ်, ဖိုလ်ဉာဏ် မြတ်နိဗ္ဗာန်ကို ဧကန်ရောက်အောင် ရွက်ဆောင်နိုင်သည်၊ ဟောတု – ဖြစ်ပါစေသတည်း။`,
      english: `I dedicate this to the Lord Buddha, who is endowed with the nine supreme attributes such as Araham, and who is the refuge of all celestial and human beings.

I respectfully offer this pure, cool, and clear drinking and ritual water to the Most Exalted Relic Pagodas, Dhamma Pagodas, Representative Pagodas, and Pagodas of Personal Use.

Through this meritorious deed, may I attain Nibbana—the cessation of all mental defilements and the realization of the Path and Fruition Knowledge.`,
    },
  },
  {
    title: { romanized: 'Okasa (The Prayer of Worship)', myanmar: 'ဩကာသ ကန်တော့ချိုး', english: 'Okasa (The Prayer of Forgiveness & Veneration)' },
    audioUrl: chantAudioUrl('Okāsa Salutation'),
    text: {
      romanized: `Okasa, Okasa, Okasa, Kaya-kan, Waci-kan, Mano-kan, Sabba-dosa khat-thaim-thaw a-pyit-to-ko pyauk-par-say-chin a-kyo-ngar; Pa-tha-ma, Du-ti-ya, Ta-ti-ya, Tit-kyain, Hnit-kyain, Thone-kyain myauk-aung; Buyar-ya-da-na, Ta-yar-ya-da-na, Than-gha-ya-da-na, Ya-da-na-myat-thone-par-to-ko; A-yo-a-thay a-lay-a-myat let-oke-moe-yway, Shi-kho-pu-zaw phoo-myaw-man-lyawt kan-tawt-par-e Ashin-buyar.

Kan-tawt-ya-thaw a-kyo-ar-kyaung; A-pay-lay-par, Kat-thone-par, Yat-pyit-shit-par, Yan-thu-myo-ngar-par, Wi-pat-ti-ta-yar-lay-par, Byat-tha-na-ta-yar-ngar-par-to-ma khat-thaim-thaw a-kha-khat-thaim kin-lut-nyaim-the-phit-yway; Magga-ta-yar, Phola-ta-yar, Nib-ban-ta-yar-taw-myat-ko ya-par-lo-e Ashin-buyar.`,
      myanmar: `ဩကာသ, ဩကာသ, ဩကာသ, ကာယကံ, ဝစီကံ, မနောကံ သဗ္ဗဒေါသ ခပ်သိမ်းသော အပြစ်တို့ကို ပျောက်ပါစေခြင်းအကျိုးငှါ ပထမ, ဒုတိယ, တတိယ, တစ်ကြိမ်, နှစ်ကြိမ်, သုံးကြိမ် မြောက်အောင် ဘုရားရတနာ, တရားရတနာ, သံဃာရတနာ, ရတနာမြတ်သုံးပါးတို့ကို အရိုအသေ အလေးအမြတ် လက်အုပ်မိုး၍ ရှိခိုးပူဇော် ဖူးမျှော်မာန်လျှော့ ကန်တော့ပါ၏ အရှင်ဘုရား။

ကန်တော့ရသော အကျိုးအားကြောင့် အပါယ်လေးပါး, ကပ်သုံးပါး, ရပ်ပြစ်ရှစ်ပါး, ရန်သူမျိုး(၅)ပါး, ဝိပတ္တိတရား(၄)ပါး, ဗျဿနတရားငါးပါးတို့မှ အခါခပ်သိမ်း ကင်းလွတ်ငြိမ်းသည်ဖြစ်၍ မဂ်တရား, ဖိုလ်တရား, နိဗ္ဗာန်တရားတော်မြတ်ကိုရပါလို၏ အရှင်ဘုရား။`,
      english: `Permission, Permission, Permission! By way of body, speech, and mind, in order to be cleansed of all faults and mistakes, for the first, second, and third time, I pay most respectful homage to the Three Jewels: the Buddha, the Dhamma, and the Sangha, with joined palms and humble heart.

By virtue of this act of worship, may I be forever free from: the 4 Lower Realms (Apaya), the 3 Scourges (Famine, War, Epidemic), the 8 Wrong Places of Birth, the 5 Enemies (Fire, Water, Evil Rulers, Thieves, Ill-willed Heirs), the 4 Misfortunes (Vipatti), and the 5 Losses (Byassana).

And may I swiftly attain the Noble Path, Fruition, and the Supreme Bliss of Nibbana.`,
    },
  },
  {
    title: { romanized: 'Requesting the Five Precepts (Thila Taung Yan)', myanmar: 'သရဏဂုံ သီလ တောင်းရန်', english: 'Requesting the Five Precepts' },
    audioUrl: chantAudioUrl('Requesting the Five Precepts (Thila Taung Yan)'),
    text: {
      romanized: `A-ham Bhante, Ti-sa-ra-ne-na sa-ha, Pan-ca-si-lam dham-mam ya-ca-mi, A-nu-gga-ham ka-tva, Si-lam de-tha me bhante.
Du-ti-yam-pi A-ham Bhante... (same as above)
Ta-ti-yam-pi A-ham Bhante... (same as above)
Response: Ama Bhante-par Ashin-buyar.`,
      myanmar: `အဟံ ဘန္တေ တိသရဏေန သဟ ပဉ္စသီလံ ဓမ္မံ ယာစာမိ၊ အနုဂ္ဂဟံ ကတွာ သီလံ ဒေထ မေ ဘန္တေ။
ဒုတိယမ္ပိ အဟံ ဘန္တေ ---------- မေ ဘန္တေ။
တတိယမ္ပိ အဟံ ဘန္တေ --------- မေ ဘန္တေ။
အာမ ဘန္တေပါ အရှင်ဘုရား။`,
      english: `Venerable Sir, I request the Five Precepts along with the Three Refuges. Out of compassion, please grant me the Precepts. (Repeated for a second and third time)
Response: "Yes, Venerable Sir."`,
    },
  },
  {
    title: { romanized: 'Homage to the Buddha', myanmar: 'ဘုရားရှိခိုးခြင်း', english: 'Homage to the Buddha' },
    audioUrl: chantAudioUrl('The Formula of Paying Homage to the Buddha'),
    text: {
      romanized: `Namo Tassa Bhagavato Arahato Samma Sambuddhassa. (3 times)`,
      myanmar: `နမော တဿ ဘဂဝတော အရဟတော သမ္မာသမ္ဗုဒ္ဓဿ။ (၃-ကြိမ်)`,
      english: `Homage to the Blessed One, the Worthy One, the Perfectly Self-Enlightened One. (3 times)`,
    },
  },
  {
    title: { romanized: 'Taking Refuge (Sarana Gon)', myanmar: 'သရဏဂုံဆောက်တည်ခြင်း', english: 'The Three Refuges (Ti-Sarana)' },
    audioUrl: chantAudioUrl('Three Refuges'),
    text: {
      romanized: `Buddham Saranam Gacchami.
Dhammam Saranam Gacchami.
Sangham Saranam Gacchami.
Du-ti-yam-pi... (repeat for 2nd time)
Ta-ti-yam-pi... (repeat for 3rd time)
Response: Ama Bhante-par Ashin-buyar.`,
      myanmar: `ဗုဒ္ဓံ သရဏံ ဂစ္ဆာမိ။
ဓမ္မံ သရဏံ ဂစ္ဆာမိ။
သံဃံ သရဏံ ဂစ္ဆာမိ။
ဒုတိယမ္ပိ------။
တတိယမ္ပိ-----။
အာမ ဘန္တေပါ အရှင်ဘုရား။`,
      english: `1. Buddham Saranam Gacchami: I go to the Buddha for refuge.
2. Dhammam Saranam Gacchami: I go to the Dhamma for refuge.
3. Sangham Saranam Gacchami: I go to the Sangha for refuge. (Repeated for a second and third time)`,
    },
  },
  {
    title: { romanized: 'The Five Precepts (Ngar Par Thila)', myanmar: 'ငါးပါးသီလ ခံယူခြင်း', english: 'The Five Precepts (Panca-Sila)' },
    audioUrl: chantAudioUrl('Five Precepts'),
    text: {
      romanized: `1. Pa-na-ti-pa-ta Ve-ra-ma-ni sik-kha-pa-dam sa-ma-di-ya-mi.
2. A-din-na-da-na Ve-ra-ma-ni sik-kha-pa-dam sa-ma-di-ya-mi.
3. Ka-me-su-mic-cha-ca-ra Ve-ra-ma-ni sik-kha-pa-dam sa-ma-di-ya-mi.
4. Mu-sa-va-da Ve-ra-ma-ni sik-kha-pa-dam sa-ma-di-ya-mi.
5. Su-ra-me-ra-ya maj-ja-pa-ma-dat-tha-na Ve-ra-ma-ni sik-kha-pa-dam sa-ma-di-ya-mi.

Response: Ama Bhante-par Ashin-buyar.`,
      myanmar: `(၁) ပါဏာတိပါတာ ဝေရမဏိသိက္ခာပဒံ သမာဒိယာမိ။
(၂) အဒိန္နာဒါနာ ဝေရမဏိသိက္ခာပဒံ သမာဒိယာမိ။
(၃) ကာမေသုမိစ္ဆာစာရာ ဝေရမဏိသိက္ခာပဒံ သမာဒိယာမိ။
(၄) မုသာဝါဒါ ဝေရမဏိသိက္ခာပဒံ သမာဒိယာမိ။
(၅) သုရာမေရယ မဇ္ဇပမာဒဋ္ဌာနာ ဝေရမဏိသိက္ခာပဒံ သမာဒိယာမိ။
အာမ ဘန္တေပါ အရှင်ဘုရား။`,
      english: `1. I undertake the precept to abstain from killing living beings.
2. I undertake the precept to abstain from taking what is not given.
3. I undertake the precept to abstain from sexual misconduct.
4. I undertake the precept to abstain from false speech.
5. I undertake the precept to abstain from intoxicants that cause heedlessness.`,
    },
  },
  {
    title: { romanized: '9 Attributes of the Buddha', myanmar: 'ဘုရားဂုဏ်တော် ၉-ပါး', english: 'The Nine Attributes of the Buddha' },
    audioUrl: chantAudioUrl('Buddha Virtues Veneration'),
    text: {
      romanized: `Itipi so Bhagava:
1. A-ra-ham
2. Sam-ma-sam-bud-dho
3. Vij-ja-ca-ra-na-sam-pan-no
4. Su-ga-to
5. Lo-ka-vi-du
6. A-nut-ta-ro pu-ri-sa-dam-ma-sa-ra-thi
7. Sat-tha-de-va-ma-nus-sa-nam
8. Bud-dho
9. Bha-ga-va`,
      myanmar: `ဣတိပိ သော ဘဂဝါ –
(၁) အရဟံ၊ (၂) သမ္မာသမ္ဗုဒ္ဓေါ၊
(၃) ဝိဇ္ဇာစရဏသမ္ပန္နော၊ (၄) သုဂတော၊
(၅) လောကဝိဒူ၊ (၆) အနုတ္တရောပုရိသဒမ္မသာရထိ၊
(၇) သတ္ထာဒေဝမနုဿာနံ၊ (၈) ဗုဒ္ဓေါ၊
(၉) ဘဂဝါ။`,
      english: `He is the Blessed One:
1. Araham: Worthy of veneration; free from defilements.
2. Samma-Sambuddho: Perfectly Self-Enlightened.
3. Vijja-Carana-Sampanno: Perfect in knowledge and conduct.
4. Sugato: Gone to the good state (Nibbana).
5. Lokavidu: Knower of the worlds.
6. Anuttaro Purisadamma-Sarathi: Incomparable leader of those to be tamed.
7. Sattha Deva-Manussanam: Teacher of gods and humans.
8. Buddho: The Awakened One.
9. Bhagava: The Blessed One.`,
    },
  },
  {
    title: { romanized: '6 Attributes of the Dhamma', myanmar: 'တရားဂုဏ်တော် ၆-ပါး', english: 'The Six Attributes of the Dhamma' },
    audioUrl: chantAudioUrl('Dhamma Virtues Veneration'),
    text: {
      romanized: `1. Svak-kha-to Bha-ga-va-ta Dham-mo
2. San-dit-thi-ko
3. A-ka-li-ko
4. E-hi-pas-si-ko
5. O-pa-ney-yi-ko
6. Pac-cat-tam ve-di-tab-bo vin-nu-hi`,
      myanmar: `(၁) သွာက္ခာတော ဘဂဝတာ ဓမ္မော၊
(၂) သန္ဒိဋ္ဌိကော၊
(၃) အကာလိကော၊
(၄) ဧဟိ ပဿိကော၊
(၅) ဩပနေယျိကော၊
(၆) ပစ္စတ္တံ ဝေဒိတဗ္ဗော ဝိညူဟိ။`,
      english: `1. Svakkhato: Well-expounded by the Blessed One.
2. Sanditthiko: To be seen here and now.
3. Akaliko: Timeless (giving immediate results).
4. Ehi-Passiko: Inviting one to "come and see."
5. Opaneyyiko: Worthy of being followed (leading inward).
6. Paccattam Veditabbo Vinnuhi: To be realized by the wise, each for themselves.`,
    },
  },
  {
    title: { romanized: '9 Attributes of the Sangha', myanmar: 'သံဃာ့ဂုဏ်တော် ၉-ပါး', english: 'The Nine Attributes of the Sangha' },
    audioUrl: chantAudioUrl('Sangha Virtues Veneration'),
    text: {
      romanized: `1. Sup-pa-ti-pan-no Bha-ga-va-to sa-va-ka-san-gho
2. U-jup-pa-ti-pan-no Bha-ga-va-to sa-va-ka-san-gho
3. Nya-yap-pa-ti-pan-no Bha-ga-va-to sa-va-ka-san-gho
4. Sa-mi-cip-pa-ti-pan-no Bha-ga-va-to sa-va-ka-san-gho (Yad-idam cat-ta-ri pu-ri-sa-yu-ga-ni at-tha pu-ri-sa-pug-ga-la, Esa Bha-ga-va-to sa-va-ka-san-gho)
5. A-hu-ney-yo
6. Pa-hu-ney-yo
7. Dak-khi-ney-yo
8. An-ja-li-ka-ra-ni-yo
9. A-nut-ta-ram pun-nak-khet-tam lo-kas-sa.`,
      myanmar: `(၁) သုပ္ပဋိပန္နော ဘဂဝတော သာဝကသံဃော၊
(၂) ဥဇုပ္ပဋိပန္နော ဘဂဝတော သာဝကသံဃော၊
(၃) ဉာယပ္ပဋိပန္နော ဘဂဝတော သာဝကသံဃော၊
(၄) သာမီစိပ္ပဋိပန္နော ဘဂဝတော သာဝကသံဃော၊
(ယဒိဒံ စတ္တာရိ ပုရိသယုဂါနိ အဋ္ဌပုရိသပုဂ္ဂလာ၊ ဧသ ဘဂဝတော သာဝကသံဃော-)
(၅) အာဟုနေယျော၊
(၆) ပါဟုနေယျော၊
(၇) ဒက္ခိဏေယျော၊
(၈) အဉ္ဇလိကရဏီယျော၊
(၉) အနုတ္တရံ ပုညက္ခေတ္တံ လောကဿ။`,
      english: `The Disciples of the Blessed One are:
1. Suppatipanno: Practicing the good way.
2. Ujuppatipanno: Practicing the straight/upright way.
3. Nayappatipanno: Practicing the right way (to Nibbana).
4. Samicippatipanno: Practicing the proper way. They are:
5. Ahuneyyo: Worthy of gifts brought from afar.
6. Pahuneyyo: Worthy of hospitality.
7. Dakkhineyo: Worthy of offerings.
8. Anjali-Karaniyo: Worthy of respectful salutation.
9. Anuttaram Punna-Khettam Lokassa: An incomparable field of merit for the world.`,
    },
  },
  {
    title: { romanized: 'Loving Kindness (Metta)', myanmar: 'မေတ္တာပို့', english: '11 Ways of Radiating Loving-Kindness (Metta)' },
    audioUrl: chantAudioUrl('မေတ္တာပွားနည်း (၁၁)နည်း'),
    text: {
      romanized: `1. Lone sone myar swar, that ta wa, chan thar ko sait myal par say. Up pat yan bay, kin sin way, nyeim aye gya par say.
2. Kyauk tat - ma kyauk tat, hnit yat myar swar, that ta wa chan thar ko sait myal par say.
3. Myin at - ma myin at, hnit yat myar swar, that ta wa chan thar ko sait myal par say.
4. Way nay - nee nay, hnit hway myar swar, that ta wa chan thar ko sait myal par say.
5. Ba wa zat sone - ma sone myar swar, that ta wa chan thar ko sait myal par say.
6. Shay - to - a lat, thone yat khan thar that ta wa chan thar ko sait myal par say.
7. Kyi - ngyal - a lat, thone yat khan thar that ta wa chan thar ko sait myal par say.
8. Su - kyone - a lat, thone yat khan thar that ta wa chan thar ko sait myal par say.
9. Lu a chin chin, hlyat pat chin, kin shin gya par say.
10. A htin thay chin, a chin chin, kin shin gya par say.
11. Sin yal lo chin, a chin chin, kin shin gya par say.`,
      myanmar: `၁။ လုံးစုံများစွာ၊ သတ္တဝါ၊ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊ ဥပါဒ်ရန်ဘေး၊ ကင်းစင်ဝေး၊ ငြိမ်းအေးကြပါစေ။
၂။ ကြောက်တတ်-မကြောက်တတ်၊ နှစ်ရပ်များစွာ၊ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၃။ မြင်အပ်-မမြင်အပ်၊ နှစ်ရပ်များစွာ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၄။ ဝေးနေ-နီးနေ၊ နှစ်ထွေများစွာ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၅။ ဘဝဇာတ်ဆုံး-မဆုံးများစွာ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၆။ ရှည်-တို-အလတ်၊ သုံးရပ်ခန္ဓာ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၇။ ကြီး-ငယ်-အလတ်၊ သုံးရပ်ခန္ဓာ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၈။ ဆူ-ကြုံ-အလတ်၊ သုံးရပ်ခန္ဓာ သတ္တဝါ ချမ်းသာကိုယ် စိတ်မြဲပါစေ၊
၉။ လူအချင်းချင်း၊ လှည့်ပတ်ခြင်း၊ ကင်းရှင်းကြပါစေ။
၁၀။ အထင်သေးခြင်း၊ အချင်းချင်း၊ ကင်းရှင်းကြပါစေ။
၁၁။ ဆင်းရဲလိုခြင်း၊ အချင်းချင်း၊ ကင်းရှင်းကြပါစေ။`,
      english: `1. All living beings: May they be mentally happy. May they be free from harm and danger. May they be peaceful and cool.
2. Beings who are fearful and those who are fearless: May they be mentally happy.
3. Beings who are seen and those who are unseen: May they be mentally happy.
4. Beings who live far and those who live near: May they be mentally happy.
5. Beings who have reached the end of their rebirths and those who have not: May they be mentally happy.
6. Beings who are long, short, or medium-sized: May they be mentally happy.
7. Beings who are large, small, or medium-sized: May they be mentally happy.
8. Beings who are stout, thin, or medium-sized: May they be mentally happy.
9. May people be free from deceiving one another.
10. May people be free from despising (looking down on) one another.
11. May people be free from wishing ill-will or suffering upon one another.`,
    },
  },
  {
    title: { romanized: 'Share Merit', myanmar: 'အမျှဝေ', english: 'Sharing Merit' },
    audioUrl: chantAudioUrl('အမျှဝေ'),
    text: {
      romanized: `Ei-tho pyu-ya, myat pu-nyat ko, kyee-hta myint-gaung, myin-mo taung-oo, ma-ka kyoo-thar, kye-zoo a-shin, mway mi-khin hnint, hpa-khin tho-arr, ya-nyar par-say, a-mya wai-ei.
Ma-thway neit-sa, ei-ka-ya ko, saunt-hta pay-tat, ko-saunt-nat laee, ma-lat say-ya, pay-way nga-ei.
Meit-ta hsway-nyar, sa-yar tha-mar, bo-bwa ka-sa, ya-ma-ra-zar, day-wa yet-kha, ein-da bo-ma, ar-kar-tha-nat, a-htu hmat-yu, a-myat pu-nyat, ku-tha-la ko, ya-kya par-say, a-mya wai-ei.
Tha-bay that-tar, that-ta-wa hu, nar-nar law-ka, a-nan-ta twin, ma-pyat sin-kar, that-ta-wa-tha, bone ko-wa hnint, wein-nyar-na-hti-ti, te-shi khu-nhit-par, myar-swar lone-sone, bone thone-se-thit, hpyit-hpyit tha-mya, way-nay-ya-arr, a-mya ku-tho, pay-way lo-ei.
Hto ku-tha-la, ei pu-nyat ko, a-mya ya-kya-thee, hpyit-say thawt. Wa-thone-da-yay, ei myay pan-thu, the-lar-htu laee, thet-thay a-mu, te-say thawt.`,
      myanmar: `ဤသို့ပြုရ မြတ်ပုညကို ကြီးထမြင့်ခေါင်၊ မြင်းမိုရ်တောင်ဦး၊ မကကျူးသား၊ ကျေးဇူးအရှင်၊ မွေးမိခင်နှင့်၊ ဖခင်တို့အား၊ ရငြားပါစေ၊ အမျှဝေ၏၊ မသွေနိစ္စ၊ ဤကာယကို၊ စောင့်ထပေတတ်၊ ကိုယ်စောင့်နတ်လည်း၊ မလပ်စေရ၊ ပေးဝေငှ၏၊
မိတ္တဆွေညာ၊ ဆရာသမား၊ ဘိုးဘွားကစ၊ ယမရာဇာ ဒေဝါယက္ခ၊ ဣန္ဒဘုမ္မာ၊ အာကာသနတ်၊ အထူးမှတ်၍၊ အမြတ်ပုည၊ ကုသလကို၊ ရကြပါစေ၊ အမျှဝေ၏၊ သဗ္ဗေ သတ္တာ၊ သတ္တဝါဟု၊ နာနာလောက၊ အနန္တတွင်၊ မပြတ်စဉ်ကာ၊ သတ္တဝါသ ဘုံကိုးဝနှင့်၊ ဝိညာဏဌိတိ၊ တည်ရှိခုနှစ်ပါး၊ များစွာလုံးစုံ၊ ဘုံးသုံးဆယ့်တစ်၊ ဖြစ်ဖြစ်သမျှ၊ ဝေနေယျအား၊ အမျှကုသိုလ်၊ ပေးဝေလို၏၊ ထိုကုသလ၊ ဤပုညကို အမျှရကြသည်၊ ဖြစ်စေသော်၊ ဝသုန္ဓရေ၊ ဤမြေပံသု၊ သိလာထုလည်း၊ သက်သေအမှု၊ တည်စေသော်။`,
      english: `By the power of this noble deed, may the merit I have gained be shared with my beloved parents, whose kindness is greater and more sublime than the heights of Mount Meru.
I also share this merit with my Guardian Spirit (the Nat who protects this body), ensuring they are never overlooked.
To my friends and relatives, teachers, and grandparents; to Yama (King of the Underworld), the Devas, the Ogres, and the spirits of the Earth and Sky—may you all specifically receive and partake in this noble merit.
To all sentient beings existing throughout the infinite universes—dwelling in the Nine Abodes of beings, the Seven Stations of consciousness, and across all Thirty-One Planes of existence—I share this merit with every one of you.
May all beings receive an equal share of this merit. Let the Great Earth and the solid rocks of this world stand as my eternal witness.`,
    },
  },
];

// --- Buddha statue artwork: Myanmar-style seated meditation figure with
// visible crossed legs, hands resting in dhyana mudra, a flame-tip
// ushnisha, elongated ears, a soft halo, and a lotus base with petals --
// one shared silhouette recolored per statue material. ---
const buddhaSvg = (skinColor, robeColor, baseColor, haloColor, accentColor) => `
  <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="62" r="50" fill="${haloColor}" opacity="0.35"/>
    <g fill="${baseColor}">
      <ellipse cx="100" cy="218" rx="75" ry="12"/>
      <path d="M32,218 Q50,196 66,218 Z"/>
      <path d="M60,218 Q78,192 96,218 Z"/>
      <path d="M104,218 Q122,192 140,218 Z"/>
      <path d="M134,218 Q150,196 168,218 Z"/>
    </g>
    <path d="M45,206 C40,178 55,158 100,158 C145,158 160,178 155,206
             C150,214 130,208 130,196 C130,186 118,182 100,182
             C82,182 70,186 70,196 C70,208 50,214 45,206 Z" fill="${robeColor}"/>
    <path d="M100,80 C72,88 60,116 62,158 L138,158 C140,116 128,88 100,80 Z" fill="${robeColor}"/>
    <path d="M100,90 L100,155" stroke="${baseColor}" stroke-width="2" opacity="0.5"/>
    <path d="M62,145 C50,148 44,158 46,172 L60,172 Z" fill="${robeColor}"/>
    <path d="M138,145 C150,148 156,158 154,172 L140,172 Z" fill="${robeColor}"/>
    <ellipse cx="100" cy="176" rx="17" ry="8" fill="${skinColor}"/>
    <circle cx="88" cy="176" r="6" fill="${skinColor}"/>
    <circle cx="112" cy="176" r="6" fill="${skinColor}"/>
    <rect x="91" y="70" width="18" height="16" fill="${skinColor}"/>
    <path d="M70,50 C60,56 60,74 70,79" stroke="${skinColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M130,50 C140,56 140,74 130,79" stroke="${skinColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="52" r="28" fill="${skinColor}"/>
    <path d="M86,50 Q92,47 98,50" stroke="${accentColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M102,50 Q108,47 114,50" stroke="${accentColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M100,24 C92,24 88,14 94,4 C96,10 100,10 100,4 C100,10 104,10 106,4 C112,14 108,24 100,24 Z" fill="${skinColor}"/>
    <circle cx="100" cy="56" r="1.8" fill="${accentColor}"/>
  </svg>
`;

// --- Shop catalog ---
const BUDDHA_OPTIONS = [
  { id: 'wood', name: 'Wooden Buddha', cost: 0, requiresBodhiStage: 0, svg: buddhaSvg('#8D6E63', '#5D4037', '#4E342E', '#D7CCC8', '#3E2723') },
  { id: 'golden', name: 'Golden Buddha', cost: 30, requiresBodhiStage: 0, svg: buddhaSvg('#FFD54F', '#FFA000', '#FF8F00', '#FFF3C4', '#8D5A00') },
  { id: 'jade', name: 'Jade Buddha', cost: 25, requiresBodhiStage: 5, svg: buddhaSvg('#66BB6A', '#2E7D32', '#1B5E20', '#C8E6C9', '#0D3D14') },
];
// Custom-drawn golden ceremonial umbrella (hti) -- the ⛱️ emoji looked like
// a beach umbrella, not a Buddhist offering, so this replaces it: a domed
// canopy with a finial and hanging tassels/bells around the rim.
const umbrellaSvg = (canopyColor, poleColor, accentColor) => `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <line x1="50" y1="30" x2="50" y2="90" stroke="${poleColor}" stroke-width="3"/>
    <circle cx="50" cy="18" r="4" fill="${accentColor}"/>
    <path d="M50,18 L50,30" stroke="${poleColor}" stroke-width="2"/>
    <path d="M15,38 Q50,10 85,38 Q75,32 50,32 Q25,32 15,38 Z" fill="${canopyColor}" stroke="${accentColor}" stroke-width="1"/>
    <path d="M15,38 Q50,48 85,38" fill="none" stroke="${accentColor}" stroke-width="1.5"/>
    <g stroke="${accentColor}" stroke-width="1.5">
      <line x1="20" y1="40" x2="18" y2="50"/>
      <line x1="35" y1="44" x2="34" y2="54"/>
      <line x1="50" y1="45" x2="50" y2="56"/>
      <line x1="65" y1="44" x2="66" y2="54"/>
      <line x1="80" y1="40" x2="82" y2="50"/>
    </g>
    <g fill="${accentColor}">
      <circle cx="18" cy="52" r="2"/>
      <circle cx="34" cy="56" r="2"/>
      <circle cx="50" cy="58" r="2"/>
      <circle cx="66" cy="56" r="2"/>
      <circle cx="82" cy="52" r="2"/>
    </g>
  </svg>
`;

// durationHours: how long the offering stays on the altar before it
// "runs out" (candle burns down, water/fruit spoil, flowers wilt, an
// umbrella lasts a full day) and needs to be re-offered -- per the
// teacher's direction. Cost scales with durationHours (roughly 3 + 1.5
// coins/hour, adjustable). Items with no durationHours (lamp/bell/canopy)
// are permanent fixtures, not consumable offerings.
const OFFERING_OPTIONS = [
  { id: 'candle', name: 'Candle', emoji: '🕯️', durationHours: 1, cost: 5 },
  { id: 'water', name: 'Water Offering', emoji: '🥛', durationHours: 2, cost: 6 },
  { id: 'fruit', name: 'Fruit Offering', emoji: '🍊', durationHours: 3, cost: 8 },
  { id: 'flower', name: 'Lotus Flower', emoji: '🪷', durationHours: 10, cost: 18 },
  { id: 'umbrella', name: 'Golden Umbrella', svg: umbrellaSvg('#FFD54F', '#5D4037', '#B8860B'), durationHours: 24, cost: 39 },
  { id: 'lamp', name: 'Oil Lamp', emoji: '🪔', cost: 15 },
  { id: 'bell', name: 'Bell', emoji: '🔔', cost: 20 },
  { id: 'canopy', name: 'Golden Canopy', emoji: '🎐', cost: 25, requiresBodhiStage: 9 },
];
// Renders an offering's icon whether it's a plain emoji or custom SVG
// artwork (only the umbrella uses SVG so far).
const OfferingIcon = ({ offering, className }) =>
  offering.svg
    ? <span className={className} dangerouslySetInnerHTML={{ __html: offering.svg }} />
    : <span className={className}>{offering.emoji}</span>;
const ALL_OFFERING_IDS = OFFERING_OPTIONS.map(o => o.id);
const findOffering = (id) => OFFERING_OPTIONS.find(o => o.id === id);
const findBuddha = (id) => BUDDHA_OPTIONS.find(o => o.id === id);

const SLOT_COUNT = 6;
const STARTER_COINS = 20;
const DAILY_LAMP_REWARD = 5;
// Small merit bonus paid on top of an offering's cost -- the act of
// donating is itself rewarded, per the teacher's direction.
const MERIT_OFFERING_BONUS = 2;
// Re-opened for real trial use per the teacher's direction: students can
// spend coins now to help find what still needs adjusting, understanding
// coin balances will get reset once the app is finalized (not implemented
// yet -- add a reset step here when that day comes). Flip back to true if
// spending needs to be paused again before then.
const SHOP_LOCKED = false;

function playBellSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 2);
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 2);
  } catch (e) { /* ignore -- e.g. no AudioContext support */ }
}

// Fractal Bodhi tree drawn once as a static backdrop (purely decorative --
// unlike BodhiTreeApp.jsx's canvas, this one doesn't grow with attendance).
// Root cause of the "just a bare trunk, no branches" bug this used to have:
// its containing div used a percentage width (w-full) as a flex item
// inside a chain of nested flex containers using align-items:center --
// confirmed via getBoundingClientRect() that this resolved to width:0
// (height was fine). Fixed at the source by giving that div a fixed pixel
// width instead of a percentage one (see its className below). Sizing here
// still uses a ResizeObserver rather than measuring the parent once at
// mount, since that's more robust in general (fires once the browser has
// an actual settled size for the element, and again any time it changes).
function BodhiBackdropCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw(cssWidth, cssHeight) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      function drawBranch(len, angle, depth) {
        ctx.beginPath();
        ctx.save();
        ctx.strokeStyle = '#5D4037';
        ctx.fillStyle = '#2E7D32';
        ctx.lineWidth = Math.max(1.5, 12 * (len / 80));
        ctx.rotate((angle * Math.PI) / 180);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len);
        ctx.stroke();
        ctx.translate(0, -len);
        if (len < 8) {
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }
        drawBranch(len * 0.75, 25, depth + 1);
        drawBranch(len * 0.75, -25, depth + 1);
        ctx.restore();
      }

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.save();
      ctx.translate(cssWidth / 2, cssHeight);
      drawBranch(75, 0, 0);
      ctx.restore();
    }

    // Draw immediately with whatever size is available right now (guards
    // against the ResizeObserver's first callback landing a frame or two
    // late and the tree being invisible/wrong until something else -- like
    // buying enough offerings to trigger a later layout change -- happens
    // to nudge a resize), then let the observer correct it once the real
    // settled size is known and keep it correct if the size ever changes.
    const immediateRect = canvas.parentElement.getBoundingClientRect();
    if (immediateRect.width > 0 && immediateRect.height > 0) {
      draw(immediateRect.width, immediateRect.height);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) draw(width, height);
    });
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-70" />;
}

export default function ShrineRoomApp({ entryRequest, onExit }) {
  const isTeacherPreview = !entryRequest?.studentUid;
  const studentUid = entryRequest?.studentUid;
  const studentName = entryRequest?.studentName || 'Friend';
  const [loading, setLoading] = useState(true);
  // Teacher preview mode has no roster doc to load from (nothing persists),
  // so it starts with enough coins to freely try every shop item instead of
  // being stuck at 0.
  const [coinBalance, setCoinBalance] = useState(isTeacherPreview ? 200 : 0);
  const [placedItems, setPlacedItems] = useState({}); // { slotIndex: offeringId }
  const [buddhaId, setBuddhaId] = useState(null);
  const [lastLampLitDate, setLastLampLitDate] = useState(null);
  // Teacher preview also gets full access to the two Bodhi-tree-gated items
  // (there's no real attendance to compute a stage from).
  const [bodhiStageIndex, setBodhiStageIndex] = useState(isTeacherPreview ? BODHI_MILESTONES.length - 1 : 0);
  const [shopOpen, setShopOpen] = useState(false);
  const [chantingOpen, setChantingOpen] = useState(false);
  const [chantFormat, setChantFormat] = useState('romanized'); // 'romanized' | 'myanmar' | 'english'
  // Custom drag-to-resize instead of the CSS `resize` property: the panel
  // is anchored via `right` (fixed distance from the screen's right edge)
  // with no `left`, so native corner resize grows the box by extending its
  // left edge while its own bottom-right corner (where the browser draws
  // the resize handle) stays visually pinned in place -- the handle never
  // tracks the cursor, so dragging it does nothing the user can see. This
  // handle instead widens the panel by growing towards the left directly,
  // which is the one direction that actually has room on screen.
  const [chantPanelWidth, setChantPanelWidth] = useState(320);
  const chantResizeRef = useRef({ startX: 0, startWidth: 320 });
  const handleChantResizeStart = (e) => {
    e.preventDefault();
    chantResizeRef.current = { startX: e.clientX, startWidth: chantPanelWidth };
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const onMove = (moveEvent) => {
      const delta = chantResizeRef.current.startX - moveEvent.clientX;
      // Capped well short of covering the altar/Buddha on the left --
      // this panel stays a side panel, not a takeover, even at its widest.
      const maxWidth = Math.min(480, window.innerWidth * 0.5);
      const next = Math.min(maxWidth, Math.max(288, chantResizeRef.current.startWidth + delta));
      setChantPanelWidth(next);
    };
    const onUp = () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const [chantIndex, setChantIndex] = useState(0);
  const [chantAudioPlaying, setChantAudioPlaying] = useState(false);
  const [chantAudioError, setChantAudioError] = useState(false);
  const chantAudioRef = useRef(null);
  // Meditation: opt-in via its own button (not a mandatory splash on
  // entry). A student picks a duration (1-60 min, typed in, not just
  // presets), the shrine glows with radiating color while they sit, and
  // only once the countdown finishes naturally is that many minutes added
  // to their persisted lifetime total -- no coin reward yet (the teacher's
  // still deciding what that should be). Leaving early (🏡 Home, or the
  // component unmounting any other way) credits nothing, same as before.
  const [meditationPickerOpen, setMeditationPickerOpen] = useState(false);
  const [meditationMinutesInput, setMeditationMinutesInput] = useState('10');
  const [meditatingMinutes, setMeditatingMinutes] = useState(null);
  const [meditationRemainingSeconds, setMeditationRemainingSeconds] = useState(0);
  const [totalMeditationMinutes, setTotalMeditationMinutes] = useState(0);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [ringing, setRinging] = useState(false);
  const [toast, setToast] = useState(null);

  const rosterRef = studentUid ? doc(db, SHRINE_ROSTER_PATH, sanitizeShrineKey(studentName)) : null;

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };

  const persist = (patch) => {
    if (!rosterRef) return;
    setDoc(rosterRef, { studentName, ...patch }, { merge: true }).catch(() => {});
  };

  useEffect(() => {
    if (!studentUid) { setLoading(false); return; }
    let isMounted = true;
    (async () => {
      try {
        const [rosterSnap, scheduleSnap, sessionsSnap] = await Promise.all([
          rosterRef ? getDoc(rosterRef) : Promise.resolve(null),
          getDocs(query(collection(db, `${publicDataPath}/teacherSchedule`), where('studentUid', '==', studentUid))),
          getDocs(query(collection(db, `${publicDataPath}/studySessions`), where('studentUid', '==', studentUid))),
        ]);

        const schedule = scheduleSnap.docs.map(d => d.data());
        const sessions = sessionsSnap.docs.map(d => d.data());
        const now = new Date();
        const attendedWeeks = new Set(
          schedule
            .filter(e => e.endTime?.toDate?.() < now && getAttendanceStatus(e, sessions) === 'attended')
            .map(e => getWeekKey(e.startTime.toDate()))
        );
        if (isMounted) setBodhiStageIndex(getBodhiStageIndex(attendedWeeks.size * 7));

        if (rosterSnap && rosterSnap.exists()) {
          const data = rosterSnap.data();
          if (isMounted) {
            setCoinBalance(data.coinBalance ?? STARTER_COINS);
            setPlacedItems(data.placedItems || {});
            setBuddhaId(data.buddhaId || null);
            setLastLampLitDate(data.lastLampLitDate || null);
            setTotalMeditationMinutes(data.totalMeditationMinutes || 0);
          }
          if (data.coinBalance == null) persist({ coinBalance: STARTER_COINS });
        } else {
          // Starter balance only -- Smart Study coins no longer get pulled
          // in automatically. Students now deposit those themselves by
          // clicking their coin count in Smart Study and confirming.
          if (isMounted) setCoinBalance(STARTER_COINS);
          persist({ coinBalance: STARTER_COINS, placedItems: {}, buddhaId: null });
        }
      } catch (e) {
        console.error('Error loading Shrine Room data:', e);
      }
      if (isMounted) setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [studentUid]);

  const awardCoins = (delta) => {
    setCoinBalance(prev => {
      const next = Math.max(0, prev + delta);
      persist({ coinBalance: next });
      return next;
    });
  };

  const handleBuyBuddha = (option) => {
    if (SHOP_LOCKED) { showToast('🚧 Shopping opens soon -- still being built!'); return; }
    if (option.requiresBodhiStage > bodhiStageIndex) {
      showToast(`Grow your Bodhi Tree further to unlock this.`);
      return;
    }
    if (buddhaId === option.id) return;
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    awardCoins(-option.cost);
    setBuddhaId(option.id);
    persist({ buddhaId: option.id });
    showToast(`${option.name} placed on the altar.`);
  };

  const handleBuyOffering = (option) => {
    if (SHOP_LOCKED) { showToast('🚧 Shopping opens soon -- still being built!'); return; }
    if (option.requiresBodhiStage != null && option.requiresBodhiStage > bodhiStageIndex) {
      showToast(`Grow your Bodhi Tree further to unlock this.`);
      return;
    }
    // A slot counts as empty if it's unset OR holds a stale entry whose
    // offering id no longer exists (e.g. left over from a since-renamed/
    // removed offering) -- that stale data renders as an empty-looking
    // dashed box (see the offering && ... check below) but was still
    // treated as "occupied" here, silently skipping straight past those
    // slots to the next real empty one every time.
    const emptySlot = Array.from({ length: SLOT_COUNT }).findIndex((_, i) => !placedItems[i] || !findOffering(placedItems[i].id));
    if (emptySlot === -1) { showToast('Your altar is full -- remove something first.'); return; }
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    awardCoins(MERIT_OFFERING_BONUS - option.cost);
    setPlacedItems(prev => {
      const next = { ...prev, [emptySlot]: { id: option.id, placedAt: Date.now() } };
      persist({ placedItems: next });
      return next;
    });
    showToast(`${option.name} placed on your altar. +${MERIT_OFFERING_BONUS} merit coins!`);
  };

  const handleRemoveItem = (slotIndex) => {
    setPlacedItems(prev => {
      const next = { ...prev };
      delete next[slotIndex];
      persist({ placedItems: next });
      return next;
    });
  };

  const handleDragStart = (e, offeringId) => {
    e.dataTransfer.setData('text/plain', offeringId);
  };
  // Dragging a shop item onto a slot still has to pay for it -- this used
  // to skip handleBuyOffering entirely and place the item for free, the
  // same coin/lock checks as a click-to-buy have to happen here too.
  const handleDrop = (e, slotIndex) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (SHOP_LOCKED) { showToast('🚧 Shopping opens soon -- still being built!'); return; }
    const offeringId = e.dataTransfer.getData('text/plain');
    const option = findOffering(offeringId);
    // Same stale-entry handling as handleBuyOffering's emptySlot search.
    if (!option || (placedItems[slotIndex] && findOffering(placedItems[slotIndex].id))) return;
    if (option.requiresBodhiStage != null && option.requiresBodhiStage > bodhiStageIndex) {
      showToast(`Grow your Bodhi Tree further to unlock this.`);
      return;
    }
    if (coinBalance < option.cost) { showToast('Not enough coins.'); return; }
    awardCoins(MERIT_OFFERING_BONUS - option.cost);
    setPlacedItems(prev => {
      const next = { ...prev, [slotIndex]: { id: offeringId, placedAt: Date.now() } };
      persist({ placedItems: next });
      return next;
    });
    showToast(`${option.name} placed on your altar. +${MERIT_OFFERING_BONUS} merit coins!`);
    if (offeringId === 'bell') { playBellSound(); setRinging(true); setTimeout(() => setRinging(false), 1200); }
  };

  const hasLampPlaced = Object.values(placedItems).some(item => item.id === 'lamp');
  const canLightLampToday = hasLampPlaced && lastLampLitDate !== todayKey();

  const handleLightLamp = () => {
    if (!canLightLampToday) return;
    const key = todayKey();
    setLastLampLitDate(key);
    persist({ lastLampLitDate: key });
    awardCoins(DAILY_LAMP_REWARD);
    showToast(`🪔 Lamp lit! +${DAILY_LAMP_REWARD} coins.`);
  };

  const handleRingBell = () => {
    if (!Object.values(placedItems).some(item => item.id === 'bell')) return;
    playBellSound();
    setRinging(true);
    setTimeout(() => setRinging(false), 1200);
  };

  // Consumable offerings (candle/water/fruit/flower/umbrella) "run out" once
  // their durationHours has passed and quietly leave the altar -- per the
  // teacher's direction that each offering only stays in front of the
  // Buddha for a set amount of time. Checked once a minute; lamp/bell/
  // canopy have no durationHours so they're never touched here.
  useEffect(() => {
    const checkExpiry = () => {
      setPlacedItems(prev => {
        const now = Date.now();
        let changed = false;
        const next = {};
        Object.entries(prev).forEach(([slot, item]) => {
          const option = findOffering(item.id);
          const expired = option?.durationHours != null && (now - item.placedAt) >= option.durationHours * 60 * 60 * 1000;
          if (expired) { changed = true; return; }
          next[slot] = item;
        });
        if (changed) persist({ placedItems: next });
        return changed ? next : prev;
      });
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleChantAudio = () => {
    const audio = chantAudioRef.current;
    if (!audio) return;
    if (chantAudioPlaying) { audio.pause(); return; }
    audio.currentTime = 0;
    audio.play().catch(() => setChantAudioError(true));
  };

  // Stop and reset audio whenever the chant changes (Next/Previous) or the
  // panel closes, so a track never keeps playing into the wrong chant.
  useEffect(() => {
    setChantAudioPlaying(false);
    setChantAudioError(false);
    if (chantAudioRef.current) { chantAudioRef.current.pause(); chantAudioRef.current.currentTime = 0; }
  }, [chantIndex, chantingOpen]);

  const handleStartMeditation = () => {
    const minutes = Math.max(1, Math.min(60, parseInt(meditationMinutesInput, 10) || 10));
    setMeditationPickerOpen(false);
    setMeditatingMinutes(minutes);
    setMeditationRemainingSeconds(minutes * 60);
  };

  // Only reaching 0 naturally adds to the persisted total -- leaving early
  // (this effect's cleanup fires on unmount, e.g. pressing 🏡 Home) just
  // stops the countdown with nothing credited, same idea as before.
  useEffect(() => {
    if (meditatingMinutes == null) return;
    if (meditationRemainingSeconds <= 0) {
      setTotalMeditationMinutes(prev => {
        const next = prev + meditatingMinutes;
        persist({ totalMeditationMinutes: next });
        return next;
      });
      showToast(`🧘 Meditation complete -- ${meditatingMinutes} minutes added to your total.`);
      setMeditatingMinutes(null);
      return;
    }
    const timer = setTimeout(() => setMeditationRemainingSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [meditatingMinutes, meditationRemainingSeconds]);

  const buddha = findBuddha(buddhaId);
  const dimmed = hasLampPlaced && lastLampLitDate === todayKey();

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 pt-6 pb-16 transition-colors duration-1000 ${dimmed ? 'bg-gradient-to-b from-indigo-200 via-amber-100 to-amber-200' : 'bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100'}`}>
      {meditatingMinutes != null && (
        <style>{`
          @keyframes shrineAuraPulse { 0%, 100% { opacity: 0.35; transform: translateX(-50%) scale(1); } 50% { opacity: 0.65; transform: translateX(-50%) scale(1.18); } }
          @keyframes shrineSparkleRise { 0% { opacity: 0; transform: translateY(0) scale(0.4); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-150px) scale(1); } }
        `}</style>
      )}
      <button
        onClick={onExit}
        className="fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gray-800 text-white rounded-full shadow-lg text-2xl hover:bg-gray-900"
        aria-label="Back to Tutoring Dashboard"
      >
        🏡
      </button>

      <div className="fixed top-3 right-3 z-50 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg border border-amber-200">
          <span className="font-bold text-amber-700">🪙 {coinBalance}</span>
        </div>
        {meditatingMinutes != null && (
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full shadow border border-indigo-200 text-xs font-semibold text-indigo-700">
            🧘 {String(Math.floor(meditationRemainingSeconds / 60)).padStart(2, '0')}:{String(meditationRemainingSeconds % 60).padStart(2, '0')} left
          </div>
        )}
        {(() => {
          const chantingBtn = (
            <button
              key="chanting"
              onClick={() => setChantingOpen(true)}
              className="flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-2 rounded-full shadow-lg border-2 border-amber-300"
            >
              🙏 Chanting
            </button>
          );
          const meditationBtn = (
            <button
              key="meditation"
              onClick={() => setMeditationPickerOpen(true)}
              disabled={meditatingMinutes != null}
              className="flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-2 rounded-full shadow-lg border-2 border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧘 Meditation
            </button>
          );
          const shopBtn = (
            <button
              key="shop"
              onClick={() => setShopOpen(prev => !prev)}
              className="flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-2 rounded-full shadow-lg border-2 border-amber-300"
            >
              {shopOpen ? '✕ Close Shop' : '🛒 Merit Shop'}
            </button>
          );
          // While the shop is open, Chanting/Meditation move below it
          // instead of above -- keeps the shop button anchored right under
          // the coin badge, closest to where the shop panel itself opens.
          return shopOpen ? [shopBtn, chantingBtn, meditationBtn] : [chantingBtn, meditationBtn, shopBtn];
        })()}
      </div>


      {/* Meditation duration picker -- a typed number (1-60), not presets. */}
      {meditationPickerOpen && (
        <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4" onClick={() => setMeditationPickerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-emerald-800 mb-1">🧘 Meditation</h2>
            <p className="text-sm text-gray-500 mb-4">How many minutes will you meditate?</p>
            <input
              type="number"
              min="1"
              max="60"
              value={meditationMinutesInput}
              onChange={(e) => setMeditationMinutesInput(e.target.value)}
              className="w-full text-center text-2xl font-bold border-2 border-emerald-200 rounded-xl py-2 mb-4 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-400 mb-4">Total so far: {totalMeditationMinutes} minutes</p>
            <button
              onClick={handleStartMeditation}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl"
            >
              Begin
            </button>
          </div>
        </div>
      )}

      {/* Chanting -- a fixed side panel (same idea as the Merit Shop panel),
          not a centered popup: on a computer/iPad it used to sit right on
          top of the Buddha image, which the teacher pointed out is a real
          problem for anyone chanting while looking at the statue. Anchored
          right so the altar stays visible on the left; a phone held
          landscape has enough room for both too. */}
      {chantingOpen && (() => {
        const chant = CHANT_ITEMS[chantIndex];
        return (
          <div
            className="fixed top-20 right-3 z-[10000] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border-2 border-amber-200 flex flex-col"
            style={{ width: `${chantPanelWidth}px` }}
          >
            {/* Drag left to widen -- see handleChantResizeStart for why this
                is a custom handle instead of the CSS resize property. */}
            <div
              onMouseDown={handleChantResizeStart}
              className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center group z-10"
              title="Drag to resize"
            >
              <div className="w-1 h-10 rounded-full bg-amber-300 group-hover:bg-amber-500 transition-colors" />
            </div>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-amber-700">🙏 Chanting</h2>
              <button onClick={() => setChantingOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="flex gap-1 px-4 pt-3">
              {[
                { key: 'romanized', label: 'Roman' },
                { key: 'myanmar', label: 'မြန်မာ' },
                { key: 'english', label: 'English' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setChantFormat(f.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${chantFormat === f.key ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-bold text-emerald-800 mb-1">{chant.title[chantFormat]}</h3>
              <p className="text-xs text-gray-400 mb-3">{chantIndex + 1} / {CHANT_ITEMS.length}</p>
              <audio
                ref={chantAudioRef}
                src={chant.audioUrl}
                onEnded={() => setChantAudioPlaying(false)}
                onPlay={() => setChantAudioPlaying(true)}
                onPause={() => setChantAudioPlaying(false)}
                onError={() => setChantAudioError(true)}
              />
              <button
                onClick={handleToggleChantAudio}
                disabled={chantAudioError}
                title={chantAudioError ? 'Audio not available yet' : ''}
                className={`mb-3 flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg ${chantAudioError ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'}`}
              >
                {chantAudioError ? '🔇 Audio not available' : chantAudioPlaying ? '⏸ Pause audio' : '🔊 Play audio'}
              </button>
              <p className={`whitespace-pre-line leading-relaxed text-gray-800 ${chantFormat === 'myanmar' ? 'font-medium' : ''}`}>
                {chant.text[chantFormat]}
              </p>
            </div>

            <div className="flex justify-between items-center p-4 border-t">
              <button
                onClick={() => setChantIndex(i => Math.max(0, i - 1))}
                disabled={chantIndex === 0}
                className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => setChantIndex(i => Math.min(CHANT_ITEMS.length - 1, i + 1))}
                disabled={chantIndex === CHANT_ITEMS.length - 1}
                className="px-4 py-2 rounded-lg font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        );
      })()}

      <h1 className="text-2xl font-bold text-emerald-800 mt-16 mb-1 text-center relative z-10">{studentName}'s Shrine Room</h1>
      <p className="text-emerald-600 text-sm mb-6 relative z-10">🙏 Decorate your own altar and make daily offerings</p>

      {loading ? (
        <p className="text-emerald-700 relative z-10">Loading your shrine...</p>
      ) : (
        <div className="relative z-10 flex flex-col lg:flex-row gap-6 w-full max-w-4xl items-center lg:items-start justify-center">
          <div className="flex flex-col items-center flex-shrink-0">
            {/* Explicit pixel width (not w-full/percentage) -- this div is a
                flex item inside a chain of nested flex containers using
                items-center for cross-axis alignment, which left a
                percentage width resolving to 0 (confirmed via
                getBoundingClientRect() live: width:0, height:384 -- the
                canvas backdrop tree drew at the wrong scale as a result). */}
            <div className="relative w-[360px] max-w-full h-96">
              <BodhiBackdropCanvas />

              {meditatingMinutes != null && buddha && (
                <div className="absolute left-1/2 bottom-24 pointer-events-none" style={{ width: 0, height: 0 }}>
                  <div
                    className="absolute rounded-full"
                    style={{
                      left: '50%', bottom: 0, transform: 'translateX(-50%)',
                      width: 220, height: 220,
                      background: 'radial-gradient(circle, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0.25) 40%, rgba(251,191,36,0) 70%)',
                      animation: 'shrineAuraPulse 3.2s ease-in-out infinite',
                    }}
                  />
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="absolute rounded-full bg-amber-200"
                      style={{
                        left: `${-40 + i * 16}px`, bottom: '10px',
                        width: 5, height: 5,
                        boxShadow: '0 0 6px 2px rgba(253,230,138,0.9)',
                        animation: `shrineSparkleRise ${2.4 + (i % 3) * 0.5}s ease-in ${i * 0.4}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-32 rounded-t-2xl border-4 border-amber-700 shadow-xl flex items-end justify-center pb-3"
                style={{ background: 'linear-gradient(to bottom, #fde68a, #d4af37)' }}
              >
                {buddha ? (
                  <div
                    className={`w-24 h-28 -mt-20 drop-shadow-lg ${ringing ? 'animate-pulse' : ''}`}
                    dangerouslySetInnerHTML={{ __html: buddha.svg }}
                  />
                ) : (
                  <button
                    onClick={() => setShopOpen(true)}
                    className="mb-2 text-xs font-semibold text-amber-800 bg-white/70 hover:bg-white px-3 py-2 rounded-lg border border-dashed border-amber-600"
                  >
                    🛒 Open the shop to pick a Buddha image
                  </button>
                )}
              </div>
            </div>

            {shopOpen ? (
              // Shopping mode -- every slot shown (including empty ones) as
              // a drop target, and placed items get a remove (×) button.
              <div className="grid grid-cols-6 gap-2 -mt-4 z-10">
                {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                  const offeringId = placedItems[i]?.id;
                  const offering = offeringId ? findOffering(offeringId) : null;
                  return (
                    <div
                      key={i}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSlot(i); }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={(e) => handleDrop(e, i)}
                      onClick={() => { if (offeringId === 'bell') handleRingBell(); }}
                      className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center text-2xl relative
                        ${dragOverSlot === i ? 'border-emerald-500 bg-emerald-50 scale-105' : offering ? 'border-solid border-amber-300 bg-white shadow-sm' : 'border-dashed border-amber-400 bg-white/60'}
                        ${offering?.id === 'lamp' && lastLampLitDate === todayKey() ? 'animate-pulse' : ''}
                        transition-transform`}
                      title={offering ? offering.name : 'Empty slot'}
                    >
                      {offering && <OfferingIcon offering={offering} className="w-8 h-8 flex items-center justify-center text-2xl" />}
                      {offering && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveItem(i); }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center shadow"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Display mode -- only occupied slots, no border/remove
              // button, so an empty or half-full altar doesn't look cluttered
              // with dashed placeholders.
              Object.keys(placedItems).length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 -mt-4 z-10">
                  {Object.entries(placedItems).map(([i, item]) => {
                    const offeringId = item.id;
                    const offering = findOffering(offeringId);
                    if (!offering) return null;
                    return (
                      <div
                        key={i}
                        onClick={() => { if (offeringId === 'bell') handleRingBell(); }}
                        className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl bg-white shadow-sm ${offeringId === 'lamp' && lastLampLitDate === todayKey() ? 'animate-pulse' : ''} ${offeringId === 'bell' ? 'cursor-pointer' : ''}`}
                        title={offering.name}
                      >
                        <OfferingIcon offering={offering} className="w-8 h-8 flex items-center justify-center text-2xl" />
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Quick chants, always visible right under the altar's
                offerings (not tucked inside the Merit Shop) -- one tap to
                play, no need to open anything first. */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { new Audio(chantAudioUrl('Worship')).play().catch(() => {}); }}
                className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-4 py-2"
              >
                🙏 Worship
              </button>
              <button
                onClick={() => { new Audio(chantAudioUrl('Taking Refuge')).play().catch(() => {}); }}
                className="flex items-center justify-center gap-1 text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-4 py-2"
              >
                🕊️ Taking Refuge
              </button>
            </div>

            {hasLampPlaced && (
              <button
                onClick={handleLightLamp}
                disabled={!canLightLampToday}
                className={`mt-6 px-5 py-2.5 rounded-xl font-semibold shadow-md ${canLightLampToday ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              >
                {canLightLampToday ? `🪔 Light the Lamp (+${DAILY_LAMP_REWARD} coins)` : '🪔 Lamp lit for today -- come back tomorrow'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Merit Shop -- fixed to the viewport (not part of the flex layout
          above) so opening/closing it never shifts or resizes the Shrine
          Room content underneath. Anchored at the very top of the screen,
          under the coin/shop toggle, and scrolls internally if the list is
          taller than the viewport. z-[9940] -- above the z-50 button
          column above it (coin badge + Chanting/Meditation/Shop toggle),
          which used to render on top of this panel's own top edge and
          block clicks on whatever shop items fell in that overlap. */}
      {shopOpen && (
        <div className="fixed top-20 right-3 z-[9940] w-64 sm:w-72 max-h-[calc(100vh-6rem)] overflow-y-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-amber-200 p-4">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-lg font-bold text-amber-700">🛒 Merit Shop</h2>
              {/* Own close button, same as the Chanting panel -- the
                  outer toggle button (in the fixed top-right column) can
                  end up rendered underneath this panel once it's open,
                  so closing shouldn't depend on it staying reachable. */}
              <button onClick={() => setShopOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            {SHOP_LOCKED ? (
              <p className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-2 py-1.5 mb-3">🚧 Coming soon -- browsing only for now</p>
            ) : (
              <p className="text-xs text-gray-500 mb-3">🪙 {coinBalance} coins available -- tap or drag an item onto the altar</p>
            )}

            <h3 className="text-sm font-bold text-gray-700 mb-2">Buddha Image</h3>
            <div className="space-y-2 mb-5">
              {BUDDHA_OPTIONS.map(option => {
                const locked = option.requiresBodhiStage > bodhiStageIndex;
                const owned = buddhaId === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleBuyBuddha(option)}
                    disabled={owned}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border ${owned ? 'bg-emerald-50 border-emerald-300' : locked ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-9" dangerouslySetInnerHTML={{ __html: option.svg }} />
                      <span className="font-semibold text-gray-800">{option.name}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700">
                      {owned ? 'Placed' : locked ? `🔒 Bodhi Tree` : option.cost === 0 ? 'Free' : `🪙 ${option.cost}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Offerings</h3>
            <div className="space-y-2">
              {OFFERING_OPTIONS.map(option => {
                const locked = option.requiresBodhiStage != null && option.requiresBodhiStage > bodhiStageIndex;
                return (
                  <button
                    key={option.id}
                    draggable={!locked && !SHOP_LOCKED}
                    onDragStart={(e) => handleDragStart(e, option.id)}
                    onClick={() => handleBuyOffering(option)}
                    disabled={locked}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border ${locked ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-amber-50 border-amber-200 hover:bg-amber-100 cursor-grab'}`}
                  >
                    <span className="font-semibold text-gray-800 flex items-center gap-2">
                      <OfferingIcon offering={option} className="w-5 h-5 inline-flex items-center justify-center flex-shrink-0" />
                      <span>
                        {option.name}
                        {option.durationHours != null && (
                          <span className="block text-xs font-normal text-gray-500">
                            lasts {option.durationHours < 24 ? `${option.durationHours}h` : `${option.durationHours / 24}d`}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-amber-700">{locked ? '🔒 Bodhi Tree' : `🪙 ${option.cost}`}</span>
                  </button>
                );
              })}
            </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}

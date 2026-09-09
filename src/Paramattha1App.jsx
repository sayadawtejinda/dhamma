import React, { useState, useRef, useEffect } from 'react';

// --- Data Definitions ---

// အင်္ဂလိပ်ဂဏန်းများကို မြန်မာဂဏန်းအဖြစ် ပြောင်းရန်
function toMyanmar(num) {
  const digits = ['၀','၁','၂','၃','၄','၅','၆','၇','၈','၉'];
  return String(num).split('').map(ch => (ch >= '0' && ch <= '9') ? digits[ch.charCodeAt(0) - 48] : ch).join('');
}

const CITTAS = [
  // အကုသိုလ် (၁၂)
  ...[
    "သောမနဿသဟဂုတ် ဒိဋ္ဌိဂတသမ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဒိဋ္ဌိဂတသမ္ပယုတ် သသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဒိဋ္ဌိဂတဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဒိဋ္ဌိဂတဝိပ္ပယုတ် သသင်္ခါရိက စိတ်", 
    "ဥပေက္ခာသဟဂုတ် ဒိဋ္ဌိဂတသမ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဒိဋ္ဌိဂတသမ္ပယုတ် သသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဒိဋ္ဌိဂတဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဒိဋ္ဌိဂတဝိပ္ပယုတ် သသင်္ခါရိက စိတ်"
  ].map((name, i) => ({ id: i + 1, name: `၁.${i+1} ${name}`, shortName: `လော-${i+1}`, subGroup: 'lobha', type: 'akusala', color: 'bg-red-500' })),
  ...[
    "ဒေါမနဿသဟဂုတ် ပဋိဃသမ္ပယုတ် အသင်္ခါရိက စိတ်", "ဒေါမနဿသဟဂုတ် ပဋိဃသမ္ပယုတ် သသင်္ခါရိက စိတ်"
  ].map((name, i) => ({ id: i + 9, name: `၂.${i+1} ${name}`, shortName: `ဒေါ-${i+1}`, subGroup: 'dosa', type: 'akusala', color: 'bg-rose-700' })),
  ...[
    "ဥပေက္ခာသဟဂုတ် ဝိစိကိစ္ဆာသမ္ပယုတ် စိတ်", "ဥပေက္ခာသဟဂုတ် ဥဒ္ဓစ္စသမ္ပယုတ် စိတ်"
  ].map((name, i) => ({ id: i + 11, name: `၃.${i+1} ${name}`, shortName: `မော-${i+1}`, subGroup: 'moha', type: 'akusala', color: 'bg-orange-500' })),
  
  // အဟိတ် (၁၈)
  ...[
    "ဥပေက္ခာသဟဂုတ် စက္ခုဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် သောတဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် ဃာနဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် ဇိဝှါဝိညာဏ်စိတ်",
    "ဒုက္ခသဟဂုတ် ကာယဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် သမ္ပဋိစ္ဆိုင်းစိတ်", "ဥပေက္ခာသဟဂုတ် သန္တီရဏစိတ်"
  ].map((name, i) => ({ id: i + 13, name: `(အကုသလဝိပါက်) ${name}`, shortName: ["စက္ခု", "သောတ", "ဃာန", "ဇိဝှါ", "ကာယ", "သမ္ပ", "သန္တီ"][i], subGroup: 'akusala-vipaka', type: 'vipaka', color: 'bg-stone-500' })),
  ...[
    "ဥပေက္ခာသဟဂုတ် စက္ခုဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် သောတဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် ဃာနဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် ဇိဝှါဝိညာဏ်စိတ်",
    "သုခသဟဂုတ် ကာယဝိညာဏ်စိတ်", "ဥပေက္ခာသဟဂုတ် သမ္ပဋိစ္ဆိုင်းစိတ်", "သောမနဿသဟဂုတ် သန္တီရဏစိတ်", "ဥပေက္ခာသဟဂုတ် သန္တီရဏစိတ်"
  ].map((name, i) => ({ id: i + 20, name: `(ကုသလဝိပါက်) ${name}`, shortName: ["စက္ခု", "သောတ", "ဃာန", "ဇိဝှါ", "ကာယ", "သမ္ပ", "သန္တီ-သော", "သန္တီ-ဥပေ"][i], subGroup: 'kusala-vipaka', type: 'vipaka', color: 'bg-stone-400' })),
  ...[
    "ဥပေက္ခာသဟဂုတ် ပဉ္စဒွါရာဝဇ္ဇန်းစိတ်", "ဥပေက္ခာသဟဂုတ် မနောဒွါရာဝဇ္ဇန်းစိတ်", "သောမနဿသဟဂုတ် ဟသိတုပ္ပါဒ်စိတ်"
  ].map((name, i) => ({ id: i + 28, name: `(အဟိတ်ကြိယာ) ${name}`, shortName: ["ပဉ္စဒွါရ", "မနောဒွါရ", "ဟသိတု"][i], subGroup: 'ahetuka-kiriya', type: 'kiriya', color: 'bg-stone-300' })),

  // ကာမသောဘဏ (၂၄)
  ...[
    "သောမနဿသဟဂုတ် ဉာဏသမ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏသမ္ပယုတ် သသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏဝိပ္ပယုတ် သသင်္ခါရိက စိတ်",
    "ဥပေက္ခာသဟဂုတ် ဉာဏသမ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏသမ္ပယုတ် သသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏဝိပ္ပယုတ် သသင်္ခါရိက စိတ်"
  ].map((name, i) => ({ id: i + 31, name: `(မဟာကုသိုလ်) ${name}`, shortName: `မကု-${i+1}`, subGroup: 'maha-kusala', type: 'kusala', color: 'bg-emerald-500' })),
  ...[
    "သောမနဿသဟဂုတ် ဉာဏသမ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏသမ္ပယုတ် သသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏဝိပ္ပယုတ် သသင်္ခါရိက စိတ်",
    "ဥပေက္ခာသဟဂုတ် ဉာဏသမ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏသမ္ပယုတ် သသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏဝိပ္ပယုတ် သသင်္ခါရိက စိတ်"
  ].map((name, i) => ({ id: i + 39, name: `(မဟာဝိပါက်) ${name}`, shortName: `မဝိ-${i+1}`, subGroup: 'maha-vipaka', type: 'vipaka', color: 'bg-emerald-400' })),
  ...[
    "သောမနဿသဟဂုတ် ဉာဏသမ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏသမ္ပယုတ် သသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "သောမနဿသဟဂုတ် ဉာဏဝိပ္ပယုတ် သသင်္ခါရိက စိတ်",
    "ဥပေက္ခာသဟဂုတ် ဉာဏသမ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏသမ္ပယုတ် သသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏဝိပ္ပယုတ် အသင်္ခါရိက စိတ်", "ဥပေက္ခာသဟဂုတ် ဉာဏဝိပ္ပယုတ် သသင်္ခါရိက စိတ်"
  ].map((name, i) => ({ id: i + 47, name: `(မဟာကြိယာ) ${name}`, shortName: `မကြိ-${i+1}`, subGroup: 'maha-kiriya', type: 'kiriya', color: 'bg-emerald-300' })),

  // ရူပါဝစရ (၁၅)
  ...[
    "ဝိတက်+ဝိစာရ+ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော ပထမစျာန်", "ဝိစာရ+ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော ဒုတိယစျာန်", "ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော တတိယစျာန်", "သုခ+ဧကဂ္ဂတာတည်းဟူသော စတုတ္ထစျာန်", "ဥပေက္ခာ+ဧကဂ္ဂတာတည်းဟူသော ပဉ္စမစျာန်(ကုသိုလ်အဘိညာဏ်)"
  ].map((name, i) => ({ id: i + 55, name: `(ရူပကုသိုလ်) ${name}`, shortName: `ရူကု-${i+1}`, subGroup: 'rupa-kusala', type: 'kusala', color: 'bg-blue-500' })),
  ...[
    "ဝိတက်+ဝိစာရ+ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော ပထမစျာန်", "ဝိစာရ+ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော ဒုတိယစျာန်", "ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော တတိယစျာန်", "သုခ+ဧကဂ္ဂတာတည်းဟူသော စတုတ္ထစျာန်", "ဥပေက္ခာ+ဧကဂ္ဂတာတည်းဟူသော ပဉ္စမစျာန်"
  ].map((name, i) => ({ id: i + 60, name: `(ရူပဝိပါက်) ${name}`, shortName: `ရူဝိ-${i+1}`, subGroup: 'rupa-vipaka', type: 'vipaka', color: 'bg-blue-400' })),
  ...[
    "ဝိတက်+ဝိစာရ+ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော ပထမစျာန်", "ဝိစာရ+ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော ဒုတိယစျာန်", "ပီတိ+သုခ+ဧကဂ္ဂတာတည်းဟူသော တတိယစျာန်", "သုခ+ဧကဂ္ဂတာတည်းဟူသော စတုတ္ထစျာန်", "ဥပေက္ခာ+ဧကဂ္ဂတာတည်းဟူသော ပဉ္စမစျာန်(ကြိယာအဘိညာဏ်)"
  ].map((name, i) => ({ id: i + 65, name: `(ရူပကြိယာ) ${name}`, shortName: `ရူကြိ-${i+1}`, subGroup: 'rupa-kiriya', type: 'kiriya', color: 'bg-blue-300' })),

  // အရူပါဝစရ (၁၂)
  ...[
    "အာကာသာနဉ္စာယတန စိတ်", "ဝိညာဏဉ္စာယတန စိတ်", "အာကိဉ္စညာယတန စိတ်", "နေဝသညာနာသညာယတန စိတ်"
  ].map((name, i) => ({ id: i + 70, name: `(အရူပကုသိုလ်) ${name}`, shortName: `အရူကု-${i+1}`, subGroup: 'arupa-kusala', type: 'kusala', color: 'bg-indigo-500' })),
  ...[
    "အာကာသာနဉ္စာယတန စိတ်", "ဝိညာဏဉ္စာယတန စိတ်", "အာကိဉ္စညာယတန စိတ်", "နေဝသညာနာသညာယတန စိတ်"
  ].map((name, i) => ({ id: i + 74, name: `(အရူပဝိပါက်) ${name}`, shortName: `အရူဝိ-${i+1}`, subGroup: 'arupa-vipaka', type: 'vipaka', color: 'bg-indigo-400' })),
  ...[
    "အာကာသာနဉ္စာယတန စိတ်", "ဝိညာဏဉ္စာယတန စိတ်", "အာကိဉ္စညာယတန စိတ်", "နေဝသညာနာသညာယတန စိတ်"
  ].map((name, i) => ({ id: i + 78, name: `(အရူပကြိယာ) ${name}`, shortName: `အရူကြိ-${i+1}`, subGroup: 'arupa-kiriya', type: 'kiriya', color: 'bg-indigo-300' })),

  // လောကုတ္တရာ (၄၀)
  ...Array.from({length: 20}, (_, i) => {
    const jhanas = ["ပထမစျာန်", "ဒုတိယစျာန်", "တတိယစျာန်", "စတုတ္ထစျာန်", "ပဉ္စမစျာန်"];
    const maggas = ["သောတာပတ္တိမဂ်", "သကဒါဂါမိမဂ်", "အနာဂါမိမဂ်", "အရဟတ္တမဂ်"];
    const shortMaggas = ["သောမဂ်", "သကမဂ်", "အနာမဂ်", "အရမဂ်"];
    return { id: i + 82, name: `${jhanas[i % 5]} ${maggas[Math.floor(i / 5)]}စိတ်`, shortName: `${shortMaggas[Math.floor(i / 5)]}-${(i%5)+1}`, subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' };
  }),
  ...Array.from({length: 20}, (_, i) => {
    const jhanas = ["ပထမစျာန်", "ဒုတိယစျာန်", "တတိယစျာန်", "စတုတ္ထစျာန်", "ပဉ္စမစျာန်"];
    const phalas = ["သောတာပတ္တိဖိုလ်", "သကဒါဂါမိဖိုလ်", "အနာဂါမိဖိုလ်", "အရဟတ္တဖိုလ်"];
    const shortPhalas = ["သောဖိုလ်", "သကဖိုလ်", "အနာဖိုလ်", "အရဖိုလ်"];
    return { id: i + 102, name: `${jhanas[i % 5]} ${phalas[Math.floor(i / 5)]}စိတ်`, shortName: `${shortPhalas[Math.floor(i / 5)]}-${(i%5)+1}`, subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' };
  })
];

// လောကုတ္တရာစိတ် (၄၀) ကို ဈာန်မခွဲဘဲ (၈) ပါးအနေနဲ့ ပြသရန်
const LOKUTTARA_8 = [
  { id: 82, name: "သောတာပတ္တိမဂ်စိတ်", shortName: "သောမဂ်", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 87, name: "သကဒါဂါမိမဂ်စိတ်", shortName: "သကမဂ်", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 92, name: "အနာဂါမိမဂ်စိတ်", shortName: "အနာမဂ်", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 97, name: "အရဟတ္တမဂ်စိတ်", shortName: "အရမဂ်", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 102, name: "သောတာပတ္တိဖိုလ်စိတ်", shortName: "သောဖိုလ်", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
  { id: 107, name: "သကဒါဂါမိဖိုလ်စိတ်", shortName: "သကဖိုလ်", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
  { id: 112, name: "အနာဂါမိဖိုလ်စိတ်", shortName: "အနာဖိုလ်", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
  { id: 117, name: "အရဟတ္တဖိုလ်စိတ်", shortName: "အရဖိုလ်", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
];

// ယုဂဠှစေတသိက်များ (ကာယ/စိတ္တ တွဲစုံ ၆ စု) ကို ဝိုင်းပြရန် ID (odd/first-of-pair) များ
const YUGALA_PAIR_STARTS = new Set([35, 37, 39, 41, 43, 45]);

const VEDANA_TYPES = [
  { id: 'somanassa', name: 'သောမနဿ' },
  { id: 'domanassa', name: 'ဒေါမနဿ' },
  { id: 'sukha', name: 'သုခ' },
  { id: 'dukkha', name: 'ဒုက္ခ' },
  { id: 'upekkha', name: 'ဥပေက္ခာ' },
];

// ဟေတုသင်္ဂဟ - ဟိတ်ပါးအရေအတွက် (၀,၁,၂,၃) အလိုက် စိတ်များကို ခွဲရန်
const HETU_TYPES = [
  { id: 0, name: 'အဟိတ်' },
  { id: 1, name: 'ဧကဟိတ်' },
  { id: 2, name: 'ဒွိဟိတ်' },
  { id: 3, name: 'တိဟိတ်' },
];

// citta id တစ်ခုစီ ယှဉ်တဲ့ ဟိတ်အရေအတွက်ကို ပြန်ပေးသည်
function getHetuCount(id) {
  if (id <= 8) return 2;                 // လောဘမူ - လောဘ+မောဟ
  if (id === 9 || id === 10) return 2;    // ဒေါသမူ - ဒေါသ+မောဟ
  if (id === 11 || id === 12) return 1;   // မောဟမူ - မောဟတစ်ခုတည်း
  if (id >= 13 && id <= 30) return 0;     // အဟိတ်စိတ် ၁၈-ပါး
  if (id >= 31 && id <= 54) {             // ကာမသောဘဏ ၂၄-ပါး
    const start = id <= 38 ? 31 : (id <= 46 ? 39 : 47);
    const offset = (id - start) % 8;
    return [2, 3, 6, 7].includes(offset) ? 2 : 3; // ဉာဏဝိပ္ပယုတ်=၂၊ ဉာဏသမ္ပယုတ်=၃
  }
  return 3; // ရူပ၊ အရူပ၊ လောကုတ္တရာ (အကျယ်/အကျဉ်း ၂ မျိုးလုံး) - တိဟိတ်
}

// ကိစ္စသင်္ဂဟ - ကိစ္စ (၁၄) ပါး
const KICCA_TYPES = [
  { id: 1, name: 'ပဋိသန္ဓေကိစ္စ' },
  { id: 2, name: 'ဘဝင်ကိစ္စ' },
  { id: 3, name: 'အာဝဇ္ဇနကိစ္စ' },
  { id: 4, name: 'ဒဿနကိစ္စ' },
  { id: 5, name: 'သဝနကိစ္စ' },
  { id: 6, name: 'ဃာယနကိစ္စ' },
  { id: 7, name: 'သာယနကိစ္စ' },
  { id: 8, name: 'ဖုသနကိစ္စ' },
  { id: 9, name: 'သမ္ပဋိစ္ဆနကိစ္စ' },
  { id: 10, name: 'သန္တီရဏကိစ္စ' },
  { id: 11, name: 'ဝေါဋ္ဌဗ္ဗနကိစ္စ' },
  { id: 12, name: 'ဇဝနကိစ္စ' },
  { id: 13, name: 'တဒါရမ္မဏကိစ္စ' },
  { id: 14, name: 'စုတိကိစ္စ' },
];

// citta id တစ်ခုစီ ဆောင်ရွက်တဲ့ ကိစ္စ id (များ) ကို array အနေနဲ့ ပြန်ပေးသည်
function getCittaKiccas(id) {
  if (id <= 12) return [12];                          // အကုသိုလ် - ဇဝန
  if (id === 30) return [12];                          // ဟသိတုပ္ပါဒ် - ဇဝန
  if (id === 28) return [3];                           // ပဉ္စဒွါရာဝဇ္ဇန်း - အာဝဇ္ဇန
  if (id === 29) return [3, 11];                       // မနောဒွါရာဝဇ္ဇန်း - အာဝဇ္ဇန+ဝေါဋ္ဌဗ္ဗန
  if (id === 13 || id === 20) return [4];              // ဒဿန
  if (id === 14 || id === 21) return [5];              // သဝန
  if (id === 15 || id === 22) return [6];              // ဃာယန
  if (id === 16 || id === 23) return [7];              // သာယန
  if (id === 17 || id === 24) return [8];              // ဖုသန
  if (id === 18 || id === 25) return [9];              // သမ္ပဋိစ္ဆန
  if (id === 19 || id === 27) return [1, 2, 10, 13, 14]; // သန္တီရဏ ဥပေက္ခာ - အများဆုံးကိစ္စ
  if (id === 26) return [10, 13];                      // သန္တီရဏ သောမနဿ
  if (id >= 31 && id <= 38) return [12];               // မဟာကုသိုလ်
  if (id >= 39 && id <= 46) return [1, 2, 13, 14];     // မဟာဝိပါက်
  if (id >= 47 && id <= 54) return [12];               // မဟာကြိယာ
  if (id >= 55 && id <= 59) return [12];               // ရူပကုသိုလ်
  if (id >= 60 && id <= 64) return [1, 2, 14];         // ရူပဝိပါက်
  if (id >= 65 && id <= 69) return [12];               // ရူပကြိယာ
  if (id >= 70 && id <= 73) return [12];               // အရူပကုသိုလ်
  if (id >= 74 && id <= 77) return [1, 2, 14];         // အရူပဝိပါက်
  if (id >= 78 && id <= 81) return [12];               // အရူပကြိယာ
  if (id >= 82) return [12];                           // လောကုတ္တရာ (အကျယ်/အကျဉ်း ၂ မျိုးလုံး)
  return [];
}

// ဒွါရသင်္ဂဟ - ဒွါရ (၆) ပါး + ဒွါရဝိမုတ်
const DVARA_TYPES = [
  { id: 1, name: 'စက္ခုဒွါရ' },
  { id: 2, name: 'သောတဒွါရ' },
  { id: 3, name: 'ဃာနဒွါရ' },
  { id: 4, name: 'ဇိဝှါဒွါရ' },
  { id: 5, name: 'ကာယဒွါရ' },
  { id: 6, name: 'မနောဒွါရ' },
  { id: 0, name: 'ဒွါရဝိမုတ်' },
];

// citta id တစ်ခုစီ ဖြစ်နိုင်တဲ့ ဒွါရ id (များ) ကို array အနေနဲ့ ပြန်ပေးသည် (0 = ဒွါရဝိမုတ်)
function getCittaDvaras(id) {
  if (id === 13 || id === 20) return [1];                     // စက္ခုဝိညာဏ်
  if (id === 14 || id === 21) return [2];                     // သောတဝိညာဏ်
  if (id === 15 || id === 22) return [3];                     // ဃာနဝိညာဏ်
  if (id === 16 || id === 23) return [4];                     // ဇိဝှါဝိညာဏ်
  if (id === 17 || id === 24) return [5];                     // ကာယဝိညာဏ်
  if (id === 28) return [1, 2, 3, 4, 5];                       // ပဉ္စဒွါရာဝဇ္ဇန်း
  if (id === 18 || id === 25) return [1, 2, 3, 4, 5];          // သမ္ပဋိစ္ဆိုင်း
  if (id === 19 || id === 27) return [1, 2, 3, 4, 5, 6, 0];    // သန္တီရဏဥပေက္ခာ - ရံခါ ၆-ဒွါရ၊ ရံခါ ဝိမုတ်
  if (id === 26) return [1, 2, 3, 4, 5, 6];                    // သန္တီရဏသောမနဿ
  if (id === 29) return [1, 2, 3, 4, 5, 6];                    // ဝုဋ္ဌော/မနောဒွါရာဝဇ္ဇန်း
  if (id === 30) return [1, 2, 3, 4, 5, 6];                    // ဟသိတုပ္ပါဒ်
  if (id <= 12) return [1, 2, 3, 4, 5, 6];                     // အကုသိုလ်-၁၂
  if (id >= 31 && id <= 38) return [1, 2, 3, 4, 5, 6];         // မဟာကုသိုလ်
  if (id >= 47 && id <= 54) return [1, 2, 3, 4, 5, 6];         // မဟာကြိယာ
  if (id >= 39 && id <= 46) return [1, 2, 3, 4, 5, 6, 0];      // မဟာဝိပါက် - ရံခါ ၆-ဒွါရ၊ ရံခါ ဝိမုတ်
  if (id >= 55 && id <= 59) return [6];                        // ရူပကုသိုလ်
  if (id >= 65 && id <= 69) return [6];                        // ရူပကြိယာ
  if (id >= 60 && id <= 64) return [0];                        // ရူပဝိပါက် - ဒွါရဝိမုတ်
  if (id >= 70 && id <= 73) return [6];                        // အရူပကုသိုလ်
  if (id >= 78 && id <= 81) return [6];                        // အရူပကြိယာ
  if (id >= 74 && id <= 77) return [0];                        // အရူပဝိပါက် - ဒွါရဝိမုတ်
  if (id >= 82) return [6];                                    // လောကုတ္တရာ (အကျယ်/အကျဉ်း ၂ မျိုးလုံး)
  return [];
}

const ARAMMANA_TYPES = [
  { id: 'present-rupa', name: 'ပစ္စုပ္ပန်ရူပါရုံ' },
  { id: 'present-sadda', name: 'ပစ္စုပ္ပန်သဒ္ဒါရုံ' },
  { id: 'present-gandha', name: 'ပစ္စုပ္ပန်ဂန္ဓာရုံ' },
  { id: 'present-rasa', name: 'ပစ္စုပ္ပန်ရသာရုံ' },
  { id: 'present-photthabba', name: 'ပစ္စုပ္ပန်ဖောဋ္ဌဗ္ဗာရုံ' },
  { id: 'kama', name: 'ကာမအာရုံ' },
  { id: 'mahaggata', name: 'မဟဂ္ဂုတ်အာရုံ' },
  { id: 'lower-phala', name: 'အောက်မဂ်ဖိုလ်သုံးစုံအာရုံ' },
  { id: 'lokuttara-citta', name: 'လောကုတ္တရာအာရုံ' },
  { id: 'pannatti', name: 'ပညတ်အာရုံ' },
  { id: 'nibbana', name: 'နိဗ္ဗာန်အာရုံ' },
];

// citta id တစ်ခုစီ အာရုံပြုနိုင်တဲ့ အမျိုးအစား (များ) ကို array အနေနဲ့ ပြန်ပေးသည်
function getCittaArammana(id) {
  if (id <= 12) return ['kama', 'mahaggata', 'pannatti'];               // အကုသိုလ်-၁၂
  if (id === 13 || id === 20) return ['present-rupa'];          // စက္ခုဝိညာဏ်ဒွေး — ပစ္စုပ္ပန်ရူပါရုံသာ
  if (id === 14 || id === 21) return ['present-sadda'];         // သောတဝိညာဏ်ဒွေး — ပစ္စုပ္ပန်သဒ္ဒါရုံသာ
  if (id === 15 || id === 22) return ['present-gandha'];        // ဃာနဝိညာဏ်ဒွေး — ပစ္စုပ္ပန်ဂန္ဓာရုံသာ
  if (id === 16 || id === 23) return ['present-rasa'];          // ဇိဝှါဝိညာဏ်ဒွေး — ပစ္စုပ္ပန်ရသာရုံသာ
  if (id === 17 || id === 24) return ['present-photthabba'];    // ကာယဝိညာဏ်ဒွေး — ပစ္စုပ္ပန်ဖောဋ္ဌဗ္ဗာရုံသာ
  if (id === 18 || id === 25 || id === 28) return ['present-rupa', 'present-sadda', 'present-gandha', 'present-rasa', 'present-photthabba']; // မနောဓာတ် (သမ္ပဋိစ္ဆိုင်း-၂ + ပဉ္စဒွါရာဝဇ္ဇန်း-၁) — ဒွါရ (၅)ပါးလုံး၏ ပစ္စုပ္ပန်အာရုံများသာ
  if (id === 19 || id === 26 || id === 27) return ['kama'];             // သန္တီရဏ-၃
  if (id === 29) return ['kama', 'mahaggata', 'pannatti', 'nibbana', 'lokuttara-citta'];   // မနောဒွါရာဝဇ္ဇန်း/ဝုဋ္ဌော
  if (id === 30) return ['kama'];                                       // ဟသိတုပ္ပါဒ်
  if (id === 31 || id === 32 || id === 35 || id === 36) return ['kama', 'mahaggata', 'pannatti', 'nibbana', 'lower-phala']; // မဟာကုသိုလ် ဉာဏသမ္ပယုတ် (၁,၂,၅,၆)
  if (id === 33 || id === 34 || id === 37 || id === 38) return ['kama', 'mahaggata', 'pannatti'];   // မဟာကုသိုလ် ဉာဏဝိပ္ပယုတ် (၃,၄,၇,၈)
  if (id >= 39 && id <= 46) return ['kama'];                            // မဟာဝိပါက်
  if (id === 47 || id === 48 || id === 51 || id === 52) return ['kama', 'mahaggata', 'pannatti', 'nibbana', 'lokuttara-citta']; // မဟာကြိယာ ဉာဏသမ္ပယုတ် (၁,၂,၅,၆)
  if (id === 49 || id === 50 || id === 53 || id === 54) return ['kama', 'mahaggata', 'pannatti'];   // မဟာကြိယာ ဉာဏဝိပ္ပယုတ် (၃,၄,၇,၈)
  if (id === 59) return ['pannatti', 'nibbana', 'lower-phala'];         // ရူပကုသိုလ်ပဉ္စမဈာန် — ကုသိုလ်အဘိညာဉ်
  if (id === 69) return ['pannatti', 'nibbana', 'lokuttara-citta'];     // ရူပကြိယာပဉ္စမဈာန် — ကြိယာအဘိညာဉ်
  if (id >= 55 && id <= 69) return ['pannatti'];                        // ကျန်ရူပါဝစရ ကုသိုလ်/ဝိပါက်/ကြိယာ
  if (id >= 70 && id <= 81) {                                           // အရူပါဝစရ (ပထမ+တတိယ=ပညတ်၊ ဒုတိယ+စတုတ္ထ=မဟဂ္ဂုတ်)
    const offset = (id - 70) % 4;
    return (offset === 1 || offset === 3) ? ['mahaggata'] : ['pannatti'];
  }
  if (id >= 82) return ['nibbana'];                                     // လောကုတ္တရာ
  return [];
}

// ဝတ္ထုသင်္ဂဟ - ဝတ္ထုရုပ် (၆) ပါး + ဝတ္ထုဝိမုတ်
const VATTHU_TYPES = [
  { id: 1, name: 'စက္ခုဝတ္ထု' },
  { id: 2, name: 'သောတဝတ္ထု' },
  { id: 3, name: 'ဃာနဝတ္ထု' },
  { id: 4, name: 'ဇိဝှါဝတ္ထု' },
  { id: 5, name: 'ကာယဝတ္ထု' },
  { id: 7, name: 'ဟဒယဝတ္ထု (အမြဲ)' },
  { id: 6, name: 'ဟဒယဝတ္ထု (ရံခါ)' },
  { id: 0, name: 'ဝတ္ထုဝိမုတ်' },
];
function isMaranaJavanaCitta(id) {
  if (id <= 12) return true;                    // အကုသိုလ် ၁၂
  if (id >= 31 && id <= 38) return true;         // မဟာကုသိုလ် ၈
  if (id >= 55 && id <= 59) return true;         // ရူပကုသိုလ် ၅
  if (id >= 70 && id <= 73) return true;         // အရူပကုသိုလ် ၄
  return false;
}
const MARANA_JAVANA_IDS = [
  ...Array.from({length:12},(_,i)=>i+1),
  ...Array.from({length:8},(_,i)=>i+31),
  ...Array.from({length:5},(_,i)=>i+55),
  ...Array.from({length:4},(_,i)=>i+70),
];
// citta id တစ်ခုစီ မှီနိုင်တဲ့ ဝတ္ထု id ကို array အနေနဲ့ ပြန်ပေးသည် (0 = ဝတ္ထုဝိမုတ်)
const HADAYA_ALWAYS_VATTHU_IDS = [
  9, 10,                                             // ဒေါသမူ (၂)
  18, 25, 28,                                        // မနောဓာတ် — သမ္ပဋိစ္ဆိုင်း-၂ + ပဉ္စဒွါရာဝဇ္ဇန်း-၁
  19, 26, 27,                                        // သန္တီရဏ (၃)
  30,                                                  // ဟသိတုပ္ပါဒ်
  ...Array.from({ length: 8 }, (_, i) => i + 39),    // မဟာဝိပါက် (၈)
  ...Array.from({ length: 15 }, (_, i) => i + 55),   // ရူပါဝစရ ကုသိုလ်+ဝိပါက်+ကြိယာ (၁၅)
  ...Array.from({ length: 5 }, (_, i) => i + 82),    // သောတာပတ္တိမဂ် ဈာန်-၅
];

function getCittaVatthu(id) {
  if (id === 13 || id === 20) return [1];   // စက္ခုဝိညာဏ်
  if (id === 14 || id === 21) return [2];   // သောတဝိညာဏ်
  if (id === 15 || id === 22) return [3];   // ဃာနဝိညာဏ်
  if (id === 16 || id === 23) return [4];   // ဇိဝှါဝိညာဏ်
  if (id === 17 || id === 24) return [5];   // ကာယဝိညာဏ်
  if (id >= 74 && id <= 77) return [0];     // အရူပါဝစရဝိပါက် - ဝတ္ထုဝိမုတ်
  if (HADAYA_ALWAYS_VATTHU_IDS.includes(id)) return [7]; // ဟဒယဝတ္ထု (အမြဲ)
  return [6];                                // ဟဒယဝတ္ထု (ရံခါ) — ဝတ္ထုဝိမုတ်ကား အရူပါဝစရဝိပါက် (၄)ခုတွင်သာ ရှိ၍ ဤနေရာတွင် မထည့်ပါ
}

// ဘဝတစ်ခုလုံး၏ စိတ်အစဉ် (ဝီထိ) — ပဋိသန္ဓေ → ဘဝနိကန္တိလောဘဇော → ပဉ္စဒွါရဝီထိ → ဘဝဆက် → မနောဒွါရဝီထိ → ဘဝဆက် → မရဏာသန္နဝီထိ → စုတိ
// matchType/matchValue ကို dot နှိပ်လိုက်ရင် citta/cetasika panel ကို ချိတ်ဆက် highlight လုပ်ရန် သုံးသည်
const VITHI_GROUPS = {
  birth: 'ပဋိသန္ဓေအခန်း — ဘဝသစ်စတင်ခြင်း',
  panca: 'ပဉ္စဒွါရဝီထိ — မြင်/ကြား/နံ/စား/ထိ',
  life: 'ဘဝဆက်နေခြင်း (ဘဝင်အဆက်ဆက်)',
  death: 'မရဏာသန္နဝီထိ — သေခါနီးအခိုက်',
};

const repeatItem = (label, color, count, group, matchType, matchValue) =>
  Array.from({ length: count }, () => ({ label, color, group, matchType, matchValue }));

// ဒွါရမှာဖြစ်ခါနီး နောက်ဆုံးဘဝင်ကို "အတီတဘဝင်" ဟုခေါ်သည် — မရဏာသန္နဝီထိအတွက် alternate-label cycling ဟောင်းအတိုင်း ဆက်ထားသည်
const ATITA_BHAVANGA_ALTS = Array.from({ length: 15 }, (_, i) => `အတီတဘဝင် (${toMyanmar(i + 1)}-ချက်လွန်)`);

// ပဉ္စဒွါရဝီထိ (ဤနေရာတွင် စက္ခုဒွါရအား ကိုယ်စားပြု၍ ပြထားသည်) — အခြားဒွါရ ၄-ပါးအတွက်လည်း သဘောတရားချင်း အတူတူပင်
const PANCA_DVARA_TYPES = [
  { doorName: 'စက္ခုဒွါရဝီထိ', vinLabel: 'စက္ခုဝိညာဏ်', vinIds: [13, 20] },
  { doorName: 'သောတဒွါရဝီထိ', vinLabel: 'သောတဝိညာဏ်', vinIds: [14, 21] },
  { doorName: 'ဃာနဒွါရဝီထိ', vinLabel: 'ဃာနဝိညာဏ်', vinIds: [15, 22] },
  { doorName: 'ဇိဝှါဒွါရဝီထိ', vinLabel: 'ဇိဝှါဝိညာဏ်', vinIds: [16, 23] },
  { doorName: 'ကာယဒွါရဝီထိ', vinLabel: 'ကာယဝိညာဏ်', vinIds: [17, 24] },
];

// ပဉ္စဒွါရဝီထိ (၁၅) မျိုး — မှတ်ချက်: ပေးပို့ထားသည့် ဇယားကြီးရှိ ဘဝင်ချိန်တစ်ကြောင်းချင်းစီကို cell-by-cell အတိအကျ
// ပြန်လည်တည်ဆောက်မထားပါ (အလွန်ရှုပ်ထွေးလွန်းသောကြောင့်)၊ ယင်းအစား အတိမဟန္တာ/မဟန္တာ/ပရိတ္တ/အတိပရိတ္တ ၄-မျိုး၏
// သဘောတရား (တဒါရုံအထိ ရောက်/ဇောသက်သက်/ဝေါဋ္ဌဗ္ဗနအထိသာ/မောဃဝါရ) ကို အတီတဘဝင် အရေအတွက် ၁-၁၅ တိုးလာသည်နှင့်အညီ
// ပေါင်းစပ်ကိုယ်စားပြုထားသည့် ပညာပေး ရိုးရှင်းချဉ်းကပ်မှု ဖြစ်ပါသည်
// အတီတဘဝင် (n) တစ်ခုတိုးတိုင်း ဝီထိစုစုပေါင်း စိတ္တက္ခဏ ၁၇-ချက်ထဲက ကျန်နေတဲ့ နေရာအရ
// ဇော/တဒါရုံ ဖြစ်ခွင့်ရှိ/မရှိ ဆုံးဖြတ်သည့် စည်းမျဉ်း (n = 1 → တဒါရုံအထိ၊ 2-3 → ဇောသက်သက်၊
// 4-8 → ဝုဋ္ဌော x3 ဇောမဖြစ်၊ 9 → ဝုဋ္ဌော x2၊ 10-15 → မောဃဝါရ - ဘဝင်္ဂစလန/ဂုပစ္ဆေဒပဲ ကျန်)
const PANCA_VITHI_VARIANTS = Array.from({ length: 15 }, (_, i) => {
  const atita = i + 1;
  let outcome;
  if (atita === 1) outcome = 'tadarammana';
  else if (atita <= 3) outcome = 'javana';
  else if (atita <= 8) outcome = 'votthapana3';
  else if (atita === 9) outcome = 'votthapana2';
  else outcome = 'mogha';
  const nameMap = {
    tadarammana: 'အတိမဟန္တာရုံ (တဒါရုံအထိရောက်)',
    javana: 'မဟန္တာရုံ (ဇောသက်သက်)',
    votthapana3: 'ပရိတ္တာရုံ (ဝေါဋ္ဌဗ္ဗနဝါရ)',
    votthapana2: 'ပရိတ္တာရုံ (ဝေါဋ္ဌဗ္ဗနဝါရ)',
    mogha: 'အတိပရိတ္တာရုံ (မောဃဝါရ)',
  };
  return { atita, outcome, name: `${nameMap[outcome]} — အတီတဘဝင် ${toMyanmar(atita)}-ချက်` };
});

function buildPancaSection(variantIdx, doorIdx) {
  const variant = PANCA_VITHI_VARIANTS[variantIdx] || PANCA_VITHI_VARIANTS[0];
  const PANCA_DOOR = PANCA_DVARA_TYPES[doorIdx] || PANCA_DVARA_TYPES[0];
  const group = `${VITHI_GROUPS.panca} — ${PANCA_DOOR.doorName} (${variant.name})`;
  const items = [];
  // အတီတဘဝင် (n ခု) — အရောင်က ရိုးရိုးဘဝင်အရောင်ပဲ (bg-slate-400) ဖြစ်ရမည်
  for (let i = 0; i < variant.atita; i++) {
    items.push({
      label: 'အတီတဘဝင်', color: 'bg-slate-400', group, isAtita: true, atitaIndex: i + 1,
      matchType: i === 0 ? 'panca-door-cycle' : 'kicca', matchValue: i === 0 ? undefined : 2,
    });
  }
  items.push({ label: 'ဘဝင်္ဂစလန', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });
  items.push({ label: 'ဘဝင်္ဂုပစ္ဆေဒ', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });

  if (variant.outcome === 'mogha') {
    const built = variant.atita + 2;
    items.push(...Array.from({ length: Math.max(0, 17 - built) }, () => ({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 })));
    return items;
  }

  items.push({ label: 'ပဉ္စဒွါရာဝဇ္ဇန်း', color: 'bg-stone-300', group, matchType: 'ahetuka-context', matchValue: 28 });
  items.push({ label: PANCA_DOOR.vinLabel, color: 'bg-sky-600', group, matchType: 'panca-vinnana-cycle', matchValue: PANCA_DOOR.vinIds, titleOverride: PANCA_DOOR.doorName });
  items.push({ label: 'သမ္ပဋိစ္ဆိုင်း', color: 'bg-stone-500', group, matchType: 'ahetuka-context', matchValue: [18, 25] });
  items.push({ label: 'သန္တီရဏ', color: 'bg-stone-500', group, matchType: 'ahetuka-context', matchValue: [19, 26, 27] });

  const votthapanaCount = variant.outcome === 'votthapana3' ? 3 : variant.outcome === 'votthapana2' ? 2 : 1;
  items.push(...repeatItem('ဝုဋ္ဌော', 'bg-stone-400', votthapanaCount, group, 'ahetuka-context', 29));

  const hasJavana = variant.outcome === 'tadarammana' || variant.outcome === 'javana';
  const hasTadarammana = variant.outcome === 'tadarammana';
  if (hasJavana) {
    items.push(...repeatItem('ဇော', 'bg-emerald-500', 7, group, 'citta-multi', KAMA_JAVANA_IDS));
    if (hasTadarammana) items.push(...repeatItem('တဒါရုံ', 'bg-blue-400', 2, group, 'kicca', 13));
  }

  const built = variant.atita + 2 + 4 + votthapanaCount + (hasJavana ? 7 : 0) + (hasTadarammana ? 2 : 0);
  items.push(...Array.from({ length: Math.max(0, 17 - built) }, () => ({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 })));
  return items;
}

// မနောဒွါရဝီထိ (၁၀) မျိုး — parikamma/upacāra/anuloma/gotrabhū တို့သည် dhoctrine အရ ကာမဇော (မဟာကုသိုလ်) 
// citta အမျိုးအစားချင်းအတူတူပင်ဖြစ်၍ citta-subgroup 'maha-kusala' ဖြင့် ကိုယ်စားပြုထားသည်

const NANA_SAMPAYUTTA_KUSALA_IDS = [31, 32, 35, 36]; // မဟာကုသိုလ် ဉာဏသမ္ပယုတ်-၄ ပါး (သောမနဿ+ဥပေက္ခာ)
const MAHA_KIRIYA_NANA_SAMPAYUTTA_IDS = [47, 48, 51, 52]; // မဟာကြိယာ ဉာဏသမ္ပယုတ်-၄ ပါး (ဘုရားရှင် အဓိဋ္ဌာနဝီထိ ကြိယာဇောအတွက်)
const NEVASANNA_IDS = [73, 81]; // နေဝသညာနာသညာယတနစိတ် (ကုသိုလ်+ကြိယာ) - နိရောဓသမာပတ်အတွက်

// ဒွေပဉ္စဝိညာဏ် (၁၀) — CJ_DVIPANCA_NONE က ဒီအောက်မှာသုံးမယ့်အတွက် ဒီနေရာမှာ ရှေ့ထွက်ကြေညာထားသည်
// (မူရင်း Association Logic အပိုင်းက declaration ကို ဖျက်ထားပြီးဖြစ်သည်)
const DVIPANCA_IDS = new Set([13,14,15,16,17,20,21,22,23,24]);

const MANO_VITHI_TYPES = [
  { name: 'ကာမဇော — ထင်ရှားသောအာရုံ (ဝိဘူတအာရုံ)', variants: [
    { label: 'တစ်မျိုးတည်း', javana: 7, tadarammana: 2 },
  ]},
  { name: 'ကာမဇော — မထင်ရှားသောအာရုံ (အဝိဘူတအာရုံ)', variants: [
    { label: 'တစ်မျိုးတည်း', javana: 7, tadarammana: 0 },
  ]},
  { name: 'အပ္ပနာဇော — ဈာန်ပထမရအခါ', variants: [
    { label: 'မန္ဒပုဂ္ဂိုလ်', steps: ['ပရိကံ', 'ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], jhana: 1 },
    { label: 'တိက္ခပုဂ္ဂိုလ်', steps: ['ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], jhana: 1 },
  ]},
  { name: 'အပ္ပနာဇော — ဈာန်နောင်ထပ်ရအခါ', variants: [
    { label: 'မန္ဒပုဂ္ဂိုလ်', steps: ['ပရိကံ', 'ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], jhana: 'many' },
    { label: 'တိက္ခပုဂ္ဂိုလ်', steps: ['ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], jhana: 'many' },
  ]},
  { name: 'အဘိညာဉ်ဝီထိ', variants: [
    { label: 'မန္ဒပုဂ္ဂိုလ်', steps: ['ပရိကံ', 'ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], jhana: 1, abhinna: true },
    { label: 'တိက္ခပုဂ္ဂိုလ်', steps: ['ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], jhana: 1, abhinna: true },
  ]},
  { name: 'မဂ်ဝီထိ', variants: [
    { label: 'မန္ဒပုဂ္ဂိုလ်', steps: ['ပရိကံ', 'ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], magga: true },
    { label: 'တိက္ခပုဂ္ဂိုလ်', steps: ['ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], magga: true },
  ]},
  { name: 'ဖိုလ်ဝီထိ', variants: [
    { label: 'မန္ဒပုဂ္ဂိုလ်', steps: ['ပရိကံ', 'ဥပစာရ', 'အနုလောမ'], phala: true },
    { label: 'တိက္ခပုဂ္ဂိုလ်', steps: ['ဥပစာရ', 'အနုလောမ'], phala: true },
  ]},
  { name: 'နိရောဓဝီထိ', variants: [
    { label: 'မန္ဒပုဂ္ဂိုလ်', steps: ['ပရိကံ', 'ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], special: 'nirodha' },
    { label: 'တိက္ခပုဂ္ဂိုလ်', steps: ['ဥပစာရ', 'အနုလောမ', 'ဂေါတြဘူ'], special: 'nirodha' },
  ]},
  { name: 'အဓိဋ္ဌာနဝီထိ (ဘုရားရှင်)', variants: [
    { label: 'တစ်မျိုးတည်း', special: 'adhitthana' },
  ]},
  ];

function buildManoSection(typeIdx, variantIdx) {
  const type = MANO_VITHI_TYPES[typeIdx] || MANO_VITHI_TYPES[0];
  const variant = type.variants[variantIdx % type.variants.length];
  const group = `မနောဒွါရဝီထိ — ${type.name}${type.variants.length > 1 ? ` (${variant.label})` : ''}`;
  const items = [];
  items.push({ label: '⟦ မနောဒွါရဝီထိ ⟧', color: 'bg-indigo-900', header: true, matchType: 'mano-type-cycle' });
  items.push({ label: 'ဘဝင်္ဂစလန', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });
  items.push({ label: 'ဘဝင်္ဂုပစ္ဆေဒ', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });
  items.push({ label: 'မနောဒွါရာဝဇ္ဇန်း', color: 'bg-stone-400', group, matchType: 'ahetuka-context', matchValue: 29, isVariantCycler: type.variants.length > 1 });

  if (variant.special === 'nirodha') {
    (variant.steps || []).forEach(step => {
      items.push({ label: step, color: 'bg-emerald-400', group, matchType: 'citta-multi', matchValue: NANA_SAMPAYUTTA_KUSALA_IDS });
    });
    items.push({ label: 'နေဝသညာနာသညာယတနဈာန်', color: 'bg-indigo-400', group, matchType: 'citta-multi', matchValue: NEVASANNA_IDS });
    items.push({ label: 'နိရောဓ (စိတ်ချုပ်ကာလ)', color: 'bg-slate-800', group, ellipsis: true });
    items.push({ label: 'ဖိုလ်စိတ်', color: 'bg-purple-400', group, matchType: 'citta-multi', matchValue: NIRODHA_PHALA_IDS });
    items.push({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  if (variant.special === 'adhitthana') {
    items.push(...repeatItem('ကြိယာဇော', 'bg-emerald-300', 5, group, 'citta-multi', MAHA_KIRIYA_NANA_SAMPAYUTTA_IDS));
    items.push({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  
  (variant.steps || []).forEach(step => {
    items.push({ label: step, color: 'bg-emerald-400', group, matchType: 'citta-multi', matchValue: NANA_SAMPAYUTTA_KUSALA_IDS });
  });

  if (variant.jhana) {
    const count = variant.jhana === 'many' ? 3 : 1;
    const jhanaIds = variant.abhinna
      ? [59, 69]
      : [55,56,57,58,59, 65,66,67,68,69, 70,71,72,73, 78,79,80,81];
    items.push(...repeatItem(variant.abhinna ? 'အဘိညာဉ်စိတ်' : 'ဈာန်စိတ်', 'bg-blue-400', count, group, 'citta-multi', jhanaIds));
    if (variant.jhana === 'many') items.push({ label: '⋯', color: 'bg-slate-300', ellipsis: true, group });
    items.push({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  if (variant.magga) {
    items.push({ label: 'မဂ်စိတ်', color: 'bg-purple-600', group, matchType: 'vithi-citta-subgroup', matchValue: 'magga' });
    items.push(...repeatItem('ဖိုလ်စိတ်', 'bg-purple-400', 2, group, 'vithi-citta-subgroup', 'phala'));
    items.push({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  if (variant.phala) {
    items.push(...repeatItem('ဖိုလ်စိတ်', 'bg-purple-400', 3, group, 'vithi-citta-subgroup', 'phala'));
    items.push({ label: '⋯', color: 'bg-slate-300', ellipsis: true, group });
    items.push({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }

  items.push(...repeatItem('ဇော', 'bg-emerald-500', variant.javana || 7, group, 'citta-multi', KAMA_JAVANA_IDS));
  if (variant.tadarammana) items.push(...repeatItem('တဒါရုံ', 'bg-blue-400', variant.tadarammana, group, 'kicca', 13));
  items.push({ label: 'ဘဝင်', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
  return items;
}

function buildGap(groupLabel) {
  return [
    ...repeatItem('ဘဝင်', 'bg-slate-400', 3, groupLabel, 'kicca', 2),
    { label: '⋯', color: 'bg-slate-300', ellipsis: true, group: groupLabel },
  ];
}

const LIFE_VITHI_BIRTH = [
  { label: 'ပဋိသန္ဓေ', color: 'bg-purple-600', group: VITHI_GROUPS.birth, matchType: 'kicca', matchValue: 1 },
  ...repeatItem('ဘဝင်', 'bg-slate-400', 16, VITHI_GROUPS.birth, 'kicca', 2),
  { label: 'ဘဝင်္ဂစလန', color: 'bg-slate-500', group: VITHI_GROUPS.birth, matchType: 'kicca', matchValue: 2 },
  { label: 'ဘဝင်္ဂုပစ္ဆေဒ', color: 'bg-slate-500', group: VITHI_GROUPS.birth, matchType: 'kicca', matchValue: 2 },
  { label: 'မနောဒွါရာဝဇ္ဇန်း', color: 'bg-stone-400', group: VITHI_GROUPS.birth, matchType: 'ahetuka-context', matchValue: 29},
  ...repeatItem('ဘဝနိကန္တိ ဇော', 'bg-red-500', 7, VITHI_GROUPS.birth, 'vithi-citta-subgroup', 'lobha'),
  ...buildGap(VITHI_GROUPS.birth),
];

const LIFE_VITHI_DEATH = [
  { label: 'ဘဝင်္ဂစလန', color: 'bg-slate-500', group: VITHI_GROUPS.death, matchType: 'kicca', matchValue: 2 },
  { label: 'ဘဝင်္ဂုပစ္ဆေဒ', color: 'bg-slate-500', group: VITHI_GROUPS.death, matchType: 'kicca', matchValue: 2 },
  { label: 'မနောဒွါရာဝဇ္ဇန်း', color: 'bg-stone-400', group: VITHI_GROUPS.death, matchType: 'ahetuka-context', matchValue: 29},
  ...repeatItem('ဇော', 'bg-orange-600', 5, VITHI_GROUPS.death, 'citta-multi', MARANA_JAVANA_IDS),
  { label: 'စုတိ', color: 'bg-purple-700', group: VITHI_GROUPS.death, matchType: 'kicca', matchValue: 14 },
];


// citta တစ်ခုစီရဲ့ ဝေဒနာအမျိုးအစားကို subGroup+id ပေါ်မူတည်ပြီး ဆုံးဖြတ်သည်
function getCittaVedana(c) {
  const { id, subGroup } = c;
  if (subGroup === 'dosa') return 'domanassa';
  if (subGroup === 'moha') return 'upekkha';
  if (subGroup === 'akusala-vipaka') return id === 17 ? 'dukkha' : 'upekkha';
  if (subGroup === 'kusala-vipaka') {
    if (id === 24) return 'sukha';
    if (id === 26) return 'somanassa';
    return 'upekkha';
  }
  if (subGroup === 'ahetuka-kiriya') return id === 30 ? 'somanassa' : 'upekkha';
  if (subGroup === 'lobha') {
    const idx = (id - 1) % 8;
    return idx < 4 ? 'somanassa' : 'upekkha';
  }
  if (['maha-kusala', 'maha-vipaka', 'maha-kiriya'].includes(subGroup)) {
    const starts = { 'maha-kusala': 31, 'maha-vipaka': 39, 'maha-kiriya': 47 };
    const idx = (id - starts[subGroup]) % 8;
    return idx < 4 ? 'somanassa' : 'upekkha';
  }
  if (['rupa-kusala', 'rupa-vipaka', 'rupa-kiriya'].includes(subGroup)) {
    const starts = { 'rupa-kusala': 55, 'rupa-vipaka': 60, 'rupa-kiriya': 65 };
    const idx = (id - starts[subGroup]) % 5;
    return idx < 4 ? 'somanassa' : 'upekkha';
  }
  if (['arupa-kusala', 'arupa-vipaka', 'arupa-kiriya'].includes(subGroup)) return 'upekkha';
  if (subGroup === 'magga') return ((id - 82) % 5) < 4 ? 'somanassa' : 'upekkha';
  if (subGroup === 'phala') return ((id - 102) % 5) < 4 ? 'somanassa' : 'upekkha';
  return 'upekkha';
}



const KAMA_JAVANA_IDS = [
  ...Array.from({length:12},(_,i)=>i+1),   // အကုသိုလ် ၁၂
  30,                                       // ဟသိတုပ္ပါဒ်
  ...Array.from({length:8},(_,i)=>i+31),   // မဟာကုသိုလ် ၈
  ...Array.from({length:8},(_,i)=>i+47),   // မဟာကြိယာ ၈
];
const NIRODHA_PHALA_IDS = Array.from({length:10}, (_, i) => i + 112); // အနာဂါမိဖိုလ်(၅)+အရဟတ္တဖိုလ်(၅)

const CETASIKAS = [
  // သဗ္ဗစိတ္တသာဓာရဏ (၇)
  { id: 1, name: "ဖဿ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "အာရုံကို တွေ့ထိသော အခြင်းအရာအားဖြင့် ဖြစ်ခြင်းသဘော (လက္ခဏ)၊ အာရုံနှင့် အသိစိတ်ကို ဆက်စပ်ပေးခြင်းသဘော (ရသ)။" },
  { id: 2, name: "ဝေဒနာ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "အာရုံ၏ အရသာကို ခံစားခြင်းသဘော။" },
  { id: 3, name: "သညာ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "အာရုံကို မှတ်သားခြင်းသဘော။" },
  { id: 4, name: "စေတနာ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "အာရုံပေါ်သို့ ယှဉ်ဖက် သမ္ပယုတ်တရားတို့ကို ရောက်အောင် စေ့ဆော်ပေးခြင်း၊ နှိုးဆော်ပေးခြင်းသဘော။ (ဝမ်းက လှော်သူနှင့်တူ၏)" },
  { id: 5, name: "ဧကဂ္ဂတာ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "အာရုံတစ်ခုတည်းပေါ်သို့ စိတ်ကျရောက်နေခြင်း၊ တည်ငြိမ်နေခြင်း၊ သမ္ပယုတ်တရားတို့ကို ဖရိုဖရဲ မကြဲစေခြင်းသဘော။" },
  { id: 6, name: "ဇီဝိတိန္ဒြေ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "ယှဉ်ဖက် သမ္ပယုတ်တရားတို့ကို စောင့်ရှောက်ပေးခြင်းသဘော၊ နာမ်သက်စောင့်ဓာတ်။" },
  { id: 7, name: "မနသိကာရ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "အာရုံဘက်သို့ သမ္ပယုတ်တရားတို့ကို ဦးလှည့် တွန်းပို့ပေးခြင်းသဘော၊ အာရုံကို နှလုံးသွင်းခြင်းသဘော။ (ပဲ့ကိုင်သူနှင့်တူ၏)" },

  // ပကိဏ်း (၆)
  { id: 8, name: "ဝိတက်", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "အာရုံပေါ်သို့ ယှဉ်ဖက် သမ္ပယုတ်တရားတို့ကို ရှေးရှုတင်ပေးခြင်းသဘော၊ ကြံစည်ခြင်းသဘော။ (ဦးက ပန်းဆွတ်သူနှင့်တူ၏)" },
  { id: 9, name: "ဝိစာရ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "အာရုံကို ထပ်ကာ ထပ်ကာ သုံးသပ်ဆင်ခြင်ခြင်း၊ ဆုပ်နယ်ခြင်းသဘော၊ ထပ်၍ ထပ်၍ ယူခြင်းသဘော။" },
  { id: 10, name: "အဓိမောက္ခ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "အာရုံကို ဆုံးဖြတ်ချက်ချခြင်းသဘော။" },
  { id: 11, name: "ဝီရိယ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "အာရုံတစ်ခုပေါ်၌ သမ္ပယုတ်တရားတို့ ဖြစ်ပေါ်လာအောင် ကြိုးစားအားထုတ်ခြင်းသဘော။" },
  { id: 12, name: "ပီတိ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "အာရုံကို နှစ်သက်ခြင်းသဘော။" },
  { id: 13, name: "ဆန္ဒ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "အာရုံကို လိုလားတောင့်တခြင်းသဘော၊ ပြုလုပ်လိုခြင်းသဘော။" },

  // မောဟအုပ်စု (၄)
  { id: 14, name: "မောဟ", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "အာရုံ၏ သဘောမှန်ကို မသိခြင်းသဘော၊ အသိမှားခြင်းသဘော။" },
  { id: 15, name: "အဟိရိက", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "ဒုစရိုက်တရား၊ အကုသိုလ်တရားတို့မှ မရှက်ခြင်းသဘော။" },
  { id: 16, name: "အနောတ္တပ္ပ", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "ဒုစရိုက်တရား၊ အကုသိုလ်တရားတို့မှ မကြောက်ခြင်းသဘော။" },
  { id: 17, name: "ဥဒ္ဓစ္စ", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "အာရုံပေါ်၌ စိတ်မငြိမ်မသက် ပျံ့လွင့်နေခြင်းသဘော။" },

  // လောဘအုပ်စု (၃)
  { id: 18, name: "လောဘ", subGroup: 'lobha-tika', color: 'bg-red-500', desc: "အာရုံကို ငါ-ငါ့ဟာဟု စွဲယူခြင်း၊ လိုလားတပ်မက်ခြင်း၊ ကပ်ငြိခြင်းသဘော။" },
  { id: 19, name: "ဒိဋ္ဌိ", subGroup: 'lobha-tika', color: 'bg-red-500', desc: "အာရုံကို နိစ္စ သုခ အတ္တ သုဘဟု စွဲလမ်းယုံကြည်ခြင်း၊ အယူမှားခြင်း၊ ခံယူချက်မှားခြင်းသဘော။" },
  { id: 20, name: "မာန", subGroup: 'lobha-tika', color: 'bg-red-500', desc: "ငါ ငါဟု စိတ်တက်ကြွ မြင့်မောက်ခြင်း၊ ထောင်လွှားခြင်း၊ အသာယူလိုခြင်းသဘော။" },

  // ဒေါသအုပ်စု (၄)
  { id: 21, name: "ဒေါသ", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "စိတ်ခက်ထန် ကြမ်းတမ်းခြင်း၊ ဖျက်ဆီးလိုခြင်းသဘော။" },
  { id: 22, name: "ဣဿာ", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "သူတစ်ပါး၏ ဂုဏ်သိရ် စည်းစိမ်ချမ်းသာကို ငြူစူ စောင်းမြောင်းခြင်း၊ ကိုယ့်ထက်သာ မနာလိုမှုသဘော။" },
  { id: 23, name: "မစ္ဆရိယ", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "မိမိ စည်းစိမ်ကို လျှို့ဝှက်ခြင်း၊ သူတစ်ပါးတို့နှင့် ဆက်ဆံမှုကို သည်းမခံနိုင်ခြင်း၊ အထိမခံနိုင်ခြင်းသဘော။" },
  { id: 24, name: "ကုက္ကုစ္စ", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "ပြုခဲ့ပြီးသော မကောင်းမှုနှင့် မပြုလိုက်ရသော ကောင်းမှုတို့အတွက် နောင်တတစ်ဖန် ပူပန်ခြင်းသဘော။" },

  // ထိန-မိဒ္ဓ (၂)
  { id: 25, name: "ထိန", subGroup: 'thina-middha', color: 'bg-stone-500', desc: "စိတ်ထိုင်းမှိုင်းခြင်း၊ စိတ်မရွှင်လန်း မထက်သန်ခြင်းသဘော။" },
  { id: 26, name: "မိဒ္ဓ", subGroup: 'thina-middha', color: 'bg-stone-500', desc: "ယှဉ်ဖက် စေတသိက်တို့ ထိုင်းမှိုင်းခြင်း၊ မရွှင်လန်း မထက်သန်ခြင်းသဘော။" },

  // ဝိစိကိစ္ဆာ (၁)
  { id: 27, name: "ဝိစိကိစ္ဆာ", subGroup: 'vicikiccha', color: 'bg-orange-700', desc: "ဘုရား၊ တရား၊ သံဃာ၊ သိက္ခာသုံးပါး၊ အတိတ်+အနာဂတ်ခန္ဓာ၊ ပဋိစ္စသမုပ္ပါဒ် ဟူသော (၈) ဌာနတို့၌ ယုံမှားသံသယရှိခြင်းသဘော။" },

  // သောဘဏသာဓာရဏ (၁၉)
  { id: 28, name: "သဒ္ဓါ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "(၈) ဌာနတို့၌ ယုံမှု+ကြည်မှု သဘော၊ ယုံကြည်ခြင်း၊ သက်ဝင် တည်နေခြင်းသဘော။" },
  { id: 29, name: "သတိ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "ကုသိုလ်နှင့် စပ်ဆိုင်ရာ အာရုံ၌ သမ္ပယုတ်တရားတို့ကို ကျောက်ဖျာကဲ့သို့ နစ်မြုပ်စေခြင်း၊ စိတ်ခိုင်မြဲခြင်း၊ မမေ့ပျောက်ခြင်းသဘော။" },
  { id: 30, name: "ဟိရီ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "မကောင်းမှု အကုသိုလ်တရားနှင့် ဒုစရိုက်တရားမှ ရှက်ခြင်းသဘော။" },
  { id: 31, name: "ဩတ္တပ္ပ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "မကောင်းမှု အကုသိုလ်တရားနှင့် ဒုစရိုက်တရားမှ ကြောက်ခြင်းသဘော။" },
  { id: 32, name: "အလောဘ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "လောကီအာရုံ၌ စိတ်မကပ်ငြိခြင်း မတပ်မက်ခြင်း၊ ငါ့ဟာဟု မစွဲယူခြင်းသဘော။" },
  { id: 33, name: "အဒေါသ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "အာရုံပေါ်၌ စိတ်မခက်ထန် မကြမ်းတမ်းခြင်း၊ အာရုံကို မဖျက်ဆီးလိုခြင်းသဘော။" },
  { id: 34, name: "တတြမဇ္ဈတ္တတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "အာရုံ၌ စိတ်ကို အလယ်အလတ်ထားခြင်း၊ အာရုံကို လျစ်လျူရှုခြင်းသဘော။" },
  { id: 35, name: "ကာယပဿဒ္ဓိ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စေတသိက်တို့ ငြိမ်းအေးခြင်းသဘော။" },
  { id: 36, name: "စိတ္တပဿဒ္ဓိ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စိတ်ငြိမ်းအေးခြင်းသဘော။" },
  { id: 37, name: "ကာယလဟုတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စေတသိက်တို့ လျင်မြန်ပေါ့ပါးခြင်းသဘော။" },
  { id: 38, name: "စိတ္တလဟုတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စိတ်လျင်မြန် ပေါ့ပါးခြင်းသဘော။" },
  { id: 39, name: "ကာယမုဒုတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စေတသိက်တို့ နူးညံ့ခြင်းသဘော။" },
  { id: 40, name: "စိတ္တမုဒုတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စိတ်နူးညံ့ခြင်းသဘော။" },
  { id: 41, name: "ကာယကမ္မညတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စေတသိက်တို့ ကုသိုလ်မှု၌ ခံ့ညားခြင်း၊ အချိုးကျ အဆင်ပြေခြင်းသဘော။" },
  { id: 42, name: "စိတ္တကမ္မညတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စိတ်၏ ကုသိုလ်မှု၌ ခံ့ညားခြင်း၊ အချိုးကျ အဆင်ပြေခြင်းသဘော။" },
  { id: 43, name: "ကာယပါဂုညတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စေတသိက်တို့ ကုသိုလ်မှု၌ ပြွမ်းတီးလေ့လာ နိုင်နင်းခြင်း၊ ကျွမ်းကျင် လိမ္မာခြင်းသဘော။" },
  { id: 44, name: "စိတ္တပါဂုညတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စိတ်၏ ကုသိုလ်မှု၌ ပြွမ်းတီးလေ့လာ နိုင်နင်းခြင်း၊ ကျွမ်းကျင်လိမ္မာခြင်းသဘော။" },
  { id: 45, name: "ကာယုဇုကတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စေတသိက်တို့၏ ဖြောင့်မတ်ခြင်း၊ မာယာ သာဌေယျ အကွေ့အကောက် ကင်းခြင်းသဘော။" },
  { id: 46, name: "စိတ္တုဇုကတာ", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "စိတ်၏ ဖြောင့်မတ်ခြင်း၊ မာယာ သာဌေယျ အကွေ့အကောက် ကင်းခြင်းသဘော။" },

  // ဝိရတီ (၃)
  { id: 47, name: "သမ္မာဝါစာ", subGroup: 'virati', color: 'bg-teal-500', desc: "အသက်မွေးဝမ်းကြောင်းနှင့် မစပ်ဆိုင်သော ဝစီဒုစရိုက်လေးပါးမှ ရှောင်ကြဉ်ခြင်းသဘော။" },
  { id: 48, name: "သမ္မာကမ္မန္တ", subGroup: 'virati', color: 'bg-teal-500', desc: "အသက်မွေးဝမ်းကြောင်းနှင့် မစပ်ဆိုင်သော ကာယဒုစရိုက်သုံးပါးမှ ရှောင်ကြဉ်ခြင်းသဘော။" },
  { id: 49, name: "သမ္မာအာဇီဝ", subGroup: 'virati', color: 'bg-teal-500', desc: "အသက်မွေးဝမ်းကြောင်းနှင့် စပ်ဆိုင်သော ဝစီဒုစရိုက်၊ ကာယဒုစရိုက်မှ ရှောင်ကြဉ်ခြင်းသဘော။" },

  // အပ္ပမညာ (၂)
  { id: 50, name: "ကရုဏာ", subGroup: 'appamanna', color: 'bg-cyan-500', desc: "ဒုက္ခိတသတ္တဝါကို အာရုံပြု၍ သနားကြင်နာခြင်း၊ ဆင်းရဲဒုက္ခမှ ကယ်တင်လိုခြင်းသဘော။" },
  { id: 51, name: "မုဒိတာ", subGroup: 'appamanna', color: 'bg-cyan-500', desc: "သုခိတသတ္တဝါကို အာရုံပြု၍ ကြည်သာဝမ်းမြောက်ခြင်း၊ မငြူစူခြင်းသဘော။" },

  // ပညာ (၁)
  { id: 52, name: "ပညိန္ဒြေ", subGroup: 'panna', color: 'bg-blue-400', desc: "ပရမတ္ထဓမ္မတို့၏ သဘောမှန်ကို ထွင်းဖောက်သိမြင်ခြင်း၊ သစ္စာလေးပါး အမှန်တရားကို ထွင်းဖောက်သိမြင်ခြင်းသဘော။" }
];

const ATTHA_PANNATTI = [
  { id: 1, name: "သဏ္ဌာနပညတ်", desc: "မဟာဘုတ်များ ဖောက်ပြန်သည့် ပုံသဏ္ဌာန်ကို စွဲ၍ ခေါ်ဝေါ် ပညတ်အပ်သော တောင်၊ မြေ၊ မြစ် စသည်။" },
  { id: 2, name: "သမူဟပညတ်", desc: "သစ်၊ ဝါး စသော အဆောက်အဦးတို့၏ ပေါင်းစပ်မှုကို စွဲ၍ ခေါ်ဝေါ် ပညတ်အပ်သော ဇရပ်၊ အိမ်၊ လှည်း၊ ရထား စသည်။" },
  { id: 3, name: "သတ္တပညတ်", desc: "ခန္ဓာငါးပါးအပေါင်းကို စွဲ၍ ခေါ်ဝေါ် ပညတ်အပ်သော လူ၊ နတ်၊ ကျား၊ မ ပုဂ္ဂိုလ် စသည်။" },
  { id: 4, name: "ဒိသာကာလာဒိပညတ်", desc: "နေ၊ လ တို့၏ ထွက်၊ ဝင်မှုကို စွဲ၍ ခေါ်ဝေါ် ပညတ်အပ်သော အရှေ့၊ အနောက်၊ နံနက်၊ ညဉ့် စသည်။" },
  { id: 5, name: "အာကာသပညတ်", desc: "ကိုင်တွယ်တွေ့ထိ၍ မရရှိရာကို စွဲ၍ ခေါ်ဝေါ် ပညတ်အပ်သော တွင်း၊ လိုဏ်၊ ဂူ စသည်။" },
  { id: 6, name: "ကသိဏနိမိတ္တာဒိပညတ်", desc: "ပွားများအားထုတ်အပ်သော မဟာဘုတ်စသည်ကို စွဲ၍ ခေါ်ဝေါ် ပညတ်အပ်သော ပထဝီကသိုဏ်းနိမိတ် စသည်။" },
];

const SADDA_PANNATTI = [
  { id: 1, name: "ဝိဇ္ဇမာနပညတ်", desc: "ပရမတ္ထအားဖြင့် ထင်ရှားရှိသော ဖဿ၊ နာမ်၊ ရူပ် စသော အနက်ကို ခေါ်ဝေါ်သော သဒ္ဒပညတ်။" },
  { id: 2, name: "အဝိဇ္ဇမာနပညတ်", desc: "ပရမတ္ထအားဖြင့် ထင်ရှားမရှိသော မောင်ဝ၊ ဘူမိ၊ ပဗ္ဗတ စသော အနက်ကို ခေါ်ဝေါ်သော သဒ္ဒပညတ်။" },
  { id: 3, name: "ဝိဇ္ဇမာနေန အဝိဇ္ဇမာနပညတ်", desc: "ပရမတ္ထအားဖြင့် ထင်ရှားရှိသည်ဖြစ်၍ ထင်ရှားမရှိသော ဆဠဘိညာ (အဘိညာဉ်ရှင်) ကဲ့သို့ အနက်ကို သိစေသော သဒ္ဒပညတ်။" },
  { id: 4, name: "အဝိဇ္ဇမာနေန ဝိဇ္ဇမာနပညတ်", desc: "ပရမတ္ထအားဖြင့် ထင်ရှားမရှိသောအနက်ဖြင့် ထင်ရှားရှိသော ဣတ္ထိသဒ္ဒါ (မိန်းအသံ) ကဲ့သို့ အနက်ကို သိစေသော သဒ္ဒပညတ်။" },
  { id: 5, name: "ဝိဇ္ဇမာနေန ဝိဇ္ဇမာနပညတ်", desc: "ပရမတ္ထအားဖြင့် ထင်ရှားရှိသောအနက် ၂-ပါးကိုပင် စက္ခုဝိညာဏ် ကဲ့သို့ သိစေသော သဒ္ဒပညတ်။" },
  { id: 6, name: "အဝိဇ္ဇမာနေန အဝိဇ္ဇမာနပညတ်", desc: "ပရမတ္ထအားဖြင့် ထင်ရှားမရှိသောအနက် ၂-ပါးကို ရာဇပုတ္တာ ကဲ့သို့ သိစေသော သဒ္ဒပညတ်။" },
];
const NIBBANA_GUNA = [
  { id: 1, name: "အစ္စုတံ", desc: "စုတေ ရွေ့လျောခြင်း မရှိသောတရား။" },
  { id: 2, name: "အစ္စန္တံ", desc: "စုတိဟုဆိုအပ်သော အဆုံးကို လွန်သောတရား။" },
  { id: 3, name: "အသင်္ခတံ", desc: "ကံ၊ စိတ်၊ ဥတု၊ အာဟာရ တည်းဟူသော အကြောင်းတရားတို့ မပြုပြင်အပ်သောတရား။" },
  { id: 4, name: "အနုတ္တရံ", desc: "အတုမရှိ လွန်မြတ်သော တရား။" },
  { id: 5, name: "ပဒံ", desc: "အရိယာပုဂ္ဂိုလ်တို့ ရောက်အပ်သော တရား။" },
];
const RUPA_DESCS = {
  1: "မာမှု/ပျော့မှု/ကြမ်းမှု/ချောမှု/လေးမှု/ပေါ့မှု သဘော — ခက်မာခိုင်မာမှု (ထောက်ကန်ရာ) သဘောရှိသော မဟာဘုတ်ဓာတ်။",
  2: "ယိုစီးမှု၊ ဖွဲ့စည်းမှု (အာဗန္ဓန) သဘောရှိသော မဟာဘုတ်ဓာတ်။",
  3: "ပူမှု/အေးမှု၊ ရင့်ကျက်စေမှု (ပရိပါစန) သဘောရှိသော မဟာဘုတ်ဓာတ်။",
  4: "ထောက်ကန်မှု (ဝိတ္ထမ္ဘန)၊ တွန်းကန်မှု (သမုဒီရဏ) သဘောရှိသော မဟာဘုတ်ဓာတ်။",
  5: "မျက်စိအကြည် — အဆင်း (ရူပါရုံ) ကို မြင်နိုင်စေသော ပသာဒရုပ်။",
  6: "နားအကြည် — အသံ (သဒ္ဒါရုံ) ကို ကြားနိုင်စေသော ပသာဒရုပ်။",
  7: "နှာခေါင်းအကြည် — အနံ့ (ဂန္ဓာရုံ) ကို နံနိုင်စေသော ပသာဒရုပ်။",
  8: "လျှာအကြည် — အရသာ (ရသာရုံ) ကို သိနိုင်စေသော ပသာဒရုပ်။",
  9: "ကိုယ်အကြည် — တစ်ကိုယ်လုံး၌ ပျံ့နှံ့တည်၍ တွေ့ထိမှု (ဖောဋ္ဌဗ္ဗာရုံ) ကို သိနိုင်စေသော ပသာဒရုပ်။",
  10: "အရောင်/အဆင်း (ဝဏ္ဏ) — မျက်စိဖြင့် မြင်ရသော ဂေါစရရုပ်။",
  11: "အသံ — နားဖြင့် ကြားရသော ဂေါစရရုပ်။",
  12: "အနံ့ — နှာခေါင်းဖြင့် နံရသော ဂေါစရရုပ်။",
  13: "အရသာ — လျှာဖြင့် သိရသော ဂေါစရရုပ်။",
  14: "အမျိုးသမီး ဖြစ်ကြောင်းရုပ် — တစ်ကိုယ်လုံး၌ ပျံ့နှံ့တည်နေသော ဘာဝရုပ်။",
  15: "အမျိုးသား ဖြစ်ကြောင်းရုပ် — တစ်ကိုယ်လုံး၌ ပျံ့နှံ့တည်နေသော ဘာဝရုပ်။",
  16: "မနောဓာတ်+မနောဝိညာဏဓာတ်ဟူသော အသိစိတ်တို့၏ မှီရာဖြစ်သော ရုပ် — နှလုံးအိမ်အတွင်း တည်ရှိသည်။",
  17: "ဇီဝိတိန္ဒြေ (သက်စောင့်ရုပ်) — ကမ္မဇရုပ်တို့ကို စောင့်ရှောက်ပေးသော အသက်ရုပ်၊ တစ်ကိုယ်လုံး၌ ပျံ့နှံ့တည်ရှိသည်။",
  18: "ကဗဠီကာရအာဟာရ — စားမျိုအပ်သော အစာအာဟာရ၌ ပါဝင်သည့် အဆီအစေးအနှစ်ဩဇာ။",
  19: "အာကာသဓာတ် — ရုပ်ကလာပ်တို့ကို တစ်ခုနှင့်တစ်ခု မရောယှက်ရအောင် ပိုင်းခြားပေးသော အကြားအပေါက်။",
  20: "ကိုယ်ဖြင့် သိစေတတ်သော ကိုယ်အမူအရာ — စိတ်ကြောင့်သာ ဖြစ်သော ဝိညတ်ရုပ်။",
  21: "နှုတ်ဖြင့် (စကားသံဖြင့်) သိစေတတ်သော နှုတ်အမူအရာ — စိတ်ကြောင့်သာ ဖြစ်သော ဝိညတ်ရုပ်။",
  22: "စိတ်/ဥတု/အာဟာရကြောင့် ဖြစ်သော ရုပ်တို့၏ ပေါ့မှုသဘော (ဝိကာရရုပ်)။",
  23: "စိတ်/ဥတု/အာဟာရကြောင့် ဖြစ်သော ရုပ်တို့၏ နူးညံ့မှုသဘော (ဝိကာရရုပ်)။",
  24: "စိတ်/ဥတု/အာဟာရကြောင့် ဖြစ်သော ရုပ်တို့၏ အမှု၌ ကောင်းမွန်ခံ့ညားမှုသဘော (ဝိကာရရုပ်)။",
  25: "ဘဝတစ်ခု၌ ရုပ်အစစ်တို့၏ ရှေးဦးအစ ဖြစ်ခြင်း၊ ဣန္ဒြေပြည့်စုံသည်တိုင် တိုးတက်ဖြစ်ခြင်းသဘော (လက္ခဏရုပ်)။",
  26: "ဣန္ဒြေပြည့်စုံပြီးနောက် ရုပ်အစစ်တို့ ရှေးနှင့်နောက် အစဉ်မပြတ် ဆက်စပ်၍ အထပ်ထပ်ဖြစ်ခြင်းသဘော (လက္ခဏရုပ်)။",
  27: "ရုပ်အစစ်တို့၏ ရင့်ခြင်း၊ အိုခြင်း၊ ဆွေးမြည့်ခြင်းသဘော (တည်မှု=ဌီကာလ) (လက္ခဏရုပ်)။",
  28: "ရုပ်အစစ်တို့၏ ပျက်ခြင်းသဘော (ပျက်မှု=ဘင်ကာလ) (လက္ခဏရုပ်)။",
};

const RUPAS = [
  ...["ပထဝီ", "တေဇော", "အာပေါ", "ဝါယော"].map((name, i) => ({ id: i + 1, name, group: 'mahabhuta', color: 'bg-amber-600', desc: RUPA_DESCS[i + 1] })),
  ...["စက္ခု", "သောတ", "ဃာန", "ဇိဝှာ", "ကာယ"].map((name, i) => ({ id: i + 5, name, group: 'upadaya', subGroup: 'pasada', color: 'bg-amber-300', desc: RUPA_DESCS[i + 5] })),
  ...["ရူပါရုံ", "သဒ္ဒါရုံ", "ဂန္ဓာရုံ", "ရသာရုံ"].map((name, i) => ({ id: i + 10, name, group: 'upadaya', subGroup: 'gocara', color: 'bg-amber-300', desc: RUPA_DESCS[i + 10] })),
  // ဖောဋ္ဌဗ္ဗာရုံ = ပထဝီ+တေဇော+ဝါယော (မဟာဘုတ်ကို ကိုယ်စားပြုသော virtual dot ၃ ခု) — id 29-31 သည် အစစ်အမှန်ရုပ်အသစ် မဟုတ်ပါ၊
  // ရုပ် (၂၈) ပါး စုစုပေါင်းထဲ မထည့်တွက်ပါ (ALL_RUPA_IDS မှာ filter ထုတ်ထားသည်)
  ...["ပထဝီ", "တေဇော", "ဝါယော"].map((name, i) => ({ id: i + 29, name, group: 'upadaya', subGroup: 'gocara', color: 'bg-amber-500', virtual: true, refIds: [1, 2, 4], groupLabel: 'ဖောဋ္ဌဗ္ဗာရုံ', desc: "ပထဝီ/တေဇော/ဝါယောဓာတ်ကြီး ၃-ပါးကိုပင် တွေ့ထိ၍ရသောကြောင့် ဖောဋ္ဌဗ္ဗာရုံဟု ခေါ်သည် — သီးသန့်ရုပ်အသစ်မဟုတ်၊ မဟာဘုတ်၏ ကိုယ်စားပြုခြင်းသာ ဖြစ်သည်။" })),
  ...["ဣတ္ထိဘော", "ပုမ္ဘာဝ"].map((name, i) => ({ id: i + 14, name, group: 'upadaya', subGroup: 'bhava', color: 'bg-amber-300', desc: RUPA_DESCS[i + 14] })),
  ...["ဟဒယဝတ္ထု"].map((name, i) => ({ id: i + 16, name, group: 'upadaya', subGroup: 'hadaya', color: 'bg-amber-300', desc: RUPA_DESCS[i + 16] })),
  ...["ဇီဝိတ"].map((name, i) => ({ id: i + 17, name, group: 'upadaya', subGroup: 'jivita', color: 'bg-amber-300', desc: RUPA_DESCS[i + 17] })),
  ...["အာဟာရ"].map((name, i) => ({ id: i + 18, name, group: 'upadaya', subGroup: 'ahara', color: 'bg-amber-300', desc: RUPA_DESCS[i + 18] })),
  ...["အာကာသ"].map((name, i) => ({ id: i + 19, name, group: 'upadaya', subGroup: 'pariccheda', color: 'bg-amber-300', desc: RUPA_DESCS[i + 19] })),
  // ဝိကာရရုပ် (၅) — ရူပလဟုတာ/မုဒုတာ/ကမ္မညတာကို "ကာယဿ" ဟု ရေးထားပြီး၊ ဝိညတ်ရုပ် ၂-ပါးကိုပါ ဤအုပ်စုထဲပေါင်းထည့်ထားသည်
  ...["ရူပဿ လဟုတာ", "ရူပဿ မုဒုတာ", "ရူပဿ ကမ္မညတာ", "ကာယဝိညတ်", "ဝစီဝိညတ်"].map((name, i) => ({ id: i + 20, name, group: 'upadaya', subGroup: 'vikara', color: 'bg-amber-300', desc: RUPA_DESCS[i + 20] })),
  ...["ဥပစယ", "သန္တတိ", "ဇရတာ", "အနိစ္စတာ"].map((name, i) => ({ id: i + 25, name, group: 'upadaya', subGroup: 'lakkhana', color: 'bg-amber-300', desc: RUPA_DESCS[i + 25] }))
];

const UPADAYA_LAYOUT = [
  { id: 'pasada', title: 'ပသာဒရုပ် (၅)' },
  { id: 'gocara', title: 'ဝိသယရုပ် (၄)' },
  { id: 'bhava', title: 'ဘာဝရုပ် (၂)' },
  { id: 'hadaya', title: 'ဟဒယရုပ် (၁)' },
  { id: 'jivita', title: 'ဇီဝိတရုပ် (၁)' },
  { id: 'ahara', title: 'အာဟာရရုပ် (၁)' },
  { id: 'pariccheda', title: 'ပရိစ္ဆေဒရုပ် (၁)' },
  { id: 'vinnatti', title: 'ဝိညတ်ရုပ် (၂)' },
  { id: 'vikara', title: 'ဝိကာရရုပ် (၃)' },
  { id: 'lakkhana', title: 'လက္ခဏရုပ် (၄)' },
];
// ရုပ်ကလာပ် (Rupa-kalapa) — ကမ္မဇ/စိတ္တဇ/ဥတုဇ/အာဟာရဇ ၄-အုပ်စု
// suddhatthaka (သုဒ္ဓဋ္ဌက) = မဟာဘုတ်(၄) + ရူပ + ဂန္ဓ + ရသ + အာဟာရ = [1,2,3,4,10,12,13,18]
const SUDDHATTHAKA_IDS = [1,2,3,4,10,12,13,18];
const VIKARA3_IDS = [22,23,24]; // ကာယဿ လဟုတာ/မုဒုတာ/ကမ္မညတာ

const KAMMAJA_KALAPAS = [
  { id: 'cakkhu-dasaka', name: 'စက္ခုဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 5] },
  { id: 'sota-dasaka', name: 'သောတဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 6] },
  { id: 'ghana-dasaka', name: 'ဃာနဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 7] },
  { id: 'jivha-dasaka', name: 'ဇိဝှါဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 8] },
  { id: 'kaya-dasaka', name: 'ကာယဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 9] },
  { id: 'itthibhava-dasaka', name: 'ဣတ္ထိဘာဝဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 14] },
  { id: 'pumbhava-dasaka', name: 'ပုမ္ဘာဝဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 15] },
  { id: 'vatthu-dasaka', name: 'ဝတ္ထုဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17, 16] },
  { id: 'jivita-navaka', name: 'ဇီဝိတနဝကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 17] },
];

const CITTAJA_KALAPAS = [
  { id: 'c-suddhatthaka', name: 'သုဒ္ဓဋ္ဌကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS] },
  { id: 'kaya-vinnatti-navaka', name: 'ကာယဝိညတ္တိနဝကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 20] },
  { id: 'vaci-vinnatti-dasaka', name: 'ဝစီဝိညတ္တိဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 21, 11] },
  { id: 'lahutadi-ekadasaka-c', name: 'လဟုတာဒိဧကာဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, ...VIKARA3_IDS] },
  { id: 'kaya-vinnatti-lahutadi-dvadasaka', name: 'ကာယဝိညတ္တိလဟုတာဒိဒွါဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 20, ...VIKARA3_IDS] },
  { id: 'vaci-vinnatti-sadda-lahutadi-terasaka', name: 'ဝစီဝိညတ္တိသဒ္ဒလဟုတာဒိတေရသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 21, 11, ...VIKARA3_IDS] },
];

const UTUJA_KALAPAS = [
  { id: 'u-suddhatthaka', name: 'သုဒ္ဓဋ္ဌကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS] },
  { id: 'sadda-navaka', name: 'သဒ္ဒနဝကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 11] },
  { id: 'lahutadi-ekadasaka-u', name: 'လဟုတာဒိဧကာဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, ...VIKARA3_IDS] },
  { id: 'sadda-lahutadi-dvadasaka', name: 'သဒ္ဒလဟုတာဒိဒွါဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, 11, ...VIKARA3_IDS] },
];

const AHARAJA_KALAPAS = [
  { id: 'a-suddhatthaka', name: 'သုဒ္ဓဋ္ဌကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS] },
  { id: 'lahutadi-ekadasaka-a', name: 'လဟုတာဒိဧကာဒသကကလာပ်', rupaIds: [...SUDDHATTHAKA_IDS, ...VIKARA3_IDS] },
];

const KALAPA_GROUPS = [
  { id: 'kammaja', name: 'ကမ္မဇကလာပ် (၉)', items: KAMMAJA_KALAPAS, color: 'rose' },
  { id: 'cittaja', name: 'စိတ္တဇကလာပ် (၆)', items: CITTAJA_KALAPAS, color: 'indigo' },
  { id: 'utuja', name: 'ဥတုဇကလာပ် (၄)', items: UTUJA_KALAPAS, color: 'emerald' },
  { id: 'aharaja', name: 'အာဟာရဇကလာပ် (၂)', items: AHARAJA_KALAPAS, color: 'amber' },
];

// စိတ္တဇရုပ် — စိတ်တစ်ခုချင်းစီက ဘယ်အမျိုးအစား ရုပ်များကို ထုတ်လုပ်နိုင်သလဲ ဆိုတဲ့ citta id အုပ်စုများ
const CJ_LOBHA_SOMA = [1, 2, 5, 6];
const CJ_LOBHA_UPE = [3, 4, 7, 8];
const CJ_DOSA = [9, 10];
const CJ_MOHA = [11, 12];
const CJ_SAMPATICCHANA_SANTIRANA_PANCADVARA = [18, 19, 25, 26, 27, 28];
const CJ_MANODVARA_HASITUPPADA = [29, 30];
const CJ_MAHAKUSALA_SOMA = [31, 32, 33, 34];
const CJ_MAHAKUSALA_UPE = [35, 36, 37, 38];
const CJ_MAHAKIRIYA_SOMA = [47, 48, 49, 50];
const CJ_MAHAKIRIYA_UPE = [51, 52, 53, 54];
const CJ_RUPA_KUSALA = [55, 56, 57, 58, 59];
const CJ_DVIPANCA_NONE = Array.from(DVIPANCA_IDS);
const CJ_MAHAVIPAKA_NONE = Array.from({ length: 8 }, (_, i) => i + 39);

const CJ_RUPASAMANNA_IDS = [
  ...CJ_LOBHA_SOMA, ...CJ_LOBHA_UPE, ...CJ_DOSA, ...CJ_MOHA,
  ...CJ_SAMPATICCHANA_SANTIRANA_PANCADVARA, ...CJ_MANODVARA_HASITUPPADA,
  ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKUSALA_UPE, ...CJ_MAHAKIRIYA_SOMA, ...CJ_MAHAKIRIYA_UPE, ...CJ_RUPA_KUSALA,
];
const CJ_IRIYAPATHA_IDS = [
  ...CJ_LOBHA_SOMA, ...CJ_LOBHA_UPE, ...CJ_DOSA, ...CJ_MOHA, ...CJ_MANODVARA_HASITUPPADA,
  ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKUSALA_UPE, ...CJ_MAHAKIRIYA_SOMA, ...CJ_MAHAKIRIYA_UPE, ...CJ_RUPA_KUSALA,
];
const CJ_VINNATTI_IDS = [
  ...CJ_LOBHA_SOMA, ...CJ_LOBHA_UPE, ...CJ_DOSA, ...CJ_MOHA, ...CJ_MANODVARA_HASITUPPADA,
  ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKUSALA_UPE, ...CJ_MAHAKIRIYA_SOMA, ...CJ_MAHAKIRIYA_UPE,
];
const CJ_HASITUPPADA_IDS = [...CJ_LOBHA_SOMA, ...CJ_MANODVARA_HASITUPPADA, ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKIRIYA_SOMA];
const CJ_NONE_IDS = [...CJ_DVIPANCA_NONE, ...CJ_MAHAVIPAKA_NONE];

const CITTAJA_RUPA_TYPES = [
  { id: 'rupasamanna', name: 'ရုပ်သာမည', cittaIds: CJ_RUPASAMANNA_IDS },
  { id: 'iriyapatha', name: 'ဣရိယာပုထ်', cittaIds: CJ_IRIYAPATHA_IDS },
  { id: 'vinnatti', name: 'ဝိညတ်', cittaIds: CJ_VINNATTI_IDS },
  { id: 'hasituppada', name: 'ရယ်ရွှင်ခြင်း', cittaIds: CJ_HASITUPPADA_IDS },
  { id: 'cj-none', name: 'ဘာရုပ်မျှ မဖြစ်', cittaIds: CJ_NONE_IDS },
];

// ရူပသမုဋ္ဌာန် - ကမ္မဇ/စိတ္တဇ/ဥတုဇ/အာဟာရဇ (၄) မျိုး + နကုတောစိရုပ် (ဘာအကြောင်းကြောင့်မျှ မဟုတ်၊ လက္ခဏရုပ်သီးသန့်)
// ဧကန် (ထိုအကြောင်းတစ်ခုတည်းကြောင့်သာဖြစ်) / အနေကန် (တခြားအကြောင်းများနှင့်လည်း ထပ်တူဖြစ်) ခွဲခြားပြထားသည်
const PATHAVI_APO_TEJO_VAYO = [1, 2, 3, 4];
const RUPA_GANDHA_RASA_PHOTTHABBA = [10, 12, 13]; // ရူပ+ဂန္ဓ+ရသ (ဖောဋ္ဌဗ္ဗကို မဟာဘုတ် ၃ ပါးက ကိုယ်စားပြုပြီးသားမို့ ဒီနေရာမှာ ထပ်မတွက်ပါ
const AHARA_AKASA = [18, 19];
const VIKARA3 = [22, 23, 24]; // ကာယဿ လဟုတာ/မုဒုတာ/ကမ္မညတာ

const KAMMAJA_EKANTA_IDS = [5, 6, 7, 8, 9, 14, 15, 16, 17]; // စက္ခု/သောတ/ဃာန/ဇိဝှါ/ကာယ + ဣတ္ထိဘော/ပုမ္ဘာဝ/ဟဒယဝတ္ထု/ဇီဝိတ (၉)
const KAMMAJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, ...AHARA_AKASA]; // (၉)
const KAMMAJA_ALL_IDS = [...KAMMAJA_EKANTA_IDS, ...KAMMAJA_ANEKANTA_IDS]; // (၁၈)

const CITTAJA_EKANTA_IDS = [20, 21]; // ကာယဝိညတ်/ဝစီဝိညတ် (၂)
const CITTAJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, 11, ...AHARA_AKASA, ...VIKARA3]; // (၁၃) — သဒ္ဒပါဝင်
const CITTAJA_ALL_IDS = [...CITTAJA_EKANTA_IDS, ...CITTAJA_ANEKANTA_IDS]; // (၁၅)

const UTUJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, 11, ...AHARA_AKASA, ...VIKARA3]; // (၁၃) — ဧကန်မရှိ
const UTUJA_ALL_IDS = [...UTUJA_ANEKANTA_IDS];

const AHARAJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, ...AHARA_AKASA, ...VIKARA3]; // (၁၂) — သဒ္ဒမပါ၊ ဧကန်မရှိ
const AHARAJA_ALL_IDS = [...AHARAJA_ANEKANTA_IDS];

const NAKUTOJA_IDS = [25, 26, 27, 28]; // လက္ခဏရုပ် (၄) — ဘာအကြောင်းကြောင့်မျှ မဟုတ်ဟု မဆိုနိုင်

const RUPA_SAMUTTHANA_TYPES = [
  { id: 'kammaja', name: 'ကမ္မဇရုပ် (၁၈)', rupaIds: KAMMAJA_ALL_IDS, sub: [
    { id: 'kammaja-ekanta', name: 'ဧကန် (၉)', rupaIds: KAMMAJA_EKANTA_IDS },
    { id: 'kammaja-anekanta', name: 'အနေကန် (၉)', rupaIds: KAMMAJA_ANEKANTA_IDS },
  ]},
  { id: 'cittaja', name: 'စိတ္တဇရုပ် (၁၅)', rupaIds: CITTAJA_ALL_IDS, sub: [
    { id: 'cittaja-ekanta', name: 'ဧကန် (၂)', rupaIds: CITTAJA_EKANTA_IDS },
    { id: 'cittaja-anekanta', name: 'အနေကန် (၁၃)', rupaIds: CITTAJA_ANEKANTA_IDS },
  ]},
  { id: 'utuja', name: 'ဥတုဇရုပ် (၁၃)', rupaIds: UTUJA_ALL_IDS, sub: [
    { id: 'utuja-anekanta', name: 'အနေကန် (၁၃) — ဧကန်မရှိ', rupaIds: UTUJA_ANEKANTA_IDS },
  ]},
  { id: 'aharaja', name: 'အာဟာရဇရုပ် (၁၂)', rupaIds: AHARAJA_ALL_IDS, sub: [
    { id: 'aharaja-anekanta', name: 'အနေကန် (၁၂) — ဧကန်မရှိ', rupaIds: AHARAJA_ANEKANTA_IDS },
  ]},
  { id: 'nakutoja', name: 'နကုတောစိရုပ် (၄)', rupaIds: NAKUTOJA_IDS, note: 'လက္ခဏရုပ် (၄) — ကံ/စိတ်/ဥတု/အာဟာရ တစ်ခုခုကြောင့်ဟု အတိအကျ မဆိုနိုင်ဘဲ ရုပ်တို့၏ ဖြစ်/ရင့်/ပျက် အခိုက်အတန့်ကိုသာ ညွှန်းသည်' },
];
// ALL_CITTA_IDS ကို BHUMI_31 data (အောက်ပါ OTHER_NOBLE_7_IDS) ထက်ရှေ့ သုံးမယ့်အတွက် ဒီနေရာမှာ ရှေ့ထွက်ကြေညာထားသည်
// (မူရင်း "သဗ္ဗသင်္ဂဟ" အပိုင်းက declaration ကို ဖျက်ထားပြီးဖြစ်သည်)
const ALL_CITTA_IDS = CITTAS.map(c => c.id);

// ၃၁-ဘုံအတွက် citta id အုပ်စုများ — "ဘုံတစ်ခုစီ၌ ဖြစ်နိုင်သောစိတ်"
// တိကျစွာ ပြန်လည်တည်ဆောက်ထားသည်
const B_LOBHA_8 = [1,2,3,4,5,6,7,8];
const B_DOSA_2 = [9,10];
const B_MOHA_2 = [11,12];
const B_CAKKHU_VIN_2 = [13,20];
const B_SOTA_VIN_2 = [14,21];
const B_GHANA_VIN_2 = [15,22];
const B_JIVHA_VIN_2 = [16,23];
const B_KAYA_VIN_2 = [17,24];
const B_SAMPATICCHANA_2 = [18,25];
const B_SANTIRANA_3 = [19,26,27];
const B_PANCADVARAVAJJANA_1 = [28];
const B_MANODVARAVAJJANA_1 = [29];
const B_HASITUPPADA_1 = [30];
const B_MAHA_KUSALA_8 = Array.from({ length: 8 }, (_, i) => i + 31);
const B_MAHA_VIPAKA_8 = Array.from({ length: 8 }, (_, i) => i + 39);
const B_MAHA_KIRIYA_8 = Array.from({ length: 8 }, (_, i) => i + 47);
const B_RUPA_KUSALA_5 = Array.from({ length: 5 }, (_, i) => i + 55); // 55=ပထမ..59=ပဉ္စမ
const B_RUPA_VIPAKA_5 = Array.from({ length: 5 }, (_, i) => i + 60); // 60=ပထမ..64=ပဉ္စမ
const B_RUPA_KIRIYA_5 = Array.from({ length: 5 }, (_, i) => i + 65); // 65=ပထမ..69=ပဉ္စမ
const B_ARUPA_KUSALA_4 = [70,71,72,73]; // အာကာသ,ဝိညာဏ,အာကိဉ္စည,နေဝသညာ
const B_ARUPA_VIPAKA_4 = [74,75,76,77];
const B_ARUPA_KIRIYA_4 = [78,79,80,81];
const B_SOTAPATTI_MAGGA_1 = [82];
const B_OTHER_LOKUTTARA_7 = [87,92,97,102,107,112,117]; // သက/အနာ/အရမဂ် + ဖိုလ်-၄ (အကျဉ်းကိုးကား)

// ဝီထိစိတ် (၈၀) — ရူပဝိပါက်(၅)+အရူပဝိပါက်(၄) ကို ကြဉ်လိုက်လျှင် ကျန်စိတ်အားလုံး
const B_VITHI_80 = [
  ...B_LOBHA_8, ...B_DOSA_2, ...B_MOHA_2,
  ...B_CAKKHU_VIN_2, ...B_SOTA_VIN_2, ...B_GHANA_VIN_2, ...B_JIVHA_VIN_2, ...B_KAYA_VIN_2,
  ...B_SAMPATICCHANA_2, ...B_SANTIRANA_3, ...B_PANCADVARAVAJJANA_1, ...B_MANODVARAVAJJANA_1, ...B_HASITUPPADA_1,
  ...B_MAHA_KUSALA_8, ...B_MAHA_VIPAKA_8, ...B_MAHA_KIRIYA_8,
  ...B_RUPA_KUSALA_5, ...B_RUPA_KIRIYA_5,
  ...B_ARUPA_KUSALA_4, ...B_ARUPA_KIRIYA_4,
  ...B_SOTAPATTI_MAGGA_1, ...B_OTHER_LOKUTTARA_7,
]; // = 80 ပါး

// ကာမာဝစရဘုံ (အပါယ်+ကာမသုဂတိ ၁၁-ဘုံ) — ဝီထိစိတ် ၈၀-လုံး ရနိုင် (ရူပ/အရူပဝိပါက်သာ မရနိုင်)
const KAMAVACARA_CITTA_IDS = [...B_VITHI_80];

// ရူပါဝစရဘုံ (အသညသတ်မှလွဲ) အခြေခံ — ဝီထိစိတ် ၆၄ (ဒေါသမူဒွေး၊ ဃာန/ဇိဝှါ/ကာယဝိညာဏ်-၆၊ မဟာဝိပါက်-၈ ကို ကြဉ်ထား)
const B_RUPA_BASE_64 = B_VITHI_80.filter(id =>
  ![...B_DOSA_2, ...B_GHANA_VIN_2, ...B_JIVHA_VIN_2, ...B_KAYA_VIN_2, ...B_MAHA_VIPAKA_8].includes(id)
); // = 64 ပါး
// ဇာန်အဆင့်ကိုက် ဝီထိမုတ် ရူပဝိပါက် (တစ်ခုတည်း) ပေါင်းထည့်ရန် — 64+1=65
const rupaBhumiCittas = (vipakaId) => [...B_RUPA_BASE_64, vipakaId];

// အရူပါဝစရဘုံ (၄) အခြေခံ — ဝီထိစိတ် ၄၂ (ဒေါသ+ဒွေပဉ္စဝိညာဏ်-၁၂၊ သမ္ပဋိစ္ဆိုင်း-၂၊ သန္တီရဏ-၃၊ ပဉ္စဒွါရာဝဇ္ဇန်း-၁၊
// ဟသိတုပ္ပါဒ်-၁၊ မဟာဝိပါက်-၈၊ ရူပကုသိုလ်+ကြိယာ-၁၀၊ သောတာပတ္တိမဂ်-၁ = ၃၈-ပါး ကြဉ်ထား)
const B_ARUPA_BASE_42 = [
  ...B_LOBHA_8, ...B_MOHA_2, ...B_MANODVARAVAJJANA_1,
  ...B_MAHA_KUSALA_8, ...B_MAHA_KIRIYA_8,
  ...B_ARUPA_KUSALA_4, ...B_ARUPA_KIRIYA_4,
  ...B_OTHER_LOKUTTARA_7,
]; // = 42 ပါး
// အထက်ဘုံရောက်လေ အောက်အဆင့် အရူပဇန်ကုသိုလ်/ကြိယာ မရနိုင်တော့ — level: 0=အာကာသ,1=ဝိညာဏ,2=အာကိဉ္စည,3=နေဝသညာ
const arupaBhumiCittas = (level, vipakaId) => {
  const belowKusala = B_ARUPA_KUSALA_4.slice(0, level);
  const belowKiriya = B_ARUPA_KIRIYA_4.slice(0, level);
  return [
    ...B_ARUPA_BASE_42.filter(id => !belowKusala.includes(id) && !belowKiriya.includes(id)),
    vipakaId,
  ];
};

const ASANNASATTA_CITTA_IDS = []; // ဇီဝိတနဝကကလာပ်သာရှိ၊ စိတ်၊ စေတသိက် လုံးဝမရှိသောဘုံ

const bhumiCittaDesc = (ids) => ({ cittaIds: ids });
// ဘုံအလိုက် ရနိုင်တဲ့ ရုပ် id များ
const KAMA_BHUMI_RUPA_IDS = Array.from({ length: 28 }, (_, i) => i + 1); // ကာမဘုံ - ရုပ် ၂၈-ပါးလုံး
const RUPA_BHUMI_RUPA_IDS = KAMA_BHUMI_RUPA_IDS.filter(id => ![7, 8, 9, 14, 15].includes(id)); // ရူပဘုံ - ၂၃-ပါး (ဃာန/ဇိဝှါ/ကာယပသာဒ + ဘာဝရုပ်-၂ ကြဉ်)
const ASANNASATTA_RUPA_IDS = [1, 2, 3, 4, 10, 12, 13, 18, 17, 22, 23, 24, 19, 25, 26, 27, 28]; // အသညသတ်ဘုံ - ၁၇-ပါး
const ARUPA_BHUMI_RUPA_IDS = []; // အရူပဘုံ - ရုပ် လုံးဝမရှိ
// ၃၁-ဘုံ (ဘဝဂြိုသ်စက်ဝန်း) — အပါယဘုံ(၄) + ကာမသုဂတိဘုံ(၇) + ရူပဗြဟ္မာ့ဘုံ(၁၆) + အရူပဗြဟ္မာ့ဘုံ(၄) = ၃၁
// အောက်ဆုံးမှ အပေါ်ဆုံးသို့ (ascending — အပါယ်ကနေ စတင်ပြီး အရူပအထိ) စီထားသည်
// item တစ်ခုစီကို နှိပ်လိုက်ရင် ဆိုင်ရာဘုံ၏ ဖြစ်နိုင်သောစိတ် (citta-multi) ကို citta/cetasika panel ဖြင့် highlight ပြသည်
const BHUMI_31 = [
  { group: 'arupa', name: 'အရူပဗြဟ္မာ့ဘုံ (၄)', color: 'violet', items: [
    { name: 'နေဝသညာနာသညာယတနဘုံ', life: 'ကမ္ဘာ ၈၄,၀၀၀-ကပ်', cittaIds: arupaBhumiCittas(3, 77), rupaIds: ARUPA_BHUMI_RUPA_IDS },
    { name: 'အာကိဉ္စညာယတနဘုံ', life: 'ကမ္ဘာ ၆၀,၀၀၀-ကပ်', cittaIds: arupaBhumiCittas(2, 76), rupaIds: ARUPA_BHUMI_RUPA_IDS },
    { name: 'ဝိညာဏဉ္စာယတနဘုံ', life: 'ကမ္ဘာ ၄၀,၀၀၀-ကပ်', cittaIds: arupaBhumiCittas(1, 75), rupaIds: ARUPA_BHUMI_RUPA_IDS },
    { name: 'အာကာသာနဉ္စာယတနဘုံ', life: 'ကမ္ဘာ ၂၀,၀၀၀-ကပ်', cittaIds: arupaBhumiCittas(0, 74), rupaIds: ARUPA_BHUMI_RUPA_IDS },
  ]},
  { group: 'rupa', name: 'ရူပဗြဟ္မာ့ဘုံ (၁၆)', color: 'sky', subgroups: [
    { name: 'သုဒ္ဓါဝါသဘုံ', color: 'indigo', items: [
      { name: 'အကနိဋ္ဌာ', life: 'ကမ္ဘာ ၁၆,၀၀၀-ကပ်', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'သုဒဿီ', life: 'ကမ္ဘာ ၈,၀၀၀-ကပ်', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'သုဒဿာ', life: 'ကမ္ဘာ ၄,၀၀၀-ကပ်', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'အတပ္ပါ', life: 'ကမ္ဘာ ၂,၀၀၀-ကပ်', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'အဝိဟာ', life: 'ကမ္ဘာ ၁,၀၀၀-ကပ်', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'ပဉ္စမဈာန်ဘူမိ', color: 'blue', items: [
      { name: 'အသညသတ်', life: 'ကမ္ဘာ ၅၀၀-ကပ်', cittaIds: ASANNASATTA_CITTA_IDS, rupaIds: ASANNASATTA_RUPA_IDS, note: 'ဇီဝိတနဝကကလာပ်သာရှိ၊ စိတ်၊ စေတသိက် လုံးဝမရှိသော ဘုံ' },
      { name: 'ဝေဟပ္ဖလာ', life: 'ကမ္ဘာ ၅၀၀-ကပ်', cittaIds: rupaBhumiCittas(63), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'တတိယဈာန်ဘူမိ (၃)', color: 'teal', items: [
      { name: 'သုဘကိဏှာ', life: 'ကမ္ဘာ ၆၄-ကပ်', cittaIds: rupaBhumiCittas(62), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'အပ္ပမာဏသုဘာ', life: 'ကမ္ဘာ ၃၂-ကပ်', cittaIds: rupaBhumiCittas(62), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'ပရိတ္တသုဘာ', life: 'ကမ္ဘာ ၁၆-ကပ်', cittaIds: rupaBhumiCittas(62), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'ဒုတိယဈာန်ဘူမိ (၃)', color: 'cyan', items: [
      { name: 'အာဘဿရာ', life: 'ကမ္ဘာ ၈-ကပ်', cittaIds: rupaBhumiCittas(61), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'အပ္ပမာဏာဘာ', life: 'ကမ္ဘာ ၄-ကပ်', cittaIds: rupaBhumiCittas(61), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'ပရိတ္တာဘာ', life: 'ကမ္ဘာ ၂-ကပ်', cittaIds: rupaBhumiCittas(61), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'ပဌမဈာန်ဘူမိ (၃)', color: 'sky', items: [
      { name: 'မဟာဗြဟ္မာ', life: 'အသင်္ချေယျကပ် ၁-ကပ်', cittaIds: rupaBhumiCittas(60), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'ဗြဟ္မပုရောဟိတာ', life: 'အသင်္ချေယျကပ် ၏ ၁/၂ ဘို့', cittaIds: rupaBhumiCittas(60), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'ဗြဟ္မပါရိသဇ္ဇာ', life: 'အသင်္ချေယျကပ် ၏ ၁/၃ ဘို့', cittaIds: rupaBhumiCittas(60), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
  ]},
  { group: 'kama-sugati', name: 'ကာမသုဂတိဘုံ', color: 'amber', items: [
    { name: 'ပရနိမ္မိတဝသဝတ္တီ (နတ်ပြည်)', life: 'နတ်သက် ၁၆,၀၀၀-နှစ် (≈ လူ့နှစ် ၉,၂၁၆ သန်း)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'နိမ္မာနရတိ (နတ်ပြည်)', life: 'နတ်သက် ၈,၀၀၀-နှစ် (≈ လူ့နှစ် ၂,၃၀၄ သန်း)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'တုသိတာ (နတ်ပြည်)', life: 'နတ်သက် ၄,၀၀၀-နှစ် (≈ လူ့နှစ် ၅၇၆ သန်း)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'ယာမာ (နတ်ပြည်)', life: 'နတ်သက် ၂,၀၀၀-နှစ် (≈ လူ့နှစ် ၁၄၄ သန်း)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'တာဝတိံသာ (နတ်ပြည်)', life: 'နတ်သက် ၁,၀၀၀-နှစ် (≈ လူ့နှစ် ၃၆ သန်း)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'စာတုမဟာရာဇ် (နတ်ပြည်)', life: 'နတ်သက် ၅၀၀-နှစ် (≈ လူ့နှစ် ၉ သန်း)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'မနုဿဘုံ (လူ့ပြည်)', life: 'အသက်အပိုင်းအခြား မသေချာ (မမှန်)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
  ]},
  { group: 'apaya', name: 'အပါယဘုံ (၄)', color: 'rose', items: [
    { name: 'တိရစ္ဆာနဘုံ', life: 'အသက်အပိုင်းအခြား မရှိ', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'ပြိတ္တဘုံ', life: 'အသက်အပိုင်းအခြား မရှိ', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'အသုရကာယဘုံ', life: 'အသက်အပိုင်းအခြား မရှိ', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'နိရယဘုံ (ငရဲ)', life: 'အသက်အပိုင်းအခြား မရှိ — မိမိကံအလိုက် အမျိုးမျိုး', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
  ], note: 'နိရယဘုံအတွင်း ငရဲကြီး (၈)ထပ် — သဉ္ဇီဝ၊ ကာဠသုတ္တ၊ သင်္ဃာတ၊ ရောရုဝ၊ မဟာရောရုဝ၊ တာပန၊ မဟာတာပန၊ အဝီစိ' },
]

// ပုဂ္ဂလစိတ် - ပုဂ္ဂိုလ်အမျိုးအစား (၁၈) မျိုးအလိုက် ရနိုင်သော စိတ်များ
// အောက်ပါ id အုပ်စုများသည် BHUMI_31 data တွင် ရှေ့ဆက်ကြေညာထားပြီးသား ID များကို ပြန်လည်အသုံးပြုသည်
// PUGGALA_* တွက်ချက်မှုများမှာ B_ prefix မပါဘဲ ကိုးကားထားသောကြောင့် alias အဖြစ် ထပ်ကြေညာပေးရန်
const MAHA_KUSALA_8_IDS = B_MAHA_KUSALA_8;
const RUPA_KUSALA_5_IDS = B_RUPA_KUSALA_5;
const ARUPA_KUSALA_4_IDS = B_ARUPA_KUSALA_4;
const MANODVARAVAJJANA_1_IDS = B_MANODVARAVAJJANA_1;
const HASITUPPADA_1_IDS = B_HASITUPPADA_1;
const MAHA_KIRIYA_8_IDS = B_MAHA_KIRIYA_8;
const RUPA_KIRIYA_5_IDS = B_RUPA_KIRIYA_5;
const ARUPA_KIRIYA_4_IDS = B_ARUPA_KIRIYA_4;

const LOBHA_DITTHI_VIPPAYUTTA_IDS = [3, 4, 7, 8];
const LOBHA_ALL_8_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const DOSA_2_IDS = [9, 10];
const VICIKICCHA_1_IDS = [11];
const UDDHACCA_1_IDS = [12];
const AKUSALA_12_IDS = Array.from({ length: 12 }, (_, i) => i + 1);
const DVIPANCA_10_IDS = [13, 14, 15, 16, 17, 20, 21, 22, 23, 24];
const SAMPATICCHANA_2_IDS = [18, 25];
const SANTIRANA_ALL_3_IDS = [19, 26, 27];
const PANCADVARAVAJJANA_1_IDS = [28];
const AVAJJANA_2_IDS = [28, 29];
const MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS = [41, 42, 45, 46];
const MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS = [39, 40, 43, 44];
const CAKKHU_SOTA_VINNANA_4_IDS = [13, 20, 14, 21];
const MAGGA_4_IDS = [82, 87, 92, 97];
const PHALA_SOTAPATTI_1_IDS = [102];
const PHALA_ANAGAMI_1_IDS = [112];
const PHALA_ARAHATTA_1_IDS = [117];
const PHALA_LOWER_3_IDS = [102, 107, 112];


// row တစ်ခုစီ၏ cittaIds ပေါင်းလိုက်တဲ့ အရေအတွက်ကို ဇယားထဲက "Total possible cittas" ကော်လံနှင့် ကိုက်ညီအောင် တွက်ချက်ထားသည်
const PUGGALA_DUGGATI_IDS = [...AKUSALA_12_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS]; // 37
const PUGGALA_SUGATI_AHETUKA_IDS = [...PUGGALA_DUGGATI_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS]; // 41
const PUGGALA_TIHETUKA_KAMA_IDS = [...AKUSALA_12_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS]; // 54
const PUGGALA_RUPAVACARA_IDS = [...LOBHA_ALL_8_IDS, ...VICIKICCHA_1_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS]; // 38
const PUGGALA_ARUPAVACARA_IDS = [...LOBHA_ALL_8_IDS, ...VICIKICCHA_1_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS]; // 23
const PUGGALA_SOTA_SAKA_KAMA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...DOSA_2_IDS, ...UDDHACCA_1_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_SOTAPATTI_1_IDS]; // 50
const PUGGALA_SOTA_SAKA_RUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_SOTAPATTI_1_IDS]; // 34
const PUGGALA_SOTA_SAKA_ARUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_SOTAPATTI_1_IDS]; // 19
const PUGGALA_ANAGAMI_KAMA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_ANAGAMI_1_IDS]; // 48
const PUGGALA_ANAGAMI_RUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_ANAGAMI_1_IDS]; // 34
const PUGGALA_ANAGAMI_ARUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_ANAGAMI_1_IDS]; // 19
const PUGGALA_SEKKHA_KAMA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...DOSA_2_IDS, ...UDDHACCA_1_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...MAGGA_4_IDS, ...PHALA_LOWER_3_IDS]; // 56
const PUGGALA_SEKKHA_RUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...MAGGA_4_IDS, ...PHALA_LOWER_3_IDS]; // 40
const PUGGALA_SEKKHA_ARUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS, ...MAGGA_4_IDS, ...PHALA_LOWER_3_IDS]; // 25
const PUGGALA_ARAHANT_KAMA_IDS = [...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...HASITUPPADA_1_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...MAHA_KIRIYA_8_IDS, ...RUPA_KIRIYA_5_IDS, ...ARUPA_KIRIYA_4_IDS, ...PHALA_ARAHATTA_1_IDS]; // 44
const PUGGALA_ARAHANT_RUPA_IDS = [...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...HASITUPPADA_1_IDS, ...MAHA_KIRIYA_8_IDS, ...RUPA_KIRIYA_5_IDS, ...ARUPA_KIRIYA_4_IDS, ...PHALA_ARAHATTA_1_IDS]; // 30
const PUGGALA_ARAHANT_ARUPA_IDS = [...MANODVARAVAJJANA_1_IDS, ...MAHA_KIRIYA_8_IDS, ...ARUPA_KIRIYA_4_IDS, ...PHALA_ARAHATTA_1_IDS]; // 14

const PUGGALA_CITTA_TYPES = [
  { id: 'duggati', name: 'ဒုဂ္ဂတိပုဂ္ဂိုလ် (၃၇)', cittaIds: PUGGALA_DUGGATI_IDS },
  { id: 'sugati-ahetuka', name: 'သုဂတိ အဟိတ်ပုဂ္ဂိုလ် (၄၁)', cittaIds: PUGGALA_SUGATI_AHETUKA_IDS },
  { id: 'dvihetuka', name: 'ဒွိဟိတ်ပုဂ္ဂိုလ် (၄၁)', cittaIds: PUGGALA_SUGATI_AHETUKA_IDS },
  { id: 'tihetuka-kama', name: 'တိဟိတ် ကာမာဝစရပုဂ္ဂိုလ် (၅၄)', cittaIds: PUGGALA_TIHETUKA_KAMA_IDS },
  { id: 'rupavacara', name: 'ရူပါဝစရပုဂ္ဂိုလ် (ဗြဟ္မာ) (၃၈)', cittaIds: PUGGALA_RUPAVACARA_IDS },
  { id: 'arupavacara', name: 'အရူပါဝစရပုဂ္ဂိုလ် (၂၃)', cittaIds: PUGGALA_ARUPAVACARA_IDS },
  { id: 'maggattha', name: 'မဂ္ဂဋ္ဌပုဂ္ဂိုလ် (၄)', cittaIds: MAGGA_4_IDS },
  { id: 'sota-saka-kama', name: 'သောတာပန်/သကဒါဂါမီ ကာမာဝစရ (၅၀)', cittaIds: PUGGALA_SOTA_SAKA_KAMA_IDS },
  { id: 'sota-saka-rupa', name: 'သောတာပန်/သကဒါဂါမီ ရူပါဝစရ (၃၄)', cittaIds: PUGGALA_SOTA_SAKA_RUPA_IDS },
  { id: 'sota-saka-arupa', name: 'သောတာပန်/သကဒါဂါမီ အရူပါဝစရ (၁၉)', cittaIds: PUGGALA_SOTA_SAKA_ARUPA_IDS },
  { id: 'anagami-kama', name: 'အနာဂါမီ ကာမာဝစရ (၄၈)', cittaIds: PUGGALA_ANAGAMI_KAMA_IDS },
  { id: 'anagami-rupa', name: 'အနာဂါမီ ရူပါဝစရ (၃၄)', cittaIds: PUGGALA_ANAGAMI_RUPA_IDS },
  { id: 'anagami-arupa', name: 'အနာဂါမီ အရူပါဝစရ (၁၉)', cittaIds: PUGGALA_ANAGAMI_ARUPA_IDS },
  { id: 'sekkha-kama', name: 'သေက္ခ ကာမာဝစရ (၅၆)', cittaIds: PUGGALA_SEKKHA_KAMA_IDS },
  { id: 'sekkha-rupa', name: 'သေက္ခ ရူပါဝစရ (၄၀)', cittaIds: PUGGALA_SEKKHA_RUPA_IDS },
  { id: 'sekkha-arupa', name: 'သေက္ခ အရူပါဝစရ (၂၅)', cittaIds: PUGGALA_SEKKHA_ARUPA_IDS },
  { id: 'arahant-kama', name: 'ရဟန္တာ ကာမာဝစရ (၄၄)', cittaIds: PUGGALA_ARAHANT_KAMA_IDS },
  { id: 'arahant-rupa', name: 'ရဟန္တာ ရူပါဝစရ (၃၀)', cittaIds: PUGGALA_ARAHANT_RUPA_IDS },
  { id: 'arahant-arupa', name: 'ရဟန္တာ အရူပါဝစရ (၁၄)', cittaIds: PUGGALA_ARAHANT_ARUPA_IDS },
];
// စုတိ-ပဋိ — စုတိစိတ် အမျိုးအစားအလိုက် ဆက်နိုင်တဲ့ ပဋိသန္ဓေစိတ်များ
const SUTI_ID_AHETU_DVIHETU = [19, 27, 39, 40, 41, 42, 43, 44, 45, 46]; // ၁၀
const SUTI_ID_TIHETU_ALL19 = [19, 27, 39, 40, 41, 42, 43, 44, 45, 46, 60, 61, 62, 63, 64, 74, 75, 76, 77]; // ၁၉
const SUTI_ID_REMAINING_RUPA = [39, 40, 41, 42, 43, 44, 45, 46, 60, 61, 62, 63, 64, 74, 75, 76, 77]; // ၁၇
const SUTI_ID_ASANNA_FOLLOW = [39, 40, 41, 42, 43, 44, 45, 46]; // ၈
const KAMA_TIHETU_PATISANDHI_4 = [39, 40, 43, 44]; // ကာမတိဟိတ်ပဋိသန္ဓေ (ဉာဏသမ္ပယုတ် ၄)
// အရူပစိတ်တစ်ခုချင်းစီသည် မိမိထက် အောက်အဆင့်ရှိ အရူပဝိပါက်ပဋိသန္ဓေကို မရနိုင်ပါ (မိမိအဆင့်+အပေါ်အဆင့်များသာ ရ)
const SUTI_ID_AKASA_FOLLOW = [...B_ARUPA_VIPAKA_4, ...KAMA_TIHETU_PATISANDHI_4]; // 74,75,76,77 + ကာမတိဟိတ် ၄ = ၈
const SUTI_ID_VINNANANCA_FOLLOW = [75, 76, 77, ...KAMA_TIHETU_PATISANDHI_4]; // ၇
const SUTI_ID_AKINCANNA_FOLLOW = [76, 77, ...KAMA_TIHETU_PATISANDHI_4]; // ၆
const SUTI_ID_NEVASANNA_FOLLOW = [77, ...KAMA_TIHETU_PATISANDHI_4]; // ၅

const SUTI_PATI_TYPES = [
  { id: 'ahetu', name: 'အဟိတ်', cittaIds: SUTI_ID_AHETU_DVIHETU, note: 'ကြွင်းကျန်သည့် အဟိတ်စုတိနောင် ကာမပဋိသန္ဓေ ၁၀-ခုသာ နှောင်းသည်။' },
  { id: 'dvihetu', name: 'ဒွိဟိတ်', cittaIds: SUTI_ID_AHETU_DVIHETU, note: 'ကြွင်းကျန်သည့် ဒွိဟိတ်စုတိနောင် ကာမပဋိသန္ဓေ ၁၀-ခုသာ နှောင်းသည်။' },
  { id: 'tihetu', name: 'တိဟိတ်', cittaIds: SUTI_ID_TIHETU_ALL19, note: 'ကာမတိဟိတ်စုတိနောင် ပဋိသန္ဓေအားလုံး နှောင်းသည် — ပဋိသန္ဓေစိတ် ၁၉-ပါး + အသညပဋိသန္ဓေ (ဇီဝိတနဝကကလာပ်၊ စိတ်မပါ)။' },
  { id: 'remaining-rupa', name: 'ကြွင်းရူပ', cittaIds: SUTI_ID_REMAINING_RUPA, note: 'ရူပစုတိနောင် အဟိတ်မပါသော သဟိတ်ပဋိသန္ဓေ ၁၇-ခု နှောင်းသည် (ကာမတိဟိတ်၊ ဒွိဟိတ် ပဋိသန္ဓေများကား ပုထုဇဉ်အတွက်သာ)။' },
  { id: 'asannasatta', name: 'အသညသတ်', cittaIds: SUTI_ID_ASANNA_FOLLOW, note: 'အသညသတ်စုတိနောင် ကာမဒွိဟိတ်၊ တိဟိတ် ပဋိသန္ဓေ ၈-ခု နှောင်းသည်။' },
  { id: 'akasa', name: 'အာကာ', cittaIds: SUTI_ID_AKASA_FOLLOW, note: 'အာကာသာနဉ္စာယတနစုတိနောင် မိမိအဆင့်+အပေါ်အဆင့် အရူပပဋိသန္ဓေ ၄-ခုနှင့် ကာမတိဟိတ်ပဋိသန္ဓေ ၄-ခု၊ ပေါင်း ၈-ခု နှောင်းသည် (အောက်အောက် အရူပပဋိသန္ဓေ မရှိသေးသောကြောင့် အားလုံးရသည်)။' },
  { id: 'vinnananca', name: 'ဝိညာဏဉ္စာ', cittaIds: SUTI_ID_VINNANANCA_FOLLOW, note: 'ဝိညာဏဉ္စာယတနစုတိနောင် အောက်ဆုံးအာကာသာနဉ္စာ ကို ကြဉ်ပြီး၊ မိမိအဆင့်+အပေါ်အဆင့် အရူပပဋိသန္ဓေ ၃-ခုနှင့် ကာမတိဟိတ်ပဋိသန္ဓေ ၄-ခု၊ ပေါင်း ၇-ခု နှောင်းသည်။' },
  { id: 'akincanna', name: 'အကိဉ္စညာ', cittaIds: SUTI_ID_AKINCANNA_FOLLOW, note: 'အာကိဉ္စညာယတနစုတိနောင် အောက်အောက် အရူပပဋိသန္ဓေ ၂-ခုကို ကြဉ်ပြီး၊ မိမိအဆင့်+အပေါ်အဆင့် အရူပပဋိသန္ဓေ ၂-ခုနှင့် ကာမတိဟိတ်ပဋိသန္ဓေ ၄-ခု၊ ပေါင်း ၆-ခု နှောင်းသည်။' },
  { id: 'nevasanna', name: 'နေဝသညာ', cittaIds: SUTI_ID_NEVASANNA_FOLLOW, note: 'နေဝသညာနာသညာယတနစုတိနောင် အောက်အောက် အရူပပဋိသန္ဓေ ၃-ခုကို ကြဉ်ပြီး၊ မိမိအဆင့် အရူပပဋိသန္ဓေ ၁-ခုနှင့် ကာမတိဟိတ်ပဋိသန္ဓေ ၄-ခု၊ ပေါင်း ၅-ခု နှောင်းသည်။' },
];

// ဘုံအုပ်စု တစ်ခုစီအတွက် အရောင် (title/chip/dot)
const BHUMI_COLOR_MAP = {
  rose:   { title: 'text-rose-700',   chip: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:shadow-sm',       bar: 'bg-rose-400' },
  amber:  { title: 'text-amber-700',  chip: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:shadow-sm',     bar: 'bg-amber-400' },
  sky:    { title: 'text-sky-700',    chip: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 hover:shadow-sm',         bar: 'bg-sky-400' },
  cyan:   { title: 'text-cyan-700',   chip: 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100 hover:shadow-sm',       bar: 'bg-cyan-400' },
  teal:   { title: 'text-teal-700',   chip: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100 hover:shadow-sm',       bar: 'bg-teal-400' },
  blue:   { title: 'text-blue-700',   chip: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:shadow-sm',       bar: 'bg-blue-400' },
  indigo: { title: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100 hover:shadow-sm', bar: 'bg-indigo-400' },
  violet: { title: 'text-violet-700', chip: 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100 hover:shadow-sm', bar: 'bg-violet-400' },
};

// ==== နာနာကဒါစိ (occasional) စေတသိက် — citta dot ကို ခပ်ကြာကြာ ဖိထားလိုက်လျှင် (long-press) ဝင်ရသော mode ====
// mode ထဲရှိစဉ် dot ကို short-click နှိပ်တိုင်း state တစ်ခုစီ လှည့်ပြမည်၊ ထပ်၍ long-press ပြန်ဖိလိုက်လျှင်
// mode မှ ထွက်ပြီး မူလ function (ပုံမှန် ဖွင့်/ပိတ်) အတိုင်း ပြန်ဖြစ်စေမည်
const NANAKADACI_CONFIG = {
  lobhaMana: {
    cittaIds: [3, 4, 7, 8], // လောဘမူ ဒိဋ္ဌိဂတဝိပ္ပယုတ် — မာန သည် နာနာကဒါစိ
    states: [
      { label: 'မာနမပါ', exclude: [20] },
      { label: 'မာနပါ', exclude: [] },
      ],
  },
  dosaNanaka: {
    cittaIds: [9, 10], // ဒေါသမူ — ဣဿာ/မစ္ဆရိယ/ကုက္ကုစ္စ သည် နာနာကဒါစိ (တစ်ခါတည်း တစ်ခုတည်းသာ ဖြစ်တတ်)
    states: [
      { label: 'ဣဿာ၊ မစ္ဆရိယ၊ ကုက္ကုစ္စ သုံးခုစလုံးမပါ', exclude: [22, 23, 24] },
      { label: 'ဣဿာပါ', exclude: [23, 24] },
      { label: 'မစ္ဆရိယပါ', exclude: [22, 24] },
      { label: 'ကုက္ကုစ္စပါ', exclude: [22, 23] },
      ],
  },
  sobhanaNanakaKusala: {
    // မဟာကုသိုလ်(၈)+ရူပကုသိုလ်(၅) — ဝိရတီ(၃)+အပ္ပမညာ(၂) သည် နာနာကဒါစိ
    cittaIds: [
      ...Array.from({ length: 8 }, (_, i) => i + 31),
    ],
    states: [
      { label: 'ဝိရတီ/အပ္ပမညာ ဘာမျှမပါ', exclude: [47, 48, 49, 50, 51] },
      { label: 'သမ္မာဝါစာပါ', exclude: [48, 49, 50, 51] },
      { label: 'သမ္မာကမ္မန္တပါ', exclude: [47, 49, 50, 51] },
      { label: 'သမ္မာအာဇီဝပါ', exclude: [47, 48, 50, 51] },
      { label: 'ကရုဏာပါ', exclude: [47, 48, 49, 51] },
      { label: 'မုဒိတာပါ', exclude: [47, 48, 49, 50] },
      
    ],
  },
  sobhanaNanakaKiriya: {
    // မဟာကြိယာ(၈)+ရူပကြိယာ(၅) — ဝိရတီ မပါ (ရဟန္တာ၌ ရှေးဦးစွာ ရှောင်ကြဉ်ရန် မလိုတော့သောကြောင့်)၊ အပ္ပမညာ(၂) သာ နာနာကဒါစိ
    cittaIds: [
      ...Array.from({ length: 8 }, (_, i) => i + 47),
      ...Array.from({ length: 5 }, (_, i) => i + 55),
      ...Array.from({ length: 5 }, (_, i) => i + 65),
    ],
    states: [
      { label: 'အပ္ပမညာ ဘာမျှမပါ', exclude: [50, 51] },
      { label: 'ကရုဏာပါ', exclude: [51] },
      { label: 'မုဒိတာပါ', exclude: [50] },
      
    ],
  },
};
function getNanakadaciConfig(cId) {
  for (const key of Object.keys(NANAKADACI_CONFIG)) {
    if (NANAKADACI_CONFIG[key].cittaIds.includes(cId)) return key;
  }
  return null;
}

// ==== "မဂ္ဂင် (၁၂)" / "မဂ္ဂင် (၈)" ကို citta context (မဟာကုသိုလ်) ရှိစဉ် ရွေးထားချိန် — ဝိရတီ (၃)ပါး
// နာနာကဒါစိ ဖြစ်ကြောင်း ပြသရန် cycle state (4) — [မပါ, သမ္မာဝါစာပါ, သမ္မာကမ္မန္တပါ, သမ္မာအာဇီဝပါ]
const VIRATI_CYCLE_STATES = [
  { label: 'ဝိရတီ မပါ', include: [] },
  { label: 'သမ္မာဝါစာ ပါ', include: [47] },
  { label: 'သမ္မာကမ္မန္တ ပါ', include: [48] },
  { label: 'သမ္မာအာဇီဝ ပါ', include: [49] },
];

// --- Layout & Grouping Structures ---
const CITTA_LAYOUT = [
  { title: "အကုသိုလ်စိတ် (၁၂)", subGroups: [{ title: "လောဘမူစိတ် (၈)", id: "lobha" }, { title: "ဒေါသမူစိတ် (၂)", id: "dosa" }, { title: "မောဟမူစိတ် (၂)", id: "moha" }] },
  { title: "အဟိတ်စိတ် (၁၈)", subGroups: [{ title: "အကုသလဝိပါက် (၇)", id: "akusala-vipaka" }, { title: "အဟိတ်ကုသလဝိပါက် (၈)", id: "kusala-vipaka" }, { title: "အဟိတ်ကြိယာ (၃)", id: "ahetuka-kiriya" }] },
  { title: "ကာမသောဘဏစိတ် (၂၄)", subGroups: [{ title: "မဟာကုသိုလ် (၈)", id: "maha-kusala" }, { title: "မဟာဝိပါက် (၈)", id: "maha-vipaka" }, { title: "မဟာကြိယာ (၈)", id: "maha-kiriya" }] },
  { title: "ရူပါဝစရစိတ် (၁၅)", subGroups: [{ title: "ရူပကုသိုလ် (၅)", id: "rupa-kusala" }, { title: "ရူပဝိပါက် (၅)", id: "rupa-vipaka" }, { title: "ရူပကြိယာ (၅)", id: "rupa-kiriya" }] },
  { title: "အရူပါဝစရစိတ် (၁၂)", subGroups: [{ title: "အရူပကုသိုလ် (၄)", id: "arupa-kusala" }, { title: "အရူပဝိပါက် (၄)", id: "arupa-vipaka" }, { title: "အရူပကြိယာ (၄)", id: "arupa-kiriya" }] },
  { title: "လောကုတ္တရာစိတ် အကျယ် (၄၀)", subGroups: [{ title: "မဂ်စိတ် (၂၀)", id: "magga" }, { title: "ဖိုလ်စိတ် (၂၀)", id: "phala" }] }
];

const CETASIKA_LAYOUT = [
  { title: "အညသမာန်းစေတသိက် (၁၃)", subGroups: [{ title: "သဗ္ဗစိတ္တသာဓာရဏ (၇)", id: "sabba" }, { title: "ပကိဏ္ဏက (၆)", id: "pakinnaka" }] },
  { title: "အကုသိုလ်စေတသိက် (၁၄)", subGroups: [{ title: "မောဟစတုက္က (၄)", id: "moha-catukka" }, { title: "လောဘတ္တိက (၃)", id: "lobha-tika" }, { title: "ဒေါသစတုက္က (၄)", id: "dosa-catukka" }, { title: "ထိနမိဒ္ဓ (၂)", id: "thina-middha" }, { title: "ဝိစိကိစ္ဆာ (၁)", id: "vicikiccha" }] },
  { title: "သောဘဏစေတသိက် (၂၅)", subGroups: [{ title: "သောဘဏသာဓာရဏ (၁၉)", id: "sobhana-sadharana" }, { title: "ဝိရတီ (၃)", id: "virati" }, { title: "အပ္ပမညာ (၂)", id: "appamanna" }, { title: "ပညိန္ဒြေ (၁)", id: "panna" }] }
];

const JATI_TYPES = [
  { id: 'akusala', name: 'အကုသိုလ်' },
  { id: 'kusala', name: 'ကုသိုလ်' },
  { id: 'vipaka', name: 'ဝိပါက်' },
  { id: 'kiriya', name: 'ကြိယာ' }
];

// အကုသလသင်္ဂဟ - အကုသိုလ်စေတသိက်များကို အုပ်စု (၁၀) မျိုးအလိုက် ပြန်စုစည်းထားသော ခွဲခြမ်းမှု
// (cetasikaIds သည် CETASIKAS array ထဲက id များဖြစ်ပြီး၊ တစ်ခုတည်းသော cetasika ကို ဓမ္မအမည်များစွာက ကိုယ်စားပြုရာမှာ
// ထပ်နေတတ်သည် — ဥပမာ ကာမာသဝနှင့် ဘဝါသဝ နှစ်ခုစလုံးသည် "လောဘ" cetasika (id 18) ချည်းသာဖြစ်သည်)
const AKUSALA_CATEGORIES = [
  { id: 'asava', name: 'အာသဝ (၄)', cetasikaIds: [14, 18, 19], color: 'rose', desc: 'ရှေးအဘို့ကို မထင်မမြင်ဖြစ်၍ ကြာမြင့်စွာ ထုံတတ်သော၊ သို့မဟုတ် အနာမှ ယိုသကဲ့သို့ အာရုံတို့၌ ယိုစီးတတ်သော၊ ဘဝဂ်နှင့် ဂေါတြဘူတိုင်အောင် နှံ့၍ ဖြစ်တတ်သော အကုသိုလ်တရား (၄) ပါး။', names: [
    { name: 'ကာမာသဝ', cetasikaId: 18, desc: 'ကာမဂုဏ် ငါးပါးတို့၌ လိုချင်တပ်မက်သော လောဘစေတသိက်။' },
    { name: 'ဘဝါသဝ', cetasikaId: 18, desc: 'ရူပဘုံ၊ အရူပဘုံတို့၌ တပ်နှစ်သက်သော လောဘစေတသိက် (ဈာန်ဘဝ၌ တပ်ခြင်း)။' },
    { name: 'ဒိဋ္ဌာသဝ', cetasikaId: 19, desc: '၆၂-ပါးအပြားရှိသော ဒိဋ္ဌိ (အယူအဆမှား)။' },
    { name: 'အဝိဇ္ဇာသဝ', cetasikaId: 14, desc: 'သစ္စာလေးပါး၊ အတိတ်/အနာဂတ်ခန္ဓာ၊ ပဋိစ္စသမုပ္ပါဒ် အစရှိသည့် (၈)ဌာန၌ မသိခြင်း မောဟ။' },
  ]},
  { id: 'ogha', name: 'ဩဃ (၄)', cetasikaIds: [14, 18, 19], color: 'sky', desc: 'လွှမ်းမိုးနှိပ်စက်၍ အောက်သို့ ဆောင်တတ်၊ နစ်မွန်းစေတတ်သော ရေအယဉ်နှင့် တူသော အကုသိုလ်တရား (၄) ပါး။', names: [
    { name: 'ကာမောဃ', cetasikaId: 18, desc: 'ကာမဂုဏ်တို့၌ တပ်မက်သော လောဘ — ရေအယဉ်ကဲ့သို့ နစ်မွန်းစေတတ်သည်။' },
    { name: 'ဘဝေါဃ', cetasikaId: 18, desc: 'ဘဝ၌ တပ်နှစ်သက်သော လောဘ — ရေအယဉ်ကဲ့သို့ နစ်မွန်းစေတတ်သည်။' },
    { name: 'ဒိဋ္ဌောဃ', cetasikaId: 19, desc: 'အယူအဆမှား ဒိဋ္ဌိ — ရေအယဉ်ကဲ့သို့ နစ်မွန်းစေတတ်သည်။' },
    { name: 'အဝိဇ္ဇောဃ', cetasikaId: 14, desc: 'မသိခြင်း မောဟ — ရေအယဉ်ကဲ့သို့ နစ်မွန်းစေတတ်သည်။' },
  ]},
  { id: 'yoga', name: 'ယောဂ (၄)', cetasikaIds: [14, 18, 19], color: 'cyan', desc: 'ဝဋ်ဆင်းရဲ၌၎င်း ဘဝတည်းဟူသော ယန္တရားစက်၌၎င်း သတ္တဝါတို့ကို ကံ၏ အကျိုးနှင့် ယှဉ်စေတတ်သော အကုသိုလ်တရား (၄) ပါး။', names: [
    { name: 'ကာမယောဂ', cetasikaId: 18, desc: 'ကာမတွင် တပ်မက်သော လောဘ — သတ္တဝါကို ဝဋ်ဆင်းရဲနှင့် ယှဉ်စေတတ်သည်။' },
    { name: 'ဘဝယောဂ', cetasikaId: 18, desc: 'ဘဝ၌ တပ်နှစ်သက်သော လောဘ — သတ္တဝါကို ဝဋ်ဆင်းရဲနှင့် ယှဉ်စေတတ်သည်။' },
    { name: 'ဒိဋ္ဌိယောဂ', cetasikaId: 19, desc: 'အယူအဆမှား ဒိဋ္ဌိ — သတ္တဝါကို ဝဋ်ဆင်းရဲနှင့် ယှဉ်စေတတ်သည်။' },
    { name: 'အဝိဇ္ဇာယောဂ', cetasikaId: 14, desc: 'မသိခြင်း မောဟ — သတ္တဝါကို ဝဋ်ဆင်းရဲနှင့် ယှဉ်စေတတ်သည်။' },
  ]},
  { id: 'gantha', name: 'ဂန္ထ (၄)', cetasikaIds: [18, 19, 21], color: 'teal', desc: 'နာမကာယနှင့် ရူပကာယကို ရစ်ပတ်ထုံးဖွဲ့တတ်သော ဂန္ထတရား (၄) ပါး။', names: [
    { name: 'အဘိဇ္ဈာကာယဂန္ထ', cetasikaId: 18, desc: 'တဏှာ (လောဘ) — နာမကာယနှင့် ရူပကာယကို ရစ်ပတ်ထုံးဖွဲ့တတ်သည်။' },
    { name: 'ဗျာပါဒကာယဂန္ထ', cetasikaId: 21, desc: 'ဒေါသ — ရန်ငြိုးထားခြင်းဖြင့် ရစ်ပတ်ထုံးဖွဲ့တတ်သည်။' },
    { name: 'သီလဗ္ဗတပရာမာသကာယဂန္ထ', cetasikaId: 19, desc: 'နွားအလေ့ အစရှိသည်ဖြင့် သံသရာမှ စင်ကြယ်၏ဟု စွဲလမ်းသော ဒိဋ္ဌိ။' },
    { name: 'ဣဒံသစ္စာဘိနိဝေသကာယဂန္ထ', cetasikaId: 19, desc: 'ငါ့အယူသာမှန်၏ဟု မြဲမြံစွာ စွဲလမ်းသော ဒိဋ္ဌိ။' },
  ]},
  { id: 'upadana', name: 'ဥပါဒါန် (၄)', cetasikaIds: [18, 19], color: 'blue', desc: 'မြွေသည် ဘာကို မြဲစွာ ဖမ်းယူသကဲ့သို့ အာရုံကို ပြင်းစွာ စွဲယူတတ်သော ဥပါဒါန်တရား (၄) ပါး။', names: [
    { name: 'ကာမုပါဒါန်', cetasikaId: 18, desc: 'ကာမတဏှာ (လောဘ) — ဝတ္ထုကာမဂုဏ်တို့ကို မြဲစွာ ယူတတ်သည်။' },
    { name: 'ဒိဋ္ဌုပါဒါန်', cetasikaId: 19, desc: 'ဒိဋ္ဌိ — မှားသော အယူအဆကို ခိုင်မြဲစွာ စွဲလမ်းခြင်း။' },
    { name: 'သီလဗ္ဗတုပါဒါန်', cetasikaId: 19, desc: 'နွားသီလ၊ နွားအကျင့် အစရှိသည်ဖြင့် သံသရာမှ စင်ကြယ်၏ဟု စွဲလမ်းသော ဒိဋ္ဌိ။' },
    { name: 'အတ္တဝါဒုပါဒါန်', cetasikaId: 19, desc: 'ဥပါဒါနက္ခန္ဓာ (၅) ပါးကို အတ္တဟု ကြံဆယူသော ဒိဋ္ဌိ။' },
  ]},
  { id: 'nivarana', name: 'နီဝရဏ (၆)', cetasikaIds: [14, 17, 18, 21, 24, 25, 26, 27], color: 'indigo', desc: 'ကုသိုလ်စိတ်ကို တားမြစ်တတ်၊ ပညာမျက်စိကို ဖုံးလွှမ်းပိတ်ပင်တတ်သော နီဝရဏတရား (၆) ပါး။', names: [
    { name: 'ကာမစ္ဆန္ဒနီဝရဏ', cetasikaId: 18, desc: 'ကာမဂုဏ်တို့၌ ပြင်းစွာ တပ်နှစ်သက်သော ရာဂ+ဆန္ဒ — ကုသိုလ်ကို တားမြစ်တတ်သည်။' },
    { name: 'ဗျာပါဒနီဝရဏ', cetasikaId: 21, desc: 'ရန်ငြိုးခြင်း ဒေါသ — ကုသိုလ်ကို တားမြစ်တတ်သည်။' },
    { name: 'ထိနမိဒ္ဓနီဝရဏ', cetasikaId: 25, desc: 'စိတ်ထိုင်းမှိုင်း ထိန+မိဒ္ဓ — ကုသိုလ်ကို တားမြစ်တတ်သည်။' },
    { name: 'ဥဒ္ဓစ္စကုက္ကုစ္စနီဝရဏ', cetasikaId: 17, desc: 'မငြိမ်မသက် ဥဒ္ဓစ္စ+ကုက္ကုစ္စ — ကုသိုလ်ကို တားမြစ်တတ်သည်။' },
    { name: 'ဝိစိကိစ္ဆာနီဝရဏ', cetasikaId: 27, desc: 'ယုံမှားသံသယ — ကုသိုလ်ကို တားမြစ်တတ်သည်။' },
    { name: 'အဝိဇ္ဇာနီဝရဏ', cetasikaId: 14, desc: 'မသိခြင်း မောဟ — ပညာမျက်စိကို ဖုံးလွှမ်းတတ်သည်။' },
  ]},
  { id: 'anusaya', name: 'အနုသယ (၇)', cetasikaIds: [14, 18, 19, 20, 21, 27], color: 'violet', desc: 'မဂ်ဖြင့် မပယ်ရသေးသဖြင့် သတ္တဝါ၏ သန္တာန်၌ အဖန်တလဲလဲ ကိန်းအောင်းနေတတ်သော အနုသယတရား (၇) ပါး။', names: [
    { name: 'ကာမရာဂါနုသယ', cetasikaId: 18, desc: 'ကာမဂုဏ်တို့၌ တပ်မက်ခြင်း — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
    { name: 'ဘဝရာဂါနုသယ', cetasikaId: 18, desc: 'ဘဝ၌ တပ်မက်ခြင်း — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
    { name: 'ပဋိဃာနုသယ', cetasikaId: 21, desc: 'ဒေါသ — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
    { name: 'မာနာနုသယ', cetasikaId: 20, desc: 'မာန — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
    { name: 'ဒိဋ္ဌာနုသယ', cetasikaId: 19, desc: 'ဒိဋ္ဌိ — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
    { name: 'ဝိစိကိစ္ဆာနုသယ', cetasikaId: 27, desc: 'ယုံမှားသံသယ — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
    { name: 'အဝိဇ္ဇာနုသယ', cetasikaId: 14, desc: 'မသိခြင်း မောဟ — မဂ်ဖြင့် မပယ်သေးလျှင် အဖန်တလဲလဲ ဖြစ်နေသည်။' },
  ]},
  { id: 'samyojana-suttanta', name: 'သုတ္တန်သံယောဇဉ် (၁၀)', cetasikaIds: [14, 17, 18, 19, 20, 21, 27], color: 'fuchsia', desc: 'သတ္တဝါတို့ကို သံသရာတည်းဟူသော နှောင်အိမ်၌ အာရုံအမျိုးမျိုးတည်းဟူသော ကြိုးများဖြင့် တုပ်နှောင်ဖွဲ့ချည်တတ်သော သံယောဇဉ်တရား (၁၀) ပါး (သုတ္တန်နည်း)။', names: [
    { name: 'ကာမရာဂသံယောဇဉ်', cetasikaId: 18, desc: 'ကာမတွင် တပ်မက်ခြင်း — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'ရူပရာဂသံယောဇဉ်', cetasikaId: 18, desc: 'ရူပဘဝ၌ တပ်နှစ်သက်ခြင်း — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'အရူပရာဂသံယောဇဉ်', cetasikaId: 18, desc: 'အရူပဘဝ၌ တပ်နှစ်သက်ခြင်း — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'ပဋိဃသံယောဇဉ်', cetasikaId: 21, desc: 'ဒေါသ — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'မာနသံယောဇဉ်', cetasikaId: 20, desc: 'မာန — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'ဒိဋ္ဌိသံယောဇဉ်', cetasikaId: 19, desc: 'ဒိဋ္ဌိ — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'သီလဗ္ဗတပရာမာသသံယောဇဉ်', cetasikaId: 19, desc: 'နွားအလေ့စသည်ဖြင့် စင်ကြယ်၏ဟု စွဲလမ်းသော ဒိဋ္ဌိ။' },
    { name: 'ဝိစိကိစ္ဆာသံယောဇဉ်', cetasikaId: 27, desc: 'ယုံမှားသံသယ — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'ဥဒ္ဓစ္စသံယောဇဉ်', cetasikaId: 17, desc: 'မငြိမ်မသက်ခြင်း — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
    { name: 'အဝိဇ္ဇာသံယောဇဉ်', cetasikaId: 14, desc: 'မသိခြင်း မောဟ — သတ္တဝါကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သည်။' },
  ]},
  { id: 'samyojana-abhidhamma', name: 'အဘိဓမ္မာသံယောဇဉ် (၁၀)', cetasikaIds: [14, 18, 19, 20, 21, 22, 23, 27], color: 'purple', desc: 'သတ္တဝါတို့ကို သံသရာနှင့် နှောင်ဖွဲ့တတ်သော သံယောဇဉ်တရား (၁၀) ပါး (အဘိဓမ္မာနည်း — ဣဿာနှင့် မစ္ဆရိယ ပါဝင်သည်)။', names: [
    { name: 'ကာမရာဂသံယောဇဉ်', cetasikaId: 18, desc: 'ကာမတွင် တပ်မက်ခြင်း (အဘိဓမ္မာနည်း)။' },
    { name: 'ဘဝရာဂသံယောဇဉ်', cetasikaId: 18, desc: 'ဘဝ၌ တပ်နှစ်သက်ခြင်း (အဘိဓမ္မာနည်း)။' },
    { name: 'ပဋိဃသံယောဇဉ်', cetasikaId: 21, desc: 'ဒေါသ (အဘိဓမ္မာနည်း)။' },
    { name: 'မာနသံယောဇဉ်', cetasikaId: 20, desc: 'မာန (အဘိဓမ္မာနည်း)။' },
    { name: 'ဒိဋ္ဌိသံယောဇဉ်', cetasikaId: 19, desc: 'ဒိဋ္ဌိ (အဘိဓမ္မာနည်း)။' },
    { name: 'သီလဗ္ဗတပရာမာသသံယောဇဉ်', cetasikaId: 19, desc: 'နွားအလေ့စသည်ဖြင့် စင်ကြယ်၏ဟု စွဲလမ်းသော ဒိဋ္ဌိ (အဘိဓမ္မာနည်း)။' },
    { name: 'ဝိစိကိစ္ဆာသံယောဇဉ်', cetasikaId: 27, desc: 'ယုံမှားသံသယ (အဘိဓမ္မာနည်း)။' },
    { name: 'ဣဿာသံယောဇဉ်', cetasikaId: 22, desc: 'သူတစ်ပါး ကောင်းစားခြင်းကို မနာလို ငြူစူခြင်း။' },
    { name: 'မစ္ဆရိယသံယောဇဉ်', cetasikaId: 23, desc: 'မိမိစည်းစိမ်ကို လျှို့ဝှက်၍ တစ်ပါးသူနှင့် မျှဝေခြင်းကို သည်းမခံနိုင်ခြင်း။' },
    { name: 'အဝိဇ္ဇာသံယောဇဉ်', cetasikaId: 14, desc: 'မသိခြင်း မောဟ (အဘိဓမ္မာနည်း)။' },
  ]},
  { id: 'kilesa', name: 'ကိလေသာ (၁၀)', cetasikaIds: [14, 15, 16, 17, 18, 19, 20, 21, 25, 27], color: 'red', desc: 'စိတ်ကို ပူပန်စေ၍ နှိပ်စက်ညှဉ်းဆဲတတ်သော ကိလေသာတရား (၁၀) ပါး။', names: [
    { name: 'လောဘ', cetasikaId: 18, desc: 'ငါ-ငါ့ဟာဟု စွဲယူ တပ်မက်ခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'ဒေါသ', cetasikaId: 21, desc: 'စိတ်ခက်ထန် ကြမ်းတမ်းခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'မောဟ', cetasikaId: 14, desc: 'သဘောမှန်ကို မသိခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'မာန', cetasikaId: 20, desc: 'ငါ ငါဟု တက်ကြွမြင့်မောက်ခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'ဒိဋ္ဌိ', cetasikaId: 19, desc: 'အယူအဆမှား — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'ဝိစိကိစ္ဆာ', cetasikaId: 27, desc: 'ယုံမှားသံသယ — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'ထိန', cetasikaId: 25, desc: 'စိတ်ထိုင်းမှိုင်းခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'ဥဒ္ဓစ္စ', cetasikaId: 17, desc: 'မငြိမ်မသက် ပျံ့လွင့်ခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'အဟိရိက', cetasikaId: 15, desc: 'ဒုစရိုက်မှ မရှက်ခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
    { name: 'အနောတ္တပ္ပ', cetasikaId: 16, desc: 'ဒုစရိုက်မှ မကြောက်ခြင်း — စိတ်ကို နှိပ်စက်ညှဉ်းဆဲတတ်သည်။' },
  ]},
];

// အကုသလ အုပ်စု တစ်ခုစီအတွက် အရောင် (button + floating box)
const AKUSALA_COLOR_MAP = {
  rose:    { active: 'bg-rose-700 text-white border-rose-700',    idle: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
  sky:     { active: 'bg-sky-700 text-white border-sky-700',      idle: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100' },
  cyan:    { active: 'bg-cyan-700 text-white border-cyan-700',    idle: 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100' },
  teal:    { active: 'bg-teal-700 text-white border-teal-700',    idle: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100' },
  blue:    { active: 'bg-blue-700 text-white border-blue-700',    idle: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
  indigo:  { active: 'bg-indigo-700 text-white border-indigo-700', idle: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100' },
  violet:  { active: 'bg-violet-700 text-white border-violet-700', idle: 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100' },
  fuchsia: { active: 'bg-fuchsia-700 text-white border-fuchsia-700', idle: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300 hover:bg-fuchsia-100' },
  purple:  { active: 'bg-purple-700 text-white border-purple-700', idle: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' },
  red:     { active: 'bg-red-700 text-white border-red-700',      idle: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' },
};

// ဣန္ဒြေ/အာဟာရ စသည်တို့ထဲက ရုပ်ဆိုင်ရာ အစိတ်အပိုင်းများကို RUPAS panel ဘက်မှာလည်း highlight လုပ်ပြနိုင်ရန်
// (cakkhu, sota, ghana, jivha, kaya, itthibhava, purisabhava, jivita rupa)
const INDRIYA_RUPA_IDS = [5, 6, 7, 8, 9, 14, 15, 17];
const DVIHETU_JAVANA_18_IDS = [1,2,3,4,5,6,7,8, 9,10, 33,34,37,38, 49,50,53,54];
const TIHETU_JAVANA_34_IDS = [
  31,32,35,36, 47,48,51,52, 55,56,57,58,59, 65,66,67,68,69, 70,71,72,73, 78,79,80,81,
  ...Array.from({ length: 40 }, (_, i) => i + 82),
];
const SAHETUKA_JAVANA_52_IDS = [...DVIHETU_JAVANA_18_IDS, ...TIHETU_JAVANA_34_IDS];
const LOKUTTARA_JAVANA_ALL_IDS = Array.from({ length: 40 }, (_, i) => i + 82);
// ဝိဝဋ္ဋနိဿိတ ဇောစိတ် (၄၂) — မဟာကုသိုလ်(၈)+မဟာကြိယာ(၈)+ရူပကုသိုလ်(၅)+ရူပကြိယာ(၅)+အရူပကုသိုလ်(၄)+အရူပကြိယာ(၄)+လောကုတ္တရာ(၈)
// သမ္မာမဂ္ဂင် (၈) နှင့် ဗောဓိပက္ခိယတရား (၃၇) ကို ဤစိတ် (၄၂) ပါးတို့၌သာ ကောက်ယူရသည်
const JAVANA_SOBHANA_IDS = [
  ...Array.from({ length: 8 }, (_, i) => i + 31),  // မဟာကုသိုလ်
  ...Array.from({ length: 8 }, (_, i) => i + 47),  // မဟာကြိယာ
  ...Array.from({ length: 5 }, (_, i) => i + 55),  // ရူပကုသိုလ်
  ...Array.from({ length: 5 }, (_, i) => i + 65),  // ရူပကြိယာ
  ...Array.from({ length: 4 }, (_, i) => i + 70),  // အရူပကုသိုလ်
  ...Array.from({ length: 4 }, (_, i) => i + 78),  // အရူပကြိယာ
  ...Array.from({ length: 40 }, (_, i) => i + 82), // လောကုတ္တရာ (အကျယ်/အကျဉ်း ၂-မျိုးလုံး ခြုံအောင်)
];
// အကုသိုလ်စိတ် (၁၂) — မိစ္ဆာမဂ္ဂင် (၄) ပါးအတွက်
const MICCHA_MAGGA_CITTA_IDS = Array.from({ length: 12 }, (_, i) => i + 1);
// အကုသိုလ်စိတ် (၁၂) မှ ဝိစိကိစ္ဆာစိတ် (id 11) ကို ထုတ်ထားသော (၁၁)ပါး
const MICCHA_SAMADHI_CITTA_IDS = MICCHA_MAGGA_CITTA_IDS.filter(id => id !== 11);
const MISSAKA_CATEGORIES = [
  { id: 'hetu6', name: 'ဟိတ် (၆)', color: 'rose', cetasikaIds: [18, 21, 14, 32, 33, 52],
    desc: 'မိမိနှင့်ယှဉ်သော တရားတို့ကို ခိုင်ခံ့တည်တံ့စေတတ်သော အမြစ်ကဲ့သို့သော တရား (၆) ပါး။',
    names: [
      { name: 'လောဘ', cetasikaId: 18, desc: 'တပ်မက်ငြိကပ်ခြင်း — အကုသိုလ်ဟိတ်။' },
      { name: 'ဒေါသ', cetasikaId: 21, desc: 'ကြမ်းတမ်းချက်ထန်ခြင်း — အကုသိုလ်ဟိတ်။' },
      { name: 'မောဟ', cetasikaId: 14, desc: 'သဘောမှန်ကို မသိခြင်း — အကုသိုလ်ဟိတ်။' },
      { name: 'အလောဘ', cetasikaId: 32, desc: 'မတပ်မက်ခြင်း — ကုသိုလ်/အဗျာကတ ဟိတ်။' },
      { name: 'အဒေါသ', cetasikaId: 33, desc: 'မကြမ်းတမ်းခြင်း — ကုသိုလ်/အဗျာကတ ဟိတ်။' },
      { name: 'အမောဟ', cetasikaId: 52, desc: 'ပညာဖြင့် သိမြင်ခြင်း — ကုသိုလ်/အဗျာကတ ဟိတ်။' },
    ]},
  { id: 'jhananga', name: 'ဈာနင် (၇)', color: 'sky', cetasikaIds: [8, 9, 12, 5, 2],
    excludeCittaIds: Array.from(DVIPANCA_IDS),
    desc: 'အာရုံသို့ ကပ်၍ ရှုတတ်သောအားဖြင့် ဈာန်၏ အစိတ်ဖြစ်သော တရား (၇) ပါး — ဒွေပဉ္စဝိညာဏ် (၁၀)ပါးတွင် ဈာနင်မရ။',
    names: [
      { name: 'ဝိတက်', cetasikaId: 8, desc: 'အာရုံပေါ်သို့ တင်ပေးခြင်း (ကြံခြင်း)။' },
      { name: 'ဝိစာရ', cetasikaId: 9, desc: 'အာရုံကို ထပ်ခါထပ်ခါ သုံးသပ်ခြင်း။' },
      { name: 'ပီတိ', cetasikaId: 12, desc: 'အာရုံကို နှစ်သက်ခြင်း။' },
      { name: 'ဧကဂ္ဂတာ', cetasikaId: 5, desc: 'အာရုံတစ်ခုတည်း၌ တည်ငြိမ်ခြင်း။' },
      { name: 'သောမနဿ', cetasikaId: 2, vedanaFilter: 'somanassa', desc: 'ဝေဒနာစေတသိက် — ကုသိုလ်ဈာနင် အနေဖြင့် ဝမ်းမြောက်ခြင်း (သောမနဿဝေဒနာ ယှဉ်သောစိတ်များသာ)။' },
      { name: 'ဒေါမနဿ', cetasikaId: 2, vedanaFilter: 'domanassa', desc: 'ဝေဒနာစေတသိက် — အကုသိုလ်ဈာနင် အနေဖြင့် စိတ်ဆင်းရဲခြင်း (ဒေါမနဿဝေဒနာ ယှဉ်သောစိတ်များသာ)။' },
      { name: 'ဥပေက္ခာ', cetasikaId: 2, vedanaFilter: 'upekkha', desc: 'ဝေဒနာစေတသိက် — အလယ်အလတ် ခံစားခြင်း (ဥပေက္ခာဝေဒနာ ယှဉ်သောစိတ်များသာ)။' },
    ]},
  { id: 'magganga12', name: 'မဂ္ဂင် (၁၂)', color: 'cyan', cetasikaIds: [52, 8, 47, 48, 49, 11, 29, 5, 19],
    excludeCittaIds: Array.from({ length: 18 }, (_, i) => i + 13),
    desc: 'သုဂတိ/ဒုဂ္ဂတိ/နိဗ္ဗာန်သို့ ရွှေ့လျားရောက်စေတတ်သော တရား (၁၂) ပါး (သမ္မာ ၈ + မိစ္ဆာ ၄) — အဟိတ်စိတ် (၁၈)ပါးတွင် မဂ္ဂင် လုံးဝမရ။',
    names: [
      { name: 'သမ္မာဒိဋ္ဌိ', cetasikaId: 52, cittaIds: JAVANA_SOBHANA_IDS, desc: 'မှန်ကန်စွာ မြင်ခြင်း (ပညာ)။' },
      { name: 'သမ္မာသင်္ကပ္ပ', cetasikaId: 8, cittaIds: JAVANA_SOBHANA_IDS, desc: 'မှန်ကန်စွာ ကြံစည်ခြင်း (ဝိတက်)။' },
      { name: 'သမ္မာဝါစာ', cetasikaId: 47, desc: 'မှန်ကန်သော နှုတ်ကျင့်။' },
      { name: 'သမ္မာကမ္မန္တ', cetasikaId: 48, desc: 'မှန်ကန်သော ကာယကျင့်။' },
      { name: 'သမ္မာအာဇီဝ', cetasikaId: 49, desc: 'မှန်ကန်သော အသက်မွေးမှု။' },
      { name: 'သမ္မာဝါယာမ', cetasikaId: 11, cittaIds: JAVANA_SOBHANA_IDS, desc: 'မှန်ကန်စွာ အားထုတ်ခြင်း (ဝီရိယ)။' },
      { name: 'သမ္မာသတိ', cetasikaId: 29, cittaIds: JAVANA_SOBHANA_IDS, desc: 'မှန်ကန်စွာ အောက်မေ့ခြင်း (သတိ)။' },
      { name: 'သမ္မာသမာဓိ', cetasikaId: 5, cittaIds: JAVANA_SOBHANA_IDS, desc: 'မှန်ကန်စွာ တည်ကြည်ခြင်း (ဧကဂ္ဂတာ) — ဝိစိကိစ္ဆာစိတ်၌ မဂ္ဂင်အဖြစ် မရောက်။' },
      { name: 'မိစ္ဆာဒိဋ္ဌိ', cetasikaId: 19, desc: 'အယူအဆမှား (ဒိဋ္ဌိ) — ဒုဂ္ဂတိမဂ်ဂင်။' },
      { name: 'မိစ္ဆာသင်္ကပ္ပ', cetasikaId: 8, cittaIds: MICCHA_MAGGA_CITTA_IDS, desc: 'ကြံစည်မှု (ဝိတက်) — အကုသိုလ်ဘက်။' },
      { name: 'မိစ္ဆာဝါယာမ', cetasikaId: 11, cittaIds: MICCHA_MAGGA_CITTA_IDS, desc: 'အားထုတ်ခြင်း (ဝီရိယ) — အကုသိုလ်ဘက်။' },
      { name: 'မိစ္ဆာသမာဓိ', cetasikaId: 5, cittaIds: MICCHA_MAGGA_CITTA_IDS, excludeCittaIds: [11], desc: 'တည်ကြည်ခြင်း (ဧကဂ္ဂတာ) — အကုသိုလ်ဘက်၊ ဝိစိကိစ္ဆာစိတ်၌မူ မဂ္ဂင်အဖြစ် မရောက်။' },
    ]},
  { id: 'indriya22', name: 'ဣန္ဒြေ (၂၂)', color: 'indigo', cetasikaIds: [6, 28, 11, 29, 5, 52, 2], rupaIds: INDRIYA_RUPA_IDS, allCitta: true,
    desc: 'မိမိတို့အစဉ်လိုက်သော တရားတို့၌ အစိုးရခြင်းသဘောရှိသည့် တရား (၂၂) ပါး။',
    names: [
      { name: 'စက္ခုန္ဒြေ', rupaId: 5, desc: 'မျက်စိအကြည် ပသာဒရုပ်။' },
      { name: 'သောတိန္ဒြေ', rupaId: 6, desc: 'နားအကြည် ပသာဒရုပ်။' },
      { name: 'ဃာနိန္ဒြေ', rupaId: 7, desc: 'နှာခေါင်းအကြည် ပသာဒရုပ်။' },
      { name: 'ဇိဝှိန္ဒြေ', rupaId: 8, desc: 'လျှာအကြည် ပသာဒရုပ်။' },
      { name: 'ကာယိန္ဒြေ', rupaId: 9, desc: 'ကိုယ်အကြည် ပသာဒရုပ်။' },
      { name: 'ဣတ္ထိန္ဒြေ', rupaId: 14, desc: 'အမျိုးသမီး ဘာဝရုပ်။' },
      { name: 'ပုရိသိန္ဒြေ', rupaId: 15, desc: 'အမျိုးသား ဘာဝရုပ်။' },
      { name: 'ဇီဝိတိန္ဒြေ', rupaId: 17, desc: 'ရုပ်သက်စောင့် ဇီဝိတရုပ်။' },
      { name: 'မနိန္ဒြေ', allCitta: true, desc: 'စိတ် (citta) အားလုံး — အသိစိတ်၏ အစိုးရမှု။' },
      { name: 'သုခိန္ဒြေ', cetasikaId: 2, vedanaFilter: 'sukha', desc: 'ဝေဒနာစေတသိက် — ကာယသုခ။' },
      { name: 'ဒုက္ခိန္ဒြေ', cetasikaId: 2, vedanaFilter: 'dukkha', desc: 'ဝေဒနာစေတသိက် — ကာယဒုက္ခ။' },
      { name: 'သောမနဿိန္ဒြေ', cetasikaId: 2, vedanaFilter: 'somanassa', desc: 'ဝေဒနာစေတသိက် — စိတ္တသုခ။' },
      { name: 'ဒေါမနဿိန္ဒြေ', cetasikaId: 2, vedanaFilter: 'domanassa', desc: 'ဝေဒနာစေတသိက် — စိတ္တဒုက္ခ။' },
      { name: 'ဥပေက္ခိန္ဒြေ', cetasikaId: 2, vedanaFilter: 'upekkha', desc: 'ဝေဒနာစေတသိက် — အလယ်အလတ်။' },
      { name: 'သဒ္ဓိန္ဒြေ', cetasikaId: 28, desc: 'ယုံကြည်ခြင်း — သဒ္ဓါစေတသိက်။' },
      { name: 'ဝီရိယိန္ဒြေ', cetasikaId: 11, desc: 'အားထုတ်ခြင်း — ဝီရိယစေတသိက်။' },
      { name: 'သတိန္ဒြေ', cetasikaId: 29, desc: 'အောက်မေ့ခြင်း — သတိစေတသိက်။' },
      { name: 'သမာဓိန္ဒြေ', cetasikaId: 5, excludeCittaIds: [...Array.from(DVIPANCA_IDS), 18, 19, 25, 26, 27, 28, 11], desc: 'တည်ကြည်ခြင်း — ဧကဂ္ဂတာစေတသိက်၊ ပဉ္စဝိညာဏ်(၁၀)+မနောဓာတ်(၃)+သန္တီရဏ(၃) ပေါင်း (၁၆)ပါးနှင့် ဝိစိကိစ္ဆာစိတ်တို့၌ ဣန္ဒြေအဖြစ် မရောက်။' },
      { name: 'ပညိန္ဒြေ', cetasikaId: 52, desc: 'ထွင်းဖောက်သိခြင်း — ပညာစေတသိက်။' },
      { name: 'အနညာတညဿာမီတိန္ဒြေ', cetasikaId: 52, cittaIds: [82], desc: 'ပညာ — သောတာပတ္တိမဂ်စိတ်တွင်သာ ရှိသော ပညိန္ဒြေ။' },
      { name: 'အညိန္ဒြေ', cetasikaId: 52, cittaIds: [87, 92, 97, 102, 107, 112], desc: 'ပညာ — အထက်မဂ် (၃)ပါး + အောက်ဖိုလ် (၃)ပါးတွင် ရှိသော ပညိန္ဒြေ။' },
      { name: 'အညာတာဝိန္ဒြေ', cetasikaId: 52, cittaIds: [117], desc: 'ပညာ — အရဟတ္တဖိုလ်စိတ်တွင်သာ ရှိသော ပညိန္ဒြေ။' },
    ]},
  { id: 'bala9', name: 'ဗိုလ် (၉)', color: 'blue', cetasikaIds: [28, 11, 29, 5, 52, 30, 31, 15, 16],
    excludeCittaIds: [...Array.from(DVIPANCA_IDS), 18, 19, 25, 26, 27, 28],
    desc: 'ဆန့်ကျင်ဘက်တရားတို့က မတုန်လှုပ်စေနိုင်အောင် မြဲမြံစွာ ဖြစ်သော တရား (၉) ပါး — ဝီရိယ မယှဉ်သောစိတ် (၁၆)ခုတွင် ဗိုလ်မရ။',
    names: [
      { name: 'သဒ္ဓါဗိုလ်', cetasikaId: 28, desc: 'ယုံကြည်မှု မြဲမြံခြင်း။' },
      { name: 'ဝီရိယဗိုလ်', cetasikaId: 11, desc: 'အားထုတ်မှု မြဲမြံခြင်း။' },
      { name: 'သတိဗိုလ်', cetasikaId: 29, desc: 'အောက်မေ့မှု မြဲမြံခြင်း။' },
      { name: 'သမာဓိဗိုလ်', cetasikaId: 5, excludeCittaIds: [11], desc: 'တည်ကြည်မှု မြဲမြံခြင်း — ဝိစိကိစ္ဆာစိတ်၌မူ ဗိုလ်အဖြစ် မရောက်။' },
      { name: 'ပညာဗိုလ်', cetasikaId: 52, desc: 'ပညာ မြဲမြံခြင်း။' },
      { name: 'ဟိရီဗိုလ်', cetasikaId: 30, desc: 'ဒုစရိုက်မှ ရှက်ခြင်း မြဲမြံမှု။' },
      { name: 'ဩတ္တပ္ပဗိုလ်', cetasikaId: 31, desc: 'ဒုစရိုက်မှ ကြောက်ခြင်း မြဲမြံမှု။' },
      { name: 'အဟိရိကဗိုလ်', cetasikaId: 15, desc: 'မရှက်ခြင်း — အကုသိုလ်ဘက် မြဲမြံမှု။' },
      { name: 'အနောတ္တပ္ပဗိုလ်', cetasikaId: 16, desc: 'မကြောက်ခြင်း — အကုသိုလ်ဘက် မြဲမြံမှု။' },
    ]},
  { id: 'adhipati4', name: 'အဓိပတိ (၄)', color: 'violet', cetasikaIds: [13, 11, 52], allCitta: true,
    desc: 'မိမိနှင့်စပ်သော တရားတို့ကို အကြီးအမှုးအဖြစ် စီရင်တတ်သော တရား (၄) ပါး။',
    names: [
      { name: 'ဆန္ဒာဓိပတိ', cetasikaId: 13, cittaIds: SAHETUKA_JAVANA_52_IDS, desc: 'အလိုဆန္ဒ — အကြီးဖြစ်ခြင်း။' },
      { name: 'ဝီရိယာဓိပတိ', cetasikaId: 11, cittaIds: SAHETUKA_JAVANA_52_IDS, desc: 'အားထုတ်ခြင်း — အကြီးဖြစ်ခြင်း။' },
      { name: 'စိတ္တာဓိပတိ', allCitta: true, cittaIds: SAHETUKA_JAVANA_52_IDS, desc: 'စိတ် (citta) ကိုယ်တိုင် — အကြီးဖြစ်ခြင်း။' },
      { name: 'ဝီမံသာဓိပတိ', cetasikaId: 52, cittaIds: TIHETU_JAVANA_34_IDS, desc: 'ပညာ (ဆင်ခြင်ဆန်းစစ်ခြင်း) — အကြီးဖြစ်ခြင်း။' },
    ]},
  { id: 'ahara4', name: 'အာဟာရ (၄)', color: 'amber', cetasikaIds: [1, 4], rupaIds: [18], allCitta: true,
    desc: 'ရုပ်နာမ်တို့ကို ဆောင်ပံ့ပေးတတ်သော တရား (၄) ပါး။',
    names: [
      { name: 'ကဗဠီကာရာဟာရ', rupaId: 18, desc: 'အစာအာဟာရရုပ် — ရူပကာယကို ဆောင်ပံ့ခြင်း။' },
      { name: 'ဖဿာဟာရ', cetasikaId: 1, desc: 'ဖဿစေတသိက် — ဝေဒနာသုံးပါးကို ဆောင်ပံ့ခြင်း။' },
      { name: 'မနောသဉ္စေတနာဟာရ', cetasikaId: 4, desc: 'စေတနာစေတသိက် (ကံ) — ပဋိသန္ဓေကို ဆောင်ပံ့ခြင်း။' },
      { name: 'ဝိညာဏာဟာရ', allCitta: true, desc: 'ပဋိသန္ဓေဝိညာဏ် (citta) — နာမ်ရုပ်ကို ဆောင်ပံ့ခြင်း။' },
    ]},
];

// ဗောဓိပက္ခိယသင်္ဂဟ (၃၇) - အုပ်စု (၇)
const BODHIPAKKHIYA_CATEGORIES = [
  { id: 'satipatthana', name: 'သတိပဋ္ဌာန် (၄)', color: 'rose', cetasikaIds: [29], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'ကိုယ်/ဝေဒနာ/စိတ်/ဓမ္မ အာရုံလေးမျိုး၌ သတိဖြင့် အဖန်တလဲလဲ အောက်မေ့ခြင်း — သတိစေတသိက်တစ်ခုတည်း ယူသောကိစ္စအားဖြင့် (၄) ပါးအပြားရှိသည်။',
    names: [
      { name: 'ကာယာနုပဿနာ', cetasikaId: 29, desc: 'ကိုယ်ကို အသုဘအခြင်းအရာဖြင့် အဖန်တလဲလဲ အောက်မေ့ခြင်း။' },
      { name: 'ဝေဒနာနုပဿနာ', cetasikaId: 29, desc: 'ဒုက္ခဒုက္ခ/ဝိပရိဏာမဒုက္ခ/သင်္ခါရဒုက္ခ ဝေဒနာတို့ကို အောက်မေ့ခြင်း။' },
      { name: 'စိတ္တာနုပဿနာ', cetasikaId: 29, desc: 'သရာဂ/မဟဂ္ဂတ စသော ပြားသော စိတ်ကို အောက်မေ့ခြင်း။' },
      { name: 'ဓမ္မာနုပဿနာ', cetasikaId: 29, desc: 'သညာ/သင်္ခါရ စသော ပြားသော ဓမ္မတို့ကို အောက်မေ့ခြင်း။' },
    ]},
  { id: 'sammappadhana', name: 'သမ္မပ္ပဓာန် (၄)', color: 'sky', cetasikaIds: [11], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'ကောင်းစွာ အားထုတ်ခြင်း — ဝီရိယစေတသိက်တစ်ခုတည်း ကိစ္စလေးမျိုးအားဖြင့် (၄) ပါးအပြားရှိသည်။',
    names: [
      { name: 'ဖြစ်ပြီးအကုသိုလ် ပယ်ခြင်း', cetasikaId: 11, desc: 'ဖြစ်ကုန်ပြီးသော အကုသိုလ်တရားတို့ကို ပယ်ခြင်းငှါ လုံ့လပြုခြင်း။' },
      { name: 'မဖြစ်သေးအကုသိုလ် မဖြစ်စေခြင်း', cetasikaId: 11, desc: 'မဖြစ်ကုန်သေးသော အကုသိုလ်တရားတို့ကို မဖြစ်စေခြင်းငှါ လုံ့လပြုခြင်း။' },
      { name: 'မဖြစ်သေးကုသိုလ် ဖြစ်စေခြင်း', cetasikaId: 11, desc: 'မဖြစ်ကုန်သေးသော ကုသိုလ်တရားတို့ကို ဖြစ်စေခြင်းငှါ လုံ့လပြုခြင်း။' },
      { name: 'ဖြစ်ပြီးကုသိုလ် ပွားများခြင်း', cetasikaId: 11, desc: 'ဖြစ်ကုန်ပြီးသော ကုသိုလ်တရားတို့ကို အလွန်ပွါးများစေခြင်းငှါ လုံ့လပြုခြင်း။' },
    ]},
  { id: 'iddhipada', name: 'ဣဒ္ဓိပါဒ် (၄)', color: 'cyan', cetasikaIds: [13, 11, 52], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'ဈာန်/မဂ်/ဗိုလ်ချမှု ပြီးစီးအောင်မြင်ခြင်း၏ အခြေခံအကြောင်းရင်း တရား (၄) ပါး — ဇောစိတ် (၄၂)ပါးတို့၌သာ ကောက်ယူရသည်။',
    names: [
      { name: 'ဆန္ဒိဒ္ဓိပါဒ်', cetasikaId: 13, cittaIds: JAVANA_SOBHANA_IDS, desc: 'ဆန္ဒစေတသိက် — အလိုလိုချင်ခြင်းသည် တည်ရာဖြစ်ခြင်း။' },
      { name: 'ဝီရိယိဒ္ဓိပါဒ်', cetasikaId: 11, cittaIds: JAVANA_SOBHANA_IDS, desc: 'ဝီရိယစေတသိက် — အားထုတ်ခြင်းသည် တည်ရာဖြစ်ခြင်း။' },
      { name: 'စိတ္တိဒ္ဓိပါဒ်', cittaIds: JAVANA_SOBHANA_IDS, desc: 'လောကုတ္တရာစိတ် (citta ကိုယ်တိုင်) — ဈာန်/မဂ်/ဗိုလ်ချမှု၏ တည်ရာ။' },
      { name: 'ဝီမံသိဒ္ဓိပါဒ်', cetasikaId: 52, cittaIds: JAVANA_SOBHANA_IDS, desc: 'ပညာစေတသိက် — ဆင်ခြင်ဆန်းစစ်ခြင်းသည် တည်ရာဖြစ်ခြင်း။' },
    ]},
  { id: 'indriya5', name: 'ဣန္ဒြေ (၅)', color: 'indigo', cetasikaIds: [28, 11, 29, 5, 52], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'မိမိတို့အစဉ်လိုက်သော တရားတို့၌ အစိုးရသော တရား (၅) ပါး (ဗောဓိပက္ခိယနည်း)။',
    names: [
      { name: 'သဒ္ဓိန္ဒြေ', cetasikaId: 28, desc: 'ယုံကြည်ခြင်း စေတသိက်။' },
      { name: 'ဝီရိယိန္ဒြေ', cetasikaId: 11, desc: 'အားထုတ်ခြင်း စေတသိက်။' },
      { name: 'သတိန္ဒြေ', cetasikaId: 29, desc: 'အောက်မေ့ခြင်း စေတသိက်။' },
      { name: 'သမာဓိန္ဒြေ', cetasikaId: 5, desc: 'တည်ကြည်ခြင်း (ဧကဂ္ဂတာ) စေတသိက်။' },
      { name: 'ပညိန္ဒြေ', cetasikaId: 52, desc: 'ထွင်းဖောက်သိခြင်း (ပညာ) စေတသိက်။' },
    ]},
  { id: 'bala5', name: 'ဗိုလ် (၅)', color: 'blue', cetasikaIds: [28, 11, 29, 5, 52], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'ဆန့်ကျင်ဘက်တရားက မတုန်လှုပ်စေနိုင်အောင် မြဲမြံသော တရား (၅) ပါး (ဗောဓိပက္ခိယနည်း)။',
    names: [
      { name: 'သဒ္ဓါဗိုလ်', cetasikaId: 28, desc: 'ယုံကြည်မှု မြဲမြံခြင်း။' },
      { name: 'ဝီရိယဗိုလ်', cetasikaId: 11, desc: 'အားထုတ်မှု မြဲမြံခြင်း။' },
      { name: 'သတိဗိုလ်', cetasikaId: 29, desc: 'အောက်မေ့မှု မြဲမြံခြင်း။' },
      { name: 'သမာဓိဗိုလ်', cetasikaId: 5, desc: 'တည်ကြည်မှု မြဲမြံခြင်း။' },
      { name: 'ပညာဗိုလ်', cetasikaId: 52, desc: 'ပညာ မြဲမြံခြင်း။' },
    ]},
  { id: 'bojjhanga', name: 'ဗောဇ္ဈင် (၇)', color: 'violet', cetasikaIds: [29, 52, 11, 12, 35, 5, 34], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'သစ္စာလေးပါးကို ထိုးထွင်းသိသော ယောဂါဝစရပုဂ္ဂိုလ်၏ အကြောင်းဖြစ်သော တရား (၇) ပါး။',
    names: [
      { name: 'သတိသမ္ဗောဇ္ဈင်', cetasikaId: 29, desc: 'အောက်မေ့ခြင်း — ဗောဓိ (သိမှု) ၏ အစိတ်အပိုင်း။' },
      { name: 'ဓမ္မဝိစယသမ္ဗောဇ္ဈင်', cetasikaId: 52, desc: 'အနိစ္စစသည်ကို စုံစမ်းဆင်ခြင်တတ်သော ဝိပဿနာပညာ။' },
      { name: 'ဝီရိယသမ္ဗောဇ္ဈင်', cetasikaId: 11, desc: 'အားထုတ်ခြင်း စေတသိက်။' },
      { name: 'ပီတိသမ္ဗောဇ္ဈင်', cetasikaId: 12, desc: 'ပီတိ စေတသိက်။' },
      { name: 'ပဿဒ္ဓိသမ္ဗောဇ္ဈင်', cetasikaId: 35, desc: 'ကာယပဿဒ္ဓိ/စိတ္တပဿဒ္ဓိ — ငြိမ်းအေးခြင်း။' },
      { name: 'သမာဓိသမ္ဗောဇ္ဈင်', cetasikaId: 5, desc: 'တည်ကြည်ခြင်း (ဧကဂ္ဂတာ) စေတသိက်။' },
      { name: 'ဥပေက္ခာသမ္ဗောဇ္ဈင်', cetasikaId: 34, desc: 'တတြမဇ္ဈတ္တုပေက္ခာ — အလယ်အလတ် ထားခြင်း။' },
    ]},
  { id: 'magganga8', name: 'မဂ္ဂင် (၈)', color: 'fuchsia', cetasikaIds: [52, 8, 47, 48, 49, 11, 29, 5], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'နိဗ္ဗာန်သို့ ရွှေ့လျားရောက်စေတတ်သော အရိယာမဂ်၏ အင်္ဂါ (၈) ပါး (ဗောဓိပက္ခိယနည်း — သမ္မာ ၈-ပါးသာ)။',
    names: [
      { name: 'သမ္မာဒိဋ္ဌိ', cetasikaId: 52, desc: 'မှန်ကန်စွာ မြင်ခြင်း (ပညာ)။' },
      { name: 'သမ္မာသင်္ကပ္ပ', cetasikaId: 8, desc: 'မှန်ကန်စွာ ကြံစည်ခြင်း (ဝိတက်)။' },
      { name: 'သမ္မာဝါစာ', cetasikaId: 47, desc: 'မှန်ကန်သော နှုတ်ကျင့်။' },
      { name: 'သမ္မာကမ္မန္တ', cetasikaId: 48, desc: 'မှန်ကန်သော ကာယကျင့်။' },
      { name: 'သမ္မာအာဇီဝ', cetasikaId: 49, desc: 'မှန်ကန်သော အသက်မွေးမှု။' },
      { name: 'သမ္မာဝါယာမ', cetasikaId: 11, desc: 'မှန်ကန်စွာ အားထုတ်ခြင်း (ဝီရိယ)။' },
      { name: 'သမ္မာသတိ', cetasikaId: 29, desc: 'မှန်ကန်စွာ အောက်မေ့ခြင်း (သတိ)။' },
      { name: 'သမ္မာသမာဓိ', cetasikaId: 5, desc: 'မှန်ကန်စွာ တည်ကြည်ခြင်း (ဧကဂ္ဂတာ)။' },
    ]},
];

// သဗ္ဗသင်္ဂဟ - ခန္ဓာ/ဥပါဒါနက္ခန္ဓာ/အာယတန/ဓာတ်/သစ္စာ ၅-အုပ်စု
// ALL_CITTA_IDS ကို ဖိုင် အပေါ်ပိုင်း (BHUMI_31 data ရှေ့) မှာ ရွှေ့ကြေညာထားပြီးဖြစ်သည်
const SANKHARAKKHANDHA_IDS = CETASIKAS.map(ct => ct.id).filter(id => id !== 2 && id !== 3);
const ALL_RUPA_IDS = RUPAS.filter(r => !r.virtual).map(r => r.id); // ဖောဋ္ဌဗ္ဗာရုံ ကိုယ်စားပြု virtual id (29,30,31) များကို ထုတ်ထား — ရုပ် (၂၈) ပါးသာ
const DHAMMAYATANA_SUKHUMA_RUPA_IDS = [2,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]; // သုခုမရုပ် (၁၆) ပါး
const LOKIYA_CITTA_IDS = CITTAS.filter(c => c.id <= 81).map(c => c.id);
const MAGGANGA8_IDS = [52, 8, 47, 48, 49, 11, 29, 5];

const SABBA_KHANDHA = [
  { id: 'rupakkhandha', name: 'ရူပက္ခန္ဓာ', rupaIds: ALL_RUPA_IDS },
  { id: 'vedanakkhandha', name: 'ဝေဒနာက္ခန္ဓာ', cetasikaIds: [2] },
  { id: 'sannakkhandha', name: 'သညာက္ခန္ဓာ', cetasikaIds: [3] },
  { id: 'sankharakkhandha', name: 'သင်္ခါရက္ခန္ဓာ (၅၀)', cetasikaIds: SANKHARAKKHANDHA_IDS },
  { id: 'vinnanakkhandha', name: 'ဝိညာဏက္ခန္ဓာ', cittaIds: ALL_CITTA_IDS },
  { id: 'khandhavimutta', name: 'ခန္ဓဝိမုတ်', isNibbana: true, note: 'နိဗ္ဗာန်သည်အပြား (၁၁-ပါး) မရှိသောကြောင့် ခန္ဓာဟူသော အရေအတွက်မှ လွတ်၏။' },
];
// ဥပါဒါနက္ခန္ဓာဝိမုတ် — လောကုတ္တရာစိတ်၌ ယှဉ်သော စေတသိက် (၃၆) ပါး = သဗ္ဗစိတ္တသာဓာရဏ(၇)+ပကိဏ္ဏက(၆)+သောဘဏသာဓာရဏ(၁၉)+ဝိရတီ(၃)+ပညိန္ဒြေ(၁)
// (အကုသိုလ်စေတသိက် ၁၄-ပါးနှင့် အပ္ပမညာ ၂-ပါးတို့ကို ကြဉ်ထား)
const UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS = [
  ...Array.from({ length: 13 }, (_, i) => i + 1),   // သဗ္ဗစိတ္တသာဓာရဏ(၇)+ပကိဏ္ဏက(၆)
  ...Array.from({ length: 22 }, (_, i) => i + 28),  // သောဘဏသာဓာရဏ(၁၉)+ဝိရတီ(၃)
  52,                                                 // ပညိန္ဒြေ
];
const SABBA_UPADANAKKHANDHA = [
  { id: 'rupupadanakkhandha', name: 'ရူပုပါဒါနက္ခန္ဓာ', rupaIds: ALL_RUPA_IDS },
  { id: 'vedanupadanakkhandha', name: 'ဝေဒနုပါဒါနက္ခန္ဓာ', cetasikaIds: [2], cittaScope: 'lokiya', note: 'ယှဉ်တွဲသောစိတ်မှာ လောကီစိတ် (၈၁) သာ ပါဝင်သည်' },
  { id: 'sannupadanakkhandha', name: 'သညုပါဒါနက္ခန္ဓာ', cetasikaIds: [3], cittaScope: 'lokiya', note: 'ယှဉ်တွဲသောစိတ်မှာ လောကီစိတ် (၈၁) သာ ပါဝင်သည်' },
  { id: 'sankharupadanakkhandha', name: 'သင်္ခါရုပါဒါနက္ခန္ဓာ', cetasikaIds: SANKHARAKKHANDHA_IDS, cittaScope: 'lokiya', note: 'ယှဉ်တွဲသောစိတ်မှာ လောကီစိတ် (၈၁) သာ ပါဝင်သည်' },
  { id: 'vinnanupadanakkhandha', name: 'ဝိညာဏုပါဒါနက္ခန္ဓာ', cittaIds: LOKIYA_CITTA_IDS, note: 'လောကီစိတ် (၈၁) သာ ပါဝင်သည်' },
  { id: 'upadanakkhandhavimutta', name: 'ဥပါဒါနက္ခန္ဓဝိမုတ်', cittaIds: [82,87,92,97,102,107,112,117], cetasikaIds: UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS, isNibbana: true, note: 'လောကုတ္တရာစိတ် (၈)ပါး၊ ယှဉ်သော စေတသိက် (၃၆)ပါးနှင့် နိဗ္ဗာန်သည် ဥပါဒါနက္ခန္ဓာမှ လွတ်၏။' },
];
const SABBA_AYATANA = [
  { id: 'cakkhayatana', name: 'စက္ခာယတန', rupaIds: [5] },
  { id: 'sotayatana', name: 'သောတာယတန', rupaIds: [6] },
  { id: 'ghanayatana', name: 'ဃာနာယတန', rupaIds: [7] },
  { id: 'jivhayatana', name: 'ဇိဝှါယတန', rupaIds: [8] },
  { id: 'kayayatana', name: 'ကာယာယတန', rupaIds: [9] },
  { id: 'rupayatana', name: 'ရူပါယတန', rupaIds: [10] },
  { id: 'saddayatana', name: 'သဒ္ဒါယတန', rupaIds: [11] },
  { id: 'gandhayatana', name: 'ဂန္ဓာယတန', rupaIds: [12] },
  { id: 'rasayatana', name: 'ရသာယတန', rupaIds: [13] },
  { id: 'photthabbayatana', name: 'ဖောဋ္ဌဗ္ဗာယတန', rupaIds: [1, 2, 4] },
  { id: 'manayatana', name: 'မနာယတန', cittaIds: ALL_CITTA_IDS },
  { id: 'dhammayatana', name: 'ဓမ္မာယတန', cetasikaIds: CETASIKAS.map(ct => ct.id), rupaIds: DHAMMAYATANA_SUKHUMA_RUPA_IDS, isNibbana: true, noCitta: true },
];
const SABBA_DHATU = [
  { id: 'cakkhudhatu', name: 'စက္ခုဓာတ်', rupaIds: [5] },
  { id: 'sotadhatu', name: 'သောတဓာတ်', rupaIds: [6] },
  { id: 'ghanadhatu', name: 'ဃာနဓာတ်', rupaIds: [7] },
  { id: 'jivhadhatu', name: 'ဇိဝှါဓာတ်', rupaIds: [8] },
  { id: 'kayadhatu', name: 'ကာယဓာတ်', rupaIds: [9] },
  { id: 'rupadhatu', name: 'ရူပဓာတ်', rupaIds: [10] },
  { id: 'saddadhatu', name: 'သဒ္ဒဓာတ်', rupaIds: [11] },
  { id: 'gandhadhatu', name: 'ဂန္ဓဓာတ်', rupaIds: [12] },
  { id: 'rasadhatu', name: 'ရသဓာတ်', rupaIds: [13] },
  { id: 'photthabbadhatu', name: 'ဖောဋ္ဌဗ္ဗဓာတ်', rupaIds: [1, 2, 4] },
  { id: 'cakkhuvinnanadhatu', name: 'စက္ခုဝိညာဏဓာတ်', cittaIds: [13, 20] },
  { id: 'sotavinnanadhatu', name: 'သောတဝိညာဏဓာတ်', cittaIds: [14, 21] },
  { id: 'ghanavinnanadhatu', name: 'ဃာနဝိညာဏဓာတ်', cittaIds: [15, 22] },
  { id: 'jivhavinnanadhatu', name: 'ဇိဝှါဝိညာဏဓာတ်', cittaIds: [16, 23] },
  { id: 'kayavinnanadhatu', name: 'ကာယဝိညာဏဓာတ်', cittaIds: [17, 24] },
  { id: 'manodhatu', name: 'မနောဓာတ်', cittaIds: [28, 18, 25] },
  { id: 'manovinnanadhatu', name: 'မနောဝိညာဏဓာတ်', cittaIds: ALL_CITTA_IDS.filter(id => ![13,20,14,21,15,22,16,23,17,24,28,18,25].includes(id)) },
  { id: 'dhammadhatu', name: 'ဓမ္မဓာတ်', cetasikaIds: CETASIKAS.map(ct => ct.id), rupaIds: DHAMMAYATANA_SUKHUMA_RUPA_IDS, isNibbana: true, noCitta: true },
];
const SABBA_SACCA = [
  { id: 'dukkhasacca', name: 'ဒုက္ခသစ္စာ', cittaIds: LOKIYA_CITTA_IDS, cetasikaIds: CETASIKAS.map(ct => ct.id).filter(id => id !== 18), rupaIds: ALL_RUPA_IDS },
  { id: 'samudayasacca', name: 'သမုဒယသစ္စာ', cetasikaIds: [18] },
  { id: 'nirodhasacca', name: 'နိရောဓသစ္စာ', isNibbana: true },
  { id: 'maggasacca', name: 'မဂ္ဂသစ္စာ', cittaIds: CITTAS.filter(c => c.subGroup === 'magga').map(c => c.id), cetasikaIds: MAGGANGA8_IDS },
  // သစ္စာဝိမုတ် — မဂ်စိတ်၏ မဂ္ဂင်(၈)မှလွဲ ကျန်စေတသိက်(၂၈)+မဂ်စိတ်(၁) = ၂၉ (တစ်ခုစီ)၊
  // ဖိုလ်စိတ်၏ စေတသိက်(၃၆)+ဖိုလ်စိတ်(၁) = ၃၇ (တစ်ခုစီ) တို့သည် သစ္စာလေးပါးမှ လွတ်ကြ၏
  { id: 'saccavimutta', name: 'သစ္စာဝိမုတ်', cittaIds: LOKUTTARA_JAVANA_ALL_IDS, cetasikaIds: UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS,
    note: 'ကြွင်းသော မဂ်စိတ္တုပ္ပါဒ် (၂၉)ခု [= မဂ္ဂင်(၈)မှလွဲ စေတသိက်(၂၈)+မဂ်စိတ်(၁)]၊ ဖိုလ်စိတ္တုပ္ပါဒ် (၃၇)ခု [= စေတသိက်(၃၆)+ဖိုလ်စိတ်(၁)] တို့သည် သစ္စာဟူသော အရေအတွက်မှ လွတ်၏။' },
];
const SABBA_GROUPS = [
  { id: 'khandha', name: 'ခန္ဓာ (၅)', items: SABBA_KHANDHA },
  { id: 'upadanakkhandha', name: 'ဥပါဒါနက္ခန္ဓာ (၅)', items: SABBA_UPADANAKKHANDHA },
  { id: 'ayatana', name: 'အာယတန (၁၂)', items: SABBA_AYATANA },
  { id: 'dhatu', name: 'ဓာတ် (၁၈)', items: SABBA_DHATU },
  { id: 'sacca', name: 'သစ္စာ (၄)', items: SABBA_SACCA },
];

const PATICCA_12 = [
  { id: 'avijja', name: 'အဝိဇ္ဇာ', color: '#ef4444',
    desc: 'သစ္စာလေးပါး၊ ပုဗ္ဗန္တ၊ အပရန္တ၊ ပဋိစ္စသမုပ္ပါဒ် အစရှိသော ဌာန (၈)၌ တွေဝေသော မောဟ။',
    cetasikaIds: [14] },
  { id: 'sankhara', name: 'သင်္ခါရ', color: '#f97316',
    desc: 'ကာမ/ရူပ/အရူပ ကုသိုလ်နှင့် အကုသိုလ် စေတနာ (၂၉)ခု — ပုညာဘိသင်္ခါရ၊ အပုညာဘိသင်္ခါရ၊ အာနေဉ္ဇာဘိသင်္ခါရ (ခန့်မှန်း - ဆက်စပ်စေတနာ)။',
    cetasikaIds: [4] },
  { id: 'vinnana', name: 'ဝိညာဏ်', color: '#f59e0b',
    desc: 'ပဋိသန္ဓေစိတ် (၁၉)ခုနှင့် ပဝတ္တိအခါ လောကီဝိပါက်စိတ် (၃၂)ခု ပေါင်း ဝိညာဏ်ဟု ခေါ်သည်။',
    cittaIds: CITTAS.filter(c => c.type === 'vipaka' && c.id <= 81).map(c => c.id) },
  { id: 'namarupa', name: 'နာမ်ရုပ်', color: '#eab308',
    desc: 'လောကီဝိပါက်စိတ်နှင့် ယှဉ်သော စေတသိက် (နာမ်) နှင့် ကမ္မဇရုပ် (ရုပ်) ပေါင်း နာမ်ရုပ် (ခန့်မှန်း - ကျယ်ပြန့်စွာ ချိတ်ဆက်ထားသည်)။',
    cetasikaIds: CETASIKAS.map(c => c.id), rupaIds: KAMMAJA_ALL_IDS },
  { id: 'salayatana', name: 'သဠာယတန', color: '#84cc16',
    desc: 'အဇ္ဈတ္တိကာယတန (၆)ပါး — စက္ခု/သောတ/ဃာန/ဇိဝှါ/ကာယ ပသာဒရုပ် (၅) + မနာယတန (ဝိပါက်စိတ်)။',
    rupaIds: [5, 6, 7, 8, 9], cittaIds: CITTAS.filter(c => c.type === 'vipaka' && c.id <= 81).map(c => c.id) },
  { id: 'phassa', name: 'ဖဿ', color: '#22c55e',
    desc: 'လောကီဝိပါက်စိတ် (၃၂)ခုနှင့် ယှဉ်သော ဖဿစေတသိက် (၃၂)ခု။',
    cetasikaIds: [1] },
  { id: 'vedana', name: 'ဝေဒနာ', color: '#10b981',
    desc: 'ဖဿနှင့် အတူဖြစ်သော ဝေဒနာစေတသိက် (၃၂)ခု။',
    cetasikaIds: [2] },
  { id: 'tanha', name: 'တဏှာ', color: '#14b8a6',
    desc: 'ဝေဒနာကြောင့် အာရုံ (၆)ပါး၌ နှစ်သက်တပ်မက်သော တဏှာ (လောဘစေတသိက်)။',
    cetasikaIds: [18] },
  { id: 'upadana', name: 'ဥပါဒါန်', color: '#06b6d4',
    desc: 'အားကြီးသော တဏှာ (ကာမုပါဒါန်) နှင့် ဒိဋ္ဌိ (ဒိဋ္ဌုပါဒါန်၊ သီလဗ္ဗတုပါဒါန်၊ အတ္တဝါဒုပါဒါန်)။',
    cetasikaIds: [18, 19] },
  { id: 'bhava', name: 'ဘဝ', color: '#3b82f6',
    desc: 'ကမ္မဘဝ (ဘဝဂါမိကံ ၂၉-ခု) နှင့် ဥပပတ္တိဘဝ (ကာမ/ရူပ/အရူပဘဝ) ပေါင်း ဘဝ (ခန့်မှန်း - ဆက်စပ်စေတနာ)။',
    cetasikaIds: [4] },
  { id: 'jati', name: 'ဇာတိ', color: '#6366f1',
    desc: 'နိပ္ဖန္နရုပ်နှင့် နာမက္ခန္ဓာတို့၏ အသစ်ဖြစ်ပေါ်လာခြင်း (ခန့်မှန်း - ကျယ်ပြန့်စွာ ချိတ်ဆက်ထားသည်)။',
    cittaIds: ALL_CITTA_IDS, cetasikaIds: CETASIKAS.map(c => c.id), rupaIds: ALL_RUPA_IDS },
  { id: 'jaramarana', name: 'ဇရာမရဏ', color: '#8b5cf6',
    desc: 'နိပ္ဖန္နရုပ်၊ နာမက္ခန္ဓာတို့၏ ရင့်ခြင်း (ဇရာ) နှင့် ပျက်ခြင်း (မရဏ) — လက္ခဏရုပ် ဇရတာ/အနိစ္စတာ။',
    rupaIds: [27, 28] },
];

function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function paticcaWedgePath(cx, cy, rOuter, rInner, angleStart, angleEnd) {
  const p1 = polarPoint(cx, cy, rOuter, angleStart);
  const p2 = polarPoint(cx, cy, rOuter, angleEnd);
  const p3 = polarPoint(cx, cy, rInner, angleEnd);
  const p4 = polarPoint(cx, cy, rInner, angleStart);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
}
// ဝိုင်းစက်၏ အောက်ခြမ်း (၆-ချက်) မှာ စာလုံးများ ပြောင်းပြန်မဖြစ်စေရန် arc direction ကို ပြောင်းပေးသည်
function paticcaTextArcPath(cx, cy, r, angleStart, angleEnd) {
  const midAngle = ((angleStart + angleEnd) / 2 + 360) % 360;
  const reversed = midAngle > 0 && midAngle < 180;
  const a1 = reversed ? angleEnd : angleStart;
  const a2 = reversed ? angleStart : angleEnd;
  const sweep = reversed ? 0 : 1;
  const p1 = polarPoint(cx, cy, r, a1);
  const p2 = polarPoint(cx, cy, r, a2);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`;
}

// --- Association Logic (သမ္ပယောဂနည်း) ---

function jhanaOffset(id) {
  // 0=ပထမဈာန်, 1=ဒုတိယ, 2=တတိယ, 3=စတုတ္ထ, 4=ပဉ္စမ (ရူပ/လောကုတ္တရာ)
  if (id >= 55 && id <= 59) return id - 55;
  if (id >= 60 && id <= 64) return id - 60;
  if (id >= 65 && id <= 69) return id - 65;
  if (id >= 82 && id <= 101) return (id - 82) % 5;
  if (id >= 102 && id <= 121) return (id - 102) % 5;
  return null;
}

function hasVitakka(id) {
  if (id <= 12) return true; // အကုသိုလ်အားလုံး
  if (DVIPANCA_IDS.has(id)) return false; // ဒွေပဉ္စဝိညာဏ်-၁၀
  if (id <= 30) return true; // ကျန်အဟိတ်-၈
  if (id <= 54) return true; // ကာမသောဘဏ-၂၄
  if (id >= 70 && id <= 81) return false; // အရူပ (ပဉ္စမဈာန်အခြေခံ)
  const off = jhanaOffset(id);
  return off === 0; // ပထမဈာန်သာ
}

function hasVicara(id) {
  if (hasVitakka(id)) return true;
  if (id >= 70 && id <= 81) return false;
  return jhanaOffset(id) === 1; // ဒုတိယဈာန် ထပ်ပါ
}

function hasAdhimokkha(id) {
  if (id === 11) return false; // ဝိစိကိစ္ဆာသမ္ပယုတ်
  if (DVIPANCA_IDS.has(id)) return false;
  return true;
}

function hasViriya(id) {
  if (DVIPANCA_IDS.has(id)) return false;
  if ([18, 19, 25, 26, 27, 28].includes(id)) return false; // သမ္ပဋိစ္ဆိုင်း၊ သန္တီရဏ၊ ပဉ္စဒွါရာဝဇ္ဇန်း
  return true;
}

function hasPiti(id) {
  if ([1, 2, 3, 4].includes(id)) return true; // လောဘမူ သောမနဿ (၃,၄ ပါဝင်၊ ၅,၆ မပါ)
  if (id === 26 || id === 30) return true; // သန္တီရဏ-သော၊ ဟသိတုပ္ပါဒ်
  if (id >= 31 && id <= 54) { // ကာမသောဘဏ
    const c = CITTAS.find(x => x.id === id);
    return c ? getCittaVedana(c) === 'somanassa' : false;
  }
  if (id >= 70 && id <= 81) return false; // အရူပ
  const off = jhanaOffset(id);
  return off !== null && off <= 2; // ပ-ဒု-တ ဈာန်သာ
}

function hasChanda(id) {
  if (id <= 10) return true; // လောဘမူ+ဒေါသမူ
  if (id === 11 || id === 12) return false; // မောဟမူဒွေး
  if (id <= 30) return false; // အဟိတ်-၁၈
  return true;
}

const AHETUKA_SUBGROUPS = ['akusala-vipaka', 'kusala-vipaka', 'ahetuka-kiriya'];

// citta panel ကို "ပုံသေပုံစံ" (shape) အဖြစ် ထိန်းညှိပေးတဲ့ filter အမျိုးအစားများ — ဒါတွေဟာ citta ဘက်ကို
// dim/ဖျောက် လုပ်ပုံ (subgroup visibility) ကို ဆုံးဖြတ်ပေးသည်
const CITTA_SIDE_BASE_TYPES = ['jati', 'vedana', 'hetu', 'kicca', 'dvara', 'arammana', 'vatthu', 'citta-subgroup', 'ahetuka-context', 'citta-multi', 'vithi-citta-subgroup', 'akusala-cat', 'akusala-name', 'missaka-cat', 'missaka-name', 'bodhi-cat', 'bodhi-name', 'sabba-group', 'cittaja-rupa', 'puggala', 'suti-pati'];
// cetasika panel ကို "ပုံသေပုံစံ" အဖြစ် ထိန်းညှိပေးတဲ့ filter အမျိုးအစား
const CETASIKA_SIDE_BASE_TYPES = ['cetasika-subgroup'];

// ဝေဒနာအလိုက် သီးခြားအရောင် (dot ရဲ့ background color မှာ ရောနှောမသွားစေရန် hex တိုက်ရိုက်သုံးသည်)
const VEDANA_COLOR_HEX = {
  somanassa: '#f59e0b', // ရွှေဝါ
  domanassa: '#e11d48', // အနီရင့်
  sukha: '#10b981',     // စိမ်း
  dukkha: '#7c3aed',    // ခရမ်း
  upekkha: '#64748b',   // မီးခိုးရင့်
};

// လောဘမူ (၁-၈)၊ ဒေါသမူ (၉-၁၀)၊ မဟာစိတ် (၃၁-၅၄) တို့မှာသာ သမ္ပယုတ်/ဝိပ္ပယုတ်နှင့် အသင်္ခါရိက/သသင်္ခါရိက ခွဲခြားစရာရှိသည်
function getCittaMarkers(id) {
  if (id >= 1 && id <= 8) {
    const idx = (id - 1) % 8;
    return { sampayutta: (idx % 4 < 2) ? true : null, asankharika: idx % 2 === 0 };
  }
  if (id === 9 || id === 10) {
    return { sampayutta: null, asankharika: (id - 9) % 2 === 0 };
  }
  if (id >= 31 && id <= 54) {
    const start = id <= 38 ? 31 : (id <= 46 ? 39 : 47);
    const idx = (id - start) % 8;
    return { sampayutta: (idx % 4 < 2) ? true : null, asankharika: idx % 2 === 0 };
  }
  return { sampayutta: null, asankharika: null };
}

function checkAssociation(cId, ctId) {
  if (ctId >= 1 && ctId <= 7) return true; // သဗ္ဗစိတ္တသာဓာရဏ

  // ပကိဏ္ဏက (၆)
  if (ctId === 8) return hasVitakka(cId);
  if (ctId === 9) return hasVicara(cId);
  if (ctId === 10) return hasAdhimokkha(cId);
  if (ctId === 11) return hasViriya(cId);
  if (ctId === 12) return hasPiti(cId);
  if (ctId === 13) return hasChanda(cId);

  if (ctId >= 14 && ctId <= 27) {
      if (cId > 12) return false;
      if (ctId >= 14 && ctId <= 17) return true; // မောဟစတုက္က
      if (ctId === 18) return cId >= 1 && cId <= 8; // လောဘ
      if (ctId === 19) return [1, 2, 5, 6].includes(cId); // ဒိဋ္ဌိ - ဒိဋ္ဌိဂတသမ္ပယုတ်သာ
      if (ctId === 20) return [3, 4, 7, 8].includes(cId); // မာန - ဒိဋ္ဌိဂတဝိပ္ပယုတ်သာ
      if (ctId >= 21 && ctId <= 24) return cId === 9 || cId === 10; // ဒေါသစတုက္က
      if (ctId === 25 || ctId === 26) return [2, 4, 6, 8, 10].includes(cId); // ထိန-မိဒ္ဓ
      if (ctId === 27) return cId === 11; // ဝိစိကိစ္ဆာ
      return false;
  }

  if (ctId >= 28 && ctId <= 52) {
      if (cId < 31) return false; 
      if (ctId >= 28 && ctId <= 46) return true; // သောဘနသာဓာရဏ
      if (ctId >= 47 && ctId <= 49) return (cId >= 31 && cId <= 38) || (cId >= 82); // ဝိရတီ
      if (ctId === 50 || ctId === 51) { // အပ္ပမညာ
          if (cId >= 31 && cId <= 38) return true; // မဟာကုသိုလ်
          if (cId >= 47 && cId <= 54) return true; // မဟာကြိယာ
          if ((cId >= 55 && cId <= 59) || (cId >= 65 && cId <= 69)) { // ရူပကုသိုလ်/ရူပကြိယာသာ (ရူပဝိပါက် 60-64 ကို ထုတ်ထား)
              const off = jhanaOffset(cId);
              return off !== null && off <= 3; // ပဉ္စမဈာန်ကို ထုတ်ထား
          }
          return false;
      }
      if (ctId === 52) { // ပညိန္ဒြေ
          const kamaNana = [31,32,35,36, 39,40,43,44, 47,48,51,52]; 
          if (kamaNana.includes(cId)) return true;
          if (cId >= 55) return true; 
          return false;
      }
  }
  return false;
}

export default function App() {
  const [filter, setFilter] = useState({ type: 'none', value: null });
  // { cittaId, key, stateIndex } — နာနာကဒါစိ long-press mode
  const [nanakadaciMode, setNanakadaciMode] = useState(null);
  // dropdown (ဇာတိ/ဝေဒနာ/ဟေတု/.../အကုသလ/မိဿက/ဗောဓိပက္ခိယ) များအတွက် "ဘယ် citta ကို context ထားပြီး ကျဉ်းအောင်ပြမလဲ"
  // ဆိုတဲ့ သတ်မှတ်ချက် — citta dot ကို တိုက်ရိုက်ရွေးလိုက်တိုင်း ဒီ state ကို သိမ်းထားပြီး၊ category button
  // တစ်ခုကို နှိပ်လိုက်ချိန် filter.type သည် citta မှ တခြားသို့ ပြောင်းသွားသော်လည်း ဒီ context ကို မပျက်စေပါ
  // (clearFilter ခေါ်မှ (သို့) citta တစ်ခုကို ထပ်ရွေး/ပြန်ပယ်မှသာ ပြောင်းသည်)
  const [cittaContext, setCittaContext] = useState(null);
  // "သစ္စာဝိမုတ်" filter active ချိန်၊ လောကုတ္တရာစိတ် (၈)ခုထဲက တစ်ခုကို long-press ဖိထားလျှင်
  // { cittaId } — ကျန်စိတ်များကို အရောင်မှိန်ပြီး မဂ်စိတ်ဆိုရင် ၂၈၊ ဖိုလ်စိတ်ဆိုရင် ၃၆ ခု ပြရန်
  const [saccaVimuttaFocus, setSaccaVimuttaFocus] = useState(null);
  // "မဂ္ဂင် (၁၂)"/"မဂ္ဂင် (၈)" filter active + citta context = မဟာကုသိုလ်စိတ် တစ်ခုချိန်၊ ဝိရတီ (၃)ပါး
  // ဘယ်ခုပါသည်ဟု ပြသနေသည်ကို ညွှန်ပြသော index (0 = ဘာမျှမပါ)
  const [viratiCycleIndex, setViratiCycleIndex] = useState(0);
  const [activeDetail, setActiveDetail] = useState({ name: "", desc: "" });
  const [tooltipPos, setTooltipPos] = useState(null);
  const [lokuttaraExpanded, setLokuttaraExpanded] = useState(false);
  // "base" filter (jati/vedana/hetu/kicca/dvara/arammana/vatthu/subgroup) ရှိနေချိန်မှာ citta/cetasika dot
  // တစ်ခုကို နှိပ်လိုက်ရင် base filter ရဲ့ shape (ဖျောက်ထား/ပြထားသော subgroup များ) ကို မပျက်စေဘဲ
  // အခြားဘက်ခြမ်း၏ association ကိုသာ ထပ်ဆင့်ကျဉ်းအောင် (drill-down) ပြသရန် သီးခြားသိမ်းထားခြင်း
  const [detailPick, setDetailPick] = useState(null); // { type: 'citta' | 'cetasika', id }
  // ဇာတိ/အကုသလ/မိဿက/ဗောဓိပက္ခိယ/သဗ္ဗ ခလုတ်များထဲက ဘယ်ခလုတ်ရဲ့ dropdown ကို ဖွင့်ထားသလဲ
  const [openMenu, setOpenMenu] = useState(null);
  // "အကုသလ" dropdown ထဲမှာ ဘယ်အုပ်စု (index) ကို ချဲ့ပြထားသလဲ — AkusalaDropdown သည် App ပြန် render
  // ဖြစ်တိုင်း အသစ်ပြန်ဖန်တီးခံရသောကြောင့် (App ထဲမှာ inline ကြေညာထားသည့် component ဖြစ်၍) ဒီ state ကို
  // App-level မှာပဲ ထားရမည်၊ local state ဖြင့် ထားလျှင် toggleFilter ခေါ်တိုင်း reset ဖြစ်သွားလိမ့်မည်
  const [akusalaGroupIdx, setAkusalaGroupIdx] = useState(null);
  const [missakaGroupIdx, setMissakaGroupIdx] = useState(null);
  const [bodhiGroupIdx, setBodhiGroupIdx] = useState(null);
  // ဖောဋ္ဌဗ္ဗာရုံ (ဝိသယရုပ်) dot ကို နှိပ်လိုက်ရင် မဟာဘုတ် ၄-ပါးထဲက ၃-ပါး (ပထဝီ/တေဇော/ဝါယော) ကို highlight ပြရန်
  const [photthabbaOn, setPhotthabbaOn] = useState(false);
  // "ရုပ်ကလာပ်" dropdown ကနေ ရွေးထားတဲ့ ကလာပ် (rupaIds set) — citta/cetasika panel ကို မသက်ဆိုင်ဘဲ ရုပ်ဘက်ကိုသာ highlight လုပ်ရန်
  const [selectedKalapa, setSelectedKalapa] = useState(null);
  // ရူပသမုဋ္ဌာန် (ကမ္မဇ/စိတ္တဇ/ဥတုဇ/အာဟာရဇ/နကုတောစိရုပ်) dropdown ကနေ ရွေးထားတဲ့ item (top-level (သို့) sub-level)
  const [selectedSamutthana, setSelectedSamutthana] = useState(null);
  // ရုပ် dot ကို mouse hover လုပ်ရင် ပေါ်လာသော tooltip (နာမည် + အဓိပ္ပါယ်) — mousePos follow, viewport edge clamp
  const [rupaTooltip, setRupaTooltip] = useState(null); // { name, desc, x, y }

  // ဘဝတစ်ခုလုံး စိတ်အစဉ် (ဝီထိ) floating panel
  const [vithiOpen, setVithiOpen] = useState(false);
  const [bhumiOpen, setBhumiOpen] = useState(false);
  // ၃၁-ဘုံ dialog ထဲက ဘုံတစ်ခုကို နှိပ်လိုက်ရင် citta-multi filter ချိတ်ဆက်ရန် သိမ်းထားသော item
  const [selectedBhumiItem, setSelectedBhumiItem] = useState(null);
  // panel ကို drag ဆွဲရွှေ့နိုင်ရန် — screen အလယ်မှာ default ပေါ်ပြီး ပြီးမှ ဆွဲရွှေ့နိုင်သည်
  const [bhumiPos, setBhumiPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(8, window.innerWidth / 2 - 320) : 100,
    y: typeof window !== 'undefined' ? Math.max(8, window.innerHeight / 2 - 300) : 60,
  }));
  const bhumiDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const handleBhumiDragMove = (e) => {
    if (!bhumiDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setBhumiPos({ x: clientX - bhumiDrag.current.offsetX, y: clientY - bhumiDrag.current.offsetY });
  };
  const handleBhumiDragEnd = () => {
    bhumiDrag.current.dragging = false;
    window.removeEventListener('mousemove', handleBhumiDragMove);
    window.removeEventListener('mouseup', handleBhumiDragEnd);
    window.removeEventListener('touchmove', handleBhumiDragMove);
    window.removeEventListener('touchend', handleBhumiDragEnd);
  };
  const handleBhumiDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    bhumiDrag.current = { dragging: true, offsetX: clientX - bhumiPos.x, offsetY: clientY - bhumiPos.y };
    window.addEventListener('mousemove', handleBhumiDragMove);
    window.addEventListener('mouseup', handleBhumiDragEnd);
    window.addEventListener('touchmove', handleBhumiDragMove, { passive: false });
    window.addEventListener('touchend', handleBhumiDragEnd);
  };
  const [paticcaOpen, setPaticcaOpen] = useState(false);
  const [selectedPaticcaId, setSelectedPaticcaId] = useState(null);
  const [paticcaPos, setPaticcaPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(8, window.innerWidth / 2 - 200) : 100,
    y: typeof window !== 'undefined' ? Math.max(8, window.innerHeight / 2 - 220) : 60,
  }));
  const paticcaDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const handlePaticcaDragMove = (e) => {
    if (!paticcaDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPaticcaPos({ x: clientX - paticcaDrag.current.offsetX, y: clientY - paticcaDrag.current.offsetY });
  };
  const handlePaticcaDragEnd = () => {
    paticcaDrag.current.dragging = false;
    window.removeEventListener('mousemove', handlePaticcaDragMove);
    window.removeEventListener('mouseup', handlePaticcaDragEnd);
    window.removeEventListener('touchmove', handlePaticcaDragMove);
    window.removeEventListener('touchend', handlePaticcaDragEnd);
  };
  const handlePaticcaDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    paticcaDrag.current = { dragging: true, offsetX: clientX - paticcaPos.x, offsetY: clientY - paticcaPos.y };
    window.addEventListener('mousemove', handlePaticcaDragMove);
    window.addEventListener('mouseup', handlePaticcaDragEnd);
    window.addEventListener('touchmove', handlePaticcaDragMove, { passive: false });
    window.addEventListener('touchend', handlePaticcaDragEnd);
  };
  const [vithiPos, setVithiPos] = useState({ x: 16, y: 90 });
  const vithiDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });

  // ဝီထိပြ box ကို scroll လုပ်ရင် အလယ်ဆုံးရောက်နေတဲ့ ဝီထိအမျိုးအစားကို ခေါင်းစဉ်နေရာမှာ ပြရန်
  const vithiScrollRef = useRef(null);
  const vithiItemRefs = useRef([]);
  const [vithiCenterGroup, setVithiCenterGroup] = useState('');
  // dot တစ်ခုကို click လုပ်လိုက်ရင် ခေါင်းစဉ်ကို override လုပ်မည့် label (scroll လုပ်လိုက်ရင် ပြန်ရှင်းမည်)
  const [vithiClickLabel, setVithiClickLabel] = useState(null);
  // ပဉ္စဒွါရဝီထိ (၁၅ မျိုး) / မနောဒွါရဝီထိ (၁၀ မျိုး + variant ၂ မျိုး) cycle state
  const [pancaVariantIdx, setPancaVariantIdx] = useState(0);
  const [pancaDoorIdx, setPancaDoorIdx] = useState(0);
  const [manoTypeIdx, setManoTypeIdx] = useState(0);
  const [manoVariantIdx, setManoVariantIdx] = useState(0);
  const [vithiActiveIdx, setVithiActiveIdx] = useState(null);
  const updateVithiCenterGroup = () => {
    const container = vithiScrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    let closestIdx = null, closestDist = Infinity;
    vithiItemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - centerX);
      if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
    });
    if (closestIdx !== null && LIFE_VITHI[closestIdx]) setVithiCenterGroup(LIFE_VITHI[closestIdx].group || '');
    setVithiClickLabel(null);
    setVithiActiveIdx(null);
  };
  useEffect(() => {
    if (vithiOpen) {
      const t = setTimeout(updateVithiCenterGroup, 60);
      return () => clearTimeout(t);
    }
  }, [vithiOpen]);

  // ဘဝတစ်ခုလုံး ဝီထိ (ပဉ္စဒွါရ + မနောဒွါရ ကွက်တွေကို လက်ရှိ cycle state အတိုင်း ပေါင်းစည်းသည်)
  const LIFE_VITHI = [
    ...LIFE_VITHI_BIRTH.map(item => ({ ...item, segment: 'birth' })),
    ...buildPancaSection(pancaVariantIdx, pancaDoorIdx).map(item => ({ ...item, segment: 'panca' })),
    ...buildGap(`${VITHI_GROUPS.life} (ပဉ္စဒွါရနှင့် မနောဒွါရကြား)`).map(item => ({ ...item, segment: 'gap' })),
    ...buildManoSection(manoTypeIdx, manoVariantIdx).map(item => ({ ...item, segment: 'mano' })),
    ...buildGap(`${VITHI_GROUPS.life} (မနောဒွါရနှင့် သေခါနီးကြား)`).map(item => ({ ...item, segment: 'gap' })),
    ...LIFE_VITHI_DEATH.map(item => ({ ...item, segment: 'death' })),
  ];

  // Dot ကို နှိပ်လိုက်ရင် ပေါ်လာသော floating tooltip (နာမည်) ကို ၅ စက္ကန့်အကြာမှာ အလိုအလျောက် ဖျောက်ရန်
  const tooltipTimerRef = useRef(null);

  // ရှေ့/နောက် (navPrev/navNext) floating widget — ဆွဲရွှေ့နိုင်သော အနေအထား
  const navWidgetRef = useRef(null);
  const [navPos, setNavPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth / 2 - 100) : 300,
    y: 72,
  }));
  const navDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const handleNavDragMove = (e) => {
    if (!navDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setNavPos({ x: clientX - navDrag.current.offsetX, y: clientY - navDrag.current.offsetY });
  };
  const handleNavDragEnd = () => {
    navDrag.current.dragging = false;
    window.removeEventListener('mousemove', handleNavDragMove);
    window.removeEventListener('mouseup', handleNavDragEnd);
    window.removeEventListener('touchmove', handleNavDragMove);
    window.removeEventListener('touchend', handleNavDragEnd);
  };
  const handleNavDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    navDrag.current = { dragging: true, offsetX: clientX - navPos.x, offsetY: clientY - navPos.y };
    window.addEventListener('mousemove', handleNavDragMove);
    window.addEventListener('mouseup', handleNavDragEnd);
    window.addEventListener('touchmove', handleNavDragMove, { passive: false });
    window.addEventListener('touchend', handleNavDragEnd);
  };

  const handleVithiDragMove = (e) => {
    if (!vithiDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setVithiPos({ x: clientX - vithiDrag.current.offsetX, y: clientY - vithiDrag.current.offsetY });
  };
  const handleVithiDragEnd = () => {
    vithiDrag.current.dragging = false;
    window.removeEventListener('mousemove', handleVithiDragMove);
    window.removeEventListener('mouseup', handleVithiDragEnd);
    window.removeEventListener('touchmove', handleVithiDragMove);
    window.removeEventListener('touchend', handleVithiDragEnd);
  };
  const handleVithiDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    vithiDrag.current = { dragging: true, offsetX: clientX - vithiPos.x, offsetY: clientY - vithiPos.y };
    window.addEventListener('mousemove', handleVithiDragMove);
    window.addEventListener('mouseup', handleVithiDragEnd);
    window.addEventListener('touchmove', handleVithiDragMove, { passive: false });
    window.addEventListener('touchend', handleVithiDragEnd);
  };

  // ဝီထိ panel ကို ဖွင့်လိုက်တိုင်း ဖန်သားပြင်၏ အောက်ခြေအလယ်တွင် ရှေးဦးစွာ ပေါ်စေရန် (ပြီးမှသာ အသုံးပြုသူက ဆွဲရွှေ့နိုင်သည်)
  const openVithiPanel = () => {
    if (typeof window !== 'undefined') {
      const w = Math.min(1500, window.innerWidth * 0.95);
      const h = 170;
      setVithiPos({ x: Math.max(8, (window.innerWidth - w) / 2), y: Math.max(8, window.innerHeight - h - 24) });
    }
    setVithiOpen(true);
  };

  // Event Handlers
  const toggleFilter = (type, value, itemDetail = { name: "", desc: "" }, rect = null) => {
    setNanakadaciMode(null);
    setSaccaVimuttaFocus(null);
    setViratiCycleIndex(0);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setSelectedSamutthana(null);
    setAkusalaGroupIdx(null);
    if (type === 'citta') {
      // citta ကို ပြန်ပယ်မလား (deselect) / အသစ်ရွေးမလား ဆိုတာအလိုက် context ကို update လုပ်သည်
      if (filter.type === 'citta' && filter.value === value) setCittaContext(null);
      else setCittaContext(value);
    }
    setFilter(prev => {
      if (prev.type === type && prev.value === value) {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        return { type: 'none', value: null };
      } else {
        if (itemDetail.name) {
          setActiveDetail(itemDetail);
          tooltipTimerRef.current = setTimeout(() => {
            setActiveDetail({ name: "", desc: "" });
            setTooltipPos(null);
          }, 3000);
        }
        setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
        return { type, value };
      }
    });
  };

  const handleGroupToggle = (type, subGroupValue, groupTitle, rect) => {
    toggleFilter(type, subGroupValue, { name: `အုပ်စု - ${groupTitle}`, desc: "" }, rect);
  };

  function handleMagganggaCittaClick(cId, itemDetail, rect) {
    const isMagganggaVimuttaActive = (filter.type === 'missaka-cat' && filter.value === 'magganga12') || (filter.type === 'bodhi-cat' && filter.value === 'magganga8');
    if (!isMagganggaVimuttaActive || !MAHA_KUSALA_8_IDS.includes(cId) || cittaContext !== cId) return false;
    const nextIdx = (viratiCycleIndex + 1) % VIRATI_CYCLE_STATES.length;
    setViratiCycleIndex(nextIdx);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setActiveDetail({ name: `${itemDetail.name} — ${VIRATI_CYCLE_STATES[nextIdx].label}`, desc: '' });
    setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
    tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
    return true;
  }

  function handleLokuttaraClick(cId, itemDetail, rect) {
    const isSaccaVimuttaActive = filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta';
    if (!isSaccaVimuttaActive) return;
    if (saccaVimuttaFocus && saccaVimuttaFocus.cittaId === cId) {
      setSaccaVimuttaFocus(null);
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: filter.value.name, desc: filter.value.note || '' });
      setTooltipPos(null);
      return;
    }
    const isMagga = cId <= 101;
    setSaccaVimuttaFocus({ cittaId: cId });
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setActiveDetail({
      name: `${itemDetail.name} — ${isMagga ? 'မဂ္ဂင်(၈)မှလွဲ ကျန်စေတသိက် (၂၈)' : 'စေတသိက် (၃၆) အားလုံး'}`,
      desc: '',
    });
    setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
  }

  function handleCittaLongPress(cId, itemDetail, rect) {
    const key = getNanakadaciConfig(cId);
    if (!key) return;
    if (nanakadaciMode && nanakadaciMode.cittaId === cId) {
      setNanakadaciMode(null);
      clearFilter();
      return;
    }
    setNanakadaciMode({ cittaId: cId, key, stateIndex: 0 });
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setSelectedSamutthana(null);
    setAkusalaGroupIdx(null);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    const st = NANAKADACI_CONFIG[key].states[0];
    setActiveDetail({ name: `${itemDetail.name} — ${st.label}`, desc: '' });
    setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
    setFilter({ type: 'citta', value: cId });
  }

  // "ဇာတိ/အကုသလ/ဝေဒနာ..." ခလုတ်များကို ရွေးထားစဉ် ထပ်နှိပ်လိုက်ရင် table ကို မူလ (refresh) ပြန်ပေါ်စေရန်
  const clearFilter = () => {
    setNanakadaciMode(null);
    setSaccaVimuttaFocus(null);
    setViratiCycleIndex(0);
    setCittaContext(null);
    setFilter({ type: 'none', value: null });
    setActiveDetail({ name: "", desc: "" });
    setTooltipPos(null);
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setSelectedSamutthana(null);
    setSelectedBhumiItem(null);
    setAkusalaGroupIdx(null);
    setSelectedPaticcaId(null);
  };

  // Citta/Cetasika dot တစ်ခုကို နှိပ်လိုက်ရင် သုံးမည့် handler — "base" filter (jati စသည်) ရှိနေချိန်မှာ
  // filter ကို လုံးဝ မပြောင်းလဲစေဘဲ detailPick ကိုသာ toggle လုပ်ပေးသည် (base shape မပျက်)
  // base filter မရှိသေးရင်တော့ ယခင်အတိုင်း တိုက်ရိုက် filter လုပ်ပေးသည်
  const selectDetail = (type, id, itemDetail, rect) => {
    if (type === 'citta' && nanakadaciMode && nanakadaciMode.cittaId === id) {
      const cfg = NANAKADACI_CONFIG[nanakadaciMode.key];
      const nextIdx = (nanakadaciMode.stateIndex + 1) % cfg.states.length;
      setNanakadaciMode({ ...nanakadaciMode, stateIndex: nextIdx });
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: `${itemDetail.name} — ${cfg.states[nextIdx].label}`, desc: '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      return;
    }
    const isBaseActive = filter.type !== 'none' && filter.type !== 'citta' && filter.type !== 'cetasika';
    if (!isBaseActive) {
      setDetailPick(null);
      toggleFilter(type, id, itemDetail, rect);
      return;
    }
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setVithiActiveIdx(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setDetailPick(prev => {
      if (prev && prev.type === type && prev.id === id) {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        return null;
      }
      setActiveDetail(itemDetail);
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      return { type, id };
    });
  };

  // Dropdown (<select>) များအတွက် - value ကို တိုက်ရိုက်သတ်မှတ်ရန်
  const setFilterDirect = (type, rawValue, item, rect = null) => {
    setNanakadaciMode(null);
    setSaccaVimuttaFocus(null);
    setViratiCycleIndex(0);
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    if (rawValue === '' || !item) {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: "", desc: "" });
      setTooltipPos(null);
      return;
    }
    const value = (type === 'hetu' || type === 'kicca' || type === 'dvara' || type === 'vatthu') ? parseInt(rawValue, 10) : rawValue;
    if (filter.type === type && filter.value === value) {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: "", desc: "" });
      setTooltipPos(null);
      return;
    }
    const labelPrefix = type === 'vedana' ? 'ဝေဒနာ' : type === 'hetu' ? 'ဟေတု' : type === 'kicca' ? 'ကိစ္စ' : type === 'dvara' ? 'ဒွါရ' : type === 'arammana' ? 'အာရမ္မဏ' : 'ဝတ္ထု';
    setActiveDetail({ name: `${labelPrefix} - ${item.name}`, desc: "" });
    if (rect) {
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    } else {
      setTooltipPos(null);
    }
    setFilter({ type, value });
  };
  // DropButton မှ setFilterDirect ကို ခေါ်တဲ့အခါ (id, item) parameter ၂ ခုတည်းနဲ့ ခေါ်ချင်တာမို့ wrapper တစ်ခု
  const setFilterDirectSimple = (type, id, item, rect) => setFilterDirect(type, String(id), item, rect);
  // ရွေးထားတဲ့ item (jati/akusala-cat/.../citta/cetasika/sabba-detail) ကို ဘေးက list ထဲမှာ ရှေ့/နောက် ရွှေ့ကြည့်ရန်
  function getNavContext() {
    if (detailPick) return null;
    if (selectedKalapa) {
      const grp = KALAPA_GROUPS.find(g => g.items.some(it => it.id === selectedKalapa.id));
      if (grp) {
        const idx = grp.items.findIndex(it => it.id === selectedKalapa.id);
        if (idx !== -1) {
          return {
            list: grp.items, idx,
            apply: (it, rect) => {
              setFilter({ type: 'none', value: null });
              setActiveDetail({ name: it.name, desc: '' });
              setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
              setVithiActiveIdx(null);
              setDetailPick(null);
              setPhotthabbaOn(false);
              setSelectedKalapa(it);
            },
          };
        }
      }
    }
    const t = filter.type;
    if (t === 'cittaja-rupa') {
      const idx = CITTAJA_RUPA_TYPES.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: CITTAJA_RUPA_TYPES, idx, apply: (it, rect) => toggleFilter('cittaja-rupa', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'jati') {
      const idx = JATI_TYPES.findIndex(j => j.id === filter.value);
      return idx === -1 ? null : { list: JATI_TYPES, idx, apply: (it, rect) => toggleFilter('jati', it.id, { name: `ဇာတ် - ${it.name}စိတ်`, desc: '' }, rect) };
    }
    if (t === 'puggala') {
      const idx = PUGGALA_CITTA_TYPES.findIndex(p => p.id === filter.value);
      return idx === -1 ? null : { list: PUGGALA_CITTA_TYPES, idx, apply: (it, rect) => toggleFilter('puggala', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'suti-pati') {
      const idx = SUTI_PATI_TYPES.findIndex(p => p.id === filter.value);
      return idx === -1 ? null : { list: SUTI_PATI_TYPES, idx, apply: (it, rect) => toggleFilter('suti-pati', it.id, { name: it.name, desc: it.note || '' }, rect) };
    }
    if (t === 'akusala-cat') {
      const idx = akusalaCategoryOptions.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: akusalaCategoryOptions, idx, apply: (it, rect) => toggleFilter('akusala-cat', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'akusala-name') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value.catId);
      if (!cat) return null;
      const visibleList = cat.names.filter(nm => selectedCittaId === null || checkAssociation(selectedCittaId, nm.cetasikaId));
      const idx = visibleList.indexOf(cat.names[filter.value.index]);
      if (idx === -1) return null;
      return {
        list: visibleList, idx,
        apply: (nm, rect) => {
          if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
          setActiveDetail({ name: nm.name, desc: nm.desc || '' });
          setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
          setVithiActiveIdx(null);
          setDetailPick(null);
          setOpenMenu(null);
          setFilter({ type: 'akusala-name', value: { catId: cat.id, index: cat.names.indexOf(nm) } });
        },
      };
    }
    if (t === 'missaka-cat') {
      const idx = missakaCategoryOptions.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: missakaCategoryOptions, idx, apply: (it, rect) => toggleFilter('missaka-cat', it.id, { name: it.name, desc: it.note || '' }, rect) };
    }
    if (t === 'missaka-name') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
      if (!cat) return null;
      const visibleList = cat.names.filter(nm => {
        if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
        if (cat.id === 'magganga12' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
          return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
        }
        return true;
      });
      const idx = visibleList.indexOf(cat.names[filter.value.index]);
      if (idx === -1) return null;
      return {
        list: visibleList, idx,
        apply: (nm, rect) => {
          if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
          setActiveDetail({ name: nm.name, desc: nm.desc || '' });
          setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
          setVithiActiveIdx(null);
          setDetailPick(null);
          setOpenMenu(null);
          setFilter({ type: 'missaka-name', value: { catId: cat.id, index: cat.names.indexOf(nm) } });
        },
      };
    }
    if (t === 'bodhi-cat') {
      const idx = bodhiCategoryOptions.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: bodhiCategoryOptions, idx, apply: (it, rect) => toggleFilter('bodhi-cat', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'bodhi-name') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value.catId);
      if (!cat) return null;
      const visibleList = cat.names.filter(nm => {
        if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
        if (cat.id === 'magganga8' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
          return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
        }
        return true;
      });
      const idx = visibleList.indexOf(cat.names[filter.value.index]);
      if (idx === -1) return null;
      return {
        list: visibleList, idx,
        apply: (nm, rect) => {
          if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
          setActiveDetail({ name: nm.name, desc: nm.desc || '' });
          setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
          setVithiActiveIdx(null);
          setDetailPick(null);
          setOpenMenu(null);
          setFilter({ type: 'bodhi-name', value: { catId: cat.id, index: cat.names.indexOf(nm) } });
        },
      };
    }
    if (t === 'vedana') {
      const idx = VEDANA_TYPES.findIndex(v => v.id === filter.value);
      return idx === -1 ? null : { list: VEDANA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('vedana', it.id, it, rect) };
    }
    if (t === 'hetu') {
      const idx = HETU_TYPES.findIndex(h => h.id === filter.value);
      return idx === -1 ? null : { list: HETU_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('hetu', it.id, it, rect) };
    }
    if (t === 'kicca') {
      const idx = KICCA_TYPES.findIndex(k => k.id === filter.value);
      return idx === -1 ? null : { list: KICCA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('kicca', it.id, it, rect) };
    }
    if (t === 'dvara') {
      const idx = DVARA_TYPES.findIndex(d => d.id === filter.value);
      return idx === -1 ? null : { list: DVARA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('dvara', it.id, it, rect) };
    }
    if (t === 'arammana') {
      const idx = ARAMMANA_TYPES.findIndex(a => a.id === filter.value);
      return idx === -1 ? null : { list: ARAMMANA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('arammana', it.id, it, rect) };
    }
    if (t === 'vatthu') {
      const idx = VATTHU_TYPES.findIndex(v => v.id === filter.value);
      return idx === -1 ? null : { list: VATTHU_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('vatthu', it.id, it, rect) };
    }
    if (t === 'sabba-detail') {
      const grp = SABBA_GROUPS.find(g => g.items.some(it => it.id === filter.value.id));
      if (!grp) return null;
      const visibleList = grp.items.filter(it => isSabbaItemRelevant(it, selectedCittaId));
      const idx = visibleList.findIndex(it => it.id === filter.value.id);
      return idx === -1 ? null : { list: visibleList, idx, apply: (it, rect) => toggleFilter('sabba-detail', it, { name: it.name, desc: it.note || "" }, rect) };
    }
    if (t === 'citta') {
      const idx = CITTAS.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: CITTAS, idx, apply: (it, rect) => toggleFilter('citta', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'cetasika') {
      const idx = CETASIKAS.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: CETASIKAS, idx, apply: (it, rect) => toggleFilter('cetasika', it.id, { name: it.name, desc: it.desc || '' }, rect) };
    }
    return null;
  }
  function navPrev() {
    const ctx = getNavContext();
    if (!ctx) return;
    const n = ctx.list.length;
    const rect = navWidgetRef.current ? navWidgetRef.current.getBoundingClientRect() : null;
    ctx.apply(ctx.list[(ctx.idx - 1 + n) % n], rect);
  }
  function navNext() {
    const ctx = getNavContext();
    if (!ctx) return;
    const n = ctx.list.length;
    const rect = navWidgetRef.current ? navWidgetRef.current.getBoundingClientRect() : null;
    ctx.apply(ctx.list[(ctx.idx + 1) % n], rect);
  }
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const ctx = getNavContext();
      if (!ctx) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') navPrev(); else navNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filter, detailPick]);

  // State Checks
  const isCittaActive = (cId) => {
    if (filter.type === 'none') return true;
    
    // "base" filter (cetasika-subgroup) ရှိနေချိန်မှာ cetasika dot တစ်ခုကို နှိပ်ခဲ့ရင် citta ဘက်ကို
    // အဲဒီ cetasika နဲ့ ယှဉ်တဲ့ citta များအတိုင်းသာ ကျဉ်းအောင် drill-down ပြသည် (citta panel shape ကို မပျက်စေချင်တဲ့ဘက်မှာ မသက်ဆိုင်ပါ)
    if (detailPick && detailPick.type === 'cetasika' && CETASIKA_SIDE_BASE_TYPES.includes(filter.type)) {
      return checkAssociation(cId, detailPick.id);
    }
    if (filter.type === 'citta') return filter.value === cId;
    if (filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta' && saccaVimuttaFocus) {
      return cId === saccaVimuttaFocus.cittaId;
    }
    if (filter.type === 'cetasika') return checkAssociation(cId, filter.value);
    if (filter.type === 'citta-subgroup') return CITTAS.find(c => c.id === cId).subGroup === filter.value;
    if (filter.type === 'cetasika-subgroup') {
      return CETASIKAS.filter(ct => ct.subGroup === filter.value).some(ct => checkAssociation(cId, ct.id));
    }
    if (filter.type === 'jati') return CITTAS.find(c => c.id === cId).type === filter.value;
    if (filter.type === 'vedana') {
      const c = CITTAS.find(c => c.id === cId) || LOKUTTARA_8.find(c => c.id === cId);
      return c ? getCittaVedana(c) === filter.value : false;
    }
    if (filter.type === 'hetu') return getHetuCount(cId) === filter.value;
    if (filter.type === 'kicca') return getCittaKiccas(cId).includes(filter.value);
    if (filter.type === 'dvara') return getCittaDvaras(cId).includes(filter.value);
    if (filter.type === 'arammana') return getCittaArammana(cId).includes(filter.value);
    if (filter.type === 'vatthu') return getCittaVatthu(cId).includes(filter.value);
    if (filter.type === 'citta-multi') return filter.value.includes(cId);
    if (filter.type === 'ahetuka-context') {
      const ids = Array.isArray(filter.value) ? filter.value : [filter.value];
      return ids.includes(cId);
    }
    if (filter.type === 'vithi-citta-subgroup') return CITTAS.find(c => c.id === cId).subGroup === filter.value;
    if (filter.type === 'puggala') {
      const p = PUGGALA_CITTA_TYPES.find(x => x.id === filter.value);
      return p ? p.cittaIds.includes(cId) : false;
    }
    if (filter.type === 'suti-pati') {
      const s = SUTI_PATI_TYPES.find(x => x.id === filter.value);
      return s ? s.cittaIds.includes(cId) : false;
    }
    if (filter.type === 'cittaja-rupa') {
      const cat = CITTAJA_RUPA_TYPES.find(c => c.id === filter.value);
      return cat ? cat.cittaIds.includes(cId) : false;
    }
    if (filter.type === 'akusala-cat') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cId === cittaContext;
      return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    }
    if (filter.type === 'akusala-name') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return cId === cittaContext;
      return checkAssociation(cId, nm.cetasikaId);
    }
    if (filter.type === 'missaka-cat') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return false;
      if (cat.cittaIds) return cat.cittaIds.includes(cId);
      if (cat.allCitta) return true;
      return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    }
    if (filter.type === 'missaka-name') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return false;
      if (nm.excludeCittaIds && nm.excludeCittaIds.includes(cId)) return false;
      if (nm.cittaIds) return nm.cittaIds.includes(cId);
      if (nm.allCitta) return true;
      if (nm.vedanaFilter) {
        const c = CITTAS.find(x => x.id === cId) || LOKUTTARA_8.find(x => x.id === cId);
        return c ? getCittaVedana(c) === nm.vedanaFilter : false;
      }
      if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
      return false; // rupaId only -> citta panel မှာ မသက်ဆိုင်
    }
    if (filter.type === 'bodhi-cat') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.cittaIds && !cat.cittaIds.includes(cId)) return false;
      if (cat.allCitta) return true;
      return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    }
    if (filter.type === 'bodhi-name') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.cittaIds && !cat.cittaIds.includes(cId)) return false;
      if (nm.cittaIds) return nm.cittaIds.includes(cId);
      if (nm.allCitta) return true;
      if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
      return false;
    }
    if (filter.type === 'sabba-detail') {
      const v = filter.value;
      if (cittaContext !== null) return cId === cittaContext;
      if (v.noCitta) return false;
      // cittaIds ကို တိတိကျကျ ပေးထားပြီးသား item (ဥပမာ ဒုက္ခသစ္စာ၊ မဂ္ဂသစ္စာ) တို့အတွက်
      // ဧကဂ္ဂတာ (id 5) ကဲ့သို့ သဗ္ဗစိတ္တသာဓာရဏ cetasika ပါလာလို့ citta အားလုံးကို မှားယွင်း
      // highlight မဖြစ်စေရန် — cittaIds ပေးထားရင် အဲဒါကိုသာ သုံး၊ cetasika-association ကို မသုံးတော့ပါ
      if (v.cittaIds) return v.cittaIds.includes(cId);
      if (v.cetasikaIds && v.cetasikaIds.some(ctId => checkAssociation(cId, ctId))) {
        if (v.cittaScope === 'lokiya' && cId > 81) return false;
        return true;
      }
      return false;
    }
    return false;
  };

  const isCetasikaActive = (ctId) => {
    if (filter.type === 'none') return true;
    
    // "base" filter (jati/vedana/hetu/kicca/dvara/arammana/vatthu/citta-subgroup...) ရှိနေချိန်မှာ citta dot
    // တစ်ခုကို နှိပ်ခဲ့ရင် citta panel ရဲ့ shape (ပြထား/ဖျောက်ထား subgroup) ကို လုံးဝ မပြောင်းလဲစေဘဲ
    // cetasika panel ကိုသာ ဒီတစ်ခု citta နဲ့ ယှဉ်တဲ့ cetasika များအတိုင်း ကျဉ်းပြသည်
    if (detailPick && detailPick.type === 'citta' && CITTA_SIDE_BASE_TYPES.includes(filter.type)) {
      return checkAssociation(detailPick.id, ctId);
    }
    if (filter.type === 'cetasika') return filter.value === ctId;
    if (filter.type === 'citta') {
      if (nanakadaciMode && nanakadaciMode.cittaId === filter.value) {
        const st = NANAKADACI_CONFIG[nanakadaciMode.key].states[nanakadaciMode.stateIndex];
        if (st.exclude.includes(ctId)) return false;
      }
      return checkAssociation(filter.value, ctId);
    }
    if (filter.type === 'cetasika-subgroup') return CETASIKAS.find(ct => ct.id === ctId).subGroup === filter.value;
    if (filter.type === 'citta-subgroup') {
      return CITTAS.filter(c => c.subGroup === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'jati') {
      return CITTAS.filter(c => c.type === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'vedana') {
      return CITTAS.filter(c => getCittaVedana(c) === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'hetu') {
      return CITTAS.filter(c => getHetuCount(c.id) === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'kicca') {
      return CITTAS.filter(c => getCittaKiccas(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'dvara') {
      return CITTAS.filter(c => getCittaDvaras(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'arammana') {
      return CITTAS.filter(c => getCittaArammana(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'vatthu') {
      return CITTAS.filter(c => getCittaVatthu(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'ahetuka-context') {
      const ids = Array.isArray(filter.value) ? filter.value : [filter.value];
      return ids.some(id => checkAssociation(id, ctId));
    }
    if (filter.type === 'citta-multi') {
      return filter.value.some(id => checkAssociation(id, ctId));
    }
    if (filter.type === 'vithi-citta-subgroup') {
      return CITTAS.filter(c => c.subGroup === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'puggala') {
      const p = PUGGALA_CITTA_TYPES.find(x => x.id === filter.value);
      return p ? p.cittaIds.some(id => checkAssociation(id, ctId)) : false;
    }
    if (filter.type === 'suti-pati') {
      const s = SUTI_PATI_TYPES.find(x => x.id === filter.value);
      return s ? s.cittaIds.some(id => checkAssociation(id, ctId)) : false;
    }
    if (filter.type === 'cittaja-rupa') {
      const cat = CITTAJA_RUPA_TYPES.find(c => c.id === filter.value);
      return cat ? cat.cittaIds.some(id => checkAssociation(id, ctId)) : false;
    }
    if (filter.type === 'akusala-cat') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cat.cetasikaIds.includes(ctId) && checkAssociation(cittaContext, ctId);
      return cat.cetasikaIds.includes(ctId);
    }
    if (filter.type === 'akusala-name') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return nm.cetasikaId === ctId && checkAssociation(cittaContext, ctId);
      return nm.cetasikaId === ctId;
    }
    if (filter.type === 'missaka-cat') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) {
        return getCategoryCetasikaIds(cat, cittaContext).includes(ctId);
      }
      return cat.cetasikaIds ? cat.cetasikaIds.includes(ctId) : false;
    }
    if (filter.type === 'missaka-name') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      return nm && nm.cetasikaId ? nm.cetasikaId === ctId : false;
    }
    if (filter.type === 'bodhi-cat') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) {
        return getCategoryCetasikaIds(cat, cittaContext).includes(ctId);
      }
      return cat.cetasikaIds ? cat.cetasikaIds.includes(ctId) : false;
    }
    if (filter.type === 'bodhi-name') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      return nm && nm.cetasikaId ? nm.cetasikaId === ctId : false;
    }
    if (filter.type === 'sabba-detail') {
      if (filter.value.id === 'saccavimutta' && saccaVimuttaFocus) {
        const isMagga = saccaVimuttaFocus.cittaId <= 101;
        if (isMagga && MAGGANGA8_IDS.includes(ctId)) return false;
        return UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS.includes(ctId);
      }
      if (!filter.value.cetasikaIds || !filter.value.cetasikaIds.includes(ctId)) return false;
      if (cittaContext !== null) return checkAssociation(cittaContext, ctId);
      return true;
    }
    return false;
  };

  // Filter ဘယ်ဘက် (citta/cetasika) ကနေ စတင်ခဲ့သလဲ ခွဲခြားရန်
  const isCittaOriginFilter = filter.type === 'citta' || filter.type === 'citta-subgroup' ||
    (cittaContext !== null && (
      filter.type === 'akusala-cat' || filter.type === 'akusala-name' ||
      filter.type === 'missaka-cat' || filter.type === 'missaka-name' ||
      filter.type === 'bodhi-cat' || filter.type === 'bodhi-name'
    ));
  const isCetasikaOriginFilter = filter.type === 'cetasika' || filter.type === 'cetasika-subgroup';

  // Subgroup တစ်ခုလုံး dim ဖြစ်ရင်တောင် "မူလ" ဘက်ခြမ်း (origin side) ကိုတော့ မဖျောက်ဘဲ dim ရုံပဲ ထားမည်
  // "ပစ်မှတ်" ဘက်ခြမ်း (target side) ကိုသာ dim အပြည့်ဖြစ်ရင် ဖျောက်မည်
  const isCittaSubGroupVisible = (subId, sourceData = CITTAS) => {
    if (filter.type === 'none') return true;
    if (isCittaOriginFilter) return true;
    if (filter.type === 'ahetuka-context' && AHETUKA_SUBGROUPS.includes(subId)) return true;
    // "သစ္စာဝိမုတ်" focus mode ဝင်နေစဉ် — မဂ်/ဖိုလ် subgroup ၂-ခုကိုသာ မဖျောက်ဘဲ dot အလိုက်သာ dim လုပ်စေရန် (ကျန်သော subgroup များကို ပုံမှန်အတိုင်း ဖျောက်ဆဲ ဆက်ထားရန်)
    if (filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta' && saccaVimuttaFocus && (subId === 'magga' || subId === 'phala')) return true;
    const items = sourceData.filter(c => c.subGroup === subId);
    return items.length === 0 || items.some(c => isCittaActive(c.id));
  };
  const isCetasikaSubGroupVisible = (subId) => {
    if (filter.type === 'none') return true;
    if (isCetasikaOriginFilter) return true;
    const items = CETASIKAS.filter(ct => ct.subGroup === subId);
    return items.length === 0 || items.some(ct => isCetasikaActive(ct.id));
  };

  // ယခု lokuttaraExpanded mode အလိုက် တကယ်ပြသနေတဲ့ citta set
  const visibleCittaSet = lokuttaraExpanded 
    ? CITTAS 
    : [...CITTAS.filter(c => c.subGroup !== 'magga' && c.subGroup !== 'phala'), ...LOKUTTARA_8];
 // citta panel နှင့် cetasika panel ၂-ဘက်စလုံးအတွက် ယှဉ်နေတဲ့ အရေအတွက်ကို သီးခြားစီ တွက်ချက်ခြင်း
  const hasActiveFilter = filter.type !== 'none';
  const activeCittaCount = hasActiveFilter ? visibleCittaSet.filter(c => isCittaActive(c.id)).length : 0;
  const activeCetasikaCount = hasActiveFilter ? CETASIKAS.filter(ct => isCetasikaActive(ct.id)).length : 0;
  const cittaBadgeLabel = (filter.type === 'cetasika' || filter.type === 'cetasika-subgroup') ? 'ယှဉ်သော စိတ်' : activeDetail.name;
  const cetasikaBadgeLabel = (filter.type === 'citta' || filter.type === 'citta-subgroup') ? 'ယှဉ်သော စေတသိက်' : activeDetail.name;
  // citta တစ်ခုတည်းရွေးထားရင် citta ဘက်မှာ (count=1) badge မလိုတော့ပါ၊ cetasika ကိုလည်း အလားတူ
  const showCittaBadge = hasActiveFilter && filter.type !== 'citta';
  const showCetasikaBadge = hasActiveFilter && filter.type !== 'cetasika';
  const kamaGroupsVisible = CITTA_LAYOUT.slice(0, 3).some(group => group.subGroups.some(sub => isCittaSubGroupVisible(sub.id)));
  const mahaggataGroupsVisible = CITTA_LAYOUT.slice(3, 5).some(group => group.subGroups.some(sub => isCittaSubGroupVisible(sub.id)));

  // ရုပ် (RUPAS) panel အတွက် — မိဿကသင်္ဂဟ (indriya22/ahara4) ကဲ့သို့ rupaIds ပါသော category ရွေးထားရင်သာ သက်ဆိုင်သည်
  const activeRupaCategory = (cittaContext === null && filter.type === 'missaka-cat') ? MISSAKA_CATEGORIES.find(c => c.id === filter.value)
    : (cittaContext === null && filter.type === 'missaka-name') ? (() => {
        const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
        const nm = cat && cat.names[filter.value.index];
        return nm && nm.rupaId ? { rupaIds: [nm.rupaId] } : null;
      })()
    : (cittaContext === null && filter.type === 'sabba-detail') ? filter.value
    : selectedKalapa ? selectedKalapa
    : selectedSamutthana ? selectedSamutthana
    : selectedBhumiItem ? selectedBhumiItem
    : null;
  const rupaFilterActive = !!(activeRupaCategory && activeRupaCategory.rupaIds);
  const isRupaActive = (rId) => (rupaFilterActive ? activeRupaCategory.rupaIds.includes(rId) : false);
  // မူလ:
// const isNibbanaActive = filter.type === 'sabba-detail' && !!filter.value.isNibbana;
const isNibbanaActive = filter.type === 'sabba-detail' && cittaContext === null && !!filter.value.isNibbana;
  const nibbanaDimmed = hasActiveFilter && !isNibbanaActive;
  const isPannattiActive = filter.type === 'arammana' && filter.value === 'pannatti';
  const pannattiDimmed = hasActiveFilter && !isPannattiActive;

  // citta panel ရဲ့ ဇာတိ/အကုသလ/မိဿက/ဗောဓိပက္ခိယ/သဗ္ဗ filter များ active ဖြစ်နေရင် ခေါင်းစဉ်ကြီးနေရာမှာ အဲဒီ label ကို ပြသရန်
  const CITTA_TITLE_FILTER_TYPES = ['jati', 'akusala-cat', 'missaka-cat', 'bodhi-cat', 'sabba-detail'];
  const cittaTitleActiveLabel = CITTA_TITLE_FILTER_TYPES.includes(filter.type)
    ? (filter.type === 'jati' ? JATI_TYPES.find(j => j.id === filter.value)?.name
      : filter.type === 'akusala-cat' ? AKUSALA_CATEGORIES.find(c => c.id === filter.value)?.name
      : filter.type === 'missaka-cat' ? MISSAKA_CATEGORIES.find(c => c.id === filter.value)?.name
      : filter.type === 'bodhi-cat' ? BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value)?.name
      : filter.value.name)
    : null;

  // cetasika panel ရဲ့ ဝေဒနာ/ဟေတု/ကိစ္စ/ဒွါရ/အာရမ္မဏ/ဝတ္ထု filter များ active ဖြစ်နေရင် ခေါင်းစဉ်ကြီးနေရာမှာ အဲဒီ label ကို ပြသရန်
  const CETASIKA_TITLE_FILTER_TYPES = ['vedana', 'hetu', 'kicca', 'dvara', 'arammana', 'vatthu'];
  const cetasikaTitleActiveLabel = CETASIKA_TITLE_FILTER_TYPES.includes(filter.type)
    ? (filter.type === 'vedana' ? VEDANA_TYPES.find(v => v.id === filter.value)?.name
      : filter.type === 'hetu' ? HETU_TYPES.find(h => h.id === filter.value)?.name
      : filter.type === 'kicca' ? KICCA_TYPES.find(k => k.id === filter.value)?.name
      : filter.type === 'dvara' ? DVARA_TYPES.find(d => d.id === filter.value)?.name
      : filter.type === 'arammana' ? ARAMMANA_TYPES.find(a => a.id === filter.value)?.name
      : VATTHU_TYPES.find(v => v.id === filter.value)?.name)
    : null;

  // "citta" တစ်ခုတည်း ရွေးထားစဉ် (filter.type === 'citta') — ဝေဒနာ/ဟေတု/ကိစ္စ/ဒွါရ/အာရမ္မဏ/ဝတ္ထု dropdown များ
  // ကို အားလုံးမပြဘဲ ထိုစိတ်နှင့် ဆိုင်ရာ တန်ဖိုး(များ)ကိုသာ ပြန်ပြသရန် (ပြောင်းပြန် lookup)
  const selectedCittaId = cittaContext;
  const selectedCittaObj = selectedCittaId !== null ? CITTAS.find(c => c.id === selectedCittaId) : null;
  const vedanaOptions = selectedCittaObj ? VEDANA_TYPES.filter(v => v.id === getCittaVedana(selectedCittaObj)) : VEDANA_TYPES;
  const hetuOptions = selectedCittaId !== null ? HETU_TYPES.filter(h => h.id === getHetuCount(selectedCittaId)) : HETU_TYPES;
  const kiccaOptions = selectedCittaId !== null ? KICCA_TYPES.filter(k => getCittaKiccas(selectedCittaId).includes(k.id)) : KICCA_TYPES;
  const dvaraOptions = selectedCittaId !== null ? DVARA_TYPES.filter(d => getCittaDvaras(selectedCittaId).includes(d.id)) : DVARA_TYPES;
  const arammanaOptions = selectedCittaId !== null ? ARAMMANA_TYPES.filter(a => getCittaArammana(selectedCittaId).includes(a.id)) : ARAMMANA_TYPES;
  const vatthuOptions = selectedCittaId !== null ? VATTHU_TYPES.filter(v => getCittaVatthu(selectedCittaId).includes(v.id)) : VATTHU_TYPES;
  const jatiOptions = selectedCittaObj ? JATI_TYPES.filter(j => j.id === selectedCittaObj.type) : JATI_TYPES;
  // citta တစ်ခု ရွေးထားစဉ် (cittaContext) — ဒီ filter.type အမျိုးများ ဖြစ်နေချိန်တွင် ထိုစိတ်၏ ring
  // highlight ကို ဆက်ထိန်းထားရန် (dropdown တစ်ခုမှ တခြားတစ်ခုသို့ ပြောင်းသွားလည်း context မပျောက်စေရန်)
  const CITTA_CONTEXT_NARROWING_TYPES = ['jati', 'vedana', 'hetu', 'kicca', 'dvara', 'arammana', 'vatthu', 'akusala-cat', 'akusala-name', 'missaka-cat', 'missaka-name', 'bodhi-cat', 'bodhi-name', 'sabba-detail'];
  const isCittaContextTargeted = (cId) => cittaContext === cId && CITTA_CONTEXT_NARROWING_TYPES.includes(filter.type);
  // citta တစ်ခုတည်း ရွေးထားစဉ် — အကုသလသင်္ဂဟ (အာသဝ/ဩဃ/ယောဂ/ဂန္ထ/ဥပါဒါန်/နီဝရဏ/အနုသယ/သံယောဇဉ်-၂/ကိလေသာ)
  // အုပ်စု (၁၀) ကို ထိုစိတ်နှင့် ဆိုင်ရာ အုပ်စုများသာ ကျဉ်းအောင် ပြရန်
  const akusalaCategoryOptions = selectedCittaId !== null
    ? AKUSALA_CATEGORIES.filter(cat => cat.cetasikaIds.some(ctId => checkAssociation(selectedCittaId, ctId)))
    : AKUSALA_CATEGORIES;
  // မိဿကသင်္ဂဟ/ဗောဓိပက္ခိယ dropdown များအတွက် — category (cittaIds/allCitta/cetasikaIds/excludeCittaIds ပါနိုင်) တစ်ခု
  // သည် ရွေးထားသော citta နှင့် သက်ဆိုင်မသက်ဆိုင် စစ်ရန်
  function isNanaCategoryRelevant(cat, cId) {
    if (cId === null) return true;
    if (cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return false;
    if (cat.cittaIds) return cat.cittaIds.includes(cId);
    if (cat.allCitta) return true;
    if (cat.cetasikaIds) return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    return true;
  }
  // category အတွင်းရှိ အမည် (name) တစ်ခုစီ (cetasikaId/cittaIds/allCitta/rupaId ပါနိုင်) သည် ရွေးထားသော citta
  // နှင့် သက်ဆိုင်မသက်ဆိုင် စစ်ရန် — rupaId-only အမည်များ (ဥပမာ - စက္ခုန္ဒြေ) သည် citta association နှင့်
  // မသက်ဆိုင်သောကြောင့် အမြဲပြသည်
  function isNanaNameRelevant(nm, cId) {
    if (cId === null) return true;
    if (nm.excludeCittaIds && nm.excludeCittaIds.includes(cId)) return false;
    if (nm.cittaIds) {
      if (!nm.cittaIds.includes(cId)) return false;
      // cittaIds က ကျယ်ပြန့်စွာ ခွင့်ပြုထားသော်လည်း (ဥပမာ - JAVANA_SOBHANA_IDS) cetasikaId ပါရှိလျှင်
      // checkAssociation ဖြင့် ထပ်မံစစ်ဆေးရမည် (ဥပမာ - ဉာဏဝိပ္ပယုတ်စိတ်တွင် ပညိန္ဒြေ/သမ္မာဒိဋ္ဌိ မရှိ)
      if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
      return true;
    }
    if (nm.allCitta) return true;
    if (nm.vedanaFilter) {
      const c = CITTAS.find(x => x.id === cId) || LOKUTTARA_8.find(x => x.id === cId);
      return c ? getCittaVedana(c) === nm.vedanaFilter : false;
    }
    if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
    if (nm.rupaId) return false; // ရုပ်သည် citta တစ်ခုနှင့် "ယှဉ်" (associated) ဖြစ်သည် မဟုတ်သောကြောင့် citta context ရှိချိန် မသက်ဆိုင်ပါ
    return true;
  }
  // မိဿက/ဗောဓိပက္ခိယ category (မဂ္ဂင်/ဣန္ဒြေ/ဗိုလ်/အဓိပတိ စသည်) ကို citta context ရှိစဉ် ရွေးထားချိန်
  // dropdown ထဲက "အမည်" များနှင့် cetasika panel ဘက်က highlight ပြမည့် cetasika များ တူညီအောင်
  // (name-level isNanaNameRelevant filtering ကိုပဲ ပြန်သုံးထားသည့်) helper
  function getCategoryCetasikaIds(cat, cId) {
    if (cId !== null && cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return [];
    if (cId !== null && cat.cittaIds && !cat.cittaIds.includes(cId)) return [];
    if (!cat.names) return cat.cetasikaIds || [];
    return cat.names
      .filter(nm => {
        if (!isNanaNameRelevant(nm, cId)) return false;
        if ((cat.id === 'magganga12' || cat.id === 'magganga8') && cId !== null && MAHA_KUSALA_8_IDS.includes(cId) && [47, 48, 49].includes(nm.cetasikaId)) {
          return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
        }
        return true;
      })
      .map(nm => nm.cetasikaId)
      .filter(id => id !== undefined);
  }
  const missakaCategoryOptions = MISSAKA_CATEGORIES.filter(cat => isNanaCategoryRelevant(cat, selectedCittaId));
  const bodhiCategoryOptions = BODHIPAKKHIYA_CATEGORIES.filter(cat => isNanaCategoryRelevant(cat, selectedCittaId));
  const navCtx = getNavContext();
  // "သဗ္ဗသင်္ဂဟ" (ခန္ဓာ/ဥပါဒါနက္ခန္ဓာ/အာယတန/ဓာတ်/သစ္စာ) item တစ်ခုစီသည် ရွေးထားသော citta နှင့် သက်ဆိုင်မသက်ဆိုင် စစ်ရန်
  // ရုပ်-only item (ဥပမာ - ရူပက္ခန္ဓာ၊ စက္ခာယတန) နှင့် နိဗ္ဗာန်-only item (ဥပမာ - နိရောဓသစ္စာ) တို့သည် citta context
  // ရှိချိန် မသက်ဆိုင်သောကြောင့် ဖယ်ထားရမည်
  function isSabbaItemRelevant(item, cId) {
    if (cId === null) return true;
    if (item.cittaIds) return item.cittaIds.includes(cId);
    if (item.cetasikaIds) return item.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    return false; // rupaIds-only (သို့) isNibbana-only item
  }

    // Header ထဲက "ဇာတိ / အကုသလ / မိဿက / ဗောဓိပက္ခိယ / သဗ္ဗ" ခလုတ်များအတွက် — မူလအခါ label စာလုံးအရွယ်အစားနဲ့ချည်း
  // ကျဉ်းစွာ ပြသထားပြီး၊ နှိပ်လိုက်မှသာ subcategory ခလုတ်တန်း ဆွဲချပြသည့် narrow toggle-button
  const DropButton = ({ label, activeLabel, isOpen, isActiveFilter, onToggle, onClear, children }) => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter && onClear) { onClear(); } else { onToggle(); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter && activeLabel ? activeLabel : label}
        </button>
        {isOpen && menuPos && (
          <div 
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-64 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[280px]">{children}</div>
          </div>
        )}
      </div>
    );
  };

  // "သဗ္ဗ" ခလုတ် — ခန္ဓာ/ဥပါဒါနက္ခန္ဓာ/အာယတန/ဓာတ်/သစ္စာ အုပ်စု (၅)ကို ပထမဆင့်၊ item များကို ဒုတိယဆင့်အဖြစ် ပြသည်
  const SabbaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const [groupIdx, setGroupIdx] = useState(null);
    const isOpen = openMenu === 'sabba-sangaha';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      } else {
        setGroupIdx(null);
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'sabba-detail';
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { clearFilter(); } else { setOpenMenu(prev => prev === 'sabba-sangaha' ? null : 'sabba-sangaha'); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter ? filter.value.name : 'သဗ္ဗ'}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-72 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[300px]">
              {SABBA_GROUPS.map((g, i) => {
                const colorMap = {
                  khandha: groupIdx === i ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
                  upadanakkhandha: groupIdx === i ? 'bg-orange-700 text-white border-orange-700' : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100',
                  ayatana: groupIdx === i ? 'bg-sky-700 text-white border-sky-700' : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100',
                  dhatu: groupIdx === i ? 'bg-violet-700 text-white border-violet-700' : 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100',
                  sacca: groupIdx === i ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
                };
                return (
                  <button
                    key={g.id}
                    onClick={() => setGroupIdx(prev => prev === i ? null : i)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${colorMap[g.id] || 'bg-slate-100 text-slate-600 border-slate-300'}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {groupIdx !== null && (
              <div className="flex flex-wrap gap-1 max-w-[300px] border-t mt-1 pt-1">
                {SABBA_GROUPS[groupIdx].items.filter(it => isSabbaItemRelevant(it, selectedCittaId)).map(it => (
                  <button
                    key={it.id}
                    onClick={() => { toggleFilter('sabba-detail', it, { name: it.name, desc: it.note || "" }); setOpenMenu(null); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${
                      filter.type === 'sabba-detail' && filter.value.id === it.id
                        ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {it.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // "ရုပ်ကလာပ်" ခလုတ် — ကမ္မဇ/စိတ္တဇ/ဥတုဇ/အာဟာရဇ (၄) ကို ပထမဆင့်၊ ကလာပ်များကို ဒုတိယဆင့်အဖြစ် ပြသည်
  const KalapaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const [groupIdx, setGroupIdx] = useState(null);
    const isOpen = openMenu === 'kalapa';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      } else {
        setGroupIdx(null);
      }
    }, [isOpen]);
    const isActiveFilter = !!selectedKalapa;
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { setSelectedKalapa(null); } else { setOpenMenu(prev => prev === 'kalapa' ? null : 'kalapa'); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter ? selectedKalapa.name : 'ရုပ်ကလာပ်'}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-72 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[300px]">
              {KALAPA_GROUPS.map((g, i) => {
                const colorMap = {
                  rose: groupIdx === i ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
                  indigo: groupIdx === i ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100',
                  emerald: groupIdx === i ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
                  amber: groupIdx === i ? 'bg-amber-700 text-white border-amber-700' : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
                };
                return (
                  <button
                    key={g.id}
                    onClick={() => setGroupIdx(prev => prev === i ? null : i)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${colorMap[g.color] || 'bg-slate-100 text-slate-600 border-slate-300'}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {groupIdx !== null && (
              <div className="flex flex-wrap gap-1 max-w-[300px] border-t mt-1 pt-1">
                {KALAPA_GROUPS[groupIdx].items.map(it => (
                  <button
                    key={it.id}
                    onClick={() => {
                      setFilter({ type: 'none', value: null });
                      setActiveDetail({ name: it.name, desc: '' });
                      setTooltipPos(null);
                      setVithiActiveIdx(null);
                      setDetailPick(null);
                      setPhotthabbaOn(false);
                      setSelectedKalapa(prev => (prev && prev.id === it.id ? null : it));
                      setOpenMenu(null);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${
                      selectedKalapa && selectedKalapa.id === it.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {it.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  // "အကုသလ" ခလုတ် — အာသဝ/ဩဃ/ယောဂ/... (၁၀) ကို ပထမဆင့်၊ မူရင်းပါဠိအမည်များ (colorful floating box) ကို ဒုတိယဆင့်အဖြစ် ပြသည်
  // အုပ်စု (groupIdx) ကို App-level state (akusalaGroupIdx) မှာသိမ်းထားရသည် — AkusalaDropdown သည် App ပြန် render
  // တိုင်း inline component အသစ်အဖြစ် ပြန်ဖန်တီးခံရသောကြောင့် local useState ဖြင့်ထားလျှင် toggleFilter
  // ခေါ်တိုင်း (App ပြန် render ဖြစ်စေသောကြောင့်) reset ဖြစ်သွားနိုင်သည်
  const AkusalaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const isOpen = openMenu === 'akusala-cat';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 300);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'akusala-cat' || filter.type === 'akusala-name';
    const pickCategory = (cat, idx, rect) => {
      const wasSame = filter.type === 'akusala-cat' && filter.value === cat.id;
      toggleFilter('akusala-cat', cat.id, { name: cat.name, desc: cat.desc || '' }, rect);
      if (!wasSame) {
        setOpenMenu('akusala-cat');
        setAkusalaGroupIdx(idx);
      } else {
        setAkusalaGroupIdx(null);
      }
    };
    const pickName = (nm, idx, rect) => {
      const cat = AKUSALA_CATEGORIES[akusalaGroupIdx];
      const isSame = filter.type === 'akusala-name' && filter.value.catId === cat.id && filter.value.index === idx;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      if (isSame) {
        setFilter({ type: 'akusala-cat', value: cat.id });
        setActiveDetail({ name: cat.name, desc: cat.desc || '' });
        setTooltipPos(null);
        return;
      }
      setActiveDetail({ name: nm.name, desc: nm.desc || '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      setFilter({ type: 'akusala-name', value: { catId: cat.id, index: idx } });
      setOpenMenu('akusala-cat');
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (filter.type === 'akusala-cat' || filter.type === 'akusala-name') { clearFilter(); } else { setOpenMenu(prev => prev === 'akusala-cat' ? null : 'akusala-cat'); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {filter.type === 'akusala-name'
            ? activeDetail.name || 'အကုသလ'
            : (filter.type === 'akusala-cat' ? AKUSALA_CATEGORIES.find(c => c.id === filter.value)?.name : 'အကုသလ')}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1.5 max-w-[75vw] max-h-80 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[320px]">
              {akusalaCategoryOptions.map((cat) => {
                const i = AKUSALA_CATEGORIES.indexOf(cat);
                const cc = AKUSALA_COLOR_MAP[cat.color] || AKUSALA_COLOR_MAP.rose;
                const isCatActive = filter.type === 'akusala-cat' && filter.value === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={(e) => pickCategory(cat, i, e.currentTarget.getBoundingClientRect())}
                    title={cat.desc || undefined}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${
                      akusalaGroupIdx === i || isCatActive ? cc.active : cc.idle
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {akusalaGroupIdx !== null && (() => {
              const catNames = AKUSALA_CATEGORIES[akusalaGroupIdx].names;
              // citta တစ်ခုတည်း ရွေးထားစဉ် — ထိုစိတ်နှင့် ဆက်စပ်သော (cetasikaId association ရှိသော) အမည်များသာ ကျဉ်းအောင် ပြရန်
              // (index ကို original array အတိုင်း ဆက်ထိန်းထား — filter.value.index/pickName က index ကို ကိုးကားနေသောကြောင့်)
              const visibleEntries = catNames
                .map((nm, ni) => ({ nm, ni }))
                .filter(({ nm }) => selectedCittaId === null || checkAssociation(selectedCittaId, nm.cetasikaId));
              return (
                <div className="flex flex-wrap gap-1.5 max-w-[320px] border-t pt-1.5 mt-0.5">
                  {visibleEntries.map(({ nm, ni }) => {
                    const cc = AKUSALA_COLOR_MAP[AKUSALA_CATEGORIES[akusalaGroupIdx].color] || AKUSALA_COLOR_MAP.rose;
                    const isNameActive = filter.type === 'akusala-name' && filter.value.catId === AKUSALA_CATEGORIES[akusalaGroupIdx].id && filter.value.index === ni;
                    return (
                      <button
                        key={`${nm.name}-${ni}`}
                        onClick={(e) => pickName(nm, ni, e.currentTarget.getBoundingClientRect())}
                        title={nm.desc}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap transition-all ${
                          isNameActive ? `${cc.active} ring-2 ring-offset-1 ring-slate-700 scale-105` : cc.idle
                        }`}
                      >
                        {nm.name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
  const MissakaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const isOpen = openMenu === 'missaka-cat';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 300);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'missaka-cat' || filter.type === 'missaka-name';
    const pickCategory = (cat, idx, rect) => {
      const wasSame = filter.type === 'missaka-cat' && filter.value === cat.id;
      toggleFilter('missaka-cat', cat.id, { name: cat.name, desc: cat.desc || '' }, rect);
      if (!wasSame) { setOpenMenu('missaka-cat'); setMissakaGroupIdx(idx); }
      else { setMissakaGroupIdx(null); }
    };
    const pickName = (nm, idx, rect) => {
      const cat = MISSAKA_CATEGORIES[missakaGroupIdx];
      const isSame = filter.type === 'missaka-name' && filter.value.catId === cat.id && filter.value.index === idx;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      if (isSame) {
        setFilter({ type: 'missaka-cat', value: cat.id });
        setActiveDetail({ name: cat.name, desc: cat.desc || '' });
        setTooltipPos(null);
        return;
      }
      setActiveDetail({ name: nm.name, desc: nm.desc || '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      setFilter({ type: 'missaka-name', value: { catId: cat.id, index: idx } });
      setOpenMenu('missaka-cat');
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { clearFilter(); } else { setOpenMenu(prev => prev === 'missaka-cat' ? null : 'missaka-cat'); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {filter.type === 'missaka-name'
            ? activeDetail.name || 'မိဿက'
            : (filter.type === 'missaka-cat' ? MISSAKA_CATEGORIES.find(c => c.id === filter.value)?.name : 'မိဿက')}
        </button>
        {isOpen && menuPos && (
          <div className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1.5 max-w-[75vw] max-h-80 overflow-y-auto" style={{ left: menuPos.left, top: menuPos.top }}>
            <div className="flex flex-wrap gap-1 max-w-[320px]">
              {missakaCategoryOptions.map((cat) => {
                const i = MISSAKA_CATEGORIES.indexOf(cat);
                const cc = AKUSALA_COLOR_MAP[cat.color] || AKUSALA_COLOR_MAP.rose;
                const isCatActive = filter.type === 'missaka-cat' && filter.value === cat.id;
                return (
                  <button key={cat.id} onClick={(e) => pickCategory(cat, i, e.currentTarget.getBoundingClientRect())} title={cat.desc || undefined}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${missakaGroupIdx === i || isCatActive ? cc.active : cc.idle}`}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {missakaGroupIdx !== null && (() => {
              const curCat = MISSAKA_CATEGORIES[missakaGroupIdx];
              const visibleNames = curCat.names
                .map((nm, ni) => ({ nm, ni }))
                .filter(({ nm }) => {
                  if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
                  if (curCat.id === 'magganga12' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
                    return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
                  }
                  return true;
                });
              return (
                <div className="flex flex-wrap gap-1.5 max-w-[320px] border-t pt-1.5 mt-0.5">
                  {visibleNames.map(({ nm, ni }) => {
                    const cc = AKUSALA_COLOR_MAP[curCat.color] || AKUSALA_COLOR_MAP.rose;
                    const isNameActive = filter.type === 'missaka-name' && filter.value.catId === curCat.id && filter.value.index === ni;
                    return (
                      <button key={`${nm.name}-${ni}`} onClick={(e) => pickName(nm, ni, e.currentTarget.getBoundingClientRect())} title={nm.desc}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap transition-all ${isNameActive ? `${cc.active} ring-2 ring-offset-1 ring-slate-700 scale-105` : cc.idle}`}>
                        {nm.name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
  const BodhiDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const isOpen = openMenu === 'bodhi-cat';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 300);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'bodhi-cat' || filter.type === 'bodhi-name';
    const pickCategory = (cat, idx, rect) => {
      const wasSame = filter.type === 'bodhi-cat' && filter.value === cat.id;
      toggleFilter('bodhi-cat', cat.id, { name: cat.name, desc: cat.desc || '' }, rect);
      if (!wasSame) { setOpenMenu('bodhi-cat'); setBodhiGroupIdx(idx); }
      else { setBodhiGroupIdx(null); }
    };
    const pickName = (nm, idx, rect) => {
      const cat = BODHIPAKKHIYA_CATEGORIES[bodhiGroupIdx];
      const isSame = filter.type === 'bodhi-name' && filter.value.catId === cat.id && filter.value.index === idx;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      if (isSame) {
        setFilter({ type: 'bodhi-cat', value: cat.id });
        setActiveDetail({ name: cat.name, desc: cat.desc || '' });
        setTooltipPos(null);
        return;
      }
      setActiveDetail({ name: nm.name, desc: nm.desc || '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      setFilter({ type: 'bodhi-name', value: { catId: cat.id, index: idx } });
      setOpenMenu('bodhi-cat');
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { clearFilter(); } else { setOpenMenu(prev => prev === 'bodhi-cat' ? null : 'bodhi-cat'); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {filter.type === 'bodhi-name'
            ? activeDetail.name || 'ဗောဓိပက္ခိယ'
            : (filter.type === 'bodhi-cat' ? BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value)?.name : 'ဗောဓိပက္ခိယ')}
        </button>
        {isOpen && menuPos && (
          <div className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1.5 max-w-[75vw] max-h-80 overflow-y-auto" style={{ left: menuPos.left, top: menuPos.top }}>
            <div className="flex flex-wrap gap-1 max-w-[320px]">
              {bodhiCategoryOptions.map((cat) => {
                const i = BODHIPAKKHIYA_CATEGORIES.indexOf(cat);
                const cc = AKUSALA_COLOR_MAP[cat.color] || AKUSALA_COLOR_MAP.rose;
                const isCatActive = filter.type === 'bodhi-cat' && filter.value === cat.id;
                return (
                  <button key={cat.id} onClick={(e) => pickCategory(cat, i, e.currentTarget.getBoundingClientRect())} title={cat.desc || undefined}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${bodhiGroupIdx === i || isCatActive ? cc.active : cc.idle}`}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {bodhiGroupIdx !== null && (() => {
              const curCat = BODHIPAKKHIYA_CATEGORIES[bodhiGroupIdx];
              const visibleNames = curCat.names
                .map((nm, ni) => ({ nm, ni }))
                .filter(({ nm }) => {
                  if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
                  if (curCat.id === 'magganga8' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
                    return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
                  }
                  return true;
                });
              return (
                <div className="flex flex-wrap gap-1.5 max-w-[320px] border-t pt-1.5 mt-0.5">
                  {visibleNames.map(({ nm, ni }) => {
                    const cc = AKUSALA_COLOR_MAP[curCat.color] || AKUSALA_COLOR_MAP.rose;
                    const isNameActive = filter.type === 'bodhi-name' && filter.value.catId === curCat.id && filter.value.index === ni;
                    return (
                      <button key={`${nm.name}-${ni}`} onClick={(e) => pickName(nm, ni, e.currentTarget.getBoundingClientRect())} title={nm.desc}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap transition-all ${isNameActive ? `${cc.active} ring-2 ring-offset-1 ring-slate-700 scale-105` : cc.idle}`}>
                        {nm.name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

    // "ရူပသမုဋ္ဌာန်" ခလုတ် — ကမ္မဇ/စိတ္တဇ/ဥတုဇ/အာဟာရဇ/နကုတောစိရုပ် (၅) ကို ပထမဆင့်၊ ဧကန်/အနေကန် ခွဲခြမ်းမှုကို ဒုတိယဆင့်အဖြစ် ပြသည်
  const SamutthanaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const [groupIdx, setGroupIdx] = useState(null);
    const isOpen = openMenu === 'samutthana';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      } else {
        setGroupIdx(null);
      }
    }, [isOpen]);
    const isActiveFilter = !!selectedSamutthana;
    const colorMap = {
      kammaja: 'rose', cittaja: 'indigo', utuja: 'emerald', aharaja: 'amber', nakutoja: 'slate',
    };
    const pickTop = (top) => {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: top.name, desc: top.note || '' });
      setTooltipPos(null);
      setVithiActiveIdx(null);
      setDetailPick(null);
      setPhotthabbaOn(false);
      setSelectedKalapa(null);
      setSelectedSamutthana(prev => (prev && prev.id === top.id ? null : top));
      setOpenMenu(null);
    };
    const pickSub = (sub) => {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: sub.name, desc: '' });
      setTooltipPos(null);
      setVithiActiveIdx(null);
      setDetailPick(null);
      setPhotthabbaOn(false);
      setSelectedKalapa(null);
      setSelectedSamutthana(prev => (prev && prev.id === sub.id ? null : sub));
      setOpenMenu(null);
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { setSelectedSamutthana(null); } else { setOpenMenu(prev => prev === 'samutthana' ? null : 'samutthana'); } }}
          title={isActiveFilter ? 'ထပ်နှိပ်ပါက မူလဇယားသို့ ပြန်သွားမည် (refresh)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter ? selectedSamutthana.name : 'ရူပသမုဋ္ဌာန်'}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-72 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[300px]">
              {RUPA_SAMUTTHANA_TYPES.map((g, i) => {
                const c = colorMap[g.id] || 'slate';
                const activeCls = `bg-${c}-700 text-white border-${c}-700`;
                const idleCls = `bg-${c}-50 text-${c}-700 border-${c}-300 hover:bg-${c}-100`;
                return (
                  <button
                    key={g.id}
                    onClick={() => (g.sub ? setGroupIdx(prev => prev === i ? null : i) : pickTop(g))}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${groupIdx === i ? activeCls : idleCls}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {groupIdx !== null && RUPA_SAMUTTHANA_TYPES[groupIdx].sub && (
              <div className="flex flex-wrap gap-1 max-w-[300px] border-t mt-1 pt-1">
                {RUPA_SAMUTTHANA_TYPES[groupIdx].sub.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => pickSub(sub)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${
                      selectedSamutthana && selectedSamutthana.id === sub.id
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

    // UI Components
  const Dot = ({ item, isActive, isDimmed, onClick, type, onLongPress }) => {
    // Determine text color based on background darkness
    const isLightBg = item.color.includes('200') || item.color.includes('300') || item.color.includes('400') || item.color.includes('yellow');
    const textClass = isLightBg ? 'text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]';

    const itemDetail = { name: item.name, desc: item.desc || "" };
    const [showHover, setShowHover] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const pressTimerRef = useRef(null);
    const longPressFiredRef = useRef(false);
    const startPress = (e) => {
      if (!onLongPress) return;
      longPressFiredRef.current = false;
      const rect = e.currentTarget.getBoundingClientRect();
      pressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onLongPress(itemDetail, rect);
      }, 600);
    };
    const cancelPress = () => {
      if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    };

    // citta အလုံးများတွင်သာ ဝေဒနာ/သမ္ပယုတ်-ဝိပ္ပယုတ်/အသင်္ခါရိက-သသင်္ခါရိက အရောင်အမှတ်အသားများ ပြရန်
    const markers = type === 'citta' ? getCittaMarkers(item.id) : { sampayutta: null, asankharika: null };
    const vedanaColor = type === 'citta' ? VEDANA_COLOR_HEX[getCittaVedana(item)] : null;

    let hoverCount = null;
    if (showHover && type === 'citta') {
      hoverCount = CETASIKAS.filter(ct => checkAssociation(item.id, ct.id)).length;
    } else if (showHover && type === 'cetasika') {
      hoverCount = CITTAS.filter(c => checkAssociation(c.id, item.id)).length;
    }

    // Mouse pointer ထိပ်ကပ်၍ ပြရန်၊ viewport အနားနားမှာ ဖုံးမသွားအောင် clamp လုပ်ခြင်း
    let tooltipStyle = null;
    if (hoverCount !== null && typeof window !== 'undefined') {
      const TW = 190, TH = 40, GAP = 14;
      let left = mousePos.x + GAP;
      let top = mousePos.y + GAP;
      if (left + TW > window.innerWidth) left = mousePos.x - TW - GAP;
      if (top + TH > window.innerHeight) top = mousePos.y - TH - GAP;
      if (left < 4) left = 4;
      if (top < 4) top = 4;
      tooltipStyle = { left, top };
    }

    return (
      <div 
        className="relative flex-shrink-0"
        onMouseEnter={(e) => { setShowHover(true); setMousePos({ x: e.clientX, y: e.clientY }); }}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setShowHover(false)}
      >
        {tooltipStyle && (
          <div className="fixed z-50 pointer-events-none" style={tooltipStyle}>
            <div className="bg-slate-900 text-white text-[10px] md:text-[11px] rounded-md px-2 py-1 shadow-lg whitespace-nowrap font-semibold">
              {type === 'citta' ? `ယှဉ်သော စေတသိက် - ${hoverCount}` : `ယှဉ်သော စိတ် - ${hoverCount}`}
            </div>
          </div>
        )}
        <div 
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onClick={(e) => { e.stopPropagation(); if (longPressFiredRef.current) { longPressFiredRef.current = false; return; } const rect = e.currentTarget.getBoundingClientRect(); onClick(itemDetail, rect); }}
          className={`
            w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer transition-all duration-300
            flex items-center justify-center text-center p-0.5 leading-[1.15] shadow-sm flex-shrink-0
            ${item.color}
            ${isActive ? 'ring-4 ring-offset-2 ring-slate-800 scale-110 z-10 shadow-lg font-bold' : ''}
            ${isDimmed ? 'opacity-15 grayscale' : 'hover:scale-105 hover:shadow-md'}
            ${markers.asankharika === true ? 'border-2 border-solid border-white/90' : ''}
            ${markers.asankharika === false ? 'border-2 border-dashed border-white/90' : ''}
          `}
        >
          <span className={`text-[9px] md:text-[10px] break-words w-full ${textClass} font-medium tracking-tight`}>
            {item.shortName || item.name}
          </span>
          {vedanaColor && !isDimmed && (
            <span 
              className="absolute bottom-0.5 left-1.5 right-1.5 h-[3px] rounded-full"
              style={{ backgroundColor: vedanaColor }}
              title={`ဝေဒနာ - ${VEDANA_TYPES.find(v => v.id === getCittaVedana(item))?.name || ''}`}
            />
          )}
        </div>
        {markers.sampayutta !== null && !isDimmed && (
          <span 
            className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ring-1 ring-white z-10 ${markers.sampayutta ? 'bg-sky-500' : 'bg-zinc-400'}`}
            title={markers.sampayutta ? 'သမ္ပယုတ်' : 'ဝိပ္ပယုတ်'}
          />
        )}
      </div>
    );
  };

  // ဝီထိ (Life-sequence) dot - နှိပ်လိုက်ရင် alternates/cycle logic များ run ပြီး citta/cetasika panel ကို ချိတ်ဆက် highlight လုပ်ပေးသည်
  const VithiDot = ({ item, idx }) => {
    const [altIdx, setAltIdx] = useState(0);
    const hasAlternates = item.alternates && item.alternates.length > 0;
    const displayLabel = hasAlternates ? item.alternates[altIdx] : item.label;
    const clickable = !!item.matchType && !item.ellipsis;
    const isSelected = vithiActiveIdx === idx;

    const handleClick = () => {
      if (item.matchType === 'panca-vinnana-cycle') {
        const next = (pancaDoorIdx + 1) % PANCA_DVARA_TYPES.length;
        setPancaDoorIdx(next);
        setVithiClickLabel(`${PANCA_DVARA_TYPES[next].doorName} — ${PANCA_VITHI_VARIANTS[pancaVariantIdx].name}`);
        if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        setVithiActiveIdx(idx);
        setFilter({ type: 'ahetuka-context', value: PANCA_DVARA_TYPES[next].vinIds });
        return;
      }
      if (item.matchType === 'panca-door-cycle') {
        const next = (pancaVariantIdx + 1) % PANCA_VITHI_VARIANTS.length;
        setPancaVariantIdx(next);
        setVithiClickLabel(`${PANCA_DVARA_TYPES[pancaDoorIdx].doorName} — ${PANCA_VITHI_VARIANTS[next].name}`);
        if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        setVithiActiveIdx(idx);
        setFilter({ type: 'kicca', value: 2 }); // ဘဝင်ကိစ္စ တပ်တဲ့ စိတ် (၁၉) မျိုးကို highlight
        return;
      }
      if (item.matchType === 'mano-type-cycle') {
        const next = (manoTypeIdx + 1) % MANO_VITHI_TYPES.length;
        setManoTypeIdx(next);
        setManoVariantIdx(0);
        setVithiClickLabel(`မနောဒွါရဝီထိ — ${MANO_VITHI_TYPES[next].name}`);
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        setVithiActiveIdx(idx);
        return;
      }
      if (!clickable) return;
      let nextIdx = altIdx;
      if (hasAlternates) {
        nextIdx = (altIdx + 1) % item.alternates.length;
        setAltIdx(nextIdx);
      }
      if (item.isVariantCycler) {
        const type = MANO_VITHI_TYPES[manoTypeIdx];
        const nextVariant = type.variants.length > 1 ? (manoVariantIdx + 1) % type.variants.length : manoVariantIdx;
        setManoVariantIdx(nextVariant);
        setVithiClickLabel(`မနောဒွါရဝီထိ — ${type.name}${type.variants.length > 1 ? ` (${type.variants[nextVariant].label})` : ''}`);
      } else {
        setVithiClickLabel(item.titleOverride || item.group || null);
      }
      const mValue = item.altMatchValues ? item.altMatchValues[nextIdx] : item.matchValue;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: "", desc: "" });
      setTooltipPos(null);
      setVithiActiveIdx(idx);
      setFilter({ type: item.matchType, value: mValue });
    };

    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div 
          onClick={handleClick}
          title={clickable ? 'နှိပ်ပြီး ဆိုင်ရာ စိတ်/စေတသိက်များကို ကြည့်ပါ' : undefined}
          className={`
            relative flex items-center justify-center text-center p-0.5 shadow-sm transition-transform
            ${item.header ? 'px-3 h-9 md:h-10 rounded-lg' : 'w-11 h-11 md:w-12 md:h-12 rounded-full'}
            ${item.color} ${item.ellipsis ? 'border-2 border-dashed border-slate-400' : ''} ${item.isAtita ? 'ring-2 ring-amber-400' : ''}
            ${clickable ? 'cursor-pointer hover:scale-105' : ''}
            ${isSelected ? 'ring-4 ring-yellow-400 scale-110 z-10' : ''}
          `}
        >
          {item.isAtita && item.atitaIndex && (
            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow ring-1 ring-white">
              {toMyanmar(item.atitaIndex)}
            </span>
          )}
          <span className={`text-white leading-[1.05] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] whitespace-nowrap ${item.header ? 'text-[9px] md:text-[10px] font-bold' : 'text-[8px] md:text-[9px] font-medium'}`}>
            {displayLabel}
          </span>
        </div>
      </div>
    );
  };

  // ရုပ် (RUPAS) dot — hover လုပ်ရင် mouse pointer အနားမှာ tooltip (နာမည်+အဓိပ္ပါယ်) ပြသည်; click လုပ်ရင် ၃ စက္ကန့် ထိပ်တွင် floating tooltip
  const RupaDot = ({ r, dimmed, ringClass, extraClickHandler }) => {
    const isLightBg = r.color.includes('200') || r.color.includes('300') || r.color.includes('400') || r.color.includes('yellow');
    const textClass = isLightBg ? 'text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]';
    const handleClick = (e) => {
      if (extraClickHandler) { const rect = e.currentTarget.getBoundingClientRect(); extraClickHandler(rect); return; }
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveDetail({ name: r.name, desc: r.desc || '' });
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    };
    return (
      <div
        onClick={handleClick}
        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-center p-0.5 leading-tight rounded-full ${r.color} cursor-pointer ${textClass} text-[9px] md:text-[10px] font-medium transition-all hover:scale-105 ${dimmed ? 'opacity-15 grayscale' : ''} ${ringClass || ''}`}
      >
        {r.name}
      </div>
    );
  };
  const PannattiDot = ({ item }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: item.name, desc: item.desc || '' });
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    }}
    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-teal-300 hover:bg-teal-400 cursor-pointer flex items-center justify-center text-center p-0.5 leading-tight text-[8px] md:text-[9px] font-medium text-slate-900 shadow-sm transition-all hover:scale-105 flex-shrink-0"
  >
    {item.name}
  </div>
);
const NibbanaDot = ({ item }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: item.name, desc: item.desc || '' });
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    }}
    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-300 hover:bg-amber-400 cursor-pointer flex items-center justify-center text-center p-0.5 leading-tight text-[8px] md:text-[9px] font-medium text-slate-900 shadow-sm transition-all hover:scale-105 flex-shrink-0"
  >
    {item.name}
  </div>
);
  // Main Container: Title on the left (Vertical), Items on the right
  const MainGroupBox = ({ title, children }) => (
    <div className="flex flex-row rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-2">
      <div className="bg-slate-200 flex items-center justify-center w-8 md:w-10 shrink-0 border-r border-slate-200">
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-xs md:text-sm font-bold text-slate-700 py-3 text-center">
          {title}
        </span>
      </div>
      <div className="flex flex-col flex-1 bg-white">
        {children}
      </div>
    </div>
  );

  // Vertical wrap: outer grouping (လောကီ / ကာမ) label
  const VerticalWrap = ({ title, children }) => (
    <div className="flex flex-row rounded-xl overflow-hidden mb-2 border border-slate-300">
      <div className="bg-slate-700 flex items-center justify-center w-6 md:w-7 shrink-0">
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] md:text-xs font-bold text-white py-2 text-center">
          {title}
        </span>
      </div>
      <div className="flex flex-col flex-1">
        {children}
      </div>
    </div>
  );

  // Sub Container: Dots on the left, Title on the right (Horizontal)
  const SubGroupBox = ({ title, isActive, onClick, children, id, extraTitleContent, hideTitle }) => {
    const isLokuttara = id === 'magga' || id === 'phala';
    const isMahaGroup = id === 'maha-kusala' || id === 'maha-vipaka' || id === 'maha-kiriya';
    const isSobhanaRows = id === 'sobhana-sadharana';
    const lokuttaraCols = lokuttaraExpanded ? 'grid-cols-5' : 'grid-cols-4';
    const alignTop = !!extraTitleContent;
    
    return (
      <div 
        className={`flex flex-row ${alignTop ? 'items-start' : 'items-center'} justify-between p-1.5 md:p-2 border-b last:border-b-0 border-slate-100 transition-all ${isActive ? 'bg-blue-50 shadow-inner' : 'hover:bg-slate-50'}`}
        onClick={onClick}
      >
        <div className={
          isLokuttara ? `grid ${lokuttaraCols} gap-1 md:gap-1.5 w-max` 
          : isMahaGroup ? "flex flex-nowrap gap-0.5 items-center"
          : isSobhanaRows ? "flex flex-col gap-1 md:gap-1.5 flex-1"
          : "flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center"
        }>
          {children}
        </div>
        {!hideTitle && (
          <div className={`flex flex-col items-end shrink-0 ml-2 ${alignTop ? 'gap-1.5' : ''}`}>
            <div 
              className={`text-[10px] md:text-[11px] font-semibold cursor-pointer transition-colors text-right w-16 md:w-24 leading-snug ${isActive ? 'text-blue-800' : 'text-slate-600 hover:text-blue-600'}`}
              title={`${title} ကို ရွေးချယ်ရန် နှိပ်ပါ`}
            >
              {title}
            </div>
            {extraTitleContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Header & Stats Dashboard */}
      <header className="bg-slate-800 text-white p-3 shadow-md z-20 sticky top-0">
        <div className="max-w-[1400px] mx-auto flex flex-row justify-between items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold">အဘိဓမ္မာ ပရမတ္ထတရား (၄) ပါး</h1>
          {filter.type !== 'none' && (
            <button 
              onClick={clearFilter}
              title="ရွေးချယ်မှု ပယ်ဖျက်ရန်"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Floating tooltip - နှိပ်လိုက်တဲ့ dot အပေါ်မှာ ပေါ်လာမည် */}
      {activeDetail.name && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-blue-900 text-white rounded-lg shadow-xl px-3 py-2 max-w-[240px] md:max-w-sm text-center">
            <div className="font-bold text-xs md:text-sm">{activeDetail.name}</div>
            {activeDetail.desc && (
              <div className="text-[10px] md:text-xs mt-1 leading-relaxed text-blue-100">{activeDetail.desc}</div>
            )}
          </div>
          <div className="w-3 h-3 bg-blue-900 rotate-45 mx-auto -mt-1.5"></div>
        </div>
      )}

      
      {/* ရှေ့/နောက် (navPrev/navNext) floating widget — ဆွဲရွှေ့နိုင်၊ item list ရှိချိန်သာ ပေါ်သည် */}
      {navCtx && (
        <div
          ref={navWidgetRef}
          className="fixed z-40 flex items-center gap-1 rounded-full shadow-2xl px-2 py-1.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 border border-white/30"
          style={{ left: navPos.x, top: navPos.y }}
        >
          <div
            className="cursor-move select-none text-white/70 px-1 text-xs tracking-widest"
            onMouseDown={handleNavDragStart}
            onTouchStart={handleNavDragStart}
            title="ဆွဲရွှေ့ရန်"
          >
            ⠿⠿
          </div>
          <button
            onClick={() => navPrev()}
            title="ရှေ့"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-base font-bold transition-colors"
          >
            ‹
          </button>
          <span className="text-[11px] text-white px-1.5 font-semibold tabular-nums whitespace-nowrap">
            {toMyanmar(navCtx.idx + 1)}/{toMyanmar(navCtx.list.length)}
          </span>
          <button
            onClick={() => navNext()}
            title="နောက်"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-base font-bold transition-colors"
          >
            ›
          </button>
          <button
            onClick={clearFilter}
            title="ပိတ်ရန်"
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-xs transition-colors ml-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* စိတ်/စေတသိက် အရေအတွက် badge များကို citta panel / cetasika panel အသီးသီး၏ ထိပ်တွင်သာ အောက်တွင် ပြထားသည် */}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row p-2 gap-2 overflow-hidden max-w-[1500px] mx-auto w-full">
        
        {/* LEFT PANEL: CITTAS */}
        <section className="relative w-full md:w-1/2 bg-white rounded-xl shadow-sm p-2 flex flex-col h-full overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 pb-2 border-b mb-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
               <h2 
                 className="text-base font-bold text-slate-700 cursor-pointer select-none hover:text-blue-600 transition-colors"
                 onClick={() => setLokuttaraExpanded(prev => !prev)}
                 title="လောကုတ္တရာ အကျယ်/အကျဉ်း ပြောင်းရန် နှိပ်ပါ"
               >
                 {lokuttaraExpanded ? 'စိတ် အကျယ် (၁၂၁) ပါး' : 'စိတ် အကျဉ်း (၈၉) ပါး'}
               </h2>

            {/* Akusala/Missaka/Bodhipakkhiya/Sabba Filters — ခလုတ်ကို နှိပ်မှသာ subcategory ဆွဲချပြသည် */}
            <div className="flex flex-wrap gap-1.5 items-start">
              <DropButton
                label="ပုဂ္ဂလစိတ်"
                activeLabel={filter.type === 'puggala' ? PUGGALA_CITTA_TYPES.find(p => p.id === filter.value)?.name : null}
                isOpen={openMenu === 'puggala'}
                isActiveFilter={filter.type === 'puggala'}
                onToggle={() => setOpenMenu(prev => prev === 'puggala' ? null : 'puggala')}
                onClear={clearFilter}
              >
                {PUGGALA_CITTA_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { toggleFilter('puggala', p.id, { name: p.name, desc: "" }); setOpenMenu(null); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
                      filter.type === 'puggala' && filter.value === p.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </DropButton>
              <DropButton
                label="စုတိ-ပဋိ"
                activeLabel={filter.type === 'suti-pati' ? SUTI_PATI_TYPES.find(p => p.id === filter.value)?.name : null}
                isOpen={openMenu === 'suti-pati'}
                isActiveFilter={filter.type === 'suti-pati'}
                onToggle={() => setOpenMenu(prev => prev === 'suti-pati' ? null : 'suti-pati')}
                onClear={clearFilter}
              >
                {SUTI_PATI_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { toggleFilter('suti-pati', p.id, { name: p.name, desc: p.note || "" }); setOpenMenu(null); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
                      filter.type === 'suti-pati' && filter.value === p.id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </DropButton>
              {(cittaContext === null || cittaContext <= 12) && <AkusalaDropdown />}
              <MissakaDropdown />
              {(cittaContext === null || JAVANA_SOBHANA_IDS.includes(cittaContext)) && <BodhiDropdown />}
              <SabbaDropdown />
            </div>
          </div>
          </div> 
          {showCittaBadge && (
            <div className="absolute top-16 md:top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="text-4xl md:text-5xl font-extrabold text-blue-700 leading-none tabular-nums drop-shadow-md">
                {toMyanmar(activeCittaCount)}
              </div>
            </div>
          )}
          <div className="flex flex-col">
            {(kamaGroupsVisible || mahaggataGroupsVisible) && (
            <VerticalWrap title="လောကီစိတ် (၈၁)">
              {kamaGroupsVisible && (
              <VerticalWrap title="ကာမစိတ် (၅၄)">
                {CITTA_LAYOUT.slice(0, 3).map((group, idx) => {
                  const visibleSubs = group.subGroups.filter(sub => isCittaSubGroupVisible(sub.id));
                  if (visibleSubs.length === 0) return null;
                  return (
                  <MainGroupBox key={idx} title={group.title}>
                    {visibleSubs.map(sub => {
                      const isPaired = ['maha-kusala', 'maha-vipaka', 'maha-kiriya'].includes(sub.id);
                      const items = CITTAS.filter(c => c.subGroup === sub.id);
                      const renderDot = (c) => {
                        const isActive = isCittaActive(c.id);
                        const isTargeted = (filter.type === 'citta' && filter.value === c.id) || (detailPick && detailPick.type === 'citta' && detailPick.id === c.id) || isCittaContextTargeted(c.id);
                        return (
                          <Dot 
                            key={`c-${c.id}`} item={c} type="citta"
                            isActive={isTargeted}
                            isDimmed={filter.type !== 'none' && !isActive}
                            onClick={(itemDetail, rect) => {
                              if (handleMagganggaCittaClick(c.id, itemDetail, rect)) return;
                              selectDetail('citta', c.id, itemDetail, rect);
                            }}
                            onLongPress={getNanakadaciConfig(c.id) ? (itemDetail, rect) => handleCittaLongPress(c.id, itemDetail, rect) : undefined}
                          />
                        );
                      };
                      return (
                        <SubGroupBox 
                          key={sub.id} 
                          id={sub.id}
                          title={sub.title}
                          isActive={filter.type === 'citta-subgroup' && filter.value === sub.id}
                          onClick={(e) => handleGroupToggle('citta-subgroup', sub.id, sub.title, e.currentTarget.getBoundingClientRect())}
                        >
                          {isPaired
                            ? Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => (
                                <div key={`pair-${items[i*2].id}`} className="flex gap-0.5 p-0.5 rounded-full border-2 border-dashed border-slate-300">
                                  {renderDot(items[i*2])}
                                  {items[i*2+1] && renderDot(items[i*2+1])}
                                </div>
                              ))
                            : items.map(renderDot)
                          }
                        </SubGroupBox>
                      );
                   })}
                  </MainGroupBox>
                  );
                })}
              </VerticalWrap>
              )}

              {mahaggataGroupsVisible && (
              <VerticalWrap title="မဟဂ္ဂုတ်စိတ် (၂၇)">
              {CITTA_LAYOUT.slice(3, 5).map((group, idx) => {
                const visibleSubs = group.subGroups.filter(sub => isCittaSubGroupVisible(sub.id));
                if (visibleSubs.length === 0) return null;
                return (
                <MainGroupBox key={idx} title={group.title}>
                  {visibleSubs.map(sub => (
                    <SubGroupBox 
                      key={sub.id} 
                      id={sub.id}
                      title={sub.title}
                      isActive={filter.type === 'citta-subgroup' && filter.value === sub.id}
                      onClick={(e) => handleGroupToggle('citta-subgroup', sub.id, sub.title, e.currentTarget.getBoundingClientRect())}
                    >
                      {CITTAS.filter(c => c.subGroup === sub.id).map(c => {
                        const isActive = isCittaActive(c.id);
                        const isTargeted = (filter.type === 'citta' && filter.value === c.id) || (detailPick && detailPick.type === 'citta' && detailPick.id === c.id) || isCittaContextTargeted(c.id);
                        return (
                          <Dot 
                            key={`c-${c.id}`} item={c} type="citta"
                            isActive={isTargeted}
                            isDimmed={filter.type !== 'none' && !isActive}
                            onClick={(itemDetail, rect) => selectDetail('citta', c.id, itemDetail, rect)}
                            onLongPress={getNanakadaciConfig(c.id) ? (itemDetail, rect) => handleCittaLongPress(c.id, itemDetail, rect) : undefined}
                          />
                        );
                      })}
                    </SubGroupBox>
                  ))}
                </MainGroupBox>
                );
              })}
              </VerticalWrap>
              )}
            </VerticalWrap>
            )}

            {CITTA_LAYOUT.slice(5).map((group, idx) => {
              const sourceData0 = lokuttaraExpanded ? CITTAS : LOKUTTARA_8;
              const visibleSubs = group.subGroups.filter(sub => isCittaSubGroupVisible(sub.id, sourceData0));
              if (visibleSubs.length === 0) return null;
              return (
              <MainGroupBox 
                key={idx} 
                title={
                  <span 
                    className="cursor-pointer hover:text-blue-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setLokuttaraExpanded(prev => !prev); }}
                  >
                    {lokuttaraExpanded ? 'လောကုတ္တရာစိတ် အကျယ် (၄၀)' : 'လောကုတ္တရာစိတ် (၈)ပါး'}
                  </span>
                }
              >
                {visibleSubs.map(sub => {
                  const sourceData = lokuttaraExpanded ? CITTAS : LOKUTTARA_8;
                  const subTitle = lokuttaraExpanded
                    ? sub.title
                    : (sub.id === 'magga' ? 'မဂ်စိတ် (၄)' : 'ဖိုလ်စိတ် (၄)');
                  return (
                    <SubGroupBox 
                      key={sub.id} 
                      id={sub.id}
                      title={subTitle}
                      isActive={filter.type === 'citta-subgroup' && filter.value === sub.id}
                      onClick={(e) => handleGroupToggle('citta-subgroup', sub.id, subTitle, e.currentTarget.getBoundingClientRect())}
                    >
                      {sourceData.filter(c => c.subGroup === sub.id).map(c => {
                        const isActive = isCittaActive(c.id);
                        const isTargeted = (filter.type === 'citta' && filter.value === c.id) || (detailPick && detailPick.type === 'citta' && detailPick.id === c.id) || isCittaContextTargeted(c.id);
                        const isSaccaVimuttaActive = filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta';
                        return (
                          <Dot 
                            key={`c-${c.id}`} item={c} type="citta"
                            isActive={isTargeted || (isSaccaVimuttaActive && saccaVimuttaFocus && saccaVimuttaFocus.cittaId === c.id)}
                            isDimmed={filter.type !== 'none' && !isActive}
                            onClick={(itemDetail, rect) => {
                              if (isSaccaVimuttaActive) { handleLokuttaraClick(c.id, itemDetail, rect); return; }
                              selectDetail('citta', c.id, itemDetail, rect);
                            }}
                          />
                        );
                      })}
                    </SubGroupBox>
                  );
                })}
              </MainGroupBox>
              );
            })}
            <div
  className={`mt-2 rounded-xl border-2 p-4 text-center transition-all cursor-default ${
    isNibbanaActive ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-300 scale-[1.02]' : 'border-slate-300 bg-slate-50'
  } ${nibbanaDimmed ? 'opacity-15 grayscale' : ''}`}
>
  <div className="text-lg md:text-xl font-extrabold text-amber-700 tracking-wide">နိဗ္ဗာန်</div>
  
  <div className="mt-3 flex flex-wrap gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
    {NIBBANA_GUNA.map(item => <NibbanaDot key={`ng-${item.id}`} item={item} />)}
  </div>
</div>
            
            </div>
          <div
  className={`mt-2 rounded-xl border-2 p-4 text-center transition-all cursor-default ${
    isPannattiActive ? 'border-teal-500 bg-teal-50 ring-4 ring-teal-300 scale-[1.02]' : 'border-slate-300 bg-slate-50'
  } ${pannattiDimmed ? 'opacity-15 grayscale' : ''}`}
>
  <div className="text-lg md:text-xl font-extrabold text-teal-700 tracking-wide">ပညတ်</div>
    <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
    <div className="flex flex-row items-center gap-2">
      <span className="text-[10px] md:text-[11px] font-semibold text-teal-700 w-20 md:w-24 text-right shrink-0">အတ္ထပညတ် (၆)</span>
      <div className="flex flex-wrap gap-1.5 justify-center flex-1">
        {ATTHA_PANNATTI.map(item => <PannattiDot key={`ap-${item.id}`} item={item} />)}
      </div>
    </div>
    <div className="flex flex-row items-center gap-2">
      <span className="text-[10px] md:text-[11px] font-semibold text-teal-700 w-20 md:w-24 text-right shrink-0">သဒ္ဒပညတ် (၆)</span>
      <div className="flex flex-wrap gap-1.5 justify-center flex-1">
        {SADDA_PANNATTI.map(item => <PannattiDot key={`sp-${item.id}`} item={item} />)}
      </div>
    </div>
  </div>
</div>
          
        </section>

        {/* RIGHT PANEL: CETASIKAS & RUPAS */}
        <section className="w-full md:w-1/2 flex flex-col gap-2 overflow-y-auto h-full">
          
          {/* CETASIKAS */}
          <div className="relative bg-white rounded-xl shadow-sm p-2 flex-1">
            <div className="sticky top-0 bg-white z-10 pb-2 border-b mb-3 relative">
              <div className="absolute top-0 left-0 pointer-events-none">
                <h2 className="text-base font-bold text-slate-700">စေတသိက် (၅၂) ပါး</h2>
              </div>
              <div className="flex justify-end items-center flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <DropButton
                    label="ဇာတိ"
                    activeLabel={filter.type === 'jati' ? JATI_TYPES.find(j => j.id === filter.value)?.name : null}
                    isOpen={openMenu === 'jati'}
                    isActiveFilter={filter.type === 'jati'}
                    onToggle={() => setOpenMenu(prev => prev === 'jati' ? null : 'jati')}
                    onClear={clearFilter}
                  >
                    {jatiOptions.map(j => (
                      <button
                        key={j.id}
                        onClick={() => { toggleFilter('jati', j.id, { name: `ဇာတ် - ${j.name}စိတ်`, desc: "" }); setOpenMenu(null); }}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
                          filter.type === 'jati' && filter.value === j.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {j.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="ဝေဒနာ" activeLabel={filter.type === 'vedana' ? VEDANA_TYPES.find(v => v.id === filter.value)?.name : null} isOpen={openMenu === 'vedana'} isActiveFilter={filter.type === 'vedana'} onToggle={() => setOpenMenu(p => p === 'vedana' ? null : 'vedana')} onClear={clearFilter}>
                    {vedanaOptions.map(v => (
                      <button key={v.id} onClick={() => setFilterDirect('vedana', v.id, v)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'vedana' && filter.value === v.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {v.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="ဟေတု" activeLabel={filter.type === 'hetu' ? HETU_TYPES.find(h => h.id === filter.value)?.name : null} isOpen={openMenu === 'hetu'} isActiveFilter={filter.type === 'hetu'} onToggle={() => setOpenMenu(p => p === 'hetu' ? null : 'hetu')} onClear={clearFilter}>
                    {hetuOptions.map(h => (
                      <button key={h.id} onClick={() => setFilterDirect('hetu', h.id, h)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'hetu' && filter.value === h.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {h.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="ကိစ္စ" activeLabel={filter.type === 'kicca' ? KICCA_TYPES.find(k => k.id === filter.value)?.name : null} isOpen={openMenu === 'kicca'} isActiveFilter={filter.type === 'kicca'} onToggle={() => setOpenMenu(p => p === 'kicca' ? null : 'kicca')} onClear={clearFilter}>
                    {kiccaOptions.map(k => (
                      <button key={k.id} onClick={() => setFilterDirect('kicca', k.id, k)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'kicca' && filter.value === k.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {k.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="ဒွါရ" activeLabel={filter.type === 'dvara' ? DVARA_TYPES.find(d => d.id === filter.value)?.name : null} isOpen={openMenu === 'dvara'} isActiveFilter={filter.type === 'dvara'} onToggle={() => setOpenMenu(p => p === 'dvara' ? null : 'dvara')} onClear={clearFilter}>
                    {dvaraOptions.map(d => (
                      <button key={d.id} onClick={() => setFilterDirect('dvara', d.id, d)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'dvara' && filter.value === d.id ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {d.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="အာရမ္မဏ" activeLabel={filter.type === 'arammana' ? ARAMMANA_TYPES.find(a => a.id === filter.value)?.name : null} isOpen={openMenu === 'arammana'} isActiveFilter={filter.type === 'arammana'} onToggle={() => setOpenMenu(p => p === 'arammana' ? null : 'arammana')} onClear={clearFilter}>
                    {arammanaOptions.map(a => (
                      <button key={a.id} onClick={() => setFilterDirect('arammana', a.id, a)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'arammana' && filter.value === a.id ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {a.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="ဝတ္ထု" activeLabel={filter.type === 'vatthu' ? VATTHU_TYPES.find(v => v.id === filter.value)?.name : null} isOpen={openMenu === 'vatthu'} isActiveFilter={filter.type === 'vatthu'} onToggle={() => setOpenMenu(p => p === 'vatthu' ? null : 'vatthu')}  onClear={clearFilter}>
                    {vatthuOptions.map(v => (
                      <button key={v.id} onClick={() => setFilterDirect('vatthu', v.id, v)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'vatthu' && filter.value === v.id ? 'bg-lime-600 text-white border-lime-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {v.name}
                      </button>
                    ))}
                  </DropButton>
                </div>
              </div>
            </div>
            
            {showCetasikaBadge && (
              <div className="absolute top-16 md:top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="text-4xl md:text-5xl font-extrabold text-emerald-700 leading-none tabular-nums drop-shadow-md">
                  {toMyanmar(activeCetasikaCount)}
                </div>
              </div>
            )}
            <div className="flex flex-col">
              {CETASIKA_LAYOUT.map((group, idx) => {
                const visibleSubs = group.subGroups.filter(sub => isCetasikaSubGroupVisible(sub.id));
                if (visibleSubs.length === 0) return null;
                return (
                <MainGroupBox key={idx} title={group.title}>
                  {visibleSubs.map(sub => {
                    const items = CETASIKAS.filter(ct => ct.subGroup === sub.id);
                    const isSobhanaSadharana = sub.id === 'sobhana-sadharana';

                    const renderDot = (ct) => {
                      const isActive = isCetasikaActive(ct.id);
                      const isTargeted = (filter.type === 'cetasika' && filter.value === ct.id) || (detailPick && detailPick.type === 'cetasika' && detailPick.id === ct.id);
                      return (
                        <Dot 
                          key={`ct-${ct.id}`} item={ct} type="cetasika"
                          isActive={isTargeted}
                          isDimmed={filter.type !== 'none' && !isActive}
                          onClick={(itemDetail, rect) => selectDetail('cetasika', ct.id, itemDetail, rect)} 
                        />
                      );
                    };

                    const units = [];
                    for (let i = 0; i < items.length; i++) {
                      const ct = items[i];
                      if (YUGALA_PAIR_STARTS.has(ct.id) && items[i + 1]) {
                        units.push({ kind: 'pair', a: ct, b: items[i + 1] });
                        i++;
                      } else {
                        units.push({ kind: 'single', a: ct });
                      }
                    }

                    const renderUnit = (u) => u.kind === 'pair' ? (
                      <div key={`pair-${u.a.id}`} className="flex gap-1 md:gap-1.5 p-1 rounded-full border-2 border-dashed border-slate-300">
                        {renderDot(u.a)}
                        {renderDot(u.b)}
                      </div>
                    ) : renderDot(u.a);

                    const subActive = filter.type === 'cetasika-subgroup' && filter.value === sub.id;
                    return (
                      <SubGroupBox 
                        key={sub.id}
                        id={sub.id}
                        title={sub.title}
                        hideTitle={isSobhanaSadharana}
                        isActive={subActive}
                        onClick={(e) => handleGroupToggle('cetasika-subgroup', sub.id, sub.title, e.currentTarget.getBoundingClientRect())}
                      >
                        {isSobhanaSadharana ? (
                          <>
                            <div className="flex flex-wrap gap-1 md:gap-1.5 items-center">
                              {units.slice(0, 9).map(renderUnit)}
                            </div>
                            <div className="flex flex-row items-center gap-2">
                              <div className="flex flex-wrap gap-1 md:gap-1.5 items-center flex-1">
                                {units.slice(9).map(renderUnit)}
                              </div>
                              <div 
                                className={`text-[10px] md:text-[11px] font-semibold text-right cursor-pointer transition-colors shrink-0 w-16 md:w-24 leading-snug ${subActive ? 'text-blue-800' : 'text-slate-600 hover:text-blue-600'}`}
                                title={`${sub.title} ကို ရွေးချယ်ရန် နှိပ်ပါ`}
                              >
                                {sub.title}
                              </div>
                            </div>
                          </>
                        ) : (
                          units.map(renderUnit)
                        )}
                      </SubGroupBox>
                    );
                  })}
                </MainGroupBox>
                );
              })}
            </div>
          </div>

          {(filter.type === 'none' || rupaFilterActive || photthabbaOn || selectedKalapa || selectedSamutthana || selectedBhumiItem) && (
<div className="relative bg-white rounded-xl shadow-sm p-2 mb-2">
  {rupaFilterActive && (
    <div className="absolute top-8 md:top-9 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="text-3xl md:text-4xl font-extrabold text-amber-700 leading-none tabular-nums drop-shadow-md">
        {toMyanmar(activeRupaCategory.rupaIds.length)}
      </div>
    </div>
  )}
  <div className="flex justify-between items-center flex-wrap gap-2 mb-2 pb-1 border-b">
    <h2 className="text-base font-bold text-slate-700">ရုပ် (၂၈) ပါး</h2>
    <div className="flex flex-wrap gap-1.5 justify-end">
      <KalapaDropdown />
      <SamutthanaDropdown />
      <DropButton
        label="စိတ္တဇရုပ်"
        activeLabel={filter.type === 'cittaja-rupa' ? CITTAJA_RUPA_TYPES.find(c => c.id === filter.value)?.name : null}
        isOpen={openMenu === 'cittaja-rupa'}
        isActiveFilter={filter.type === 'cittaja-rupa'}
        onToggle={() => setOpenMenu(prev => prev === 'cittaja-rupa' ? null : 'cittaja-rupa')}
        onClear={clearFilter}
      >
        {CITTAJA_RUPA_TYPES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { toggleFilter('cittaja-rupa', cat.id, { name: cat.name, desc: "" }); setOpenMenu(null); }}
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
              filter.type === 'cittaja-rupa' && filter.value === cat.id
              ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm'
              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </DropButton>
    </div>
  </div>
  <div className="flex flex-col">
  
    <MainGroupBox title="မဟာဘုတ် (၄)">
    <div className="text-[10px] md:text-[15px] font-semibold text-slate-400 px-2 pt-1">
      နိပ္ဖန္နရုပ် (သဘာဝရုပ်,သလက္ခဏရုပ်,ရူပရုပ်,သမ္မသနရုပ်) (၁၈)
    </div>
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 items-center">
      
        {RUPAS.filter(r => r.group === 'mahabhuta').map(r => {
          const dimmed = photthabbaOn ? ![1, 2, 4].includes(r.id) : (rupaFilterActive && !isRupaActive(r.id));
          const ringClass = photthabbaOn && [1,2,4].includes(r.id) ? 'ring-4 ring-amber-400 scale-110' : '';
          return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} ringClass={ringClass} />;
        })}
      </div>
    </MainGroupBox>

    
    <MainGroupBox title="ဥပါဒါယရုပ် (၂၄)">
      <div className="flex flex-col">
        {[
          { subGroup: 'pasada', title: 'ပသာဒရုပ် (၅)' },
          { subGroup: 'gocara', title: 'ဝိသယရုပ် (၇)', withPhotthabba: true },
          { subGroup: 'bhava', title: 'ဘာဝရုပ် (၂)' },
          { subGroup: 'hadaya', title: 'ဟဒယရုပ် (၁)' },
          { subGroup: 'jivita', title: 'ဇီဝိတရုပ် (၁)' },
          { subGroup: 'ahara', title: 'အာဟာရရုပ် (၁)' },
        ].map(row => (
          <div key={row.subGroup} className="flex flex-row items-center justify-between p-1.5 md:p-2 border-b last:border-b-0 border-slate-100">
            <div className="flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center">
              {RUPAS.filter(r => r.subGroup === row.subGroup && !r.virtual).map(r => {
                const dimmed = rupaFilterActive && !isRupaActive(r.id);
                return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} />;
              })}
              {row.withPhotthabba && (() => {
                const photthabbaRef = RUPAS.find(x => x.virtual);
                return (
                  <RupaDot
                    key="r-photthabba"
                    r={{ id: 'photthabba', name: 'ဖောဋ္ဌဗ္ဗာရုံ', color: photthabbaOn ? 'bg-amber-100 border-2 border-amber-500' : 'bg-white border-2 border-dashed border-slate-400', desc: photthabbaRef ? photthabbaRef.desc : '' }}
                    dimmed={false}
                    ringClass={photthabbaOn ? 'ring-4 ring-amber-300 scale-110 text-amber-700' : 'text-slate-500'}
                    extraClickHandler={(rect) => {
                      setFilter({ type: 'none', value: null });
                      setVithiActiveIdx(null);
                      setDetailPick(null);
                      setOpenMenu(null);
                      setSelectedKalapa(null);
                      const willTurnOn = !photthabbaOn;
                      setPhotthabbaOn(prev => !prev);
                      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
                      if (willTurnOn && photthabbaRef) {
                        setActiveDetail({ name: 'ဖောဋ္ဌဗ္ဗာရုံ', desc: photthabbaRef.desc || '' });
                        setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
                        tooltipTimerRef.current = setTimeout(() => {
                          setActiveDetail({ name: "", desc: "" });
                          setTooltipPos(null);
                        }, 4000);
                      } else {
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                      }
                    }}
                  />
                );
              })()}
            </div>
            <div className="text-[10px] md:text-[11px] font-semibold text-slate-600 shrink-0 ml-2 text-right w-16 md:w-24 leading-snug">
              {row.title}
            </div>
          </div>
        ))}

        <div className="text-[10px] md:text-[15px] font-semibold text-slate-400 px-1.5 md:px-2 pt-2 border-t border-slate-100">
          အနိပ္ဖန္နရုပ် (အသဘာဝရုပ်) (၁၀)
        </div>

        {[
          { ids: [19], title: 'ပရိစ္ဆေဒရုပ် (၁)' },
          { ids: [23, 24], title: 'ဝိညတ်ရုပ် (၂)' },
          { ids: [20, 21, 22], title: 'ဝိကာရရုပ် (၃)' },
        ].map(row => (
          <div key={row.title} className="flex flex-row items-center justify-between p-1.5 md:p-2 border-b last:border-b-0 border-slate-100">
            <div className="flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center">
              {RUPAS.filter(r => row.ids.includes(r.id)).map(r => {
                const dimmed = rupaFilterActive && !isRupaActive(r.id);
                return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} />;
              })}
            </div>
            <div className="text-[10px] md:text-[11px] font-semibold text-slate-600 shrink-0 ml-2 text-right w-16 md:w-24 leading-snug">
              {row.title}
            </div>
          </div>
        ))}

        <div className="flex flex-row items-center justify-between p-1.5 md:p-2">
        
          <div className="flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center">
          <span className="text-[9px] md:text-[10px] font-semibold text-slate-500">ဇာတိရုပ်</span>
            {(() => {
              const lakkhanaItems = RUPAS.filter(r => r.subGroup === 'lakkhana');
              const renderLakkhanaDot = (r) => {
                const dimmed = rupaFilterActive && !isRupaActive(r.id);
                return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} />;
              };
              const jatiRupas = lakkhanaItems.filter(r => r.name === 'ဥပစယ' || r.name === 'သန္တတိ');
              const otherRupas = lakkhanaItems.filter(r => r.name !== 'ဥပစယ' && r.name !== 'သန္တတိ');
              return (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1 md:gap-1.5 p-1.5 rounded-full border-2 border-dashed border-slate-400">
                      {jatiRupas.map(renderLakkhanaDot)}
                    </div>
                    
                  </div>
                  {otherRupas.map(renderLakkhanaDot)}
                </>
              );
            })()}
          </div>
          <div className="text-[10px] md:text-[11px] font-semibold text-slate-600 shrink-0 ml-2 text-right w-16 md:w-24 leading-snug">
            လက္ခဏရုပ် (၄)
          </div>
        </div>
      </div>
    </MainGroupBox>
  </div>
</div>
)}

        </section>
      </main>

      {/* ဘဝတစ်ခုလုံး စိတ်အစဉ် (ဝီထိ) ပြသနိုင်သည့် floating panel — ဆွဲရွှေ့နိုင်သည်၊ အောက်က ဇယားကွက်ကို မထိခိုက်ပါ */}
      <button
        onClick={() => { if (vithiOpen) { setVithiOpen(false); clearFilter(); } else { openVithiPanel(); } }}
        className="fixed bottom-4 right-4 z-40 bg-indigo-700 hover:bg-indigo-800 text-white rounded-full w-14 h-14 shadow-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight transition-colors"
        title="ဘဝတစ်ခုလုံး စိတ်အစဉ် (ဝီထိ) ပြရန်/ဖျောက်ရန်"
      >
        <span>ဝီထိ</span>
        <span className="text-sm">{vithiOpen ? '✕' : '▶'}</span>
      </button>

      <button
        onClick={() => { if (bhumiOpen) { setBhumiOpen(false); clearFilter(); } else { setBhumiOpen(true); } }}
        className="fixed bottom-4 right-24 z-40 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full w-14 h-14 shadow-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight transition-colors"
        title="၃၁-ဘုံ ဇယား ပြရန်/ဖျောက်ရန်"
      >
        <span>၃၁ဘုံ</span>
        <span className="text-sm">{bhumiOpen ? '✕' : '▶'}</span>
      </button>

      <button
        onClick={() => { if (paticcaOpen) { setPaticcaOpen(false); clearFilter(); } else { setPaticcaOpen(true); setSelectedPaticcaId(null); } }}
        className="fixed bottom-4 right-44 z-40 bg-violet-700 hover:bg-violet-800 text-white rounded-full w-14 h-14 shadow-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight transition-colors"
        title="ပဋိစ္စသမုပ္ပါဒ် (၁၂) ဇယား ပြရန်/ဖျောက်ရန်"
      >
        <span>ပဋိစ္စ</span>
        <span className="text-sm">{paticcaOpen ? '✕' : '▶'}</span>
      </button>

      {bhumiOpen && (
        <div
          className="fixed z-40 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col"
          style={{ left: bhumiPos.x, top: bhumiPos.y, width: 240, maxWidth: '120vw', maxHeight: '185vh', resize: 'both', overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-emerald-700 text-white rounded-t-xl cursor-move select-none shrink-0"
            onMouseDown={handleBhumiDragStart}
            onTouchStart={handleBhumiDragStart}
          >
            <span className="text-sm font-bold">၃၁-ဘုံ</span>
            <button
              onClick={() => { setBhumiOpen(false); clearFilter(); }}
              className="text-white/80 hover:text-white text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
          <div className="p-4 flex flex-col gap-4 overflow-y-auto">
            {BHUMI_31.map(g => {
              const gc = BHUMI_COLOR_MAP[g.color] || BHUMI_COLOR_MAP.rose;
              const renderChip = (it) => {
                const isSelected = selectedBhumiItem && selectedBhumiItem.name === it.name;
                return (
                  <button
                    key={it.name}
                    title={it.life}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (isSelected) {
                        setFilter({ type: 'none', value: null });
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                        setSelectedBhumiItem(null);
                        return;
                      }
                      setSelectedBhumiItem(it);
                      setDetailPick(null);
                      setPhotthabbaOn(false);
                      setSelectedKalapa(null);
                      setSelectedSamutthana(null);
                      setActiveDetail({ name: it.name, desc: it.life ? `သက်တမ်း — ${it.life}` : '' });
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
                      tooltipTimerRef.current = setTimeout(() => {
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                      }, 3000);
                      setFilter({ type: 'citta-multi', value: it.cittaIds || [] });
                    }}
                    className={`text-[11px] px-2 py-1 rounded-full border cursor-pointer transition-colors ${gc.chip} ${isSelected ? 'ring-2 ring-offset-1 ring-slate-700 font-bold' : ''}`}
                  >
                    {it.name}
                  </button>
                );
              };
              return (
              <div key={g.group}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${gc.bar}`} />
                  <div className={`text-sm font-bold ${gc.title}`}>{g.name}</div>
                </div>
                {g.subgroups ? (
                  <div className="flex flex-col gap-2">
                    {g.subgroups.map(sg => {
                      const sgc = BHUMI_COLOR_MAP[sg.color] || gc;
                      return (
                        <div key={sg.name} className={`pl-2 border-l-2 ${sgc.bar.replace('bg-', 'border-')}`}>
                          <div className={`text-[11px] font-semibold mb-1 ${sgc.title}`}>{sg.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {sg.items.map(renderChip)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map(renderChip)}
                  </div>
                )}
                {g.note && <div className="text-[10px] text-slate-400 mt-1.5 leading-snug">{g.note}</div>}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {paticcaOpen && (
        <div
          className="fixed z-40 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col"
          style={{ left: paticcaPos.x, top: paticcaPos.y, width: 400, maxWidth: '95vw', maxHeight: '90vh', resize: 'both', overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-violet-700 text-white rounded-t-xl cursor-move select-none shrink-0"
            onMouseDown={handlePaticcaDragStart}
            onTouchStart={handlePaticcaDragStart}
          >
            <span className="text-sm font-bold">ပဋိစ္စသမုပ္ပါဒ် (အင်္ဂါ ၁၂ ပါး)</span>
            <button
              onClick={() => { setPaticcaOpen(false); clearFilter(); }}
              className="text-white/80 hover:text-white text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
          <div className="p-3 overflow-auto flex flex-col items-center">
            <svg viewBox="0 0 340 340" className="w-full max-w-[360px]">
              <defs>
                {PATICCA_12.map((item, i) => {
                  const angleStart = -90 + i * 30;
                  const angleEnd = -90 + (i + 1) * 30;
                  return (
                    <path
                      key={`arc-${item.id}`}
                      id={`paticca-arc-${item.id}`}
                      d={paticcaTextArcPath(170, 170, 112, angleStart, angleEnd)}
                      fill="none"
                    />
                  );
                })}
              </defs>
              {PATICCA_12.map((item, i) => {
                const angleStart = -90 + i * 30;
                const angleEnd = -90 + (i + 1) * 30;
                const isSelected = selectedPaticcaId === item.id;
                return (
                  <path
                    key={item.id}
                    d={paticcaWedgePath(170, 170, 150, 74, angleStart, angleEnd)}
                    fill={item.color}
                    stroke="#fff"
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={selectedPaticcaId && !isSelected ? 0.35 : 1}
                    className="cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (isSelected) {
                        setSelectedPaticcaId(null);
                        clearFilter();
                        return;
                      }
                      setSelectedPaticcaId(item.id);
                      setDetailPick(null);
                      setPhotthabbaOn(false);
                      setSelectedKalapa(null);
                      setSelectedSamutthana(null);
                      setSelectedBhumiItem(null);
                      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
                      setActiveDetail({ name: item.name, desc: item.desc });
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                      tooltipTimerRef.current = setTimeout(() => {
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                      }, 4000);
                      setFilter({
                        type: 'sabba-detail',
                        value: {
                          id: `paticca-${item.id}`,
                          name: item.name,
                          note: item.desc,
                          cetasikaIds: item.cetasikaIds,
                          cittaIds: item.cittaIds,
                          rupaIds: item.rupaIds,
                        },
                      });
                    }}
                  />
                );
              })}
              {PATICCA_12.map((item) => (
                <text key={`t-${item.id}`} className="pointer-events-none select-none" fill="#fff" fontSize="13" fontWeight="700" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
                  <textPath href={`#paticca-arc-${item.id}`} xlinkHref={`#paticca-arc-${item.id}`} startOffset="50%" textAnchor="middle">
                    {item.name}
                  </textPath>
                </text>
              ))}
              <circle cx="170" cy="170" r="72" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="170" y="164" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">ပဋိစ္စ-</text>
              <text x="170" y="180" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">သမုပ္ပါဒ်</text>
            </svg>
            {selectedPaticcaId && (() => {
              const item = PATICCA_12.find(x => x.id === selectedPaticcaId);
              if (!item) return null;
              return (
                <div className="mt-2 p-3 rounded-lg text-xs md:text-sm text-white w-full" style={{ backgroundColor: item.color }}>
                  <div className="font-bold mb-1">{item.name}</div>
                  <div className="leading-relaxed opacity-95">{item.desc}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {vithiOpen && (
        <div
          className="fixed z-40 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col"
          style={{ left: vithiPos.x, top: vithiPos.y, width: 1500, height: 170, minWidth: 360, minHeight: 170, maxWidth: '95vw', maxHeight: '85vh', resize: 'both', overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between px-3 py-1.5 bg-indigo-700 text-white rounded-t-xl cursor-move select-none shrink-0"
            onMouseDown={handleVithiDragStart}
            onTouchStart={handleVithiDragStart}
          >
            <span className="text-[11px] md:text-xs font-semibold truncate pr-2">{vithiClickLabel || vithiCenterGroup || '—'}</span>
            <button onClick={() => { setVithiOpen(false); clearFilter(); }} className="text-white/80 hover:text-white text-lg leading-none px-1 shrink-0">✕</button>
          </div>
          <div 
            ref={vithiScrollRef}
            onScroll={updateVithiCenterGroup}
            className="p-3 pt-2.5 overflow-x-auto overflow-y-hidden flex-1" 
            style={{ touchAction: 'pan-x' }} 
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 w-max h-full">
              {LIFE_VITHI.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-300 text-xs shrink-0">›</span>}
                  <div ref={el => { vithiItemRefs.current[idx] = el; }}>
                    <VithiDot item={item} idx={idx} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
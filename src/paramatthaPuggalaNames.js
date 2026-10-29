// English (Roman-script Pali) names for the Puggala (types of person) filter, the Cuti–Paṭisandhi filter
// and the main headings of Paramattha1App.jsx. Matched by id / Myanmar text; logic never reads these strings.

const PUGGALA_EN = {
  duggati: 'Duggati persons (37)',
  'sugati-ahetuka': 'Sugati ahetuka persons (41)',
  dvihetuka: 'Dvihetuka persons (41)',
  'tihetuka-kama': 'Tihetuka kāmāvacara persons (54)',
  rupavacara: 'Rūpāvacara persons (brahmas) (38)',
  arupavacara: 'Arūpāvacara persons (23)',
  maggattha: 'Maggaṭṭha persons (4)',
  'sota-saka-kama': 'Sotāpanna / Sakadāgāmī, kāmāvacara (50)',
  'sota-saka-rupa': 'Sotāpanna / Sakadāgāmī, rūpāvacara (34)',
  'sota-saka-arupa': 'Sotāpanna / Sakadāgāmī, arūpāvacara (19)',
  'anagami-kama': 'Anāgāmī, kāmāvacara (48)',
  'anagami-rupa': 'Anāgāmī, rūpāvacara (34)',
  'anagami-arupa': 'Anāgāmī, arūpāvacara (19)',
  'sekkha-kama': 'Sekkha, kāmāvacara (56)',
  'sekkha-rupa': 'Sekkha, rūpāvacara (40)',
  'sekkha-arupa': 'Sekkha, arūpāvacara (25)',
  'arahant-kama': 'Arahant, kāmāvacara (44)',
  'arahant-rupa': 'Arahant, rūpāvacara (30)',
  'arahant-arupa': 'Arahant, arūpāvacara (14)',
};

const SUTI_EN = {
  ahetu: ['Ahetuka', 'After an ahetuka cuti, only the 10 kāma rebirth-linkings that follow.'],
  dvihetu: ['Dvihetuka', 'After a dvihetuka cuti, only the 10 kāma rebirth-linkings that follow.'],
  tihetu: ['Tihetuka', 'After a kāma tihetuka cuti, all rebirth-linkings can follow.'],
  'remaining-rupa': ['Remaining rūpa', 'After a rūpa cuti, the 17 sahetuka rebirth-linkings (without the ahetuka) can follow.'],
  asannasatta: ['Asaññasatta', 'After an asaññasatta cuti, the 8 kāma dvihetuka and tihetuka rebirth-linkings can follow.'],
  akasa: ['Ākāsa', 'After an Ākāsānañcāyatana cuti, the arūpa rebirth-linkings of its own and higher levels (4) and the kāma tihetuka ones can follow.'],
  vinnananca: ['Viññāṇañca', 'After a Viññāṇañcāyatana cuti, the lowest Ākāsānañca is left out.'],
  akincanna: ['Ākiñcañña', 'After an Ākiñcaññāyatana cuti, the two lower arūpa rebirth-linkings are left out.'],
  nevasanna: ['Nevasaññā', 'After a Nevasaññānāsaññāyatana cuti, the three lower arūpa rebirth-linkings are left out.'],
};

export function localizePuggala(items, lang) {
  if (lang !== 'en') return items;
  return items.map((p) => (PUGGALA_EN[p.id] ? { ...p, name: PUGGALA_EN[p.id] } : p));
}
export function localizeSutiPati(items, lang) {
  if (lang !== 'en') return items;
  return items.map((p) => (SUTI_EN[p.id] ? { ...p, name: SUTI_EN[p.id][0], note: SUTI_EN[p.id][1] } : p));
}

const TEXT_EN = {
  'အဘိဓမ္မာ ပရမတ္ထတရား (၄) ပါး': 'Abhidhamma: the four Paramattha dhammas',
  'စိတ် အကျယ် (၁၂၁) ပါး': 'Cittas, expanded (121)',
  'စိတ် အကျဉ်း (၈၉) ပါး': 'Cittas, concise (89)',
  'လောကုတ္တရာ အကျယ်/အကျဉ်း ပြောင်းရန် နှိပ်ပါ': 'Tap to switch lokuttara between expanded and concise',
  'ပုဂ္ဂလစိတ်': 'Puggala',
  'စုတိ-ပဋိ': 'Cuti–Paṭisandhi',
  'လောကီစိတ် (၈၁)': 'Lokiya cittas (81)',
  'ကာမစိတ် (၅၄)': 'Kāma cittas (54)',
  'မဟဂ္ဂုတ်စိတ် (၂၇)': 'Mahaggata cittas (27)',
  'လောကုတ္တရာစိတ် အကျယ် (၄၀)': 'Lokuttara cittas, expanded (40)',
  'လောကုတ္တရာစိတ် (၈)ပါး': 'Lokuttara cittas (8)',
  'စေတသိက် (၅၂) ပါး': 'Cetasikas (52)',
};
export function headText(my, lang) {
  return lang === 'en' && TEXT_EN[my] ? TEXT_EN[my] : my;
}

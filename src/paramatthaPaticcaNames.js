// English (Roman-script Pali) names + short explanations for the 12 links of Paṭiccasamuppāda
// (PATICCA_12 in Paramattha1App.jsx), matched by id, plus the panel's inline texts.

const PATICCA_EN = {
  avijja: ['Avijjā', 'Ignorance: delusion (moha) about the eight things — the four noble truths, the past, the future, and both past and future, and dependent origination.'],
  sankhara: ['Saṅkhārā', 'Volitional formations: the 29 wholesome and unwholesome volitions of the sense, form and formless spheres — puññābhisaṅkhāra, apuññābhisaṅkhāra, āneñjābhisaṅkhāra (approximate: linked to volition).'],
  vinnana: ['Viññāṇa', 'Consciousness: the 19 rebirth-linking cittas and the 32 mundane resultant cittas that arise during life.'],
  namarupa: ['Nāmarūpa', 'Mind and matter: the cetasikas associated with mundane resultant cittas (nāma) and kamma-born rūpa (rūpa) (approximate: broadly linked).'],
  salayatana: ['Saḷāyatana', 'The six internal sense bases: the five sensitive rūpas — eye, ear, nose, tongue, body — plus the mind base (resultant cittas).'],
  phassa: ['Phassa', 'Contact: the phassa cetasika associated with the 32 mundane resultant cittas.'],
  vedana: ['Vedanā', 'Feeling: the vedanā cetasika that arises together with contact.'],
  tanha: ['Taṇhā', 'Craving: delighted craving for the six kinds of object, conditioned by feeling (the lobha cetasika).'],
  upadana: ['Upādāna', 'Clinging: strong craving (kāmupādāna) and wrong view (diṭṭhupādāna, sīlabbatupādāna, attavādupādāna).'],
  bhava: ['Bhava', 'Becoming: kamma-becoming (the 29 kammas that lead to existence) and rebirth-becoming (sense, form, formless existence) (approximate: linked to volition).'],
  jati: ['Jāti', 'Birth: the new arising of nipphanna-rūpa and the mental aggregates (approximate: broadly linked).'],
  jaramarana: ['Jarāmaraṇa', 'Ageing and death, together with sorrow, lamentation, pain, grief and despair.'],
};

const TEXT_EN = {
  'ပဋိစ္စ-': 'Paṭicca-',
  'သမုပ္ပါဒ်': 'samuppāda',
  'ပဋိစ္စ': 'Paṭicca',
  'ပဋိစ္စသမုပ္ပါဒ် (၁၂) ဇယား ပြရန်/ဖျောက်ရန်': 'Show / hide the 12 links of Paṭiccasamuppāda',
  'ပဋိစ္စသမုပ္ပါဒ် (အင်္ဂါ ၁၂ ပါး)': 'Paṭiccasamuppāda (12 links)',
};

export function localizePaticca(items, lang) {
  if (lang !== 'en') return items;
  return items.map((it) => {
    const e = PATICCA_EN[it.id];
    return e ? { ...it, name: e[0], desc: e[1] } : it;
  });
}
export function paticcaText(my, lang) {
  return lang === 'en' && TEXT_EN[my] ? TEXT_EN[my] : my;
}

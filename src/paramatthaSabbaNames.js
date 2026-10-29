// English (Roman-script Pali) names + notes for the "Sabba" filter (khandha / upādānakkhandha / āyatana /
// dhātu / sacca) of Paramattha1App.jsx. Matched by id; logic reads only the ids and id lists.

const ITEM_EN = {
  rupakkhandha: 'Rūpakkhandha', vedanakkhandha: 'Vedanākkhandha', sannakkhandha: 'Saññākkhandha',
  sankharakkhandha: 'Saṅkhārakkhandha (50)', vinnanakkhandha: 'Viññāṇakkhandha', khandhavimutta: 'Khandhavimutta',
  rupupadanakkhandha: 'Rūpupādānakkhandha', vedanupadanakkhandha: 'Vedanupādānakkhandha',
  sannupadanakkhandha: 'Saññupādānakkhandha', sankharupadanakkhandha: 'Saṅkhārupādānakkhandha',
  vinnanupadanakkhandha: 'Viññāṇupādānakkhandha', upadanakkhandhavimutta: 'Upādānakkhandhavimutta',
  cakkhayatana: 'Cakkhāyatana', sotayatana: 'Sotāyatana', ghanayatana: 'Ghānāyatana', jivhayatana: 'Jivhāyatana',
  kayayatana: 'Kāyāyatana', rupayatana: 'Rūpāyatana', saddayatana: 'Saddāyatana', gandhayatana: 'Gandhāyatana',
  rasayatana: 'Rasāyatana', photthabbayatana: 'Phoṭṭhabbāyatana', manayatana: 'Manāyatana', dhammayatana: 'Dhammāyatana',
  cakkhudhatu: 'Cakkhudhātu', sotadhatu: 'Sotadhātu', ghanadhatu: 'Ghānadhātu', jivhadhatu: 'Jivhādhātu',
  kayadhatu: 'Kāyadhātu', rupadhatu: 'Rūpadhātu', saddadhatu: 'Saddadhātu', gandhadhatu: 'Gandhadhātu',
  rasadhatu: 'Rasadhātu', photthabbadhatu: 'Phoṭṭhabbadhātu',
  cakkhuvinnanadhatu: 'Cakkhuviññāṇadhātu', sotavinnanadhatu: 'Sotaviññāṇadhātu', ghanavinnanadhatu: 'Ghānaviññāṇadhātu',
  jivhavinnanadhatu: 'Jivhāviññāṇadhātu', kayavinnanadhatu: 'Kāyaviññāṇadhātu',
  manodhatu: 'Manodhātu', manovinnanadhatu: 'Manoviññāṇadhātu', dhammadhatu: 'Dhammadhātu',
  dukkhasacca: 'Dukkhasacca', samudayasacca: 'Samudayasacca', nirodhasacca: 'Nirodhasacca',
  maggasacca: 'Maggasacca', saccavimutta: 'Saccavimutta',
};

const NOTE_EN = {
  khandhavimutta: 'Nibbāna is free from the count of the aggregates, because it has no division into the eleven kinds.',
  vedanupadanakkhandha: 'Only the 81 mundane cittas are associated here.',
  sannupadanakkhandha: 'Only the 81 mundane cittas are associated here.',
  sankharupadanakkhandha: 'Only the 81 mundane cittas are associated here.',
  vinnanupadanakkhandha: 'Only the 81 mundane cittas are included.',
  upadanakkhandhavimutta: 'The 8 lokuttara cittas, their 36 associated cetasikas and Nibbāna are free from the clinging-aggregates.',
  saccavimutta: 'The remaining 29 magga cittuppādas [= 28 cetasikas other than the eight path factors + 1 magga citta] and the 37 phala cittuppādas [= 36 cetasikas + 1 phala citta] are outside the count of the four truths.',
};

const GROUP_EN = {
  khandha: 'Khandha (5)', upadanakkhandha: 'Upādānakkhandha (5)', ayatana: 'Āyatana (12)', dhatu: 'Dhātu (18)', sacca: 'Sacca (4)',
};

export function localizeSabba(groups, lang) {
  if (lang !== 'en') return groups;
  return groups.map((g) => ({
    ...g,
    name: GROUP_EN[g.id] || g.name,
    items: g.items.map((it) => ({
      ...it,
      name: ITEM_EN[it.id] || it.name,
      note: it.note ? NOTE_EN[it.id] || it.note : it.note,
    })),
  }));
}

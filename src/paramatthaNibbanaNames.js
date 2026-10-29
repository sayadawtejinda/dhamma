// English (Roman-script Pali) names + short explanations for Nibbāna's qualities (NIBBANA_GUNA) and the
// 12 kinds of paññatti (ATTHA_PANNATTI / SADDA_PANNATTI) in Paramattha1App.jsx. Matched by id.

const GUNA_EN = {
  1: ['Accutaṁ', 'The state that never passes away or falls (no cuti).'],
  2: ['Accantaṁ', 'The state beyond the end called death (cuti).'],
  3: ['Asaṅkhataṁ', 'The state not made by the conditions kamma, citta, temperature and nutriment.'],
  4: ['Anuttaraṁ', 'The state without an equal, the most excellent.'],
  5: ['Padaṁ', 'The state that the noble ones attain.'],
};

const ATTHA_EN = {
  1: ['Saṇṭhāna-paññatti', 'Shape: what is called mountain, earth, river and so on, based on the shape in which the great elements are arranged.', 'Saṇṭhāna'],
  2: ['Samūha-paññatti', 'Collection: what is called rest-house, house, cart, chariot and so on, based on the putting together of wood, bamboo and other materials.', 'Samūha'],
  3: ['Satta-paññatti', 'Being: what is called human, deva, male, female, person and so on, based on the collection of the five aggregates.', 'Satta'],
  4: ['Disā-kālādi-paññatti', 'Direction, time and the like: east, west, morning, night and so on, based on the rising and setting of the sun and moon.', 'Disā-kāla'],
  5: ['Ākāsa-paññatti', 'Space: what is called pit, cave, hollow and so on, based on what cannot be grasped or touched.', 'Ākāsa'],
  6: ['Kasiṇanimittādi-paññatti', 'Kasiṇa sign and the like: the earth-kasiṇa sign and so on, based on the great elements that are cultivated in meditation.', 'Kasiṇa'],
};

const SADDA_EN = {
  1: ['Vijjamāna-paññatti', 'A word for something that exists in the ultimate sense, such as phassa, nāma or rūpa.', 'Vijj.'],
  2: ['Avijjamāna-paññatti', 'A word for something that does not exist in the ultimate sense, such as a mountain or the earth.', 'Avijj.'],
  3: ['Vijjamānena avijjamāna-paññatti', 'An existing thing used to indicate a non-existing one, such as "one with the six higher knowledges" (chaḷabhiñña).', 'Vijj./Avijj.'],
  4: ['Avijjamānena vijjamāna-paññatti', 'A non-existing thing used to indicate an existing one, such as "a woman’s voice" (itthisadda).', 'Avijj./Vijj.'],
  5: ['Vijjamānena vijjamāna-paññatti', 'Two existing things together, such as "eye-consciousness" (cakkhuviññāṇa).', 'Vijj./Vijj.'],
  6: ['Avijjamānena avijjamāna-paññatti', 'Two non-existing things together, such as "a king’s son" (rājaputta).', 'Avijj./Avijj.'],
};

const apply = (items, map, lang) => (lang !== 'en' ? items : items.map((it) => (map[it.id] ? { ...it, name: map[it.id][0], desc: map[it.id][1], short: map[it.id][2] } : it)));
export const localizeNibbanaGuna = (items, lang) => apply(items, GUNA_EN, lang);
export const localizeAtthaPannatti = (items, lang) => apply(items, ATTHA_EN, lang);
export const localizeSaddaPannatti = (items, lang) => apply(items, SADDA_EN, lang);

const TEXT_EN = {
  'နိဗ္ဗာန်': 'Nibbāna',
  'ပညတ်': 'Paññatti',
  'အတ္ထပညတ် (၆)': 'Attha-paññatti (6)',
  'သဒ္ဒပညတ် (၆)': 'Sadda-paññatti (6)',
};
export function nibbanaText(my, lang) {
  return lang === 'en' && TEXT_EN[my] ? TEXT_EN[my] : my;
}

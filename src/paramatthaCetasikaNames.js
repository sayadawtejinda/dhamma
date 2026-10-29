// English (Roman-script Pali) names + short explanations for the 52 cetasikas,
// and English headings for the citta / cetasika layout boxes of Paramattha1App.jsx.
// Everything is matched by id / sub-group id, so the Myanmar lists stay the source of truth
// and nothing in the app reads these strings to decide logic.

const CETASIKA_EN = {
  1: ['Phassa', 'Contact: touching the object; it joins the object and consciousness together.'],
  2: ['Vedanā', 'Feeling: experiencing the flavour of the object.'],
  3: ['Saññā', 'Perception: noting and recognising the object.'],
  4: ['Cetanā', 'Volition: urging the associated states onto the object, like a chief rower or foreman.'],
  5: ['Ekaggatā', 'One-pointedness: the mind settling steadily on a single object, keeping associated states from scattering.'],
  6: ['Jīvitindriya', 'Life faculty: sustaining and guarding the associated mental states.'],
  7: ['Manasikāra', 'Attention: turning the associated states toward the object, like a helmsman steering.'],
  8: ['Vitakka', 'Initial application: lifting the associated states onto the object; thinking.'],
  9: ['Vicāra', 'Sustained application: examining the object again and again.'],
  10: ['Adhimokkha', 'Decision: resolving on the object.'],
  11: ['Vīriya', 'Effort: striving so that the associated states arise on the object.'],
  12: ['Pīti', 'Joy: taking delight in the object.'],
  13: ['Chanda', 'Wish-to-do: wanting the object, desire to act.'],
  14: ['Moha', 'Delusion: not knowing the true nature of the object; wrong knowing.'],
  15: ['Ahirika', 'Shamelessness: no shame about bad conduct and unwholesome states.'],
  16: ['Anottappa', 'Fearlessness of wrongdoing: no dread of bad conduct and unwholesome states.'],
  17: ['Uddhacca', 'Restlessness: the mind agitated and scattered on the object.'],
  18: ['Lobha', 'Greed: grasping the object as "mine"; craving and clinging.'],
  19: ['Diṭṭhi', 'Wrong view: believing the object to be permanent, pleasant, self, beautiful.'],
  20: ['Māna', 'Conceit: the swelling of "I am"; arrogance.'],
  21: ['Dosa', 'Hatred: harshness, roughness and the wish to destroy.'],
  22: ['Issā', 'Envy: resentment at the success and honour of others.'],
  23: ['Macchariya', 'Stinginess: hiding one’s own possessions, unable to bear sharing them.'],
  24: ['Kukkucca', 'Worry: regret over wrong done and good left undone.'],
  25: ['Thina', 'Sloth: dullness and lack of vigour of the mind.'],
  26: ['Middha', 'Torpor: dullness and lack of vigour of the associated mental factors.'],
  27: ['Vicikicchā', 'Doubt: uncertainty about the eight things (Buddha, Dhamma, Saṅgha, the three trainings, past and future, dependent origination).'],
  28: ['Saddhā', 'Faith: confidence and clarity about the eight things; trusting settledness.'],
  29: ['Sati', 'Mindfulness: sinking into the wholesome object like a stone; steadiness, not forgetting.'],
  30: ['Hirī', 'Shame: moral shame about bad conduct and unwholesome states.'],
  31: ['Ottappa', 'Fear of wrongdoing: moral dread of bad conduct and unwholesome states.'],
  32: ['Alobha', 'Non-greed: no clinging to worldly objects, not grasping them as "mine".'],
  33: ['Adosa', 'Non-hatred: no harshness, no wish to destroy the object.'],
  34: ['Tatramajjhattatā', 'Equanimity: keeping the mind balanced and even toward the object.'],
  35: ['Kāyapassaddhi', 'Tranquillity of the mental body: calming of the cetasikas.'],
  36: ['Cittapassaddhi', 'Tranquillity of consciousness: calming of the citta.'],
  37: ['Kāyalahutā', 'Lightness of the mental body: quickness and buoyancy of the cetasikas.'],
  38: ['Cittalahutā', 'Lightness of consciousness.'],
  39: ['Kāyamudutā', 'Softness of the mental body: pliancy of the cetasikas.'],
  40: ['Cittamudutā', 'Softness of consciousness.'],
  41: ['Kāyakammaññatā', 'Wieldiness of the mental body: fitness for wholesome work.'],
  42: ['Cittakammaññatā', 'Wieldiness of consciousness.'],
  43: ['Kāyapāguññatā', 'Proficiency of the mental body: skill and mastery in wholesome work.'],
  44: ['Cittapāguññatā', 'Proficiency of consciousness.'],
  45: ['Kāyujukatā', 'Uprightness of the mental body: free from deceit and crookedness.'],
  46: ['Cittujukatā', 'Uprightness of consciousness.'],
  47: ['Sammāvācā', 'Right speech: abstaining from the four verbal misconducts, apart from livelihood.'],
  48: ['Sammākammanta', 'Right action: abstaining from the three bodily misconducts, apart from livelihood.'],
  49: ['Sammāājīva', 'Right livelihood: abstaining from verbal and bodily misconduct connected with earning a living.'],
  50: ['Karuṇā', 'Compassion: wishing to remove the suffering of others.'],
  51: ['Muditā', 'Sympathetic joy: rejoicing in the success of others.'],
  52: ['Paññindriya', 'Wisdom faculty: knowing things as they really are; non-delusion (amoha).'],
};

export function localizeCetasikas(items, lang) {
  if (lang !== 'en') return items;
  return items.map((c) => {
    const e = CETASIKA_EN[c.id];
    return e ? { ...c, name: e[0], desc: e[1] } : c;
  });
}

const SUB_TITLE_EN = {
  lobha: 'Lobha-mūla cittas (8)', dosa: 'Dosa-mūla cittas (2)', moha: 'Moha-mūla cittas (2)',
  'akusala-vipaka': 'Akusala-vipāka (7)', 'kusala-vipaka': 'Ahetuka kusala-vipāka (8)', 'ahetuka-kiriya': 'Ahetuka-kiriya (3)',
  'maha-kusala': 'Mahā-kusala (8)', 'maha-vipaka': 'Mahā-vipāka (8)', 'maha-kiriya': 'Mahā-kiriya (8)',
  'rupa-kusala': 'Rūpa-kusala (5)', 'rupa-vipaka': 'Rūpa-vipāka (5)', 'rupa-kiriya': 'Rūpa-kiriya (5)',
  'arupa-kusala': 'Arūpa-kusala (4)', 'arupa-vipaka': 'Arūpa-vipāka (4)', 'arupa-kiriya': 'Arūpa-kiriya (4)',
  magga: 'Magga cittas (20)', phala: 'Phala cittas (20)',
  sabba: 'Sabbacittasādhāraṇa (7)', pakinnaka: 'Pakiṇṇaka (6)',
  'moha-catukka': 'Moha-catukka (4)', 'lobha-tika': 'Lobha-tika (3)', 'dosa-catukka': 'Dosa-catukka (4)',
  'thina-middha': 'Thina-middha (2)', vicikiccha: 'Vicikicchā (1)',
  'sobhana-sadharana': 'Sobhana-sādhāraṇa (19)', virati: 'Virati (3)', appamanna: 'Appamaññā (2)', panna: 'Paññindriya (1)',
};
const CITTA_GROUP_EN = [
  'Akusala cittas (12)', 'Ahetuka cittas (18)', 'Kāma-sobhana cittas (24)',
  'Rūpāvacara cittas (15)', 'Arūpāvacara cittas (12)', 'Lokuttara cittas, expanded (40)',
];
const CETASIKA_GROUP_EN = ['Aññasamāna cetasikas (13)', 'Akusala cetasikas (14)', 'Sobhana cetasikas (25)'];

function relayout(layout, groupTitles, lang) {
  if (lang !== 'en') return layout;
  return layout.map((g, gi) => ({
    ...g,
    title: groupTitles[gi] || g.title,
    subGroups: g.subGroups.map((s) => ({ ...s, title: SUB_TITLE_EN[s.id] || s.title })),
  }));
}
export const localizeCittaLayout = (layout, lang) => relayout(layout, CITTA_GROUP_EN, lang);
export const localizeCetasikaLayout = (layout, lang) => relayout(layout, CETASIKA_GROUP_EN, lang);

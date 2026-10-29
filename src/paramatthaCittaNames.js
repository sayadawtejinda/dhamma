// English (Roman-script Pali) names for the 121 cittas of Paramattha1App.jsx.
// Per the Sayadaw's decision the Pali technical terms are not translated, only
// written in Roman script. The Myanmar CITTAS list stays the source of truth
// for ids / subGroups / colours; this file only replaces `name` and `shortName`
// (nothing in the app reads those strings to decide logic -- ids and subGroups
// do that), so the arrangement can be rebuilt per language with no risk.

const VED = { s: 'Somanassa', u: 'Upekkhā', d: 'Domanassa', k: 'Dukkha', h: 'Sukha' };
const sah = (v) => `${VED[v]}-sahagata`;

const JHANA = ['First jhāna', 'Second jhāna', 'Third jhāna', 'Fourth jhāna', 'Fifth jhāna'];
const JHANA_FACTORS = [
  'Vitakka+Vicāra+Pīti+Sukha+Ekaggatā',
  'Vicāra+Pīti+Sukha+Ekaggatā',
  'Pīti+Sukha+Ekaggatā',
  'Sukha+Ekaggatā',
  'Upekkhā+Ekaggatā',
];
const ARUPA = ['Ākāsānañcāyatana', 'Viññāṇañcāyatana', 'Ākiñcaññāyatana', 'Nevasaññānāsaññāyatana'];
const ARUPA_SHORT = ['Ākāsa', 'Viññāṇa', 'Ākiñcañ', 'Nevasaññā'];

const MAGGA = ['Sotāpatti-magga', 'Sakadāgāmi-magga', 'Anāgāmi-magga', 'Arahatta-magga'];
const PHALA = ['Sotāpatti-phala', 'Sakadāgāmi-phala', 'Anāgāmi-phala', 'Arahatta-phala'];
const MAGGA_SHORT = ['SotM', 'SakM', 'AnāM', 'ArahM'];
const PHALA_SHORT = ['SotP', 'SakP', 'AnāP', 'ArahP'];

const VIN = ['Cakkhu', 'Sota', 'Ghāna', 'Jivhā', 'Kāya'];

// index within the subGroup -> [name, shortName]
const BUILDERS = {
  lobha: (i) => [
    `${sah(i < 4 ? 's' : 'u')} ${i % 4 < 2 ? 'diṭṭhigata-sampayutta' : 'diṭṭhigata-vippayutta'} ${i % 2 === 0 ? 'asaṅkhārika' : 'sasaṅkhārika'} citta`,
    `Lo-${i + 1}`,
  ],
  dosa: (i) => [`${sah('d')} paṭigha-sampayutta ${i === 0 ? 'asaṅkhārika' : 'sasaṅkhārika'} citta`, `Do-${i + 1}`],
  moha: (i) => [i === 0 ? `${sah('u')} vicikicchā-sampayutta citta` : `${sah('u')} uddhacca-sampayutta citta`, `Mo-${i + 1}`],
  'akusala-vipaka': (i) => {
    const a = ['u', 'u', 'u', 'u', 'k', 'u', 'u'][i];
    const n = i < 5 ? `${VIN[i]}viññāṇa citta` : i === 5 ? 'Sampaṭicchana citta' : 'Santīraṇa citta';
    return [`(Akusala-vipāka) ${sah(a)} ${n}`, ['Cak', 'Sot', 'Ghā', 'Jiv', 'Kāy', 'Sam', 'San'][i]];
  },
  'kusala-vipaka': (i) => {
    const a = ['u', 'u', 'u', 'u', 'h', 'u', 's', 'u'][i];
    const n = i < 5 ? `${VIN[i]}viññāṇa citta` : i === 5 ? 'Sampaṭicchana citta' : 'Santīraṇa citta';
    return [`(Kusala-vipāka) ${sah(a)} ${n}`, ['Cak', 'Sot', 'Ghā', 'Jiv', 'Kāy', 'Sam', 'San-So', 'San-Up'][i]];
  },
  'ahetuka-kiriya': (i) => [
    `(Ahetuka-kiriya) ${[sah('u') + ' Pañcadvārāvajjana citta', sah('u') + ' Manodvārāvajjana citta', sah('s') + ' Hasituppāda citta'][i]}`,
    ['Pañca', 'Mano', 'Hasi'][i],
  ],
  'maha-kusala': (i) => mahaName('Mahā-kusala', i, 'MKu'),
  'maha-vipaka': (i) => mahaName('Mahā-vipāka', i, 'MVi'),
  'maha-kiriya': (i) => mahaName('Mahā-kiriya', i, 'MKi'),
  'rupa-kusala': (i) => rupaName('Rūpa-kusala', i, 'RKu', ' (Kusala abhiññā)'),
  'rupa-vipaka': (i) => rupaName('Rūpa-vipāka', i, 'RVi', ''),
  'rupa-kiriya': (i) => rupaName('Rūpa-kiriya', i, 'RKi', ' (Kiriya abhiññā)'),
  'arupa-kusala': (i) => [`(Arūpa-kusala) ${ARUPA[i]} citta`, `AKu-${i + 1}`],
  'arupa-vipaka': (i) => [`(Arūpa-vipāka) ${ARUPA[i]} citta`, `AVi-${i + 1}`],
  'arupa-kiriya': (i) => [`(Arūpa-kiriya) ${ARUPA[i]} citta`, `AKi-${i + 1}`],
  magga: (i) => [`${JHANA[i % 5]} ${MAGGA[Math.floor(i / 5)]} citta`, `${MAGGA_SHORT[Math.floor(i / 5)]}-${(i % 5) + 1}`],
  phala: (i) => [`${JHANA[i % 5]} ${PHALA[Math.floor(i / 5)]} citta`, `${PHALA_SHORT[Math.floor(i / 5)]}-${(i % 5) + 1}`],
};

function mahaName(group, i, short) {
  const nana = i % 4 < 2 ? 'ñāṇa-sampayutta' : 'ñāṇa-vippayutta';
  const sank = i % 2 === 0 ? 'asaṅkhārika' : 'sasaṅkhārika';
  return [`(${group}) ${sah(i < 4 ? 's' : 'u')} ${nana} ${sank} citta`, `${short}-${i + 1}`];
}

function rupaName(group, i, short, suffix) {
  return [`(${group}) ${JHANA[i]} (${JHANA_FACTORS[i]})${i === 4 ? suffix : ''}`, `${short}-${i + 1}`];
}

// Myanmar CITTAS -> same list with English names (lang 'my' returns it unchanged)
export function localizeCittas(cittas, lang) {
  if (lang !== 'en') return cittas;
  const firstId = {};
  cittas.forEach((c) => { if (firstId[c.subGroup] === undefined) firstId[c.subGroup] = c.id; });
  return cittas.map((c) => {
    const build = BUILDERS[c.subGroup];
    if (!build) return c;
    const i = c.id - firstId[c.subGroup];
    const [name, shortName] = build(i);
    const prefix = ['lobha', 'dosa', 'moha'].includes(c.subGroup)
      ? `${{ lobha: 1, dosa: 2, moha: 3 }[c.subGroup]}.${i + 1} `
      : '';
    return { ...c, name: prefix + name, shortName };
  });
}

// the 8 collapsed lokuttara cittas (ids 82/87/92/97 magga, 102/107/112/117 phala)
export function localizeLokuttara8(items, lang) {
  if (lang !== 'en') return items;
  return items.map((c, k) => {
    const j = k % 4;
    return c.subGroup === 'magga'
      ? { ...c, name: `${MAGGA[j]} citta`, shortName: MAGGA_SHORT[j] }
      : { ...c, name: `${PHALA[j]} citta`, shortName: PHALA_SHORT[j] };
  });
}

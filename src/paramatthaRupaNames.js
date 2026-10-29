// English (Roman-script Pali) names + short explanations for the 28 rūpas, the kalāpa names,
// and the English headings of the rūpa panel in Paramattha1App.jsx.
// Rūpa names/explanations are looked up by the MYANMAR NAME (not by id), so they always stay with the
// dot the student sees, whatever the id order is. Nothing in the app reads these strings for logic.

const RUPA_EN = {
  'ပထဝီ': ['Pathavī', 'Earth element: hardness/softness, roughness/smoothness, heaviness/lightness; the support (the base) of the other rūpas.'],
  'တေဇော': ['Tejo', 'Fire element: heat and cold; maturing, ripening the other rūpas.'],
  'အာပေါ': ['Āpo', 'Water element: fluidity and cohesion; binding the other rūpas together.'],
  'ဝါယော': ['Vāyo', 'Wind element: supporting and pushing; distension and movement.'],
  'စက္ခု': ['Cakkhu', 'Eye-sensitivity (pasāda-rūpa): the rūpa that makes seeing visible form possible.'],
  'သောတ': ['Sota', 'Ear-sensitivity: the rūpa that makes hearing sound possible.'],
  'ဃာန': ['Ghāna', 'Nose-sensitivity: the rūpa that makes smelling possible.'],
  'ဇိဝှာ': ['Jivhā', 'Tongue-sensitivity: the rūpa that makes tasting possible.'],
  'ကာယ': ['Kāya', 'Body-sensitivity: spread through the whole body; makes knowing touch possible.'],
  'ရူပါရုံ': ['Rūpārammaṇa', 'Visible form / colour (vaṇṇa): the object seen by the eye.'],
  'သဒ္ဒါရုံ': ['Saddārammaṇa', 'Sound: the object heard by the ear.'],
  'ဂန္ဓာရုံ': ['Gandhārammaṇa', 'Smell: the object smelt by the nose.'],
  'ရသာရုံ': ['Rasārammaṇa', 'Taste: the object tasted by the tongue.'],
  'ဣတ္ထိဘော': ['Itthibhāva', 'Femininity: the rūpa that makes one female, spread through the whole body (bhāva-rūpa).'],
  'ပုမ္ဘာဝ': ['Pumbhāva', 'Masculinity: the rūpa that makes one male, spread through the whole body (bhāva-rūpa).'],
  'ဟဒယဝတ္ထု': ['Hadayavatthu', 'Heart-base: the physical base of mind-element and mind-consciousness-element, situated in the heart.'],
  'ဇီဝိတ': ['Jīvita', 'Life faculty (rūpa-jīvitindriya): sustaining the kamma-born rūpas; spread through the whole body.'],
  'အာဟာရ': ['Āhāra', 'Nutriment (ojā): the nutritive essence in the food that is eaten.'],
  'အာကာသ': ['Ākāsa', 'Space element: the gap that separates one rūpa-kalāpa from another.'],
  'ရူပဿ လဟုတာ': ['Rūpassa lahutā', 'Lightness of matter: the buoyancy of rūpa produced by mind, temperature and nutriment (vikāra-rūpa).'],
  'ရူပဿ မုဒုတာ': ['Rūpassa mudutā', 'Softness of matter: the pliancy of such rūpa (vikāra-rūpa).'],
  'ရူပဿ ကမ္မညတာ': ['Rūpassa kammaññatā', 'Wieldiness of matter: its fitness for work (vikāra-rūpa).'],
  'ကာယဝိညတ်': ['Kāyaviññatti', 'Bodily intimation: the bodily movement by which one makes one’s intention known; produced by mind only (viññatti-rūpa).'],
  'ဝစီဝိညတ်': ['Vacīviññatti', 'Verbal intimation: the speech-sound by which one makes one’s intention known; produced by mind only (viññatti-rūpa).'],
  'ဥပစယ': ['Upacaya', 'Growth: the first arising of rūpa in a life, building up until the faculties are complete (lakkhaṇa-rūpa).'],
  'သန္တတိ': ['Santati', 'Continuity: the uninterrupted, repeated arising of rūpa after the faculties are complete (lakkhaṇa-rūpa).'],
  'ဇရတာ': ['Jaratā', 'Decay: the ripening, ageing and decaying of rūpa (the stage of presence; lakkhaṇa-rūpa).'],
  'အနိစ္စတာ': ['Aniccatā', 'Impermanence: the breaking up of rūpa (the stage of dissolution; lakkhaṇa-rūpa).'],
  // virtual dots that stand for the three great elements that are touched
  '__phot': ['Phoṭṭhabbārammaṇa', 'The tangible object: earth, fire and wind are the three great elements that can be touched, so they are called phoṭṭhabbārammaṇa. It is not a new rūpa, only a way of pointing to the great elements.'],
};

export function localizeRupas(items, lang) {
  if (lang !== 'en') return items;
  return items.map((r) => {
    const e = RUPA_EN[r.name];
    const out = e ? { ...r, name: e[0], desc: e[1] } : r;
    if (r.virtual) {
      out.name = RUPA_EN[r.name] ? RUPA_EN[r.name][0] : r.name;
      out.desc = RUPA_EN.__phot[1];
      out.groupLabel = RUPA_EN.__phot[0];
    }
    return out;
  });
}

const KALAPA_EN = {
  'cakkhu-dasaka': 'Cakkhu-dasaka kalāpa', 'sota-dasaka': 'Sota-dasaka kalāpa', 'ghana-dasaka': 'Ghāna-dasaka kalāpa',
  'jivha-dasaka': 'Jivhā-dasaka kalāpa', 'kaya-dasaka': 'Kāya-dasaka kalāpa',
  'itthibhava-dasaka': 'Itthibhāva-dasaka kalāpa', 'pumbhava-dasaka': 'Pumbhāva-dasaka kalāpa',
  'vatthu-dasaka': 'Vatthu-dasaka kalāpa', 'jivita-navaka': 'Jīvita-navaka kalāpa',
  'c-suddhatthaka': 'Suddhaṭṭhaka kalāpa', 'u-suddhatthaka': 'Suddhaṭṭhaka kalāpa', 'a-suddhatthaka': 'Suddhaṭṭhaka kalāpa',
  'kaya-vinnatti-navaka': 'Kāyaviññatti-navaka kalāpa', 'vaci-vinnatti-dasaka': 'Vacīviññatti-dasaka kalāpa',
  'lahutadi-ekadasaka-c': 'Lahutādi-ekādasaka kalāpa', 'lahutadi-ekadasaka-u': 'Lahutādi-ekādasaka kalāpa', 'lahutadi-ekadasaka-a': 'Lahutādi-ekādasaka kalāpa',
  'kaya-vinnatti-lahutadi-dvadasaka': 'Kāyaviññatti-lahutādi-dvādasaka kalāpa',
  'vaci-vinnatti-sadda-lahutadi-terasaka': 'Vacīviññatti-sadda-lahutādi-terasaka kalāpa',
  'sadda-navaka': 'Sadda-navaka kalāpa', 'sadda-lahutadi-dvadasaka': 'Sadda-lahutādi-dvādasaka kalāpa',
};
const KALAPA_GROUP_EN = {
  kammaja: 'Kammaja kalāpas (9)', cittaja: 'Cittaja kalāpas (6)', utuja: 'Utuja kalāpas (4)', aharaja: 'Āhāraja kalāpas (2)',
};

export function localizeKalapaGroups(groups, lang) {
  if (lang !== 'en') return groups;
  return groups.map((g) => ({
    ...g,
    name: KALAPA_GROUP_EN[g.id] || g.name,
    items: g.items.map((it) => ({ ...it, name: KALAPA_EN[it.id] || it.name })),
  }));
}

// Inline headings of the rūpa panel, looked up by their Myanmar text
const TEXT_EN = {
  'မဟာဘုတ် (၄)': 'Mahābhūta (4)',
  'နိပ္ဖန္နရုပ် (သဘာဝရုပ်,သလက္ခဏရုပ်,ရူပရုပ်,သမ္မသနရုပ်) (၁၈)': 'Nipphanna-rūpa (18)',
  'ဥပါဒါယရုပ် (၂၄)': 'Upādāya-rūpa (24)',
  'ပသာဒရုပ် (၅)': 'Pasāda-rūpa (5)',
  'ဝိသယရုပ် (၇)': 'Visaya-rūpa (7)',
  'ဘာဝရုပ် (၂)': 'Bhāva-rūpa (2)',
  'ဟဒယရုပ် (၁)': 'Hadaya-rūpa (1)',
  'ဇီဝိတရုပ် (၁)': 'Jīvita-rūpa (1)',
  'အာဟာရရုပ် (၁)': 'Āhāra-rūpa (1)',
  'အနိပ္ဖန္နရုပ် (အသဘာဝရုပ်) (၁၀)': 'Anipphanna-rūpa (10)',
  'ပရိစ္ဆေဒရုပ် (၁)': 'Pariccheda-rūpa (1)',
  'ဝိညတ်ရုပ် (၂)': 'Viññatti-rūpa (2)',
  'ဝိကာရရုပ် (၃)': 'Vikāra-rūpa (3)',
  'ဇာတိရုပ်': 'Jāti-rūpa',
  'လက္ခဏရုပ် (၄)': 'Lakkhaṇa-rūpa (4)',
  'ဖောဋ္ဌဗ္ဗာရုံ': 'Phoṭṭhabbārammaṇa',
};
export function rupaText(my, lang) {
  return lang === 'en' && TEXT_EN[my] ? TEXT_EN[my] : my;
}

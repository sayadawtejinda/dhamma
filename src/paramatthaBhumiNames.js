// English (Roman-script Pali) names for the 31 planes of existence (BHUMI_31 in Paramattha1App.jsx):
// plane names, group headings, lifespans and notes. Looked up by the Myanmar text, so ids / cittaIds /
// rupaIds of the Myanmar list stay the source of truth and the logic never reads these strings.

const NAME_EN = {
  'နေဝသညာနာသညာယတနဘုံ': 'Nevasaññānāsaññāyatana',
  'အာကိဉ္စညာယတနဘုံ': 'Ākiñcaññāyatana',
  'ဝိညာဏဉ္စာယတနဘုံ': 'Viññāṇañcāyatana',
  'အာကာသာနဉ္စာယတနဘုံ': 'Ākāsānañcāyatana',
  'အကနိဋ္ဌာ': 'Akaniṭṭhā', 'သုဒဿီ': 'Sudassī', 'သုဒဿာ': 'Sudassā', 'အတပ္ပါ': 'Atappā', 'အဝိဟာ': 'Avihā',
  'အသညသတ်': 'Asaññasatta', 'ဝေဟပ္ဖလာ': 'Vehapphalā',
  'သုဘကိဏှာ': 'Subhakiṇhā', 'အပ္ပမာဏသုဘာ': 'Appamāṇasubhā', 'ပရိတ္တသုဘာ': 'Parittasubhā',
  'အာဘဿရာ': 'Ābhassarā', 'အပ္ပမာဏာဘာ': 'Appamāṇābhā', 'ပရိတ္တာဘာ': 'Parittābhā',
  'မဟာဗြဟ္မာ': 'Mahābrahmā', 'ဗြဟ္မပုရောဟိတာ': 'Brahmapurohitā', 'ဗြဟ္မပါရိသဇ္ဇာ': 'Brahmapārisajjā',
  'ပရနိမ္မိတဝသဝတ္တီ (နတ်ပြည်)': 'Paranimmitavasavattī (deva realm)',
  'နိမ္မာနရတိ (နတ်ပြည်)': 'Nimmānarati (deva realm)',
  'တုသိတာ (နတ်ပြည်)': 'Tusitā (deva realm)',
  'ယာမာ (နတ်ပြည်)': 'Yāmā (deva realm)',
  'တာဝတိံသာ (နတ်ပြည်)': 'Tāvatiṃsā (deva realm)',
  'စာတုမဟာရာဇ် (နတ်ပြည်)': 'Cātummahārājika (deva realm)',
  'မနုဿဘုံ (လူ့ပြည်)': 'Manussa (human realm)',
  'တိရစ္ဆာနဘုံ': 'Tiracchāna (animals)', 'ပြိတ္တဘုံ': 'Peta (hungry ghosts)',
  'အသုရကာယဘုံ': 'Asurakāya (asuras)', 'နိရယဘုံ (ငရဲ)': 'Niraya (hell)',
  // group / subgroup headings
  'အရူပဗြဟ္မာ့ဘုံ (၄)': 'Arūpa-brahma realms (4)',
  'ရူပဗြဟ္မာ့ဘုံ (၁၆)': 'Rūpa-brahma realms (16)',
  'သုဒ္ဓါဝါသဘုံ': 'Suddhāvāsa (Pure Abodes)',
  'ပဉ္စမဈာန်ဘူမိ': 'Fifth-jhāna realms',
  'တတိယဈာန်ဘူမိ (၃)': 'Third-jhāna realms (3)',
  'ဒုတိယဈာန်ဘူမိ (၃)': 'Second-jhāna realms (3)',
  'ပဌမဈာန်ဘူမိ (၃)': 'First-jhāna realms (3)',
  'ကာမသုဂတိဘုံ': 'Kāma-sugati realms',
  'အပါယဘုံ (၄)': 'Apāya realms (4)',
  // notes
  'ဇီဝိတနဝကကလာပ်သာရှိ၊ စိတ်၊ စေတသိက် လုံးဝမရှိသော ဘုံ': 'Only jīvita-navaka kalāpas exist; no citta or cetasika at all in this realm.',
  'နိရယဘုံအတွင်း ငရဲကြီး (၈)ထပ် — သဉ္ဇီဝ၊ ကာဠသုတ္တ၊ သင်္ဃာတ၊ ရောရုဝ၊ မဟာရောရုဝ၊ တာပန၊ မဟာတာပန၊ အဝီစိ':
    'Within Niraya there are eight great hells: Sañjīva, Kāḷasutta, Saṅghāta, Roruva, Mahāroruva, Tāpana, Mahātāpana, Avīci.',
  // UI text of the panel
  '၃၁-ဘုံ': '31 Realms',
  '၃၁ဘုံ': '31 Realms',
  '၃၁-ဘုံ ဇယား ပြရန်/ဖျောက်ရန်': 'Show / hide the 31 realms chart',
};

const MM = { '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9' };
const num = (s) => s.replace(/[၀-၉]/g, (d) => MM[d]);

function lifeEn(life) {
  if (!life) return life;
  let m;
  if ((m = life.match(/^ကမ္ဘာ (.+)-ကပ်$/))) return `${num(m[1])} kappas`;
  if (life === 'အသင်္ချေယျကပ် ၁-ကပ်') return '1 asaṅkheyya-kappa';
  if ((m = life.match(/^အသင်္ချေယျကပ် ၏ (.+) ဘို့$/))) return `${num(m[1])} of an asaṅkheyya-kappa`;
  if ((m = life.match(/^နတ်သက် (.+)-နှစ် \(≈ လူ့နှစ် (.+) သန်း\)$/))) return `Divine lifespan ${num(m[1])} years (≈ ${num(m[2])} million human years)`;
  if (life === 'အသက်အပိုင်းအခြား မသေချာ (မမှန်)') return 'Lifespan not fixed (irregular)';
  if (life === 'အသက်အပိုင်းအခြား မရှိ') return 'No fixed lifespan';
  if (life === 'အသက်အပိုင်းအခြား မရှိ — မိမိကံအလိုက် အမျိုးမျိုး') return 'No fixed lifespan: varies according to one’s own kamma';
  return life;
}

export function localizeBhumi(groups, lang) {
  if (lang !== 'en') return groups;
  const item = (it) => ({ ...it, name: NAME_EN[it.name] || it.name, life: lifeEn(it.life), note: it.note ? NAME_EN[it.note] || it.note : it.note });
  return groups.map((g) => ({
    ...g,
    name: NAME_EN[g.name] || g.name,
    note: g.note ? NAME_EN[g.note] || g.note : g.note,
    items: g.items ? g.items.map(item) : g.items,
    subgroups: g.subgroups ? g.subgroups.map((sg) => ({ ...sg, name: NAME_EN[sg.name] || sg.name, items: sg.items.map(item) })) : g.subgroups,
  }));
}

export function bhumiText(my, lang) {
  return lang === 'en' && NAME_EN[my] ? NAME_EN[my] : my;
}
export const bhumiLifeLabel = (lang) => (lang === 'en' ? 'Lifespan — ' : 'သက်တမ်း — ');

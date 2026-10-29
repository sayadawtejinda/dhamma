// English (Roman-script Pali) display text for the vīthi (cognitive process) panel of Paramattha1App.jsx.
// The vīthi data is built from Myanmar strings that are also used as labels / groups; the app never compares them
// for logic, so the translation is done at display time only: vithiText(myanmarString, lang) replaces every known
// phrase in ONE pass (longest phrase first) and turns Myanmar digits into ordinary digits.

const PHRASES = {
  // sections
  'ပဋိသန္ဓေအခန်း — ဘဝသစ်စတင်ခြင်း': 'Rebirth-linking section — start of a new life',
  'ပဉ္စဒွါရဝီထိ — မြင်/ကြား/နံ/စား/ထိ': 'Pañcadvāra vīthi — seeing / hearing / smelling / tasting / touching',
  'ဘဝဆက်နေခြင်း (ဘဝင်အဆက်ဆက်)': 'Life continuing (bhavaṅga after bhavaṅga)',
  'မရဏာသန္နဝီထိ — သေခါနီးအခိုက်': 'Maraṇāsanna vīthi — at the point of dying',
  '(ပဉ္စဒွါရနှင့် မနောဒွါရကြား)': '(between pañcadvāra and manodvāra)',
  '(မနောဒွါရနှင့် သေခါနီးကြား)': '(between manodvāra and dying)',
  // pañcadvāra variants
  'အတိမဟန္တာရုံ (တဒါရုံအထိရောက်)': 'Atimahantārammaṇa (reaches tadārammaṇa)',
  'မဟန္တာရုံ (ဇောသက်သက်)': 'Mahantārammaṇa (javana only)',
  'ပရိတ္တာရုံ (ဝေါဋ္ဌဗ္ဗနဝါရ)': 'Parittārammaṇa (votthabbana round)',
  'အတိပရိတ္တာရုံ (မောဃဝါရ)': 'Atiparittārammaṇa (mogha round)',
  'အတီတဘဝင်': 'Atīta-bhavaṅga',
  '-ချက်လွန်': ' passed',
  '-ချက်': '',
  // doors
  'စက္ခုဒွါရဝီထိ': 'Cakkhudvāra vīthi', 'သောတဒွါရဝီထိ': 'Sotadvāra vīthi', 'ဃာနဒွါရဝီထိ': 'Ghānadvāra vīthi',
  'ဇိဝှါဒွါရဝီထိ': 'Jivhādvāra vīthi', 'ကာယဒွါရဝီထိ': 'Kāyadvāra vīthi',
  'စက္ခုဝိညာဏ်': 'Cakkhuviññāṇa', 'သောတဝိညာဏ်': 'Sotaviññāṇa', 'ဃာနဝိညာဏ်': 'Ghānaviññāṇa',
  'ဇိဝှါဝိညာဏ်': 'Jivhāviññāṇa', 'ကာယဝိညာဏ်': 'Kāyaviññāṇa',
  // mano-dvāra types and variants
  'မနောဒွါရဝီထိ': 'Manodvāra vīthi',
  'ကာမဇော — ထင်ရှားသောအာရုံ (ဝိဘူတအာရုံ)': 'Kāma javana — clear object (vibhūtārammaṇa)',
  'ကာမဇော — မထင်ရှားသောအာရုံ (အဝိဘူတအာရုံ)': 'Kāma javana — unclear object (avibhūtārammaṇa)',
  'အပ္ပနာဇော — ဈာန်ပထမရအခါ': 'Appanā javana — first attainment of jhāna',
  'အပ္ပနာဇော — ဈာန်နောင်ထပ်ရအခါ': 'Appanā javana — later attainments of jhāna',
  'အဘိညာဉ်ဝီထိ': 'Abhiññā vīthi', 'မဂ်ဝီထိ': 'Magga vīthi', 'ဖိုလ်ဝီထိ': 'Phala vīthi', 'နိရောဓဝီထိ': 'Nirodha vīthi',
  'အဓိဋ္ဌာနဝီထိ (ဘုရားရှင်)': 'Adhiṭṭhāna vīthi (the Buddha)',
  'တစ်မျိုးတည်း': 'single type',
  'မန္ဒပုဂ္ဂိုလ်': 'slow-witted person (manda)', 'တိက္ခပုဂ္ဂိုလ်': 'sharp-witted person (tikkha)',
  // cittas in the process
  'ဘဝင်္ဂစလန': 'Bhavaṅga-calana', 'ဘဝင်္ဂုပစ္ဆေဒ': 'Bhavaṅgupaccheda',
  'မနောဒွါရာဝဇ္ဇန်း': 'Manodvārāvajjana', 'ပဉ္စဒွါရာဝဇ္ဇန်း': 'Pañcadvārāvajjana',
  'သမ္ပဋိစ္ဆိုင်း': 'Sampaṭicchana', 'သန္တီရဏ': 'Santīraṇa', 'ဝုဋ္ဌော': 'Voṭṭho',
  'ဘဝနိကန္တိ ဇော': 'Bhavanikanti javana', 'ကြိယာဇော': 'Kiriya javana',
  'ဇော': 'Javana', 'တဒါရုံ': 'Tadārammaṇa', 'ဘဝင်': 'Bhavaṅga', 'ပဋိသန္ဓေ': 'Paṭisandhi', 'စုတိ': 'Cuti',
  'ပရိကံ': 'Parikamma', 'ဥပစာရ': 'Upacāra', 'အနုလောမ': 'Anuloma', 'ဂေါတြဘူ': 'Gotrabhū',
  'ဈာန်စိတ်': 'Jhāna citta', 'အဘိညာဉ်စိတ်': 'Abhiññā citta', 'မဂ်စိတ်': 'Magga citta', 'ဖိုလ်စိတ်': 'Phala citta',
  'နေဝသညာနာသညာယတနဈာန်': 'Nevasaññānāsaññāyatana jhāna',
  'နိရောဓ (စိတ်ချုပ်ကာလ)': 'Nirodha (cessation)',
  // UI
  'နှိပ်ပြီး ဆိုင်ရာ စိတ်/စေတသိက်များကို ကြည့်ပါ': 'Tap to see the related cittas / cetasikas',
};

const keys = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
const RE = new RegExp(keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const MM = { '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9' };

export function vithiText(s, lang) {
  if (lang !== 'en' || !s) return s;
  return s.replace(RE, (m) => PHRASES[m]).replace(/[၀-၉]/g, (d) => MM[d]);
}

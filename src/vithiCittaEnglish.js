// English (Roman-script Pali) display layer for the Vithi Citta page (VithiCitta1App.jsx).
//
// That component builds most of its labels from Myanmar strings that are ALSO used as keys in its logic
// (cetasika names, getBase("ဥပေက္ခာ ဝေဒနာ"), .includes(...) tests ...), so nothing in the component is renamed.
// Instead the English view watches the rendered DOM and swaps known Myanmar words for Roman Pali / English, in
// text nodes and in title/placeholder attributes. Anything not in the dictionary yet stays in Myanmar, so the
// translation can grow part by part (see the comments on each block below).
//
// Pali technical terms are written in Roman script and not translated; only free text gets English prose.

const MM_DIGITS = { '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9' };
const HAS_MM = /[က-႟]/;

import { DICT_PHRASES } from './vithiCittaEnglishDict.js';
import { MORE_PHRASES, MORE_WORDS, MORPHS } from './vithiCittaEnglishMore.js';

// Whole-string phrases (matched on the trimmed text of a node / attribute).
const PHRASES = {
  ...DICT_PHRASES,
  ...MORE_PHRASES,
  // tooltips and controls
  'ဤဘဝအတွက် ပုဂ္ဂိုလ်ပြောင်းလဲခွင့် ဖွင့်ထားသည်': 'Changing the person type is unlocked for this life',
  'ဤဘဝအတွက် ပုဂ္ဂိုလ်ပြောင်းလဲခွင့် ပိတ်ထားသည်': 'Changing the person type is locked for this life',
  'ပဋိစ္စသမုပ္ပါဒ် ပထမနည်း': 'Paṭiccasamuppāda, first method',
  'ပဋိစ္စသမုပ္ပါဒ် ဒုတိယနည်း': 'Paṭiccasamuppāda, second method',
  'ပဋိစ္စသမုပ္ပါဒ် တတိယနည်း': 'Paṭiccasamuppāda, third method',
  'ပဋိစ္စသမုပ္ပါဒ် စတုတ္ထနည်း': 'Paṭiccasamuppāda, fourth method',
  'ပဋိစ္စသမုပ္ပါဒ် ပဉ္စမနည်း': 'Paṭiccasamuppāda, fifth method',
  'ပုဂ္ဂိုလ်အလိုက် အလိုအလျောက် သတ်မှတ်မည်': 'Set automatically according to the person type',
  'အာရုံပြင်ဆင်ရန် ၂-ချက်နှိပ်ပါ': 'Double-click to set up the object',
  'မရဏသန္နဇောဝီထိပြောင်းရန် နှိပ်ပါ': 'Click to change the maraṇāsanna javana vīthi',
  'ခန္ဓာ (၅) ပါး': 'The five khandhas',
  'ရုပ်ကလာပ်များ ကြည့်ရန် နှိပ်ပါ': 'Click to view the rūpa kalāpas',
  'ခန္ဓာငါးပါးကို တစ်လှည့်စီ ပြပေးရန်': 'Show the five khandhas one at a time',
  'ဖိဆွဲ၍ ရွှေ့ပါ': 'Press and drag to move',
  'ပြန်စရန်': 'Restart',
  'စတင်ရန်': 'Start',
  'ရပ်မည်': 'Pause',
  'နားလည်ပါပြီ': 'Got it',
  'နောက်ဆုတ်ရန်': 'Step back',
  'ရှေ့ဆက်ရန်': 'Step forward',
  'ဥပါဒ်': 'Uppāda',
  'ဌီ': 'Ṭhiti',
  'ဘင်': 'Bhaṅga',
  // lives
  'ပထမအတိတ်ဘဝ': 'First past life',
  'ဒုတိယအတိတ်ဘဝ': 'Second past life',
  'တတိယအတိတ်ဘဝ': 'Third past life',
  'ပစ္စုပ္ပန်ဘဝ': 'Present life',
  'ပထမအနာဂတ်ဘဝ': 'First future life',
  'ဒုတိယအနာဂတ်ဘဝ': 'Second future life',
  'တတိယအနာဂတ်ဘဝ': 'Third future life',
  'ပဋိသန္ဓေ/ဘဝင်/စုတိစိတ် ၁၉-ပါး': 'The 19 paṭisandhi / bhavaṅga / cuti cittas',
  'ကံ/ကမ္မနိမိတ်/ဂတိနိမိတ်': 'Kamma / Kamma-nimitta / Gati-nimitta',
  'ပစ္စုပ္ပန်ဘဝ ကံ/ကမ္မနိမိတ်/ဂတိနိမိတ်': 'Present-life Kamma / Kamma-nimitta / Gati-nimitta',
  'ဝီထိမုတ်စိတ်': 'Vīthimutta citta',
  'ရုပ်တရား': 'Rūpa dhammas',
  'နာမ်တရားများ': 'Nāma dhammas',
  'အသိစိတ်': 'Citta (consciousness)',
  'မှီရာဝတ္ထု': 'Base (vatthu)',
};

// Single words (and a few fixed compounds). Split on spaces/brackets/slashes; a word with a hyphen that is not
// listed whole is translated part by part.
const WORDS = {
  // --- the 52 cetasikas (names as written in the app) ---
  'ဖဿ': 'Phassa', 'သောမနဿ': 'Somanassa', 'ဥပေက္ခာ': 'Upekkhā', 'ဒေါမနဿ': 'Domanassa', 'ဒုက္ခ': 'Dukkha', 'သုခ': 'Sukha',
  'ဝေဒနာ': 'Vedanā', 'သညာ': 'Saññā', 'စေတနာ': 'Cetanā', 'ဧကဂ္ဂတာ': 'Ekaggatā', 'ဇီဝိတ': 'Jīvita', 'မနသိကာရ': 'Manasikāra',
  'ဝိတက်': 'Vitakka', 'ဝိစာရ': 'Vicāra', 'အဓိမောက္ခ': 'Adhimokkha', 'ဝီရိယ': 'Vīriya', 'ပီတိ': 'Pīti', 'ဆန္ဒ': 'Chanda',
  'မောဟ': 'Moha', 'အဟိရိက': 'Ahirika', 'အနောတ္တပ္ပ': 'Anottappa', 'ဥဒ္ဓစ္စ': 'Uddhacca', 'လောဘ': 'Lobha', 'ဒိဋ္ဌိ': 'Diṭṭhi',
  'မာန': 'Māna', 'ဒေါသ': 'Dosa', 'ဣဿာ': 'Issā', 'မစ္ဆရိယ': 'Macchariya', 'ကုက္ကုစ္စ': 'Kukkucca', 'ထိန': 'Thina', 'မိဒ္ဓ': 'Middha',
  'ဝိစိကိစ္ဆာ': 'Vicikicchā', 'သဒ္ဓါ': 'Saddhā', 'သတိ': 'Sati', 'ဟိရီ': 'Hirī', 'ဩတ္တပ္ပ': 'Ottappa', 'အလောဘ': 'Alobha',
  'အဒေါသ': 'Adosa', 'တတြမဇ္ဈတ္တတာ': 'Tatramajjhattatā',
  'ကာယပဿဒ္ဓိ': 'Kāyapassaddhi', 'စိတ္တပဿဒ္ဓိ': 'Cittapassaddhi', 'ကာယလဟုတာ': 'Kāyalahutā', 'စိတ္တလဟုတာ': 'Cittalahutā',
  'ကာယမုဒုတာ': 'Kāyamudutā', 'စိတ္တမုဒုတာ': 'Cittamudutā', 'ကာယကမ္မညတာ': 'Kāyakammaññatā', 'စိတ္တကမ္မညတာ': 'Cittakammaññatā',
  'ကာယပါဂုညတာ': 'Kāyapāguññatā', 'စိတ္တပါဂုညတာ': 'Cittapāguññatā', 'ကာယုဇုကတာ': 'Kāyujukatā', 'စိတ္တုဇုကတာ': 'Cittujukatā',
  'သမ္မာဝါစာ': 'Sammāvācā', 'သမ္မာကမ္မန္တ': 'Sammākammanta', 'သမ္မာအာဇီဝ': 'Sammāājīva', 'ကရုဏာ': 'Karuṇā', 'မုဒိတာ': 'Muditā',
  'ပညာ': 'Paññā',
  // --- cetasika groups ---
  'သဗ္ဗစိတ္တ': 'Sabbacitta', 'ပကိဏ်း': 'Pakiṇṇaka', 'သောဘဏ': 'Sobhana', 'နာနာကဒါစိ': 'Nānākadāci', 'အကုသိုလ်': 'Akusala',
  'ကုသိုလ်': 'Kusala', 'ဝိပါက်': 'Vipāka', 'ကိရိယာ': 'Kiriya', 'စိတ်': 'citta', 'စေတသိက်': 'Cetasika',
  // --- citta name words ---
  'ဉာဏသမ္ပယုတ်': 'ñāṇa-sampayutta', 'ဉာဏဝိပ္ပယုတ်': 'ñāṇa-vippayutta', 'ဒိဋ္ဌိသမ္ပယုတ်': 'diṭṭhi-sampayutta',
  'ဒိဋ္ဌိဝိပ္ပယုတ်': 'diṭṭhi-vippayutta', 'ပဋိဃသမ္ပယုတ်': 'paṭigha-sampayutta', 'ဝိစိကိစ္ဆာသမ္ပယုတ်': 'vicikicchā-sampayutta',
  'ဥဒ္ဓစ္စသမ္ပယုတ်': 'uddhacca-sampayutta', 'အသင်္ခါရိက': 'asaṅkhārika', 'သသင်္ခါရိက': 'sasaṅkhārika',
  'သန္တီရဏ': 'Santīraṇa', 'အကုသလဝိပါက်': 'akusala-vipāka', 'ကုသလဝိပါက်': 'kusala-vipāka', 'ဟသိတုပ္ပါဒ်စိတ်': 'Hasituppāda citta',
  'ဟသိတုပ္ပါဒ်ဇော': 'Hasituppāda javana',
  'ပထမဈာန်': 'First jhāna', 'ဒုတိယဈာန်': 'Second jhāna', 'တတိယဈာန်': 'Third jhāna', 'စတုတ္ထဈာန်': 'Fourth jhāna', 'ပဉ္စမဈာန်': 'Fifth jhāna',
  'အာကာသာနဉ္စာယတန': 'Ākāsānañcāyatana', 'ဝိညာဏဉ္စာယတန': 'Viññāṇañcāyatana', 'အာကိဉ္စညာယတန': 'Ākiñcaññāyatana',
  'နေဝသညာနာသညာယတန': 'Nevasaññānāsaññāyatana',
  'သောတာပတ္တိမဂ်': 'Sotāpatti-magga', 'သကဒါဂါမိမဂ်': 'Sakadāgāmi-magga', 'အနာဂါမိမဂ်': 'Anāgāmi-magga', 'အရဟတ္တမဂ်': 'Arahatta-magga',
  'သောတာပတ္တိဖိုလ်': 'Sotāpatti-phala', 'သကဒါဂါမိဖိုလ်': 'Sakadāgāmi-phala', 'အနာဂါမိဖိုလ်': 'Anāgāmi-phala', 'အရဟတ္တဖိုလ်': 'Arahatta-phala',
  'အဘိညာဉ်': 'Abhiññā',
  // --- javana / vipāka groups ---
  'လောဘမူဇော': 'Lobha-mūla javana', 'ဒေါသမူဇော': 'Dosa-mūla javana', 'မောဟမူဇော': 'Moha-mūla javana',
  'မဟာကုသိုလ်ဇော': 'Mahā-kusala javana', 'မဟာကိရိယာဇော': 'Mahā-kiriya javana',
  'ရူပါဝစရ': 'Rūpāvacara', 'အရူပါဝစရ': 'Arūpāvacara', 'ကုသိုလ်ဇော': 'kusala javana', 'ကိရိယာဇော': 'kiriya javana',
  'အဟိတ်ဝိပါက်': 'Ahetuka-vipāka', 'မဟာဝိပါက်': 'Mahā-vipāka', 'ရူပါဝစရဝိပါက်': 'Rūpāvacara-vipāka', 'အရူပါဝစရဝိပါက်': 'Arūpāvacara-vipāka',
  'လောဘမူ': 'Lobha-mūla', 'ဒေါသမူ': 'Dosa-mūla', 'မောဟမူ': 'Moha-mūla',
  'ဇော': 'Javana', 'သင်္ခါရဝီထိ': 'Saṅkhāra vīthi',
  // --- process cittas ---
  'ဘဝင်္ဂစလန': 'Bhavaṅga-calana', 'ဘဝင်္ဂုပစ္ဆေဒ': 'Bhavaṅgupaccheda', 'မနောဒွါရာဝဇ္ဇန်း': 'Manodvārāvajjana',
  'ပဉ္စဒွါရာဝဇ္ဇန်း': 'Pañcadvārāvajjana', 'သမ္ပဋိစ္ဆိုင်း': 'Sampaṭicchana', 'တဒါရုံ': 'Tadārammaṇa', 'ဘဝင်': 'Bhavaṅga',
  'ပဋိသန္ဓေ': 'Paṭisandhi', 'ပဝတ္တိ': 'Pavatti', 'စုတိ': 'Cuti', 'စုတိစိတ်': 'Cuti citta', 'ဝုဋ္ဌော': 'Voṭṭho',
  'အာရုံ': 'Ārammaṇa', 'ရုပ်': 'Rūpa', 'နာမ်': 'Nāma',
  'ဟဒယဝတ္ထု': 'Hadayavatthu', 'စက္ခုဝတ္ထု': 'Cakkhuvatthu', 'သောတဝတ္ထု': 'Sotavatthu', 'ဃာနဝတ္ထု': 'Ghānavatthu',
  'ဇိဝှါဝတ္ထု': 'Jivhāvatthu', 'ကာယဝတ္ထု': 'Kāyavatthu',
  'ကမ္မဇရုပ်': 'Kammaja rūpa', 'စိတ္တဇရုပ်': 'Cittaja rūpa', 'ဥတုဇရုပ်': 'Utuja rūpa', 'အာဟာရဇရုပ်': 'Āhāraja rūpa',
  'ကလာပ်': 'kalāpa',
  // --- persons / realms ---
  'ပုဂ္ဂိုလ်': 'person', 'ပုထုဇဉ်': 'puthujjana', 'ဒုဂ္ဂတိအဟိတ်': 'Duggati-ahetuka', 'သုဂတိအဟိတ်': 'Sugati-ahetuka',
  'ဒွိဟိတ်': 'Dvihetuka', 'တိဟိတ်': 'Tihetuka', 'သောတာပန်': 'Sotāpanna', 'သကဒါဂါမ်': 'Sakadāgāmī', 'အနာဂါမ်': 'Anāgāmī',
  'ရဟန္တာ': 'Arahant', 'ဒုဂ္ဂတိဘုံသား': 'Duggati-realm beings', 'ကာမာဝစရသုဂတိဘုံသား': 'Kāmāvacara sugati-realm beings',
  'ရူပါဝစရဘုံသား': 'Rūpāvacara-realm', 'အရူပါဝစရဘုံသား': 'Arūpāvacara-realm',
  // --- vīthi types and object strength (Pavatti page) ---
  'ဝီထိအမျိုးအစား': 'Vīthi types',
  'စက္ခုဒွါရဝီထိ': 'Cakkhudvāra vīthi', 'သောတဒွါရဝီထိ': 'Sotadvāra vīthi', 'ဃာနဒွါရဝီထိ': 'Ghānadvāra vīthi',
  'ဇိဝှါဒွါရဝီထိ': 'Jivhādvāra vīthi', 'ကာယဒွါရဝီထိ': 'Kāyadvāra vīthi', 'မနောဒွါရဝီထိ': 'Manodvāra vīthi',
  'အာဒိကမ္မိကဈာနဝီထိ': 'Ādikammika jhāna vīthi', 'ဈာန်ဝင်စားခြင်း': 'Jhāna attainment', 'မဂ်ဝီထိ': 'Magga vīthi',
  'ဖိုလ်ဝီထိ': 'Phala vīthi', 'အဘိညာဉ်ဝီထိ': 'Abhiññā vīthi', 'ကာမဇော': 'Kāma javana',
  'စက္ခုဝိညာဏ်': 'Cakkhuviññāṇa', 'သောတဝိညာဏ်': 'Sotaviññāṇa', 'ဃာနဝိညာဏ်': 'Ghānaviññāṇa', 'ဇိဝှါဝိညာဏ်': 'Jivhāviññāṇa',
  'ကာယဝိညာဏ်': 'Kāyaviññāṇa', 'အတီတဘဝင်': 'Atīta-bhavaṅga',
  'အတိဣဋ္ဌာရုံ': 'Ati-iṭṭhārammaṇa', 'ဣဋ္ဌာရုံ': 'Iṭṭhārammaṇa', 'ဣဋ္ဌမဇ္ဈတ္တာရုံ': 'Iṭṭhamajjhattārammaṇa', 'အနိဋ္ဌာရုံ': 'Aniṭṭhārammaṇa',
  'အတိမဟန္တာရုံ': 'Atimahantārammaṇa', 'မဟန္တာရုံ': 'Mahantārammaṇa', 'ပရိတ္တာရုံ': 'Parittārammaṇa', 'အတိပရိတ္တာရုံ': 'Atiparittārammaṇa',
  'အတိဝိဘူတာရုံ': 'Ati-vibhūtārammaṇa', 'ဝိဘူတာရုံ': 'Vibhūtārammaṇa', 'အဝိဘူတာရုံ': 'Avibhūtārammaṇa', 'အတိအဝိဘူတာရုံ': 'Ati-avibhūtārammaṇa',
  'တဒါရမ္မဏဝါရ': 'tadārammaṇa round', 'ဇဝနဝါရ': 'javana round', 'ဝုဋ္ဌောဝါရ': 'voṭṭho round', 'မောဃဝါရ': 'mogha round',
  'ဇောမစောသောဝါရ': 'javana-not-reached round',
  'လက္ခဏာ': 'Lakkhaṇa (characteristic)', 'ရသ': 'Rasa (function)', 'ပစ္စုပဋ္ဌာန်': 'Paccupaṭṭhāna (manifestation)', 'ပဒဋ္ဌာန်': 'Padaṭṭhāna (proximate cause)',
  // --- lives, rūpa origins, nidāna, khandha ---
  'အတိတ်ဘဝ': 'Past life', 'နောင်ဘဝ': 'Next life', 'အနာဂတ်ဘဝ': 'Future life', 'မရဏာသန္န': 'Maraṇāsanna',
  'ကံကြောင့်ဖြစ်သော': 'Kamma-born', 'စိတ်ကြောင့်ဖြစ်သော': 'Citta-born', 'ဥတုကြောင့်ဖြစ်သော': 'Utu-born', 'အာဟာရကြောင့်ဖြစ်သော': 'Āhāra-born',
  'အဟိတ်ကုသလဝိပါက်': 'Ahetuka kusala-vipāka', 'အဟိတ်အကုသလဝိပါက်': 'Ahetuka akusala-vipāka', 'သောမနဿသန္တီရဏ': 'Somanassa Santīraṇa',
  'အာရုံအနုအရင့်': 'object strength', 'ပြောင်းရန်': 'to change', 'နှိပ်ပါ': 'click', 'စိတ်ကြိုက်': 'Free', 'ရွေးချယ်နိုင်သည်': 'choice is possible',
  'ကြွင်း': 'remaining', 'စေတသိက်များ': 'cetasikas',
  'အဝိဇ္ဇာပစ္စယာ': 'Avijjāpaccayā', 'သင်္ခါရာ': 'saṅkhārā', 'သင်္ခါရပစ္စယာ': 'Saṅkhārapaccayā', 'ဝိညာဏံ': 'viññāṇaṃ',
  'ဝိညာဏပစ္စယာ': 'Viññāṇapaccayā', 'နာမရူပံ': 'nāmarūpaṃ', 'နာမရူပပစ္စယာ': 'Nāmarūpapaccayā', 'သဠာယတနံ': 'saḷāyatanaṃ',
  'သဠာယတနပစ္စယာ': 'Saḷāyatanapaccayā', 'ဖဿော': 'phasso', 'ဖဿပစ္စယာ': 'Phassapaccayā', 'ဝေဒနာပစ္စယာ': 'Vedanāpaccayā',
  'တဏှာ': 'taṇhā', 'တဏှာပစ္စယာ': 'Taṇhāpaccayā', 'ဥပါဒါနံ': 'upādānaṃ', 'ဥပါဒါနပစ္စယာ': 'Upādānapaccayā', 'ဘဝေါ': 'bhavo',
  'ဘဝပစ္စယာ': 'Bhavapaccayā', 'ဇာတိ': 'jāti', 'ဇာတိပစ္စယာ': 'Jātipaccayā', 'ဇရာမရဏံ': 'jarāmaraṇaṃ', 'ဇရာမရဏံ..': 'jarāmaraṇaṃ..',
  'ရူပက္ခန္ဓာ': 'Rūpakkhandha', 'နာမ်ခန္ဓာ': 'Nāmakkhandha', 'ဝိညာဏက္ခန္ဓာ': 'Viññāṇakkhandha', 'ဝေဒနာက္ခန္ဓာ': 'Vedanākkhandha',
  'သညာက္ခန္ဓာ': 'Saññākkhandha', 'သင်္ခါရက္ခန္ဓာ': 'Saṅkhārakkhandha', 'အာယတန': 'Āyatana',
  // --- counters ---
  'မျိုး': 'kinds', 'ပါး': 'kinds',
};

Object.assign(WORDS, MORE_WORDS);
const KEYS = new Set(Object.keys(WORDS));

// Read a Pali compound written without spaces by cutting it into known building blocks (longest first).
// Returns null unless the WHOLE token can be read, so a half-known word is left in Myanmar.
const MORPH = { ...MORPHS };
for (const [k, v] of Object.entries(WORDS)) if (!MORPH[k] && /^[A-ZĀĪŪṬḌṆḶṂṄÑ][^\s-]*$/.test(v)) MORPH[k] = v.charAt(0).toLowerCase() + v.slice(1);
const MORPH_KEYS = Object.keys(MORPH).sort((a, b) => b.length - a.length);
const segCache = new Map();
function segment(t) {
  if (segCache.has(t)) return segCache.get(t);
  const memo = new Map();
  const go = (i) => {
    if (i === t.length) return [];
    if (memo.has(i)) return memo.get(i);
    let res = null;
    for (const k of MORPH_KEYS) {
      if (t.startsWith(k, i)) {
        const rest = go(i + k.length);
        if (rest) { res = [MORPH[k], ...rest]; break; }
      }
    }
    memo.set(i, res);
    return res;
  };
  const parts = go(0);
  const out = parts ? parts.join('').replace(/^./, (c) => c.toUpperCase()) : null;
  segCache.set(t, out);
  return out;
}
const DELIM = /(\s+|[()[\]/,:;+—–]|။)/;

function word(t) {
  if (WORDS[t] !== undefined) return WORDS[t];
  if (t.includes('-')) {
    const parts = t.split('-');
    if (parts.some((p) => KEYS.has(p))) return parts.map((p) => (WORDS[p] !== undefined ? WORDS[p] : p)).join('-');
  }
  if (HAS_MM.test(t) && !/^[၀-၉]+$/.test(t)) {
    const seg = segment(t);
    if (seg) return seg;
  }
  return t;
}

export function vithiEnglish(s) {
  if (!s || !HAS_MM.test(s)) return s;
  const trimmed = s.trim();
  const lead = s.slice(0, s.indexOf(trimmed));
  const trail = s.slice(lead.length + trimmed.length);
  if (PHRASES[trimmed] !== undefined) return lead + PHRASES[trimmed] + trail;
  let x = s
    .replace(/([၀-၉]+)-(မျိုး|ပါး)/g, '$1 kinds')
    .replace(/([၀-၉]+)။/g, '$1.')
    .replace(/([၀-၉]+) ဘဝမြောက် /g, 'Life no. $1: ')
    .replace(/([၀-၉]+) မျိုးသော ဝီထိများ/g, '$1 kinds of vīthis')
    .replace(/([၀-၉]+)-ဈာန်/g, '$1-jhāna');
  x = x.split(DELIM).map(word).join('');
  return x.replace(/[၀-၉]/g, (d) => MM_DIGITS[d]);
}

const ATTRS = ['title', 'placeholder', 'aria-label'];

function fixText(node) {
  const v = node.nodeValue;
  if (v && HAS_MM.test(v)) {
    const o = vithiEnglish(v);
    if (o !== v) node.nodeValue = o;
  }
}
function fixElement(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v && HAS_MM.test(v)) {
      const o = vithiEnglish(v);
      if (o !== v) el.setAttribute(a, o);
    }
  }
}
function walk(root) {
  if (root.nodeType === 3) return fixText(root);
  if (root.nodeType !== 1) return;
  fixElement(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) fixText(n); else fixElement(n);
    n = tw.nextNode();
  }
}

// Start translating everything under `root` (and anything React adds or changes later). Returns a stop function.
export function startVithiEnglish(root) {
  walk(root);
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixElement(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  mo.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return () => mo.disconnect();
}

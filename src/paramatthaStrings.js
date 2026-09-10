// Shared translation dictionary for the Paramattha (Abhidhamma citta-relations)
// app. Myanmar stays the source of truth (every key must have a "my" entry);
// "en"/"vi" are added incrementally as each part of Paramattha1App.jsx is
// migrated to use t() instead of a hardcoded Myanmar literal. A missing "en"/
// "vi" entry falls back to "my" so partially-translated screens never show
// a blank label.
//
// Per the Sayadaw's decision: Pali technical terms (citta/cetasika/dvara/
// vatthu/etc. names) stay in Pali, just written in Roman script instead of
// Myanmar script, for both English and Vietnamese -- these are not translated
// to their English/Vietnamese meanings (e.g. "ဇာတိ" -> "Jāti", not "Nature"
// or "Birth"). Only free-text explanations (desc fields, instructions) get
// real English/Vietnamese prose.

export const PARAMATTHA_STRINGS = {
  // --- Top category filter buttons ---
  cat_jati: { my: 'ဇာတိ', en: 'Jāti', vi: 'Jāti' },
  cat_akusala: { my: 'အကုသလ', en: 'Akusala', vi: 'Akusala' },
  cat_missaka: { my: 'မိဿက', en: 'Missaka', vi: 'Missaka' },
  cat_bodhipakkhiya: { my: 'ဗောဓိပက္ခိယ', en: 'Bodhipakkhiya', vi: 'Bodhipakkhiya' },
  cat_sabba: { my: 'သဗ္ဗ', en: 'Sabba', vi: 'Sabba' },

  // --- Dropdown category button labels (Vedanā/Hetu filter buttons) ---
  cat_vedana: { my: 'ဝေဒနာ', en: 'Vedanā', vi: 'Vedanā' },
  cat_hetu: { my: 'ဟေတု', en: 'Hetu', vi: 'Hetu' },

  // --- Vedanā (feeling) types ---
  vedana_somanassa: { my: 'သောမနဿ', en: 'Somanassa', vi: 'Somanassa' },
  vedana_domanassa: { my: 'ဒေါမနဿ', en: 'Domanassa', vi: 'Domanassa' },
  vedana_sukha: { my: 'သုခ', en: 'Sukha', vi: 'Sukha' },
  vedana_dukkha: { my: 'ဒုက္ခ', en: 'Dukkha', vi: 'Dukkha' },
  vedana_upekkha: { my: 'ဥပေက္ခာ', en: 'Upekkhā', vi: 'Upekkhā' },

  // --- Hetu (root) count types ---
  hetu_ahetuka: { my: 'အဟိတ်', en: 'Ahetuka', vi: 'Ahetuka' },
  hetu_ekahetuka: { my: 'ဧကဟိတ်', en: 'Ekahetuka', vi: 'Ekahetuka' },
  hetu_dvihetuka: { my: 'ဒွိဟိတ်', en: 'Dvihetuka', vi: 'Dvihetuka' },
  hetu_tihetuka: { my: 'တိဟိတ်', en: 'Tihetuka', vi: 'Tihetuka' },

  // --- Jāti (kusala/akusala/vipaka/kiriya) classification ---
  jati_akusala: { my: 'အကုသိုလ်', en: 'Akusala', vi: 'Akusala' },
  jati_kusala: { my: 'ကုသိုလ်', en: 'Kusala', vi: 'Kusala' },
  jati_vipaka: { my: 'ဝိပါက်', en: 'Vipāka', vi: 'Vipāka' },
  jati_kiriya: { my: 'ကြိယာ', en: 'Kiriya', vi: 'Kiriya' },

  // --- Dropdown category button labels (Kicca/Dvara/Arammana/Vatthu) ---
  cat_kicca: { my: 'ကိစ္စ', en: 'Kicca', vi: 'Kicca' },
  cat_dvara: { my: 'ဒွါရ', en: 'Dvāra', vi: 'Dvāra' },
  cat_arammana: { my: 'အာရမ္မဏ', en: 'Ārammaṇa', vi: 'Ārammaṇa' },
  cat_vatthu: { my: 'ဝတ္ထု', en: 'Vatthu', vi: 'Vatthu' },

  // --- Kicca (function) types (14) ---
  kicca_patisandhi: { my: 'ပဋိသန္ဓေကိစ္စ', en: 'Paṭisandhi-kicca', vi: 'Paṭisandhi-kicca' },
  kicca_bhavanga: { my: 'ဘဝင်ကိစ္စ', en: 'Bhavaṅga-kicca', vi: 'Bhavaṅga-kicca' },
  kicca_avajjana: { my: 'အာဝဇ္ဇနကိစ္စ', en: 'Āvajjana-kicca', vi: 'Āvajjana-kicca' },
  kicca_dassana: { my: 'ဒဿနကိစ္စ', en: 'Dassana-kicca', vi: 'Dassana-kicca' },
  kicca_savana: { my: 'သဝနကိစ္စ', en: 'Savana-kicca', vi: 'Savana-kicca' },
  kicca_ghayana: { my: 'ဃာယနကိစ္စ', en: 'Ghāyana-kicca', vi: 'Ghāyana-kicca' },
  kicca_sayana: { my: 'သာယနကိစ္စ', en: 'Sāyana-kicca', vi: 'Sāyana-kicca' },
  kicca_phusana: { my: 'ဖုသနကိစ္စ', en: 'Phusana-kicca', vi: 'Phusana-kicca' },
  kicca_sampaticchana: { my: 'သမ္ပဋိစ္ဆနကိစ္စ', en: 'Sampaṭicchana-kicca', vi: 'Sampaṭicchana-kicca' },
  kicca_santirana: { my: 'သန္တီရဏကိစ္စ', en: 'Santīraṇa-kicca', vi: 'Santīraṇa-kicca' },
  kicca_votthabbana: { my: 'ဝေါဋ္ဌဗ္ဗနကိစ္စ', en: 'Voṭṭhabbana-kicca', vi: 'Voṭṭhabbana-kicca' },
  kicca_javana: { my: 'ဇဝနကိစ္စ', en: 'Javana-kicca', vi: 'Javana-kicca' },
  kicca_tadarammana: { my: 'တဒါရမ္မဏကိစ္စ', en: 'Tadārammaṇa-kicca', vi: 'Tadārammaṇa-kicca' },
  kicca_cuti: { my: 'စုတိကိစ္စ', en: 'Cuti-kicca', vi: 'Cuti-kicca' },

  // --- Dvāra (door) types (6 + dvāra-vimutta) ---
  dvara_cakkhu: { my: 'စက္ခုဒွါရ', en: 'Cakkhu-dvāra', vi: 'Cakkhu-dvāra' },
  dvara_sota: { my: 'သောတဒွါရ', en: 'Sota-dvāra', vi: 'Sota-dvāra' },
  dvara_ghana: { my: 'ဃာနဒွါရ', en: 'Ghāna-dvāra', vi: 'Ghāna-dvāra' },
  dvara_jivha: { my: 'ဇိဝှါဒွါရ', en: 'Jivhā-dvāra', vi: 'Jivhā-dvāra' },
  dvara_kaya: { my: 'ကာယဒွါရ', en: 'Kāya-dvāra', vi: 'Kāya-dvāra' },
  dvara_mano: { my: 'မနောဒွါရ', en: 'Mano-dvāra', vi: 'Mano-dvāra' },
  dvara_vimutta: { my: 'ဒွါရဝိမုတ်', en: 'Dvāra-vimutta', vi: 'Dvāra-vimutta' },

  // --- Ārammaṇa (object) types (11) ---
  arammana_present_rupa: { my: 'ပစ္စုပ္ပန်ရူပါရုံ', en: 'Paccuppanna-rūpārammaṇa', vi: 'Paccuppanna-rūpārammaṇa' },
  arammana_present_sadda: { my: 'ပစ္စုပ္ပန်သဒ္ဒါရုံ', en: 'Paccuppanna-saddārammaṇa', vi: 'Paccuppanna-saddārammaṇa' },
  arammana_present_gandha: { my: 'ပစ္စုပ္ပန်ဂန္ဓာရုံ', en: 'Paccuppanna-gandhārammaṇa', vi: 'Paccuppanna-gandhārammaṇa' },
  arammana_present_rasa: { my: 'ပစ္စုပ္ပန်ရသာရုံ', en: 'Paccuppanna-rasārammaṇa', vi: 'Paccuppanna-rasārammaṇa' },
  arammana_present_photthabba: { my: 'ပစ္စုပ္ပန်ဖောဋ္ဌဗ္ဗာရုံ', en: 'Paccuppanna-phoṭṭhabbārammaṇa', vi: 'Paccuppanna-phoṭṭhabbārammaṇa' },
  arammana_kama: { my: 'ကာမအာရုံ', en: 'Kāmārammaṇa', vi: 'Kāmārammaṇa' },
  arammana_mahaggata: { my: 'မဟဂ္ဂုတ်အာရုံ', en: 'Mahaggatārammaṇa', vi: 'Mahaggatārammaṇa' },
  // Not a single Pali compound in the source either -- "the 3 lower Magga+Phala [attainments] as object" written as a Myanmar descriptive gloss. Kept semi-literal; flag for a Pali-literate review pass.
  arammana_lower_phala: { my: 'အောက်မဂ်ဖိုလ်သုံးစုံအာရုံ', en: 'Lower 3 Magga-Phala ārammaṇa', vi: 'Lower 3 Magga-Phala ārammaṇa' },
  arammana_lokuttara_citta: { my: 'လောကုတ္တရာအာရုံ', en: 'Lokuttara-ārammaṇa', vi: 'Lokuttara-ārammaṇa' },
  arammana_pannatti: { my: 'ပညတ်အာရုံ', en: 'Paññatti-ārammaṇa', vi: 'Paññatti-ārammaṇa' },
  arammana_nibbana: { my: 'နိဗ္ဗာန်အာရုံ', en: 'Nibbānārammaṇa', vi: 'Nibbānārammaṇa' },

  // --- Vatthu (physical base) types (6 + hadaya split "always"/"sometimes" + vatthu-vimutta) ---
  vatthu_cakkhu: { my: 'စက္ခုဝတ္ထု', en: 'Cakkhu-vatthu', vi: 'Cakkhu-vatthu' },
  vatthu_sota: { my: 'သောတဝတ္ထု', en: 'Sota-vatthu', vi: 'Sota-vatthu' },
  vatthu_ghana: { my: 'ဃာနဝတ္ထု', en: 'Ghāna-vatthu', vi: 'Ghāna-vatthu' },
  vatthu_jivha: { my: 'ဇိဝှါဝတ္ထု', en: 'Jivhā-vatthu', vi: 'Jivhā-vatthu' },
  vatthu_kaya: { my: 'ကာယဝတ္ထု', en: 'Kāya-vatthu', vi: 'Kāya-vatthu' },
  vatthu_hadaya_always: { my: 'ဟဒယဝတ္ထု (အမြဲ)', en: 'Hadaya-vatthu (always)', vi: 'Hadaya-vatthu (luôn luôn)' },
  vatthu_hadaya_sometimes: { my: 'ဟဒယဝတ္ထု (ရံခါ)', en: 'Hadaya-vatthu (sometimes)', vi: 'Hadaya-vatthu (đôi khi)' },
  vatthu_vimutta: { my: 'ဝတ္ထုဝိမုတ်', en: 'Vatthu-vimutta', vi: 'Vatthu-vimutta' },
};

// lang: 'my' | 'en' | 'vi'. Falls back to Myanmar (then the raw key) so an
// unmigrated string never renders blank.
export function t(key, lang) {
  const entry = PARAMATTHA_STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.my || key;
}

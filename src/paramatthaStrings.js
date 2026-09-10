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
};

// lang: 'my' | 'en' | 'vi'. Falls back to Myanmar (then the raw key) so an
// unmigrated string never renders blank.
export function t(key, lang) {
  const entry = PARAMATTHA_STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.my || key;
}

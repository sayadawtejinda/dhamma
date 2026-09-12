import React, { useState, useRef, useEffect } from 'react';

// --- Data Definitions ---

function toMyanmar(num) {
  return String(num);
}

const CITTAS = [
  // Bất Thiện (12)
  ...[
    "Tâm Tham thọ Hỷ, tương ưng Kiến, vô trợ", "Tâm Tham thọ Hỷ, tương ưng Kiến, hữu trợ", "Tâm Tham thọ Hỷ, bất tương ưng Kiến, vô trợ", "Tâm Tham thọ Hỷ, bất tương ưng Kiến, hữu trợ", 
    "Tâm Tham thọ Xả, tương ưng Kiến, vô trợ", "Tâm Tham thọ Xả, tương ưng Kiến, hữu trợ", "Tâm Tham thọ Xả, bất tương ưng Kiến, vô trợ", "Tâm Tham thọ Xả, bất tương ưng Kiến, hữu trợ"
  ].map((name, i) => ({ id: i + 1, name: `1.${i+1} ${name}`, shortName: `Tham-${i+1}`, subGroup: 'lobha', type: 'akusala', color: 'bg-red-500' })),
  ...[
    "Tâm Sân thọ Ưu, tương ưng Phẫn, vô trợ", "Tâm Sân thọ Ưu, tương ưng Phẫn, hữu trợ"
  ].map((name, i) => ({ id: i + 9, name: `2.${i+1} ${name}`, shortName: `Sân-${i+1}`, subGroup: 'dosa', type: 'akusala', color: 'bg-rose-700' })),
  ...[
    "Tâm Si thọ Xả, tương ưng Nghi", "Tâm Si thọ Xả, tương ưng Phóng dật"
  ].map((name, i) => ({ id: i + 11, name: `3.${i+1} ${name}`, shortName: `Si-${i+1}`, subGroup: 'moha', type: 'akusala', color: 'bg-orange-500' })),
  
  // Vô Nhân (18)
  ...[
    "Nhãn thức thọ Xả (Quả Bất Thiện)", "Nhĩ thức thọ Xả (Quả Bất Thiện)", "Tỷ thức thọ Xả (Quả Bất Thiện)", "Thiệt thức thọ Xả (Quả Bất Thiện)",
    "Thân thức thọ Khổ (Quả Bất Thiện)", "Tâm Tiếp thọ thọ Xả (Quả Bất Thiện)", "Tâm Quan sát thọ Xả (Quả Bất Thiện)"
  ].map((name, i) => ({ id: i + 13, name: `${name}`, shortName: ["Nhãn", "Nhĩ", "Tỷ", "Thiệt", "Thân", "Tiếp", "Thấu"][i], subGroup: 'akusala-vipaka', type: 'vipaka', color: 'bg-stone-500' })),
  ...[
    "Nhãn thức thọ Xả (Quả Thiện)", "Nhĩ thức thọ Xả (Quả Thiện)", "Tỷ thức thọ Xả (Quả Thiện)", "Thiệt thức thọ Xả (Quả Thiện)",
    "Thân thức thọ Lạc (Quả Thiện)", "Tâm Tiếp thọ thọ Xả (Quả Thiện)", "Tâm Quan sát thọ Hỷ (Quả Thiện)", "Tâm Quan sát thọ Xả (Quả Thiện)"
  ].map((name, i) => ({ id: i + 20, name: `${name}`, shortName: ["Nhãn", "Nhĩ", "Tỷ", "Thiệt", "Thân", "Tiếp", "Thấu-Hỷ", "Thấu-Xả"][i], subGroup: 'kusala-vipaka', type: 'vipaka', color: 'bg-stone-400' })),
  ...[
    "Tâm Hướng ngũ môn thọ Xả", "Tâm Hướng ý môn thọ Xả", "Tâm Tiếu sinh thọ Hỷ"
  ].map((name, i) => ({ id: i + 28, name: `(Duy tác Vô nhân) ${name}`, shortName: ["Ngũ môn", "Ý môn", "Tiếu sinh"][i], subGroup: 'ahetuka-kiriya', type: 'kiriya', color: 'bg-stone-300' })),

  // Dục Giới Tịnh Hảo (24)
  ...[
    "Tâm Đại Thiện thọ Hỷ, tương ưng Trí, vô trợ", "Tâm Đại Thiện thọ Hỷ, tương ưng Trí, hữu trợ", "Tâm Đại Thiện thọ Hỷ, bất tương ưng Trí, vô trợ", "Tâm Đại Thiện thọ Hỷ, bất tương ưng Trí, hữu trợ",
    "Tâm Đại Thiện thọ Xả, tương ưng Trí, vô trợ", "Tâm Đại Thiện thọ Xả, tương ưng Trí, hữu trợ", "Tâm Đại Thiện thọ Xả, bất tương ưng Trí, vô trợ", "Tâm Đại Thiện thọ Xả, bất tương ưng Trí, hữu trợ"
  ].map((name, i) => ({ id: i + 31, name: `${name}`, shortName: `Đ.Thiện-${i+1}`, subGroup: 'maha-kusala', type: 'kusala', color: 'bg-emerald-500' })),
  ...[
    "Tâm Đại Quả thọ Hỷ, tương ưng Trí, vô trợ", "Tâm Đại Quả thọ Hỷ, tương ưng Trí, hữu trợ", "Tâm Đại Quả thọ Hỷ, bất tương ưng Trí, vô trợ", "Tâm Đại Quả thọ Hỷ, bất tương ưng Trí, hữu trợ",
    "Tâm Đại Quả thọ Xả, tương ưng Trí, vô trợ", "Tâm Đại Quả thọ Xả, tương ưng Trí, hữu trợ", "Tâm Đại Quả thọ Xả, bất tương ưng Trí, vô trợ", "Tâm Đại Quả thọ Xả, bất tương ưng Trí, hữu trợ"
  ].map((name, i) => ({ id: i + 39, name: `${name}`, shortName: `Đ.Quả-${i+1}`, subGroup: 'maha-vipaka', type: 'vipaka', color: 'bg-emerald-400' })),
  ...[
    "Tâm Đại Duy Tác thọ Hỷ, tương ưng Trí, vô trợ", "Tâm Đại Duy Tác thọ Hỷ, tương ưng Trí, hữu trợ", "Tâm Đại Duy Tác thọ Hỷ, bất tương ưng Trí, vô trợ", "Tâm Đại Duy Tác thọ Hỷ, bất tương ưng Trí, hữu trợ",
    "Tâm Đại Duy Tác thọ Xả, tương ưng Trí, vô trợ", "Tâm Đại Duy Tác thọ Xả, tương ưng Trí, hữu trợ", "Tâm Đại Duy Tác thọ Xả, bất tương ưng Trí, vô trợ", "Tâm Đại Duy Tác thọ Xả, bất tương ưng Trí, hữu trợ"
  ].map((name, i) => ({ id: i + 47, name: `${name}`, shortName: `Đ.Duy Tác-${i+1}`, subGroup: 'maha-kiriya', type: 'kiriya', color: 'bg-emerald-300' })),

  // Sắc Giới (15)
  ...[
    "Tâm Sơ Thiền Sắc Giới", "Tâm Nhị Thiền Sắc Giới", "Tâm Tam Thiền Sắc Giới", "Tâm Tứ Thiền Sắc Giới", "Tâm Ngũ Thiền Sắc Giới"
  ].map((name, i) => ({ id: i + 55, name: `(Thiện Sắc Giới) ${name}`, shortName: `S.Thiện-${i+1}`, subGroup: 'rupa-kusala', type: 'kusala', color: 'bg-blue-500' })),
  ...[
    "Tâm Sơ Thiền Sắc Giới", "Tâm Nhị Thiền Sắc Giới", "Tâm Tam Thiền Sắc Giới", "Tâm Tứ Thiền Sắc Giới", "Tâm Ngũ Thiền Sắc Giới"
  ].map((name, i) => ({ id: i + 60, name: `(Quả Sắc Giới) ${name}`, shortName: `S.Quả-${i+1}`, subGroup: 'rupa-vipaka', type: 'vipaka', color: 'bg-blue-400' })),
  ...[
    "Tâm Sơ Thiền Sắc Giới", "Tâm Nhị Thiền Sắc Giới", "Tâm Tam Thiền Sắc Giới", "Tâm Tứ Thiền Sắc Giới", "Tâm Ngũ Thiền Sắc Giới"
  ].map((name, i) => ({ id: i + 65, name: `(Duy Tác Sắc Giới) ${name}`, shortName: `S.Duy Tác-${i+1}`, subGroup: 'rupa-kiriya', type: 'kiriya', color: 'bg-blue-300' })),

  // Vô Sắc Giới (12)
  ...[
    "Tâm Không Vô Biên Xứ Thiện", "Tâm Thức Vô Biên Xứ Thiện", "Tâm Vô Sở Hữu Xứ Thiện", "Tâm Phi Tưởng Phi Phi Tưởng Xứ Thiện"
  ].map((name, i) => ({ id: i + 70, name: `${name}`, shortName: `VS.Thiện-${i+1}`, subGroup: 'arupa-kusala', type: 'kusala', color: 'bg-indigo-500' })),
  ...[
    "Tâm Không Vô Biên Xứ Quả", "Tâm Thức Vô Biên Xứ Quả", "Tâm Vô Sở Hữu Xứ Quả", "Tâm Phi Tưởng Phi Phi Tưởng Xứ Quả"
  ].map((name, i) => ({ id: i + 74, name: `${name}`, shortName: `VS.Quả-${i+1}`, subGroup: 'arupa-vipaka', type: 'vipaka', color: 'bg-indigo-400' })),
  ...[
    "Tâm Không Vô Biên Xứ Duy Tác", "Tâm Thức Vô Biên Xứ Duy Tác", "Tâm Vô Sở Hữu Xứ Duy Tác", "Tâm Phi Tưởng Phi Phi Tưởng Xứ Duy Tác"
  ].map((name, i) => ({ id: i + 78, name: `${name}`, shortName: `VS.Duy Tác-${i+1}`, subGroup: 'arupa-kiriya', type: 'kiriya', color: 'bg-indigo-300' })),

  // Siêu Thế (40)
  ...Array.from({length: 20}, (_, i) => {
    const jhanas = ["Sơ Thiền", "Nhị Thiền", "Tam Thiền", "Tứ Thiền", "Ngũ Thiền"];
    const maggas = ["Sơ Quả Đạo", "Tư Đà Hàm Đạo", "A Na Hàm Đạo", "A La Hán Đạo"];
    const shortMaggas = ["Sơ Đạo", "Tư Đạo", "A Đạo", "La Đạo"];
    return { id: i + 82, name: `Tâm ${maggas[Math.floor(i / 5)]} ${jhanas[i % 5]}`, shortName: `${shortMaggas[Math.floor(i / 5)]}-${(i%5)+1}`, subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' };
  }),
  ...Array.from({length: 20}, (_, i) => {
    const jhanas = ["Sơ Thiền", "Nhị Thiền", "Tam Thiền", "Tứ Thiền", "Ngũ Thiền"];
    const phalas = ["Sơ Quả Quả", "Tư Đà Hàm Quả", "A Na Hàm Quả", "A La Hán Quả"];
    const shortPhalas = ["Sơ Quả", "Tư Quả", "A Quả", "La Quả"];
    return { id: i + 102, name: `Tâm ${phalas[Math.floor(i / 5)]} ${jhanas[i % 5]}`, shortName: `${shortPhalas[Math.floor(i / 5)]}-${(i%5)+1}`, subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' };
  })
];

const LOKUTTARA_8 = [
  { id: 82, name: "Tâm Sơ Đạo (Sơ Quả)", shortName: "Sơ Đạo", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 87, name: "Tâm Tư Đà Hàm Đạo", shortName: "Tư Đạo", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 92, name: "Tâm A Na Hàm Đạo", shortName: "A Đạo", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 97, name: "Tâm A La Hán Đạo", shortName: "La Đạo", subGroup: 'magga', type: 'kusala', color: 'bg-purple-600' },
  { id: 102, name: "Tâm Sơ Quả (Tu Đà Hoàn)", shortName: "Sơ Quả", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
  { id: 107, name: "Tâm Tư Đà Hàm Quả", shortName: "Tư Quả", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
  { id: 112, name: "Tâm A Na Hàm Quả", shortName: "A Quả", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
  { id: 117, name: "Tâm A La Hán Quả", shortName: "La Quả", subGroup: 'phala', type: 'vipaka', color: 'bg-purple-400' },
];

const YUGALA_PAIR_STARTS = new Set([35, 37, 39, 41, 43, 45]);

const VEDANA_TYPES = [
  { id: 'somanassa', name: 'Hỷ' },
  { id: 'domanassa', name: 'Ưu' },
  { id: 'sukha', name: 'Lạc' },
  { id: 'dukkha', name: 'Khổ' },
  { id: 'upekkha', name: 'Xả' },
];

const HETU_TYPES = [
  { id: 0, name: 'Vô Nhân' },
  { id: 1, name: 'Nhất Nhân' },
  { id: 2, name: 'Nhị Nhân' },
  { id: 3, name: 'Tam Nhân' },
];

function getHetuCount(id) {
  if (id <= 8) return 2;
  if (id === 9 || id === 10) return 2;
  if (id === 11 || id === 12) return 1;
  if (id >= 13 && id <= 30) return 0;
  if (id >= 31 && id <= 54) {
    const start = id <= 38 ? 31 : (id <= 46 ? 39 : 47);
    const offset = (id - start) % 8;
    return [2, 3, 6, 7].includes(offset) ? 2 : 3;
  }
  return 3;
}

const KICCA_TYPES = [
  { id: 1, name: 'Tái sanh (Paṭisandhi)' },
  { id: 2, name: 'Hộ kiếp (Bhavaṅga)' },
  { id: 3, name: 'Hướng tâm (Āvajjana)' },
  { id: 4, name: 'Thấy (Dassana)' },
  { id: 5, name: 'Nghe (Savana)' },
  { id: 6, name: 'Ngửi (Ghāyana)' },
  { id: 7, name: 'Nếm (Sāyana)' },
  { id: 8, name: 'Xúc (Phusana)' },
  { id: 9, name: 'Tiếp thọ (Sampaṭicchana)' },
  { id: 10, name: 'Thấu suốt/Quan sát (Santīraṇa)' },
  { id: 11, name: 'Xác định (Votthapana)' },
  { id: 12, name: 'Đổng lực (Javana)' },
  { id: 13, name: 'Thượng dư (Tadārammaṇa)' },
  { id: 14, name: 'Tử tâm (Cuti)' },
];

function getCittaKiccas(id) {
  if (id <= 12) return [12];
  if (id === 30) return [12];
  if (id === 28) return [3];
  if (id === 29) return [3, 11];
  if (id === 13 || id === 20) return [4];
  if (id === 14 || id === 21) return [5];
  if (id === 15 || id === 22) return [6];
  if (id === 16 || id === 23) return [7];
  if (id === 17 || id === 24) return [8];
  if (id === 18 || id === 25) return [9];
  if (id === 19 || id === 27) return [1, 2, 10, 13, 14];
  if (id === 26) return [10, 13];
  if (id >= 31 && id <= 38) return [12];
  if (id >= 39 && id <= 46) return [1, 2, 13, 14];
  if (id >= 47 && id <= 54) return [12];
  if (id >= 55 && id <= 59) return [12];
  if (id >= 60 && id <= 64) return [1, 2, 14];
  if (id >= 65 && id <= 69) return [12];
  if (id >= 70 && id <= 73) return [12];
  if (id >= 74 && id <= 77) return [1, 2, 14];
  if (id >= 78 && id <= 81) return [12];
  if (id >= 82) return [12];
  return [];
}

const DVARA_TYPES = [
  { id: 1, name: 'Nhãn môn' },
  { id: 2, name: 'Nhĩ môn' },
  { id: 3, name: 'Tỷ môn' },
  { id: 4, name: 'Thiệt môn' },
  { id: 5, name: 'Thân môn' },
  { id: 6, name: 'Ý môn' },
  { id: 0, name: 'Ngoại môn (Đoạn môn)' },
];

function getCittaDvaras(id) {
  if (id === 13 || id === 20) return [1];
  if (id === 14 || id === 21) return [2];
  if (id === 15 || id === 22) return [3];
  if (id === 16 || id === 23) return [4];
  if (id === 17 || id === 24) return [5];
  if (id === 28) return [1, 2, 3, 4, 5];
  if (id === 18 || id === 25) return [1, 2, 3, 4, 5];
  if (id === 19 || id === 27) return [1, 2, 3, 4, 5, 6, 0];
  if (id === 26) return [1, 2, 3, 4, 5, 6];
  if (id === 29) return [1, 2, 3, 4, 5, 6];
  if (id === 30) return [1, 2, 3, 4, 5, 6];
  if (id <= 12) return [1, 2, 3, 4, 5, 6];
  if (id >= 31 && id <= 38) return [1, 2, 3, 4, 5, 6];
  if (id >= 47 && id <= 54) return [1, 2, 3, 4, 5, 6];
  if (id >= 39 && id <= 46) return [1, 2, 3, 4, 5, 6, 0];
  if (id >= 55 && id <= 59) return [6];
  if (id >= 65 && id <= 69) return [6];
  if (id >= 60 && id <= 64) return [0];
  if (id >= 70 && id <= 73) return [6];
  if (id >= 78 && id <= 81) return [6];
  if (id >= 74 && id <= 77) return [0];
  if (id >= 82) return [6];
  return [];
}

// Phân loại Cảnh (Cảnh Dục giới, Đáo đại, Chế định, Niết-bàn)
const ARAMMANA_TYPES = [
  { id: 'present-rupa', name: 'Cảnh Sắc hiện tại' },
  { id: 'present-sadda', name: 'Cảnh Thinh hiện tại' },
  { id: 'present-gandha', name: 'Cảnh Khí hiện tại' },
  { id: 'present-rasa', name: 'Cảnh Vị hiện tại' },
  { id: 'present-photthabba', name: 'Cảnh Xúc hiện tại' },
  { id: 'kama', name: 'Cảnh Dục giới' },
  { id: 'mahaggata', name: 'Cảnh Đáo đại' },
  { id: 'lower-phala', name: 'Cảnh 3 cặp Đạo Quả thấp' },
  { id: 'lokuttara-citta', name: 'Cảnh Siêu thế' },
  { id: 'pannatti', name: 'Cảnh Chế định' },
  { id: 'nibbana', name: 'Cảnh Niết-bàn' },
];

// Trả về một mảng chứa (các) loại cảnh mà mỗi ID tâm (citta) có thể biết được
function getCittaArammana(id) {
  if (id <= 12) return ['kama', 'mahaggata', 'pannatti'];               // 12 Tâm Bất thiện
  if (id === 13 || id === 20) return ['present-rupa'];                  // Nhị thức Nhãn thức — chỉ cảnh Sắc hiện tại
  if (id === 14 || id === 21) return ['present-sadda'];                 // Nhị thức Nhĩ thức — chỉ cảnh Thinh hiện tại
  if (id === 15 || id === 22) return ['present-gandha'];                // Nhị thức Tỷ thức — chỉ cảnh Khí hiện tại
  if (id === 16 || id === 23) return ['present-rasa'];                  // Nhị thức Thiệt thức — chỉ cảnh Vị hiện tại
  if (id === 17 || id === 24) return ['present-photthabba'];            // Nhị thức Thân thức — chỉ cảnh Xúc hiện tại
  if (id === 18 || id === 25 || id === 28) return ['present-rupa', 'present-sadda', 'present-gandha', 'present-rasa', 'present-photthabba']; // Ý giới (2 Tiếp thâu + 1 Ngũ môn hướng) — chỉ các cảnh hiện tại của 5 môn
  if (id === 19 || id === 26 || id === 27) return ['kama'];             // 3 Tâm Thẩm tấn
  if (id === 29) return ['kama', 'mahaggata', 'pannatti', 'nibbana', 'lokuttara-citta'];   // Ý môn hướng / Đoán định
  if (id === 30) return ['kama'];                                       // Tâm Tiếu sinh
  if (id === 31 || id === 32 || id === 35 || id === 36) return ['kama', 'mahaggata', 'pannatti', 'nibbana', 'lower-phala']; // Đại thiện Tương ưng trí (1,2,5,6)
  if (id === 33 || id === 34 || id === 37 || id === 38) return ['kama', 'mahaggata', 'pannatti'];   // Đại thiện Bất tương ưng trí (3,4,7,8)
  if (id >= 39 && id <= 46) return ['kama'];                            // Đại quả
  if (id === 47 || id === 48 || id === 51 || id === 52) return ['kama', 'mahaggata', 'pannatti', 'nibbana', 'lokuttara-citta']; // Đại duy tác Tương ưng trí (1,2,5,6)
  if (id === 49 || id === 50 || id === 53 || id === 54) return ['kama', 'mahaggata', 'pannatti'];   // Đại duy tác Bất tương ưng trí (3,4,7,8)
  if (id === 59) return ['pannatti', 'nibbana', 'lower-phala'];         // Sắc giới Thiện Ngũ thiền — Thiện Thắng trí
  if (id === 69) return ['pannatti', 'nibbana', 'lokuttara-citta'];     // Sắc giới Duy tác Ngũ thiền — Duy tác Thắng trí
  if (id >= 55 && id <= 69) return ['pannatti'];                        // Các tâm Sắc giới Thiện / Quả / Duy tác còn lại
  if (id >= 70 && id <= 81) {                                           // Vô sắc giới (Thiền thứ 1 + 3 = Chế định, Thiền thứ 2 + 4 = Đáo đại)
    const offset = (id - 70) % 4;
    return (offset === 1 || offset === 3) ? ['mahaggata'] : ['pannatti'];
  }
  if (id >= 82) return ['nibbana'];                                     // Tâm Siêu thế
  return [];
}

const VATTHU_TYPES = [
  { id: 1, name: 'Nhãn Căn' },
  { id: 2, name: 'Nhĩ Căn' },
  { id: 3, name: 'Tỷ Căn' },
  { id: 4, name: 'Thiệt Căn' },
  { id: 5, name: 'Thân Căn' },
  { id: 7, name: 'Ý Căn (Ý vật - Cố định)' },
  { id: 6, name: 'Ý Căn (Ý vật - Bất định)' },
  { id: 0, name: 'Vô Ý Căn (Vô Vật)' },
];
function isMaranaJavanaCitta(id) {
  if (id <= 12) return true;
  if (id >= 31 && id <= 38) return true;
  if (id >= 55 && id <= 59) return true;
  if (id >= 70 && id <= 73) return true;
  return false;
}
const MARANA_JAVANA_IDS = [
  ...Array.from({length:12},(_,i)=>i+1),
  ...Array.from({length:8},(_,i)=>i+31),
  ...Array.from({length:5},(_,i)=>i+55),
  ...Array.from({length:4},(_,i)=>i+70),
];

const HADAYA_ALWAYS_VATTHU_IDS = [
  9, 10,
  18, 25, 28,
  19, 26, 27,
  30,
  ...Array.from({ length: 8 }, (_, i) => i + 39),
  ...Array.from({ length: 15 }, (_, i) => i + 55),
  ...Array.from({ length: 5 }, (_, i) => i + 82),
];

function getCittaVatthu(id) {
  if (id === 13 || id === 20) return [1];
  if (id === 14 || id === 21) return [2];
  if (id === 15 || id === 22) return [3];
  if (id === 16 || id === 23) return [4];
  if (id === 17 || id === 24) return [5];
  if (id >= 74 && id <= 77) return [0];
  if (HADAYA_ALWAYS_VATTHU_IDS.includes(id)) return [7];
  return [6];
}

const VITHI_GROUPS = {
  birth: 'Giai đoạn Tái Sanh — Khởi đầu kiếp sống mới',
  panca: 'Lộ Ngũ Môn — Mắt/Tai/Mũi/Lưỡi/Thân',
  life: 'Diễn tiến cuộc sống (Hộ kiếp liên tục)',
  death: 'Lộ Cận Tử — Khoảnh khắc chuẩn bị qua đời',
};

const repeatItem = (label, color, count, group, matchType, matchValue) =>
  Array.from({ length: count }, () => ({ label, color, group, matchType, matchValue }));

const ATITA_BHAVANGA_ALTS = Array.from({ length: 15 }, (_, i) => `Hộ kiếp quá qua ${i + 1} sát-na`);

const PANCA_DVARA_TYPES = [
  { doorName: 'Lộ Nhãn Môn', vinLabel: 'Nhãn thức', vinIds: [13, 20] },
  { doorName: 'Lộ Nhĩ Môn', vinLabel: 'Nhĩ thức', vinIds: [14, 21] },
  { doorName: 'Lộ Tỷ Môn', vinLabel: 'Tỷ thức', vinIds: [15, 22] },
  { doorName: 'Lộ Thiệt Môn', vinLabel: 'Thiệt thức', vinIds: [16, 23] },
  { doorName: 'Lộ Thân Môn', vinLabel: 'Thân thức', vinIds: [17, 24] },
];

const PANCA_VITHI_VARIANTS = Array.from({ length: 15 }, (_, i) => {
  const atita = i + 1;
  let outcome;
  if (atita === 1) outcome = 'tadarammana';
  else if (atita <= 3) outcome = 'javana';
  else if (atita <= 8) outcome = 'votthapana3';
  else if (atita === 9) outcome = 'votthapana2';
  else outcome = 'mogha';
  const nameMap = {
    tadarammana: 'Cảnh rất lớn (Đến Thượng dư)',
    javana: 'Cảnh lớn (Chỉ đến Đổng lực)',
    votthapana3: 'Cảnh nhỏ (Đến Xác định x3)',
    votthapana2: 'Cảnh nhỏ (Đến Xác định x2)',
    mogha: 'Cảnh rất nhỏ (Vô hiệu)',
  };
  return { atita, outcome, name: `${nameMap[outcome]} — Hộ kiếp quá ${atita} sát-na` };
});

function buildPancaSection(variantIdx, doorIdx) {
  const variant = PANCA_VITHI_VARIANTS[variantIdx] || PANCA_VITHI_VARIANTS[0];
  const PANCA_DOOR = PANCA_DVARA_TYPES[doorIdx] || PANCA_DVARA_TYPES[0];
  const group = `${VITHI_GROUPS.panca} — ${PANCA_DOOR.doorName} (${variant.name})`;
  const items = [];
  for (let i = 0; i < variant.atita; i++) {
    items.push({
      label: 'Hộ kiếp quá', color: 'bg-slate-400', group, isAtita: true, atitaIndex: i + 1,
      matchType: i === 0 ? 'panca-door-cycle' : 'kicca', matchValue: i === 0 ? undefined : 2,
    });
  }
  items.push({ label: 'Rung động', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });
  items.push({ label: 'Dứt dòng', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });

  if (variant.outcome === 'mogha') {
    const built = variant.atita + 2;
    items.push(...Array.from({ length: Math.max(0, 17 - built) }, () => ({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 })));
    return items;
  }

  items.push({ label: 'Hướng ngũ môn', color: 'bg-stone-300', group, matchType: 'ahetuka-context', matchValue: 28 });
  items.push({ label: PANCA_DOOR.vinLabel, color: 'bg-sky-600', group, matchType: 'panca-vinnana-cycle', matchValue: PANCA_DOOR.vinIds, titleOverride: PANCA_DOOR.doorName });
  items.push({ label: 'Tiếp thọ', color: 'bg-stone-500', group, matchType: 'ahetuka-context', matchValue: [18, 25] });
  items.push({ label: 'Quan sát', color: 'bg-stone-500', group, matchType: 'ahetuka-context', matchValue: [19, 26, 27] });

  const votthapanaCount = variant.outcome === 'votthapana3' ? 3 : variant.outcome === 'votthapana2' ? 2 : 1;
  items.push(...repeatItem('Xác định', 'bg-stone-400', votthapanaCount, group, 'ahetuka-context', 29));

  const hasJavana = variant.outcome === 'tadarammana' || variant.outcome === 'javana';
  const hasTadarammana = variant.outcome === 'tadarammana';
  if (hasJavana) {
    items.push(...repeatItem('Đổng lực', 'bg-emerald-500', 7, group, 'citta-multi', KAMA_JAVANA_IDS));
    if (hasTadarammana) items.push(...repeatItem('Thượng dư', 'bg-blue-400', 2, group, 'kicca', 13));
  }

  const built = variant.atita + 2 + 4 + votthapanaCount + (hasJavana ? 7 : 0) + (hasTadarammana ? 2 : 0);
  items.push(...Array.from({ length: Math.max(0, 17 - built) }, () => ({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 })));
  return items;
}

const NANA_SAMPAYUTTA_KUSALA_IDS = [31, 32, 35, 36];
const MAHA_KIRIYA_NANA_SAMPAYUTTA_IDS = [47, 48, 51, 52];
const NEVASANNA_IDS = [73, 81];

const DVIPANCA_IDS = new Set([13,14,15,16,17,20,21,22,23,24]);

const MANO_VITHI_TYPES = [
  { name: 'Đổng lực Dục Giới — Cảnh rõ rệt (Vibhūta)', variants: [
    { label: 'Đơn thuần', javana: 7, tadarammana: 2 },
  ]},
  { name: 'Đổng lực Dục Giới — Cảnh không rõ rệt (Avibhūta)', variants: [
    { label: 'Đơn thuần', javana: 7, tadarammana: 0 },
  ]},
  { name: 'Đổng lực An Hòa — Khi đắc Thiền lần đầu', variants: [
    { label: 'Căn cơ chậm (Manda)', steps: ['Chuẩn bị', 'Cận thành', 'Thuận thứ', 'Chuyển tính'], jhana: 1 },
    { label: 'Căn cơ nhanh (Tikkha)', steps: ['Cận thành', 'Thuận thứ', 'Chuyển tính'], jhana: 1 },
  ]},
  { name: 'Đổng lực An Hòa — Nhập Thiền các lần sau', variants: [
    { label: 'Căn cơ chậm (Manda)', steps: ['Chuẩn bị', 'Cận thành', 'Thuận thứ', 'Chuyển tính'], jhana: 'many' },
    { label: 'Căn cơ nhanh (Tikkha)', steps: ['Cận thành', 'Thuận thứ', 'Chuyển tính'], jhana: 'many' },
  ]},
  { name: 'Lộ Thông (Abhiññā)', variants: [
    { label: 'Căn cơ chậm (Manda)', steps: ['Chuẩn bị', 'Cận thành', 'Thuận thứ', 'Chuyển tính'], jhana: 1, abhinna: true },
    { label: 'Căn cơ nhanh (Tikkha)', steps: ['Cận thành', 'Thuận thứ', 'Chuyển tính'], jhana: 1, abhinna: true },
  ]},
  { name: 'Lộ Đắc Đạo (Magga)', variants: [
    { label: 'Căn cơ chậm (Manda)', steps: ['Chuẩn bị', 'Cận thành', 'Thuận thứ', 'Chuyển tính'], magga: true },
    { label: 'Căn cơ nhanh (Tikkha)', steps: ['Cận thành', 'Thuận thứ', 'Chuyển tính'], magga: true },
  ]},
  { name: 'Lộ Nhập Quả (Phala)', variants: [
    { label: 'Căn cơ chậm (Manda)', steps: ['Chuẩn bị', 'Cận thành', 'Thuận thứ'], phala: true },
    { label: 'Căn cơ nhanh (Tikkha)', steps: ['Cận thành', 'Thuận thứ'], phala: true },
  ]},
  { name: 'Lộ Diệt Thọ Tưởng Định (Nirodha)', variants: [
    { label: 'Căn cơ chậm (Manda)', steps: ['Chuẩn bị', 'Cận thành', 'Thuận thứ', 'Chuyển tính'], special: 'nirodha' },
    { label: 'Căn cơ nhanh (Tikkha)', steps: ['Cận thành', 'Thuận thứ', 'Chuyển tính'], special: 'nirodha' },
  ]},
  { name: 'Lộ Nguyện Lực Đức Phật (Adhiṭṭhāna)', variants: [
    { label: 'Đơn thuần', special: 'adhitthana' },
  ]},
  ];

function buildManoSection(typeIdx, variantIdx) {
  const type = MANO_VITHI_TYPES[typeIdx] || MANO_VITHI_TYPES[0];
  const variant = type.variants[variantIdx % type.variants.length];
  const group = `Lộ Ý Môn — ${type.name}${type.variants.length > 1 ? ` (${variant.label})` : ''}`;
  const items = [];
  items.push({ label: '⟦ LỘ Ý MÔN ⟧', color: 'bg-indigo-900', header: true, matchType: 'mano-type-cycle' });
  items.push({ label: 'Rung động', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });
  items.push({ label: 'Dứt dòng', color: 'bg-slate-500', group, matchType: 'kicca', matchValue: 2 });
  items.push({ label: 'Hướng ý môn', color: 'bg-stone-400', group, matchType: 'ahetuka-context', matchValue: 29, isVariantCycler: type.variants.length > 1 });

  if (variant.special === 'nirodha') {
    (variant.steps || []).forEach(step => {
      items.push({ label: step, color: 'bg-emerald-400', group, matchType: 'citta-multi', matchValue: NANA_SAMPAYUTTA_KUSALA_IDS });
    });
    items.push({ label: 'Phi tưởng phi phi tưởng thiền', color: 'bg-indigo-400', group, matchType: 'citta-multi', matchValue: NEVASANNA_IDS });
    items.push({ label: 'Diệt thọ tưởng (Tâm ngưng)', color: 'bg-slate-800', group, ellipsis: true });
    items.push({ label: 'Tâm Quả', color: 'bg-purple-400', group, matchType: 'citta-multi', matchValue: NIRODHA_PHALA_IDS });
    items.push({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  if (variant.special === 'adhitthana') {
    items.push(...repeatItem('Đổng lực Duy tác', 'bg-emerald-300', 5, group, 'citta-multi', MAHA_KIRIYA_NANA_SAMPAYUTTA_IDS));
    items.push({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  
  (variant.steps || []).forEach(step => {
    items.push({ label: step, color: 'bg-emerald-400', group, matchType: 'citta-multi', matchValue: NANA_SAMPAYUTTA_KUSALA_IDS });
  });

  if (variant.jhana) {
    const count = variant.jhana === 'many' ? 3 : 1;
    const jhanaIds = variant.abhinna
      ? [59, 69]
      : [55,56,57,58,59, 65,66,67,68,69, 70,71,72,73, 78,79,80,81];
    items.push(...repeatItem(variant.abhinna ? 'Tâm Thông' : 'Tâm Thiền', 'bg-blue-400', count, group, 'citta-multi', jhanaIds));
    if (variant.jhana === 'many') items.push({ label: '⋯', color: 'bg-slate-300', ellipsis: true, group });
    items.push({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  if (variant.magga) {
    items.push({ label: 'Tâm Đạo', color: 'bg-purple-600', group, matchType: 'vithi-citta-subgroup', matchValue: 'magga' });
    items.push(...repeatItem('Tâm Quả', 'bg-purple-400', 2, group, 'vithi-citta-subgroup', 'phala'));
    items.push({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }
  if (variant.phala) {
    items.push(...repeatItem('Tâm Quả', 'bg-purple-400', 3, group, 'vithi-citta-subgroup', 'phala'));
    items.push({ label: '⋯', color: 'bg-slate-300', ellipsis: true, group });
    items.push({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
    return items;
  }

  items.push(...repeatItem('Đổng lực', 'bg-emerald-500', variant.javana || 7, group, 'citta-multi', KAMA_JAVANA_IDS));
  if (variant.tadarammana) items.push(...repeatItem('Thượng dư', 'bg-blue-400', variant.tadarammana, group, 'kicca', 13));
  items.push({ label: 'Hộ kiếp', color: 'bg-slate-400', group, matchType: 'kicca', matchValue: 2 });
  return items;
}

function buildGap(groupLabel) {
  return [
    ...repeatItem('Hộ kiếp', 'bg-slate-400', 3, groupLabel, 'kicca', 2),
    { label: '⋯', color: 'bg-slate-300', ellipsis: true, group: groupLabel },
  ];
}

const LIFE_VITHI_BIRTH = [
  { label: 'Tái sanh', color: 'bg-purple-600', group: VITHI_GROUPS.birth, matchType: 'kicca', matchValue: 1 },
  ...repeatItem('Hộ kiếp', 'bg-slate-400', 16, VITHI_GROUPS.birth, 'kicca', 2),
  { label: 'Rung động', color: 'bg-slate-500', group: VITHI_GROUPS.birth, matchType: 'kicca', matchValue: 2 },
  { label: 'Dứt dòng', color: 'bg-slate-500', group: VITHI_GROUPS.birth, matchType: 'kicca', matchValue: 2 },
  { label: 'Hướng ý môn', color: 'bg-stone-400', group: VITHI_GROUPS.birth, matchType: 'ahetuka-context', matchValue: 29},
  ...repeatItem('Đổng lực Ái kiếp', 'bg-red-500', 7, VITHI_GROUPS.birth, 'vithi-citta-subgroup', 'lobha'),
  ...buildGap(VITHI_GROUPS.birth),
];

const LIFE_VITHI_DEATH = [
  { label: 'Rung động', color: 'bg-slate-500', group: VITHI_GROUPS.death, matchType: 'kicca', matchValue: 2 },
  { label: 'Dứt dòng', color: 'bg-slate-500', group: VITHI_GROUPS.death, matchType: 'kicca', matchValue: 2 },
  { label: 'Hướng ý môn', color: 'bg-stone-400', group: VITHI_GROUPS.death, matchType: 'ahetuka-context', matchValue: 29},
  ...repeatItem('Đổng lực Cận tử', 'bg-orange-600', 5, VITHI_GROUPS.death, 'citta-multi', MARANA_JAVANA_IDS),
  { label: 'Tử tâm', color: 'bg-purple-700', group: VITHI_GROUPS.death, matchType: 'kicca', matchValue: 14 },
];

function getCittaVedana(c) {
  const { id, subGroup } = c;
  if (subGroup === 'dosa') return 'domanassa';
  if (subGroup === 'moha') return 'upekkha';
  if (subGroup === 'akusala-vipaka') return id === 17 ? 'dukkha' : 'upekkha';
  if (subGroup === 'kusala-vipaka') {
    if (id === 24) return 'sukha';
    if (id === 26) return 'somanassa';
    return 'upekkha';
  }
  if (subGroup === 'ahetuka-kiriya') return id === 30 ? 'somanassa' : 'upekkha';
  if (subGroup === 'lobha') {
    const idx = (id - 1) % 8;
    return idx < 4 ? 'somanassa' : 'upekkha';
  }
  if (['maha-kusala', 'maha-vipaka', 'maha-kiriya'].includes(subGroup)) {
    const starts = { 'maha-kusala': 31, 'maha-vipaka': 39, 'maha-kiriya': 47 };
    const idx = (id - starts[subGroup]) % 8;
    return idx < 4 ? 'somanassa' : 'upekkha';
  }
  if (['rupa-kusala', 'rupa-vipaka', 'rupa-kiriya'].includes(subGroup)) {
    const starts = { 'rupa-kusala': 55, 'rupa-vipaka': 60, 'rupa-kiriya': 65 };
    const idx = (id - starts[subGroup]) % 5;
    return idx < 4 ? 'somanassa' : 'upekkha';
  }
  if (['arupa-kusala', 'arupa-vipaka', 'arupa-kiriya'].includes(subGroup)) return 'upekkha';
  if (subGroup === 'magga') return ((id - 82) % 5) < 4 ? 'somanassa' : 'upekkha';
  if (subGroup === 'phala') return ((id - 102) % 5) < 4 ? 'somanassa' : 'upekkha';
  return 'upekkha';
}

const KAMA_JAVANA_IDS = [
  ...Array.from({length:12},(_,i)=>i+1),
  30,
  ...Array.from({length:8},(_,i)=>i+31),
  ...Array.from({length:8},(_,i)=>i+47),
];
const NIRODHA_PHALA_IDS = Array.from({length:10}, (_, i) => i + 112);

const CETASIKAS = [
  // Biến Hành (7)
  { id: 1, name: "Xúc", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự va chạm giữa căn, cảnh và thức (Phassa)." },
  { id: 2, name: "Thọ", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự cảm nhận hương vị của cảnh (Vedanā)." },
  { id: 3, name: "Tưởng", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự ghi nhận, nhận biết dấu hiệu của cảnh (Saññā)." },
  { id: 4, name: "Tư", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự đôn đốc, thúc đẩy các pháp đồng sanh hướng về cảnh (Cetanā)." },
  { id: 5, name: "Nhất Hành", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự gom tâm đặt vào một cảnh (Ekaggatā)." },
  { id: 6, name: "Mạng Quyền", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự gìn giữ đời sống các danh pháp đồng sanh (Jīvitindriya)." },
  { id: 7, name: "Tác Ý", subGroup: 'sabba', color: 'bg-yellow-400', desc: "Sự dẫn hướng các pháp đồng sanh về đối tượng (Manasikāra)." },

  // Biệt Cảnh (6)
  { id: 8, name: "Tầm", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "Sự hướng tâm đến cảnh, suy nghĩ (Vitakka)." },
  { id: 9, name: "Tứ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "Sự quan sát, xăm xắp trên cảnh (Vicāra)." },
  { id: 10, name: "Thắng Giải", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "Sự quyết đoán, dứt khoát trên đối tượng (Adhimokkha)." },
  { id: 11, name: "Cần", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "Sự siêng năng, nỗ lực cố gắng (Viriya)." },
  { id: 12, name: "Hỷ", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "Sự phỉ lạc, vui thích với đối tượng (Pīti)." },
  { id: 13, name: "Dục", subGroup: 'pakinnaka', color: 'bg-yellow-200', desc: "Sự muốn làm, ao ước đối với cảnh (Chanda)." },

  // Si Phần (4)
  { id: 14, name: "Si", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "Sự che lấp, không biết rõ thực tính các pháp (Moha)." },
  { id: 15, name: "Vô Tàm", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "Sự không biết hổ thẹn với tội lỗi (Ahirika)." },
  { id: 16, name: "Vô Úy", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "Sự không biết ghê sợ tội lỗi (Anottappa)." },
  { id: 17, name: "Phóng Dật", subGroup: 'moha-catukka', color: 'bg-orange-500', desc: "Sự xao lãng, không xao xuyến xao động trên cảnh (Uddhacca)." },

  // Tham Phần (3)
  { id: 18, name: "Tham", subGroup: 'lobha-tika', color: 'bg-red-500', desc: "Sự dính mắc, luyến ái đối tượng (Lobha)." },
  { id: 19, name: "Tà Kiến", subGroup: 'lobha-tika', color: 'bg-red-500', desc: "Sự thấy sai lạc, hiểu biết không đúng sự thật (Diṭṭhi)." },
  { id: 20, name: "Ngã Mạn", subGroup: 'lobha-tika', color: 'bg-red-500', desc: "Sự so đo, kiêu ngạo, tề cao mình (Māna)." },

  // Sân Phần (4)
  { id: 21, name: "Sân", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "Sự hung tợn, chống đối, hủy phá đối tượng (Dosa)." },
  { id: 22, name: "Tật", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "Sự ghen tị với sự thành công của người khác (Issā)." },
  { id: 23, name: "Lận", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "Sự bỏng xẻn, giấu giếm tài sản của mình (Macchariya)." },
  { id: 24, name: "Hối", subGroup: 'dosa-catukka', color: 'bg-rose-700', desc: "Sự ăn ăn, hối hận việc ác đã làm hoặc việc thiện chưa làm (Kukkucca)." },

  // Hôn Trầm - Thụy Miên (2)
  { id: 25, name: "Thộn Trầm", subGroup: 'thina-middha', color: 'bg-stone-500', desc: "Sự thụ động, dã dượi của tâm (Thīna)." },
  { id: 26, name: "Thụy Miên", subGroup: 'thina-middha', color: 'bg-stone-500', desc: "Sự buồn ngủ, dã dượi của sở hữu tâm (Middha)." },

  // Hoài Nghi (1)
  { id: 27, name: "Hoài Nghi", subGroup: 'vicikiccha', color: 'bg-orange-700', desc: "Sự nghi ngờ, không quyết đoán về Phật, Pháp, Tăng... (Vicikicchā)." },

  // Tịnh Hảo Biến Hành (19)
  { id: 28, name: "Tín", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự tin tưởng, trong sạch nơi Tam Bảo và lý Nhân Quả (Saddhā)." },
  { id: 29, name: "Niệm", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự ghi nhớ, không quên đối tượng tốt đẹp (Sati)." },
  { id: 30, name: "Tàm", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự hổ thẹn với điều ác (Hiri)." },
  { id: 31, name: "Úy", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự ghê sợ điều ác (Ottappa)." },
  { id: 32, name: "Vô Tham", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự không dính mắc, rộng rãi (Alobha)." },
  { id: 33, name: "Vô Sân", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự không chống đối, từ mẫn (Adosa)." },
  { id: 34, name: "Hành Xả", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự quân bình, trung lập đối với cảnh (Tatramajjhattatā)." },
  { id: 35, name: "Thân Tịnh An", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự an tịnh của các sở hữu tâm (Kāyapassaddhi)." },
  { id: 36, name: "Tâm Tịnh An", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự an tịnh của tâm (Cittapassaddhi)." },
  { id: 37, name: "Thân Khinh An", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự nhẹ nhàng của các sở hữu tâm (Kāyalahutā)." },
  { id: 38, name: "Tâm Khinh An", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự nhẹ nhàng của tâm (Cittalahutā)." },
  { id: 39, name: "Thân Nhu Hòa", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự nhu mềm của các sở hữu tâm (Kāyamudutā)." },
  { id: 40, name: "Tâm Nhu Hòa", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự nhu mềm của tâm (Cittamudutā)." },
  { id: 41, name: "Thân Thích Nghi", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự sốn sắng, dễ sử dụng của các sở hữu tâm (Kāyakammaññatā)." },
  { id: 42, name: "Tâm Thích Nghi", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự sốn sắng, dễ sử dụng của tâm (Cittakammaññatā)." },
  { id: 43, name: "Thân Thành Thục", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự thuần thục, thạo việc của các sở hữu tâm (Kāyapāguññatā)." },
  { id: 44, name: "Tâm Thành Thục", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự thuần thục, thạo việc của tâm (Cittapāguññatā)." },
  { id: 45, name: "Thân Chánh Trực", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự ngay thẳng của các sở hữu tâm (Kāyujukatā)." },
  { id: 46, name: "Tâm Chánh Trực", subGroup: 'sobhana-sadharana', color: 'bg-emerald-400', desc: "Sự ngay thẳng của tâm (Cittujukatā)." },

  // Giới Phần (3)
  { id: 47, name: "Chánh Ngữ", subGroup: 'virati', color: 'bg-teal-500', desc: "Sự né tránh khẩu ác nghiệp không liên quan sinh kế (Sammāvācā)." },
  { id: 48, name: "Chánh Nghiệp", subGroup: 'virati', color: 'bg-teal-500', desc: "Sự né tránh thân ác nghiệp không liên quan sinh kế (Sammākammanta)." },
  { id: 49, name: "Chánh Mạng", subGroup: 'virati', color: 'bg-teal-500', desc: "Sự né tránh thân/khẩu ác nghiệp liên quan nuôi mạng (Sammā-ājīva)." },

  // Vô Lượng (2)
  { id: 50, name: "Bi", subGroup: 'appamanna', color: 'bg-cyan-500', desc: "Sự thương xót, muốn cứu vớt chúng sanh đau khổ (Karuṇā)." },
  { id: 51, name: "Hỷ (Vô Lượng)", subGroup: 'appamanna', color: 'bg-cyan-500', desc: "Sự vui mừng với sự may mắn của chúng sanh (Muditā)." },

  // Trí Tuệ (1)
  { id: 52, name: "Trí Quyền", subGroup: 'panna', color: 'bg-blue-400', desc: "Sự thấu hiểu bản chất sự thật, Tứ Thánh Đế (Paññindriya)." }
];

const ATTHA_PANNATTI = [
  { id: 1, name: "Hình Thức Chế Định", desc: "Chế định dựa trên hình dáng: Núi, sông, đất..." },
  { id: 2, name: "Hợp Thành Chế Định", desc: "Chế định dựa trên sự lắp ráp: Xe, nhà, xe cộ..." },
  { id: 3, name: "Chúng Sanh Chế Định", desc: "Chế định dựa trên 5 ẩn: Người, nam, nữ, động vật..." },
  { id: 4, name: "Thời Không Chế Định", desc: "Chế định dựa vào mặt trời, mặt trăng: Đông, Tây, sáng, tối..." },
  { id: 5, name: "Không Gian Chế Định", desc: "Chế định nơi trống không: Hang, hang đá, lỗ trổng..." },
  { id: 6, name: "Tướng Tướng Chế Định", desc: "Chế định dựa trên đối tượng tu tập: Tướng thiền Kasiṇa..." },
];

const SADDA_PANNATTI = [
  { id: 1, name: "Danh Hiệu Chân Thực", desc: "Tên gọi chỉ về thực pháp có thật: Xúc, Danh, Sắc..." },
  { id: 2, name: "Danh Hiệu Phi Chân Thực", desc: "Tên gọi chỉ về pháp không có thật: Người, núi, đồi..." },
  { id: 3, name: "Chân Thực - Phi Chân Thực", desc: "Tên gọi thực pháp đi kèm phi thực pháp: Lục thông (người có 6 thông)..." },
  { id: 4, name: "Phi Chân Thực - Chân Thực", desc: "Tên gọi phi thực pháp đi kèm thực pháp: Giọng nữ..." },
  { id: 5, name: "Chân Thực - Chân Thực", desc: "Ghép 2 tên thực pháp: Nhãn thức..." },
  { id: 6, name: "Phi Chân Thực - Phi Chân Thực", desc: "Ghép 2 tên phi thực pháp: Hoàng tử..." },
];

const NIBBANA_GUNA = [
  { id: 1, name: "Bất Biến (Accutaṃ)", desc: "Không sinh, không hoại, không di chuyển." },
  { id: 2, name: "Vô Tận (Accantaṃ)", desc: "Vượt qua mọi sự kết thúc, vĩnh hằng." },
  { id: 3, name: "Vô Vi (Asaṅkhataṃ)", desc: "Không bị tạo tác bởi Nhân (Kamma, Citta, Utu, Āhāra)." },
  { id: 4, name: "Tối Thượng (Anuttaraṃ)", desc: "Trạng thái giải thoát cao cả nhất." },
  { id: 5, name: "Tối Thắng Đạo (Padaṃ)", desc: "Nơi đến của bậc Thánh Nhân." },
];

const RUPA_DESCS = {
  1: "Tính cứng/mềm, thô/mịn (Địa đại).",
  2: "Tính chảy, kết dính (Thủy đại).",
  3: "Tính nóng/lạnh, chín muồi (Hỏa đại).",
  4: "Tính nâng đỡ, nâng đỡ chuyển động (Phong đại).",
  5: "Thần kinh thị giác (Nhãn tịnh sắc).",
  6: "Thần kinh thính giác (Nhĩ tịnh sắc).",
  7: "Thần kinh khứu giác (Tỷ tịnh sắc).",
  8: "Thần kinh vị giác (Thiệt tịnh sắc).",
  9: "Thần kinh xúc giác toàn thân (Thân tịnh sắc).",
  10: "Màu sắc, hình dáng thấy được (Cảnh sắc).",
  11: "Âm thanh nghe được (Cảnh thinh).",
  12: "Mùi hương ngửi được (Cảnh khí).",
  13: "Vị giác nếm được (Cảnh vị).",
  14: "Tính chất giới tính nữ (Nữ tính sắc).",
  15: "Tính chất giới tính nam (Nam tính sắc).",
  16: "Nơi tựa của Ý thức/Ý môn (Ý vật sắc).",
  17: "Duy trì sự sống của các sắc nghiệp (Sắc Mạng quyền).",
  18: "Dưỡng chất trong thực phẩm (Sắc Vật thực).",
  19: "Khoảng không gian phân cách các sắc bọn (Sắc Giao giới/Khống đại).",
  20: "Biểu lộ qua thân thể (Thân biểu sắc).",
  21: "Biểu lộ qua lời nói (Khẩu biểu sắc).",
  22: "Tính nhẹ nhàng của sắc (Sắc Khinh).",
  23: "Tính nhu mềm của sắc (Sắc Nhu).",
  24: "Tính thích ứng của sắc (Sắc Thích nghi).",
  25: "Sự khởi đầu sinh ra của sắc (Sắc Tích sinh).",
  26: "Sự nối tiếp liên tục của sắc (Sắc Nối tiếp).",
  27: "Sự già cỗi, suy hoại của sắc (Sắc Lão).",
  28: "Sự diệt hoại của sắc (Sắc Vô thường).",
};

const RUPAS = [
  ...["Địa", "Hỏa", "Thủy", "Phong"].map((name, i) => ({ id: i + 1, name, group: 'mahabhuta', color: 'bg-amber-600', desc: RUPA_DESCS[i + 1] })),
  ...["Nhãn", "Nhĩ", "Tỷ", "Thiệt", "Thân"].map((name, i) => ({ id: i + 5, name, group: 'upadaya', subGroup: 'pasada', color: 'bg-amber-300', desc: RUPA_DESCS[i + 5] })),
  ...["Cảnh sắc", "Cảnh thinh", "Cảnh khí", "Cảnh vị"].map((name, i) => ({ id: i + 10, name, group: 'upadaya', subGroup: 'gocara', color: 'bg-amber-300', desc: RUPA_DESCS[i + 10] })),
  ...["Địa", "Hỏa", "Phong"].map((name, i) => ({ id: i + 29, name, group: 'upadaya', subGroup: 'gocara', color: 'bg-amber-500', virtual: true, refIds: [1, 2, 4], groupLabel: 'Cảnh xúc', desc: "Cảnh xúc bao gồm Địa, Hỏa, Phong đại — không phải sắc riêng biệt mới." })),
  ...["Nữ tính", "Nam tính"].map((name, i) => ({ id: i + 14, name, group: 'upadaya', subGroup: 'bhava', color: 'bg-amber-300', desc: RUPA_DESCS[i + 14] })),
  ...["Ý vật"].map((name, i) => ({ id: i + 16, name, group: 'upadaya', subGroup: 'hadaya', color: 'bg-amber-300', desc: RUPA_DESCS[i + 16] })),
  ...["Mạng quyền"].map((name, i) => ({ id: i + 17, name, group: 'upadaya', subGroup: 'jivita', color: 'bg-amber-300', desc: RUPA_DESCS[i + 17] })),
  ...["Vật thực"].map((name, i) => ({ id: i + 18, name, group: 'upadaya', subGroup: 'ahara', color: 'bg-amber-300', desc: RUPA_DESCS[i + 18] })),
  ...["Khống đại"].map((name, i) => ({ id: i + 19, name, group: 'upadaya', subGroup: 'pariccheda', color: 'bg-amber-300', desc: RUPA_DESCS[i + 19] })),
  ...["Sắc Khinh", "Sắc Nhu", "Sắc Thích Nghi", "Thân biểu", "Khẩu biểu"].map((name, i) => ({ id: i + 20, name, group: 'upadaya', subGroup: 'vikara', color: 'bg-amber-300', desc: RUPA_DESCS[i + 20] })),
  ...["Tích sinh", "Nối tiếp", "Lão", "Vô thường"].map((name, i) => ({ id: i + 25, name, group: 'upadaya', subGroup: 'lakkhana', color: 'bg-amber-300', desc: RUPA_DESCS[i + 25] }))
];

const SUDDHATTHAKA_IDS = [1,2,3,4,10,12,13,18];
const VIKARA3_IDS = [22,23,24];

const KAMMAJA_KALAPAS = [
  { id: 'cakkhu-dasaka', name: 'Bọn Nhãn căn (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 5] },
  { id: 'sota-dasaka', name: 'Bọn Nhĩ căn (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 6] },
  { id: 'ghana-dasaka', name: 'Bọn Tỷ căn (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 7] },
  { id: 'jivha-dasaka', name: 'Bọn Thiệt căn (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 8] },
  { id: 'kaya-dasaka', name: 'Bọn Thân căn (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 9] },
  { id: 'itthibhava-dasaka', name: 'Bọn Nữ tính (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 14] },
  { id: 'pumbhava-dasaka', name: 'Bọn Nam tính (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 15] },
  { id: 'vatthu-dasaka', name: 'Bọn Ý vật (10)', rupaIds: [...SUDDHATTHAKA_IDS, 17, 16] },
  { id: 'jivita-navaka', name: 'Bọn Mạng quyền (9)', rupaIds: [...SUDDHATTHAKA_IDS, 17] },
];

const CITTAJA_KALAPAS = [
  { id: 'c-suddhatthaka', name: 'Bọn Thuần thuần (8)', rupaIds: [...SUDDHATTHAKA_IDS] },
  { id: 'kaya-vinnatti-navaka', name: 'Bọn Thân biểu sắc (9)', rupaIds: [...SUDDHATTHAKA_IDS, 20] },
  { id: 'vaci-vinnatti-dasaka', name: 'Bọn Khẩu biểu sắc (10)', rupaIds: [...SUDDHATTHAKA_IDS, 21, 11] },
  { id: 'lahutadi-ekadasaka-c', name: 'Bọn Sắc biến đổi (11)', rupaIds: [...SUDDHATTHAKA_IDS, ...VIKARA3_IDS] },
  { id: 'kaya-vinnatti-lahutadi-dvadasaka', name: 'Bọn Thân biểu biến đổi (12)', rupaIds: [...SUDDHATTHAKA_IDS, 20, ...VIKARA3_IDS] },
  { id: 'vaci-vinnatti-sadda-lahutadi-terasaka', name: 'Bọn Khẩu biểu thinh biến đổi (13)', rupaIds: [...SUDDHATTHAKA_IDS, 21, 11, ...VIKARA3_IDS] },
];

const UTUJA_KALAPAS = [
  { id: 'u-suddhatthaka', name: 'Bọn Thuần thuần (8)', rupaIds: [...SUDDHATTHAKA_IDS] },
  { id: 'sadda-navaka', name: 'Bọn Cảnh thinh (9)', rupaIds: [...SUDDHATTHAKA_IDS, 11] },
  { id: 'lahutadi-ekadasaka-u', name: 'Bọn Sắc biến đổi (11)', rupaIds: [...SUDDHATTHAKA_IDS, ...VIKARA3_IDS] },
  { id: 'sadda-lahutadi-dvadasaka', name: 'Bọn Thinh biến đổi (12)', rupaIds: [...SUDDHATTHAKA_IDS, 11, ...VIKARA3_IDS] },
];

const AHARAJA_KALAPAS = [
  { id: 'a-suddhatthaka', name: 'Bọn Thuần thuần (8)', rupaIds: [...SUDDHATTHAKA_IDS] },
  { id: 'lahutadi-ekadasaka-a', name: 'Bọn Sắc biến đổi (11)', rupaIds: [...SUDDHATTHAKA_IDS, ...VIKARA3_IDS] },
];

const KALAPA_GROUPS = [
  { id: 'kammaja', name: 'Bọn do Nghiệp (9)', items: KAMMAJA_KALAPAS, color: 'rose' },
  { id: 'cittaja', name: 'Bọn do Tâm (6)', items: CITTAJA_KALAPAS, color: 'indigo' },
  { id: 'utuja', name: 'Bọn do Âm dương (4)', items: UTUJA_KALAPAS, color: 'emerald' },
  { id: 'aharaja', name: 'Bọn do Vật thực (2)', items: AHARAJA_KALAPAS, color: 'amber' },
];

const CJ_LOBHA_SOMA = [1, 2, 5, 6];
const CJ_LOBHA_UPE = [3, 4, 7, 8];
const CJ_DOSA = [9, 10];
const CJ_MOHA = [11, 12];
const CJ_SAMPATICCHANA_SANTIRANA_PANCADVARA = [18, 19, 25, 26, 27, 28];
const CJ_MANODVARA_HASITUPPADA = [29, 30];
const CJ_MAHAKUSALA_SOMA = [31, 32, 33, 34];
const CJ_MAHAKUSALA_UPE = [35, 36, 37, 38];
const CJ_MAHAKIRIYA_SOMA = [47, 48, 49, 50];
const CJ_MAHAKIRIYA_UPE = [51, 52, 53, 54];
const CJ_RUPA_KUSALA = [55, 56, 57, 58, 59];
const CJ_DVIPANCA_NONE = Array.from(DVIPANCA_IDS);
const CJ_MAHAVIPAKA_NONE = Array.from({ length: 8 }, (_, i) => i + 39);

const CJ_RUPASAMANNA_IDS = [
  ...CJ_LOBHA_SOMA, ...CJ_LOBHA_UPE, ...CJ_DOSA, ...CJ_MOHA,
  ...CJ_SAMPATICCHANA_SANTIRANA_PANCADVARA, ...CJ_MANODVARA_HASITUPPADA,
  ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKUSALA_UPE, ...CJ_MAHAKIRIYA_SOMA, ...CJ_MAHAKIRIYA_UPE, ...CJ_RUPA_KUSALA,
];
const CJ_IRIYAPATHA_IDS = [
  ...CJ_LOBHA_SOMA, ...CJ_LOBHA_UPE, ...CJ_DOSA, ...CJ_MOHA, ...CJ_MANODVARA_HASITUPPADA,
  ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKUSALA_UPE, ...CJ_MAHAKIRIYA_SOMA, ...CJ_MAHAKIRIYA_UPE, ...CJ_RUPA_KUSALA,
];
const CJ_VINNATTI_IDS = [
  ...CJ_LOBHA_SOMA, ...CJ_LOBHA_UPE, ...CJ_DOSA, ...CJ_MOHA, ...CJ_MANODVARA_HASITUPPADA,
  ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKUSALA_UPE, ...CJ_MAHAKIRIYA_SOMA, ...CJ_MAHAKIRIYA_UPE,
];
const CJ_HASITUPPADA_IDS = [...CJ_LOBHA_SOMA, ...CJ_MANODVARA_HASITUPPADA, ...CJ_MAHAKUSALA_SOMA, ...CJ_MAHAKIRIYA_SOMA];
const CJ_NONE_IDS = [...CJ_DVIPANCA_NONE, ...CJ_MAHAVIPAKA_NONE];

const CITTAJA_RUPA_TYPES = [
  { id: 'rupasamanna', name: 'Sắc thường (Sāmañña)', cittaIds: CJ_RUPASAMANNA_IDS },
  { id: 'iriyapatha', name: 'Oai nghi (Iriyāpatha)', cittaIds: CJ_IRIYAPATHA_IDS },
  { id: 'vinnatti', name: 'Biểu sắc (Viññatti)', cittaIds: CJ_VINNATTI_IDS },
  { id: 'hasituppada', name: 'Tiếu sinh (Hasituppāda)', cittaIds: CJ_HASITUPPADA_IDS },
  { id: 'cj-none', name: 'Không tạo Sắc Tâm', cittaIds: CJ_NONE_IDS },
];

const PATHAVI_APO_TEJO_VAYO = [1, 2, 3, 4];
const RUPA_GANDHA_RASA_PHOTTHABBA = [10, 12, 13];
const AHARA_AKASA = [18, 19];
const VIKARA3 = [22, 23, 24];

const KAMMAJA_EKANTA_IDS = [5, 6, 7, 8, 9, 14, 15, 16, 17];
const KAMMAJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, ...AHARA_AKASA];
const KAMMAJA_ALL_IDS = [...KAMMAJA_EKANTA_IDS, ...KAMMAJA_ANEKANTA_IDS];

const CITTAJA_EKANTA_IDS = [20, 21];
const CITTAJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, 11, ...AHARA_AKASA, ...VIKARA3];
const CITTAJA_ALL_IDS = [...CITTAJA_EKANTA_IDS, ...CITTAJA_ANEKANTA_IDS];

const UTUJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, 11, ...AHARA_AKASA, ...VIKARA3];
const UTUJA_ALL_IDS = [...UTUJA_ANEKANTA_IDS];

const AHARAJA_ANEKANTA_IDS = [...PATHAVI_APO_TEJO_VAYO, ...RUPA_GANDHA_RASA_PHOTTHABBA, ...AHARA_AKASA, ...VIKARA3];
const AHARAJA_ALL_IDS = [...AHARAJA_ANEKANTA_IDS];

const NAKUTOJA_IDS = [25, 26, 27, 28];

const RUPA_SAMUTTHANA_TYPES = [
  { id: 'kammaja', name: 'Sắc Nghiệp (18)', rupaIds: KAMMAJA_ALL_IDS, sub: [
    { id: 'kammaja-ekanta', name: 'Cố định (9)', rupaIds: KAMMAJA_EKANTA_IDS },
    { id: 'kammaja-anekanta', name: 'Bất cố định (9)', rupaIds: KAMMAJA_ANEKANTA_IDS },
  ]},
  { id: 'cittaja', name: 'Sắc Tâm (15)', rupaIds: CITTAJA_ALL_IDS, sub: [
    { id: 'cittaja-ekanta', name: 'Cố định (2)', rupaIds: CITTAJA_EKANTA_IDS },
    { id: 'cittaja-anekanta', name: 'Bất cố định (13)', rupaIds: CITTAJA_ANEKANTA_IDS },
  ]},
  { id: 'utuja', name: 'Sắc Âm Dương (13)', rupaIds: UTUJA_ALL_IDS, sub: [
    { id: 'utuja-anekanta', name: 'Bất cố định (13)', rupaIds: UTUJA_ANEKANTA_IDS },
  ]},
  { id: 'aharaja', name: 'Sắc Vật Thực (12)', rupaIds: AHARAJA_ALL_IDS, sub: [
    { id: 'aharaja-anekanta', name: 'Bất cố định (12)', rupaIds: AHARAJA_ANEKANTA_IDS },
  ]},
  { id: 'nakutoja', name: 'Sắc Vô Nhân Sanh (4)', rupaIds: NAKUTOJA_IDS, note: '4 Sắc Tướng Trạng (Lakkhaṇa) — Chỉ biểu thị trạng thái sinh, già, hoại của sắc.' },
];

const ALL_CITTA_IDS = CITTAS.map(c => c.id);

const B_LOBHA_8 = [1,2,3,4,5,6,7,8];
const B_DOSA_2 = [9,10];
const B_MOHA_2 = [11,12];
const B_CAKKHU_VIN_2 = [13,20];
const B_SOTA_VIN_2 = [14,21];
const B_GHANA_VIN_2 = [15,22];
const B_JIVHA_VIN_2 = [16,23];
const B_KAYA_VIN_2 = [17,24];
const B_SAMPATICCHANA_2 = [18,25];
const B_SANTIRANA_3 = [19,26,27];
const B_PANCADVARAVAJJANA_1 = [28];
const B_MANODVARAVAJJANA_1 = [29];
const B_HASITUPPADA_1 = [30];
const B_MAHA_KUSALA_8 = Array.from({ length: 8 }, (_, i) => i + 31);
const B_MAHA_VIPAKA_8 = Array.from({ length: 8 }, (_, i) => i + 39);
const B_MAHA_KIRIYA_8 = Array.from({ length: 8 }, (_, i) => i + 47);
const B_RUPA_KUSALA_5 = Array.from({ length: 5 }, (_, i) => i + 55);
const B_RUPA_VIPAKA_5 = Array.from({ length: 5 }, (_, i) => i + 60);
const B_RUPA_KIRIYA_5 = Array.from({ length: 5 }, (_, i) => i + 65);
const B_ARUPA_KUSALA_4 = [70,71,72,73];
const B_ARUPA_VIPAKA_4 = [74,75,76,77];
const B_ARUPA_KIRIYA_4 = [78,79,80,81];
const B_SOTAPATTI_MAGGA_1 = [82];
const B_OTHER_LOKUTTARA_7 = [87,92,97,102,107,112,117];

const B_VITHI_80 = [
  ...B_LOBHA_8, ...B_DOSA_2, ...B_MOHA_2,
  ...B_CAKKHU_VIN_2, ...B_SOTA_VIN_2, ...B_GHANA_VIN_2, ...B_JIVHA_VIN_2, ...B_KAYA_VIN_2,
  ...B_SAMPATICCHANA_2, ...B_SANTIRANA_3, ...B_PANCADVARAVAJJANA_1, ...B_MANODVARAVAJJANA_1, ...B_HASITUPPADA_1,
  ...B_MAHA_KUSALA_8, ...B_MAHA_VIPAKA_8, ...B_MAHA_KIRIYA_8,
  ...B_RUPA_KUSALA_5, ...B_RUPA_KIRIYA_5,
  ...B_ARUPA_KUSALA_4, ...B_ARUPA_KIRIYA_4,
  ...B_SOTAPATTI_MAGGA_1, ...B_OTHER_LOKUTTARA_7,
];

const KAMAVACARA_CITTA_IDS = [...B_VITHI_80];

const B_RUPA_BASE_64 = B_VITHI_80.filter(id =>
  ![...B_DOSA_2, ...B_GHANA_VIN_2, ...B_JIVHA_VIN_2, ...B_KAYA_VIN_2, ...B_MAHA_VIPAKA_8].includes(id)
);
const rupaBhumiCittas = (vipakaId) => [...B_RUPA_BASE_64, vipakaId];

const B_ARUPA_BASE_42 = [
  ...B_LOBHA_8, ...B_MOHA_2, ...B_MANODVARAVAJJANA_1,
  ...B_MAHA_KUSALA_8, ...B_MAHA_KIRIYA_8,
  ...B_ARUPA_KUSALA_4, ...B_ARUPA_KIRIYA_4,
  ...B_OTHER_LOKUTTARA_7,
];
const arupaBhumiCittas = (level, vipakaId) => {
  const belowKusala = B_ARUPA_KUSALA_4.slice(0, level);
  const belowKiriya = B_ARUPA_KIRIYA_4.slice(0, level);
  return [
    ...B_ARUPA_BASE_42.filter(id => !belowKusala.includes(id) && !belowKiriya.includes(id)),
    vipakaId,
  ];
};

const ASANNASATTA_CITTA_IDS = [];

const KAMA_BHUMI_RUPA_IDS = Array.from({ length: 28 }, (_, i) => i + 1);
const RUPA_BHUMI_RUPA_IDS = KAMA_BHUMI_RUPA_IDS.filter(id => ![7, 8, 9, 14, 15].includes(id));
const ASANNASATTA_RUPA_IDS = [1, 2, 3, 4, 10, 12, 13, 18, 17, 22, 23, 24, 19, 25, 26, 27, 28];
const ARUPA_BHUMI_RUPA_IDS = [];

const BHUMI_31 = [
  { group: 'arupa', name: 'Cõi Vô Sắc Giới (4)', color: 'violet', items: [
    { name: 'Cõi Phi Tưởng Phi Phi Tưởng Xứ', life: '84,000 đại kiếp', cittaIds: arupaBhumiCittas(3, 77), rupaIds: ARUPA_BHUMI_RUPA_IDS },
    { name: 'Cõi Vô Sở Hữu Xứ', life: '60,000 đại kiếp', cittaIds: arupaBhumiCittas(2, 76), rupaIds: ARUPA_BHUMI_RUPA_IDS },
    { name: 'Cõi Thức Vô Biên Xứ', life: '40,000 đại kiếp', cittaIds: arupaBhumiCittas(1, 75), rupaIds: ARUPA_BHUMI_RUPA_IDS },
    { name: 'Cõi Không Vô Biên Xứ', life: '20,000 đại kiếp', cittaIds: arupaBhumiCittas(0, 74), rupaIds: ARUPA_BHUMI_RUPA_IDS },
  ]},
  { group: 'rupa', name: 'Cõi Sắc Giới (16)', color: 'sky', subgroups: [
    { name: 'Cõi Tịnh Cư (Sudhāvāsa)', color: 'indigo', items: [
      { name: 'Sắc Cung Tột (Akanittha)', life: '16,000 đại kiếp', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Thiện Kiến (Sudassī)', life: '8,000 đại kiếp', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Thiện Hiện (Sudassā)', life: '4,000 đại kiếp', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Vô Nhiệt (Atappā)', life: '2,000 đại kiếp', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Vô Bức (Avihā)', life: '1,000 đại kiếp', cittaIds: rupaBhumiCittas(64), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'Cõi Ngũ Thiền', color: 'blue', items: [
      { name: 'Vô Tưởng (Asaññasatta)', life: '500 đại kiếp', cittaIds: ASANNASATTA_CITTA_IDS, rupaIds: ASANNASATTA_RUPA_IDS, note: 'Chỉ có Sắc Mạng quyền, hoàn toàn không có Tâm và Sở hữu tâm.' },
      { name: 'Quảng Quả (Vehapphala)', life: '500 đại kiếp', cittaIds: rupaBhumiCittas(63), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'Cõi Tam Thiền (3)', color: 'teal', items: [
      { name: 'Biến Tịnh (Subhakiṇhā)', life: '64 đại kiếp', cittaIds: rupaBhumiCittas(62), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Vô Lượng Tịnh (Appamāṇasubhā)', life: '32 đại kiếp', cittaIds: rupaBhumiCittas(62), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Thiểu Tịnh (Parittasubhā)', life: '16 đại kiếp', cittaIds: rupaBhumiCittas(62), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'Cõi Nhị Thiền (3)', color: 'cyan', items: [
      { name: 'Quang Âm (Ābhassarā)', life: '8 đại kiếp', cittaIds: rupaBhumiCittas(61), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Vô Lượng Quang (Appamāṇābhā)', life: '4 đại kiếp', cittaIds: rupaBhumiCittas(61), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Thiểu Quang (Parittābhā)', life: '2 đại kiếp', cittaIds: rupaBhumiCittas(61), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
    { name: 'Cõi Sơ Thiền (3)', color: 'sky', items: [
      { name: 'Đại Phạm Thiên (Mahābrahmā)', life: '1 trung kiếp', cittaIds: rupaBhumiCittas(60), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Phạm Phụ Thiên (Brahmapurohitā)', life: '1/2 trung kiếp', cittaIds: rupaBhumiCittas(60), rupaIds: RUPA_BHUMI_RUPA_IDS },
      { name: 'Phạm Chúng Thiên (Brahmapārisajjā)', life: '1/3 trung kiếp', cittaIds: rupaBhumiCittas(60), rupaIds: RUPA_BHUMI_RUPA_IDS },
    ]},
  ]},
  { group: 'kama-sugati', name: 'Cõi Dục Cõi Vui (7)', color: 'amber', items: [
    { name: 'Tha Hóa Tự Tại Thiên', life: '16,000 tuổi chư thiên (~9,216 triệu năm)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Hóa Lạc Thiên', life: '8,000 tuổi chư thiên (~2,304 triệu năm)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Đâu Suất Thiên (Tusita)', life: '4,000 tuổi chư thiên (~576 triệu năm)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Dạ Ma Thiên (Yāmā)', life: '2,000 tuổi chư thiên (~144 triệu năm)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Đạo Lợi Thiên (Tāvatiṃsa)', life: '1,000 tuổi chư thiên (~36 triệu năm)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Tứ Đại Thiên Vương', life: '500 tuổi chư thiên (~9 triệu năm)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Cõi Người (Manussa)', life: 'Thọ mạng bất định', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
  ]},
  { group: 'apaya', name: 'Cõi Bổn Ác Khổ (4)', color: 'rose', items: [
    { name: 'Cõi Súc Sanh', life: 'Bất định', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Cõi Ngạ Quỷ', life: 'Bất định', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
  { name: 'Cõi A-tu-la (Asura)', life: 'Bất định', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
    { name: 'Cõi Địa Ngục (Niraya)', life: 'Bất định (tùy thuộc nghiệp)', cittaIds: KAMAVACARA_CITTA_IDS, rupaIds: KAMA_BHUMI_RUPA_IDS },
  ], note: 'Gồm 8 địa ngục đại tầng: Sanjīva, Kāḷasutta, Sanghāta, Roruva, Mahāroruva, Tāpana, Mahātāpana, Avīci.' },
]

const MAHA_KUSALA_8_IDS = B_MAHA_KUSALA_8;
const RUPA_KUSALA_5_IDS = B_RUPA_KUSALA_5;
const ARUPA_KUSALA_4_IDS = B_ARUPA_KUSALA_4;
const MANODVARAVAJJANA_1_IDS = B_MANODVARAVAJJANA_1;
const HASITUPPADA_1_IDS = B_HASITUPPADA_1;
const MAHA_KIRIYA_8_IDS = B_MAHA_KIRIYA_8;
const RUPA_KIRIYA_5_IDS = B_RUPA_KIRIYA_5;
const ARUPA_KIRIYA_4_IDS = B_ARUPA_KIRIYA_4;

const LOBHA_DITTHI_VIPPAYUTTA_IDS = [3, 4, 7, 8];
const LOBHA_ALL_8_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const DOSA_2_IDS = [9, 10];
const VICIKICCHA_1_IDS = [11];
const UDDHACCA_1_IDS = [12];
const AKUSALA_12_IDS = Array.from({ length: 12 }, (_, i) => i + 1);
const DVIPANCA_10_IDS = [13, 14, 15, 16, 17, 20, 21, 22, 23, 24];
const SAMPATICCHANA_2_IDS = [18, 25];
const SANTIRANA_ALL_3_IDS = [19, 26, 27];
const PANCADVARAVAJJANA_1_IDS = [28];
const AVAJJANA_2_IDS = [28, 29];
const MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS = [41, 42, 45, 46];
const MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS = [39, 40, 43, 44];
const CAKKHU_SOTA_VINNANA_4_IDS = [13, 20, 14, 21];
const MAGGA_4_IDS = [82, 87, 92, 97];
const PHALA_SOTAPATTI_1_IDS = [102];
const PHALA_ANAGAMI_1_IDS = [112];
const PHALA_ARAHATTA_1_IDS = [117];
const PHALA_LOWER_3_IDS = [102, 107, 112];

const PUGGALA_DUGGATI_IDS = [...AKUSALA_12_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS];
const PUGGALA_SUGATI_AHETUKA_IDS = [...PUGGALA_DUGGATI_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS];
const PUGGALA_TIHETUKA_KAMA_IDS = [...AKUSALA_12_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS];
const PUGGALA_RUPAVACARA_IDS = [...LOBHA_ALL_8_IDS, ...VICIKICCHA_1_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS];
const PUGGALA_ARUPAVACARA_IDS = [...LOBHA_ALL_8_IDS, ...VICIKICCHA_1_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS];
const PUGGALA_SOTA_SAKA_KAMA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...DOSA_2_IDS, ...UDDHACCA_1_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_SOTAPATTI_1_IDS];
const PUGGALA_SOTA_SAKA_RUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_SOTAPATTI_1_IDS];
const PUGGALA_SOTA_SAKA_ARUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_SOTAPATTI_1_IDS];
const PUGGALA_ANAGAMI_KAMA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_ANAGAMI_1_IDS];
const PUGGALA_ANAGAMI_RUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_ANAGAMI_1_IDS];
const PUGGALA_ANAGAMI_ARUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS, ...PHALA_ANAGAMI_1_IDS];
const PUGGALA_SEKKHA_KAMA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...DOSA_2_IDS, ...UDDHACCA_1_IDS, ...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...MAGGA_4_IDS, ...PHALA_LOWER_3_IDS];
const PUGGALA_SEKKHA_RUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...MAHA_KUSALA_8_IDS, ...RUPA_KUSALA_5_IDS, ...ARUPA_KUSALA_4_IDS, ...MAGGA_4_IDS, ...PHALA_LOWER_3_IDS];
const PUGGALA_SEKKHA_ARUPA_IDS = [...LOBHA_DITTHI_VIPPAYUTTA_IDS, ...UDDHACCA_1_IDS, ...MANODVARAVAJJANA_1_IDS, ...MAHA_KUSALA_8_IDS, ...ARUPA_KUSALA_4_IDS, ...MAGGA_4_IDS, ...PHALA_LOWER_3_IDS];
const PUGGALA_ARAHANT_KAMA_IDS = [...DVIPANCA_10_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...HASITUPPADA_1_IDS, ...MAHA_VIPAKA_NANA_VIPPAYUTTA_4_IDS, ...MAHA_VIPAKA_NANA_SAMPAYUTTA_4_IDS, ...MAHA_KIRIYA_8_IDS, ...RUPA_KIRIYA_5_IDS, ...ARUPA_KIRIYA_4_IDS, ...PHALA_ARAHATTA_1_IDS];
const PUGGALA_ARAHANT_RUPA_IDS = [...CAKKHU_SOTA_VINNANA_4_IDS, ...SAMPATICCHANA_2_IDS, ...SANTIRANA_ALL_3_IDS, ...AVAJJANA_2_IDS, ...HASITUPPADA_1_IDS, ...MAHA_KIRIYA_8_IDS, ...RUPA_KIRIYA_5_IDS, ...ARUPA_KIRIYA_4_IDS, ...PHALA_ARAHATTA_1_IDS];
const PUGGALA_ARAHANT_ARUPA_IDS = [...MANODVARAVAJJANA_1_IDS, ...MAHA_KIRIYA_8_IDS, ...ARUPA_KIRIYA_4_IDS, ...PHALA_ARAHATTA_1_IDS];

const PUGGALA_CITTA_TYPES = [
  { id: 'duggati', name: 'Người Khổ Ác Đạo (37)', cittaIds: PUGGALA_DUGGATI_IDS },
  { id: 'sugati-ahetuka', name: 'Người Nhàn Cảnh Vô Nhân (41)', cittaIds: PUGGALA_SUGATI_AHETUKA_IDS },
  { id: 'dvihetuka', name: 'Người Nhị Nhân (41)', cittaIds: PUGGALA_SUGATI_AHETUKA_IDS },
  { id: 'tihetuka-kama', name: 'Người Tam Nhân Dục Giới (54)', cittaIds: PUGGALA_TIHETUKA_KAMA_IDS },
  { id: 'rupavacara', name: 'Người Sắc Giới (38)', cittaIds: PUGGALA_RUPAVACARA_IDS },
  { id: 'arupavacara', name: 'Người Vô Sắc Giới (23)', cittaIds: PUGGALA_ARUPAVACARA_IDS },
  { id: 'maggattha', name: 'Bậc Đạo (4)', cittaIds: MAGGA_4_IDS },
  { id: 'sota-saka-kama', name: 'Thánh Tu Đà Hoàn/Tư Đà Hàm Dục Giới (50)', cittaIds: PUGGALA_SOTA_SAKA_KAMA_IDS },
  { id: 'sota-saka-rupa', name: 'Thánh Tu Đà Hoàn/Tư Đà Hàm Sắc Giới (34)', cittaIds: PUGGALA_SOTA_SAKA_RUPA_IDS },
  { id: 'sota-saka-arupa', name: 'Thánh Tu Đà Hoàn/Tư Đà Hàm Vô Sắc Giới (19)', cittaIds: PUGGALA_SOTA_SAKA_ARUPA_IDS },
  { id: 'anagami-kama', name: 'Thánh A Na Hàm Dục Giới (48)', cittaIds: PUGGALA_ANAGAMI_KAMA_IDS },
  { id: 'anagami-rupa', name: 'Thánh A Na Hàm Sắc Giới (34)', cittaIds: PUGGALA_ANAGAMI_RUPA_IDS },
  { id: 'anagami-arupa', name: 'Thánh A Na Hàm Vô Sắc Giới (19)', cittaIds: PUGGALA_ANAGAMI_ARUPA_IDS },
  { id: 'sekkha-kama', name: 'Bậc Hữu Học Dục Giới (56)', cittaIds: PUGGALA_SEKKHA_KAMA_IDS },
  { id: 'sekkha-rupa', name: 'Bậc Hữu Học Sắc Giới (40)', cittaIds: PUGGALA_SEKKHA_RUPA_IDS },
  { id: 'sekkha-arupa', name: 'Bậc Hữu Học Vô Sắc Giới (25)', cittaIds: PUGGALA_SEKKHA_ARUPA_IDS },
  { id: 'arahant-kama', name: 'Bậc A La Hán Dục Giới (44)', cittaIds: PUGGALA_ARAHANT_KAMA_IDS },
  { id: 'arahant-rupa', name: 'Bậc A La Hán Sắc Giới (30)', cittaIds: PUGGALA_ARAHANT_RUPA_IDS },
  { id: 'arahant-arupa', name: 'Bậc A La Hán Vô Sắc Giới (14)', cittaIds: PUGGALA_ARAHANT_ARUPA_IDS },
];

const SUTI_ID_AHETU_DVIHETU = [19, 27, 39, 40, 41, 42, 43, 44, 45, 46];
const SUTI_ID_TIHETU_ALL19 = [19, 27, 39, 40, 41, 42, 43, 44, 45, 46, 60, 61, 62, 63, 64, 74, 75, 76, 77];
const SUTI_ID_REMAINING_RUPA = [39, 40, 41, 42, 43, 44, 45, 46, 60, 61, 62, 63, 64, 74, 75, 76, 77];
const SUTI_ID_ASANNA_FOLLOW = [39, 40, 41, 42, 43, 44, 45, 46]; // 8
const KAMA_TIHETU_PATISANDHI_4 = [39, 40, 43, 44]; // Tục sinh Ka-ma có nhân đi kèm ba nhân (4 tâm trí tuệ tương ưng)
// Mỗi tâm Vô sắc giới (A-ru-pa-citta) không thể dẫn đến tái sinh Vô sắc giới quả ở cấp độ thấp hơn chính nó (chỉ có thể đạt cấp độ của chính nó + các cấp độ cao hơn)
const SUTI_ID_AKASA_FOLLOW = [...B_ARUPA_VIPAKA_4, ...KAMA_TIHETU_PATISANDHI_4]; // 74,75,76,77 + 4 Ka-ma có ba nhân = 8
const SUTI_ID_VINNANANCA_FOLLOW = [75, 76, 77, ...KAMA_TIHETU_PATISANDHI_4]; // 7
const SUTI_ID_AKINCANNA_FOLLOW = [76, 77, ...KAMA_TIHETU_PATISANDHI_4]; // 6
const SUTI_ID_NEVASANNA_FOLLOW = [77, ...KAMA_TIHETU_PATISANDHI_4]; // 5

const SUTI_PATI_TYPES = [
  { id: 'ahetu', name: 'Vô nhân', cittaIds: SUTI_ID_AHETU_DVIHETU, note: 'Sau tâm tử vô nhân còn sót lại, chỉ tiếp nối 10 tâm tục sinh Ka-ma.' },
  { id: 'dvihetu', name: 'Nhị nhân', cittaIds: SUTI_ID_AHETU_DVIHETU, note: 'Sau tâm tử nhị nhân còn sót lại, chỉ tiếp nối 10 tâm tục sinh Ka-ma.' },
  { id: 'tihetu', name: 'Tam nhân', cittaIds: SUTI_ID_TIHETU_ALL19, note: 'Sau tâm tử Ka-ma tam nhân, tất cả các tâm tục sinh đều tiếp nối — 19 tâm tục sinh + tục sinh vô tưởng (gồm cụm 9 sắc mạng quyền, không có tâm).' },
  { id: 'remaining-rupa', name: 'Sắc giới còn lại', cittaIds: SUTI_ID_REMAINING_RUPA, note: 'Sau tâm tử Sắc giới, tiếp nối 17 tâm tục sinh hữu nhân không có vô nhân (tục sinh Ka-ma tam nhân và nhị nhân chỉ dành cho phàm phu).' },
  { id: 'asannasatta', name: 'Vô tưởng chúng sinh', cittaIds: SUTI_ID_ASANNA_FOLLOW, note: 'Sau tâm tử Vô tưởng chúng sinh, tiếp nối 8 tâm tục sinh Ka-ma nhị nhân và tam nhân.' },
  { id: 'akasa', name: 'Không vô biên xứ', cittaIds: SUTI_ID_AKASA_FOLLOW, note: 'Sau tâm tử Không vô biên xứ, tiếp nối 4 tâm tục sinh Vô sắc (cấp độ của chính mình + các cấp độ cao hơn) và 4 tâm tục sinh Ka-ma tam nhân, tổng cộng 8 (vì chưa có tâm tục sinh Vô sắc ở các cấp thấp hơn nên đạt được tất cả).' },
  { id: 'vinnananca', name: 'Thức vô biên xứ', cittaIds: SUTI_ID_VINNANANCA_FOLLOW, note: 'Sau tâm tử Thức vô biên xứ, loại trừ tâm Không vô biên xứ ở thấp nhất, tiếp nối 3 tâm tục sinh Vô sắc (cấp độ của chính mình + các cấp độ cao hơn) và 4 tâm tục sinh Ka-ma tam nhân, tổng cộng 7.' },
  { id: 'akincanna', name: 'Vô sở hữu xứ', cittaIds: SUTI_ID_AKINCANNA_FOLLOW, note: 'Sau tâm tử Vô sở hữu xứ, loại trừ 2 tâm tục sinh Vô sắc ở dưới thấp, tiếp nối 2 tâm tục sinh Vô sắc (cấp độ của chính mình + các cấp độ cao hơn) và 4 tâm tục sinh Ka-ma tam nhân, tổng cộng 6.' },
  { id: 'nevasanna', name: 'Phi tưởng phi phi tưởng xứ', cittaIds: SUTI_ID_NEVASANNA_FOLLOW, note: 'Sau tâm tử Phi tưởng phi phi tưởng xứ, loại trừ 3 tâm tục sinh Vô sắc ở dưới thấp, tiếp nối 1 tâm tục sinh Vô sắc ở cấp độ của chính mình và 4 tâm tục sinh Ka-ma tam nhân, tổng cộng 5.' },
];

const BHUMI_COLOR_MAP = {
  rose:   { title: 'text-rose-700',   chip: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:shadow-sm',       bar: 'bg-rose-400' },
  amber:  { title: 'text-amber-700',  chip: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:shadow-sm',     bar: 'bg-amber-400' },
  sky:    { title: 'text-sky-700',    chip: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 hover:shadow-sm',         bar: 'bg-sky-400' },
  cyan:   { title: 'text-cyan-700',   chip: 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100 hover:shadow-sm',       bar: 'bg-cyan-400' },
  teal:   { title: 'text-teal-700',   chip: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100 hover:shadow-sm',       bar: 'bg-teal-400' },
  blue:   { title: 'text-blue-700',   chip: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:shadow-sm',       bar: 'bg-blue-400' },
  indigo: { title: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100 hover:shadow-sm', bar: 'bg-indigo-400' },
  violet: { title: 'text-violet-700', chip: 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100 hover:shadow-sm', bar: 'bg-violet-400' },
};

// ==== Tâm Nānākadāci (thỉnh thoảng sinh khởi) — chế độ truy cập bằng cách nhấn giữ (long-press) vào dấu chấm citta ====
// Khi ở trong chế độ này, mỗi lần nhấp nhanh (short-click) vào dấu chấm sẽ chuyển đổi qua lại giữa các trạng thái. Nhấn giữ lại lần nữa
// sẽ thoát khỏi chế độ và trở về chức năng ban đầu (bật/tắt thông thường).
const NANAKADACI_CONFIG = {
  lobhaMana: {
    cittaIds: [3, 4, 7, 8], // Lobha-mūla diṭṭhigata-vippayutta — Māna là nānākadāci
    states: [
      { label: 'Không có Māna', exclude: [20] },
      { label: 'Có Māna', exclude: [] },
      ],
  },
  dosaNanaka: {
    cittaIds: [9, 10], // Dosa-mūla — Issā / Macchariya / Kukkucca là nānākadāci (chỉ xảy ra từng cái một tại một thời điểm)
    states: [
      { label: 'Không có cả ba (Issā, Macchariya, Kukkucca)', exclude: [22, 23, 24] },
      { label: 'Có Issā', exclude: [23, 24] },
      { label: 'Có Macchariya', exclude: [22, 24] },
      { label: 'Có Kukkucca', exclude: [22, 23] },
      
    ],
  },
  sobhanaNanakaKusala: {
    // Đại thiện (8) + Sắc giới thiện (5) — Chế ly (3) + Vô lượng (2) là nanāka-dāci (tùy duyên khởi)
    cittaIds: [
      ...Array.from({ length: 8 }, (_, i) => i + 31),
    ],
    states: [
      { label: 'Không có Chế ly / Vô lượng', exclude: [47, 48, 49, 50, 51] },
      { label: 'Có Chánh ngữ', exclude: [48, 49, 50, 51] },
      { label: 'Có Chánh nghiệp', exclude: [47, 49, 50, 51] },
      { label: 'Có Chánh mạng', exclude: [47, 48, 50, 51] },
      { label: 'Có Bi', exclude: [47, 48, 49, 51] },
      { label: 'Có Hỷ', exclude: [47, 48, 49, 50] },
      
    ],
  },
  sobhanaNanakaKiriya: {
    // Đại duy tác (8) + Sắc giới duy tác (5) — Không có Chế ly (vì bậc A-la-hán không cần phải sơ khởi tránh ác trước), chỉ có Vô lượng (2) là nanāka-dāci
    cittaIds: [
      ...Array.from({ length: 8 }, (_, i) => i + 47),
      ...Array.from({ length: 5 }, (_, i) => i + 55),
      ...Array.from({ length: 5 }, (_, i) => i + 65),
    ],
    states: [
      { label: 'Không có Vô lượng', exclude: [50, 51] },
      { label: 'Có Bi', exclude: [51] },
      { label: 'Có Hỷ', exclude: [50] },
      
    ],
  },
};
function getNanakadaciConfig(cId) {
  for (const key of Object.keys(NANAKADACI_CONFIG)) {
    if (NANAKADACI_CONFIG[key].cittaIds.includes(cId)) return key;
  }
  return null;
}

const VIRATI_CYCLE_STATES = [
  { label: 'Không có Chế ly ', include: [] },
  { label: 'Có Chánh ngữ', include: [47] },
  { label: 'Có Chánh nghiệp', include: [48] },
  { label: 'Có Chánh mạng', include: [49] },
];

// --- Layout & Grouping Structures ---

const CITTA_LAYOUT = [
  { title: "Tâm Bất Thiện (12)", subGroups: [{ title: "Tâm Tham (8)", id: "lobha" }, { title: "Tâm Sân (2)", id: "dosa" }, { title: "Tâm Si (2)", id: "moha" }] },
  { title: "Tâm Vô Nhân (18)", subGroups: [{ title: "Quả Bất Thiện (7)", id: "akusala-vipaka" }, { title: "Quả Thiện Vô Nhân (8)", id: "kusala-vipaka" }, { title: "Duy Tác Vô Nhân (3)", id: "ahetuka-kiriya" }] },
  { title: "Tâm Dục Giới Tịnh Hảo (24)", subGroups: [{ title: "Đại Thiện (8)", id: "maha-kusala" }, { title: "Đại Quả (8)", id: "maha-vipaka" }, { title: "Đại Duy Tác (8)", id: "maha-kiriya" }] },
  { title: "Tâm Sắc Giới (15)", subGroups: [{ title: "Thiện Sắc Giới (5)", id: "rupa-kusala" }, { title: "Quả Sắc Giới (5)", id: "rupa-vipaka" }, { title: "Duy Tác Sắc Giới (5)", id: "rupa-kiriya" }] },
  { title: "Tâm Vô Sắc Giới (12)", subGroups: [{ title: "Thiện Vô Sắc Giới (4)", id: "arupa-kusala" }, { title: "Quả Vô Sắc Giới (4)", id: "arupa-vipaka" }, { title: "Duy Tác Vô Sắc Giới (4)", id: "arupa-kiriya" }] },
  { title: "Tâm Siêu Thế Rộng (40)", subGroups: [{ title: "Tâm Đạo (20)", id: "magga" }, { title: "Tâm Quả (20)", id: "phala" }] }
];

const CETASIKA_LAYOUT = [
  { title: "Sở Hữu Tờ Tựa (13)", subGroups: [{ title: "Biến Hành (7)", id: "sabba" }, { title: "Biệt Cảnh (6)", id: "pakinnaka" }] },
  { title: "Sở Hữu Bất Thiện (14)", subGroups: [{ title: "Si Phần (4)", id: "moha-catukka" }, { title: "Tham Phần (3)", id: "lobha-tika" }, { title: "Sân Phần (4)", id: "dosa-catukka" }, { title: "Hôn Trầm-Thụy Miên (2)", id: "thina-middha" }, { title: "Hoài Nghi (1)", id: "vicikiccha" }] },
  { title: "Sở Hữu Tịnh Hảo (25)", subGroups: [{ title: "Tịnh Hảo Biến Hành (19)", id: "sobhana-sadharana" }, { title: "Giới Phần (3)", id: "virati" }, { title: "Vô Lượng (2)", id: "appamanna" }, { title: "Trí Tuệ (1)", id: "panna" }] }
];

const JATI_TYPES = [
  { id: 'akusala', name: 'Bất Thiện' },
  { id: 'kusala', name: 'Thiện' },
  { id: 'vipaka', name: 'Quả' },
  { id: 'kiriya', name: 'Duy Tác' }
];

const AKUSALA_CATEGORIES = [
  { id: 'asava', name: 'Lậu hoặc (4)', cetasikaIds: [14, 18, 19], color: 'rose', desc: '4 pháp bất thiện do không thấy rõ quá khứ, rò rỉ lâu ngày hoặc rỉ ra nơi các cảnh trần như vết thương rỉ mủ, lan tràn và phát sinh cho đến tận cõi Hữu đảnh (Bhavagga) và cõi Vô sắc cao nhất.', names: [
    { name: 'Dục lậu', cetasikaId: 18, desc: 'Sở kiến tham sở thị bám đắm vào ngũ dục.' },
    { name: 'Hữu lậu', cetasikaId: 18, desc: 'Sở kiến tham sở thị bám đắm vào cõi Sắc và Vô sắc (bám đắm trong cảnh thiền định).' },
    { name: 'Kiến lậu', cetasikaId: 19, desc: '62 loại tà kiến (quan điểm sai lầm).' },
    { name: 'Vô minh lậu', cetasikaId: 14, desc: 'Sở kiến si sở thị không biết rõ trong 8 điểm: Tứ diệu đế, ngũ uẩn quá khứ/vị lai, Duyên khởi, v.v.' },
  ]},
  { id: 'ogha', name: 'Bộc lưu (4)', cetasikaIds: [14, 18, 19], color: 'sky', desc: '4 pháp bất thiện giống như dòng nước xiết, chi phối, đè bẹp, lôi cuốn xuống dưới và làm ngập chìm chúng sinh.', names: [
    { name: 'Dục bộc', cetasikaId: 18, desc: 'Tham bám đắm vào ngũ dục — nhấn chìm chúng sinh như dòng nước xiết.' },
    { name: 'Hữu bộc', cetasikaId: 18, desc: 'Tham bám đắm vào các cõi sinh tồn — nhấn chìm chúng sinh như dòng nước xiết.' },
    { name: 'Kiến bộc', cetasikaId: 19, desc: 'Tà kiến (quan điểm sai lầm) — nhấn chìm chúng sinh như dòng nước xiết.' },
    { name: 'Vô minh bộc', cetasikaId: 14, desc: 'Si mê không biết — nhấn chìm chúng sinh như dòng nước xiết.' },
  ]},
  { id: 'yoga', name: 'Ách (4)', cetasikaIds: [14, 18, 19], color: 'cyan', desc: '4 pháp bất thiện trói buộc chúng sinh vào cỗ máy luân hồi đau khổ và trói buộc vào kết quả của ác nghiệp.', names: [
    { name: 'Dục ách', cetasikaId: 18, desc: 'Tham bám đắm vào dục — trói buộc chúng sinh vào vòng luân hồi đau khổ.' },
    { name: 'Hữu ách', cetasikaId: 18, desc: 'Tham bám đắm vào các cõi — trói buộc chúng sinh vào vòng luân hồi đau khổ.' },
    { name: 'Kiến ách', cetasikaId: 19, desc: 'Tà kiến (quan điểm sai lầm) — trói buộc chúng sinh vào vòng luân hồi đau khổ.' },
    { name: 'Vô minh ách', cetasikaId: 14, desc: 'Si mê không biết — trói buộc chúng sinh vào vòng luân hồi đau khổ.' },
  ]},
  { id: 'gantha', name: 'Phược (4)', cetasikaIds: [18, 19, 21], color: 'teal', desc: '4 pháp phược trói buộc, quấn quýt danh thân và sắc thân.', names: [
    { name: 'Tham thân phược', cetasikaId: 18, desc: 'Ái dục (tham) — trói buộc và quấn quýt danh thân và sắc thân.' },
    { name: 'Sân thân phược', cetasikaId: 21, desc: 'Sân hận — trói buộc và quấn quýt thông qua sự ôm ấp oán thù.' },
    { name: 'Giới cấm thủ thân phược', cetasikaId: 19, desc: 'Tà kiến bám chấp rằng có thể được thanh tịnh khỏi luân hồi qua các hạnh như hạnh bò, v.v.' },
    { name: 'Thử thực chấp thân phược', cetasikaId: 19, desc: 'Tà kiến chấp chặt rằng "chỉ có quan điểm của tôi mới đúng".' },
  ]},
  { id: 'upadana', name: 'Thủ (4)', cetasikaIds: [18, 19], color: 'blue', desc: '4 pháp thủ nắm giữ đối tượng một cách mãnh liệt giống như cách con rắn độc nắm chặt con mồi.', names: [
    { name: 'Dục thủ', cetasikaId: 18, desc: 'Dục ái (tham) — nắm giữ chặt chẽ các đối tượng ngũ dục.' },
    { name: 'Kiến thủ', cetasikaId: 19, desc: 'Tà kiến — sự bám giữ vững chắc vào các quan điểm sai lầm.' },
    { name: 'Giới cấm thủ', cetasikaId: 19, desc: 'Tà kiến bám chấp rằng sự thanh tịnh đạt được nhờ các hạnh như giới hạnh loài bò, v.v.' },
    { name: 'Ngã luận thủ', cetasikaId: 19, desc: 'Tà kiến suy diễn và chấp thủ 5 thủ uẩn là tự ngã (attà).' },
  ]},
  { id: 'nivarana', name: 'Triền cái (6)', cetasikaIds: [14, 17, 18, 21, 24, 25, 26, 27], color: 'indigo', desc: '6 pháp triền cái ngăn cản tâm thiện và bao phủ, che lấp con mắt trí tuệ.', names: [
    { name: 'Tham dục triền cái', cetasikaId: 18, desc: 'Sự bám đắm mãnh liệt vào ngũ dục (tham + dục) — ngăn cản thiện pháp.' },
    { name: 'Sân hận triền cái', cetasikaId: 21, desc: 'Sự oán hận, sân — ngăn cản thiện pháp.' },
    { name: 'Hôn trầm thụy miên triền cái', cetasikaId: 25, desc: 'Tâm uể oải, dật dờ (hôn trầm + thụy miên) — ngăn cản thiện pháp.' },
    { name: 'Trào cử hối quá triền cái', cetasikaId: 17, desc: 'Sự bất an, phóng dật và hối hận (trào cử + hối) — ngăn cản thiện pháp.' },
    { name: 'Hoài nghi triền cái', cetasikaId: 27, desc: 'Sự hoài nghi, do dự — ngăn cản thiện pháp.' },
    { name: 'Vô minh triền cái', cetasikaId: 14, desc: 'Si mê không biết — bao phủ con mắt trí tuệ.' },
  ]},
  { id: 'anusaya', name: 'Tùy miên (7)', cetasikaIds: [14, 18, 19, 20, 21, 27], color: 'violet', desc: '7 pháp tùy miên ẩn náu, ngủ ngầm và liên tục tái diễn trong tâm thức chúng sinh vì chưa bị Thánh đạo đoạn trừ.', names: [
    { name: 'Dục tham tùy miên', cetasikaId: 18, desc: 'Sự tham đắm trong ngũ dục — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
    { name: 'Hữu tham tùy miên', cetasikaId: 18, desc: 'Sự tham đắm trong các cõi sinh tồn — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
    { name: 'Sân tùy miên', cetasikaId: 21, desc: 'Sân hận — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
    { name: 'Mạn tùy miên', cetasikaId: 20, desc: 'Kiêu mạn — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
    { name: 'Kiến tùy miên', cetasikaId: 19, desc: 'Tà kiến — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
    { name: 'Hoài nghi tùy miên', cetasikaId: 27, desc: 'Sự hoài nghi — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
    { name: 'Vô minh tùy miên', cetasikaId: 14, desc: 'Si mê không biết — tiếp tục tái diễn nếu chưa bị Thánh đạo đoạn trừ.' },
  ]},
  { id: 'samyojana-suttanta', name: 'Kiết sử theo Kinh điển (10)', cetasikaIds: [14, 17, 18, 19, 20, 21, 27], color: 'fuchsia', desc: '10 pháp kiết sử trói buộc chúng sinh vào nhà tù luân hồi bằng các sợi dây là những đối tượng khác nhau (theo Kinh điển).', names: [
    { name: 'Dục tham kiết sử', cetasikaId: 18, desc: 'Sự tham đắm trong dục — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Sắc tham kiết sử', cetasikaId: 18, desc: 'Sự bám đắm trong cõi Sắc — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Vô sắc tham kiết sử', cetasikaId: 18, desc: 'Sự bám đắm trong cõi Vô sắc — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Sân kiết sử', cetasikaId: 21, desc: 'Sân hận — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Mạn kiết sử', cetasikaId: 20, desc: 'Kiêu mạn — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Kiến kiết sử', cetasikaId: 19, desc: 'Tà kiến — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Giới cấm thủ kiết sử', cetasikaId: 19, desc: 'Tà kiến bám chấp rằng sự thanh tịnh có được nhờ các hạnh như hạnh bò, v.v.' },
    { name: 'Hoài nghi kiết sử', cetasikaId: 27, desc: 'Sự hoài nghi — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Trào cử kiết sử', cetasikaId: 17, desc: 'Sự bất an, phóng dật — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
    { name: 'Vô minh kiết sử', cetasikaId: 14, desc: 'Si mê không biết — trói buộc chúng sinh vào vòng sinh tử luân hồi.' },
  ]},
  { id: 'samyojana-abhidhamma', name: 'Kiết sử theo Vi diệu pháp (10)', cetasikaIds: [14, 18, 19, 20, 21, 22, 23, 27], color: 'purple', desc: '10 pháp kiết sử trói buộc chúng sinh vào vòng luân hồi (theo phương pháp Vi diệu pháp — bao gồm cả Tật và Lận).', names: [
    { name: 'Dục tham kiết sử', cetasikaId: 18, desc: 'Sự tham đắm trong dục (theo phương pháp Vi diệu pháp).' },
    { name: 'Hữu tham kiết sử', cetasikaId: 18, desc: 'Sự tham đắm trong các cõi sinh tồn (theo phương pháp Vi diệu pháp).' },
    { name: 'Sân kiết sử', cetasikaId: 21, desc: 'Sân hận (theo phương pháp Vi diệu pháp).' },
    { name: 'Mạn kiết sử', cetasikaId: 20, desc: 'Kiêu mạn (theo phương pháp Vi diệu pháp).' },
    { name: 'Kiến kiết sử', cetasikaId: 19, desc: 'Tà kiến (theo phương pháp Vi diệu pháp).' },
    { name: 'Giới cấm thủ kiết sử', cetasikaId: 19, desc: 'Tà kiến bám chấp rằng sự thanh tịnh có được qua các hạnh như hạnh bò, v.v. (theo phương pháp Vi diệu pháp).' },
    { name: 'Hoài nghi kiết sử', cetasikaId: 27, desc: 'Sự hoài nghi (theo phương pháp Vi diệu pháp).' },
    { name: 'Tật kiết sử', cetasikaId: 22, desc: 'Sự ganh tị trước sự thành công, thịnh vượng của người khác.' },
    { name: 'Lận kiết sử', cetasikaId: 23, desc: 'Sự keo kiệt, che giấu tài sản của mình và không thể chia sẻ với người khác.' },
    { name: 'Vô minh kiết sử', cetasikaId: 14, desc: 'Si mê không biết (theo phương pháp Vi diệu pháp).' },
  ]},
  { id: 'kilesa', name: 'Phiền não (10)', cetasikaIds: [14, 15, 16, 17, 18, 19, 20, 21, 25, 27], color: 'red', desc: '10 pháp phiền não làm bấn loạn tâm trí, hành hạ và thiêu đốt tâm.', names: [
    { name: 'Tham', cetasikaId: 18, desc: 'Sự bám đắm, chấp thủ ngã và ngã sở — hành hạ và thiêu đốt tâm.' },
    { name: 'Sân', cetasikaId: 21, desc: 'Sự thô lỗ, cứng rắn và hung dữ của tâm — hành hạ và thiêu đốt tâm.' },
    { name: 'Si', cetasikaId: 14, desc: 'Sự không thấu hiểu bản chất thật — hành hạ và thiêu đốt tâm.' },
    { name: 'Mạn', cetasikaId: 20, desc: 'Sự tự đắc, kiêu căng, xem ta hơn người — hành hạ và thiêu đốt tâm.' },
    { name: 'Tà kiến', cetasikaId: 19, desc: 'Quan điểm sai lầm — hành hạ và thiêu đốt tâm.' },
    { name: 'Hoài nghi', cetasikaId: 27, desc: 'Sự hoài nghi, do dự — hành hạ và thiêu đốt tâm.' },
    { name: 'Hôn trầm', cetasikaId: 25, desc: 'Sự uể oải, thụ động của tâm — hành hạ và thiêu đốt tâm.' },
    { name: 'Trào cử', cetasikaId: 17, desc: 'Sự bất an, phóng dật — hành hạ và thiêu đốt tâm.' },
    { name: 'Vô tàm', cetasikaId: 15, desc: 'Sự không hổ thẹn khi làm điều ác — hành hạ và thiêu đốt tâm.' },
    { name: 'Vô quý', cetasikaId: 16, desc: 'Sự không sợ hãi hậu quả của điều ác — hành hạ và thiêu đốt tâm.' },
  ]},
];

// Màu sắc cho từng nhóm bất thiện (nút + hộp nổi)
const AKUSALA_COLOR_MAP = {
  rose:    { active: 'bg-rose-700 text-white border-rose-700',    idle: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
  sky:     { active: 'bg-sky-700 text-white border-sky-700',     idle: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100' },
  cyan:    { active: 'bg-cyan-700 text-white border-cyan-700',    idle: 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100' },
  teal:    { active: 'bg-teal-700 text-white border-teal-700',    idle: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100' },
  blue:    { active: 'bg-blue-700 text-white border-blue-700',    idle: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
  indigo:  { active: 'bg-indigo-700 text-white border-indigo-700', idle: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100' },
  violet:  { active: 'bg-violet-700 text-white border-violet-700', idle: 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100' },
  fuchsia: { active: 'bg-fuchsia-700 text-white border-fuchsia-700', idle: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300 hover:bg-fuchsia-100' },
  purple:  { active: 'bg-purple-700 text-white border-purple-700', idle: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' },
  red:     { active: 'bg-red-700 text-white border-red-700',     idle: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' },
};

const INDRIYA_RUPA_IDS = [5, 6, 7, 8, 9, 14, 15, 17];
const DVIHETU_JAVANA_18_IDS = [1,2,3,4,5,6,7,8, 9,10, 33,34,37,38, 49,50,53,54];
const TIHETU_JAVANA_34_IDS = [
  31,32,35,36, 47,48,51,52, 55,56,57,58,59, 65,66,67,68,69, 70,71,72,73, 78,79,80,81,
  ...Array.from({ length: 40 }, (_, i) => i + 82),
];
const SAHETUKA_JAVANA_52_IDS = [...DVIHETU_JAVANA_18_IDS, ...TIHETU_JAVANA_34_IDS];
const LOKUTTARA_JAVANA_ALL_IDS = Array.from({ length: 40 }, (_, i) => i + 82);
const JAVANA_SOBHANA_IDS = [
  ...Array.from({ length: 8 }, (_, i) => i + 31),
  ...Array.from({ length: 8 }, (_, i) => i + 47), 
  ...Array.from({ length: 5 }, (_, i) => i + 55), 
  ...Array.from({ length: 5 }, (_, i) => i + 65), 
  ...Array.from({ length: 4 }, (_, i) => i + 70), 
  ...Array.from({ length: 4 }, (_, i) => i + 78), 
  ...Array.from({ length: 40 }, (_, i) => i + 82),
];
const MICCHA_MAGGA_CITTA_IDS = Array.from({ length: 12 }, (_, i) => i + 1);
const MICCHA_SAMADHI_CITTA_IDS = MICCHA_MAGGA_CITTA_IDS.filter(id => id !== 11);
const MISSAKA_CATEGORIES = [
  { id: 'hetu6', name: 'Nhân (6)', color: 'rose', cetasikaIds: [18, 21, 14, 32, 33, 52],
    desc: '6 pháp giống như cái rễ cây, làm vững chãi và kiên cố các pháp đồng sinh.',
    names: [
      { name: 'Tham', cetasikaId: 18, desc: 'Sự bám đắm, dính mắc — Bất thiện nhân.' },
      { name: 'Sân', cetasikaId: 21, desc: 'Sự thô lỗ, hung hăng — Bất thiện nhân.' },
      { name: 'Si', cetasikaId: 14, desc: 'Sự không thấu hiểu bản chất thật — Bất thiện nhân.' },
      { name: 'Vô tham', cetasikaId: 32, desc: 'Sự không tham đắm — Thiện / Vô ký nhân.' },
      { name: 'Vô sân', cetasikaId: 33, desc: 'Sự không thô lỗ, sân hận — Thiện / Vô ký nhân.' },
      { name: 'Vô si', cetasikaId: 52, desc: 'Sự thấu hiểu bằng trí tuệ — Thiện / Vô ký nhân.' },
    ]},
  { id: 'jhananga', name: 'Thiền chi (7)', color: 'sky', cetasikaIds: [8, 9, 12, 5, 2],
  excludeCittaIds: Array.from(DVIPANCA_IDS),
    desc: '7 pháp cấu thành thiền định, có khả năng cận kề và quan sát sâu sắc đối tượng.',
    names: [
      { name: 'Tầm', cetasikaId: 8, desc: 'Hướng tâm đặt lên đối tượng (suy nghĩ sơ khởi).' },
      { name: 'Tứ', cetasikaId: 9, desc: 'Sự chiêm nghiệm, xem xét đối tượng lặp đi lặp lại.' },
      { name: 'Hỷ', cetasikaId: 12, desc: 'Sự hoan hỉ, thích thú đối với đối tượng.' },
      { name: 'Nhất tâm', cetasikaId: 5, desc: 'Sự định tĩnh trên một đối tượng duy nhất.' },
      { name: 'Hỷ thọ', cetasikaId: 2, vedanaFilter: 'somanassa', desc: 'Thọ tâm sở — Sự vui mừng xét theo khía cạnh thiện thiền chi.' },
      { name: 'Ưu thọ', cetasikaId: 2, vedanaFilter: 'domanassa', desc: 'Thọ tâm sở — Sự đau khổ trong tâm xét theo khía cạnh bất thiện thiền chi.' },
      { name: 'Xả thọ', cetasikaId: 2, vedanaFilter: 'upekkha', desc: 'Thọ tâm sở — Cảm giác trung tính (không khổ không vui).' },
    ]},
  { id: 'magganga12', name: 'Đạo chi (12)', color: 'cyan', cetasikaIds: [52, 8, 47, 48, 49, 11, 29, 5, 19],
  excludeCittaIds: Array.from({ length: 18 }, (_, i) => i + 13),
    desc: '12 pháp dẫn dắt chúng sinh đi đến cảnh giới an vui, ác thú hoặc Niết-bàn (8 chánh đạo + 4 tà đạo).',
    names: [
      { name: 'Chánh kiến', cetasikaId: 52, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Thấy biết chân chính (trí tuệ).' },
      { name: 'Chánh tư duy', cetasikaId: 8, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Suy nghĩ chân chính (tầm).' },
      { name: 'Chánh ngữ', cetasikaId: 47, desc: 'Lời nói chân chính.' },
      { name: 'Chánh nghiệp', cetasikaId: 48, desc: 'Hành động thân chân chính.' },
      { name: 'Chánh mạng', cetasikaId: 49, desc: 'Sinh kế chân chính.' },
      { name: 'Chánh tinh tấn', cetasikaId: 11, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Tinh tấn chân chính (tinh tấn).' },
      { name: 'Chánh niệm', cetasikaId: 29, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Niệm ghi nhớ chân chính (niệm).' },
      { name: 'Chánh định', cetasikaId: 5, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Sự tập trung tâm chân chính (nhất tâm).' },
      { name: 'Tà kiến', cetasikaId: 19, desc: 'Quan điểm sai lầm (tà kiến) — Đạo chi bất thiện dẫn đến ác thú.' },
      { name: 'Tà tư duy', cetasikaId: 8, cittaIds: MICCHA_MAGGA_CITTA_IDS, desc: 'Sự suy nghĩ (tầm) — Phía bất thiện.' },
      { name: 'Tà tinh tấn', cetasikaId: 11, cittaIds: MICCHA_MAGGA_CITTA_IDS, desc: 'Sự tinh tấn (tinh tấn) — Phía bất thiện.' },
      { name: 'Tà định', cetasikaId: 5, cittaIds: MICCHA_MAGGA_CITTA_IDS, excludeCittaIds: [11], desc: 'Sự định tĩnh (nhất tâm) — Phía bất thiện.' },
    ]},
  { id: 'indriya22', name: 'Quyền (22)', color: 'indigo', cetasikaIds: [6, 28, 11, 29, 5, 52, 2], rupaIds: INDRIYA_RUPA_IDS, allCitta: true,
    desc: '22 pháp có quyền năng chi phối, làm chủ các pháp tương ưng thuộc lĩnh vực của mình.',
    names: [
      { name: 'Nhãn quyền', rupaId: 5, desc: 'Tịnh sắc nhãn (mắt).' },
      { name: 'Nhĩ quyền', rupaId: 6, desc: 'Tịnh sắc nhĩ (tai).' },
      { name: 'Tỷ quyền', rupaId: 7, desc: 'Tịnh sắc tỷ (mũi).' },
      { name: 'Thiệt quyền', rupaId: 8, desc: 'Tịnh sắc thiệt (lưỡi).' },
      { name: 'Thân quyền', rupaId: 9, desc: 'Tịnh sắc thân (thân).' },
      { name: 'Nữ quyền', rupaId: 14, desc: 'Sắc tính nữ (bhāva-rūpa).' },
      { name: 'Nam quyền', rupaId: 15, desc: 'Sắc tính nam (bhāva-rūpa).' },
      { name: 'Mạng quyền', rupaId: 17, desc: 'Sắc mạng quyền (jīvita-rūpa).' },
      { name: 'Ý quyền', allCitta: true, desc: 'Tất cả các tâm (citta) — Quyền làm chủ của thức nhận biết.' },
      { name: 'Lạc quyền', cetasikaId: 2, vedanaFilter: 'sukha', desc: 'Thọ tâm sở — Thân lạc.' },
      { name: 'Khổ quyền', cetasikaId: 2, vedanaFilter: 'dukkha', desc: 'Thọ tâm sở — Thân khổ.' },
      { name: 'Hỷ quyền', cetasikaId: 2, vedanaFilter: 'somanassa', desc: 'Thọ tâm sở — Tâm hỷ (sự vui mừng tinh thần).' },
      { name: 'Ưu quyền', cetasikaId: 2, vedanaFilter: 'domanassa', desc: 'Thọ tâm sở — Tâm ưu (sự phiền muộn tinh thần).' },
      { name: 'Xả quyền', cetasikaId: 2, vedanaFilter: 'upekkha', desc: 'Thọ tâm sở — Cảm giác xả trung tính.' },
      { name: 'Tín quyền', cetasikaId: 28, desc: 'Sự tin tưởng — Tín tâm sở.' },
      { name: 'Tấn quyền', cetasikaId: 11, desc: 'Sự tinh tấn — Tinh tấn tâm sở.' },
      { name: 'Niệm quyền', cetasikaId: 29, desc: 'Sự ghi nhớ — Niệm tâm sở.' },
      { name: 'Định quyền', cetasikaId: 5, excludeCittaIds: [...Array.from(DVIPANCA_IDS), 18, 19, 25, 26, 27, 28, 11], desc: 'Sự định tĩnh — Nhất tâm tâm sở.' },
      { name: 'Tuệ quyền', cetasikaId: 52, desc: 'Sự thấu suốt — Trí tuệ tâm sở.' },
      { name: 'Vô tri trí giả quyền', cetasikaId: 52, cittaIds: [82], desc: 'Trí tuệ — Sự giác ngộ đầu tiên trong Nhập đạo Sơ quả (Sotapatti-magga).' },
      { name: 'Dĩ tri quyền', cetasikaId: 52, cittaIds: [87, 92, 97, 102, 107, 112], desc: 'Trí tuệ — Sự hiểu biết trong 6 giai đoạn trung gian Đạo/Quả tiếp theo.' },
      { name: 'Cụ tri quyền', cetasikaId: 52, cittaIds: [117], desc: 'Trí tuệ — Sự thấu hiểu trọn vẹn trong A-la-hán quả (Arahatta-phala).' },
    ]},
  { id: 'bala9', name: 'Lực (9)', color: 'blue', cetasikaIds: [28, 11, 29, 5, 52, 30, 31, 15, 16],
  excludeCittaIds: [...Array.from(DVIPANCA_IDS), 18, 19, 25, 26, 27, 28],
    desc: '9 pháp kiên cố không bị lung lay trước các pháp đối nghịch.',
    names: [
      { name: 'Tín lực', cetasikaId: 28, desc: 'Đức tin vững chắc.' },
      { name: 'Tấn lực', cetasikaId: 11, desc: 'Sự tinh tấn vững chắc.' },
      { name: 'Niệm lực', cetasikaId: 29, desc: 'Sự ghi nhớ vững chắc.' },
      { name: 'Định lực', cetasikaId: 5, excludeCittaIds: [11], desc: 'Sự định tĩnh vững chắc.' },
      { name: 'Tuệ lực', cetasikaId: 52, desc: 'Trí tuệ vững chắc.' },
      { name: 'Tàm lực', cetasikaId: 30, desc: 'Sự hổ thẹn tội lỗi vững chắc.' },
      { name: 'Quý lực', cetasikaId: 31, desc: 'Sự sợ hãi tội lỗi vững chắc.' },
      { name: 'Vô tàm lực', cetasikaId: 15, desc: 'Sự không hổ thẹn — Sự kiên cố thuộc phe bất thiện.' },
      { name: 'Vô quý lực', cetasikaId: 16, desc: 'Sự không sợ hãi — Sự kiên cố thuộc phe bất thiện.' },
    ]},
  { id: 'adhipati4', name: 'Thượng thủ / Trưởng (4)', color: 'violet', cetasikaIds: [13, 11, 52], allCitta: true,
    desc: '4 pháp đóng vai trò chủ chốt, lãnh đạo và chi phối các pháp có liên quan.',
    names: [
      { name: 'Dục trưởng', cetasikaId: 13, cittaIds: SAHETUKA_JAVANA_52_IDS, desc: 'Sự mong muốn (dục vọng/ý muốn hướng đến) — Đóng vai trò chủ đạo.' },
      { name: 'Cần trưởng', cetasikaId: 11, cittaIds: SAHETUKA_JAVANA_52_IDS, desc: 'Sự tinh tấn — Đóng vai trò chủ đạo.' },
      { name: 'Tâm trưởng', allCitta: true, cittaIds: SAHETUKA_JAVANA_52_IDS, desc: 'Chính tâm (citta) — Đóng vai trò chủ đạo.' },
      { name: 'Thẩm sát trưởng', cetasikaId: 52, cittaIds: TIHETU_JAVANA_34_IDS, desc: 'Trí tuệ (sự khảo sát, suy xét) — Đóng vai trò chủ đạo.' },
    ]},
  { id: 'ahara4', name: 'Thực phẩm / Thực (4)', color: 'amber', cetasikaIds: [1, 4], rupaIds: [18], allCitta: true,
    desc: '4 pháp nuôi dưỡng và duy trì các pháp danh sắc.',
    names: [
      { name: 'Đoản thực', rupaId: 18, desc: 'Vật thực thô (thức ăn) — Nuôi dưỡng sắc thân.' },
      { name: 'Xúc thực', cetasikaId: 1, desc: 'Xúc tâm sở — Nuôi dưỡng 3 loại thọ.' },
      { name: 'Tư niệm thực', cetasikaId: 4, desc: 'Tác ý/Tư tâm sở (nghiệp) — Nuôi dưỡng tái sinh.' },
      { name: 'Thức thực', allCitta: true, desc: 'Tâm tái sinh (citta) — Nuôi dưỡng danh sắc.' },
    ]},
];

// Bodhipakkhiya-sangaha (37 phẩm trợ đạo) - 7 nhóm
const BODHIPAKKHIYA_CATEGORIES = [
  { id: 'satipatthana', name: 'Tứ niệm xứ (4)', color: 'rose', cetasikaIds: [29], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'Sự ghi nhớ, chánh niệm liên tục trên 4 đối tượng (thân, thọ, tâm, pháp) — xét theo khía cạnh niệm tâm sở duy nhất được chia thành 4 loại.',
    names: [
      { name: 'Thân niệm xứ', cetasikaId: 29, desc: 'Liên tục quán sát thân thể dưới khía cạnh bất tịnh.' },
      { name: 'Thọ niệm xứ', cetasikaId: 29, desc: 'Quán sát các cảm thọ (khổ, lạc, xả).' },
      { name: 'Tâm niệm xứ', cetasikaId: 29, desc: 'Quán sát các trạng thái tâm (tâm tham, tâm quảng đại, v.v.).' },
      { name: 'Pháp niệm xứ', cetasikaId: 29, desc: 'Quán sát các pháp (tưởng, hành, v.v.).' },
    ]},
  { id: 'sammappadhana', name: 'Tứ chánh cần (4)', color: 'sky', cetasikaIds: [11], cittaIds: JAVANA_SOBHANA_IDS,
    desc: 'Sự tinh tấn chân chính — xét theo khía cạnh tinh tấn tâm sở duy nhất thực hiện 4 chức năng khác nhau.',
    names: [
      { name: 'Ngăn ngừa ác pháp chưa sinh', cetasikaId: 11, desc: 'Nỗ lực ngăn chặn các bất thiện pháp chưa phát sinh.' },
      { name: 'Đoạn trừ ác pháp đã sinh', cetasikaId: 11, desc: 'Nỗ lực loại bỏ các bất thiện pháp đã khởi sinh.' },
      { name: 'Làm phát sinh thiện pháp chưa sinh', cetasikaId: 11, desc: 'Nỗ lực làm cho các thiện pháp chưa sinh được xuất hiện.' },
      { name: 'Tăng trưởng thiện pháp đã sinh', cetasikaId: 11, desc: 'Nỗ lực bồi đắp, phát triển các thiện pháp đã có.' },
    ]},
  { id: 'iddhipada', name: 'Tứ như ý túc (4)', color: 'cyan', cetasikaIds: [13, 11, 52], cittaIds: JAVANA_SOBHANA_IDS,
    desc: '4 nền tảng thành tựu (cơ sở để đạt được thiền định, đạo quả, siêu năng lực).',
    names: [
      { name: 'Dục như ý túc', cetasikaId: 13, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Dục tâm sở — Sự mong muốn thiết tha làm nền tảng.' },
      { name: 'Tấn như ý túc', cetasikaId: 11, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Tinh tấn tâm sở — Sự nỗ lực làm nền tảng.' },
      { name: 'Tâm như ý túc',  cittaIds: JAVANA_SOBHANA_IDS, desc: 'Tâm (citta) — Bản thân tâm siêu thế làm nền tảng.' },
      { name: 'Tuệ như ý túc', cetasikaId: 52, cittaIds: JAVANA_SOBHANA_IDS, desc: 'Trí tuệ tâm sở — Sự khảo sát, suy xét làm nền tảng.' },
    ]},
  { id: 'indriya5', name: 'Ngũ quyền (5)', color: 'indigo', cetasikaIds: [28, 11, 29, 5, 52], cittaIds: JAVANA_SOBHANA_IDS,
    desc: '5 pháp có quyền năng chi phối các pháp tương ưng (theo phương pháp Phẩm trợ đạo).',
    names: [
      { name: 'Tín quyền', cetasikaId: 28, desc: 'Đức tin tâm sở.' },
      { name: 'Tấn quyền', cetasikaId: 11, desc: 'Tinh tấn tâm sở.' },
      { name: 'Niệm quyền', cetasikaId: 29, desc: 'Niệm tâm sở.' },
      { name: 'Định quyền', cetasikaId: 5, desc: 'Nhất tâm tâm sở (sự định tĩnh).' },
      { name: 'Tuệ quyền', cetasikaId: 52, desc: 'Trí tuệ tâm sở (sự thấu suốt).' },
    ]},
  { id: 'bala5', name: 'Ngũ lực (5)', color: 'blue', cetasikaIds: [28, 11, 29, 5, 52], cittaIds: JAVANA_SOBHANA_IDS,
    desc: '5 pháp kiên cố không bị lung lay trước các pháp đối nghịch (theo phương pháp Phẩm trợ đạo).',
    names: [
      { name: 'Tín lực', cetasikaId: 28, desc: 'Đức tin vững chắc không suyuy chuyển.' },
      { name: 'Tấn lực', cetasikaId: 11, desc: 'Sự tinh tấn vững chắc.' },
      { name: 'Niệm lực', cetasikaId: 29, desc: 'Sự ghi nhớ vững chắc.' },
      { name: 'Định lực', cetasikaId: 5, desc: 'Sự định tĩnh vững chắc.' },
      { name: 'Tuệ lực', cetasikaId: 52, desc: 'Trí tuệ vững chắc.' },
    ]},
  { id: 'bojjhanga', name: 'Thất giác chi (7)', color: 'violet', cetasikaIds: [29, 52, 11, 12, 35, 5, 34], cittaIds: JAVANA_SOBHANA_IDS,
    desc: '7 yếu tố dẫn đến sự giác ngộ chân lý của hành giả tu tập vipassana.',
    names: [
      { name: 'Niệm giác chi', cetasikaId: 29, desc: 'Sự ghi nhớ — Thành phần của trí tuệ giác ngộ.' },
      { name: 'Trạch pháp giác chi', cetasikaId: 52, desc: 'Trí tuệ tu tập phân tích các pháp vô thường, v.v.' },
      { name: 'Tinh tấn giác chi', cetasikaId: 11, desc: 'Tinh tấn tâm sở.' },
      { name: 'Hỷ giác chi', cetasikaId: 12, desc: 'Hỷ tâm sở.' },
      { name: 'Khinh an giác chi', cetasikaId: 35, desc: 'Thân khinh an / Tâm khinh an — Sự tĩnh lặng.' },
      { name: 'Định giác chi', cetasikaId: 5, desc: 'Nhất tâm tâm sở (sự định tĩnh).' },
      { name: 'Xả giác chi', cetasikaId: 34, desc: 'Sự xả trung tính (tư trượng mẫn trượng xả).' },
    ]},
  { id: 'magganga8', name: 'Bát thánh đạo (8)', color: 'fuchsia', cetasikaIds: [52, 8, 47, 48, 49, 11, 29, 5], cittaIds: JAVANA_SOBHANA_IDS,
    desc: '8 chi phần của Thánh đạo đưa đến Niết-bàn (theo phương pháp Phẩm trợ đạo — chỉ gồm 8 chi chánh).',
    names: [
      { name: 'Chánh kiến', cetasikaId: 52, desc: 'Thấy biết chân chính (trí tuệ).' },
      { name: 'Chánh tư duy', cetasikaId: 8, desc: 'Suy nghĩ chân chính (tầm).' },
      { name: 'Chánh ngữ', cetasikaId: 47, desc: 'Lời nói chân chính.' },
      { name: 'Chánh nghiệp', cetasikaId: 48, desc: 'Hành động thân chân chính.' },
      { name: 'Chánh mạng', cetasikaId: 49, desc: 'Sinh kế chân chính.' },
      { name: 'Chánh tinh tấn', cetasikaId: 11, desc: 'Tinh tấn chân chính (tinh tấn).' },
      { name: 'Chánh niệm', cetasikaId: 29, desc: 'Niệm ghi nhớ chân chính (niệm).' },
      { name: 'Chánh định', cetasikaId: 5, desc: 'Sự tập trung tâm chân chính (nhất tâm).' },
    ]},
];

const SANKHARAKKHANDHA_IDS = CETASIKAS.map(ct => ct.id).filter(id => id !== 2 && id !== 3);
const ALL_RUPA_IDS = RUPAS.filter(r => !r.virtual).map(r => r.id); 
const DHAMMAYATANA_SUKHUMA_RUPA_IDS = [2,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28];
const LOKIYA_CITTA_IDS = CITTAS.filter(c => c.id <= 81).map(c => c.id);
const MAGGANGA8_IDS = [52, 8, 47, 48, 49, 11, 29, 5];

const SABBA_KHANDHA = [
  { id: 'rupakkhandha', name: 'Sắc Uẩn (Rūpa)', rupaIds: ALL_RUPA_IDS },
  { id: 'vedanakkhandha', name: 'Thọ Uẩn (Vedanā)', cetasikaIds: [2] },
  { id: 'sannakkhandha', name: 'Tưởng Uẩn (Saññā)', cetasikaIds: [3] },
  { id: 'sankharakkhandha', name: 'Hành Uẩn (Saṅkhāra - 50)', cetasikaIds: SANKHARAKKHANDHA_IDS },
  { id: 'vinnanakkhandha', name: 'Thức Uẩn (Viññāṇa)', cittaIds: ALL_CITTA_IDS },
  { id: 'khandhavimutta', name: 'Khăn-đa-vi-mut-ta', isNibbana: true, note: 'Ni-b็an không có 11 loại nên thoát khỏi số lượng gọi là ngũ uẩn.' },
];
const UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS = [
  ...Array.from({ length: 13 }, (_, i) => i + 1),   // သဗ္ဗစိတ္တသာဓာရဏ(၇)+ပကိဏ္ဏက(၆)
  ...Array.from({ length: 22 }, (_, i) => i + 28),  // သောဘဏသာဓာရဏ(၁၉)+ဝိရတီ(၃)
  52,                                                 // ပညိန္ဒြေ
];
const SABBA_UPADANAKKHANDHA = [
  { id: 'rupupadanakkhandha', name: 'Sắc Thụ Uẩn', rupaIds: ALL_RUPA_IDS },
  { id: 'vedanupadanakkhandha', name: 'Thọ Thụ Uẩn', cetasikaIds: [2], cittaScope: 'lokiya', note: 'Tương ưng với 81 Tâm Thế gian' },
  { id: 'sannupadanakkhandha', name: 'Tưởng Thụ Uẩn', cetasikaIds: [3], cittaScope: 'lokiya', note: 'Tương ưng với 81 Tâm Thế gian' },
  { id: 'sankharupadanakkhandha', name: 'Hành Thụ Uẩn', cetasikaIds: SANKHARAKKHANDHA_IDS, cittaScope: 'lokiya', note: 'Tương ưng với 81 Tâm Thế gian' },
  { id: 'vinnanupadanakkhandha', name: 'Thức Thụ Uẩn', cittaIds: LOKIYA_CITTA_IDS, note: 'Chỉ 81 Tâm Thế gian' },
  { id: 'upadanakkhandhavimutta', name: 'Thoát khỏi Ngũ thủ uẩn (Upādānakkhandhavimutta)', cittaIds: [82,87,92,97,102,107,112,117], cetasikaIds: UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS, isNibbana: true, note: 'Tám tâm siêu thế, ba mươi sáu tâm sở tương ưng và Niết-bàn thoát khỏi các thủ uẩn.' }
];
const SABBA_AYATANA = [
  { id: 'cakkhayatana', name: 'Nhãn Xứ', rupaIds: [5] },
  { id: 'sotayatana', name: 'Nhĩ Xứ', rupaIds: [6] },
  { id: 'ghanayatana', name: 'Tỷ Xứ', rupaIds: [7] },
  { id: 'jivhayatana', name: 'Thiệt Xứ', rupaIds: [8] },
  { id: 'kayayatana', name: 'Thân Xứ', rupaIds: [9] },
  { id: 'manayatana', name: 'Ý Xứ', cittaIds: ALL_CITTA_IDS },
  { id: 'rupayatana', name: 'Sắc Xứ', rupaIds: [10] },
  { id: 'saddayatana', name: 'Thinh Xứ', rupaIds: [11] },
  { id: 'gandhayatana', name: 'Khí Xứ', rupaIds: [12] },
  { id: 'rasayatana', name: 'Vị Xứ', rupaIds: [13] },
  { id: 'photthabbayatana', name: 'Xúc Xứ', rupaIds: [1, 2, 4] },
  { id: 'dhammayatana', name: 'Pháp Xứ', cetasikaIds: CETASIKAS.map(ct => ct.id), rupaIds: DHAMMAYATANA_SUKHUMA_RUPA_IDS, isNibbana: true },
];
const SABBA_DHATU = [
  { id: 'cakkhudhatu', name: 'Nhãn Giới', rupaIds: [5] },
  { id: 'sotadhatu', name: 'Nhĩ Giới', rupaIds: [6] },
  { id: 'ghanadhatu', name: 'Tỷ Giới', rupaIds: [7] },
  { id: 'jivhadhatu', name: 'Thiệt Giới', rupaIds: [8] },
  { id: 'kayadhatu', name: 'Thân Giới', rupaIds: [9] },
  { id: 'manodhatu', name: 'Ý Giới', cittaIds: [28, 18, 25] },
  { id: 'rupadhatu', name: 'Sắc Giới (Cảnh)', rupaIds: [10] },
  { id: 'saddadhatu', name: 'Thinh Giới', rupaIds: [11] },
  { id: 'gandhadhatu', name: 'Khí Giới', rupaIds: [12] },
  { id: 'rasadhatu', name: 'Vị Giới', rupaIds: [13] },
  { id: 'photthabbadhatu', name: 'Xúc Giới', rupaIds: [1, 2, 4] },
  { id: 'dhammadhatu', name: 'Pháp Giới', cetasikaIds: CETASIKAS.map(ct => ct.id), rupaIds: DHAMMAYATANA_SUKHUMA_RUPA_IDS, isNibbana: true },
  { id: 'cakkhuvinnanadhatu', name: 'Nhãn Thức Giới', cittaIds: [13, 20] },
  { id: 'sotavinnanadhatu', name: 'Nhĩ Thức Giới', cittaIds: [14, 21] },
  { id: 'ghanavinnanadhatu', name: 'Tỷ Thức Giới', cittaIds: [15, 22] },
  { id: 'jivhavinnanadhatu', name: 'Thiệt Thức Giới', cittaIds: [16, 23] },
  { id: 'kayavinnanadhatu', name: 'Thân Thức Giới', cittaIds: [17, 24] },
  { id: 'manovinnanadhatu', name: 'Ý Thức Giới', cittaIds: ALL_CITTA_IDS.filter(id => ![13,20,14,21,15,22,16,23,17,24,28,18,25].includes(id)) },
];
const SABBA_SACCA = [
  { id: 'dukkhasacca', name: 'Khổ Đế (Dukkha)', cittaIds: LOKIYA_CITTA_IDS, cetasikaIds: CETASIKAS.map(ct => ct.id).filter(id => id !== 18), rupaIds: ALL_RUPA_IDS },
  { id: 'samudayasacca', name: 'Tập Đế (Samudaya)', cetasikaIds: [18] },
  { id: 'nirodhasacca', name: 'Diệt Đế (Nirodha)', isNibbana: true },
  { id: 'maggasacca', name: 'Đạo Đế (Magga)', cittaIds: CITTAS.filter(c => c.subGroup === 'magga').map(c => c.id), cetasikaIds: MAGGANGA8_IDS },
  { id: 'saccavimutta', name: 'Saccavimutta', cittaIds: LOKUTTARA_JAVANA_ALL_IDS, cetasikaIds: UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS,
    note: 'Các tâm đạo còn lại 29 [= 28 tâm sở (trừ 8 chi đạo) + 1 tâm đạo], các tâm quả 37 [= 36 tâm sở + 1 tâm quả] là những pháp thoát ly khỏi số lượng gọi là Chân lý (Sacca).' },
];
const SABBA_GROUPS = [
  { id: 'khandha', name: 'Uẩn (Khandha - 5)', items: SABBA_KHANDHA },
  { id: 'upadanakkhandha', name: 'Thụ Uẩn (5)', items: SABBA_UPADANAKKHANDHA },
  { id: 'ayatana', name: 'Xứ (Āyatana - 12)', items: SABBA_AYATANA },
  { id: 'dhatu', name: 'Giới (Dhātu - 18)', items: SABBA_DHATU },
  { id: 'sacca', name: 'Đế (Sacca - 4)', items: SABBA_SACCA },
];

const PATICCA_12 = [
  { id: 'avijja', name: 'Vô minh', color: '#ef4444',
    desc: 'Si (Moha) không hiểu biết về 8 khía cạnh như Tứ diệu đế, quá khứ, vị lai, lý duyên khởi, v.v.',
    cetasikaIds: [14] },
  { id: 'sankhara', name: 'Hành', color: '#f97316',
    desc: '29 Tư tâm sở (Cetanā) thiện và bất thiện thuộc Dục/Sắc/Vô sắc giới — Phúc hành, Phi phúc hành, Bất động hành (Ước tính - Tư tâm sở liên quan).',
    cetasikaIds: [4] },
  { id: 'vinnana', name: 'Thức', color: '#f59e0b',
    desc: '19 tâm tục sinh (Paṭisandhi) và 32 tâm quả hiệp thế (Lokiya vipāka) trong thời bình nhật cộng lại gọi là Thức.',
    cittaIds: CITTAS.filter(c => c.type === 'vipaka' && c.id <= 81).map(c => c.id) },
  { id: 'namarupa', name: 'Danh Sắc', color: '#eab308',
    desc: 'Tâm sở (Danh) đồng sinh với tâm quả hiệp thế và Sắc nghiệp (Sắc) hợp lại thành Danh Sắc (Ước tính - Liên kết rộng).',
    cetasikaIds: CETASIKAS.map(c => c.id), rupaIds: KAMMAJA_ALL_IDS },
  { id: 'salayatana', name: 'Lục nhập', color: '#84cc16',
    desc: '6 Nội xứ (Ajjhattikāyatana) — 5 sắc thần kinh (Pasāda rupa) Nhãn/Nhĩ/Tỷ/Thiệt/Thân + Ý xứ (Tâm quả).',
    rupaIds: [5, 6, 7, 8, 9], cittaIds: CITTAS.filter(c => c.type === 'vipaka' && c.id <= 81).map(c => c.id) },
  { id: 'phassa', name: 'Xúc', color: '#22c55e',
    desc: '32 tâm sở Xúc đồng sinh với 32 tâm quả hiệp thế.',
    cetasikaIds: [1] },
  { id: 'vedana', name: 'Thọ', color: '#10b981',
    desc: '32 tâm sở Thọ sinh cùng với Xúc.',
    cetasikaIds: [2] },
  { id: 'tanha', name: 'Ái', color: '#14b8a6',
    desc: 'Sự khát khao, ham thích 6 trần cảnh do Thọ sinh ra (Tâm sở Tham).',
    cetasikaIds: [18] },
  { id: 'upadana', name: 'Thủ', color: '#06b6d4',
    desc: 'Ái lực mạnh mẽ (Dục thủ) và Tà kiến (Kiến thủ, Giới cấm thủ, Ngã luận thủ).',
    cetasikaIds: [18, 19] },
  { id: 'bhava', name: 'Hữu', color: '#3b82f6',
    desc: 'Nghiệp hữu (29 nghiệp dẫn đến tái sinh) và Sinh hữu (Dục/Sắc/Vô sắc hữu) cộng lại thành Hữu (Ước tính - Tư tâm sở liên quan).',
    cetasikaIds: [4] },
  { id: 'jati', name: 'Sinh', color: '#6366f1',
    desc: 'Sự sinh khởi mới của Sắc chân đế (Nipphanna rupa) và Danh uẩn (Ước tính - Liên kết rộng).',
    cittaIds: ALL_CITTA_IDS, cetasikaIds: CETASIKAS.map(c => c.id), rupaIds: ALL_RUPA_IDS },
  { id: 'jaramarana', name: 'Lão Tử', color: '#8b5cf6',
    desc: 'Sự già yếu (Lão) và tan diệt (Tử) của Sắc chân đế, Danh uẩn — Sắc tướng trạng: Lão tính / Vô thường tính.',
    rupaIds: [27, 28] },
];

function polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function paticcaWedgePath(cx, cy, rOuter, rInner, angleStart, angleEnd) {
  const p1 = polarPoint(cx, cy, rOuter, angleStart);
  const p2 = polarPoint(cx, cy, rOuter, angleEnd);
  const p3 = polarPoint(cx, cy, rInner, angleEnd);
  const p4 = polarPoint(cx, cy, rInner, angleStart);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
}
// Đổi hướng cung (arc direction) cho nửa dưới của vòng tròn (6 điểm) để chữ không bị lộn ngược
function paticcaTextArcPath(cx, cy, r, angleStart, angleEnd) {
  const midAngle = ((angleStart + angleEnd) / 2 + 360) % 360;
  const reversed = midAngle > 0 && midAngle < 180;
  const a1 = reversed ? angleEnd : angleStart;
  const a2 = reversed ? angleStart : angleEnd;
  const sweep = reversed ? 0 : 1;
  const p1 = polarPoint(cx, cy, r, a1);
  const p2 = polarPoint(cx, cy, r, a2);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`;
}

function jhanaOffset(id) {
  if (id >= 55 && id <= 59) return id - 55;
  if (id >= 60 && id <= 64) return id - 60;
  if (id >= 65 && id <= 69) return id - 65;
  if (id >= 82 && id <= 101) return (id - 82) % 5;
  if (id >= 102 && id <= 121) return (id - 102) % 5;
  return null;
}

function hasVitakka(id) {
  if (id <= 12) return true;
  if (DVIPANCA_IDS.has(id)) return false;
  if (id <= 30) return true;
  if (id <= 54) return true;
  if (id >= 70 && id <= 81) return false;
  const off = jhanaOffset(id);
  return off === 0;
}

function hasVicara(id) {
  if (hasVitakka(id)) return true;
  if (id >= 70 && id <= 81) return false;
  return jhanaOffset(id) === 1;
}

function hasAdhimokkha(id) {
  if (id === 11) return false;
  if (DVIPANCA_IDS.has(id)) return false;
  return true;
}

function hasViriya(id) {
  if (DVIPANCA_IDS.has(id)) return false;
  if ([18, 19, 25, 26, 27, 28].includes(id)) return false;
  return true;
}

function hasPiti(id) {
  if ([1, 2, 3, 4].includes(id)) return true;
  if (id === 26 || id === 30) return true;
  if (id >= 31 && id <= 54) {
    const c = CITTAS.find(x => x.id === id);
    return c ? getCittaVedana(c) === 'somanassa' : false;
  }
  if (id >= 70 && id <= 81) return false;
  const off = jhanaOffset(id);
  return off !== null && off <= 2;
}

function hasChanda(id) {
  if (id <= 10) return true;
  if (id === 11 || id === 12) return false;
  if (id <= 30) return false;
  return true;
}

const AHETUKA_SUBGROUPS = ['akusala-vipaka', 'kusala-vipaka', 'ahetuka-kiriya'];

const CITTA_SIDE_BASE_TYPES = ['jati', 'vedana', 'hetu', 'kicca', 'dvara', 'arammana', 'vatthu', 'citta-subgroup', 'ahetuka-context', 'citta-multi', 'vithi-citta-subgroup', 'akusala-cat', 'akusala-name', 'missaka-cat', 'missaka-name', 'bodhi-cat', 'bodhi-name', 'sabba-group', 'cittaja-rupa', 'puggala', 'suti-pati'];
const CETASIKA_SIDE_BASE_TYPES = ['cetasika-subgroup'];

const VEDANA_COLOR_HEX = {
  somanassa: '#f59e0b',
  domanassa: '#e11d48',
  sukha: '#10b981',
  dukkha: '#7c3aed',
  upekkha: '#64748b',
};

function getCittaMarkers(id) {
  if (id >= 1 && id <= 8) {
    const idx = (id - 1) % 8;
    return { sampayutta: (idx % 4 < 2) ? true : null, asankharika: idx % 2 === 0 };
  }
  if (id === 9 || id === 10) {
    return { sampayutta: null, asankharika: (id - 9) % 2 === 0 };
  }
  if (id >= 31 && id <= 54) {
    const start = id <= 38 ? 31 : (id <= 46 ? 39 : 47);
    const idx = (id - start) % 8;
    return { sampayutta: (idx % 4 < 2) ? true : null, asankharika: idx % 2 === 0 };
  }
  return { sampayutta: null, asankharika: null };
}

function checkAssociation(cId, ctId) {
  if (ctId >= 1 && ctId <= 7) return true;

  if (ctId === 8) return hasVitakka(cId);
  if (ctId === 9) return hasVicara(cId);
  if (ctId === 10) return hasAdhimokkha(cId);
  if (ctId === 11) return hasViriya(cId);
  if (ctId === 12) return hasPiti(cId);
  if (ctId === 13) return hasChanda(cId);

  if (ctId >= 14 && ctId <= 27) {
      if (cId > 12) return false;
      if (ctId >= 14 && ctId <= 17) return true;
      if (ctId === 18) return cId >= 1 && cId <= 8;
      if (ctId === 19) return [1, 2, 5, 6].includes(cId);
      if (ctId === 20) return [3, 4, 7, 8].includes(cId);
      if (ctId >= 21 && ctId <= 24) return cId === 9 || cId === 10;
      if (ctId === 25 || ctId === 26) return [2, 4, 6, 8, 10].includes(cId);
      if (ctId === 27) return cId === 11;
      return false;
  }

  if (ctId >= 28 && ctId <= 52) {
      if (cId < 31) return false; 
      if (ctId >= 28 && ctId <= 46) return true; // သောဘနသာဓာရဏ
      if (ctId >= 47 && ctId <= 49) return (cId >= 31 && cId <= 38) || (cId >= 82); // ဝိရတီ
      if (ctId === 50 || ctId === 51) { // အပ္ပမညာ
          if (cId >= 31 && cId <= 38) return true; // မဟာကုသိုလ်
          if (cId >= 47 && cId <= 54) return true; // မဟာကြိယာ
          if ((cId >= 55 && cId <= 59) || (cId >= 65 && cId <= 69)) { // ရူပကုသိုလ်/ရူပကြိယာသာ (ရူပဝိပါက် 60-64 ကို ထုတ်ထား)
              const off = jhanaOffset(cId);
              return off !== null && off <= 3; // ပဉ္စမဈာန်ကို ထုတ်ထား
          }
          return false;
      }
      if (ctId === 52) {
          const kamaNana = [31,32,35,36, 39,40,43,44, 47,48,51,52]; 
          if (kamaNana.includes(cId)) return true;
          if (cId >= 55) return true; 
          return false;
      }
  }
  return false;
}

export default function App({ initialPage = null, onPageChange = null } = {}) {
  const [filter, setFilter] = useState({ type: 'none', value: null });
  const [nanakadaciMode, setNanakadaciMode] = useState(null);
  const [cittaContext, setCittaContext] = useState(null);
  const [saccaVimuttaFocus, setSaccaVimuttaFocus] = useState(null);
  const [viratiCycleIndex, setViratiCycleIndex] = useState(0);
  const [activeDetail, setActiveDetail] = useState({ name: "", desc: "" });
  const [tooltipPos, setTooltipPos] = useState(null);
  const [lokuttaraExpanded, setLokuttaraExpanded] = useState(false);
  const [detailPick, setDetailPick] = useState(null);
  const [openMenu, setOpenMenu] = useState(() => initialPage?.openMenu ?? null);
  const [akusalaGroupIdx, setAkusalaGroupIdx] = useState(() => initialPage?.akusalaGroupIdx ?? null);
  const [missakaGroupIdx, setMissakaGroupIdx] = useState(() => initialPage?.missakaGroupIdx ?? null);
  const [bodhiGroupIdx, setBodhiGroupIdx] = useState(() => initialPage?.bodhiGroupIdx ?? null);
  const [photthabbaOn, setPhotthabbaOn] = useState(false);
  const [selectedKalapa, setSelectedKalapa] = useState(null);
  const [selectedSamutthana, setSelectedSamutthana] = useState(null);
  const [rupaTooltip, setRupaTooltip] = useState(null);

  const [vithiOpen, setVithiOpen] = useState(() => initialPage?.vithiOpen ?? false);
  const [bhumiOpen, setBhumiOpen] = useState(() => initialPage?.bhumiOpen ?? false);
  const [selectedBhumiItem, setSelectedBhumiItem] = useState(null);
  const [bhumiPos, setBhumiPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(8, window.innerWidth / 2 - 320) : 100,
    y: typeof window !== 'undefined' ? Math.max(8, window.innerHeight / 2 - 300) : 60,
  }));
  const bhumiDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const handleBhumiDragMove = (e) => {
    if (!bhumiDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setBhumiPos({ x: clientX - bhumiDrag.current.offsetX, y: clientY - bhumiDrag.current.offsetY });
  };
  const handleBhumiDragEnd = () => {
    bhumiDrag.current.dragging = false;
    window.removeEventListener('mousemove', handleBhumiDragMove);
    window.removeEventListener('mouseup', handleBhumiDragEnd);
    window.removeEventListener('touchmove', handleBhumiDragMove);
    window.removeEventListener('touchend', handleBhumiDragEnd);
  };
  const handleBhumiDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    bhumiDrag.current = { dragging: true, offsetX: clientX - bhumiPos.x, offsetY: clientY - bhumiPos.y };
    window.addEventListener('mousemove', handleBhumiDragMove);
    window.addEventListener('mouseup', handleBhumiDragEnd);
    window.addEventListener('touchmove', handleBhumiDragMove, { passive: false });
    window.addEventListener('touchend', handleBhumiDragEnd);
  };
  const [paticcaOpen, setPaticcaOpen] = useState(() => initialPage?.paticcaOpen ?? false);
  const [selectedPaticcaId, setSelectedPaticcaId] = useState(null);

  // Reports the current top-level "page" up to the language-switcher wrapper
  // so it can be fed back in as `initialPage` on a language switch. See the
  // matching comment in src/Paramattha1App.jsx for why `filter` and the
  // drill-in selection states are deliberately excluded.
  useEffect(() => {
    onPageChange?.({ openMenu, akusalaGroupIdx, missakaGroupIdx, bodhiGroupIdx, vithiOpen, bhumiOpen, paticcaOpen });
  }, [openMenu, akusalaGroupIdx, missakaGroupIdx, bodhiGroupIdx, vithiOpen, bhumiOpen, paticcaOpen]);
  const [paticcaPos, setPaticcaPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(8, window.innerWidth / 2 - 200) : 100,
    y: typeof window !== 'undefined' ? Math.max(8, window.innerHeight / 2 - 220) : 60,
  }));
  const paticcaDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const handlePaticcaDragMove = (e) => {
    if (!paticcaDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPaticcaPos({ x: clientX - paticcaDrag.current.offsetX, y: clientY - paticcaDrag.current.offsetY });
  };
  const handlePaticcaDragEnd = () => {
    paticcaDrag.current.dragging = false;
    window.removeEventListener('mousemove', handlePaticcaDragMove);
    window.removeEventListener('mouseup', handlePaticcaDragEnd);
    window.removeEventListener('touchmove', handlePaticcaDragMove);
    window.removeEventListener('touchend', handlePaticcaDragEnd);
  };
  const handlePaticcaDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    paticcaDrag.current = { dragging: true, offsetX: clientX - paticcaPos.x, offsetY: clientY - paticcaPos.y };
    window.addEventListener('mousemove', handlePaticcaDragMove);
    window.addEventListener('mouseup', handlePaticcaDragEnd);
    window.addEventListener('touchmove', handlePaticcaDragMove, { passive: false });
    window.addEventListener('touchend', handlePaticcaDragEnd);
  };
  const [vithiPos, setVithiPos] = useState({ x: 16, y: 90 });
  const vithiDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });

  const vithiScrollRef = useRef(null);
  const vithiItemRefs = useRef([]);
  const [vithiCenterGroup, setVithiCenterGroup] = useState('');
  const [vithiClickLabel, setVithiClickLabel] = useState(null);
  const [pancaVariantIdx, setPancaVariantIdx] = useState(0);
  const [pancaDoorIdx, setPancaDoorIdx] = useState(0);
  const [manoTypeIdx, setManoTypeIdx] = useState(0);
  const [manoVariantIdx, setManoVariantIdx] = useState(0);
  const [vithiActiveIdx, setVithiActiveIdx] = useState(null);

  const updateVithiCenterGroup = () => {
    const container = vithiScrollRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    let closestIdx = null, closestDist = Infinity;
    vithiItemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - centerX);
      if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
    });
    if (closestIdx !== null && LIFE_VITHI[closestIdx]) setVithiCenterGroup(LIFE_VITHI[closestIdx].group || '');
    setVithiClickLabel(null);
    setVithiActiveIdx(null);
  };
  useEffect(() => {
    if (vithiOpen) {
      const t = setTimeout(updateVithiCenterGroup, 60);
      return () => clearTimeout(t);
    }
  }, [vithiOpen]);

  const LIFE_VITHI = [
    ...LIFE_VITHI_BIRTH.map(item => ({ ...item, segment: 'birth' })),
    ...buildPancaSection(pancaVariantIdx, pancaDoorIdx).map(item => ({ ...item, segment: 'panca' })),
    ...buildGap(`${VITHI_GROUPS.life} (Giữa Lộ Ngũ Môn & Lộ Ý Môn)`).map(item => ({ ...item, segment: 'gap' })),
    ...buildManoSection(manoTypeIdx, manoVariantIdx).map(item => ({ ...item, segment: 'mano' })),
    ...buildGap(`${VITHI_GROUPS.life} (Giữa Lộ Ý Môn & Cận Tử)`).map(item => ({ ...item, segment: 'gap' })),
    ...LIFE_VITHI_DEATH.map(item => ({ ...item, segment: 'death' })),
  ];

  const tooltipTimerRef = useRef(null);

  const navWidgetRef = useRef(null);
  const [navPos, setNavPos] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth / 2 - 100) : 300,
    y: 72,
  }));
  const navDrag = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const handleNavDragMove = (e) => {
    if (!navDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setNavPos({ x: clientX - navDrag.current.offsetX, y: clientY - navDrag.current.offsetY });
  };
  const handleNavDragEnd = () => {
    navDrag.current.dragging = false;
    window.removeEventListener('mousemove', handleNavDragMove);
    window.removeEventListener('mouseup', handleNavDragEnd);
    window.removeEventListener('touchmove', handleNavDragMove);
    window.removeEventListener('touchend', handleNavDragEnd);
  };
  const handleNavDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    navDrag.current = { dragging: true, offsetX: clientX - navPos.x, offsetY: clientY - navPos.y };
    window.addEventListener('mousemove', handleNavDragMove);
    window.addEventListener('mouseup', handleNavDragEnd);
    window.addEventListener('touchmove', handleNavDragMove, { passive: false });
    window.addEventListener('touchend', handleNavDragEnd);
  };

  const handleVithiDragMove = (e) => {
    if (!vithiDrag.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setVithiPos({ x: clientX - vithiDrag.current.offsetX, y: clientY - vithiDrag.current.offsetY });
  };
  const handleVithiDragEnd = () => {
    vithiDrag.current.dragging = false;
    window.removeEventListener('mousemove', handleVithiDragMove);
    window.removeEventListener('mouseup', handleVithiDragEnd);
    window.removeEventListener('touchmove', handleVithiDragMove);
    window.removeEventListener('touchend', handleVithiDragEnd);
  };
  const handleVithiDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    vithiDrag.current = { dragging: true, offsetX: clientX - vithiPos.x, offsetY: clientY - vithiPos.y };
    window.addEventListener('mousemove', handleVithiDragMove);
    window.addEventListener('mouseup', handleVithiDragEnd);
    window.addEventListener('touchmove', handleVithiDragMove, { passive: false });
    window.addEventListener('touchend', handleVithiDragEnd);
  };

 // Mỗi khi mở panel Vithi, hiển thị ở chính giữa phần dưới của màn hình (sau đó người dùng có thể kéo đi)
  const openVithiPanel = () => {
    if (typeof window !== 'undefined') {
      const w = Math.min(1500, window.innerWidth * 0.95);
      const h = 170;
      setVithiPos({ x: Math.max(8, (window.innerWidth - w) / 2), y: Math.max(8, window.innerHeight - h - 24) });
    }
    setVithiOpen(true);
  };

  // Event Handlers
  const toggleFilter = (type, value, itemDetail = { name: "", desc: "" }, rect = null) => {
    setNanakadaciMode(null);
    setSaccaVimuttaFocus(null);
    setViratiCycleIndex(0);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setSelectedSamutthana(null);
    setAkusalaGroupIdx(null);
    if (type === 'citta') {
      // citta ကို ပြန်ပယ်မလား (deselect) / အသစ်ရွေးမလား ဆိုတာအလိုက် context ကို update လုပ်သည်
      if (filter.type === 'citta' && filter.value === value) setCittaContext(null);
      else setCittaContext(value);
    }
    setFilter(prev => {
      if (prev.type === type && prev.value === value) {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        return { type: 'none', value: null };
      } else {
        if (itemDetail.name) {
          setActiveDetail(itemDetail);
          tooltipTimerRef.current = setTimeout(() => {
            setActiveDetail({ name: "", desc: "" });
            setTooltipPos(null);
          }, 3000);
        }
        setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
        return { type, value };
      }
    });
  };

  const handleGroupToggle = (type, subGroupValue, groupTitle, rect) => {
    toggleFilter(type, subGroupValue, { name: `Nhóm - ${groupTitle}`, desc: "" }, rect);
  };
  
  function handleMagganggaCittaClick(cId, itemDetail, rect) {
    const isMagganggaVimuttaActive = (filter.type === 'missaka-cat' && filter.value === 'magganga12') || (filter.type === 'bodhi-cat' && filter.value === 'magganga8');
    if (!isMagganggaVimuttaActive || !MAHA_KUSALA_8_IDS.includes(cId) || cittaContext !== cId) return false;
    const nextIdx = (viratiCycleIndex + 1) % VIRATI_CYCLE_STATES.length;
    setViratiCycleIndex(nextIdx);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setActiveDetail({ name: `${itemDetail.name} — ${VIRATI_CYCLE_STATES[nextIdx].label}`, desc: '' });
    setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
    tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
    return true;
  }

  function handleLokuttaraClick(cId, itemDetail, rect) {
    const isSaccaVimuttaActive = filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta';
    if (!isSaccaVimuttaActive) return;
    if (saccaVimuttaFocus && saccaVimuttaFocus.cittaId === cId) {
      setSaccaVimuttaFocus(null);
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: filter.value.name, desc: filter.value.note || '' });
      setTooltipPos(null);
      return;
    }
    const isMagga = cId <= 101;
    setSaccaVimuttaFocus({ cittaId: cId });
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setActiveDetail({
      name: `${itemDetail.name} — ${isMagga ? 'Ngoại trừ Thánh đạo (8), còn lại 28 tâm sở' : 'Toàn bộ 36 tâm sở'}`,
      desc: '',
    });
    setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
  }

  function handleCittaLongPress(cId, itemDetail, rect) {
    const key = getNanakadaciConfig(cId);
    if (!key) return;
    if (nanakadaciMode && nanakadaciMode.cittaId === cId) {
      setNanakadaciMode(null);
      clearFilter();
      return;
    }
    setNanakadaciMode({ cittaId: cId, key, stateIndex: 0 });
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setSelectedSamutthana(null);
    setAkusalaGroupIdx(null);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    const st = NANAKADACI_CONFIG[key].states[0];
    setActiveDetail({ name: `${itemDetail.name} — ${st.label}`, desc: '' });
    setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
    setFilter({ type: 'citta', value: cId });
  }

  // Khi đang chọn các nút như "Loại tâm/Bất thiện/Thọ..." mà bấm lại lần nữa thì làm mới (refresh) bảng về trạng thái ban đầu
  const clearFilter = () => {
    setNanakadaciMode(null);
    setSaccaVimuttaFocus(null);
    setViratiCycleIndex(0);
    setCittaContext(null);
    setFilter({ type: 'none', value: null });
    setActiveDetail({ name: "", desc: "" });
    setTooltipPos(null);
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setSelectedSamutthana(null);
    setSelectedBhumiItem(null);
    setAkusalaGroupIdx(null);
    setSelectedPaticcaId(null);
  };

  // Handler được sử dụng khi bấm vào một chấm Citta/Cetasika — khi đang có bộ lọc "base" (như jati, v.v.)
  // thì hoàn toàn không thay đổi bộ lọc mà chỉ bật/tắt (toggle) detailPick (không làm mất hình dạng cơ bản của base)
  // Nếu chưa có bộ lọc base thì thực hiện lọc trực tiếp như trước đây
  const selectDetail = (type, id, itemDetail, rect) => {
    if (type === 'citta' && nanakadaciMode && nanakadaciMode.cittaId === id) {
      const cfg = NANAKADACI_CONFIG[nanakadaciMode.key];
      const nextIdx = (nanakadaciMode.stateIndex + 1) % cfg.states.length;
      setNanakadaciMode({ ...nanakadaciMode, stateIndex: nextIdx });
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: `${itemDetail.name} — ${cfg.states[nextIdx].label}`, desc: '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      return;
    }
    const isBaseActive = filter.type !== 'none' && filter.type !== 'citta' && filter.type !== 'cetasika';
    if (!isBaseActive) {
      setDetailPick(null);
      toggleFilter(type, id, itemDetail, rect);
      return;
    }
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setVithiActiveIdx(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    setDetailPick(prev => {
      if (prev && prev.type === type && prev.id === id) {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        return null;
      }
      setActiveDetail(itemDetail);
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      return { type, id };
    });
  };

  // Dành cho các Dropdown (<select>) - để thiết lập giá trị trực tiếp
  const setFilterDirect = (type, rawValue, item, rect = null) => {
    setNanakadaciMode(null);
    setSaccaVimuttaFocus(null);
    setViratiCycleIndex(0);
    setVithiActiveIdx(null);
    setDetailPick(null);
    setOpenMenu(null);
    setPhotthabbaOn(false);
    setSelectedKalapa(null);
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    if (rawValue === '' || !item) {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: "", desc: "" });
      setTooltipPos(null);
      return;
    }
    const value = (type === 'hetu' || type === 'kicca' || type === 'dvara' || type === 'vatthu') ? parseInt(rawValue, 10) : rawValue;
    if (filter.type === type && filter.value === value) {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: "", desc: "" });
      setTooltipPos(null);
      return;
    }
    const labelPrefix = type === 'vedana' ? 'Thọ' : type === 'hetu' ? 'Nhân' : type === 'kicca' ? 'Phận sự' : type === 'dvara' ? 'Môn' : type === 'arammana' ? 'Cảnh' : 'Vật';
    setActiveDetail({ name: `${labelPrefix} - ${item.name}`, desc: "" });
    if (rect) {
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    } else {
      setTooltipPos(null);
    }
    setFilter({ type, value });
  };
  // Wrapper cho DropButton khi gọi setFilterDirect chỉ với 2 tham số (id, item)
  const setFilterDirectSimple = (type, id, item, rect) => setFilterDirect(type, String(id), item, rect);
  // Duyệt xem trước/sau các mục đã chọn (jati/akusala-cat/.../citta/cetasika/sabba-detail) trong danh sách ở bên cạnh
  function getNavContext() {
    if (detailPick) return null;
    if (selectedKalapa) {
      const grp = KALAPA_GROUPS.find(g => g.items.some(it => it.id === selectedKalapa.id));
      if (grp) {
        const idx = grp.items.findIndex(it => it.id === selectedKalapa.id);
        if (idx !== -1) {
          return {
            list: grp.items, idx,
            apply: (it, rect) => {
              setFilter({ type: 'none', value: null });
              setActiveDetail({ name: it.name, desc: '' });
              setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
              setVithiActiveIdx(null);
              setDetailPick(null);
              setPhotthabbaOn(false);
              setSelectedKalapa(it);
            },
          };
        }
      }
    }
    const t = filter.type;
    if (t === 'cittaja-rupa') {
      const idx = CITTAJA_RUPA_TYPES.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: CITTAJA_RUPA_TYPES, idx, apply: (it, rect) => toggleFilter('cittaja-rupa', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'jati') {
      const idx = JATI_TYPES.findIndex(j => j.id === filter.value);
      return idx === -1 ? null : { list: JATI_TYPES, idx, apply: (it, rect) => toggleFilter('jati', it.id, { name: `Loại - tâm ${it.name}`, desc: '' }, rect) };
    }
    if (t === 'puggala') {
      const idx = PUGGALA_CITTA_TYPES.findIndex(p => p.id === filter.value);
      return idx === -1 ? null : { list: PUGGALA_CITTA_TYPES, idx, apply: (it, rect) => toggleFilter('puggala', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'suti-pati') {
      const idx = SUTI_PATI_TYPES.findIndex(p => p.id === filter.value);
      return idx === -1 ? null : { list: SUTI_PATI_TYPES, idx, apply: (it, rect) => toggleFilter('suti-pati', it.id, { name: it.name, desc: it.note || '' }, rect) };
    }
    if (t === 'akusala-cat') {
      const idx = akusalaCategoryOptions.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: akusalaCategoryOptions, idx, apply: (it, rect) => toggleFilter('akusala-cat', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'akusala-name') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value.catId);
      if (!cat) return null;
      const visibleList = cat.names.filter(nm => selectedCittaId === null || checkAssociation(selectedCittaId, nm.cetasikaId));
      const idx = visibleList.indexOf(cat.names[filter.value.index]);
      if (idx === -1) return null;
      return {
        list: visibleList, idx,
        apply: (nm, rect) => {
          if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
          setActiveDetail({ name: nm.name, desc: nm.desc || '' });
          setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
          setVithiActiveIdx(null);
          setDetailPick(null);
          setOpenMenu(null);
          setFilter({ type: 'akusala-name', value: { catId: cat.id, index: cat.names.indexOf(nm) } });
        },
      };
    }
    if (t === 'missaka-cat') {
      const idx = missakaCategoryOptions.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: missakaCategoryOptions, idx, apply: (it, rect) => toggleFilter('missaka-cat', it.id, { name: it.name, desc: it.note || '' }, rect) };
    }
    if (t === 'missaka-name') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
      if (!cat) return null;
      const visibleList = cat.names.filter(nm => {
        if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
        if (cat.id === 'magganga12' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
          return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
        }
        return true;
      });
      const idx = visibleList.indexOf(cat.names[filter.value.index]);
      if (idx === -1) return null;
      return {
        list: visibleList, idx,
        apply: (nm, rect) => {
          if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
          setActiveDetail({ name: nm.name, desc: nm.desc || '' });
          setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
          setVithiActiveIdx(null);
          setDetailPick(null);
          setOpenMenu(null);
          setFilter({ type: 'missaka-name', value: { catId: cat.id, index: cat.names.indexOf(nm) } });
        },
      };
    }
    if (t === 'bodhi-cat') {
      const idx = bodhiCategoryOptions.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: bodhiCategoryOptions, idx, apply: (it, rect) => toggleFilter('bodhi-cat', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'bodhi-name') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value.catId);
      if (!cat) return null;
      const visibleList = cat.names.filter(nm => {
        if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
        if (cat.id === 'magganga8' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
          return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
        }
        return true;
      });
      const idx = visibleList.indexOf(cat.names[filter.value.index]);
      if (idx === -1) return null;
      return {
        list: visibleList, idx,
        apply: (nm, rect) => {
          if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
          setActiveDetail({ name: nm.name, desc: nm.desc || '' });
          setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
          setVithiActiveIdx(null);
          setDetailPick(null);
          setOpenMenu(null);
          setFilter({ type: 'bodhi-name', value: { catId: cat.id, index: cat.names.indexOf(nm) } });
        },
      };
    }
    if (t === 'vedana') {
      const idx = VEDANA_TYPES.findIndex(v => v.id === filter.value);
      return idx === -1 ? null : { list: VEDANA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('vedana', it.id, it, rect) };
    }
    if (t === 'hetu') {
      const idx = HETU_TYPES.findIndex(h => h.id === filter.value);
      return idx === -1 ? null : { list: HETU_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('hetu', it.id, it, rect) };
    }
    if (t === 'kicca') {
      const idx = KICCA_TYPES.findIndex(k => k.id === filter.value);
      return idx === -1 ? null : { list: KICCA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('kicca', it.id, it, rect) };
    }
    if (t === 'dvara') {
      const idx = DVARA_TYPES.findIndex(d => d.id === filter.value);
      return idx === -1 ? null : { list: DVARA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('dvara', it.id, it, rect) };
    }
    if (t === 'arammana') {
      const idx = ARAMMANA_TYPES.findIndex(a => a.id === filter.value);
      return idx === -1 ? null : { list: ARAMMANA_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('arammana', it.id, it, rect) };
    }
    if (t === 'vatthu') {
      const idx = VATTHU_TYPES.findIndex(v => v.id === filter.value);
      return idx === -1 ? null : { list: VATTHU_TYPES, idx, apply: (it, rect) => setFilterDirectSimple('vatthu', it.id, it, rect) };
    }
    if (t === 'sabba-detail') {
      const grp = SABBA_GROUPS.find(g => g.items.some(it => it.id === filter.value.id));
      if (!grp) return null;
      const idx = grp.items.findIndex(it => it.id === filter.value.id);
      return idx === -1 ? null : { list: grp.items, idx, apply: (it, rect) => toggleFilter('sabba-detail', it, { name: it.name, desc: it.note || '' }, rect) };
    }
    if (t === 'citta') {
      const idx = CITTAS.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: CITTAS, idx, apply: (it, rect) => toggleFilter('citta', it.id, { name: it.name, desc: '' }, rect) };
    }
    if (t === 'cetasika') {
      const idx = CETASIKAS.findIndex(c => c.id === filter.value);
      return idx === -1 ? null : { list: CETASIKAS, idx, apply: (it, rect) => toggleFilter('cetasika', it.id, { name: it.name, desc: it.desc || '' }, rect) };
    }
    return null;
  }
  function navPrev() {
    const ctx = getNavContext();
    if (!ctx) return;
    const n = ctx.list.length;
    const rect = navWidgetRef.current ? navWidgetRef.current.getBoundingClientRect() : null;
    ctx.apply(ctx.list[(ctx.idx - 1 + n) % n], rect);
  }
  function navNext() {
    const ctx = getNavContext();
    if (!ctx) return;
    const n = ctx.list.length;
    const rect = navWidgetRef.current ? navWidgetRef.current.getBoundingClientRect() : null;
    ctx.apply(ctx.list[(ctx.idx + 1) % n], rect);
  }
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const ctx = getNavContext();
      if (!ctx) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') navPrev(); else navNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filter, detailPick]);

  // State Checks
  const isCittaActive = (cId) => {
    if (filter.type === 'none') return true;
    
    // Khi có bộ lọc "base" (cetasika-subgroup), nếu nhấn vào một chấm cetasika, phần citta sẽ được thu gọn/drill-down
    // chỉ hiển thị những tâm tương ứng với cetasika đó (không ảnh hưởng đến các phần ngoài phạm vi hình dạng của panel citta)
    if (detailPick && detailPick.type === 'cetasika' && CETASIKA_SIDE_BASE_TYPES.includes(filter.type)) {
      return checkAssociation(cId, detailPick.id);
    }
    if (filter.type === 'citta') return filter.value === cId;
    if (filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta' && saccaVimuttaFocus) {
      return cId === saccaVimuttaFocus.cittaId;
    }
    if (filter.type === 'cetasika') return checkAssociation(cId, filter.value);
    if (filter.type === 'citta-subgroup') return CITTAS.find(c => c.id === cId).subGroup === filter.value;
    if (filter.type === 'cetasika-subgroup') {
      return CETASIKAS.filter(ct => ct.subGroup === filter.value).some(ct => checkAssociation(cId, ct.id));
    }
    if (filter.type === 'jati') return CITTAS.find(c => c.id === cId).type === filter.value;
    if (filter.type === 'vedana') {
      const c = CITTAS.find(c => c.id === cId) || LOKUTTARA_8.find(c => c.id === cId);
      return c ? getCittaVedana(c) === filter.value : false;
    }
    if (filter.type === 'hetu') return getHetuCount(cId) === filter.value;
    if (filter.type === 'kicca') return getCittaKiccas(cId).includes(filter.value);
    if (filter.type === 'dvara') return getCittaDvaras(cId).includes(filter.value);
    if (filter.type === 'arammana') return getCittaArammana(cId).includes(filter.value);
    if (filter.type === 'vatthu') return getCittaVatthu(cId).includes(filter.value);
    if (filter.type === 'citta-multi') return filter.value.includes(cId);
    if (filter.type === 'ahetuka-context') {
      const ids = Array.isArray(filter.value) ? filter.value : [filter.value];
      return ids.includes(cId);
    }
    if (filter.type === 'vithi-citta-subgroup') return CITTAS.find(c => c.id === cId).subGroup === filter.value;
    if (filter.type === 'puggala') {
      const p = PUGGALA_CITTA_TYPES.find(x => x.id === filter.value);
      return p ? p.cittaIds.includes(cId) : false;
    }
    if (filter.type === 'suti-pati') {
      const s = SUTI_PATI_TYPES.find(x => x.id === filter.value);
      return s ? s.cittaIds.includes(cId) : false;
    }
    if (filter.type === 'cittaja-rupa') {
      const cat = CITTAJA_RUPA_TYPES.find(c => c.id === filter.value);
      return cat ? cat.cittaIds.includes(cId) : false;
    }
    if (filter.type === 'akusala-cat') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cId === cittaContext;
      return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    }
    if (filter.type === 'akusala-name') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return cId === cittaContext;
      return checkAssociation(cId, nm.cetasikaId);
    }
    if (filter.type === 'missaka-cat') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return false;
      if (cat.cittaIds) return cat.cittaIds.includes(cId);
      if (cat.allCitta) return true;
      return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    }
    if (filter.type === 'missaka-name') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return false;
      if (nm.excludeCittaIds && nm.excludeCittaIds.includes(cId)) return false;
      if (nm.cittaIds) return nm.cittaIds.includes(cId);
      if (nm.allCitta) return true;
      if (nm.vedanaFilter) {
        const c = CITTAS.find(x => x.id === cId) || LOKUTTARA_8.find(x => x.id === cId);
        return c ? getCittaVedana(c) === nm.vedanaFilter : false;
      }
      if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
      return false; // rupaId only -> citta panel မှာ မသက်ဆိုင်
    }
    if (filter.type === 'bodhi-cat') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.cittaIds && !cat.cittaIds.includes(cId)) return false;
      if (cat.allCitta) return true;
      return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    }
    if (filter.type === 'bodhi-name') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return cId === cittaContext;
      if (cat.cittaIds && !cat.cittaIds.includes(cId)) return false;
      if (nm.cittaIds) return nm.cittaIds.includes(cId);
      if (nm.allCitta) return true;
      if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
      return false;
    }
    if (filter.type === 'sabba-detail') {
      const v = filter.value;
      if (v.cittaIds) return v.cittaIds.includes(cId);
      if (v.cetasikaIds && v.cetasikaIds.some(ctId => checkAssociation(cId, ctId))) {
        if (v.cittaScope === 'lokiya' && cId > 81) return false;
        return true;
      }
      return false;
    }
    return false;
  };

  const isCetasikaActive = (ctId) => {
    if (filter.type === 'none') return true;
    
    // Khi có bộ lọc "base" (jati/vedana/hetu/kicca/dvara/arammana/vatthu/citta-subgroup...), nếu nhấn vào một chấm citta,
    // hoàn toàn không thay đổi hình dạng của panel citta (các nhóm subgroup được hiển thị/ẩn),
    // mà chỉ thu gọn bảng cetasika theo những cetasika tương ứng với riêng tâm (citta) đó.
    if (detailPick && detailPick.type === 'citta' && CITTA_SIDE_BASE_TYPES.includes(filter.type)) {
      return checkAssociation(detailPick.id, ctId);
    }
    if (filter.type === 'cetasika') return filter.value === ctId;
    if (filter.type === 'citta') {
      if (nanakadaciMode && nanakadaciMode.cittaId === filter.value) {
        const st = NANAKADACI_CONFIG[nanakadaciMode.key].states[nanakadaciMode.stateIndex];
        if (st.exclude.includes(ctId)) return false;
      }
      return checkAssociation(filter.value, ctId);
    }
    if (filter.type === 'cetasika-subgroup') return CETASIKAS.find(ct => ct.id === ctId).subGroup === filter.value;
    if (filter.type === 'citta-subgroup') {
      return CITTAS.filter(c => c.subGroup === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'jati') {
      return CITTAS.filter(c => c.type === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'vedana') {
      return CITTAS.filter(c => getCittaVedana(c) === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'hetu') {
      return CITTAS.filter(c => getHetuCount(c.id) === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'kicca') {
      return CITTAS.filter(c => getCittaKiccas(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'dvara') {
      return CITTAS.filter(c => getCittaDvaras(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'arammana') {
      return CITTAS.filter(c => getCittaArammana(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'vatthu') {
      return CITTAS.filter(c => getCittaVatthu(c.id).includes(filter.value)).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'ahetuka-context') {
      const ids = Array.isArray(filter.value) ? filter.value : [filter.value];
      return ids.some(id => checkAssociation(id, ctId));
    }
    if (filter.type === 'citta-multi') {
      return filter.value.some(id => checkAssociation(id, ctId));
    }
    if (filter.type === 'vithi-citta-subgroup') {
      return CITTAS.filter(c => c.subGroup === filter.value).some(c => checkAssociation(c.id, ctId));
    }
    if (filter.type === 'puggala') {
      const p = PUGGALA_CITTA_TYPES.find(x => x.id === filter.value);
      return p ? p.cittaIds.some(id => checkAssociation(id, ctId)) : false;
    }
    if (filter.type === 'suti-pati') {
      const s = SUTI_PATI_TYPES.find(x => x.id === filter.value);
      return s ? s.cittaIds.some(id => checkAssociation(id, ctId)) : false;
    }
    if (filter.type === 'cittaja-rupa') {
      const cat = CITTAJA_RUPA_TYPES.find(c => c.id === filter.value);
      return cat ? cat.cittaIds.some(id => checkAssociation(id, ctId)) : false;
    }
    if (filter.type === 'akusala-cat') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) return cat.cetasikaIds.includes(ctId) && checkAssociation(cittaContext, ctId);
      return cat.cetasikaIds.includes(ctId);
    }
    if (filter.type === 'akusala-name') {
      const cat = AKUSALA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      if (!nm) return false;
      if (cittaContext !== null) return nm.cetasikaId === ctId && checkAssociation(cittaContext, ctId);
      return nm.cetasikaId === ctId;
    }
    if (filter.type === 'missaka-cat') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) {
        return getCategoryCetasikaIds(cat, cittaContext).includes(ctId);
      }
      return cat.cetasikaIds ? cat.cetasikaIds.includes(ctId) : false;
    }
    if (filter.type === 'missaka-name') {
      const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      return nm && nm.cetasikaId ? nm.cetasikaId === ctId : false;
    }
    if (filter.type === 'bodhi-cat') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value);
      if (!cat) return false;
      if (cittaContext !== null) {
        return getCategoryCetasikaIds(cat, cittaContext).includes(ctId);
      }
      return cat.cetasikaIds ? cat.cetasikaIds.includes(ctId) : false;
    }
    if (filter.type === 'bodhi-name') {
      const cat = BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value.catId);
      const nm = cat && cat.names[filter.value.index];
      return nm && nm.cetasikaId ? nm.cetasikaId === ctId : false;
    }
    if (filter.type === 'sabba-detail') {
      if (filter.value.id === 'saccavimutta' && saccaVimuttaFocus) {
        const isMagga = saccaVimuttaFocus.cittaId <= 101;
        if (isMagga && MAGGANGA8_IDS.includes(ctId)) return false;
        return UPADANAKKHANDHA_VIMUTTA_CETASIKA_IDS.includes(ctId);
      }
      return !!(filter.value.cetasikaIds && filter.value.cetasikaIds.includes(ctId));
    }
    return false;
  };

  // Phân biệt bộ lọc bắt đầu từ phía nào (citta hay cetasika)
  const isCittaOriginFilter = filter.type === 'citta' || filter.type === 'citta-subgroup' ||
    (cittaContext !== null && (
      filter.type === 'akusala-cat' || filter.type === 'akusala-name' ||
      filter.type === 'missaka-cat' || filter.type === 'missaka-name' ||
      filter.type === 'bodhi-cat' || filter.type === 'bodhi-name'
    ));
  const isCetasikaOriginFilter = filter.type === 'cetasika' || filter.type === 'cetasika-subgroup';

  // Ngay cả khi toàn bộ Subgroup bị mờ (dim), phía "nguồn" (origin side) vẫn không bị ẩn đi mà chỉ làm mờ.
  // Chỉ ẩn đi phía "đích" (target side) khi bị mờ hoàn toàn.
  const isCittaSubGroupVisible = (subId, sourceData = CITTAS) => {
    if (filter.type === 'none') return true;
    if (isCittaOriginFilter) return true;
    if (filter.type === 'ahetuka-context' && AHETUKA_SUBGROUPS.includes(subId)) return true;
    if (filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta' && saccaVimuttaFocus && (subId === 'magga' || subId === 'phala')) return true;
    const items = sourceData.filter(c => c.subGroup === subId);
    return items.length === 0 || items.some(c => isCittaActive(c.id));
  };
  const isCetasikaSubGroupVisible = (subId) => {
    if (filter.type === 'none') return true;
    if (isCetasikaOriginFilter) return true;
    const items = CETASIKAS.filter(ct => ct.subGroup === subId);
    return items.length === 0 || items.some(ct => isCetasikaActive(ct.id));
  };

  // Tập hợp tâm thực tế hiển thị tùy theo chế độ lokuttaraExpanded hiện tại
  const visibleCittaSet = lokuttaraExpanded 
    ? CITTAS 
    : [...CITTAS.filter(c => c.subGroup !== 'magga' && c.subGroup !== 'phala'), ...LOKUTTARA_8];
  // Tính toán riêng biệt số lượng đang tương ứng cho cả 2 panel: citta panel và cetasika panel
  const hasActiveFilter = filter.type !== 'none';
  const activeCittaCount = hasActiveFilter ? visibleCittaSet.filter(c => isCittaActive(c.id)).length : 0;
  const activeCetasikaCount = hasActiveFilter ? CETASIKAS.filter(ct => isCetasikaActive(ct.id)).length : 0;
  const cittaBadgeLabel = (filter.type === 'cetasika' || filter.type === 'cetasika-subgroup') ? 'Tâm tương ưng' : activeDetail.name;
  const cetasikaBadgeLabel = (filter.type === 'citta' || filter.type === 'citta-subgroup') ? 'Sở hữu tâm tương ưng' : activeDetail.name;
  // Nếu chỉ chọn một tâm đơn lẻ, bên phía tâm không cần badge (count=1), và tương tự cho sở hữu tâm
  const showCittaBadge = hasActiveFilter && filter.type !== 'citta';
  const showCetasikaBadge = hasActiveFilter && filter.type !== 'cetasika';
  const kamaGroupsVisible = CITTA_LAYOUT.slice(0, 3).some(group => group.subGroups.some(sub => isCittaSubGroupVisible(sub.id)));
  const mahaggataGroupsVisible = CITTA_LAYOUT.slice(3, 5).some(group => group.subGroups.some(sub => isCittaSubGroupVisible(sub.id)));

  // Dành cho panel Sắc pháp (RUPAS) — chỉ áp dụng nếu chọn category có rupaIds như Tạp hợp (indriya22/ahara4)
  const activeRupaCategory = (cittaContext === null && filter.type === 'missaka-cat') ? MISSAKA_CATEGORIES.find(c => c.id === filter.value)
    : (cittaContext === null && filter.type === 'missaka-name') ? (() => {
        const cat = MISSAKA_CATEGORIES.find(c => c.id === filter.value.catId);
        const nm = cat && cat.names[filter.value.index];
        return nm && nm.rupaId ? { rupaIds: [nm.rupaId] } : null;
      })()
    : filter.type === 'sabba-detail' ? filter.value
    : selectedKalapa ? selectedKalapa
    : selectedSamutthana ? selectedSamutthana
    : selectedBhumiItem ? selectedBhumiItem
    : null;
  const rupaFilterActive = !!(activeRupaCategory && activeRupaCategory.rupaIds);
  const isRupaActive = (rId) => (rupaFilterActive ? activeRupaCategory.rupaIds.includes(rId) : false);
  // Ban đầu:
// const isNibbanaActive = filter.type === 'sabba-detail' && !!filter.value.isNibbana;
const isNibbanaActive = filter.type === 'sabba-detail' && !!filter.value.isNibbana;
  const nibbanaDimmed = hasActiveFilter && !isNibbanaActive;
  const isPannattiActive = filter.type === 'arammana' && filter.value === 'pannatti';
  const pannattiDimmed = hasActiveFilter && !isPannattiActive;

  // Nếu các bộ lọc jati/akusala/missaka/bodhi/sabba của citta panel đang hoạt động, hiển thị nhãn (label) đó ở vị trí tiêu đề lớn
  const CITTA_TITLE_FILTER_TYPES = ['jati', 'akusala-cat', 'missaka-cat', 'bodhi-cat', 'sabba-detail'];
  const cittaTitleActiveLabel = CITTA_TITLE_FILTER_TYPES.includes(filter.type)
    ? (filter.type === 'jati' ? JATI_TYPES.find(j => j.id === filter.value)?.name
      : filter.type === 'akusala-cat' ? AKUSALA_CATEGORIES.find(c => c.id === filter.value)?.name
      : filter.type === 'missaka-cat' ? MISSAKA_CATEGORIES.find(c => c.id === filter.value)?.name
      : filter.type === 'bodhi-cat' ? BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value)?.name
      : filter.value.name)
    : null;

  // Nếu các bộ lọc vedana/hetu/kicca/dvara/arammana/vatthu của cetasika panel đang hoạt động, hiển thị nhãn đó ở vị trí tiêu đề lớn
  const CETASIKA_TITLE_FILTER_TYPES = ['vedana', 'hetu', 'kicca', 'dvara', 'arammana', 'vatthu'];
  const cetasikaTitleActiveLabel = CETASIKA_TITLE_FILTER_TYPES.includes(filter.type)
    ? (filter.type === 'vedana' ? VEDANA_TYPES.find(v => v.id === filter.value)?.name
      : filter.type === 'hetu' ? HETU_TYPES.find(h => h.id === filter.value)?.name
      : filter.type === 'kicca' ? KICCA_TYPES.find(k => k.id === filter.value)?.name
      : filter.type === 'dvara' ? DVARA_TYPES.find(d => d.id === filter.value)?.name
      : filter.type === 'arammana' ? ARAMMANA_TYPES.find(a => a.id === filter.value)?.name
      : VATTHU_TYPES.find(v => v.id === filter.value)?.name)
    : null;

  const selectedCittaId = cittaContext;
  const selectedCittaObj = selectedCittaId !== null ? CITTAS.find(c => c.id === selectedCittaId) : null;
  const vedanaOptions = selectedCittaObj ? VEDANA_TYPES.filter(v => v.id === getCittaVedana(selectedCittaObj)) : VEDANA_TYPES;
  const hetuOptions = selectedCittaId !== null ? HETU_TYPES.filter(h => h.id === getHetuCount(selectedCittaId)) : HETU_TYPES;
  const kiccaOptions = selectedCittaId !== null ? KICCA_TYPES.filter(k => getCittaKiccas(selectedCittaId).includes(k.id)) : KICCA_TYPES;
  const dvaraOptions = selectedCittaId !== null ? DVARA_TYPES.filter(d => getCittaDvaras(selectedCittaId).includes(d.id)) : DVARA_TYPES;
  const arammanaOptions = selectedCittaId !== null ? ARAMMANA_TYPES.filter(a => getCittaArammana(selectedCittaId).includes(a.id)) : ARAMMANA_TYPES;
  const vatthuOptions = selectedCittaId !== null ? VATTHU_TYPES.filter(v => getCittaVatthu(selectedCittaId).includes(v.id)) : VATTHU_TYPES;
  const jatiOptions = selectedCittaObj ? JATI_TYPES.filter(j => j.id === selectedCittaObj.type) : JATI_TYPES;
  const CITTA_CONTEXT_NARROWING_TYPES = ['jati', 'vedana', 'hetu', 'kicca', 'dvara', 'arammana', 'vatthu', 'akusala-cat', 'akusala-name', 'missaka-cat', 'missaka-name', 'bodhi-cat', 'bodhi-name', 'sabba-detail'];
  const isCittaContextTargeted = (cId) => cittaContext === cId && CITTA_CONTEXT_NARROWING_TYPES.includes(filter.type);
  const akusalaCategoryOptions = selectedCittaId !== null
    ? AKUSALA_CATEGORIES.filter(cat => cat.cetasikaIds.some(ctId => checkAssociation(selectedCittaId, ctId)))
    : AKUSALA_CATEGORIES;
  function isNanaCategoryRelevant(cat, cId) {
    if (cId === null) return true;
    if (cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return false;
    if (cat.cittaIds) return cat.cittaIds.includes(cId);
    if (cat.allCitta) return true;
    if (cat.cetasikaIds) return cat.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    return true;
  }
  function isNanaNameRelevant(nm, cId) {
    if (cId === null) return true;
    if (nm.excludeCittaIds && nm.excludeCittaIds.includes(cId)) return false;
    if (nm.cittaIds) {
      if (!nm.cittaIds.includes(cId)) return false;
      if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
      return true;
    }
    if (nm.allCitta) return true;
    if (nm.vedanaFilter) {
      const c = CITTAS.find(x => x.id === cId) || LOKUTTARA_8.find(x => x.id === cId);
      return c ? getCittaVedana(c) === nm.vedanaFilter : false;
    }
    if (nm.cetasikaId) return checkAssociation(cId, nm.cetasikaId);
    if (nm.rupaId) return false;
    return true;
  }
  function getCategoryCetasikaIds(cat, cId) {
    if (cId !== null && cat.excludeCittaIds && cat.excludeCittaIds.includes(cId)) return [];
    if (cId !== null && cat.cittaIds && !cat.cittaIds.includes(cId)) return [];
    if (!cat.names) return cat.cetasikaIds || [];
    return cat.names
      .filter(nm => {
        if (!isNanaNameRelevant(nm, cId)) return false;
        if ((cat.id === 'magganga12' || cat.id === 'magganga8') && cId !== null && MAHA_KUSALA_8_IDS.includes(cId) && [47, 48, 49].includes(nm.cetasikaId)) {
          return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
        }
        return true;
      })
      .map(nm => nm.cetasikaId)
      .filter(id => id !== undefined);
  }
  const missakaCategoryOptions = MISSAKA_CATEGORIES.filter(cat => isNanaCategoryRelevant(cat, selectedCittaId));
  const bodhiCategoryOptions = BODHIPAKKHIYA_CATEGORIES.filter(cat => isNanaCategoryRelevant(cat, selectedCittaId));
  const navCtx = getNavContext();
  function isSabbaItemRelevant(item, cId) {
    if (cId === null) return true;
    if (item.cittaIds) return item.cittaIds.includes(cId);
    if (item.cetasikaIds) return item.cetasikaIds.some(ctId => checkAssociation(cId, ctId));
    return false; // rupaIds-only (သို့) isNibbana-only item
  }

    // Dành cho các nút "Loại / Bất thiện / Hỗn hợp / Bồ-đề phần / Tất cả" trong Header — ban đầu hiển thị gọn với kích thước chữ nhỏ,
    // khi bấm vào mới mở rộng thanh nút subcategory ra bên dưới theo dạng nút bật/tắt (narrow toggle-button)
  const DropButton = ({ label, activeLabel, isOpen, isActiveFilter, onToggle, onClear, children }) => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter && onClear) { onClear(); } else { onToggle(); } }}
          title={isActiveFilter ? 'Bấm lần nữa để quay lại bảng gốc (làm mới)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter && activeLabel ? activeLabel : label}
        </button>
        {isOpen && menuPos && (
          <div 
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-64 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[280px]">{children}</div>
          </div>
        )}
      </div>
    );
  };

  // Nút "Tất cả" (Sabba) — Hiển thị nhóm 5 (Uẩn/Thủ uẩn/Xứ/Giới/Đế) ở cấp độ đầu tiên, và các mục chi tiết ở cấp độ thứ hai
  const SabbaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const [groupIdx, setGroupIdx] = useState(null);
    const isOpen = openMenu === 'sabba-sangaha';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      } else {
        setGroupIdx(null);
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'sabba-detail';
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { clearFilter(); } else { setOpenMenu(prev => prev === 'sabba-sangaha' ? null : 'sabba-sangaha'); } }}
          title={isActiveFilter ? 'Bấm lần nữa để quay lại bảng gốc (làm mới)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter ? filter.value.name : 'Tất cả'}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-72 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[300px]">
              {SABBA_GROUPS.map((g, i) => {
                const colorMap = {
                  khandha: groupIdx === i ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
                  upadanakkhandha: groupIdx === i ? 'bg-orange-700 text-white border-orange-700' : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100',
                  ayatana: groupIdx === i ? 'bg-sky-700 text-white border-sky-700' : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100',
                  dhatu: groupIdx === i ? 'bg-violet-700 text-white border-violet-700' : 'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100',
                  sacca: groupIdx === i ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
                };
                return (
                  <button
                    key={g.id}
                    onClick={() => setGroupIdx(prev => prev === i ? null : i)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${colorMap[g.id] || 'bg-slate-100 text-slate-600 border-slate-300'}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {groupIdx !== null && (
              <div className="flex flex-wrap gap-1 max-w-[300px] border-t mt-1 pt-1">
                {SABBA_GROUPS[groupIdx].items.filter(it => isSabbaItemRelevant(it, selectedCittaId)).map(it => (
                  <button
                    key={it.id}
                    onClick={() => { toggleFilter('sabba-detail', it, { name: it.name, desc: it.note || "" }); setOpenMenu(null); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${
                      filter.type === 'sabba-detail' && filter.value.id === it.id
                        ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {it.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Nút "Nhóm sắc pháp" (Kalapa) — Hiển thị nhóm 4 (Kammaja/Cittaja/Utuja/Aharaja) ở cấp độ đầu tiên, và các nhóm sắc pháp (kalapa) ở cấp độ thứ hai
  const KalapaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const [groupIdx, setGroupIdx] = useState(null);
    const isOpen = openMenu === 'kalapa';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      } else {
        setGroupIdx(null);
      }
    }, [isOpen]);
    const isActiveFilter = !!selectedKalapa;
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { setSelectedKalapa(null); } else { setOpenMenu(prev => prev === 'kalapa' ? null : 'kalapa'); } }}
          title={isActiveFilter ? 'Bấm lần nữa để quay lại bảng gốc (làm mới)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter ? selectedKalapa.name : 'Nhóm sắc pháp'}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-72 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[300px]">
              {KALAPA_GROUPS.map((g, i) => {
                const colorMap = {
                  rose: groupIdx === i ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100',
                  indigo: groupIdx === i ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100',
                  emerald: groupIdx === i ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
                  amber: groupIdx === i ? 'bg-amber-700 text-white border-amber-700' : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
                };
                return (
                  <button
                    key={g.id}
                    onClick={() => setGroupIdx(prev => prev === i ? null : i)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${colorMap[g.color] || 'bg-slate-100 text-slate-600 border-slate-300'}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {groupIdx !== null && (
              <div className="flex flex-wrap gap-1 max-w-[300px] border-t mt-1 pt-1">
                {KALAPA_GROUPS[groupIdx].items.map(it => (
                  <button
                    key={it.id}
                    onClick={() => {
                      setFilter({ type: 'none', value: null });
                      setActiveDetail({ name: it.name, desc: '' });
                      setTooltipPos(null);
                      setVithiActiveIdx(null);
                      setDetailPick(null);
                      setPhotthabbaOn(false);
                      setSelectedKalapa(prev => (prev && prev.id === it.id ? null : it));
                      setOpenMenu(null);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${
                      selectedKalapa && selectedKalapa.id === it.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {it.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  // Nút "Bất thiện" (Akusala) — Hiển thị 10 nhóm bất thiện (Lậu hoặc/Bộc lưu/Ách/...) ở cấp độ đầu, và tên gốc (hộp nổi màu sắc) ở cấp độ thứ hai
  // Nhóm (akusalaGroupIdx) được lưu trữ ở App-level state — vì AkusalaDropdown được tạo lại
  // như một component nội dòng (inline component) mỗi khi App render lại, nên nếu dùng local useState
  // thì nó có thể bị reset mỗi khi gọi toggleFilter (vì làm cho App render lại)
  const AkusalaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const isOpen = openMenu === 'akusala-cat';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 300);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'akusala-cat' || filter.type === 'akusala-name';
    const pickCategory = (cat, idx, rect) => {
      const wasSame = filter.type === 'akusala-cat' && filter.value === cat.id;
      toggleFilter('akusala-cat', cat.id, { name: cat.name, desc: cat.desc || '' }, rect);
      if (!wasSame) {
        setOpenMenu('akusala-cat');
        setAkusalaGroupIdx(idx);
      } else {
        setAkusalaGroupIdx(null);
      }
    };
    const pickName = (nm, idx, rect) => {
      const cat = AKUSALA_CATEGORIES[akusalaGroupIdx];
      const isSame = filter.type === 'akusala-name' && filter.value.catId === cat.id && filter.value.index === idx;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      if (isSame) {
        setFilter({ type: 'akusala-cat', value: cat.id });
        setActiveDetail({ name: cat.name, desc: cat.desc || '' });
        setTooltipPos(null);
        return;
      }
      setActiveDetail({ name: nm.name, desc: nm.desc || '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      setFilter({ type: 'akusala-name', value: { catId: cat.id, index: idx } });
      setOpenMenu('akusala-cat');
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (filter.type === 'akusala-cat' || filter.type === 'akusala-name') { clearFilter(); } else { setOpenMenu(prev => prev === 'akusala-cat' ? null : 'akusala-cat'); } }}
          title={isActiveFilter ? 'Nhấn lần nữa để quay lại bảng gốc (làm mới)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
        {filter.type === 'akusala-name'
            ? activeDetail.name || 'Bất thiện'
            : (filter.type === 'akusala-cat' ? AKUSALA_CATEGORIES.find(c => c.id === filter.value)?.name : 'Bất thiện')}
          </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1.5 max-w-[75vw] max-h-80 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[320px]">
              {akusalaCategoryOptions.map((cat) => {
                const i = AKUSALA_CATEGORIES.indexOf(cat);
                const cc = AKUSALA_COLOR_MAP[cat.color] || AKUSALA_COLOR_MAP.rose;
                const isCatActive = filter.type === 'akusala-cat' && filter.value === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={(e) => pickCategory(cat, i, e.currentTarget.getBoundingClientRect())}
                    title={cat.desc || undefined}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${
                      akusalaGroupIdx === i || isCatActive ? cc.active : cc.idle
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {akusalaGroupIdx !== null && (() => {
              const catNames = AKUSALA_CATEGORIES[akusalaGroupIdx].names;
              const visibleEntries = catNames
                .map((nm, ni) => ({ nm, ni }))
                .filter(({ nm }) => selectedCittaId === null || checkAssociation(selectedCittaId, nm.cetasikaId));
              return (
                <div className="flex flex-wrap gap-1.5 max-w-[320px] border-t pt-1.5 mt-0.5">
                  {visibleEntries.map(({ nm, ni }) => {
                    const cc = AKUSALA_COLOR_MAP[AKUSALA_CATEGORIES[akusalaGroupIdx].color] || AKUSALA_COLOR_MAP.rose;
                    const isNameActive = filter.type === 'akusala-name' && filter.value.catId === AKUSALA_CATEGORIES[akusalaGroupIdx].id && filter.value.index === ni;
                    return (
                      <button
                        key={`${nm.name}-${ni}`}
                        onClick={(e) => pickName(nm, ni, e.currentTarget.getBoundingClientRect())}
                        title={nm.desc}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap transition-all ${
                          isNameActive ? `${cc.active} ring-2 ring-offset-1 ring-slate-700 scale-105` : cc.idle
                        }`}
                      >
                        {nm.name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
// Nút "Hỗn hợp / Tạp lục" (Missaka) — Hiển thị các nhóm pháp hỗn hợp (Nhân/Thiền chi/Đạo chi/...) ở cấp độ đầu, và tên thành phần ở cấp độ thứ hai
  const MissakaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const isOpen = openMenu === 'missaka-cat';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 300);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'missaka-cat' || filter.type === 'missaka-name';
    const pickCategory = (cat, idx, rect) => {
      const wasSame = filter.type === 'missaka-cat' && filter.value === cat.id;
      toggleFilter('missaka-cat', cat.id, { name: cat.name, desc: cat.desc || '' }, rect);
      if (!wasSame) { setOpenMenu('missaka-cat'); setMissakaGroupIdx(idx); }
      else { setMissakaGroupIdx(null); }
    };
    const pickName = (nm, idx, rect) => {
      const cat = MISSAKA_CATEGORIES[missakaGroupIdx];
      const isSame = filter.type === 'missaka-name' && filter.value.catId === cat.id && filter.value.index === idx;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      if (isSame) {
        setFilter({ type: 'missaka-cat', value: cat.id });
        setActiveDetail({ name: cat.name, desc: cat.desc || '' });
        setTooltipPos(null);
        return;
      }
      setActiveDetail({ name: nm.name, desc: nm.desc || '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      setFilter({ type: 'missaka-name', value: { catId: cat.id, index: idx } });
      setOpenMenu('missaka-cat');
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { clearFilter(); } else { setOpenMenu(prev => prev === 'missaka-cat' ? null : 'missaka-cat'); } }}
          title={isActiveFilter ? 'Nhấn lần nữa để quay lại bảng gốc (làm mới)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {filter.type === 'missaka-name'
            ? activeDetail.name || 'Hỗn hợp'
            : (filter.type === 'missaka-cat' ? MISSAKA_CATEGORIES.find(c => c.id === filter.value)?.name : 'Hỗn hợp')}
        </button>
        {isOpen && menuPos && (
          <div className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1.5 max-w-[75vw] max-h-80 overflow-y-auto" style={{ left: menuPos.left, top: menuPos.top }}>
            <div className="flex flex-wrap gap-1 max-w-[320px]">
              {missakaCategoryOptions.map((cat) => {
                const i = MISSAKA_CATEGORIES.indexOf(cat);
                const cc = AKUSALA_COLOR_MAP[cat.color] || AKUSALA_COLOR_MAP.rose;
                const isCatActive = filter.type === 'missaka-cat' && filter.value === cat.id;
                return (
                  <button key={cat.id} onClick={(e) => pickCategory(cat, i, e.currentTarget.getBoundingClientRect())} title={cat.desc || undefined}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${missakaGroupIdx === i || isCatActive ? cc.active : cc.idle}`}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {missakaGroupIdx !== null && (() => {
              const curCat = MISSAKA_CATEGORIES[missakaGroupIdx];
              const visibleNames = curCat.names
                .map((nm, ni) => ({ nm, ni }))
                .filter(({ nm }) => {
                  if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
                  if (curCat.id === 'magganga12' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
                    return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
                  }
                  return true;
                });
              return (
                <div className="flex flex-wrap gap-1.5 max-w-[320px] border-t pt-1.5 mt-0.5">
                  {visibleNames.map(({ nm, ni }) => {
                    const cc = AKUSALA_COLOR_MAP[curCat.color] || AKUSALA_COLOR_MAP.rose;
                    const isNameActive = filter.type === 'missaka-name' && filter.value.catId === curCat.id && filter.value.index === ni;
                    return (
                      <button key={`${nm.name}-${ni}`} onClick={(e) => pickName(nm, ni, e.currentTarget.getBoundingClientRect())} title={nm.desc}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap transition-all ${isNameActive ? `${cc.active} ring-2 ring-offset-1 ring-slate-700 scale-105` : cc.idle}`}>
                        {nm.name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
  const BodhiDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const isOpen = openMenu === 'bodhi-cat';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 300);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      }
    }, [isOpen]);
    const isActiveFilter = filter.type === 'bodhi-cat' || filter.type === 'bodhi-name';
    const pickCategory = (cat, idx, rect) => {
      const wasSame = filter.type === 'bodhi-cat' && filter.value === cat.id;
      toggleFilter('bodhi-cat', cat.id, { name: cat.name, desc: cat.desc || '' }, rect);
      if (!wasSame) { setOpenMenu('bodhi-cat'); setBodhiGroupIdx(idx); }
      else { setBodhiGroupIdx(null); }
    };
    const pickName = (nm, idx, rect) => {
      const cat = BODHIPAKKHIYA_CATEGORIES[bodhiGroupIdx];
      const isSame = filter.type === 'bodhi-name' && filter.value.catId === cat.id && filter.value.index === idx;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      if (isSame) {
        setFilter({ type: 'bodhi-cat', value: cat.id });
        setActiveDetail({ name: cat.name, desc: cat.desc || '' });
        setTooltipPos(null);
        return;
      }
      setActiveDetail({ name: nm.name, desc: nm.desc || '' });
      setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
      tooltipTimerRef.current = setTimeout(() => { setActiveDetail({ name: "", desc: "" }); setTooltipPos(null); }, 3000);
      setFilter({ type: 'bodhi-name', value: { catId: cat.id, index: idx } });
      setOpenMenu('bodhi-cat');
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { clearFilter(); } else { setOpenMenu(prev => prev === 'bodhi-cat' ? null : 'bodhi-cat'); } }}
          title={isActiveFilter ? 'Nhấn lần nữa để quay lại bảng gốc (làm mới)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {filter.type === 'bodhi-name'
            ? activeDetail.name || 'Trợ đạo'
            : (filter.type === 'bodhi-cat' ? BODHIPAKKHIYA_CATEGORIES.find(c => c.id === filter.value)?.name : 'Trợ đạo')}
        </button>
        {isOpen && menuPos && (
          <div className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1.5 max-w-[75vw] max-h-80 overflow-y-auto" style={{ left: menuPos.left, top: menuPos.top }}>
            <div className="flex flex-wrap gap-1 max-w-[320px]">
              {bodhiCategoryOptions.map((cat) => {
                const i = BODHIPAKKHIYA_CATEGORIES.indexOf(cat);
                const cc = AKUSALA_COLOR_MAP[cat.color] || AKUSALA_COLOR_MAP.rose;
                const isCatActive = filter.type === 'bodhi-cat' && filter.value === cat.id;
                return (
                  <button key={cat.id} onClick={(e) => pickCategory(cat, i, e.currentTarget.getBoundingClientRect())} title={cat.desc || undefined}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${bodhiGroupIdx === i || isCatActive ? cc.active : cc.idle}`}>
                    {cat.name}
                  </button>
                );
              })}
            </div>
            {bodhiGroupIdx !== null && (() => {
              const curCat = BODHIPAKKHIYA_CATEGORIES[bodhiGroupIdx];
              const visibleNames = curCat.names
                .map((nm, ni) => ({ nm, ni }))
                .filter(({ nm }) => {
                  if (!isNanaNameRelevant(nm, selectedCittaId)) return false;
                  if (curCat.id === 'magganga8' && selectedCittaId !== null && MAHA_KUSALA_8_IDS.includes(selectedCittaId) && [47, 48, 49].includes(nm.cetasikaId)) {
                    return VIRATI_CYCLE_STATES[viratiCycleIndex].include.includes(nm.cetasikaId);
                  }
                  return true;
                });
              return (
                <div className="flex flex-wrap gap-1.5 max-w-[320px] border-t pt-1.5 mt-0.5">
                  {visibleNames.map(({ nm, ni }) => {
                    const cc = AKUSALA_COLOR_MAP[curCat.color] || AKUSALA_COLOR_MAP.rose;
                    const isNameActive = filter.type === 'bodhi-name' && filter.value.catId === curCat.id && filter.value.index === ni;
                    return (
                      <button key={`${nm.name}-${ni}`} onClick={(e) => pickName(nm, ni, e.currentTarget.getBoundingClientRect())} title={nm.desc}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border whitespace-nowrap transition-all ${isNameActive ? `${cc.active} ring-2 ring-offset-1 ring-slate-700 scale-105` : cc.idle}`}>
                        {nm.name}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
  // Nút "Nguồn gốc sắc pháp" (Samutthana) — Hiển thị nhóm 5 (Kammaja/Cittaja/Utuja/Aharaja/Nakutoja) ở cấp độ đầu tiên, và phân loại chắc chắn/không chắc chắn ở cấp độ thứ hai
  const SamutthanaDropdown = () => {
    const btnRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const [groupIdx, setGroupIdx] = useState(null);
    const isOpen = openMenu === 'samutthana';
    useEffect(() => {
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        const left = Math.min(r.left, window.innerWidth - 290);
        setMenuPos({ left: Math.max(4, left), top: r.bottom + 4 });
      } else {
        setGroupIdx(null);
      }
    }, [isOpen]);
    const isActiveFilter = !!selectedSamutthana;
    const colorMap = {
      kammaja: 'rose', cittaja: 'indigo', utuja: 'emerald', aharaja: 'amber', nakutoja: 'slate',
    };
    const pickTop = (top) => {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: top.name, desc: top.note || '' });
      setTooltipPos(null);
      setVithiActiveIdx(null);
      setDetailPick(null);
      setPhotthabbaOn(false);
      setSelectedKalapa(null);
      setSelectedSamutthana(prev => (prev && prev.id === top.id ? null : top));
      setOpenMenu(null);
    };
    const pickSub = (sub) => {
      setFilter({ type: 'none', value: null });
      setActiveDetail({ name: sub.name, desc: '' });
      setTooltipPos(null);
      setVithiActiveIdx(null);
      setDetailPick(null);
      setPhotthabbaOn(false);
      setSelectedKalapa(null);
      setSelectedSamutthana(prev => (prev && prev.id === sub.id ? null : sub));
      setOpenMenu(null);
    };
    return (
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => { if (isActiveFilter) { setSelectedSamutthana(null); } else { setOpenMenu(prev => prev === 'samutthana' ? null : 'samutthana'); } }}
          title={isActiveFilter ? 'Bấm lần nữa để quay lại bảng gốc (làm mấy)' : undefined}
          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap max-w-[140px] truncate ${
            isActiveFilter || isOpen ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
          }`}
        >
          {isActiveFilter ? selectedSamutthana.name : 'Nguồn gốc sắc pháp'}
        </button>
        {isOpen && menuPos && (
          <div
            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 max-w-[70vw] max-h-72 overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top }}
          >
            <div className="flex flex-wrap gap-1 max-w-[300px]">
              {RUPA_SAMUTTHANA_TYPES.map((g, i) => {
                const c = colorMap[g.id] || 'slate';
                const activeCls = `bg-${c}-700 text-white border-${c}-700`;
                const idleCls = `bg-${c}-50 text-${c}-700 border-${c}-300 hover:bg-${c}-100`;
                return (
                  <button
                    key={g.id}
                    onClick={() => (g.sub ? setGroupIdx(prev => prev === i ? null : i) : pickTop(g))}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap transition-colors ${groupIdx === i ? activeCls : idleCls}`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
            {groupIdx !== null && RUPA_SAMUTTHANA_TYPES[groupIdx].sub && (
              <div className="flex flex-wrap gap-1 max-w-[300px] border-t mt-1 pt-1">
                {RUPA_SAMUTTHANA_TYPES[groupIdx].sub.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => pickSub(sub)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${
                      selectedSamutthana && selectedSamutthana.id === sub.id
                        ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // UI Components
  const Dot = ({ item, isActive, isDimmed, onClick, type, onLongPress }) => {
    // Determine text color based on background darkness
    const isLightBg = item.color.includes('200') || item.color.includes('300') || item.color.includes('400') || item.color.includes('yellow');
    const textClass = isLightBg ? 'text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]';

    const itemDetail = { name: item.name, desc: item.desc || "" };
    const [showHover, setShowHover] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const pressTimerRef = useRef(null);
    const longPressFiredRef = useRef(false);
    const startPress = (e) => {
      if (!onLongPress) return;
      longPressFiredRef.current = false;
      const rect = e.currentTarget.getBoundingClientRect();
      pressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onLongPress(itemDetail, rect);
      }, 600);
    };
    const cancelPress = () => {
      if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    };

    // Chỉ hiển thị các nhãn đánh dấu về Thọ / Tương ưng-Bất tương ưng / Vô tâm-Có tâm (Asankharika-Sasankharika) trên các tâm (citta)
    const markers = type === 'citta' ? getCittaMarkers(item.id) : { sampayutta: null, asankharika: null };
    const vedanaColor = type === 'citta' ? VEDANA_COLOR_HEX[getCittaVedana(item)] : null;

    let hoverCount = null;
    if (showHover && type === 'citta') {
      hoverCount = CETASIKAS.filter(ct => checkAssociation(item.id, ct.id)).length;
    } else if (showHover && type === 'cetasika') {
      hoverCount = CITTAS.filter(c => checkAssociation(c.id, item.id)).length;
    }

    // Hiển thị ngay sát đầu con trỏ chuột, căn chỉnh để không bị che khuất ở viền màn hình (viewport)
    let tooltipStyle = null;
    if (hoverCount !== null && typeof window !== 'undefined') {
      const TW = 190, TH = 40, GAP = 14;
      let left = mousePos.x + GAP;
      let top = mousePos.y + GAP;
      if (left + TW > window.innerWidth) left = mousePos.x - TW - GAP;
      if (top + TH > window.innerHeight) top = mousePos.y - TH - GAP;
      if (left < 4) left = 4;
      if (top < 4) top = 4;
      tooltipStyle = { left, top };
    }

    return (
      <div 
        className="relative flex-shrink-0"
        onMouseEnter={(e) => { setShowHover(true); setMousePos({ x: e.clientX, y: e.clientY }); }}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setShowHover(false)}
      >
        {tooltipStyle && (
          <div className="fixed z-50 pointer-events-none" style={tooltipStyle}>
            <div className="bg-slate-900 text-white text-[10px] md:text-[11px] rounded-md px-2 py-1 shadow-lg whitespace-nowrap font-semibold">
              {type === 'citta' ? `Sở hữu tâm tương ưng - ${hoverCount}` : `Tâm tương ưng - ${hoverCount}`}
            </div>
          </div>
        )}
        <div 
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onClick={(e) => { e.stopPropagation(); if (longPressFiredRef.current) { longPressFiredRef.current = false; return; } const rect = e.currentTarget.getBoundingClientRect(); onClick(itemDetail, rect); }}
          className={`
            w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer transition-all duration-300
            flex items-center justify-center text-center p-0.5 leading-[1.15] shadow-sm flex-shrink-0
            ${item.color}
            ${isActive ? 'ring-4 ring-offset-2 ring-slate-800 scale-110 z-10 shadow-lg font-bold' : ''}
            ${isDimmed ? 'opacity-15 grayscale' : 'hover:scale-105 hover:shadow-md'}
            ${markers.asankharika === true ? 'border-2 border-solid border-white/90' : ''}
            ${markers.asankharika === false ? 'border-2 border-dashed border-white/90' : ''}
          `}
        >
          <span className={`text-[9px] md:text-[10px] break-words w-full ${textClass} font-medium tracking-tight`}>
            {item.shortName || item.name}
          </span>
          {vedanaColor && !isDimmed && (
            <span 
              className="absolute bottom-0.5 left-1.5 right-1.5 h-[3px] rounded-full"
              style={{ backgroundColor: vedanaColor }}
              title={`Thọ - ${VEDANA_TYPES.find(v => v.id === getCittaVedana(item))?.name || ''}`}
            />
          )}
        </div>
        {markers.sampayutta !== null && !isDimmed && (
          <span 
            className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ring-1 ring-white z-10 ${markers.sampayutta ? 'bg-sky-500' : 'bg-zinc-400'}`}
            title={markers.sampayutta ? 'Tương ưng' : 'Bất tương ưng'}
          />
        )}
      </div>
    );
  };

  // Vithi (Life-sequence) dot — Khi bấm vào sẽ chạy logic alternates/cycle và kết nối, làm nổi bật (highlight) bảng citta/cetasika tương ứng
  const VithiDot = ({ item, idx }) => {
    const [altIdx, setAltIdx] = useState(0);
    const hasAlternates = item.alternates && item.alternates.length > 0;
    const displayLabel = hasAlternates ? item.alternates[altIdx] : item.label;
    const clickable = !!item.matchType && !item.ellipsis;
    const isSelected = vithiActiveIdx === idx;

    const handleClick = () => {
      if (item.matchType === 'panca-vinnana-cycle') {
        const next = (pancaDoorIdx + 1) % PANCA_DVARA_TYPES.length;
        setPancaDoorIdx(next);
        setVithiClickLabel(`${PANCA_DVARA_TYPES[next].doorName} — ${PANCA_VITHI_VARIANTS[pancaVariantIdx].name}`);
        if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        setVithiActiveIdx(idx);
        setFilter({ type: 'ahetuka-context', value: PANCA_DVARA_TYPES[next].vinIds });
        return;
      }
      if (item.matchType === 'panca-door-cycle') {
        const next = (pancaVariantIdx + 1) % PANCA_VITHI_VARIANTS.length;
        setPancaVariantIdx(next);
        setVithiClickLabel(`${PANCA_DVARA_TYPES[pancaDoorIdx].doorName} — ${PANCA_VITHI_VARIANTS[next].name}`);
        if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        setVithiActiveIdx(idx);
        setFilter({ type: 'kicca', value: 2 }); // Làm nổi bật 19 tâm thực hiện phận sự hộ kiếp (bhavanga)
        return;
      }
      if (item.matchType === 'mano-type-cycle') {
        const next = (manoTypeIdx + 1) % MANO_VITHI_TYPES.length;
        setManoTypeIdx(next);
        setManoVariantIdx(0);
        setVithiClickLabel(`Ý môn trình tự tâm (Mano-dvāra vīthi) — ${MANO_VITHI_TYPES[next].name}`);
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
        setVithiActiveIdx(idx);
        return;
      }
      if (!clickable) return;
      let nextIdx = altIdx;
      if (hasAlternates) {
        nextIdx = (altIdx + 1) % item.alternates.length;
        setAltIdx(nextIdx);
      }
      if (item.isVariantCycler) {
        const type = MANO_VITHI_TYPES[manoTypeIdx];
        const nextVariant = type.variants.length > 1 ? (manoVariantIdx + 1) % type.variants.length : manoVariantIdx;
        setManoVariantIdx(nextVariant);
        setVithiClickLabel(`Ý môn trình tự tâm (Mano-dvāra vīthi) — ${type.name}${type.variants.length > 1 ? ` (${type.variants[nextVariant].label})` : ''}`);
      } else {
        setVithiClickLabel(item.titleOverride || item.group || null);
      }
      const mValue = item.altMatchValues ? item.altMatchValues[nextIdx] : item.matchValue;
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: "", desc: "" });
      setTooltipPos(null);
      setVithiActiveIdx(idx);
      setFilter({ type: item.matchType, value: mValue });
    };

    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div 
          onClick={handleClick}
          title={clickable ? 'Bấm để xem các tâm / sở hữu tâm liên quan' : undefined}
          className={`
            relative flex items-center justify-center text-center p-0.5 shadow-sm transition-transform
            ${item.header ? 'px-3 h-9 md:h-10 rounded-lg' : 'w-11 h-11 md:w-12 md:h-12 rounded-full'}
            ${item.color} ${item.ellipsis ? 'border-2 border-dashed border-slate-400' : ''} ${item.isAtita ? 'ring-2 ring-amber-400' : ''}
            ${clickable ? 'cursor-pointer hover:scale-105' : ''}
            ${isSelected ? 'ring-4 ring-yellow-400 scale-110 z-10' : ''}
          `}
        >
          {item.isAtita && item.atitaIndex && (
            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow ring-1 ring-white">
              {toMyanmar(item.atitaIndex)}
            </span>
          )}
          <span className={`text-white leading-[1.05] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] whitespace-nowrap ${item.header ? 'text-[9px] md:text-[10px] font-bold' : 'text-[8px] md:text-[9px] font-medium'}`}>
            {displayLabel}
          </span>
        </div>
      </div>
    );
  };

  // Sắc pháp (RUPAS) dot — khi hover hiển thị tooltip (tên + ý nghĩa) gần con trỏ chuột; khi click hiển thị floating tooltip trong 3 giây ở phía trên
  const RupaDot = ({ r, dimmed, ringClass, extraClickHandler }) => {
    const isLightBg = r.color.includes('200') || r.color.includes('300') || r.color.includes('400') || r.color.includes('yellow');
    const textClass = isLightBg ? 'text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' : 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]';
    const handleClick = (e) => {
      if (extraClickHandler) { const rect = e.currentTarget.getBoundingClientRect(); extraClickHandler(rect); return; }
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveDetail({ name: r.name, desc: r.desc || '' });
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    };
    return (
      <div
        onClick={handleClick}
        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-center p-0.5 leading-tight rounded-full ${r.color} cursor-pointer ${textClass} text-[9px] md:text-[10px] font-medium transition-all hover:scale-105 ${dimmed ? 'opacity-15 grayscale' : ''} ${ringClass || ''}`}
      >
        {r.name}
      </div>
    );
  };
  const PannattiDot = ({ item }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: item.name, desc: item.desc || '' });
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    }}
    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-teal-300 hover:bg-teal-400 cursor-pointer flex items-center justify-center text-center p-0.5 leading-tight text-[8px] md:text-[9px] font-medium text-slate-900 shadow-sm transition-all hover:scale-105 flex-shrink-0"
  >
    {item.name}
  </div>
);
const NibbanaDot = ({ item }) => (
  <div
    onClick={(e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setActiveDetail({ name: item.name, desc: item.desc || '' });
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      tooltipTimerRef.current = setTimeout(() => {
        setActiveDetail({ name: "", desc: "" });
        setTooltipPos(null);
      }, 3000);
    }}
    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-300 hover:bg-amber-400 cursor-pointer flex items-center justify-center text-center p-0.5 leading-tight text-[8px] md:text-[9px] font-medium text-slate-900 shadow-sm transition-all hover:scale-105 flex-shrink-0"
  >
    {item.name}
  </div>
);
  // Main Container: Tiêu đề ở bên trái (Dọc), Các mục ở bên phải
  const MainGroupBox = ({ title, children }) => (
    <div className="flex flex-row rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-2">
      <div className="bg-slate-200 flex items-center justify-center w-8 md:w-10 shrink-0 border-r border-slate-200">
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-xs md:text-sm font-bold text-slate-700 py-3 text-center">
          {title}
        </span>
      </div>
      <div className="flex flex-col flex-1 bg-white">
        {children}
      </div>
    </div>
  );

  // Vertical wrap: nhãn nhóm bên ngoài (Hiệp thế / Dục giới)
  const VerticalWrap = ({ title, children }) => (
    <div className="flex flex-row rounded-xl overflow-hidden mb-2 border border-slate-300">
      <div className="bg-slate-700 flex items-center justify-center w-6 md:w-7 shrink-0">
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[10px] md:text-xs font-bold text-white py-2 text-center">
          {title}
        </span>
      </div>
      <div className="flex flex-col flex-1">
        {children}
      </div>
    </div>
  );

  // Sub Container: Các chấm ở bên trái, Tiêu đề ở bên phải (Ngang)
  const SubGroupBox = ({ title, isActive, onClick, children, id, extraTitleContent, hideTitle }) => {
    const isLokuttara = id === 'magga' || id === 'phala';
    const isMahaGroup = id === 'maha-kusala' || id === 'maha-vipaka' || id === 'maha-kiriya';
    const isSobhanaRows = id === 'sobhana-sadharana';
    const lokuttaraCols = lokuttaraExpanded ? 'grid-cols-5' : 'grid-cols-4';
    const alignTop = !!extraTitleContent;
    
    return (
      <div 
        className={`flex flex-row ${alignTop ? 'items-start' : 'items-center'} justify-between p-1.5 md:p-2 border-b last:border-b-0 border-slate-100 transition-all ${isActive ? 'bg-blue-50 shadow-inner' : 'hover:bg-slate-50'}`}
        onClick={onClick}
      >
        <div className={
          isLokuttara ? `grid ${lokuttaraCols} gap-1 md:gap-1.5 w-max` 
          : isMahaGroup ? "flex flex-nowrap gap-0.5 items-center"
          : isSobhanaRows ? "flex flex-col gap-1 md:gap-1.5 flex-1"
          : "flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center"
        }>
          {children}
        </div>
        {!hideTitle && (
          <div className={`flex flex-col items-end shrink-0 ml-2 ${alignTop ? 'gap-1.5' : ''}`}>
            <div 
              className={`text-[10px] md:text-[11px] font-semibold cursor-pointer transition-colors text-right w-16 md:w-24 leading-snug ${isActive ? 'text-blue-800' : 'text-slate-600 hover:text-blue-600'}`}
              title={`Bấm để chọn ${title}`}
            >
              {title}
            </div>
            {extraTitleContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Header & Stats Dashboard */}
      <header className="bg-slate-800 text-white p-3 shadow-md z-20 sticky top-0">
        <div className="max-w-[1400px] mx-auto flex flex-row justify-between items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold">4 Pháp Chân Nghĩa (Paramattha Dhammā)</h1>
          {filter.type !== 'none' && (
            <button 
              onClick={clearFilter}
              title="Hủy lựa chọn"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Floating tooltip - hiển thị phía trên dot được bấm */}
      {activeDetail.name && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 10, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-blue-900 text-white rounded-lg shadow-xl px-3 py-2 max-w-[240px] md:max-w-sm text-center">
            <div className="font-bold text-xs md:text-sm">{activeDetail.name}</div>
            {activeDetail.desc && (
              <div className="text-[10px] md:text-xs mt-1 leading-relaxed text-blue-100">{activeDetail.desc}</div>
            )}
          </div>
          <div className="w-3 h-3 bg-blue-900 rotate-45 mx-auto -mt-1.5"></div>
        </div>
      )}

      
      {/* Widget nổi trước/sau (navPrev/navNext) — có thể kéo thả, chỉ hiển thị khi có danh sách mục */}
      {navCtx && (
        <div
          ref={navWidgetRef}
          className="fixed z-40 flex items-center gap-1 rounded-full shadow-2xl px-2 py-1.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 border border-white/30"
          style={{ left: navPos.x, top: navPos.y }}
        >
          <div
            className="cursor-move select-none text-white/70 px-1 text-xs tracking-widest"
            onMouseDown={handleNavDragStart}
            onTouchStart={handleNavDragStart}
            title="Kéo để di chuyển"
          >
            ⠿⠿
          </div>
          <button
            onClick={() => navPrev()}
            title="Trước"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-base font-bold transition-colors"
          >
            ‹
          </button>
          <span className="text-[11px] text-white px-1.5 font-semibold tabular-nums whitespace-nowrap">
            {toMyanmar(navCtx.idx + 1)}/{toMyanmar(navCtx.list.length)}
          </span>
          <button
            onClick={() => navNext()}
            title="Sau"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-base font-bold transition-colors"
          >
            ›
          </button>
          <button
            onClick={clearFilter}
            title="Đóng"
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-xs transition-colors ml-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Các huy hiệu (badge) số lượng tâm / sở hữu tâm được hiển thị bên dưới phần đầu của mỗi bảng tâm (citta panel) / sở hữu tâm (cetasika panel) */}

    {/* Main Content Area */}
    <main className="flex-1 flex flex-col md:flex-row p-2 gap-2 overflow-hidden max-w-[1500px] mx-auto w-full">
      
      {/* LEFT PANEL: CITTAS */}
      <section className="relative w-full md:w-1/2 bg-white rounded-xl shadow-sm p-2 flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 pb-2 border-b mb-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
             <h2 
               className="text-base font-bold text-slate-700 cursor-pointer select-none hover:text-blue-600 transition-colors"
               onClick={() => setLokuttaraExpanded(prev => !prev)}
               title="Bấm để chuyển đổi số lượng tâm Siêu thế (rộng/thu gọn)"
             >
               {lokuttaraExpanded ? 'Tâm Siêu thế rộng (121 tâm)' : 'Tâm Siêu thế thu gọn (89 tâm)'}
             </h2>

            {/* Akusala/Missaka/Bodhipakkhiya/Sabba Filters — ခလုတ်ကို နှိပ်မှသာ subcategory ဆွဲချပြသည် */}
            <div className="flex flex-wrap gap-1.5 items-start">
              <DropButton
                label="Tâm theo hạng người"
                activeLabel={filter.type === 'puggala' ? PUGGALA_CITTA_TYPES.find(p => p.id === filter.value)?.name : null}
                isOpen={openMenu === 'puggala'}
                isActiveFilter={filter.type === 'puggala'}
                onToggle={() => setOpenMenu(prev => prev === 'puggala' ? null : 'puggala')}
                onClear={clearFilter}
              >
                {PUGGALA_CITTA_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { toggleFilter('puggala', p.id, { name: p.name, desc: "" }); setOpenMenu(null); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
                      filter.type === 'puggala' && filter.value === p.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </DropButton>
              <DropButton
                label="Tử - Tục sinh"
                activeLabel={filter.type === 'suti-pati' ? SUTI_PATI_TYPES.find(p => p.id === filter.value)?.name : null}
                isOpen={openMenu === 'suti-pati'}
                isActiveFilter={filter.type === 'suti-pati'}
                onToggle={() => setOpenMenu(prev => prev === 'suti-pati' ? null : 'suti-pati')}
                onClear={clearFilter}
              >
                {SUTI_PATI_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { toggleFilter('suti-pati', p.id, { name: p.name, desc: p.note || "" }); setOpenMenu(null); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
                      filter.type === 'suti-pati' && filter.value === p.id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </DropButton>
              {(cittaContext === null || cittaContext <= 12) && <AkusalaDropdown />}
              <MissakaDropdown />
              {(cittaContext === null || JAVANA_SOBHANA_IDS.includes(cittaContext)) && <BodhiDropdown />}
              <SabbaDropdown />
            </div>
          </div>
        </div> 
        {showCittaBadge && (
          <div className="absolute top-16 md:top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className="text-4xl md:text-5xl font-extrabold text-blue-700 leading-none tabular-nums drop-shadow-md">
              {toMyanmar(activeCittaCount)}
            </div>
          </div>
        )}
        <div className="flex flex-col">
          {(kamaGroupsVisible || mahaggataGroupsVisible) && (
          <VerticalWrap title="Hiệp thế tâm (81)">
            {kamaGroupsVisible && (
            <VerticalWrap title="Dục giới tâm (54)">
              {CITTA_LAYOUT.slice(0, 3).map((group, idx) => {
                const visibleSubs = group.subGroups.filter(sub => isCittaSubGroupVisible(sub.id));
                if (visibleSubs.length === 0) return null;
                return (
                <MainGroupBox key={idx} title={group.title}>
                  {visibleSubs.map(sub => {
                    const isPaired = ['maha-kusala', 'maha-vipaka', 'maha-kiriya'].includes(sub.id);
                    const items = CITTAS.filter(c => c.subGroup === sub.id);
                    const renderDot = (c) => {
                        const isActive = isCittaActive(c.id);
                        const isTargeted = (filter.type === 'citta' && filter.value === c.id) || (detailPick && detailPick.type === 'citta' && detailPick.id === c.id) || isCittaContextTargeted(c.id);
                        return (
                          <Dot 
                            key={`c-${c.id}`} item={c} type="citta"
                            isActive={isTargeted}
                            isDimmed={filter.type !== 'none' && !isActive}
                            onClick={(itemDetail, rect) => {
                              if (handleMagganggaCittaClick(c.id, itemDetail, rect)) return;
                              selectDetail('citta', c.id, itemDetail, rect);
                            }}
                            onLongPress={getNanakadaciConfig(c.id) ? (itemDetail, rect) => handleCittaLongPress(c.id, itemDetail, rect) : undefined}
                          />
                        );
                      };
                    return (
                      <SubGroupBox 
                        key={sub.id} 
                        id={sub.id}
                        title={sub.title}
                        isActive={filter.type === 'citta-subgroup' && filter.value === sub.id}
                        onClick={(e) => handleGroupToggle('citta-subgroup', sub.id, sub.title, e.currentTarget.getBoundingClientRect())}
                      >
                        {isPaired
                          ? Array.from({ length: Math.ceil(items.length / 2) }, (_, i) => (
                              <div key={`pair-${items[i*2].id}`} className="flex gap-0.5 p-0.5 rounded-full border-2 border-dashed border-slate-300">
                                {renderDot(items[i*2])}
                                {items[i*2+1] && renderDot(items[i*2+1])}
                              </div>
                            ))
                          : items.map(renderDot)
                        }
                      </SubGroupBox>
                    );
                 })}
                </MainGroupBox>
                );
              })}
            </VerticalWrap>
            )}

            {mahaggataGroupsVisible && (
            <VerticalWrap title="Đáo đại tâm (27)">
            {CITTA_LAYOUT.slice(3, 5).map((group, idx) => {
              const visibleSubs = group.subGroups.filter(sub => isCittaSubGroupVisible(sub.id));
              if (visibleSubs.length === 0) return null;
              return (
              <MainGroupBox key={idx} title={group.title}>
                {visibleSubs.map(sub => (
                  <SubGroupBox 
                    key={sub.id} 
                    id={sub.id}
                    title={sub.title}
                    isActive={filter.type === 'citta-subgroup' && filter.value === sub.id}
                    onClick={(e) => handleGroupToggle('citta-subgroup', sub.id, sub.title, e.currentTarget.getBoundingClientRect())}
                  >
                    {CITTAS.filter(c => c.subGroup === sub.id).map(c => {
                        const isActive = isCittaActive(c.id);
                        const isTargeted = (filter.type === 'citta' && filter.value === c.id) || (detailPick && detailPick.type === 'citta' && detailPick.id === c.id) || isCittaContextTargeted(c.id);
                        return (
                          <Dot 
                            key={`c-${c.id}`} item={c} type="citta"
                            isActive={isTargeted}
                            isDimmed={filter.type !== 'none' && !isActive}
                            onClick={(itemDetail, rect) => selectDetail('citta', c.id, itemDetail, rect)}
                            onLongPress={getNanakadaciConfig(c.id) ? (itemDetail, rect) => handleCittaLongPress(c.id, itemDetail, rect) : undefined}
                          />
                        );
                      })}
                  </SubGroupBox>
                ))}
              </MainGroupBox>
              );
            })}
            </VerticalWrap>
            )}
          </VerticalWrap>
          )}

          {CITTA_LAYOUT.slice(5).map((group, idx) => {
            const sourceData0 = lokuttaraExpanded ? CITTAS : LOKUTTARA_8;
            const visibleSubs = group.subGroups.filter(sub => isCittaSubGroupVisible(sub.id, sourceData0));
            if (visibleSubs.length === 0) return null;
            return (
            <MainGroupBox 
              key={idx} 
              title={
                <span 
                  className="cursor-pointer hover:text-blue-300 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLokuttaraExpanded(prev => !prev); }}
                >
                  {lokuttaraExpanded ? 'Tâm Siêu thế rộng (40)' : 'Tâm Siêu thế (8)'}
                </span>
              }
            >
              {visibleSubs.map(sub => {
                const sourceData = lokuttaraExpanded ? CITTAS : LOKUTTARA_8;
                const subTitle = lokuttaraExpanded
                  ? sub.title
                  : (sub.id === 'magga' ? 'Tâm Đạo (4)' : 'Tâm Quả (4)');
                return (
                  <SubGroupBox 
                    key={sub.id} 
                    id={sub.id}
                    title={subTitle}
                    isActive={filter.type === 'citta-subgroup' && filter.value === sub.id}
                    onClick={(e) => handleGroupToggle('citta-subgroup', sub.id, subTitle, e.currentTarget.getBoundingClientRect())}
                  >
                    {sourceData.filter(c => c.subGroup === sub.id).map(c => {
                        const isActive = isCittaActive(c.id);
                        const isTargeted = (filter.type === 'citta' && filter.value === c.id) || (detailPick && detailPick.type === 'citta' && detailPick.id === c.id) || isCittaContextTargeted(c.id);
                        const isSaccaVimuttaActive = filter.type === 'sabba-detail' && filter.value && filter.value.id === 'saccavimutta';
                        return (
                          <Dot 
                            key={`c-${c.id}`} item={c} type="citta"
                            isActive={isTargeted || (isSaccaVimuttaActive && saccaVimuttaFocus && saccaVimuttaFocus.cittaId === c.id)}
                            isDimmed={filter.type !== 'none' && !isActive}
                            onClick={(itemDetail, rect) => {
                              if (isSaccaVimuttaActive) { handleLokuttaraClick(c.id, itemDetail, rect); return; }
                              selectDetail('citta', c.id, itemDetail, rect);
                            }}
                          />
                        );
                      })}
                    </SubGroupBox>
                  );
                })}
              </MainGroupBox>
              );
            })}
            <div
  className={`mt-2 rounded-xl border-2 p-4 text-center transition-all cursor-default ${
    isNibbanaActive ? 'border-amber-500 bg-amber-50 ring-4 ring-amber-300 scale-[1.02]' : 'border-slate-300 bg-slate-50'
  } ${nibbanaDimmed ? 'opacity-15 grayscale' : ''}`}
>
  <div className="text-lg md:text-xl font-extrabold text-amber-700 tracking-wide">Niết-bàn</div>
  
  <div className="mt-3 flex flex-wrap gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
    {NIBBANA_GUNA.map(item => <NibbanaDot key={`ng-${item.id}`} item={item} />)}
  </div>
</div>
            
            </div>
          <div
  className={`mt-2 rounded-xl border-2 p-4 text-center transition-all cursor-default ${
    isPannattiActive ? 'border-teal-500 bg-teal-50 ring-4 ring-teal-300 scale-[1.02]' : 'border-slate-300 bg-slate-50'
  } ${pannattiDimmed ? 'opacity-15 grayscale' : ''}`}
>
  <div className="text-lg md:text-xl font-extrabold text-teal-700 tracking-wide">Chế định (Paññatti)</div>
    <div className="mt-3 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
    <div className="flex flex-row items-center gap-2">
      <span className="text-[10px] md:text-[11px] font-semibold text-teal-700 w-20 md:w-24 text-right shrink-0">Nghĩa chế định (6)</span>
      <div className="flex flex-wrap gap-1.5 justify-center flex-1">
        {ATTHA_PANNATTI.map(item => <PannattiDot key={`ap-${item.id}`} item={item} />)}
      </div>
    </div>
    <div className="flex flex-row items-center gap-2">
      <span className="text-[10px] md:text-[11px] font-semibold text-teal-700 w-20 md:w-24 text-right shrink-0">Ngữ chế định (6)</span>
      <div className="flex flex-wrap gap-1.5 justify-center flex-1">
        {SADDA_PANNATTI.map(item => <PannattiDot key={`sp-${item.id}`} item={item} />)}
      </div>
    </div>
  </div>
</div>
         
        </section>

        {/* RIGHT PANEL: CETASIKAS & RUPAS */}
        <section className="w-full md:w-1/2 flex flex-col gap-2 overflow-y-auto h-full">
          
          {/* CETASIKAS */}
          <div className="relative bg-white rounded-xl shadow-sm p-2 flex-1">
            <div className="sticky top-0 bg-white z-10 pb-2 border-b mb-3 relative">
              <div className="absolute top-0 left-0 pointer-events-none">
                <h2 className="text-base font-bold text-slate-700">52 Sở hữu tâm (Cetasika)</h2>
              </div>
              <div className="flex justify-end items-center flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <DropButton
                    label="Tánh"
                    activeLabel={filter.type === 'jati' ? JATI_TYPES.find(j => j.id === filter.value)?.name : null}
                    isOpen={openMenu === 'jati'}
                    isActiveFilter={filter.type === 'jati'}
                    onToggle={() => setOpenMenu(prev => prev === 'jati' ? null : 'jati')}
                    onClear={clearFilter}
                  >
                    {jatiOptions.map(j => (
                      <button
                        key={j.id}
                        onClick={() => { toggleFilter('jati', j.id, { name: `Tánh - Tâm ${j.name}`, desc: "" }); setOpenMenu(null); }}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
                          filter.type === 'jati' && filter.value === j.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {j.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="Thọ" activeLabel={filter.type === 'vedana' ? VEDANA_TYPES.find(v => v.id === filter.value)?.name : null} isOpen={openMenu === 'vedana'} isActiveFilter={filter.type === 'vedana'} onToggle={() => setOpenMenu(p => p === 'vedana' ? null : 'vedana')} onClear={clearFilter}>
                    {vedanaOptions.map(v => (
                      <button key={v.id} onClick={() => setFilterDirect('vedana', v.id, v)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'vedana' && filter.value === v.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {v.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="Nhân" activeLabel={filter.type === 'hetu' ? HETU_TYPES.find(h => h.id === filter.value)?.name : null} isOpen={openMenu === 'hetu'} isActiveFilter={filter.type === 'hetu'} onToggle={() => setOpenMenu(p => p === 'hetu' ? null : 'hetu')} onClear={clearFilter}>
                    {hetuOptions.map(h => (
                      <button key={h.id} onClick={() => setFilterDirect('hetu', h.id, h)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'hetu' && filter.value === h.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {h.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="Phận sự" activeLabel={filter.type === 'kicca' ? KICCA_TYPES.find(k => k.id === filter.value)?.name : null} isOpen={openMenu === 'kicca'} isActiveFilter={filter.type === 'kicca'} onToggle={() => setOpenMenu(p => p === 'kicca' ? null : 'kicca')} onClear={clearFilter}>
                    {kiccaOptions.map(k => (
                      <button key={k.id} onClick={() => setFilterDirect('kicca', k.id, k)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'kicca' && filter.value === k.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {k.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="Môn" activeLabel={filter.type === 'dvara' ? DVARA_TYPES.find(d => d.id === filter.value)?.name : null} isOpen={openMenu === 'dvara'} isActiveFilter={filter.type === 'dvara'} onToggle={() => setOpenMenu(p => p === 'dvara' ? null : 'dvara')} onClear={clearFilter}>
                    {dvaraOptions.map(d => (
                      <button key={d.id} onClick={() => setFilterDirect('dvara', d.id, d)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'dvara' && filter.value === d.id ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {d.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="Cảnh" activeLabel={filter.type === 'arammana' ? ARAMMANA_TYPES.find(a => a.id === filter.value)?.name : null} isOpen={openMenu === 'arammana'} isActiveFilter={filter.type === 'arammana'} onToggle={() => setOpenMenu(p => p === 'arammana' ? null : 'arammana')} onClear={clearFilter}>
                    {arammanaOptions.map(a => (
                      <button key={a.id} onClick={() => setFilterDirect('arammana', a.id, a)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'arammana' && filter.value === a.id ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {a.name}
                      </button>
                    ))}
                  </DropButton>
                  <DropButton label="Vật" activeLabel={filter.type === 'vatthu' ? VATTHU_TYPES.find(v => v.id === filter.value)?.name : null} isOpen={openMenu === 'vatthu'} isActiveFilter={filter.type === 'vatthu'} onToggle={() => setOpenMenu(p => p === 'vatthu' ? null : 'vatthu')}  onClear={clearFilter}>
                    {vatthuOptions.map(v => (
                      <button key={v.id} onClick={() => setFilterDirect('vatthu', v.id, v)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${filter.type === 'vatthu' && filter.value === v.id ? 'bg-lime-600 text-white border-lime-600' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}>
                        {v.name}
                      </button>
                    ))}
                  </DropButton>
                </div>
              </div>
            </div>
            
            {showCetasikaBadge && (
              <div className="absolute top-16 md:top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="text-4xl md:text-5xl font-extrabold text-emerald-700 leading-none tabular-nums drop-shadow-md">
                  {toMyanmar(activeCetasikaCount)}
                </div>
              </div>
            )}
            <div className="flex flex-col">
              {CETASIKA_LAYOUT.map((group, idx) => {
                const visibleSubs = group.subGroups.filter(sub => isCetasikaSubGroupVisible(sub.id));
                if (visibleSubs.length === 0) return null;
                return (
                <MainGroupBox key={idx} title={group.title}>
                  {visibleSubs.map(sub => {
                    const items = CETASIKAS.filter(ct => ct.subGroup === sub.id);
                    const isSobhanaSadharana = sub.id === 'sobhana-sadharana';

                    const renderDot = (ct) => {
                      const isActive = isCetasikaActive(ct.id);
                      const isTargeted = (filter.type === 'cetasika' && filter.value === ct.id) || (detailPick && detailPick.type === 'cetasika' && detailPick.id === ct.id);
                      return (
                        <Dot 
                          key={`ct-${ct.id}`} item={ct} type="cetasika"
                          isActive={isTargeted}
                          isDimmed={filter.type !== 'none' && !isActive}
                          onClick={(itemDetail, rect) => selectDetail('cetasika', ct.id, itemDetail, rect)} 
                        />
                      );
                    };

                    const units = [];
                    for (let i = 0; i < items.length; i++) {
                      const ct = items[i];
                      if (YUGALA_PAIR_STARTS.has(ct.id) && items[i + 1]) {
                        units.push({ kind: 'pair', a: ct, b: items[i + 1] });
                        i++;
                      } else {
                        units.push({ kind: 'single', a: ct });
                      }
                    }

                    const renderUnit = (u) => u.kind === 'pair' ? (
                      <div key={`pair-${u.a.id}`} className="flex gap-1 md:gap-1.5 p-1 rounded-full border-2 border-dashed border-slate-300">
                        {renderDot(u.a)}
                        {renderDot(u.b)}
                      </div>
                    ) : renderDot(u.a);

                    const subActive = filter.type === 'cetasika-subgroup' && filter.value === sub.id;
                    return (
                      <SubGroupBox 
                        key={sub.id}
                        id={sub.id}
                        title={sub.title}
                        hideTitle={isSobhanaSadharana}
                        isActive={subActive}
                        onClick={(e) => handleGroupToggle('cetasika-subgroup', sub.id, sub.title, e.currentTarget.getBoundingClientRect())}
                      >
                        {isSobhanaSadharana ? (
                          <>
                            <div className="flex flex-wrap gap-1 md:gap-1.5 items-center">
                              {units.slice(0, 9).map(renderUnit)}
                            </div>
                            <div className="flex flex-row items-center gap-2">
                              <div className="flex flex-wrap gap-1 md:gap-1.5 items-center flex-1">
                                {units.slice(9).map(renderUnit)}
                              </div>
                              <div 
                                className={`text-[10px] md:text-[11px] font-semibold text-right cursor-pointer transition-colors shrink-0 w-16 md:w-24 leading-snug ${subActive ? 'text-blue-800' : 'text-slate-600 hover:text-blue-600'}`}
                                title={`Bấm để chọn ${sub.title}`}
                              >
                                {sub.title}
                              </div>
                            </div>
                          </>
                        ) : (
                          units.map(renderUnit)
                        )}
                      </SubGroupBox>
                    );
                  })}
                </MainGroupBox>
                );
              })}
            </div>
          </div>

          {(filter.type === 'none' || rupaFilterActive || photthabbaOn || selectedKalapa || selectedSamutthana || selectedBhumiItem) && (
<div className="relative bg-white rounded-xl shadow-sm p-2 mb-2">
  {rupaFilterActive && (
    <div className="absolute top-8 md:top-9 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="text-3xl md:text-4xl font-extrabold text-amber-700 leading-none tabular-nums drop-shadow-md">
        {toMyanmar(activeRupaCategory.rupaIds.length)}
      </div>
    </div>
  )}
  <div className="flex justify-between items-center flex-wrap gap-2 mb-2 pb-1 border-b">
    <h2 className="text-base font-bold text-slate-700">28 Sắc pháp (Rūpa)</h2>
    <div className="flex flex-wrap gap-1.5 justify-end">
      <KalapaDropdown />
      <SamutthanaDropdown />
      <DropButton
        label="Sắc do tâm sinh"
        activeLabel={filter.type === 'cittaja-rupa' ? CITTAJA_RUPA_TYPES.find(c => c.id === filter.value)?.name : null}
        isOpen={openMenu === 'cittaja-rupa'}
        isActiveFilter={filter.type === 'cittaja-rupa'}
        onToggle={() => setOpenMenu(prev => prev === 'cittaja-rupa' ? null : 'cittaja-rupa')}
        onClear={clearFilter}
      >
        {CITTAJA_RUPA_TYPES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { toggleFilter('cittaja-rupa', cat.id, { name: cat.name, desc: "" }); setOpenMenu(null); }}
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors border whitespace-nowrap ${
              filter.type === 'cittaja-rupa' && filter.value === cat.id
              ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm'
              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </DropButton>
    </div>
  </div>
  <div className="flex flex-col">
  
    <MainGroupBox title="Đại bản chất (4)">
    <div className="text-[10px] md:text-[15px] font-semibold text-slate-400 px-2 pt-1">
      Sắc thành tựu (Nipphanna rūpa - 18)
    </div>
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 items-center">
      
        {RUPAS.filter(r => r.group === 'mahabhuta').map(r => {
          const dimmed = photthabbaOn ? ![1, 2, 4].includes(r.id) : (rupaFilterActive && !isRupaActive(r.id));
          const ringClass = photthabbaOn && [1,2,4].includes(r.id) ? 'ring-4 ring-amber-400 scale-110' : '';
          return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} ringClass={ringClass} />;
        })}
      </div>
    </MainGroupBox>

    
    <MainGroupBox title="Sắc y sinh (24)">
      <div className="flex flex-col">
        {[
          { subGroup: 'pasada', title: 'Sắc tịnh tâm (5)' },
          { subGroup: 'gocara', title: 'Sắc cảnh (7)', withPhotthabba: true },
          { subGroup: 'bhava', title: 'Sắc tính (2)' },
          { subGroup: 'hadaya', title: 'Sắc ý vật (1)' },
          { subGroup: 'jivita', title: 'Sắc mạng quyền (1)' },
          { subGroup: 'ahara', title: 'Sắc vật thực (1)' },
        ].map(row => (
          <div key={row.subGroup} className="flex flex-row items-center justify-between p-1.5 md:p-2 border-b last:border-b-0 border-slate-100">
            <div className="flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center">
              {RUPAS.filter(r => r.subGroup === row.subGroup && !r.virtual).map(r => {
                const dimmed = rupaFilterActive && !isRupaActive(r.id);
                return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} />;
              })}
              {row.withPhotthabba && (() => {
                const photthabbaRef = RUPAS.find(x => x.virtual);
                return (
                  <RupaDot
                    key="r-photthabba"
                    r={{ id: 'photthabba', name: 'Pháp xúc (Phoṭṭhabba)', color: photthabbaOn ? 'bg-amber-100 border-2 border-amber-500' : 'bg-white border-2 border-dashed border-slate-400', desc: photthabbaRef ? photthabbaRef.desc : '' }}
                    dimmed={false}
                    ringClass={photthabbaOn ? 'ring-4 ring-amber-300 scale-110 text-amber-700' : 'text-slate-500'}
                    extraClickHandler={(rect) => {
                      setFilter({ type: 'none', value: null });
                      setVithiActiveIdx(null);
                      setDetailPick(null);
                      setOpenMenu(null);
                      setSelectedKalapa(null);
                      const willTurnOn = !photthabbaOn;
                      setPhotthabbaOn(prev => !prev);
                      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
                      if (willTurnOn && photthabbaRef) {
                        setActiveDetail({ name: 'Pháp xúc (Phoṭṭhabba)', desc: photthabbaRef.desc || '' });
                        setTooltipPos(rect ? { x: rect.left + rect.width / 2, y: rect.top } : null);
                        tooltipTimerRef.current = setTimeout(() => {
                          setActiveDetail({ name: "", desc: "" });
                          setTooltipPos(null);
                        }, 4000);
                      } else {
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                      }
                    }}
                  />
                );
              })()}
            </div>
            <div className="text-[10px] md:text-[11px] font-semibold text-slate-600 shrink-0 ml-2 text-right w-16 md:w-24 leading-snug">
              {row.title}
            </div>
          </div>
        ))}

        <div className="text-[10px] md:text-[15px] font-semibold text-slate-400 px-1.5 md:px-2 pt-2 border-t border-slate-100">
          Sắc không thành tựu (Anipphanna rūpa - 10)
        </div>

        {[
          { ids: [19], title: 'Sắc giới hạn (1)' },
          { ids: [23, 24], title: 'Sắc biểu tỏ (2)' },
          { ids: [20, 21, 22], title: 'Sắc trạng thái (3)' },
        ].map(row => (
          <div key={row.title} className="flex flex-row items-center justify-between p-1.5 md:p-2 border-b last:border-b-0 border-slate-100">
            <div className="flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center">
              {RUPAS.filter(r => row.ids.includes(r.id)).map(r => {
                const dimmed = rupaFilterActive && !isRupaActive(r.id);
                return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} />;
              })}
            </div>
            <div className="text-[10px] md:text-[11px] font-semibold text-slate-600 shrink-0 ml-2 text-right w-16 md:w-24 leading-snug">
              {row.title}
            </div>
          </div>
        ))}

        <div className="flex flex-row items-center justify-between p-1.5 md:p-2">
        
          <div className="flex flex-wrap gap-1 md:gap-1.5 flex-1 items-center">
          <span className="text-[9px] md:text-[10px] font-semibold text-slate-500">Sắc đặc tính</span>
            {(() => {
              const lakkhanaItems = RUPAS.filter(r => r.subGroup === 'lakkhana');
              const renderLakkhanaDot = (r) => {
                const dimmed = rupaFilterActive && !isRupaActive(r.id);
                return <RupaDot key={`r-${r.id}`} r={r} dimmed={dimmed} />;
              };
              const jatiRupas = lakkhanaItems.filter(r => r.name === 'Tích sinh' || r.name === 'Nối tiếp');
              const otherRupas = lakkhanaItems.filter(r => r.name !== 'Tích sinh' && r.name !== 'Nối tiếp');
              return (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1 md:gap-1.5 p-1.5 rounded-full border-2 border-dashed border-slate-400">
                      {jatiRupas.map(renderLakkhanaDot)}
                    </div>
                    
                  </div>
                  {otherRupas.map(renderLakkhanaDot)}
                </>
              );
            })()}
          </div>
          <div className="text-[10px] md:text-[11px] font-semibold text-slate-600 shrink-0 ml-2 text-right w-16 md:w-24 leading-snug">
            Sắc trạng thái (4)
          </div>
        </div>
      </div>
    </MainGroupBox>
  </div>
</div>
)}

        </section>
      </main>

      {/* Nổi bảng trình tự tâm (vithi) — Có thể kéo thả, không ảnh hưởng bảng bên dưới */}
      <button
        onClick={() => { if (vithiOpen) { setVithiOpen(false); clearFilter(); } else { openVithiPanel(); } }}
        className="fixed bottom-4 right-4 z-40 bg-indigo-700 hover:bg-indigo-800 text-white rounded-full w-14 h-14 shadow-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight transition-colors"
        title="Hiện/Ẩn trình tự tâm (Vīthi)"
      >
        <span>Vīthi</span>
        <span className="text-sm">{vithiOpen ? '✕' : '▶'}</span>
      </button>

      <button
        onClick={() => { if (bhumiOpen) { setBhumiOpen(false); clearFilter(); } else { setBhumiOpen(true); } }}
        className="fixed bottom-4 right-24 z-40 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full w-14 h-14 shadow-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight transition-colors"
        title="Hiện/Ẩn bảng 31 cõi sinh tồn"
      >
        <span>31 cõi</span>
        <span className="text-sm">{bhumiOpen ? '✕' : '▶'}</span>
      </button>
      <button
        onClick={() => { if (paticcaOpen) { setPaticcaOpen(false); clearFilter(); } else { setPaticcaOpen(true); setSelectedPaticcaId(null); } }}
        className="fixed bottom-4 right-44 z-40 bg-violet-700 hover:bg-violet-800 text-white rounded-full w-14 h-14 shadow-lg flex flex-col items-center justify-center text-[10px] font-bold leading-tight transition-colors"
        title="Hiện/Ẩn biểu đồ Duyên Khởi (12)"
      >
        <span>Duyên Khởi</span>
        <span className="text-sm">{paticcaOpen ? '✕' : '▶'}</span>
      </button>

      {bhumiOpen && (
        <div
          className="fixed z-40 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col"
          style={{ left: bhumiPos.x, top: bhumiPos.y, width: 240, maxWidth: '120vw', maxHeight: '185vh', resize: 'both', overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-emerald-700 text-white rounded-t-xl cursor-move select-none shrink-0"
            onMouseDown={handleBhumiDragStart}
            onTouchStart={handleBhumiDragStart}
          >
            <span className="text-sm font-bold">31 cõi (Bhūmi)</span>
            <button
              onClick={() => { setBhumiOpen(false); clearFilter(); }}
              className="text-white/80 hover:text-white text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
          <div className="p-4 flex flex-col gap-4 overflow-y-auto">
            {BHUMI_31.map(g => {
              const gc = BHUMI_COLOR_MAP[g.color] || BHUMI_COLOR_MAP.rose;
              const renderChip = (it) => {
                const isSelected = selectedBhumiItem && selectedBhumiItem.name === it.name;
                return (
                  <button
                    key={it.name}
                    title={it.life}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (isSelected) {
                        setFilter({ type: 'none', value: null });
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                        setSelectedBhumiItem(null);
                        return;
                      }
                      setSelectedBhumiItem(it);
                      setDetailPick(null);
                      setPhotthabbaOn(false);
                      setSelectedKalapa(null);
                      setSelectedSamutthana(null);
                      setActiveDetail({ name: it.name, desc: it.life ? `Tuổi thọ — ${it.life}` : '' });
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
                      tooltipTimerRef.current = setTimeout(() => {
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                      }, 3000);
                      setFilter({ type: 'citta-multi', value: it.cittaIds || [] });
                    }}
                    className={`text-[11px] px-2 py-1 rounded-full border cursor-pointer transition-colors ${gc.chip} ${isSelected ? 'ring-2 ring-offset-1 ring-slate-700 font-bold' : ''}`}
                  >
                    {it.name}
                  </button>
                );
              };
              return (
              <div key={g.group}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${gc.bar}`} />
                  <div className={`text-sm font-bold ${gc.title}`}>{g.name}</div>
                </div>
                {g.subgroups ? (
                  <div className="flex flex-col gap-2">
                    {g.subgroups.map(sg => {
                      const sgc = BHUMI_COLOR_MAP[sg.color] || gc;
                      return (
                        <div key={sg.name} className={`pl-2 border-l-2 ${sgc.bar.replace('bg-', 'border-')}`}>
                          <div className={`text-[11px] font-semibold mb-1 ${sgc.title}`}>{sg.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {sg.items.map(renderChip)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map(renderChip)}
                  </div>
                )}
                {g.note && <div className="text-[10px] text-slate-400 mt-1.5 leading-snug">{g.note}</div>}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {paticcaOpen && (
        <div
          className="fixed z-40 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col"
          style={{ left: paticcaPos.x, top: paticcaPos.y, width: 400, maxWidth: '95vw', maxHeight: '90vh', resize: 'both', overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5 bg-violet-700 text-white rounded-t-xl cursor-move select-none shrink-0"
            onMouseDown={handlePaticcaDragStart}
            onTouchStart={handlePaticcaDragStart}
          >
            <span className="text-sm font-bold">Thập Nhị Nhân Duyên (12 Chi Tộc)</span>
            <button
              onClick={() => { setPaticcaOpen(false); clearFilter(); }}
              className="text-white/80 hover:text-white text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
          <div className="p-3 overflow-auto flex flex-col items-center">
            <svg viewBox="0 0 340 340" className="w-full max-w-[360px]">
              <defs>
                {PATICCA_12.map((item, i) => {
                  const angleStart = -90 + i * 30;
                  const angleEnd = -90 + (i + 1) * 30;
                  return (
                    <path
                      key={`arc-${item.id}`}
                      id={`paticca-arc-${item.id}`}
                      d={paticcaTextArcPath(170, 170, 112, angleStart, angleEnd)}
                      fill="none"
                    />
                  );
                })}
              </defs>
              {PATICCA_12.map((item, i) => {
                const angleStart = -90 + i * 30;
                const angleEnd = -90 + (i + 1) * 30;
                const isSelected = selectedPaticcaId === item.id;
                return (
                  <path
                    key={item.id}
                    d={paticcaWedgePath(170, 170, 150, 74, angleStart, angleEnd)}
                    fill={item.color}
                    stroke="#fff"
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={selectedPaticcaId && !isSelected ? 0.35 : 1}
                    className="cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (isSelected) {
                        setSelectedPaticcaId(null);
                        clearFilter();
                        return;
                      }
                      setSelectedPaticcaId(item.id);
                      setDetailPick(null);
                      setPhotthabbaOn(false);
                      setSelectedKalapa(null);
                      setSelectedSamutthana(null);
                      setSelectedBhumiItem(null);
                      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
                      setActiveDetail({ name: item.name, desc: item.desc });
                      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                      tooltipTimerRef.current = setTimeout(() => {
                        setActiveDetail({ name: "", desc: "" });
                        setTooltipPos(null);
                      }, 4000);
                      setFilter({
                        type: 'sabba-detail',
                        value: {
                          id: `paticca-${item.id}`,
                          name: item.name,
                          note: item.desc,
                          cetasikaIds: item.cetasikaIds,
                          cittaIds: item.cittaIds,
                          rupaIds: item.rupaIds,
                        },
                      });
                    }}
                  />
                );
              })}
              {PATICCA_12.map((item) => (
                <text key={`t-${item.id}`} className="pointer-events-none select-none" fill="#fff" fontSize="13" fontWeight="700" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
                  <textPath href={`#paticca-arc-${item.id}`} xlinkHref={`#paticca-arc-${item.id}`} startOffset="50%" textAnchor="middle">
                    {item.name}
                  </textPath>
                </text>
              ))}
              <circle cx="170" cy="170" r="72" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="170" y="164" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">Thập Nhị</text>
              <text x="170" y="180" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">Nhân Duyên</text>
            </svg>
            {selectedPaticcaId && (() => {
              const item = PATICCA_12.find(x => x.id === selectedPaticcaId);
              if (!item) return null;
              return (
                <div className="mt-2 p-3 rounded-lg text-xs md:text-sm text-white w-full" style={{ backgroundColor: item.color }}>
                  <div className="font-bold mb-1">{item.name}</div>
                  <div className="leading-relaxed opacity-95">{item.desc}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {vithiOpen && (
        <div
          className="fixed z-40 bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col"
          style={{ left: vithiPos.x, top: vithiPos.y, width: 1500, height: 170, minWidth: 360, minHeight: 170, maxWidth: '95vw', maxHeight: '85vh', resize: 'both', overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between px-3 py-1.5 bg-indigo-700 text-white rounded-t-xl cursor-move select-none shrink-0"
            onMouseDown={handleVithiDragStart}
            onTouchStart={handleVithiDragStart}
          >
            <span className="text-[11px] md:text-xs font-semibold truncate pr-2">{vithiClickLabel || vithiCenterGroup || '—'}</span>
            <button onClick={() => { setVithiOpen(false); clearFilter(); }} className="text-white/80 hover:text-white text-lg leading-none px-1 shrink-0">✕</button>
          </div>
          <div 
            ref={vithiScrollRef}
            onScroll={updateVithiCenterGroup}
            className="p-3 pt-2.5 overflow-x-auto overflow-y-hidden flex-1" 
            style={{ touchAction: 'pan-x' }} 
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 w-max h-full">
              {LIFE_VITHI.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-300 text-xs shrink-0">›</span>}
                  <div ref={el => { vithiItemRefs.current[idx] = el; }}>
                    <VithiDot item={item} idx={idx} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
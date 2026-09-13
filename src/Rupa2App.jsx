
import React, { useState, useEffect } from 'react';
import { 
  Eye, Ear, Mountain, Droplets, Flame, Wind, Palette, 
  Flower2, Utensils, Wheat, Activity, User, Heart, Cloud, 
  Sun, Apple, X, Info, Brain, Target, Zap, Layers, ChevronDown, ChevronUp,
  Maximize, Minimize, RefreshCcw, Timer, ActivitySquare, BookOpen, ExternalLink
} from 'lucide-react';

// --- ရုပ် (၂၈) ပါး အသေးစိတ် အချက်အလက်များ (Rupa 28 Details in Vietnamese) ---
const rupa28 = {
  pathavi: { 
    id: 1, name: 'Địa đại (Sắc Đất)', icon: Mountain, color: 'text-amber-700', bg: 'bg-amber-100',
    lakkhana: 'Trạng thái cứng nhắc (= cứng, rắn chắc)',
    rasa: 'Làm nền tảng cho các sắc pháp đồng sinh (cùng bọn)',
    paccupatthana: 'Biểu hiện như là vật nâng đỡ, làm chỗ dựa cho các sắc pháp đồng sinh',
    padatthana: 'Nhân gần là 3 đại chủng đồng sinh còn lại'
  },
  apo: { 
    id: 2, name: 'Thủy đại (Sắc Nước)', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100',
    lakkhana: 'Trạng thái chảy hoặc rỉ ra',
    rasa: 'Làm tăng trưởng các sắc pháp đồng sinh',
    paccupatthana: 'Biểu hiện như là sự kết dính các sắc pháp đồng sinh',
    padatthana: 'Nhân gần là 3 đại chủng đồng sinh còn lại'
  },
  tejo: { 
    id: 3, name: 'Hỏa đại (Sắc Lửa)', icon: Flame, color: 'text-red-600', bg: 'bg-red-100',
    lakkhana: 'Trạng thái nóng (hoặc lạnh)',
    rasa: 'Làm chín muồi (làm già đi) các sắc pháp đồng sinh',
    paccupatthana: 'Biểu hiện như là sự cung cấp sự mềm dẻo thích hợp cho các sắc pháp đồng sinh',
    padatthana: 'Nhân gần là 3 đại chủng đồng sinh còn lại'
  },
  vayo: { 
    id: 4, name: 'Phong đại (Sắc Gió)', icon: Wind, color: 'text-teal-600', bg: 'bg-teal-100',
    lakkhana: 'Trạng thái nâng đỡ (hay căng cứng)',
    rasa: 'Thúc đẩy (di chuyển)',
    paccupatthana: 'Biểu hiện như là sự mang các sắc pháp đồng sinh từ nơi này sang nơi khác',
    padatthana: 'Nhân gần là 3 đại chủng đồng sinh còn lại'
  },
  cakkhu: { 
    id: 5, name: 'Nhãn thanh triệt', icon: Eye, color: 'text-blue-700', bg: 'bg-blue-200',
    lakkhana: 'Trạng thái trong sáng của đại chủng sinh ra do nghiệp có ái sắc làm nhân, muốn nhìn thấy cảnh sắc',
    rasa: 'Kéo tâm lộ hoặc con người hướng về cảnh sắc',
    paccupatthana: 'Làm chỗ nương cho Nhãn thức',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh đồng sinh'
  },
  sota: { 
    id: 6, name: 'Nhĩ thanh triệt', icon: Ear, color: 'text-amber-700', bg: 'bg-amber-200',
    lakkhana: 'Trạng thái trong sáng của đại chủng sinh ra do nghiệp có ái thinh làm nhân, muốn nghe âm thanh',
    rasa: 'Kéo tâm lộ hướng về cảnh thinh',
    paccupatthana: 'Làm chỗ nương cho Nhĩ thức',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh đồng sinh'
  },
  ghana: { 
    id: 7, name: 'Tỷ thanh triệt', icon: Flower2, color: 'text-pink-700', bg: 'bg-pink-200',
    lakkhana: 'Trạng thái trong sáng của đại chủng sinh ra do nghiệp có ái khí làm nhân, muốn ngửi mùi',
    rasa: 'Kéo tâm lộ hướng về cảnh khí',
    paccupatthana: 'Làm chỗ nương cho Tỷ thức',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh đồng sinh'
  },
  jivha: { 
    id: 8, name: 'Thiệt thanh triệt', icon: Utensils, color: 'text-orange-700', bg: 'bg-orange-200',
    lakkhana: 'Trạng thái trong sáng của đại chủng sinh ra do nghiệp có ái vị làm nhân, muốn nếm vị',
    rasa: 'Kéo tâm lộ hướng về cảnh vị',
    paccupatthana: 'Làm chỗ nương cho Thiệt thức',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh đồng sinh'
  },
  kaya: { 
    id: 9, name: 'Thân thanh triệt', icon: User, color: 'text-emerald-700', bg: 'bg-emerald-200',
    lakkhana: 'Trạng thái trong sáng của đại chủng sinh ra do nghiệp có ái xúc làm nhân, muốn chạm xúc',
    rasa: 'Kéo tâm lộ hướng về cảnh xúc',
    paccupatthana: 'Làm chỗ nương cho Thân thức',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh đồng sinh'
  },
  vanna: { 
    id: 10, name: 'Cảnh Sắc', icon: Palette, color: 'text-purple-600', bg: 'bg-purple-100',
    lakkhana: 'Trạng thái chạm vào Nhãn thanh triệt',
    rasa: 'Làm cảnh cho Nhãn thức',
    paccupatthana: 'Biểu hiện là cảnh giới của Nhãn thức',
    padatthana: 'Nhân gần là 4 đại chủng đồng sinh'
  },
  sadda: { 
    id: 11, name: 'Cảnh Thinh', icon: Ear, color: 'text-teal-600', bg: 'bg-teal-200',
    lakkhana: 'Trạng thái chạm vào Nhĩ thanh triệt',
    rasa: 'Làm cảnh cho Nhĩ thức',
    paccupatthana: 'Biểu hiện là cảnh giới của Nhĩ thức',
    padatthana: 'Nhân gần là 4 đại chủng đồng sinh'
  },
  gandha: { 
    id: 12, name: 'Cảnh Khí', icon: Flower2, color: 'text-pink-600', bg: 'bg-pink-100',
    lakkhana: 'Trạng thái chạm vào Tỷ thanh triệt',
    rasa: 'Làm cảnh cho Tỷ thức',
    paccupatthana: 'Biểu hiện là cảnh giới của Tỷ thức',
    padatthana: 'Nhân gần là 4 đại chủng đồng sinh'
  },
  rasa: { 
    id: 13, name: 'Cảnh Vị', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-100',
    lakkhana: 'Trạng thái chạm vào Thiệt thanh triệt',
    rasa: 'Làm cảnh cho Thiệt thức',
    paccupatthana: 'Biểu hiện là cảnh giới của Thiệt thức',
    padatthana: 'Nhân gần là 4 đại chủng đồng sinh'
  },
  itthi: { 
    id: 14, name: 'Sắc Nữ tính', icon: Heart, color: 'text-fuchsia-700', bg: 'bg-fuchsia-200',
    lakkhana: 'Trạng thái là nữ giới',
    rasa: 'Thể hiện rõ đây là nữ giới',
    paccupatthana: 'Làm nhân cho hình dáng, dấu hiệu, tư cách, cử chỉ của nữ giới',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh làm nền tảng'
  },
  pum: { 
    id: 15, name: 'Sắc Nam tính', icon: Zap, color: 'text-indigo-700', bg: 'bg-indigo-200',
    lakkhana: 'Trạng thái là nam giới',
    rasa: 'Thể hiện rõ đây là nam giới',
    paccupatthana: 'Làm nhân cho hình dáng, dấu hiệu, tư cách, cử chỉ của nam giới',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh làm nền tảng'
  },
  jivita: { 
    id: 16, name: 'Sắc Mạng quyền', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-100',
    lakkhana: 'Trạng thái gìn giữ các sắc nghiệp đồng sinh',
    rasa: 'Làm cho các sắc nghiệp đồng sinh tồn tại từ sinh đến diệt',
    paccupatthana: 'Biểu hiện là duy trì tuổi thọ cho các sắc nghiệp trước khi diệt',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh cần được nuôi dưỡng'
  },
  hadaya: { 
    id: 17, name: 'Sắc Ý căn (Tim)', icon: Brain, color: 'text-red-700', bg: 'bg-red-200',
    lakkhana: 'Trạng thái làm chỗ nương cho Ý giới và Ý thức giới',
    rasa: 'Làm nền tảng cho 2 giới đó',
    paccupatthana: 'Biểu hiện là nâng đỡ 2 giới đó',
    padatthana: 'Nhân gần là các đại chủng nghiệp sinh đồng sinh'
  },
  oja: { 
    id: 18, name: 'Sắc Vật thực (Oja)', icon: Wheat, color: 'text-green-600', bg: 'bg-green-100',
    lakkhana: 'Trạng thái tinh chất của thức ăn được nuốt vào',
    rasa: 'Duy trì các sắc vật thực sinh',
    paccupatthana: 'Biểu hiện là bồi bổ thể xác bằng cách tạo ra sắc vật thực sinh',
    padatthana: 'Nhân gần là thức ăn được nuốt vào'
  },
  akasa: {
    id: 19, name: 'Sắc Hư không', icon: Maximize, color: 'text-slate-600', bg: 'bg-slate-200',
    lakkhana: 'Trạng thái phân định các bọn sắc (Kalapa)',
    rasa: 'Làm lộ rõ ranh giới của các bọn sắc',
    paccupatthana: 'Biểu hiện là khoảng trống giới hạn giữa các bọn sắc (Đại chủng không chạm nhau)',
    padatthana: 'Nhân gần là các bọn sắc được phân cách'
  },
  kayaVinnatti: { 
    id: 20, name: 'Thân biểu tri', icon: ActivitySquare, color: 'text-violet-600', bg: 'bg-violet-200',
    lakkhana: 'Trạng thái cử động thân thể đặc biệt do tâm sinh phong đại gây ra để làm cho cơ thể vững chắc hoặc di chuyển',
    rasa: 'Bày tỏ ý định bên trong cho người khác biết qua thân',
    paccupatthana: 'Là nhân của sự cử động thân',
    padatthana: 'Nhân gần là sắc phong đại do tâm sinh'
  },
  vaciVinnatti: { 
    id: 21, name: 'Khẩu biểu tri', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-200',
    lakkhana: 'Trạng thái cử động đặc biệt tạo ra âm thanh tiếng nói, do sự va chạm của tâm sinh địa đại ở vị trí phát âm',
    rasa: 'Bày tỏ ý định bên trong cho người khác biết qua lời nói',
    paccupatthana: 'Là nhân của sự phát âm',
    padatthana: 'Nhân gần là sắc địa đại do tâm sinh'
  },
  lahuta: { 
    id: 22, name: 'Sắc Khinh (Nhẹ)', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-100',
    lakkhana: 'Trạng thái không nặng nề, không chậm chạp của sắc thực',
    rasa: 'Diệt trừ sự nặng nề của các sắc đó',
    paccupatthana: 'Biểu hiện là sự thay đổi, chuyển động nhanh nhẹn, nhẹ nhàng',
    padatthana: 'Nhân gần là các sắc nhẹ đó'
  },
  muduta: { 
    id: 23, name: 'Sắc Nhu (Mềm)', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-100',
    lakkhana: 'Trạng thái không cứng nhắc, không thô ráp của sắc thực',
    rasa: 'Diệt trừ sự cứng nhắc, thô ráp của sắc',
    paccupatthana: 'Biểu hiện là không chống lại mọi hoạt động của cơ thể',
    padatthana: 'Nhân gần là các sắc mềm đó'
  },
  kammannata: { 
    id: 24, name: 'Sắc Thích nghiệp', icon: Target, color: 'text-cyan-600', bg: 'bg-cyan-100',
    lakkhana: 'Trạng thái thích ứng, thuận lợi cho các hoạt động của cơ thể',
    rasa: 'Diệt trừ sự không thích ứng trong hoạt động',
    paccupatthana: 'Biểu hiện là trạng thái không yếu kém của sắc',
    padatthana: 'Nhân gần là các sắc thích ứng đó'
  },
  upacaya: {
    id: 25, name: 'Sắc Tích trữ', icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-100',
    lakkhana: 'Trạng thái khởi đầu của các sắc thực trong một kiếp sống',
    rasa: 'Phát triển lên trên cho đến khi các căn được đầy đủ',
    paccupatthana: 'Biểu hiện như sự làm cho các sắc pháp xuất hiện',
    padatthana: 'Nhân gần là các sắc đang sinh'
  },
  santati: {
    id: 26, name: 'Sắc Tương tục', icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-100',
    lakkhana: 'Trạng thái tiếp nối liên tục của sắc thực sau khi các căn đã đầy đủ',
    rasa: 'Liên kết liên tục từng giai đoạn',
    paccupatthana: 'Biểu hiện là sự tiếp nối không gián đoạn',
    padatthana: 'Nhân gần là các sắc pháp được kết nối liên tục'
  },
  jarata: {
    id: 27, name: 'Sắc Lão hóa (Dị)', icon: Timer, color: 'text-orange-500', bg: 'bg-orange-100',
    lakkhana: 'Trạng thái già yếu, chín muồi của sắc thực',
    rasa: 'Đưa đến sự hoại diệt',
    paccupatthana: 'Biểu hiện là mất đi trạng thái mới dù đặc tính tự nhiên vẫn chưa mất',
    padatthana: 'Nhân gần là các sắc đang chín muồi'
  },
  aniccata: {
    id: 28, name: 'Sắc Vô thường (Diệt)', icon: Minimize, color: 'text-red-500', bg: 'bg-red-100',
    lakkhana: 'Trạng thái tan vỡ hoàn toàn của sắc thực',
    rasa: 'Làm cho sắc thực chìm mất',
    paccupatthana: 'Biểu hiện là sự cạn kiệt, biến mất của sắc thực',
    padatthana: 'Nhân gần là các sắc đang bị tan vỡ hoàn toàn'
  }
};

const allRupasArray = Object.values(rupa28).sort((a, b) => a.id - b.id);

// --- Base elements array ---
const baseElements = [
  rupa28.pathavi, rupa28.apo, rupa28.tejo, rupa28.vayo, 
  rupa28.vanna, rupa28.gandha, rupa28.rasa, rupa28.oja
];

const lahutadiElements = [ rupa28.lahuta, rupa28.muduta, rupa28.kammannata ];

// --- Basic Kalapas ---
const cittajaAtthaka = { id: 'cittaja', title: 'Bọn 8 do Tâm sinh (Tâm sinh bát pháp)', count: 8, icon: Cloud, theme: 'from-orange-500 to-amber-400', elements: [...baseElements], originLink: 'cittaja' };
const utujaAtthaka = { id: 'utuja', title: 'Bọn 8 do Âm dương sinh (Quý tiết sinh bát pháp)', count: 8, icon: Sun, theme: 'from-red-500 to-orange-400', elements: [...baseElements], originLink: 'utuja' };
const aharajaAtthaka = { id: 'aharaja', title: 'Bọn 8 do Vật thực sinh (Vật thực sinh bát pháp)', count: 8, icon: Apple, theme: 'from-lime-500 to-green-400', elements: [...baseElements], originLink: 'aharaja' };
const jivitaNavaka = { id: 'jivita', title: 'Bọn 9 Mạng quyền (Mạng quyền cửu pháp)', count: 9, icon: Activity, theme: 'from-violet-500 to-purple-400', elements: [...baseElements, rupa28.jivita] };
const kayaDasaka = { id: 'kaya', title: 'Bọn 10 Thân (Thân thập pháp)', count: 10, icon: User, theme: 'from-emerald-500 to-green-400', elements: [...baseElements, rupa28.jivita, rupa28.kaya] };
const bhavaDasaka = { id: 'bhava', title: 'Bọn 10 Tính (Tính thập pháp)', count: 10, icon: Heart, theme: 'from-pink-500 to-rose-400', elements: [...baseElements, rupa28.jivita, rupa28.itthi] };
const cittajaSaddaNavaka = { id: 'c7', title: 'Bọn 9 Thinh Tâm sinh Thở ra hít vào', count: 9, icon: Wind, theme: 'from-pink-500 to-fuchsia-400', elements: [...baseElements, rupa28.sadda] };

// --- Kalapa groups for 42 Kotthasas ---
const kalapas53 = [kayaDasaka, bhavaDasaka, jivitaNavaka, cittajaAtthaka, utujaAtthaka, aharajaAtthaka]; // 53 Rupa
const kalapas33 = [jivitaNavaka, cittajaAtthaka, utujaAtthaka, aharajaAtthaka]; // 33 Rupa
const kalapas16 = [cittajaAtthaka, utujaAtthaka]; // 16 Rupa
const kalapas8 = [utujaAtthaka]; // 8 Rupa
const kalapas9_pacaka = [jivitaNavaka]; // 9 Rupa (Pacaka Tejo)
const kalapas9_vayo = [cittajaSaddaNavaka]; // 9 Rupa (Breath in/out)

// --- 6 Doors Data (Dvara) ---
const doorsData = {
  eye: {
    title: '63 sắc sinh tại Nhãn môn (Mắt)',
    total: 63,
    kalapas: [
      { id: 'cakkhu', title: 'Nhãn thập pháp (Bọn 10)', count: 10, icon: Eye, theme: 'from-blue-500 to-cyan-400', elements: [...baseElements, rupa28.jivita, rupa28.cakkhu] },
      ...kalapas53
    ]
  },
  ear: {
    title: '63 sắc sinh tại Nhĩ môn (Tai)',
    total: 63,
    kalapas: [
      { id: 'sota', title: 'Nhĩ thập pháp (Bọn 10)', count: 10, icon: Ear, theme: 'from-amber-500 to-orange-400', elements: [...baseElements, rupa28.jivita, rupa28.sota] },
      ...kalapas53
    ]
  },
  nose: {
    title: '63 sắc sinh tại Tỷ môn (Mũi)',
    total: 63,
    kalapas: [
      { id: 'ghana', title: 'Tỷ thập pháp (Bọn 10)', count: 10, icon: Flower2, theme: 'from-fuchsia-500 to-pink-400', elements: [...baseElements, rupa28.jivita, rupa28.ghana] },
      ...kalapas53
    ]
  },
  tongue: {
    title: '63 sắc sinh tại Thiệt môn (Lưỡi)',
    total: 63,
    kalapas: [
      { id: 'jivha', title: 'Thiệt thập pháp (Bọn 10)', count: 10, icon: Utensils, theme: 'from-red-500 to-orange-500', elements: [...baseElements, rupa28.jivita, rupa28.jivha] },
      ...kalapas53
    ]
  },
  body: {
    title: '53 sắc sinh tại Thân môn (Thân)',
    total: 53,
    kalapas: [...kalapas53]
  },
  mind: {
    title: '63 sắc sinh tại Ý môn (Tim)',
    total: 63,
    kalapas: [
      { id: 'hadaya', title: 'Ý căn thập pháp (Bọn 10)', count: 10, icon: Brain, theme: 'from-rose-600 to-red-400', elements: [...baseElements, rupa28.jivita, rupa28.hadaya] },
      ...kalapas53
    ]
  }
};

// --- 4 Origins Data (Samutthana) ---
const originsData = {
  kammaja: {
    title: '9 Loại Bọn sắc Nghiệp sinh',
    total: 9,
    kalapas: [
      doorsData.eye.kalapas[0], doorsData.ear.kalapas[0], doorsData.nose.kalapas[0], doorsData.tongue.kalapas[0], 
      kayaDasaka,
      { id: 'itthi', title: 'Sắc Nữ tính Thập pháp (Bọn 10)', count: 10, icon: Heart, theme: 'from-pink-500 to-rose-400', elements: [...baseElements, rupa28.jivita, rupa28.itthi] },
      { id: 'pum', title: 'Sắc Nam tính Thập pháp (Bọn 10)', count: 10, icon: Zap, theme: 'from-indigo-500 to-blue-400', elements: [...baseElements, rupa28.jivita, rupa28.pum] },
      doorsData.mind.kalapas[0], jivitaNavaka
    ]
  },
  cittaja: {
    title: '8 Loại Bọn sắc Tâm sinh',
    total: 8,
    kalapas: [
      cittajaAtthaka,
      { id: 'c2', title: 'Thân biểu tri Cửu pháp (Bọn 9)', count: 9, icon: User, theme: 'from-orange-500 to-amber-400', elements: [...baseElements, rupa28.kayaVinnatti] },
      { id: 'c3', title: 'Khinh nhu thích ứng Thập nhất pháp (Bọn 11)', count: 11, icon: Wind, theme: 'from-amber-500 to-orange-400', elements: [...baseElements, ...lahutadiElements] },
      { id: 'c4', title: 'Thân biểu tri Khinh nhu thích ứng Thập nhị pháp (Bọn 12)', count: 12, icon: Target, theme: 'from-orange-600 to-red-400', elements: [...baseElements, rupa28.kayaVinnatti, ...lahutadiElements] },
      { id: 'c5', title: 'Khẩu biểu tri Thập pháp (Bọn 10)', count: 10, icon: Activity, theme: 'from-red-500 to-rose-400', elements: [...baseElements, rupa28.vaciVinnatti, rupa28.sadda] },
      { id: 'c6', title: 'Khẩu biểu tri Thinh Khinh nhu Thập tam pháp (Bọn 13)', count: 13, icon: Ear, theme: 'from-rose-500 to-pink-500', elements: [...baseElements, rupa28.vaciVinnatti, ...lahutadiElements, rupa28.sadda] },
      cittajaSaddaNavaka,
      { id: 'c8', title: 'Thở ra hít vào Thinh Khinh nhu Thập nhị pháp (Bọn 12)', count: 12, icon: Cloud, theme: 'from-fuchsia-500 to-purple-500', elements: [...baseElements, rupa28.sadda, ...lahutadiElements] },
    ]
  },
  utuja: {
    title: '4 Loại Bọn sắc Âm dương sinh',
    total: 4,
    kalapas: [
      utujaAtthaka,
      { id: 'u2', title: 'Âm dương sinh Thinh Cửu pháp (Bọn 9)', count: 9, icon: Ear, theme: 'from-orange-500 to-amber-500', elements: [...baseElements, rupa28.sadda] },
      { id: 'u3', title: 'Khinh nhu thích ứng Thập nhất pháp (Bọn 11)', count: 11, icon: Wind, theme: 'from-amber-500 to-yellow-500', elements: [...baseElements, ...lahutadiElements] },
      { id: 'u4', title: 'Thinh Khinh nhu Thập nhị pháp (Bọn 12)', count: 12, icon: Cloud, theme: 'from-yellow-500 to-lime-500', elements: [...baseElements, rupa28.sadda, ...lahutadiElements] },
    ]
  },
  aharaja: {
    title: '2 Loại Bọn sắc Vật thực sinh',
    total: 2,
    kalapas: [
      aharajaAtthaka,
      { id: 'a2', title: 'Khinh nhu thích ứng Thập nhất pháp (Bọn 11)', count: 11, icon: Wind, theme: 'from-green-500 to-emerald-400', elements: [...baseElements, ...lahutadiElements] },
    ]
  }
};

// --- 42 Kotthasa Data ---
const kotthasaData = {
  pathavi: {
    title: 'Thể trược Địa đại (20)',
    total: 20,
    items: [
      { id: 'p1', name: 'Tóc', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p2', name: 'Lông', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p3', name: 'Móng', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p4', name: 'Răng', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p5', name: 'Da', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p6', name: 'Thịt', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p7', name: 'Gân', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p8', name: 'Xương', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p9', name: 'Tủy xương', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p10', name: 'Thận', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p11', name: 'Tim', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p12', name: 'Gan', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p13', name: 'Màng sườn', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p14', name: 'Lá lách', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p15', name: 'Phổi', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p16', name: 'Ruột già', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p17', name: 'Ruột non', count: 53, kalapas: kalapas53, icon: Mountain },
      { id: 'p18', name: 'Thức ăn mới', count: 8, kalapas: kalapas8, icon: Wheat, desc: 'Chỉ có 8 sắc do Âm dương sinh.' },
      { id: 'p19', name: 'Phân', count: 8, kalapas: kalapas8, icon: Droplets, desc: 'Chỉ có 8 sắc do Âm dương sinh.' },
      { id: 'p20', name: 'Não', count: 53, kalapas: kalapas53, icon: Brain },
    ]
  },
  apo: {
    title: 'Thể trược Thủy đại (12)',
    total: 12,
    items: [
      { id: 'ap1', name: 'Mật', count: 53, kalapas: kalapas53, icon: Droplets, desc: 'Cả mật tại chỗ và mật lưu thông đều có 53 sắc.' },
      { id: 'ap2', name: 'Đàm', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap3', name: 'Mủ', count: 8, kalapas: kalapas8, icon: Droplets, desc: 'Chỉ có 8 sắc do Âm dương sinh.' },
      { id: 'ap4', name: 'Máu', count: 53, kalapas: kalapas53, icon: Droplets, desc: 'Máu đọng và Máu lưu thông đều có 53 sắc.' },
      { id: 'ap5', name: 'Mồ hôi', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'Tâm sinh (8) + Âm dương sinh (8) = 16 sắc.' },
      { id: 'ap6', name: 'Mỡ đặc', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap7', name: 'Nước mắt', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'Tâm sinh (8) + Âm dương sinh (8) = 16 sắc.' },
      { id: 'ap8', name: 'Mỡ lỏng', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap9', name: 'Nước bọt', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'Tâm sinh (8) + Âm dương sinh (8) = 16 sắc.' },
      { id: 'ap10', name: 'Nước mũi', count: 16, kalapas: kalapas16, icon: Droplets, desc: 'Tâm sinh (8) + Âm dương sinh (8) = 16 sắc.' },
      { id: 'ap11', name: 'Nước nhờn ở khớp', count: 53, kalapas: kalapas53, icon: Droplets },
      { id: 'ap12', name: 'Nước tiểu', count: 8, kalapas: kalapas8, icon: Droplets, desc: 'Chỉ có 8 sắc do Âm dương sinh.' },
    ]
  },
  tejo: {
    title: 'Thể trược Hỏa đại (4)',
    total: 4,
    items: [
      { id: 't1', name: 'Lửa nung nấu (Santappana)', count: 33, kalapas: kalapas33, icon: Flame, desc: 'Lửa làm nóng ran cơ thể.' },
      { id: 't2', name: 'Lửa thiêu đốt (Daha)', count: 33, kalapas: kalapas33, icon: Flame, desc: 'Lửa thiêu đốt dữ dội làm cho cơ thể sốt cao.' },
      { id: 't3', name: 'Lửa lão hóa (Jirana)', count: 33, kalapas: kalapas33, icon: Flame, desc: 'Lửa làm cho cơ thể già yếu, hao mòn.' },
      { id: 't4', name: 'Lửa tiêu hóa (Pacaka)', count: 9, kalapas: kalapas9_pacaka, icon: Flame, desc: 'Lửa làm tiêu hóa thức ăn (Bọn 9 Mạng quyền).' },
    ]
  },
  vayo: {
    title: 'Thể trược Phong đại (6)',
    total: 6,
    items: [
      { id: 'v1', name: 'Gió thổi lên (Uddhangama)', count: 33, kalapas: kalapas33, icon: Wind, desc: 'Gió đẩy lên phía trên (ợ hơi v.v...).' },
      { id: 'v2', name: 'Gió thổi xuống (Adhogama)', count: 33, kalapas: kalapas33, icon: Wind, desc: 'Gió đẩy xuống phía dưới (trung tiện v.v...).' },
      { id: 'v3', name: 'Gió ngoài ruột (Kucchisaya)', count: 33, kalapas: kalapas33, icon: Wind, desc: 'Gió nằm trong khoang bụng ngoài màng ruột.' },
      { id: 'v4', name: 'Gió trong ruột (Kotthasaya)', count: 33, kalapas: kalapas33, icon: Wind, desc: 'Gió nằm bên trong ruột.' },
      { id: 'v5', name: 'Gió luân chuyển khắp (Angamanganusarino)', count: 33, kalapas: kalapas33, icon: Wind, desc: 'Gió luân chuyển khắp tay chân cơ thể theo gân mạch.' },
      { id: 'v6', name: 'Gió hơi thở ra vào (Assasa Passasa)', count: 9, kalapas: kalapas9_vayo, icon: Wind, desc: 'Gió của hơi thở vào và thở ra.' },
    ]
  }
};


// --- Navigation Tabs ---
const navigationTabs = [
  { id: 'doors', name: '6 Môn', icon: Eye, activeClass: 'bg-white text-blue-700 shadow-sm border-blue-200', inactiveClass: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-transparent' },
  { id: 'kotthasa', name: '42 Thể Trược', icon: Layers, activeClass: 'bg-white text-emerald-700 shadow-sm border-emerald-200', inactiveClass: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border-transparent' },
  { id: 'origins', name: '4 Nhân Sinh', icon: Sun, activeClass: 'bg-white text-amber-600 shadow-sm border-amber-200', inactiveClass: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 border-transparent' },
  { id: 'rupa28', name: '28 Sắc Pháp', icon: BookOpen, activeClass: 'bg-white text-indigo-700 shadow-sm border-indigo-200', inactiveClass: 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent' },
  ];

const doorSubTabs = [
  { id: 'eye', name: 'Mắt', icon: Eye, activeClass: 'bg-blue-500 text-white border-blue-600', inactiveClass: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { id: 'ear', name: 'Tai', icon: Ear, activeClass: 'bg-amber-500 text-white border-amber-600', inactiveClass: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'nose', name: 'Mũi', icon: Flower2, activeClass: 'bg-pink-500 text-white border-pink-600', inactiveClass: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { id: 'tongue', name: 'Lưỡi', icon: Utensils, activeClass: 'bg-red-500 text-white border-red-600', inactiveClass: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200' },
  { id: 'body', name: 'Thân', icon: User, activeClass: 'bg-emerald-500 text-white border-emerald-600', inactiveClass: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  { id: 'mind', name: 'Ý', icon: Brain, activeClass: 'bg-rose-500 text-white border-rose-600', inactiveClass: 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200' },
];

const originSubTabs = [
  { id: 'kammaja', name: 'Nghiệp sinh', icon: Heart, activeClass: 'bg-pink-500 text-white border-pink-600', inactiveClass: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { id: 'cittaja', name: 'Tâm sinh', icon: Cloud, activeClass: 'bg-sky-500 text-white border-sky-600', inactiveClass: 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200' },
  { id: 'utuja', name: 'Âm dương sinh', icon: Sun, activeClass: 'bg-amber-500 text-white border-amber-600', inactiveClass: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'aharaja', name: 'Vật thực sinh', icon: Apple, activeClass: 'bg-lime-600 text-white border-lime-700', inactiveClass: 'text-lime-800 bg-lime-50 hover:bg-lime-100 border-lime-200' },
];

const kotthasaSubTabs = [
  { id: 'pathavi', name: 'Địa (20)', icon: Mountain, activeClass: 'bg-amber-700 text-white border-amber-800', inactiveClass: 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { id: 'apo', name: 'Thủy (12)', icon: Droplets, activeClass: 'bg-blue-600 text-white border-blue-700', inactiveClass: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { id: 'tejo', name: 'Hỏa (4)', icon: Flame, activeClass: 'bg-red-600 text-white border-red-700', inactiveClass: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200' },
  { id: 'vayo', name: 'Phong (6)', icon: Wind, activeClass: 'bg-teal-600 text-white border-teal-700', inactiveClass: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200' },
];

export default function App({ initialPage = null, onPageChange = null } = {}) {
  // View state management
  const [activeTab, setActiveTab] = useState(() => initialPage?.activeTab ?? 'rupa28');
  const [activeDoor, setActiveDoor] = useState(() => initialPage?.activeDoor ?? 'eye');
  const [activeOrigin, setActiveOrigin] = useState(() => initialPage?.activeOrigin ?? 'kammaja');
  const [activeKotthasa, setActiveKotthasa] = useState(() => initialPage?.activeKotthasa ?? 'pathavi');

  // Reports the current top-level "page" (which of the 4 main tabs, and
  // which sub-tab within it) up to the language-switcher wrapper so it can
  // be fed back in as `initialPage` if the user switches language and lands
  // back on this same component (or the other language's sibling, seeded
  // with these language-neutral ids). See src/RupaApp.jsx.
  useEffect(() => {
    onPageChange?.({ activeTab, activeDoor, activeOrigin, activeKotthasa });
  }, [activeTab, activeDoor, activeOrigin, activeKotthasa]);

  const [activeKalapa, setActiveKalapa] = useState(null);
  const [activeKotthasaItem, setActiveKotthasaItem] = useState(null);
  const [activeRupaElement, setActiveRupaElement] = useState(null); // For detailed Rupa popup

  // Get current active data
  const subTabs = activeTab === 'doors' ? doorSubTabs : (activeTab === 'origins' ? originSubTabs : (activeTab === 'kotthasa' ? kotthasaSubTabs : []));
  const activeSubTab = activeTab === 'doors' ? activeDoor : (activeTab === 'origins' ? activeOrigin : activeKotthasa);
  const setActiveSubTab = activeTab === 'doors' ? setActiveDoor : (activeTab === 'origins' ? setActiveOrigin : setActiveKotthasa);

  const currentData = activeTab === 'doors' ? doorsData[activeDoor] : 
                     (activeTab === 'origins' ? originsData[activeOrigin] : (activeTab === 'kotthasa' ? kotthasaData[activeKotthasa] : null));

  // --- Rupa Detail Modal ---
  const RupaDetailModal = ({ rupa, onClose }) => {
    if (!rupa) return null;
    const Icon = rupa.icon;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="p-5 text-white bg-gradient-to-r from-indigo-600 to-blue-500 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Icon size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{rupa.name}</h2>
                <p className="text-indigo-100 text-sm font-medium">Thông Tin Chi Tiết</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Đóng">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto space-y-5 bg-slate-50">
            {/* လက္ခဏာ (Lakkhana) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
              <h3 className="text-blue-700 font-bold mb-2 flex items-center gap-2">
                <Target size={18} /> Trạng thái (Lakkhana)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.lakkhana}</p>
            </div>
            
            {/* ရသ (Rasa) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
              <h3 className="text-amber-700 font-bold mb-2 flex items-center gap-2">
                <Activity size={18} /> Phận sự (Rasa)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.rasa}</p>
            </div>

            {/* ပစ္စုပဋ္ဌာန် (Paccupatthana) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
              <h3 className="text-emerald-700 font-bold mb-2 flex items-center gap-2">
                <Eye size={18} /> Biểu hiện (Paccupatthana)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.paccupatthana}</p>
            </div>

            {/* ပဒဋ္ဌာန် (Padatthana) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-purple-500">
              <h3 className="text-purple-700 font-bold mb-2 flex items-center gap-2">
                <Layers size={18} /> Nhân gần (Padatthana)
              </h3>
              <p className="text-slate-700 leading-relaxed text-sm font-medium">{rupa.padatthana}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Kalapa Modal Component ---
  const Modal = ({ kalapa, onClose }) => {
    if (!kalapa) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className={`p-6 text-white bg-gradient-to-r ${kalapa.theme} flex justify-between items-start`}>
            <div>
              <h2 className="text-2xl font-bold mb-1">{kalapa.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Đóng">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <Info size={18} />
              <p className="text-sm">Bọn sắc (Kalapa) này bao gồm <strong>{kalapa.count}</strong> sắc pháp. Nhấp vào các sắc để xem chi tiết.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kalapa.elements.map((el, idx) => {
                const Icon = el.icon;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setActiveRupaElement(el)}
                    className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white group"
                  >
                    <div className={`w-12 h-12 rounded-full ${el.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={el.color} size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-blue-700 transition-colors">
                        <span className="text-xs text-slate-400 w-4">{idx + 1}.</span> 
                        {el.name}
                      </div>
                      <div className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Nhấp để xem Trạng thái v.v...
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Kotthasa Modal Component ---
  const KotthasaModal = ({ item, onClose }) => {
    if (!item) return null;
    const [expandedKalapa, setExpandedKalapa] = useState(null);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div 
          className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="p-6 text-white bg-gradient-to-r from-slate-800 to-slate-700 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={24} className="text-slate-300" />
                <h2 className="text-2xl font-bold">{item.name}</h2>
              </div>
              <p className="text-slate-300 text-sm font-medium">Tổng số sắc pháp ({item.count})</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors" title="Đóng">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            {item.desc && (
              <div className="flex items-start gap-2 mb-4 text-blue-800 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <Info size={20} className="mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{item.desc}</p>
              </div>
            )}
            
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Layers size={18} /> Các Bọn Sắc (Kalapa) Bao Gồm
            </h3>
            
            <div className="space-y-3">
              {item.kalapas.map((kalapa, index) => {
                const Icon = kalapa.icon;
                const isExpanded = expandedKalapa === index;
                
                return (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all hover:border-slate-300">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedKalapa(isExpanded ? null : index)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${kalapa.theme} flex items-center justify-center text-white`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{kalapa.title}</h4>
                          <p className="text-xs text-slate-500">{kalapa.count} sắc pháp</p>
                        </div>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kalapa.elements.map((el, elIdx) => (
                          <div 
                            key={elIdx} 
                            onClick={() => setActiveRupaElement(el)}
                            className="flex items-center gap-2 text-sm p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-200 hover:text-blue-700"
                            title="Xem chi tiết"
                          >
                            <el.icon size={14} className={el.color} />
                            <span className="font-medium">{el.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
                <Brain size={28} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
                Tìm Hiểu Về Sắc Pháp
              </h1>
            </div>

            {/* Main Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner flex-wrap justify-center sm:justify-end gap-1">
              {navigationTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                      isActive ? tab.activeClass : tab.inactiveClass
                    }`}
                  >
                    <Icon size={16} />
                    {tab.name}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Sub-tabs selection */}
          {subTabs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-6 pb-2 scrollbar-hide">
              {subTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border ${
                      isActive
                        ? `${tab.activeClass} shadow-md`
                        : tab.inactiveClass
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-bold text-sm">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              {activeTab === 'rupa28' ? 'Chi Tiết Về 28 Sắc Pháp' : currentData?.title}
            </h2>
            <p className="text-slate-600 max-w-2xl text-sm sm:text-base font-medium">
              {activeTab === 'rupa28' 
                ? ''
                : (activeTab === 'kotthasa' 
                    ? ''
                    : '')
              }
            </p>
          </div>
          {activeTab !== 'rupa28' && currentData && (
            <div className="mt-4 sm:mt-0 bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold shadow-sm border border-blue-200">
              Tổng số lượng : {currentData.total}
            </div>
          )}
        </div>

        {/* Dynamic Grid Rendering */}
        {activeTab === 'rupa28' ? (
          /* Rupa 28 Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allRupasArray.map((rupa) => {
              const Icon = rupa.icon;
              return (
                <div 
                  key={rupa.id}
                  onClick={() => setActiveRupaElement(rupa)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col items-center text-center hover:border-indigo-400"
                >
                  <div className={`w-14 h-14 rounded-full ${rupa.bg} transition-colors flex items-center justify-center group-hover:scale-110 duration-300 mb-3`}>
                    <Icon size={28} className={rupa.color} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-indigo-700 transition-colors">
                    {rupa.id}. {rupa.name}
                  </h3>
                  <div className="mt-3 text-xs font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-3 py-1 rounded-full">
                    Xem Chi Tiết
                  </div>
                </div>
              )
            })}
          </div>
        ) : activeTab === 'kotthasa' ? (
          /* 42 Kotthasa Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentData.items.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={`${item.id}-${index}`}
                  onClick={() => setActiveKotthasaItem(item)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col items-center text-center hover:border-blue-400"
                >
                  <div className={`w-14 h-14 rounded-full bg-slate-100 group-hover:bg-blue-100 transition-colors flex items-center justify-center text-slate-500 group-hover:text-blue-600 mb-3`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">{item.name}</h3>
                  
                  <div className="mt-auto inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    Sắc {item.count} pháp
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Doors & Origins Kalapas Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentData.kalapas.map((kalapa, index) => {
              const Icon = kalapa.icon;
              return (
                <div 
                  key={`${kalapa.id}-${index}`}
                  onClick={() => setActiveKalapa(kalapa)}
                  className={`relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br ${kalapa.theme}`}
                >
                  <div className="absolute -right-6 -top-6 text-white/20 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                    <Icon size={120} strokeWidth={1} />
                  </div>
                  
                  {/* Origin Link Button */}
                  {kalapa.originLink && activeTab !== 'origins' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('origins');
                        setActiveOrigin(kalapa.originLink);
                      }}
                      className="absolute top-3 right-3 z-10 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-all shadow-sm flex items-center justify-center group/btn"
                      title="Xem thêm các sắc đồng sinh khác"
                    >
                      <ExternalLink size={18} className="group-hover/btn:scale-110 transition-transform" />
                    </button>
                  )}

                  <div className="relative p-6 h-full flex flex-col justify-between min-h-[160px]">
                    <div>
                      <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-sm">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1 leading-tight">{kalapa.title}</h3>
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-sm">
                        Sắc {kalapa.count} pháp
                      </span>
                      <span className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Xem &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal kalapa={activeKalapa} onClose={() => setActiveKalapa(null)} />
      <KotthasaModal item={activeKotthasaItem} onClose={() => setActiveKotthasaItem(null)} />
      <RupaDetailModal rupa={activeRupaElement} onClose={() => setActiveRupaElement(null)} />

    </div>
  );
}
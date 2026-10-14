import React from 'react';

// The hand-drawn Avatar character, shared by the Avatar shop and the
// Festival gift reveal.
// --- Hand-drawn layered character (same recolor-by-parameter approach as
// ShrineRoomApp's buddhaSvg) instead of stacking emoji on top of each
// other, which never quite look like they belong together. Every part is
// driven purely by the config passed in, so equipping a new item is just
// swapping one color/shape parameter, not re-drawing anything.
// Festival Lights Robe: not a flat colour like the shop robes -- a glowing
// orange-to-gold gradient with a plum sash, a gold V collar, lotus flowers,
// little lamp flames, sparkles and an embroidered hem. Clipped to the body so
// nothing spills outside the robe.
function Lotus({ cx, cy, r = 7 }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map(a => (
        <ellipse key={a} cx="0" cy={-r * 0.8} rx={r * 0.42} ry={r * 0.8} fill="#F8BBD0" stroke="#EC407A" strokeWidth="0.6" transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.34} fill="#FFEB3B" />
    </g>
  );
}
function FestivalRobeArt() {
  return (
    <>
      <defs>
        <linearGradient id="festRobeGrad" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#FFC107" />
          <stop offset="0.5" stopColor="#FB8C00" />
          <stop offset="1" stopColor="#D84315" />
        </linearGradient>
        <clipPath id="festRobeClip">
          <path d="M55,240 C49,174 60,148 100,148 C140,148 151,174 145,240 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#festRobeClip)">
        {/* plum sash across the chest, with gold edging */}
        <polygon points="62,156 84,152 150,214 150,236 138,236" fill="#7B1FA2" />
        <polygon points="62,156 84,152 150,214 150,236 138,236" fill="none" stroke="#FFD54F" strokeWidth="2.2" />
        <circle cx="100" cy="186" r="2.4" fill="#FFD54F" />
        <circle cx="114" cy="199" r="2.4" fill="#FFD54F" />
        <circle cx="127" cy="212" r="2.4" fill="#FFD54F" />
        {/* lotus flowers */}
        <Lotus cx="78" cy="190" r="7" />
        <Lotus cx="68" cy="214" r="6" />
        <Lotus cx="122" cy="176" r="6" />
        <Lotus cx="96" cy="226" r="7" />
        {/* lamp flames */}
        {[[86, 208], [140, 232], [112, 232]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0,-7 Q4,-2 0,3 Q-4,-2 0,-7 Z" fill="#FFF59D" stroke="#FFB300" strokeWidth="0.7" />
          </g>
        ))}
        {/* sparkles */}
        {[[72, 172], [128, 190], [88, 238], [108, 164]].map(([x, y], i) => (
          <path key={i} d={`M${x},${y - 4} L${x + 1.2},${y - 1.2} L${x + 4},${y} L${x + 1.2},${y + 1.2} L${x},${y + 4} L${x - 1.2},${y + 1.2} L${x - 4},${y} L${x - 1.2},${y - 1.2} Z`} fill="#FFF8E1" />
        ))}
        {/* embroidered hem */}
        <rect x="40" y="228" width="120" height="12" fill="#B71C1C" />
        <rect x="40" y="228" width="120" height="2.4" fill="#FFD54F" />
        {Array.from({ length: 11 }).map((_, i) => <circle key={i} cx={52 + i * 9.6} cy="235" r="2" fill="#FFD54F" />)}
        {/* gold V collar */}
        <path d="M76,150 L100,184 L124,150 L116,148 L100,170 L84,148 Z" fill="#FFE082" stroke="#FFB300" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </>
  );
}

const BODY_PATH = 'M55,240 C49,174 60,148 100,148 C140,148 151,174 145,240 Z';
const GoldCollar = () => (
  <path d="M76,150 L100,184 L124,150 L116,148 L100,170 L84,148 Z" fill="#FFE082" stroke="#FFB300" strokeWidth="1.4" strokeLinejoin="round" />
);
const Sparkle = ({ x, y, fill = '#FFF8E1' }) => (
  <path d={`M${x},${y - 4} L${x + 1.2},${y - 1.2} L${x + 4},${y} L${x + 1.2},${y + 1.2} L${x},${y + 4} L${x - 1.2},${y + 1.2} L${x - 4},${y} L${x - 1.2},${y - 1.2} Z`} fill={fill} />
);

// Lotus Garden Robe: teal-green with big pink lotuses, leaves and a pink hem.
function LotusRobeArt() {
  return (
    <>
      <defs>
        <linearGradient id="festLotusGrad" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#4DB6AC" />
          <stop offset="1" stopColor="#00695C" />
        </linearGradient>
        <clipPath id="festLotusClip"><path d={BODY_PATH} /></clipPath>
      </defs>
      <g clipPath="url(#festLotusClip)">
        {[[70, 200, -30], [128, 196, 30], [100, 216, 0]].map(([x, y, a], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
            <ellipse cx="-9" cy="3" rx="9" ry="4" fill="#A5D6A7" />
            <ellipse cx="9" cy="3" rx="9" ry="4" fill="#A5D6A7" />
          </g>
        ))}
        <Lotus cx="70" cy="196" r="9" />
        <Lotus cx="128" cy="192" r="9" />
        <Lotus cx="100" cy="212" r="10" />
        <Lotus cx="86" cy="170" r="5" />
        <Lotus cx="116" cy="172" r="5" />
        <rect x="40" y="228" width="120" height="12" fill="#AD1457" />
        <rect x="40" y="228" width="120" height="2.4" fill="#FFD54F" />
        {Array.from({ length: 11 }).map((_, i) => <circle key={i} cx={52 + i * 9.6} cy="235" r="2" fill="#F8BBD0" />)}
        <GoldCollar />
      </g>
    </>
  );
}

// Night Sky Robe: deep indigo with a golden crescent, stars and lamp dots.
function NightRobeArt() {
  return (
    <>
      <defs>
        <linearGradient id="festNightGrad" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#3949AB" />
          <stop offset="1" stopColor="#1A1055" />
        </linearGradient>
        <clipPath id="festNightClip"><path d={BODY_PATH} /></clipPath>
      </defs>
      <g clipPath="url(#festNightClip)">
        <path d="M100,176 a14,14 0 1,0 12,22 a11,11 0 1,1 -12,-22 Z" fill="#FFE082" stroke="#FFC107" strokeWidth="1" />
        {[[72, 176], [128, 180], [76, 210], [124, 214], [100, 232], [84, 160], [118, 160]].map(([x, y], i) => <Sparkle key={i} x={x} y={y} fill="#FFF59D" />)}
        {[[62, 196], [138, 200], [90, 222], [112, 224]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#FFFFFF" />)}
        <rect x="40" y="228" width="120" height="12" fill="#0D0838" />
        <rect x="40" y="228" width="120" height="2.4" fill="#C0CAF5" />
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={i} d={`M${52 + i * 9.6},231 q2.2,3 0,6 q-2.2,-3 0,-6 Z`} fill="#FFB300" />
        ))}
        <path d="M76,150 L100,184 L124,150 L116,148 L100,170 L84,148 Z" fill="#C5CAE9" stroke="#7986CB" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </>
  );
}

// Checkered Gold Robe: red and gold squares with a plum collar band.
function ChecksRobeArt() {
  return (
    <>
      <defs>
        <pattern id="festCheck" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#C62828" />
          <rect width="11" height="11" fill="#FFC107" />
          <rect x="11" y="11" width="11" height="11" fill="#FFC107" />
          <circle cx="16.5" cy="5.5" r="2" fill="#C62828" />
          <circle cx="5.5" cy="16.5" r="2" fill="#C62828" />
        </pattern>
        <clipPath id="festCheckClip"><path d={BODY_PATH} /></clipPath>
      </defs>
      <g clipPath="url(#festCheckClip)">
        <rect x="40" y="226" width="120" height="14" fill="#4A148C" />
        <rect x="40" y="226" width="120" height="2.6" fill="#FFD54F" />
        {Array.from({ length: 11 }).map((_, i) => <circle key={i} cx={52 + i * 9.6} cy="234" r="2" fill="#FFD54F" />)}
        <path d="M76,150 L100,184 L124,150 L116,148 L100,170 L84,148 Z" fill="#4A148C" stroke="#FFD54F" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="100" cy="190" r="3" fill="#FFD54F" />
        <circle cx="100" cy="204" r="3" fill="#FFD54F" />
        <circle cx="100" cy="218" r="3" fill="#FFD54F" />
      </g>
    </>
  );
}

// ---- More robe designs. Each takes the item's own colour as the base, so two robes with the same
// design but different colours look different. They share one clip path (it never depends on colour).
const star5 = (cx, cy, R, r = R * 0.45) => Array.from({ length: 10 }).map((_, i) => {
  const rad = i % 2 === 0 ? R : r;
  const a = (Math.PI / 5) * i - Math.PI / 2;
  return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
}).join(' ');
function RobeFrame({ color, children, collar, hem = true }) {
  return (
    <>
      <defs><clipPath id="festNewClip"><path d={BODY_PATH} /></clipPath></defs>
      <g clipPath="url(#festNewClip)">
        <rect x="40" y="140" width="120" height="104" fill={color} />
        {children}
        {hem && <>
          <rect x="40" y="228" width="120" height="12" fill="#000" fillOpacity="0.28" />
          <rect x="40" y="228" width="120" height="2.4" fill="#FFD54F" />
          {Array.from({ length: 11 }).map((_, i) => <circle key={i} cx={52 + i * 9.6} cy="235" r="2" fill="#FFD54F" />)}
        </>}
        {collar || <GoldCollar />}
      </g>
    </>
  );
}
const SnowRobe = ({ color }) => (
  <RobeFrame color={color} collar={<path d="M74,150 L100,186 L126,150 L118,146 L100,170 L82,146 Z" fill="#FFFFFF" stroke="#B3E5FC" strokeWidth="2" strokeLinejoin="round" />}>
    {[[70, 170], [128, 172], [84, 192], [116, 196], [66, 214], [134, 216], [100, 210], [92, 232], [108, 160]].map(([x, y], i) => (
      <g key={i} stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" transform={`translate(${x} ${y})`}>
        <path d="M0,-5 L0,5 M-5,0 L5,0 M-3.5,-3.5 L3.5,3.5 M-3.5,3.5 L3.5,-3.5" />
      </g>
    ))}
    {[[78, 182], [122, 186], [100, 224], [60, 196], [140, 198]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#FFFFFF" fillOpacity="0.85" />)}
  </RobeFrame>
);
const Bat = ({ x, y, s = 1 }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M-13,-4 Q-6,-9 0,-2 Q6,-9 13,-4 Q10,3 6,1 L3,5 L0,1 L-3,5 L-6,1 Q-10,3 -13,-4 Z" fill="#1B1B1B" />
);
const BatsRobe = ({ color }) => (
  <RobeFrame color={color}>
    <path d="M100,172 a14,14 0 1,0 12,22 a11,11 0 1,1 -12,-22 Z" fill="#FFE082" stroke="#FFC107" strokeWidth="1" />
    <Bat x={68} y={186} /><Bat x={132} y={190} s={1.2} /><Bat x={86} y={216} s={0.9} /><Bat x={118} y={218} />
    {[[74, 164], [128, 168], [100, 232]].map(([x, y], i) => <Sparkle key={i} x={x} y={y} fill="#FFF59D" />)}
  </RobeFrame>
);
const PumpkinRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[78, 89, 100, 111, 122].map((x, i) => <path key={i} d={`M${100 + (x - 100) * 0.35},152 Q${100 + (x - 100) * 1.5},196 ${100 + (x - 100) * 0.35},236`} stroke="#000" strokeOpacity="0.22" strokeWidth="2.4" fill="none" />)}
    <path d="M85,186 L95,186 L90,176 Z M105,186 L115,186 L110,176 Z" fill="#3E2723" />
    <path d="M82,200 L90,208 L96,200 L104,208 L110,200 L118,208" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinejoin="round" />
    <path d="M96,158 Q100,148 104,158" stroke="#2E7D32" strokeWidth="4" fill="none" strokeLinecap="round" />
  </RobeFrame>
);
const Leaf = ({ x, y, a, fill }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <path d="M0,-10 Q9,-3 0,10 Q-9,-3 0,-10 Z" fill={fill} />
    <path d="M0,-8 L0,12" stroke="#000" strokeOpacity="0.3" strokeWidth="1" />
  </g>
);
const LeavesRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[[70, 172, -30, '#FFCC80'], [128, 176, 25, '#FFAB91'], [88, 196, 60, '#FFF59D'], [114, 204, -50, '#FFCC80'], [66, 218, 20, '#FFAB91'], [136, 220, -20, '#FFF59D'], [100, 232, 80, '#FFCC80'], [100, 168, 0, '#FFF59D']].map(([x, y, a, f], i) => <Leaf key={i} x={x} y={y} a={a} fill={f} />)}
  </RobeFrame>
);
const WavesRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[168, 186, 204, 222].map((y, i) => <path key={i} d={`M40,${y} Q55,${y - 9} 70,${y} T100,${y} T130,${y} T160,${y}`} stroke="#FFFFFF" strokeOpacity={0.7 - i * 0.1} strokeWidth="3" fill="none" />)}
    {[[76, 178], [124, 196], [90, 214], [110, 160]].map(([x, y], i) => <path key={i} d={`M${x},${y - 5} Q${x + 4},${y} ${x},${y + 3} Q${x - 4},${y} ${x},${y - 5} Z`} fill="#E1F5FE" />)}
  </RobeFrame>
);
const PatchRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[[66, 160, 34, 24], [100, 160, 34, 24], [66, 188, 34, 24], [100, 188, 34, 24], [66, 216, 34, 12], [100, 216, 34, 12]].map(([x, y, w, h], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} fill={i % 3 === 0 ? '#FFFFFF' : '#000'} fillOpacity="0.13" stroke="#FFD54F" strokeWidth="1.6" strokeDasharray="4 2" />
    ))}
  </RobeFrame>
);
const WheelRobe = ({ color }) => (
  <RobeFrame color={color}>
    <circle cx="100" cy="196" r="25" fill="#FFD54F" fillOpacity="0.3" />
    <circle cx="100" cy="196" r="21" fill="none" stroke="#FFD54F" strokeWidth="3.4" />
    <circle cx="100" cy="196" r="5" fill="#FFD54F" />
    {Array.from({ length: 8 }).map((_, i) => { const a = (Math.PI / 4) * i; return <line key={i} x1={100 + 5 * Math.cos(a)} y1={196 + 5 * Math.sin(a)} x2={100 + 21 * Math.cos(a)} y2={196 + 21 * Math.sin(a)} stroke="#FFD54F" strokeWidth="2.4" />; })}
    {Array.from({ length: 8 }).map((_, i) => { const a = (Math.PI / 4) * i + Math.PI / 8; return <circle key={i} cx={100 + 25 * Math.cos(a)} cy={196 + 25 * Math.sin(a)} r="1.8" fill="#FFF8E1" />; })}
    {[[66, 168], [136, 170], [64, 222], [138, 224]].map(([x, y], i) => <Sparkle key={i} x={x} y={y} />)}
  </RobeFrame>
);
const Burst = ({ x, y, c }) => (
  <g stroke={c} strokeWidth="2" strokeLinecap="round">
    {Array.from({ length: 8 }).map((_, i) => { const a = (Math.PI / 4) * i; return <line key={i} x1={x + 3 * Math.cos(a)} y1={y + 3 * Math.sin(a)} x2={x + 11 * Math.cos(a)} y2={y + 11 * Math.sin(a)} />; })}
    <circle cx={x} cy={y} r="1.6" fill={c} stroke="none" />
  </g>
);
const FireworksRobe = ({ color }) => (
  <RobeFrame color={color}>
    <Burst x={74} y={184} c="#FFD740" /><Burst x={126} y={178} c="#FF4081" /><Burst x={102} y={212} c="#40C4FF" />
    {[[60, 210], [142, 208], [92, 164], [116, 160], [64, 232]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#FFFFFF" />)}
  </RobeFrame>
);
const CandyRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[[66, 168], [96, 160], [128, 170], [80, 188], [114, 190], [140, 196], [64, 208], [98, 212], [128, 218], [82, 230], [112, 234]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 6 : 4.5} fill={['#FFFFFF', '#FFD740', '#40C4FF', '#FF8A80', '#B9F6CA'][i % 5]} fillOpacity="0.92" />
    ))}
  </RobeFrame>
);
const StarsRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[[70, 172, 8], [128, 176, 7], [98, 194, 10], [66, 208, 6], [136, 212, 8], [84, 226, 6], [118, 228, 7], [100, 164, 5]].map(([x, y, R], i) => (
      <polygon key={i} points={star5(x, y, R)} fill="#FFD54F" stroke="#FFF8E1" strokeWidth="1" strokeLinejoin="round" />
    ))}
  </RobeFrame>
);
const BodhiLeaf = ({ x, y, a, s = 1, fill }) => (
  <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    <path d="M0,10 C-14,-2 -9,-14 0,-7 C9,-14 14,-2 0,10 Z" fill={fill} />
    <path d="M0,10 L0,18" stroke={fill} strokeWidth="2" strokeLinecap="round" />
    <path d="M0,8 L0,-4" stroke="#000" strokeOpacity="0.25" strokeWidth="1" />
  </g>
);
const BodhiRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[[72, 172, -20, 1], [128, 174, 20, 1], [92, 196, 10, 1.1], [112, 200, -10, 0.9], [68, 214, -30, 0.9], [134, 216, 30, 1], [100, 226, 0, 1]].map(([x, y, a, s], i) => <BodhiLeaf key={i} x={x} y={y} a={a} s={s} fill={i % 2 ? '#C5E1A5' : '#AED581'} />)}
  </RobeFrame>
);
const Blossom = ({ x, y, r = 6 }) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 72, 144, 216, 288].map(a => <circle key={a} cx={r * 0.8 * Math.sin((a * Math.PI) / 180)} cy={-r * 0.8 * Math.cos((a * Math.PI) / 180)} r={r * 0.55} fill="#FFF176" stroke="#F9A825" strokeWidth="0.7" />)}
    <circle r={r * 0.4} fill="#FF8F00" />
  </g>
);
const BlossomsRobe = ({ color }) => (
  <RobeFrame color={color}>
    {[[72, 172, 6], [126, 170, 7], [98, 192, 8], [68, 208, 7], [134, 210, 6], [88, 226, 6], [116, 228, 7]].map(([x, y, r], i) => <Blossom key={i} x={x} y={y} r={r} />)}
  </RobeFrame>
);
const Cloud = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#FFFFFF" fillOpacity="0.9">
    <circle cx="-9" cy="2" r="7" /><circle cx="0" cy="-3" r="9" /><circle cx="10" cy="2" r="7" /><rect x="-16" y="2" width="33" height="7" rx="3.5" />
  </g>
);
const CloudsRobe = ({ color }) => (
  <RobeFrame color={color}>
    <Cloud x={76} y={176} /><Cloud x={126} y={196} s={1.1} /><Cloud x={84} y={218} s={0.9} />
    {[[112, 166], [60, 200], [140, 224]].map(([x, y], i) => <Sparkle key={i} x={x} y={y} />)}
  </RobeFrame>
);

// What fills the body for each pattern id: [fill, art]. A null fill means "the item's own colour".
const ROBE_PATTERNS = {
  lights: ['url(#festRobeGrad)', FestivalRobeArt],
  lotus: ['url(#festLotusGrad)', LotusRobeArt],
  night: ['url(#festNightGrad)', NightRobeArt],
  checks: ['url(#festCheck)', ChecksRobeArt],
  snow: [null, SnowRobe], bats: [null, BatsRobe], pumpkin: [null, PumpkinRobe], leaves: [null, LeavesRobe],
  waves: [null, WavesRobe], patch: [null, PatchRobe], wheel: [null, WheelRobe], fireworks: [null, FireworksRobe],
  candy: [null, CandyRobe], stars: [null, StarsRobe], bodhi: [null, BodhiRobe], blossoms: [null, BlossomsRobe], clouds: [null, CloudsRobe],
};

// ---- Accessory shapes (head / face / floating things). `c` is the item's own colour.
const arcPoints = (angles, R) => angles.map(d => {
  const a = (d * Math.PI) / 180;
  return { x: 100 + R * Math.sin(a), y: 95 - R * Math.cos(a), d };
});
const ACCESSORY_ART = {
  balloons: (c) => (
    <g>
      {[[154, 28, c], [176, 46, '#FFC107'], [136, 16, '#EF5350']].map(([x, y, f], i) => (
        <g key={i}>
          <path d={`M${x},${y + 15} Q${x - 4},${y + 42} 140,66`} stroke="#8D6E63" strokeWidth="1.4" fill="none" />
          <ellipse cx={x} cy={y} rx="11" ry="14" fill={f} stroke="#00000033" strokeWidth="1.2" />
          <ellipse cx={x - 4} cy={y - 5} rx="3" ry="5" fill="#FFFFFF" fillOpacity="0.5" />
          <path d={`M${x - 3},${y + 14} L${x + 3},${y + 14} L${x},${y + 19} Z`} fill={f} />
        </g>
      ))}
    </g>
  ),
  leafcrown: (c) => (
    <g>
      {arcPoints([-75, -50, -25, 0, 25, 50, 75], 58).map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx="5.5" ry="12" fill={c} stroke="#00000033" strokeWidth="1" transform={`rotate(${p.d} ${p.x} ${p.y})`} fillOpacity={i % 2 ? 0.8 : 1} />
      ))}
      {arcPoints([-62, -12, 38], 60).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="#E53935" />)}
    </g>
  ),
  flowercrown: (c) => (
    <g>
      {arcPoints([-66, -33, 0, 33, 66], 57).map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          {[0, 72, 144, 216, 288].map(a => <circle key={a} cx={5.5 * Math.sin((a * Math.PI) / 180)} cy={-5.5 * Math.cos((a * Math.PI) / 180)} r="4.6" fill={c} stroke="#00000022" strokeWidth="0.8" />)}
          <circle r="3.4" fill="#FFF59D" />
        </g>
      ))}
      {arcPoints([-50, -16, 16, 50], 57).map((p, i) => <ellipse key={i} cx={p.x} cy={p.y} rx="3.4" ry="7" fill="#66BB6A" transform={`rotate(${p.d} ${p.x} ${p.y})`} />)}
    </g>
  ),
  wheel: (c) => (
    <g>
      <circle cx="100" cy="95" r="68" fill="none" stroke={c} strokeWidth="4.5" />
      {Array.from({ length: 8 }).map((_, i) => { const a = (Math.PI / 4) * i; return <line key={i} x1={100 + 59 * Math.cos(a)} y1={95 + 59 * Math.sin(a)} x2={100 + 68 * Math.cos(a)} y2={95 + 68 * Math.sin(a)} stroke={c} strokeWidth="3" />; })}
      {Array.from({ length: 8 }).map((_, i) => { const a = (Math.PI / 4) * i + Math.PI / 8; return <circle key={i} cx={100 + 68 * Math.cos(a)} cy={95 + 68 * Math.sin(a)} r="3.2" fill="#FFF8E1" stroke={c} strokeWidth="1" />; })}
    </g>
  ),
  bowl: (c) => (
    <g>
      {[[86, 22], [100, 12], [114, 24], [96, 4]].map(([x, y], i) => <path key={i} d={`M${x},${y - 5} Q${x + 4},${y} ${x},${y + 3} Q${x - 4},${y} ${x},${y - 5} Z`} fill="#4FC3F7" />)}
      <path d="M66,38 Q70,66 100,68 Q130,66 134,38 Z" fill={c} stroke="#546E7A" strokeWidth="2" />
      <ellipse cx="100" cy="38" rx="34" ry="7" fill="#E1F5FE" stroke="#546E7A" strokeWidth="2" />
      <path d="M76,46 Q80,58 90,62" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  beanie: (c) => (
    <g>
      <path d="M62,58 Q60,14 100,14 Q140,14 138,58 Z" fill={c} stroke="#00000033" strokeWidth="1.5" />
      {[78, 92, 108, 122].map((x, i) => <path key={i} d={`M${x},54 Q${100 + (x - 100) * 0.7},30 ${100 + (x - 100) * 0.35},16`} stroke="#00000026" strokeWidth="2" fill="none" />)}
      <rect x="55" y="50" width="90" height="15" rx="7" fill="#ECEFF1" stroke="#B0BEC5" strokeWidth="1.5" />
      {[66, 80, 94, 108, 122, 136].map((x, i) => <line key={i} x1={x} y1="53" x2={x} y2="62" stroke="#B0BEC5" strokeWidth="2" />)}
      <circle cx="100" cy="12" r="10" fill="#FFFFFF" stroke="#B0BEC5" strokeWidth="1.5" />
    </g>
  ),
  heartglasses: (c) => (
    <g stroke={c} strokeWidth="3.2" strokeLinejoin="round">
      {[80, 120].map(x => <path key={x} transform={`translate(${x} 99)`} d="M0,12 C-21,-3 -12,-20 0,-9 C12,-20 21,-3 0,12 Z" fill={c} fillOpacity="0.5" />)}
      <line x1="91" y1="92" x2="109" y2="92" />
    </g>
  ),
  dove: (c) => (
    <g transform="translate(150 28)">
      <circle cx="12" cy="10" r="26" fill={c} fillOpacity="0.25" />
      <path d="M-14,12 L-26,6 L-20,16 Z" fill="#FFFFFF" stroke="#90A4AE" strokeWidth="1.2" />
      <ellipse cx="2" cy="14" rx="17" ry="9" fill="#FFFFFF" stroke="#90A4AE" strokeWidth="1.5" />
      <path d="M-4,12 Q-4,-8 10,-10 Q4,2 8,12 Z" fill="#ECEFF1" stroke="#90A4AE" strokeWidth="1.2" />
      <circle cx="18" cy="8" r="6.5" fill="#FFFFFF" stroke="#90A4AE" strokeWidth="1.5" />
      <circle cx="20" cy="7" r="1.4" fill="#37474F" />
      <path d="M24,9 L31,11 L24,13 Z" fill="#FF9800" />
      <path d="M30,12 Q36,16 32,22" stroke="#66BB6A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="33" cy="18" rx="2.4" ry="4" fill="#66BB6A" transform="rotate(30 33 18)" />
    </g>
  ),
  ghost: (c) => (
    <g transform="translate(158 40)">
      <circle cx="0" cy="0" r="26" fill={c} fillOpacity="0.28" />
      <path d="M-15,17 L-15,-4 Q-15,-19 0,-19 Q15,-19 15,-4 L15,17 L10,12 L5,17 L0,12 L-5,17 L-10,12 Z" fill="#FFFFFF" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="-5" cy="-4" r="2.6" fill="#37474F" /><circle cx="5" cy="-4" r="2.6" fill="#37474F" />
      <ellipse cx="0" cy="4" rx="3" ry="3.6" fill="#37474F" />
    </g>
  ),
  witchhat: (c) => (
    <g>
      <path d="M72,46 L95,6 Q100,0 105,8 L128,46 Z" fill={c} stroke="#00000044" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="100" cy="47" rx="56" ry="9" fill="#212121" stroke="#00000066" strokeWidth="1.5" />
      <rect x="79" y="31" width="42" height="8" fill="#FFB300" />
      <rect x="93" y="30" width="14" height="10" rx="2" fill="none" stroke="#6D4C41" strokeWidth="2" />
    </g>
  ),
  feathers: (c) => (
    <g>
      {[[-52, '#C62828'], [-26, '#EF6C00'], [0, c], [26, '#EF6C00'], [52, '#C62828']].map(([d, f], i) => {
        const a = (d * Math.PI) / 180;
        const cx = 100 + 26 * Math.sin(a), cy = 54 - 26 * Math.cos(a);
        return <ellipse key={i} cx={cx} cy={cy} rx="8" ry="19" fill={f} stroke="#5D4037" strokeWidth="1.6" transform={`rotate(${d} ${cx} ${cy})`} />;
      })}
      <rect x="56" y="52" width="88" height="11" rx="5.5" fill="#6D4C41" />
    </g>
  ),
  partyhat: (c) => (
    <g transform="rotate(14 100 54)">
      <path d="M76,54 L100,6 L124,54 Z" fill={c} stroke="#00000033" strokeWidth="1.5" strokeLinejoin="round" />
      {[[92, 36], [108, 36], [100, 24], [86, 48], [114, 48], [100, 46]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={['#FFD740', '#FFFFFF', '#40C4FF'][i % 3]} />)}
      <circle cx="100" cy="6" r="7.5" fill="#FFD740" stroke="#F9A825" strokeWidth="1.2" />
    </g>
  ),
  moonstar: (c) => (
    <g transform="translate(158 34)">
      <circle r="26" fill={c} fillOpacity="0.22" />
      <path d="M0,-19 a19,19 0 1,0 15,27 a15,15 0 1,1 -15,-27 Z" fill={c} stroke="#00000033" strokeWidth="1.2" />
      <polygon points={star5(13, -9, 7)} fill="#FFFFFF" stroke={c} strokeWidth="1" strokeLinejoin="round" />
    </g>
  ),
  candle: (c) => (
    <g>
      <ellipse cx="100" cy="50" rx="22" ry="6" fill={c} stroke="#00000044" strokeWidth="1.5" />
      <rect x="93" y="26" width="14" height="24" rx="2" fill="#FFF8E1" stroke="#BCAAA4" strokeWidth="1.5" />
      <circle cx="100" cy="14" r="13" fill="#FFB74D" fillOpacity="0.35" />
      <path d="M100,4 Q108,14 100,24 Q92,14 100,4 Z" fill="#FFEB3B" stroke="#FF9800" strokeWidth="1.5" />
    </g>
  ),
  fire: (c) => (
    <g transform="translate(156 36)">
      <circle r="24" fill={c} fillOpacity="0.22" />
      <path d="M0,-24 Q15,-8 11,6 Q8,17 0,17 Q-8,17 -11,6 Q-13,-6 -2,-14 Q-2,-6 4,-2 Q5,-14 0,-24 Z" fill={c} stroke="#BF360C" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M0,-6 Q7,2 4,9 Q0,13 -4,9 Q-6,3 0,-6 Z" fill="#FFEB3B" />
    </g>
  ),
  snowflake: (c) => (
    <g transform="translate(156 34)" stroke={c} strokeWidth="3" strokeLinecap="round">
      <circle r="25" fill="#E3F2FD" fillOpacity="0.5" stroke="none" />
      {[0, 60, 120].map(a => <g key={a} transform={`rotate(${a})`}><line x1="0" y1="-20" x2="0" y2="20" /><path d="M-6,-13 L0,-8 L6,-13 M-6,13 L0,8 L6,13" fill="none" strokeWidth="2.4" /></g>)}
    </g>
  ),
  sparkler: (c) => (
    <g transform="translate(150 40) rotate(20)">
      <line x1="0" y1="0" x2="0" y2="40" stroke="#8D6E63" strokeWidth="3.4" strokeLinecap="round" />
      {Array.from({ length: 10 }).map((_, i) => { const a = (Math.PI / 5) * i; return <line key={i} x1={5 * Math.cos(a)} y1={-4 + 5 * Math.sin(a)} x2={(i % 2 ? 15 : 22) * Math.cos(a)} y2={-4 + (i % 2 ? 15 : 22) * Math.sin(a)} stroke={i % 3 === 0 ? c : i % 3 === 1 ? '#FFFFFF' : '#FF80AB'} strokeWidth="2.4" strokeLinecap="round" />; })}
      <circle cy="-4" r="3.4" fill="#FFF59D" />
    </g>
  ),
  pumpkin: (c) => (
    <g transform="translate(156 40)">
      <ellipse cx="0" cy="0" rx="19" ry="15" fill={c} stroke="#BF360C" strokeWidth="1.8" />
      <path d="M-7,-13 Q-9,0 -7,13 M7,-13 Q9,0 7,13" stroke="#BF360C" strokeOpacity="0.5" strokeWidth="1.6" fill="none" />
      <path d="M0,-14 Q1,-22 6,-23" stroke="#558B2F" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M-9,-4 L-4,-4 L-6.5,-9 Z M4,-4 L9,-4 L6.5,-9 Z" fill="#3E2723" />
      <path d="M-9,4 L-5,8 L-2,4 L2,8 L5,4 L9,8" stroke="#3E2723" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
    </g>
  ),
  chefhat: (c) => (
    <g stroke="#B0BEC5" strokeWidth="1.6">
      <circle cx="72" cy="36" r="13" fill="#FFFFFF" /><circle cx="128" cy="36" r="13" fill="#FFFFFF" /><circle cx="100" cy="26" r="16" fill="#FFFFFF" />
      <rect x="68" y="42" width="64" height="18" rx="3" fill="#FFFFFF" />
      <rect x="68" y="53" width="64" height="7" rx="2" fill={c} stroke="none" />
    </g>
  ),
  rocket: (c) => (
    <g transform="translate(156 36) rotate(35)">
      <path d="M-5,18 Q0,34 5,18 Z" fill="#FF9800" /><path d="M-3,18 Q0,28 3,18 Z" fill="#FFEB3B" />
      <path d="M-9,16 L-15,24 L-6,18 Z M9,16 L15,24 L6,18 Z" fill={c} />
      <path d="M0,-24 Q10,-10 8,16 L-8,16 Q-10,-10 0,-24 Z" fill="#ECEFF1" stroke="#90A4AE" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M0,-24 Q7,-16 8,-8 L-8,-8 Q-7,-16 0,-24 Z" fill={c} />
      <circle cx="0" cy="2" r="4" fill="#4FC3F7" stroke="#546E7A" strokeWidth="1.4" />
    </g>
  ),
  bulb: (c) => (
    <g transform="translate(156 32)">
      <circle r="26" fill={c} fillOpacity="0.28" />
      <path d="M-9,12 Q-17,2 -14,-6 Q-10,-18 0,-18 Q10,-18 14,-6 Q17,2 9,12 Z" fill={c} stroke="#F9A825" strokeWidth="1.8" />
      <rect x="-7" y="12" width="14" height="7" rx="2" fill="#90A4AE" />
      <path d="M-3,-8 Q-6,-2 -3,4" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  ),
  bigstar: (c) => (
    <g transform="translate(156 32)">
      <circle r="28" fill={c} fillOpacity="0.25" />
      <polygon points={star5(0, 0, 21)} fill={c} stroke="#FFF8E1" strokeWidth="2" strokeLinejoin="round" />
      <polygon points={star5(0, 0, 9)} fill="#FFFFFF" fillOpacity="0.55" />
    </g>
  ),
  drops: (c) => (
    <g>
      {[[150, 26, 1], [170, 44, 0.8], [136, 14, 0.7]].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M0,-16 Q14,2 10,10 Q6,18 0,18 Q-6,18 -10,10 Q-14,2 0,-16 Z" fill={c} stroke="#0277BD" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M-4,-2 Q-7,4 -4,9" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
  cloud: (c) => (
    <g transform="translate(156 34)">
      <circle cx="4" cy="-4" r="15" fill={c} fillOpacity="0.85" />
      <g fill="#FFFFFF" stroke="#B0BEC5" strokeWidth="1.2">
        <circle cx="-9" cy="4" r="9" /><circle cx="2" cy="-1" r="11" /><circle cx="13" cy="5" r="8" /><rect x="-17" y="4" width="38" height="9" rx="4.5" stroke="none" />
      </g>
    </g>
  ),
  crown: (c) => (
    <g>
      <path d="M62,58 L62,30 L80,45 L100,20 L120,45 L138,30 L138,58 Z" fill={c} stroke="#B8860B" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="62" y="50" width="76" height="9" fill="#00000022" />
      {[[62, 28, '#EF5350'], [100, 18, '#42A5F5'], [138, 28, '#66BB6A']].map(([x, y, f], i) => <circle key={i} cx={x} cy={y} r="4.5" fill={f} stroke="#FFFFFF" strokeWidth="1.2" />)}
      {[78, 100, 122].map((x, i) => <circle key={i} cx={x} cy="54" r="2.6" fill="#FFF8E1" />)}
    </g>
  ),
};

export function CharacterSvg({ skinColor, hair, outfitColor, outfitPattern, accessory, className, style }) {
  const hairPath = hair.style === 'short'
    ? <path d="M58,72 Q58,24 100,24 Q142,24 142,72 L142,54 Q100,32 58,54 Z" fill={hair.color} />
    : hair.style === 'long'
    ? <path d="M52,72 Q46,18 100,18 Q154,18 148,72 L152,145 Q140,156 134,122 L134,70 Q100,44 66,70 L66,122 Q60,156 48,145 Z" fill={hair.color} />
    : hair.style === 'bun'
    ? <>
        <circle cx="100" cy="14" r="13" fill={hair.color} />
        <path d="M58,72 Q58,26 100,26 Q142,26 142,72 L142,54 Q100,34 58,54 Z" fill={hair.color} />
      </>
    : null;

  let accessoryMarkup = null;
  if (ACCESSORY_ART[accessory.kind]) {
    accessoryMarkup = ACCESSORY_ART[accessory.kind](accessory.color || '#FFC107');
  } else if (accessory.kind === 'headband') {
    accessoryMarkup = <rect x="56" y="53" width="88" height="11" rx="5.5" fill={accessory.color} />;
  } else if (accessory.kind === 'flower') {
    accessoryMarkup = (
      <>
        <circle cx="136" cy="54" r="10" fill={accessory.color} />
        <circle cx="136" cy="54" r="4" fill="#FFF59D" />
      </>
    );
  } else if (accessory.kind === 'glasses') {
    accessoryMarkup = (
      <g stroke="#37474F" strokeWidth="3.5" fill="none">
        <circle cx="80" cy="98" r="12" />
        <circle cx="120" cy="98" r="12" />
        <line x1="92" y1="98" x2="108" y2="98" />
      </g>
    );
  } else if (accessory.kind === 'starglasses') {
    const star = (cx, cy) => {
      const pts = Array.from({ length: 10 }).map((_, i) => {
        const r = i % 2 === 0 ? 15 : 7;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      return <polygon points={pts} fill={accessory.color || "#FFF59D"} fillOpacity="0.5" stroke={accessory.color || "#F9A825"} strokeWidth="3" strokeLinejoin="round" />;
    };
    accessoryMarkup = (
      <g>
        {star(78, 98)}
        {star(122, 98)}
        <line x1="92" y1="98" x2="108" y2="98" stroke={accessory.color || "#F9A825"} strokeWidth="3" />
      </g>
    );
  } else if (accessory.kind === 'lampglasses') {
    accessoryMarkup = (
      <g stroke="#B71C1C" strokeWidth="3.5">
        <circle cx="80" cy="98" r="13" fill="#FFB74D" fillOpacity="0.55" />
        <circle cx="120" cy="98" r="13" fill="#FFB74D" fillOpacity="0.55" />
        <line x1="93" y1="98" x2="107" y2="98" />
        <path d="M67,95 L56,90 M133,95 L144,90" strokeLinecap="round" />
      </g>
    );
  } else if (accessory.kind === 'skylantern') {
    // A paper sky lantern floating above the shoulder, flame glowing inside.
    accessoryMarkup = (
      <g>
        <circle cx="158" cy="34" r="22" fill="#FFB74D" fillOpacity="0.28" />
        <path d="M148,22 L168,22 L172,48 L144,48 Z" fill={accessory.color || "#FF9800"} stroke="#E65100" strokeWidth="2" strokeLinejoin="round" />
        <path d="M148,22 Q158,16 168,22" fill="#FFB74D" stroke="#E65100" strokeWidth="2" />
        <ellipse cx="158" cy="36" rx="5" ry="9" fill="#FFF8E1" />
        <path d="M153,48 L163,48 L161,52 L155,52 Z" fill="#6D4C41" />
      </g>
    );
  } else if (accessory.kind === 'lantern') {
    accessoryMarkup = (
      <g>
        <line x1="138" y1="30" x2="138" y2="44" stroke="#8D6E63" strokeWidth="2" />
        <ellipse cx="138" cy="56" rx="11" ry="13" fill={accessory.color} stroke="#E65100" strokeWidth="2" />
        <ellipse cx="138" cy="56" rx="4" ry="7" fill="#FFF8E1" />
        <rect x="132" y="43" width="12" height="3" rx="1.5" fill="#E65100" />
        <rect x="132" y="68" width="12" height="3" rx="1.5" fill="#E65100" />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <ellipse cx="100" cy="224" rx="58" ry="9" fill="#00000022" />
      <path d={BODY_PATH} fill={(ROBE_PATTERNS[outfitPattern] && ROBE_PATTERNS[outfitPattern][0]) || outfitColor} />
      {ROBE_PATTERNS[outfitPattern] && React.createElement(ROBE_PATTERNS[outfitPattern][1], { color: outfitColor })}
      <circle cx="68" cy="108" r="8" fill={skinColor} opacity="0.55" />
      <circle cx="132" cy="108" r="8" fill={skinColor} opacity="0.55" />
      <circle cx="100" cy="95" r="55" fill={skinColor} />
      <circle cx="80" cy="98" r="5" fill="#3E2723" />
      <circle cx="120" cy="98" r="5" fill="#3E2723" />
      <path d="M82,120 Q100,132 118,120" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round" />
      {hairPath}
      {accessoryMarkup}
    </svg>
  );
}


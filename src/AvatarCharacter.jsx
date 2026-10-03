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

// What fills the body for each pattern id: [fill, art]
const ROBE_PATTERNS = {
  lights: ['url(#festRobeGrad)', FestivalRobeArt],
  lotus: ['url(#festLotusGrad)', LotusRobeArt],
  night: ['url(#festNightGrad)', NightRobeArt],
  checks: ['url(#festCheck)', ChecksRobeArt],
};

export function CharacterSvg({ skinColor, hair, outfitColor, outfitPattern, accessory, className }) {
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
  if (accessory.kind === 'headband') {
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
      return <polygon points={pts} fill="#FFF59D" fillOpacity="0.55" stroke="#F9A825" strokeWidth="3" strokeLinejoin="round" />;
    };
    accessoryMarkup = (
      <g>
        {star(78, 98)}
        {star(122, 98)}
        <line x1="92" y1="98" x2="108" y2="98" stroke="#F9A825" strokeWidth="3" />
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
        <path d="M148,22 L168,22 L172,48 L144,48 Z" fill="#FF9800" stroke="#E65100" strokeWidth="2" strokeLinejoin="round" />
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
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="100" cy="224" rx="58" ry="9" fill="#00000022" />
      <path d={BODY_PATH} fill={ROBE_PATTERNS[outfitPattern] ? ROBE_PATTERNS[outfitPattern][0] : outfitColor} />
      {ROBE_PATTERNS[outfitPattern] && React.createElement(ROBE_PATTERNS[outfitPattern][1])}
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


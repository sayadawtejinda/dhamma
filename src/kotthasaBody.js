// Hand-drawn SVG figures for the 32 parts of the body (koṭṭhāsa): a schematic standing human with the named part
// highlighted. No text inside the pictures, so the same drawing serves every language. kotthasaSvg(id) returns an
// SVG string for ids p1..p20 (pathavī) and ap1..ap12 (āpo), or '' for any other id.
// Coordinates: front view, viewBox 0 0 200 420 (viewer's left = the person's right); some parts use a cropped view.

const EARTH = '#e11d48';
const WATER = '#0284c7';
const FAINT = 'fill="#e2e8f0" stroke="#94a3b8" stroke-width=".7"';
const hi = (c, sw = 1.2) => `fill="${c}" fill-opacity=".88" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"`;
const line = (c, w) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const mirror = (s) => `<g transform="translate(200 0) scale(-1 1)">${s}</g>`;
const both = (s) => s + mirror(s);

// ---------- body silhouette ----------
const TORSO = 'M 62 78 Q 100 66 138 78 L 135 130 Q 131 170 136 206 L 139 236 Q 100 246 61 236 L 64 206 Q 69 170 65 130 Z';
const ARM = 'M 62 80 Q 52 82 48 92 L 38 156 L 30 214 Q 34 220 44 216 L 52 160 L 65 112 Z';
const LEG = 'M 68 234 L 99 242 L 97 330 L 96 394 Q 96 408 84 408 L 70 408 Q 72 398 78 394 L 78 332 L 66 262 Z';
const HEAD = '<ellipse cx="100" cy="34" rx="19" ry="24"/>';
const NECK = '<rect x="91" y="56" width="18" height="16" rx="4"/>';
const BODY_SHAPES = `${HEAD}${NECK}<path d="${TORSO}"/>${both(`<path d="${ARM}"/><path d="${LEG}"/>`)}`;
const FACE = `<g fill="none" stroke="#94a3b8" stroke-width=".8" stroke-linecap="round">
<ellipse cx="92" cy="32" rx="2.6" ry="1.5"/><ellipse cx="108" cy="32" rx="2.6" ry="1.5"/>
<path d="M 100 34 L 98 42 L 102 42"/><path d="M 94 49 Q 100 52 106 49"/></g>`;

function body(skin) {
  // skin: optional [stroke colour, stroke width] drawn as an outer rim; fat: handled by caller via extra
  const rim = skin ? `<g fill="none" stroke="${skin[0]}" stroke-width="${skin[1]}" stroke-linejoin="round">${BODY_SHAPES}</g>` : '';
  return `${rim}<g fill="#f8fafc" fill-opacity=".92" stroke="#94a3b8" stroke-width="1.1" stroke-linejoin="round">${BODY_SHAPES}</g>${FACE}`;
}

// ---------- internal organs ----------
const ORGAN = {
  lungs: 'M 98 84 Q 82 82 74 96 Q 68 116 74 136 Q 88 140 98 134 Z',
  heart: 'M 106 136 C 92 124 92 106 101 104 C 105 103 107 106 107 108 C 107 106 110 103 114 104 C 122 106 120 124 106 136 Z',
  liver: 'M 68 146 Q 88 138 112 148 Q 116 162 104 170 Q 84 176 70 162 Q 66 154 68 146 Z',
  stomach: 'M 108 148 Q 130 146 132 166 Q 132 184 116 184 Q 106 182 108 172 Q 118 172 120 164 Q 118 156 108 156 Z',
};
const lungs = (a) => `<path d="${ORGAN.lungs}" ${a}/>${mirror(`<path d="${ORGAN.lungs}" ${a}/>`)}`;
const heart = (a) => `<path d="${ORGAN.heart}" ${a}/>`;
const liver = (a) => `<path d="${ORGAN.liver}" ${a}/>`;
const stomach = (a) => `<path d="${ORGAN.stomach}" ${a}/>`;
const spleen = (a) => `<ellipse cx="128" cy="150" rx="4.5" ry="10" transform="rotate(12 128 150)" ${a}/>`;
const gall = (a) => `<ellipse cx="99" cy="170" rx="4" ry="7" ${a}/>`;
const kidneys = (a) => `<ellipse cx="86" cy="178" rx="5.5" ry="10" ${a}/><ellipse cx="114" cy="178" rx="5.5" ry="10" ${a}/>`;
const bladder = (a) => `<ellipse cx="100" cy="226" rx="9" ry="7" ${a}/>`;
const ureters = (c) => `<path d="M 88 187 Q 92 208 96 222 M 112 187 Q 108 208 104 222" ${line(c, 1.6)}/>`;
const largeInt = (c, w = 7) => `<path d="M 82 218 L 78 192 Q 78 184 88 184 L 112 184 Q 122 184 122 192 L 118 218 Q 114 226 108 220" ${line(c, w)}/>`;
const smallInt = (c, w = 4) => `<path d="M 86 192 Q 90 188 94 192 Q 98 196 102 192 Q 106 188 110 192 Q 114 196 114 200 Q 110 204 106 200 Q 102 196 98 200 Q 94 204 90 200 Q 86 204 86 208 Q 90 212 94 208 Q 98 204 102 208 Q 106 212 110 208" ${line(c, w)}/>`;
const mesentery = (a) => `<path d="M 100 186 L 80 208 Q 100 222 120 208 Z" ${a}/><path d="M 100 186 L 88 212 M 100 186 L 94 216 M 100 186 L 100 218 M 100 186 L 106 216 M 100 186 L 112 212" fill="none" stroke="#fff" stroke-width=".7" stroke-opacity=".8"/>`;
const rectum = (c) => `<path d="M 118 218 Q 112 228 108 236 L 102 250" ${line(c, 6)}/>`;
const trachea = (c, w = 4) => `<path d="M 100 58 L 100 98 M 100 98 L 87 112 M 100 98 L 113 112" ${line(c, w)}/>`;
const brain = (a) => `<g transform="translate(100 28) scale(.86) translate(-100 -28)"><path d="M 84 30 Q 82 16 98 14 Q 104 12 108 15 Q 120 16 118 30 Q 120 42 106 42 Q 94 46 86 40 Q 82 36 84 30 Z" ${a}/><path d="M 92 20 Q 98 26 94 34 M 104 16 Q 100 26 106 36 M 112 22 Q 108 30 114 36 M 88 34 Q 96 32 100 38" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1"/></g>`;

function allOrgansFaint(skip = []) {
  const parts = {
    lungs: lungs(FAINT), liver: liver(FAINT), stomach: stomach(FAINT), spleen: spleen(FAINT), kidneys: kidneys(FAINT),
    large: largeInt('#cbd5e1'), small: smallInt('#cbd5e1'), bladder: bladder(FAINT), heart: heart(FAINT), brain: brain(FAINT),
  };
  return Object.entries(parts).filter(([k]) => !skip.includes(k)).map(([, v]) => v).join('');
}

// ---------- skeleton / muscle / vessels ----------
function skeleton(c, w = 2.4) {
  let ribs = '';
  for (let i = 0; i < 6; i++) { const y = 84 + i * 9; ribs += `<path d="M 100 ${y} Q 80 ${y - 4} 74 ${y + 9}" ${line(c, w * .55)}/>`; }
  const half = `${ribs}<path d="M 100 76 L 66 80" ${line(c, w * .8)}/><path d="M 62 86 L 48 150 L 38 208" ${line(c, w)}/><path d="M 80 236 L 86 330 L 86 396" ${line(c, w * 1.3)}/>
<circle cx="62" cy="85" r="3.4" fill="${c}"/><circle cx="48" cy="150" r="3" fill="${c}"/><circle cx="80" cy="236" r="4" fill="${c}"/><circle cx="86" cy="330" r="4.2" fill="${c}"/><path d="M 84 396 L 96 402" ${line(c, w)}/>
<path d="M 100 214 Q 82 206 74 220 L 80 242 Q 92 236 100 240" ${line(c, w * .8)}/>`;
  return `<ellipse cx="100" cy="32" rx="16" ry="20" ${line(c, w * .8)}/><path d="M 90 48 Q 100 60 110 48" ${line(c, w * .8)}/><path d="M 100 60 L 100 242" ${line(c, w * 1.3)}/>${both(half)}`;
}
const muscleHalf = (c) => `<path d="M 100 86 Q 84 82 72 92 Q 74 110 100 112 Z" ${hi(c)}/><circle cx="64" cy="88" r="7" ${hi(c)}/><ellipse cx="52" cy="124" rx="6" ry="18" transform="rotate(14 52 124)" ${hi(c)}/><ellipse cx="44" cy="180" rx="5" ry="20" transform="rotate(10 44 180)" ${hi(c)}/>
<ellipse cx="84" cy="284" rx="12" ry="40" transform="rotate(-4 84 284)" ${hi(c)}/><ellipse cx="86" cy="362" rx="8" ry="26" ${hi(c)}/><rect x="94" y="118" width="6" height="12" rx="2" ${hi(c)}/><rect x="94" y="134" width="6" height="12" rx="2" ${hi(c)}/><rect x="94" y="150" width="6" height="12" rx="2" ${hi(c)}/><rect x="94" y="166" width="6" height="12" rx="2" ${hi(c)}/><rect x="94" y="182" width="6" height="14" rx="2" ${hi(c)}/>`;
const muscles = (c) => both(muscleHalf(c));
const tendonHalf = (c) => `<path d="M 49 140 L 42 196 M 52 142 L 46 198 M 55 144 L 50 200 M 45 200 L 36 214 M 48 202 L 42 216" ${line(c, 1.6)}/><path d="M 84 318 L 84 336 M 82 340 L 84 392 M 88 340 L 86 392" ${line(c, 2)}/><path d="M 62 92 L 56 112 M 72 96 L 80 130" ${line(c, 1.6)}/>`;
const tendons = (c) => both(tendonHalf(c));

// ---------- insets (magnifier circle, bottom right of the full-body view) ----------
const IX = 164, IY = 350, IR = 32;
function inset(inner, fx, fy, c) {
  const dx = IX - fx, dy = IY - fy, d = Math.hypot(dx, dy);
  const ex = (IX - (dx / d) * IR).toFixed(1), ey = (IY - (dy / d) * IR).toFixed(1);
  return `<line x1="${fx}" y1="${fy}" x2="${ex}" y2="${ey}" stroke="${c}" stroke-width="1" stroke-dasharray="3 2"/>
<circle cx="${fx}" cy="${fy}" r="3" fill="none" stroke="${c}" stroke-width="1.2"/>
<g transform="translate(${IX} ${IY})"><clipPath id="kbclip"><circle r="${IR}"/></clipPath><circle r="${IR}" fill="#fff"/><g clip-path="url(#kbclip)">${inner}</g><circle r="${IR}" fill="none" stroke="${c}" stroke-width="2"/></g>`;
}
const skinBands = (hl) => `<rect x="-40" y="-40" width="80" height="80" fill="#fecaca"/><rect x="-40" y="-40" width="80" height="80" fill="#f8fafc"/>
<rect x="-40" y="-8" width="80" height="6" fill="${hl === 'epi' ? EARTH : '#fda4af'}"/><rect x="-40" y="-2" width="80" height="14" fill="#fdba74"/>
<rect x="-40" y="12" width="80" height="16" fill="${hl === 'fat' ? '#f59e0b' : '#fde68a'}"/><rect x="-40" y="28" width="80" height="14" fill="#fca5a5"/>`;
const fatCells = (n) => Array.from({ length: n }, (_, i) => `<circle cx="${-26 + (i % 6) * 10}" cy="${i % 2 ? 22 : 18}" r="4" fill="#fef3c7" stroke="#d97706" stroke-width=".7"/>`).join('');

// ---------- head views ----------
const HEAD_VIEW = '56 4 88 72';
const MOUTH_VIEW = '76 22 48 40';
const mouthOpen = '<ellipse cx="100" cy="49.5" rx="9" ry="5" fill="#7f1d1d" fill-opacity=".85"/>';

// ---------- the 32 figures ----------
function figure(id) {
  const E = EARTH, W = WATER;
  switch (id) {
    case 'p1': return { view: HEAD_VIEW, svg: `${body()}<path d="M 80 32 Q 78 8 100 7 Q 122 8 120 32 Q 118 22 108 17 Q 100 20 92 17 Q 82 22 80 32 Z" ${hi('#1f2937')}/><path d="M 82 26 Q 86 12 100 9 M 118 26 Q 114 12 100 9 M 90 14 Q 100 10 110 14" fill="none" stroke="${E}" stroke-width="1.4"/>` };
    case 'p2': {
      let h = ''; const pts = [[44, 130], [47, 142], [42, 160], [40, 176], [44, 190], [156, 130], [153, 142], [158, 160], [160, 176], [156, 190], [84, 96], [92, 104], [108, 100], [116, 94], [88, 120], [112, 124], [84, 288], [88, 300], [82, 316], [86, 350], [90, 366], [116, 288], [112, 300], [118, 316], [114, 350], [110, 366], [84, 140], [116, 146]];
      pts.forEach(([x, y], i) => { const t = i % 2 ? 3 : -3; h += `<path d="M ${x} ${y} l ${t} -7" ${line(E, 1.5)}/>`; });
      const ins = `<rect x="-40" y="10" width="80" height="40" fill="#fed7aa"/><rect x="-40" y="4" width="80" height="6" fill="#fda4af"/>` + [-20, -6, 8, 22].map((x, i) => `<path d="M ${x} 6 Q ${x + 4 * (i % 2 ? 1 : -1)} -10 ${x + 8 * (i % 2 ? 1 : -1)} -26" ${line(E, 2.4)}/><path d="M ${x} 6 L ${x} 24" ${line('#b45309', 1.6)}/>`).join('');
      return { view: '0 0 200 420', svg: `${body()}${h}${inset(ins, 44, 160, E)}` };
    }
    case 'p3': {
      const nails = [34, 38, 42, 45].map((x) => `<rect x="${x - 1.6}" y="214" width="3.4" height="5" rx="1.4" ${hi(E, .6)}/>`).join('');
      const toes = [72, 77, 82, 87, 92].map((x) => `<rect x="${x - 1.8}" y="404" width="3.8" height="4.4" rx="1.6" ${hi(E, .6)}/>`).join('');
      const ins = `<path d="M -14 40 L -14 6 Q -14 -12 0 -12 Q 14 -12 14 6 L 14 40 Z" fill="#fed7aa" stroke="#b45309" stroke-width="1.4"/><path d="M -9 -4 Q -9 -10 0 -10 Q 9 -10 9 -4 L 9 12 L -9 12 Z" ${hi(E, 1)}/><path d="M -6 -2 Q 0 -6 6 -2" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>`;
      return { view: '0 0 200 420', svg: `${body()}${nails}${both(toes).replace(/<rect/g, '<rect')}${inset(ins, 40, 218, E)}` };
    }
    case 'p4': {
      let up = '', lo = '';
      for (let i = 0; i < 7; i++) { up += `<rect x="${92.4 + i * 2.5}" y="45" width="2" height="3.8" rx=".9" fill="#fff" stroke="${E}" stroke-width=".6"/>`; lo += `<rect x="${92.9 + i * 2.4}" y="50.6" width="1.9" height="3.4" rx=".9" fill="#fff" stroke="${E}" stroke-width=".6"/>`; }
      return { view: MOUTH_VIEW, svg: `${body()}${mouthOpen}${up}${lo}` };
    }
    case 'p5': {
      const ins = skinBands('epi');
      return { view: '0 0 200 420', svg: `${body([E, 5]).replace(/fill="#f8fafc" fill-opacity=".92"/, 'fill="#ffe4e6" fill-opacity=".95"')}${inset(ins, 134, 160, E)}` };
    }
    case 'p6': return { view: '0 0 200 420', svg: `${body()}${muscles(E)}` };
    case 'p7': return { view: '0 0 200 420', svg: `${body()}${both(muscleHalf('#fecdd3').replace(/fill-opacity="\.88"/g, 'fill-opacity=".55"'))}${tendons('#d97706')}` };
    case 'p8': return { view: '0 0 200 420', svg: `${body()}${skeleton(E)}` };
    case 'p9': {
      const ins = `<rect x="-14" y="-40" width="28" height="80" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/><rect x="-8" y="-40" width="16" height="80" fill="${E}" fill-opacity=".85"/>${[-30, -14, 2, 18, 32].map((y, i) => `<circle cx="${i % 2 ? -3 : 3}" cy="${y}" r="2.6" fill="#fecdd3"/>`).join('')}`;
      return { view: '0 0 200 420', svg: `${body()}${skeleton('#94a3b8', 2)}<path d="M 80 236 L 86 330" ${line(E, 3.6)}/>${inset(ins, 83, 285, E)}` };
    }
    case 'p10': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['kidneys'])}${kidneys(hi(E))}${ureters('#94a3b8')}` };
    case 'p11': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['heart'])}${heart(hi(E))}` };
    case 'p12': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['liver'])}${liver(hi(E))}` };
    case 'p13': {
      const pleura = `<path d="M 100 80 Q 78 76 68 96 Q 62 118 70 140 Q 88 146 100 138 Q 112 146 130 140 Q 138 118 132 96 Q 122 76 100 80 Z" fill="none" stroke="${E}" stroke-width="2.2" stroke-dasharray="5 2.5"/>`;
      const dia = `<path d="M 68 142 Q 100 124 132 142" ${line(E, 2.6)}/>`;
      const perit = `<path d="M 70 146 Q 66 190 72 232 Q 100 242 128 232 Q 134 190 130 146" fill="${E}" fill-opacity=".14" stroke="${E}" stroke-width="2.2" stroke-dasharray="5 2.5"/>`;
      return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint()}${pleura}${dia}${perit}` };
    }
    case 'p14': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['spleen'])}${spleen(hi(E))}` };
    case 'p15': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['lungs', 'heart'])}${lungs(hi(E))}${heart(FAINT)}` };
    case 'p16': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['large'])}${largeInt(E, 8)}${rectum(E)}` };
    case 'p17': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['small'])}${mesentery(hi(E, .6))}${smallInt('#94a3b8', 3)}` };
    case 'p18': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['stomach'])}${stomach(hi('#94a3b8', 1))}<g fill="${E}">${[[116, 166], [122, 172], [112, 174], [120, 160], [126, 168]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>` };
    case 'p19': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['large'])}${largeInt('#cbd5e1')}${rectum(E)}<g fill="${E}"><circle cx="112" cy="232" r="3.2"/><circle cx="108" cy="239" r="3"/><circle cx="104" cy="246" r="2.8"/></g>` };
    case 'p20': return { view: HEAD_VIEW, svg: `${body()}${brain(hi(E))}` };

    // ----- āpo -----
    case 'ap1': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['liver'])}${liver(FAINT)}<path d="M 99 166 L 104 150" ${line(W, 1.8)}/>${gall(hi('#16a34a', 1.2))}<g fill="${W}" fill-opacity=".8">${[[80, 154], [90, 160], [96, 150], [76, 162]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}</g>` };
    case 'ap2': {
      const m = [[100, 66], [99, 78], [101, 90], [94, 104], [106, 104], [90, 110], [110, 110]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="2" fill="${W}" fill-opacity=".9"/>`).join('');
      return { view: '40 40 120 140', svg: `${body()}${lungs(FAINT)}${heart(FAINT)}${trachea('#94a3b8', 5)}${trachea('#e0f2fe', 2.4)}${m}` };
    }
    case 'ap3': {
      const ins = `<rect x="-40" y="10" width="80" height="40" fill="#fed7aa"/><path d="M -22 10 Q 0 -26 22 10 Z" fill="#fde047" stroke="#ca8a04" stroke-width="1.4"/><path d="M -12 10 Q 0 -10 12 10 Z" fill="#a3e635" fill-opacity=".8"/>`;
      return { view: '0 0 200 420', svg: `${body()}<circle cx="45" cy="150" r="5" fill="#a3e635" stroke="#ca8a04" stroke-width="1.4"/>${inset(ins, 45, 150, '#ca8a04')}` };
    }
    case 'ap4': {
      const red = `<path d="M 100 112 L 100 232 M 100 96 L 68 90 L 46 150 L 38 206 M 100 232 L 84 242 L 86 330 L 86 396 M 100 96 L 100 62 M 100 62 L 94 40 M 100 62 L 106 40" ${line('#dc2626', 2.4)}/>`;
      const redR = `<path d="M 100 96 L 132 90 L 154 150 L 162 206 M 100 232 L 116 242 L 114 330 L 114 396" ${line('#dc2626', 2.4)}/>`;
      const blue = `<path d="M 104 120 L 104 232 M 104 100 L 70 96 L 52 150 L 44 206 M 104 232 L 88 244 L 90 330 L 90 396 M 104 100 L 106 62" ${line('#2563eb', 2)}/><path d="M 104 100 L 134 96 L 150 150 L 158 206 M 104 232 L 118 244 L 110 330 L 110 396" ${line('#2563eb', 2)}/>`;
      return { view: '0 0 200 420', svg: `${body()}${blue}${red}${redR}${heart(hi('#b91c1c'))}` };
    }
    case 'ap5': {
      const drops = [[92, 14], [108, 16], [100, 22], [54, 96], [146, 96], [86, 130], [114, 150], [60, 130], [140, 130]].map(([x, y]) => `<path d="M ${x} ${y - 4} Q ${x - 3.4} ${y + 1} ${x} ${y + 3} Q ${x + 3.4} ${y + 1} ${x} ${y - 4} Z" fill="${W}" fill-opacity=".9"/>`).join('');
      const ins = `<rect x="-40" y="10" width="80" height="40" fill="#fed7aa"/><rect x="-40" y="4" width="80" height="6" fill="#fda4af"/><path d="M 0 4 L 0 -10 M 0 26 Q -12 20 -4 14 Q 8 12 2 22 Q -4 30 6 32" ${line(W, 2.2)}/><path d="M 0 26 L 0 4" ${line(W, 1.6)}/><path d="M 0 -26 Q -5 -18 0 -14 Q 5 -18 0 -26 Z" fill="${W}"/>`;
      return { view: '0 0 200 420', svg: `${body()}${drops}${inset(ins, 54, 96, W)}` };
    }
    case 'ap6': {
      const ins = skinBands('fat') + fatCells(12);
      return { view: '0 0 200 420', svg: `${body(['#cbd5e1', 11]).replace('stroke-width="11"', 'stroke-width="11"')}${body(['#f59e0b', 8])}${inset(ins, 134, 160, '#d97706')}` };
    }
    case 'ap7': {
      const tear = (x, y) => `<path d="M ${x} ${y - 5} Q ${x - 3.5} ${y + 1} ${x} ${y + 4} Q ${x + 3.5} ${y + 1} ${x} ${y - 5} Z" fill="${W}" fill-opacity=".95"/>`;
      return { view: HEAD_VIEW, svg: `${body()}<ellipse cx="92" cy="32" rx="3" ry="1.8" fill="#e0f2fe" stroke="${W}" stroke-width=".8"/><ellipse cx="108" cy="32" rx="3" ry="1.8" fill="#e0f2fe" stroke="${W}" stroke-width=".8"/><path d="M 88 30 Q 92 27 96 30 M 104 30 Q 108 27 112 30" ${line(W, 1)}/>${tear(90, 40)}${tear(110, 40)}${tear(95, 45)}${tear(105, 45)}<circle cx="97" cy="33" r="1.1" fill="${W}"/><circle cx="103" cy="33" r="1.1" fill="${W}"/>` };
    }
    case 'ap8': {
      const shine = (x, y, w) => `<path d="M ${x} ${y} q ${w / 2} -3 ${w} 0" ${line('#fff', 1.4)}/><ellipse cx="${x + w / 2}" cy="${y + 1.5}" rx="${w / 2 + 2}" ry="2.2" fill="#facc15" fill-opacity=".55"/>`;
      const ins = `<rect x="-40" y="10" width="80" height="40" fill="#fed7aa"/><rect x="-40" y="4" width="80" height="6" fill="#fda4af"/>${[[-20, 0, 9], [-2, -2, 11], [16, 0, 8], [-10, -14, 6], [8, -14, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fde047" fill-opacity=".85" stroke="#ca8a04" stroke-width="1"/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 4}" fill="#fff"/>`).join('')}`;
      return { view: '0 0 200 420', svg: `${body()}${shine(89, 20, 22)}${shine(96, 36, 8)}${shine(34, 204, 12)}${shine(154, 204, 12)}${inset(ins, 100, 22, '#ca8a04')}` };
    }
    case 'ap9': {
      const gl = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${hi(W, 1)}/>`;
      const sal = `<g fill="#bae6fd" stroke="${W}" stroke-width=".6">${[[96, 47], [104, 47], [100, 53], [93, 51], [107, 51]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="1.8"/>`).join('')}</g>`;
      return { view: HEAD_VIEW, svg: `${body()}${mouthOpen}${gl(81, 43, 3.6, 6)}${gl(119, 43, 3.6, 6)}${gl(90, 56, 4.4, 3)}${gl(110, 56, 4.4, 3)}<path d="M 84 44 L 92 48 M 116 44 L 108 48" ${line(W, 1)}/>${sal}` };
    }
    case 'ap10': {
      const bl = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="2.8" fill="#86efac" stroke="#16a34a" stroke-width=".8"/>`;
      return { view: HEAD_VIEW, svg: `${body()}<path d="M 96 36 Q 93 44 95 44 Q 100 48 105 44 Q 107 44 104 36" fill="#fef2f2" stroke="#94a3b8" stroke-width=".8"/>${bl(97, 43)}${bl(103, 43)}<path d="M 97.5 45 L 97.5 49 M 102.5 45 L 102.5 49" ${line('#16a34a', 1.2)}/><ellipse cx="97.5" cy="50" rx="1.5" ry="2" fill="#86efac"/><ellipse cx="102.5" cy="50" rx="1.5" ry="2" fill="#86efac"/>` };
    }
    case 'ap11': {
      const ins = `<path d="M -22 -40 L -22 -12 Q 0 -2 22 -12 L 22 -40 Z" fill="#f1f5f9" stroke="#64748b" stroke-width="1.6"/><path d="M -20 40 L -20 12 Q 0 22 20 12 L 20 40 Z" fill="#f1f5f9" stroke="#64748b" stroke-width="1.6"/><path d="M -22 -12 Q 0 -2 22 -12 Q 0 -6 -22 -12 Z M -20 12 Q 0 22 20 12" fill="#bae6fd"/><path d="M -22 -8 Q 0 3 22 -8 L 20 9 Q 0 18 -20 9 Z" fill="${W}" fill-opacity=".75"/><path d="M -28 -22 L -28 22 M 28 -22 L 28 22" ${line('#94a3b8', 2)}/>`;
      return { view: '0 0 200 420', svg: `${body()}${skeleton('#cbd5e1', 1.6)}<circle cx="86" cy="330" r="6" ${hi(W)}/><circle cx="114" cy="330" r="6" ${hi(W)}/><circle cx="48" cy="150" r="4.6" ${hi(W)}/><circle cx="152" cy="150" r="4.6" ${hi(W)}/>${inset(ins, 114, 330, W)}` };
    }
    case 'ap12': return { view: '40 60 120 200', svg: `${body()}${allOrgansFaint(['kidneys', 'bladder'])}${ureters(W)}${kidneys(hi(W))}${bladder(hi('#facc15', 1.2))}<ellipse cx="100" cy="226" rx="5" ry="3.4" fill="#fde047"/>` };
    default: return null;
  }
}

export function kotthasaSvg(id) {
  const f = figure(id);
  if (!f) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.view}" role="img" style="width:100%;height:100%;display:block">${f.svg}</svg>`;
}
export const KOTTHASA_IDS = [
  ...Array.from({ length: 20 }, (_, i) => 'p' + (i + 1)),
  ...Array.from({ length: 12 }, (_, i) => 'ap' + (i + 1)),
];

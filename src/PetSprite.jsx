import React, { useId } from 'react';

// Hand-drawn, animated pets (vector, drawn here -- no image files, so they stay sharp on every phone and look the same on
// every device). Every animal is a small set of named parts (body, head, legs, tail, ears, eyes, mouth...) that the CSS below
// moves for each thing the pet can do: walk, run, hop, scamper, waddle, fly, sit, sleep, play, groom, talk, beg, eat, happy.
// The picture always faces RIGHT; the caller turns it round with scaleX(-1) when the pet walks left.
// viewBox 200 x 150, the ground is at y = 130.

export const PET_SPRITE_CSS = `
.ps { width: 100%; height: auto; overflow: visible; display: block; }
.ps .pg { transform-origin: 100px 130px; }
.ps .eyes-open { animation: psBlink 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.ps .eyes-shut, .ps .mouth-open, .ps .zzz { display: none; }
.ps .tail { animation: psTail 1.6s ease-in-out infinite; transform-origin: 0 0; }
.ps .hd { transform-origin: 130px 78px; }
.ps .wing { transform-origin: 96px 82px; }
.ps .trunk { transform-origin: 156px 80px; animation: psTrunk 3s ease-in-out infinite; }
@keyframes psBlink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(.08); } }
@keyframes psTail { 0%,100% { transform: rotate(-14deg); } 50% { transform: rotate(16deg); } }
@keyframes psTailFast { 0%,100% { transform: rotate(-24deg); } 50% { transform: rotate(26deg); } }
@keyframes psTrunk { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(7deg); } }
@keyframes psLegA { 0%,100% { transform: rotate(28deg); } 50% { transform: rotate(-28deg); } }
@keyframes psLegB { 0%,100% { transform: rotate(-28deg); } 50% { transform: rotate(28deg); } }
@keyframes psBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes psRunBob { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-7px) rotate(2deg); } }
@keyframes psHop { 0%,100% { transform: translateY(0) scale(1.04,.94); } 35% { transform: translateY(-26px) scale(.96,1.05); } 65% { transform: translateY(-26px); } }
@keyframes psFly { 0%,100% { transform: translateY(-16px) rotate(-5deg); } 50% { transform: translateY(-46px) rotate(5deg); } }
@keyframes psFlap { 0%,100% { transform: rotate(-40deg); } 50% { transform: rotate(35deg); } }
@keyframes psWaddle { 0%,100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
@keyframes psPlay { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-30px) rotate(6deg); } }
@keyframes psHead { 0%,100% { transform: rotate(-6deg); } 50% { transform: rotate(8deg); } }
@keyframes psGroom { 0%,100% { transform: rotate(26deg); } 50% { transform: rotate(34deg); } }
@keyframes psEatHead { 0%,100% { transform: rotate(22deg); } 50% { transform: rotate(34deg); } }
@keyframes psBreath { 0%,100% { transform: translateY(16px) scale(1,.8); } 50% { transform: translateY(15px) scale(1.02,.84); } }
@keyframes psZ { 0% { transform: translate(0,0) scale(.6); opacity: 0; } 30% { opacity: 1; } 100% { transform: translate(14px,-26px) scale(1.1); opacity: 0; } }
@keyframes psHappy { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-24px) scale(1.06); } }
@keyframes psEar { 0%,88%,100% { transform: rotate(0deg); } 91% { transform: rotate(-9deg); } 95% { transform: rotate(5deg); } }
@keyframes psIdle { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.012,1.022); } }
@keyframes psFlipper { 0%,100% { transform: rotate(-24deg); } 50% { transform: rotate(14deg); } }

.ps .earg { animation: psEar 6s ease-in-out infinite; }
.ps-idle .pg { animation: psIdle 3.2s ease-in-out infinite; }
.ps-sleep .earg, .ps-fly .earg { animation: none; }
.ps-walk .pg { animation: psBob .5s ease-in-out infinite; }
.ps-walk .lgA { animation: psLegA .5s ease-in-out infinite; } .ps-walk .lgB { animation: psLegB .5s ease-in-out infinite; }
.ps-run .pg { animation: psRunBob .3s ease-in-out infinite; }
.ps-run .lgA { animation: psLegA .3s ease-in-out infinite; } .ps-run .lgB { animation: psLegB .3s ease-in-out infinite; }
.ps-run .tail, .ps-scamper .tail, .ps-happy .tail, .ps-play .tail { animation: psTailFast .35s ease-in-out infinite; }
.ps-scamper .pg { animation: psRunBob .22s ease-in-out infinite; }
.ps-scamper .lgA { animation: psLegA .22s ease-in-out infinite; } .ps-scamper .lgB { animation: psLegB .22s ease-in-out infinite; }
.ps-hop .pg { animation: psHop .8s ease-in-out infinite; }
.ps-hop .lgA, .ps-hop .lgB { transform: rotate(18deg); }
.ps-fly .pg { animation: psFly 1.5s ease-in-out infinite; }
.ps-fly .wing, .ps-talk .wing, .ps-happy .wing { animation: psFlap .22s ease-in-out infinite; }
.ps-fly .lg { transform: rotate(24deg); }
.ps-waddle .pg { animation: psWaddle .6s ease-in-out infinite; }
.ps-waddle .flipper { animation: psFlipper .6s ease-in-out infinite; }
.ps-sit .pg { transform: rotate(-12deg); } .ps-sit .lgA, .ps-sit .lgB { transform: rotate(0deg); }
.ps-sleep .pg { animation: psBreath 3.4s ease-in-out infinite; }
.ps-sleep .lg, .ps-sleep .tail { animation: none; }
.ps-sleep .lg { display: none; }
.ps-sleep .hd { transform: rotate(30deg); }
.ps-sleep .eyes-open { display: none; } .ps-sleep .eyes-shut { display: block; } .ps-sleep .zzz { display: block; animation: psZ 2.6s ease-out infinite; }
.ps-sleep .trunk { animation: none; transform: rotate(10deg); }
.ps-play .pg { animation: psPlay .65s ease-in-out infinite; }
.ps-groom .hd { animation: psGroom .45s ease-in-out infinite; }
.ps-talk .hd, .ps-beg .hd { animation: psHead .5s ease-in-out infinite; }
.ps-talk .mouth-open, .ps-beg .mouth-open, .ps-happy .mouth-open { display: block; } .ps-talk .mouth-shut, .ps-beg .mouth-shut, .ps-happy .mouth-shut { display: none; }
.ps-beg .pg { animation: psBob .6s ease-in-out infinite; }
.ps-eat .hd { animation: psEatHead .4s ease-in-out infinite; }
.ps-happy .pg { animation: psHappy .5s ease-in-out 3; }
.ps-happy .blush { opacity: 1; }
.ps .blush { opacity: .55; }
@media (prefers-reduced-motion: reduce) { .ps *, .ps { animation: none !important; } }
`;

// ---------------------------------------------------------------- shared little pieces
const Eye = ({ x, y, r = 3.4 }) => (
  <>
    <g className="eyes-open">
      <circle cx={x} cy={y} r={r * 1.22} fill="#1d1d1f" />
      <circle cx={x + r * 0.42} cy={y - r * 0.5} r={r * 0.5} fill="#fff" />
      <circle cx={x - r * 0.45} cy={y + r * 0.5} r={r * 0.24} fill="#fff" opacity=".85" />
    </g>
    <path className="eyes-shut" d={`M${x - r} ${y} Q${x} ${y + r * 1.1} ${x + r} ${y}`} stroke="#1d1d1f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </>
);
const Zzz = ({ x, y }) => <text className="zzz" x={x} y={y} fontSize="18" fontWeight="800" fill="#4f46e5">z</text>;

// ---------------------------------------------------------------- four-legged animals
// Each animal is a set of colours and shape choices on one common body plan.
const QUADS = {
  dog:      { body: '#dca25e', belly: '#f6e3c2', leg: '#dca25e', paw: '#fbeed6', ear: 'floppy', earC: '#8d5a2b', tail: 'curl', tailC: '#dca25e', snout: 15, nose: '#2a1f1a', patch: '#8d5a2b', tongue: true, bx: 39, by: 25, legH: 25, legW: 11 },
  cat:      { body: '#f0a04b', belly: '#fff1dc', leg: '#f0a04b', paw: '#fff1dc', ear: 'pointy', earC: '#f0a04b', inner: '#f8b6b6', tail: 'long', tailC: '#f0a04b', snout: 8, nose: '#e57b8b', stripes: '#c7691f', whisk: true, bx: 37, by: 22, legH: 26, legW: 9 },
  fox:      { body: '#ee8a3a', belly: '#fff4e4', leg: '#4a3a33', paw: '#3b2d27', ear: 'pointy', earC: '#ee8a3a', inner: '#3b2d27', tail: 'bush', tailC: '#ee8a3a', tip: '#fff', snout: 17, nose: '#1f1a18', cheekW: '#fff4e4', bx: 39, by: 22, legH: 27, legW: 8 },
  rabbit:   { body: '#f4efe8', belly: '#ffffff', leg: '#f4efe8', paw: '#e6ded3', ear: 'long', earC: '#f4efe8', inner: '#f7b7c2', tail: 'pom', tailC: '#ffffff', snout: 7, nose: '#f08aa0', haunch: true, bx: 38, by: 27, legH: 26, legW: 11, whisk: true },
  squirrel: { body: '#b87a45', belly: '#f2dcb8', leg: '#b87a45', paw: '#8a5a2c', ear: 'tuft', earC: '#b87a45', tail: 'squirrel', tailC: '#b87a45', tailIn: '#e2b681', snout: 8, nose: '#2a1f1a', acorn: true, bx: 36, by: 22, legH: 24, legW: 9 },
  hamster:  { body: '#f0c488', belly: '#fff6e8', leg: '#f0c488', paw: '#f8d9b0', ear: 'round', earC: '#f0c488', inner: '#f7b7c2', tail: 'stub', tailC: '#f0c488', snout: 5, nose: '#e57b8b', patch: '#d79e5e', puffy: true, bx: 40, by: 31, legH: 14, legW: 11, whisk: true },
  panda:    { body: '#ffffff', belly: '#eeeef1', leg: '#25252a', paw: '#25252a', ear: 'round', earC: '#25252a', tail: 'stub', tailC: '#ffffff', snout: 8, nose: '#25252a', eyePatch: '#25252a', band: '#25252a', bx: 42, by: 33, legH: 18, legW: 17 },
  elephant: { body: '#a8b5c6', belly: '#cbd5e1', leg: '#a8b5c6', paw: '#93a2b6', ear: 'big', earC: '#97a6ba', inner: '#e7b3bd', tail: 'thin', tailC: '#97a6ba', snout: 0, nose: '#6f7c8a', trunk: true, bx: 46, by: 34, legH: 20, legW: 19, nails: true, lash: true },
};

function Quad({ kind, uid }) {
  const q = QUADS[kind];
  const bx = q.bx, by = q.by;
  const cy = 130 - q.legH - by + 6;               // body centre height
  const cx = 94;
  const hipY = cy + by - 8;
  const hr = { dog: 23, cat: 22, fox: 21, rabbit: 21, squirrel: 20, hamster: 23, panda: 28, elephant: 29 }[kind] || 21;
  const hx = cx + bx + 3, hy = cy - by * 0.5;      // head centre
  const grad = `${uid}-b`;
  const legs = [
    { x: cx + bx * 0.55, cls: 'lgB', far: true }, { x: cx - bx * 0.55, cls: 'lgA', far: true },
    { x: cx + bx * 0.5, cls: 'lgA', far: false }, { x: cx - bx * 0.55, cls: 'lgB', far: false },
  ];
  const bean = (fill) => (
    <g fill={fill}>
      <ellipse cx={cx - bx * 0.36} cy={cy + 3} rx={bx * 0.68} ry={by * 1.08} />
      <ellipse cx={cx + bx * 0.4} cy={cy - 1} rx={bx * 0.6} ry={by * 1.02} />
      <ellipse cx={cx} cy={cy - 2} rx={bx * 0.72} ry={by * 0.96} />
    </g>
  );
  const Ear = () => {
    const ex = hx - hr * 0.45, ey = hy - hr * 0.7;
    if (q.ear === 'floppy') return <ellipse cx={hx - 8} cy={hy - 4} rx="8" ry="15" fill={q.earC} transform={`rotate(24 ${hx - 8} ${hy - 4})`} />;
    if (q.ear === 'pointy') return (<g><path d={`M${ex - 8} ${ey + 8} L${ex - 2} ${ey - 20} L${ex + 12} ${ey + 4} Z`} fill={q.earC} /><path d={`M${ex - 3} ${ey + 4} L${ex} ${ey - 12} L${ex + 7} ${ey + 3} Z`} fill={q.inner} /></g>);
    if (q.ear === 'long') return (<g><ellipse cx={ex + 2} cy={ey - 20} rx="7" ry="22" fill={q.earC} transform={`rotate(-8 ${ex} ${ey})`} /><ellipse cx={ex + 2} cy={ey - 20} rx="3.5" ry="16" fill={q.inner} transform={`rotate(-8 ${ex} ${ey})`} /></g>);
    if (q.ear === 'tuft') return (<g><ellipse cx={ex + 3} cy={ey - 6} rx="6" ry="10" fill={q.earC} /><path d={`M${ex + 3} ${ey - 15} L${ex + 1} ${ey - 24} L${ex + 7} ${ey - 14}`} fill="#6b4a2c" /></g>);
    if (q.ear === 'round') return (<g><circle cx={ex + 4} cy={ey - 2} r={kind === 'panda' ? 10.5 : 7} fill={q.earC} />{q.inner && <circle cx={ex + 4} cy={ey - 2} r="4" fill={q.inner} />}</g>);
    return null; // 'big' (elephant) is drawn behind the head
  };
  const Tail = () => {
    const tx = cx - bx + 4, ty = cy - 6;
    const shape = (() => {
      switch (q.tail) {
        case 'curl': return <path d="M0 0 C-14 -4 -16 -24 -4 -28" stroke={q.tailC} strokeWidth="9" fill="none" strokeLinecap="round" />;
        case 'long': return <path d="M0 0 C-18 6 -26 -10 -34 -22" stroke={q.tailC} strokeWidth="8" fill="none" strokeLinecap="round" />;
        case 'bush': return (<g><ellipse cx="-16" cy="-6" rx="22" ry="10" fill={q.tailC} transform="rotate(-18)" /><ellipse cx="-30" cy="-12" rx="9" ry="8" fill={q.tip} transform="rotate(-18)" /></g>);
        case 'pom': return <circle cx="-4" cy="-2" r="9" fill={q.tailC} />;
        case 'squirrel': return (<g><path d="M0 4 C-30 8 -38 -26 -14 -52 C-6 -62 8 -50 0 -40 C-10 -28 4 -14 8 -2 Z" fill={q.tailC} /><path d="M-6 -4 C-24 -8 -26 -30 -10 -46" stroke={q.tailIn} strokeWidth="5" fill="none" strokeLinecap="round" /></g>);
        case 'stub': return <circle cx="-2" cy="0" r="5.5" fill={q.tailC} />;
        case 'thin': return <path d="M0 0 C-8 8 -10 20 -8 30" stroke={q.tailC} strokeWidth="4" fill="none" strokeLinecap="round" />;
        default: return null;
      }
    })();
    return <g transform={`translate(${tx} ${ty})`}><g className="tail">{shape}</g></g>;
  };
  return (
    <g>
      <defs>
        <radialGradient id={grad} cx="45%" cy="30%" r="80%"><stop offset="0%" stopColor="#ffffff" stopOpacity=".55" /><stop offset="100%" stopColor="#000" stopOpacity=".12" /></radialGradient>
      </defs>
      <ellipse cx="100" cy="131" rx={bx + 22} ry="5" fill="#000" opacity=".16" />
      <g className="pg" filter={`url(#${uid}o)`}>
        <Tail />
        {legs.filter(l => l.far).map((l, i) => (
          <g key={`f${i}`} className={`lg ${l.cls}`} style={{ transformOrigin: `${l.x}px ${hipY}px` }} opacity=".78">
            <rect x={l.x - q.legW / 2} y={hipY} width={q.legW} height={130 - hipY} rx={q.legW / 2} fill={q.leg} />
            <ellipse cx={l.x + 1.5} cy="128.2" rx={q.legW * 0.8} ry="4.8" fill={q.paw} />
          </g>
        ))}
        {/* body */}
        {bean(q.body)}
        {q.haunch && <ellipse cx={cx - bx * 0.45} cy={cy + 6} rx="22" ry="22" fill={q.body} />}
        {q.band && <ellipse cx={cx + bx * 0.5} cy={cy + 3} rx="12" ry={by} fill={q.band} />}
        {q.patch && <ellipse cx={cx - 6} cy={cy - by * 0.4} rx="20" ry="10" fill={q.patch} opacity=".85" />}
        {q.stripes && [-16, -2, 12].map((dx, i) => <path key={i} d={`M${cx + dx} ${cy - by + 2} q3 8 0 14`} stroke={q.stripes} strokeWidth="4" strokeLinecap="round" fill="none" />)}
        <ellipse cx={cx + 4} cy={cy + by * 0.52} rx={bx * 0.74} ry={by * 0.42} fill={q.belly} opacity=".9" />
        <ellipse cx={cx} cy={cy} rx={bx * 1.04} ry={by * 1.04} fill={`url(#${grad})`} opacity={kind === 'panda' ? 0.3 : 1} />
        {q.acorn && <g className="acorn"><ellipse cx={hx + 6} cy={hy + 26} rx="6" ry="7.5" fill="#8a5a2c" /><path d={`M${hx - 1} ${hy + 22} q7 -8 14 0 z`} fill="#5b3a1d" /></g>}
        {/* near legs */}
        {legs.filter(l => !l.far).map((l, i) => (
          <g key={`n${i}`} className={`lg ${l.cls}`} style={{ transformOrigin: `${l.x}px ${hipY}px` }}>
            <rect x={l.x - q.legW / 2} y={hipY} width={q.legW} height={130 - hipY} rx={q.legW / 2} fill={q.leg} />
            <ellipse cx={l.x + 1.5} cy="128.2" rx={q.legW * 0.8} ry="4.8" fill={q.paw} />
            <path d={`M${l.x + 1} 126.5 v3.4 M${l.x + 5} 126.5 v3.4`} stroke="#000" strokeWidth=".9" opacity=".22" strokeLinecap="round" />
            {q.nails && [-5, 1, 7].map((d, k) => <ellipse key={k} cx={l.x + d + 1.5} cy="128.2" rx="2.3" ry="1.9" fill="#f3e9da" />)}
          </g>
        ))}
        {/* head */}
        <g className="hd">
          {q.ear === 'big' && <ellipse cx={hx - hr * 0.55} cy={hy + hr * 0.12} rx={hr * 0.86} ry={hr * 1.02} fill={q.earC} />}
          {q.ear === 'big' && <ellipse cx={hx - hr * 0.55} cy={hy + hr * 0.12} rx={hr * 0.56} ry={hr * 0.72} fill={q.inner} opacity=".75" />}
          {kind === 'panda' && <circle cx={hx + hr * 0.5} cy={hy - hr * 0.72} r="10.5" fill={q.earC} />}
          <g className="earg" style={{ transformOrigin: `${hx - hr * 0.4}px ${hy - hr * 0.5}px` }}><Ear /></g>
          <ellipse cx={hx - 10} cy={hy + 14} rx="18" ry="20" fill={q.body} />
          <circle cx={hx} cy={hy} r={hr} fill={q.body} />
          {q.puffy && <ellipse cx={hx + 2} cy={hy + 9} rx={hr * 0.9} ry={hr * 0.62} fill={q.belly} />}
          {q.cheekW && <ellipse cx={hx + 2} cy={hy + 11} rx={hr * 0.78} ry="9" fill={q.cheekW} />}
          {q.eyePatch && <ellipse cx={hx + hr * 0.34} cy={hy + hr * 0.02} rx="8" ry="10" fill={q.eyePatch} transform={`rotate(-20 ${hx + hr * 0.34} ${hy + hr * 0.02})`} />}
          {q.snout > 0 && <ellipse cx={hx + hr * 0.7} cy={hy + hr * 0.38} rx={q.snout} ry={kind === 'fox' ? 7 : 9} fill={kind === 'dog' ? '#f6e3c2' : kind === 'panda' ? '#ececf0' : q.body} />}
          {q.snout > 0 && <circle cx={hx + hr * 0.7 + q.snout - 3} cy={hy + hr * 0.2} r="3.6" fill={q.nose} />}
          {q.snout > 0 && <circle cx={hx + hr * 0.7 + q.snout - 4.2} cy={hy + hr * 0.14} r="1.1" fill="#fff" opacity=".7" />}
          {q.snout > 0 && <>
            <path className="mouth-shut" d={kind === 'cat'
              ? `M${hx + hr * 0.7 + q.snout - 9} ${hy + hr * 0.5} q2.5 4 5 0 q2.5 4 5 0`
              : `M${hx + hr * 0.7 + q.snout - 8} ${hy + hr * 0.52} q4 3.4 9 0`} stroke="#3b2a22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <g className="mouth-open"><ellipse cx={hx + hr * 0.7 + 2} cy={hy + hr * 0.6} rx="6.5" ry="5.5" fill="#5a1f2a" />{q.tongue && <ellipse cx={hx + hr * 0.7 + 3} cy={hy + hr * 0.6 + 3} rx="3.8" ry="3.2" fill="#f0788d" />}</g>
          </>}
          <Eye x={hx + hr * 0.34} y={hy + hr * 0.02} r={hr * 0.16} />
          <ellipse className="blush" cx={hx + hr * 0.02} cy={hy + hr * 0.42} rx="5" ry="3.2" fill="#ff8aa1" />
          {kind === 'dog' && <ellipse cx={hx + hr * 0.3} cy={hy - hr * 0.3} rx="2.6" ry="1.6" fill="#8d5a2b" opacity=".8" />}
          {q.whisk && [-3, 3].map((d, i) => <path key={i} d={`M${hx + hr * 0.7 + 2} ${hy + hr * 0.4} q16 ${d - 2} 26 ${d * 3}`} stroke="#555" strokeWidth="1" fill="none" opacity=".6" />)}
          {q.lash && [-1, 1].map((d, i) => <path key={i} d={`M${hx + hr * 0.34 + d * 2} ${hy - hr * 0.1} q${d * 3} -5 ${d * 6} -4`} stroke="#1d1d1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />)}
          {q.trunk && (
            <g className="trunk">
              <path d={`M${hx + hr * 0.5} ${hy + hr * 0.18} C${hx + hr * 0.5 + 26} ${hy + hr * 0.18 + 4} ${hx + hr * 0.5 + 36} ${hy + hr * 0.18 + 26} ${hx + hr * 0.5 + 24} ${hy + hr * 0.18 + 40} C${hx + hr * 0.5 + 19} ${hy + hr * 0.18 + 46} ${hx + hr * 0.5 + 11} ${hy + hr * 0.18 + 41} ${hx + hr * 0.5 + 15} ${hy + hr * 0.18 + 34}`} stroke={q.body} strokeWidth="19" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={`M${hx + hr * 0.5 + 10} ${hy + hr * 0.18 + 6} q6 4 10 0 M${hx + hr * 0.5 + 16} ${hy + hr * 0.18 + 16} q6 4 10 0`} stroke="#7f8da1" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".6" />
            </g>
          )}
          <Zzz x={hx - 6} y={hy - hr - 4} />
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- birds
const BIRDS = {
  bird:   { body: '#4aa3e8', belly: '#eaf6ff', wing: '#2f78c2', beak: '#ffb52e', tail: '#2f78c2', head: '#4aa3e8', crest: true },
  parrot: { body: '#3fb554', belly: '#a8e08a', wing: '#1f8a3a', wingTip: '#2b6fd6', beak: '#f2a516', tail: '#e03b3b', tail2: '#2b6fd6', head: '#3fb554', cap: '#e03b3b', long: true },
};

function Bird({ kind, uid }) {
  const b = BIRDS[kind];
  const grad = `${uid}-bg`;
  return (
    <g>
      <defs><radialGradient id={grad} cx="40%" cy="25%" r="80%"><stop offset="0%" stopColor="#fff" stopOpacity=".5" /><stop offset="100%" stopColor="#000" stopOpacity=".12" /></radialGradient></defs>
      <ellipse cx="100" cy="131" rx="38" ry="5" fill="#000" opacity=".16" />
      <g className="pg" filter={`url(#${uid}o)`}>
        {/* tail feathers */}
        <g className="tail" style={{ transformOrigin: '70px 96px' }}>
          {b.long ? (<>
            <path d="M74 96 L22 128 L34 134 L80 108 Z" fill={b.tail} />
            <path d="M80 100 L34 134 L46 138 L84 112 Z" fill={b.tail2} />
          </>) : (<>
            <path d="M74 94 L36 108 L40 118 L80 106 Z" fill={b.tail} />
            <path d="M76 100 L42 124 L52 126 L82 110 Z" fill={b.wing} />
          </>)}
        </g>
        {/* legs */}
        {[88, 104].map((x, i) => (
          <g key={i} className={`lg ${i ? 'lgA' : 'lgB'}`} style={{ transformOrigin: `${x}px 108px` }}>
            <path d={`M${x} 108 L${x} 126`} stroke="#e0883a" strokeWidth="3.4" strokeLinecap="round" />
            <path d={`M${x - 6} 128 L${x + 7} 128 M${x} 126 L${x + 5} 129`} stroke="#e0883a" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
        {/* body */}
        <ellipse cx="96" cy="88" rx="34" ry="28" fill={b.body} transform="rotate(-12 96 88)" />
        <ellipse cx="102" cy="98" rx="24" ry="18" fill={b.belly} opacity=".95" transform="rotate(-12 102 98)" />
        <ellipse cx="96" cy="88" rx="34" ry="28" fill={`url(#${grad})`} transform="rotate(-12 96 88)" />
        {/* wing */}
        <g className="wing">
          <path d="M96 76 C70 70 56 92 66 108 C84 112 104 98 108 82 Z" fill={b.wing} />
          {b.wingTip && <path d="M66 108 C78 112 94 108 104 96 C92 106 78 108 66 108 Z" fill={b.wingTip} />}
        </g>
        {/* head */}
        <g className="hd" style={{ transformOrigin: '124px 74px' }}>
          <circle cx="128" cy="62" r="22" fill={b.head} />
          {b.cap && <path d="M110 58 C112 40 134 38 144 52 C132 48 120 50 110 58 Z" fill={b.cap} />}
          {b.crest && <path d="M118 46 q4 -14 14 -12 q-6 4 -4 12 z" fill={b.wing} />}
          <ellipse cx="132" cy="68" rx="14" ry="9" fill={b.belly} opacity=".85" />
          {b.long
            ? (<><path className="mouth-shut" d="M144 56 C162 54 164 74 150 74 C150 68 148 62 144 62 Z" fill={b.beak} /><path className="mouth-open" d="M144 54 C164 50 168 62 152 66 L144 62 Z M146 66 C158 66 160 76 150 76 Z" fill={b.beak} /></>)
            : (<><path className="mouth-shut" d="M145 58 L162 63 L145 68 Z" fill={b.beak} /><g className="mouth-open"><path d="M145 56 L162 59 L146 63 Z" fill={b.beak} /><path d="M146 65 L160 69 L145 70 Z" fill="#e89a1a" /></g></>)}
          <Eye x={135} y={59} r={3.9} />
          <ellipse className="blush" cx="128" cy="68" rx="4" ry="2.6" fill="#ff8aa1" />
          <Zzz x={118} y={36} />
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- penguin
function Penguin({ uid }) {
  const grad = `${uid}-pg`;
  return (
    <g>
      <defs><radialGradient id={grad} cx="40%" cy="25%" r="80%"><stop offset="0%" stopColor="#fff" stopOpacity=".28" /><stop offset="100%" stopColor="#000" stopOpacity=".1" /></radialGradient></defs>
      <ellipse cx="100" cy="131" rx="34" ry="5" fill="#000" opacity=".16" />
      <g className="pg" filter={`url(#${uid}o)`}>
        <g className="lg lgA" style={{ transformOrigin: '90px 118px' }}><ellipse cx="90" cy="127" rx="11" ry="4.6" fill="#f59e0b" /></g>
        <g className="lg lgB" style={{ transformOrigin: '112px 118px' }}><ellipse cx="114" cy="127" rx="11" ry="4.6" fill="#f59e0b" /></g>
        <ellipse cx="100" cy="82" rx="31" ry="46" fill="#2a3547" />
        <ellipse cx="106" cy="90" rx="21" ry="35" fill="#f8fafc" />
        <ellipse cx="100" cy="82" rx="31" ry="46" fill={`url(#${grad})`} />
        <g className="flipper" style={{ transformOrigin: '78px 70px' }}><path d="M80 68 C60 78 58 98 64 106 C74 98 82 84 86 74 Z" fill="#202a3a" /></g>
        <g className="hd" style={{ transformOrigin: '104px 54px' }}>
          <ellipse cx="108" cy="52" rx="20" ry="19" fill="#2a3547" />
          <ellipse cx="114" cy="58" rx="12" ry="9" fill="#f8fafc" />
          <path className="mouth-shut" d="M122 54 L140 60 L122 65 Z" fill="#f59e0b" />
          <g className="mouth-open"><path d="M122 51 L140 56 L122 58 Z" fill="#f59e0b" /><path d="M122 62 L136 63 L122 67 Z" fill="#e48a07" /></g>
          <Eye x={116} y={48} r={3.4} />
          <ellipse className="blush" cx="112" cy="58" rx="3.6" ry="2.4" fill="#ff8aa1" />
          <Zzz x={100} y={30} />
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- turtle
function Turtle({ uid }) {
  const grad = `${uid}-tg`;
  return (
    <g>
      <defs><radialGradient id={grad} cx="40%" cy="20%" r="85%"><stop offset="0%" stopColor="#fff" stopOpacity=".4" /><stop offset="100%" stopColor="#000" stopOpacity=".2" /></radialGradient></defs>
      <ellipse cx="100" cy="131" rx="56" ry="5" fill="#000" opacity=".16" />
      <g className="pg" filter={`url(#${uid}o)`}>
        <g className="tail"><path d="M50 106 L33 111 L50 114 Z" fill="#8fbf6a" style={{ transformOrigin: '52px 114px' }} /></g>
        {[{ x: 120, c: 'lgA' }, { x: 74, c: 'lgB' }].map((l, i) => (
          <g key={i} className={`lg ${l.c}`} style={{ transformOrigin: `${l.x}px 112px` }}>
            <rect x={l.x - 8} y="108" width="16" height="22" rx="8" fill="#8fbf6a" />
            <ellipse cx={l.x + 2} cy="128" rx="10" ry="4" fill="#79a856" />
          </g>
        ))}
        <g className="hd" style={{ transformOrigin: '128px 108px' }}>
          <path d="M120 112 C132 98 142 92 152 94 C164 96 166 110 156 114 C146 118 132 118 120 112 Z" fill="#8fbf6a" />
          <path className="mouth-shut" d="M150 108 q6 4 12 0" stroke="#4d6b34" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <g className="mouth-open"><ellipse cx="157" cy="109" rx="5" ry="3.6" fill="#5a1f2a" /></g>
          <Eye x={152} y={100} r={3} />
          <ellipse className="blush" cx="148" cy="108" rx="3.6" ry="2.4" fill="#ff8aa1" />
          <Zzz x={146} y={86} />
        </g>
        <path d="M46 114 C46 78 78 58 100 58 C124 58 150 78 150 114 Z" fill="#6a9a4a" />
        <path d="M46 114 C46 78 78 58 100 58 C124 58 150 78 150 114 Z" fill={`url(#${grad})`} />
        <path d="M100 60 L100 112 M70 76 L82 112 M130 76 L118 112 M54 100 L150 100" stroke="#4a7430" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
        <path d="M44 114 L152 114" stroke="#c7a76a" strokeWidth="7" strokeLinecap="round" />
      </g>
    </g>
  );
}

// ---------------------------------------------------------------- public component
// state: idle | walk | run | hop | scamper | waddle | fly | sit | sleep | play | groom | talk | beg | eat | happy
export default function PetSprite({ kind, state = 'idle', style }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  let art;
  if (QUADS[kind]) art = <Quad kind={kind} uid={uid} />;
  else if (BIRDS[kind]) art = <Bird kind={kind} uid={uid} />;
  else if (kind === 'penguin') art = <Penguin uid={uid} />;
  else if (kind === 'turtle') art = <Turtle uid={uid} />;
  else art = <Quad kind="dog" uid={uid} />;
  return (
    <svg className={`ps ps-${state}`} viewBox="0 0 200 150" style={style} role="img" aria-label={kind}>
      <defs>
        {/* a soft dark outline round the whole animal: the "sticker" look that makes cartoon pets read as cute */}
        <filter id={`${uid}o`} filterUnits="userSpaceOnUse" x="-60" y="-100" width="320" height="300">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.7" result="d" />
          <feFlood floodColor="#4a3222" floodOpacity=".7" />
          <feComposite in2="d" operator="in" result="o" />
          <feMerge><feMergeNode in="o" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {art}
    </svg>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { badgeMeta } from './badgeDefs';
import { BadgeSvg } from './Badges';
import { AwardEmblem, AWARDS, HOLY_AWARDS, JOY_AWARDS } from './Awards';
import { AvatarThumb } from './AvatarPeek';
import { sounds } from './badgeSounds';

// The moment a student receives a badge the teacher has just given. One scene per kind of badge:
//   bronze        a gift box: tap it, it opens, fireworks, the badge appears
//   silver        a drone flies in and lowers the gift box, then the same
//   gold / master a stage: curtains open, a spotlight, the student's Avatar on the podium, the badge descends, applause
//   top-three     a podium with the student on their place, the trophy / wheel / sun rises, fireworks and a fanfare
// `queue` entries: 'b:<badgeId>' or 'a:<kind>:<tier>'. Nothing here reads from Firebase.

const AWARD_LISTS = { trophy: AWARDS, holy: HOLY_AWARDS, joy: JOY_AWARDS };
const AWARD_TEXT = { trophy: 'You have the most trophies!', holy: 'You have the most lotus flowers in the Shrine Room!', joy: 'You came to class the most this year!' };

export function parseEntry(entry) {
  if (entry.startsWith('a:')) {
    const [, kind, t] = entry.split(':');
    const tier = Number(t);
    const info = (AWARD_LISTS[kind] || [])[tier - 1];
    if (!info) return null;
    return { type: 'award', kind, tier, title: info.en, text: AWARD_TEXT[kind], style: 'podium' };
  }
  const b = badgeMeta(entry.slice(2));
  if (!b) return null;
  const style = b.master || b.metal === 'gold' ? 'stage' : b.metal === 'silver' ? 'drone' : 'gift';
  return { type: 'badge', badge: b, title: b.name, text: b.desc, style };
}

// ---- fireworks and confetti on one canvas ----
function Sparks({ fireworks = false, confetti = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!fireworks && !confetti) return undefined;
    const c = ref.current; if (!c) return undefined;
    const x = c.getContext('2d');
    let W = 0; let H = 0;
    const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const parts = [];
    let raf; let last = performance.now(); let nextFw = 0;
    const burst = (cx, cy) => {
      const hue = Math.random() * 360;
      for (let i = 0; i < 54; i++) {
        const a = Math.random() * Math.PI * 2; const s = 1.5 + Math.random() * 5.5;
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, decay: 0.011 + Math.random() * 0.012, color: `hsl(${hue + Math.random() * 50},100%,62%)`, size: 2.4, g: 0.07 });
      }
    };
    const tick = (now) => {
      const dt = now - last; last = now;
      x.clearRect(0, 0, W, H);
      if (fireworks) { nextFw -= dt; if (nextFw <= 0) { burst(W * (0.12 + Math.random() * 0.76), H * (0.1 + Math.random() * 0.4)); sounds.firework(); nextFw = 650 + Math.random() * 650; } }
      if (confetti) for (let i = 0; i < 2; i++) parts.push({ x: Math.random() * W, y: -10, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, life: 1.6, decay: 0.0028, color: `hsl(${Math.random() * 360},90%,60%)`, size: 7, g: 0.02, rect: true, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 20) { parts.splice(i, 1); continue; }
        x.globalAlpha = Math.max(0, Math.min(1, p.life));
        x.fillStyle = p.color;
        if (p.rect) { p.rot += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6); x.restore(); }
        else { x.beginPath(); x.arc(p.x, p.y, p.size, 0, Math.PI * 2); x.fill(); }
      }
      x.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); x.clearRect(0, 0, W, H); };
  }, [fireworks, confetti]);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 3 }} />;
}

function GiftBox({ open }) {
  return (
    <svg viewBox="0 0 160 170" width="200" height="212" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="gb-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6b6b" /><stop offset="1" stopColor="#c62828" /></linearGradient>
        <linearGradient id="gb-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffe082" /><stop offset="0.5" stopColor="#ffca28" /><stop offset="1" stopColor="#f9a825" /></linearGradient>
      </defs>
      {open && <circle cx="80" cy="70" r="70" fill="#fff8c8" opacity="0.9" style={{ animation: 'bcRay 0.9s ease-out forwards' }} />}
      <rect x="22" y="70" width="116" height="84" rx="6" fill="url(#gb-red)" stroke="#8e1b1b" strokeWidth="3" />
      <rect x="68" y="70" width="24" height="84" fill="url(#gb-gold)" stroke="#b8860b" strokeWidth="2" />
      <g style={{ transformOrigin: '80px 60px', transform: open ? 'translateY(-84px) rotate(-24deg)' : 'none', opacity: open ? 0 : 1, transition: 'transform .7s ease-in, opacity .7s' }}>
        <rect x="14" y="46" width="132" height="28" rx="6" fill="url(#gb-red)" stroke="#8e1b1b" strokeWidth="3" />
        <rect x="68" y="46" width="24" height="28" fill="url(#gb-gold)" stroke="#b8860b" strokeWidth="2" />
        <ellipse cx="58" cy="38" rx="22" ry="13" transform="rotate(-24 58 38)" fill="url(#gb-gold)" stroke="#b8860b" strokeWidth="3" />
        <ellipse cx="102" cy="38" rx="22" ry="13" transform="rotate(24 102 38)" fill="url(#gb-gold)" stroke="#b8860b" strokeWidth="3" />
        <circle cx="80" cy="44" r="8" fill="#ffd54f" stroke="#b8860b" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

function Drone() {
  return (
    <svg viewBox="0 0 220 90" width="260" height="106" style={{ overflow: 'visible' }}>
      <defs><linearGradient id="dr-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eceff1" /><stop offset="1" stopColor="#90a4ae" /></linearGradient></defs>
      {[[30, 12], [190, 12]].map(([cx, cy], i) => (
        <g key={i}>
          <line x1={cx} y1={cy + 4} x2={cx} y2="44" stroke="#546e7a" strokeWidth="5" />
          <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'bcSpin .12s linear infinite' }}><ellipse cx={cx} cy={cy} rx="34" ry="4" fill="#455a64" opacity="0.75" /></g>
        </g>
      ))}
      <path d="M52 44 H168 C176 44 180 52 172 60 L150 72 H70 L48 60 C40 52 44 44 52 44 Z" fill="url(#dr-body)" stroke="#37474f" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="110" cy="56" r="9" fill="#4fc3f7" stroke="#37474f" strokeWidth="2.4" /><circle cx="110" cy="56" r="3" fill="#fff" />
      <circle cx="80" cy="52" r="3" fill="#66bb6a" /><circle cx="140" cy="52" r="3" fill="#ef5350" />
      <line x1="64" y1="72" x2="56" y2="84" stroke="#546e7a" strokeWidth="4" strokeLinecap="round" /><line x1="156" y1="72" x2="164" y2="84" stroke="#546e7a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Emblem({ item, size }) {
  return item.type === 'award' ? <AwardEmblem kind={item.kind} tier={item.tier} size={size} /> : <BadgeSvg badge={item.badge} size={size} />;
}

function ResultPanel({ item, onCollect }) {
  return (
    <div className="absolute inset-x-0 bottom-6 flex flex-col items-center px-4 text-center" style={{ zIndex: 5, animation: 'bcRise .6s ease-out both' }}>
      <p className="text-amber-300 text-xs font-bold tracking-widest uppercase">{item.type === 'award' ? 'New honour' : 'New badge'}</p>
      <p className="text-white text-2xl font-black drop-shadow">{item.title}</p>
      <p className="text-amber-100 text-sm font-semibold mb-3">{item.text}</p>
      <button onClick={onCollect} className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold px-8 py-3 rounded-full shadow-xl text-lg active:scale-95">🎉 Collect</button>
    </div>
  );
}

// ---- the four scenes ----
function GiftScene({ item, withDrone, onCollect }) {
  const [phase, setPhase] = useState(withDrone ? 'fly' : 'wait'); // fly -> lower -> wait -> open -> reveal
  const [arrived, setArrived] = useState(!withDrone);
  useEffect(() => {
    if (!withDrone) return undefined;
    sounds.buzz(3);
    const t0 = setTimeout(() => setArrived(true), 60);
    const t1 = setTimeout(() => setPhase('lower'), 2300);
    const t2 = setTimeout(() => setPhase('wait'), 3600);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [withDrone]);
  const tap = () => {
    if (phase !== 'wait') return;
    setPhase('open'); sounds.chime();
    setTimeout(() => { setPhase('reveal'); sounds.ding(); }, 750);
  };
  const lowered = phase !== 'fly';
  const rope = lowered ? '32vh' : '14px';
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 40%, #3a2a6e, #120a2e 70%)' }}>
      <Sparks fireworks={phase === 'reveal'} confetti={phase === 'reveal'} />
      {withDrone && phase !== 'open' && phase !== 'reveal' && (
        <div className="absolute" style={{ top: '8%', left: arrived ? '50%' : '-30%', transform: `translateX(-50%) ${phase === 'wait' ? 'translateY(-70vh)' : ''}`, transition: 'left 2.2s ease-out, transform 1.3s ease-in', zIndex: 2 }}>
          <div style={{ animation: 'bcBob 1s ease-in-out infinite' }}><Drone /></div>
          <div className="mx-auto bg-slate-300" style={{ width: 3, height: rope, marginTop: -8, transition: 'height 1.2s ease-in-out' }} />
        </div>
      )}
      {phase !== 'reveal' && (
        <button
          onClick={tap}
          className="absolute focus:outline-none"
          style={{ left: withDrone ? (arrived ? '50%' : '-30%') : '50%', top: withDrone ? `calc(8% + 96px + ${rope})` : '36%', transform: 'translateX(-50%)', transition: 'left 2.2s ease-out, top 1.2s ease-in-out', animation: phase === 'wait' ? 'bcWiggle 1.1s ease-in-out infinite' : undefined, zIndex: 2 }}
          aria-label="Open the gift"
        >
          <GiftBox open={phase === 'open'} />
        </button>
      )}
      {phase === 'wait' && <p className="absolute inset-x-0 bottom-[8%] text-center text-amber-200 text-xl font-extrabold animate-pulse" style={{ zIndex: 2 }}>🎁 Tap the gift!</p>}
      {phase === 'reveal' && (
        <>
          <div className="absolute left-1/2 top-[30%]" style={{ zIndex: 4, animation: 'bcPop .9s cubic-bezier(.2,1.6,.4,1) both', filter: 'drop-shadow(0 0 24px rgba(255,230,120,.9))' }}><Emblem item={item} size={190} /></div>
          <ResultPanel item={item} onCollect={onCollect} />
        </>
      )}
    </div>
  );
}

function StageScene({ item, name, look, onCollect }) {
  const [phase, setPhase] = useState('curtain'); // curtain -> walk -> drop -> reveal
  useEffect(() => {
    sounds.fanfare();
    const t = [setTimeout(() => setPhase('walk'), 1500), setTimeout(() => { setPhase('drop'); sounds.applause(); }, 2800), setTimeout(() => { setPhase('reveal'); sounds.ding(); }, 4700)];
    return () => t.forEach(clearTimeout);
  }, []);
  const open = phase !== 'curtain';
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(180deg,#0b1030,#1d1650 60%,#2b1d63)' }}>
      <Sparks confetti={phase === 'drop' || phase === 'reveal'} fireworks={phase === 'reveal'} />
      <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ width: '70vw', maxWidth: 520, height: '82%', background: 'linear-gradient(180deg, rgba(255,246,190,.85), rgba(255,246,190,.04))', clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)', opacity: open ? 1 : 0, transition: 'opacity 1s', zIndex: 1 }} />
      {/* podium */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '27%', width: 190, zIndex: 2 }}>
        <div className="flex justify-center" style={{ transform: phase === 'curtain' ? 'translateY(30px) scale(.6)' : 'none', opacity: phase === 'curtain' ? 0 : 1, transition: 'all .9s ease-out' }}><AvatarThumb name={name} look={look} size={104} /></div>
        <div className="rounded-t-xl text-center font-black text-2xl text-amber-900 py-3" style={{ background: 'linear-gradient(180deg,#ffe082,#f9a825)', border: '3px solid #b8860b' }}>⭐</div>
      </div>
      {/* the badge comes down */}
      {(phase === 'drop' || phase === 'reveal') && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: phase === 'reveal' ? '9%' : '9%', zIndex: 4, animation: 'bcDescend 1.7s cubic-bezier(.2,.9,.3,1) both', filter: 'drop-shadow(0 0 24px rgba(255,230,120,.95))' }}><Emblem item={item} size={150} /></div>
      )}
      {/* curtains */}
      <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: 'repeating-linear-gradient(90deg,#8e0f1f,#b71c2e 18px,#8e0f1f 36px)', transform: open ? 'translateX(-100%)' : 'none', transition: 'transform 1.4s ease-in-out', zIndex: 6, boxShadow: '8px 0 20px rgba(0,0,0,.5)' }} />
      <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: 'repeating-linear-gradient(90deg,#8e0f1f,#b71c2e 18px,#8e0f1f 36px)', transform: open ? 'translateX(100%)' : 'none', transition: 'transform 1.4s ease-in-out', zIndex: 6, boxShadow: '-8px 0 20px rgba(0,0,0,.5)' }} />
      {phase === 'reveal' && <ResultPanel item={item} onCollect={onCollect} />}
    </div>
  );
}

function PodiumScene({ item, name, look, onCollect }) {
  const [phase, setPhase] = useState('start');
  useEffect(() => {
    sounds.fanfare();
    const t = [setTimeout(() => { setPhase('rise'); sounds.applause(); }, 900), setTimeout(() => { setPhase('reveal'); sounds.ding(); }, 3200)];
    return () => t.forEach(clearTimeout);
  }, []);
  const steps = [{ rank: 2, h: 96, color: ['#eceff1', '#90a4ae'] }, { rank: 1, h: 140, color: ['#ffe082', '#f9a825'] }, { rank: 3, h: 70, color: ['#f3c392', '#a5662a'] }];
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 30%, #4a2f8a, #140b34 75%)' }}>
      <Sparks fireworks={phase !== 'start'} confetti={phase === 'reveal'} />
      <div className="absolute inset-x-0 flex items-end justify-center gap-1" style={{ bottom: '27%', zIndex: 2 }}>
        {steps.map(s => (
          <div key={s.rank} className="flex flex-col items-center" style={{ width: 'min(30vw, 130px)' }}>
            {s.rank === item.tier && (
              <div className="flex flex-col items-center" style={{ marginBottom: 4, transform: phase === 'start' ? 'translateY(40px)' : 'none', opacity: phase === 'start' ? 0 : 1, transition: 'all .9s ease-out' }}>
                <div style={{ animation: phase === 'rise' || phase === 'reveal' ? 'bcScale 1s cubic-bezier(.2,1.6,.4,1) both' : undefined, filter: 'drop-shadow(0 0 18px rgba(255,230,120,.9))' }}><AwardEmblem kind={item.kind} tier={item.tier} size={86} /></div>
                <AvatarThumb name={name} look={look} size={84} />
              </div>
            )}
            <div className="w-full rounded-t-lg flex items-start justify-center pt-1 font-black text-2xl text-white" style={{ height: s.h, background: `linear-gradient(180deg, ${s.color[0]}, ${s.color[1]})`, border: `2px solid ${s.color[1]}`, opacity: s.rank === item.tier ? 1 : 0.55 }}>{s.rank}</div>
          </div>
        ))}
      </div>
      {phase === 'reveal' && <ResultPanel item={item} onCollect={onCollect} />}
    </div>
  );
}

// ---- the overlay: goes through the queue one by one ----
export default function BadgeCeremony({ queue, name, look, onSeen }) {
  const items = queue.map(e => ({ entry: e, item: parseEntry(e) }));
  const first = items.find(x => x.item) || null;
  // entries that cannot be drawn (an unknown badge) are marked seen at once
  useEffect(() => { items.filter(x => !x.item).forEach(x => onSeen(x.entry)); }, [queue.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!first) return null;
  const { entry, item } = first;
  const total = items.filter(x => x.item).length;
  const collect = () => onSeen(entry);
  return (
    <div className="fixed inset-0 z-[10100]" style={{ background: '#120a2e' }}>
      <style>{`
        @keyframes bcWiggle { 0%,100% { transform: translateX(-50%) rotate(-4deg) } 50% { transform: translateX(-50%) rotate(4deg) } }
        @keyframes bcBob { 0%,100% { margin-top: 0 } 50% { margin-top: 8px } }
        @keyframes bcSpin { from { transform: scaleX(1) } 50% { transform: scaleX(.4) } to { transform: scaleX(1) } }
        @keyframes bcRay { from { transform: scale(.2); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
        @keyframes bcPop { from { transform: translate(-50%,-50%) scale(.1) } to { transform: translate(-50%,-50%) scale(1) } }
        @keyframes bcScale { from { transform: scale(.1) } to { transform: scale(1) } }
        @keyframes bcRise { from { transform: translateY(30px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes bcDescend { from { transform: translate(-50%, -70vh) scale(.6) } to { transform: translate(-50%, 0) scale(1) } }
      `}</style>
      <button onClick={collect} className="absolute top-3 right-3 z-[8] bg-white/15 hover:bg-white/25 text-white text-sm font-bold px-3 py-1.5 rounded-full">Skip ⏭</button>
      {total > 1 && <p className="absolute top-3 left-4 z-[8] text-amber-200 font-bold text-sm">🎖️ {total} new</p>}
      {item.style === 'gift' && <GiftScene key={entry} item={item} onCollect={collect} />}
      {item.style === 'drone' && <GiftScene key={entry} item={item} withDrone onCollect={collect} />}
      {item.style === 'stage' && <StageScene key={entry} item={item} name={name} look={look} onCollect={collect} />}
      {item.style === 'podium' && <PodiumScene key={entry} item={item} name={name} look={look} onCollect={collect} />}
    </div>
  );
}

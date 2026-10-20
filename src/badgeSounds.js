// Little celebration sounds made with the browser's own sound generator (no sound files to download or keep).
// If you would rather use real recordings, replace the functions below with `new Audio(url).play()`.
let ctx = null;
const ac = () => {
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch (e) { return null; }
};

const tone = (freq, t0, dur, { type = 'sine', gain = 0.18, slideTo = null } = {}) => {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + t0 + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
};

const noise = (t0, dur, { gain = 0.2, lowpass = 3000, highpass = 0 } = {}) => {
  const a = ac(); if (!a) return;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lowpass;
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = highpass;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(a.destination);
  src.start(a.currentTime + t0);
};

export const sounds = {
  // a rising sparkle (the gift is opened)
  chime() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.5, { gain: 0.14 })); },
  // a firework: whistle up, then a boom and a crackle
  firework() { tone(500, 0, 0.45, { type: 'sine', gain: 0.07, slideTo: 1800 }); noise(0.45, 0.35, { gain: 0.3, lowpass: 900 }); noise(0.55, 0.5, { gain: 0.12, highpass: 2500, lowpass: 9000 }); },
  // the drone's buzz (a few quick low notes)
  buzz(seconds = 2) { for (let i = 0; i < seconds * 10; i++) tone(95 + (i % 2) * 6, i * 0.1, 0.12, { type: 'sawtooth', gain: 0.035 }); },
  // a short trumpet fanfare
  fanfare() { [[523, 0, 0.18], [523, 0.2, 0.18], [523, 0.4, 0.18], [659, 0.6, 0.5], [784, 1.15, 0.9]].forEach(([f, t, d]) => tone(f, t, d, { type: 'square', gain: 0.09 })); },
  // clapping: many tiny noise bursts
  applause(seconds = 2.6) { for (let i = 0; i < seconds * 22; i++) noise(i * 0.045 + Math.random() * 0.03, 0.05, { gain: 0.16, highpass: 1200, lowpass: 7000 }); },
  // the badge lands
  ding() { tone(1319, 0, 0.8, { gain: 0.16 }); tone(1976, 0.05, 0.9, { gain: 0.08 }); },
};

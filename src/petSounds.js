// What a pet says when it is touched. Most animals have a short recording (public/petSounds/<kind>.mp3, cut from the
// teacher's own animal-sound recordings, about 10 KB each, fetched only when that pet is first touched). The four
// animals that recording does not have (squirrel, hamster, penguin, turtle) get a small synthesised sound instead.
const RECORDED = ['dog', 'cat', 'rabbit', 'parrot', 'elephant', 'fox', 'panda', 'bird'];
const players = {};
let ctx = null;

const audioContext = () => {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// one little note: a sound that glides from f0 to f1 and fades out
const note = (c, { type = 'sine', f0, f1, start = 0, dur = 0.12, gain = 0.22, lowpass }) => {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = osc;
  if (lowpass) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; osc.connect(f); node = f; }
  node.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
};

const SYNTH = {
  squirrel: (c) => { [0, 0.09, 0.18].forEach((s, i) => note(c, { type: 'square', f0: 1900 + i * 150, f1: 2500 + i * 150, start: s, dur: 0.06, gain: 0.08, lowpass: 4200 })); },
  hamster: (c) => { note(c, { f0: 2500, f1: 3600, dur: 0.1, gain: 0.16 }); note(c, { f0: 2700, f1: 3900, start: 0.14, dur: 0.09, gain: 0.14 }); },
  penguin: (c) => { note(c, { type: 'sawtooth', f0: 330, f1: 250, dur: 0.38, gain: 0.2, lowpass: 900 }); note(c, { type: 'sawtooth', f0: 300, f1: 230, start: 0.42, dur: 0.3, gain: 0.16, lowpass: 900 }); },
  turtle: (c) => { note(c, { f0: 520, f1: 260, dur: 0.18, gain: 0.2 }); },
};

export function playPetSound(kind) {
  try {
    if (RECORDED.includes(kind)) {
      if (!players[kind]) players[kind] = new Audio(`${import.meta.env.BASE_URL}petSounds/${kind}.mp3`);
      const a = players[kind];
      a.currentTime = 0;
      a.volume = 0.8;
      a.play().catch(() => {});
      return;
    }
    const c = audioContext();
    if (c && SYNTH[kind]) SYNTH[kind](c);
  } catch (e) { /* no sound is better than a broken tap */ }
}

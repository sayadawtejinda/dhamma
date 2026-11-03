// Pets say their English phrases out loud, using the phone's own text-to-speech (nothing is downloaded, stored or read
// from Firebase -- it costs nothing). Every animal has its own pitch and speed so they sound different: a deep slow
// elephant, a tiny quick hamster. A pet that chats on its own (not because it was tapped) is kept quiet most of the
// time: at most one such remark every 20 seconds across all pets. The 🔊 / 🔇 button on the home page switches it off.
const VOICE_KEY = 'petVoice';
const AUTO_GAP_MS = 20000;
let lastAuto = 0;

// pitch 0..2, rate 0.1..10 (kept near 1 so children can follow the words)
const VOICES = {
  dog: { pitch: 0.9, rate: 1 }, cat: { pitch: 1.5, rate: 0.95 }, bird: { pitch: 1.9, rate: 1.1 }, squirrel: { pitch: 1.8, rate: 1.15 },
  rabbit: { pitch: 1.6, rate: 1.05 }, hamster: { pitch: 2, rate: 1.2 }, turtle: { pitch: 0.6, rate: 0.7 }, fox: { pitch: 1.3, rate: 1.05 },
  parrot: { pitch: 1.7, rate: 1.05 }, penguin: { pitch: 1.1, rate: 0.95 }, panda: { pitch: 0.8, rate: 0.85 }, elephant: { pitch: 0.4, rate: 0.75 },
};

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

export const petVoiceOn = () => { try { return localStorage.getItem(VOICE_KEY) !== '0'; } catch (e) { return true; } };
export const setPetVoiceOn = (on) => {
  try { localStorage.setItem(VOICE_KEY, on ? '1' : '0'); } catch (e) { /* private mode: just this visit */ }
  if (!on && supported()) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
};

// phones only allow speech once the child has tapped something: tapping a pet "unlocks" it with an empty word
export const unlockPetVoice = () => {
  if (!supported()) return;
  try { window.speechSynthesis.speak(new window.SpeechSynthesisUtterance('')); } catch (e) { /* ignore */ }
};

const englishVoice = () => {
  try {
    const list = window.speechSynthesis.getVoices() || [];
    return list.find(v => v.lang === 'en-US') || list.find(v => (v.lang || '').toLowerCase().startsWith('en')) || null;
  } catch (e) { return null; }
};

export function speakPet(kind, text, { auto = false, delayMs = 0 } = {}) {
  if (!supported() || !petVoiceOn()) return;
  const clean = String(text || '').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();   // drops emoji, keeps the English words
  if (!/[a-z]/i.test(clean)) return;
  const now = Date.now();
  if (auto) {
    if (now - lastAuto < AUTO_GAP_MS || window.speechSynthesis.speaking) return;
    lastAuto = now;
  }
  const go = () => {
    try {
      const u = new window.SpeechSynthesisUtterance(clean);
      const v = VOICES[kind] || VOICES.dog;
      u.lang = 'en-US';
      u.pitch = v.pitch;
      u.rate = v.rate;
      u.volume = 1;
      const voice = englishVoice();
      if (voice) u.voice = voice;
      if (!auto) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* no voice is better than a broken tap */ }
  };
  if (delayMs > 0) setTimeout(go, delayMs); else go();
}

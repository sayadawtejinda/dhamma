// Short animal sounds for the break games. The clips are cut from the teacher's own animal-sound recording (public/gameSounds/<name>.mp3,
// about 70 KB each, fetched only when first played); the pets' recordings (public/petSounds/) are reused for bird, dog, cat, rabbit, elephant.
const GAME_CLIPS = ['tiger', 'lion', 'monkey', 'swan', 'duck', 'deer', 'sheep', 'owl', 'cow', 'horse'];
const PET_CLIPS = ['bird', 'dog', 'cat', 'rabbit', 'elephant', 'parrot', 'fox', 'panda'];
const players = {};
export function playGameSound(name, volume = 1) {
  try {
    const dir = GAME_CLIPS.includes(name) ? 'gameSounds' : PET_CLIPS.includes(name) ? 'petSounds' : null;
    if (!dir) return;
    if (!players[name]) players[name] = new Audio(`${import.meta.env.BASE_URL}${dir}/${name}.mp3`);
    const a = players[name];
    a.currentTime = 0;
    a.volume = volume;
    a.play().catch(() => {});
  } catch (e) { /* no sound is better than a broken game */ }
}
export function stopGameSound(name) {
  try { const a = players[name]; if (a) { a.pause(); a.currentTime = 0; } } catch (e) { /* ignore */ }
}

// the sound that goes with an animal emoji (or null)
const VOICES = { '🐦': 'bird', '🐤': 'bird', '🐥': 'bird', '🕊️': 'bird', '🦜': 'parrot', '🐕': 'dog', '🐶': 'dog', '🐈': 'cat', '🐱': 'cat', '🐇': 'rabbit', '🐰': 'rabbit', '🐘': 'elephant', '🦌': 'deer', '🐑': 'sheep', '🐄': 'cow', '🐂': 'cow', '🐴': 'horse', '🐎': 'horse', '🦢': 'swan', '🦆': 'duck', '🦉': 'owl', '🐒': 'monkey', '🦁': 'lion', '🐅': 'tiger', '🐯': 'tiger', '🦊': 'fox', '🐼': 'panda' };
export const voiceOf = (emoji) => VOICES[emoji] || null;
export function playAnimalVoice(emoji, volume = 1) { const v = VOICES[emoji]; if (v) playGameSound(v, volume); }

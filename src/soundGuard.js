// One watcher for the sound of EVERY app (installed once from App.jsx), so a child whose sound stops working is helped without each
// app needing its own code. It does three things:
//  1. Wakes the sound up: phones put a page's Web Audio sound to sleep ("suspended") until the child taps; on every tap this
//     resumes any sleeping AudioContext, which fixes the most common "no sound" by itself.
//  2. Notices trouble: a sound that was asked to play but is refused (the phone wants a tap first), a sound file that failed to load,
//     or one that "plays" without moving. A sound that was stopped on purpose, or is still downloading on a slow connection, is
//     NOT trouble. The first trouble reloads that file quietly; trouble again within a minute raises the "Can't hear anything?"
//     prompt (see SoundGuardButton.jsx).
//  3. Offers a fix: refreshAllSound() resumes every sound engine and reloads the sound files that are broken.
// Nothing here reads or writes Firebase.

const media = new Set();      // sound elements that were played
const contexts = new Set();   // Web Audio engines that were created
let installed = false;
let problemActive = false;
let lastTroubleAt = 0;
const listeners = new Set();

const emit = () => listeners.forEach(fn => { try { fn(problemActive); } catch (e) { /* ignore */ } });
export const onSoundProblemChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const isSoundProblem = () => problemActive;
const setProblem = (on) => { if (problemActive !== on) { problemActive = on; emit(); } };

const trouble = (el, why) => {
  const now = Date.now();
  if (why === 'broken' && el) { try { el.load(); } catch (e) { /* ignore */ } }   // first aid: fetch that file again
  if (why === 'refused' || now - lastTroubleAt < 60000) setProblem(true);
  lastTroubleAt = now;
};

const verify = (el, startTime) => {
  setTimeout(() => {
    if (el.error || el.networkState === 3) return trouble(el, 'broken');
    if (el.paused || el.readyState < 3) return;            // stopped on purpose, or still loading: fine
    if (el.currentTime > startTime + 0.03) { lastTroubleAt = 0; setProblem(false); }
    else trouble(el, 'stuck');
  }, 700);
};

const resumeContexts = () => {
  contexts.forEach(c => { try { if (c.state === 'suspended' || c.state === 'interrupted') c.resume().catch(() => {}); } catch (e) { /* ignore */ } });
};

export function installSoundGuard() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // every sound element that plays is watched
  try {
    const origPlay = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function (...args) {
      const el = this;
      media.add(el);
      const startTime = el.currentTime;
      const result = origPlay.apply(this, args);
      if (result && typeof result.then === 'function') {
        result.then(() => verify(el, startTime), (e) => { if (e && e.name !== 'AbortError') trouble(el, 'refused'); });
      }
      return result;
    };
  } catch (e) { /* an old browser: no watching, nothing breaks */ }

  // every Web Audio engine is remembered, so it can be woken
  try {
    const Orig = window.AudioContext || window.webkitAudioContext;
    if (Orig) {
      const Patched = function (...args) { const c = new Orig(...args); contexts.add(c); return c; };
      Patched.prototype = Orig.prototype;
      window.AudioContext = Patched;
      window.webkitAudioContext = Patched;
    }
  } catch (e) { /* ignore */ }

  // a tap anywhere wakes a sleeping sound engine; if it is still asleep a moment later, say so
  const wake = () => {
    resumeContexts();
    setTimeout(() => { if ([...contexts].some(c => c.state === 'suspended' || c.state === 'interrupted')) trouble(null, 'refused'); }, 600);
  };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, wake, { capture: true, passive: true }));
}

// The 🔄: wake every sound engine and reload the sound files that are broken. Returns what it found.
export function refreshAllSound() {
  resumeContexts();
  let reloaded = 0;
  media.forEach(el => {
    try {
      if (!el.isConnected && el.paused && !el.error && el.networkState !== 3) return;
      if (el.error || el.networkState === 3 || el.readyState === 0) { el.load(); reloaded += 1; }
      else if (!el.paused) { el.pause(); }
    } catch (e) { /* ignore */ }
  });
  lastTroubleAt = 0;
  setProblem(false);
  return { contexts: contexts.size, reloaded };
}

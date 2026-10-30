// Keeps the text of the small round balls (w-10 .. w-12, rounded-full) inside the ball: when a word is too wide
// the font is made smaller (down to a floor); if it still does not fit the word is broken onto the next line.
// Works on the rendered DOM, so it covers every language (including the display-layer English).
const MIN_PX = 7;

function holder(el) {
  const spans = el.querySelectorAll(':scope > span');
  for (const s of spans) if (s.textContent.trim() && !s.className.includes('absolute')) return s;
  return el.children.length === 0 ? el : null;
}

function fit(el) {
  const t = holder(el);
  if (!t || !t.textContent.trim()) return;
  t.style.fontSize = '';
  t.style.overflowWrap = '';
  t.style.whiteSpace = 'normal';
  t.style.wordBreak = '';
  const cs = getComputedStyle(el);
  const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
  const availH = el.clientHeight - 2;
  if (avail <= 0) return;
  const range = document.createRange();
  const widest = () => {
    range.selectNodeContents(t);
    let w = 0;
    for (const r of range.getClientRects()) w = Math.max(w, r.width);
    return w;
  };
  // the span is as wide as the ball, so an unbreakable word sticks out: measure the text itself
  const start = parseFloat(getComputedStyle(t).fontSize);
  let px = start;
  // 1) shrink while the widest line is wider than the ball (down to the floor)
  while (widest() > avail && px > MIN_PX) { px -= 0.5; t.style.fontSize = px + 'px'; }
  // 2) still too wide: let the word break onto the next line
  if (widest() > avail) t.style.overflowWrap = 'anywhere';
  // 3) too tall: shrink more
  range.selectNodeContents(t);
  const height = () => { let top = 1e9, bot = -1e9; for (const r of range.getClientRects()) { top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); } return bot - top; };
  while (height() > availH && px > MIN_PX) { px -= 0.5; t.style.fontSize = px + 'px'; }
}

export function startFitCircles() {
  if (typeof document === 'undefined') return () => {};
  let queued = false;
  const run = () => {
    queued = false;
    document.querySelectorAll('.rounded-full').forEach(el => {
      if (!/\b(w-10|w-11|w-12)\b/.test(el.className) || el.className.includes('fixed')) return;
      if (el.querySelector('svg,input,button')) return;
      const key = el.textContent + '|' + el.clientWidth;
      if (el.dataset.fitKey === key) return;
      fit(el);
      el.dataset.fitKey = key;
    });
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', schedule);
  schedule();
  return () => { mo.disconnect(); window.removeEventListener('resize', schedule); };
}

// Shared "coins fly from where you earned them to your coin total" effect,
// used by every vanilla-JS-hybrid app in this project that awards coins.
// Purely cosmetic (position:fixed spans appended to document.body, self-
// removing) -- the actual balance write happens wherever awardCoins() does
// its own setDoc/increment. Each coin gets its own small random jitter on
// both ends and its own stagger/duration so a burst reads as a scattering
// handful of coins rather than one coin duplicated in a straight line (see
// MyanmarReaderApp.jsx's FlyingCoin, which this mirrors for React apps).
//
// The landing target is found by DOM query rather than passed in, since
// every app's coin badge is the same OnlineStatusWidget coin badge (marked
// with id="online-status-coin-badge") -- one shared lookup means every
// caller stays a one-line `spawnFlyingCoins(fromEl)`. Every app in this
// suite stays mounted simultaneously (just hidden via CSS, see App.jsx),
// so there can be several matching badges in the DOM at once -- this picks
// the first one that's actually laid out/visible (offsetParent !== null)
// rather than whichever happens to be first in document order, which could
// silently be a hidden app's badge sitting at a zero-size rect.
function findVisibleCoinTarget() {
  const candidates = document.querySelectorAll(
    '#online-status-coin-badge, [title="Click to deposit into your Shrine Room wallet"]'
  );
  for (const el of candidates) {
    if (el.offsetParent !== null) return el;
  }
  return candidates[0] || null;
}
export function spawnFlyingCoins(from, count = 8, emoji = '🪙') {
  if (!from) return;
  const coinTarget = findVisibleCoinTarget();
  if (!coinTarget) return;
  // `from` is either a DOM element (fly from its center) or a plain
  // {x,y} point (e.g. the student's last click position).
  const fromCenter = (typeof from.getBoundingClientRect === 'function')
    ? (() => { const r = from.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()
    : { x: from.x, y: from.y };
  const toRect = coinTarget.getBoundingClientRect();
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const n = Math.min(14, Math.max(6, count));

  for (let i = 0; i < n; i++) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.cssText = 'position:fixed;z-index:10000;font-size:20px;pointer-events:none;margin-left:-10px;margin-top:-10px;';
    const fx = fromCenter.x + (Math.random() - 0.5) * 50;
    const fy = fromCenter.y + (Math.random() - 0.5) * 50;
    span.style.left = `${fx}px`;
    span.style.top = `${fy}px`;
    span.style.transform = 'scale(1.3)';
    span.style.opacity = '1';
    document.body.appendChild(span);

    const duration = 650 + Math.random() * 300;
    const delay = i * 55 + Math.random() * 60;
    const durS = duration / 1000;
    setTimeout(() => {
      span.style.transition = `left ${durS}s cubic-bezier(.34,1.15,.64,1), top ${durS}s cubic-bezier(.34,1.15,.64,1), transform ${durS}s ease, opacity ${durS}s ease 0.2s`;
      span.style.left = `${toX + (Math.random() - 0.5) * 16}px`;
      span.style.top = `${toY + (Math.random() - 0.5) * 16}px`;
      span.style.transform = 'scale(0.5) rotate(360deg)';
      span.style.opacity = '0';
    }, 20 + delay);
    setTimeout(() => span.remove(), duration + 100 + delay);
  }
}

// Tracks the most recent click point inside `rootEl` so a coin burst can
// fly from wherever the student actually tapped (the answer they just got
// right) instead of a fixed, often-wrong default position. Call once per
// app at mount; returns a getter for the last point (falls back to the
// viewport center if nothing has been clicked yet).
export function trackLastClickPoint(rootEl) {
  let last = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const onClick = (e) => { last = { x: e.clientX, y: e.clientY }; };
  (rootEl || document).addEventListener('click', onClick, true);
  return {
    get: () => last,
    stop: () => (rootEl || document).removeEventListener('click', onClick, true),
  };
}

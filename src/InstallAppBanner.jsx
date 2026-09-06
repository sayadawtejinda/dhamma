import React, { useEffect, useState } from 'react';

// Shows a small "Install App" banner so a first-time visitor gets an app
// icon on their phone/tablet's home screen without the teacher having to
// walk them through it individually.
//
// Android/Chrome: listens for the browser's own `beforeinstallprompt`
// event and shows a one-tap "Install App" button that triggers the real
// native install flow.
// iOS/iPadOS Safari: there is no install API at all on iOS -- Apple only
// supports installing via Safari's own Share -> "Add to Home Screen"
// menu, and no web page can trigger that automatically. This banner just
// shows clear step-by-step instructions instead.
// Already-installed / desktop: nothing renders.
const DISMISS_KEY = 'dhamma_install_banner_dismissed_v1';

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
}

function isIOS() {
  const ua = window.navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (isIOS()) setShowIosInstructions(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch {}
  };

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIosInstructions) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-indigo-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">📚</span>
        <div className="flex-1 min-w-0">
          {deferredPrompt ? (
            <p className="text-sm font-semibold">Put this app's icon on your home screen for quick access.</p>
          ) : (
            <p className="text-sm font-semibold">
              Add this to your home screen: tap <span className="inline-block px-1">⬆️</span> Share, then "Add to Home Screen".
            </p>
          )}
        </div>
        {deferredPrompt && (
          <button
            onClick={async () => {
              deferredPrompt.prompt();
              await deferredPrompt.userChoice.catch(() => {});
              setDeferredPrompt(null);
              dismiss();
            }}
            className="flex-shrink-0 bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-full hover:bg-indigo-50"
          >
            Install
          </button>
        )}
        <button onClick={dismiss} className="flex-shrink-0 text-white/80 hover:text-white text-xl leading-none px-1" aria-label="Dismiss">✕</button>
      </div>
    </div>
  );
}

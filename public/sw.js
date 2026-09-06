// Minimal service worker — its only job is to exist and respond to fetch,
// which is what lets Chrome/Android treat this site as an installable PWA
// (the automatic "Install app" banner). It does no caching of its own, so
// it never serves stale content — every request just passes through to
// the network exactly as if there were no service worker at all.
self.addEventListener('fetch', () => {});

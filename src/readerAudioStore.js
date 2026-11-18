// Keeps the Myanmar Reader's sound files on the device (Cache Storage) so that after the first visit they play from the device,
// not from the internet: a jump to the middle of a file always works, and nothing depends on the connection. Returns a blob: address
// to use as the audio src, or null when this browser cannot store it (the caller then keeps using the normal web address).
const CACHE_NAME = 'reader-audio-v1';
const urls = new Map();      // web address -> blob: address (this visit)
const pending = new Map();

export const storedAudioUrl = (src) => urls.get(src) || null;

export function prepareAudio(src) {
  if (urls.has(src)) return Promise.resolve(urls.get(src));
  if (pending.has(src)) return pending.get(src);
  const job = (async () => {
    try {
      if (typeof caches === 'undefined') return null;
      const cache = await caches.open(CACHE_NAME);
      let res = await cache.match(src);
      if (!res) {
        const net = await fetch(src);
        if (!net.ok) return null;
        await cache.put(src, net.clone());
        res = net;
      }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      urls.set(src, u);
      return u;
    } catch (e) {
      return null;
    } finally {
      pending.delete(src);
    }
  })();
  pending.set(src, job);
  return job;
}

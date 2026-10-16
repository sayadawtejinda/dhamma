// Shared by make-lessons.mjs and add-lessons.mjs: one place that talks to Gemini (slow on purpose: free keys allow only a few
// requests a minute), keeps the key in scripts/gemini-key.txt (never uploaded) and survives Google retiring a model name.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'; // changed automatically if Google has retired it (see pickModel)
export const GAP_MS = parseInt(process.env.GEMINI_GAP_MS || '4500', 10); // pause between requests

export const GEMINI_KEY_FILE = join(__dirname, 'gemini-key.txt');
export function loadKey() {
  let key = process.env.GEMINI_API_KEY || '';
  if (!key && existsSync(GEMINI_KEY_FILE)) key = readFileSync(GEMINI_KEY_FILE, 'utf8').trim();
  return key;
}

// ---- Gemini -------------------------------------------------------------------------------------------------------
// Google retires model names from time to time ("no longer available"). When that happens, ask Google which models
// this key may use and take the newest ordinary "flash" one.
async function pickModel(key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${key}`);
  if (!res.ok) throw new Error(`Could not list the Gemini models (HTTP ${res.status}). Is the key right?`);
  const list = ((await res.json()).models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /^gemini-[\d.]+-flash$/.test(n));
  const version = (n) => parseFloat((n.match(/^gemini-([\d.]+)-/) || [])[1]) || 0;
  list.sort((a, b) => version(b) - version(a));
  if (!list.length) throw new Error('No usable Gemini flash model was found for this key.');
  return list[0];
}
let lastCall = 0;
export async function gemini(key, payload, tries = 6) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.status === 429 || res.status >= 500) {
        const back = Math.min(90, 10 * (attempt + 1));
        console.log(`   (Gemini asked to wait, trying again in ${back}s...)`);
        await new Promise(r => setTimeout(r, back * 1000));
        continue;
      }
      if (res.status === 404 && !globalThis.__modelPicked) {
        globalThis.__modelPicked = true;
        MODEL = await pickModel(key);
        console.log(`   (that model is gone; using ${MODEL} instead)`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const j = await res.json();
      const text = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      if (!text.trim()) throw new Error('empty answer');
      return text;
    } catch (e) {
      if (attempt === tries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  throw new Error('Gemini did not answer');
}

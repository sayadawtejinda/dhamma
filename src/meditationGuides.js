// The guided meditations of the Shrine Room. Each one is a plain text file in the folder src/meditations (see README.md there);
// this file only reads them -- nothing here needs editing to add a meditation.
//
// A new line appears every 9 seconds; while a recording plays the line follows the recording's own clock at that same pace (record it
// while watching the lines change every 9 seconds). Both repeat until the sit ends.
// The meditations are listed in the order of their file names (Meditation 2 before Meditation 10); the first is the one shown
// first, the others are chosen from the drop-down list.

// Every sound file in the audio folder, found by its file name (no need to import each one by hand). Any common sound format
// works (m4a, mp3, ogg, wav, aac, flac, opus, webm, mp4). The name may be written without its ending (.m4a), and capital letters do
// not matter, so 'Ryan meditation 3' finds 'Ryan meditation 3.mp3'.
const AUDIO_FILES = import.meta.glob('../audio/*.{m4a,mp3,ogg,wav,aac,flac,opus,webm,weba,mp4,M4A,MP3,OGG,WAV}', { eager: true, query: '?url', import: 'default' });
const AUDIO_BY_NAME = Object.entries(AUDIO_FILES).map(([path, url]) => { const file = path.split('/').pop(); return { file: file.toLowerCase(), bare: file.replace(/\.[^.]+$/, '').toLowerCase(), url }; });
export const audioUrlByName = (name) => {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  const hit = AUDIO_BY_NAME.find(f => f.file === n) || AUDIO_BY_NAME.find(f => f.bare === n);
  if (!hit) console.warn(`Meditation audio "${name}" is not in the audio folder`);
  return hit ? hit.url : null;
};

const isMyanmar = (line) => /[က-႟]/.test(line);
// a line may start with its number ("၁။ ", "12. ", "3) "): the number is dropped
const withoutNumber = (line) => line.replace(/^[0-9၀-၉]+\s*[။.)]\s*/, '');
// "Myanmar line / English line" pairs -> [{ my, en }]
export const linesFromText = (text) => {
  const rows = String(text || '').split(/\r?\n/).map(l => withoutNumber(l.trim())).filter(Boolean);
  if (rows.length % 2) console.warn('Meditation text: an odd number of lines -- every Myanmar line needs its English line');
  const out = [];
  for (let i = 0; i + 1 < rows.length; i += 2) {
    const [a, b] = [rows[i], rows[i + 1]];
    out.push(isMyanmar(a) || !isMyanmar(b) ? { my: a, en: b } : { en: a, my: b });
  }
  return out;
};

// A line starting with # is a note and is ignored. The top of a file may hold "title:", "audio-en:" and "audio-my:" lines (all optional); everything after them is the text.
const parseFile = (path, raw) => {
  const base = path.split('/').pop().replace(/\.txt$/i, '');
  const head = {};
  const body = [];
  let inHead = true;
  String(raw || '').replace(/^﻿/, '').split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#')) return;   // a note to yourself, not read
    const m = inHead && line.match(/^\s*(title|audio-en|audio-my|audio)\s*:\s*(.*)$/i);
    if (m) { head[m[1].toLowerCase()] = m[2].trim(); return; }
    if (inHead && line.trim() === '' && Object.keys(head).length === 0) return;
    if (line.trim() !== '') inHead = false;
    body.push(line);
  });
  const audioEn = head['audio-en'] || head.audio || '';
  const audioMy = head['audio-my'] || '';
  return {
    id: base,
    title: head.title || base,
    audio: { en: audioEn, my: audioMy },
    lines: linesFromText(body.join('\n')),
    audioUrl: { en: audioUrlByName(audioEn), my: audioUrlByName(audioMy) },
  };
};

const FILES = import.meta.glob('./meditations/*.txt', { eager: true, query: '?raw', import: 'default' });
export const MEDITATION_GUIDES = Object.entries(FILES)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map(([path, raw]) => parseFile(path, raw))
  .filter(g => g.lines.length > 0);

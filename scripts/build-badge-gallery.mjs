// Builds ONE page that shows every badge together (badge-gallery.html in the project folder) -- for the teacher to look through on the
// computer: each ladder in climbing order, its name, what it is for, how many students have earned it / been given it, and
// which ones are switched off for now.   node scripts/build-badge-gallery.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => { try { return JSON.parse(readFileSync(join(ROOT, 'public', p), 'utf8')); } catch (e) { return {}; } };
const earnedFile = (read('badges.json').students) || {};
const givenFile = (read('badgesGiven.json').given) || {};
const earnedCount = {}; Object.values(earnedFile).forEach(l => l.forEach(id => { earnedCount[id] = (earnedCount[id] || 0) + 1; }));
const givenCount = {}; Object.values(givenFile).forEach(o => Object.keys(o || {}).forEach(id => { givenCount[id] = (givenCount[id] || 0) + 1; }));
// switched off in scripts/compute-badges.mjs for now
// the name shown above each ladder
const LABELS = { trophy: 'Trophies', weeks: 'Weeks of coming to class', hearts: 'Hearts', lotus: 'Lotus flowers', 'shrine-visits': 'Shrine Room visits', 'nature-gift': 'Nature World gifts', trees: 'Trees planted', avatar: 'Avatar items', poems: 'Myanmar Poems', reader: 'Myanmar Reader chapters', vowels: 'Myanmar Vowels', numbers: 'Number games', cp: 'Consonant Practice (Part 1)', consonants: 'Burmese Consonant Game (Part 2)', animals: 'Animal Sound', ss: 'Smart Study lessons', abhi: 'Abhidhamma lessons', ds: 'Dhammaschool chapters (all grades)', deeds: 'Good deeds', lamps: 'Lamps & traditions', all: 'All-Rounder (badges earned in all)', numbers: 'Number games (16 trophies)' };
const OFF = new Set([]); // badges switched off in compute-badges.mjs would be listed here

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { BadgeSvg } = await vite.ssrLoadModule('/src/Badges.jsx');
const defs = await vite.ssrLoadModule('/src/badgeDefs.js');
const aw = await vite.ssrLoadModule('/src/Awards.jsx');
const { STAGE_NAMES } = await vite.ssrLoadModule('/src/bodhiLevels.js');
const svg = (b, size = 72) => renderToStaticMarkup(React.createElement(BadgeSvg, { badge: b, size }));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const card = (b) => {
  const e = earnedCount[b.id] || 0, g = givenCount[b.id] || 0;
  const off = OFF.has(b.id);
  return `<div class="card${off ? ' off' : ''}">${svg(b)}<b>${esc(b.name)}</b><span class="d">${esc(b.desc)}</span><span class="id">${esc(b.id)}${b.master ? ' ✦' : ''}</span><span class="n">${off ? '⏸ not given for now' : `earned ${e} · given ${g}`}</span></div>`;
};

let body = '', total = 0;
for (const grp of defs.BADGE_GROUPS) {
  const items = defs.BADGE_DEFS.filter(b => b.group === grp.id);
  if (!items.length) continue;
  const ladders = new Map();
  items.forEach(b => { const k = defs.ladderOf(b.id); (ladders.get(k) || ladders.set(k, []).get(k)).push(b); });
  body += `<h2>${esc(grp.title)}</h2>`;
  ladders.forEach((list, k) => { total += list.length; body += `<div class="ladder"><div class="lt">${esc(LABELS[k] || k)} · ${list.length} step${list.length > 1 ? 's' : ''}</div><div class="row">${list.map(card).join('')}</div></div>`; });
}
// the Bodhi Tree: ten levels (this year), the gold yearly badge, one badge for every finished Dhammaschool grade
const year = new Date().getFullYear();
const bodhi = STAGE_NAMES.map((_, i) => defs.badgeMeta(`bodhi-level:${year}:${i}`));
const yearsWithUs = [2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => defs.badgeMeta(`year-${y}`));
const cardDyn = (b) => `<div class="card">${svg(b)}<b>${esc(b.name)}</b><span class="d">${esc(b.desc)}</span><span class="id">${esc(b.id)}</span><span class="n">earned ${earnedCount[b.id] || 0} · given ${givenCount[b.id] || 0}</span></div>`;
total += bodhi.length;
body += `<h2>Bodhi Tree (levels this year, ${year})</h2><div class="ladder"><div class="lt">bodhi-level · 10 steps (each level is a badge of its own)</div><div class="row">${bodhi.map(cardDyn).join('')}</div></div>`;
body += `<h2>Years with us (you give these by hand: Badges to give → Give any badge by hand)</h2><div class="ladder"><div class="lt">one for every year a student has studied with you (2020 on) · shown with the Bodhi gold yearly badges</div><div class="row">${yearsWithUs.map(cardDyn).join('')}</div></div>`;
total += yearsWithUs.length;
// the top-three honours (cup / Dhamma wheel / sun): the plaque as it shows in the Avatar, Shrine Room and Bodhi Tree, and the emblem
const KINDS = [['trophy', 'Most trophies', aw.AWARDS, 'Avatar room (right under the wallet) and Home'], ['holy', 'Most lotus flowers in the Shrine Room', aw.HOLY_AWARDS, 'Shrine Room (left corner)'], ['joy', 'Most classes attended (this year)', aw.JOY_AWARDS, 'Bodhi Tree (right corner)']];
body += `<h2>Top-three honours (you give these by hand, during class; each shows only while the student really holds that place)</h2>`;
for (const [kind, what, list, where] of KINDS) {
  const items = list.map((info, i) => {
    const award = { kind, tier: i + 1, name: 'Student name', count: kind === 'holy' ? 1500 - i * 200 : kind === 'joy' ? 58 - i * 2 : 369 - i * 6, info, generatedAt: new Date().toISOString() };
    const plaque = renderToStaticMarkup(React.createElement('div', { style: { width: 250 } }, React.createElement(aw.AwardPlaque, { award, compact: true })));
    const emblem = renderToStaticMarkup(React.createElement(aw.AwardEmblem, { kind, tier: i + 1, size: 80 }));
    return `<div class="card wide">${emblem}<b>${esc(info.en)}</b><span class="d">place ${i + 1}</span>${plaque}</div>`;
  });
  total += 3;
  body += `<div class="ladder"><div class="lt">${esc(what)} · shown in: ${esc(where)}</div><div class="row">${items.join('')}</div></div>`;
}
body += `<h2>Dhammaschool grades (5 steps in each grade: 8, 16, 24, 32, 40 chapters)</h2>`;
for (let g = 1; g <= 5; g++) { const steps = [1, 2, 3, 4, 5].map(k => defs.badgeMeta(`ds-grade:GRADE-${g}:${k}`)); total += 5; body += `<div class="ladder"><div class="lt">Grade ${g} · 5 steps</div><div class="row">${steps.map(cardDyn).join('')}</div></div>`; }

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All badges</title>
<style>
body{font-family:system-ui,Segoe UI,sans-serif;background:#f6efe0;color:#4a3410;margin:0;padding:20px 28px}
h1{margin:0 0 4px}h2{margin:28px 0 6px;border-bottom:2px solid #d9c38a;padding-bottom:4px;color:#7a5600}
.sum{color:#7a5600;margin-bottom:8px}.ladder{margin:8px 0 14px}.lt{font-size:12px;font-weight:700;color:#8a6a1a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
.card{width:150px;background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.18);padding:10px 8px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px}
.card b{font-size:13px}.d{font-size:11px;color:#666}.id{font-size:10px;color:#aaa;font-family:monospace}.n{font-size:11px;font-weight:700;color:#2f7d4f}
.card.wide{width:290px}.off{opacity:.55;outline:2px dashed #c0392b}.off .n{color:#c0392b}
</style></head><body><h1>🎖️ All badges</h1><div class="sum">${total} badges. ✦ = master (sparkle). "earned" = students who have enough now; "given" = the ones you have approved. Dashed red = switched off for now. Built ${new Date().toLocaleString('en-US')}.</div>${body}</body></html>`;
writeFileSync(join(ROOT, 'badge-gallery.html'), html);
console.log(`Wrote badge-gallery.html (${total} badges)`);
await vite.close();

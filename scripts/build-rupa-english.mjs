// Generates src/Rupa3App.jsx (English) from src/Rupa1App.jsx (Myanmar): the layout/logic is copied unchanged and
// every Myanmar text is replaced from the tables below (keyed by rupa key / kalapa id / koṭṭhāsa id / line number).
// Pali technical terms stay in Roman script, the explanations are English. To fix a wording, edit a table here and
// re-run:  node scripts/build-rupa-english.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MY = /[က-႟]/;

// ---- the 28 rūpas: name + lakkhaṇa / rasa / paccupaṭṭhāna / padaṭṭhāna ----
const SAME3 = 'The other three elements of the same kalāpa';
const RUPA = {
  pathavi: ['Pathavī-dhātu (earth element)', 'The nature of hardness (= firmness, solidity)', 'To serve as the foundation of the co-nascent rūpas of the same kalāpa', 'The state of receiving (supporting from below) the co-nascent rūpas of the same kalāpa', SAME3],
  apo: ['Āpo-dhātu (water element)', 'The nature of flowing (trickling)', 'Causing the co-nascent rūpas to grow', 'The state of binding together the rūpas of the same kalāpa', SAME3],
  tejo: ['Tejo-dhātu (fire element)', 'The nature of heat (and cold)', 'Maturing the rūpas of the same kalāpa', 'The state of softening the rūpas of the same kalāpa and adapting them suitably', SAME3],
  vayo: ['Vāyo-dhātu (air element)', 'The nature of supporting (stiffening)', 'Pushing (causing movement)', 'The state of conveying the co-nascent rūpas from one place to another', SAME3],
  cakkhu: ['Cakkhu-pasāda (eye-sensitivity)', 'The nature of making clear the great elements produced by kamma whose root cause is rūpa-taṇhā, the craving to see visible forms', 'Drawing both the person and the stream of vīthi-cittas toward visible objects', 'The state of being the support (locus) of cakkhu-viññāṇa', 'The great elements of the same kalāpa, produced by kamma rooted in the craving to see visible forms (the foundation of cakkhu-pasāda)'],
  sota: ['Sota-pasāda (ear-sensitivity)', 'The nature of making clear the great elements produced by kamma whose root cause is sadda-taṇhā, the craving to hear sounds', 'Drawing the stream of vīthi-cittas toward sound objects', 'The state of being the support (locus) of sota-viññāṇa', 'The great elements of the same kalāpa, produced by kamma rooted in the craving to hear sounds (the foundation of sota-pasāda)'],
  ghana: ['Ghāna-pasāda (nose-sensitivity)', 'The nature of making clear the great elements produced by kamma whose root cause is gandha-taṇhā, the craving to smell odours', 'Drawing the stream of vīthi-cittas toward smell objects', 'The state of being the support (locus) of ghāna-viññāṇa', 'The great elements of the same kalāpa, produced by kamma rooted in the craving to smell odours (the foundation of ghāna-pasāda)'],
  jivha: ['Jivhā-pasāda (tongue-sensitivity)', 'The nature of making clear the great elements produced by kamma whose root cause is rasa-taṇhā, the craving to lick, eat and drink flavours', 'Drawing the stream of vīthi-cittas toward taste objects', 'The state of being the support (locus) of jivhā-viññāṇa', 'The great elements of the same kalāpa, produced by kamma rooted in the craving to taste flavours (the foundation of jivhā-pasāda)'],
  kaya: ['Kāya-pasāda (body-sensitivity)', 'The nature of making clear the great elements produced by kamma whose root cause is phoṭṭhabba-taṇhā, the craving to touch tangible objects', 'Drawing the stream of vīthi-cittas toward tangible objects', 'The state of being the support (locus) of kāya-viññāṇa', 'The great elements of the same kalāpa, produced by kamma rooted in the craving to touch tangible objects (the foundation of kāya-pasāda)'],
  vanna: ['Rūpārammaṇa (visible form)', 'The nature of impinging on (striking) the cakkhu-pasāda', 'Being the object of cakkhu-viññāṇa', 'The state of being the feeding ground, the object-pasture, of cakkhu-viññāṇa', 'The four great elements of the same kalāpa, on which it itself depends'],
  sadda: ['Saddārammaṇa (sound)', 'The nature of impinging on (striking) the sota-pasāda', 'Being the object of sota-viññāṇa', 'The state of being the feeding ground, the object-pasture, of sota-viññāṇa', 'The four great elements of the same kalāpa, on which it itself depends'],
  gandha: ['Gandhārammaṇa (smell)', 'The nature of impinging on (striking) the ghāna-pasāda', 'Being the object of ghāna-viññāṇa', 'The state of being the feeding ground, the object-pasture, of ghāna-viññāṇa', 'The four great elements of the same kalāpa, on which it itself depends'],
  rasa: ['Rasārammaṇa (taste)', 'The nature of impinging on (striking) the jivhā-pasāda', 'Being the object of jivhā-viññāṇa', 'The state of being the feeding ground, the object-pasture, of jivhā-viññāṇa', 'The four great elements of the same kalāpa, on which it itself depends'],
  itthi: ['Itthi-bhāva-rūpa (femininity)', 'The nature that makes one a female', 'Showing: "this one is a woman"', 'The state of being the cause of the female form, marks, behaviour and manner', 'The kamma-born great elements of the same kalāpa that support the itthindriya'],
  pum: ['Pumbhāva-rūpa (masculinity)', 'The nature that makes one a male', 'Showing: "this one is a man"', 'The state of being the cause of the male form, marks, behaviour and manner', 'The kamma-born great elements of the same kalāpa that support the purisindriya'],
  jivita: ['Jīvita-rūpa (life faculty)', 'The nature of maintaining the co-nascent kamma-born rūpas of the same kalāpa', 'Making those kamma-born rūpas occur from arising until dissolution (making them live long)', 'The state of keeping those kamma-born rūpas established and enduring until dissolution', 'The kamma-born great elements of the same kalāpa that it is to cause to occur, to maintain and to keep alive'],
  hadaya: ['Hadaya-vatthu (heart-base)', 'The nature of being the support of mano-dhātu and mano-viññāṇa-dhātu', 'Being the dwelling place of those two elements alone', 'The state of carrying (bearing) those two elements', 'The kamma-born great elements of the same kalāpa that support it'],
  oja: ['Kabaḷīkāra-āhāra (ojā, edible nutriment)', 'The nature of the essence (ojā) of food that is swallowed', 'Carrying and sustaining the rūpa born of nutriment', 'The state of supporting and strengthening the physical body by producing āhāraja-rūpa', 'The edible food that is swallowed'],
  akasa: ['Ākāsa-dhātu (space element)', 'The nature of delimiting the rūpa-kalāpas', 'Showing the boundaries of the rūpa-kalāpas', 'The state of being the boundary region of the rūpa-kalāpas (the state of being untouched by the great elements, the state of a gap or opening)', 'The rūpa-kalāpas that are delimited'],
  kayaVinnatti: ['Kāya-viññatti (bodily intimation)', 'A special mode of behaviour, born of citta, that is the cause of the co-nascent physical body being braced and moved: the citta-born vāyo-dhātu that brings about advancing and so on', 'Revealing the inner intention of the one who moves to others', 'The state of being the cause of the body\\u2019s movement', 'Citta-born vāyo-dhātu'],
  vaciVinnatti: ['Vacī-viññatti (verbal intimation)', 'A special mode of expression that is the cause of the impinging of the kamma-born pathavī-dhātu situated at the place where speech-sound arises, bringing about a particular speech-sound', 'Revealing the inner intention of the one who speaks to others', 'The state of being the cause of the arising of speech-sound', 'Citta-born pathavī-dhātu'],
  lahuta: ['Lahutā (lightness)', 'The nature of lightness, non-sluggishness, of the real rūpas', 'Dispelling the heaviness of those rūpas', 'The state of those rūpas arising lightly and swiftly, changing quickly', 'Those rūpas that are light'],
  muduta: ['Mudutā (malleability)', 'The nature of non-stiffness and non-roughness (softness) of the real rūpas', 'Dispelling the stiffness and roughness of those rūpas', 'The state of non-resistance in all bodily activities', 'Those rūpas that are soft'],
  kammannata: ['Kammaññatā (wieldiness)', 'The nature of being fit, suited and well-adapted for bodily activities', 'Dispelling the unwieldiness of the body', 'The state of the rūpas not being weak', 'Those rūpas that are wieldy'],
  upacaya: ['Upacaya (growth)', 'The nature of the first arising of the real rūpas in a single existence', 'Arising and growing ever higher until the faculties are complete', 'A state as if bringing the rūpas out into manifestation', 'The rūpas that are arising'],
  santati: ['Santati (continuity)', 'The nature of the real rūpas occurring in unbroken succession, one after another, once the faculties are complete', 'Linking, stage after stage, without a break', 'The state of occurring without interruption', 'Rūpa that is, as it were, linked in unbroken sequence'],
  jarata: ['Jaratā (decay)', 'The nature of maturing and ageing of the real rūpas', 'Leading on to dissolution', 'The state of lacking newness although not yet free from its own characteristic', 'The rūpas that are maturing'],
  aniccata: ['Aniccatā (impermanence)', 'The nature of the complete breaking up of the real rūpas', 'Causing the real rūpas to sink away', 'The state of exhaustion and dissolution of the real rūpas', 'The rūpas that are breaking up completely'],
};

// ---- kalāpa titles by id ----
const TITLE = {
  cittaja: 'Cittaja suddhaṭṭhaka-kalāpa', utuja: 'Utuja suddhaṭṭhaka-kalāpa', aharaja: 'Āhāraja suddhaṭṭhaka-kalāpa',
  jivita: 'Jīvita-navaka-kalāpa', kaya: 'Kāya-dasaka-kalāpa', bhava: 'Bhāva-dasaka-kalāpa',
  c7: 'Assāsa-passāsa cittaja sadda-navaka',
  cakkhu: 'Cakkhu-dasaka-kalāpa', sota: 'Sota-dasaka-kalāpa', ghana: 'Ghāna-dasaka-kalāpa', jivha: 'Jivhā-dasaka-kalāpa', hadaya: 'Hadaya-vatthu-dasaka-kalāpa',
  itthi: 'Itthi-bhāva-dasaka-kalāpa', pum: 'Pumbhāva-dasaka-kalāpa',
  c2: 'Kāya-viññatti-navaka-kalāpa', c3: 'Lahutādekādasaka-kalāpa', c4: 'Kāya-viññatti lahutādi-dvādasaka',
  c5: 'Vacī-viññatti-dasaka-kalāpa', c6: 'Vacī-viññatti sadda lahutādi-terasaka', c8: 'Assāsa-passāsa cittaja sadda lahutādi-dvādasaka',
  u2: 'Utuja sadda-navaka-kalāpa', u3: 'Lahutādekādasaka-kalāpa', u4: 'Sadda lahutādi-dvādasaka-kalāpa', a2: 'Lahutādekādasaka-kalāpa',
};

// ---- titles of the door / origin / koṭṭhāsa groups (by key) ----
const GROUP_TITLE = {
  eye: 'The 63 rūpas arising at the eye (cakkhu-dvāra)', ear: 'The 63 rūpas arising at the ear (sota-dvāra)',
  nose: 'The 63 rūpas arising at the nose (ghāna-dvāra)', tongue: 'The 63 rūpas arising at the tongue (jivhā-dvāra)',
  body: 'The 53 rūpas arising at the body (kāya-dvāra)', mind: 'The 63 rūpas arising at the heart (mano-dvāra)',
  kammaja: 'Kammaja rūpa-kalāpas (9 kinds)', cittaja: 'Cittaja rūpa-kalāpas (8 kinds)',
  utuja: 'Utuja rūpa-kalāpas (4 kinds)', aharaja: 'Āhāraja rūpa-kalāpas (2 kinds)',
  pathavi: 'Pathavī-koṭṭhāsa (20)', apo: 'Āpo-koṭṭhāsa (12)', tejo: 'Tejo-koṭṭhāsa (4)', vayo: 'Vāyo-koṭṭhāsa (6)',
};

// ---- the 42 koṭṭhāsas: name / description by id ----
const ITEM = {
  p1: 'Head hair (kesā)', p2: 'Body hair (lomā)', p3: 'Nails (nakhā)', p4: 'Teeth (dantā)', p5: 'Skin (taco)', p6: 'Flesh (maṃsa)',
  p7: 'Sinews (nahāru)', p8: 'Bones (aṭṭhi)', p9: 'Bone marrow (aṭṭhimiñjā)', p10: 'Kidneys (vakka)', p11: 'Heart (hadaya)', p12: 'Liver (yakana)',
  p13: 'Membranes (kilomaka)', p14: 'Spleen (pihaka)', p15: 'Lungs (papphāsa)', p16: 'Intestines (anta)', p17: 'Mesentery (antaguṇa)',
  p18: 'Undigested food (udariya)', p19: 'Excrement (karīsa)', p20: 'Brain (matthaluṅga)',
  ap1: 'Bile (pitta)', ap2: 'Phlegm (semha)', ap3: 'Pus (pubba)', ap4: 'Blood (lohita)', ap5: 'Sweat (sedo)', ap6: 'Solid fat (medo)',
  ap7: 'Tears (assu)', ap8: 'Liquid fat (vasā)', ap9: 'Saliva (kheḷo)', ap10: 'Snot (siṅghāṇikā)', ap11: 'Synovial fluid (lasikā)', ap12: 'Urine (mutta)',
  t1: 'Santappana-tejo', t2: 'Ḍāhana-tejo', t3: 'Jīraṇa-tejo', t4: 'Pācaka-tejo',
  v1: 'Uddhaṅgama-vātā', v2: 'Adhogama-vātā', v3: 'Kucchisaya-vātā', v4: 'Koṭṭhāsaya-vātā', v5: 'Aṅgamaṅgānusārino-vātā', v6: 'Assāsa-passāsa-vātā',
};
const OJA8 = 'Only the 8 kinds of utuja ojaṭṭhamaka rūpa are present.';
const C16 = 'Cittaja (8) + utuja (8) = 16 kinds.';
const DESC = {
  p18: OJA8, p19: OJA8, ap3: OJA8, ap12: OJA8,
  ap1: 'Both baddha-pitta (bound bile) and abaddha-pitta (unbound bile) have the 53 kinds.',
  ap4: 'Both sannicita-lohita (stored blood) and saṃsaraṇa-lohita (circulating blood) have the 53 kinds.',
  ap5: C16, ap7: C16, ap9: C16, ap10: C16,
  t1: 'Fierce, scorching heat', t2: 'Extremely intense heat that burns throughout the body', t3: 'The heat that causes ageing, maturing and decaying',
  t4: 'The heat that digests food (jīvita-navaka-kalāpa)',
  v1: 'Wind that rises upward', v2: 'Wind that flows downward', v3: 'Wind in the abdomen, outside the intestines', v4: 'Wind inside the intestines',
  v5: 'Wind that flows through the veins to the larger and smaller limbs of the body', v6: 'In-breath and out-breath',
};

// ---- tab names by id ----
const TAB = {
  doors: 'The 6 Doors', kotthasa: 'The 42 Koṭṭhāsas', origins: 'The 4 Origins (samuṭṭhāna)', rupa28: 'The 28 Rūpas',
  eye: 'Cakkhu (eye)', ear: 'Sota (ear)', nose: 'Ghāna (nose)', tongue: 'Jivhā (tongue)', body: 'Kāya (body)', mind: 'Mano (heart)',
  kammaja: 'Kammaja (born of kamma)', cittaja: 'Cittaja (born of citta)', utuja: 'Utuja (born of temperature)', aharaja: 'Āhāraja (born of nutriment)',
  pathavi: 'Pathavī (20)', apo: 'Āpo (12)', tejo: 'Tejo (4)', vayo: 'Vāyo (6)',
};

// ---- single lines of the component (1-based line numbers in Rupa1App.jsx): [replacement for the Myanmar text node] ----
const LINES = {
  479: ['<p className="text-indigo-100 text-sm font-medium">', 'Detailed information', '</p>'],
  491: ['<Target size={18} /> ', 'Lakkhaṇa (characteristic)', ''],
  499: ['<Activity size={18} /> ', 'Rasa (function)', ''],
  507: ['<Eye size={18} /> ', 'Paccupaṭṭhāna (manifestation)', ''],
  515: ['<Layers size={18} /> ', 'Padaṭṭhāna (proximate cause)', ''],
  546: ['<p className="text-sm">', 'This kalāpa contains a total of <strong>{kalapa.count}</strong> rūpas. Tap a rūpa to see its details.', '</p>'],
  567: ['', 'Tap to see lakkhaṇa and the rest', ''],
  597: ['<p className="text-slate-300 text-sm font-medium">', 'Total: {item.count} rūpas', '</p>'],
  613: ['<Layers size={18} /> ', 'Rūpa-kalāpas included', ''],
  633: ['<p className="text-xs text-slate-500">', '{kalapa.count} rūpas', '</p>'],
  677: ['', 'Studying the Rūpa Dhammas', ''],
  747: ['', 'Total count : {currentData.total}', ''],
  771: ['', 'See details', ''],
  794: ['', '{item.count} rūpas', ''],
  840: ['', '{kalapa.count} rūpas', ''],
  843: ['', 'View &rarr;', ''],
};
// attribute / expression lines: plain regex replacements of the Myanmar string literal on that line
const LINE_ATTR = {
  482: 'Close', 538: 'Close', 599: 'Close', 648: 'Tap for details', 824: 'See the related rūpas of this origin',
};

const src = readFileSync(join(root, 'src/Rupa1App.jsx'), 'utf8').replace(/\r\n/g, '\n');
// the koṭṭhāsa picture block (marked KB) has no Myanmar text: lift it out before the line-number based pass, put it back after
const raw = src.split('\n');
const kbImport = raw.findIndex(l => l.endsWith('// KB'));
const kbS = raw.findIndex(l => l.includes('KB-START')), kbE = raw.findIndex(l => l.includes('KB-END'));
const importText = raw[kbImport], blockText = raw.slice(kbS, kbE + 1);
const lines = raw.filter((_, i) => i !== kbImport && !(i >= kbS && i <= kbE));
const keepAt = kbS - 1; // index in `lines` (the import line is gone) where the block goes back
// (with those lines lifted out, the line numbers in LINES / LINE_ATTR match the original Myanmar file again)
let curConst = '';
let curKey = '';
const out = lines.map((line, i) => {
  const n = i + 1;
  const mc = line.match(/^const (\w+) =/);
  if (mc) { curConst = mc[1]; curKey = ''; }
  const mk = line.match(/^  (\w+): \{\s*$/) || line.match(/^  (\w+): \{ *$/);
  if (mk) curKey = mk[1];
  if (!MY.test(line)) return line;

  if (LINES[n]) {
    const [pre, text, post] = LINES[n];
    return line.match(/^\s*/)[0] + pre + text + post;
  }
  if (LINE_ATTR[n]) return line.replace(/(title=)"[^"]*"/, `$1"${LINE_ATTR[n]}"`);
  if (n === 734) return line.replace(/'ရုပ် [^']*'/, "'The 28 Rūpas in detail'");

  if (curConst === 'rupa28') {
    const r = RUPA[curKey];
    if (!r) throw new Error('no rupa ' + curKey + ' line ' + n);
    const idx = { name: 0, lakkhana: 1, rasa: 2, paccupatthana: 3, padatthana: 4 };
    // name sits on the "id: N, name: '...'" line
    let l = line.replace(/(name: ')[^']*(')/, (_, a, b) => `${a}${r[0]}${b}`);
    l = l.replace(/^(\s+)(lakkhana|rasa|paccupatthana|padatthana): '.*',?$/, (m, sp, f) => `${sp}${f}: '${r[idx[f]]}'${m.endsWith(',') ? ',' : ''}`);
    return l;
  }
  // "{ id: 'x', title: '...'" kalāpa lines
  let m = line.match(/id: '(\w+)', title: '[^']*'/);
  if (m) {
    if (!TITLE[m[1]]) throw new Error('no title ' + m[1] + ' line ' + n);
    return line.replace(/(title: ')[^']*(')/, `$1${TITLE[m[1]]}$2`);
  }
  // group titles: "    title: '...'," inside doorsData / originsData / kotthasaData
  m = line.match(/^    title: '[^']*',$/);
  if (m && GROUP_TITLE[curKey]) return `    title: '${GROUP_TITLE[curKey]}',`;
  // koṭṭhāsa items and tabs: "{ id: 'x', name: '...'"
  m = line.match(/\{ id: '(\w+)', name: '[^']*'/);
  if (m) {
    const id = m[1];
    const isTab = curConst.endsWith('Tabs');
    const text = isTab ? TAB[id] : ITEM[id];
    if (!text) throw new Error('no name ' + id + ' line ' + n);
    let l = line.replace(/(name: ')[^']*(')/, `$1${text}$2`);
    if (!isTab && /desc: '/.test(l)) {
      if (!DESC[id]) throw new Error('no desc ' + id + ' line ' + n);
      l = l.replace(/(desc: ')[^']*(')/, `$1${DESC[id]}$2`);
    }
    return l;
  }
  // comment-only Myanmar: blank the comment text
  if (/^\s*\/\//.test(line) || /\{\/\*.*\*\/\}/.test(line)) return line.replace(/\/\/.*$/, '//').replace(/\{\/\*.*\*\/\}/, '');
  if (/\/\/.*$/.test(line) && !MY.test(line.replace(/\/\/.*$/, ''))) return line.replace(/\s*\/\/.*$/, '');
  throw new Error('untranslated line ' + n + ': ' + line.trim().slice(0, 80));
});

out.splice(keepAt, 0, ...blockText);
out.splice(out.findIndex(l => l.includes("from 'lucide-react'")) + 1, 0, importText);
let text = out.join('\n');
text = text.replace("export default function App(", 'export default function App(');
const header = '// GENERATED by scripts/build-rupa-english.mjs from src/Rupa1App.jsx -- edit the script tables, not this file.\n';
writeFileSync(join(root, 'src/Rupa3App.jsx'), header + text, 'utf8');
const left = text.split('\n').filter(l => MY.test(l));
console.log('Wrote src/Rupa3App.jsx; lines still containing Myanmar:', left.length);
left.slice(0, 10).forEach(l => console.log('  ', l.trim().slice(0, 100)));

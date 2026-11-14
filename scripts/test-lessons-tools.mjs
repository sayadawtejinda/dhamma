// Tests for the lesson tools that need no Gemini and no Firebase: the Markdown article reader and the picture names.
// Run:  node --test scripts/test-lessons-tools.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mdToPlain, parseMarkdownArticles, looksLikeMarkdownArticle, cleanTitle, naturalSort } from './article-md.mjs';
import { listKeyed, checkKeyed, slotBase, KEYED_RE, planPictures } from './picture-slots.mjs';

const long = 'မြန်မာစာသား '.repeat(20);

test('one article = one lesson; the title loses its "ဆောင်းပါး (၁) -" number', () => {
  const md = `# ဆောင်းပါး (၁) - ပရမတ္ထတရား ၄-ပါး\n\n${long}\n\n---\n\n## ၁။ ပထမပိုင်း\n\n${long}\n\n## ၂။ ဒုတိယပိုင်း\n\n**စိတ်** သည် ${long}`;
  const a = parseMarkdownArticles(md, 'x');
  assert.equal(a.length, 1);
  assert.equal(a[0].heading, 'ပရမတ္ထတရား ၄-ပါး');
  assert.ok(!a[0].text.includes('#') && !a[0].text.includes('**') && !/^---$/m.test(a[0].text));
  assert.ok(a[0].text.includes('၁။ ပထမပိုင်း') && a[0].text.includes('စိတ် သည်'));
});
test('several # titles in one file = several lessons; ## stays inside its lesson', () => {
  const md = `# Article 1: One\n${long}\n## part\n${long}\n# Article 2: Two\n${long}`;
  const a = parseMarkdownArticles(md, 'x');
  assert.deepEqual(a.map(x => x.heading), ['One', 'Two']);
});
test('a file with no title is one lesson named after the file; a too-short one is dropped', () => {
  assert.equal(parseMarkdownArticles(long, 'article-5-pakinnaka')[0].heading, 'article-5-pakinnaka');
  assert.equal(parseMarkdownArticles('# T\nshort', 'x').length, 0);
});
test('tables become lines, the separator row goes', () => {
  const t = mdToPlain('| အမည် | အဓိပ္ပါယ် |\n|---|---|\n| ဖဿ | ထိတွေ့ |');
  assert.equal(t, 'အမည် – အဓိပ္ပါယ်\nဖဿ – ထိတွေ့');
});
test('the old notebook files are not mistaken for articles', () => {
  assert.equal(looksLikeMarkdownArticle('=== Lesson ===\ntext\n# not a title'), false);
  assert.equal(looksLikeMarkdownArticle('📖 A story\n# x'), false);
  assert.equal(looksLikeMarkdownArticle('# Title\ntext'), true);
});
test('article-2 sorts before article-10', () => {
  assert.deepEqual(['article-10-a.md', 'article-2-b.md', 'article-1-c.md'].sort(naturalSort), ['article-1-c.md', 'article-2-b.md', 'article-10-a.md']);
  assert.equal(cleanTitle('Article 3: Hello'), 'Hello');
});

test('pictures are found by NAME, in any order they were made, and missing ones are reported', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slots-'));
  try {
    ['L01-P3.png', 'L01-P1.jpg', 'L1-P2.png', 'L02-P1.png', 'Gemini_Generated_Image_x.jpg', 'L02-P2.png.bak'].forEach(f => writeFileSync(join(dir, f), 'x'));
    const keyed = listKeyed([dir]);
    assert.deepEqual([...keyed.keys()].sort(), ['L01-P1', 'L01-P2', 'L01-P3', 'L02-P1']);   // L1-P2 is the same slot as L01-P2
    const { use, missing } = checkKeyed([{ no: 1, count: 3 }, { no: 2, count: 2 }], keyed);
    assert.equal(use.length, 4);
    assert.deepEqual(use.map(p => p.split(/[\\/]/).pop()), ['L01-P1.jpg', 'L1-P2.png', 'L01-P3.png', 'L02-P1.png']); // lesson order, then picture order
    assert.deepEqual(missing, ['L02-P2']);
    assert.equal(slotBase(3, 2), 'L03-P2');
    assert.ok(KEYED_RE.test('L12-P5.JPEG') && !KEYED_RE.test('Gemini_Generated_Image_x.jpg'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('pictures you cut yourself: a folder named after the lesson, in the order of the file names', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slots-'));
  try {
    mkdirSync(join(dir, '04')); mkdirSync(join(dir, 'lesson 5')); mkdirSync(join(dir, 'sheets'));
    ['Screenshot 3.png', 'Screenshot 1.png', 'Screenshot 2.png'].forEach(f => writeFileSync(join(dir, '04', f), 'x'));
    writeFileSync(join(dir, 'lesson 5', 'a.jpg'), 'x'); writeFileSync(join(dir, 'sheets', '01.jpg'), 'x');
    const k = listKeyed([dir]);
    assert.deepEqual([...k.keys()].sort(), ['L04-P1', 'L04-P2', 'L04-P3', 'L05-P1']);
    assert.ok(k.get('L04-P1').endsWith('Screenshot 1.png') && k.get('L04-P3').endsWith('Screenshot 3.png'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('mixed: a lesson with all its named pictures uses them, a lesson with none takes loose ones, a half-done lesson is a problem', () => {
  const keyed = new Map([1, 2, 3, 4, 5].map(k => [slotBase(1, k), `n1-${k}`]).concat([[slotBase(3, 1), 'n3-1']]));
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
  const r = planPictures([{ no: 1, count: 5 }, { no: 2, count: 5 }], keyed, pool);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.use, ['n1-1', 'n1-2', 'n1-3', 'n1-4', 'n1-5', 'a', 'b', 'c', 'd', 'e']);
  assert.equal(r.poolUsed, 5);
  assert.equal(planPictures([{ no: 3, count: 5 }], keyed, pool).problems.length, 1);          // only P1 of lesson 3
  assert.equal(planPictures([{ no: 2, count: 5 }], keyed, pool, true).problems.length, 1);    // strict (picture plan): no loose pictures
  assert.equal(planPictures([{ no: 2, count: 5 }], keyed, ['a', 'b']).problems.length, 1);    // not enough loose pictures
});

import { spreadImages, matchLesson, buildVariants, imageNamesOf } from './merge-variants-lib.mjs';
test('pictures are spread between the paragraphs, in order, every picture once', () => {
  const five = ['001.png', '002.png', '003.png', '004.png', '005.png'].map(n => '00' + n);
  const t6 = Array.from({ length: 6 }, (_, i) => 'Paragraph ' + (i + 1)).join('\n\n');
  const out = spreadImages(t6, five);
  assert.deepEqual(imageNamesOf(out), five);                          // all five, once each, in order
  assert.ok(out.indexOf('Paragraph 1') < out.indexOf(five[0]) && out.indexOf(five[0]) < out.indexOf('Paragraph 2'));
  const t2 = 'First paragraph.\n\nSecond paragraph.';
  const o2 = spreadImages(t2, five);
  assert.deepEqual(imageNamesOf(o2), five); assert.ok(o2.indexOf('Second paragraph.') < o2.indexOf(five[4]));   // fewer paragraphs: some get two
  assert.equal(spreadImages(o2, five), o2.trim());                    // text that has pictures already is left alone
  assert.equal(spreadImages('text', []), 'text');
});
test('a backup lesson is matched to the class lesson by title; two with the same title are not guessed', () => {
  const cls = [{ id: 'a', title: 'စေတသိက်  ၅၂' }, { id: 'b', title: 'Other' }, { id: 'c', title: 'Dup' }, { id: 'd', title: 'dup' }];
  assert.equal(matchLesson({ title: 'စေတသိက် ၅၂' }, cls).id, 'a');
  assert.equal(matchLesson({ title: 'nothing' }, cls), null);
  assert.equal(matchLesson({ title: 'DUP' }, cls).ambiguous.length, 2);
});
test('age versions are added with the lesson pictures; a version the class already has is kept', () => {
  const v = (b, e) => ({ burmese: b, english: e, englishTitle: 'T', quiz: { questions: [1] }, discussionQuestions: ['q'] });
  const lesson = { burmeseContent: 'text\n001346.png\n001347.png', variants: { storytellers: { burmese: 'old', english: 'old' } } };
  const r = buildVariants({ storytellers: v('A\n\nB', 'A\n\nB'), explorers: v('C\n\nD', 'C\n\nD') }, lesson);
  assert.deepEqual(r.added, ['explorers']); assert.deepEqual(r.kept, ['storytellers']);
  assert.equal(r.variants.storytellers.burmese, 'old');
  assert.deepEqual(imageNamesOf(r.variants.explorers.english), ['001346.png', '001347.png']);
  assert.equal(r.variants.explorers.quiz.questions.length, 1);          // everything else of the version is kept as it was
  assert.deepEqual(buildVariants({ storytellers: v('A', 'A') }, lesson, { overwrite: true }).added, ['storytellers']);
});

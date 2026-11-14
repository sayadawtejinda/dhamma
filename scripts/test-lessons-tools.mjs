// Tests for the lesson tools that need no Gemini and no Firebase: the Markdown article reader and the picture names.
// Run:  node --test scripts/test-lessons-tools.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mdToPlain, parseMarkdownArticles, looksLikeMarkdownArticle, cleanTitle, naturalSort } from './article-md.mjs';
import { listKeyed, checkKeyed, slotBase, KEYED_RE } from './picture-slots.mjs';

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

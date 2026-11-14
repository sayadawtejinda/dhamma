// Reads Markdown articles (what Google NotebookLM and similar tools give: "# title", "## sections", "**bold**", "---", tables)
// and turns each article into one plain-text lesson. Used by make-lessons.mjs. No Gemini and no Firebase in here, so it can be tested.
//
//   one file with ONE  "# title"  line  -> one lesson
//   one file with SEVERAL "# title" lines -> one lesson for each
//   no "# title" at all -> one lesson, titled from the file name

// the article's number before the title, "ဆောင်းပါး (၁) - " / "Article 3: ", is not part of the lesson title
const NUMBER_PREFIX = /^(ဆောင်းပါး|article|သင်ခန်းစာ|lesson)\s*\(?\s*[0-9၀-၉]+\s*\)?\s*[-–—:.။]?\s*/i;

export const cleanTitle = (t) => String(t || '').replace(/\*\*|__/g, '').replace(NUMBER_PREFIX, '').trim();

// Markdown -> plain text lines: no #, no **, no ---, tables as lines of " – " separated cells.
export function mdToPlain(md) {
  const out = [];
  for (const raw of String(md || '').replace(/\r/g, '').split('\n')) {
    let line = raw.trimEnd();
    const t = line.trim();
    if (/^([-*_])(\s*\1){2,}$/.test(t)) { out.push(''); continue; }            // --- *** ___
    if (/^\|?[\s:|-]+\|?$/.test(t) && t.includes('-') && t.includes('|')) continue; // table separator row
    if (/^\|.*\|$/.test(t)) { line = t.replace(/^\||\|$/g, '').split('|').map(c => c.trim()).filter(Boolean).join(' – '); }
    line = line.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/^\s*>\s?/, '');
    line = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s).,;:!?။]|$)/g, '$1$2');
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function parseMarkdownArticles(text, fallbackName = 'Lesson') {
  const lines = String(text || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n');
  const articles = [];
  let cur = null;
  let inFence = false;
  for (const raw of lines) {
    if (/^\s*```/.test(raw)) inFence = !inFence;
    const m = !inFence && raw.match(/^#\s+(\S.*)$/);          // exactly one # = an article title (## is a section inside it)
    if (m) { cur = { heading: cleanTitle(m[1]) || fallbackName, body: [] }; articles.push(cur); continue; }
    if (cur) cur.body.push(raw);
    else if (raw.trim()) { cur = { heading: cleanTitle(fallbackName), body: [raw] }; articles.push(cur); }  // text before any title
  }
  return articles.map(a => ({ heading: a.heading, text: mdToPlain(a.body.join('\n')) })).filter(a => a.text.length > 80);
}

// Does this text look like a Markdown article (and not a notebook story file with === or 📖 lines)?
export const looksLikeMarkdownArticle = (text) => {
  const t = String(text || '');
  if (/^\s*===\s*\S/m.test(t) || t.includes('📖')) return false;
  return /^#{1,6}\s+\S/m.test(t);
};

// Natural order of file names: article-2 before article-10.
export const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

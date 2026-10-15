"""Builds the online-reading texts for public/library/ from 'လေ့လာစရာများ.xlsx'.

The sheets hold ready-made HTML fragments (<h2>, <h3>, <p>, <b>, <br> ...), one per row, often with
unbalanced tags (a verse split over several cells, <b>..<br> without a <p>). This script joins the
cells of a column, parses them leniently and writes clean blocks:
    [kind, html]   kind: h2 h3 h4 (headings) | p (paragraph) | v (verse, lines joined by <br>) | pl (Pali paragraph) | q (quote)
plus footnotes ({n: html}) and a table of contents. One JSON file per book in public/library/texts/.
Run:  python scripts/library/build_texts.py
"""
import os, re, json, html, sys
from html.parser import HTMLParser
import openpyxl

DL = os.path.join(os.path.expanduser('~'), 'Downloads')
SRC = os.path.join(DL, 'လေ့လာစရာများ.xlsx')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library', 'texts')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))

MYA = '၀၁၂၃၄၅၆၇၈၉'
def mnum(n): return ''.join(MYA[int(c)] for c in str(n))

# ------------------------------------------------------------------ lenient HTML -> blocks
BLOCK = {'p': 'p', 'div': 'p', 'li': 'p', 'blockquote': 'q', 'h1': 'h2', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'h5': 'h4', 'h6': 'h4'}
INLINE = {'b': 'b', 'strong': 'b', 'i': 'i', 'em': 'i', 'sup': 'sup'}

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []; self.cur = None; self.open_inl = []; self.skip_a = 0; self.a_open = False
    def start_block(self, kind):
        self.end_block(); self.cur = [kind, []]; self.open_inl = []
    def end_block(self):
        if self.cur is None: return
        kind, parts = self.cur
        while self.open_inl: parts.append('</%s>' % self.open_inl.pop())
        h = ''.join(parts)
        self.cur = None
        h = re.sub(r'[ \t\r\n ]+', ' ', h)
        h = re.sub(r'(<br>\s*)+$', '', h); h = re.sub(r'^(\s*<br>)+', '', h)
        h = re.sub(r'\s*<br>\s*', '<br>', h)
        h = re.sub(r'<(b|i|sup)>\s*</\1>', '', h).strip()
        if re.sub(r'<[^>]+>|\s', '', h): self.blocks.append([kind, h])
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in BLOCK: self.start_block(BLOCK[tag]); return
        if tag == 'br':
            if self.cur is not None: self.cur[1].append('<br>')
            return
        if tag == 'a':
            href, name = a.get('href', ''), a.get('name', '')
            if re.fullmatch(r'#\d+', href) and re.fullmatch(r'a\d+', name):      # footnote marker in the text
                if self.cur is None: self.start_block('p')
                self.cur[1].append('\x01%s\x02' % href[1:]); self.skip_a = 1; return
            if re.fullmatch(r'#a\d+', href) and re.fullmatch(r'\d+', name):      # footnote definition label
                self.skip_a = 1; self.cur and None; return
            if href.startswith('http'):
                if self.cur is None: self.start_block('p')
                self.cur[1].append('<a href="%s" target="_blank" rel="noopener">' % html.escape(href, quote=True)); self.a_open = True
            return
        if tag in INLINE:
            if self.cur is None: self.start_block('p')
            t = INLINE[tag]; self.cur[1].append('<%s>' % t); self.open_inl.append(t)
    def handle_endtag(self, tag):
        if tag in BLOCK: self.end_block(); return
        if tag == 'a':
            if self.skip_a: self.skip_a = 0; return
            if self.a_open and self.cur is not None: self.cur[1].append('</a>'); self.a_open = False
            return
        if tag in INLINE:
            t = INLINE[tag]
            if t in self.open_inl and self.cur is not None:
                while self.open_inl:
                    x = self.open_inl.pop(); self.cur[1].append('</%s>' % x)
                    if x == t: break
    def handle_data(self, d):
        if self.skip_a: return
        if self.cur is None:
            if not d.strip(): return
            self.start_block('p')
        self.cur[1].append(html.escape(d, quote=False))
    def close(self):
        super().close(); self.end_block()

def parse(cells):
    p = P(); p.feed('\n'.join(str(c) for c in cells if c not in (None, ''))); p.close(); return p.blocks

# ------------------------------------------------------------------ post-processing
PART = re.compile(r'သည်|၏|ကို|မှာ|တယ်|ပါ|ကုန်|၌|၍|နှင့်|များ|တို့|ဖြစ်|ရှိ|၍|လည်း|ပြီး|သော|သူ|ဟု|အား|မှ|ကား|လေ|ရာ|ခြင်း|လို|ပေါ့|နော်')
def is_pali(t):
    txt = re.sub(r'<[^>]+>', '', t)
    if len(txt) < 25 or re.search(r'[a-zA-Z]{4}', txt): return False
    if '=' in txt or '....' in txt or re.match(r'^[၀-၉]+[-၊ ]', txt): return False
    words = txt.split()
    if not words: return False
    mya = sum(1 for w in words if PART.search(w))
    return mya / len(words) < .12 and bool(re.search('[္ံ]', txt))

def refine(blocks):
    out = []
    for k, h in blocks:
        if k == 'p':
            lines = h.split('<br>')
            bold = [l for l in lines if re.fullmatch(r'\s*<b>.*</b>\s*', l)]
            if len(lines) >= 2 and len(bold) >= .6 * len(lines) and max(len(re.sub('<[^>]+>', '', l)) for l in lines) < 160:
                out.append(['v', '<br>'.join(re.sub(r'</?b>', '', l).strip() for l in lines)]); continue
            if is_pali(h) and '<br>' not in h: out.append(['pl', h]); continue
        out.append([k, h])
    return out

def plain(h): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', h)).strip()

CH = 1000   # blocks per chunk file
def paginate(blocks):
    """Virtual pages (the texts have no page numbers): break before a chapter heading, before a section heading
    once the page is big enough, and at the latest when it gets too long."""
    starts, n, chars = [0], 0, 0
    for i, (k, h) in enumerate(blocks):
        if i and ((k == 'h2' and n >= 3) or (k in ('h3', 'h4') and (n >= 45 or chars > 5000)) or n >= 90 or chars > 9000):
            starts.append(i); n = 0; chars = 0
        n += 1; chars += len(h)
    return starts

def finish(bid, title, group, blocks, fn=None, extra=None):
    blocks = refine(blocks)
    toc = [[i, int(k[1]), plain(h)[:90]] for i, (k, h) in enumerate(blocks) if k in ('h2', 'h3', 'h4')]
    chars = sum(len(plain(h)) for k, h in blocks)
    pages = paginate(blocks)
    meta = dict(id=bid, title=title, group=group, n=len(blocks), chunk=CH, pages=pages, toc=toc, fn=fn or {}, chars=chars)
    if extra: meta.update(extra)
    json.dump(meta, open(os.path.join(OUT, bid + '.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    for k in range(0, (len(blocks) + CH - 1) // CH):
        json.dump(blocks[k * CH:(k + 1) * CH], open(os.path.join(OUT, '%s.%d.json' % (bid, k)), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    return dict(id=bid, title=title, group=group, chars=chars, blocks=len(blocks), toc=len(toc), pages=len(pages), **(extra or {}))

def split_h2(blocks):
    parts, cur = [], None
    for b in blocks:
        if b[0] == 'h2':
            cur = [b, []]; parts.append(cur)
        elif cur is None:
            cur = [None, [b]]; parts.append(cur)
        else: cur[1].append(b)
    return parts

# ------------------------------------------------------------------ build
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
def col_cells(name, col=0):
    return [r[col] if len(r) > col else None for r in wb[name].iter_rows(values_only=True)]
index = []

NIB = ['နိဗ္ဗာ-၁', 'နိဗ္ဗာ-၂', 'နိဗ္ဗာ-၃', 'နိဗ္ဗာ-၄', 'နိဗ္ဗာ-၅']
for i, n in enumerate(NIB, 1):
    bl = parse(col_cells(n))
    title = plain(bl[0][1]) if bl and bl[0][0] == 'h2' else n
    index.append(finish('nib%d' % i, title, 'နိဗ္ဗာန်ရောက်ကြောင်း ကျင့်စဉ် (၅ တွဲ)', bl[1:] if bl and bl[0][0] == 'h2' else bl))
    print(n, index[-1]['blocks'], 'blocks')

for sheet, gid, group in (('နိဗ္ဗာ-သေး', 'nibp', 'ကျင့်စဉ် - ပိုင်းလိုက် စာအုပ်ငယ်များ'), ('စာအုပ်သေး', 'bk', 'စာအုပ်ငယ်များ')):
    parts = split_h2(parse(col_cells(sheet)))
    seen = {}
    for j, (h, body) in enumerate(parts, 1):
        title = plain(h[1]) if h else sheet
        seen[title] = seen.get(title, 0) + 1
        t2 = title + (' (%s)' % mnum(seen[title])) if seen[title] > 1 else title
        index.append(finish('%s%02d' % (gid, j), t2, group, body))
    print(sheet, len(parts), 'books')

# talk transcript (single sheet)
bl = parse(col_cells('သေရာညောင်စောင်း'))
bl = [b for b in bl if not (b[0] == 'p' and plain(b[1]) in ('', 'sutta'))]
title = plain(bl[0][1]) if bl and bl[0][0] == 'h2' else 'သေရာညောင်စောင်း'
index.append(finish('talk-sayanaung', title, 'တရားဒေသနာ စာသား (တရားတော်ကို စာပြန်ရေးထားခြင်း)', bl[1:] if bl and bl[0][0] == 'h2' else bl, extra=dict(sermonMatch='ပဗ္ဗဇိတအဘိဏှသုတ္တန်')))

# Mangala talks: every column is one tape (ခွေ)
ws = wb['ပြင်ရန်လိုသေး']
rows = [list(r) for r in ws.iter_rows(values_only=True)]
ncol = max(len(r) for r in rows)
blocks = []
for c in range(ncol):
    cells = [r[c] if len(r) > c else None for r in rows]
    if not any(x not in (None, '') for x in cells): continue
    head = plain(re.sub(r'<[^>]+>', ' ', str(cells[0]))) if cells[0] else ''
    chapter = len([b for b in blocks if b[0] == 'h2']) + 1
    blocks.append(['h2', 'ခွေ %s - %s' % (mnum(chapter), head)])
    blocks.extend(parse(cells[1:]))
index.append(finish('talk-mangala', 'မင်္ဂလသုတ္တန် ဟောစဉ် (ခွေအလိုက် စာသား)', 'တရားဒေသနာ စာသား (တရားတော်ကို စာပြန်ရေးထားခြင်း)', blocks, extra=dict(sermonMatch='မင်္ဂလသုတ္တန်', tapeChapters=True)))
print('mangala chapters', index[-1]['toc'])

# Ekayana (text in column A, footnotes in column B)
A = parse(col_cells('တစ်ကြောင်းတည်း', 0))
Bcells = col_cells('တစ်ကြောင်းတည်း', 1)
fnhtml = '\n'.join(str(c) for c in Bcells if c not in (None, ''))
fns = {}
for m in re.finditer(r'<a href="#a(\d+)" name="\1">\s*\[[^\]]*\]\s*</a>(.*?)(?=<a href="#a\d+" name="\d+">|\Z)', fnhtml, re.S):
    body = P(); body.feed(m.group(2)); body.close()
    txt = '<br>'.join(h for k, h in body.blocks)
    fns[m.group(1)] = txt
print('footnotes', len(fns))
title = 'နိဗ္ဗာန်သို့ သွားရာ တစ်ကြောင်းတည်းသောလမ်း'
if A and A[0][0] == 'h2': A = A[1:]
index.append(finish('ekayana', title, 'တစ်ကြောင်းတည်းသောလမ်း', A, fn=fns))

json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('books', len(index), 'total chars', sum(b['chars'] for b in index))
for b in index: print(' ', b['id'], b['title'][:40], b['blocks'], b['toc'], round(b['chars'] / 1e3), 'k')

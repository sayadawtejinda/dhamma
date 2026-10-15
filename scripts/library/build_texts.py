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

BURM_END = re.compile(r'(သည်|၏|ကို|မှာ|တယ်|ကုန်|၌|၍|နှင့်|များ|တို့|ဖြစ်|ရှိ|လည်း|ပြီး|သော|ဟု|အား|ကား|ခြင်း|လို|ပေါ့|နော်|ပါ|မယ်|ဘူး|ရ|လဲ|ကြ|၀|ဝါ)$')
def pali_words(ws):
    if not ws: return False
    ok = sum(1 for w in ws if not BURM_END.search(w))
    return ok >= 1 and ok / len(ws) >= .5

# "Pali head = Myanmar meaning" units (nissaya): bold the Pali head, one unit per line
HEAD = re.compile(r'(^|<br[^>]*>|(?<=။) |(?<=၊) )((?:[၀-၉]+။ ?)?)([^\s=။၊<>]+(?: [^\s=။၊<>]+){0,4})( = )')
def nissaya(h):
    if ' = ' in h:
        def f(m):
            if not pali_words(m.group(3).split(' ')): return m.group(0)
            return '%s%s%s%s' % (m.group(1), m.group(2), m.group(3), m.group(4))
        h = HEAD.sub(f, h)
        h = re.sub(r'(?<![၀-၉]။)(?<=။) (?=(?:[၀-၉]+။ ?)?)', ' <br class="a">', h)
        h = h.replace('', '<b>').replace('', '</b>')
    # old-style units "<b>Pali</b>၊ meaning။ <b>Pali</b>၊ meaning" already bold in the source
    h = re.sub(r'(?<=။) (?=<b>[^<]{1,60}</b>၊)', ' <br class="a">', h)
    return h

# numbered items inside a paragraph: ၁။ ၂။ / (၁) (၂) / (က) (ခ) after '။' '၊' or ':' go on new lines
ITEM = re.compile(r'(?<=[။၊:]) (?=(?:[၀-၉]{1,3}။|\([၀-၉]{1,3}\)|\([က-အ]\)) )')
def items(h): return ITEM.sub(' <br class="a">', h)

def heading_like(t):
    t = t.strip()
    if not 3 <= len(t) <= 60 or ' = ' in t or re.match(r'^([၀-၉]+။|\([၀-၉က-အ]+\)|[၀-၉]+-[၀-၉]+။)', t): return False
    if re.search(r'[။၊]$', t) or t.count(' ') > 7 or re.search(r'\.{3,}', t): return False
    if re.search(r'(တယ်|ဘူး|ပါတယ်|မယ်|၏|သည်|ပါသည်|ပါမယ်)$', t): return False
    return True
LEAD = re.compile(r'^(.{2,45}?) ?(-{2,}|—|:) (?=\S)')

def refine(blocks):
    out, i = [], 0
    while i < len(blocks):
        k, h = blocks[i]
        if k == 'p':
            t = plain(h)
            if re.search(r'\.{4,}', t):                                  # contents-style lines "title ........ page"
                grp = [h]
                while i + 1 < len(blocks) and blocks[i + 1][0] == 'p' and re.search(r'\.{4,}', plain(blocks[i + 1][1])):
                    i += 1; grp.append(blocks[i][1])
                out.append(['p', '<br>'.join(grp)]); i += 1; continue
            lines = h.split('<br>')
            bold = [l for l in lines if re.fullmatch(r'\s*<b>.*</b>\s*', l)]
            if len(lines) >= 2 and len(bold) >= .6 * len(lines) and max(len(re.sub('<[^>]+>', '', l)) for l in lines) < 160:
                out.append(['v', '<br>'.join(re.sub(r'</?b>', '', l).strip() for l in lines)]); i += 1; continue
            if is_pali(h) and '<br>' not in h: out.append(['pl', h]); i += 1; continue
            if re.search(r'(-{2,}|:)$', t.strip()) and len(t) <= 70 and '=' not in t:
                out.append(['sh', h]); i += 1; continue
            if heading_like(t) and len(t) <= 45 and '။' not in t and not re.fullmatch(r'[\W_–—-]+', t) and not (t[0] in '“"‘(' ):
                out.append(['sh', t]); i += 1; continue
            m = LEAD.match(t)
            if m and '<' not in h[:60] and m.group(2).startswith('-'):    # "term --- explanation"
                out.append(['sh', m.group(1) + ' ' + m.group(2)]); h = h[len(m.group(0)):]
            h = nissaya(items(h))
            out.append(['p', h]); i += 1; continue
        if k == 'q':
            out.append(['q', nissaya(items(h))]); i += 1; continue
        out.append([k, h]); i += 1
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
# source rows per sheet: the workbook if it is in Downloads, otherwise the copy of the needed sheets saved earlier (study.pkl)
PKL = os.path.join(os.environ.get('TEMP', ''), 'study.pkl')
_rows = {}
def ROWS(name):
    if name not in _rows:
        if os.path.exists(SRC):
            wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
            for n in wb.sheetnames:
                if n in SHEETS: _rows[n] = [list(r) for r in wb[n].iter_rows(values_only=True)]
        else:
            import pickle
            _rows.update(pickle.load(open(os.path.abspath(PKL), 'rb')))
    return _rows[name]
SHEETS = ['နိဗ္ဗာ-၁', 'နိဗ္ဗာ-၂', 'နိဗ္ဗာ-၃', 'နိဗ္ဗာ-၄', 'နိဗ္ဗာ-၅', 'နိဗ္ဗာ-သေး', 'စာအုပ်သေး', 'ပြင်ရန်လိုသေး', 'သေရာညောင်စောင်း', 'တစ်ကြောင်းတည်း']
ROWS('နိဗ္ဗာ-၁')
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))      # only after the source was read
def col_cells(name, col=0):
    return [r[col] if len(r) > col else None for r in ROWS(name)]
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
index.append(finish('talk-sayanaung', title, 'တရားဒေသနာ စာသား (တရားတော်ကို စာပြန်ရေးထားခြင်း)', bl[1:] if bl and bl[0][0] == 'h2' else bl, extra=dict(sermonId=next((x['id'] for x in json.load(open(os.path.join(OUT, '..', 'data', 'sermons.json'), encoding='utf8')) if 'ပဗ္ဗဇိတအဘိဏှ' in x['title']), None))))

# Talk transcripts: every column of the sheet is one tape (ခွေ). Tapes 1-97 are the Mangala sutta talks (one book);
# every later column is a different sutta, so each becomes its own book.
import difflib
SER = json.load(open(os.path.join(OUT, '..', 'data', 'sermons.json'), encoding='utf8'))
SKEY = re.compile(r'တရားဒေသနာတော်|တရားတော်|သုတ္တန်|သုတ်|အပါဒါန်|အပဒါန်|[()၀-၉ဝ\s-]')
def skey(t): return SKEY.sub('', re.sub(r'\([^)]*\)', '', t.replace('စျာန', 'ဈာန')))
SKEY = re.compile(SKEY.pattern.replace('သုတ္တန်|', 'သုတ္တန်|ပထမပိုင်း|'))
def sermon_id(title):
    best, bs = None, 0
    for s in SER:
        r = difflib.SequenceMatcher(None, skey(title), skey(s['title'])).ratio()
        if r > bs: best, bs = s, r
    return best['id'] if best and bs >= .6 else None
GROUP_T = 'တရားဒေသနာ စာသား (တရားတော်ကို စာပြန်ရေးထားခြင်း)'
rows = ROWS('ပြင်ရန်လိုသေး')
ncol = max(len(r) for r in rows)
mang, tape = [], 0
for c in range(ncol):
    cells = [r[c] if len(r) > c else None for r in rows]
    if not any(x not in (None, '') for x in cells): continue
    tape += 1
    head = plain(re.sub(r'<[^>]+>', ' ', str(cells[0]))) if cells[0] else ''
    if tape <= 97:
        mang.append(['h2', 'ခွေ %s - %s' % (mnum(tape), head)])
        mang.extend(parse(cells[1:]))
    else:
        title = re.sub(r'\s*တရားဒေသနာတော်$', '', head)
        sid = sermon_id(title)
        index.append(finish('talk-%03d' % tape, '%s (ခွေ %s)' % (title, mnum(tape)), GROUP_T, parse(cells[1:]), extra=dict(sermonId=sid) if sid else None))
msid = next(s['id'] for s in SER if s['title'] == 'မင်္ဂလသုတ္တန်')
index.insert(len(index) - (tape - 97), finish('talk-mangala', 'မင်္ဂလသုတ္တန် ဟောစဉ် (ခွေ ၁ - ၉၇)', GROUP_T, mang, extra=dict(sermonId=msid, tapeChapters=True)))
print('talk books', tape - 97 + 1)

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

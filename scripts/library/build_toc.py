"""Reads the table of contents (မာတိကာ) at the front of every book PDF and writes public/library/data/toc.json
so the library can search all the contents pages at once and open the PDF at the right page.

The PDFs use old 'Win Innwa'-family fonts (text layer is Latin-looking characters), so the text is converted
to Unicode with python-myanmar (pip install python-myanmar). Printed page numbers differ from PDF page
numbers (cover, contents ...), so the offset is found per book from the page numbers printed on the pages.
Run after build_library.py:  python scripts/library/build_toc.py
"""
import os, re, json, collections, sys
import pymupdf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toc_clean import fix, garbage
from myanmar import converter

LIB = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library')
B = json.load(open(os.path.join(LIB, 'data', 'books.json'), encoding='utf8'))
MYD = '၀၁၂၃၄၅၆၇၈၉'
def to_int(s):
    s = s.strip()
    return int(''.join(str(MYD.index(c)) if c in MYD else c for c in s))
NUM = re.compile(r'^[0-9၀-၉]{1,4}$')
LET = 'က-အဣ-ဲံ-ှ'

def conv(t): return converter.convert(t, 'wininnwa', 'unicode')
GARBLE = [('၀d', 'ဝိ'), ('၀D', 'ဝီ'), ('၀g', 'ဝါ'), ('၀m', 'ဝါ'), ('ဝd', 'ဝိ'), ('ဝD', 'ဝီ'), ('ဝg', 'ဝါ'),
          ('d', 'ိ'), ('D', 'ီ'), ('m', 'ာ'), ('g', 'ါ')]
def clean(t):
    t = t.replace('​', '')
    t = re.sub(r'\d?_[LR]', '', t)
    for a, b in GARBLE:
        t = re.sub(r'(?<=[က-႟])' + re.escape(a), b, t) if len(a) == 1 else t.replace(a, b)
    t = re.sub(r'(?<=[%s])၀|၀(?=[%s])' % (LET, LET), 'ဝ', t)        # zero used as the letter wa
    t = re.sub(r'[\]\[\{\}]{2}|\{\{|\}\}', '', t)
    t = re.sub(r'[.·…\-_]{3,}', ' ', t)                                  # dot leaders
    t = re.sub(r'\s+', ' ', t).strip(' .-၊')
    return t

CHK_DROP = re.compile("[A-Za-z\\s​၊။.,()\\[\\]\\-_:;'\"0-9၀-၉]+")
def chk(t): return CHK_DROP.sub('', t)      # letters only: used to find a contents title on its PDF page
def is_unicode(s): return sum(1 for c in s if 'က' <= c <= '႟') > .5 * max(1, len(re.sub(r'\W', '', s)))

def offset(doc):
    """printed page number sits in the running header/footer: at the start or end of the first or last line"""
    votes = collections.Counter()
    for j in range(len(doc)):
        lines = [l.strip() for l in doc[j].get_text().splitlines() if l.strip()]
        if not lines: continue
        cands = set()
        for l in (lines[0], lines[-1]):
            for m in (re.match(r'^(\d{1,4})(?:\s|$)', l), re.search(r'(?:^|\s)(\d{1,4})$', l)):
                if m: cands.add(int(m.group(1)))
        for n in cands:
            if 0 < n <= len(doc) + 5: votes[j + 1 - n] += 1
    if not votes: return None, 0
    off, n = votes.most_common(1)[0]
    return (off, n) if n >= max(6, len(doc) // 8) else (None, n)

def page_map(doc):
    """printed page number -> PDF page, read from the page numbers printed in the running headers/footers.
    The offset is not constant in a book (plates, pages that were split, double pages ...), so every printed number
    is mapped through the PDF pages that really carry it; numbers between two known pages are interpolated."""
    pairs = []
    for j in range(len(doc)):
        lines = [l.strip() for l in doc[j].get_text().splitlines() if l.strip()]
        if not lines: continue
        c = set()
        for l in (lines[0], lines[-1]):
            for m in (re.match(r'^(\d{1,4})(?:\s|$)', l), re.search(r'(?:^|\s)(\d{1,4})$', l)):
                if m: c.add(int(m.group(1)))
        for n in c:
            if 0 < n <= len(doc) + 5: pairs.append((j + 1, n))
    # offsets (PDF page - printed number) drift only by a few pages inside a book: drop the pairs that are far from the
    # typical offset (chapter numbers, dates, index pages), then estimate the offset locally for every printed number
    offs = sorted(pj - n for pj, n in pairs)
    if len(offs) < 6: return None
    med = offs[len(offs) // 2]
    good = sorted({(n, pj) for pj, n in pairs if abs(pj - n - med) <= 12})
    if len(good) < 6: return None
    import bisect
    ns = [n for n, pj in good]; of = [pj - n for n, pj in good]
    def f(n):
        k = bisect.bisect_left(ns, n)
        lo, hi = max(0, k - 3), min(len(ns), k + 3)
        near = sorted(of[lo:hi])
        return max(1, min(len(doc), n + near[len(near) // 2]))
    return f

def toc_entries(doc):
    """(title, printed page) from the contents pages at the front (the first ~30 pages)."""
    ents, buf = [], []
    last_toc = -9
    for j in range(min(30, len(doc))):
        raw = [l.strip() for l in doc[j].get_text().splitlines() if l.strip()]
        nums = sum(1 for l in raw if NUM.fullmatch(l))
        trail = sum(1 for l in raw if re.search(r'(\.{3,}|\s{2,}|\s)[0-9]{1,4}$', l))
        if nums + trail < 6: continue
        last_toc = j
        for l in raw:
            m = None
            if NUM.fullmatch(l): m = (' '.join(buf), l); buf = []
            else:
                mm = re.match(r'^(.*?)(?:\.{2,}|\s{2,}|\s)([0-9၀-၉]{1,4})$', l)
                if mm and mm.group(1).strip():
                    m = (' '.join(buf + [mm.group(1)]), mm.group(2)); buf = []
                else: buf.append(l)
            if m and m[0].strip():
                ents.append((m[0], m[1]))
    return ents

out, report, dropped = [], [], []
for bi, b in enumerate(B):
    f = os.path.join(LIB, 'books', b['id'] + '.pdf')
    doc = pymupdf.open(f)
    off, votes = offset(doc)
    pmap = page_map(doc)
    rows, src = [], ''
    outline = doc.get_toc()
    if outline and len(outline) >= 5:
        src = 'outline'
        for lvl, title, pg in outline:
            t0 = clean(title if is_unicode(title) else conv(title))
            t, orig = fix(t0, b['title'])
            if t and pg >= 1: rows.append((t, pg, lvl, orig, t0, pg))
    else:
        src = 'contents'
        for t, p in toc_entries(doc):
            tt0 = clean(t if is_unicode(t) else conv(t))
            tt, orig = fix(tt0, b['title'])
            if not tt or re.match(r'^မာတိကာ|.* -- ', tt) or len(tt) < 2: continue
            try: pn = to_int(p)
            except ValueError: continue
            pg = pn + (off if off is not None else 0)          # kept as the line's stable identity (together with its title)
            mp = pmap(pn) if pmap else pg
            if garbage(tt) or len(re.findall('[A-Za-z]', tt)) > max(1, len(tt) // 12):      # still garbled after conversion: not usable
                dropped.append([bi, tt[:200], pn]); continue
            if 1 <= pg <= len(doc): rows.append((tt, pg, 1, orig, tt0, mp))
    cache = {}
    def ptext(j):
        if j not in cache: cache[j] = chk(conv(doc[j].get_text())) if 0 <= j < len(doc) else ''
        return cache[j]
    for t, pg, lvl, orig, t0, mp in rows:
        keys = [k for k in {chk(t)[:7], chk(t0)[:7]} if len(k) >= 4]
        shift = 9
        if src == 'contents' and keys:
            shift = None
            for dj in (0, 1, -1, 2, -2):
                if any(k in ptext(mp - 1 + dj) for k in keys): shift = dj; break
        base = mp + (shift if isinstance(shift, int) and shift != 9 else 0)       # where the title is really found, else the mapped page
        out.append([bi, t, pg, lvl, 0 if isinstance(shift, int) and shift != 9 else shift, orig or 0, max(1, min(len(doc), base))])
    report.append((b['id'], b['title'][:24], src, len(rows), off, votes))
# corrections made by hand in public/library/toc-review.html (exported as toc_corrections.json, kept next to this script)
FIX = os.path.join(os.path.dirname(__file__), 'toc_corrections.json')
if os.path.exists(FIX):
    ids = [b['id'] for b in B]
    _fx = json.load(open(FIX, encoding='utf8'))
    fixes = {(c['book'], c['page'], c['title']): c for c in _fx['corrections']}
    steps = _fx.get('steps', {})            # per book: [[fromPage, delta], ...] every line from that (base) page downward moves by delta
    kept, n_edit, n_del = [], 0, 0
    for bi, t, pg, lvl, sh, ao, base in out:
        c = fixes.get((ids[bi], pg, t))
        if c and c['status'] == 'del': n_del += 1; continue
        nb = base + sum(d for fr, d in steps.get(ids[bi], []) if base >= fr)
        if c and c.get('page_delta'): nb += c['page_delta']
        if c and c['status'] == 'edit': t = c.get('new_title') or t; n_edit += 1
        kept.append([bi, t, pg, lvl, sh, ao, max(1, nb)])
    out = kept
    print('hand corrections applied: edited', n_edit, 'deleted', n_del)
json.dump(dict(books=[b['id'] for b in B], toc=out), open(os.path.join(LIB, 'data', 'toc.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(dropped, open(os.path.join(os.path.dirname(__file__), 'toc_dropped.json'), 'w', encoding='utf8'), ensure_ascii=False)
print('garbled lines dropped (kept in scripts/library/toc_dropped.json):', len(dropped))
for r in report: print(r)
print('entries', len(out), 'books with entries', len({r[0] for r in out}))
left = collections.Counter(re.findall(r'[A-Za-z]', ''.join(o[1] for o in out)))
print('leftover latin letters in titles:', sum(left.values()), left.most_common(12))

"""Builds the data for public/library/ (Pa-Auk sermon + book library).

Reads the user's local folders (Downloads/Paauk_MP3_1, Paauk_MP3_2, ဖားအောက်တောရဆရာတော်)
and writes sermons.json, books.json, covers and the PDF books. Run again after the
folders change:  python scripts/library/build_library.py
"""
import os, re, json, shutil, sys, hashlib
import openpyxl, pymupdf
from mutagen.mp3 import MP3

DL = os.path.join(os.path.expanduser('~'), 'Downloads')
MP3_DIRS = [os.path.join(DL, 'Paauk_MP3_1'), os.path.join(DL, 'Paauk_MP3_2')]
BOOK_DIR = os.path.join(DL, 'ဖားအောက်တောရဆရာတော်')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library')
os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'books'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'covers'), exist_ok=True)

DIG = '၀၁၂၃၄၅၆၇၈၉'
def mm(s): return int(''.join(str(DIG.index(c)) if c in DIG else c for c in str(s)))

BOOKS_ONLY = '--books-only' in sys.argv   # keep sermons.json as it is (fast)

if not BOOKS_ONLY:
    # ---- audio files (track number is the first 5 digits of the file name)
    files = {}
    for d in MP3_DIRS:
        for f in os.listdir(d):
            if f.lower().endswith('.mp3'):
                files[int(f[:5])] = os.path.join(d, f)

    def info(n):
        p = files.get(n)
        if not p: return None
        try: dur = round(MP3(p).info.length)
        except Exception: dur = 0
        return [n, os.path.basename(p), dur, os.path.getsize(p)]

    # ---- sermon list (Unicode sheet of Mp3 list.xlsx): sermons run in order, 'ခွေပေါင်း' = number of tracks
    wb = openpyxl.load_workbook(os.path.join(MP3_DIRS[0], 'Mp3 list.xlsx'), data_only=True)
    rows = [r for r in wb['Sheet1'].iter_rows(values_only=True)][1:]
    sermons, cur = [], 1
    for r in rows:
        if not r[4]: continue
        cnt = mm(r[5])
        tr = [t for t in (info(n) for n in range(cur, cur + cnt)) if t]
        sermons.append(dict(id=len(sermons) + 1, no=str(r[3]).strip(), title=str(r[4]).strip(), expected=cnt, tracks=tr))
        cur += cnt
    last = cur - 1
    # tracks after the list (extra talks); grouped by the file-name code
    extra = {}
    for n in sorted(files):
        if n > last:
            code = re.sub(r'\d*\.mp3$', '', os.path.basename(files[n])[5:], flags=re.I)
            extra.setdefault(code, []).append(info(n))
    for code, tr in extra.items():
        sermons.append(dict(id=len(sermons) + 1, no='', title='ထပ်ဆောင်း - ' + code, expected=len(tr), tracks=tr, extra=True))
    json.dump(sermons, open(os.path.join(OUT, 'data', 'sermons.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('sermons', len(sermons), 'tracks', sum(len(s['tracks']) for s in sermons))


def split_spreads(src, dst):
    """Some PDFs have two book pages side by side on one PDF page (a 'spread'), mixed with single pages, which
    breaks page numbers. Every spread (an unrotated page about twice as wide as the book's usual page) is split
    into a left and a right page. Returns the number of spreads split; the file is copied as it is when none."""
    doc = pymupdf.open(src)
    sizes = [(round(p.rect.width), round(p.rect.height)) for p in doc if p.rotation == 0]
    if not sizes:
        shutil.copyfile(src, dst); return 0
    bw, bh = max(set(sizes), key=sizes.count)
    if bw > bh * 1.05:                 # the usual page is itself landscape: nothing to split
        shutil.copyfile(src, dst); return 0
    todo = [i for i, p in enumerate(doc) if p.rotation == 0 and abs(p.rect.width - 2 * bw) < .12 * 2 * bw and abs(p.rect.height - bh) < .12 * bh]
    if not todo:
        shutil.copyfile(src, dst); return 0
    for i in reversed(todo):
        r = doc[i].rect
        doc.fullcopy_page(i, i + 1)
        doc[i].set_cropbox(pymupdf.Rect(0, 0, r.width / 2, r.height))
        doc[i + 1].set_cropbox(pymupdf.Rect(r.width / 2, 0, r.width, r.height))
    doc.save(dst, garbage=3, deflate=True)
    return len(todo)

# ---- books
if not os.path.isdir(BOOK_DIR):
    print('book source folder not found - keeping the books already in public/library/books'); sys.exit(0)
books = []
for d in ('books', 'covers'):   # start clean, so deleted/renamed books disappear
    for f in os.listdir(os.path.join(OUT, d)): os.remove(os.path.join(OUT, d, f))
for i, f in enumerate(sorted(x for x in os.listdir(BOOK_DIR) if x.lower().endswith('.pdf')), 1):
    src = os.path.join(BOOK_DIR, f)
    bid = 'b' + hashlib.md5(f[:-4].encode('utf8')).hexdigest()[:6]   # stable id: does not shift when a book is removed
    dst = os.path.join(OUT, 'books', bid + '.pdf')
    split = split_spreads(src, dst)
    pages = 0
    try:
        doc = pymupdf.open(dst); pages = len(doc)
        pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(0.5, 0.5))
        pix.save(os.path.join(OUT, 'covers', bid + '.jpg'), jpg_quality=62)
    except Exception as e:
        print('cover failed', f, e)
    books.append(dict(id=bid, title=f[:-4], pages=pages, mb=round(os.path.getsize(dst) / 1e6, 1), split=split))
    if split: print('split', split, 'spreads in', f)
json.dump(books, open(os.path.join(OUT, 'data', 'books.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('books', len(books))

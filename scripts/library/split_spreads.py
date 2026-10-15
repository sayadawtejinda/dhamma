"""Splits 'spreads' (two book pages side by side on one landscape PDF page) of the PDFs in public/library/books, in place.

A landscape page is split only when a picture of it shows an empty vertical strip in the middle (the gutter) with
text on both sides. A single page printed landscape (title page, wide table) has ink across the middle, so it is kept.
Works for rotated pages too. Safe to run again: pages that were split are portrait afterwards.
   python scripts/library/split_spreads.py            (then: python scripts/library/build_toc.py)
"""
import os, sys, json
import pymupdf

LIB = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library')
B = json.load(open(os.path.join(LIB, 'data', 'books.json'), encoding='utf8'))

def is_spread(page):
    r = page.rect
    if r.width < r.height * 1.25: return False                     # portrait or nearly square: one page
    zoom = 0.5
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csGRAY)
    w, h, n = pix.width, pix.height, pix.n
    s = pix.samples
    dark = [0] * w                                                 # dark pixels per column
    for y in range(h):
        row = s[y * w * n:(y + 1) * w * n:n]
        for x in range(w):
            if row[x] < 140: dark[x] += 1
    mid = w // 2
    band = range(int(w * 0.46), int(w * 0.54) + 1)
    gutter = sum(dark[x] for x in band) <= 0.004 * h * len(band)       # (almost) nothing in the middle strip
    left, right = sum(dark[:int(w * 0.46)]), sum(dark[int(w * 0.54):])
    ink = lambda v: v > 0.01 * h * w * 0.46 * 0.25
    return gutter and ink(left) and ink(right)

changed = 0
for b in B:
    f = os.path.join(LIB, 'books', b['id'] + '.pdf')
    doc = pymupdf.open(f)
    todo = [i for i, p in enumerate(doc) if is_spread(p)]
    if not todo: continue
    for i in reversed(todo):
        page = doc[i]
        r = page.rect
        left = pymupdf.Rect(0, 0, r.width / 2, r.height) * page.derotation_matrix
        right = pymupdf.Rect(r.width / 2, 0, r.width, r.height) * page.derotation_matrix
        doc.fullcopy_page(i, i + 1)
        doc[i].set_cropbox(left.normalize())
        doc[i + 1].set_cropbox(right.normalize())
    tmp = f + '.tmp'
    doc.save(tmp, garbage=3, deflate=True); doc.close()
    os.replace(tmp, f)
    n = len(pymupdf.open(f))
    b['pages'] = n; b['mb'] = round(os.path.getsize(f) / 1e6, 1); b['split'] = b.get('split', 0) + len(todo)
    changed += 1
    print('split', len(todo), 'spreads in', b['title'], '->', n, 'pages')
if changed:
    json.dump(B, open(os.path.join(LIB, 'data', 'books.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('books changed:', changed)

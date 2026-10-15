"""Splits 'spreads' (two book pages side by side on one PDF page) of the PDFs in public/library/books, in place.
Safe to run again: after the split no spread is left.   python scripts/library/split_spreads.py
Then run build_toc.py (PDF page numbers change) and match_covers.py is not needed (covers are kept).
"""
import os, json, pymupdf
LIB = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library')
B = json.load(open(os.path.join(LIB, 'data', 'books.json'), encoding='utf8'))
for b in B:
    f = os.path.join(LIB, 'books', b['id'] + '.pdf')
    doc = pymupdf.open(f)
    sizes = [(round(p.rect.width), round(p.rect.height)) for p in doc if p.rotation == 0]
    if not sizes: continue
    bw, bh = max(set(sizes), key=sizes.count)
    if bw > bh * 1.05: continue
    todo = [i for i, p in enumerate(doc) if p.rotation == 0 and abs(p.rect.width - 2 * bw) < .12 * 2 * bw and abs(p.rect.height - bh) < .12 * bh]
    if not todo: continue
    for i in reversed(todo):
        r = doc[i].rect
        doc.fullcopy_page(i, i + 1)
        doc[i].set_cropbox(pymupdf.Rect(0, 0, r.width / 2, r.height))
        doc[i + 1].set_cropbox(pymupdf.Rect(r.width / 2, 0, r.width, r.height))
    tmp = f + '.tmp'
    doc.save(tmp, garbage=3, deflate=True); doc.close()
    os.replace(tmp, f)
    b['pages'] = len(pymupdf.open(f)); b['mb'] = round(os.path.getsize(f) / 1e6, 1); b['split'] = b.get('split', 0) + len(todo)
    print('split', len(todo), 'spreads in', b['title'], '->', b['pages'], 'pages')
json.dump(B, open(os.path.join(LIB, 'data', 'books.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

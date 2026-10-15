"""Matches the old site's cover pictures (ဖားအောက်တောရဆရာတော်/images, linked from index*.htm in Zawgyi)
to the Unicode-named PDFs, by comparing consonant skeletons (consonants are the same code points in both
encodings). Writes 'cover' (images/xx.jpg copied to public/library/covers/) into books.json.
Run after build_library.py:  python scripts/library/match_covers.py
"""
import re, os, json, shutil, difflib
DL = os.path.join(os.path.expanduser('~'), 'Downloads')
SRC = os.path.join(DL, 'ဖားအောက်တောရဆရာတော်')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library')
def skel(t):
    t = os.path.splitext(t)[0]
    t = re.sub(r'\.pdf$', '', t)
    return ''.join(c for c in t if '\u1000' <= c <= '\u1021')   # consonant letters only
links = []
for f in ('index.htm', 'index1.htm', 'index2.htm'):
    s = open(os.path.join(SRC, f), encoding='utf8', errors='replace').read()
    for m in re.finditer(r"<a\s+href='([^']+\.pdf)'[^>]*>\s*<img\s+src=\s*[\"'](images/[^\"']+)[\"']", s):
        links.append((m.group(1), m.group(2)))
print('links in old site', len(links))
B = json.load(open(os.path.join(OUT, 'data', 'books.json'), encoding='utf8'))
cands = []
for li, (href, img) in enumerate(links):
    for bi, b in enumerate(B):
        a, c = skel(href), skel(b['title'])
        if a and c: cands.append((difflib.SequenceMatcher(None, a, c).ratio(), li, bi))
cands.sort(reverse=True)
ul, ub, got = set(), set(), {}
for r, li, bi in cands:
    if r < .8 or li in ul or bi in ub: continue
    ul.add(li); ub.add(bi); got[bi] = (li, r)
for bi, (li, r) in sorted(got.items()):
    img = links[li][1]; ext = os.path.splitext(img)[1]
    B[bi]['cover'] = B[bi]['id'] + '_c' + ext
    shutil.copyfile(os.path.join(SRC, img), os.path.join(OUT, 'covers', B[bi]['cover']))
    if r < .95: print('  check %.2f %s  <->  %s' % (r, links[li][0][:30], B[bi]['title'][:30]))
print('books with a picture cover', len(got), 'of', len(B))
print('books without:', [b['title'][:25] for i, b in enumerate(B) if i not in got])
json.dump(B, open(os.path.join(OUT, 'data', 'books.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

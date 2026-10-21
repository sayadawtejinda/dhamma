"""Step 2: from the inventory, make the draft song catalog:  title / artist guessed from file names + tags,
exact duplicates (same md5) and near duplicates (same normalised title and almost same length) grouped.
Usage: python build_catalog.py <inventory.json> <catalog_draft.json>
"""
import os, re, sys, json, unicodedata, collections

inv = json.load(open(sys.argv[1], encoding='utf8'))
OUT = sys.argv[2]
AUDIO = {'.mp3', '.wma', '.aac', '.wav', '.m4a'}          # .mp4 (a video) is left out
MM = '၀၁၂၃၄၅၆၇၈၉'
ZW = dict.fromkeys(map(ord, '​‌‍﻿⁠'), None)

from myanmar import converter as _mmconv
ZAW = re.compile('(?:^|[^က-အျ-ှ])ေ')       # a vowel-e that is not after its consonant = Zawgyi order

def clean(s):
    s = s.translate(ZW)
    if ZAW.search(s) or '္' in s.replace('္က', '္က') and re.search('[က-အ]္[^က-အ]', s):
        s = _mmconv.convert(s, 'zawgyi', 'unicode')
    s = unicodedata.normalize('NFC', s)
    return re.sub(r'\s+', ' ', s).strip()

JUNK_TAG = re.compile(r'^(track\s*\d+|new artist|my recording|unknown|untitled|no\.?\s*\d+.*|\d+)$', re.I)

def strip_num(t):
    for _ in range(3):
        t0 = t
        t = _strip1(t)
        if t == t0: break
    t = re.sub(r'\s*\(G\d+\s*,\s*L\d+\)', '', t)
    return t.strip(' _-.')

def _strip1(t):
    t = re.sub(r'^\s*\(?(?:[0-9' + MM + r']{1,3}|ရ(?=[။)]))\)?\s*[.။)_\-:]*\s*', '', t)          # 01. / ၁။ / (ရ) / 12_
    t = re.sub(r'^\s*(track|Track)\s*\d+\s*', '', t)
    return t.strip(' _-.')

def split_artist(t):
    # "title - artist"  (the last " - " / "-" with a short right part)
    m = re.match(r'^(.*\S)\s*[-–]\s*([^-–]{2,45})$', t)
    if m and not re.fullmatch(r'[\d\s.]+', m.group(2)):
        return m.group(1).strip(), m.group(2).strip()
    return t, ''

def norm(t):
    t = re.sub(r'\(G\d+\s*,\s*L\d+\)', '', t)
    t = re.sub(r'[\s\W_]+', '', t.lower())
    return t

rows = []
for r in inv:
    if r['ext'] not in AUDIO: continue
    parts = r['path'].split('/')
    folder = parts[0]
    sub = '/'.join(parts[1:-1])
    fn = clean(os.path.splitext(parts[-1])[0].replace('_', ' '))
    t = strip_num(fn)
    title, artist = split_artist(t)
    tag_t = clean(r.get('title', '')) if r.get('title') else ''
    tag_a = clean(r.get('artist', '')) if r.get('artist') else ''
    if tag_t and not JUNK_TAG.match(tag_t) and '?' not in tag_t and (not title or re.fullmatch(r'[\w .\-()]{1,12}', title)):
        tt = strip_num(tag_t)
        if tt and len(tt) > len(title): title, a2 = split_artist(tt); artist = artist or a2
    if tag_a and not JUNK_TAG.match(tag_a) and '?' not in tag_a and not artist: artist = tag_a
    title = clean(title); artist = clean(artist)
    num = re.match(r'^\s*\(?([0-9' + MM + r']{1,3})', fn)
    rows.append(dict(src=r['path'], folder=folder, sub=sub, fn=fn, title=title, artist=artist,
                     no=num.group(1) if num else '', dur=r.get('dur'), size=r['size'], md5=r['md5'], ext=r['ext'],
                     noname=(len(norm(title)) < 2 or (re.fullmatch(r'[\d\s' + MM + r'a-zA-Z]{0,6}', title) is not None and not re.search('[a-zA-Z]{4}', title))),
                     karaoke=('karaoke' in folder.lower())))

# ---- exact duplicates
by_md5 = collections.defaultdict(list)
for i, x in enumerate(rows): by_md5[x['md5']].append(i)
for v in by_md5.values():
    for i in v[1:]: rows[i]['dupOf'] = v[0]; rows[i]['dupKind'] = 'same-file'
# ---- near duplicates: same normalised title (>=4 chars) and length within 3 s (or both unknown and size within 3 %)
groups = collections.defaultdict(list)
for i, x in enumerate(rows):
    if 'dupOf' in x or x['noname']: continue
    n = norm(x['title'])
    if len(n) >= 4: groups[(n, x['karaoke'])].append(i)
for n, v in groups.items():
    keep = []
    for i in v:
        x = rows[i]; hit = None
        for k in keep:
            y = rows[k]
            if x['dur'] and y['dur']: ok = abs(x['dur'] - y['dur']) <= 3
            else: ok = abs(x['size'] - y['size']) <= 0.03 * max(x['size'], y['size'])
            if ok: hit = k; break
        if hit is None: keep.append(i)
        else:
            # keep the larger (better quality) file
            if rows[i]['size'] > 1.05 * rows[hit]['size']:
                rows[hit]['dupOf'] = i; rows[hit]['dupKind'] = 'same-song'; keep[keep.index(hit)] = i
            else: x['dupOf'] = hit; x['dupKind'] = 'same-song'
json.dump(rows, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print('audio', len(rows), '| exact dup', sum(1 for x in rows if x.get('dupKind') == 'same-file'),
      '| near dup', sum(1 for x in rows if x.get('dupKind') == 'same-song'), '| no name', sum(1 for x in rows if x['noname']))

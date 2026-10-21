"""Finds the lyrics of the songs inside a big text file of poems (e.g. ယဉ်ကျေးလိမ္မာကဗျာများ.txt) and writes proposals.
Usage: python lyrics_import.py <text file> [--apply]
 - a poem title = a line that equals (ignoring spaces / punctuation / digits) a song title of songs.json
 - the poem runs from that line to the next title-like line; verse lines are usually "*..." or "- ..." bullets
 - 'high'  : exactly one place in the file, and its end is clear      -> written into data/lyr (with --apply)
   'check' : several places, or the end is unclear                      -> only listed in lyrics_report.json for the teacher to confirm
Songs that already have lyrics are never touched.
"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'public', 'songs', 'data')
LYR = os.path.join(DATA, 'lyr')
txt = open(sys.argv[1], encoding='utf8', errors='replace').read().replace('\r', '')
L = [l.strip() for l in txt.split('\n')]
songs = json.load(open(os.path.join(DATA, 'songs.json'), encoding='utf8'))

def norm(s):
    s = re.sub(r'\(.*?\)|\[.*?\]', '', s)
    return re.sub(r'[\s\W\d၀-၉_]+', '', s.lower())

BUL = re.compile(r'^\s*[*\-•]\s*')
def is_bullet(l): return bool(BUL.match(l))

by_norm = {}
for i, l in enumerate(L):
    if l and len(l) <= 50 and not is_bullet(l): by_norm.setdefault(norm(l), []).append(i)
songs_by_norm = {}
for s in songs['songs']:
    if s.get('n'): continue
    n = norm(re.sub(r'\(ကာရာအိုကေ\)', '', s['t']))
    if len(n) >= 4: songs_by_norm.setdefault(n, []).append(s)
anchor_lines = {i for n in songs_by_norm for i in by_norm.get(n, [])}

def title_like(j):
    """a short line without ending punctuation, after a blank line and directly followed by text = a poem title (plain-style poems)"""
    l = L[j]
    return bool(l) and not is_bullet(l) and len(l) <= 22 and not re.search(r'[။၊,]$', l) and j > 0 and L[j - 1] == '' and j + 1 < len(L) and L[j + 1] != ''

def block(i):
    """lines after the title line i; ends at the next known song title, or (bullet style) the next non-bullet line,
    or (plain style) the next title-like line"""
    k = i + 1
    while k < len(L) and not L[k]: k += 1
    bullet_mode = k < len(L) and is_bullet(L[k])
    j = i + 1; out = []
    while j < len(L):
        l = L[j]
        if j in anchor_lines: return out, 'anchor', j
        if l and out:
            if bullet_mode and not is_bullet(l): return out, 'strict', j
            if not bullet_mode and title_like(j): return out, 'title', j
        if l: out.append(l)
        elif out: out.append('')
        j += 1
    return out, 'eof', j

def tidy(lines):
    if any(is_bullet(l) for l in lines): lines = [BUL.sub('', l) for l in lines if l]       # bullet style: one verse line per line
    t = '\n'.join(lines)
    t = re.sub(r'\n{3,}', '\n\n', t).strip()
    return t

res = {}
for n, ss in songs_by_norm.items():
    places = by_norm.get(n, [])
    if not places: continue
    cands = []
    for i in places:
        out, how, j = block(i)
        t = tidy(out)
        # a real poem title is followed directly by its first line (no blank line between)
        direct = i + 1 < len(L) and L[i + 1] != ''
        cands.append(dict(line=i + 1, end=j + 1, how=how, text=t, direct=direct))
    good = [c for c in cands if c['text'] and c['direct']]
    best = max(good, key=lambda c: len(c['text'])) if good else (cands[0] if cands else None)
    conf = 'high' if len(places) == 1 and len(good) == 1 and len(good[0]['text']) > 20 and good[0]['text'].count('\n') >= 1 else 'check'
    for s in ss: res[s['id']] = dict(title=s['t'], conf=conf, places=[c['line'] for c in cands], best=best)
# ---- spelling differences (ဘုရားအလောင်း / ဘုရားလောင်း, "M07 " prefixes ...): close matches of the title lines
import difflib
def norm2(x): return re.sub(r'^[a-z]{1,2}\d+', '', norm(x)) if False else norm(re.sub(r'^\s*[A-Za-z]{1,2}\d+\s*', '', x))
cand_lines = [i for i, l in enumerate(L) if l and len(l) <= 45 and not is_bullet(l) and (i == 0 or L[i - 1] == '') and i + 1 < len(L) and L[i + 1] != '']
cand_norm = {i: norm(L[i]) for i in cand_lines}
for s in songs['songs']:
    if s.get('n') or s['id'] in res: continue
    n = norm2(re.sub(r'\(ကာရာအိုကေ\)', '', s['t']))
    if len(n) < 5: continue
    sc = sorted(((difflib.SequenceMatcher(None, n, cn).ratio(), i) for i, cn in cand_norm.items()), reverse=True)[:2]
    if not sc or sc[0][0] < 0.9 or (len(sc) > 1 and sc[1][0] >= 0.9): continue     # one clear candidate only
    i = sc[0][1]; out, how, j = block(i); t = tidy(out)
    if i + 1 < len(L) and L[i + 1] != '' and len(t) > 20 and t.count(chr(10)) >= 1:
        res[s['id']] = dict(title=s['t'], conf='high', places=[i + 1], fuzzy=round(sc[0][0], 2), best=dict(line=i + 1, end=j + 1, how=how, text=t, direct=True))
high = {k: v for k, v in res.items() if v['conf'] == 'high'}
print('songs matched', len(res), '| high', len(high), '| to check', len(res) - len(high))
json.dump(res, open(os.path.join(HERE, 'lyrics_report.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
if '--apply' in sys.argv:
    os.makedirs(LYR, exist_ok=True); n = 0; by_id = {s['id']: s for s in songs['songs']}
    for sid, v in high.items():
        p = os.path.join(LYR, sid + '.json')
        if os.path.exists(p) or by_id[sid].get('l'): continue
        json.dump({'t': v['best']['text']}, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        by_id[sid]['l'] = 1; by_id[sid]['ld'] = 1; n += 1      # ld = draft found by the program, to be checked in the admin tool
    json.dump(songs, open(os.path.join(DATA, 'songs.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('written', n)

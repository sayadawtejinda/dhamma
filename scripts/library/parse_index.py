"""Parses 'ဟောစဉ်တရားတော်များ အညွှန်း.txt' (talk index: date/place + topics per tape) and
attaches it to public/library/data/sermons.json  ->  sermons.json gets 'info' and 'topics' per sermon.
Run after build_library.py:  python scripts/library/parse_index.py
"""
import re, json, os, difflib
DL = os.path.join(os.path.expanduser('~'), 'Downloads')
SRC = os.path.join(DL, 'ဟောစဉ်တရားတော်များ အညွှန်း.txt')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library', 'data', 'sermons.json')
D = '၀၁၂၃၄၅၆၇၈၉'
def num(s):
    s = s.replace('ဝ', '၀')
    return int(''.join(str(D.index(c)) for c in s if c in D) or 0)

lines = [l.rstrip() for l in open(SRC, encoding='utf8').read().splitlines()]
N = r'[၀-၉ဝ]+'
HEAD = re.compile(r'^\s*(' + N + r')။\s*(.+?)\s*(?:\(\s*(' + N + r')\s*-?\s*(?:ခွေ|ခေ)?\s*\)\s*(?:ခွေ|ခေ)?|\s(' + N + r')(?:း' + N + r')?)\s*$')
heads, last = [], 0
for i, l in enumerate(lines):
    m = HEAD.match(l)
    if not m: continue
    body = m.group(2)
    if re.search(N + '။', body): continue          # a list of numbered items, not a heading
    k = num(m.group(1))
    if not (k == 1 or last < k <= last + 3): continue
    cnt = num(m.group(3) or m.group(4) or '0')
    heads.append(dict(line=i, no=k, title=body.strip(' -'), count=cnt)); last = k
for a, b in zip(heads, heads[1:] + [dict(line=len(lines))]):
    a['end'] = b['line']
TOP = re.compile(r'^\s*\(\s*(' + N + r')\s*\)\s*-\s*(.*)')
def parse(h):
    desc, topics, cur = [], {}, None
    for l in lines[h['line'] + 1:h['end']]:
        s = l.strip()
        if not s: continue
        if re.match(r'^ခွေနံပါတ်.*ကူးထားပါသည်', s) or s.startswith('*'): continue
        m = TOP.match(s)
        if m:
            cur = num(m.group(1)); topics[cur] = (topics.get(cur, '') + ' ' + m.group(2)).strip()
        elif cur is None: desc.append(s)
        elif s.startswith('-') or s.startswith('(') or True:
            topics[cur] = (topics[cur] + ' ' + s.lstrip('- ')).strip()
    return ' '.join(desc), topics
for h in heads: h['desc'], h['topics'] = parse(h)

S = json.load(open(OUT, encoding='utf8'))
STOP = re.compile(r'တရားဒေသနာတော်|တရားတော်|သုတ္တန်|ကောက်နုတ်ချက်|\s+|[()၀-၉ဝ-]')
def key(t): return STOP.sub('', re.sub(r'\([^)]*\)', '', t))
for s in S:
    s.pop('info', None); s.pop('topics', None)
cands = []
for hi, h in enumerate(heads):
    for q, s in enumerate(S):
        r = difflib.SequenceMatcher(None, key(h['title']), key(s['title'])).ratio()
        if h['count'] and h['count'] == s['expected']: r += .2
        if h['count'] and h['count'] != s['expected'] and r < .85: continue   # different tape count: only accept a near-identical title
        r -= .3 * abs(hi / len(heads) - q / len(S))
        cands.append((r, hi, q))
cands.sort(reverse=True)
used_h, used_q, pairs = set(), set(), {}
for r, hi, q in cands:
    if r < .6 or hi in used_h or q in used_q: continue
    used_h.add(hi); used_q.add(q); pairs[hi] = (q, r)
# second chance: same tape count and a loosely similar title
for hi, h in enumerate(heads):
    if hi in pairs or not h['count']: continue
    c = [(difflib.SequenceMatcher(None, key(h['title']), key(s['title'])).ratio(), q) for q, s in enumerate(S) if q not in used_q and s['expected'] == h['count']]
    c = [x for x in c if x[0] >= .45]
    if c:
        r, q = max(c); used_q.add(q); pairs[hi] = (q, r)
un = []
for hi, h in enumerate(heads):
    if hi in pairs:
        q, r = pairs[hi]; s = S[q]
        s['info'] = h['desc']
        s['topics'] = {str(k): v for k, v in h['topics'].items()}
        if r < .85: print('  check: index %s "%s" (%s) -> list %s "%s" (%s) score %.2f' % (h['no'], h['title'][:30], h['count'], s['no'], s['title'][:30], s['expected'], r))
    else:
        un.append((h['no'], h['title'][:40], h['count']))
json.dump(S, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('index headings', len(heads), 'matched', len(pairs), 'unmatched', len(un))
for u in un: print('  unmatched', u)

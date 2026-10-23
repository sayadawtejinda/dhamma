"""Songs whose LYRICS are the same (same words, maybe another singer / recording) become ONE entry with several versions:
 - one title, one lyrics text (the others use it: lf), the versions listed together (g), each version named after its singer (vl)
 - the artists of all versions are shown on the entry, so one place gives both singers
Usage: python same_lyrics.py [--apply]
"""
import os, re, sys, json, difflib, unicodedata, collections
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'public', 'songs', 'data')
SONGS = os.path.join(DATA, 'songs.json'); LYR = os.path.join(DATA, 'lyr')
AUTO_VL = re.compile(r'^[0-9၀-၉]+:[0-9၀-၉]+(?: \(.\))?$')      # a version name made by the program (a length) may be replaced by the singer
MM = '၀၁၂၃၄၅၆၇၈၉'

def key(t):
    return ''.join(c for c in unicodedata.normalize('NFC', t).lower() if unicodedata.category(c)[0] in 'LMN')

def mn(n): return str(n).translate(str.maketrans('0123456789', MM))
def dur(d): return mn('%d:%02d' % (d // 60, d % 60))

def lyr_text(s):
    p = os.path.join(LYR, (s.get('lf') or s['id']) + '.json')
    return json.load(open(p, encoding='utf8')).get('t', '') if os.path.exists(p) else ''

def relabel(d):
    """version names: the singer if the versions have different singers, else the length (karaoke stays 'ကာရာအိုကေ')"""
    g = collections.defaultdict(list)
    for s in d['songs']:
        if s.get('g'): g[s['g']].append(s)
    for v in g.values():
        vocal = [s for s in v if not s.get('k')]
        for s in v:
            if s.get('k'): s['vl'] = 'ကာရာအိုကေ'; continue
            if s.get('vl') and not AUTO_VL.match(s['vl']) and s['vl'] != 'ကာရာအိုကေ': continue          # named by hand: keep
            s['vl'] = (s.get('a') or '').strip() or dur(s['d'])
        seen = collections.Counter()
        for s in sorted(vocal, key=lambda x: -x['d']): seen[s['vl']] += 1
        for s in vocal:                                                          # two versions with the same name: add the length
            if seen[s['vl']] > 1 and not AUTO_VL.match(s['vl']): s['vl'] = '%s · %s' % (s['vl'], dur(s['d']))
    return d

def run(apply):
    d = json.load(open(SONGS, encoding='utf8')); by = {s['id']: s for s in d['songs']}
    LIB = {c['id']: c.get('lib', 'main') for c in d['collections']}
    rows = [(s, key(lyr_text(s))) for s in d['songs'] if s.get('l')]
    rows = [(s, k) for s, k in rows if len(k) >= 30]
    owner_of = lambda s: s.get('lf') or s['id']
    parent = {}
    def find(x):
        while parent.setdefault(x, x) != x: parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for i in range(len(rows)):
        for j in range(i + 1, len(rows)):
            a, ka = rows[i]; b, kb = rows[j]
            if owner_of(a) == owner_of(b): parent[find(a['id'])] = find(b['id']); continue
            if LIB.get(a['c'], 'main') != LIB.get(b['c'], 'main'): continue          # another library: never the same entry
            if abs(len(ka) - len(kb)) > 0.05 * max(len(ka), len(kb)): continue
            if ka == kb:                                  # only the SAME words are shared: versions whose words differ a little keep their own lyrics
                parent[find(a['id'])] = find(b['id'])
    clusters = collections.defaultdict(set)
    for s, k in rows: clusters[find(s['id'])].add(s['id'])
    out = []
    for ids in clusters.values():
        members = set(ids)
        for s in d['songs']:                                    # the other versions of these songs (same g, linked lyrics) belong to it too
            if s.get('g') in {by[i].get('g') for i in ids if by[i].get('g')} or owner_of(s) in {owner_of(by[i]) for i in ids}: members.add(s['id'])
        ms = [by[i] for i in members]
        if len({owner_of(s) for s in ms}) < 2 and len({s.get('g') or s['id'] for s in ms}) < 2: continue          # already one entry
        out.append(ms)
        if not apply: continue
        # owner of the lyrics: a checked text first, else the longest recording
        cand = [s for s in ms if s.get('l') and not s.get('lf')]
        owner = sorted(cand, key=lambda s: (1 if s.get('ld') else 0, -s['d'], s['id']))[0]
        title = owner['t']
        vocal = sorted([s for s in ms if not s.get('k')], key=lambda s: -s['d']) or sorted(ms, key=lambda s: -s['d'])
        rep = vocal[0]['id']
        for s in ms:
            s['g'] = rep; s['t'] = title
            if s['id'] != owner['id'] and s.get('l') and s['id'] in ids:
                p = os.path.join(LYR, s['id'] + '.json')
                if os.path.exists(p): os.remove(p)                        # its own copy of the same words is not needed any more
                s['lf'] = owner['id']
                if owner.get('ld'): s['ld'] = 1
                else: s.pop('ld', None)
    if apply:
        relabel(d)
        json.dump(d, open(SONGS, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    return out

if __name__ == '__main__':
    res = run('--apply' in sys.argv)
    d = json.load(open(SONGS, encoding='utf8')); cn = {c['id']: c['name'] for c in d['collections']}
    print(len(res), 'entries with the same lyrics under different titles / separate entries')
    for ms in res:
        print([(s['id'], s['t'][:24], s.get('a', '')[:14], dur(s['d']), 'K' if s.get('k') else '') for s in ms])

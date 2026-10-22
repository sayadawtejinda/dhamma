"""Finds songs that are the SAME song listed more than once (same title, almost the same length) and keeps ONE of them.
 - the kept song is listed in every collection the others were in (field x), so nothing disappears from any collection
 - lyrics are kept (from whichever copy had them); the removed copies go to songs_deleted.json (can be brought back with the admin tool)
 - songs with the same title but a clearly different length (another recording / singer) are NOT merged, only reported
 - karaoke versions are never merged with the normal ones
Usage: python merge_same_songs.py [--apply]
"""
import os, re, sys, json, unicodedata, collections
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'public', 'songs', 'data')
SONGS = os.path.join(DATA, 'songs.json'); LYR = os.path.join(DATA, 'lyr')
GONE = os.path.join(HERE, 'songs_deleted.json'); META = os.path.join(HERE, 'songs_meta.json')

def norm(t):
    """title for comparing: letters, Myanmar vowel signs / medials and DIGITS are kept (ဓမ္မတေး (3) is not ဓမ္မတေး (4)); spaces and punctuation are not.
    Only brackets with karaoke / LP / grade marks are dropped."""
    t = re.sub(r'\((?:ကာရာအိုကေ|LP\s*\d+|G\d+\s*,\s*L\d+)\)', '', t)
    t = re.sub(r'^\s*[A-Za-z]{1,2}\d+\s*', '', t)
    t = t.translate(str.maketrans('၀၁၂၃၄၅၆၇၈၉', '0123456789'))
    return ''.join(c for c in unicodedata.normalize('NFC', t).lower() if unicodedata.category(c)[0] in 'LMN')

def is_karaoke(s): return bool(s.get('k')) or 'ကာရာအိုကေ' in s['t']

def groups(d):
    g = collections.defaultdict(list)
    for s in d['songs']:
        if s.get('n'): continue
        k = norm(s['t'])
        if len(k) >= 3: g[(k, is_karaoke(s))].append(s)
    return {k: v for k, v in g.items() if len(v) > 1}

def lyr_path(sid): return os.path.join(LYR, sid + '.json')

def main(apply):
    d = json.load(open(SONGS, encoding='utf8')); gone = json.load(open(GONE, encoding='utf8')) if os.path.exists(GONE) else {}
    meta = json.load(open(META, encoding='utf8')); cn = {c['id']: c['name'] for c in d['collections']}
    merged = 0; report = []; diff = []
    for (k, kar), v in groups(d).items():
        v = sorted(v, key=lambda s: s['d'])
        classes = []
        for s in v:                                  # same song = length within 3 seconds of the first one of the class
            for c in classes:
                if abs(c[0]['d'] - s['d']) <= 3: c.append(s); break
            else: classes.append([s])
        for c in classes:
            if len(c) < 2: continue
            # keeper: has lyrics first, then bigger file, then lower number
            keep = sorted(c, key=lambda s: (0 if s.get('l') and not s.get('lf') else 1, -s['z'], s['id']))[0]
            cols = {keep['c'], *keep.get('x', [])}
            for s in c:
                if s is keep: continue
                cols |= {s['c'], *s.get('x', [])}
                if s.get('l') and not s.get('lf') and not keep.get('l') and os.path.exists(lyr_path(s['id'])) and apply:
                    os.replace(lyr_path(s['id']), lyr_path(keep['id'])); keep['l'] = 1
                    if s.get('ld'): keep['ld'] = 1
                if apply:
                    e = dict(s); e['_col'] = cn[s['c']]; e['_src'] = meta.get(s['id'], {}).get('src', ''); e['_dupOf'] = keep['id']
                    if os.path.exists(lyr_path(s['id'])): e['_lyr'] = json.load(open(lyr_path(s['id']), encoding='utf8')).get('t', ''); os.remove(lyr_path(s['id']))
                    gone[s['id']] = e
                merged += 1
            cols.discard(keep['c'])
            if apply: keep['x'] = sorted(cols) if cols else None
            report.append((keep['t'], [(s['id'], cn[s['c']], s['d']) for s in c]))
        if len(classes) > 1: diff.append((v[0]['t'], [(s['id'], s['d'], cn[s['c']]) for s in v]))
    if apply:
        drop = {sid for sid, e in gone.items() if e.get('_dupOf')}
        d['songs'] = [s for s in d['songs'] if s['id'] not in drop]
        for s in d['songs']:
            if s.get('x') is None: s.pop('x', None)
        json.dump(d, open(SONGS, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(gone, open(GONE, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('same song listed twice+: merged copies', merged, '| groups', len(report), '| same title but different recording (kept both):', len(diff))
    return report, diff

if __name__ == '__main__':
    rep, diff = main('--apply' in sys.argv)
    if '--show' in sys.argv:
        for t, items in rep[:200]: print(t, items)

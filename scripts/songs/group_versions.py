"""Puts songs with the SAME title (different recordings, karaoke versions) under ONE title as versions of the same song.
 - title: the same spelling for every version (the one with lyrics, else the first non-karaoke one), without the "(ကာရာအိုကေ)" ending
 - g  : id of the song that represents the group (the page lists the group once and shows the versions inside)
 - vl : name of the version ("ကာရာအိုကေ", or the length such as 1:22)
 - k  : 1 = karaoke version (a karaoke song with no normal version of the same title stays on its own and keeps its title)
 - lyrics are shared: all versions use the lyrics of one song (lf)
Usage: python group_versions.py [--apply]
"""
import os, re, sys, json, unicodedata, collections
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', '..', 'public', 'songs', 'data')
SONGS = os.path.join(DATA, 'songs.json')
MM = '၀၁၂၃၄၅၆၇၈၉'
KAR = 'ကာရာအိုကေ'

def norm(t):
    t = re.sub(r'\((?:' + KAR + r'|LP\s*\d+|G\d+\s*,\s*L\d+)\)', '', t)
    t = re.sub(r'^\s*[A-Za-z]{1,2}\d+\s*', '', t)
    t = t.translate(str.maketrans(MM, '0123456789'))
    return ''.join(c for c in unicodedata.normalize('NFC', t).lower() if unicodedata.category(c)[0] in 'LMN')

def strip_kar(t): return re.sub(r'\s*\(' + KAR + r'\)\s*', ' ', t).strip()
def mn(n): return str(n).translate(str.maketrans('0123456789', MM))
def dur(d): return mn('%d:%02d' % (d // 60, d % 60))

def main(apply):
    d = json.load(open(SONGS, encoding='utf8'))
    g = collections.defaultdict(list)
    for s in d['songs']:
        if KAR in s['t']: s['k'] = 1
        if s.get('n'): continue
        k = norm(s['t'])
        if len(k) >= 3: g[k].append(s)
    n_groups = 0; n_songs = 0
    for k, v in g.items():
        if len(v) < 2: continue
        vocal = [s for s in v if not s.get('k')]
        if not vocal: continue                       # only karaoke versions of one title: leave as they are
        vocal.sort(key=lambda s: (0 if s.get('l') and not s.get('lf') else 1, -s['d'], s['id']))
        title = strip_kar(vocal[0]['t'])
        members = sorted(v, key=lambda s: (1 if s.get('k') else 0, -s['d'], s['id']))
        rep = members[0]['id']
        owner = next((s for s in members if s.get('l') and not s.get('lf')), None)
        for s in members:
            s['t'] = title; s['g'] = rep; s['vl'] = KAR if s.get('k') else dur(s['d'])
            if owner and s is not owner and not (s.get('l') and not s.get('lf')) and (s.get('k') or max(s['d'], owner['d']) <= 5 * max(1, min(s['d'], owner['d']))):
                s['lf'] = owner['id']; s['l'] = 1
                if owner.get('ld'): s['ld'] = 1
                else: s.pop('ld', None)
        # the same length shown twice in a group (two vocal recordings of equal length) gets a letter so the buttons differ
        seen = collections.Counter()
        for s in members:
            seen[s['vl']] += 1
            if seen[s['vl']] > 1: s['vl'] += ' (' + 'abcdefgh'[seen[s['vl']] - 1] + ')'
        n_groups += 1; n_songs += len(members)
    print('groups', n_groups, '| songs in groups', n_songs)
    if apply:
        json.dump(d, open(SONGS, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

if __name__ == '__main__':
    main('--apply' in sys.argv)

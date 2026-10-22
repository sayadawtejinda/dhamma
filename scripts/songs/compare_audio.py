"""Finds out whether two audio files of one title are the SAME recording (just another encoding / a few seconds longer or shorter),
by comparing their loudness curves (shifted a little against each other).  Same recording -> correlation close to 1.
Usage:
  python compare_audio.py            report only
  python compare_audio.py --apply    merge the pairs that are the same recording (keep one, every collection stays, lyrics kept)
Candidates: songs with the same title (also spelling variants) whose lengths differ by at most 15 %; karaoke is never compared with vocal.
"""
import os, re, sys, json, subprocess, tempfile, urllib.request, collections
import numpy as np
import imageio_ffmpeg
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import songs_admin as A
FF = imageio_ffmpeg.get_ffmpeg_exe()
PLAN = json.load(open(os.path.join(HERE, 'upload_plan.json'), encoding='utf8'))
CACHE = {}
HOP = 0.1                      # seconds per envelope value
SAME = 0.93

def local_path(f):
    p = PLAN.get(f)
    if p:
        for q in (p, p.replace('archivedwl-499', 'DELETE_ME_archivedwl-499')):
            if os.path.exists(q): return q
    return None

def envelope(song):
    sid = song['id']
    if sid in CACHE: return CACHE[sid]
    p = local_path(song['f']); tmp = None
    if not p:                                                   # not on this computer any more: take it from archive.org
        tmp = os.path.join(tempfile.gettempdir(), song['f'])
        urllib.request.urlretrieve('https://archive.org/download/dhamma-school-songs/' + song['f'], tmp); p = tmp
    r = subprocess.run([FF, '-v', 'quiet', '-i', p, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True)
    if tmp and os.path.exists(tmp): os.remove(tmp)
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32)
    n = int(8000 * HOP); m = len(x) // n
    env = np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(axis=1) + 1.0)
    env = np.log(env + 1.0); env = (env - env.mean()) / (env.std() + 1e-6)
    CACHE[sid] = env
    return env

def similarity(a, b, max_shift=400):
    """best normalised correlation of the two curves when one is shifted by up to +-40 s"""
    best = -1.0
    for sh in range(-max_shift, max_shift + 1, 2):
        if sh >= 0: x, y = a[sh:], b
        else: x, y = a, b[-sh:]
        n = min(len(x), len(y))
        if n < 200: continue
        c = float(np.dot(x[:n], y[:n]) / n)
        if c > best: best = c
    return best

def candidates(d):
    g = collections.defaultdict(list)
    lib = {c['id']: c.get('lib', 'main') for c in d['collections']}
    for s in d['songs']:
        if s.get('n') or s.get('k'): continue
        k = A.skel(s['t'])
        if len(k) >= 4: g[(k, lib.get(s['c'], 'main'))].append(s)
    pairs = []
    for v in g.values():
        for i in range(len(v)):
            for j in range(i + 1, len(v)):
                a, b = v[i], v[j]
                if abs(a['d'] - b['d']) <= 0.15 * max(a['d'], b['d']): pairs.append((a, b))
    return pairs

def main(apply):
    d = A.load(); by = {s['id']: s for s in d['songs']}
    res = []
    for a, b in candidates(d):
        try: sim = similarity(envelope(a), envelope(b))
        except Exception as e: sim = None; print('could not compare', a['id'], b['id'], e)
        res.append((sim, a, b))
    res.sort(key=lambda x: -(x[0] if x[0] is not None else -2))
    cn = {c['id']: c['name'] for c in d['collections']}
    for sim, a, b in res:
        print('%s  %-6s %s (%ds, %s)  <->  %-6s %s (%ds, %s)' % ('SAME ' if sim is not None and sim >= SAME else 'diff ', '%.2f' % sim if sim is not None else '?',
              a['id'], a['d'], cn[a['c']][:14], b['id'], b['t'][:30], b['d'], cn[b['c']][:14]))
    if not apply: return
    merged = set()
    for sim, a, b in res:
        if sim is None or sim < SAME or a['id'] in merged or b['id'] in merged: continue
        if a['id'] not in by or b['id'] not in by: continue
        keep, rm = sorted([a, b], key=lambda s: (0 if s.get('l') and not s.get('lf') else 1, -s['z'], s['id']))
        A.do_merge(d, by, {'keep': keep['id'], 'remove': [rm['id']]}); merged.add(rm['id']); by.pop(rm['id'], None)
    print('merged', len(merged))

if __name__ == '__main__':
    main('--apply' in sys.argv)

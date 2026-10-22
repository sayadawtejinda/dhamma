"""Local tool for the song library (public/songs): rename, change artist / collection, delete, type lyrics, add a new song, publish.
Start it with  start_songs_admin.bat  (double-click).  A page opens at http://127.0.0.1:8803  (only this computer can open it).
Everything is saved in public/songs/data/ (songs.json + lyr/<id>.json); "publish" puts it on GitHub.
"""
import unicodedata, collections, difflib
import os, re, sys, json, shutil, subprocess, threading, webbrowser, mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATA = os.path.join(ROOT, 'public', 'songs', 'data')
LYR = os.path.join(DATA, 'lyr')
SONGS = os.path.join(DATA, 'songs.json')
META = os.path.join(HERE, 'songs_meta.json')          # where each song came from (not public)
PLAN = os.path.join(HERE, 'upload_plan.json')
HIDDEN = os.path.join(HERE, 'songs_hidden.json')       # songs hidden from the public page (kept only on this computer, never committed)
GONE = os.path.join(HERE, 'songs_deleted.json')       # deleted songs (the audio stays on archive.org, nothing else points to it)
STAGE = os.path.join(os.path.expanduser('~'), 'Downloads', 'songs_stage')
PORT = 8803
os.makedirs(LYR, exist_ok=True); os.makedirs(STAGE, exist_ok=True)
LOCK = threading.Lock()

def jl(p, d=None):
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else d

def jw(p, o, compact=True):
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf8', newline='\n') as f:
        json.dump(o, f, ensure_ascii=False, separators=(',', ':') if compact else None, indent=None if compact else 1)
    os.replace(tmp, p)

def load():
    d = jl(SONGS)
    return d

def save(d):
    jw(SONGS, d)

IMG = os.path.join(DATA, '..', 'img')           # public/songs/img/<id>.jpg (big) and img/t/<id>.jpg (small)
def save_image(oid, blob):
    """any picture (jpg/png/webp, Gemini output ...) -> a big one (max 1280 px) and a small one (max 240 px), named by the song / collection id.
    The old picture is replaced, so nothing is left behind."""
    from PIL import Image, ImageOps
    import io
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(blob)))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[3]); im = bg
    im = im.convert('RGB')
    os.makedirs(os.path.join(IMG, 't'), exist_ok=True)
    big = im.copy(); big.thumbnail((1280, 1280)); big.save(os.path.join(IMG, oid + '.jpg'), quality=82, optimize=True, progressive=True)
    sm = im.copy(); sm.thumbnail((240, 240)); sm.save(os.path.join(IMG, 't', oid + '.jpg'), quality=72, optimize=True)

def del_image(oid):
    for p in (os.path.join(IMG, oid + '.jpg'), os.path.join(IMG, 't', oid + '.jpg')):
        if os.path.exists(p): os.remove(p)

IGN = os.path.join(HERE, 'similar_ignore.json')            # groups of similar titles the teacher said "not related"

def skel(t):
    """title reduced to its consonants and digits (no vowel signs, tone marks, medials): spelling variants of one title give the same key"""
    t = re.sub(r'\((?:ကာရာအိုကေ|LP\s*\d+|G\d+\s*,\s*L\d+)\)', '', t)
    t = re.sub(r'^\s*[A-Za-z]{1,2}\d+\s*', '', t)
    t = t.translate(str.maketrans('၀၁၂၃၄၅၆၇၈၉', '0123456789'))
    return ''.join(c for c in unicodedata.normalize('NFC', t).lower() if unicodedata.category(c)[0] in 'LN' and not ('\u102b' <= c <= '\u103e'))

def do_merge(d, songs, body):
    """the same song listed twice: keep one, the others go to the deleted list; every collection stays, lyrics are kept"""
    keep = songs[body['keep']]; gone = jl(GONE, {}); meta = jl(META, {})
    for rid in body['remove']:
        if rid == keep['id'] or rid not in songs: continue
        r = songs[rid]
        xs = set(keep.get('x', [])) | {r['c'], *r.get('x', [])}; xs.discard(keep['c'])
        if xs: keep['x'] = sorted(xs)
        pr = os.path.join(LYR, rid + '.json'); pk = os.path.join(LYR, keep['id'] + '.json')
        own_r = r.get('l') and not r.get('lf'); e = dict(r)
        if own_r:
            if not keep.get('l'):
                shutil.copyfile(pr, pk); keep['l'] = 1; keep.pop('lf', None)
                if r.get('ld'): keep['ld'] = 1
            e['_lyr'] = jl(pr, {}).get('t', '')
            if os.path.exists(pr): os.remove(pr)
        owner = keep.get('lf') or keep['id']
        for x in d['songs']:
            if x.get('lf') == rid:                                # songs that used the removed copy's lyrics
                if x['id'] == keep['id']: continue
                if keep.get('l'): x['lf'] = owner
                else: x.pop('lf', None); x.pop('l', None); x.pop('ld', None)
        kg = keep.get('g') or keep['id']
        for x in d['songs']:
            if x.get('g') == rid and x['id'] != rid: x['g'] = kg; keep['g'] = kg      # its other versions become versions of the kept song
        e['_col'] = colname(d, r['c']); e['_src'] = meta.get(rid, {}).get('src', ''); e['_dupOf'] = keep['id']
        gone[rid] = e; d['songs'] = [x for x in d['songs'] if x['id'] != rid]; songs.pop(rid)
    if body.get('title', '').strip():
        keep['t'] = body['title'].strip(); keep.pop('n', None)
        for x in d['songs']:
            if keep.get('g') and x.get('g') == keep['g']: x['t'] = keep['t']
    for x in d['songs']:
        if x.get('g') and sum(1 for y in d['songs'] if y.get('g') == x['g']) < 2: x.pop('g', None); x.pop('vl', None)
    jw(GONE, gone, False); save(d)

def similar():
    d = load(); ign = set(jl(IGN, [])); cn = {c['id']: c['name'] for c in d['collections']}
    b = collections.defaultdict(list)
    lib = {c['id']: c.get('lib', 'main') for c in d['collections']}
    for s in d['songs']:
        if s.get('n'): continue
        k = skel(s['t'])
        if len(k) >= 4: b[(k, lib.get(s['c'], 'main'))].append(s)
    out = []
    for k, v in b.items():
        if len(v) < 2 or len({x.get('g') or x['id'] for x in v}) == 1: continue
        key = ','.join(sorted(x['id'] for x in v))
        if key in ign: continue
        out.append(dict(key=key, items=[dict(id=x['id'], t=x['t'], a=x.get('a', ''), d=x['d'], cols=[cn.get(i, '') for i in [x['c'], *x.get('x', [])]], l=x.get('l'), ld=x.get('ld'), lf=x.get('lf'), g=x.get('g'), vl=x.get('vl'), k=x.get('k')) for x in sorted(v, key=lambda s: (-(1 if s.get('l') else 0), -s['d']))]))
    out.sort(key=lambda g: (-len(g['items']), g['items'][0]['t']))
    return out

def colname(d, cid):
    return next((c['name'] for c in d['collections'] if c['id'] == cid), '')

def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf8', errors='replace')
    return (r.stdout + r.stderr).strip(), r.returncode

MODE = os.path.join(HERE, 'publish_mode.json')      # {"mode": "lyrics"} = only songs that have lyrics go to GitHub, {"mode": "all"} = everything

def publish_mode():
    m = jl(MODE, {}).get('mode', 'lyrics')
    return m if m in ('lyrics', 'all') else 'lyrics'

def publish_libs():
    """which libraries go to the public page (the others stay on this computer until the teacher switches them on)"""
    l = jl(MODE, {}).get('libs')
    return l if isinstance(l, list) and l else ['main']

def published_view(d, mode):
    """what the public page gets: in 'lyrics' mode only songs with lyrics (and the other versions of such a song);
    the working copy (all songs) stays on this computer"""
    pl = set(publish_libs()); libof = {c['id']: c.get('lib', 'main') for c in d['collections']}
    d = dict(d); d['songs'] = [x for x in d['songs'] if libof.get(x['c'], 'main') in pl]
    d['libs'] = [l for l in d.get('libs', []) if l['id'] in pl] or d.get('libs')
    if mode == 'all': return d
    has = {(x.get('g') or x['id']) for x in d['songs'] if x.get('l')}
    songs = [x for x in d['songs'] if x.get('l') or (x.get('g') or x['id']) in has]
    cols = {c for x in songs for c in [x['c'], *x.get('x', [])]}
    out = {k: v for k, v in d.items() if k not in ('songs', 'collections')}
    out['collections'] = [c for c in d['collections'] if c['id'] in cols]
    ok = {c['id'] for c in out['collections']}
    out['songs'] = []
    for x in songs:
        y = dict(x)
        if y.get('x'):
            y['x'] = [i for i in y['x'] if i in ok]
            if not y['x']: y.pop('x')
        out['songs'].append(y)
    return out

def archive_missing(songs):
    """songs whose audio file is not (completely) on archive.org yet"""
    import internetarchive as ia
    have = {f['name']: int(f.get('size', 0)) for f in ia.get_item('dhamma-school-songs').files}
    return [s for s in songs if have.get(s['f']) != s['z']]

def publish():
    log = []
    mode = publish_mode(); d = load(); view = published_view(d, mode)
    lost = [x['t'] for x in d['songs'] if x.get('l') and not os.path.exists(os.path.join(LYR, (x.get('lf') or x['id']) + '.json'))]
    if lost: return 'စာသားဖိုင် ပျောက်နေသော သီချင်း %d ပုဒ် ရှိသည် ❌ (ဥပမာ: %s) — အရင်ပြင်ပါ။' % (len(lost), ', '.join(lost[:3]))
    try:
        miss = archive_missing(view['songs'])
    except Exception as e:
        return 'archive.org ကို စစ်မရပါ ❌ (အင်တာနက် စစ်ပါ)\n' + str(e)
    if miss:
        return 'archive.org ပေါ် မရောက်သေးသော သီချင်း %d ပုဒ် ရှိနေသေးသည် ❌ — upload ပြီးမှ တင်ပါ။\n(ဥပမာ: %s)' % (len(miss), ', '.join(m['t'] for m in miss[:3]))
    run(['git', 'reset', '-q'])                                      # nothing else stays staged: only what is listed below is published
    # the public songs.json (filtered) goes straight into the git index; the working copy is not touched
    tmp = os.path.join(HERE, 'songs_public.tmp'); jw(tmp, view)
    sha, c = run(['git', 'hash-object', '-w', tmp]); os.remove(tmp)
    if c != 0: return 'git hash-object မအောင်မြင်ပါ ❌\n' + sha
    o, c = run(['git', 'update-index', '--add', '--cacheinfo', '100644,%s,public/songs/data/songs.json' % sha]); log.append(o)
    if c != 0: return 'git update-index မအောင်မြင်ပါ ❌\n' + o
    paths = ['public/songs/index.html', 'public/songs/sw.js'] + [str(x) for x in []]
    # lyrics and pictures of the published songs / collections only
    ids = [x['id'] for x in view['songs']] + [c['id'] for c in view['collections']]
    for i_ in ids:
        for rel in ('public/songs/data/lyr/%s.json' % i_, 'public/songs/img/%s.jpg' % i_, 'public/songs/img/t/%s.jpg' % i_):
            if os.path.exists(os.path.join(ROOT, rel)): paths.append(rel)
    tools = [os.path.join('scripts/songs', f) for f in sorted(os.listdir(HERE)) if f.endswith(('.py', '.html'))] + ['start_songs_admin.bat', '.gitignore']
    paths += [p for p in tools if os.path.exists(os.path.join(ROOT, p))]
    for k in range(0, len(paths), 200):
        o, c = run(['git', 'add', '--'] + paths[k:k + 200]); log.append(o)
        if c != 0: return 'git add မအောင်မြင်ပါ ❌\n' + o
    # files that were published before but are not published any more (deleted / hidden / not yet allowed)
    o, c = run(['git', 'ls-tree', '-r', '--name-only', 'HEAD', 'public/songs/data/lyr', 'public/songs/img'])
    for rel in o.splitlines():
        if rel and rel not in paths: run(['git', 'rm', '-q', '--cached', '--', rel])
    for rel in ('scripts/songs/songs_meta.json', 'scripts/songs/songs_deleted.json', 'scripts/songs/lyrics_report.json', 'scripts/songs/catalog_draft.json', 'scripts/songs/upload_plan.json'):
        run(['git', 'rm', '-q', '--cached', '--ignore-unmatch', '--', rel])        # work files of this computer: not for GitHub
    o, c = run(['git', 'diff', '--cached', '--quiet'])
    if c == 0: return 'ပြောင်းလဲမှု မရှိပါ (တင်ပြီးသား) ✅'
    o, c = run(['git', 'commit', '-m', 'Songs: update (%s)' % mode]); log.append(o)
    if c != 0: return 'commit မအောင်မြင်ပါ ❌\n' + o
    for attempt in range(3):
        o, c = run(['git', 'pull', '--rebase', '--autostash', 'origin', 'main']); log.append(o)
        o, c = run(['git', 'push', 'origin', 'main']); log.append(o)
        if c == 0:
            o2, c2 = run(['git', 'status', '-sb'])
            if '[ahead' not in o2.splitlines()[0]: return 'တင်ပြီးပါပြီ ✅ (%s သီချင်း %d ပုဒ်၊ website မှာ ၁-၂ မိနစ်အတွင်း ပေါ်လာမည်)' % ('စာသားရှိတာသာ' if mode == 'lyrics' else 'အားလုံး', len(view['songs']))
    return 'မအောင်မြင်ပါ ❌\n' + '\n'.join(log)

def probe_dur(p):
    try:
        from mutagen import File as MFile
        m = MFile(p)
        if m and m.info and m.info.length: return round(m.info.length)
    except Exception: pass
    import imageio_ffmpeg
    r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-i', p], capture_output=True, text=True, encoding='utf8', errors='replace')
    m = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.?\d*)', r.stderr)
    return round(int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))) if m else 0

def add_song(filename, blob, title, artist, col):
    """new song: keep as mp3 (converted if needed) in the staging folder, upload it to archive.org, add it to songs.json"""
    with LOCK:
        d = load()
        n = max([int(s['id'][1:]) for s in d['songs']] + [int(k[1:]) for k in list(jl(GONE, {})) + list(jl(HIDDEN, {}))] + [0]) + 1
        sid = 's%04d' % n
        ext = os.path.splitext(filename)[1].lower() or '.mp3'
        raw = os.path.join(STAGE, sid + '.raw' + ext)
        open(raw, 'wb').write(blob)
        out = os.path.join(STAGE, sid + '.mp3')
        if ext == '.mp3': shutil.move(raw, out)
        else:
            import imageio_ffmpeg
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', raw, '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', out], check=True)
            os.remove(raw)
        import internetarchive as ia
        r = ia.upload('dhamma-school-songs', files={sid + '.mp3': out}, retries=10, retries_sleep=20, verbose=False, queue_derive=False)
        if not all(x.status_code == 200 for x in r): raise RuntimeError('archive.org upload failed')
        s = dict(id=sid, t=title or os.path.splitext(filename)[0], a=artist or '', c=col, d=probe_dur(out), z=os.path.getsize(out), f=sid + '.mp3')
        d['songs'].append(s); save(d)
        plan = jl(PLAN, {}); plan[sid + '.mp3'] = out; jw(PLAN, plan, False)
        return s

# ---------------------------------------------------------------- new songs in a batch (many files at once, names made automatically)
import hashlib, uuid, unicodedata, time
INCOMING = os.path.join(STAGE, 'incoming'); os.makedirs(INCOMING, exist_ok=True)
JOBS = {}
MMD = '၀၁၂၃၄၅၆၇၈၉'
ZAW_RE = re.compile('(?:^|[^\u1000-\u1021\u103b-\u103e])\u1031')
JUNK_TAG = re.compile(r'^(track\s*\d+|new artist|my recording|unknown(?: artist)?|untitled|no\.?\s*\d+.*|\d+|children|chant\d*|rec\d+)$', re.I)

def _clean(t):
    t = t.translate(dict.fromkeys(map(ord, '\u200b\u200c\u200d\ufeff\u2060'), None))
    if ZAW_RE.search(t) or re.search('[\u1000-\u1021]\u1039[^\u1000-\u1021]', t) or re.search('[\u1060-\u1097]', t):          # old Zawgyi file names -> Unicode
        from myanmar import converter
        t = converter.convert(t, 'zawgyi', 'unicode')
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', t)).strip()

def parse_name(filename, folder=''):
    """title / artist guessed from the file name (and the tags): 01. / ၁။ / (ရ) numbers, 'M04 ', (G5,L29) are removed; 'title - artist' is split"""
    base = _clean(os.path.splitext(os.path.basename(filename))[0].replace('_', ' '))
    t = base
    for _ in range(3):
        t0 = t
        t = re.sub(r'^\s*\(?(?:[0-9' + MMD + r']{1,3}|ရ(?=[။)]))\)?\s*[.။)_\-:]*\s*', '', t)
        t = re.sub(r'^\s*(?:track|Track)\s*\d+\s*', '', t).strip(' _-.')
        if t == t0: break
    t = re.sub(r'\s*\(G\d+\s*,\s*L\d+\)', '', t)
    t = re.sub(r'^\s*[A-Za-z]{1,2}\d*\s+(?=[\u1000-\u109f])', '', t).strip(' _-.')
    artist = ''
    m = re.match(r'^(.*\S)\s*[-–]\s*([^-–]{2,45})$', t)
    if m and not re.fullmatch(r'[\d\s.]+', m.group(2)): t, artist = m.group(1).strip(), m.group(2).strip()
    return t, artist

def title_key(t):
    import merge_same_songs as M
    return M.norm(t)

def scan_file(name, rel, blob):
    """a file chosen by the teacher: kept in the incoming folder, looked at (length, tags, md5), names guessed, duplicates reported"""
    tok = uuid.uuid4().hex[:10]; ext = os.path.splitext(name)[1].lower() or '.mp3'
    path = os.path.join(INCOMING, tok + ext); open(path, 'wb').write(blob)
    md5 = hashlib.md5(blob).hexdigest(); dur = probe_dur(path)
    title, artist = parse_name(name)
    tag_t = tag_a = ''
    try:
        from mutagen import File as MFile
        m = MFile(path, easy=True)
        if m and m.tags:
            tag_t = _clean(str((m.tags.get('title') or [''])[0])); tag_a = _clean(str((m.tags.get('artist') or [''])[0]))
    except Exception: pass
    junk = lambda x: not x or JUNK_TAG.match(x.strip()) or '?' in x
    if (not title or re.fullmatch(r'[\w .\-()]{0,6}', title)) and not junk(tag_t): title = parse_name(tag_t + '.mp3')[0] or tag_t
    if not artist and not junk(tag_a): artist = tag_a
    folder = rel.split('/')[0] if '/' in rel else ''
    karaoke = bool(re.search(r'karaoke|ကာရာအိုကေ|instrumental', rel, re.I))
    d = load(); meta = jl(META, {}); warn = ''; dup = None
    for sid, mm in meta.items():                                    # the very same file is already in the library
        if mm.get('md5') == md5 and any(s['id'] == sid for s in d['songs']): dup = sid; warn = 'ဒီအသံဖိုင် ရှိပြီးသား (%s)' % sid; break
    if not dup:
        k = title_key(title) if title else ''
        for s in d['songs']:
            if k and len(k) >= 3 and title_key(s['t']) == k and abs(s['d'] - dur) <= 3 and bool(s.get('k')) == karaoke:
                warn = 'ထပ်နေနိုင် — ခေါင်းစဉ်၊ အချိန်တူသော သီချင်း ရှိပြီး (%s)' % s['id']; dup = s['id']; break
    noname = not title or bool(re.fullmatch(r'[\d\s' + MMD + r'a-zA-Z]{0,6}', title)) and not re.search('[a-zA-Z]{4}', title)
    return dict(tmp=tok + ext, name=name, folder=folder, title=title, artist=artist, dur=dur, size=len(blob), md5=md5, k=karaoke, noname=noname, dup=dup, warn=warn)

def _next_id(d):
    return max([int(s['id'][1:]) for s in d['songs']] + [int(k[1:]) for k in list(jl(GONE, {})) + list(jl(HIDDEN, {}))] + [0]) + 1

def lib_of_col(d, cid):
    return next((c.get('lib', 'main') for c in d['collections'] if c['id'] == cid), 'main')

def run_batch(job, items, col, newcol, lib='main'):
    """items: {tmp,title,artist,w,k,md5,name,lyrics,col,newcol,lib,reuse}.  reuse = {f,z,d}: the same audio file is already on archive.org (no upload)."""
    import internetarchive as ia, imageio_ffmpeg
    job.update(total=len(items), done=0, ok=0, log=[])
    for it in items:
        try:
            icol = it.get('col') or col; inew = (it.get('newcol') or newcol or '').strip(); ilib = it.get('lib') or lib or 'main'
            with LOCK:
                d = load()
                if inew and not icol:
                    c = next((x for x in d['collections'] if x['name'] == inew and x.get('lib', 'main') == ilib), None)
                    if not c:
                        c = dict(id='c%02d' % (max([int(x['id'][1:]) for x in d['collections']] + [0]) + 1), name=inew)
                        if ilib != 'main': c['lib'] = ilib
                        d['collections'].append(c); save(d)
                    icol = c['id']
                sid = it.get('sid') or 's%04d' % _next_id(d)
            title = (it.get('title') or '').strip(); noname = not title
            if noname: title = (inew or colname(d, icol)) + ' ' + sid[1:]
            if it.get('reuse'):
                rs = it['reuse']; s = dict(id=sid, t=title, a=(it.get('artist') or '').strip(), c=icol, d=rs['d'], z=rs['z'], f=rs['f'])
                if it.get('tmp'):
                    try: os.remove(os.path.join(INCOMING, it['tmp']))
                    except OSError: pass
            else:
                out = os.path.join(STAGE, sid + '.mp3')
                if not it.get('uploaded'):
                    src = os.path.join(INCOMING, it['tmp'])
                    if src.lower().endswith('.mp3'): shutil.move(src, out)
                    else:
                        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', src, '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', out], check=True); os.remove(src)
                    r = ia.upload('dhamma-school-songs', files={sid + '.mp3': out}, retries=10, retries_sleep=20, verbose=False, queue_derive=False)
                    if not all(x.status_code == 200 for x in r): raise RuntimeError('archive.org upload failed')
                s = dict(id=sid, t=title, a=(it.get('artist') or '').strip(), c=icol, d=probe_dur(out), z=os.path.getsize(out), f=sid + '.mp3')
            if noname: s['n'] = 1
            if it.get('w'): s['w'] = it['w'].strip()
            if it.get('k'): s['k'] = 1
            if (it.get('lyrics') or '').strip():
                jw(os.path.join(LYR, sid + '.json'), {'t': it['lyrics'].strip()}); s['l'] = 1
            with LOCK:
                d = load(); k = title_key(title) if not noname else ''; lb = lib_of_col(d, icol)
                mates = [x for x in d['songs'] if k and len(k) >= 3 and title_key(x['t']) == k and lib_of_col(d, x['c']) == lb] if k else []
                if mates:                                                           # same title already there (same library): this is one more version of it
                    g = mates[0].get('g') or mates[0]['id']; s['t'] = mates[0]['t']
                    for x in mates:
                        if not x.get('g'): x['g'] = g
                        if not x.get('vl'): x['vl'] = 'ကာရာအိုကေ' if x.get('k') else '%d:%02d' % (x['d'] // 60, x['d'] % 60)
                    s['g'] = g; s['vl'] = 'ကာရာအိုကေ' if s.get('k') else (s['a'] or '%d:%02d' % (s['d'] // 60, s['d'] % 60))
                    owner = next((x for x in mates if x.get('l')), None)
                    if owner and s.get('k') and not s.get('l'): s['lf'] = owner.get('lf') or owner['id']; s['l'] = 1
                d['songs'].append(s); save(d)
                if not it.get('reuse'):
                    plan = jl(PLAN, {}); plan[sid + '.mp3'] = out; jw(PLAN, plan, False)
                meta = jl(META, {}); meta[sid] = dict(src=it.get('name', ''), also=[], md5=it.get('md5', '')); jw(META, meta, False)
            job['ok'] += 1; job['log'].append('✅ %s — %s' % (sid, title))
        except Exception as e:
            job['log'].append('❌ %s — %s' % (it.get('title') or it.get('name'), e))
        job['done'] += 1
    job['finished'] = True

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ctype='application/json; charset=utf-8', extra=None):
        b = body if isinstance(body, bytes) else body.encode('utf8')
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b))); self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)

    def _audio(self, sid):
        """plays a song that is not on archive.org yet, straight from this computer (with seeking)"""
        plan = jl(PLAN, {}); p = plan.get(sid + '.mp3')
        if not p or not os.path.exists(p): return self._send(404, '{}')
        size = os.path.getsize(p); rng = self.headers.get('Range'); a, b = 0, size - 1
        if rng:
            m = re.match(r'bytes=(\d*)-(\d*)', rng)
            if m:
                if m.group(1): a = int(m.group(1))
                if m.group(2): b = min(int(m.group(2)), size - 1)
        self.send_response(206 if rng else 200)
        self.send_header('Content-Type', 'audio/mpeg'); self.send_header('Accept-Ranges', 'bytes'); self.send_header('Content-Length', str(b - a + 1))
        if rng: self.send_header('Content-Range', 'bytes %d-%d/%d' % (a, b, size))
        self.end_headers()
        try:
            with open(p, 'rb') as f:
                f.seek(a); left = b - a + 1
                while left > 0:
                    chunk = f.read(min(1 << 16, left))
                    if not chunk: break
                    self.wfile.write(chunk); left -= len(chunk)
        except (ConnectionError, OSError): pass

    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            if u.path == '/': return self._send(200, open(os.path.join(HERE, 'songs_admin.html'), encoding='utf8').read(), 'text/html; charset=utf-8')
            if u.path == '/api/data':
                d = load(); meta = jl(META, {})
                for s in d['songs']:
                    m = meta.get(s['id'])
                    if m: s['_src'] = m.get('src', ''); s['_also'] = m.get('also', [])
                return self._send(200, json.dumps(d, ensure_ascii=False))
            if u.path == '/api/job':
                return self._send(200, json.dumps(JOBS.get(q['id'][0], {}), ensure_ascii=False))
            if u.path == '/api/similar':
                return self._send(200, json.dumps({'groups': similar()}, ensure_ascii=False))
            if u.path == '/api/publishmode':
                return self._send(200, json.dumps({'mode': publish_mode(), 'libs': publish_libs(), 'count': len(published_view(load(), publish_mode())['songs'])}))
            if u.path == '/api/gone':
                return self._send(200, json.dumps(jl(HIDDEN if q.get('store', [''])[0] == 'hidden' else GONE, {}), ensure_ascii=False))
            if u.path == '/api/lyrics':
                sg = next((x for x in load()['songs'] if x['id'] == q['id'][0]), {})
                p = os.path.join(LYR, (sg.get('lf') or q['id'][0]) + '.json')
                return self._send(200, json.dumps({'t': jl(p, {}).get('t', '') if os.path.exists(p) else ''}, ensure_ascii=False))
            if u.path.startswith('/imgfile/'):
                p = os.path.abspath(os.path.join(IMG, u.path[9:].replace('/', os.sep)))
                if p.startswith(os.path.abspath(IMG)) and os.path.exists(p): return self._send(200, open(p, 'rb').read(), 'image/jpeg')
                return self._send(404, '{}')
            if u.path.startswith('/audio/'): return self._audio(u.path[7:].replace('.mp3', ''))
        except Exception as e:
            return self._send(400, json.dumps({'error': str(e)}))
        self._send(404, '{}')

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); raw = self.rfile.read(n)
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            if u.path == '/api/image':          # body = the picture file; ?id=s0001 or c01
                oid = q['id'][0]
                if not re.fullmatch(r'[sc]\d+', oid): raise ValueError('bad id')
                with LOCK:
                    d = load(); target = next((x for x in d['songs'] if x['id'] == oid), None) or next((c for c in d['collections'] if c['id'] == oid), None)
                    if not target: raise ValueError('not found')
                    save_image(oid, raw); target['i'] = int(__import__('time').time()); save(d)
                return self._send(200, json.dumps({'ok': True, 'i': target['i']}))
            if u.path == '/api/stage':             # one chosen file (raw body); returns the guessed names
                return self._send(200, json.dumps(scan_file(unquote(q['name'][0]), unquote(q.get('rel', [''])[0]), raw), ensure_ascii=False))
            if u.path == '/api/addbatch':
                b = json.loads(raw or b'{}'); jid = uuid.uuid4().hex[:8]; JOBS[jid] = {'finished': False, 'total': len(b['items']), 'done': 0, 'ok': 0, 'log': []}
                threading.Thread(target=run_batch, args=(JOBS[jid], b['items'], b.get('c') or '', (b.get('newcol') or '').strip(), b.get('lib') or 'main'), daemon=True).start()
                return self._send(200, json.dumps({'job': jid}))
            if u.path == '/api/add':
                s = add_song(unquote(q['name'][0]), raw, unquote(q.get('t', [''])[0]), unquote(q.get('a', [''])[0]), q['c'][0])
                return self._send(200, json.dumps({'ok': True, 'song': s}, ensure_ascii=False))
            body = json.loads(raw or b'{}')
            with LOCK:
                d = load(); songs = {s['id']: s for s in d['songs']}
                if u.path == '/api/update':
                    s = songs[body['id']]
                    if body.get('t') is not None and body['t'].strip() and body['t'].strip() != s['t']: s.pop('n', None)     # renamed = no longer "needs a name"
                    for k in ('t', 'a', 'c'):
                        if k in body: s[k] = str(body[k]).strip()
                    if 'w' in body:
                        if str(body['w']).strip(): s['w'] = str(body['w']).strip()
                        else: s.pop('w', None)
                    if 'vl' in body:
                        if body['vl'].strip(): s['vl'] = body['vl'].strip()
                        else: s.pop('vl', None)
                    if 'k' in body:
                        if body['k']: s['k'] = 1
                        else: s.pop('k', None)
                    if s.get('g'):                                           # all versions of one song have the same title
                        for x in d['songs']:
                            if x.get('g') == s['g']: x['t'] = s['t']
                    if 'x' in body:
                        ok = {c['id'] for c in d['collections']}
                        xs = sorted({i for i in body['x'] if i in ok and i != body.get('c', s['c'])})
                        if xs: s['x'] = xs
                        else: s.pop('x', None)
                    if 'newcol' in body and body['newcol'].strip():
                        cid = 'c%02d' % (max(int(c['id'][1:]) for c in d['collections']) + 1)
                        d['collections'].append(dict(id=cid, name=body['newcol'].strip())); s['c'] = cid
                    if 'lyrics' in body:
                        owner = s.get('lf') or s['id']                       # a song that shares lyrics writes into the owner's file
                        p = os.path.join(LYR, owner + '.json'); t = body['lyrics'].replace('\r\n', '\n').strip()
                        users = [x for x in d['songs'] if x.get('lf') == owner] + [songs[owner]]
                        if t:
                            if not (os.path.exists(p) and jl(p, {}).get('t') == t):
                                for x in users: x.pop('ld', None)           # edited by hand = no longer a draft
                            jw(p, {'t': t}); s['l'] = 1
                        elif s.get('lf'):                                    # empty text on a linked song = stop sharing
                            s.pop('lf', None); s.pop('l', None); s.pop('ld', None)
                        else:
                            if os.path.exists(p): os.remove(p)
                            for x in users: x.pop('l', None); x.pop('ld', None); x.pop('lf', None)
                    if body.get('lyricsOk'):
                        for x in d['songs']:
                            if x['id'] == (s.get('lf') or s['id']) or x.get('lf') == (s.get('lf') or s['id']): x.pop('ld', None)
                    save(d); return self._send(200, json.dumps({'ok': True, 'song': s, 'collections': d['collections']}, ensure_ascii=False))
                if u.path in ('/api/delete', '/api/hide'):
                    store = HIDDEN if u.path == '/api/hide' else GONE
                    sid = body['id']; s = songs.pop(sid)
                    d['songs'] = [x for x in d['songs'] if x['id'] != sid]
                    rest_g = [x for x in d['songs'] if x.get('g') == sid]
                    for x in rest_g: x['g'] = rest_g[0]['id']                 # the next version represents the song
                    for x in d['songs']:
                        if x.get('g') and sum(1 for y in d['songs'] if y.get('g') == x['g']) < 2: x.pop('g', None); x.pop('vl', None)
                    users = [x for x in d['songs'] if x.get('lf') == sid]
                    if users and os.path.exists(os.path.join(LYR, sid + '.json')):
                        new = users[0]; shutil.copyfile(os.path.join(LYR, sid + '.json'), os.path.join(LYR, new['id'] + '.json')); new.pop('lf', None)
                        for x in users[1:]: x['lf'] = new['id']
                    gone = jl(store, {}); e = dict(s); e['_col'] = colname(d, s['c']); e['_src'] = jl(META, {}).get(sid, {}).get('src', '')
                    p = os.path.join(LYR, sid + '.json')
                    if os.path.exists(p): e['_lyr'] = jl(p, {}).get('t', ''); os.remove(p)
                    gone[sid] = e; jw(store, gone, False)
                    save(d); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/restore':        # bring a deleted / hidden song back (its audio is still on archive.org)
                    store = HIDDEN if body.get('store') == 'hidden' else GONE
                    gone = jl(store, {}); e = gone.pop(body['id'])
                    lyr = e.pop('_lyr', ''); e.pop('_src', None); col = e.pop('_col', '')
                    if not any(c['id'] == e['c'] for c in d['collections']):
                        c2 = next((c for c in d['collections'] if c['name'] == col), None)
                        if c2: e['c'] = c2['id']
                        else: d['collections'].append(dict(id=e['c'], name=col or e['c']))
                    d['songs'].append(e)
                    if lyr: jw(os.path.join(LYR, e['id'] + '.json'), {'t': lyr})
                    jw(store, gone, False); save(d); return self._send(200, json.dumps({'ok': True, 'song': e, 'collections': d['collections']}, ensure_ascii=False))
                if u.path == '/api/ignoresimilar':
                    ign = jl(IGN, []); k = ','.join(sorted(body['ids']))
                    if k not in ign: ign.append(k)
                    jw(IGN, ign, False); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/merge':
                    do_merge(d, songs, body); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/group':            # body['to'] become versions of song body['id'] (same title, lyrics shared)
                    rep = songs[body['id']]; g = rep.get('g') or rep['id']; rep['g'] = g
                    owner = songs[rep.get('lf') or rep['id']]
                    for tid in body['to']:
                        t = songs[tid]
                        if t['id'] == rep['id']: continue
                        for x in d['songs']:
                            if x.get('g') == t['id'] and x['id'] != t['id']: x['g'] = g      # versions it had follow it
                        t['g'] = g; t['t'] = rep['t']
                        if not t.get('vl'): t['vl'] = 'ကာရာအိုကေ' if t.get('k') else '%d:%02d' % (t['d'] // 60, t['d'] % 60)
                        if owner.get('l') and not (t.get('l') and not t.get('lf')) and (t.get('k') or max(t['d'], owner['d']) <= 5 * max(1, min(t['d'], owner['d']))):
                            t['lf'] = owner['id']; t['l'] = 1
                            if owner.get('ld'): t['ld'] = 1
                    if not rep.get('vl'): rep['vl'] = 'ကာရာအိုကေ' if rep.get('k') else '%d:%02d' % (rep['d'] // 60, rep['d'] % 60)
                    save(d); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/ungroup':
                    s = songs[body['id']]; g = s.pop('g', None)
                    if g == s['id']:                                           # the representative leaves: the next one becomes it
                        rest = [x for x in d['songs'] if x.get('g') == g and x['id'] != s['id']]
                        for x in rest: x['g'] = rest[0]['id']
                    left = [x for x in d['songs'] if x.get('g') == (g if g != s['id'] else None) and x['id'] != s['id']] if g else []
                    for x in d['songs']:
                        if x.get('g') and sum(1 for y in d['songs'] if y.get('g') == x['g']) < 2: x.pop('g', None); x.pop('vl', None)
                    s.pop('vl', None); save(d); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/linklyrics':        # songs in body['to'] use the lyrics of song body['id'] (same words, another recording)
                    owner = songs[body['id']]
                    if owner.get('lf'): owner = songs[owner['lf']]
                    if not owner.get('l'): raise ValueError('no lyrics to share')
                    for tid in body['to']:
                        t = songs[tid]
                        if t['id'] == owner['id']: continue
                        p = os.path.join(LYR, tid + '.json')
                        if os.path.exists(p): os.remove(p)
                        for x in d['songs']:                                   # songs that were sharing the removed text follow the new owner
                            if x.get('lf') == tid: x['lf'] = owner['id']
                        t['lf'] = owner['id']; t['l'] = 1
                        if owner.get('ld'): t['ld'] = 1
                        else: t.pop('ld', None)
                    save(d); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/imagedel':
                    oid = body['id']; target = songs.get(oid) or next((c for c in d['collections'] if c['id'] == oid), None)
                    if target: target.pop('i', None); save(d)
                    del_image(oid); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/libadd':           # a new library (a second "song house" in the same page)
                    libs = d.setdefault('libs', [dict(id='main', name='ဓမ္မစကူးလ် သီချင်း ကဗျာများ')])
                    lid = re.sub(r'[^a-z0-9]', '', (body.get('id') or '').lower()) or 'lib%d' % (len(libs) + 1)
                    if any(x['id'] == lid for x in libs): raise ValueError('ဒီအမည်နဲ့ ရှိပြီးသား')
                    libs.append(dict(id=lid, name=body['name'].strip())); save(d)
                    return self._send(200, json.dumps({'ok': True, 'libs': libs}, ensure_ascii=False))
                if u.path == '/api/librename':
                    for x in d.setdefault('libs', []):
                        if x['id'] == body['id']: x['name'] = body['name'].strip()
                    save(d); return self._send(200, json.dumps({'ok': True, 'libs': d['libs']}, ensure_ascii=False))
                if u.path == '/api/colrename':
                    for c in d['collections']:
                        if c['id'] == body['id']:
                            c['name'] = body['name'].strip()
                            if body.get('lib'):
                                if body['lib'] == 'main': c.pop('lib', None)
                                else: c['lib'] = body['lib']
                    save(d); return self._send(200, json.dumps({'ok': True, 'collections': d['collections']}, ensure_ascii=False))
                if u.path == '/api/coldelete':        # only an empty collection
                    if any(s['c'] == body['id'] for s in d['songs']): return self._send(400, json.dumps({'error': 'သီချင်းများ ရှိနေသေးသည်'}, ensure_ascii=False))
                    d['collections'] = [c for c in d['collections'] if c['id'] != body['id']]
                    for x_ in d['songs']:
                        if body['id'] in x_.get('x', []):
                            x_['x'] = [i for i in x_['x'] if i != body['id']]
                            if not x_['x']: x_.pop('x')
                    save(d)
                    return self._send(200, json.dumps({'ok': True, 'collections': d['collections']}, ensure_ascii=False))
            if u.path == '/api/publishmode':
                bb = json.loads(raw or b'{}'); cur = jl(MODE, {})
                jw(MODE, {'mode': ('all' if bb.get('mode') == 'all' else 'lyrics') if 'mode' in bb else cur.get('mode', 'lyrics'), 'libs': bb.get('libs') or cur.get('libs') or ['main']}, False)
                return self._send(200, json.dumps({'ok': True}))
            if u.path == '/api/publish':
                return self._send(200, json.dumps({'log': publish()}, ensure_ascii=False))
        except Exception as e:
            return self._send(400, json.dumps({'error': str(e)}, ensure_ascii=False))
        self._send(404, '{}')

if __name__ == '__main__':
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    print('Song admin: http://127.0.0.1:%d   (close this window to stop)' % PORT)
    if '--no-browser' not in sys.argv: threading.Timer(1.0, lambda: webbrowser.open('http://127.0.0.1:%d' % PORT)).start()
    try: srv.serve_forever()
    except KeyboardInterrupt: pass

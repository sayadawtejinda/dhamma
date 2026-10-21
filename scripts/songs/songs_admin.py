"""Local tool for the song library (public/songs): rename, change artist / collection, delete, type lyrics, add a new song, publish.
Start it with  start_songs_admin.bat  (double-click).  A page opens at http://127.0.0.1:8803  (only this computer can open it).
Everything is saved in public/songs/data/ (songs.json + lyr/<id>.json); "publish" puts it on GitHub.
"""
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

def colname(d, cid):
    return next((c['name'] for c in d['collections'] if c['id'] == cid), '')

def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf8', errors='replace')
    return (r.stdout + r.stderr).strip(), r.returncode

def publish():
    log = []
    paths = [p for p in ['public/songs', 'scripts/songs/songs_meta.json', 'scripts/songs/songs_deleted.json'] if os.path.exists(os.path.join(ROOT, p))]
    o, c = run(['git', 'add', '--'] + paths); log.append(o)
    if c != 0: return 'git add မအောင်မြင်ပါ ❌\n' + o
    o, c = run(['git', 'diff', '--cached', '--quiet', '--'] + paths)
    if c == 0: return 'ပြောင်းလဲမှု မရှိပါ (တင်ပြီးသား) ✅'
    o, c = run(['git', 'commit', '-m', 'Songs: update', '--'] + paths); log.append(o)
    if c != 0: return 'commit မအောင်မြင်ပါ ❌\n' + o
    for attempt in range(3):
        o, c = run(['git', 'pull', '--rebase', '--autostash', 'origin', 'main']); log.append(o)
        o, c = run(['git', 'push', 'origin', 'main']); log.append(o)
        if c == 0:
            o2, c2 = run(['git', 'status', '-sb'])
            if '[ahead' not in o2.splitlines()[0]: return 'တင်ပြီးပါပြီ ✅ (website မှာ ၁-၂ မိနစ်အတွင်း ပေါ်လာမည်)'
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
        n = max([int(s['id'][1:]) for s in d['songs']] + [int(k[1:]) for k in jl(GONE, {})] + [0]) + 1
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
            if u.path == '/api/gone':
                return self._send(200, json.dumps(jl(GONE, {}), ensure_ascii=False))
            if u.path == '/api/lyrics':
                p = os.path.join(LYR, q['id'][0] + '.json')
                return self._send(200, json.dumps({'t': jl(p, {}).get('t', '') if os.path.exists(p) else ''}, ensure_ascii=False))
            if u.path.startswith('/audio/'): return self._audio(u.path[7:].replace('.mp3', ''))
        except Exception as e:
            return self._send(400, json.dumps({'error': str(e)}))
        self._send(404, '{}')

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); raw = self.rfile.read(n)
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
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
                    if 'newcol' in body and body['newcol'].strip():
                        cid = 'c%02d' % (max(int(c['id'][1:]) for c in d['collections']) + 1)
                        d['collections'].append(dict(id=cid, name=body['newcol'].strip())); s['c'] = cid
                    if 'lyrics' in body:
                        p = os.path.join(LYR, s['id'] + '.json'); t = body['lyrics'].replace('\r\n', '\n').strip()
                        if t:
                            if not (os.path.exists(p) and jl(p, {}).get('t') == t): s.pop('ld', None)       # edited by hand = no longer a draft
                            jw(p, {'t': t}); s['l'] = 1
                        else:
                            s.pop('ld', None)
                            if os.path.exists(p): os.remove(p)
                            s.pop('l', None)
                    if body.get('lyricsOk'): s.pop('ld', None)
                    save(d); return self._send(200, json.dumps({'ok': True, 'song': s, 'collections': d['collections']}, ensure_ascii=False))
                if u.path == '/api/delete':
                    sid = body['id']; s = songs.pop(sid)
                    d['songs'] = [x for x in d['songs'] if x['id'] != sid]
                    gone = jl(GONE, {}); e = dict(s); e['_col'] = colname(d, s['c']); e['_src'] = jl(META, {}).get(sid, {}).get('src', '')
                    p = os.path.join(LYR, sid + '.json')
                    if os.path.exists(p): e['_lyr'] = jl(p, {}).get('t', ''); os.remove(p)
                    gone[sid] = e; jw(GONE, gone, False)
                    save(d); return self._send(200, json.dumps({'ok': True}))
                if u.path == '/api/restore':        # bring a deleted song back (its audio is still on archive.org)
                    gone = jl(GONE, {}); e = gone.pop(body['id'])
                    lyr = e.pop('_lyr', ''); e.pop('_src', None); col = e.pop('_col', '')
                    if not any(c['id'] == e['c'] for c in d['collections']):
                        c2 = next((c for c in d['collections'] if c['name'] == col), None)
                        if c2: e['c'] = c2['id']
                        else: d['collections'].append(dict(id=e['c'], name=col or e['c']))
                    d['songs'].append(e)
                    if lyr: jw(os.path.join(LYR, e['id'] + '.json'), {'t': lyr})
                    jw(GONE, gone, False); save(d); return self._send(200, json.dumps({'ok': True, 'song': e, 'collections': d['collections']}, ensure_ascii=False))
                if u.path == '/api/colrename':
                    for c in d['collections']:
                        if c['id'] == body['id']: c['name'] = body['name'].strip()
                    save(d); return self._send(200, json.dumps({'ok': True, 'collections': d['collections']}, ensure_ascii=False))
                if u.path == '/api/coldelete':        # only an empty collection
                    if any(s['c'] == body['id'] for s in d['songs']): return self._send(400, json.dumps({'error': 'သီချင်းများ ရှိနေသေးသည်'}, ensure_ascii=False))
                    d['collections'] = [c for c in d['collections'] if c['id'] != body['id']]; save(d)
                    return self._send(200, json.dumps({'ok': True, 'collections': d['collections']}, ensure_ascii=False))
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

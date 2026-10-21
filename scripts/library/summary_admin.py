"""Small local tool for writing the summaries (အနှစ်ချုပ်) of the Dhamma library.

Start it with  start_summary_admin.bat  (double-click). A page opens at http://127.0.0.1:8802 :
pick a sermon / a single tape / a book (PDF) / a reading text, type or paste the summary, press Save.
The page can play the tape from archive.org while you write. Publish puts all saved summaries on the web (git).
Only this computer can open the page (127.0.0.1).
"""
import os, re, sys, json, subprocess, threading, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LIB = os.path.join(ROOT, 'public', 'library')
SRC = os.path.join(HERE, 'summaries')
sys.path.insert(0, HERE)
import build_summaries

PORT = 8802
os.makedirs(SRC, exist_ok=True)

def jload(p):
    return json.load(open(p, encoding='utf8'))

def audio_bases():
    txt = open(os.path.join(LIB, 'data', 'config.js'), encoding='utf8').read()
    return re.findall(r"audioBase[12]:\s*'([^']+)'", txt)

def catalog():
    sermons = jload(os.path.join(LIB, 'data', 'sermons.json'))
    books = jload(os.path.join(LIB, 'data', 'books.json'))
    texts = jload(os.path.join(LIB, 'texts', 'index.json'))
    have = {k: set() for k in build_summaries.KINDS}
    for f in os.listdir(SRC):
        m = re.fullmatch(r'(sermon|tape|book|text)-(.+)\.md', f)
        if m and open(os.path.join(SRC, f), encoding='utf8').read().strip(): have[m.group(1)].add(m.group(2))
    items = []
    for s in sermons:
        items.append(dict(kind='sermon', key=str(s['id']), title=(s['no'] + ' ' + s['title']).strip(), sub='%d ခွေ' % len(s['tracks'])))
        for i, t in enumerate(s['tracks'], 1):
            items.append(dict(kind='tape', key=str(t[0]), title=s['title'] + ' — ခွေ %d' % i, sub=t[1], file=t[1], sermon=s['title']))
    for b in books: items.append(dict(kind='book', key=b['id'], title=b['title'], sub='%s · %s စာမျက်နှာ' % (b['id'], b.get('pages', ''))))
    for t in texts: items.append(dict(kind='text', key=t['id'], title=t['title'], sub=t['id']))
    for it in items: it['has'] = it['key'] in have[it['kind']]
    return dict(items=items, audio=audio_bases(), counts={k: len(v) for k, v in have.items()})

def path_for(kind, key):
    if kind not in build_summaries.KINDS or not re.fullmatch(r'[A-Za-z0-9_\-]+', key): raise ValueError('bad id')
    return os.path.join(SRC, '%s-%s.md' % (kind, key))

def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding='utf8', errors='replace')
    return (r.stdout + r.stderr).strip(), r.returncode

def publish():
    log = []
    build_summaries.build()
    paths = ['scripts/library/summaries', 'public/library/data/summaries-index.json', 'public/library/data/sum']
    paths = [p for p in paths if os.path.exists(os.path.join(ROOT, p))]
    o, c = run(['git', 'add', '--'] + paths); log.append(o)
    if c != 0: return 'git add မအောင်မြင်ပါ ❌\n' + o
    o, c = run(['git', 'diff', '--cached', '--quiet', '--'] + paths)
    if c == 0: return 'ပြောင်းလဲမှု မရှိပါ (တင်ပြီးသား) ✅'
    o, c = run(['git', 'commit', '-m', 'Library: summaries update', '--'] + paths); log.append(o)
    if c != 0: return 'commit မအောင်မြင်ပါ ❌\n' + o
    for attempt in range(3):
        o, c = run(['git', 'pull', '--rebase', '--autostash', 'origin', 'main']); log.append(o)
        o, c = run(['git', 'push', 'origin', 'main']); log.append(o)
        if c == 0:
            o2, c2 = run(['git', 'status', '-sb'])
            if '[ahead' not in o2.splitlines()[0]: return 'တင်ပြီးပါပြီ ✅ (website မှာ ၁-၂ မိနစ်အတွင်း ပေါ်လာမည်)'
    return 'မအောင်မြင်ပါ ❌\n' + '\n'.join(log)

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, body, ctype='application/json; charset=utf-8'):
        b = body if isinstance(body, bytes) else body.encode('utf8')
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b))); self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        try:
            if u.path == '/': return self._send(200, open(os.path.join(HERE, 'summary_admin.html'), encoding='utf8').read(), 'text/html; charset=utf-8')
            if u.path == '/api/catalog': return self._send(200, json.dumps(catalog(), ensure_ascii=False))
            if u.path == '/api/get':
                p = path_for(q['kind'][0], q['key'][0])
                return self._send(200, json.dumps({'text': open(p, encoding='utf8').read() if os.path.exists(p) else ''}, ensure_ascii=False))
        except Exception as e:
            return self._send(400, json.dumps({'error': str(e)}))
        self._send(404, '{}')
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); body = json.loads(self.rfile.read(n) or b'{}')
        try:
            if self.path == '/api/save':
                p = path_for(body['kind'], body['key']); text = (body.get('text') or '').replace('\r\n', '\n').strip()
                if text: open(p, 'w', encoding='utf8', newline='\n').write(text + '\n')
                elif os.path.exists(p): os.remove(p)
                return self._send(200, json.dumps({'ok': True, 'counts': build_summaries.build()}))
            if self.path == '/api/publish':
                return self._send(200, json.dumps({'log': publish()}, ensure_ascii=False))
        except Exception as e:
            return self._send(400, json.dumps({'error': str(e)}))
        self._send(404, '{}')

if __name__ == '__main__':
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), H)
    print('Summary admin: http://127.0.0.1:%d   (close this window to stop)' % PORT)
    if '--no-browser' not in sys.argv: threading.Timer(1.0, lambda: webbrowser.open('http://127.0.0.1:%d' % PORT)).start()
    try: srv.serve_forever()
    except KeyboardInterrupt: pass

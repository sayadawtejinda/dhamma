"""Step 3: catalog_draft -> public/songs/data/songs.json  (+ upload_plan.json: archive file name -> local file).
Only for the FIRST creation. After that songs.json is edited with the admin tool (songs_admin.py).
Usage: python make_songs.py <catalog_draft.json> <source_folder> <staging_folder>
  - duplicates are left out (the copy that is kept remembers the other folders in 'also')
  - wma / aac / m4a / wav are converted to mp3 into the staging folder (browsers can't play wma/aac everywhere)
"""
import os, re, sys, json, subprocess, collections
import imageio_ffmpeg
from mutagen import File as MFile

draft = json.load(open(sys.argv[1], encoding='utf8'))
SRC, STAGE = sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'public', 'songs', 'data')
os.makedirs(OUT, exist_ok=True); os.makedirs(STAGE, exist_ok=True)
if os.path.exists(os.path.join(OUT, 'songs.json')) and '--force' not in sys.argv:
    sys.exit('songs.json already exists (it is edited with the admin tool now). Use --force only to start over.')
FF = imageio_ffmpeg.get_ffmpeg_exe()
MM = '၀၁၂၃၄၅၆၇၈၉'

NAMES = {   # folder -> display name of the collection (the admin tool can rename later)
    'mp3': 'အထွေထွေ (mp3 ဖိုဒါ)', 'New folder (3)': 'အခြား (၃)', 'New folder (4)': 'အခြား (၄)', 'Pathana': 'ပဋ္ဌာန်း',
    'ဘုရားရှိးခိုးများ': 'ဘုရားရှိခိုးများ', 'Karaoke': 'ကာရာအိုကေ', 'PowerPoint': 'PowerPoint ဖိုဒါ',
    'Grade - 1 Poem Song': 'ပထမတန်း ကဗျာသီချင်း', 'Grade - 2 Poem Song': 'ဒုတိယတန်း ကဗျာသီချင်း',
    'Grade - 3 Poem Song': 'တတိယတန်း ကဗျာသီချင်း', 'Grade - 4 Poem Song': 'စတုတ္ထတန်း ကဗျာသီချင်း',
    'Grade - 5 Poem Song': 'ပဉ္စမတန်း ကဗျာသီချင်း', 'Grade - 6 Poem Song': 'ဆဋ္ဌမတန်း ကဗျာသီချင်း',
    'နေဘုန်းလှိုင်  လှတော': 'နေဘုန်းလှိုင် လှတော',
}
# folders that were grouped together by the teacher's own naming get a stable order: grades first
ORDER = ['Grade - %d Poem Song' % i for i in range(1, 7)]

def probe(p):
    try:
        m = MFile(p)
        if m and m.info and m.info.length: return round(m.info.length)
    except Exception: pass
    r = subprocess.run([FF, '-i', p], capture_output=True, text=True, encoding='utf8', errors='replace')
    m = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.?\d*)', r.stderr)
    return round(int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))) if m else 0

kept = [i for i, x in enumerate(draft) if 'dupOf' not in x]
also = collections.defaultdict(set)
for i, x in enumerate(draft):
    if 'dupOf' in x:
        j = x['dupOf']
        while 'dupOf' in draft[j]: j = draft[j]['dupOf']
        also[j].add(x['folder'])
folders = sorted({draft[i]['folder'] for i in kept}, key=lambda f: (ORDER.index(f) if f in ORDER else 99, f))
cols = [dict(id='c%02d' % (n + 1), name=NAMES.get(f, f), folder=f) for n, f in enumerate(folders)]
cid = {c['folder']: c['id'] for c in cols}

def numkey(x):
    m = re.search(r'\d+', x['no'].translate(str.maketrans(MM, '0123456789'))) if x['no'] else None
    return (int(m.group()) if m else 9999, x['src'])

songs, plan = [], {}
order = sorted(kept, key=lambda i: (folders.index(draft[i]['folder']),) + numkey(draft[i]))
for n, i in enumerate(order, 1):
    x = draft[i]; sid = 's%04d' % n
    local = os.path.join(SRC, x['src'].replace('/', os.sep))
    f = sid + '.mp3'
    if x['ext'] != '.mp3':
        st = os.path.join(STAGE, f)
        if not os.path.exists(st):
            subprocess.run([FF, '-y', '-loglevel', 'error', '-i', local, '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', st], check=True)
        local = st
    title = x['title'] or ''
    if x['noname']:
        title = '%s %s' % (NAMES.get(x['folder'], x['folder']), x['no'] or x['fn']) if not title else title + ' ' + (x['no'] or '')
        title = re.sub(r'\s+', ' ', title).strip()
    if x['karaoke'] and 'ကာရာအိုကေ' not in title: title += ' (ကာရာအိုကေ)'
    s = dict(id=sid, t=title, a=x['artist'], c=cid[x['folder']], d=probe(local), z=os.path.getsize(local), f=f)
    if x['noname']: s['n'] = 1
    if also.get(i): s['also'] = sorted(NAMES.get(a, a) for a in also[i])
    s['src'] = x['src']
    songs.append(s); plan[f] = local
meta = {x['id']: dict(src=x.pop('src'), also=x.pop('also', [])) for x in songs}     # origin info stays out of the public file
json.dump(meta, open(os.path.join(HERE, 'songs_meta.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
data = dict(v=1, archive='https://archive.org/download/dhamma-school-songs/', collections=[dict(id=c['id'], name=c['name']) for c in cols], songs=songs)
json.dump(data, open(os.path.join(OUT, 'songs.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
json.dump(plan, open(os.path.join(HERE, 'upload_plan.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(len(songs), 'songs,', len(cols), 'collections,', round(sum(s['z'] for s in songs) / 2**30, 2), 'GB,', sum(1 for s in songs if s.get('n')), 'without a name')

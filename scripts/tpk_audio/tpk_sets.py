"""Tipitaka recordings -> paragraph plan for every set (Digha is the pilot, built by build_digha_plan.py; this builds the others).
A set = a run of recordings + the books of the Pali text they read.  The text is cut into paragraphs (<span class="paranum">), the paragraphs are
grouped in units (a chapter / subhead = a sutta, a vagga ...).  Start guess = proportion of characters over the whole set; the teacher's marks (Firestore) fix it.
"""
import os, re, json, glob, html, math
import numpy as np
import mutagen

TIPI = 'C:/Users/sayad/Downloads/tipitaka/data/'
AUDIO = 'C:/Users/sayad/Downloads/UIdarcakka/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'tipitaka-audio', 'data')

def nums(pat):
    return sorted(glob.glob(pat), key=lambda f: int(re.findall(r'\((\d+)\)', f)[0]))

def abh(letter):
    fs = sorted(glob.glob(AUDIO + 'ABIDAMMA 7-KYAN/First Abi Dhammar 6 Kyan Parli/%s-*.mp3' % letter))
    return [('AB-%s-%04d.mp3' % (letter, int(re.match(r'[A-Z]-(\d+)', os.path.basename(f)).group(1))), f) for f in fs]

def numbered(letter, folder):
    return [('%s-%03d.mp3' % (letter, int(re.findall(r'\((\d+)\)', f)[0])), f) for f in nums(AUDIO + folder + '/*.mp3')]

SETS = {
    'mn': dict(name='မဇ္ဈိမနိကာယ်', files=lambda: numbered('B', 'misjima-pyinpyi'), books=['mula_ma_01', 'mula_ma_02', 'mula_ma_03']),
    'sn': dict(name='သံယုတ္တနိကာယ်', files=lambda: numbered('C', 'THANYOKE PYINPYI'), books=['mula_sa_%02d' % i for i in range(1, 6)]),
    'an': dict(name='အင်္ဂုတ္တရနိကာယ်', files=lambda: numbered('D', 'ANGOTETO-PYINPYI'), books=['mula_an_%02d' % i for i in range(1, 12)]),
    'kn': dict(name='ခုဒ္ဒကနိကာယ်', files=lambda: numbered('E', 'KHUDDAKA NIKARYA-ALL'), books=['mula_ku_%02d' % i for i in range(1, 22)]),
    'ab1': dict(name='ဓမ္မသင်္ဂဏီ', files=lambda: abh('A'), books=['mula_bi_01']),
    'ab2': dict(name='ဝိဘင်္ဂ', files=lambda: abh('B'), books=['mula_bi_02']),
    'ab3': dict(name='ဓာတုကထာ', files=lambda: abh('C'), books=['mula_bi_03']),
    'ab4': dict(name='ပုဂ္ဂလပညတ္တိ', files=lambda: abh('D'), books=['mula_bi_04']),
    'ab5': dict(name='ကထာဝတ္ထု', files=lambda: abh('E'), books=['mula_bi_05']),
    'ab6': dict(name='ယမကပါဠိ', files=lambda: abh('F'), books=['mula_bi_06_01', 'mula_bi_06_02', 'mula_bi_06_03']),
    'pt': dict(name='ပဋ္ဌာန်း', files=lambda: [('PT-%03d.mp3' % int(re.match(r'(\d+)', os.path.basename(f)).group(1)), f) for f in sorted(glob.glob(AUDIO + 'ABIDAMMA 7-KYAN/Pahtan 5 Kyan Parli/*.mp3'))],
               books=['mula_bi_07_%02d' % i for i in range(1, 6)]),
}

def strip(s):
    return html.unescape(re.sub('<[^>]+>', '', s))

def parse_books(books):
    """-> paras [dict(u,label,n,page,book,text)], units [dict(name,start)]"""
    paras = []; units = []; cur = None; seen = {}
    parent = ''; pend = []      # headings waiting for the next paragraph (pre); closing lines go to the previous paragraph (post)
    END = re.compile('နိဋ္ဌိတ|ဘာဏဝါရော|သမတ္တ|ဥဒ္ဒါန')
    for b in books:
        for pg in json.load(open(TIPI + b + '.json', encoding='utf8')):
            for m in re.finditer(r'<p class="(\w+)">(.*?)</p>', pg['content'], re.S):
                cls, body = m.group(1), m.group(2)
                if cls in ('chapter', 'subhead'):
                    name = re.sub(r'\s+', ' ', strip(body)).strip(); pend.append(name)
                    if cls == 'chapter': parent = name
                    units.append(dict(name=name if cls == 'chapter' or not parent else parent + ' › ' + name, start=len(paras), book=b)); cur = None; continue
                if cls in ('nikaya', 'book', 'centered', 'title'):
                    ht = re.sub(r'\s+', ' ', strip(body)).strip()
                    if ht:
                        if cls == 'centered' and END.search(ht) and paras: paras[-1].setdefault('post', []).append(ht)
                        else: pend.append(ht)
                    continue
                n = re.search(r'<span class="paranum">([^<]+)</span>', body)
                t = re.sub(r'[ \t]+', ' ', strip(re.sub(r'<span class="paranum">[^<]*</span>', '', body))).strip()
                if not units: units.append(dict(name='', start=0, book=b))
                u = len(units) - 1
                if n:
                    label = n.group(1).strip(); k = (u, label); seen[k] = seen.get(k, 0) + 1
                    if seen[k] > 1: label += '_%d' % seen[k]
                    cur = dict(u=u, label=label, n=0, page=pg['page'], book=b, text=t.lstrip('။ ').strip(), pre=pend); pend = []
                    paras.append(cur)
                elif t:
                    if cur is None or cur['u'] != u:
                        label = '~%d' % (len([1 for p in paras if p['u'] == u]) + 1)
                        cur = dict(u=u, label=label, n=0, page=pg['page'], book=b, text=t, pre=pend); pend = []; paras.append(cur)
                    else: cur['text'] += '\n' + t
    for p in paras:
        p['text'] = re.sub(r'  +', ' ', re.sub(r'\s*\[[^\]]*\]', '', p['text'])).strip()
        cl = lambda x: re.sub(r'  +', ' ', re.sub(r'\s*\[[^\]]*\]', '', x)).strip()
        p['pre'] = [cl(x) for x in p.get('pre', []) if cl(x)]; p['post'] = [cl(x) for x in p.get('post', []) if cl(x)]
        p['n'] = max(1, len(p['text']) + sum(len(x) for x in p['pre'] + p['post']))
    # units without paragraphs are dropped
    used = sorted({p['u'] for p in paras}); remap = {u: i for i, u in enumerate(used)}
    for p in paras: p['u'] = remap[p['u']]
    units = [units[u] for u in used]
    for i, u in enumerate(units): u['start'] = next(j for j, p in enumerate(paras) if p['u'] == i)
    return paras, units

def build(setid, write=True):
    cfg = SETS[setid]; files = cfg['files']()
    dur = [mutagen.File(f).info.length for _, f in files]
    paras, units = parse_books(cfg['books'])
    r = sum(p['n'] for p in paras) / sum(dur)
    starts = [0.0]
    for d in dur: starts.append(starts[-1] + d)
    # No anchors: the recordings are cut at unknown places (a file start only sometimes is the start of a sutta), a dynamic programme that snaps
    # file starts to unit starts did not beat plain proportion on Digha (median error 16-17 min) -> plain proportion, the teacher's marks do the rest
    auto = {}; snapped = 0
    data = dict(id=setid, name=cfg['name'], pre='', base='https://archive.org/download/tipitaka-audio-myanmar/',
                files=[n for n, _ in files], starts=[round(x, 1) for x in starts], dur=[round(d) for d in dur],
                suttas={str(i + 1): u['name'] for i, u in enumerate(units)}, sutNum={str(i + 1): str(i + 1) for i in range(len(units))},
                book={str(i + 1): u['book'] for i, u in enumerate(units)}, books=cfg['books'], warn=[], auto=auto,
                groups=[dict(fa=0, fb=len(dur), paras=[[p['u'] + 1, p['label'], p['n'], p['page']] for p in paras])])
    texts = {}
    for p in paras:
        texts.setdefault(p['book'], {})['%d|%s' % (p['u'] + 1, p['label'])] = p['text']
        if p['pre'] or p['post']: texts[p['book']]['%d|%s^' % (p['u'] + 1, p['label'])] = [p['pre'], p['post']]
    if write:
        os.makedirs(OUT, exist_ok=True)
        json.dump(data, open(os.path.join(OUT, setid + '.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        tdir = os.path.join(OUT, 'txt'); os.makedirs(tdir, exist_ok=True)
        for b, t in texts.items(): json.dump(t, open(os.path.join(tdir, b + '.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    return dict(set=setid, files=len(dur), hours=round(sum(dur) / 3600, 1), paras=len(paras), units=len(units), rate=round(r, 2), snapped=snapped)

if __name__ == '__main__':
    import sys
    for s in (sys.argv[1:] or list(SETS)):
        print(build(s), flush=True)

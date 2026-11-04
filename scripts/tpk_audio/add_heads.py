"""Add headings (pre) and closing lines (post) to the paragraph plan of every set, and count them in the paragraph weights.
Text json: key 's|label^' -> [[pre...],[post...]].  Digha keeps its own weights (its parser already counts these lines), only the display data is added."""
import json, re, html, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tpk_sets as T
OUT = T.OUT
END = re.compile('နိဋ္ဌိတ|ဘာဏဝါရော|သမတ္တ|ဥဒ္ဒါန')
cl = lambda x: re.sub(r'  +', ' ', re.sub(r'\s*\[[^\]]*\]', '', x)).strip()

def jl(p): return json.load(open(p, encoding='utf8'))
def jd(o, p): json.dump(o, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

for sid, cfg in T.SETS.items():
    paras, units = T.parse_books(cfg['books'])
    plan = jl(os.path.join(OUT, sid + '.json'))
    new = {'%d|%s' % (p['u'] + 1, p['label']): p for p in paras}
    old = [x for g in plan['groups'] for x in g['paras']]
    assert {'%d|%s' % (x[0], x[1]) for x in old} == set(new), sid
    ch = 0
    for x in old:
        n = new['%d|%s' % (x[0], x[1])]['n']
        if n != x[2]: ch += 1
        x[2] = n
    jd(plan, os.path.join(OUT, sid + '.json'))
    byb = {}
    for k, p in new.items():
        if p['pre'] or p['post']: byb.setdefault(p['book'], {})[k + '^'] = [p['pre'], p['post']]
    for b in cfg['books']:
        f = os.path.join(OUT, 'txt', b + '.json'); t = jl(f)
        t = {k: v for k, v in t.items() if not k.endswith('^')}; t.update(byb.get(b, {})); jd(t, f)
    print(sid, 'weights changed', ch, 'with heads', sum(len(v) for v in byb.values()), flush=True)

# ---- Digha
D = 'C:/Users/sayad/Downloads/tipitaka/data/'
heads = {}; k = 0; cur = None; pend = []; prev = None
for b in ('mula_di_01', 'mula_di_02', 'mula_di_03'):
    for pg in jl(D + b + '.json'):
        for m in re.finditer(r'<p class="(\w+)">(.*?)</p>', pg['content'], re.S):
            cls, body = m.group(1), m.group(2)
            t = re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', '', body))).strip()
            if cls == 'chapter': k += 1; cur = None
            n = re.search(r'<span class="paranum">([^<]+)</span>', body)
            if cls in ('chapter', 'subhead', 'nikaya', 'book', 'title') or (cls == 'centered' and not n):
                if not t: continue
                if cls == 'centered' and END.search(t) and prev: heads.setdefault(prev, [[], []])[1].append(cl(t))
                else: pend.append(cl(t))
                continue
            if n:
                cur = prev = '%d|%s' % (k, n.group(1))
                if pend: heads.setdefault(cur, [[], []])[0].extend(pend); pend = []
f = os.path.join(OUT, 'digha_text.json'); t = jl(f); t = {a: v for a, v in t.items() if not a.endswith('^')}
for a, v in heads.items():
    v = [[x for x in v[0] if x], [x for x in v[1] if x]]
    if (v[0] or v[1]) and a in t: t[a + '^'] = v
jd(t, f); print('digha heads', sum(1 for a in t if a.endswith('^')))

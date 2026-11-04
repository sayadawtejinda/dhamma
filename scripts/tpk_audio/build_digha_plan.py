"""Digha Nikaya audio (UIdarcakka/DIGHANIKAYA, A (1..83).mp3) -> sutta / paragraph plan (estimates).
Sutta start files come from the file titles in the mp3 tags; inside a sutta the paragraph start times are
estimated from the characters of each paragraph (reading speed is roughly constant).  Output: digha_plan.json"""
import json, re, html, os
from parse_digha import parse
HERE = os.path.dirname(os.path.abspath(__file__))
START = [1,5,10,13,15,17,18,19,20,23,25,27,28, 29,34,35,43,45,46,48,49,51,53, 56,60,63,66,69,71,75,77,78,79,82]   # first file of each of the 34 suttas
dur = json.load(open(os.path.join(HERE, 'dur_A.json')))
S = parse()
assert len(S) == len(START) == 34
# paragraph snippets
def snippets():
    out = []
    D = 'C:/Users/sayad/Downloads/tipitaka/data/'
    for b in ('mula_di_01', 'mula_di_02', 'mula_di_03'):
        cur = None
        for p in json.load(open(D + b + '.json', encoding='utf8')):
            for m in re.finditer(r'<p class="chapter">(.*?)</p>|<p class="(\w+)">(.*?)</p>', p['content'], re.S):
                if m.group(1) is not None: out.append({}); continue
                if not out: continue
                n = re.search(r'class="paranum">([^<]+)<', m.group(3))
                if n: out[-1].setdefault(n.group(1), html.unescape(re.sub('<[^>]+>', '', m.group(3)))[len(n.group(1)):][:150].strip(' ။'))
    return out
SN = snippets()
files = [dict(file=i + 1, dur=round(dur[i]), items=[]) for i in range(83)]
# suttas that the rate check showed are NOT cut at file starts are joined: the border between them is estimated inside the group
GROUPS = [[k] for k in range(34)]
for g in ([5, 6], [8, 9, 10]):
    for k in g[1:]: GROUPS.remove([k])
    GROUPS[GROUPS.index([g[0]])] = g
suttas = []; groups = []
for g in GROUPS:
    fa = START[g[0]] - 1; nxt = g[-1] + 1; fb = (START[nxt] - 1) if nxt < 34 else 83
    T = sum(dur[fa:fb]); chars = sum(S[k]['chars'] for k in g)
    allp = [(k, pn, n) for k in g for pn, n in S[k]['paras']]
    tot = sum(n for _, _, n in allp) or 1; cum = 0
    groups.append(dict(fa=fa, fb=fb, paras=[[k + 1, pn, n, SN[k].get(pn, '')] for k, pn, n in allp]))
    for k in g:
        suttas.append(dict(no=k + 1, book=S[k]['book'], name=S[k]['name'], files=[fa + 1, fb], minutes=round(T / 60, 1) if len(g) == 1 else None, chars=S[k]['chars'], rate=round(chars / T, 1), paras=len(S[k]['paras']), joined=len(g) > 1))
    for k, pn, n in allp:
        t = cum / tot * T; cum += n
        f = fa
        while f < fb - 1 and t >= dur[f]: t -= dur[f]; f += 1
        files[f]['items'].append(dict(s=k + 1, p=pn, t=round(t), x=SN[k].get(pn, '')))
cs = [0]
for d in dur: cs.append(cs[-1] + d)
json.dump(dict(suttas=suttas, files=files, groups=groups, starts=cs), open(os.path.join(HERE, 'digha_plan.json'), 'w', encoding='utf8'), ensure_ascii=False)
for x in suttas: print(x['no'], x['name'][:16], 'files', x['files'], x['minutes'], 'min', x['rate'], 'c/s', '' if 6 <= x['rate'] <= 9.6 else '  <<< CHECK')

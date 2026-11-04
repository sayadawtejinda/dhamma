"""Full Pali text of every Digha paragraph, key 's|p' (same keys as digha.json) -> public/tipitaka-audio/data/digha_text.json (used by the slide view of the Tipitaka reader)."""
import json, re, html, os
D = 'C:/Users/sayad/Downloads/tipitaka/data/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'tipitaka-audio', 'data', 'digha_text.json')
texts = {}; k = 0; cur = None
for b in ('mula_di_01', 'mula_di_02', 'mula_di_03'):
    for pg in json.load(open(D + b + '.json', encoding='utf8')):
        for m in re.finditer(r'<p class="chapter">(.*?)</p>|<p class="(\w+)">(.*?)</p>', pg['content'], re.S):
            if m.group(1) is not None: k += 1; cur = None; continue
            if not k: continue
            body = m.group(3); n = re.search(r'<span class="paranum">([^<]+)</span>', body)
            t = html.unescape(re.sub('<[^>]+>', '', re.sub(r'<span class="paranum">[^<]*</span>', '', body)))
            t = re.sub(r'[ \t]+', ' ', t).strip()
            if m.group(2) in ('chapter', 'nikaya', 'book', 'subhead', 'centered') and not n: continue
            if n:
                cur = '%d|%s' % (k, n.group(1)); texts[cur] = t.lstrip('။ ').strip()
            elif cur and t: texts[cur] += '\n' + t
plan = json.load(open(os.path.join(os.path.dirname(OUT), 'digha.json'), encoding='utf8'))
keys = {'%d|%s' % (x[0], x[1]) for g in plan['groups'] for x in g['paras']}
print(len(texts), len(keys), 'missing', len(keys - set(texts)), 'extra', len(set(texts) - keys))
import re as _r
texts = {k: _r.sub(r'  +', ' ', _r.sub(r'\s*\[[^\]]*\]', '', v)).strip() for k, v in texts.items()}      # variant readings in [ ] are not read aloud
json.dump(texts, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(os.path.getsize(OUT) // 1024, 'KB')

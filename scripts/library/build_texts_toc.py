"""One file with the headings of every reading text, so the 'ဖတ်စာ' tab can search all contents at once.
Run after build_texts.py:  python scripts/library/build_texts_toc.py   -> public/library/texts/toc.json
"""
import os, json
T = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library', 'texts')
index = json.load(open(os.path.join(T, 'index.json'), encoding='utf8'))
out = []
for bi, b in enumerate(index):
    meta = json.load(open(os.path.join(T, b['id'] + '.json'), encoding='utf8'))
    for idx, lvl, text in meta['toc']:
        if text: out.append([bi, idx, lvl, text])
json.dump(dict(books=[b['id'] for b in index], toc=out), open(os.path.join(T, 'toc.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('headings', len(out))

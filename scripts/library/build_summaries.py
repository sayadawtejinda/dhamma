"""Collects the summaries (အနှစ်ချုပ်) written as small text files and makes the data the library page reads.

Source (edit these, or use the admin tool start_summary_admin.bat):
    scripts/library/summaries/<kind>-<key>.md
        kind = sermon | tape | book | text
        key  = sermon number (1, 2 ...) | track number (1, 2, ... = the 5 digits at the start of the mp3 name)
               | book id (b0a67b8 ...) | reading-text id (nib1, bk13, talk-mangala ...)
Output (committed, read by the page):
    public/library/data/summaries-index.json      {kind: [keys that have a summary]}   (small, loaded at start)
    public/library/data/summaries-<kind>.json     {key: "text"}                         (loaded when a summary is opened)
Run:  python scripts/library/build_summaries.py
"""
import os, re, json, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'summaries')
OUT = os.path.join(HERE, '..', '..', 'public', 'library', 'data')
KINDS = ('sermon', 'tape', 'book', 'text')

def build():
    os.makedirs(SRC, exist_ok=True)
    data = {k: {} for k in KINDS}
    for f in sorted(glob.glob(os.path.join(SRC, '*.md'))):
        m = re.fullmatch(r'(sermon|tape|book|text)-(.+)\.md', os.path.basename(f))
        if not m: continue
        txt = open(f, encoding='utf8').read().strip()
        if txt: data[m.group(1)][m.group(2)] = txt
    for k in KINDS:
        json.dump(data[k], open(os.path.join(OUT, 'summaries-%s.json' % k), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({k: sorted(data[k], key=lambda x: (len(x), x)) for k in KINDS}, open(os.path.join(OUT, 'summaries-index.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    return {k: len(v) for k, v in data.items()}

if __name__ == '__main__':
    print('summaries:', build())

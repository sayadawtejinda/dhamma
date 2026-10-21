"""Step 1: list every file of the song folder with size, duration, tags, md5 -> songs_inventory.json (scratch)."""
import os, sys, json, hashlib
from mutagen import File as MFile
SRC = sys.argv[1]
OUT = sys.argv[2]
rows = []
for root, ds, fs in os.walk(SRC):
    for f in fs:
        p = os.path.join(root, f)
        ext = os.path.splitext(f)[1].lower()
        r = dict(path=os.path.relpath(p, SRC).replace(chr(92), '/'), size=os.path.getsize(p), ext=ext)
        if ext in ('.mp3', '.wma', '.aac', '.wav', '.m4a', '.mp4'):
            h = hashlib.md5()
            with open(p, 'rb') as fh:
                for b in iter(lambda: fh.read(1 << 20), b''): h.update(b)
            r['md5'] = h.hexdigest()
            try:
                m = MFile(p, easy=True)
                r['dur'] = round(m.info.length, 1) if m and m.info else None
                if m and m.tags:
                    for k in ('title', 'artist', 'album'):
                        v = m.tags.get(k)
                        if v: r[k] = str(v[0])
            except Exception as e:
                r['err'] = str(e)[:60]
        rows.append(r)
json.dump(rows, open(OUT, 'w', encoding='utf8'), ensure_ascii=False)
print(len(rows), 'files')

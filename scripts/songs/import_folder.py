"""Brings a whole folder of songs into the library (names made automatically, duplicates not uploaded twice, lyrics from .lrc files).
Usage:  python import_folder.py <folder> <library id> ["library name"] [--dry]
  - every sub-folder = one collection of that library  (the library is created if it does not exist)
  - name / singer: from the file name (Zawgyi -> Unicode, numbers like 01. removed, "title - singer" split); a .lrc file beside an mp3 gives the title and the lyrics
  - the very same audio that is already in the library is not uploaded again (the new entry uses the existing file)
  - everything else is uploaded to archive.org (item dhamma-school-songs); run it again to continue if it stops
"""
import os, re, sys, json, hashlib, shutil, uuid
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import songs_admin as A

AUDIO = ('.mp3', '.wma', '.aac', '.wav', '.m4a')

def read_lrc(path):
    """.lrc -> (title, lyrics): the first text line is taken as the title; timestamps are removed"""
    try: t = open(path, encoding='utf8', errors='replace').read()
    except OSError: return '', ''
    lines = []
    for l in t.splitlines():
        l = re.sub(r'^(\s*\[[^\]]*\])+', '', l).strip()
        lines.append(l)
    while lines and not lines[0]: lines.pop(0)
    if not lines: return '', ''
    title = A._clean(lines[0]); body = '\n'.join(lines[1:]).strip()
    body = re.sub(r'\n{3,}', '\n\n', body)
    return title, body

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    folder, lib = args[0], args[1]; libname = args[2] if len(args) > 2 else None
    dry = '--dry' in sys.argv
    d = A.load()
    libs = d.setdefault('libs', [dict(id='main', name='ဓမ္မစကူးလ် သီချင်း ကဗျာများ')])
    if not any(x['id'] == lib for x in libs):
        libs.append(dict(id=lib, name=libname or lib))
        if not dry: A.save(d)
    elif libname and not dry:
        next(x for x in libs if x['id'] == lib)['name'] = libname; A.save(d)
    meta = A.jl(A.META, {}); by = {s['id']: s for s in d['songs']}
    md5_to = {m['md5']: sid for sid, m in meta.items() if m.get('md5') and sid in by}
    items = []; seen = set(); n_dup = 0
    for root, ds, fs in sorted(os.walk(folder)):
        rel = os.path.relpath(root, folder)
        coll = rel.split(os.sep)[0] if rel != '.' else os.path.basename(os.path.abspath(folder))
        for f in sorted(fs):
            if not f.lower().endswith(AUDIO): continue
            path = os.path.join(root, f); blob = open(path, 'rb').read(); md5 = hashlib.md5(blob).hexdigest()
            if md5 in seen: continue                                           # the same file twice in this folder
            seen.add(md5)
            lrc = os.path.splitext(path)[0] + '.lrc'
            title, artist = A.parse_name(f)
            lyrics = ''
            if os.path.exists(lrc):
                lt, lyrics = read_lrc(lrc)
                if lt and (not title or re.fullmatch(r'[A-Za-z]{1,3}\d*', title)): title = lt
            noname = not title or bool(re.fullmatch(r'[\d\s၀-၉a-zA-Z]{0,3}', title))
            if not title: title = ''
            it = dict(title=title if not noname else (title if title and len(title) > 0 else ''), artist=artist, name=f, md5=md5, newcol=coll, lib=lib,
                      k=bool(re.search(r'karaoke|ကာရာအိုကေ|instrumental', os.path.relpath(path, folder), re.I)), lyrics=lyrics)
            old = md5_to.get(md5)
            if old and by.get(old):
                if next((c.get('lib', 'main') for c in d['collections'] if c['id'] == by[old]['c']), 'main') == lib: continue       # already in this library: skip
                it['reuse'] = dict(f=by[old]['f'], z=by[old]['z'], d=by[old]['d']); n_dup += 1                               # in the other library: same audio file, no upload
            else:
                it['path'] = path
            items.append(it)
    print('files:', len(items), '| already on archive.org (no upload):', n_dup, '| to upload:', len(items) - n_dup, '| with lyrics:', sum(1 for x in items if x['lyrics']))
    if dry:
        for x in items[:40]: print('  ', x['newcol'][:18], '|', x['title'][:34], '|', x['artist'][:16], '|', 'REUSE' if x.get('reuse') else '', 'LRC' if x['lyrics'] else '')
        return
    # ids for all of them first, then the audio is uploaded in chunks of 20 (much faster than one by one)
    import internetarchive as ia, imageio_ffmpeg, time
    nid = A._next_id(d); todo = []
    for it in items:
        it['sid'] = 's%04d' % nid; nid += 1
        if it.get('reuse'): continue
        out = os.path.join(A.STAGE, it['sid'] + '.mp3')
        if not os.path.exists(out):
            if it['path'].lower().endswith('.mp3'): shutil.copyfile(it['path'], out)
            else: A.subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', it['path'], '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', out], check=True)
        it['uploaded'] = True; todo.append(it)
    have = {f['name']: int(f.get('size', 0)) for f in ia.get_item('dhamma-school-songs').files}
    todo = [it for it in todo if have.get(it['sid'] + '.mp3') != os.path.getsize(os.path.join(A.STAGE, it['sid'] + '.mp3'))]
    for i in range(0, len(todo), 20):
        chunk = {it['sid'] + '.mp3': os.path.join(A.STAGE, it['sid'] + '.mp3') for it in todo[i:i + 20]}
        for attempt in range(8):
            try:
                r = ia.upload('dhamma-school-songs', files=chunk, retries=20, retries_sleep=30, verbose=False, checksum=True, queue_derive=False)
                if all(x.status_code == 200 for x in r if x is not None and hasattr(x, 'status_code')): break
            except Exception as e:
                print('retry', attempt, str(e)[:80], flush=True); time.sleep(30)
        print('uploaded', min(i + 20, len(todo)), '/', len(todo), flush=True)
    job = {'finished': False}
    A.run_batch(job, items, '', '', lib)
    print('ok', job.get('ok'), 'of', job.get('total'))
    for l in job.get('log', []):
        if l.startswith('❌'): print(l)

if __name__ == '__main__':
    main()

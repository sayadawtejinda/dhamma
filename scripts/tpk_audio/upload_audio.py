"""Upload the Tipitaka recordings (Downloads/UIdarcakka) to archive.org item 'tipitaka-audio-myanmar', ONE FILE AFTER ANOTHER,
in the order Digha, Majjhima, Samyutta, Anguttara, Khuddaka, Abhidhamma.  Resumable (same size on archive.org = skipped).
Names: A-001.mp3 (Digha) B- (Majjhima) C- (Samyutta) D- (Anguttara) E- (Khuddaka) AB-A-0001 (Abhidhamma 6 books) PT-001 (Patthana 5 books).
Usage: python upload_audio.py [A B ...]"""
import os, re, sys, glob, time, json
import internetarchive as ia
ITEM = 'tipitaka-audio-myanmar'
R = 'C:/Users/sayad/Downloads/UIdarcakka/'
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = [('A', 'DIGHANIKAYA'), ('B', 'misjima-pyinpyi'), ('C', 'THANYOKE PYINPYI'), ('D', 'ANGOTETO-PYINPYI'), ('E', 'KHUDDAKA NIKARYA-ALL')]
def plan(letters):
    out = {}
    for L, d in SRC:
        if L in letters:
            for f in sorted(glob.glob(R + d + '/*.mp3'), key=lambda f: int(re.findall(r'\((\d+)\)', f)[0])):
                out['%s-%03d.mp3' % (L, int(re.findall(r'\((\d+)\)', f)[0]))] = f
    if 'F' in letters:        # Abhidhamma 6 books: A-0001 .. F-0194 inside the folder -> AB-A-0001.mp3 ...
        for f in sorted(glob.glob(R + 'ABIDAMMA 7-KYAN/First Abi Dhammar 6 Kyan Parli/*.mp3')):
            m = re.match(r'([A-Z])-(\d+)', os.path.basename(f)); out['AB-%s-%04d.mp3' % (m.group(1), int(m.group(2)))] = f
    if 'G' in letters:        # Patthana 5 books: 001..165 -> PT-001.mp3
        for f in sorted(glob.glob(R + 'ABIDAMMA 7-KYAN/Pahtan 5 Kyan Parli/*.mp3')): out['PT-%03d.mp3' % int(re.match(r'(\d+)', os.path.basename(f)).group(1))] = f
    return out
if __name__ == '__main__':
    letters = sys.argv[1:] or list('ABCDEFG')
    P = plan(letters); json.dump(P, open(os.path.join(HERE, 'upload_plan.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    meta = dict(mediatype='audio', collection='opensource_audio', title='Tipitaka Pali recitation (Myanmar) - audio',
                creator='Shared for public listening by a friend of the Dhamma School', language='pli', subject=['Tipitaka', 'Pali', 'Buddhist'])
    for n, (name, path) in enumerate(P.items(), 1):
        for attempt in range(8):
            try:
                it = ia.get_item(ITEM); have = {f['name']: int(f.get('size', 0)) for f in it.files} if it.exists else {}
                if have.get(name) == os.path.getsize(path): break
                r = ia.upload(ITEM, files={name: path}, metadata=meta, retries=20, retries_sleep=30, verbose=False, checksum=True, queue_derive=False)
                if all(x.status_code == 200 for x in r if x is not None and hasattr(x, 'status_code')): break
            except Exception as e:
                print('retry', name, attempt, str(e)[:100], flush=True); time.sleep(30)
        print('ok', name, n, '/', len(P), flush=True)

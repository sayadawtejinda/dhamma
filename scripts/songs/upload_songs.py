"""Step 4: upload the songs (upload_plan.json: archive name -> local file) to archive.org item 'dhamma-school-songs'.
Resumable: files already there with the same size are skipped.  Uses the keys saved by the earlier upload (ia.ini).
"""
import os, sys, json, time
import internetarchive as ia
ITEM = 'dhamma-school-songs'
HERE = os.path.dirname(os.path.abspath(__file__))
plan = json.load(open(os.path.join(HERE, 'upload_plan.json'), encoding='utf8'))
if '--only' in sys.argv:                        # upload only these archive names (new songs added later)
    keep = set(sys.argv[sys.argv.index('--only') + 1:]); plan = {k: v for k, v in plan.items() if k in keep}
def have():
    it = ia.get_item(ITEM)
    return {f['name']: int(f.get('size', 0)) for f in it.files} if it.exists else {}
todo = [(k, v) for k, v in plan.items() if have().get(k) != os.path.getsize(v)] if False else None
h = have()
todo = [(k, v) for k, v in plan.items() if h.get(k) != os.path.getsize(v)]
print(len(plan), 'files in plan,', len(todo), 'to upload', flush=True)
meta = dict(mediatype='audio', collection='opensource_audio', title='Dhamma School songs and poems (Myanmar)',
            creator='Dhamma School', subject=['Dhamma school', 'Buddhist songs', 'Burmese'], language='bur')
for n in range(0, len(todo), 20):
    chunk = dict(todo[n:n + 20])
    for attempt in range(8):
        try:
            r = ia.upload(ITEM, files=chunk, metadata=meta, retries=20, retries_sleep=30, verbose=False, checksum=True,
                          queue_derive=False)
            if all(x.status_code == 200 for x in r if x is not None and hasattr(x, 'status_code')): break
        except Exception as e:
            print('retry', attempt, str(e)[:100], flush=True); time.sleep(30)
    print('done', min(n + 20, len(todo)), '/', len(todo), flush=True)

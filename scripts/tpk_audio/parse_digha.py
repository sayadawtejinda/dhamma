import json,re,html
D='C:/Users/sayad/Downloads/tipitaka/data/'
def parse():
    suttas=[]
    for b in ('mula_di_01','mula_di_02','mula_di_03'):
        for p in json.load(open(D+b+'.json',encoding='utf8')):
            c=p['content']
            for m in re.finditer(r'<p class="chapter">(.*?)</p>|<span class="paranum">([^<]*)</span>|<p class="(?:bodytext|gatha\w*|unindented\w*|centered|subhead)[^"]*">',c):
                pass
            # sequential scan
            for m in re.finditer(r'<p class="chapter">(.*?)</p>|<p class="(\w+)">(.*?)</p>',c,re.S):
                if m.group(1) is not None:
                    suttas.append(dict(name=re.sub('<[^>]+>','',m.group(1)).strip(),book=b,paras=[],chars=0));continue
                if not suttas: continue
                t=re.sub('<[^>]+>','',m.group(3));t=html.unescape(t)
                n=re.search(r'class="paranum">([^<]+)<',m.group(3))
                s=suttas[-1];s['chars']+=len(t)
                if n: s['paras'].append([n.group(1),len(t)])
                elif s['paras']: s['paras'][-1][1]+=len(t)
    return suttas
if __name__=='__main__':
    for s in parse(): print(s['book'],s['name'],len(s['paras']),s['chars'])

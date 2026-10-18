"""Contents typed/OCR'd by hand for books whose PDF has no usable text layer (scanned) or a wrong contents list.

scripts/library/toc_manual/<book id>.txt holds the contents as one block of text: entries are separated by 3 or more
spaces and end with " - <page>" (Myanmar or Western digits). A heading without a page takes the page of the next
entry. MANUAL gives, for each book id, the number to add to a printed page number to get the PDF page.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
MANUAL = {
    'bd65c59': 5,    # သမထဘာဝနာနှင့် ဝိပဿနာဘာဝနာတို့တွင် အောင်မြင်ပေါက်မြောက်ခြင်း (scanned, printed page 13 = PDF page 18)
    'b58f192': 0,    # အမြိုက်နိဗ္ဗာန်သို့ ပို့ဆောင်ပေးနေသည့် စွမ်းအားကြီး ၇-ရပ် (printed page = PDF page)
    'b0a67b8': [(0, 4), (9, 10)],   # ဖားအောက်တောရမိတ်ဆက် (scanned): printed 3-8 = PDF 7-12 (+4), then 8 pages of photographs, printed 9+ = PDF 19+ (+10)
}
def pdf_page(book_id, printed):
    o = MANUAL[book_id]
    if isinstance(o, int): return printed + o
    off = o[0][1]
    for frm, v in o:
        if printed >= frm: off = v
    return printed + off
MYD = '၀၁၂၃၄၅၆၇၈၉'
def to_int(s): return int(''.join(str(MYD.index(c)) if c in MYD else c for c in s))

# letters the OCR produced from other scripts
FIX = [('ಾ', 'ာ'), ('ಮ', 'မ'), ('ರು', 'ရု'), ('ು', 'ု'), ('ರ', 'ရ'), ('ਮੁစိတု', 'မုဉ္စိတု')]
def clean_title(t):
    for a, b in FIX: t = t.replace(a, b)
    t = re.sub(r'\s+', ' ', t).strip(' -')
    return t

def parse(book_id):
    path = os.path.join(HERE, 'toc_manual', book_id + '.txt')
    if not os.path.exists(path): return []
    txt = open(path, encoding='utf8').read().strip()
    txt = re.sub(r'^မာတိကာ\s*\(အပိုင်း\s*[၀-၉0-9]+\)\s*', '', txt)
    pending, out = [], []
    for chunk in re.split(r'\s{3,}', txt):
        chunk = chunk.strip()
        if not chunk: continue
        m = re.match(r'^(.*\S)\s*-\s*([၀-၉0-9]+)\s*$', chunk)
        if m:
            page = to_int(m.group(2))
            for h in pending: out.append((clean_title(h), page))
            pending = []
            out.append((clean_title(m.group(1)), page))
        else:
            pending.append(chunk)
    return out

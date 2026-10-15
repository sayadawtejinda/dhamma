"""Extra clean-up for the contents lines read from the PDFs (used by build_toc.py).

1. Letter fixes for glyph codes the Win Innwa converter leaves behind (k -> ု, S -> ှ, ç -> ၊ ...), the tall/short
   'aa' rule (ါ after ခ ဂ င ဒ ပ ဝ), and ှ put before the vowel sign.
2. Page-header junk that got glued to entries: 'စာမျက်နှာ အကြောင်းအရာ', the book's own running title (often repeated
   5 times), index-tab letters (ဃ ဃ ဃ …), the opening salutation, 'ပထမတွဲ - မာတိကာ'.
3. Matching with the headings of the Unicode reading texts (public/library/texts/toc.json): when a line is almost
   the same as a heading of the same books, the clean Unicode heading is used (original kept for the review page).
"""
import os, re, json, difflib, collections

LIB = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'library')
MY = 'က-႟'
CONS = 'က-အ'

SALUT = re.compile(r'နမော\s*တဿ\s*ဘဂဝတော\s*အရဟတော\s*သမ္မာသမ္ဗုဒ္ဓဿ။?')
VOLHEAD = re.compile(r'(ပထမ|ဒုတိယ|တတိယ|စတုတ္ထ|ပဉ္စမ)တွဲ\s*-?\s*မာတိကာ')

def letters(t):
    # leftover glyph codes (guessed from lines the user corrected / aligned with the Unicode texts)
    t = t.replace('ç', '၊').replace('¿', '?').replace('à', ' ')
    t = t.replace('Å', '္တ').replace('¾', '္ဂ')      # stacked ta / ga (သနÅတိ -> သန္တတိ, ပုဂိ¾Kလ် -> ပုဂ္ဂိုလ်)
    t = re.sub(r'(?<=[%s])G' % MY, 'ွ', t)           # medial wa (ဆဲG -> ဆွဲ)
    t = re.sub(r'(?<=[%s])[kK]' % MY, 'ု', t)
    t = re.sub(r'(?<=[%s])S' % MY, 'ှ', t)
    t = re.sub(r'(?<=[%s])J' % MY, 'ဲ', t)
    t = re.sub(r'(?<=[%s])H' % MY, 'ံ', t)
    t = re.sub(r'(?<=[%s])g' % MY, 'ါ', t)       # codes that followed another leftover code (ဇိဝSg -> ဇိဝှါ)
    t = re.sub(r'(?<=[%s])d' % MY, 'ိ', t)
    t = re.sub(r'(?<=[%s])D' % MY, 'ီ', t)
    t = re.sub(r'(?<=[%s])m' % MY, 'ာ', t)
    t = re.sub(r'[\]\[\{\}]', ' ', t)
    # medials and stacked consonants must come before the vowel signs (လဲှ -> လှဲ, ဂိ္ဂ -> ဂ္ဂိ)
    t = re.sub(r'([ုူိီေဲံ့း]+)([ျြွှ])', r'\2\1', t)
    t = re.sub(r'([ုူိီေဲံ့း]+)(္[က-အ])', r'\2\1', t)
    # tall aa after ခ ဂ င ဒ ပ ဝ (not stacked and without a medial), e.g. အင်္ဂာ -> အင်္ဂါ
    t = re.sub(r'([ခဂငဒပဝ])ာ', r'\1ါ', t)
    return t

def junk(t, book_title):
    t = SALUT.sub(' ', t)
    t = VOLHEAD.sub(' ', t)
    t = re.sub(r'စာမျက်နှာ|အကြောင်းအရာ|မာတိကာ', ' ', t)
    # a single index-tab letter standing alone (ဃ ဃ ဃ …)
    toks = [w for w in t.split() if not (len(w) == 1 and re.fullmatch('[%s]' % CONS, w))]
    # a phrase that repeats (the running title printed on every tab) is page header, not an entry
    changed = True
    while changed:
        changed = False
        n = len(toks)
        for size in range(min(12, n // 2), 1, -1):
            seen = {}
            for i in range(0, n - size + 1):
                seq = tuple(toks[i:i + size])
                if seq in seen:
                    j = seen[seq]
                    if j + size <= i:
                        # remove every occurrence
                        out, k = [], 0
                        while k < n:
                            if tuple(toks[k:k + size]) == seq: k += size
                            else: out.append(toks[k]); k += 1
                        toks = out; changed = True; break
                else: seen[seq] = i
            if changed: break
    t = ' '.join(toks)
    # the book's own title at the start of the line is the running header
    bt = re.sub(r'[\s\-–()၊။]+', '', book_title)
    words = t.split()
    for k in range(min(len(words), 9), 1, -1):
        pre = re.sub(r'[\s\-–()၊။]+', '', ''.join(words[:k]))
        if len(pre) >= 8 and difflib.SequenceMatcher(None, re.sub('[a-zA-Z]', '', pre), bt).ratio() >= .8:
            words = words[k:]; break
    return ' '.join(words).strip(' .-၊')

# ---------------------------------------------------------------- heading dictionary from the Unicode reading texts
_norm = lambda s: re.sub(r'[A-Za-z\s​၊။.,()\[\]\-_:;\'"0-9၀-၉–—=]+', '', s)
_idx = None
def _load():
    global _idx
    if _idx is not None: return _idx
    _idx = {'by5': collections.defaultdict(list), 'exact': {}}
    p = os.path.join(LIB, 'texts', 'toc.json')
    if os.path.exists(p):
        seen = set()
        for bi, idx, lvl, text in json.load(open(p, encoding='utf8'))['toc']:
            h = re.sub(r'^[၀-၉]+[။.\-\s]+', '', text).strip()
            n = _norm(h)
            if len(n) < 6 or h in seen: continue
            seen.add(h)
            _idx['exact'][n] = h
            _idx['by5'][n[:4]].append((n, h)); _idx['by5'][n[-4:]].append((n, h))
    return _idx

DIG = re.compile(r'[0-9၀-၉]+')
def digits(t): return DIG.findall(t)

def match_heading(t):
    """(better text, ratio) if the line is nearly a heading of the Unicode texts, else (None, 0)"""
    ix = _load()
    m = re.match(r'^([၀-၉]+[။.\-]\s*)?(.*)$', t)
    pre, body = (m.group(1) or ''), m.group(2)
    n = _norm(body)
    if len(n) < 6: return None, 0
    if n in ix['exact'] and digits(body) == digits(ix['exact'][n]): return pre + ix['exact'][n], 1.0
    best, br = None, 0
    seen = set()
    for key in (n[:4], n[-4:]):
        for hn, h in ix['by5'].get(key, []):
            if hn in seen or abs(len(hn) - len(n)) > 2: continue
            seen.add(hn)
            r = difflib.SequenceMatcher(None, n, hn).ratio()
            if r > br: best, br = h, r
    if best and br >= .9 and digits(body) == digits(best): return pre + best, br
    return None, 0

_vocab = None
SPLIT = re.compile(r'[\s၊။,.;:()\[\]\-–—=?!"\'“”‘’/]+')
def vocab():
    global _vocab
    if _vocab is None:
        _vocab = collections.Counter()
        d = os.path.join(LIB, 'texts')
        for f in os.listdir(d):
            if re.fullmatch(r'[\w-]+\.\d+\.json', f):
                for k, h in json.load(open(os.path.join(d, f), encoding='utf8')):
                    for w in SPLIT.split(re.sub(r'<[^>]+>', '', h)):
                        if 3 <= len(w) <= 30 and re.fullmatch('[%s]+' % MY, w): _vocab[w] += 1
    return _vocab

ADD = 'ကခဂဃငစဆဇဈညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအာါုူိီေဲံ့း်္ျြွှ'
def repair_word(w):
    """one letter missing or extra compared with a word that is common in the reading texts"""
    V = vocab()
    if V[w] >= 2 or len(w) < 4: return w
    cands = collections.Counter()
    for i in range(len(w) + 1):
        for c in ADD:
            x = w[:i] + c + w[i:]
            if V[x] >= 3: cands[x] += V[x]
    for i in range(len(w)):
        x = w[:i] + w[i + 1:]
        if V[x] >= 3: cands[x] += V[x]
    if not cands:
        for i in range(3, len(w) - 2):          # long compound: repair one half when the other half is a known word
            L, R = w[:i], w[i:]
            if V[R] >= 2 and V[L] < 2:
                x = repair_word(L)
                if x != L: return x + R
            if V[L] >= 2 and V[R] < 2:
                x = repair_word(R)
                if x != R: return L + x
        return w
    top = cands.most_common(2)
    if len(top) == 1 or top[0][1] >= 3 * top[1][1]: return top[0][0]
    return w

def repair(t):
    out, pos = [], 0
    for m in re.finditer('[%s]+' % MY, t):
        out.append(t[pos:m.start()]); out.append(repair_word(m.group(0))); pos = m.end()
    out.append(t[pos:]); return ''.join(out)

ODD = re.compile("[^%s0-9\\s().,:;\\-–=?/'\"“”‘’]" % MY)
def garbage(t):
    """lines that are mostly conversion garbage (not worth keeping)"""
    return len(t) > 160 or len(ODD.findall(t)) > max(2, len(t) // 20)

def fix(t, book_title):
    """returns (cleaned title, original-if-replaced-by-a-heading or None)"""
    t = letters(t)
    t = junk(t, book_title)
    t = re.sub(r'\s+', ' ', t).strip(' .-၊')
    if t and not garbage(t): t = repair(t)
    # only lines that still show conversion garbage are replaced by a heading of the reading texts; clean lines keep the PDF's spelling
    better, r = match_heading(t) if t and re.search('[A-Za-z]', t) else (None, 0)
    if better and better != t: return better, t
    return t, None

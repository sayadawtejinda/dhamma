"""Build public/wiki-linker/wikisource-links.json from the "လင့်များ" sheet of Myanmar OCR Script.xlsx.

Sheet layout (three side-by-side tables, one link per row):
  G = "* [URL display]"   (A-H, Mahabuddhavamsa etc.)
  M = "* [URL display]"   (I-N, Vinaya pages ...)
  S = "* [URL display]"   (O-T, Ledi Sayadaw ...)
Only those wikitext columns are read; the first row is the template row and is skipped.

Usage:  python -X utf8 scripts/build_wiki_links.py ["path/to/Myanmar OCR Script.xlsx"]
Output: public/wiki-linker/wikisource-links.json  =  {"base": ..., "pages": [{"p": page, "h": [item, ...]}]}
        item = "display"            -> anchor is display with spaces -> "_"
             = ["display", anchor]  -> anchor differs ("" = link to the page itself)
"""
import json
import os
import re
import sys
from collections import OrderedDict

import openpyxl

BASE = "https://my.wikisource.org/wiki/"
SHEET = "လင့်များ"
WIKITEXT_COLS = (6, 12, 18)  # G, M, S (0-based)
LINE = re.compile(r"^\* \[(https://my\.wikisource\.org/wiki/\S+) (.+)\]$", re.S)

default_xlsx = os.path.join(os.path.expanduser("~"), "Downloads", "Myanmar OCR Script.xlsx")
xlsx = sys.argv[1] if len(sys.argv) > 1 else default_xlsx
out_path = os.path.join(os.path.dirname(__file__), "..", "public", "wiki-linker", "wikisource-links.json")

wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
rows = list(wb[SHEET].iter_rows(values_only=True))[1:]

pages = OrderedDict()
seen = set()
skipped = []
total = 0
for r in rows:
    for c in WIKITEXT_COLS:
        wt = r[c] if len(r) > c else None
        if not wt:
            continue
        wt = str(wt).strip()
        # some page names carry a stray line break before "#": it would break the link, so drop it
        wt = re.sub(r"\s*\n\s*#", "#", wt)
        if not wt.startswith("* [") and wt.endswith("]"):
            wt = "* [" + BASE + wt  # a few rows lost the "* [https://my.wikisource.org/wiki/" prefix
        m = LINE.match(wt)
        if not m:
            skipped.append(wt)
            continue
        url, display = m.group(1), m.group(2).strip()
        tail = url[len(BASE):]
        page, _, anchor = tail.partition("#")
        if not page or "[" in display or "]" in display or len(display) < 2:
            skipped.append(wt)
            continue
        total += 1
        if (page, anchor, display) in seen:
            continue
        seen.add((page, anchor, display))
        item = display if anchor == display.replace(" ", "_") else [display, anchor]
        pages.setdefault(page, []).append(item)

data = {"base": BASE, "pages": [{"p": p, "h": h} for p, h in pages.items()]}
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

n = sum(len(h) for h in pages.values())
print(f"{total} rows read, {n} unique links on {len(pages)} pages, {len(skipped)} skipped -> {os.path.abspath(out_path)}")
print(f"size {os.path.getsize(out_path) / 1e6:.1f} MB")
for s in skipped[:5]:
    print("  skipped:", s[:120])

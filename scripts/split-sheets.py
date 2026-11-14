"""Cuts the 6-picture sheets that Gemini draws into single pictures and keeps 5 of them.

Run it by double-clicking split-sheets.bat. For every sheet (a file whose name starts with Gemini_Generated, in
C:\\Users\\sayad\\Pictures\\Screenshots or in Downloads) it:
  1. finds the pictures on the sheet (the white lines between them), left to right, top to bottom,
  2. shows you a numbered preview and asks which ONE to leave out (type its number; just Enter = none left out
     if the sheet has only 5 pictures),
  3. saves the others as separate .png files in the Screenshots folder, in story order,
  4. moves the sheet itself into Screenshots\\sheets (nothing is deleted).
Then double-click add-lessons.bat: it takes 5 pictures for each lesson, oldest first.
The layout does not have to be 3 x 2: it works out the rows and columns from the white lines, and if it cannot
it asks you ("3x2" means 3 across, 2 down).
"""
import os
import re
import sys
import shutil
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.expanduser('~')
SHOTS = os.path.join(HOME, 'Pictures', 'Screenshots')        # sheets may also be waiting here (they are looked for in all three folders)
DOWNLOADS = os.environ.get('LESSON_DOWNLOADS') or os.path.join(HOME, 'Downloads')
# the single pictures are saved in Downloads/lesson-pictures (add-lessons.bat reads them from there) and the sheets are moved into its 'sheets' folder
WORK = os.environ.get('LESSON_PICTURES') or os.path.join(DOWNLOADS, 'lesson-pictures')
PREFIX = 'gemini_generated'
NUMBERED = re.compile(r'^(\d{1,3})\.(?:png|jpe?g|webp)$')   # 01.jpg, 2.png ...
KEEP = 5


def find_sheets():
    found = []
    for folder in (WORK, SHOTS, DOWNLOADS):
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            low = name.lower()
            # a Gemini sheet, or a sheet named by its lesson number (01.jpg, 02.jpg, 10.png ...)
            if (low.startswith(PREFIX) or NUMBERED.match(low)) and low.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                found.append(os.path.join(folder, name))
    # numbered sheets go in lesson order (01, 02, 03 ...), so the pictures come out in story order; the others by time
    def order(path):
        m = NUMBERED.match(os.path.basename(path).lower())
        return (0, int(m.group(1)), 0) if m else (1, 0, os.path.getmtime(path))
    return sorted(found, key=order)


def runs_of(flags, min_len):
    """Stretches where flags is False (= picture, not white line) that are at least min_len long."""
    out, start = [], None
    for i, gutter in enumerate(list(flags) + [True]):
        if not gutter and start is None:
            start = i
        elif gutter and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def drop_small(runs, frac=0.6):
    """A banner or a border strip is much smaller than a real picture: leave such runs out."""
    if not runs:
        return runs
    big = max(r1 - r0 for r0, r1 in runs)
    return [r for r in runs if (r[1] - r[0]) >= big * frac]


def strips(block, axis, min_frac):
    """Every way of finding the gaps along one direction of `block`: white lines at several strictness levels, and 'plain strips'
    (almost no change along them, even if they are beige). axis=0 -> columns, axis=1 -> rows. Returns a list of run-lists."""
    n = block.shape[1] if axis == 0 else block.shape[0]
    found = []
    for level, share in ((235, 0.9), (215, 0.95), (195, 0.95), (180, 0.97)):
        white = (block > level).all(axis=2)
        found.append(drop_small(runs_of(white.mean(axis=axis) > share, int(n * min_frac))))
    g = block.mean(axis=2)
    for limit in (6, 10, 16):
        found.append(drop_small(runs_of(g.std(axis=axis) < limit, int(n * min_frac))))
    return found


def candidates(img):
    """All (cols, rows) layouts of 2-3 x 2-3 pictures found by working rows first and then columns inside the rows' band
    (so a banner on top cannot spoil the column gaps), and the other way round."""
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    out = []
    for rows in strips(a, 1, 0.08):
        if len(rows) not in (2, 3):
            continue
        band = a[rows[0][0]:rows[-1][1]]
        for cols in strips(band, 0, 0.08):
            if len(cols) in (2, 3):
                out.append((cols, rows))
    for cols in strips(a, 0, 0.08):
        if len(cols) not in (2, 3):
            continue
        band = a[:, cols[0][0]:cols[-1][1]]
        for rows in strips(band, 1, 0.08):
            if len(rows) in (2, 3):
                out.append((cols, rows))
    return out


def coverage(cols, rows, w, h):
    return sum((c1 - c0) * (r1 - r0) for c0, c1 in cols for r0, r1 in rows) / (w * h)


def detect(img):
    """The layout that gives 6 pictures (a sheet) and covers the most of the sheet, else 5; if none, the caller asks."""
    w, h = img.size
    cands = candidates(img)
    for want in (6, 5):
        good = [(c, r) for c, r in cands if len(c) * len(r) == want]
        if good:
            return max(good, key=lambda cr: coverage(cr[0], cr[1], w, h))
    return cands[0] if cands else ([], [])


def even_grid(img, across, down, t=0, b=0, side=0, gap=0):
    """across x down tiles; t/b = a banner to skip at the top/bottom, side = margin left and right, gap = space between tiles (pixels)."""
    w, h = img.size
    tw = (w - 2 * side - gap * (across - 1)) / across
    th = (h - t - b - gap * (down - 1)) / down
    cols = [(round(side + i * (tw + gap)), round(side + i * (tw + gap) + tw)) for i in range(across)]
    rows = [(round(t + i * (th + gap)), round(t + i * (th + gap) + th)) for i in range(down)]
    return cols, rows


def parse_layout(text):
    """'3x2' or '3x2 t78 g20 s22 b26' (t = banner at top, b = at bottom, s = side margins, g = gap between pictures, pixels)."""
    parts = text.lower().replace(',', ' ').split()
    across, down = [int(x) for x in parts[0].split('x')]
    opt = {'t': 0, 'b': 0, 's': 0, 'g': 0}
    for p in parts[1:]:
        opt[p[0]] = int(p[1:])
    return across, down, opt


def preview(img, boxes, path):
    pv = img.convert('RGB').copy()
    d = ImageDraw.Draw(pv)
    try:
        font = ImageFont.truetype('arialbd.ttf', max(40, img.size[0] // 14))
    except Exception:
        font = ImageFont.load_default()
    for n, (x0, y0, x1, y1) in enumerate(boxes, 1):
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        r = max(34, img.size[0] // 22)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(220, 30, 30))
        d.text((cx, cy), str(n), fill='white', font=font, anchor='mm')
    pv.thumbnail((1400, 1400))
    pv.save(path)


def main():
    sheets = find_sheets()
    if not sheets:
        print('No sheets found. Put the Gemini pictures (names start with Gemini_Generated, or are just the lesson number like 01.jpg) in')
        print(DOWNLOADS + ' (or ' + SHOTS + '), then run this again.')
        return
    os.makedirs(os.path.join(WORK, 'sheets'), exist_ok=True)
    print(f'{len(sheets)} sheet(s) found.\n')
    clock = time.time()
    for sheet in sheets:
        name = os.path.basename(sheet)
        print('Sheet:', name)
        img = Image.open(sheet)
        img.load()
        cols, rows = detect(img)
        count = len(cols) * len(rows)
        if count < 2 or count > 12:
            print(f'  I could not find the pictures by their white lines ({count} found).')
            layout = input('  Layout, across x down (for example 3x2): ').strip().lower()
            try:
                across, down, o = parse_layout(layout)
            except Exception:
                print('  Skipped this sheet.\n')
                continue
            cols, rows = even_grid(img, across, down, o['t'], o['b'], o['s'], o['g'])
        else:
            print(f'  Found {len(cols)} across x {len(rows)} down = {count} pictures.')
        boxes = [(c0, r0, c1, r1) for (r0, r1) in rows for (c0, c1) in cols]
        pv_path = os.path.join(WORK, 'sheets', '_preview.png')
        preview(img, boxes, pv_path)
        try:
            if os.environ.get('LESSON_NO_OPEN'):
                raise OSError
            os.startfile(pv_path)
        except Exception:
            print('  Preview saved here:', pv_path)
        # a picture's own light header can be taken for a white line, so a sheet is sometimes cut into too many tiles:
        # when it is not 5 or 6 pictures, let the teacher say the real layout (the preview shows what was found)
        if len(boxes) not in (KEEP, KEEP + 1):
            while True:
                fix = input(f'  {len(boxes)} pictures found, but a sheet has 6. Type w to cut it as 3 across x 2 down, or just Enter to accept: ').strip().lower()
                if not fix:
                    break
                if fix == 'w':
                    fix = '3x2'
                try:
                    across, down, o = parse_layout(fix)
                    cols, rows = even_grid(img, across, down, o['t'], o['b'], o['s'], o['g'])
                    boxes = [(c0, r0, c1, r1) for (r0, r1) in rows for (c0, c1) in cols]
                    preview(img, boxes, pv_path)
                    try:
                        if os.environ.get('LESSON_NO_OPEN'):
                            raise OSError
                        os.startfile(pv_path)
                    except Exception:
                        print('  Preview saved here:', pv_path)
                    print(f'  Now {len(boxes)} pictures.')
                    if len(boxes) in (KEEP, KEEP + 1):
                        break
                except Exception:
                    print('  Please type it like 3x2.')
        drop = None
        if len(boxes) > KEEP:
            need = len(boxes) - KEEP
            while True:
                ans = input(f'  Which {"picture" if need == 1 else str(need) + " pictures"} to leave out? Type the number{"s separated by spaces" if need > 1 else ""} (s = skip this sheet): ').strip().lower()
                if ans == 's':
                    drop = 'skip'
                    break
                try:
                    nums = sorted({int(x) for x in ans.replace(',', ' ').split()})
                except ValueError:
                    nums = []
                if len(nums) == need and all(1 <= n <= len(boxes) for n in nums):
                    drop = set(nums)
                    break
                print('  Please type', need, 'different number(s) between 1 and', len(boxes))
        else:
            drop = set()
        if drop == 'skip':
            print('  Skipped.\n')
            continue
        base = os.path.splitext(name)[0]
        # Which lesson is this sheet for? A sheet named by its number (03.jpg) is lesson 3; for any other sheet you are asked.
        # With a lesson number the pictures are saved as L03-P1 ... L03-P5 (story order), which add-lessons.bat with a picture plan
        # reads BY NAME, so the order cannot get mixed up. Enter = the old way (no name, the order of the files).
        m_num = NUMBERED.match(name.lower())
        lesson_no = int(m_num.group(1)) if m_num else None
        if lesson_no is None:
            ans = input('  Which LESSON is this sheet for? Type its number (Enter = no number, the old way): ').strip()
            lesson_no = int(ans) if ans.isdigit() else None
        saved = 0
        for n, box in enumerate(boxes, 1):
            if n in drop:
                continue
            x0, y0, x1, y1 = box
            tile = img.convert('RGB').crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2))
            out = os.path.join(WORK, f'L{lesson_no:02d}-P{saved + 1}.png') if lesson_no else os.path.join(WORK, f'{base}_{n}.png')
            tile.save(out)
            clock += 2  # each piece one step newer than the last, so they stay in story order
            os.utime(out, (clock, clock))
            saved += 1
        dest = os.path.join(WORK, 'sheets', name)
        if os.path.abspath(sheet) != os.path.abspath(dest):
            shutil.move(sheet, dest)
        print(f'  Saved {saved} pictures in {WORK}; the sheet was moved to {os.path.join(WORK, "sheets")}.\n')
    try:
        os.remove(os.path.join(WORK, 'sheets', '_preview.png'))
    except Exception:
        pass
    print('Done. Next: double-click add-lessons.bat')


if __name__ == '__main__':
    main()

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
import sys
import shutil
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.expanduser('~')
SHOTS = os.environ.get('LESSON_PICTURES') or os.path.join(HOME, 'Pictures', 'Screenshots')
DOWNLOADS = os.environ.get('LESSON_DOWNLOADS') or os.path.join(HOME, 'Downloads')
PREFIX = 'gemini_generated'
KEEP = 5


def find_sheets():
    found = []
    for folder in (SHOTS, DOWNLOADS):
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            if name.lower().startswith(PREFIX) and name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                found.append(os.path.join(folder, name))
    return sorted(found, key=os.path.getmtime)


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


def detect(img):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    h, w = a.shape[:2]
    # the lines between pictures are light (but JPEG makes them not quite white), the picture frames are darker
    white = (a > 195).all(axis=2)
    col_gutter = white.mean(axis=0) > 0.95
    row_gutter = white.mean(axis=1) > 0.95
    cols = runs_of(col_gutter, int(w * 0.08))
    rows = runs_of(row_gutter, int(h * 0.08))
    return cols, rows


def even_grid(img, across, down):
    w, h = img.size
    cols = [(round(i * w / across), round((i + 1) * w / across)) for i in range(across)]
    rows = [(round(i * h / down), round((i + 1) * h / down)) for i in range(down)]
    return cols, rows


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
        print('No sheets found. Put the Gemini pictures (names start with Gemini_Generated) in')
        print(SHOTS + ' or in Downloads, then run this again.')
        return
    os.makedirs(os.path.join(SHOTS, 'sheets'), exist_ok=True)
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
            layout = input('  Layout, across x down (for example 3x2): ').strip().lower().replace(' ', '')
            try:
                across, down = [int(x) for x in layout.split('x')]
            except Exception:
                print('  Skipped this sheet.\n')
                continue
            cols, rows = even_grid(img, across, down)
        else:
            print(f'  Found {len(cols)} across x {len(rows)} down = {count} pictures.')
        boxes = [(c0, r0, c1, r1) for (r0, r1) in rows for (c0, c1) in cols]
        pv_path = os.path.join(SHOTS, 'sheets', '_preview.png')
        preview(img, boxes, pv_path)
        try:
            if os.environ.get('LESSON_NO_OPEN'):
                raise OSError
            os.startfile(pv_path)
        except Exception:
            print('  Preview saved here:', pv_path)
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
        saved = 0
        for n, box in enumerate(boxes, 1):
            if n in drop:
                continue
            x0, y0, x1, y1 = box
            tile = img.convert('RGB').crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2))
            out = os.path.join(SHOTS, f'{base}_{n}.png')
            tile.save(out)
            clock += 2  # each piece one step newer than the last, so they stay in story order
            os.utime(out, (clock, clock))
            saved += 1
        dest = os.path.join(SHOTS, 'sheets', name)
        if os.path.abspath(sheet) != os.path.abspath(dest):
            shutil.move(sheet, dest)
        print(f'  Saved {saved} pictures in {SHOTS}; the sheet was moved to {os.path.join(SHOTS, "sheets")}.\n')
    try:
        os.remove(os.path.join(SHOTS, 'sheets', '_preview.png'))
    except Exception:
        pass
    print('Done. Next: double-click add-lessons.bat')


if __name__ == '__main__':
    main()

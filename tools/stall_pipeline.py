#!/usr/bin/env python3
"""Stall pipeline (scene2-spec.md section 9). Re-runnable. Pillow + numpy only.

Inputs: assets/raw/stall_A.png / stall_B.png / stall_C.png, or a stall_sheet.png
(A yellow, B magenta, C black/yellow, left to right). Falls back to the Drive
exports sprite_stall_2_3_4.png (A, B, C) and reports sprite_stall_1.png.
Outputs: assets/stalls/stall_X.png (64x64), stall_X_front.png (rows y>=40, 64x24),
tools/preview_stall.png (4x on #4A1A14 with placeholder ghost 32x48 and bird 32x32).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from assetlib import STALL_PALETTE, blobs, hex_rgb, integer_factor, load_rgba, off_palette_count, resize_int, save_rgba, snap

ROOT = os.path.join(os.path.dirname(__file__), '..')
RAW = os.path.join(ROOT, 'assets/raw')
INCOMING = os.path.join(ROOT, 'assets/incoming/Scene_2_Sprite')
OUT = os.path.join(ROOT, 'assets/stalls')
SIZE, COUNTER_Y, OPEN_Y = 64, 40, 16
report = []


def say(msg):
    report.append(msg)
    print(msg)


def sources():
    raw = {k: os.path.join(RAW, f'stall_{k}.png') for k in 'ABC'}
    found = {k: load_rgba(p) for k, p in raw.items() if os.path.exists(p)}
    if found:
        return found, 'assets/raw'
    for sheet in [os.path.join(RAW, 'stall_sheet.png'), os.path.join(INCOMING, 'sprite_stall_2_3_4_192x64.png'),
                  os.path.join(INCOMING, 'sprite_stall_2_3_4.png')]:
        if os.path.exists(sheet):
            a = load_rgba(sheet)
            if a.shape[:2] == (SIZE, SIZE * 3):  # native sheet: three 64x64 cells
                say(f'{os.path.basename(sheet)}: 192x64, sliced into three 64x64 cells')
                return {k: a[:, i * SIZE:(i + 1) * SIZE] for i, k in enumerate('ABC')}, os.path.basename(sheet)
            boxes = blobs(a, min_px=500, gap=3)
            say(f'{os.path.basename(sheet)}: {len(boxes)} stalls found {[(w, h) for x, y, w, h in boxes]}')
            return {k: a[y:y + h, x:x + w] for k, (x, y, w, h) in zip('ABC', boxes)}, os.path.basename(sheet)
    return {}, None


def checks(k, a):
    """Counter row and empty opening, measured on the stall as given (scaled to 64 rows for the report)."""
    h, w = a.shape[:2]
    op = a[..., 3] >= 128
    cols = op.any(0)
    x0, x1 = int(np.argmax(cols)), int(w - np.argmax(cols[::-1]))
    full = next((y for y in range(h) if op[y, x0:x1].mean() >= 0.98), None)
    at64 = None if full is None else round(full * SIZE / h, 1)
    say(f'stall_{k}: counter spans full width from y={full} of {h} (= {at64} at 64 px; must be {COUNTER_Y})')
    y0, y1 = round(OPEN_Y * h / SIZE), round(COUNTER_Y * h / SIZE)
    inner = a[y0:y1, x0 + (x1 - x0) // 5: x1 - (x1 - x0) // 5]
    nonblack = int(((inner[..., :3] != 0).any(-1) & (inner[..., 3] >= 128)).sum())
    say(f'stall_{k}: opening y {OPEN_Y}-{COUNTER_Y} (rows {y0}-{y1}): {nonblack} non-black px')


def preview(stalls):
    """4x layering preview: stall, ghost (behind counter), stall_front, bird."""
    s = 4
    W, H = 3 * 80 + 16, 110
    im = Image.new('RGB', (W, H), hex_rgb('#4A1A14'))
    d = ImageDraw.Draw(im)
    for i, k in enumerate('ABC'):
        ox, oy = 8 + i * 80, 30
        st = stalls.get(k)
        if st is not None:
            im.paste(Image.fromarray(st, 'RGBA'), (ox, oy), Image.fromarray(st, 'RGBA'))
        else:
            d.rectangle([ox, oy, ox + 63, oy + 63], outline=hex_rgb('#F02DF0'))
        # ghost 32x48, bottom 12 px below the counter top: head and shoulders above y=40
        gx, gb = ox + 16, oy + COUNTER_Y + 12
        d.rectangle([gx, gb - 48, gx + 31, gb - 1], fill=hex_rgb('#FFFFFF'))
        if st is not None:
            fr = st[COUNTER_Y:]
            im.paste(Image.fromarray(fr, 'RGBA'), (ox, oy + COUNTER_Y), Image.fromarray(fr, 'RGBA'))
        else:
            d.rectangle([ox, oy + COUNTER_Y, ox + 63, oy + 63], fill=hex_rgb('#C4C42E'))
        d.line([ox - 4, oy + COUNTER_Y, ox + 67, oy + COUNTER_Y], fill=hex_rgb('#FFFF4F'))
    d.rectangle([W - 40, 30 + 64 - 32, W - 9, 30 + 63], fill=hex_rgb('#F02DF0'))  # bird 32x32
    im.resize((W * s, H * s), Image.NEAREST).save(os.path.join(os.path.dirname(__file__), 'preview_stall.png'))


def main():
    os.makedirs(OUT, exist_ok=True)
    extra = os.path.join(INCOMING, 'sprite_stall_1.png')
    if os.path.exists(extra):
        say('sprite_stall_1.png (orange/red stall): not one of A/B/C, not used')
    src, where = sources()
    if not src:
        say('stalls: no input found, skipped')
    ready = {}
    for k in 'ABC':
        if k not in src:
            continue
        a = src[k]
        h, w = a.shape[:2]
        checks(k, a)
        if (w, h) != (SIZE, SIZE):
            f = integer_factor((w, h), (SIZE, SIZE))
            if not f:
                say(f'stall_{k} ({where}): {w}x{h} is not 64x64 or an exact multiple -> skipped')
                continue
            a = resize_int(a, *f)
        say(f'stall_{k}: off-palette px before snap: {off_palette_count(a, STALL_PALETTE)}')
        ready[k] = snap(a, STALL_PALETTE)
    if 'A' in ready and 'B' not in ready:
        b = ready['A'].copy()
        swap = [('#FFFF4F', '#F02DF0'), ('#C4C42E', '#A61EA6')]
        for x, y in swap:
            mx = (b[..., :3] == hex_rgb(x)).all(-1)
            my = (b[..., :3] == hex_rgb(y)).all(-1)
            b[mx, :3], b[my, :3] = hex_rgb(y), hex_rgb(x)
        ready['B'] = b
        say('stall_B: made from A by swapping yellow<->magenta and #C4C42E<->#A61EA6')
    for k, a in ready.items():
        save_rgba(a, os.path.join(OUT, f'stall_{k}.png'))
        save_rgba(a[COUNTER_Y:], os.path.join(OUT, f'stall_{k}_front.png'))
    preview(ready)
    say(f'saved: {sorted(ready)}; preview tools/preview_stall.png')


if __name__ == '__main__':
    main()

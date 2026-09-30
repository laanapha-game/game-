#!/usr/bin/env python3
"""Generates alley_far (360x320, opaque, tiles horizontally): a night sky with
a moon in the brand CI palette. Output: assets/raw/alley_far.png, then run
tools/bg_pipeline.py (palette check, seam check, save to assets/bg/).
Pillow + numpy only. Deterministic (fixed seed).
"""
import os

import numpy as np
from PIL import Image

W, H = 360, 320
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'raw', 'alley_far.png')
K, DD, D, R, Y, M, WH = [(0, 0, 0), (0x4A, 0x1A, 0x14), (0x8F, 0x2F, 0x20), (0xDE, 0x52, 0x38),
                         (0xFF, 0xFF, 0x4F), (0xF0, 0x2D, 0xF0), (0xFF, 0xFF, 0xFF)]
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16


def main():
    img = np.zeros((H, W, 3), np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    thr = BAYER[yy % 4, xx % 4]  # tiles every 4 px, so the 360 px edge wraps cleanly

    # Sky: black at the top, deep maroon, then a warm glow at the horizon (behind the rooftops).
    bands = [(0, 120, K, DD), (120, 200, DD, D), (200, 250, D, R), (250, H, R, R)]
    for y0, y1, c0, c1 in bands:
        t = (yy[y0:y1] - y0) / max(1, y1 - y0)
        pick = t > thr[y0:y1]
        img[y0:y1] = np.where(pick[..., None], c1, c0)

    # Moon: yellow disc with white rim light and two maroon craters, soft magenta halo (dithered).
    mx, my, mr = 250, 70, 20
    d = np.sqrt((xx - mx) ** 2 + (yy - my) ** 2)
    halo = (d > mr) & (d < mr + 14) & ((d - mr) / 14 < thr * 0.9) & (yy < 150)
    img[halo & (d < mr + 7)] = M
    img[halo & (d >= mr + 7) & ((xx + yy) % 2 == 0)] = DD
    img[d <= mr] = Y
    img[(d <= mr) & (d > mr - 2) & (xx < mx) & (yy < my)] = WH
    for cx, cy, cr in [(244, 64, 4), (257, 78, 3), (254, 60, 2)]:
        img[np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) <= cr] = R

    # Stars: white and yellow, only in the dark upper sky, kept 3 px from the tile edges.
    rng = np.random.default_rng(1031)
    for _ in range(70):
        x, y = int(rng.integers(3, W - 3)), int(rng.integers(3, 130))
        if np.hypot(x - mx, y - my) < mr + 16:
            continue
        c = WH if rng.random() < 0.7 else Y
        img[y, x] = c
        if rng.random() < 0.15:  # a few twinkle crosses
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                img[y + dy, x + dx] = Y

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    Image.fromarray(img, 'RGB').convert('RGBA').save(OUT)
    print(f'alley_far: {W}x{H} -> {OUT}')


if __name__ == '__main__':
    main()

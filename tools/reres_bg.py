#!/usr/bin/env python3
"""Re-resolutions upscaled background exports to native pixel size (owner
request, overrides the exact-multiple rule for these files).

Each output pixel takes the most common colour of its source block (mode, not
an average), so pixel art stays crisp and no new colours are blended in.
Transparency is decided the same way. Output goes to assets/raw/, where
tools/bg_pipeline.py picks it up (palette snap, checks, save to assets/bg/).

  python3 tools/reres_bg.py
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from assetlib import load_rgba  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'assets/incoming/Scene_2_Sprite')
RAW = os.path.join(ROOT, 'assets/raw')
W, H, GROUND_Y = 360, 320, 240


def mode_downscale(a, out_w, out_h):
    """Block-mode resample of an RGBA array to out_w x out_h."""
    h, w = a.shape[:2]
    xs = np.linspace(0, w, out_w + 1).round().astype(int)
    ys = np.linspace(0, h, out_h + 1).round().astype(int)
    # Pack RGBA into one int per pixel (transparent pixels share one key).
    packed = (a[..., 0].astype(np.uint32) << 24) | (a[..., 1].astype(np.uint32) << 16) | \
             (a[..., 2].astype(np.uint32) << 8) | 255
    packed[a[..., 3] < 128] = 0
    out = np.zeros((out_h, out_w), np.uint32)
    for j in range(out_h):
        rows = packed[ys[j]:ys[j + 1]]
        for i in range(out_w):
            block = rows[:, xs[i]:xs[i + 1]].ravel()
            vals, counts = np.unique(block, return_counts=True)
            out[j, i] = vals[counts.argmax()]
    res = np.zeros((out_h, out_w, 4), np.uint8)
    res[..., 0] = out >> 24
    res[..., 1] = (out >> 16) & 255
    res[..., 2] = (out >> 8) & 255
    res[..., 3] = np.where(out == 0, 0, 255)
    return res


def sidewalk_top(a, y_from):
    """First row at or below y_from where most columns are sidewalk orange (R > 150, G < 130)."""
    op = a[..., 3] >= 128
    orange = ((a[..., 0] > 150) & (a[..., 1] < 130) & op).mean(1)
    for y in range(y_from, a.shape[0]):
        if orange[y] > 0.5:
            return y
    return None


def save(name, a):
    os.makedirs(RAW, exist_ok=True)
    Image.fromarray(a, 'RGBA').save(os.path.join(RAW, name + '.png'))


def main():
    # Same aspect as 360x320 (1330x1182): straight block-mode resample.
    for name in ('bg_alley_exit', 'bg_light_end'):
        a = load_rgba(os.path.join(SRC, name + '.png'))
        out = mode_downscale(a, W, H)
        save(name, out)
        print(f'{name}: {a.shape[1]}x{a.shape[0]} -> {W}x{H} (block mode, factor {a.shape[1] / W:.3f})')

    # bg_street is 3:2 with no road: resample to 360 wide at the same factor,
    # sit its sidewalk on the ground line, and put the road from bg_alley_exit
    # (same art style) under it.
    a = load_rgba(os.path.join(SRC, 'bg_street.png'))
    sh = round(a.shape[0] * W / a.shape[1])
    street = mode_downscale(a, W, sh)
    exit_ = np.array(Image.open(os.path.join(RAW, 'bg_alley_exit.png')))
    op = street[..., 3] >= 128
    street_bottom = int(np.nonzero(op.any(1))[0].max()) + 1
    exit_walk = sidewalk_top(exit_, H // 2)
    street_walk = sidewalk_top(street, sh // 2)
    offset = exit_walk - street_walk
    canvas = np.zeros((H, W, 4), np.uint8)
    road_top = offset + street_bottom
    canvas[road_top:] = exit_[road_top:]  # road below the street's sidewalk
    y0, y1 = max(0, offset), min(H, offset + sh)
    part = street[y0 - offset:y1 - offset]
    m = part[..., 3] >= 128
    canvas[y0:y1][m] = part[m]
    save('bg_street', canvas)
    print(f'bg_street: {a.shape[1]}x{a.shape[0]} -> {W}x{sh}, sidewalk y {street_walk} moved to {exit_walk} '
          f'(offset {offset}); road rows {road_top}-{H} taken from bg_alley_exit')
    print('NOTE bg_street shows the real 7-Eleven "7" logo and stripes; the spec asks for no real logo.')


if __name__ == '__main__':
    main()

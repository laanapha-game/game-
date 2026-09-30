#!/usr/bin/env python3
"""Background pipeline (scene2-spec.md section 9). Re-runnable. Pillow + numpy only.

Inputs (first found wins): assets/raw/<name>.png, then the Drive folder
assets/incoming/Scene_2_Sprite/<name>.png, then the Drive file names listed in ALIASES.
Outputs: assets/bg/alley_far.png, assets/bg/alley_near.png, assets/props/*.png,
assets/bg/alley_layout.json, seam previews in tools/.
Only exact integer resizes; anything else is reported and skipped.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from assetlib import (BG_PALETTE, blobs, colour_counts, integer_factor, load_rgba, off_palette_count,
                      resize_int, save_rgba, snap)

ROOT = os.path.join(os.path.dirname(__file__), '..')
RAW = os.path.join(ROOT, 'assets/raw')
INCOMING = os.path.join(ROOT, 'assets/incoming/Scene_2_Sprite')
OUT_BG = os.path.join(ROOT, 'assets/bg')
OUT_PROPS = os.path.join(ROOT, 'assets/props')
LAYER_SIZE = (360, 320)
GROUND_Y = 240
# Drive exports that stand in for the expected names.
ALIASES = {'alley_near': ['alley_near_360x320.png', 'backgroud_urban.png'],
           'props_alley': ['backgroud_elements_native_scale.png', 'backgroud_elements.png'], 'alley_far': []}

# Expected props in reading order (left to right, top to bottom) with target sizes.
# Row 3 of the sheet has the plant's left edge before the lantern string's.
PROPS = [
    ('shophouse_1', 90, 130), ('shophouse_2', 90, 130), ('shophouse_3', 90, 130), ('shophouse_4', 90, 130),
    ('tin_fence_1', 90, 70), ('tin_fence_2', 90, 70), ('pole', 16, 150), ('spirit_house', 24, 48),
    ('motorbike', 44, 30), ('food_cart', 48, 40), ('laundry_line', 90, 30), ('plant', 16, 20),
    ('lantern_string', 90, 20), ('cat', 16, 16), ('road_strip', 90, 80),
]
HANGING = {'laundry_line', 'lantern_string'}
report = []


def say(msg):
    report.append(msg)
    print(msg)


def find(name):
    for p in [os.path.join(RAW, name + '.png'), os.path.join(INCOMING, name + '.png')] + \
             [os.path.join(INCOMING, a) for a in ALIASES.get(name, [])]:
        if os.path.exists(p):
            return p
    return None


def layer(name, opaque):
    path = find(name)
    if not path:
        say(f'{name}: MISSING (looked in assets/raw, Drive folder, aliases {ALIASES.get(name)})')
        return None
    a = load_rgba(path)
    h, w = a.shape[:2]
    src = os.path.basename(path)
    if (w, h) != LAYER_SIZE:
        f = integer_factor((w, h), LAYER_SIZE)
        if not f:
            say(f'{name}: {src} is {w}x{h}, not {LAYER_SIZE[0]}x{LAYER_SIZE[1]} or an exact multiple -> UNUSABLE, skipped')
            seam(name, a, src)
            return None
        a = resize_int(a, *f)
        say(f'{name}: {src} {w}x{h} resized {f[0]} x{f[1]} (exact)')
    say(f'{name}: off-palette px before snap: {off_palette_count(a, BG_PALETTE)}')
    a = snap(a, BG_PALETTE)
    if opaque:
        a[..., 3] = 255
    save_rgba(a, os.path.join(OUT_BG, name + '.png'))
    seam(name, a, src)
    return a


def seam(name, a, src):
    """Last 8 vs first 8 columns; 3x tiled preview for eyeballing."""
    left, right = a[:, :8], a[:, -8:]
    diff = int((left != right).any(-1).sum())
    say(f'{name}: seam diff px (last 8 vs first 8 cols of {src}): {diff}' + (' -> VISIBLE SEAM, left as is' if diff else ''))
    save_rgba(np.concatenate([a, a, a], axis=1), os.path.join(os.path.dirname(__file__), f'seam_{name}.png'))


def props():
    path = find('props_alley')
    if not path:
        say('props_alley: MISSING, props skipped')
        return None
    a = load_rgba(path)
    # Native-scale sheets: no dilation (a 1 px gap already separates props).
    # Upscaled sheets need a small gap so anti-aliased specks join their prop.
    gap = 0 if max(a.shape[:2]) < 600 else 3
    boxes = blobs(a, min_px=20 if gap == 0 else 200, gap=gap)
    say(f'props_alley: {os.path.basename(path)} {a.shape[1]}x{a.shape[0]}, {len(boxes)} blobs (expected {len(PROPS)})')
    if len(boxes) != len(PROPS):
        say('props: count mismatch -> props skipped')
        return None
    bad = []
    for (name, ew, eh), (x, y, w, h) in zip(PROPS, boxes):
        if abs(w - ew) / ew > 0.25 or abs(h - eh) / eh > 0.25:
            bad.append(f'{name} {w}x{h} (want {ew}x{eh})')
    if bad:
        ratios = sorted(w / ew for (n, ew, eh), (x, y, w, h) in zip(PROPS, boxes))
        say(f'props: {len(bad)}/15 more than 25% off size: {"; ".join(bad)}; '
            f'median ratio {ratios[len(ratios) // 2]:.2f}x (not an exact multiple) -> props skipped')
        return None
    os.makedirs(OUT_PROPS, exist_ok=True)
    out = {}
    for (name, _, _), (x, y, w, h) in zip(PROPS, boxes):
        p = a[y:y + h, x:x + w]
        say(f'prop {name}: off-palette px before snap: {off_palette_count(p, BG_PALETTE)}')
        p = snap(p, BG_PALETTE)
        save_rgba(p, os.path.join(OUT_PROPS, name + '.png'))
        out[name] = p
    return out


def layout(props, near_ok):
    """Data only: one instance per placement, bottoms on y=240 (hanging items 104-150)."""
    inst = []
    def put(name, x, layer, bottom=GROUND_Y):
        h = props[name].shape[0]
        inst.append({'file': f'assets/props/{name}.png', 'x': x, 'y': bottom, 'layer': layer})
        assert bottom - h >= 104, name
    if not near_ok:  # walls from shophouse fronts (y 110-240) + road strip below
        for i, x in enumerate(range(0, 720, 90)):
            put(f'shophouse_{i % 4 + 1}', x, 'near')
            put('road_strip', x, 'near', bottom=320)
    # per 360 px: one motorbike, spirit house, plant, pole; per 720: 1 food cart, 1 cat
    for base in (0, 360):
        put('pole', base + 40, 'near')
        put('spirit_house', base + 150, 'near')
        put('motorbike', base + 220, 'near')
        put('plant', base + 300, 'near')
    put('food_cart', 480, 'near')
    put('cat', 100, 'near', bottom=GROUND_Y - 70 if not near_ok else GROUND_Y)
    put('lantern_string', 560, 'hang', bottom=130)
    json.dump({'groundY': GROUND_Y, 'period': 720, 'instances': inst}, open(os.path.join(OUT_BG, 'alley_layout.json'), 'w'), indent=1)
    for name, p in props.items():
        c = colour_counts(p, {'yellow': '#FFFF4F', 'magenta': '#F02DF0', 'white': '#FFFFFF'},
                          max(0, p.shape[0] - (GROUND_Y - 176)), p.shape[0])
        say(f'prop {name} in y 176-240 (bottom-aligned): {c}')


def main():
    os.makedirs(OUT_BG, exist_ok=True)
    far = layer('alley_far', opaque=True)
    near = layer('alley_near', opaque=False)
    p = props()
    if p is None:
        say('layout: no props -> alley_layout.json not written')
    else:
        layout(p, near is not None)
    if far is None and near is None and p is None:
        say('RESULT: no background assets produced; the game keeps SPRITE NEEDED markers')


if __name__ == '__main__':
    main()

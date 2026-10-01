#!/usr/bin/env python3
"""Krahang clinging to each scene 1 character (stall 1 tap game), generated from
existing art only: the Krahang's two cling frames (src/assets/art/krahang.png,
frames 3-4) and each character's struggle frames (src/assets/art/characters/,
from tools/scene1-characters.mjs). Re-runnable; part of `npm run scene1`.

The Krahang's cling frames are drawn from the front, gripping the head of a flat
white bird silhouette that stands in for the player. Per frame:

  1. Cut the stand-in: the light component touching the frame's bottom edge, the
     holes inside it (its eyes), its outline (dark or grey pixels within 3 px), and
     the detached specks (< 16 px) of its soft edge that the cut leaves behind.
     Nothing is painted; cut pixels become transparent.
  2. Mirror the Krahang (it is mirrored in game too) and put it BEHIND the
     character, so the character takes the stand-in's place and the Krahang's
     hands and face show above the head, as drawn.
  3. Position (texture px, steps of RENDER_SCALE so it stays on the design grid):
     on the character's BACK (spec 7.1; as in the original Krahang-riding-the-
     bird art): the Krahang's centre at least BACK_MIN design px right of the
     head's centre; both red eyes fully visible in both frames; then the fewest
     see-through holes (cut pixels not covered by the character that sit
     between Krahang pixels on their row), then as low, then as close to the
     head as possible. The same rule for every character.

Every output pixel is checked to be the character's or the Krahang's own pixel
(no new colours, no blending). Writes src/assets/art/characters/<id>_krahang.png
(2 frames, 3x) and krahang_combo.json.

  python3 tools/krahang_combo.py
"""
import json
from collections import deque

import numpy as np
from PIL import Image

R = 3  # RENDER_SCALE
DIR = 'src/assets/art/characters'
KRAHANG = 'src/assets/art/krahang.png'
KRAHANG_FRAMES, CLING = 8, (3, 4)
PAIRS = (('struggle0', 0), ('struggle1', 1))  # character frame -> cling frame
SPECK_PX = 16
BACK_MIN = 9  # design px from the head centre to the Krahang centre


def neighbours(y, x, h, w, diag=False):
    steps = ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (1, -1), (-1, 1), (-1, -1)) if diag else ())
    for dy, dx in steps:
        if 0 <= y + dy < h and 0 <= x + dx < w:
            yield y + dy, x + dx


def flood(seed, allowed):
    h, w = allowed.shape
    out = np.zeros_like(allowed)
    q = deque(p for p in seed if allowed[p])
    for p in q:
        out[p] = True
    while q:
        y, x = q.popleft()
        for p in neighbours(y, x, h, w):
            if allowed[p] and not out[p]:
                out[p] = True
                q.append(p)
    return out


def dilate(m, r):
    for _ in range(r):
        n = m.copy()
        n[1:] |= m[:-1]
        n[:-1] |= m[1:]
        n[:, 1:] |= m[:, :-1]
        n[:, :-1] |= m[:, 1:]
        m = n
    return m


def stand_in_cut(fr):
    """Mask of the white bird stand-in in a cling frame (see module doc, step 1)."""
    h, w = fr.shape[:2]
    op = fr[..., 3] >= 128
    light = op & (fr[..., :3].min(axis=2) > 170)
    body = flood([(h - 1, x) for x in range(w)], light)
    border = [(y, x) for y in range(h) for x in range(w) if y in (0, h - 1) or x in (0, w - 1)]
    outside = flood(border, ~body)
    filled = ~outside
    dark = op & (fr[..., :3].max(axis=2) < 70)
    grey = op & (fr[..., :3].max(axis=2) < 200) & (np.ptp(fr[..., :3].astype(int), axis=2) < 30)
    cut = filled | (dilate(filled, R) & (dark | grey))
    # Specks left from the stand-in's soft edge: small detached bits of what remains.
    keep = op & ~cut
    seen = np.zeros_like(keep)
    specks = 0
    for y, x in zip(*np.nonzero(keep)):
        if seen[y, x]:
            continue
        comp, q = [], deque([(y, x)])
        seen[y, x] = True
        while q:
            p = q.popleft()
            comp.append(p)
            for n in neighbours(*p, h, w, diag=True):
                if keep[n] and not seen[n]:
                    seen[n] = True
                    q.append(n)
        if len(comp) < SPECK_PX:
            specks += len(comp)
            for p in comp:
                cut[p] = True
    return cut & op, specks


def place(kf, cut, bird, ox, oy):
    """(eye pixels hidden, hole pixels) for the Krahang frame at (ox, oy) behind `bird`."""
    bop = bird[..., 3] >= 128
    kop = (kf[..., 3] >= 128) & ~cut
    H, W = bop.shape

    def covered(ys, xs):
        Y, X = ys + oy, xs + ox
        inside = (Y >= 0) & (Y < H) & (X >= 0) & (X < W)
        res = np.zeros(len(ys), bool)
        res[inside] = bop[Y[inside], X[inside]]
        return res

    ys, xs = np.nonzero(EYES & kop)
    eyes_hidden = int(covered(ys, xs).sum())
    ys, xs = np.nonzero(cut)
    open_ = ~covered(ys, xs)
    left = np.maximum.accumulate(kop, axis=1)
    right = np.maximum.accumulate(kop[:, ::-1], axis=1)[:, ::-1]
    between = np.zeros_like(cut)
    between[:, 1:-1] = left[:, :-2] & right[:, 2:]
    holes = int((open_ & between[ys, xs]).sum())
    return eyes_hidden, holes


krahang = np.array(Image.open(KRAHANG).convert('RGBA'))
KW = krahang.shape[1] // KRAHANG_FRAMES
KH = krahang.shape[0]
cling = [krahang[:, f * KW:(f + 1) * KW][:, ::-1].copy() for f in CLING]  # mirrored, as in game
cuts = [stand_in_cut(f) for f in cling]
CUTS = [c for c, _ in cuts]
top = min(np.nonzero(c)[0].min() for c in CUTS)  # stand-in's head top
cols = np.nonzero(CUTS[0][top:top + 2 * R].any(axis=0))[0]
mid = int(round(cols.mean()))
# The Krahang's eyes: red pixels above the stand-in, in the middle (the ribbons are at the sides).
red = (cling[0][..., 0] > 150) & (cling[0][..., 1] < 110) & (cling[0][..., 2] < 110) & (cling[0][..., 3] >= 128)
EYES = np.zeros_like(red)
EYES[:top, mid - 7 * R:mid + 7 * R] = True
EYES &= red | ((cling[1][..., 0] > 150) & (cling[1][..., 1] < 110) & (cling[1][..., 2] < 110) & (cling[1][..., 3] >= 128))

data = json.load(open(f'{DIR}/characters.json'))
CW, CH = data['cell']['w'] * R, data['cell']['h'] * R

placed = {}
for c in data['characters']:
    side = np.array(Image.open(f"{DIR}/{c['side']['file']}").convert('RGBA'))
    birds = [side[:, i * CW:(i + 1) * CW] for i in (c['side']['frames'].index(n) for n, _ in PAIRS)]
    bop = birds[0][..., 3] >= 128
    ys, xs = np.nonzero(bop)
    head_x = xs[ys <= ys.min() + R].mean()  # head top, rest pose of the struggle
    best = None
    for ox in range(-12 * R, 12 * R + 1, R):
        if ox + mid < head_x + BACK_MIN * R:
            continue
        for oy in range(-30 * R, 4 * R + 1, R):
            score = [place(cling[k], CUTS[k], b, ox, oy) for b, (_, k) in zip(birds, PAIRS)]
            if any(e for e, _ in score):
                continue
            key = (sum(h for _, h in score), -oy, ox)
            if best is None or key < best[0]:
                best = (key, ox, oy)
    if best is None:
        raise SystemExit(f"{c['id']}: no position shows the Krahang's eyes")
    placed[c['id']] = (birds, best[1], best[2], best[0][0])

# One frame size for every character: the character frame plus the Krahang, padded
# symmetrically (whole design px) so the character's feet stay at the frame's bottom centre.
pad_l = pad_r = pad_t = 0
for _, ox, oy, _ in placed.values():
    pad_l = max(pad_l, -ox)
    pad_r = max(pad_r, ox + KW - CW)
    pad_t = max(pad_t, -oy)
    assert oy + KH <= CH, 'Krahang below the feet'
side_pad = -(-max(pad_l, pad_r) // R) * R
pad_t = -(-pad_t // R) * R
FW, FH = CW + 2 * side_pad, CH + pad_t

report, combos = {}, {}
for cid, (birds, ox, oy, holes) in placed.items():
    strip = np.zeros((FH, FW * len(PAIRS), 4), np.uint8)
    for n, (bird, (_, k)) in enumerate(zip(birds, PAIRS)):
        x0 = n * FW
        kx, ky = x0 + side_pad + ox, pad_t + oy
        kmask = (cling[k][..., 3] >= 128) & ~CUTS[k]
        region = strip[ky:ky + KH, kx:kx + KW]
        region[kmask] = cling[k][kmask]
        bmask = bird[..., 3] >= 128
        region = strip[pad_t:pad_t + CH, x0 + side_pad:x0 + side_pad + CW]
        region[bmask] = bird[bmask]
        # Integrity: every opaque pixel is the character's or the Krahang's own pixel.
        f = strip[:, x0:x0 + FW]
        for y, x in zip(*np.nonzero(f[..., 3])):
            by, bx = y - pad_t, x - side_pad
            if 0 <= by < CH and 0 <= bx < CW and bird[by, bx, 3] >= 128:
                assert (f[y, x] == bird[by, bx]).all()
            else:
                assert (f[y, x] == cling[k][y - ky, x - (kx - x0)]).all()
    Image.fromarray(strip).save(f'{DIR}/{cid}_krahang.png')
    kop = (cling[0][..., 3] >= 128) & ~CUTS[0]
    ys, xs = np.nonzero(kop)
    # Krahang centre relative to the character's feet (bottom centre), design px.
    cx = (side_pad + ox + (xs.min() + xs.max() + 1) / 2 - side_pad - CW / 2) / R
    cy = (oy + (ys.min() + ys.max() + 1) / 2 - CH) / R
    combos[cid] = {'file': f'{cid}_krahang.png', 'offset': [ox // R, oy // R], 'krahangCentre': [round(cx), round(cy)]}
    report[cid] = holes
    print(f'{cid:10} Krahang at ({ox // R:+d}, {oy // R:+d}) design px from the frame, {holes} see-through px (texture), eyes visible')

json.dump(
    {
        'note': 'Generated by tools/krahang_combo.py. Do not edit by hand.',
        'renderScale': R,
        'frame': {'w': FW // R, 'h': FH // R},
        'feet': {'x': FW // R // 2, 'y': FH // R},
        'frames': [n for n, _ in PAIRS],
        'standInCut': {'pixels': [int(c.sum()) for c in CUTS], 'specks': [s for _, s in cuts]},
        'characters': combos,
    },
    open(f'{DIR}/krahang_combo.json', 'w'),
    indent=2,
)
print(f'{DIR}: {len(combos)} combos, {FW // R}x{FH // R} frames x {len(PAIRS)}; stand-in cut {[int(c.sum()) for c in CUTS]} px, specks {[s for _, s in cuts]} px')

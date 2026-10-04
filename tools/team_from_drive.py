"""The team's scene 3 sprites from the owner's Drive art (folder เกมลานนภา/scene_3_sprite,
downloaded unchanged to assets/incoming/scene_3_sprite/). Replaces the drawn ones from
tools/team_sprite.py with the same format, so the game code does not change:

  src/assets/art/characters/team_<id>_side.png    8 frames: idle0 idle1 walk0-3 wave0 wave1
  src/assets/art/characters/team_<id>_front.png   5 frames: idle0 idle1 blink wave0 wave1
  src/assets/art/portraits/team_<id>_portrait.png 2 frames of 64 x 64: neutral, talk
  src/assets/art/characters/team.json             the list (Nuea added)
  docs/scene3/team_contact_sheet.png              preview

Cells are 40 x 56 design px at 3x (Jayimpacts' model); side frames face LEFT (the Drive art
faces right, so it is mirrored); the feet stand on the cell's bottom row.

Two sheet layouts are in the folder:
  A (Kaiching, Peay, Nemo, Nuea): a side row on the dark background (idle, idle, walk x5,
    ..., wave), green panels: front x6, enlarged side walk x4, enlarged front x6; one portrait.
  B (Po, Aomsin): green panels: side x8 (idle0 idle1 walk0-3 wave0 wave1), front x6, then
    small previews (not used); portraits neutral and talk.
Front x6 is idle, idle, blink, expression, wave, wave: the expression frame is not used.

  pip install pillow numpy scipy; python3 tools/team_from_drive.py
"""
import json
import os
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'assets/incoming/scene_3_sprite'
OUT = 'src/assets/art/characters'
PORTRAITS = 'src/assets/art/portraits'
CELL_W, CELL_H, R = 40, 56, 3
FIG_H = 51  # figure height in design px (the old team sprites: 51)
TEAM = [  # id, display name, Drive file, layout
    ('po', 'Po', 'sprite_Po.png', 'B'),
    ('peay', 'Peay', 'sprite_Peay.png', 'A'),
    ('kaiching', 'Kaiching', 'sprite_Kaiching.png', 'A'),
    ('aomsin', 'Aomsin', 'sprite_Aomsin.png', 'B'),
    ('nemo', 'Nemo', 'sprite_Nemo.png', 'A'),
    ('nuea', 'Nuea', 'sprite_Nuea.png', 'A'),
]
SIDE = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'wave0', 'wave1']
FRONT = ['idle0', 'idle1', 'blink', 'wave0', 'wave1']
FRONT_FROM6 = [0, 1, 2, 4, 5]


def runs(flags, min_len, gap=2):
    """[(start, end)] runs of True, merging gaps up to `gap`, at least `min_len` long."""
    out = []
    start = None
    last = None
    for i, f in enumerate(flags):
        if f:
            if start is None:
                start = i
            elif i - last > gap + 1:
                out.append((start, last + 1))
                start = i
            last = i
    if start is not None:
        out.append((start, last + 1))
    return [(a, b) for a, b in out if b - a >= min_len]


def green_mask(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (g > 110) & (g - np.maximum(r, b) > 45)


def panels(mask, min_w=60, min_h=60, min_fill=0.25):
    """Rectangles of a background colour: each connected region's bounding box (the figure inside
    a panel does not split it: the colour surrounds it)."""
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = sl
        w, h = xs.stop - xs.start, ys.stop - ys.start
        if w >= min_w and h >= min_h and (lab[sl] == i).mean() >= min_fill:
            out.append((xs.start, ys.start, xs.stop, ys.stop))
    return out


def key_panel(a, inset=3):
    """A green panel -> RGBA with the green keyed out and its spill removed."""
    a = a[inset:-inset, inset:-inset].astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = green_mask(a)
    spill = g - np.maximum(r, b)
    g2 = np.where(spill > 10, np.maximum(r, b) + 10, g)
    rgba = np.dstack([r, g2, b, np.where(bg, 0, 255)]).astype(np.uint8)
    return drop_specks(rgba)


def flood_key(a, bg, tol):
    """Remove the background connected to the edges (colour within `tol` of `bg`)."""
    h, w, _ = a.shape
    near = (np.abs(a[..., :3].astype(int) - np.array(bg)).max(2) <= tol)
    out = np.zeros((h, w), bool)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)])
    while q:
        y, x = q.popleft()
        if out[y, x] or not near[y, x]:
            continue
        out[y, x] = True
        if y > 0: q.append((y - 1, x))
        if y < h - 1: q.append((y + 1, x))
        if x > 0: q.append((y, x - 1))
        if x < w - 1: q.append((y, x + 1))
    alpha = np.where(out, 0, 255).astype(np.uint8)
    return drop_specks(np.dstack([a[..., :3], alpha]).astype(np.uint8))


def drop_specks(rgba, min_px=60):
    """Keep the largest opaque blobs (the figure), drop stray specks."""
    op = rgba[..., 3] > 0
    h, w = op.shape
    seen = np.zeros_like(op)
    keep = np.zeros_like(op)
    blobs = []
    for y in range(h):
        for x in range(w):
            if op[y, x] and not seen[y, x]:
                pts = []
                q = deque([(y, x)])
                seen[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    pts.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and op[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                blobs.append(pts)
    if not blobs:
        return rgba
    big = max(len(b) for b in blobs)
    for b in blobs:
        if len(b) >= max(min_px, big * 0.02):
            for cy, cx in b:
                keep[cy, cx] = True
    out = rgba.copy()
    out[..., 3] = np.where(keep, 255, 0)
    return out


def bbox(rgba):
    ys, xs = np.nonzero(rgba[..., 3])
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def to_cell(rgba, mirror=True, fig_h=FIG_H):
    """Figure -> one 40 x 56 cell (design px): scaled by height, feet on the bottom row, centred."""
    x0, y0, x1, y1 = bbox(rgba)
    fig = Image.fromarray(rgba[y0:y1, x0:x1])
    if mirror:
        fig = fig.transpose(Image.FLIP_LEFT_RIGHT)
    k = min(fig_h / fig.height, (CELL_W - 2) / fig.width)
    w, h = max(1, round(fig.width * k)), max(1, round(fig.height * k))
    small = downscale(fig, w, h)
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.paste(small, ((CELL_W - w) // 2, CELL_H - h), small)
    return cell


def downscale(img, w, h):
    """Area average with premultiplied alpha, then hard alpha (pixel art)."""
    a = np.asarray(img.convert('RGBA')).astype(float)
    pre = a.copy()
    pre[..., :3] *= a[..., 3:4] / 255
    small = np.asarray(Image.fromarray(pre.clip(0, 255).astype(np.uint8)).resize((w, h), Image.BOX)).astype(float)
    al = np.asarray(Image.fromarray(a[..., 3].astype(np.uint8)).resize((w, h), Image.BOX)).astype(float)
    rgb = np.where(al[..., None] > 0, small[..., :3] * 255 / np.maximum(al[..., None], 1), 0)
    out = np.dstack([rgb.clip(0, 255), np.where(al >= 128, 255, 0)]).astype(np.uint8)
    return Image.fromarray(out)


def sheet(cells):
    s = Image.new('RGBA', (CELL_W * R * len(cells), CELL_H * R), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        s.paste(c.resize((CELL_W * R, CELL_H * R), Image.NEAREST), (i * CELL_W * R, 0))
    return s


def slate_squares(a):
    """The portrait squares (slate blue-grey background), largest first. A face can split a
    square's background in two: boxes that touch side by side are joined again."""
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    m = (r > 35) & (r < 85) & (g > 50) & (g < 105) & (b > 65) & (b < 125) & (b > r + 14)
    sq = sorted(panels(m, min_w=40, min_h=80), key=lambda p: p[0])
    joined = []
    for p in sq:
        q = joined[-1] if joined else None
        if q and abs(q[1] - p[1]) < 6 and abs(q[3] - p[3]) < 6 and p[0] - q[2] <= 60 and p[2] - q[0] <= 300:
            joined[-1] = (q[0], min(q[1], p[1]), p[2], max(q[3], p[3]))
        else:
            joined.append(p)
    joined = [p for p in joined if p[2] - p[0] >= 80]
    return sorted(joined, key=lambda p: -(p[2] - p[0]) * (p[3] - p[1]))


def band_rows(ps, expect):
    """Panels grouped into rows (by top edge). A figure touching a panel's top and bottom splits
    its green in two: a row with twice the expected panels is joined back in pairs."""
    bands = {}
    for p in ps:
        bands.setdefault(p[1] // 20, []).append(p)
    rows = [sorted(v, key=lambda p: p[0]) for _, v in sorted(bands.items())]
    out = []
    for row, n in zip(rows, expect):
        if len(row) == 2 * n:
            row = [(a[0], min(a[1], b[1]), b[2], max(a[3], b[3])) for a, b in zip(row[::2], row[1::2])]
        out.append(row)
    return out + rows[len(expect):]


def portrait(a, rect):
    x0, y0, x1, y1 = rect
    crop = a[y0 + 2:y1 - 2, x0 + 2:x1 - 2]
    bg = tuple(int(v) for v in np.median(crop[:4].reshape(-1, 3), 0))
    keyed = flood_key(crop, bg, 26)
    return downscale(Image.fromarray(keyed), 64, 64)


def side_row_dark(a, first_green_top):
    """Layout A: the figures on the dark background above the first green band."""
    region = a[:first_green_top]
    bg = tuple(int(v) for v in np.median(region[:, :12].reshape(-1, 3), 0))
    far = np.abs(region.astype(int) - np.array(bg)).max(2) > 14
    rws = runs(far.sum(1) > 2, 40, gap=4)
    y0, y1 = max(rws, key=lambda r: r[1] - r[0])  # the figure row (not the title text)
    cols = runs(far[y0:y1].sum(0) > 0, 20, gap=3)
    figs = []
    for x0, x1 in cols:
        crop = a[max(0, y0 - 4):y1 + 4, max(0, x0 - 4):x1 + 4]
        figs.append(flood_key(crop, bg, 5))  # the background varies by about 3; dark hair is close to it
    return figs


def build(tid, name, file, layout):
    a = np.asarray(Image.open(os.path.join(SRC, file)).convert('RGB'))
    rows = band_rows(panels(green_mask(a)), [8, 6] if layout == 'B' else [6, 4, 6])
    cut = lambda p: key_panel(a[p[1]:p[3], p[0]:p[2]])
    if layout == 'B':
        side8, front6 = rows[0], rows[1]
        assert len(side8) == 8 and len(front6) == 6, (tid, [len(r) for r in rows])
        side = [to_cell(cut(p)) for p in side8]
        front = [to_cell(cut(front6[i]), mirror=False) for i in FRONT_FROM6]
        sq = sorted(slate_squares(a)[:2], key=lambda p: p[0])  # neutral, talk
        ports = [portrait(a, sq[0]), portrait(a, sq[1])]
    else:
        assert len(rows) >= 3 and len(rows[1]) == 4 and len(rows[2]) == 6, (tid, [len(r) for r in rows])
        figs = side_row_dark(a, rows[0][0][1] - 30)
        assert len(figs) >= 8, (tid, len(figs))
        walk = [to_cell(cut(p)) for p in rows[1]]
        side = [to_cell(figs[0]), to_cell(figs[1])] + walk + [to_cell(figs[-2]), to_cell(figs[-1])]
        front = [to_cell(cut(rows[2][i]), mirror=False) for i in FRONT_FROM6]
        big = slate_squares(a)[0]
        p0 = portrait(a, big)
        ports = [p0, p0]  # one portrait in this layout: neutral for both
    sheet(side).save(os.path.join(OUT, f'team_{tid}_side.png'))
    sheet(front).save(os.path.join(OUT, f'team_{tid}_front.png'))
    pt = Image.new('RGBA', (64 * R * 2, 64 * R), (0, 0, 0, 0))
    for i, p in enumerate(ports):
        pt.paste(p.resize((64 * R, 64 * R), Image.NEAREST), (i * 64 * R, 0))
    pt.save(os.path.join(PORTRAITS, f'team_{tid}_portrait.png'))
    return {
        'id': f'team_{tid}',
        'name': name,
        'side': {'file': f'team_{tid}_side.png', 'frames': SIDE},
        'front': {'file': f'team_{tid}_front.png', 'frames': FRONT},
        'portrait': f'team_{tid}_portrait.png',
        'source': f'{SRC}/{file}',
    }, side, front, ports


def main():
    chars = []
    previews = []
    for t in TEAM:
        c, side, front, ports = build(*t)
        chars.append(c)
        previews.append((side, front, ports))
        print('wrote', c['id'])
    meta = {
        'note': 'Generated by tools/team_from_drive.py from the Drive art in assets/incoming/scene_3_sprite. Do not edit by hand.',
        'renderScale': R,
        'cell': {'w': CELL_W, 'h': CELL_H},
        'frames': {'side': SIDE, 'front': FRONT},
        'anim': {'side': {'idle': [0, 1], 'walk': [2, 3, 4, 5], 'wave': [6, 7]}, 'front': {'idle': [0, 1], 'blink': [2], 'wave': [3, 4]}},
        'characters': chars,
    }
    with open(os.path.join(OUT, 'team.json'), 'w') as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
        f.write('\n')
    # Preview: per person, side x8, front x5, portraits, at 2x on a lawn-green and a night strip.
    S = 2
    row_h = CELL_H * S + 8
    W = (13 * CELL_W + 2 * 64) * S + 40
    img = Image.new('RGBA', (W, row_h * len(previews) * 2 + 8), (40, 40, 46, 255))
    for i, (side, front, ports) in enumerate(previews):
        for j, bgc in enumerate([(110, 190, 90, 255), (60, 22, 18, 255)]):
            y = 4 + (i * 2 + j) * row_h
            x = 4
            for c in side + front:
                tile = Image.new('RGBA', (CELL_W * S, CELL_H * S), bgc)
                big = c.resize((CELL_W * S, CELL_H * S), Image.NEAREST)
                tile.alpha_composite(big)
                img.paste(tile, (x, y))
                x += CELL_W * S + 2
            if j == 0:
                for p in ports:
                    img.alpha_composite(p.resize((64 * S // 1, 64 * S // 1), Image.NEAREST).crop((0, 0, 64 * S, CELL_H * S)), (x + 8, y))
                    x += 64 * S + 4
    os.makedirs('docs/scene3', exist_ok=True)
    img.save('docs/scene3/team_contact_sheet.png')
    print('wrote docs/scene3/team_contact_sheet.png')


if __name__ == '__main__':
    main()

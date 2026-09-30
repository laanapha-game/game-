"""Shared helpers for the asset pipelines (Pillow + numpy only).

Rules: nearest-neighbour only, integer coordinates, #00FF00 = transparent,
snap to a palette after reporting off-palette pixels. Never repaint or blend.
"""
from collections import deque
import numpy as np
from PIL import Image

KEY = (0, 255, 0)

BG_PALETTE = ['#DE5238', '#000000', '#8F2F20', '#4A1A14', '#FFFF4F', '#F02DF0', '#FFFFFF']
STALL_PALETTE = ['#FFFF4F', '#F02DF0', '#000000', '#FFFFFF', '#DE5238', '#C4C42E', '#A61EA6']


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_rgba(path):
    """RGBA array; exact #00FF00 becomes transparent."""
    a = np.array(Image.open(path).convert('RGBA'))
    key = (a[..., 0] == 0) & (a[..., 1] == 255) & (a[..., 2] == 0)
    a[key, 3] = 0
    return a


def save_rgba(a, path):
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(path)


def off_palette_count(a, palette):
    """Opaque pixels whose colour is not exactly in the palette."""
    pal = np.array([hex_rgb(p) for p in palette])
    opaque = a[..., 3] >= 128
    rgb = a[..., :3][opaque]
    if not len(rgb):
        return 0
    exact = (rgb[:, None, :] == pal[None, :, :]).all(-1).any(-1)
    return int((~exact).sum())


def snap(a, palette):
    """Nearest palette colour per opaque pixel (RGB distance); alpha made hard."""
    pal = np.array([hex_rgb(p) for p in palette], dtype=np.int32)
    out = a.copy()
    rgb = a[..., :3].astype(np.int32)
    d = ((rgb[..., None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    out[..., :3] = pal[d.argmin(-1)]
    out[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    return out


def blobs(a, min_px=20, gap=0):
    """Connected opaque regions (8-way, optional dilation `gap` px), sorted
    top-to-bottom by row band then left-to-right. Returns (x, y, w, h) boxes."""
    mask = a[..., 3] >= 128
    if gap:
        m = mask.copy()
        for dy in range(-gap, gap + 1):
            for dx in range(-gap, gap + 1):
                m |= np.roll(np.roll(mask, dy, 0), dx, 1)
        mask = m
    h, w = mask.shape
    seen = np.zeros_like(mask)
    boxes = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        xs, ys, n = [x0, x0], [y0, y0], 0
        while q:
            y, x = q.popleft()
            n += 1
            xs[0], xs[1] = min(xs[0], x), max(xs[1], x)
            ys[0], ys[1] = min(ys[0], y), max(ys[1], y)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
        if n >= min_px:
            boxes.append((int(xs[0]), int(ys[0]), int(xs[1] - xs[0] + 1), int(ys[1] - ys[0] + 1)))
    # reading order: group into rows by vertical overlap
    boxes.sort(key=lambda b: b[1])
    rows = []
    for b in boxes:
        for r in rows:
            if b[1] < r['bottom'] and b[1] + b[3] > r['top']:
                r['items'].append(b)
                r['top'] = min(r['top'], b[1])
                r['bottom'] = max(r['bottom'], b[1] + b[3])
                break
        else:
            rows.append({'top': b[1], 'bottom': b[1] + b[3], 'items': [b]})
    return [b for r in rows for b in sorted(r['items'], key=lambda b: b[0])]


def integer_factor(size, target):
    """k if size == target * k (or target == size * k for upscale), else None."""
    (w, h), (tw, th) = size, target
    if w % tw == 0 and h % th == 0 and w // tw == h // th:
        return ('down', w // tw)
    if tw % w == 0 and th % h == 0 and tw // w == th // h:
        return ('up', tw // w)
    return None


def resize_int(a, direction, k):
    """Exact integer nearest-neighbour resize."""
    if direction == 'down':
        return a[k // 2::k, k // 2::k]
    return a.repeat(k, 0).repeat(k, 1)


def colour_counts(a, colours, y0=None, y1=None):
    region = a if y0 is None else a[y0:y1]
    opaque = region[..., 3] >= 128
    out = {}
    for name, hx in colours.items():
        c = np.array(hex_rgb(hx))
        out[name] = int(((region[..., :3] == c).all(-1) & opaque).sum())
    return out

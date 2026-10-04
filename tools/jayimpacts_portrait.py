"""Jayimpacts dialogue portrait -> src/assets/art/portraits/jayimpacts_portrait.png
(64 x 64 design px, 2 frames: neutral, talk) at RENDER_SCALE x, nearest neighbour.

Owner: the face must look as close as possible to the original. So the portrait is not
drawn: it is the front figure of the Drive avatar (sprite_jayimpacts_avatar no green),
head and shoulders with the halo, box-downsampled with premultiplied alpha, reduced to
an adaptive palette, cleaned of chroma-key green specks and given a 1 px dark outline.
The talk frame adds a small open mouth on the original's mouth line.

    python3 tools/jayimpacts_portrait.py [--preview out.png]
"""
import sys
from pathlib import Path

from PIL import Image

AVATAR = Path('assets/incoming/Scene_2_Sprite/sprite_jayimpacts_avatar_no_green.png')
OUT = Path('src/assets/art/portraits')
R = 3
N = 64
CROP = (10, 45, 510, 545)   # front figure: halo, head and shoulders (500 x 500 source px)
COLOURS = 48
OUTLINE = (10, 8, 7, 255)
MOUTH_OPEN = (106, 42, 34, 255)


def downsample(img, n, thr=120):
    """Box filter with premultiplied alpha; pixels under thr alpha become transparent."""
    w, h = img.size
    src = img.load()
    out = Image.new('RGBA', (n, n))
    o = out.load()
    for Y in range(n):
        for X in range(n):
            x0, x1 = X * w // n, (X + 1) * w // n
            y0, y1 = Y * h // n, (Y + 1) * h // n
            r = g = b = a = 0
            for yy in range(y0, y1):
                for xx in range(x0, x1):
                    pr, pg, pb, pa = src[xx, yy]
                    r += pr * pa; g += pg * pa; b += pb * pa; a += pa
            if a / ((x1 - x0) * (y1 - y0)) > thr:
                o[X, Y] = (r // a, g // a, b // a, 255)
    return out


def quantize(img):
    alpha = img.getchannel('A')
    q = img.convert('RGB').quantize(COLOURS, method=Image.Quantize.MEDIANCUT).convert('RGBA')
    q.putalpha(alpha.point(lambda v: 255 if v else 0))
    return q


def clean_green(img):
    """Chroma-key leftovers: a greenish pixel takes the colour of its most common non-green neighbour."""
    px = img.load()
    w, h = img.size
    green = lambda c: c[3] and c[1] > c[0] + 12 and c[1] > c[2] + 12
    for y in range(h):
        for x in range(w):
            if not green(px[x, y]):
                continue
            nb = [px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                  if (dx or dy) and 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] and not green(px[x + dx, y + dy])]
            px[x, y] = max(set(nb), key=nb.count) if nb else (0, 0, 0, 0)
    return img


def outline(img):
    px = img.load()
    w, h = img.size
    out = img.copy()
    o = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OUTLINE
    return out


def mouth_line(img):
    """The original's mouth: the reddest pixels in the lower face."""
    px = img.load()
    best = []
    for y in range(46, 56):                                  # below the eyes, above the collar
        for x in range(22, 38):
            r, g, b, a = px[x, y]
            if a and r > 150 and r - g > 40 and r - b > 40:
                best.append((r - g, x, y))
    best.sort(reverse=True)
    return [(x, y) for _, x, y in best[:4]]


def portrait():
    src = Image.open(AVATAR).convert('RGBA').crop(CROP)
    neutral = outline(clean_green(quantize(downsample(src, N))))
    talk = neutral.copy()
    pts = mouth_line(neutral)
    if pts:
        xs = sorted(x for x, _ in pts)
        y = max(y for _, y in pts)
        cx = (xs[0] + xs[-1]) // 2
        t = talk.load()
        for dx in (-1, 0, 1):
            t[cx + dx, y + 1] = MOUTH_OPEN
        t[cx, y + 2] = MOUTH_OPEN
    return [neutral, talk]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = portrait()
    sheet = Image.new('RGBA', (N * len(frames), N))
    for i, im in enumerate(frames):
        sheet.alpha_composite(im, (i * N, 0))
    sheet.resize((sheet.width * R, sheet.height * R), Image.NEAREST).save(OUT / 'jayimpacts_portrait.png')
    if '--preview' in sys.argv:
        bg = Image.new('RGBA', sheet.size, (60, 70, 80, 255))
        bg.alpha_composite(sheet)
        bg.resize((bg.width * 6, bg.height * 6), Image.NEAREST).save(sys.argv[sys.argv.index('--preview') + 1])
    print(f'jayimpacts portrait: {len(frames)} frames of {N}x{N} -> {OUT}')


if __name__ == '__main__':
    main()

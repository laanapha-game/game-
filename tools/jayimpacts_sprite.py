"""Jayimpacts walking sprite, cute anime chibi (owner: keep him human, Stardew Valley
inspired, then "make him cute, anime chibi style")
-> src/assets/art/characters/jayimpacts_side.png / _front.png + jayimpacts.json
(characters.json layout).

Same cell and conventions as the bird costumes: 32 x 36 frames, feet on row 35, side
view faces LEFT, sheets at RENDER_SCALE (3) x with nearest neighbour.

Chibi proportions: a big round head (rows 3-21, well over half his height), a small
body, short legs and round shoes. Face after the Drive art (owner): calm heavy-lidded
eyes with dark irises, thick straight brows, a small one-sided smile; black hair parted
on one side and swept over, with a lock falling beside one eye. Near-black tinted outline per material, three tones per material.

Look from the Drive art: black hair swept to one side, grey houndstooth jacket over a
black tee, belt with a gold buckle, cream trousers, brown shoes, small white wings with
yellow tips, a gold halo ring (plain ring: the Drive halo is gear-shaped, like the
Rotary wheel, not drawn).

Frames: side idle0 idle1 walk0-3 wave0 wave1, front idle0 idle1 blink wave0 wave1.

    python3 tools/jayimpacts_sprite.py [--sheet out.png]   (--sheet: 8x preview strip)
"""
import json
import sys
from pathlib import Path

from PIL import Image

OUT = Path('src/assets/art/characters')
ID = 'jayimpacts'
R = 3  # RENDER_SCALE (src/config/constants.js)
CW, CH = 32, 36
FRAMES = {
    'side': ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'wave0', 'wave1'],
    'front': ['idle0', 'idle1', 'blink', 'wave0', 'wave1'],
}
ANIM = {
    'side': {'idle': [0, 1], 'walk': [2, 3, 4, 5], 'wave': [6, 7]},
    'front': {'idle': [0, 1], 'blink': [2], 'wave': [3, 4]},
}

C = {
    'h0': '#0A0807', 'h1': '#1C1714', 'h2': '#2C2520', 'h3': '#4A423C',            # hair (black, Drive art)
    'k0': '#5C3024', 'k1': '#E8A47E', 'k2': '#F8C8A0', 'k3': '#FFE2C4',            # skin
    'e0': '#0E0A0A', 'e1': '#3A2A24', 'e2': '#5A4034', 'ew': '#FFFFFF',            # eyes
    'bl': '#F59A8C', 'm1': '#C0705C',                                              # blush, mouth
    'j0': '#1E1B22', 'j1': '#D4D0CC', 'j2': '#8C8888', 'j3': '#5A5658',            # jacket
    't1': '#2A2630', 't2': '#3E3A46', 'B': '#2A1E1A', 'g': '#E8C060',              # tee, belt
    'p0': '#4E4434', 'p1': '#F4EEE0', 'p2': '#E0D4BC', 'p3': '#B8A88E',            # trousers
    'x0': '#20140F', 'x1': '#5A3828', 'x2': '#7A5038',                             # shoes
    'w0': '#6A5E72', 'w1': '#FFFFFF', 'w2': '#E4E2F0', 'y1': '#FFE070', 'y2': '#F0B030',  # wings
    'g0': '#7A4E0A', 'g1': '#FFF27A', 'g2': '#F0C030',                             # halo
}
OUTLINE = {'hair': 'h0', 'skin': 'k0', 'jacket': 'j0', 'pants': 'p0', 'shoe': 'x0', 'wing': 'w0', 'halo': 'g0'}


class Grid:
    def __init__(self):
        self.px = [[None] * CW for _ in range(CH)]
        self.mat = [[None] * CW for _ in range(CH)]

    def ok(self, x, y):
        return 0 <= x < CW and 0 <= y < CH

    def set(self, x, y, c, mat=None):
        if self.ok(x, y):
            self.px[y][x] = c
            self.mat[y][x] = mat

    def get(self, x, y):
        return self.px[y][x] if self.ok(x, y) else None

    def part(self, inside, colour, mat, outline=True, over=True):
        """Fill a shape and outline it in its material's outline colour. over=False keeps
        the outline from cutting into what is already drawn (soft joins)."""
        pts = [(x, y) for y in range(CH) for x in range(CW) if inside(x, y)]
        s = set(pts)
        if outline:
            for x, y in pts:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q not in s and self.ok(*q) and (over or self.get(*q) is None):
                        self.set(q[0], q[1], OUTLINE[mat], mat)
        for x, y in pts:
            self.set(x, y, colour(x, y) if callable(colour) else colour, mat)

    def paste(self, img, x0, y0):
        """Paste an RGBA image (hex colours stored directly)."""
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g_, b, a = px[x, y]
                if a:
                    self.set(x0 + x, y0 + y, '#%02X%02X%02X' % (r, g_, b), 'head')

    def stamp(self, x0, y0, rows, legend, mat=None):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    self.set(x0 + i, y0 + j, legend[ch], mat)


def ell(cx, cy, rx, ry):
    return lambda x, y: ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1


def box(x0, y0, x1, y1):
    return lambda x, y: x0 <= x <= x1 and y0 <= y <= y1


HOUND = ['XX..', 'XXX.', '..XX', '.X.X']  # houndstooth, 4 x 4 tile


def jacket(x, y):
    return 'j2' if HOUND[y % 4][x % 4] == 'X' else 'j1'


def halo(g, cx, cy):
    """The original's halo is a gold gear: a ring with small teeth on top."""
    ring = lambda x, y: ell(cx, cy, 5.2, 1.7)(x, y) and not ell(cx, cy, 3.4, 0.6)(x, y)
    teeth = lambda x, y: round(y + 0.5 - (cy - 2.2)) == 0 and round(x + 0.5 - cx) in (-4, 0, 4)
    g.part(lambda x, y: ring(x, y) or teeth(x, y), lambda x, y: 'g1' if y + 0.5 < cy else 'g2', 'halo', over=False)


def wing(g, side, x0, y0):
    """Small folded wing behind the body; side -1 sticks out to the left, +1 to the right."""
    rows = ['.oo..', 'oWWo.', 'oWWWo', 'oYWWo', '.oYo.', '..o..']
    leg = {'o': 'w0', 'W': 'w1', 'Y': 'y1'}
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            x = x0 - i if side < 0 else x0 + i
            if g.get(x, y0 + j) is None:
                g.set(x, y0 + j, leg[ch], 'wing')


def hair_colour(cy, x0, x1):
    def col(x, y):
        if (y - (cy - 7)) in (0, 1) and x0 + 1 <= x <= x0 + 5 - (y - (cy - 7)) * 2:
            return 'h3'                                      # short sheen on the lit side
        if y >= cy - 1:
            return 'h1'
        return 'h2' if (x - y) % 5 == 0 else 'h1'
    return col


def blobs(X, Y, pts, rx, ry):
    return any(((X - px) / rx) ** 2 + ((Y - py) / ry) ** 2 <= 1 for px, py in pts)


# ---------------------------------------------------------------- heads from the original art
# Owner: the face must look as close as possible to the original. So the head is not
# drawn: it is the original's head, box-downsampled (premultiplied alpha) to chibi size,
# every pixel snapped to a palette sampled from the original, with a 1 px dark outline.
#   front: the game's angel_jayimpacts.png (from sprite_jayimpacts_character), frame 0
#          (idle) and frame 8 (closed-eye smile, used for the blink)
#   side:  the 3/4 figure of sprite_jayimpacts_avatar, mirrored to face left
ANGEL = Path('src/assets/art/angel_jayimpacts.png')       # 9 frames of 102 x 192 (3x)
AVATAR = Path('assets/incoming/Scene_2_Sprite/sprite_jayimpacts_avatar_no_green.png')
HEAD_PAL = ['#0A0807', '#1C1714', '#2C2520', '#3E342C', '#54463A',      # hair
            '#5C3024', '#C07A5A', '#E8A47E', '#F8C8A0', '#FFE2C4',      # skin
            '#2E2220', '#FFFFFF', '#C05848']                            # iris, white, lips
HEAD_W = {'front': 26, 'side': 24}


def _rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def _downsample(img, size, thr=120):
    w, h = img.size
    src = img.load()
    out = Image.new('RGBA', size)
    o = out.load()
    for Y in range(size[1]):
        for X in range(size[0]):
            x0, x1 = X * w // size[0], max(X * w // size[0] + 1, (X + 1) * w // size[0])
            y0, y1 = Y * h // size[1], max(Y * h // size[1] + 1, (Y + 1) * h // size[1])
            r = g = b = a = 0
            for yy in range(y0, y1):
                for xx in range(x0, x1):
                    pr, pg, pb, pa = src[xx, yy]
                    r += pr * pa; g += pg * pa; b += pb * pa; a += pa
            n = (x1 - x0) * (y1 - y0)
            if a / n > thr:
                o[X, Y] = (r // a, g // a, b // a, 255)
    return out


def _snap_outline(img):
    pal = [_rgb(h) for h in HEAD_PAL]
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = min(pal, key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2) + (255,)
    out = img.copy()
    o = out.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3]:
                continue
            if any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = _rgb('#0A0807') + (255,)
    # clear wing or collar specks in the bottom rows outside the chin
    for y in range(h - 3, h):
        for x in range(w):
            if not w * 0.25 <= x <= w * 0.75:
                o[x, y] = (0, 0, 0, 0)
    return out


_HEADS = {}


def head(kind):
    """'front', 'blink' or 'side' -> RGBA head image (no halo)."""
    if kind not in _HEADS:
        if kind == 'side':
            from PIL import ImageOps
            src = ImageOps.mirror(Image.open(AVATAR).convert('RGBA').crop((535, 170, 1010, 512)))
        else:
            fi = 8 if kind == 'blink' else 0
            src = Image.open(ANGEL).convert('RGBA').crop((fi * 102, 30, fi * 102 + 102, 97))  # below the halo, to the chin
        px = src.load()                                     # drop the gold halo where it overlaps the hair
        for y in range(src.height):
            for x in range(src.width):
                r, g_, b, a = px[x, y]
                if a and r > 150 and g_ > 100 and b < 90 and r - b > 90 and g_ - b > 50:
                    px[x, y] = (0, 0, 0, 0)
        src = src.crop(src.getbbox())
        w = HEAD_W['side' if kind == 'side' else 'front']
        _HEADS[kind] = _snap_outline(_downsample(src, (w, round(src.height * w / src.width))))
    return _HEADS[kind]


# ---------------------------------------------------------------- front
EYE = ['oooo', 'ewAe', '.AA.']                 # calm heavy lid (Drive art), dark iris, small catchlight
EYE_LEG = {'o': 'e0', 'w': 'ew', 'e': 'e0', 'A': 'e1', 'L': 'e2'}
EYE_SHUT = ['....', 'oooo', '....']           # closed: lid line


def front(frame):
    g = Grid()
    hb = 1 if frame == 'idle1' else 0
    wave = int(frame[-1]) if frame.startswith('wave') else None
    # legs and round shoes
    g.part(lambda x, y: (11 <= x <= 14 or 17 <= x <= 20) and 29 <= y <= 33,
           lambda x, y: 'p3' if x in (14, 20) else 'p1', 'pants')
    g.part(lambda x, y: (10 <= x <= 14 or 17 <= x <= 21) and 34 <= y <= 35,
           lambda x, y: 'x2' if y == 34 and x in (11, 18) else 'x1', 'shoe')
    # torso: open jacket, tee, belt
    def torso_col(x, y):
        if y == 28:
            return 'g' if x in (15, 16) else 'B'
        if y == 29:
            return 'p2'
        if 14 <= x <= 17:
            return 't2' if (x + y) % 5 == 0 else 't1'
        if x in (13, 18) and y <= 24:
            return 'j1'
        return jacket(x, y)
    g.part(lambda x, y: 10 <= x <= 21 and 22 <= y <= 29 and not (y == 22 and x in (10, 21)), torso_col, 'jacket')
    # arms: short sleeves, round hands
    g.part(box(8, 22, 9, 26), jacket, 'jacket')
    g.part(ell(9, 27.6, 1.6, 1.3), 'k2', 'skin', over=False)
    if wave is None:
        g.part(box(22, 22, 23, 26), jacket, 'jacket')
        g.part(ell(23, 27.6, 1.6, 1.3), 'k2', 'skin', over=False)
    wing(g, -1, 7, 21)
    wing(g, 1, 24, 21)
    # head: the original's (see head())
    hd = head('blink' if frame == 'blink' else 'front')
    g.paste(hd, 16 - hd.width // 2, 4 + hb)
    if wave is not None:
        # his right arm raised (viewer's right): sleeve going up and out, round hand
        o = wave
        def arm(x, y):
            if not 15 <= y <= 24:
                return False
            xl = 22 + (24 - y) // 3 + (o if y < 19 else 0)
            return xl <= x <= xl + 1
        g.part(arm, jacket, 'jacket')
        g.part(ell(26 + o, 13.6, 1.9, 1.7), 'k2', 'skin')
    halo(g, 16, 2 + hb)
    return g


# ---------------------------------------------------------------- side (faces left)
SIDE_POSE = {
    'idle0': dict(legs=((15, 15, 0), (12, 12, 0)), bob=0, arm=0),
    'idle1': dict(legs=((15, 15, 0), (12, 12, 0)), bob=0, arm=0, hb=1),
    'walk0': dict(legs=((15, 18, 0), (12, 9, 0)), bob=0, arm=1),
    'walk1': dict(legs=((14, 14, 1), (13, 13, 0)), bob=1, arm=0),
    'walk2': dict(legs=((14, 10, 0), (13, 17, 0)), bob=0, arm=-1),
    'walk3': dict(legs=((13, 13, 1), (14, 14, 0)), bob=1, arm=0),
    'wave0': dict(legs=((15, 15, 0), (12, 12, 0)), bob=0, arm=None),
    'wave1': dict(legs=((15, 15, 0), (12, 12, 0)), bob=0, arm=None),
}


def side(frame):
    g = Grid()
    p = SIDE_POSE[frame]
    up, hb = p['bob'], p.get('hb', 0)
    # legs: back one first (darker), each 4 px wide slanting from top x to bottom x
    for k, (xt, xb, lift) in enumerate(p['legs']):
        top, bot = 29 - up, 33 - lift
        def leg(x, y, xt=xt, xb=xb, top=top, bot=bot):
            if not top <= y <= bot:
                return False
            xc = xt + (xb - xt) * (y - top) / max(1, bot - top)
            return xc - 0.5 <= x <= xc + 3
        g.part(leg, 'p2' if k == 0 else 'p1', 'pants')
        g.part(lambda x, y, xb=xb, bot=bot: xb - 2 <= x <= xb + 3 and bot + 1 <= y <= bot + 2,
               lambda x, y, xb=xb: 'x2' if x == xb - 1 else 'x1', 'shoe')
    # torso
    ty = 22 - up
    def torso_col(x, y):
        if y == ty + 6:
            return 'g' if x == 11 else 'B'
        if y == ty + 7:
            return 'p2'
        if x <= 11:
            return 't1'
        if x == 12 and y <= ty + 2:
            return 'j1'
        return jacket(x, y)
    g.part(lambda x, y: 10 <= x <= 20 and ty <= y <= ty + 7 and not (y == ty and x in (10, 20)), torso_col, 'jacket')
    wing(g, 1, 21, ty - 1)
    if p['arm'] is not None:
        s = p['arm']
        g.part(lambda x, y: ty + 1 <= y <= ty + 4 and 14 + s * (y - ty) // 3 <= x <= 15 + s * (y - ty) // 3, jacket, 'jacket')
        g.part(ell(15 + s * 1.7, ty + 5.6, 1.6, 1.3), 'k2', 'skin', over=False)
    # head: the original's 3/4 view, mirrored to face left (see head())
    hd = head('side')
    g.paste(hd, 15 - hd.width // 2, 3 - up + hb)
    if p['arm'] is None:
        o = int(frame[-1])
        # near arm raised in front of him: sleeve up and forward, round hand
        def arm(x, y):
            if not ty - 3 <= y <= ty + 2:
                return False
            xl = 8 - o - (ty + 2 - y)
            return xl <= x <= xl + 2 + (2 if y >= ty else 0)
        g.part(arm, jacket, 'jacket')
        g.part(ell(2.6 - o, ty - 4.4, 1.9, 1.7), 'k2', 'skin')
    halo(g, 17, 1.6 - up + hb)
    return g


# ---------------------------------------------------------------- output
def to_image(g):
    im = Image.new('RGBA', (CW, CH))
    for y in range(CH):
        for x in range(CW):
            c = g.px[y][x]
            if c:
                h = c if c.startswith('#') else C[c]
                im.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im


def render():
    return {
        'side': [to_image(side(f)) for f in FRAMES['side']],
        'front': [to_image(front(f)) for f in FRAMES['front']],
    }


def main():
    views = render()
    for v, frames in views.items():
        for f, im in zip(FRAMES[v], frames):
            assert any(im.getpixel((x, CH - 1))[3] for x in range(CW)), f'{v} {f}: feet not on row {CH - 1}'
        sheet = Image.new('RGBA', (CW * len(frames), CH))
        for i, im in enumerate(frames):
            sheet.alpha_composite(im, (i * CW, 0))
        sheet.resize((sheet.width * R, sheet.height * R), Image.NEAREST).save(OUT / f'{ID}_{v}.png')
    meta = {
        'note': 'Generated by tools/jayimpacts_sprite.py. Do not edit by hand.',
        'renderScale': R,
        'cell': {'w': CW, 'h': CH},
        'frames': FRAMES,
        'anim': ANIM,
        'characters': [{
            'id': ID, 'name': 'Jayimpacts',
            'side': {'file': f'{ID}_side.png', 'frames': FRAMES['side']},
            'front': {'file': f'{ID}_front.png', 'frames': FRAMES['front']},
        }],
    }
    (OUT / f'{ID}.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n')
    if '--sheet' in sys.argv:
        frames = views['side'] + views['front']
        bg = Image.new('RGBA', (34 * len(frames), CH), (111, 176, 74, 255))
        for i, im in enumerate(frames):
            bg.alpha_composite(im, (i * 34, 0))
        bg.resize((bg.width * 8, bg.height * 8), Image.NEAREST).save(sys.argv[sys.argv.index('--sheet') + 1])
    print(f"jayimpacts: {len(views['side'])} side + {len(views['front'])} front frames -> {OUT}")


if __name__ == '__main__':
    main()

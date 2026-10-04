"""Jayimpacts walking sprite, cute anime chibi (owner: keep him human, Stardew Valley
inspired, then "make him cute, anime chibi style")
-> src/assets/art/characters/jayimpacts_side.png / _front.png + jayimpacts.json
(characters.json layout).

Same cell and conventions as the bird costumes: 32 x 36 frames, feet on row 35, side
view faces LEFT, sheets at RENDER_SCALE (3) x with nearest neighbour.

Chibi proportions: a big round head (rows 3-21, well over half his height), a small
body, short legs and round shoes. Big anime eyes (dark lash line, brown iris lighter at
the bottom, white catchlight), rosy cheeks, a tiny smile. Soft rounded hair clumps with
a sheen. Near-black tinted outline per material, three tones per material.

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
    'h0': '#141020', 'h1': '#2C2638', 'h2': '#423A58', 'h3': '#6A6490',            # hair
    'k0': '#5C3024', 'k1': '#E8A47E', 'k2': '#F8C8A0', 'k3': '#FFE2C4',            # skin
    'e0': '#1A1220', 'e1': '#6A3E2C', 'e2': '#B07850', 'ew': '#FFFFFF',            # eyes
    'bl': '#F59A8C', 'm1': '#A84838',                                              # blush, mouth
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
    ring = lambda x, y: ell(cx, cy, 5.2, 1.7)(x, y) and not ell(cx, cy, 3.4, 0.6)(x, y)
    g.part(ring, lambda x, y: 'g1' if y + 0.5 < cy else 'g2', 'halo', over=False)


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
        if 0 < (y - (cy - 7)) < 2 and x0 <= x <= x1 and (x + y) % 3:
            return 'h3'                                      # sheen band
        if y >= cy - 1:
            return 'h1'
        return 'h2' if (x - y) % 5 == 0 else 'h1'
    return col


def blobs(X, Y, pts, rx, ry):
    return any(((X - px) / rx) ** 2 + ((Y - py) / ry) ** 2 <= 1 for px, py in pts)


# ---------------------------------------------------------------- front
EYE = ['oooo', 'ewAe', 'ewAA', 'eAAL', '.LL.']  # lash, sparkle inside a dark iris, lighter iris at the bottom
EYE_LEG = {'o': 'e0', 'w': 'ew', 'e': 'e0', 'A': 'e1', 'L': 'e2'}
EYE_SHUT = ['....', '....', '.oo.', 'o..o', '....']  # happy closed eyes (^ ^)


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
    # head
    cy = 14 + hb
    g.part(ell(16, cy, 9.6, 8.4), lambda x, y: 'k3' if y < cy - 3 and x < 13 else ('k1' if y > cy + 5 else 'k2'), 'skin')
    # hair: rounded cap, soft tufts on top, a fringe of round clumps, sides to the cheeks
    def in_hair(x, y):
        X, Y = x + 0.5, y + 0.5
        cap = ((X - 16) / 10.4) ** 2 + ((Y - (cy - 4)) / 6.2) ** 2 <= 1 and Y <= cy - 3
        tufts = blobs(X, Y, ((10.5, cy - 8.6), (14.5, cy - 9.4), (19, cy - 9.2), (22.5, cy - 7.8)), 2.2, 1.6)
        fringe = blobs(X, Y, ((9, cy - 3), (12.4, cy - 2.6), (16, cy - 3.2), (19.8, cy - 2.4), (23, cy - 2.8)), 2.2, 1.9)
        sides = (6.2 <= X <= 8.2 or 23.8 <= X <= 25.8) and Y <= cy + 3 and ell(16, cy, 9.9, 8.7)(x, y)
        return cap or tufts or fringe or sides
    g.part(in_hair, hair_colour(cy, 10, 21), 'hair', over=False)
    # face
    ey = cy + 1
    eye = EYE_SHUT if frame == 'blink' else EYE
    g.stamp(9, ey, eye, EYE_LEG)
    g.stamp(19, ey, eye, EYE_LEG)
    if frame != 'blink':
        g.set(8, ey, 'e0')                                   # outer lash flicks
        g.set(23, ey, 'e0')
    for x in (7, 8, 23, 24):
        g.set(x, ey + 4, 'bl')
    g.set(15, ey + 5, 'm1')
    g.set(16, ey + 5, 'm1')
    g.set(14, ey + 4, 'k1')                                  # smile corners
    g.set(17, ey + 4, 'k1')
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
    halo(g, 16, 1.4 + hb)
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
    # head, face to the left
    cy = 14 - up + hb
    g.part(ell(15, cy, 9.2, 8.4), lambda x, y: 'k3' if y < cy - 2 and x < 12 else ('k1' if y > cy + 5 or x > 18 else 'k2'), 'skin')
    def in_hair(x, y):
        X, Y = x + 0.5, y + 0.5
        cap = ((X - 16) / 9.8) ** 2 + ((Y - (cy - 4)) / 6.2) ** 2 <= 1 and (Y <= cy - 3 or X >= 15.5)
        back = X >= 15.5 and Y <= cy + 5 and ell(15, cy, 9.6, 9)(x, y)
        tufts = blobs(X, Y, ((11, cy - 8.6), (15.5, cy - 9.4), (20, cy - 8.8), (23.6, cy - 5.8)), 2.2, 1.6)
        fringe = blobs(X, Y, ((7.4, cy - 2.6), (10.8, cy - 3), (14.4, cy - 2.6)), 2.2, 1.9)
        ear = ((X - 17.2) / 1.6) ** 2 + ((Y - (cy + 1.6)) / 2) ** 2 <= 1
        return (cap or back or tufts or fringe) and not ear
    g.part(in_hair, hair_colour(cy, 9, 21), 'hair', over=False)
    g.set(17, cy + 1, 'k1')                                   # ear detail
    ey = cy + 1
    g.stamp(7, ey, ['ooo', 'ewA', 'ewA', 'eAL', '.L.'], EYE_LEG)
    g.set(6, ey, 'e0')
    g.set(10, ey + 4, 'bl')
    g.set(11, ey + 4, 'bl')
    g.set(7, ey + 5, 'm1')
    if p['arm'] is None:
        o = int(frame[-1])
        # near arm raised in front of him: sleeve up and forward, round hand
        def arm(x, y):
            if not ty - 6 <= y <= ty + 2:
                return False
            xl = 9 - o - (ty + 2 - y) // 3
            return xl <= x <= xl + 2 + (2 if y >= ty else 0)
        g.part(arm, jacket, 'jacket')
        g.part(ell(5.6 - o, ty - 7.4, 1.9, 1.7), 'k2', 'skin')
    halo(g, 16, 1.4 - up + hb)
    return g


# ---------------------------------------------------------------- output
def to_image(g):
    im = Image.new('RGBA', (CW, CH))
    for y in range(CH):
        for x in range(CW):
            c = g.px[y][x]
            if c:
                h = C[c]
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

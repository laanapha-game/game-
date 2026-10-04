"""Team characters in Jayimpacts' model (owner: PO, PEAY, KAICHING, AOMSIN, NEMO from the
Drive folder "Team Asset"). Same cell (40 x 56 design px, feet on row 55), same frames and
anims as tools/jayimpacts_sprite.py, same proportions (head rows 7-33, face rows 18-32,
eyes on rows 24-27, top rows 33-46, legs 46-55, the "side" view a 3/4 turn to the left)
and the same dark outline; drawn from a per-person spec in tools/team_specs.py (hair,
glasses, skin, top, trousers) read off the owner's photos. No halo or wings: those are
Jayimpacts' angel.

-> src/assets/art/characters/team_<id>_side.png / _front.png + team.json  (3x, nearest)
-> src/assets/art/portraits/team_<id>_portrait.png  (2 frames of 64 x 64 at 3x: neutral, talk)

    python3 tools/team_sprite.py [--sheet out.png]   (--sheet: 4x preview of every frame)
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from team_specs import TEAM  # noqa: E402

OUT = Path('src/assets/art/characters')
POUT = Path('src/assets/art/portraits')
R = 3
CW, CH = 40, 56
OUTLINE = (10, 8, 7)
FRAMES = {
    'side': ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'wave0', 'wave1'],
    'front': ['idle0', 'idle1', 'blink', 'wave0', 'wave1'],
}
ANIM = {
    'side': {'idle': [0, 1], 'walk': [2, 3, 4, 5], 'wave': [6, 7]},
    'front': {'idle': [0, 1], 'blink': [2], 'wave': [3, 4]},
}
SKIN = {  # light, base, shade, deep (Jayimpacts' face uses 248,200,160 / 222,156,112)
    'light': [(255, 222, 190), (248, 204, 166), (226, 162, 120), (184, 112, 80)],
    'medium': [(250, 212, 174), (238, 190, 146), (212, 146, 104), (170, 102, 70)],
    'tan': [(236, 194, 152), (220, 170, 124), (186, 128, 88), (140, 88, 58)],
}
MOUTH = (186, 92, 80)
MOUTH_OPEN = (120, 42, 40)
TONGUE = (226, 120, 116)
BLUSH = (246, 168, 150)
WHITE = (252, 248, 242)


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c[:3])


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Canvas:
    """Pixel canvas; k > 1 draws the same geometry at k x resolution (portraits)."""

    def __init__(self, w, h, k=1):
        self.w, self.h, self.k = w * k, h * k, k
        self.px = {}

    def put(self, X, Y, c):
        if c is not None and 0 <= X < self.w and 0 <= Y < self.h:
            self.px[(X, Y)] = c

    def at(self, X, Y):
        return self.px.get((X, Y))

    def rect(self, x0, y0, x1, y1, c):
        k = self.k
        for Y in range(int(y0 * k), int((y1 + 1) * k)):
            for X in range(int(x0 * k), int((x1 + 1) * k)):
                self.put(X, Y, c)

    def dot(self, x, y, c):
        self.rect(x, y, x, y, c)

    def fill(self, inside, colour):
        """inside(x, y) in design units (pixel centres); colour: tuple or fn(x, y)."""
        k = self.k
        for Y in range(self.h):
            for X in range(self.w):
                x, y = (X + 0.5) / k, (Y + 0.5) / k
                if inside(x, y):
                    self.put(X, Y, colour(x, y) if callable(colour) else colour)

    def image(self):
        img = Image.new('RGBA', (self.w, self.h))
        p = img.load()
        for (X, Y), c in self.px.items():
            p[X, Y] = tuple(c) + (255,)
        o = img.copy()
        q = o.load()
        for Y in range(self.h):
            for X in range(self.w):
                if p[X, Y][3]:
                    continue
                if any(0 <= X + dx < self.w and 0 <= Y + dy < self.h and p[X + dx, Y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    q[X, Y] = OUTLINE + (255,)
        return o


# ---------------------------------------------------------------- head
def face_inside(cx, top=17.5):
    """Jayimpacts' face: wide cheeks (rows 25-30), a soft chin on rows 31-32."""
    def f(x, y):
        if y < top or y > 33:
            return False
        if y <= 28:
            hw = 10.6 * math.sqrt(max(0, 1 - ((y - 27) / (27.5 - top + 0.2)) ** 2))
        else:
            hw = 10.6 - (y - 28) ** 1.6 * 1.25
        return abs(x - cx) <= hw
    return f


def _hash(a, b):
    v = math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return v - math.floor(v)


def hair_tone(hc, x, y, k, cy=18.0, ry=11.0):
    """Jayimpacts' hair: a dark base with clustered, vertically stretched warm strands,
    a darker band low down and a shine arc near the top."""
    dark = shade(hc, 0.55)
    mid = mix(hc, (92, 70, 58), 0.42) if sum(hc) < 200 else shade(hc, 1.15)
    hi = mix(hc, (150, 112, 86), 0.55) if sum(hc) < 200 else shade(hc, 1.3)
    gx, gy = int(x * 1.0 + y * 0.35), int(y / 2.2)
    n = _hash(gx, gy)
    t = (y - (cy - ry)) / (2 * ry)                 # 0 at the top of the mass, 1 at the bottom
    if abs(t - 0.22) < 0.04 and _hash(int(x * 1.5), 7) > 0.45:
        return mid                                 # a broken shine arc
    if n > 0.9:
        return mid
    if n < 0.22:
        return dark
    return hc


STYLES = {
    # volume: (cx offset, cy, rx, ry); fringe(x): lowest hair row over the face; side: lowest row of the side locks
    'fringe': {'vol': (0, 18.2, 14.4, 11.2), 'side': 26, 'top': 17.5,
               'fringe': lambda d, x: 21.0 + (1.0 if int(x) % 3 == 0 else 0) + (0.5 if int(x) % 5 == 2 else 0) - (1.2 if d > 8.6 else 0)},
    'bun': {'vol': (0, 18.4, 13.0, 10.0), 'side': 24, 'top': 15.2,
            'fringe': lambda d, x: 15.6 + d * 0.55 + (0.9 if d > 6.5 else 0)},
    'messy': {'vol': (0, 17.6, 15.8, 12.0), 'side': 29, 'top': 17.5,
              'fringe': lambda d, x: 20.4 + (1.8 if int(x) % 4 == 1 else 0.8 if int(x) % 4 == 2 else -0.6) - (1.2 if d < 1.2 else 0)},
    'crop': {'vol': (0, 18.4, 13.0, 9.4), 'side': 22, 'top': 16.0,
             'fringe': lambda d, x: 17.2 + d * 0.15 + (0.6 if int(x) % 3 == 0 else 0)},
    'curtain': {'vol': (0, 18.0, 15.0, 11.4), 'side': 29, 'top': 17.5,
                'fringe': lambda d, x: (19.2 if d < 0.8 else 19.8 + min(d, 6.5) * 0.5 + (0.8 if int(x) % 3 == 1 else 0))},
}


def draw_head(cv, s, view, L=0, blink=False, talk=False):
    skin = SKIN[s['skin']]
    st = STYLES[s['hair']['style']]
    hc = s['hair']['colour']
    k = cv.k
    q = view == 'side'                      # 3/4 turn to the left
    fx = 19.5 - (1.5 if q else 0)          # face centre
    hx = 19.5 + (1.0 if q else 0)          # hair mass centre (more hair at the back)
    ox, cy, rx, ry = st['vol']
    cy += L
    # back hair (behind the face): side locks and, for the bun, the bun
    side_low = st['side'] + L
    if s['hair']['style'] == 'bun':
        bx, by = (31.5, 23.5 + L) if q else (32.0, 24.0 + L)
        cv.fill(lambda x, y: (x - bx) ** 2 / 14 + (y - by) ** 2 / 10 <= 1, lambda x, y: hair_tone(hc, x, y, k))
    # ears
    for ex in ((8.5, 30.5) if not q else (28.0,)):
        cv.fill(lambda x, y, ex=ex: abs(x - ex) <= 1.3 and 23.5 + L <= y <= 28.5 + L, skin[1])
        cv.dot(ex - 0.5 if ex < 20 else ex - 0.5, 26 + L, skin[2])
    # neck
    cv.rect(fx - 2, 31 + L, fx + 1, 34 + L, skin[2])
    # face
    face = face_inside(fx, st.get('top', 17.5))
    cv.fill(lambda x, y: face(x, y - L), lambda x, y: skin[2] if (x - fx > 8.6 and not q) or (q and x - fx > 7.5) else skin[1])
    # cheek light, chin shade
    cv.fill(lambda x, y: face(x, y - L) and y - L > 31.2, skin[2])
    # hair mass with the face cut out below the fringe
    fringe = st['fringe']

    spikes, amp = (16, 0.42) if s['hair']['style'] == 'messy' else (22, 0.12)

    def hair_in(x, y):
        yy = y - L
        e = ((x - hx - ox) / rx) ** 2 + ((y - cy) / ry) ** 2
        # a jagged silhouette: locks stick out in buckets around the head (spiky for messy hair)
        ang = math.atan2(y - cy, x - hx - ox)
        b = int((ang + math.pi) / (2 * math.pi) * spikes)
        lim = 1 + amp * _hash(b, 3.0) * (1 if ang < 0.5 or ang > 2.6 else 0.4)
        if e > 1 and e <= lim and not face(x, yy) and yy < 30:
            return True
        if e > 1:
            # side locks hang below the mass, outside the face
            return yy <= side_low and yy > cy - L and abs(x - hx) <= rx - 0.3 and not face(x, yy) and (abs(x - fx) > 8.2 or yy < 22)
        if face(x, yy):
            return yy <= fringe(abs(x - fx), x)
        return True
    cv.fill(hair_in, lambda x, y: hair_tone(hc, x, y, k, cy, ry))
    # strand tips: a few pointed locks over the forehead (Jayimpacts' fringe)
    if s['hair']['style'] in ('messy', 'fringe'):
        for tx in (-6, -2.5, 1.5, 5.5):
            x0 = fx + tx
            y0 = fringe(abs(tx), x0) + L
            cv.fill(lambda x, y, x0=x0, y0=y0: y0 <= y <= y0 + 1.6 and abs(x - x0) <= 0.9 - (y - y0) * 0.45, shade(hc, 0.8))
    # spikes on top for the messy style
    if s['hair']['style'] == 'messy':
        for sx, sy in ((-9, 8.5), (-4, 6.6), (2, 6.0), (7, 7.0), (11, 9.6)):
            cv.fill(lambda x, y, sx=sx, sy=sy: sy + L <= y <= sy + L + 2.2 and abs(x - (hx + sx)) <= (y - sy - L) * 0.7, lambda x, y: hair_tone(hc, x, y, k))
    if s['hair']['style'] == 'bun':
        # slicked back: a few lighter strand lines and loose front strands
        for x0 in (-5, -1.5, 2.5, 6):
            cv.fill(lambda x, y, x0=x0: abs(x - (hx + x0 + (y - cy) * 0.15)) < 0.5 and cy - 8 < y < cy - 1, shade(hc, 1.6) if sum(hc) < 150 else shade(hc, 1.2))
        for lx in ((fx - 9.2, fx + 9.2) if not q else (fx - 9.2,)):
            cv.fill(lambda x, y, lx=lx: abs(x - lx) < 0.55 and 20 + L <= y <= 31 + L, hc)
    # eyes, brows, nose, mouth, blush
    eyes = (fx - 7.0, fx + 3.5) if not q else (fx - 8.3, fx + 1.3)
    for i, ex in enumerate(eyes):
        far = q and i == 1
        draw_eye(cv, ex, 24 + L, s, blink, mirror=(i == 1), narrow=far)
    for i, ex in enumerate(eyes):
        by = 22 + L
        w = 4 if not (q and i == 1) else 3
        if all(cv.at(int((ex + j + 0.5) * k), int((by + 0.5) * k)) in (skin[1], skin[2]) for j in range(w)):
            cv.rect(ex + (0 if i == 0 else 1), by, ex + w - (1 if i == 0 else 0), by, shade(hc, 0.9) if sum(hc) > 200 else mix(hc, skin[2], 0.3))
    nx = fx - (0 if not q else 2.5)
    cv.dot(nx, 28 + L, skin[2])
    if q:
        cv.dot(nx - 1, 28 + L, skin[2])
    mx = fx - (0.5 if not q else 2.5)
    if talk:
        cv.rect(mx - 1, 30 + L, mx + 1, 31 + L, MOUTH_OPEN)
        cv.rect(mx - 0.5, 31 + L, mx + 0.5, 31 + L, TONGUE)
    else:
        cv.rect(mx - 0.5, 30 + L, mx + 0.5, 30 + L, MOUTH)
        if s.get('smile'):
            cv.dot(mx - 1.5, 29.5 + L, MOUTH) if k > 1 else cv.dot(mx - 1, 29 + L, MOUTH)
            cv.dot(mx + 1.5, 29.5 + L, MOUTH) if k > 1 else cv.dot(mx + 2, 29 + L, MOUTH)
    for bx in ((fx - 8, fx + 6) if not q else (fx - 8.5,)):
        cv.rect(bx, 28.5 + L, bx + 1, 28.5 + L, BLUSH)
    if s.get('glasses'):
        g = s['glasses']
        for i, ex in enumerate(eyes):
            w = 6 if not (q and i == 1) else 4
            x0, y0 = ex - 1, 23 + L
            cv.fill(lambda x, y, x0=x0, w=w, y0=y0: (((x - x0 - w / 2) / (w / 2)) ** 2 + ((y - y0 - 2.5) / 2.9) ** 2) <= 1 and (((x - x0 - w / 2) / (w / 2 - 0.9)) ** 2 + ((y - y0 - 2.5) / 2.0) ** 2) > 1, g)
        a, b = eyes[0] + 5, eyes[1] - 1
        cv.rect(a, 24 + L, b, 24 + L, g)


def draw_eye(cv, x, y, s, blink, mirror, narrow=False):
    """Jayimpacts' half-lidded eye: dark upper lash, a brown iris with a light catch."""
    ec = s.get('eye', (60, 38, 28))
    w = 4 if not narrow else 3
    if blink:
        cv.rect(x, y + 2, x + w - 1, y + 2, OUTLINE)
        cv.dot(x + (w - 1 if mirror else 0), y + 1, OUTLINE)
        return
    cv.rect(x, y, x + w - 1, y, OUTLINE)                       # lash
    cv.dot(x - 1 if not mirror else x + w, y + 0.5 if cv.k > 1 else y + 1, OUTLINE)  # outer flick
    cv.rect(x, y + 1, x + w - 1, y + 2, WHITE)
    ix = x + (1 if not mirror else (0 if narrow else 1))
    cv.rect(ix, y + 1, ix + 1, y + 3, ec)
    cv.rect(ix, y + 3, ix + 1, y + 3, shade(ec, 1.35))
    if cv.k > 1:
        cv.rect(ix + 0.5 * (0 if mirror else 1), y + 1, ix + 0.5 * (0 if mirror else 1), y + 1, (255, 255, 255))
        cv.rect(ix, y + 1, ix + 1.5, y + 1, shade(ec, 0.6))
        cv.rect(ix + (1 if mirror else 0), y + 1.5, ix + (1 if mirror else 0), y + 1.5, (255, 255, 255))
    else:
        cv.dot(ix + (1 if mirror else 0), y + 1, (255, 255, 255))


# ---------------------------------------------------------------- body
def draw_body(cv, s, view, L=0, wave=0, stride=0):
    t = s['top']
    col = t['colour']
    lt, sh, dk = shade(col, 1.12) if sum(col) < 600 else col, shade(col, 0.84), shade(col, 0.7)
    skin = SKIN[s['skin']]
    q = view == 'side'
    dx = -1 if q else 0
    top = 33 + L
    long = t.get('long')
    sleeve = t.get('sleeve', col)
    # trousers and shoes (behind the top)
    tr = s['bottom']['colour']
    trd = shade(tr, 0.72)
    shoe = s['shoes']
    if not q:
        for lx, c in ((15, tr), (21, tr)):
            cv.rect(lx, 45, lx + 3, 52, c)
            cv.rect(lx + 3, 46, lx + 3, 52, trd)
            cv.rect(lx - 1, 53, lx + 3, 55, shoe)
            cv.rect(lx, 53, lx + 1, 53, shade(shoe, 1.8))
        cv.rect(15, 45, 24, 47, tr)
    else:
        for k_, sgn in ((0, 1), (1, -1)):
            off = int(round(stride * sgn * 2))
            lx = 17 + off
            c = tr if k_ else trd
            cv.rect(lx, 45, lx + 3, 52 - (1 if (k_ == 0 and stride) else 0), c)
            cv.rect(lx - 2, 53 - (1 if (k_ == 0 and stride) else 0), lx + 3, 55 - (1 if (k_ == 0 and stride) else 0), shoe if k_ else shade(shoe, 0.8))
        cv.rect(15, 45, 23, 47, tr)
    # arms behind the body for the 3/4 view: the far arm
    if q:
        ax = 28 - int(round(stride))
        cv.rect(ax, top + 2, ax + 2, top + 9, shade(sleeve, 0.75) if (long or True) else None)
        cv.rect(ax, top + 6 if not long else top + 10, ax + 2, top + 10, shade(skin[1], 0.85) if not long else shade(sleeve, 0.75))
        cv.rect(ax, top + 10, ax + 2, top + 11, shade(skin[1], 0.85))
    # torso: shoulders at row 33-34, body to row 46
    def torso(x, y):
        yy = y - L
        if yy < 33 or yy > 46.9:
            return False
        hw = 6.6 if yy < 34 else 8.2 if yy < 38 else 7.8 if yy < 43 else 8.0
        return abs(x - (19.5 + dx)) <= hw
    cv.fill(torso, lambda x, y: lt if x < 19.5 + dx - 6.5 else sh if x > 19.5 + dx + 6 else col)
    # fabric folds
    cv.rect(16 + dx, 41 + L, 16 + dx, 44 + L, sh)
    cv.rect(23 + dx, 39 + L, 23 + dx, 43 + L, sh)
    cv.rect(11 + dx, 46 + L, 28 + dx, 46 + L, sh)
    # pattern
    if t.get('diagonal'):
        for i in range(-12, 16, 4):
            for j in range(0, 14):
                x = 12 + dx + i + j * 0.6
                y = 34 + L + j
                if 11 + dx < x < 28 + dx:
                    cv.dot(x, y, t['diagonal'])
    if t.get('print'):
        # a vertical ornament down the right of the chest (his shirt's white graphic)
        px = 22 + dx
        motif = ['.#.#.', '#####', '.#.#.', '..#..', '.###.', '#.#.#', '.###.', '..#..', '.#.#.', '##.##', '.#.#.']
        for j, row in enumerate(motif):
            for i, ch in enumerate(row):
                if ch == '#':
                    cv.dot(px + i, 35 + j + L, t['print'])
    # neckline
    nx = 19.5 + dx
    neck = t.get('neck', 'crew')
    if neck == 'crew':
        cv.rect(nx - 2.5, top, nx + 1.5, top, sh)
        cv.rect(nx - 1.5, top, nx + 0.5, top, skin[2])
    elif neck in ('polo', 'shirt'):
        cv.rect(nx - 1.5, top, nx + 0.5, top + 2, skin[1])
        cv.dot(nx - 0.5, top + 3, skin[2])
        cl = t.get('collar', lt if neck == 'polo' else (230, 230, 226))
        cv.rect(nx - 4.5, top, nx - 2.5, top + 1, cl)
        cv.rect(nx + 1.5, top, nx + 3.5, top + 1, cl)
        cv.dot(nx - 2.5, top + 2, cl)
        cv.dot(nx + 1.5, top + 2, cl)
        cv.rect(nx - 0.5, top + 4, nx - 0.5, top + 8 if neck == 'polo' else 46 + L, sh)
        if neck == 'shirt':
            for by in (top + 6, top + 9, top + 12):
                cv.dot(nx + 0.5, by, (200, 200, 196))
        if t.get('pocket'):
            cv.rect(nx + 3, top + 6, nx + 5, top + 8, sh)
    elif neck == 'henley':
        cv.rect(nx - 2.5, top, nx + 1.5, top, sh)
        cv.rect(nx - 1.5, top, nx + 0.5, top + 1, skin[2])
        cv.rect(nx - 0.5, top + 2, nx - 0.5, top + 5, sh)
    if t.get('necklace'):
        nc = t['necklace']
        for j in range(5):
            cv.dot(nx - 2.5 + j * 0.5, top + 1 + j, nc)
            cv.dot(nx + 1.5 - j * 0.5, top + 1 + j, nc)
        cv.rect(nx - 0.5, top + 6, nx - 0.5, top + 9, nc)
        cv.rect(nx - 1.5, top + 7, nx + 0.5, top + 7, nc)
    # near arms: sleeves then skin, hands at rows 43-44
    arms = [(9 + dx, False), (28 + dx, True)] if not q else [(10 + dx - int(round(stride)), False)]
    for ax, right in arms:
        if right and wave:
            cv.rect(ax, top + 1, ax + 2, top + 4, sleeve)
            hx = ax + 3 + (wave - 1)
            for i in range(7):
                x = ax + 1 + i * (hx - ax - 1) / 6
                c = sleeve if (long or i < 2) else skin[1]
                cv.rect(x, top - i, x + 2, top - i, c)
            cv.rect(hx - 0.5, top - 10, hx + 2.5, top - 7, skin[1])
            cv.dot(hx - 0.5 + (wave - 1), top - 11, skin[1])
            continue
        cv.rect(ax, top + 1, ax + 2, top + (9 if long else 5), sleeve)
        cv.rect(ax, top + 1, ax, top + (9 if long else 5), lt if not right else sh)
        # a dark seam between the arm and the body (Jayimpacts' outline reads between them)
        cv.rect(ax + (3 if not right else -1), top + 3, ax + (3 if not right else -1), top + 10, OUTLINE)
        if not long:
            cv.rect(ax, top + 5, ax + 2, top + 5, sh)
            cv.rect(ax, top + 6, ax + 2, top + 9, skin[1])
            cv.rect(ax + (2 if not right else 0), top + 6, ax + (2 if not right else 0), top + 9, skin[2])
        cv.rect(ax, top + 10, ax + 2, top + 11, skin[1])
        cv.dot(ax + (2 if not right else 0), top + 11, skin[2])
    if q and wave:
        # 3/4 wave: the near arm up and forward
        ax = 9 + dx
        cv.px = {p: c for p, c in cv.px.items() if not (ax * cv.k <= p[0] < (ax + 3) * cv.k and (top + 1) * cv.k <= p[1] < (top + 12) * cv.k)}
        cv.fill(torso, lambda x, y: lt if x < 19.5 + dx - 6.5 else sh if x > 19.5 + dx + 6 else col)
        hx = 6 - (wave - 1)
        for i in range(7):
            x = ax + 1 - i * (ax + 1 - hx) / 6
            c = sleeve if (long or i < 2) else skin[1]
            cv.rect(x, top + 1 - i, x + 2, top + 1 - i, c)
        cv.rect(hx - 1, top - 9, hx + 2, top - 6, skin[1])


# ---------------------------------------------------------------- frames
def frame(s, view, name):
    cv = Canvas(CW, CH)
    L = -1 if name == 'idle1' else 0
    wave = {'wave0': 1, 'wave1': 2}.get(name, 0)
    stride = {'walk0': 1, 'walk1': 0, 'walk2': -1, 'walk3': 0}.get(name, 0)
    bob = -1 if name in ('walk1', 'walk3') else 0
    draw_body(cv, s, view, L + bob, wave, stride)
    draw_head(cv, s, view, L + bob, blink=(name == 'blink'))
    return cv.image()


def portrait(s, talk):
    """64 x 64: head and shoulders drawn at 2x detail (Jayimpacts' portrait framing)."""
    cv = Canvas(32, 32 + 4, k=2)
    # draw into a 2x canvas offset so the head (x 4-36, rows 6-38) fills the frame
    big = Canvas(CW, CH, k=2)
    draw_body(big, s, 'front')
    draw_head(big, s, 'front', talk=talk)
    img = big.image()
    return img.crop((8, 7, 72, 71))


def main():
    meta = {'note': 'Generated by tools/team_sprite.py from tools/team_specs.py. Do not edit by hand.',
            'renderScale': R, 'cell': {'w': CW, 'h': CH}, 'frames': FRAMES, 'anim': ANIM, 'characters': []}
    previews = []
    for cid, s in TEAM.items():
        row = []
        for view in ('side', 'front'):
            frames = [frame(s, view, n) for n in FRAMES[view]]
            sheet = Image.new('RGBA', (CW * len(frames), CH))
            for i, f in enumerate(frames):
                sheet.paste(f, (i * CW, 0))
            sheet.resize((sheet.width * R, sheet.height * R), Image.NEAREST).save(OUT / f'team_{cid}_{view}.png')
            row += frames
        p = Image.new('RGBA', (128, 64))
        p.paste(portrait(s, False), (0, 0))
        p.paste(portrait(s, True), (64, 0))
        p.resize((p.width * R, p.height * R), Image.NEAREST).save(POUT / f'team_{cid}_portrait.png')
        meta['characters'].append({'id': f'team_{cid}', 'name': s['name'],
                                   'side': {'file': f'team_{cid}_side.png', 'frames': FRAMES['side']},
                                   'front': {'file': f'team_{cid}_front.png', 'frames': FRAMES['front']},
                                   'portrait': f'team_{cid}_portrait.png'})
        previews.append((row, p))
    (OUT / 'team.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n')
    if '--sheet' in sys.argv:
        out = sys.argv[sys.argv.index('--sheet') + 1]
        jay = [Image.open(OUT / f'jayimpacts_{v}.png').convert('RGBA') for v in ('side', 'front')]
        jay = [j.resize((j.width // R, j.height // R), Image.NEAREST) for j in jay]
        rows = [(None, None)] + previews
        H = 68
        sheet = Image.new('RGBA', (CW * 13 + 136, H * len(rows)), (96, 120, 96, 255))
        sheet.alpha_composite(jay[0], (0, 6))
        sheet.alpha_composite(jay[1], (CW * 8, 6))
        jp = Image.open(POUT / 'jayimpacts_portrait.png').convert('RGBA')
        jp = jp.resize((jp.width // R, jp.height // R), Image.NEAREST)
        sheet.alpha_composite(jp.crop((0, 0, 64, 64)), (CW * 13 + 4, 2))
        for r, (frames, p) in enumerate(previews, start=1):
            for i, f in enumerate(frames):
                sheet.alpha_composite(f, (i * CW, r * H + 6))
            sheet.alpha_composite(p.crop((0, 0, 128, 64)), (CW * 13 + 4, r * H + 2))
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(out)
    print(f"team: {', '.join(TEAM)} -> {OUT}, {POUT}")


if __name__ == '__main__':
    main()

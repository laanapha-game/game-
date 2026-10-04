"""Jayimpacts dialogue portrait, Stardew Valley inspired (owner references)
-> src/assets/art/portraits/jayimpacts_portrait.png (64 x 64 design px, 2 frames:
neutral, talk) at RENDER_SCALE x, nearest neighbour.

Bust portrait like the Stardew Valley portraits: head and shoulders, light from the
upper left, near-black tinted outline around the silhouette, 4-6 tones per material,
hand-placed eyes (white catchlight, heavy upper lid), strong brows, a soft smile.
Look from the Drive avatar: spiky black hair swept to one side, houndstooth jacket over
a black tee, a thin chain, white wings with yellow tips behind the shoulders and a gold
halo ring (plain ring, not the Drive gear).

    python3 tools/jayimpacts_portrait.py [--preview out.png]
"""
import math
import sys
from pathlib import Path

from PIL import Image

OUT = Path('src/assets/art/portraits')
R = 3
N = 64
FRAMES = ['neutral', 'talk']

C = {
    # skin ramp (outline .. highlight)
    'k0': '#4A2418', 'k1': '#B06A4C', 'k2': '#D88C68', 'k3': '#EAA67C', 'k4': '#F6C094', 'k5': '#FFDDB4',
    # hair ramp
    'h0': '#100C1A', 'h1': '#1C1828', 'h2': '#2A2438', 'h3': '#3A3450', 'h4': '#524A6C', 'h5': '#7470A0',
    # jacket houndstooth (light, mid, dark, shade) + outline
    'j0': '#141218', 'j1': '#D6D2CC', 'j2': '#9A9694', 'j3': '#5E5A5E', 'j4': '#3C383E',
    # tee
    't1': '#1E1A24', 't2': '#2E2A36', 't3': '#423C4C',
    # chain
    'c1': '#B8B4BC', 'c2': '#F4F2F6',
    # eyes
    'e0': '#100C14', 'e1': '#3A2A2A', 'e2': '#6A4A3C', 'ew': '#FFFFFF', 'es': '#E8DCD4',
    # mouth, blush
    'm1': '#9A4A3C', 'm2': '#C46E5C', 'bl': '#F0A088',
    # wings
    'w0': '#5E5468', 'w1': '#FFFFFF', 'w2': '#E6E4F2', 'w3': '#C4C0D8', 'y1': '#FFE070', 'y2': '#F0B030',
    # halo
    'g0': '#6A420A', 'g1': '#FFF486', 'g2': '#F4C838', 'g3': '#C8901C',
}


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Canvas:
    def __init__(self):
        self.px = [[None] * N for _ in range(N)]
        self.mat = [[None] * N for _ in range(N)]  # material per pixel, for the outline colour

    def set(self, x, y, col, mat=None):
        if 0 <= x < N and 0 <= y < N:
            self.px[y][x] = col
            if mat:
                self.mat[y][x] = mat

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < N and 0 <= y < N else None

    def fill(self, inside, colour, mat):
        for y in range(N):
            for x in range(N):
                if inside(x, y):
                    self.set(x, y, colour(x, y), mat)

    def outline(self, colours):
        add = []
        for y in range(N):
            for x in range(N):
                if self.px[y][x] is not None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    m = self.mat[y + dy][x + dx] if 0 <= x + dx < N and 0 <= y + dy < N else None
                    if m:
                        add.append((x, y, colours.get(m, 'h0')))
                        break
        for x, y, c in add:
            self.set(x, y, c)

    def stamp(self, x0, y0, rows, legend):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    self.set(x0 + i, y0 + j, legend[ch])

    def image(self):
        im = Image.new('RGBA', (N, N))
        for y in range(N):
            for x in range(N):
                if self.px[y][x]:
                    im.putpixel((x, y), rgb(C[self.px[y][x]]))
        return im


def ramp(v, names):
    """v in 0..1 -> one of the names (dark to light)."""
    i = max(0, min(len(names) - 1, int(v * len(names))))
    return names[i]


HOUNDSTOOTH = ['XX..', 'XXX.', '..XX', '.X.X']  # 4 x 4 tile


def checker(x, y):
    return HOUNDSTOOTH[y % 4][x % 4] == 'X'


# ---------------------------------------------------------------- shapes
HX, HY = 32, 27          # face centre
def face_half_width(y):
    """Face half width per row: wide cheeks, tapering to a soft chin at row 44."""
    if y < 12 or y > 44:
        return -1
    if y <= 30:
        return 12.5
    t = (y - 30) / 14
    return 12.5 * math.sqrt(max(0.0, 1 - t ** 2.2)) + 0.5


def in_face(x, y):
    return abs(x + 0.5 - HX) <= face_half_width(y)


def in_ear(x, y):
    for cx in (18.5, 45.5):
        if ((x - cx) / 2.6) ** 2 + ((y - 30) / 4.2) ** 2 <= 1:
            return True
    return False


def in_neck(x, y):
    return 25 <= x <= 38 and 38 <= y <= 50


def in_shoulders(x, y):
    if y < 47:
        return False
    # sloped shoulders out to the frame edges
    half = 14 + (y - 47) * 2.6
    return abs(x + 0.5 - 32) <= min(half, 31)


# Hair = a cap over the crown plus tapered clumps (root -> tip, root half-width).
# Spikes on top, tufts at the sides, and a fringe that falls over the forehead swept
# to the viewer's right. Each pixel belongs to its nearest clump; clump centres are
# lit, the seams between clumps are dark: that gives the Stardew strand look.
CLUMPS = [
    # crown spikes
    ((24, 12), (15, 5), 4.0), ((28, 10), (22, 2), 4.0), ((32, 10), (30, 1), 4.0), ((36, 10), (39, 2), 4.0),
    ((40, 12), (47, 4), 4.0), ((43, 15), (53, 10), 4.0), ((21, 15), (10, 11), 4.0),
    # sides and sideburns
    ((20, 18), (11, 21), 3.6), ((44, 18), (53, 19), 3.6), ((19, 22), (16, 31), 3.0), ((45, 22), (48, 31), 3.0),
    # fringe, swept to the viewer's right
    ((22, 14), (21, 25), 3.0), ((25, 13), (27, 23), 3.2), ((30, 13), (32, 22), 3.2),
    ((34, 13), (37, 24), 3.2), ((38, 14), (41, 22), 3.0), ((41, 15), (44, 25), 2.8),
]


def seg(px, py, a, b):
    (ax, ay), (bx, by) = a, b
    vx, vy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
    return math.hypot(px - (ax + vx * t), py - (ay + vy * t)), t


def hair_hit(x, y):
    """(clump index, normalized distance 0 centre .. 1 edge) or None. -1 = the cap."""
    px, py = x + 0.5, y + 0.5
    best = None
    for i, (root, tip, w) in enumerate(CLUMPS):
        d, t = seg(px, py, root, tip)
        width = w * (1 - t) + 0.6 * t
        if d <= width:
            n = d / width
            if best is None or n < best[1]:
                best = (i, n)
    cap = ((px - 32) / 15.5) ** 2 + ((py - 16) / 9) ** 2
    if cap <= 1 and not (in_face(x, y) and y >= 16):
        if best is None or cap < best[1]:
            best = (-1, cap * 0.8)
    return best


def in_hair(x, y):
    if in_ear(x, y) and y > 27:
        return False
    return hair_hit(x, y) is not None


def hairline(x):
    """Lowest hair row over the forehead at column x (for the fringe shadow)."""
    y = 16
    for yy in range(16, 30):
        if in_hair(x, yy):
            y = yy
    return y


def hair_colour(x, y):
    i, n = hair_hit(x, y)
    light = -((x + 0.5 - 30) * 0.5 + (y + 0.5 - 10) * 0.8) / 22 + 0.45
    v = light + (1 - n) * 0.35 - (0.35 if n > 0.82 and i >= 0 else 0)
    if 6 <= y <= 12 and i >= 0 and 0.15 < n < 0.55 and (x + 2 * y) % 4:
        v += 0.25                                         # sheen strands on the crown
    return ramp(v, ['h1', 'h1', 'h2', 'h2', 'h3', 'h4', 'h5'])


def skin_colour(x, y):
    dx = x + 0.5 - HX
    v = 0.56 - dx * 0.014 - max(0, y - 36) * 0.03
    if y <= hairline(x) + 2:
        v -= 0.25                                         # shadow under the fringe
    if y >= 38 and dx > -4:
        v -= 0.12                                         # jaw shade
    if abs(dx) > face_half_width(y) - 1.5:
        v -= 0.18                                         # rounded edge
    return ramp(v, ['k1', 'k2', 'k3', 'k4', 'k4', 'k5'])


def neck_colour(x, y):
    v = 0.35 - (x - 25) * 0.015 - (0.3 if y < 44 else 0)
    return ramp(v, ['k1', 'k2', 'k3', 'k4'])


def jacket_colour(x, y):
    shade = (x > 42) or y > 59 or (y < 50 and abs(x - 32) > 16)
    if checker(x, y):
        return 'j3' if shade else 'j2'
    return 'j2' if shade else 'j1'


def in_tee(x, y):
    # V opening between the lapels
    half = 4 + (y - 47) * 0.55
    return y >= 47 and abs(x + 0.5 - 32) <= min(half, 9)


def in_lapel_edge(x, y):
    half = 4 + (y - 47) * 0.55
    return y >= 47 and half < 9 and abs(abs(x + 0.5 - 32) - half) < 1.0


# ---------------------------------------------------------------- features
EYE_L = [  # viewer's left eye, 7 x 3: heavy upper lid, sclera, brown iris, pupil, catchlight
    '.aaaaaa',
    'aswipea',
    '..sppe.',
]
EYE_R = [r[::-1] for r in EYE_L]
EYE_LEG = {'a': 'e0', 's': 'es', 'w': 'ew', 'i': 'ew', 'p': 'e2', 'e': 'e0'}
BROW_L = ['aaaa...', '.aaaaaa']
BROW_R = [r[::-1] for r in BROW_L]
MOUTH = {
    'neutral': (['k....k', '.mmmm.'], (29, 39)),
    'talk': (['.mmmm.', 'mrrrrm', '.mmmm.'], (29, 39)),
}


# Viewer's left wing, hand drawn (mirrored for the right): it rises from behind the
# shoulder up and out, with feathers whose tips turn yellow (as in the Drive art).
WING_L = [
    '......oo......',
    '.....oWWo.....',
    '....oWWWWo....',
    '...oWWWWWLo...',
    '..oYWWWWWLLo..',
    '.oYGoWWWWWLo..',
    '.oYGoWWWWWLLo.',
    'oYYGoWWWWWLLo.',
    'oYGooWWWWWWLLo',
    '.oo.oWWWWWWLLo',
    '..oYGoWWWWWLLo',
    '.oYYGoWWWWWLLo',
    '.oYGooWWWWWLLo',
    '..oo.oWWWWWWLo',
    '...oYGoWWWWWLo',
    '..oYYGoWWWWWLo',
    '..oYGooWWWWWLo',
    '...oo.oWWWWWLo',
    '....oYGoWWWWLo',
    '...oYYGoWWWWLo',
    '...oYGooWWWLo.',
    '....oo..oWWLo.',
    '.........oLo..',
    '..........o...',
]
WING_LEG = {'o': 'w0', 'W': 'w1', 'L': 'w2', 'S': 'w3', 'Y': 'y1', 'G': 'y2'}


def wings(cv):
    for j, row in enumerate(WING_L):
        for i, ch in enumerate(row):
            if ch != '.':
                cv.set(1 + i, 30 + j, WING_LEG[ch], 'wing')
                cv.set(N - 2 - i, 30 + j, WING_LEG[ch], 'wing')


def halo(cv):
    for y in range(0, 7):
        for x in range(N):
            a = ((x + 0.5 - 33) / 15) ** 2 + ((y + 0.5 - 3.2) / 2.6) ** 2
            b = ((x + 0.5 - 33) / 12) ** 2 + ((y + 0.5 - 3.2) / 1.2) ** 2
            if a <= 1 and b > 1:
                col = 'g1' if y <= 2 else ('g2' if y <= 4 else 'g3')
                cv.set(x, y, col, 'halo')


def portrait(frame):
    cv = Canvas()
    wings(cv)
    cv.fill(in_shoulders, jacket_colour, 'jacket')
    cv.fill(lambda x, y: in_shoulders(x, y) and in_tee(x, y),
            lambda x, y: 't2' if (x + y) % 5 else 't3', 'jacket')
    cv.fill(lambda x, y: in_shoulders(x, y) and in_lapel_edge(x, y), lambda x, y: 'j0', 'jacket')
    cv.fill(in_neck, neck_colour, 'skin')
    # chain: a soft U across the collarbone
    for x in range(26, 38):
        y = round(48 + 3.2 * (1 - ((x - 31.5) / 6) ** 2))
        cv.set(x, y, 'c2' if x % 3 == 0 else 'c1')
    cv.fill(in_ear, lambda x, y: 'k3' if x < 32 else 'k2', 'skin')
    cv.fill(in_face, skin_colour, 'skin')
    cv.fill(in_hair, hair_colour, 'hair')
    halo(cv)
    cv.outline({'skin': 'k0', 'hair': 'h0', 'jacket': 'j0', 'wing': 'w0', 'halo': 'g0'})
    # inner lines: jaw under the chin onto the neck, ear detail
    for x in range(26, 38):
        y = 44
        if cv.get(x, y + 1) in ('k1', 'k2', 'k3', 'k4'):
            cv.set(x, y + 1, 'k1')
    cv.set(18, 30, 'k1'); cv.set(18, 31, 'k1'); cv.set(45, 30, 'k1'); cv.set(45, 31, 'k1')
    # face
    cv.stamp(21, 24, BROW_L, {'a': 'h0'})
    cv.stamp(36, 24, BROW_R, {'a': 'h0'})
    cv.stamp(21, 27, EYE_L, EYE_LEG)
    cv.stamp(36, 27, EYE_R, EYE_LEG)
    cv.set(33, 33, 'k1'); cv.set(33, 34, 'k1'); cv.set(32, 35, 'k2')   # nose
    cv.set(23, 34, 'bl'); cv.set(24, 34, 'bl'); cv.set(40, 34, 'bl'); cv.set(41, 34, 'bl')
    rows, (mx, my) = MOUTH[frame]
    cv.stamp(mx, my, rows, {'m': 'm1', 'r': 'm2', 'k': 'k1'})
    return cv.image()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = [portrait(f) for f in FRAMES]
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

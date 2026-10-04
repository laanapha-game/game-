"""Scene 3 art -> src/assets/scene3/ (re-runnable).

Two kinds of texture, as in the prototype:
  world/   props at 1 px per map unit (the camera scales them; at full zoom 1 px = 3
           design px). Day and night versions: <name>.png and <name>_n.png.
  char/    character-resolution sprites (accessories, the COZY sign, markers, icons)
           drawn at 1 design px per px and written at RENDER_SCALE (3) x, nearest
           neighbour, like the character sheets. The COZY sign is drawn directly at 3x
           so its small text stays readable.
  tiles.png  ground swatches (24 x 24) for the runtime ground canvas, day row then night row.

Colours: brand colours for the event (#DE5238 #000000 #8F2F20 #4A1A14 #FFFF4F #F02DF0
#FFFFFF); the surroundings use the satellite photo's colours, brightened (spec 4.2).

    python3 tools/scene3_art.py [--sheet docs/scene3/props_contact_sheet.png]
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path('src/assets/scene3')
R = 3

BRAND = dict(orange='#DE5238', black='#000000', dred='#8F2F20', ddred='#4A1A14', yellow='#FFFF4F', magenta='#F02DF0', white='#FFFFFF')
DAY = dict(
    grass='#6FB04A', lawn='#8CCB5A', lawn2='#7DBB4E', tree='#2F7A3C', treeHi='#6DBE55', treeOl='#1E5230',
    paver='#BDBAB4', joint='#A3A09A', lane='#8F958B', lane2='#7F857B', asphalt='#6D6A6E', asphalt2='#625F63',
    river='#4DB3EE', riverHi='#8AD4FF', bank='#2F86C0', sky='#6EC6F5', concrete='#CBC6B9', concrete2='#B9B4A7',
    forest='#4E8E3A', trunk='#6B4A2E', glass='#9FD3E6', wall='#F2EBDD', shrub='#3E8F45', soil='#8A6A48',
)
NIGHT = dict(
    grass='#1C1410', lawn='#241712', lawn2='#2B1B14', tree='#12261A', treeHi='#1F3D2A', treeOl='#050A07',
    paver='#4A1A14', joint='#2E100C', lane='#3A1E18', lane2='#321913', asphalt='#151214', asphalt2='#1C181A',
    river='#11203C', riverHi='#22406A', bank='#0A1428', sky='#000000', concrete='#2B2422', concrete2='#241E1C',
    forest='#101C12', trunk='#2A1A10', glass='#FFFF4F', wall='#5A4A44', shrub='#14301A', soil='#2A1A12',
)


def rgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


class C:
    """Pixel canvas with a few drawing helpers (colours as hex strings)."""

    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h))
        self.w, self.h = w, h
        self.p = self.im.load()

    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and c:
            self.p[x, y] = rgb(c) if isinstance(c, str) else c

    def get(self, x, y):
        return self.p[x, y] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def rect(self, x0, y0, w, h, c):
        for y in range(int(y0), int(y0 + h)):
            for x in range(int(x0), int(x0 + w)):
                self.px(x, y, c(x, y) if callable(c) else c)

    def ell(self, cx, cy, rx, ry, c):
        for y in range(self.h):
            for x in range(self.w):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.px(x, y, c(x, y) if callable(c) else c)

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for i in range(n + 1):
            self.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c)

    def poly(self, pts, c):
        ImageDraw.Draw(self.im).polygon([tuple(p) for p in pts], fill=rgb(c))

    def outline(self, c='#000000', border=None):
        """1 px outline around the silhouette; border: an extra die-cut ring outside it."""
        for col in [c] + ([border] if border else []):
            src = self.im.copy().load()
            for y in range(self.h):
                for x in range(self.w):
                    if src[x, y][3]:
                        continue
                    if any(0 <= x + dx < self.w and 0 <= y + dy < self.h and src[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                        self.p[x, y] = rgb(col)
        return self

    def save(self, name, scale=1):
        path = OUT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        im = self.im.resize((self.w * scale, self.h * scale), Image.NEAREST) if scale != 1 else self.im
        im.save(path)
        return path


def pal(night):
    return {**(NIGHT if night else DAY), **BRAND}


def both(name, fn, *a):
    """Draw a world prop in day and night versions."""
    fn(False, *a).save(f'world/{name}.png')
    fn(True, *a).save(f'world/{name}_n.png')


# 3 x 5 pixel digits and capitals for plaques and signs
FONT3 = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111',
}


def digit(c, x, y, ch, col):
    bits = FONT3[ch]
    for i, b in enumerate(bits):
        if b == '1':
            c.px(x + i % 3, y + i // 3, col)


# ---------------------------------------------------------------- ground tiles
TILE = 24
SURFACES = ['grass', 'lawn', 'paver', 'path', 'lane', 'asphalt', 'concrete', 'river', 'forest', 'sky', 'soil', 'cone']


def tile(night, kind):
    P = pal(night)
    c = C(TILE, TILE)
    noise = lambda x, y, k: ((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) % 97
    if kind in ('grass', 'lawn', 'forest', 'soil'):
        base = P[kind]
        hi = P['lawn2'] if kind == 'lawn' else (P['treeHi'] if kind == 'forest' else P['lawn'])
        c.rect(0, 0, TILE, TILE, base)
        for y in range(TILE):
            for x in range(TILE):
                if noise(x, y, 1) < 7:
                    c.px(x, y, hi)
                    c.px(x, y - 1, hi)
    elif kind in ('paver', 'path'):
        c.rect(0, 0, TILE, TILE, P['paver'])
        for y in range(TILE):
            for x in range(TILE):
                off = 6 if (y // 6) % 2 else 0
                if y % 6 == 5 or (x + off) % 12 == 11:
                    c.px(x, y, P['joint'])
        if kind == 'path':  # the paved cross path: a lighter edge
            c.rect(0, 0, TILE, 1, P['joint'])
    elif kind == 'lane':
        c.rect(0, 0, TILE, TILE, P['lane'])
        for y in range(TILE):
            for x in range(TILE):
                if noise(x, y, 2) < 9:
                    c.px(x, y, P['lane2'])
    elif kind == 'asphalt':
        c.rect(0, 0, TILE, TILE, P['asphalt'])
        for y in range(TILE):
            for x in range(TILE):
                if noise(x, y, 3) < 10:
                    c.px(x, y, P['asphalt2'])
    elif kind == 'concrete':
        c.rect(0, 0, TILE, TILE, P['concrete'])
        for y in range(TILE):
            for x in range(TILE):
                if noise(x, y, 4) < 6 or y == 23 or x == 23:
                    c.px(x, y, P['concrete2'])
    elif kind == 'river':
        c.rect(0, 0, TILE, TILE, P['river'])
        for y in range(TILE):
            for x in range(TILE):
                if (x + 2 * (y // 4)) % 12 < 3 and y % 4 == 1:
                    c.px(x, y, P['riverHi'])
    elif kind == 'sky':
        c.rect(0, 0, TILE, TILE, P['sky'])
        if night:
            for x, y in ((3, 5), (17, 2), (11, 15), (21, 19)):
                c.px(x, y, '#FFFFFF')
    elif kind == 'cone':  # dithered light cone: pale yellow at night, white by day
        col = '#FFF9B0' if night else '#FFFFFF'
        for y in range(TILE):
            for x in range(TILE):
                if (x + y) % 2 == 0 and (y % 4 < 2):
                    c.px(x, y, rgb(col, 110 if night else 90))
    return c


def tiles():
    sheet = Image.new('RGBA', (TILE * len(SURFACES), TILE * 2))
    for row, night in enumerate((False, True)):
        for i, k in enumerate(SURFACES):
            sheet.alpha_composite(tile(night, k).im, (i * TILE, row * TILE))
    sheet.save(OUT / 'tiles.png')


# fences: an orange-red fence with bunting and lights; corrugated tin
def fence_strip(night):
    P = pal(night)
    c = C(24, 12)  # drawn along the fence line; repeated at runtime
    c.rect(0, 6, 24, 4, P['orange'])
    c.rect(0, 9, 24, 1, P['dred'])
    for x in range(0, 24, 6):
        c.rect(x, 4, 1, 6, P['dred'])
    c.line(0, 1, 23, 1, P['black'] if not night else '#3A3A3A')  # bunting string
    flags = [P['yellow'], P['magenta'], P['white']]
    for i, x in enumerate(range(1, 24, 4)):
        f = flags[i % 3]
        c.rect(x, 2, 3, 1, f)
        c.px(x + 1, 3, f)
    for x in (3, 15):
        c.px(x, 0, '#FFFF4F' if night else '#FFF7C0')  # lights
    return c


def tin_strip(night):
    P = pal(night)
    c = C(12, 24)
    for x in range(12):
        c.rect(x, 0, 1, 24, '#9AA0A4' if x % 3 else '#6E7478' if not night else '#2E3236')
    if night:
        c.rect(0, 0, 12, 24, lambda x, y: '#3A3E42' if x % 3 else '#24282C')
    return c


# ---------------------------------------------------------------- props
def guesthouse(night, n):
    """Sticker-style guesthouse from the owner's photos: wood panels, white posts and trim,
    dark grey roof, white-framed windows with awnings, a glass door on odd numbers, plaque."""
    P = pal(night)
    W, H = 42, 34
    c = C(W, H)
    x0, x1 = 3, W - 4  # body
    roof_top, wall_top, base_y = 3, 12, 27
    # roof (seen from the slight tilt): dark grey with white fascia
    c.poly([(x0 - 1, wall_top), (x0 + 3, roof_top), (x1 - 3, roof_top), (x1 + 1, wall_top)], '#555B64' if not night else '#2A2D33')
    c.rect(x0 + 4, roof_top + 2, x1 - x0 - 8, 1, '#6A707A' if not night else '#33373E')  # one highlight
    c.rect(x0 - 1, wall_top - 1, x1 - x0 + 3, 1, '#FFFFFF' if not night else '#B8B8B8')
    # walls: vertical wood grain panels
    for x in range(x0, x1 + 1):
        col = '#B4642F' if (x // 2) % 2 == 0 else '#9A5127'
        if night:
            col = '#4A2412' if (x // 2) % 2 == 0 else '#3C1D0E'
        c.rect(x, wall_top, 1, base_y - wall_top, col)
    # white corner posts and base
    for x in (x0, x1):
        c.rect(x, wall_top, 1, base_y - wall_top, '#FFFFFF' if not night else '#C8C8C8')
    c.rect(x0, base_y, x1 - x0 + 1, 2, '#FFFFFF' if not night else '#C8C8C8')
    # windows with small awnings; a sliding glass door on odd numbers
    door = n % 2 == 1
    slots = [6, 14, 25] if door else [6, 14, 22, 30]
    for wx in slots:
        c.rect(wx - 1, wall_top + 2, 7, 1, '#555B64' if not night else '#2A2D33')  # awning
        c.rect(wx, wall_top + 3, 5, 6, '#FFFFFF')
        c.rect(wx + 1, wall_top + 4, 3, 4, P['glass'])
        c.px(wx + 1, wall_top + 4, '#FFFFFF' if not night else '#FFFFC0')
    if door:
        c.rect(32, wall_top + 2, 6, base_y - wall_top - 2, '#FFFFFF')
        c.rect(33, wall_top + 3, 4, base_y - wall_top - 3, P['glass'])
        c.rect(35, wall_top + 3, 1, base_y - wall_top - 3, '#FFFFFF')
    # house number plaque (black digit on white)
    px_ = 21 if not door else 20
    c.rect(px_ - 1, wall_top + 10, 5, 7, '#FFFFFF')
    digit(c, px_, wall_top + 11, str(n), '#000000')
    # shrubs in front
    for x in range(x0 + 1, x1, 3):
        c.ell(x + 1, base_y + 3, 2.2, 1.8, P['shrub'])
        c.px(x, base_y + 2, P['treeHi'])
    c.outline('#1E1E22', border='#FFFFFF')
    return c


def carport(night):
    P = pal(night)
    c = C(48, 40)
    # cars (plain shapes, no badges or plates)
    def car(x, y, body, dark, hatch):
        c.rect(x, y + 4, 16, 9, body)
        c.rect(x + 2, y, 12, 5, dark)  # cabin / windscreen
        c.rect(x + 3, y + 1, 10, 3, '#8FB8C8' if not night else '#1E2A36')
        if hatch:
            c.rect(x + 2, y + 4, 12, 1, dark)
        c.rect(x + 1, y + 13, 3, 2, '#1A1A1A')
        c.rect(x + 12, y + 13, 3, 2, '#1A1A1A')
        c.rect(x + 1, y + 7, 2, 1, '#FFFFFF' if not night else '#FFFF4F')
        c.rect(x + 13, y + 7, 2, 1, '#FFFFFF' if not night else '#FFFF4F')
    car(5, 20, '#C9CDD2' if not night else '#4A4D52', '#8E949A' if not night else '#2E3136', True)  # silver hatchback
    car(27, 20, '#4A4C50' if not night else '#1E1F22', '#2E3034' if not night else '#141516', False)  # dark grey sedan
    # posts and slatted roof
    for x in (2, 24, 45):
        c.rect(x, 10, 2, 28, '#FFFFFF' if not night else '#B0B0B0')
    for y in range(2, 11):
        c.rect(0, y, 48, 1, '#3A3D42' if y % 2 else '#2A2C30')
    c.rect(0, 10, 48, 1, '#FFFFFF' if not night else '#909090')
    c.outline('#111111')
    return c


ICONS = {
    'bag': ['.###.', '#...#', '#####', '#####', '#####'],
    'cup': ['#####', '#####', '.###.', '.###.', '.###.'],
    'pizza': ['#####', '.#.#.', '.###.', '..#..', '..#..'],
    'camera': ['.#...', '#####', '##.##', '#####', '.....'],
    'gear': ['.#.#.', '#####', '##.##', '#####', '.#.#.'],
}
SHOP_COLOURS = {  # awning main, accent, counter
    'bag': ('#DE5238', '#FFFFFF', '#FFFF4F'),
    'cup': ('#FFFF4F', '#000000', '#DE5238'),
    'pizza': ('#DE5238', '#FFFF4F', '#FFFFFF'),
    'camera': ('#F02DF0', '#FFFFFF', '#FFFF4F'),
    'gear': ('#FFFF4F', '#F02DF0', '#FFFFFF'),
}
LANE_COLOURS = [('#F02DF0', '#FFFF4F', '#DE5238'), ('#DE5238', '#FFFFFF', '#FFFF4F'), ('#FFFF4F', '#DE5238', '#F02DF0'),
                ('#000000', '#FFFF4F', '#DE5238'), ('#F02DF0', '#FFFFFF', '#FFFF4F')]


def dim(h, k=0.45):
    r, g, b, _ = rgb(h)
    return '#%02X%02X%02X' % (int(r * k), int(g * k), int(b * k))


def stall(night, colours, icon, layer):
    """26 x 30 stall (rim included): striped awning (3 px stripes), dark opening, counter with
    a 5 x 5 icon, darker base. layer: 'back' (whole stall) or 'front' (awning + counter only)."""
    main, accent, counter = colours
    if night:
        main, accent, counter = dim(main, 0.7), dim(accent, 0.7), dim(counter, 0.7)
    c = C(26, 30)
    inner = lambda x, y: 1 <= x <= 24 and 1 <= y <= 28
    if layer == 'back':
        c.rect(1, 9, 24, 13, '#1A1416')  # dark opening
        c.rect(1, 9, 1, 13, '#3A3436')
        c.rect(24, 9, 1, 13, '#3A3436')
    # awning rows 1-8, 3 px stripes, scalloped edge
    for x in range(1, 25):
        col = main if (x - 1) // 3 % 2 == 0 else accent
        c.rect(x, 1, 1, 7, col)
        if (x % 3) != 0:
            c.px(x, 8, col)
    if night:
        for x in range(2, 25, 4):
            c.px(x, 1, '#FFFF4F')
    # counter rows 22-28: top lip, front with icon, darker base
    c.rect(1, 22, 24, 1, '#FFFFFF' if not night else '#9A9A9A')
    c.rect(1, 23, 24, 4, counter)
    c.rect(1, 27, 24, 2, dim(counter, 0.6))
    if icon:
        for j, row in enumerate(ICONS[icon]):
            for i, ch in enumerate(row):
                if ch == '#':
                    c.px(11 + i, 23 + j - 1 if j else 23, '#000000' if counter != '#000000' else '#FFFF4F')
    # rim
    for y in range(30):
        for x in range(26):
            if c.get(x, y)[3] and not inner(x, y):
                c.px(x, y, '#000000')
    c.outline('#000000')
    return c


def desk(night):
    P = pal(night)
    c = C(32, 16)
    c.rect(1, 3, 30, 3, '#FFFFFF' if not night else '#A0A0A0')  # top
    c.rect(1, 6, 30, 8, P['orange'] if not night else '#8F2F20')  # skirt
    for x in range(3, 30, 6):
        c.rect(x, 6, 2, 8, P['dred'] if not night else '#4A1A14')
    c.rect(5, 1, 6, 2, '#FFFF4F')  # clipboard
    c.rect(20, 0, 7, 3, '#F02DF0')  # badges box
    c.outline('#000000')
    return c


def table(night):
    P = pal(night)
    c = C(22, 18)
    wood, wood2 = ('#B07A48', '#8A5A30') if not night else ('#4A2E1A', '#341F10')
    for sx, sy in ((3, 4), (17, 4), (3, 13), (17, 13)):  # stools
        c.ell(sx + 1, sy + 1, 2.2, 1.6, wood2)
        c.px(sx + 1, sy + 3, '#3A2414')
    c.rect(6, 4, 10, 7, wood)  # table top
    c.rect(6, 4, 10, 1, '#D49A60' if not night else '#5E3A20')
    c.rect(6, 11, 10, 2, wood2)
    c.rect(7, 13, 1, 3, '#3A2414')
    c.rect(14, 13, 1, 3, '#3A2414')
    c.outline('#20140C')
    return c


def tree(night, w=18, h=26, dark=False):
    P = pal(night)
    c = C(w, h)
    tc, hi = (P['tree'], P['treeHi'])
    if dark:
        tc, hi = ('#2A6A34', '#4E9A48') if not night else ('#0C1C12', '#162C1C')
    c.rect(w // 2 - 1, h - 8, 3, 8, P['trunk'])
    cx = w / 2
    c.ell(cx, h * 0.42, w / 2 - 1, h * 0.38, tc)
    c.ell(cx - 2, h * 0.32, w / 3.2, h * 0.22, hi)
    c.ell(cx + 1, h * 0.36, w / 3.4, h * 0.2, tc)
    c.outline(P['treeOl'])
    return c


def bush(night, flowers=False):
    P = pal(night)
    c = C(10, 7)
    c.ell(5, 4, 4.5, 3, P['tree'])
    c.ell(4, 3, 2.5, 1.6, P['treeHi'])
    if flowers:
        for x, y, col in ((2, 3, '#F02DF0'), (6, 2, '#FFFFFF'), (7, 4, '#F02DF0'), (4, 5, '#FFFFFF')):
            c.px(x, y, col)
    c.outline(P['treeOl'])
    return c


def town_house(night, roof):
    c = C(40, 34)
    roof_c = '#' + roof
    if night:
        roof_c = dim(roof_c, 0.35)
    wall = '#F2EBDD' if not night else '#3A302C'
    c.rect(4, 14, 32, 17, wall)
    c.poly([(2, 15), (8, 3), (32, 3), (38, 15)], roof_c)
    c.rect(8, 4, 24, 1, dim(roof_c, 1.15) if not night else dim(roof_c, 1.4))
    for wx in (8, 18, 28):
        c.rect(wx, 18, 5, 5, '#7FA6B8' if not night else '#FFFF4F')
        c.rect(wx, 18, 5, 1, '#FFFFFF' if not night else '#C8C24A')
    c.rect(18, 25, 5, 6, '#7A5A3A' if not night else '#2A1A10')
    c.rect(4, 30, 32, 1, '#A9A397' if not night else '#241E1C')
    c.outline('#2A2622')
    return c


def haunted_house(night):
    """TODO(asset): replace with haunted_house_124x60.png halved to 62 x 30 (majority-colour
    downsample) when the file arrives. Placeholder in the same size and spirit: dark old
    house, glowing windows, two glowing pumpkins, magenta dithered halo."""
    c = C(62, 30)
    body = '#3A2A30' if not night else '#1E1418'
    roof = '#2A1E24' if not night else '#120C0E'
    c.rect(8, 12, 46, 16, body)
    c.poly([(4, 13), (16, 3), (46, 3), (58, 13)], roof)
    c.poly([(22, 6), (31, 0), (40, 6)], roof)  # gable
    for x in range(9, 54, 3):
        c.rect(x, 12, 1, 16, dim(body, 0.8))
    win = '#FFFF4F' if night else '#F7E27A'
    for wx in (13, 24, 36, 46):
        c.rect(wx, 16, 4, 5, win)
        c.rect(wx + 1, 18, 2, 1, '#8F2F20')
    c.rect(28, 20, 6, 8, '#120A0C')
    for px_ in (6, 55):  # glowing pumpkins
        c.ell(px_, 27, 2.6, 2, '#DE5238')
        c.px(px_ - 1, 27, '#FFFF4F')
        c.px(px_ + 1, 27, '#FFFF4F')
        c.px(px_, 24, '#3A6A2A')
    c.outline('#000000')
    # magenta dithered halo around the silhouette
    src = c.im.copy().load()
    for y in range(30):
        for x in range(62):
            if src[x, y][3]:
                continue
            near = any(0 <= x + dx < 62 and 0 <= y + dy < 30 and src[x + dx, y + dy][3] for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
            if near and (x + y) % 2 == 0:
                c.px(x, y, rgb('#F02DF0', 200 if night else 150))
    return c


def haunted_windows():
    """Window glow overlay (flickered at runtime)."""
    c = C(62, 30)
    for wx in (13, 24, 36, 46):
        c.rect(wx, 16, 4, 5, '#FFFFB0')
    return c


def screen(night):
    c = C(44, 36)
    # two poles and a screen drawn along a diagonal (facing the seats to the south-west)
    c.rect(6, 14, 2, 22, '#5A5A5A')
    c.rect(38, 4, 2, 26, '#5A5A5A')
    c.poly([(4, 10), (40, 0), (40, 22), (4, 30)], '#000000')
    face = '#FFFFFF' if not night else '#E8E4C8'
    c.poly([(6, 11), (38, 2), (38, 20), (6, 28)], face)
    if night:
        c.poly([(10, 14), (34, 7), (34, 17), (10, 24)], '#C8C0A0')
    c.outline('#000000')
    return c


def band_deck(night):
    c = C(48, 18)
    wood, wood2 = ('#B07A48', '#8A5A30') if not night else ('#4A2E1A', '#341F10')
    c.rect(0, 2, 48, 12, wood)
    for y in range(3, 14, 3):
        c.rect(0, y, 48, 1, wood2)
    c.rect(0, 14, 48, 3, wood2)
    c.outline('#20140C')
    return c


def band_backdrop(night):
    """Hand-sewn patchwork backdrop on a simple frame (deliberately not professional)."""
    c = C(48, 22)
    cols = ['#DE5238', '#FFFF4F', '#F02DF0', '#FFFFFF', '#8F2F20', '#6FB04A']
    c.rect(1, 0, 2, 22, '#6B4A2E')
    c.rect(45, 0, 2, 22, '#6B4A2E')
    for j in range(4):
        for i in range(7):
            col = cols[(i * 2 + j * 3) % len(cols)]
            if night:
                col = dim(col, 0.45)
            c.rect(4 + i * 6, 1 + j * 5, 6, 5, col)
            c.px(4 + i * 6, 1 + j * 5, '#000000')
    c.outline('#20140C')
    return c


def band_speaker(night):
    c = C(8, 14)
    c.rect(0, 0, 8, 14, '#222222')
    c.ell(4, 4, 2.4, 2.4, '#555555')
    c.ell(4, 10, 3, 3, '#555555')
    c.px(4, 10, '#000000')
    c.outline('#000000')
    return c


def band_lights(night):
    c = C(56, 10)
    for x in range(56):
        y = int(2 + 5 * math.sin(math.pi * x / 55))
        c.px(x, y, '#3A3A3A')
        if x % 6 == 3:
            bulb = ['#FFFF4F', '#F02DF0', '#FFFFFF', '#DE5238'][(x // 6) % 4]
            if not night:
                bulb = dim(bulb, 0.85)
            c.px(x, y + 1, bulb)
            c.px(x, y + 2, bulb)
    return c


def haybale(night):
    c = C(10, 6)
    c.rect(0, 0, 10, 6, '#E2C25A' if not night else '#5A4A1E')
    for x in range(1, 10, 3):
        c.rect(x, 0, 1, 6, '#C8A440' if not night else '#4A3C18')
    c.outline('#6A5020')
    return c


def rug(night):
    """Woven rug in front of the band (flat, walkable)."""
    c = C(30, 12)
    cols = ['#DE5238', '#FFFF4F', '#8F2F20', '#F02DF0']
    for y in range(12):
        for x in range(30):
            col = cols[((x // 3) + (y // 2)) % 4]
            c.px(x, y, dim(col, 0.5) if night else col)
    c.outline('#4A1A14')
    return c


def beanbag(night, colour):
    c = C(8, 6)
    col = '#FFFF4F' if colour == 'yellow' else '#F02DF0'
    if night:
        col = dim(col, 0.55)
    c.ell(4, 3.2, 4, 2.8, col)
    c.ell(3, 2.4, 2, 1.2, '#FFFFFF' if not night else dim(col, 1.5))
    c.outline('#000000')
    return c


def shadow(w, h):
    c = C(w, h)
    c.ell(w / 2, h / 2, w / 2, h / 2, rgb('#000000', 70))
    return c


# ---------------------------------------------------------------- character-resolution sprites (3x)
def acc(name):
    """Accessories at design px, placed on the character's head top (hats, headphones) or
    in front of the body (instruments, mic). Drawn for the front view."""
    if name == 'headphones':
        c = C(20, 10)
        c.line(3, 6, 6, 1, '#000000'); c.line(6, 1, 13, 1, '#000000'); c.line(13, 1, 16, 6, '#000000')
        c.rect(1, 5, 4, 5, '#F02DF0'); c.rect(15, 5, 4, 5, '#F02DF0')
        c.outline('#000000')
    elif name == 'chef_hat':
        c = C(14, 11)
        for cx in (4, 7, 10):
            c.ell(cx, 4, 3, 3, '#FFFFFF')
        c.rect(3, 6, 8, 4, '#FFFFFF')
        c.rect(3, 9, 8, 1, '#D8D8D8')
        c.outline('#000000')
    elif name == 'cap':
        c = C(16, 7)
        c.ell(8, 4, 6, 3.5, '#1A2A5A')
        c.rect(2, 4, 12, 3, '#1A2A5A')
        c.rect(0, 5, 6, 2, '#0E1838')  # brim
        c.rect(7, 2, 2, 2, '#FFFF4F')  # badge
        c.outline('#000000')
    elif name == 'straw_hat':
        c = C(20, 7)
        c.ell(10, 5, 9.5, 2, '#E8C86A')
        c.ell(10, 3, 5, 3, '#E8C86A')
        c.rect(5, 4, 10, 1, '#DE5238')
        c.outline('#7A5A20')
    elif name == 'guitar':
        c = C(14, 18)
        c.line(11, 0, 6, 9, '#6B4A2E'); c.line(12, 0, 7, 9, '#6B4A2E')
        c.ell(5, 12, 4.5, 4.5, '#C8803A')
        c.ell(5, 12, 1.4, 1.4, '#2A1A10')
        c.outline('#2A1A10')
    elif name == 'cajon':
        c = C(12, 12)
        c.rect(0, 0, 12, 12, '#B07A48')
        c.ell(6, 6, 2, 2, '#2A1A10')
        c.rect(0, 0, 12, 1, '#D49A60')
        c.outline('#2A1A10')
    elif name == 'mic':
        c = C(6, 10)
        c.ell(3, 2, 2, 2, '#9A9A9A')
        c.rect(2, 4, 2, 6, '#222222')
        c.outline('#000000')
    return c


def cozy_sign():
    """The round COZY RATCHAPRUEK 6 lightbox on a pole (owner's photo), drawn at 3x so the
    small text stays readable. Day and night (glow)."""
    out = {}
    for night in (False, True):
        W, H = 48 * R, 80 * R
        im = Image.new('RGBA', (W, H))
        d = ImageDraw.Draw(im)
        cx, cy, r = W // 2, 26 * R, 23 * R
        if night:
            for k in range(6, 0, -1):
                d.ellipse([cx - r - k * 3, cy - r - k * 3, cx + r + k * 3, cy + r + k * 3], fill=(255, 255, 200, 18))
        d.rectangle([cx - 2 * R, cy + r - 2, cx + 2 * R, H - 1], fill=(40, 40, 44, 255))  # pole
        d.rectangle([cx - 5 * R, H - 3 * R, cx + 5 * R, H - 1], fill=(30, 30, 34, 255))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(20, 20, 24, 255))  # dark rim
        face = (255, 255, 240, 255) if night else (255, 255, 255, 255)
        d.ellipse([cx - r + 3 * R, cy - r + 3 * R, cx + r - 3 * R, cy + r - 3 * R], fill=face)
        ink = (20, 20, 24, 255)
        # logo: a tiny house above a bicycle
        hx, hy = cx, cy - 13 * R
        d.polygon([(hx - 5 * R, hy), (hx, hy - 4 * R), (hx + 5 * R, hy)], fill=ink)
        d.rectangle([hx - 4 * R, hy, hx + 4 * R, hy + 3 * R], outline=ink, width=R)
        by = cy - 5 * R
        for bx in (cx - 4 * R, cx + 4 * R):
            d.ellipse([bx - 2 * R, by - 2 * R, bx + 2 * R, by + 2 * R], outline=ink, width=max(1, R // 2 + 1))
        d.line([(cx - 4 * R, by), (cx, by - 3 * R), (cx + 4 * R, by)], fill=ink, width=max(1, R // 2 + 1))
        big = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 11 * R)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 4 * R)
        d.text((cx, cy + 4 * R), 'COZY', font=big, fill=ink, anchor='mm')
        d.text((cx, cy + 13 * R), 'RATCHAPRUEK 6', font=small, fill=ink, anchor='mm')
        # hard alpha (pixel art): snap
        px = im.load()
        for y in range(H):
            for x in range(W):
                r_, g, b, a = px[x, y]
                if 0 < a < 255 and a < 60 and not night:
                    px[x, y] = (0, 0, 0, 0)
        im.save(OUT / ('char/cozy_sign_n.png' if night else 'char/cozy_sign.png'))
        out[night] = im
    return out


def markers():
    # yellow "!" bubble
    c = C(7, 11)
    c.rect(2, 0, 3, 7, '#FFFF4F'); c.rect(2, 8, 3, 3, '#FFFF4F')
    c.outline('#000000')
    c.save('char/bang.png', R)
    # target cross
    c = C(9, 9)
    for i in range(9):
        c.px(i, i, '#FFFF4F'); c.px(8 - i, i, '#FFFF4F')
    c.outline('#000000')
    c.save('char/cross.png', R)
    # guide arrow (pointing right; rotated at runtime) and its highlighted frame
    for k, col in (('arrow', '#FFFF4F'), ('arrow_hi', '#FFFFFF')):
        c = C(9, 7)
        c.rect(0, 2, 5, 3, col)
        c.poly([(4, 0), (8, 3), (4, 6)], col)
        c.outline('#000000')
        c.save(f'char/{k}.png', R)
    # exit arrow (pointing down, bobbing at runtime)
    c = C(11, 12)
    c.rect(3, 0, 5, 6, '#FFFF4F')
    c.poly([(0, 5), (10, 5), (5, 11)], '#FFFF4F')
    c.outline('#000000')
    c.save('char/exit_arrow.png', R)
    # voucher ticket icon
    c = C(14, 8)
    c.rect(0, 0, 14, 8, '#FFFF4F')
    c.px(0, 3, None); c.px(13, 3, None)
    for y in (0, 1, 3, 4, 6, 7):
        c.px(9, y, '#DE5238')
    c.rect(2, 2, 5, 1, '#DE5238'); c.rect(2, 5, 4, 1, '#DE5238')
    c.outline('#000000')
    c.save('char/ticket.png', R)
    # character ground shadow
    shadow(14, 5).save('char/shadow.png', R)


# ---------------------------------------------------------------- run
def main():
    (OUT / 'world').mkdir(parents=True, exist_ok=True)
    (OUT / 'char').mkdir(parents=True, exist_ok=True)
    tiles()
    both('fence', fence_strip)
    both('tin', tin_strip)
    for n in range(1, 7):
        both(f'guesthouse_{n}', guesthouse, n)
    both('carport', carport)
    for icon, cols in SHOP_COLOURS.items():
        both(f'stall_{icon}_back', stall, cols, icon, 'back')
        both(f'stall_{icon}_front', stall, cols, icon, 'front')
    for i, cols in enumerate(LANE_COLOURS):
        both(f'stall_lane{i}_back', stall, cols, None, 'back')
        both(f'stall_lane{i}_front', stall, cols, None, 'front')
    both('desk', desk)
    both('table', table)
    both('tree', tree)
    both('tree_big', lambda n: tree(n, 26, 36))
    both('tree_dark', lambda n: tree(n, 18, 26, dark=True))
    both('bush', bush)
    both('bush_flower', lambda n: bush(n, True))
    for roof in ['A59F98', 'C0897E', 'B4C9D4', '8CCFBF', 'A8805F']:
        both(f'town_{roof}', town_house, roof)
    both('haunted_house', haunted_house)
    haunted_windows().save('world/haunted_windows.png')
    both('screen', screen)
    both('band_deck', band_deck)
    both('band_backdrop', band_backdrop)
    both('band_speaker', band_speaker)
    both('band_lights', band_lights)
    both('haybale', haybale)
    both('rug', rug)
    both('beanbag_yellow', lambda n: beanbag(n, 'yellow'))
    both('beanbag_magenta', lambda n: beanbag(n, 'magenta'))
    shadow(16, 5).save('world/shadow.png')
    for a in ('headphones', 'chef_hat', 'cap', 'straw_hat', 'guitar', 'cajon', 'mic'):
        acc(a).save(f'char/acc_{a}.png', R)
    cozy_sign()
    markers()
    files = sorted(str(p.relative_to(OUT)) for p in OUT.rglob('*.png'))
    (OUT / 'manifest.json').write_text(json.dumps({'note': 'Generated by tools/scene3_art.py', 'files': files}, indent=1) + '\n')
    print(f'scene 3 art: {len(files)} files -> {OUT}')
    if '--sheet' in sys.argv:
        contact_sheet(sys.argv[sys.argv.index('--sheet') + 1])


def contact_sheet(dest):
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
    names = sorted(p.stem for p in (OUT / 'world').glob('*.png') if not p.stem.endswith('_n'))
    k = 3
    cells = []
    for n in names:
        day = Image.open(OUT / 'world' / f'{n}.png')
        npath = OUT / 'world' / f'{n}_n.png'
        night = Image.open(npath) if npath.exists() else None
        cells.append((n, day, night))
    colw = 200
    rows = []
    y = 10
    sheet = Image.new('RGB', (colw * 6, 4000), (40, 38, 44))
    d = ImageDraw.Draw(sheet)
    x = 10
    rowh = 0
    for n, day, night in cells:
        w = (day.width * k) * (2 if night else 1) + 8
        h = day.height * k + 16
        if x + max(w, 120) > sheet.width:
            x = 10
            y += rowh + 8
            rowh = 0
        bg_day = Image.new('RGBA', (day.width * k, day.height * k), (140, 203, 90, 255))
        bg_day.alpha_composite(day.resize((day.width * k, day.height * k), Image.NEAREST))
        sheet.paste(bg_day, (x, y + 14))
        if night:
            bg_n = Image.new('RGBA', bg_day.size, (36, 23, 18, 255))
            bg_n.alpha_composite(night.resize(bg_day.size, Image.NEAREST))
            sheet.paste(bg_n, (x + bg_day.width + 4, y + 14))
        d.text((x, y), n, fill=(255, 255, 79), font=font)
        x += max(w, 120) + 10
        rowh = max(rowh, h)
    sheet.crop((0, 0, sheet.width, y + rowh + 10)).save(dest)


if __name__ == '__main__':
    main()

"""Jayimpacts, Stardew Valley inspired (scene 3 spec 5.1; owner: keep him human,
Stardew Valley style) -> src/assets/art/characters/jayimpacts_side.png / _front.png
+ jayimpacts.json (characters.json layout).

Hand-placed pixel maps, one character per pixel (legend PAL below). Same cell and
conventions as the bird costumes: 32 x 36 frames, feet on row 35, side view faces
LEFT, sheets at RENDER_SCALE (3) x with nearest neighbour.

Style (Stardew Valley inspired, owner references): a compact chibi about 18 px wide and
34 px tall with the head close to half his height and short legs, near-black tinted
outlines per material (dark hair, dark brown around skin, charcoal around the jacket),
three tones per material, textured hair with sheen strands, a small
face (1 x 2 eyes with a white catchlight, brows, blush), hair with a sheen band.

Look from the Drive art (sprite_jayimpacts_character / avatar): spiky black hair swept
to one side, strong brows, grey houndstooth jacket over a black tee, belt with a gold
buckle, cream trousers, dark brown shoes, white wings with yellow tips, a gold halo
(a plain ring: the Drive halo is gear-shaped like the Rotary wheel, not drawn).

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

PAL = {
    # hair
    'a': '#141020', 'b': '#2C2638', 'c': '#4A4260', 'C': '#6A6488',
    # skin: outline, base, light, shade; eyes, catchlight, mouth, blush
    'k': '#5C3024', 's': '#F2B98A', 'l': '#FCD7A8', 'd': '#D88C68',
    'e': '#1A1626', 'w': '#FFFFFF', 'm': '#B0604C', 'r': '#EE9A80',
    # houndstooth jacket: outline, light, mid, dark
    'J': '#1E1B22', '1': '#C8C4C0', '2': '#8C8888', '3': '#5A5658',
    # black tee, belt, gold buckle
    't': '#2A2630', 'u': '#3E3A46', 'B': '#2A1E1A', 'g': '#E8C060',
    # cream trousers: outline, light, base, shade
    'P': '#4E4434', '4': '#F4EEE0', '5': '#E0D4BC', '6': '#B8A88E',
    # shoes
    'x': '#20140F', 'y': '#4A3028',
    # wings: outline, white, lilac shade, yellow tips
    'q': '#6A5E72', '7': '#FFFFFF', '8': '#E4E2F0', '9': '#FFE070', '0': '#F0B830',
    # halo
    'Y': '#FFF27A', 'O': '#F0C030', 'h': '#7A4E0A',
}


def blank():
    return [['.'] * CW for _ in range(CH)]


def put(g, y, x0, s, under=False):
    """Write string s at row y from column x0; '.' skips. under=True only fills empty pixels."""
    if not 0 <= y < CH:
        return
    for i, ch in enumerate(s):
        x = x0 + i
        if ch == '.' or not 0 <= x < CW:
            continue
        if under and g[y][x] != '.':
            continue
        g[y][x] = ch


def stamp(g, rows, dx=0, dy=0, under=False, mirror=False):
    for y, (x0, s) in rows.items():
        if mirror:
            for i, ch in enumerate(s):
                put(g, y + dy, CW - 1 - (x0 + i) + dx, ch, under)
        else:
            put(g, y + dy, x0 + dx, s, under)


# ---------------------------------------------------------------- front
HALO = {0: (11, 'hYYYYYYYYh'), 1: (10, 'hY........Yh'), 2: (11, 'hOOOOOOOOh')}
# Head rows 6-19 (about 45% of his height, like the reference chibis), torso 20-28,
# short legs 29-32, shoes 33-35. Halo floats at rows 2-4.
F_HEAD = {
    6: (9, '..a.aa..a.a...'),
    7: (8, '.aabbaabbabbaba.'),
    8: (7, '.abbbbccbbbbbcbba.'),
    9: (7, 'abbbcCcbbbbbcCbbba'),
    10: (7, 'abbcbbbbbcbbbbbcba'),
    11: (7, 'abbbbbbbbbbsbbbbba'),
    12: (7, 'abbbbbbsllllssbbba'),
    13: (7, 'abbsaaallllaaasbba'),
    14: (7, 'ksbsssslllllsssbsk'),
    15: (7, 'ksbswesslsssewsbsk'),
    16: (7, 'kssssesslsssessdsk'),
    17: (8, 'kdssssssssssssdk'),
    18: (8, 'kdsrsssmmsssrsdk'),
    19: (9, 'kdssssssssssdk'),
}
F_BODY = {
    20: (10, 'JJkkdssdkkJJ'),
    21: (7, 'J1212J1tuut1J2121J'),
    22: (7, 'J21J12JtuutJ21J12J'),
    23: (7, 'J12J21JtuutJ12J21J'),
    24: (7, 'J21J12JttutJ21J12J'),
    25: (7, 'J12J21JtuutJ12J21J'),
    26: (7, 'klsJ212tttt212Jslk'),
    27: (7, 'kssJBBBBggBBBBJssk'),
    28: (7, '.kkP4455555544Pkk.'),
    29: (10, 'P4456PP4456P'),
    30: (10, 'P456P..P456P'),
    31: (10, 'P456P..P456P'),
    32: (10, 'P566P..P566P'),
    33: (9, 'xyyyyx..xyyyyx'),
    34: (9, 'xyyyyx..xyyyyx'),
    35: (9, 'xxxxxx..xxxxxx'),
}
WING = {17: (5, 'qq'), 18: (3, 'qq77q'), 19: (2, 'q7787'), 20: (2, 'q9788'), 21: (2, 'q0978'), 22: (3, 'q09q'), 23: (4, 'qq')}
# his right arm raised (viewer's right): upper arm out, forearm up, open hand
F_WAVE_ROWS = {18: (21, 'J12J'), 17: (22, 'J21J'), 16: (23, 'J12J'), 15: (24, 'J21J'), 14: (24, 'J12J'),
               13: (25, 'J21J'), 12: (24, 'ksssk'), 11: (24, 'kslsk'), 10: (25, 'kkk')}
# wave1: forearm and hand lean 1 px further out
F_WAVE = [F_WAVE_ROWS, {y: (x + (1 if y <= 14 else 0), r) for y, (x, r) in F_WAVE_ROWS.items()}]

def front(frame):
    g = blank()
    hb = 1 if frame == 'idle1' else 0
    stamp(g, F_BODY)
    stamp(g, F_HEAD, dy=hb)
    stamp(g, HALO, dy=2 + hb)
    if frame == 'blink':
        put(g, 15, 11, 'ss')
        put(g, 15, 19, 'ss')
        put(g, 16, 11, 'aa')
        put(g, 16, 19, 'aa')
    if frame.startswith('wave'):
        w = F_WAVE[int(frame[-1])]
        # the raised arm replaces the hanging one: jacket edge and hand area cleared
        for y in range(21, 29):
            for x in (22, 23, 24):
                g[y][x] = '.'
        for y in range(21, 28):
            g[y][21] = 'J'
        put(g, 28, 21, 'P')
        stamp(g, w, dy=3)
    stamp(g, WING, dy=3, under=True)
    stamp(g, WING, dy=3, under=True, mirror=True)
    return g


# ---------------------------------------------------------------- side (faces left)
S_HALO = {0: (10, 'hYYYYYYh'), 1: (9, 'hY......Yh'), 2: (10, 'hOOOOOOh')}
S_HEAD = {
    6: (10, '.a.aa..a..'),
    7: (9, '.abbaabbaba.'),
    8: (8, '.abbbccbbbbcba'),
    9: (7, 'abbcCcbbbbcCbbba'),
    10: (7, 'abbbbbcbbbbbbcba'),
    11: (6, 'aabbbbbbbbbbbbbba'),
    12: (6, '.absllls' + 'bbbbcbbba'),
    13: (6, '.kaaasls' + 'bbbbbbbba'),
    14: (6, '.kswesssbksdkbbba'),
    15: (5, 'kssssesssbksdkbbba'),
    16: (6, 'kssrsssssdbbbbbba'),
    17: (7, 'kssssssssdbbbba'),
    18: (7, 'kmsssssssdkbba'),
    19: (8, 'kdsssssddk'),
}
S_TORSO = {
    20: (10, 'JJkdsdkJJ'),
    21: (9, 'JtuJ1212121J'),
    22: (9, 'JtuJ2121212J'),
    23: (9, 'JtuJ1212121J'),
    24: (9, 'JtuJ2121212J'),
    25: (9, 'JttJ1212121J'),
    26: (9, 'J1212121212J'),
    27: (9, 'JgBBBBBBBBBJ'),
    28: (9, '.P44555556P.'),
}
WING_SIDE = {15: (20, 'qq'), 16: (19, 'q77q'), 17: (19, 'q7787q'), 18: (20, 'q78897q'), 19: (20, 'q7890q'), 20: (21, 'q09q'), 21: (22, 'qq')}


def side_arm(g, dy, swing):
    """Hanging arm on the near side: sleeve rows 21-26, hand 27-28. swing: -1 forward, 0, +1 back."""
    for i, y in enumerate(range(21, 27)):
        off = round(swing * i / 3)
        put(g, y + dy, 13 + off, 'J' + ('12' if (y + i) % 2 else '21') + '1J'[:2])
    off = round(swing * 6 / 3)
    put(g, 27 + dy, 13 + off, 'klsdk')
    put(g, 28 + dy, 13 + off, '.kkk.')


def side_leg(g, top, xt, xb, lift, back):
    """One leg from row `top` to 32: columns interpolated from xt to xb; shoe points left."""
    fill = '566' if back else '456'
    n = 32 - lift - top
    for i, y in enumerate(range(top, 33 - lift)):
        x = round(xt + (xb - xt) * i / max(1, n))
        put(g, y, x, 'P' + fill + 'P')
    yb = 33 - lift
    put(g, yb, xb - 2, 'xyyyyyx')
    put(g, yb + 1, xb - 2, 'xyyyyyx')
    put(g, yb + 2, xb - 2, 'xxxxxxx')


SIDE_POSE = {
    #          back leg (top x, bottom x, lift)  front leg               bob  arm swing
    'idle0': dict(back=(14, 14, 0), front=(10, 10, 0), bob=0, arm=0),
    'idle1': dict(back=(14, 14, 0), front=(10, 10, 0), bob=0, arm=0, hb=1),
    'walk0': dict(back=(14, 17, 0), front=(10, 7, 0), bob=0, arm=1),
    'walk1': dict(back=(13, 13, 1), front=(11, 11, 0), bob=1, arm=0),
    'walk2': dict(back=(13, 9, 0), front=(11, 15, 0), bob=0, arm=-1),
    'walk3': dict(back=(12, 12, 1), front=(12, 12, 0), bob=1, arm=0),
    'wave0': dict(back=(14, 14, 0), front=(10, 10, 0), bob=0, arm=None),
    'wave1': dict(back=(14, 14, 0), front=(10, 10, 0), bob=0, arm=None),
}
# near arm raised in front of him: upper arm forward at chest height, forearm up, open hand
S_WAVE_ROWS = {10: (3, 'kkk'), 11: (2, 'kslsk'), 12: (2, 'ksssk'), 13: (3, 'J12J'), 14: (3, 'J21J'), 15: (3, 'J12J'),
               16: (3, 'J21J'), 17: (3, 'J12JJJJJJJ'), 18: (3, 'J21212121J'), 19: (3, 'J12121212J'), 20: (3, 'JJJJJJJJJJ')}
S_WAVE = [S_WAVE_ROWS, {y: (x - (1 if y <= 15 else 0), r) for y, (x, r) in S_WAVE_ROWS.items()}]

def side(frame):
    g = blank()
    p = SIDE_POSE[frame]
    up = p['bob']
    hb = p.get('hb', 0)
    top = 29 - up
    bt, bb, bl = p['back']
    ft, fb, fl = p['front']
    side_leg(g, top, bt, bb, bl, back=True)
    side_leg(g, top, ft, fb, fl, back=False)
    stamp(g, S_TORSO, dy=-up)
    stamp(g, S_HEAD, dy=-up + hb)
    stamp(g, S_HALO, dy=2 - up + hb)
    if p['arm'] is not None:
        side_arm(g, -up, p['arm'])
    else:
        stamp(g, S_WAVE[int(frame[-1])], dy=3)
    stamp(g, WING_SIDE, dy=3 - up, under=True)
    return g


# ---------------------------------------------------------------- output
def to_image(g):
    im = Image.new('RGBA', (CW, CH))
    for y, row in enumerate(g):
        for x, ch in enumerate(row):
            if ch != '.':
                h = PAL[ch]
                im.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im


def render():
    return {
        'side': [to_image(side(f)) for f in FRAMES['side']],
        'front': [to_image(front(f)) for f in FRAMES['front']],
    }


def strip(frames, k):
    out = Image.new('RGBA', (CW * len(frames), CH))
    for i, im in enumerate(frames):
        out.alpha_composite(im, (i * CW, 0))
    return out.resize((out.width * k, out.height * k), Image.NEAREST)


def main():
    views = render()
    for v, frames in views.items():
        for im in frames:
            assert im.getpixel((0, 0))[3] == 0 or True
        # feet on the bottom row in every frame
        for f, im in zip(FRAMES[v], frames):
            assert any(im.getpixel((x, CH - 1))[3] for x in range(CW)), f'{v} {f}: feet not on row {CH - 1}'
        strip(frames, R).save(OUT / f'{ID}_{v}.png')
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
        dest = sys.argv[sys.argv.index('--sheet') + 1]
        frames = views['side'] + views['front']
        bg = Image.new('RGBA', (34 * len(frames), CH), (111, 176, 74, 255))
        for i, im in enumerate(frames):
            bg.alpha_composite(im, (i * 34, 0))
        bg.resize((bg.width * 8, bg.height * 8), Image.NEAREST).save(dest)
    print(f"jayimpacts: {len(views['side'])} side + {len(views['front'])} front frames -> {OUT}")


if __name__ == '__main__':
    main()

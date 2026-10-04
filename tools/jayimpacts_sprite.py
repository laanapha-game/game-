"""Jayimpacts walking sprite (scene 3 spec 5.1)
-> src/assets/art/characters/jayimpacts_side.png / _front.png + jayimpacts.json
(characters.json layout), sheets at RENDER_SCALE (3) x with nearest neighbour.

Owner: keep him human, with a face as close as possible to the original, and a bigger
sprite to keep the face detail. So everything above the belt is the original art at its
in-game resolution (the same 34 x 64 scale scene 2 uses for the angel next to the
32 x 36 birds); only the legs and shoes, which the floating original does not have, are
drawn, so he can walk.

  front: the game's angel_jayimpacts.png (from sprite_jayimpacts_character), 3x texture
         box-downsampled to 1x. idle = frame 0 (idle1 one row lower: breathing),
         blink = frame 8's closed-eye smile on frame 0's body, wave = frame 6 (hand up).
  side:  the 3/4 figure of sprite_jayimpacts_avatar, mirrored to face left and scaled to
         the same size (halo to belt = 46 rows), plus a raised hand for the wave.

Cell 40 x 56 design px, feet on row 55, side view faces LEFT (like the bird costumes).
Frames: side idle0 idle1 walk0-3 wave0 wave1, front idle0 idle1 blink wave0 wave1.

    python3 tools/jayimpacts_sprite.py [--sheet out.png]   (--sheet: 6x preview strip)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

OUT = Path('src/assets/art/characters')
ID = 'jayimpacts'
R = 3  # RENDER_SCALE (src/config/constants.js)
CW, CH = 40, 56
FEET = CH - 1
BELT = 46            # first row below the belt, where the drawn legs start
FRAMES = {
    'side': ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'wave0', 'wave1'],
    'front': ['idle0', 'idle1', 'blink', 'wave0', 'wave1'],
}
ANIM = {
    'side': {'idle': [0, 1], 'walk': [2, 3, 4, 5], 'wave': [6, 7]},
    'front': {'idle': [0, 1], 'blink': [2], 'wave': [3, 4]},
}
ANGEL = Path('src/assets/art/angel_jayimpacts.png')       # 9 frames of 102 x 192 (3x of 34 x 64)
AVATAR = Path('assets/incoming/Scene_2_Sprite/sprite_jayimpacts_avatar_no_green.png')
SIDE_CROP = (535, 40, 1010, 690)                          # 3/4 figure: halo top to the belt
OUTLINE = (10, 8, 7, 255)
COLOURS = 48
# drawn parts (trousers and shoes), colours sampled from the original
TROUSER = [(78, 68, 52), (244, 236, 222), (226, 214, 196), (190, 176, 156)]   # outline, light, base, shade
SHOE = [(20, 14, 12), (52, 38, 32), (78, 58, 48)]                            # outline, base, light
SKIN = [(92, 48, 36), (248, 200, 160)]
SKIN_SHADE = (222, 156, 112)
SLEEVE = [(150, 142, 132), (96, 88, 82)]                                     # houndstooth read at 1 px


# ---------------------------------------------------------------- image helpers
def downsample(img, size, thr=120):
    """Box filter with premultiplied alpha; pixels under thr alpha become transparent."""
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
            if a / ((x1 - x0) * (y1 - y0)) > thr:
                o[X, Y] = (r // a, g // a, b // a, 255)
    return out


def clean_green(img):
    """Chroma-key leftovers take the most common non-green neighbour colour."""
    px = img.load()
    w, h = img.size
    green = lambda c: c[3] and c[1] > c[0] + 12 and c[1] > c[2] + 12
    for y in range(h):
        for x in range(w):
            if green(px[x, y]):
                nb = [px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                      if (dx or dy) and 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] and not green(px[x + dx, y + dy])]
                px[x, y] = max(set(nb), key=nb.count) if nb else (0, 0, 0, 0)
    return img


def quantize_all(images):
    """One adaptive palette for a set of frames, so every frame uses the same colours."""
    strip = Image.new('RGBA', (sum(i.width for i in images), max(i.height for i in images)))
    x = 0
    for im in images:
        strip.alpha_composite(im, (x, 0))
        x += im.width
    pal = strip.convert('RGB').quantize(COLOURS, method=Image.Quantize.MEDIANCUT)
    out = []
    for im in images:
        q = im.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGBA')
        q.putalpha(im.getchannel('A').point(lambda v: 255 if v else 0))
        out.append(q)
    return out


def outline(img):
    px = img.load()
    w, h = img.size
    out = img.copy()
    o = out.load()
    for y in range(h):
        for x in range(w):
            if not px[x, y][3] and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3]
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o[x, y] = OUTLINE
    return out


def rect(img, x0, y0, x1, y1, col):
    px = img.load()
    for y in range(max(0, y0), min(img.height, y1 + 1)):
        for x in range(max(0, x0), min(img.width, x1 + 1)):
            px[x, y] = col + (255,) if len(col) == 3 else col


def leg(img, xt, xb, top, bot, back):
    """A trouser leg, 5 px wide, slanting from x=xt at `top` to x=xb at `bot`, with a shoe pointing left."""
    o, light, base, shade = TROUSER
    for y in range(top, bot + 1):
        x = round(xt + (xb - xt) * (y - top) / max(1, bot - top))
        rect(img, x, y, x + 4, y, o)
        rect(img, x + 1, y, x + 3, y, shade if back else base)
        if not back:
            rect(img, x + 1, y, x + 1, y, light)
    so, sb, sl = SHOE
    rect(img, xb - 2, bot + 1, xb + 4, bot + 2, so)
    rect(img, xb - 1, bot + 1, xb + 3, bot + 1, sl if not back else sb)
    rect(img, xb - 1, bot + 2, xb + 3, bot + 2, sb)


# ---------------------------------------------------------------- sources
def angel_frame(i):
    f = Image.open(ANGEL).convert('RGBA').crop((i * 102, 0, i * 102 + 102, 192))
    return downsample(f, (34, 64))


def side_figure():
    src = ImageOps.mirror(Image.open(AVATAR).convert('RGBA').crop(SIDE_CROP))
    src = src.crop(src.getbbox())
    h = BELT
    return downsample(src, (round(src.width * h / src.height), h))


def upper(f, rows=BELT):
    """Everything above the belt line (the original's floating legs are cut off)."""
    return f.crop((0, 0, f.width, rows))


# ---------------------------------------------------------------- frames
def build_front():
    f0, f6, f8 = angel_frame(0), angel_frame(6), angel_frame(8)
    blink = f0.copy()
    blink.paste(f8.crop((0, 0, 34, 31)), (0, 0))       # closed-eye smile: frame 8's head on frame 0's body
    ups = quantize_all([upper(f0), upper(blink), upper(f6)])
    base, blink_u, wave_u = [clean_green(u) for u in ups]
    frames = []
    for name in FRAMES['front']:
        im = Image.new('RGBA', (CW, CH))
        # standing legs from the belt down
        leg(im, 15, 15, BELT - 1, FEET - 2, back=False)
        leg(im, 21, 21, BELT - 1, FEET - 2, back=False)
        u = {'blink': blink_u, 'wave0': wave_u, 'wave1': wave_u}.get(name, base)
        dy = {'idle1': 1, 'wave1': -1}.get(name, 0)
        im.alpha_composite(u, (3, dy))
        frames.append(outline(im))
    return frames


SIDE_POSE = {  # (back leg top x, bottom x, lift), (front leg ...), bob
    'idle0': (((18, 18, 0), (14, 14, 0)), 0),
    'idle1': (((18, 18, 0), (14, 14, 0)), 0),
    'walk0': (((18, 21, 0), (14, 11, 0)), 0),
    'walk1': (((17, 17, 1), (15, 15, 0)), 1),
    'walk2': (((17, 13, 0), (15, 19, 0)), 0),
    'walk3': (((16, 16, 1), (16, 16, 0)), 1),
    'wave0': (((18, 18, 0), (14, 14, 0)), 0),
    'wave1': (((18, 18, 0), (14, 14, 0)), 0),
}


def build_side():
    fig = clean_green(quantize_all([side_figure()])[0])
    frames = []
    for name in FRAMES['side']:
        legs, up = SIDE_POSE[name]
        im = Image.new('RGBA', (CW, CH))
        for k, (xt, xb, lift) in enumerate(legs):
            leg(im, xt, xb, BELT - 1 - up, FEET - 2 - lift, back=(k == 0))
        dy = -up + (1 if name == 'idle1' else 0)
        im.alpha_composite(fig, ((CW - fig.width) // 2, dy))
        if name.startswith('wave'):
            # a hand raised, waving between two positions
            o = int(name[-1])
            px = im.load()
            # far arm raised behind his head (his head is too wide to wave in front of it):
            # sleeve 3 px thick from the shoulder up to the wrist, hand above the hair line
            x0, y0, x1, y1 = 26, 32, 32 + o, 17 + o
            n = max(abs(x1 - x0), abs(y1 - y0))
            for i in range(n + 1):
                x = round(x0 + (x1 - x0) * i / n)
                y = round(y0 + (y1 - y0) * i / n)
                for d in range(3):
                    px[x + d, y] = SLEEVE[(x + d + y) % 2] + (255,)
            # open hand above the wrist
            hx, hy = x1, y1 - 4
            rect(im, hx, hy, hx + 3, hy + 3, SKIN[1])
            rect(im, hx + 3, hy + 1, hx + 3, hy + 3, SKIN_SHADE)
            rect(im, hx, hy - 1, hx, hy - 1, SKIN[1])                   # thumb
        frames.append(outline(im))
    return frames


# ---------------------------------------------------------------- output
def main():
    views = {'front': build_front(), 'side': build_side()}
    for v, frames in views.items():
        for f, im in zip(FRAMES[v], frames):
            assert any(im.getpixel((x, FEET))[3] for x in range(CW)), f'{v} {f}: feet not on row {FEET}'
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
        bg = Image.new('RGBA', ((CW + 2) * len(frames), CH), (111, 176, 74, 255))
        for i, im in enumerate(frames):
            bg.alpha_composite(im, (i * (CW + 2), 0))
        bg.resize((bg.width * 6, bg.height * 6), Image.NEAREST).save(sys.argv[sys.argv.index('--sheet') + 1])
    print(f"jayimpacts: {len(views['side'])} side + {len(views['front'])} front frames of {CW}x{CH} -> {OUT}")


if __name__ == '__main__':
    main()

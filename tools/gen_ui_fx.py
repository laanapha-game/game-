#!/usr/bin/env python3
"""Generates the small UI and FX sprites (scene2-spec.md section 9) at 1x
design size in the game palette. Re-runnable. Pillow + numpy only.
Output: assets/ui/*.png (horizontal strips, transparent background).
"""
import os

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui')
C = {
    'k': (0, 0, 0, 255), 'w': (255, 255, 255, 255), 'y': (255, 255, 79, 255), 'r': (222, 82, 56, 255),
    'm': (240, 45, 240, 255), 'd': (143, 47, 32, 255), 'dd': (74, 26, 20, 255), 'b': (0, 0, 255, 255),
    'l': (200, 190, 255, 255),
}


def canvas(w, h):
    return np.zeros((h, w, 4), np.uint8)


def px(a, x, y, c):
    if 0 <= x < a.shape[1] and 0 <= y < a.shape[0]:
        a[y, x] = C[c]


def rect(a, x, y, w, h, c):
    a[max(0, y):y + h, max(0, x):x + w] = C[c]


def frame(a, x, y, w, h, c):
    rect(a, x, y, w, 1, c)
    rect(a, x, y + h - 1, w, 1, c)
    rect(a, x, y, 1, h, c)
    rect(a, x + w - 1, y, 1, h, c)


def pattern(a, rows, ox=0, oy=0):
    """rows of chars, '.' transparent, others are palette keys (1 char)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                px(a, ox + i, oy + j, ch)


def strip(frames):
    return np.concatenate(frames, axis=1)


def save(name, a):
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, name))
    print(f'{name}: {a.shape[1]}x{a.shape[0]}')


# ---- 9-slices ---------------------------------------------------------------
def chatbox():
    a = canvas(24, 24)
    rect(a, 0, 0, 24, 24, 'k')
    frame(a, 1, 1, 22, 22, 'w')
    frame(a, 3, 3, 18, 18, 'd')
    for x, y in [(1, 1), (22, 1), (1, 22), (22, 22)]:  # yellow corner studs
        px(a, x, y, 'y')
    for x, y in [(0, 0), (23, 0), (0, 23), (23, 23)]:  # rounded outer corners
        a[y, x] = 0
    return a


def nametag():
    a = canvas(24, 16)
    rect(a, 0, 0, 24, 16, 'k')
    rect(a, 1, 1, 22, 14, 'm')
    rect(a, 2, 2, 20, 1, 'w')  # highlight
    for x, y in [(0, 0), (23, 0), (0, 15), (23, 15)]:
        a[y, x] = 0
    return a


def choice_button():
    frames = []
    for fill, border, line in [('k', 'y', 'r'), ('r', 'y', 'y')]:  # normal, pressed
        a = canvas(24, 16)
        rect(a, 0, 0, 24, 16, fill)
        frame(a, 0, 0, 24, 16, border)
        frame(a, 2, 2, 20, 12, line)
        for x, y in [(0, 0), (23, 0), (0, 15), (23, 15)]:
            a[y, x] = 0
        frames.append(a)
    return strip(frames)


# ---- small UI -----------------------------------------------------------------
ARROW = ['.yyyyyy.', '..yyyy..', '...yy...']


def arrow():
    frames = []
    for dy in (1, 3):
        a = canvas(8, 8)
        pattern(a, ['kkkkkkkk', 'k' + ARROW[0][1:-1] + 'k', '.k' + ARROW[1][2:-2] + 'k.', '..kyyk..', '...kk...'], 0, dy - 1)
        frames.append(a)
    return strip(frames)


FONT = {  # 3x5 pixel letters
    'T': ['www', '.w.', '.w.', '.w.', '.w.'],
    'A': ['.w.', 'w.w', 'www', 'w.w', 'w.w'],
    'P': ['ww.', 'w.w', 'ww.', 'w..', 'w..'],
    '!': ['w', 'w', 'w', '.', 'w'],
}


def text(a, s, x, y, scale=2):
    for ch in s:
        g = FONT[ch]
        for j, row in enumerate(g):
            for i, c in enumerate(row):
                if c != '.':
                    rect(a, x + i * scale, y + j * scale, scale, scale, 'w')
        x += (len(g[0]) + 1) * scale


def tap_button():
    frames = []
    for pressed in (False, True):
        a = canvas(48, 24)
        top = 2 if pressed else 0
        body = 'd' if pressed else 'r'
        rect(a, 1, top, 46, 22, 'k')
        rect(a, 2, top + 1, 44, 20, body)
        rect(a, 3, top + 2, 42, 1, 'y')  # highlight
        if not pressed:
            rect(a, 2, 22, 44, 2, 'dd')  # button depth
        text(a, 'TAP!', 11, top + 6)
        frames.append(a)
    return strip(frames)


def meter_frame():
    a = canvas(120, 10)
    frame(a, 0, 0, 120, 10, 'k')
    frame(a, 1, 1, 118, 8, 'w')
    return a


def meter_fill():
    a = canvas(120, 10)
    rect(a, 2, 2, 116, 3, 'y')
    rect(a, 2, 5, 116, 3, 'r')
    for x in range(4, 116, 8):  # sheen ticks
        px(a, x, 2, 'w')
    return a


def timer_frame():
    a = canvas(120, 8)
    frame(a, 0, 0, 120, 8, 'w')
    return a


def icon_chaser():
    a = canvas(12, 12)
    pattern(a, [
        '...kkkkk....',
        '..kllllwk...',
        '.klllllllk..',
        '.klkklkkllk.',
        '.klkklkklk..',
        '.kllllllllk.',
        '.kllkmmklk..',
        'kllllkklllk.',
        'klllllllllk.',
        'kllllllllk..',
        '.klklklkk...',
        '..k.k.k.....',
    ])
    return a


# ---- FX ------------------------------------------------------------------------
def sparkle():
    frames = []
    for r in (1, 2, 3):
        a = canvas(8, 8)
        for i in range(-r, r + 1):
            px(a, 4 + i, 4, 'y')
            px(a, 4, 4 + i, 'y')
        px(a, 4, 4, 'w')
        if r == 3:
            for d in (-1, 1):
                px(a, 4 + d, 4 + d, 'w')
                px(a, 4 + d, 4 - d, 'w')
        frames.append(a)
    return strip(frames)


def splat():
    frames = []
    for r in (3, 5, 7):
        a = canvas(16, 16)
        yy, xx = np.mgrid[0:16, 0:16]
        blob = (xx - 8) ** 2 + (yy - 8) ** 2 <= r * r
        a[blob] = C['m']
        for ang in range(0, 360, 45):  # droplets
            t = np.radians(ang + r * 7)
            dx, dy = int(round(np.cos(t) * (r + 1))), int(round(np.sin(t) * (r + 1)))
            px(a, 8 + dx, 8 + dy, 'm')
        a[(xx - 7) ** 2 + (yy - 7) ** 2 <= max(1, r // 3) ** 2] = C['w']
        frames.append(a)
    return strip(frames)


def sweat():
    frames = []
    for dy in (0, 2):
        a = canvas(8, 8)
        pattern(a, ['...b....', '..bwb...', '.bwwwb..', '.bwwwb..', '..bbb...'], 1, dy)
        frames.append(a)
    return strip(frames)


def tap_ripple():
    frames = []
    yy, xx = np.mgrid[0:16, 0:16]
    d = np.sqrt((xx - 7.5) ** 2 + (yy - 7.5) ** 2)
    for r, c in [(2, 'w'), (4, 'y'), (6, 'y'), (7, 'm')]:
        a = canvas(16, 16)
        a[(d >= r - 0.5) & (d < r + 0.5)] = C[c]
        frames.append(a)
    return strip(frames)


def dust():
    frames = []
    for n, pts in enumerate([[(3, 4), (4, 4), (4, 3), (3, 5), (5, 5)], [(2, 4), (5, 3), (3, 6), (6, 5)], [(1, 3), (6, 2), (5, 6)]]):
        a = canvas(8, 8)
        for x, y in pts:
            px(a, x, y, 'w' if n < 2 else 'l')
        frames.append(a)
    return strip(frames)


# ---- sound buttons (scene 2, top corners) -------------------------------------
# The speaker copies scene 1's speaker icon pixel for pixel (drawSpeaker in
# assets/incoming/scene1/): yellow body, black shadow 1 px down-right, yellow
# waves when on, a magenta x when off. 12x10, frames: on, off.
SPK_BODY = [(0, 2), (1, 2), (2, 2), (0, 3), (1, 3), (2, 3), (0, 4), (1, 4), (2, 4), (3, 1), (3, 2), (3, 3), (3, 4), (3, 5),
            (4, 0), (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6)]
SPK_ON = [(6, 2), (6, 3), (6, 4), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5)]
SPK_OFF = [(6, 2), (8, 2), (7, 3), (6, 4), (8, 4)]


def sound_icon():
    frames = []
    for wave, wc in ((SPK_ON, 'y'), (SPK_OFF, 'm')):
        a = canvas(12, 10)
        for x, y in SPK_BODY + wave:
            px(a, x + 2, y + 2, 'k')
        for x, y in SPK_BODY:
            px(a, x + 1, y + 1, 'y')
        for x, y in wave:
            px(a, x + 1, y + 1, wc)
        frames.append(a)
    return strip(frames)


# Music note (two beamed eighths) in the same style. 12x10, frames: on, off
# (dark note with a magenta slash).
NOTE = ['..yyyyyy', '..y....y', '..y....y', '..y....y', 'yyy..yyy', 'yyy..yyy']


def music_icon():
    frames = []
    for col in ('y', 'd'):
        a = canvas(12, 10)
        for j, row in enumerate(NOTE):
            for i, ch in enumerate(row):
                if ch != '.':
                    px(a, i + 3, j + 3, 'k')
        for j, row in enumerate(NOTE):
            for i, ch in enumerate(row):
                if ch != '.':
                    px(a, i + 2, j + 2, col)
        if col == 'd':
            for i in range(9):
                px(a, 1 + i, 8 - i, 'm')
        frames.append(a)
    return strip(frames)


def main():
    save('chatbox_9slice.png', chatbox())
    save('nametag_9slice.png', nametag())
    save('choice_button_9slice.png', choice_button())
    save('ui_arrow.png', arrow())
    save('ui_tap_button.png', tap_button())
    save('ui_meter_frame.png', meter_frame())
    save('ui_meter_fill.png', meter_fill())
    save('ui_timer_frame.png', timer_frame())
    save('icon_chaser.png', icon_chaser())
    save('fx_sparkle.png', sparkle())
    save('fx_splat.png', splat())
    save('fx_sweat.png', sweat())
    save('fx_tap_ripple.png', tap_ripple())
    save('fx_dust.png', dust())
    save('ui_sound.png', sound_icon())
    save('ui_music.png', music_icon())


if __name__ == '__main__':
    main()


# ---- atmosphere (added) ----------------------------------------------------------
def vignette():
    """180x320 black gradient: solid black at the top and bottom edges, fading to
    clear so the centre third of the screen (y 107-213) keeps normal lighting.
    Stepped alpha in 2 px bands keeps it pixel-art."""
    a = canvas(180, 320)
    clear0, clear1 = 320 // 3, 320 - 320 // 3  # 106..214
    for y in range(320):
        band = y // 2 * 2
        if band < clear0:
            t = 1 - band / clear0
        elif band >= clear1:
            t = (band - clear1 + 2) / (320 - clear1)
        else:
            t = 0
        a[y, :, 3] = int(round(min(1, t) ** 1.3 * 255))
    return a


def fog():
    """180x48 tileable fog: soft blocky wisps, white at low alpha."""
    a = canvas(180, 48)
    yy, xx = np.mgrid[0:48, 0:180]
    rng = np.random.default_rng(7)
    field = np.zeros((48, 180))
    for _ in range(14):
        cx, cy = rng.uniform(0, 180), rng.uniform(14, 34)
        rx, ry = rng.uniform(18, 40), rng.uniform(5, 9)
        for shift in (-180, 0, 180):  # wrap horizontally
            field += np.exp(-(((xx - cx - shift) / rx) ** 2 + ((yy - cy) / ry) ** 2))
    # Vertical taper so the band has no hard top/bottom edge.
    field = np.clip(field, 0, 1) * np.sin(np.pi * (yy + 0.5) / 48) ** 2
    level = (np.floor(field * 4) / 4)  # 4 alpha steps
    level = level[::2, ::2].repeat(2, 0).repeat(2, 1)  # 2 px blocks
    a[..., :3] = 255
    a[..., 3] = (level * 70).astype(np.uint8)
    return a


def whiteout():
    """180x320 solid white: the final fade into scene 3 (light path)."""
    a = canvas(180, 320)
    a[...] = C['w']
    return a


save('fx_whiteout.png', whiteout())
save('fx_vignette.png', vignette())
save('fx_fog.png', fog())

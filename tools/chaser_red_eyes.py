#!/usr/bin/env python3
"""Red-eyed chaser for the final sprint (owner request): a copy of
src/assets/art/chaser.png where only the pupils turn red.

A pupil pixel is pinkish (red channel at least 40 above green) and sits in the dark
eye socket: at least half of its 8 neighbours are dark (max channel < 60) or other
pupil candidates, and at least two are dark, and the 9x9 window around it holds a
solid dark socket (SOCKET_MIN_DARK), not just the head's thin outline. The purple face shading that matches
the colour test touches light skin, so it is left alone.
  - pupils become CHASER_RED (bright);
  - the dark socket pixels within SOCKET_PX of a pupil become a deep red (SOCKET_RED,
    scaled by their own brightness), so the eyes read as glowing red at game size
    (a pupil is only about 2 design px).
Everything else is unchanged (checked).

  python3 tools/chaser_red_eyes.py   -> src/assets/art/chaser_red.png
"""
import numpy as np
from PIL import Image

SRC = 'src/assets/art/chaser.png'
OUT = 'src/assets/art/chaser_red.png'
FRAMES = 7
CHASER_RED = np.array([255, 42, 42])  # the chaser's red text colour (constants.js CHASER_TEXT_COLOR)
SOCKET_RED = np.array([150, 8, 8])
SOCKET_PX = 7
SOCKET_MIN_DARK = 45  # dark px in the 9x9 window: eye pupils have 51-62, specks on the outline at most 31

a = np.array(Image.open(SRC).convert('RGBA'))
rgb = a[..., :3].astype(int)
op = a[..., 3] >= 128
dark = op & (rgb.max(axis=2) < 60)
cand = op & (rgb[..., 0] > rgb[..., 1] + 40)


def neighbours(m):
    """Count of 8-neighbours set in m."""
    p = np.pad(m.astype(int), 1)
    h, w = m.shape
    return sum(p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)


def window_count(m, r):
    """Count of set pixels in the (2r+1)^2 window around each pixel."""
    c = np.pad(m.astype(int), r).cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    h, w = m.shape
    k = 2 * r + 1
    return c[k:k + h, k:k + w] - c[:h, k:k + w] - c[k:k + h, :w] + c[:h, :w]


# In a socket (a solid dark blob), not on the head's thin dark outline.
pupil = cand & (neighbours(dark | cand) >= 4) & (neighbours(dark) >= 2) & (window_count(dark, 4) >= SOCKET_MIN_DARK)
# Socket: dark pixels near a pupil (grown SOCKET_PX steps through dark pixels only).
socket = pupil.copy()
for _ in range(SOCKET_PX):
    p = np.pad(socket, 1)
    h, w = socket.shape
    grown = np.zeros_like(socket)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            grown |= p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
    socket = socket | (grown & dark)
socket &= ~pupil
out = a.copy()
out[pupil, :3] = CHASER_RED
ys, xs = np.nonzero(socket)
k = 0.55 + 0.45 * rgb[ys, xs].max(axis=1) / 60  # keep the socket's own shading
out[ys, xs, :3] = np.clip(SOCKET_RED[None, :] * k[:, None], 0, 255).round().astype(np.uint8)
changed = pupil | socket
Image.fromarray(out).save(OUT)

w = a.shape[1] // FRAMES
counts = [int(pupil[:, f * w:(f + 1) * w].sum()) for f in range(FRAMES)]
socks = [int(socket[:, f * w:(f + 1) * w].sum()) for f in range(FRAMES)]
print(f'{OUT}: per frame, pupil px {counts}, socket px {socks} (texture px); everything else unchanged')
assert all(c > 0 for c in counts), 'a frame lost its eyes'
assert (out[~changed] == a[~changed]).all()

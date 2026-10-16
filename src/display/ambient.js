// Seamless screen edges for the full game page (game.html).
//
// The game is a 180 x 320 (9:16) canvas scaled to fit the screen. Phones since the
// iPhone X and most Android phones are taller (about 9:19.5 to 9:21), laptops are wider.
// Instead of bars, this full-screen canvas behind the game continues the picture past its
// edges, in the game's own pixels:
//   top     scene 1's waving orange / dark-red sky stripes, carried on upward (also under
//           the notch and status bar), dimmed to match when a dialog darkens the game; if
//           the top of the game is not sky, its top row is carried up instead
//   bottom  the game's bottom row carried down (black on every scene 1 / hub screen)
//   sides   the game's left and right columns carried out (laptops, tablets)
// It is drawn every frame in design pixels and lined up with the game canvas to the pixel.
// Scene 2 (Phaser) has its own black edges, which meet its black top and bottom vignette.
const W = 180;
const H = 320;
const SO = [0xde, 0x52, 0x38]; // scene 1 sky: orange
const SD = [0x8f, 0x2f, 0x20]; // scene 1 sky: dark red

/** Scene 1's sky colour at design pixel (x, y) at time t (s); y may be negative. */
function skyAt(x, y, t, wv) {
  return Math.floor((y + wv[((x % 360) + 360) % 360] + 400) / 22) & 1 ? SD : SO;
}

export function createAmbient() {
  const el = document.createElement('canvas');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '0',
    pointerEvents: 'none',
    imageRendering: 'pixelated',
  });
  document.body.prepend(el);
  const ctx = el.getContext('2d', { willReadFrequently: true });
  let sky = null;
  let geo = '';

  return {
    el,
    hide() {
      el.style.display = 'none';
    },
    /** Extend `src` (the 180 x 320 game canvas) to the whole screen. */
    draw(src, now = performance.now()) {
      el.style.display = 'block';
      const r = src.getBoundingClientRect();
      if (!r.width) return;
      const s = r.width / W; // CSS px per design px
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ox = Math.max(0, Math.ceil(r.left / s));
      const oy = Math.max(0, Math.ceil(r.top / s));
      const tw = ox + W + Math.max(0, Math.ceil((vw - r.right) / s));
      const th = oy + H + Math.max(0, Math.ceil((vh - r.bottom) / s));
      const key = [tw, th, ox, oy, r.left, r.top, s].join();
      if (key !== geo) {
        geo = key;
        el.width = tw;
        el.height = th;
        Object.assign(el.style, { left: r.left - ox * s + 'px', top: r.top - oy * s + 'px', width: tw * s + 'px', height: th * s + 'px' });
        sky = oy ? ctx.createImageData(tw, oy) : null;
      }
      ctx.imageSmoothingEnabled = false;
      // middle band: the game, then its first / last columns carried out to the sides
      ctx.drawImage(src, ox, oy, W, H);
      if (ox) ctx.drawImage(src, 0, 0, 1, H, 0, oy, ox, H);
      if (tw - ox - W) ctx.drawImage(src, W - 1, 0, 1, H, ox + W, oy, tw - ox - W, H);
      // bottom: the last row carried down
      if (th - oy - H) ctx.drawImage(el, 0, oy + H - 1, tw, 1, 0, oy + H, tw, th - oy - H);
      if (!oy) return;
      // top: the sky carried up, or the first row
      const t = now / 1000;
      const wv = new Array(360);
      for (let x = 0; x < 360; x++) wv[x] = Math.round(3 * Math.sin((2 * Math.PI * (x + t * 14)) / 90));
      const p = ctx.getImageData(ox, oy, 1, 1).data;
      const want = skyAt(0, 0, t, wv);
      const k = (p[0] + p[1] + p[2]) / (want[0] + want[1] + want[2]); // dimmed by a dialog?
      const isSky = k > 0.05 && k < 1.08 && [0, 1, 2].every((i) => Math.abs(p[i] - want[i] * k) < 14);
      if (!isSky) {
        ctx.drawImage(el, 0, oy, tw, 1, 0, 0, tw, oy);
        return;
      }
      const d = sky.data;
      for (let y = 0; y < oy; y++)
        for (let x = 0; x < tw; x++) {
          const c = skyAt(x - ox, y - oy, t, wv);
          const i = (y * tw + x) * 4;
          d[i] = c[0] * k;
          d[i + 1] = c[1] * k;
          d[i + 2] = c[2] * k;
          d[i + 3] = 255;
        }
      ctx.putImageData(sky, 0, 0);
    },
  };
}

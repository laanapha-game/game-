// Scene 1's brand kit, for the sticker hub. Same palette, 5x7 font, pixel-cut Thai,
// marquee panels, buttons and code-drawn sprites as the home screen
// (assets/incoming/scene1/), so the hub reads as the same game.
// Everything draws in scene 1's 180 x 320 design pixels into the context you pass.
import { FONT_SRC, LOGO, HOUSE_B64, HOUSE_WINDOWS } from './brandData.js';

export const W = 180;
export const H = 320;
export const COL = {
  orange: '#DE5238', black: '#000000', dred: '#8F2F20', ddred: '#4A1A14', yellow: '#FFFF4F',
  magenta: '#F02DF0', dmagenta: '#A61EA6', white: '#FFFFFF', pink: '#F9A8F9', blue: '#0000FF', green: '#55FF3A',
  olive: '#C4C42E',
};
export const THAI_FONT = '"Serithai","เสรีไทย","Kanit","Noto Sans Thai",sans-serif';

// ---------- helpers ----------
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mkCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
export function sprite(w, h, fn) {
  const c = mkCanvas(w, h);
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const col = fn(i, j);
      if (col) {
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
  return c;
}
export function shape(w, h, inside) {
  const m = new Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[j * w + i] = !!inside(i, j);
  const at = (i, j) => i >= 0 && j >= 0 && i < w && j < h && m[j * w + i];
  return { inside: (i, j) => m[j * w + i], edge: (i, j) => m[j * w + i] && !(at(i - 1, j) && at(i + 1, j) && at(i, j - 1) && at(i, j + 1)) };
}

// ---------- 5x7 pixel font ----------
const GLYPH = {};
for (const k in FONT_SRC) GLYPH[k] = FONT_SRC[k].split('/');
// '@' is not in scene 1's font
if (!GLYPH['@']) GLYPH['@'] = '.###./#...#/#.###/#.#.#/#.###/#..../.####'.split('/');
if (!GLYPH['#']) GLYPH['#'] = '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.'.split('/');
if (!GLYPH['*']) GLYPH['*'] = '...../#.#.#/.###./#####/.###./#.#.#/.....'.split('/');
const tCache = new Map();
export function textSprite(s, color) {
  s = String(s).toUpperCase();
  const key = s + '|' + color;
  let c = tCache.get(key);
  if (c) return c;
  c = mkCanvas(Math.max(1, s.length * 6 - 1), 7);
  const x = c.getContext('2d');
  x.fillStyle = color;
  for (let i = 0; i < s.length; i++) {
    const g = GLYPH[s[i]] || GLYPH[' '];
    for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (g[r][q] === '#') x.fillRect(i * 6 + q, r, 1, 1);
  }
  tCache.set(key, c);
  return c;
}

// ---------- Thai: draw with the font, then cut to hard pixels ----------
const thaiCache = new Map();
let measureCtx = null;
export function thaiSprite(s, color, px = 13) {
  const key = s + '|' + color + '|' + px;
  let c = thaiCache.get(key);
  if (c) return c;
  if (!measureCtx) measureCtx = mkCanvas(4, 4).getContext('2d');
  measureCtx.font = px + 'px ' + THAI_FONT;
  const w = Math.ceil(measureCtx.measureText(s).width) + 2;
  const h = Math.ceil(px * 1.6);
  c = mkCanvas(w, h);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.font = px + 'px ' + THAI_FONT;
  x.textBaseline = 'alphabetic';
  x.fillStyle = '#000';
  x.fillText(s, 1, Math.round(px * 1.15));
  const id = x.getImageData(0, 0, w, h);
  const d = id.data;
  const rgb = hex2rgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] >= 110) {
      d[i] = rgb[0];
      d[i + 1] = rgb[1];
      d[i + 2] = rgb[2];
      d[i + 3] = 255;
    } else d[i + 3] = 0;
  }
  x.putImageData(id, 0, 0);
  thaiCache.set(key, c);
  return c;
}
export function thaiWidth(s, px = 13) {
  if (!measureCtx) measureCtx = mkCanvas(4, 4).getContext('2d');
  measureCtx.font = px + 'px ' + THAI_FONT;
  return Math.ceil(measureCtx.measureText(s).width) + 2;
}
if (typeof document !== 'undefined' && document.fonts?.load) {
  document.fonts.load('13px Kanit', 'ก').then(() => thaiCache.clear()).catch(() => {});
  document.fonts.ready?.then(() => thaiCache.clear());
}

/** Drawing kit bound to one 2D context (scene 1's canvas). */
export function kit(ctx) {
  const text = (s, x, y, color, align = 'l') => {
    const sp = textSprite(s, color);
    let dx = x;
    if (align === 'c') dx = Math.round(x - sp.width / 2);
    else if (align === 'r') dx = x - sp.width;
    ctx.drawImage(sp, dx, y);
  };
  const textS = (s, x, y, color, align) => {
    text(s, x + 1, y + 1, COL.black, align);
    text(s, x, y, color, align);
  };
  const thai = (s, x, y, color, px = 13, align = 'c') => {
    const b = thaiSprite(s, color, px);
    const dx = align === 'c' ? Math.round(x - b.width / 2) : align === 'r' ? x - b.width : x;
    ctx.drawImage(b, dx, y);
    return b.width;
  };
  const thaiS = (s, x, y, color, px = 13, align = 'c') => {
    thai(s, x + 1, y + 1, COL.black, px, align);
    return thai(s, x, y, color, px, align);
  };
  const rect = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  /** Scene 1's marquee panel: yellow frame, black inside, chasing magenta bulbs. */
  const bulbPanel = (x, y, w, h, t, fill = COL.black) => {
    rect(x + 2, y + 2, w, h, COL.black);
    rect(x, y, w, h, COL.yellow);
    rect(x + 3, y + 3, w - 6, h - 6, fill);
    const ph = Math.floor(t * 3) % 2;
    let i = 0;
    const bulb = (bx, by) => rect(bx, by, 2, 2, (i++ + ph) % 2 ? COL.magenta : COL.black);
    for (let bx = x + 4; bx < x + w - 5; bx += 6) bulb(bx, y + 1);
    for (let by = y + 4; by < y + h - 5; by += 6) bulb(x + w - 3, by);
    for (let bx = x + w - 8; bx >= x + 4; bx -= 6) bulb(bx, y + h - 3);
    for (let by = y + h - 8; by >= y + 4; by -= 6) bulb(x + 1, by);
  };
  /** Thin yellow-framed black box (scene 1's name box / preview box). */
  const box = (x, y, w, h, fill = COL.black, edge = COL.yellow) => {
    rect(x, y, w, h, edge);
    rect(x + 1, y + 1, w - 2, h - 2, fill);
  };
  /** Scene 1's start button: magenta, yellow frame, blinking > < around the label. */
  const bigButton = (b, label, pressed, t, icon) => {
    const o = pressed ? 1 : 0;
    rect(b.x - 2, b.y - 2 + o, b.w + 4, b.h + 4, COL.yellow);
    rect(b.x, b.y + o, b.w, b.h, pressed ? COL.yellow : COL.magenta);
    if (!pressed) rect(b.x, b.y + b.h - 2, b.w, 2, COL.dmagenta);
    const sp = thaiSprite(label, COL.black, 13);
    const iw = icon ? icon.width + 4 : 0;
    const cx = b.x + b.w / 2;
    const lx = Math.round(cx - (sp.width + iw) / 2);
    if (icon) ctx.drawImage(icon, lx, b.y + Math.round((b.h - icon.height) / 2) + o);
    ctx.drawImage(sp, lx + iw, b.y + Math.round((b.h - 21) / 2) + o);
    if (Math.floor(t * 2) % 2 === 0) {
      text('>', lx - 9, b.y + Math.round((b.h - 7) / 2) + o, COL.black);
      text('<', lx + iw + sp.width + 4, b.y + Math.round((b.h - 7) / 2) + o, COL.black);
    }
  };
  /** Scene 1's small button: black, 1 px yellow frame, yellow label; inverts while pressed. */
  const smallButton = (b, label, pressed, opts = {}) => {
    rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, COL.yellow);
    rect(b.x, b.y, b.w, b.h, pressed ? COL.yellow : opts.fill || COL.black);
    const c = pressed ? COL.black : opts.color || COL.yellow;
    if (opts.latin) text(label, b.x + b.w / 2, b.y + Math.round((b.h - 7) / 2), c, 'c');
    else thai(label, b.x + b.w / 2, b.y + Math.round((b.h - 21) / 2), c, opts.px || 13);
  };
  const sparkle = (x, y, big) => {
    ctx.fillStyle = COL.yellow;
    const a = big ? 2 : 1;
    ctx.fillRect(x - a, y, a * 2 + 1, 1);
    ctx.fillRect(x, y - a, 1, a * 2 + 1);
  };
  const speaker = (on) => {
    const x = 162;
    const y = 4;
    const body = [[0, 2], [1, 2], [2, 2], [0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]];
    const wave = on ? [[6, 2], [6, 3], [6, 4], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5]] : [[6, 2], [8, 2], [7, 3], [6, 4], [8, 4]];
    const dot = (p, c, o) => rect(x + p[0] + o, y + p[1] + o, 1, 1, c);
    body.concat(wave).forEach((p) => dot(p, COL.black, 1));
    body.forEach((p) => dot(p, COL.yellow, 0));
    wave.forEach((p) => dot(p, on ? COL.yellow : COL.magenta, 0));
  };
  // Scene 1's waving orange / dark-red stripes.
  let skyImg = null;
  const SO = hex2rgb(COL.orange);
  const SD = hex2rgb(COL.dred);
  const sky = (t, h = H) => {
    if (!skyImg || skyImg.height !== h) skyImg = ctx.createImageData(W, h);
    const d = skyImg.data;
    for (let x = 0; x < W; x++) {
      const wv = Math.round(3 * Math.sin((2 * Math.PI * (x + t * 14)) / 90));
      for (let y = 0; y < h; y++) {
        const c = Math.floor((y + wv + 400) / 22) & 1 ? SD : SO;
        const i = (y * W + x) * 4;
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(skyImg, 0, 0);
  };
  return { ctx, text, textS, thai, thaiS, rect, bulbPanel, box, bigButton, smallButton, sparkle, speaker, sky };
}

// ---------- code-drawn sprites (scene 1's) ----------
export function ghostSprite(fill = COL.white, line = COL.black) {
  const w = 20;
  const h = 27;
  const hem = (x) => 23 + (Math.floor(x / 3) % 2 === 0 ? 3 : 0);
  const sh = shape(w, h, (x, y) => {
    if (y > hem(x)) return false;
    if (y >= 10) return true;
    return ((x - 9.5) / 9.5) ** 2 + ((y - 10) / 10) ** 2 <= 1;
  });
  const eyes = [[4, 9], [5, 9], [5, 10], [6, 10], [6, 11], [15, 9], [14, 9], [14, 10], [13, 10], [13, 11]];
  const mouth = [[9, 15], [10, 15], [9, 16], [10, 16]];
  const has = (a, x, y) => a.some((p) => p[0] === x && p[1] === y);
  return sprite(w, h, (x, y) => {
    if (!sh.inside(x, y)) return null;
    if (sh.edge(x, y)) return line;
    if (has(eyes, x, y) || has(mouth, x, y)) return line;
    return fill;
  });
}
export function pumpkinSprite(lit = true) {
  const w = 16;
  const h = 15;
  const sh = shape(w, h, (x, y) => ((x - 7.5) / 7.5) ** 2 + ((y - 8.5) / 6) ** 2 <= 1);
  const eyes = [[3, 6], [4, 6], [5, 6], [4, 7], [10, 6], [11, 6], [12, 6], [11, 7]];
  const has = (a, x, y) => a.some((p) => p[0] === x && p[1] === y);
  const body = lit ? COL.yellow : COL.dred;
  return sprite(w, h, (x, y) => {
    if ((x === 7 || x === 8) && (y === 1 || y === 2)) return COL.black;
    if (x === 9 && y === 0) return COL.black;
    if (!sh.inside(x, y)) return null;
    if (sh.edge(x, y)) return COL.black;
    if (has(eyes, x, y)) return lit ? COL.black : COL.ddred;
    if (y === 10 && x >= 4 && x <= 11) return x === 6 || x === 9 ? body : lit ? COL.black : COL.ddred;
    if (y === 11 && x >= 5 && x <= 10) return lit ? COL.black : COL.ddred;
    return body;
  });
}
export const moonSprite = () => sprite(22, 22, (x, y) => ((x - 10.5) ** 2 + (y - 10.5) ** 2 <= 100 && !((x - 14.5) ** 2 + (y - 8.5) ** 2 <= 80) ? COL.yellow : null));

/** ลานนภา logo bitmap in one colour. */
export function logoSprite(color) {
  const bin = atob(LOGO.b64);
  const c = mkCanvas(LOGO.w, LOGO.h);
  const x = c.getContext('2d');
  x.fillStyle = color;
  for (let j = 0; j < LOGO.h; j++)
    for (let i = 0; i < LOGO.w; i++) {
      const n = j * LOGO.w + i;
      if (bin.charCodeAt(n >> 3) & (128 >> (n & 7))) x.fillRect(i, j, 1, 1);
    }
  return c;
}
export const LOGO_SIZE = { w: LOGO.w, h: LOGO.h };

/** The haunted house from the home screen (124 x 60) with its flickering windows. */
export function houseImage() {
  const img = new Image();
  img.src = 'data:image/png;base64,' + HOUSE_B64;
  return img;
}
export function drawHouseWindows(ctx, hx, hy, t, lit = true) {
  HOUSE_WINDOWS.forEach((w) => {
    if (lit && (Math.floor(t * 1.3) + w.k) % 9 === 0) return;
    const x = hx + w.x;
    const y = hy + w.y;
    ctx.fillStyle = lit ? w.c || COL.yellow : COL.black;
    ctx.fillRect(x, y, w.w, w.h);
    ctx.fillStyle = COL.black;
    ctx.fillRect(x + (w.w >> 1), y, 1, w.h);
    ctx.fillRect(x, y + (w.h >> 1), w.w, 1);
  });
}

/** Silhouette of any sprite canvas in one colour (locked stickers). */
export function silhouette(src, color) {
  const c = mkCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Die-cut sticker look: a `rim` px white border (and a black outer line) around the sprite's shape. */
export function stickerize(src, rim = 2, line = COL.black, edge = COL.white) {
  const sw = src.width;
  const sh = src.height;
  const pad = rim + 1;
  const out = mkCanvas(sw + pad * 2, sh + pad * 2);
  const x = out.getContext('2d');
  const sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const solid = (i, j) => i >= 0 && j >= 0 && i < sw && j < sh && sd[(j * sw + i) * 4 + 3] > 0;
  const dist = (i, j, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r && solid(i + dx, j + dy)) return true;
    return false;
  };
  for (let j = -pad; j < sh + pad; j++)
    for (let i = -pad; i < sw + pad; i++) {
      if (solid(i, j)) continue;
      if (dist(i, j, rim)) x.fillStyle = edge;
      else if (dist(i, j, rim + 1)) x.fillStyle = line;
      else continue;
      x.fillRect(i + pad, j + pad, 1, 1);
    }
  x.drawImage(src, pad, pad);
  return out;
}

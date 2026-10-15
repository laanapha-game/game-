// Pixel-art stickers drawn in code for the checkpoints that have no sprite sheet
// (ผงพราย, คุณไสย, หนังควาย, ศาลเจ้าที่, ตะปู), in scene 1's style: hard pixels,
// 1 px black outline, the fest palette plus a few material colours.
import { COL, sprite, shape, mkCanvas } from './brand.js';

const C = {
  ...COL,
  glass: '#BFEFF7', glassD: '#7FC6D6', straw: '#E8C46A', strawD: '#B08A3A', hide: '#7A3B22', hideL: '#A4553A',
  steel: '#B8BCCB', steelD: '#6E7385', rust: '#B5532A', blood: '#D11F1F', gold: '#DEB350', goldL: '#FDE798', goldD: '#AD8E3C', smoke: '#E9E2F0',
};

function line(put, x0, y0, x1, y1, c) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
  for (;;) {
    put(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** A grid you paint into, then turn into a canvas. */
function grid(w, h) {
  const g = new Array(w * h).fill(null);
  const put = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < w && y < h) g[y * w + x] = c;
  };
  const get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? g[y * w + x] : null);
  const toCanvas = () => sprite(w, h, (x, y) => g[y * w + x]);
  /** Black outline around everything painted so far. */
  const outline = () => {
    const add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (!get(x, y) && (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1))) add.push([x, y]);
    add.forEach(([x, y]) => put(x, y, C.black));
  };
  return { put, get, toCanvas, outline, w, h };
}

// ผงพราย: a little glass bottle of pale powder, cork and a magenta yant label.
function powder() {
  const g = grid(22, 32);
  const body = shape(22, 32, (x, y) => {
    if (y >= 1 && y <= 4) return x >= 8 && x <= 13; // cork
    if (y >= 5 && y <= 8) return x >= 8 && x <= 13; // neck
    if (y >= 9 && y <= 30) {
      const r = y < 12 ? 6 + (y - 9) : 9;
      return Math.abs(x - 10.5) <= r - (y > 28 ? y - 28 : 0);
    }
    return false;
  });
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 22; x++) {
      if (!body.inside(x, y)) continue;
      if (body.edge(x, y)) g.put(x, y, C.black);
      else if (y <= 4) g.put(x, y, y === 1 ? C.strawD : C.straw);
      else if (y >= 19) g.put(x, y, (x * 7 + y * 3) % 11 === 0 ? C.magenta : (x + y) % 5 === 0 ? C.pink : C.white);
      else g.put(x, y, y === 18 ? C.pink : C.glass);
    }
  // label with a yant square
  for (let y = 12; y <= 17; y++) for (let x = 5; x <= 16; x++) g.put(x, y, C.magenta);
  for (let x = 7; x <= 14; x++) {
    g.put(x, 13, C.yellow);
    g.put(x, 16, C.yellow);
  }
  [[7, 14], [7, 15], [14, 14], [14, 15], [10, 14], [11, 15]].forEach(([x, y]) => g.put(x, y, C.yellow));
  // glass shine
  for (let y = 10; y <= 27; y++) if (y < 12 || y > 17) g.put(4, y, C.white);
  g.put(5, 11, C.white);
  // a puff of powder escaping
  [[16, 1], [18, 3], [15, 0], [19, 0], [17, 5]].forEach(([x, y]) => g.put(x, y, C.white));
  return g.toCanvas();
}

// คุณไสย: straw voodoo doll, stitched X eyes, red thread, pins stuck in.
function doll() {
  const g = grid(28, 32);
  const inside = (x, y) => {
    if ((x - 14) ** 2 + (y - 8) ** 2 <= 30) return true; // head
    if (x >= 10 && x <= 18 && y >= 13 && y <= 23) return true; // body
    if (x >= 4 && x <= 24 && y >= 14 && y <= 16) return true; // arms
    if (((x >= 10 && x <= 12) || (x >= 16 && x <= 18)) && y >= 23 && y <= 29) return true; // legs
    return false;
  };
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 28; x++) if (inside(x, y)) g.put(x, y, y % 3 === 0 || (x + y) % 7 === 0 ? C.strawD : C.straw);
  // straw ties at wrists and ankles
  [4, 24].forEach((x) => [14, 15, 16].forEach((y) => g.put(x, y, C.dred)));
  [10, 11, 12, 16, 17, 18].forEach((x) => g.put(x, 27, C.dred));
  g.outline();
  // X eyes and a stitched mouth
  [[11, 6], [13, 8], [12, 7], [11, 8], [13, 6], [15, 6], [17, 8], [16, 7], [15, 8], [17, 6]].forEach(([x, y]) => g.put(x, y, C.black));
  for (let x = 12; x <= 16; x++) g.put(x, 11, C.black);
  [12, 14, 16].forEach((x) => g.put(x, 10, C.black));
  // red thread wrapped across the body
  for (let k = 0; k <= 8; k++) {
    g.put(10 + k, 17 + Math.floor(k / 3), C.blood);
    g.put(18 - k, 19 + Math.floor(k / 3), C.blood);
  }
  // pins: steel shaft, magenta / white head
  const pin = (x0, y0, x1, y1, head) => {
    line(g.put, x0, y0, x1, y1, C.steel);
    g.put(x0, y0, head);
    g.put(x0 + 1, y0, head);
    g.put(x0, y0 + 1, head);
    g.put(x0 + 1, y0 + 1, C.black);
  };
  pin(1, 1, 9, 7, C.magenta);
  pin(23, 22, 17, 18, C.white);
  pin(24, 2, 19, 6, C.yellow);
  // heart mark where the pin goes in
  [[13, 19], [15, 19], [13, 20], [14, 20], [15, 20], [14, 21]].forEach(([x, y]) => g.put(x, y, C.blood));
  return g.toCanvas();
}

// หนังควาย: a stretched buffalo hide with stitched edge, red yant and small horns.
function hide() {
  const g = grid(30, 28);
  const lobe = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const inside = (x, y) =>
    ((x - 15) / 10) ** 2 + ((y - 15) / 8.5) ** 2 <= 1 ||
    lobe(x, y, 5, 8, 3.5) || lobe(x, y, 25, 8, 3.5) || lobe(x, y, 5, 22, 3.5) || lobe(x, y, 25, 22, 3.5) || lobe(x, y, 15, 5, 3.6);
  const sh = shape(30, 28, inside);
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 30; x++) {
      if (!sh.inside(x, y)) continue;
      g.put(x, y, (x * 3 + y * 5) % 9 < 2 ? C.hide : C.hideL);
    }
  // stitches just inside the edge
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 30; x++)
      if (sh.inside(x, y) && !sh.edge(x, y) && [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => !inside(x + dx, y + dy)) && (x + y) % 3 === 0) g.put(x, y, C.straw);
  g.outline();
  // horns on the head lobe
  [[11, 1], [10, 0], [12, 2], [19, 1], [20, 0], [18, 2]].forEach(([x, y]) => g.put(x, y, C.white));
  // yant: a square with diagonals and dots
  for (let k = 0; k <= 8; k++) {
    g.put(11 + k, 11, C.yellow);
    g.put(11 + k, 19, C.yellow);
    g.put(11, 11 + k, C.yellow);
    g.put(19, 11 + k, C.yellow);
    g.put(11 + k, 11 + k, C.blood);
    g.put(19 - k, 11 + k, C.blood);
  }
  [[15, 9], [9, 15], [21, 15], [15, 21]].forEach(([x, y]) => g.put(x, y, C.yellow));
  return g.toCanvas();
}

// ศาลเจ้าที่: a spirit house on its pole, tiered gold roof, glowing doorway, garlands.
function shrine() {
  const g = grid(30, 40);
  // pole
  for (let y = 25; y <= 39; y++) for (let x = 13; x <= 16; x++) g.put(x, y, x === 13 ? C.white : C.steel);
  // platform
  for (let y = 23; y <= 25; y++) for (let x = 5; x <= 24; x++) g.put(x, y, y === 23 ? C.yellow : C.orange);
  // body
  for (let y = 13; y <= 22; y++) for (let x = 8; x <= 21; x++) g.put(x, y, x === 8 || x === 21 ? C.dred : C.orange);
  // doorway with candle glow
  for (let y = 15; y <= 22; y++) for (let x = 12; x <= 17; x++) if (!(y === 15 && (x === 12 || x === 17))) g.put(x, y, y >= 18 ? C.yellow : C.black);
  g.put(14, 19, C.white);
  g.put(15, 19, C.white);
  // tiered roof
  for (let tier = 0; tier < 3; tier++) {
    const top = 3 + tier * 3;
    for (let y = top; y < top + 4; y++) {
      const half = 3 + (y - 3) * 0.9 + tier;
      for (let x = Math.round(14.5 - half); x <= Math.round(14.5 + half); x++) g.put(x, y, y === top + 3 ? C.goldD : C.gold);
    }
  }
  for (let y = 0; y <= 3; y++) g.put(14, y, C.gold), g.put(15, y, C.gold);
  // roof finials (ช่อฟ้า)
  [[4, 12], [3, 11], [25, 12], [26, 11]].forEach(([x, y]) => g.put(x, y, C.gold));
  g.outline();
  // garlands hanging from the platform corners
  const garland = (x) => [26, 27, 28, 29].forEach((y, i) => g.put(x, y, i % 2 ? C.white : C.magenta));
  garland(6);
  garland(23);
  // incense smoke drifting up
  [[24, 18], [25, 16], [24, 14], [25, 12], [26, 10]].forEach(([x, y]) => g.put(x, y, C.smoke));
  return g.toCanvas();
}

// ตะปู: three rusty coffin nails, crossed, one with blood on the tip.
function nails() {
  const g = grid(30, 30);
  const nail = (x0, y0, x1, y1, bloody) => {
    line(g.put, x0, y0, x1, y1, C.steel);
    line(g.put, x0 + 1, y0, x1 + 1, y1, C.steelD);
    // head
    const hx = x0;
    const hy = y0;
    for (let dx = -2; dx <= 3; dx++) g.put(hx + dx, hy, C.steel), g.put(hx + dx, hy - 1, C.steelD);
    // rust flecks
    const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 3; k < len; k += 4) {
      const x = Math.round(x0 + ((x1 - x0) * k) / len);
      const y = Math.round(y0 + ((y1 - y0) * k) / len);
      g.put(x, y, C.rust);
    }
    if (bloody) {
      g.put(x1, y1, C.blood);
      g.put(x1 + 1, y1, C.blood);
      g.put(x1, y1 - 1, C.blood);
    }
  };
  nail(6, 4, 22, 26, true);
  nail(22, 3, 8, 25, false);
  nail(14, 2, 15, 27, false);
  g.outline();
  // drips
  [[22, 28], [23, 29]].forEach(([x, y]) => g.put(x, y, C.blood));
  return g.toCanvas();
}

const DRAW = { powder, doll, hide, shrine, nails };

export function drawSticker(name) {
  const f = DRAW[name];
  return f ? f() : null;
}

/** Recolour a sprite to gold (กุมารทอง), keeping outlines and red eyes. */
export function tintGold(src) {
  const c = mkCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  const ramp = [[0x4a, 0x34, 0x10], [0xad, 0x8e, 0x3c], [0xde, 0xb3, 0x50], [0xfd, 0xe7, 0x98]];
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
    if (lum < 28) continue; // outline
    if (r > 150 && gg < 90 && b < 90) continue; // red eyes stay red
    const k = lum > 200 ? 3 : lum > 140 ? 2 : lum > 70 ? 1 : 0;
    [d[i], d[i + 1], d[i + 2]] = ramp[k];
  }
  x.putImageData(id, 0, 0);
  return c;
}

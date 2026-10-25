// Pixel-art stickers drawn in code for the checkpoints that have no sprite sheet
// (ผงพราย, คุณไสย, หนังควาย, ศาลเจ้าที่, ตะปู), in scene 1's style: hard pixels,
// 1 px black outline, the fest palette plus a few material colours.
import { COL, sprite, shape, mkCanvas, textSprite } from './brand.js';

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

// ---------- the mission stickers (owner, 25 Oct: one more design per checkpoint) ----------
const D = { wood: '#7A3B22', woodL: '#A4553A', woodD: '#4F2414', dirt: '#5A3418', dirtL: '#7E4D25', soda: '#E0262B', sodaL: '#FF6B6B', noodle: '#F6D36B', bowl: '#F4F4FA', bowlB: '#2E5BD8', ghostB: '#9EC3F0', exit: '#2DBE4A', candy: '#FF7AC8' };

// START: an admission ticket, GO! on the main part, a star on the stub.
function ticket() {
  const g = grid(34, 24);
  for (let y = 2; y < 22; y++)
    for (let x = 0; x < 34; x++) {
      if ((x - 0) ** 2 + (y - 12) ** 2 <= 9 || (x - 33) ** 2 + (y - 12) ** 2 <= 9) continue; // side notches
      g.put(x, y, x >= 24 ? C.magenta : C.yellow);
    }
  for (let y = 3; y < 21; y += 2) g.put(23, y, C.black); // perforation
  for (let x = 3; x < 21; x++) g.put(x, 4, C.orange), g.put(x, 19, C.orange);
  g.outline();
  const star = ['..#..', '..#..', '#####', '.###.', '.#.#.'];
  star.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && g.put(26 + i, 10 + j, C.yellow)));
  const c = g.toCanvas();
  const t = textSprite('GO!', COL.black);
  const x = c.getContext('2d');
  x.drawImage(t, 4, 9);
  x.drawImage(t, 3, 8); // bold
  return c;
}

// FIND THE SPIDER: a spider on its web, red hourglass, little white eyes.
function spider() {
  const g = grid(32, 32);
  const cx = 16, cy = 15;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + 0.2;
    line(g.put, cx, cy, Math.round(cx + Math.cos(ang) * 15), Math.round(cy + Math.sin(ang) * 15), C.smoke);
  }
  for (const r of [5, 9, 13])
    for (let k = 0; k < 64; k++) {
      const ang = (k / 64) * Math.PI * 2;
      g.put(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.95), C.smoke);
    }
  // thread up to the top
  for (let y = 0; y < cy - 3; y++) g.put(cx, y, C.white);
  // legs
  [[-1, -1], [-1, 0], [-1, 1], [-1, 2]].forEach(([sx, k]) => {
    line(g.put, cx - 2, cy + k, cx - 7, cy + k * 3 - 3, C.black);
    line(g.put, cx - 7, cy + k * 3 - 3, cx - 9, cy + k * 3 - 1, C.black);
    line(g.put, cx + 2, cy + k, cx + 7, cy + k * 3 - 3, C.black);
    line(g.put, cx + 7, cy + k * 3 - 3, cx + 9, cy + k * 3 - 1, C.black);
  });
  // body
  for (let y = -4; y <= 5; y++) for (let x = -3; x <= 3; x++) if ((x / 3.4) ** 2 + ((y - 1) / 4.6) ** 2 <= 1) g.put(cx + x, cy + y, C.black);
  for (let y = -6; y <= -3; y++) for (let x = -2; x <= 2; x++) if (x * x + (y + 4.5) ** 2 <= 4.5) g.put(cx + x, cy + y, C.black);
  [[0, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [-1, 3], [0, 3], [1, 3]].forEach(([x, y]) => g.put(cx + x, cy + y, C.blood));
  g.put(cx - 1, cy - 5, C.white);
  g.put(cx + 1, cy - 5, C.white);
  return g.toCanvas();
}

// ESCAPE ROOM: a door left ajar, eyes in the dark gap, a green EXIT sign.
function door() {
  const g = grid(28, 40);
  for (let y = 10; y < 40; y++) for (let x = 1; x < 27; x++) g.put(x, y, x < 3 || x > 24 || y < 12 ? D.woodD : C.black);
  for (let y = 12; y < 40; y++)
    for (let x = 3; x < 19; x++) g.put(x, y, x === 18 ? D.woodD : (x - 3) % 5 === 4 ? D.wood : D.woodL);
  for (let x = 4; x < 18; x++) g.put(x, 24, D.wood), g.put(x, 32, D.wood);
  g.put(16, 27, C.yellow);
  g.put(16, 28, C.goldD);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 28; x++) g.put(x, y, D.exit);
  g.outline();
  // eyes in the gap
  [[20, 21], [23, 21], [20, 22], [23, 22]].forEach(([x, y]) => g.put(x, y, C.yellow));
  [[21, 30], [22, 31], [21, 32]].forEach(([x, y]) => g.put(x, y, C.dred));
  const c = g.toCanvas();
  c.getContext('2d').drawImage(textSprite('EXIT', COL.black), 3, 1);
  c.getContext('2d').drawImage(textSprite('EXIT', COL.white), 2, 1);
  return c;
}

// แข่งรถเข็น: a racing trolley with a chequered flag, speed lines behind.
function cart() {
  const g = grid(34, 30);
  // basket: a trapezoid of wire
  for (let y = 8; y <= 19; y++) {
    const x0 = 9 + Math.round((y - 8) * 0.25);
    const x1 = 30 - Math.round((y - 8) * 0.5);
    for (let x = x0; x <= x1; x++) g.put(x, y, y === 8 || y === 19 || x === x0 || x === x1 || (x - x0) % 4 === 0 || (y - 8) % 4 === 0 ? C.steel : null);
  }
  for (let x = 12; x <= 27; x++) g.put(x, 22, C.steelD);
  line(g.put, 9, 8, 4, 2, C.steelD); // handle
  for (let x = 1; x <= 5; x++) g.put(x, 2, C.magenta), g.put(x, 3, C.magenta);
  line(g.put, 12, 19, 12, 22, C.steelD);
  line(g.put, 26, 19, 26, 22, C.steelD);
  // wheels
  for (const wx of [13, 26]) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) g.put(wx + x, 25 + y, x * x + y * y <= 1 ? C.steel : C.black);
  // flag in the basket
  line(g.put, 21, 9, 21, 0, C.white);
  for (let y = 0; y < 5; y++) for (let x = 22; x < 31; x++) g.put(x, y, (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? C.black : C.white);
  // a pumpkin riding along
  for (let y = 11; y <= 17; y++) for (let x = 14; x <= 22; x++) if (((x - 18) / 4.4) ** 2 + ((y - 14) / 3.4) ** 2 <= 1) g.put(x, y, C.orange);
  g.put(16, 13, C.yellow), g.put(20, 13, C.yellow);
  for (let x = 16; x <= 20; x++) g.put(x, 16, C.yellow);
  g.outline();
  // speed lines
  [[0, 12, 5], [0, 16, 4], [1, 20, 6]].forEach(([x, y, l]) => {
    for (let k = 0; k < l; k++) g.put(x + k, y, C.white);
  });
  return g.toCanvas();
}

// PUMPKIN HAUNT: a pumpkin dug half out of the dirt, a shovel stuck beside it.
function dig() {
  const g = grid(34, 32);
  // shovel
  line(g.put, 6, 2, 6, 18, D.woodL);
  line(g.put, 7, 2, 7, 18, D.wood);
  for (let x = 4; x <= 9; x++) g.put(x, 1, D.woodD);
  for (let y = 18; y <= 25; y++) for (let x = 3; x <= 10; x++) if (Math.abs(x - 6.5) <= 4 - Math.max(0, y - 22)) g.put(x, y, x < 6 ? C.white : C.steel);
  // pumpkin
  for (let y = 8; y <= 26; y++)
    for (let x = 10; x <= 32; x++) {
      const r = ((x - 21) / 11) ** 2 + ((y - 17) / 8.5) ** 2;
      if (r <= 1) g.put(x, y, Math.abs(x - 21) % 6 === 3 ? '#B23A22' : C.orange);
    }
  for (let y = 4; y <= 8; y++) g.put(21, y, '#2E8B2E'), g.put(22, y, '#2E8B2E');
  g.put(23, 5, '#55FF3A'), g.put(24, 4, '#55FF3A');
  // face
  [[16, 14], [17, 14], [16, 13], [25, 14], [26, 14], [26, 13]].forEach(([x, y]) => g.put(x, y, C.yellow));
  for (let x = 16; x <= 26; x++) g.put(x, 20, C.yellow);
  [17, 20, 23].forEach((x) => g.put(x, 19, C.yellow));
  [18, 22, 25].forEach((x) => g.put(x, 21, C.yellow));
  // dirt mound over the bottom
  for (let y = 22; y < 32; y++)
    for (let x = 0; x < 34; x++) {
      const top = 23 + Math.round(Math.abs(x - 17) * 0.35 + Math.sin(x * 0.9) * 1.2);
      if (y >= top) g.put(x, y, (x * 5 + y * 3) % 7 === 0 ? D.dirtL : D.dirt);
    }
  g.outline();
  [[29, 21], [31, 19], [2, 20]].forEach(([x, y]) => g.put(x, y, D.dirtL));
  return g.toCanvas();
}

// สวดมนต์หน้าศพ: a gold-trimmed coffin, a bottle of red soda with a straw, a spirit rising.
function coffin() {
  const g = grid(34, 36);
  const inside = (x, y) => {
    if (y < 6 || y > 35) return false;
    const half = y < 14 ? 4 + (y - 6) * 0.75 : 10 - (y - 14) * 0.2;
    return Math.abs(x - 12) <= half;
  };
  for (let y = 0; y < 36; y++)
    for (let x = 0; x < 26; x++) if (inside(x, y)) g.put(x, y, !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2) ? C.gold : D.wood);
  for (let y = 12; y <= 26; y++) g.put(12, y, C.goldL);
  for (let x = 8; x <= 16; x++) g.put(x, 16, C.goldL);
  // red soda
  for (let y = 18; y <= 35; y++)
    for (let x = 24; x <= 32; x++) {
      const half = y < 22 ? 1.5 + (y - 18) * 0.8 : 4;
      if (Math.abs(x - 28) <= half) g.put(x, y, y > 22 && y < 28 ? C.white : x === 26 ? D.sodaL : D.soda);
    }
  line(g.put, 28, 18, 31, 9, C.magenta);
  g.outline();
  for (let x = 25; x <= 31; x++) if (x % 2) g.put(x, 25, D.soda);
  // the spirit leaving
  [[8, 3], [9, 2], [10, 1], [11, 2], [12, 1], [13, 0], [14, 1], [15, 2], [16, 3]].forEach(([x, y]) => g.put(x, y, C.smoke));
  [[11, 4], [13, 4]].forEach(([x, y]) => g.put(x, y, C.black));
  return g.toCanvas();
}

// WORKSHOP · Hidden Treat: a gift box with its lid popping, a ? and a wrapped candy.
function gift() {
  const g = grid(32, 34);
  for (let y = 16; y <= 33; y++) for (let x = 4; x <= 27; x++) g.put(x, y, x >= 14 && x <= 17 ? C.yellow : y === 16 ? '#FF7AF5' : C.magenta);
  for (let y = 10; y <= 14; y++) for (let x = 2; x <= 29; x++) g.put(x, y, x >= 14 && x <= 17 ? C.yellow : C.dmagenta);
  // bow on the lid
  [[10, 6], [11, 7], [12, 8], [13, 9], [11, 5], [12, 6], [18, 9], [19, 8], [20, 7], [21, 6], [20, 5], [19, 6], [15, 8], [16, 8]].forEach(([x, y]) => g.put(x, y, C.yellow));
  g.outline();
  // the ? peeking out between lid and box
  const q = ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'];
  q.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && g.put(7 + i, 19 + j, C.white)));
  // candy
  for (let x = 21; x <= 28; x++) for (let y = 23; y <= 27; y++) if ((x - 24.5) ** 2 + (y - 25) ** 2 <= 5) g.put(x, y, (x + y) % 3 ? C.white : '#FF7AC8');
  [[20, 23], [19, 22], [20, 27], [19, 28], [29, 23], [30, 22], [29, 27], [30, 28]].forEach(([x, y]) => g.put(x, y, '#FF7AC8'));
  return g.toCanvas();
}

// LAAN FOOD: a bowl of noodles, chopsticks, a ghost made of steam.
function food() {
  const g = grid(34, 32);
  for (let y = 15; y <= 29; y++)
    for (let x = 1; x <= 32; x++) {
      const r = ((x - 16.5) / 15.5) ** 2 + ((y - 15) / 14) ** 2;
      if (y >= 15 && r <= 1) g.put(x, y, y === 18 || y === 19 ? ((x >> 1) % 2 ? D.bowlB : C.white) : C.white);
    }
  for (let x = 2; x <= 31; x++) g.put(x, 15, D.noodle), g.put(x, 14, x % 3 ? D.noodle : '#E0A93A');
  for (let x = 5; x <= 28; x++) g.put(x, 13, x % 4 ? D.noodle : '#E0A93A');
  [[9, 12], [10, 12], [22, 12], [23, 12], [24, 12]].forEach(([x, y]) => g.put(x, y, '#7A3B22')); // meatballs
  g.put(16, 12, '#55FF3A'), g.put(17, 11, '#55FF3A');
  g.outline();
  line(g.put, 20, 13, 32, 1, D.wood);
  line(g.put, 22, 13, 33, 3, D.woodL);
  // steam ghost
  [[6, 9], [5, 8], [6, 7], [7, 6], [6, 5], [11, 9], [12, 8], [11, 7], [12, 6], [11, 5]].forEach(([x, y]) => g.put(x, y, C.smoke));
  for (let y = 0; y <= 4; y++) for (let x = 6; x <= 12; x++) if ((x - 9) ** 2 / 9 + (y - 2.5) ** 2 / 6 <= 1) g.put(x, y, C.smoke);
  g.put(8, 2, C.black), g.put(10, 2, C.black);
  return g.toCanvas();
}

const DRAW = { powder, doll, hide, shrine, nails, ticket, spider, door, cart, dig, coffin, gift, food };

/** The second design of each checkpoint (the first is the art in checkpoints.js). */
export const MISSION_ART = { cp1: 'ticket', cp2: 'spider', cp3: 'door', cp4: 'cart', cp5: 'dig', cp6: 'coffin', cp7: 'gift', cp8: 'food' };

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


// Colourways: recolour by brightness into a four-step ramp, keeping outlines and reds.
const RAMPS = {
  gold: [[0x4a, 0x34, 0x10], [0xad, 0x8e, 0x3c], [0xde, 0xb3, 0x50], [0xfd, 0xe7, 0x98]],
  neon: [[0x4a, 0x0f, 0x4a], [0xa6, 0x1e, 0xa6], [0xf0, 0x2d, 0xf0], [0xff, 0xc4, 0xff]],
  ghost: [[0x1e, 0x2a, 0x5a], [0x4f, 0x6f, 0xc8], [0x9e, 0xc3, 0xf0], [0xee, 0xf8, 0xff]],
};
export function recolor(src, id) {
  if (id === 'gold') return tintGold(src);
  const ramp = RAMPS[id];
  if (!ramp) return src;
  const c = mkCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const lum = 0.3 * r + 0.59 * gg + 0.11 * b;
    if (lum < 28) continue;
    if (r > 180 && gg < 70 && b < 70) continue;
    const k = lum > 200 ? 3 : lum > 140 ? 2 : lum > 70 ? 1 : 0;
    [d[i], d[i + 1], d[i + 2]] = ramp[k];
  }
  x.putImageData(img, 0, 0);
  return c;
}
/** The rim colour of a sticker in each colourway. */
export const RIM = { classic: COL.white, neon: '#FFC4FF', ghost: '#CFE6FF', gold: '#FDE798' };

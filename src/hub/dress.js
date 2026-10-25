// Items for the player's bird (scene 1's characters are 32 x 36 round birds): one item per
// checkpoint, chosen by the player's seed (loot.js), so every bird at the end looks different.
// Each item is pixel art in the bird's own coordinates (eyes at y 14-15, x 12 and 19; beak
// y 17-18; body x 3-28 at y 20-25; head top y 8; feet y 32-35), drawn on a 56 x 56 layer
// that sticks out OX px left and OY px above the 32 x 36 sprite.
import { COL, mkCanvas } from './brand.js';

export const OX = 12;
export const OY = 16;
const LW = 56;
const LH = 56;

const P = {
  k: '#000000', w: '#FFFFFF', y: '#FFFF4F', Y: '#DEB350', o: '#DE5238', O: '#B23A22', r: '#D11F1F', R: '#8F2F20',
  m: '#F02DF0', M: '#A61EA6', p: '#F9A8F9', g: '#55FF3A', G: '#2E8B2E', b: '#2E5BD8', c: '#7FE3FF', s: '#B8BCCB', S: '#6E7385',
  n: '#7A3B22', N: '#A4553A', t: '#E8C46A', d: '#2A2440', D: '#463A66', l: '#9EC3F0', L: '#EEF8FF', q: '#FDE798',
};

/** A layer to paint in bird coordinates. */
function layer() {
  const g = new Array(LW * LH).fill(null);
  const put = (x, y, c) => {
    x = Math.round(x) + OX;
    y = Math.round(y) + OY;
    if (x >= 0 && y >= 0 && x < LW && y < LH) g[y * LW + x] = P[c] || c;
  };
  const get = (x, y) => {
    x += OX;
    y += OY;
    return x >= 0 && y >= 0 && x < LW && y < LH ? g[y * LW + x] : null;
  };
  const rows = (x0, y0, rs) => rs.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && put(x0 + i, y0 + j, ch)));
  const fill = (x0, y0, x1, y1, fn) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = fn(x, y);
      if (c) put(x, y, c);
    }
  };
  const line = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) put(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c);
  };
  /** Black outline around what is painted. */
  const outline = () => {
    const add = [];
    for (let y = -OY; y < LH - OY; y++)
      for (let x = -OX; x < LW - OX; x++) if (!get(x, y) && (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1))) add.push([x, y]);
    add.forEach(([x, y]) => put(x, y, 'k'));
  };
  const canvas = () => {
    const c = mkCanvas(LW, LH);
    const x = c.getContext('2d');
    for (let j = 0; j < LH; j++)
      for (let i = 0; i < LW; i++)
        if (g[j * LW + i]) {
          x.fillStyle = g[j * LW + i];
          x.fillRect(i, j, 1, 1);
        }
    return c;
  };
  return { put, get, rows, fill, line, outline, canvas };
}
const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

// ---------- items: (L, frame) => paint; `back` items go behind the bird ----------
const ITEM = {
  // ---- neck (START) ----
  bowtie: (L) => L.rows(11, 19, ['kk......kk', 'krkk..kkrk', 'krrrRRrrrk', 'krkk..kkrk', 'kk......kk']),
  garland: (L) => {
    for (let x = 6; x <= 25; x++) {
      const y = 19 + Math.round(4 * Math.sin(((x - 6) / 19) * Math.PI));
      L.put(x, y, x % 2 ? 'w' : 'm');
      L.put(x, y + 1, x % 2 ? 'p' : 'w');
    }
    L.rows(14, 25, ['.kyyk.', 'kyYYyk', '.kyyk.', '..mm..', '..mm..', '..m...']);
  },
  medal: (L) => L.rows(11, 19, ['rr......bb', '.rr....bb.', '..rr..bb..', '...rrbb...', '...kkkk...', '..kyyyyk..', '.kyYYYyyk.', '.kyYyYyyk.', '.kyYYYyyk.', '..kyyyyk..', '...kkkk...']),
  bell: (L) => L.rows(6, 19, ['kkkkkkkkkkkkkkkkkkkk', 'kmmmmmmmmmmmmmmmmmmk', 'kkkkkkkkkkkkkkkkkkkk', '........kyyk........', '.......kyqyyk.......', '.......kyyyYk.......', '......kkkkkkkk......', '.........kk.........']),

  // ---- pet (FIND THE SPIDER) ----
  spider: (L) => {
    L.line(-5, -16, -5, -9, 's');
    L.rows(-8, -8, ['k.kkk.k', '.kkkkk.', 'kkrkrkk', '.kkkkk.', 'k.k.k.k']);
  },
  bat: (L, f) =>
    L.rows(-12, -9, f ? ['...........', 'k...k.k...k', 'kk.kkkkk.kk', 'kkkkrkrkkkk', '.kkk.k.kkk.'] : ['k.........k', 'kk..k.k..kk', 'kkkkkkkkkkk', '.kkkrkrkkk.', '..k.....k..']),
  ghost: (L) => {
    L.rows(-11, -12, ['..kkkk..', '.kwwwwk.', 'kwwwwwwk', 'kwkwwkwk', 'kwwwwwwk', 'kwwkkwwk', 'kwwwwwwk', 'kwkwwkwk', 'kk.kk.kk']);
  },
  jack: (L) => L.rows(-11, -11, ['....G....', '..kkGkk..', '.koooook.', 'kooyoyook', 'koooooook', 'koyyyyyok', '.koooook.', '..kkkkk..']),

  // ---- eyes (ESCAPE ROOM) ----
  round: (L) => L.rows(9, 12, ['..kkk....kkk..', '.kw..kkkkw..k.', 'kk...k..k...kk', '.k...k..k...k.', '..kkk....kkk..']),
  shades: (L) => L.rows(7, 13, ['.kkkkkkk.kkkkkkk.', 'kkddwddkkkddwddkk', '.kdddddk.kdddddk.', '..kkkkk...kkkkk..'].map((r) => r)),
  mask: (L) => L.rows(6, 12, ['...kkkkkkkkkkkkkk...', '.kkddddddddddddddkk.', 'k.kdd...dddd...ddk.k', 'k.kdd...dddd...ddk.k', '...kkkkkkkkkkkkkk...']),
  glasses3d: (L) => L.rows(7, 13, ['.kkkkkkk.kkkkkkk.', 'kkrrrrrkkkcccccKk'.replace('K', 'k'), '.krrrrrk.kccccck.', '.kkkkkkk.kkkkkkk.']),

  // ---- right wing (แข่งรถเข็น) ----
  flag: (L) => {
    L.line(30, 4, 30, 25, 's');
    L.line(31, 4, 31, 25, 'S');
    L.fill(32, 4, 40, 10, (x, y) => ((x >> 1) + (y >> 1)) % 2 ? 'k' : 'w');
    L.outline();
  },
  trophy: (L) => L.rows(27, 15, ['kkkkkkkkkk', 'kwyyyyyyYk', 'kyyyyyyyYk', '.kyyyyyYk.', '..kyyyYk..', '...kyYk...', '....kk....', '...kYYk...', '..kkkkkk..', '..kRRRRk..', '..kkkkkk..']),
  wheel: (L) => {
    L.fill(26, 13, 38, 25, (x, y) => {
      const r = Math.hypot(x - 32, y - 19);
      if (r > 6.4) return null;
      if (r > 4.6) return 'd';
      if (r < 1.4) return 'y';
      return Math.abs(x - 32) < 1 || Math.abs(y - 19) < 1 ? 'S' : null;
    });
    L.outline();
  },
  balloon: (L) => {
    L.line(28, 23, 33, 6, 'w');
    L.fill(28, -6, 39, 6, (x, y) => (ell(x, y, 33.5, 0, 5.2, 6) ? 'm' : null));
    L.put(34, 7, 'm');
    L.outline();
    L.put(31, -1, 'k');
    L.put(35, -1, 'k');
    L.put(32, 2, 'k'), L.put(33, 2, 'k'), L.put(34, 2, 'k');
    L.put(30, -4, 'p');
  },

  // ---- hat (PUMPKIN HAUNT) ----
  witch: (L) => {
    for (let y = -6; y <= 7; y++) {
      const k = (y + 6) / 13;
      const half = 0.6 + k * 6;
      const c = 18 - k * 2.5;
      for (let x = Math.floor(c - half); x <= Math.ceil(c + half); x++) if (Math.abs(x - c) <= half) L.put(x, y, y === 4 || y === 5 ? 'm' : 'd');
    }
    L.put(19, -7, 'd');
    L.put(20, -7, 'd');
    L.fill(4, 8, 27, 9, () => 'd');
    L.outline();
    L.put(15, 4, 'y'), L.put(16, 4, 'y'), L.put(15, 5, 'y'), L.put(16, 5, 'y');
  },
  pumpkinhat: (L) => {
    L.fill(6, -1, 25, 10, (x, y) => (ell(x, y, 15.5, 4.5, 9.6, 6) ? (Math.abs(x - 15.5) % 5 > 3.5 ? 'O' : 'o') : null));
    L.fill(14, -5, 17, -2, (x, y) => (x <= 16 ? 'G' : null));
    L.put(17, -5, 'g'), L.put(18, -6, 'g');
    L.outline();
    L.put(12, 3, 'y'), L.put(19, 3, 'y'), L.put(12, 2, 'y'), L.put(19, 2, 'y');
    for (let x = 12; x <= 19; x++) L.put(x, 7, 'y');
    L.put(14, 6, 'y'), L.put(17, 6, 'y');
  },
  hardhat: (L) => {
    L.fill(7, 0, 24, 8, (x, y) => (ell(x, y, 15.5, 8.5, 8.6, 8) ? (x < 12 && y < 5 ? 'q' : 'y') : null));
    L.fill(4, 8, 27, 9, () => 'Y');
    L.fill(14, 3, 17, 6, (x, y) => (y === 3 || y === 6 || x === 14 || x === 17 ? 's' : 'w'));
    L.outline();
    L.put(15, 0, 'Y'), L.put(16, 0, 'Y');
  },
  crown: (L) => {
    L.fill(9, 0, 22, 8, (x, y) => {
      if (y >= 5) return y === 6 ? 'r' : 'y';
      const peaks = [9.5, 15.5, 21.5];
      return peaks.some((p) => Math.abs(x - p) <= (y - 0) * 0.9) ? 'y' : null;
    });
    L.outline();
    L.put(15, 6, 'm'), L.put(16, 6, 'm'), L.put(11, 6, 'c'), L.put(20, 6, 'c');
    L.put(10, 1, 'w'), L.put(15, 1, 'w'), L.put(21, 1, 'w');
  },

  // ---- aura (สวดมนต์หน้าศพ) ----
  batwings: {
    back: true,
    draw: (L, f) => {
      const up = f ? -2 : 0;
      for (const side of [-1, 1]) {
        const ax = side < 0 ? 4 : 27;
        L.fill(ax - 14, 6 + up, ax + 14, 26, (x, y) => {
          const dx = (x - ax) * side;
          if (dx < 0 || dx > 13) return null;
          const top = 10 + up + dx * 0.15 - (dx > 9 ? (dx - 9) * 1.2 : 0);
          const bot = 22 - Math.abs(Math.sin(dx * 0.75)) * 4 - dx * 0.25;
          if (y < top || y > bot) return null;
          return dx % 4 === 2 && y > top + 1 ? 'M' : 'D';
        });
      }
      L.outline();
    },
  },
  angelwings: {
    back: true,
    draw: (L, f) => {
      const up = f ? -1 : 0;
      for (const side of [-1, 1]) {
        const ax = side < 0 ? 5 : 26;
        L.fill(ax - 14, 4, ax + 14, 26, (x, y) => {
          const dx = (x - ax) * side;
          if (dx < 0 || dx > 12) return null;
          const top = 9 + up - dx * 0.35;
          const bot = 23 - dx * 0.6 + (dx % 3 === 0 ? 1 : 0);
          if (y < top || y > bot) return null;
          return (y - Math.round(top)) % 4 === 3 ? 'l' : 'w';
        });
      }
      L.outline();
    },
  },
  halo: {
    back: true,
    draw: (L) => {
      L.fill(4, -6, 27, 1, (x, y) => {
        const r = ((x - 15.5) / 10.5) ** 2 + ((y + 2.5) / 3) ** 2;
        return r <= 1 && r >= 0.42 ? 'y' : null;
      });
      L.outline();
    },
  },
  wisps: {
    back: false,
    draw: (L, f) => {
      const flame = (x, y, a) => {
        L.rows(x, y + (a ? 1 : 0), a ? ['..c..', '.ccL.', '.cLc.', 'ccLLc', '.ccc.'] : ['.c...', '..cc.', '.cLc.', 'ccLLc', '.ccc.']);
      };
      flame(-8, 2, f);
      flame(33, 12, !f);
      flame(-6, 20, !f);
    },
  },

  // ---- hair (WORKSHOP) ----
  bow: (L) => L.rows(4, 2, ['kk...kk', 'kmk.kmk', 'kmmkmmk', 'kmmMmmk', 'kmmkmmk', 'kmk.kmk', 'kk...kk']),
  flower: (L) => L.rows(3, 7, ['.kk.kk.', 'kwwkwwk', 'kwwywwk', '.kyyyk.', 'kwwywwk', 'kwwkwwk', '.kk.kk.']),
  mohawk: {
    under: true, // a hat goes on top of it
    draw: (L) => {
      for (let x = 12; x <= 19; x++) {
        const h = 6 + (x % 2 ? 2 : 0) - Math.abs(x - 15.5) * 0.5;
        for (let y = Math.round(9 - h); y <= 9; y++) L.put(x, y, y < 9 - h + 3 ? 'g' : 'm');
      }
      L.outline();
    },
  },
  braids: (L) => {
    for (const bx of [3, 26]) {
      for (let y = 10; y <= 24; y++) L.put(bx + ((y >> 1) % 2), y, 't'), L.put(bx + 1 - ((y >> 1) % 2), y, 'N');
      L.put(bx, 25, 'm'), L.put(bx + 1, 25, 'm');
      L.put(bx, 26, 't'), L.put(bx + 1, 26, 't');
    }
    L.outline();
  },

  // ---- left wing (LAAN FOOD) ----
  lollipop: (L) => {
    L.line(4, 25, -1, 12, 'w');
    L.fill(-7, 2, 5, 13, (x, y) => {
      const r = Math.hypot(x + 1, y - 8);
      if (r > 5.3) return null;
      return Math.floor(r * 1.4 + Math.atan2(y - 8, x + 1) * 1.6) % 2 ? 'm' : 'w';
    });
    L.outline();
  },
  icecream: (L) => {
    L.fill(-5, 13, 3, 27, (x, y) => (y >= 18 && Math.abs(x + 1) <= (27 - y) * 0.45 ? ((x + y) % 3 ? 't' : 'N') : null));
    L.fill(-6, 9, 4, 19, (x, y) => (ell(x, y, -1, 15, 5.2, 4.2) ? (x < -3 && y < 14 ? 'w' : 'p') : null));
    L.fill(-3, 6, 1, 10, (x, y) => (ell(x, y, -1, 8, 1.6, 1.6) ? 'r' : null));
    L.outline();
  },
  skewer: (L) => {
    L.line(4, 27, -5, 3, 'n');
    for (const [x, y] of [[-3, 8], [-1, 13], [1, 18]]) L.fill(x - 3, y - 3, x + 3, y + 3, (xx, yy) => (Math.hypot(xx - x, yy - y) <= 2.8 ? (xx < x && yy < y ? 'N' : 'n') : null));
    L.outline();
  },
  popcorn: (L) => {
    L.fill(-7, 17, 4, 30, (x, y) => (Math.abs(x + 1.5) <= 4.5 - (30 - y) * 0.05 && y >= 19 ? ((x + 7) >> 1) % 2 ? 'r' : 'w' : null));
    L.fill(-8, 13, 5, 19, (x, y) => ([[-5, 16], [-2, 15], [1, 16], [-4, 18], [0, 18], [2, 18], [-7, 18]].some(([cx, cy]) => Math.hypot(x - cx, y - cy) <= 2) ? ((x * 3 + y) % 4 ? 'w' : 'q') : null));
    L.outline();
  },
};

const cache = new Map();
/** The layer canvas of one item (frame 0/1 for the animated ones). */
function itemCanvas(id, f = 0) {
  const key = id + f;
  if (!cache.has(key)) {
    const def = ITEM[id];
    const L = layer();
    (typeof def === 'function' ? def : def.draw)(L, f);
    cache.set(key, L.canvas());
  }
  return cache.get(key);
}
const isBack = (id) => typeof ITEM[id] === 'object' && ITEM[id].back;
const isUnder = (id) => typeof ITEM[id] === 'object' && ITEM[id].under;
const ANIM = new Set(['bat', 'batwings', 'angelwings', 'wisps']);
const PETS = new Set(['spider', 'bat', 'ghost', 'jack']);
// front order: neck, eyes, hair under a hat, hat, hair over it, things in the wings, the pet
const ORDER = ['neck', 'eyes', 'hair-under', 'hat', 'hair', 'aura', 'right', 'left', 'pet'];

/**
 * Draw the player's bird wearing its items.
 * items: [{ id, slot }] (from loot.js); sprite: the bird's 32 x 36 frame; feet at (cx, feet).
 */
export function drawDressed(ctx, sprite, items, cx, feet, s = 1, t = 0) {
  const f = Math.floor(t * 3) % 2;
  const x0 = Math.round(cx - 16 * s);
  const y0 = Math.round(feet - 36 * s);
  const lay = (id, dy = 0) => ctx.drawImage(itemCanvas(id, ANIM.has(id) ? f : 0), x0 - OX * s, y0 - OY * s + dy * s, LW * s, LH * s);
  ctx.imageSmoothingEnabled = false;
  items.filter((it) => isBack(it.id)).forEach((it) => lay(it.id));
  if (sprite) ctx.drawImage(sprite, x0, y0, 32 * s, 36 * s);
  const front = items.filter((it) => !isBack(it.id));
  const rank = (it) => ORDER.indexOf(it.slot === 'hair' && isUnder(it.id) ? 'hair-under' : it.slot);
  front.sort((a, b) => rank(a) - rank(b)).forEach((it) => lay(it.id, PETS.has(it.id) ? Math.round(Math.sin(t * 3) * 1.5) : 0));
}

/** One item alone, for the reveal (fitted in a box). */
export function itemIcon(id) {
  return itemCanvas(id, 0);
}

export const ITEM_IDS = Object.keys(ITEM);
export { COL };

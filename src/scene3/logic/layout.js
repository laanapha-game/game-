// Scene 3 map: the event site (the owner's hand-drawn L-shaped plot), pure data, no Phaser.
//
// Everything is authored in BASE units on the prototype's 432 x 640 grid (tile = 12
// units; column c starts at x = 12c, row r at y = 16 + 12r). spread() moves positions
// apart by LS around the plot's top-left corner; sizes never change. So:
//   - regions (ground, fences, walls, goal zones) are rectangles whose corners spread:
//     they stretch, while fences and walls keep a constant thickness (FENCE);
//   - objects (stalls, tables, houses, trees, characters ...) are placed by their
//     anchor (bottom centre, the "feet") and keep their size; every object's collision
//     block is derived from that same anchor, so a block can never drift from its sprite.
// World units are map units (1 unit = 3 design px at full zoom).
import { LS, SPREAD_ORIGIN as O, BASE_W, BASE_H, TABLE_GRID } from '../config.js';

export const sx = (x) => (x < O.x ? x : O.x + (x - O.x) * LS);
export const sy = (y) => (y < O.y ? y : O.y + (y - O.y) * LS);
export const spread = (p) => ({ x: sx(p.x), y: sy(p.y) });
export const spreadRect = ([x0, y0, x1, y1]) => [sx(x0), sy(y0), sx(x1), sy(y1)];
export const WORLD = { w: Math.ceil(sx(BASE_W)), h: Math.ceil(sy(BASE_H)) };
export const FENCE = 4; // fence and wall thickness, world units (never spread)

const col = (c) => c * 12;
const row = (r) => 16 + r * 12;

// ---------------------------------------------------------------- regions (base rects)
export const BASE = {
  hall: [col(2), row(1), col(24), row(31)], // columns 2-23, rows 1-30
  river: [col(2), row(4), col(24), row(5)], // row 4, full hall width
  lawn: [col(2), row(5), col(24), row(11)],
  path: [col(2), row(11), col(24), row(12)],
  courtyard: [col(2), row(12), col(24), row(28)],
  southLawn: [col(2), row(28), col(24), row(31)],
  lane: [col(19), row(31), col(24), row(46)], // columns 19-23, flush with the hall's east wall
  soi: [0, row(46), BASE_W, row(48)],
  southTrees: [0, row(48), BASE_W, BASE_H],
  town: [col(24), row(1), BASE_W, row(46)],
  forest: [0, row(31), col(19), row(46)],
  westStrip: [0, row(1), col(2), row(31)],
  north: [0, 0, BASE_W, row(1)],
};
export const R = Object.fromEntries(Object.entries(BASE).map(([k, r]) => [k, spreadRect(r)]));

// Where a character can stand (feet), before objects: south bank of the river to the
// hall's south fence, the lane between its tin walls, and the soi.
export const WALKABLE = [
  [R.hall[0] + FENCE, R.river[3], R.hall[2] - FENCE, R.hall[3] - FENCE],
  [R.lane[0] + FENCE, R.hall[3] - FENCE - 1, R.lane[2] - FENCE, R.soi[1] + 1], // overlaps both ends: no seam
  [R.soi[0], R.soi[1], R.soi[2], R.soi[3]],
];

// Fences and walls (drawn on the ground, constant thickness). The hall's south fence
// has the lane mouth as its only opening; the lane's east wall continues the hall's east fence.
export const FENCES = [
  { kind: 'fence', rect: [R.hall[0], R.hall[1], R.hall[2], R.hall[1] + FENCE] }, // north
  { kind: 'fence', rect: [R.hall[0], R.hall[1], R.hall[0] + FENCE, R.hall[3]] }, // west
  { kind: 'fence', rect: [R.hall[2] - FENCE, R.hall[1], R.hall[2], R.hall[3]] }, // east
  { kind: 'fence', rect: [R.hall[0], R.hall[3] - FENCE, R.lane[0] + FENCE, R.hall[3]] }, // south, west of the lane
  { kind: 'tin', rect: [R.lane[0], R.hall[3], R.lane[0] + FENCE, R.lane[3]] }, // lane west wall
  { kind: 'tin', rect: [R.lane[2] - FENCE, R.hall[3], R.lane[2], R.lane[3]] }, // lane east wall
];

// ---------------------------------------------------------------- objects
// Sprite sizes in world units (1 px per unit textures, from tools/scene3_art.py);
// characters are sized in design px (see config CHAR_PX_PER_UNIT).
export const SIZES = {
  guesthouse: [42, 34], // sticker style: ~38 x 30 plus the die-cut border
  carport: [48, 40],
  stall: [26, 30], // counter top at row 22 (rim included)
  desk: [32, 16],
  table: [22, 18], // table with four stools
  tree: [18, 26],
  treeBig: [26, 36],
  treeDark: [18, 26],
  bush: [10, 7],
  townHouse: [40, 34],
  haunted: [62, 30],
  screen: [44, 36],
  deck: [48, 18],
  backdrop: [48, 22],
  speaker: [8, 14],
  lights: [56, 10],
  haybale: [10, 6],
  ghostStall: [64 / 3, 64 / 3], // scene 2 stalls (64 x 64 design px) at their scene 2 size next to the 32 px characters
  sign: [16, 26],
};
const STALL_COUNTER = 22; // counter top row inside the stall sprite (rim included)
const STALL_STAFF_DY = SIZES.stall[1] - STALL_COUNTER; // staff feet this far above the stall's feet

let nextId = 0;
function obj(kind, sprite, base, extra = {}) {
  const p = spread(base);
  const [w, h] = SIZES[extra.size ?? kind] ?? [0, 0];
  const o = { id: `${kind}${nextId++}`, kind, sprite, x: p.x, y: p.y, w, h, base, ...extra };
  // Collision block from the anchor: a band at the base of the sprite.
  if (o.blockWD) {
    const [bw, bd] = o.blockWD;
    o.block = [o.x - bw / 2, o.y - bd, o.x + bw / 2, o.y];
  }
  return o;
}

export const OBJECTS = [];
const add = (o) => (OBJECTS.push(o), o);

// Haunted house on the far bank (bank row 3, just above the river). Visible, unreachable.
export const HOUSE_BASE = { x: 156, y: row(4) - 2 };
add(obj('haunted', 'haunted_house', HOUSE_BASE));
// Grove: 16 trees placed relative to the house, bushes along the bank, a feature tree.
const groveTrees = [
  [-120, 0], [-104, -4], [-88, 0], [-72, -6], [-56, 0], [-96, -14], [-64, -16], [-42, -8],
  [60, 0], [76, -6], [92, 0], [108, -4], [124, 0], [70, -16], [100, -14], [-130, -12],
];
for (const [dx, dy] of groveTrees) {
  const b = { x: HOUSE_BASE.x + dx, y: HOUSE_BASE.y + dy };
  if (b.x > col(2) + 6 && b.x < col(24) - 6) add(obj('tree', 'tree', b));
}
add(obj('treeBig', 'tree_big', { x: HOUSE_BASE.x + 42, y: HOUSE_BASE.y }, { size: 'treeBig' })); // feature tree next to the house
for (const x of [272, 280]) add(obj('tree', 'tree', { x, y: row(3) }));
for (let i = 0; i < 21; i++) {
  const x = col(2) + 8 + i * 12.4;
  if (Math.abs(x - HOUSE_BASE.x) < 26) continue; // keep the house clearly visible
  add(obj('bush', i % 3 === 0 ? 'bush_flower' : 'bush', { x, y: row(4) - 0.5 }));
}

// Lawn: 24 bean bags (rows of 7, 7, 5, 5), flat and walkable; the outdoor screen in the
// north-east corner with two poles and a light cone toward the seats.
export const BEANBAGS = [];
[[7, 92], [7, 102], [5, 112], [5, 122]].forEach(([n, y], r) => {
  const x0 = n === 7 ? 44 : 60;
  const step = n === 7 ? 20 : 24;
  for (let i = 0; i < n; i++) BEANBAGS.push({ ...spread({ x: x0 + i * step, y }), colour: (i + r) % 2 ? 'magenta' : 'yellow' });
});
export const SCREEN = add(obj('screen', 'screen', { x: 258, y: 104 }, { blockWD: [6, 3] }));
export const LIGHT_CONE = { from: { x: SCREEN.x - 12, y: SCREEN.y - 20 }, to: spread({ x: 120, y: 112 }) };

// Courtyard: five guesthouses (5 at the top down to 1), one carport beside 5 and 4,
// tables, the band corner and unit 6 on free paved ground below it.
export const GUESTHOUSES = [5, 4, 3, 2, 1].map((n, i) =>
  add(obj('guesthouse', `guesthouse_${n}`, { x: 46, y: 196 + i * 33 }, { blockWD: [40, 16], number: n })),
);
add(obj('carport', 'carport', { x: 88, y: 233 }, { blockWD: [46, 18] }));
export const TABLES = [];
for (let r = 0; r < TABLE_GRID.rows; r++)
  for (let c = 0; c < TABLE_GRID.cols; c++) TABLES.push(add(obj('table', 'table', { x: 125 + c * 28, y: 186 + r * 28 }, { blockWD: [20, 10] })));
export const BAND_BASE = { x: 262, y: 206 };
export const BAND = (() => {
  const deck = add(obj('deck', 'band_deck', BAND_BASE, { blockWD: [48, 12] }));
  add(obj('backdrop', 'band_backdrop', { x: BAND_BASE.x, y: BAND_BASE.y - 6 }, { depthBias: -0.5 }));
  add(obj('speaker', 'band_speaker', { x: BAND_BASE.x - 19, y: BAND_BASE.y - 4 }));
  add(obj('speaker', 'band_speaker', { x: BAND_BASE.x + 19, y: BAND_BASE.y - 4 }));
  add(obj('lights', 'band_lights', { x: BAND_BASE.x, y: BAND_BASE.y - 20 }, { depthBias: 30 }));
  const rug = { ...spread({ x: BAND_BASE.x, y: BAND_BASE.y + 9 }), w: 30, h: 12 }; // flat, walkable
  for (const [dx, dy] of [[-15, 5], [15, 5], [-12, 15], [12, 15]]) add(obj('haybale', 'haybale', { x: BAND_BASE.x + dx, y: BAND_BASE.y + dy }, { blockWD: [10, 4] }));
  return { deck, rug, stageY: deck.y - 7 }; // musicians stand on the deck
})();
add(obj('guesthouse', 'guesthouse_6', { x: 263, y: 278 }, { blockWD: [40, 16], number: 6 }));

// South lawn: the shop row (mini-mart, drinks, pizza, photo booth, Rotary) and the
// registration desk above the lane mouth.
export const SHOPS = ['bag', 'cup', 'pizza', 'camera', 'gear'].map((icon, i) =>
  add(obj('stall', `stall_${icon}`, { x: 50 + i * 30, y: 369 }, { blockWD: [26, 12], icon, staffDy: STALL_STAFF_DY, layered: true })),
);
export const DESK = add(obj('desk', 'desk', { x: 270, y: 373 }, { blockWD: [30, 8] }));

// Lane: five stalls against its east wall, one interaction (five touch points in front).
export const LANE_STALLS = [0, 1, 2, 3, 4].map((i) =>
  add(obj('stall', `stall_lane${i}`, { x: 275, y: 423 + i * 30 }, { blockWD: [26, 12], staffDy: STALL_STAFF_DY, layered: true })),
);
export const LANE_TOUCH = LANE_STALLS.map((s) => ({ x: s.x - 26, y: s.y + 2 }));

// The soi: ghost stalls (scene 2 sprites) right of the entrance, the COZY sign at the
// west corner of the lane mouth.
export const GHOST_STALLS = [1, 2, 3, 4, 5].map((n, i) =>
  add(obj('ghostStall', `ghost_stall_${n}`, { x: 307 + i * 26.6, y: row(46) + 1 }, { blockWD: [20, 3], number: n })),
);
add(obj('sign', 'cozy_sign', { x: col(19) - 5, y: row(46) - 1 }, { blockWD: [3, 2] }));

// Surroundings: the town (three columns of houses), forest, far tree line, trees south of the soi.
const TOWN_ROOFS = ['A59F98', 'C0897E', 'B4C9D4', '8CCFBF', 'A8805F'];
let k = 0;
for (const x of [310, 358, 406])
  for (let y = 70; y <= row(45); y += 46) add(obj('townHouse', `town_${TOWN_ROOFS[k++ % TOWN_ROOFS.length]}`, { x, y }));
const jitter = (i) => ((i * 7919) % 13) - 6;
let t = 0;
for (let y = row(32); y <= row(45); y += 15)
  for (let x = 8; x <= col(19) - 8; x += 14, t++) add(obj('treeDark', 'tree_dark', { x: x + jitter(t) / 2, y: y + jitter(t + 3) / 3 }, { size: 'treeDark' }));
for (let y = row(2); y <= row(30); y += 16) add(obj('treeDark', 'tree_dark', { x: 10, y }, { size: 'treeDark' }));
for (let x = 6; x <= BASE_W; x += 14, t++) add(obj('treeDark', 'tree', { x: x + jitter(t) / 2, y: row(49) + jitter(t) / 3 }, { size: 'tree' }));

// ---------------------------------------------------------------- goal zones (base rects, spread)
export const ZONES = {
  lane: spreadRect([col(19), row(33), col(24), row(45)]),
  shops: spreadRect([col(2), row(28), 186, row(31)]),
  desk: spreadRect([col(21), row(29) + 4, col(24), row(31) + 6]),
  tables: spreadRect([110, row(13) + 8, 222, row(25) + 6]),
  cinema: spreadRect([col(2), 86, col(24), row(11)]),
  haunted: spreadRect([HOUSE_BASE.x - 40, row(5), HOUSE_BASE.x + 40, 86]),
};
export const EXIT = { rect: [WORLD.w - 14, R.soi[1], WORLD.w, R.soi[3]] };

// ---------------------------------------------------------------- start, welcome, guides
export const START = { x: WORLD.w - 40, y: R.soi[1] + 22 };
export const WELCOME = { from: { x: START.x - 90, y: START.y }, stopDistance: 17 };
// Guide arrows: along the soi, up the lane, to the registration desk.
export const GUIDE_PATH = [START, { x: (R.lane[0] + R.lane[2]) / 2, y: START.y }, { x: (R.lane[0] + R.lane[2]) / 2, y: R.hall[3] + 10 }, { x: DESK.x - 22, y: DESK.y + 10 }];
export const EXIT_ARROW = { x: WORLD.w - 10, y: START.y - 14 };

// ---------------------------------------------------------------- collision
const blocks = OBJECTS.filter((o) => o.block).map((o) => o.block);
const inRect = (x, y, [x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1;

/** True if a map point can be stood on (ignores the player box). */
export function walkablePoint(x, y) {
  if (!WALKABLE.some((r) => inRect(x, y, r))) return false;
  return !blocks.some((b) => inRect(x, y, b));
}

// 1-unit occupancy grid, built once.
const GW = WORLD.w;
const GH = WORLD.h;
let grid = null;
function occupancy() {
  if (grid) return grid;
  grid = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) grid[y * GW + x] = walkablePoint(x + 0.5, y + 0.5) ? 0 : 1;
  return grid;
}

/** The player's collision box (w x h at the feet, centred on x, bottom at y) is free. */
export function boxFree(x, y, box = { w: 8, h: 4 }) {
  const g = occupancy();
  const x0 = Math.floor(x - box.w / 2);
  const x1 = Math.ceil(x + box.w / 2);
  const y0 = Math.floor(y - box.h);
  const y1 = Math.ceil(y);
  if (x0 < 0 || y0 < 0 || x1 > GW || y1 > GH) return false;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) if (g[yy * GW + xx]) return false;
  return true;
}

export const inZone = (p, rect) => inRect(p.x, p.y, rect);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

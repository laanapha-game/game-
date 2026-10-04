// Jayimpacts as a chibi human (scene 3 spec 5.1; owner: "keep him human")
//   -> src/assets/art/characters/jayimpacts_side.png / _front.png + jayimpacts.json
//
// Same cell and conventions as the eight bird costumes: 32 x 36 frames, feet on row
// 35, side view faces LEFT, 1 px black outline, flat colours with one highlight, the
// same json layout as characters.json. Look taken from the Drive art
// (sprite_jayimpacts_character / avatar): spiky black hair swept to one side, calm
// eyes and brows, houndstooth jacket over a black tee, belt, cream-white trousers,
// dark shoes, small white wings with yellow tips, and a small yellow halo ring
// (a plain ring: the Drive halo is gear-shaped, read as the Rotary wheel, not drawn).
//
// Palette: brand colours plus two skin tones (a human needs skin; the brand palette
// has none). Skin sampled from the Drive avatar (#F8C898), shade one step darker.
//
// Frames: side idle0 idle1 walk0-3 wave0 wave1, front idle0 idle1 blink wave0 wave1.
// Wave = one arm raised (opening welcome).
//
//   node tools/jayimpacts-sprite.mjs [--sheet out.png]   (--sheet: 1x contact strip)
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RENDER_SCALE as R } from '../src/config/constants.js';

const OUT = 'src/assets/art/characters';
const ID = 'jayimpacts';
export const JAY_FRAMES = {
  side: ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3', 'wave0', 'wave1'],
  front: ['idle0', 'idle1', 'blink', 'wave0', 'wave1'],
};
const ANIM = {
  side: { idle: [0, 1], walk: [2, 3, 4, 5], wave: [6, 7] },
  front: { idle: [0, 1], blink: [2], wave: [3, 4] },
};
export const BRAND = ['#DE5238', '#000000', '#8F2F20', '#4A1A14', '#FFFF4F', '#F02DF0', '#FFFFFF'];
export const SKIN = ['#F8C898', '#DE9C70'];
const K = '#000000', W = '#FFFFFF', Y = '#FFFF4F', DR = '#8F2F20', DDR = '#4A1A14', S = SKIN[0], SD = SKIN[1];
const CW = 32, CH = 36;

// ---------- a tiny pixel painter: parts drawn back to front, each with its own outline ----------
function canvas() {
  const g = Array.from({ length: CH }, () => new Array(CW).fill(null));
  const inside = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH;
  const P = {
    g,
    get: (x, y) => (inside(x, y) ? g[y][x] : null),
    px(x, y, c) { if (inside(x, y)) g[y][x] = c; },
    /** Paint a part given as a set of pixels with a colour function, then outline it in black. */
    // edge: outline only against empty pixels (hair over the face has no line under it)
    part(pts, col, { outline = true, edge = false } = {}) {
      const set = new Set(pts.map(([x, y]) => `${x},${y}`));
      if (outline)
        for (const [x, y] of pts)
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            if (!set.has(`${x + dx},${y + dy}`) && y + dy < CH && (!edge || P.get(x + dx, y + dy) === null)) P.px(x + dx, y + dy, K);
      for (const [x, y] of pts) P.px(x, y, typeof col === 'function' ? col(x, y) : col);
    },
  };
  return P;
}
const ell = (cx, cy, rx, ry) => {
  const out = [];
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) out.push([x, y]);
  return out;
};
const rect = (x0, y0, w, h) => {
  const out = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push([x, y]);
  return out;
};
/** Rows given as [y, x0, x1] spans. */
const spans = (rows) => rows.flatMap(([y, a, b]) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, y]));
/** A thick line (an arm): 2 px wide from (x0,y0) to (x1,y1). */
const limb = (x0, y0, x1, y1, w = 2) => {
  const out = [], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
    for (let a = 0; a < w; a++) out.push([x + a, y]);
  }
  return out;
};
const check = (x, y) => (((x + y) & 1) ? K : W); // houndstooth read at 1 px
const halo = (P, cx, cy) => {
  const pts = ell(cx, cy, 4.6, 1.6).filter(([x, y]) => ((x - cx) / 3.2) ** 2 + ((y - cy) / 0.7) ** 2 > 1);
  P.part(pts, Y);
};
const wing = (P, side, x0, y0) => {
  // side -1 = sticks out to the left, +1 = right; feathers fan down and out
  const m = (dx) => x0 + side * dx;
  const rows = [[0, 0, 2], [1, 0, 4], [2, 1, 5], [3, 2, 5], [4, 3, 5]];
  const pts = rows.flatMap(([dy, a, b]) => Array.from({ length: b - a + 1 }, (_, i) => [m(a + i), y0 + dy]));
  P.part(pts, (x, y) => (Math.abs(x - x0) >= 4 && y >= y0 + 2 ? Y : W));
};

// ---------- front view ----------
// Chibi proportions: head rows 5-19 (about half his height), torso 20-28, legs 29-33,
// shoes 34-35. Hair covers only the top of the head so the face reads at 1x.
function front(frame) {
  const P = canvas();
  const hb = frame === 'idle1' ? 1 : 0; // breathing: head and halo down 1
  const wave = frame.startsWith('wave') ? (frame === 'wave1' ? 1 : 0) : -1;
  wing(P, -1, 8, 20);
  wing(P, 1, 23, 20);
  // trousers and shoes
  P.part([...rect(10, 28, 12, 1), ...rect(10, 29, 5, 5), ...rect(17, 29, 5, 5)], W);
  P.part([...rect(9, 34, 6, 2), ...rect(17, 34, 6, 2)], DDR);
  // torso: open houndstooth jacket over a black tee, belt
  const torso = spans([[20, 11, 20], ...[21, 22, 23, 24, 25, 26, 27].map((y) => [y, 10, 21])]);
  P.part(torso, (x, y) => {
    if (y === 27 && x >= 13 && x <= 18) return x === 15 || x === 16 ? Y : K; // belt + buckle
    if (x >= 14 && x <= 17) return K;                                        // tee
    if ((x === 13 || x === 18) && y <= 23) return W;                          // lapels
    return check(x, y);
  });
  // arms: his left always down; his right down or waving
  P.part(rect(8, 21, 2, 6), check);
  P.part(rect(8, 27, 2, 2), S);
  if (wave < 0) {
    P.part(rect(22, 21, 2, 6), check);
    P.part(rect(22, 27, 2, 2), S);
  }
  // head
  const hy = 12 + hb;
  P.part([...ell(15.5, hy, 8, 7.5), [7, hy + 1], [7, hy + 2], [24, hy + 1], [24, hy + 2]], S);
  // hair: crown, spikes, sides, fringe swept to his right (viewer's left)
  const hair = [
    ...ell(15.5, hy - 4, 8.5, 4).filter(([, y]) => y <= hy - 3),
    ...spans([[hy - 9, 11, 11], [hy - 9, 15, 15], [hy - 9, 19, 19], [hy - 8, 9, 22]]),
    ...spans([[hy - 2, 7, 13], [hy - 1, 7, 10], [hy, 7, 8], [hy - 2, 21, 24], [hy - 1, 22, 24], [hy, 23, 24]]),
  ];
  P.part(hair, (x, y) => ((x === 12 && y === hy - 6) || (x === 19 && y === hy - 5) ? DDR : K), { edge: true });
  // face
  const ey = hy + 1;
  if (frame === 'blink') { P.part([...rect(11, ey + 1, 2, 1), ...rect(19, ey + 1, 2, 1)], K, { outline: false }); }
  else { P.part([...rect(11, ey, 2, 2), ...rect(19, ey, 2, 2)], K, { outline: false }); P.px(11, ey, W); P.px(19, ey, W); }
  P.part([...rect(11, ey - 2, 3, 1), ...rect(18, ey - 2, 3, 1)], K, { outline: false }); // brows
  P.part([[15, ey + 4], [16, ey + 4]], DR, { outline: false });                           // calm smile
  P.part([[10, ey + 3], [21, ey + 3]], SD, { outline: false });                           // cheeks
  if (wave >= 0) {
    P.part(limb(22, 22, 24 + wave, 15), check);
    P.part(rect(24 + wave, 12, 3, 3), S);
  }
  halo(P, 15.5, 2 + hb);
  return P.g;
}

// ---------- side view (faces left) ----------
const SIDE_LEGS = {
  idle0: { back: 16, front: 12, lift: 0, bob: 0 },
  idle1: { back: 16, front: 12, lift: 0, bob: 0, hb: 1 },
  walk0: { back: 18, front: 10, lift: 0, bob: 0 },
  walk1: { back: 15, front: 13, lift: 1, bob: 1 },
  walk2: { back: 10, front: 18, lift: 0, bob: 0 },
  walk3: { back: 13, front: 15, lift: 1, bob: 1 },
  wave0: { back: 16, front: 12, lift: 0, bob: 0 },
  wave1: { back: 16, front: 12, lift: 0, bob: 0 },
};
function side(frame) {
  const P = canvas();
  const L = SIDE_LEGS[frame];
  const up = L.bob, hb = L.hb ?? 0;
  const wave = frame.startsWith('wave') ? (frame === 'wave1' ? 1 : 0) : -1;
  wing(P, 1, 19, 19 - up);
  // legs: the back one first; a lifted foot is 1 px up
  const leg = (x, lift) => {
    P.part(rect(x, 28 - up, 4, 6 + up - lift), W);
    P.part(rect(x - 2, 34 - lift, 6, 2), DDR);
  };
  leg(L.back, L.lift);
  leg(L.front, 0);
  // torso
  const ty = 20 - up;
  const torso = spans([[ty, 11, 19], ...[1, 2, 3, 4, 5, 6, 7].map((d) => [ty + d, 10, 20]), [ty + 8, 10, 20]]);
  P.part(torso, (x, y) => {
    if (y === ty + 7) return x <= 12 ? Y : K;  // belt, buckle at the front
    if (y === ty + 8) return W;
    if (x <= 11) return K;                     // tee at the front
    if (x === 12 && y <= ty + 3) return W;     // lapel
    return check(x, y);
  });
  if (wave < 0) {
    P.part(rect(14, ty + 1, 3, 6), check);
    P.part(rect(14, ty + 7, 3, 2), S);
  }
  // head
  const hy = 12 - up + hb;
  P.part([...ell(13.5, hy, 7.5, 7.5), [5, hy + 1], [5, hy + 2]], S); // nose at the front
  const hair = [
    ...ell(14, hy - 4, 8, 4).filter(([, y]) => y <= hy - 3),
    ...rect(15, hy - 3, 7, 7).filter(([x, y]) => ((x - 13.5) / 7.5) ** 2 + ((y - hy) / 7.5) ** 2 <= 1),
    ...spans([[hy - 9, 11, 11], [hy - 9, 15, 15], [hy - 8, 19, 19], [hy - 8, 8, 20]]),
    ...spans([[hy - 2, 6, 11], [hy - 1, 6, 8]]),
  ];
  P.part(hair, (x, y) => ((x === 12 && y === hy - 6) || (x === 18 && y === hy - 2) ? DDR : K), { edge: true });
  P.part([[16, hy + 1], [16, hy + 2], [17, hy + 1], [17, hy + 2]], S); // ear
  const ey = hy + 1;
  P.part(rect(8, ey, 2, 2), K, { outline: false });
  P.px(8, ey, W);
  P.part(rect(7, ey - 2, 4, 1), K, { outline: false }); // brow
  P.part([[8, ey + 4], [9, ey + 4]], DR, { outline: false });
  P.part([[11, ey + 3]], SD, { outline: false });
  if (wave >= 0) {
    P.part(limb(12, ty + 2, 6, ty - 3 - wave, 3), check);
    P.part(rect(3 + wave, ty - 7 - wave, 3, 3), S);
  }
  halo(P, 14, 2 - up + hb);
  return P.g;
}

// ---------- output ----------
const toPx = (g) => {
  const px = new Uint8Array(CW * CH * 4);
  g.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    const i = (y * CW + x) * 4;
    px[i] = parseInt(c.slice(1, 3), 16); px[i + 1] = parseInt(c.slice(3, 5), 16); px[i + 2] = parseInt(c.slice(5, 7), 16); px[i + 3] = 255;
  }));
  return px;
};
export function renderJayimpacts() {
  return {
    side: JAY_FRAMES.side.map((f) => ({ name: f, px: toPx(side(f)) })),
    front: JAY_FRAMES.front.map((f) => ({ name: f, px: toPx(front(f)) })),
  };
}

function strip(frames, k) {
  const Wd = CW * frames.length * k, H = CH * k, buf = Buffer.alloc(Wd * H * 4);
  frames.forEach((fr, i) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < CW * k; x++) {
        const s = (Math.floor(y / k) * CW + Math.floor(x / k)) * 4, d = (y * Wd + i * CW * k + x) * 4;
        for (let j = 0; j < 4; j++) buf[d + j] = fr.px[s + j];
      }
  });
  return sharp(buf, { raw: { width: Wd, height: H, channels: 4 } }).png();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const views = renderJayimpacts();
  const allowed = new Set([...BRAND, ...SKIN]);
  for (const fr of [...views.side, ...views.front])
    for (let i = 0; i < fr.px.length; i += 4) {
      if (!fr.px[i + 3]) continue;
      const h = '#' + [0, 1, 2].map((j) => fr.px[i + j].toString(16).padStart(2, '0')).join('').toUpperCase();
      if (!allowed.has(h)) throw new Error(`off palette ${h} in ${fr.name}`);
    }
  for (const v of ['side', 'front']) await strip(views[v], R).toFile(`${OUT}/${ID}_${v}.png`);
  const json = {
    note: 'Generated by tools/jayimpacts-sprite.mjs. Do not edit by hand.',
    renderScale: R,
    cell: { w: CW, h: CH },
    frames: JAY_FRAMES,
    anim: ANIM,
    characters: [{ id: ID, name: 'Jayimpacts', side: { file: `${ID}_side.png`, frames: JAY_FRAMES.side }, front: { file: `${ID}_front.png`, frames: JAY_FRAMES.front } }],
  };
  writeFileSync(`${OUT}/${ID}.json`, JSON.stringify(json, null, 2) + '\n');
  const i = process.argv.indexOf('--sheet');
  if (i > 0) await strip([...views.side, ...views.front], 1).toFile(process.argv[i + 1]);
  console.log(`jayimpacts: ${views.side.length} side + ${views.front.length} front frames -> ${OUT}`);
}

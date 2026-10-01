// Turns the exported sprite sheets (big, on a flat background, frames spaced
// by eye) into game-ready strips in src/assets/art/: background removed,
// frames found automatically, scaled with nearest-neighbour into equal cells.
//
//   node tools/prep-sprites.mjs            # all jobs below
//   node tools/prep-sprites.mjs chaser.png # one job
//   node tools/prep-sprites.mjs scene1     # only the scene 1 character sheets (tools/scene1-characters.mjs)
//
// Add a job when a new sheet arrives. Sources live in art-src/.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { RENDER_SCALE } from '../src/config/constants.js';
import { exportScene1Characters } from './scene1-characters.mjs';

const OUT = 'src/assets/art';
// Drive folder เกมลานนภา/Scene_2_Sprite, downloaded as is (originals untouched).
const SRC = 'assets/incoming/Scene_2_Sprite';

// bg: 'alpha' = the sheet is already transparent (the "no green" exports; no chroma key),
//     'green' = chroma key everywhere (safe, the art has no pure green),
//     'checker' = a fake transparency checkerboard baked into the pixels,
//     'flood' = remove only background connected to the image border
//               (for black or white backgrounds, keeps black eyes and mouths).
// ref: which size the scale is taken from (in design px; output is RENDER_SCALE x), so
//      frames keep their relative sizes.
// xRange: [x0, x1] limit the search horizontally.
// region: [y0, y1] band of the source to search, for sheets with several rows.
// split: 'even' = frames sit in equal slots (use when effects touch the neighbour frame).
//        'bright' = find frames from bright pixels, widen to midpoints (dark bg with haze).
//        'components' = one connected shape per frame (+ its small bits), masked so an
//        overlapping neighbour is never copied in.
const JOBS = [
  // TODO(open item 5): two chaser designs are in the Drive folder; this uses the bald
  // purple one (sprite_chasingghost_2). For the other, use 'sprite_chasingghost_1.png' with bg: 'flood'.
  { out: 'chaser.png', src: 'sprite_chasingghost_2.png', bg: 'flood', frames: 7, split: 'bright', ref: { median: 'h', px: 60 }, align: 'bottom' },
  { out: 'jar.png', src: 'sprite_jar_stall2.png', bg: 'flood', frames: 7, split: 'even', ref: { frame: 0, dim: 'h', px: 30 }, align: 'bottom' },
  { out: 'angel_jayimpacts.png', src: 'sprite_jayimpacts_character_no_greennew.png', orig: 'sprite_jayimpacts_character.png', bg: 'alpha', frames: 9, split: 'even', ref: { median: 'h', px: 64 }, align: 'bottom' },
  { out: 'angel_halo.png', src: 'sprite_jayimpact_fx_no_green.png', orig: 'sprite_jayimpact_fx.png', bg: 'alpha', region: [0, 400], pick: [0], frames: 1, ref: { frame: 0, dim: 'w', px: 16 }, align: 'center' },
  { out: 'angel_glint.png', src: 'sprite_jayimpact_fx_no_green.png', orig: 'sprite_jayimpact_fx.png', bg: 'alpha', region: [0, 400], pick: [1, 2, 3], frames: 3, ref: { max: 'h', px: 8 }, align: 'center' },
  { out: 'angel_poof.png', src: 'sprite_jayimpact_fx_no_green.png', orig: 'sprite_jayimpact_fx.png', bg: 'alpha', region: [400, 887], frames: 4, ref: { max: 'w', px: 32 }, align: 'center' },
  { out: 'krahang.png', src: 'sprite_krahang_stall1_no_green.png', orig: 'sprite_krahang_stall1.png', bg: 'alpha', frames: 8, split: 'even', ref: { median: 'h', px: 30 }, align: 'center' },
  { out: 'letter_icon.png', src: 'sprite_letter_stall2.png', bg: 'flood', pick: [0], frames: 1, ref: { frame: 0, dim: 'w', px: 16 }, align: 'center' },
  { out: 'letter_panel.png', src: 'sprite_letter_stall2.png', bg: 'flood', pick: [1], frames: 1, ref: { frame: 0, dim: 'w', px: 140 }, align: 'center' },
  // Bird (scene 1's placeholder sheet). Flood fill so the green legs survive.
  { out: 'bird_side.png', src: 'sprite_playerdemo_no_green.png', orig: 'sprite_playerdemo.png', bg: 'alpha', region: [40, 250], frames: 10, split: 'components', ref: { median: 'h', px: 28 }, align: 'bottom' },
  { out: 'bird_front.png', src: 'sprite_playerdemo_no_green.png', orig: 'sprite_playerdemo.png', bg: 'alpha', region: [440, 680], frames: 6, split: 'components', ref: { median: 'h', px: 28 }, align: 'bottom' },
  // Stall ghosts (stand on the ground to the right of their stall, facing the camera).
  { out: 'stall_ghost_3.png', src: 'sprite_dancing_ghost_stall3.png', bg: 'alpha', frames: 6, split: 'components', ref: { median: 'h', px: 46 }, align: 'bottom' },
  { out: 'stall_ghost_4.png', src: 'sprite_zombie_stall4.png', bg: 'checker', frames: 4, split: 'components', ref: { median: 'h', px: 40 }, align: 'bottom' },
  { out: 'stall_ghost_5.png', src: 'sprite_baby_ghost_stall5.png', bg: 'alpha', frames: 2, split: 'components', ref: { median: 'h', px: 38 }, align: 'bottom' },
  // Krahang riding the bird, from the bird sheet extras. Used for the cling part of S1,
  // at the same scale as bird_side so it lines up with the bird.
  { out: 'bird_krahang_cling.png', src: 'sprite_playerdemo_no_green.png', orig: 'sprite_playerdemo.png', bg: 'alpha', region: [690, 1000], xRange: [0, 450], frames: 1, ref: { factor: 0.1187 }, align: 'bottom' },
  { out: 'icon_bird.png', src: 'sprite_playerdemo_no_green.png', orig: 'sprite_playerdemo.png', bg: 'alpha', region: [700, 1000], xRange: [470, 640], frames: 1, ref: { frame: 0, dim: 'w', px: 12 }, align: 'center' },
  { out: 'ground_shadow.png', src: 'sprite_playerdemo_no_green.png', orig: 'sprite_playerdemo.png', bg: 'alpha', region: [700, 1000], xRange: [660, 900], frames: 1, ref: { frame: 0, dim: 'w', px: 16 }, align: 'center' },
  { out: 'fx_feather.png', src: 'sprite_playerdemo_no_green.png', orig: 'sprite_playerdemo.png', bg: 'alpha', region: [700, 1000], xRange: [920, 1536], frames: 3, split: 'even', ref: { max: 'w', px: 16 }, align: 'center' },
];

const ALPHA_MIN = 128;
const FLOOD_TOL = 6; // summed RGB distance from the corner colour

function removeBackground(px, w, h, mode) {
  const at = (x, y) => (y * w + x) * 4;
  if (mode === 'alpha') return;
  if (mode === 'checker') {
    // A fake transparency checkerboard baked into the pixels (light, unsaturated
    // squares). Flood from the border through light grey/white; the art's dark
    // outline stops it.
    const light = (i) => {
      const mx = Math.max(px[i], px[i + 1], px[i + 2]);
      const mn = Math.min(px[i], px[i + 1], px[i + 2]);
      return px[i + 3] < ALPHA_MIN || (mn > 170 && mx - mn < 24);
    };
    floodClear(px, w, h, light);
    return;
  }
  if (mode === 'green') {
    for (let i = 0; i < px.length; i += 4) {
      const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
      if (g > 150 && g > r + 60 && g > b + 60) px[i + 3] = 0;
    }
    return;
  }
  // Flood from the border through pixels close to the corner colour.
  const c = at(0, 0);
  const bg0 = [px[c], px[c + 1], px[c + 2]];
  floodClear(px, w, h, (i) => px[i + 3] < ALPHA_MIN || Math.abs(px[i] - bg0[0]) + Math.abs(px[i + 1] - bg0[1]) + Math.abs(px[i + 2] - bg0[2]) < FLOOD_TOL);
}

/** Clears (alpha 0) every pixel connected to the image border for which near(i) holds. */
function floodClear(px, w, h, near) {
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !near(p * 4)) continue;
    seen[p] = 1;
    px[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
}

function bbox(px, w, x0, x1, y0, y1) {
  let top = y1;
  let bottom = y0;
  let left = x1;
  let right = x0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      if (px[(y * w + x) * 4 + 3] >= ALPHA_MIN) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + 1);
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
      }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Equal slots across the opaque extent. */
function evenFrames(px, w, [y0, y1], n) {
  const all = bbox(px, w, 0, w, y0, y1);
  const slot = all.w / n;
  return Array.from({ length: n }, (_, i) => bbox(px, w, Math.round(all.x + i * slot), Math.round(all.x + (i + 1) * slot), y0, y1));
}

/**
 * For dark backgrounds whose near-black haze joins frames: find frames from the
 * bright pixels only, then widen each to the midpoint between neighbours so dark
 * outlines and tails are kept whole.
 */
function brightFrames(px, w, [y0, y1], n) {
  const bright = Buffer.from(px);
  for (let i = 0; i < bright.length; i += 4) if (bright[i] + bright[i + 1] + bright[i + 2] < 60) bright[i + 3] = 0;
  const cores = findFrames(bright, w, [y0, y1], n);
  return cores.map((f, i) => {
    const left = i === 0 ? 0 : Math.floor((cores[i - 1].x + cores[i - 1].w + f.x) / 2);
    const right = i === cores.length - 1 ? w : Math.floor((f.x + f.w + cores[i + 1].x) / 2);
    return bbox(px, w, left, right, y0, y1);
  });
}

/**
 * Frames from connected shapes: the n biggest shapes are the frames, every other
 * shape (sparkles, "!" marks, sweat drops) joins the nearest frame. Each frame
 * gets a mask, so a neighbour whose box overlaps is never copied in.
 */
function componentFrames(px, w, [y0, y1], n) {
  const label = new Int32Array(w * h_(px, w)).fill(-1);
  const comps = [];
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (label[p] >= 0 || px[p * 4 + 3] < ALPHA_MIN) continue;
      const id = comps.length;
      const c = { id, n: 0, x0: x, x1: x, y0: y, y1: y, sx: 0 };
      const stack = [p];
      label[p] = id;
      while (stack.length) {
        const q = stack.pop();
        const qx = q % w;
        const qy = (q - qx) / w;
        c.n++;
        c.sx += qx;
        c.x0 = Math.min(c.x0, qx);
        c.x1 = Math.max(c.x1, qx);
        c.y0 = Math.min(c.y0, qy);
        c.y1 = Math.max(c.y1, qy);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx;
            const ny = qy + dy;
            if (nx < 0 || nx >= w || ny < y0 || ny >= y1) continue;
            const r = ny * w + nx;
            if (label[r] < 0 && px[r * 4 + 3] >= ALPHA_MIN) {
              label[r] = id;
              stack.push(r);
            }
          }
      }
      comps.push(c);
    }
  const cores = [...comps].sort((a, b) => b.n - a.n).slice(0, n).sort((a, b) => a.x0 - b.x0);
  const owner = new Map();
  for (const c of comps) {
    const cx = c.sx / c.n;
    let best = cores[0];
    for (const k of cores) {
      const d = cx < k.x0 ? k.x0 - cx : cx > k.x1 ? cx - k.x1 : 0;
      const bd = cx < best.x0 ? best.x0 - cx : cx > best.x1 ? cx - best.x1 : 0;
      if (d < bd) best = k;
    }
    owner.set(c.id, best.id);
  }
  return cores.map((k) => {
    const members = new Set(comps.filter((c) => owner.get(c.id) === k.id).map((c) => c.id));
    const mine = comps.filter((c) => members.has(c.id));
    const x0 = Math.min(...mine.map((c) => c.x0));
    const x1 = Math.max(...mine.map((c) => c.x1));
    const fy0 = Math.min(...mine.map((c) => c.y0));
    const fy1 = Math.max(...mine.map((c) => c.y1));
    return { x: x0, y: fy0, w: x1 - x0 + 1, h: fy1 - fy0 + 1, label, members };
  });
}
const h_ = (px, w) => px.length / 4 / w;

/** Horizontal runs of opaque columns inside [y0, y1), merged down to `frames`. */
function findFrames(px, w, [y0, y1], expected) {
  const colCount = new Array(w).fill(0);
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] >= ALPHA_MIN) colCount[x]++;
  let runs = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && colCount[x] >= 2;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      runs.push([start, x]);
      start = -1;
    }
  }
  runs = runs.filter(([a, b]) => b - a >= 3);
  while (expected && runs.length > expected) {
    // Merge the pair with the smallest gap (loose sparkles, split tails).
    let best = 0;
    for (let i = 1; i < runs.length - 1; i++) if (runs[i + 1][0] - runs[i][1] < runs[best + 1][0] - runs[best][1]) best = i;
    runs.splice(best, 2, [runs[best][0], runs[best + 1][1]]);
  }
  return runs.map(([x0, x1]) => bbox(px, w, x0, x1, y0, y1));
}

function scaleFor(ref, frames) {
  if (ref.factor) return ref.factor * RENDER_SCALE; // design px per source px
  const target = ref.px * RENDER_SCALE;
  if (ref.frame !== undefined) return target / frames[ref.frame][ref.dim];
  const vals = frames.map((f) => f[ref.median ?? ref.max]).sort((a, b) => a - b);
  const v = ref.median ? vals[Math.floor(vals.length / 2)] : vals[vals.length - 1];
  return target / v;
}

async function detect(job, file, bg) {
  const { data, info } = await sharp(`${SRC}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = Buffer.from(data);
  removeBackground(px, w, h, bg);
  if (job.xRange) {
    const [x0, x1] = job.xRange;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < x0 || x >= x1) px[(y * w + x) * 4 + 3] = 0;
  }
  const band = [job.region?.[0] ?? 0, Math.min(job.region?.[1] ?? h, h)];
  let frames = job.split === 'even' ? evenFrames(px, w, band, job.frames) : job.split === 'bright' ? brightFrames(px, w, band, job.frames) : findFrames(px, w, band, job.pick ? null : job.frames);
  if (job.pick) frames = job.pick.map((i) => frames[i]).filter(Boolean);
  return { w, h, frames };
}

/** Compare a no-green sheet with its green original: sheet size, frame count, frame sizes. */
async function compare(job) {
  const a = await detect(job, job.orig, 'green');
  const b = await detect(job, job.src, job.bg);
  const sizes = (d) => d.frames.map((f) => `${f.w}x${f.h}`).join(' ');
  const diffs = [];
  if (a.w !== b.w || a.h !== b.h) diffs.push(`sheet ${a.w}x${a.h} vs ${b.w}x${b.h}`);
  if (a.frames.length !== b.frames.length) diffs.push(`frames ${a.frames.length} vs ${b.frames.length}`);
  else if (a.frames.some((f, i) => Math.abs(f.w - b.frames[i].w) > 2 || Math.abs(f.h - b.frames[i].h) > 2)) diffs.push(`frame sizes [${sizes(a)}] vs [${sizes(b)}]`);
  console.log(`${job.out}: ${job.orig} vs ${job.src}: ${diffs.length ? 'DIFFERS: ' + diffs.join('; ') : 'same frame layout'}`);
}

async function run(job) {
  const { data, info } = await sharp(`${SRC}/${job.src}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = Buffer.from(data);
  removeBackground(px, w, h, job.bg);
  if (job.xRange) {
    const [x0, x1] = job.xRange;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < x0 || x >= x1) px[(y * w + x) * 4 + 3] = 0;
  }
  const region = job.region ?? [0, h];
  const band = [region[0], Math.min(region[1], h)];
  let frames = job.split === 'even' ? evenFrames(px, w, band, job.frames) : job.split === 'bright' ? brightFrames(px, w, band, job.frames) : job.split === 'components' ? componentFrames(px, w, band, job.frames) : findFrames(px, w, band, job.pick ? null : job.frames);
  if (job.pick) frames = job.pick.map((i) => frames[i]).filter(Boolean);
  if (frames.length !== job.frames) throw new Error(`${job.out}: found ${frames.length} frames, expected ${job.frames}`);

  const s = scaleFor(job.ref, frames);
  const cellW = Math.max(...frames.map((f) => Math.round(f.w * s)));
  const cellH = Math.max(...frames.map((f) => Math.round(f.h * s)));
  const src = sharp(px, { raw: { width: w, height: h, channels: 4 } });
  const layers = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const fw = Math.max(1, Math.round(f.w * s));
    const fh = Math.max(1, Math.round(f.h * s));
    let input = src;
    if (f.members) {
      // Only this frame's own shapes: pixels of an overlapping neighbour are cleared.
      const own = Buffer.from(px);
      for (let y = f.y; y < f.y + f.h; y++)
        for (let x = f.x; x < f.x + f.w; x++) {
          const p = y * w + x;
          if (!f.members.has(f.label[p])) own[p * 4 + 3] = 0;
        }
      input = sharp(own, { raw: { width: w, height: h, channels: 4 } });
    }
    const buf = await input.clone().extract({ left: f.x, top: f.y, width: f.w, height: f.h }).resize(fw, fh, { kernel: 'nearest' }).raw().toBuffer();
    // Hard alpha so the pixel grid stays clean.
    for (let p = 3; p < buf.length; p += 4) buf[p] = buf[p] >= ALPHA_MIN ? 255 : 0;
    const left = i * cellW + Math.floor((cellW - fw) / 2);
    const top = job.align === 'bottom' ? cellH - fh : Math.floor((cellH - fh) / 2);
    layers.push({ input: buf, raw: { width: fw, height: fh, channels: 4 }, left, top });
  }
  mkdirSync(OUT, { recursive: true });
  await sharp({ create: { width: cellW * frames.length, height: cellH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toFile(`${OUT}/${job.out}`);
  console.log(`${job.out}: ${frames.length} x ${cellW}x${cellH} (scale ${s.toFixed(4)})`);
}

const args = process.argv.slice(2);
if (args[0] === '--compare') {
  for (const job of JOBS) if (job.orig) await compare(job);
} else if (args[0] === 'scene1') {
  await exportScene1Characters();
} else {
  for (const job of JOBS) if (!args[0] || job.out === args[0]) await run(job);
  const withoutNoGreen = [...new Set(JOBS.filter((j) => !j.orig).map((j) => j.src))];
  console.log('no "no green" version (used as is):', withoutNoGreen.join(', '));
  // Player characters come from scene 1's code (32 x 36 frames, costumes drawn in).
  if (!args[0]) await exportScene1Characters();
}

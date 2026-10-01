// Scene 1 character sheets -> src/assets/art/characters/ (spec 3 and 9).
//
// Scene 1 (assets/incoming/scene1/, plain Canvas 2D, not Phaser) draws every
// character in code: 32 x 36 frames, feet on the bottom row, costumes painted
// into the frames. This runs that page in headless Chromium, reads each frame
// through its public API (LannaphaGame.getSprite), checks the pixels and writes
// one horizontal strip per character and view at RENDER_SCALE x (nearest
// neighbour, exact multiple), plus characters.json for the adapter
// (src/integration/scene1.js).
//
//   node tools/prep-sprites.mjs scene1     (or: npm run scene1)
//
// Asset rules: hard alpha only, #00FF00 = transparent, colours outside scene 1's
// own palette (the hex colours declared in its source) are reported, then
// snapped to the nearest palette colour. Colours outside the scene 2 bird
// palette (spec 2) are only reported: they are scene 1's costume colours and are
// never repainted.
import sharp from 'sharp';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RENDER_SCALE as R } from '../src/config/constants.js';

const SRC_DIR = 'assets/incoming/scene1';
const OUT = 'src/assets/art/characters';
// Spec 2: the bird palette (background palette + bird blue and green).
const SPEC_BIRD_PALETTE = ['#DE5238', '#000000', '#FFFF4F', '#F02DF0', '#FFFFFF', '#0000FF', '#55FF3A'];

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function scene1SourceFile() {
  const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.html'));
  if (files.length !== 1) throw new Error(`${SRC_DIR}: expected exactly one scene 1 .html, found ${files.length}`);
  return `${SRC_DIR}/${files[0]}`;
}

/** Reads every frame of every character through scene 1's own API. */
async function readFrames(file) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Offline: the Google Fonts stylesheet only affects scene 1's Thai labels, not the sprites.
    await page.route(/^https?:/, (route) => route.abort());
    await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LannaphaGame?.getSprite);
    return await page.evaluate(() => {
      const G = window.LannaphaGame;
      const out = { cell: G.frames.cell, frames: { side: G.frames.side, front: G.frames.front }, anim: G.frames.anim, characters: [] };
      for (const c of G.characters) {
        const views = {};
        for (const view of ['side', 'front']) {
          views[view] = G.frames[view].map((name) => {
            const cv = G.getSprite(c.id, view, name);
            const data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
            return { name, w: cv.width, h: cv.height, px: Array.from(data) };
          });
        }
        out.characters.push({ id: c.id, name: c.name, views });
      }
      return out;
    });
  } finally {
    await browser.close();
  }
}

/** Checks one frame in place. Returns counts for the report. */
function checkFrame(px, palette, paletteRgb, specSet) {
  const r = { softAlpha: 0, keyGreen: 0, offPalette: {}, offSpec: {} };
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a !== 0 && a !== 255) r.softAlpha++;
    if (a < 128) {
      px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
      continue;
    }
    px[i + 3] = 255;
    let h = hex(px[i], px[i + 1], px[i + 2]);
    if (h === '#00FF00') {
      r.keyGreen++;
      px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
      continue;
    }
    if (!palette.has(h)) {
      r.offPalette[h] = (r.offPalette[h] ?? 0) + 1;
      let best = null;
      let bd = Infinity;
      for (const [ph, [pr, pg, pb]] of paletteRgb) {
        const d = (pr - px[i]) ** 2 + (pg - px[i + 1]) ** 2 + (pb - px[i + 2]) ** 2;
        if (d < bd) [bd, best] = [d, ph];
      }
      [px[i], px[i + 1], px[i + 2]] = rgb(best);
      h = best;
    }
    if (!specSet.has(h)) r.offSpec[h] = (r.offSpec[h] ?? 0) + 1;
  }
  return r;
}

const addCounts = (into, from) => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
};

/** Nearest-neighbour upscale by an exact integer factor. */
function upscale(px, w, h, k) {
  const out = Buffer.alloc(w * k * h * k * 4);
  for (let y = 0; y < h * k; y++)
    for (let x = 0; x < w * k; x++) {
      const s = ((Math.floor(y / k) * w) + Math.floor(x / k)) * 4;
      const d = (y * w * k + x) * 4;
      out[d] = px[s];
      out[d + 1] = px[s + 1];
      out[d + 2] = px[s + 2];
      out[d + 3] = px[s + 3];
    }
  return out;
}

export async function exportScene1Characters() {
  const file = scene1SourceFile();
  const source = readFileSync(file, 'utf8');
  const palette = new Set((source.match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((h) => h.toUpperCase()));
  const paletteRgb = [...palette].map((h) => [h, rgb(h)]);
  const specSet = new Set(SPEC_BIRD_PALETTE);
  const data = await readFrames(file);
  const { w: CW, h: CH } = data.cell;
  mkdirSync(OUT, { recursive: true });

  const characters = [];
  for (const c of data.characters) {
    const entry = { id: c.id, name: c.name, report: { softAlpha: 0, keyGreen: 0, offPalette: {}, offSpec: {} } };
    for (const view of ['side', 'front']) {
      const frames = c.views[view];
      const strip = Buffer.alloc(frames.length * CW * CH * 4);
      frames.forEach((f, n) => {
        if (f.w !== CW || f.h !== CH) throw new Error(`${c.id} ${view} ${f.name}: ${f.w}x${f.h}, expected ${CW}x${CH}`);
        const px = Uint8ClampedArray.from(f.px);
        const r = checkFrame(px, palette, paletteRgb, specSet);
        entry.report.softAlpha += r.softAlpha;
        entry.report.keyGreen += r.keyGreen;
        addCounts(entry.report.offPalette, r.offPalette);
        addCounts(entry.report.offSpec, r.offSpec);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) for (let k = 0; k < 4; k++) strip[((y * frames.length * CW) + n * CW + x) * 4 + k] = px[(y * CW + x) * 4 + k];
      });
      const out = `${c.id}_${view}.png`;
      const W = frames.length * CW;
      await sharp(upscale(strip, W, CH, R), { raw: { width: W * R, height: CH * R, channels: 4 } }).png().toFile(`${OUT}/${out}`);
      entry[view] = { file: out, frames: frames.map((f) => f.name) };
    }
    characters.push(entry);
  }

  // Report first (asset rules), then write the data file.
  console.log(`scene 1: ${file}`);
  console.log(`scene 1 palette (hex colours in its source): ${palette.size} colours`);
  for (const c of characters) {
    const r = c.report;
    const offPal = Object.values(r.offPalette).reduce((a, b) => a + b, 0);
    const offSpec = Object.entries(r.offSpec).sort((a, b) => b[1] - a[1]);
    console.log(
      `${c.id.padEnd(10)} soft alpha ${r.softAlpha}, #00FF00 ${r.keyGreen}, off scene 1 palette ${offPal}${offPal ? ' (snapped)' : ''}` +
        `, outside the spec bird palette: ${offSpec.length ? offSpec.map(([h, n]) => `${h} x${n}`).join(' ') : 'none'}`,
    );
  }
  const json = {
    note: 'Generated by tools/scene1-characters.mjs from scene 1. Do not edit by hand.',
    source: file,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    renderScale: R,
    cell: { w: CW, h: CH },
    frames: data.frames,
    anim: data.anim,
    characters,
  };
  writeFileSync(`${OUT}/characters.json`, JSON.stringify(json, null, 2) + '\n');
  console.log(`${OUT}: ${characters.length} characters, ${CW}x${CH} frames at ${R}x`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await exportScene1Characters();

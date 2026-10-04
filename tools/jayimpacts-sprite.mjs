// Jayimpacts as a chibi bird (scene 3 spec 5.1) -> src/assets/art/characters/jayimpacts_*.png
//
// He is drawn with scene 1's own bird painter (bPaint, the body ellipses, outline,
// legs) so his proportions match the eight player costumes pixel for pixel. Only the
// costume is new: a houndstooth jacket (1 px black/white check) over a black shirt,
// a belt, white trousers, spiky black hair with brows, small white wings with yellow
// tips, and a small yellow halo ring. Brand palette only (no scene 1 green/blue legs:
// dark red legs and dark brown shoes).
//
// Frames (32 x 36, feet on row 35): side (faces left) idle0 idle1 walk0-3 wave0 wave1,
// front idle0 idle1 blink wave0 wave1. Wave = one wing-arm raised (opening welcome).
// Writes <id>_side.png / <id>_front.png at RENDER_SCALE x plus jayimpacts.json in the
// characters.json format.
//
//   node tools/jayimpacts-sprite.mjs [--sheet out.png]   (--sheet: 1x contact strip)
import sharp from 'sharp';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RENDER_SCALE as R } from '../src/config/constants.js';
import { scene1SourceFile } from './scene1-characters.mjs';

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

// Injected into scene 1's page source, inside its IIFE (just before it starts its
// frame loop), so it can reach SIDE_COS, FRONT_COS, COL and RD. The delivered file
// on disk is not changed.
function installCostume() {
  const K = COL.black, W = COL.white, Y = COL.yellow, DR = COL.dred, DDR = COL.ddred;
  const check = (x, y) => (((x + y) & 1) ? K : W); // houndstooth read at 1 px
  let frame = 'idle0';
  window.__jayFrame = (f) => (frame = f);
  // Halo: a small yellow ring with its own 1 px black outline, drawn after the body outline.
  const halo = (P, cx, cy) => {
    const pts = [];
    for (let y = 0; y < 36; y++) for (let x = 0; x < 32; x++) {
      const a = ((x - cx) / 5) ** 2 + ((y - cy) / 1.6) ** 2, b = ((x - cx) / 3.6) ** 2 + ((y - cy) / 0.7) ** 2;
      if (a <= 1 && b > 1) pts.push([x, y]);
    }
    for (const [x, y] of pts) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (P.get(x + dx, y + dy) === null) P.px(x + dx, y + dy, K);
    for (const [x, y] of pts) P.px(x, y, Y);
  };
  // Paint the legs/feet in brand colours over scene 1's green/blue ones.
  const recolourLegs = (P) => P.recolor((x, y, c) => (c === COL.green ? DR : c === COL.blue ? DDR : undefined));

  FRONT_COS.jayimpacts = {
    behind(P, by) {
      // wings: small, white with yellow tips, sticking out at the jacket sides
      for (const s of [-1, 1]) {
        const m = (x) => (s < 0 ? x : 31 - x); // mirror for the right wing
        P.px(m(1), by + 11, W); P.rect(Math.min(m(1), m(2)), by + 12, 2, 1, W); P.rect(Math.min(m(1), m(4)), by + 13, 4, 2, W); P.rect(Math.min(m(2), m(4)), by + 15, 3, 1, W);
        P.px(m(1), by + 11, Y); P.px(m(1), by + 12, Y); P.px(m(1), by + 13, Y);
      }
      if (frame.startsWith('wave')) {
        // raised right arm (viewer's right): sleeve up the side of the head, wing-hand on top
        const o = frame === 'wave1' ? 1 : 0;
        for (let y = by + 2; y <= by + 14; y++) { const x = 24 + (y < by + 8 ? o : 0); P.rect(x, y, 2, 1, check(x, y)); P.px(x + 1, y, check(x + 1, y)); }
        P.rect(23 + o, by - 1, 4, 3, W); P.px(26 + o, by - 1, Y); P.px(23 + o, by - 1, Y);
      }
    },
    over(P, by) {
      // jacket rows by+13..by+19, belt by+20, trousers below
      P.recolor((x, y) => (y >= by + 13 && y <= by + 19 ? check(x, y) : y === by + 20 ? K : y > by + 20 ? W : undefined));
      P.rect(14, by + 13, 4, 6, K); P.rect(15, by + 19, 2, 1, K);           // black shirt, V
      P.px(13, by + 13, W); P.px(18, by + 13, W); P.px(13, by + 14, W); P.px(18, by + 14, W); // lapels
      P.rect(15, by + 20, 2, 1, Y);                                          // buckle
      // hair: black cap with spikes and a side-swept fringe
      P.recolor((x, y, c) => (y <= by + 2 && ((x - 15.5) / 8) ** 2 + ((y - (by + 7.5)) / 7.5) ** 2 <= 1 ? K : undefined));
      [[9, 0], [11, -1], [13, -2], [16, -2], [18, -1], [21, 0], [23, 1]].forEach(([x, d]) => P.rect(x, by + d, 1, 2, K));
      P.rect(10, by + 3, 4, 1, K); P.px(9, by + 4, K); P.rect(20, by + 3, 3, 1, K);
      P.px(12, by + 1, DDR); P.px(17, by + 0, DDR);                          // hair highlight
    },
    face(P, by, blink) {
      halo(P, 15.5, by - 5);
      // calm brows (the eyes come from scene 1's default bird eyes)
      P.rect(11, by + 5, 3, 1, K); P.rect(18, by + 5, 3, 1, K);
      if (!blink) { P.px(12, by + 6, K); P.px(19, by + 6, K); }
    },
  };

  SIDE_COS.jayimpacts = {
    behind(P, c) {
      // folded wing on the back
      P.ell(c.bx + 6, c.by - 8, 4, 2.2, W); P.px(RD(c.bx + 9), RD(c.by - 9), Y); P.px(RD(c.bx + 10), RD(c.by - 8), Y);
      if (frame.startsWith('wave')) {
        const o = frame === 'wave1' ? 2 : 0;
        // arm raised behind the head, wing-hand waving
        for (let y = RD(c.hy - 6); y <= RD(c.by - 3); y++) {
          const x = RD(c.hx + 7) + (y < RD(c.hy - 1) ? Math.round(o * (RD(c.hy - 1) - y) / 5) : 0);
          P.rect(x, y, 2, 1, ((x + y) & 1) ? K : W); P.px(x + 1, y, ((x + 1 + y) & 1) ? K : W);
        }
        const hx = RD(c.hx + 6) + o, hy = RD(c.hy - 10);
        P.rect(hx, hy, 4, 3, W); P.px(hx + 3, hy, Y); P.px(hx, hy, Y);
      }
    },
    over(P, c) {
      const by = c.by, top = RD(by - 3);
      P.recolor((x, y) => (y >= top && y <= RD(by + 3) ? check(x, y) : y === RD(by + 4) ? K : y > RD(by + 4) ? W : undefined));
      P.rect(RD(c.bx - 11), top, 3, RD(by + 3) - top + 1, K);                // shirt front
      P.rect(RD(c.bx - 8), top, 1, 3, W);                                    // lapel
      P.px(RD(c.bx - 9), RD(by + 4), Y);                                     // buckle
      // hair over the crown and the back of the head
      P.recolor((x, y, col) => {
        if (col === null) return undefined;
        const inHead = ((x - c.hx) / 7.5) ** 2 + ((y - c.hy) / 7) ** 2 <= 1;
        if (!inHead) return undefined;
        if (y <= RD(c.hy - 5) || (x >= RD(c.hx + 3) && y <= RD(c.hy + 1))) return K;
        return undefined;
      });
      const ht = RD(c.hy - 7);
      [[-4, 0], [-1, -1], [2, -1], [5, 0]].forEach(([dx, d]) => P.rect(RD(c.hx) + dx, ht + d, 1, 1, K));
      P.rect(RD(c.hx - 7), RD(c.hy - 4), 3, 1, K);                          // fringe swept forward
      P.px(RD(c.hx), RD(c.hy - 6), DDR); P.px(RD(c.hx + 4), RD(c.hy - 3), DDR);
    },
    face(P, c) {
      const ex = RD(c.hx - 3.5), ey = RD(c.hy - 2.5);
      P.rect(ex - 1, ey - 2, 3, 1, COL.black);                               // brow
      halo(P, c.hx + 1, c.hy - 11);
    },
  };
  // legs: wrap getSprite once so every jayimpacts frame gets brand-colour legs
  const G = window.LannaphaGame, get = G.getSprite;
  window.__jaySprite = (view, f) => {
    window.__jayFrame(f);
    const cv = get('jayimpacts', view, f);
    const x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height);
    const map = { '85,255,58': [0x8f, 0x2f, 0x20], '0,0,255': [0x4a, 0x1a, 0x14] };
    for (let i = 0; i < d.data.length; i += 4) {
      const m = map[`${d.data[i]},${d.data[i + 1]},${d.data[i + 2]}`];
      if (m && d.data[i + 3]) [d.data[i], d.data[i + 1], d.data[i + 2]] = m;
    }
    return { w: cv.width, h: cv.height, px: Array.from(d.data) };
  };
  void recolourLegs;
}

async function render() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route(/^https?:/, (route) => route.abort());
    const src = readFileSync(scene1SourceFile(), 'utf8');
    const hook = 'requestAnimationFrame(frame);\n})();';
    if (!src.includes(hook)) throw new Error('scene 1 source changed: injection point not found');
    await page.setContent(src.replace(hook, `(${installCostume.toString()})();\n${hook}`), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__jaySprite);
    return await page.evaluate((F) => {
      const out = {};
      for (const view of ['side', 'front']) out[view] = F[view].map((f) => ({ name: f, ...window.__jaySprite(view, f) }));
      return out;
    }, JAY_FRAMES);
  } finally {
    await browser.close();
  }
}

function strip(frames, k) {
  const w = 32, h = 36, W = w * frames.length * k, H = h * k;
  const buf = Buffer.alloc(W * H * 4);
  frames.forEach((fr, i) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < w * k; x++) {
        const s = ((Math.floor(y / k) * w) + Math.floor(x / k)) * 4;
        const a = fr.px[s + 3] >= 128 ? 255 : 0;
        const d = (y * W + i * w * k + x) * 4;
        if (a) { buf[d] = fr.px[s]; buf[d + 1] = fr.px[s + 1]; buf[d + 2] = fr.px[s + 2]; buf[d + 3] = 255; }
      }
  });
  return sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png();
}

function checkPalette(frames) {
  const set = new Set(BRAND);
  const off = {};
  for (const fr of frames)
    for (let i = 0; i < fr.px.length; i += 4) {
      if (fr.px[i + 3] < 128) continue;
      const h = '#' + [0, 1, 2].map((j) => fr.px[i + j].toString(16).padStart(2, '0')).join('').toUpperCase();
      if (!set.has(h)) off[h] = (off[h] ?? 0) + 1;
    }
  return off;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const views = await render();
  const off = checkPalette([...views.side, ...views.front]);
  if (Object.keys(off).length) console.warn('off brand palette:', off);
  for (const v of ['side', 'front']) await strip(views[v], R).toFile(`${OUT}/${ID}_${v}.png`);
  const json = {
    note: 'Generated by tools/jayimpacts-sprite.mjs (scene 1 bird painter + Jayimpacts costume). Do not edit by hand.',
    renderScale: R,
    cell: { w: 32, h: 36 },
    frames: JAY_FRAMES,
    anim: ANIM,
    characters: [{ id: ID, name: 'Jayimpacts', sheets: { side: `${ID}_side.png`, front: `${ID}_front.png` } }],
  };
  writeFileSync(`${OUT}/${ID}.json`, JSON.stringify(json, null, 2) + '\n');
  const i = process.argv.indexOf('--sheet');
  if (i > 0) {
    await strip([...views.side, ...views.front], 1).toFile(process.argv[i + 1]);
  }
  console.log(`jayimpacts: ${views.side.length} side + ${views.front.length} front frames -> ${OUT}`);
}

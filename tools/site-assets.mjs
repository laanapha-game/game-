// Share image and icons for the website (laanapha.com), drawn from the game itself:
// the share image is scene 1's home screen, read from its own canvas (180 x 320) in headless
// Chromium; the icons are the mascot นวลนภา (scene 1's front idle frame, from its sheet).
//   npm run dev   (in another terminal)
//   node tools/site-assets.mjs [base-url]
// Writes site/og.png (1200 x 630, link previews on LINE / Facebook / X), site/icon-192.png,
// site/icon-512.png, site/apple-touch-icon.png (180 x 180) and site/favicon.png (32 x 32).
// Every scale is nearest neighbour, and a whole number where the size allows.
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'site';
const BG = '#4A1A14'; // scene 1's page background
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await page.goto(`${BASE}game.html`);
await page.waitForFunction(() => window.LannaphaGame?.characters);
await page.waitForTimeout(2500); // the home screen's intro settles
const home = Buffer.from((await page.evaluate(() => document.getElementById('c').toDataURL())).split(',')[1], 'base64');
await browser.close();

const nn = (buf, w, h) => sharp(buf).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
const card = (w, h, input, left, top) =>
  sharp({ create: { width: w, height: h, channels: 4, background: BG } }).composite([{ input, left, top }]).png();

// og.png: the whole home screen, 630 px tall (x 1.97: the only scale that is not whole), centred.
const og = await nn(home, 354, 630);
await card(1200, 630, og, 423, 0).toFile(`${OUT}/og.png`);

// Icons: the mascot, front idle frame 0 of scene 1's sheet (3x) back at 1x, trimmed, at the
// largest whole-number scale that fits with a margin, centred on the page background.
const SHEET = 'src/assets/art/characters/nuannapa_front.png'; // 3 frames of 96 x 108 (32 x 36 at 3x)
const frame = await sharp(SHEET).extract({ left: 0, top: 0, width: 96, height: 108 }).png().toBuffer();
const { data: bird, info } = await sharp(await sharp(frame).resize(32, 36, { kernel: 'nearest' }).png().toBuffer())
  .trim()
  .png()
  .toBuffer({ resolveWithObject: true });
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon.png', 32]]) {
  const k = Math.max(1, Math.floor((size * (size > 32 ? 0.84 : 1)) / Math.max(info.width, info.height)));
  const w = info.width * k;
  const h = info.height * k;
  await card(size, size, await nn(bird, w, h), Math.floor((size - w) / 2), Math.floor((size - h) / 2)).toFile(`${OUT}/${name}`);
}
console.log(`wrote ${OUT}/og.png, icon-512.png, icon-192.png, apple-touch-icon.png, favicon.png`);

// Phone check of the single-file demos as a player gets them (file://, production build, no
// test hooks): phone screens with touch, by taps only.
//   npm run build:demo && npm run build:demo:scene3 && node tests/e2e/phone.mjs [--shots=dir]
// For each phone: the page fits the screen (no scrolling), the home page draws, start ->
// select -> confirm starts scene 2, taps move it on; scene 3's demo starts, taps go through the
// welcome, a pinch zooms the game but never the web page, a drag never scrolls it. Then, with
// JavaScript off (a phone's file preview), the "open in Safari or Chrome" notice shows.
// Chromium only (this machine has no WebKit): sizes, touch and the mobile viewport, not Safari
// itself, and headless Chromium does not pinch-zoom pages from simulated touches, so the guard
// against that is checked as scene 3's canvas touch-action.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const shots = (args.find((a) => a.startsWith('--shots=')) ?? '').slice(8);
if (shots) mkdirSync(shots, { recursive: true });
const GAME = 'file://' + resolve('dist-demo/game.html');
const SCENE3 = 'file://' + resolve('dist-demo-scene3/scene3.html');
const PHONES = ['iPhone SE', 'iPhone 13', 'iPhone 15 Pro Max', 'Pixel 7', 'Galaxy S9+'];

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failed++;
};
const browser = await chromium.launch();
// Scene 1 asks Google Fonts for Kanit; this machine may be offline.
const offlineFonts = (page) => page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
const look = async (page) => (await sharp(await page.screenshot()).resize(40, 80).raw().toBuffer()).toString('base64');
const fits = (page, sel) =>
  page.evaluate((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    const d = document.documentElement;
    return !!r && r.width > 100 && r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 && d.scrollWidth <= innerWidth + 1 && d.scrollHeight <= innerHeight + 1;
  }, sel);

async function touch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
}

for (const name of PHONES) {
  const d = devices[name];
  const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, isMobile: true, hasTouch: true, userAgent: d.userAgent });
  const tag = `${name} ${d.viewport.width}x${d.viewport.height}`;

  // ---- the full game
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await offlineFonts(page);
  await page.goto(GAME);
  await page.waitForFunction(() => window.LannaphaGame?.characters, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  check(!(await page.$('#demo-notice')) && (await fits(page, '#c')), `${tag}: game demo runs, home fits the screen`);
  const tap1 = async (x, y) => {
    const p = await page.evaluate(([x, y]) => {
      const r = document.getElementById('c').getBoundingClientRect();
      return { x: r.left + (x * r.width) / 180, y: r.top + (y * r.height) / 320 };
    }, [x, y]);
    await page.touchscreen.tap(p.x, p.y);
  };
  await tap1(90, 255); // กดเริ่มเกม
  await page.waitForTimeout(700);
  await tap1(68, 228); // a character
  await page.waitForTimeout(200);
  await tap1(90, 264); // ยืนยัน
  await page.waitForFunction(() => document.querySelector('#game canvas'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  check(await fits(page, '#game canvas'), `${tag}: scene 2 starts and fits the screen`);
  const before = await look(page);
  for (let i = 0; i < 6; i++) {
    await page.touchscreen.tap(d.viewport.width / 2, d.viewport.height / 2);
    await page.waitForTimeout(500);
  }
  check((await look(page)) !== before, `${tag}: taps move scene 2 on`);
  if (shots) await page.screenshot({ path: `${shots}/${name.replace(/ /g, '_')}_scene2.png` });
  check(errors.length === 0, `${tag}: no errors in the game (${errors.join(' | ')})`);
  await page.close();

  // ---- scene 3 demo
  const p3 = await ctx.newPage();
  const e3 = [];
  p3.on('pageerror', (e) => e3.push(e.message));
  await offlineFonts(p3);
  await p3.goto(SCENE3);
  await p3.waitForFunction(() => document.querySelector('#game canvas'), null, { timeout: 20000 });
  await p3.waitForTimeout(2000);
  check(!(await p3.$('#demo-notice')) && (await fits(p3, '#game canvas')), `${tag}: scene 3 demo runs and fits the screen`);
  const cx = d.viewport.width / 2;
  const cy = d.viewport.height / 2;
  for (let i = 0; i < 12; i++) {
    await p3.touchscreen.tap(cx, cy + 120);
    await p3.waitForTimeout(350);
  }
  await p3.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p3);
  const s0 = await look(p3);
  // A pinch (fingers apart) and a drag down: the game zooms; the page never zooms or scrolls.
  await touch(cdp, 'touchStart', [[cx - 20, cy], [cx + 20, cy]]);
  for (let k = 1; k <= 8; k++) await touch(cdp, 'touchMove', [[cx - 20 - k * 12, cy], [cx + 20 + k * 12, cy]]);
  await touch(cdp, 'touchEnd', []);
  await p3.waitForTimeout(600);
  await touch(cdp, 'touchStart', [[cx, cy - 100]]);
  for (let k = 1; k <= 10; k++) await touch(cdp, 'touchMove', [[cx, cy - 100 + k * 25]]);
  await touch(cdp, 'touchEnd', []);
  await p3.waitForTimeout(600);
  const vv = await p3.evaluate(() => ({ scale: window.visualViewport?.scale ?? 1, x: scrollX, y: scrollY }));
  check(vv.scale === 1 && vv.x === 0 && vv.y === 0, `${tag}: scene 3 pinch and drag stay in the game, the page does not zoom or scroll (${JSON.stringify(vv)})`);
  check((await look(p3)) !== s0, `${tag}: scene 3 reacts to the pinch and the drag`);
  const ta = await p3.evaluate(() => getComputedStyle(document.querySelector('#game canvas')).touchAction);
  check(ta === 'none', `${tag}: scene 3's canvas keeps every touch gesture for the game (touch-action ${ta})`);
  if (shots) await p3.screenshot({ path: `${shots}/${name.replace(/ /g, '_')}_scene3.png` });
  check(e3.length === 0, `${tag}: no errors in scene 3 (${e3.join(' | ')})`);
  await ctx.close();
}

// A phone's file preview runs no JavaScript: the notice must be what it shows.
const nojs = await browser.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined, javaScriptEnabled: false });
for (const url of [GAME, SCENE3]) {
  const page = await nojs.newPage();
  await offlineFonts(page);
  await page.goto(url);
  const text = await page.evaluate(() => document.getElementById('demo-notice')?.innerText ?? '');
  check(text.includes('Safari'), `no JavaScript (file preview): "${text.split('\n')[0]}" (${url.split('/').pop()})`);
  await page.close();
}

await browser.close();
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);

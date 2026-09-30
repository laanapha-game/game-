// Mobile smoke test (spec 10): integer scaling on three viewports, a fail path
// and the full win path with the placeholder bird. Needs `npm run dev` on :5173.
// Usage: node tests/e2e/smoke.mjs [--win] [--shots=dir]
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2);
const shots = (args.find((a) => a.startsWith('--shots=')) ?? '').slice(8);
const VIEWPORTS = [
  { width: 360, height: 640, dpr: 2 },
  { width: 390, height: 844, dpr: 3 },
  { width: 412, height: 915, dpr: 2.625 },
];

const browser = await chromium.launch();
let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failed = true;
};

async function open(vp, query = '') {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__scene2?.state);
  return { ctx, page, errors };
}

const state = (page) => page.evaluate(() => window.__scene2GameOver ? 'GAME_OVER_SCREEN' : window.__scene2Won ? 'SCENE3' : window.__scene2.state);
const tapCenter = (page, vp) => page.touchscreen.tap(vp.width / 2, vp.height / 2);
async function tapUntil(page, vp, pred, { every = 60, timeout = 60000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const s = await state(page);
    if (pred(s)) return s;
    await tapCenter(page, vp);
    await page.waitForTimeout(every);
  }
  return state(page);
}
// Taps (slowly) while a dialogue is open, until `done` is true in the page.
async function tapThroughDialogue(page, vp, done, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end && !(await page.evaluate(done))) {
    if (await page.evaluate(() => window.__scene2.dialogue.active)) await tapCenter(page, vp);
    await page.waitForTimeout(250);
  }
}
// Logical game coords -> page coords.
async function toPage(page, x, y) {
  return page.evaluate(([x, y]) => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 180, y: r.top + (y * r.height) / 320 };
  }, [x, y]);
}
async function shot(page, name) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
}

// 1. Integer scaling on each viewport.
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await open(vp);
  const r = await page.evaluate(() => {
    const c = document.querySelector('canvas').getBoundingClientRect();
    return { w: c.width, h: c.height, left: c.left, top: c.top };
  });
  const devScale = (r.w * vp.dpr) / 180;
  // Chrome lays out in 1/64 CSS px, so allow a hundredth of a device pixel per art pixel.
  check(Math.abs(devScale - Math.round(devScale)) < 0.01 && Math.abs((r.h * vp.dpr) / 320 - devScale) < 0.01, `${vp.width}x${vp.height}@${vp.dpr}: integer device scale ${devScale}`);
  check(r.left >= 0 && r.top >= 0 && r.left + r.w <= vp.width + 0.01, `${vp.width}x${vp.height}: letterboxed inside viewport`);
  await page.waitForTimeout(500);
  await shot(page, `vp_${vp.width}`);
  check(errors.length === 0, `no console errors (${errors.join(' | ')})`);
  await ctx.close();
}

// Gameplay runs use DPR 1: headless Chromium renders on the CPU, and a full
// device-resolution canvas is too slow there to play at speed (real phones use the GPU).
const PLAY_VP = { width: 390, height: 844, dpr: 1 };

// 2. Fail path: let the tap game time out.
{
  const vp = PLAY_VP;
  const { ctx, page } = await open(vp);
  await tapUntil(page, vp, (s) => s === 'S1', { every: 150 });
  await tapThroughDialogue(page, vp, () => !!window.__scene2.tickS1); // stall 1 dialogue, then the game starts itself
  await page.waitForTimeout(11000);
  await page.waitForFunction(() => window.__scene2GameOver, null, { timeout: 5000 }).catch(() => {});
  const reason = await page.evaluate(() => window.__scene2GameOver?.reason);
  check(reason === 'tapTimeout', `tap game timeout -> Game over (${reason})`);
  await shot(page, 'gameover');
  await ctx.close();
}

// 3. Win path.
if (args.includes('--win')) {
  const vp = PLAY_VP;
  const { ctx, page, errors } = await open(vp, '?today=2026-10-12');
  await shot(page, 's0');
  await tapUntil(page, vp, (s) => s === 'S1', { every: 120 });
  await tapThroughDialogue(page, vp, () => !!window.__scene2.tickS1);
  await shot(page, 's1');
  await tapUntil(page, vp, (s) => s === 'S2', { every: 40 });
  // Wait for the jars to become pickable, then pick the letter.
  await tapThroughDialogue(page, vp, () => window.__scene2.jars?.some((j) => j.input?.enabled), 40000);
  await shot(page, 's2');
  const jar = await page.evaluate(() => {
    const s = window.__scene2;
    const j = s.jars.find((o) => o.content === 'letter');
    return { x: j.x + s.world.x, y: j.y - 20 };
  });
  const p = await toPage(page, jar.x, jar.y);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForFunction(() => window.__scene2.state === 'S3', null, { timeout: 5000 }).catch(async () => {
    throw new Error(`jar pick failed, state ${await state(page)}`);
  });
  await page.waitForTimeout(1200);
  await shot(page, 's3_letter');
  for (const target of ['S4', 'S5', 'S6']) {
    await tapUntil(page, vp, (s) => s === target, { every: 200, timeout: 30000 });
    await page.waitForFunction(() => window.__scene2.dialogue.active, null, { timeout: 20000 });
    await shot(page, `${target}_dialogue`);
    if (target !== 'S6') {
      // Tap through pages until the reply buttons exist, then press the polite one.
      while (!(await page.evaluate(() => window.__scene2.choices.buttons.length))) {
        await tapCenter(page, vp);
        await page.waitForTimeout(150);
      }
      await shot(page, `${target}_choices`);
      const b = await toPage(page, 90, 104);
      await page.touchscreen.tap(b.x, b.y);
    }
  }
  await tapUntil(page, vp, (s) => s === 'S7', { every: 200, timeout: 30000 });
  await shot(page, 's7');
  const final = await tapUntil(page, vp, (s) => s === 'SCENE3' || s === 'GAME_OVER_SCREEN', { every: 40, timeout: 60000 });
  check(final === 'SCENE3', `full run reaches scene 3 (${final})`);
  await shot(page, 'scene3');
  check(errors.length === 0, `no console errors on win path (${errors.join(' | ')})`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);

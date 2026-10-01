// Mobile smoke test (spec 10): integer scaling on three viewports, the player
// character fallback, a fail path and the full win path with the default bird
// (scene 2 on its own; the scene 1 -> scene 2 flow is tests/e2e/flow.mjs). Needs `npm run dev` on :5173.
// Usage: node tests/e2e/smoke.mjs [--win] [--shots=dir]
import { chromium } from 'playwright';
import { state, tapUntil, tapThroughDialogue, playToWin } from './play.mjs';

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

async function shot(page, name) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
}

// 1. Integer scaling on each viewport.
for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await open(vp);
  const r = await page.evaluate(() => {
    const c = document.querySelector('#game canvas').getBoundingClientRect();
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

// 1b. Player character: the default bird when scene 2 runs on its own,
// ?character=<scene 1 id> plays as that scene 1 character, unknown ids fall back.
for (const [query, want] of [['', 'placeholder-bird'], ['?character=pumpkin', 'pumpkin'], ['?character=nobody', 'placeholder-bird']]) {
  const { ctx, page, errors } = await open({ width: 390, height: 844, dpr: 1 }, query);
  const got = await page.evaluate(() => ({ id: window.__scene2.character.id, key: window.__scene2.bird.sprite.texture.key }));
  check(got.id === want, `player ${query || '(none)'} -> ${got.id} (${got.key})`);
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
  const final = await playToWin(page, vp, (name) => shot(page, name));
  check(final === 'SCENE3', `full run reaches scene 3 (${final})`);
  await shot(page, 'scene3');
  check(errors.length === 0, `no console errors on win path (${errors.join(' | ')})`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);

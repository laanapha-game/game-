// Scene 3 in a real browser (needs `npm run dev`). Taps like a player:
//   - three phone sizes: whole-number scaling, 9:16, the canvas fits the window
//   - the opening welcome: tap skips the walk-in, six pages, tap ends the walk-out
//   - talk with TALK at the lane stall row, voucher +1; Jayimpacts' IG button
//   - the AUTO tour reaches its first stops; the MAP view; zoom buttons
//   - Thai text never overflows the dialogue box
//   - screenshots at 390 x 844, day and night: first screen, lane, band corner,
//     haunted house, ending, credits -> docs/scene3/screens/
//   node tests/e2e/scene3.mjs [base-url]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'docs/scene3/screens';
mkdirSync(OUT, { recursive: true });
const DPR = 2; // headless software WebGL is slow at 3x; layout is identical
let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!cond) failed++;
};

const browser = await chromium.launch();

const FADE_MS = 3000; // the white fade-in on arrival
async function open(query = '', size = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: DPR });
  page.on('pageerror', (e) => ok(false, `page error: ${e.message}`));
  await page.goto(`${BASE}/scene3.html${query}`);
  await page.waitForFunction(() => window.__scene3?.game?.scene?.getScene('S3Hud')?.dialogue, null, { timeout: 20000 });
  return page;
}

/** Tap at design coordinates (180 x 320) via the canvas's CSS box. */
async function tapDesign(page, x, y) {
  const box = await page.evaluate(() => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + (x / 180) * box.w, box.y + (y / 320) * box.h);
  await page.waitForTimeout(120);
}

const state = (page) =>
  page.evaluate(() => {
    const s = window.__scene3;
    const hud = s.game.scene.getScene('S3Hud');
    return {
      welcome: s.world.welcome.state,
      dlg: hud.dialogue.open,
      lines: hud.dialogue.open ? hud.dialogue.boxes[hud.dialogue.i].lines : [],
      btn: !!hud.dialogue.btn,
      vouchers: s.world.progress.vouchers,
      goals: [...s.world.progress.goals],
      player: { ...s.world.player },
      auto: !!s.world.auto,
      zoom: s.S.zoom,
      mapOpen: s.S.mapOpen,
      progress: window.LannaphaGame?.progress?.scene3,
    };
  });

// ---------------------------------------------------------------- viewports and scaling
for (const size of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  const page = await open('?skip=1', size);
  const r = await page.evaluate(() => {
    const c = document.querySelector('#game canvas').getBoundingClientRect();
    return { w: c.width, h: c.height, zoom: window.__scene3.game.registry.get('viewZoom'), dpr: devicePixelRatio };
  });
  ok(Math.abs(r.w / r.h - 180 / 320) < 0.01, `${size.width}x${size.height}: 9:16 canvas ${r.w.toFixed(1)}x${r.h.toFixed(1)}`);
  ok(r.w <= size.width + 0.5 && r.h <= size.height + 0.5, `${size.width}x${size.height}: fits the window`);
  ok(Number.isInteger(r.zoom), `${size.width}x${size.height}: whole-number scale (${r.zoom} device px per design px)`);
  await page.close();
}

// ---------------------------------------------------------------- welcome, talk, IG, auto, map
{
  const page = await open();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/first_screen_walkin_day.png` });
  let s = await state(page);
  ok(s.welcome === 'walkIn', 'the welcome starts with the walk-in');
  await tapDesign(page, 90, 160); // tap skips the walk-in
  s = await state(page);
  ok(s.welcome === 'talk' && s.dlg, 'tap during the walk-in opens the dialogue');
  await page.waitForTimeout(FADE_MS);
  await page.screenshot({ path: `${OUT}/first_screen_day.png` });
  let pages = 0;
  for (let i = 0; i < 14 && (await state(page)).dlg; i++) {
    const st = await state(page);
    ok(st.lines.length <= 3, `welcome box ${i + 1}: ${st.lines.length} lines`);
    pages++;
    await tapDesign(page, 90, 260);
  }
  ok(pages === 7, `seven welcome pages (${pages})`);
  s = await state(page);
  ok(s.welcome === 'walkOut', 'Jayimpacts walks back out');
  await tapDesign(page, 90, 160);
  s = await state(page);
  ok(s.welcome === 'done', 'tap during the walk-out ends it');

  // TALK with the lane stall row: voucher +1
  await page.evaluate(async () => {
    const { STALL_ROW } = await import('/src/scene3/logic/npcs.js');
    const t = STALL_ROW.touch[0];
    window.__scene3.teleport(t.x, t.y);
  });
  await page.waitForTimeout(300);
  await tapDesign(page, 111, 309); // AUTO/TALK button
  s = await state(page);
  ok(s.dlg, 'TALK opens the stall row');
  while ((await state(page)).dlg) await tapDesign(page, 90, 260);
  s = await state(page);
  ok(s.vouchers === 1, `one voucher after the first talk (${s.vouchers})`);
  ok(s.progress?.vouchers === 1, 'progress published to LannaphaGame.progress.scene3');

  // Jayimpacts at the Rotary stall: IG button on his last page
  await page.evaluate(() => {
    const n = window.__scene3.world.npc('jay');
    window.__scene3.teleport(n.x, n.y + 12);
  });
  await page.waitForTimeout(300);
  await tapDesign(page, 111, 309);
  for (let i = 0; i < 10 && !(await state(page)).btn && (await state(page)).dlg; i++) await tapDesign(page, 90, 260);
  ok((await state(page)).btn, 'Jayimpacts has the เปิด IG button on his last page');
  await page.screenshot({ path: `${OUT}/talk_jayimpacts_day.png` });
  while ((await state(page)).dlg) await tapDesign(page, 30, 260);

  // AUTO tour from the start reaches the lane
  await page.evaluate(() => window.__scene3.teleport(560, 860));
  await tapDesign(page, 111, 309);
  ok((await state(page)).auto, 'AUTO starts the tour');
  await page.waitForFunction(() => window.__scene3.world.progress.goals.has('lane'), null, { timeout: 30000 }).then(
    () => ok(true, 'the AUTO tour walks up the lane'),
    () => ok(false, 'the AUTO tour walks up the lane'),
  );
  await tapDesign(page, 90, 160); // a touch stops it
  ok(!(await state(page)).auto, 'a touch stops the tour');

  // zoom and MAP
  await tapDesign(page, 169, 149);
  ok((await state(page)).zoom === 3, 'the - button zooms out');
  await tapDesign(page, 169, 127);
  ok((await state(page)).zoom === 2, 'the + button zooms in');
  await tapDesign(page, 23, 309);
  ok((await state(page)).mapOpen, 'MAP opens the whole map');
  await page.screenshot({ path: `${OUT}/map_day.png` });
  await tapDesign(page, 90, 160);
  ok(!(await state(page)).mapOpen, 'a tap closes the map');
  await page.close();
}

// ---------------------------------------------------------------- all seven places: thank-you panel
{
  const page = await open('?skip=1');
  await page.waitForTimeout(FADE_MS);
  await page.evaluate(() => {
    const s = window.__scene3;
    const ev = ['lane', 'shops', 'desk', 'tables', 'cinema', 'haunted', 'ghosts'].flatMap((z) => s.world.progress.enterZone(z));
    s.game.scene.getScene('S3Hud').onEvents(ev);
  });
  await page.waitForFunction(() => window.__scene3.game.scene.getScene('S3Hud').overlay === 'thanks', null, { timeout: 15000 }).then(
    () => ok(true, 'the thank-you panel opens after the last place'),
    () => ok(false, 'the thank-you panel opens after the last place'),
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/thanks_day.png` });
  const b = await page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').thanksBtns);
  ok(b.url === 'https://www.hellobooku.com/laanapha2026', 'page 1: booking');
  ok((await page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').dim.alpha)) > 0.4, 'the game dims behind the panel');
  const pageUrl = () => page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').thanksBtns.url);
  await tapDesign(page, b.next[0] + 8, b.next[1] + 26);
  ok((await pageUrl()) === 'https://www.instagram.com/laanapha/', 'next: IG laanapha');
  await tapDesign(page, b.next[0] + 8, b.next[1] + 26);
  ok((await pageUrl()) === 'https://maps.app.goo.gl/XxkVruXCpHoy5VWr5', 'next: Google Map');
  await tapDesign(page, b.prev[0] + 8, b.prev[1] + 26);
  ok((await pageUrl()) === 'https://www.instagram.com/laanapha/', 'back: IG');
  await tapDesign(page, b.more[0] + b.more[2] / 2, b.more[1] + 9);
  ok(!(await page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').overlay)), 'คุยกับทีมงานต่อ closes it');
  await page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').openThanks());
  await tapDesign(page, b.end[0] + b.end[2] / 2, b.end[1] + 9);
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => window.__scene3.game.scene.isActive('S3Ending')), 'จบเกม opens the ending');
  await page.close();
}

// ---------------------------------------------------------------- screenshots, day and night
const views = {
  lane: (w) => (w.teleport(372, 700), w.setZoom(1)),
  band_corner: (w) => (w.teleport(372, 326), w.setZoom(1)),
  haunted_house: (w) => (w.teleport(222, 112), w.setZoom(1)),
};
for (const night of [false, true]) {
  const tag = night ? 'night' : 'day';
  const q = `?skip=1${night ? '&night=1' : ''}&today=2026-10-10`; // the poster's one gap day (Flash over, Early Bird next)
  if (night) {
    const page = await open('?night=1');
    await tapDesign(page, 90, 160);
    await page.waitForTimeout(FADE_MS);
    await page.screenshot({ path: `${OUT}/first_screen_${tag}.png` });
    await page.close();
  }
  for (const [name, go] of Object.entries(views)) {
    const page = await open(q);
    await page.evaluate(`(${go.toString()})(window.__scene3)`);
    await page.waitForTimeout(FADE_MS);
    await page.waitForFunction(() => !window.__scene3.game.scene.getScene('S3Hud').banner, null, { timeout: 20000 }).catch(() => {}); // let the goal banner pass
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${name}_${tag}.png` });
    await page.close();
  }
  const page = await open(q);
  await page.evaluate(() => {
    const w = window.__scene3.world;
    ['lane', 'shops', 'desk', 'tables', 'cinema', 'haunted', 'ghosts'].forEach((z) => w.progress.enterZone(z));
    w.progress.targets.forEach((k) => w.progress.talk(k));
    window.__scene3.ending();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/ending_${tag}.png` });
  const end = await page.evaluate(() => window.__scene3Ending);
  ok(end?.ticketLine === 'Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท', `ending ticket line (${end?.ticketLine})`);
  await tapDesign(page, 49, 307); // เครดิต
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/credits_${tag}.png` });
  ok(await page.evaluate(() => window.__scene3.game.scene.isActive('S3Credits')), 'เครดิต opens the credits');
  await tapDesign(page, 90, 160);
  ok(await page.evaluate(() => window.__scene3.game.scene.isActive('S3Ending')), 'a tap returns to the ending');
  await page.close();
}

await browser.close();
console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);

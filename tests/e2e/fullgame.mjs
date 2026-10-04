// The whole game in one run, played like a player: scene 1 home -> character select ->
// scene 2 (every dialogue, both minigames, the chase and the sprint, by taps) -> scene 3
// (the welcome, all seven places with the AUTO tour, the thank-you card, a talk with every
// character for the special-prize coupon, the walk out of the soi) -> ending ->
// credits -> หน้าแรก -> scene 1 home -> a second game starts.
//
//   node tests/e2e/fullgame.mjs [url] [--char=<id>] [--shots=<dir>] [--prod]
//
// url: a page of the full game. Default http://localhost:5173/game.html (npm run dev).
// The test hooks (window.__scene2, window.__scene3, ...) exist in dev builds only. To play the
// site build itself with them:
//   NODE_ENV=development npx vite build --config vite.site.config.js --outDir /tmp/site-dev
//   npx vite preview --config vite.site.config.js --outDir /tmp/site-dev --port 4174
//   node tests/e2e/fullgame.mjs http://localhost:4174/
// --prod: the real production build (npm run build:site, npm run preview:site), which has no
// hooks: taps only, by the clock. Home, start, select, confirm, the angel, the first walk and
// stall 1, where slow taps let the Krahang game time out -> Game over -> Home -> scene 1 home ->
// a second game. Every file the page asks for must load, dev-only URL switches must do nothing,
// no console errors.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { playToWin } from './play.mjs';

const args = process.argv.slice(2);
const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) ?? '').slice(name.length + 3);
const URL_ = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:5173/game.html';
const PROD = args.includes('--prod');
const CHAR = opt('char') || 'vampire';
const shots = opt('shots');
if (shots) mkdirSync(shots, { recursive: true });
// Headless Chromium renders on the CPU; DPR 1 keeps the game at speed (see smoke.mjs).
const VP = { width: 390, height: 844 };

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failed++;
};
const t0 = Date.now();
const clock = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;
let shotN = 0;
const shot = async (page, name) => {
  if (shots) await page.screenshot({ path: `${shots}/${String(++shotN).padStart(2, '0')}_${name}.png` });
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
const missing = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && new URL(r.url()).origin === new URL(URL_).origin && missing.push(`${r.status()} ${r.url()}`));
page.on('requestfailed', (r) => new URL(r.url()).origin === new URL(URL_).origin && missing.push(`failed ${r.url()}`));
// Scene 1 asks Google Fonts for Kanit; not needed here (and this machine may be offline).
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
// Links (tickets, Instagram, Google Maps) are recorded instead of opened: scene 1 uses
// window.open, scene 3 a click on an <a target="_blank"> (src/scene3/ui/openUrl.js).
await page.addInitScript(() => {
  window.__opened = [];
  window.open = (u) => (window.__opened.push(String(u)), { opener: null, closed: false, focus() {} });
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.target !== '_blank') return click.call(this);
    window.__opened.push(this.href);
  };
});

// ---------------------------------------------------------------- helpers
/** Tap at scene 1 design coords (its 180 x 320 canvas #c). */
async function tap1(x, y) {
  const p = await page.evaluate(([x, y]) => {
    const r = document.getElementById('c').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 180, y: r.top + (y * r.height) / 320 };
  }, [x, y]);
  await page.touchscreen.tap(p.x, p.y);
}
/** Tap at design coords (180 x 320) of the game canvas in #game (scene 2 and scene 3). */
async function tapG(x, y) {
  const p = await page.evaluate(([x, y]) => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 180, y: r.top + (y * r.height) / 320 };
  }, [x, y]);
  await page.touchscreen.tap(p.x, p.y);
  await page.waitForTimeout(120);
}
/** Distinct colours in a screenshot of the element (a WebGL canvas reads back blank otherwise). */
const drawn = async (sel) => {
  const { data, info } = await sharp(await page.locator(sel).first().screenshot()).resize(45, 80, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
  const seen = new Set();
  for (let i = 0; i < data.length; i += info.channels) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  return seen.size;
};
const homeShown = () => page.evaluate(() => document.getElementById('game').hidden && document.querySelectorAll('#game canvas').length === 0);

// Scene 1's own button rectangles (BTN.start, SELBTN.c<i>, SELBTN.confirm).
const CARD_X = [6, 49, 92, 135];
const CARD_Y = [166, 208];
async function startGame(id) {
  const i = await page.evaluate((id) => window.LannaphaGame.characters.findIndex((c) => c.id === id), id);
  await tap1(90, 255); // กดเริ่มเกม
  await page.waitForTimeout(700); // scene 1's fade
  await shot(page, 'select');
  await tap1(CARD_X[i % 4] + 19, CARD_Y[Math.floor(i / 4)] + 20);
  await page.waitForTimeout(200);
  const picked = await page.evaluate(() => window.LannaphaGame.selected());
  await tap1(90, 264); // ยืนยัน
  await page.waitForFunction(() => document.querySelector('#game canvas'), null, { timeout: 20000 });
  return picked;
}

// ---------------------------------------------------------------- scene 1 home
await page.goto(`${URL_}${URL_.includes('?') ? '&' : '?'}scene=scene3`); // a dev-only switch: must not skip anything in production
await page.waitForFunction(() => window.LannaphaGame?.characters, null, { timeout: 20000 });
await page.waitForTimeout(2500);
if (PROD) check(await homeShown(), 'production: ?scene=scene3 does nothing (home page shown)');
else {
  // In dev that switch opens scene 3 directly; reload without it.
  await page.goto(URL_);
  await page.waitForFunction(() => window.LannaphaGame?.characters, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
}
check((await drawn('#c')) > 8, `home page drawn (${await drawn('#c')} colours) [${clock()}]`);
await shot(page, 'home');
const picked = await startGame(CHAR);
check(picked?.id === CHAR, `character select: picked ${picked?.id} (${picked?.name})`);
await page.waitForTimeout(2500);
check((await drawn('#game canvas')) > 8, `scene 2 starts and draws [${clock()}]`);
await shot(page, 'scene2_angel');

if (PROD) {
  // ---------------------------------------------------------------- production: taps only
  // One slow tap a second: through the angel (7 pages), the first walk and stall 1's pages; then
  // the Krahang game starts by itself, and slow taps never fill its meter (it drains faster), so
  // it times out -> caught -> Game over (one button: home).
  for (let i = 0; i < 45; i++) {
    await tapG(90, 200);
    await page.waitForTimeout(880);
    if (i === 12) await shot(page, 'scene2_12s');
    if (i === 20) await shot(page, 'scene2_20s');
  }
  await page.waitForTimeout(14000);
  await shot(page, 'scene2_gameover');
  // ลองใหม่: the run starts again before stall 1 (the walk), not on the home page.
  await tapG(90, 222);
  await page.waitForTimeout(2500);
  check(!(await homeShown()) && (await drawn('#game canvas')) > 8, `Game over -> ลองใหม่: scene 2 starts again [${clock()}]`);
  await shot(page, 'scene2_retry');
  // Slow taps again: the walk (a tap jumps), stall 1's pages, the Krahang game times out -> Game over -> หน้าแรก.
  for (let i = 0; i < 30; i++) {
    await tapG(90, 200);
    await page.waitForTimeout(880);
  }
  await page.waitForTimeout(14000);
  await shot(page, 'scene2_gameover_again');
  await tapG(90, 292);
  await page.waitForTimeout(1200);
  check(await homeShown(), `Game over -> หน้าแรก: back on scene 1's home page [${clock()}]`);
  await shot(page, 'home_again');
  const again = await startGame('pumpkin');
  check(again?.id === 'pumpkin' && (await drawn('#game canvas')) > 0, 'a second game starts from home');
  for (const f of ['og.png', 'favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'robots.txt']) {
    const r = await page.request.get(new URL(f, URL_).href);
    check(r.ok(), `site file ${f} (${r.status()})`);
  }
} else {
  // ---------------------------------------------------------------- scene 2, the whole run
  check(await page.evaluate((id) => window.__scene2?.character?.id === id, CHAR), `scene 2 plays as ${CHAR}`);
  const final = await playToWin(page, VP, (name) => shot(page, `scene2_${name}`));
  check(final === 'SCENE3', `scene 2 won: into the light, whiteout -> scene 3 (${final}) [${clock()}]`);

  // ---------------------------------------------------------------- scene 3
  await page.waitForFunction(() => window.__scene3?.game?.scene?.getScene('S3Hud')?.dialogue, null, { timeout: 20000 });
  const s3 = () =>
    page.evaluate(() => {
      const s = window.__scene3;
      const hud = s.game.scene.getScene('S3Hud');
      const w = s.world;
      return {
        welcome: w.welcome.state,
        dlg: hud.dialogue.open,
        overlay: hud.overlay ?? null,
        auto: !!w.auto,
        goals: [...w.progress.goals],
        talked: [...w.progress.talked],
        vouchers: w.progress.vouchers,
        prize: w.progress.prize,
        ended: w.ended,
        ending: s.game.scene.isActive('S3Ending'),
        credits: s.game.scene.isActive('S3Credits'),
        talkable: w.talkable()?.key ?? null,
      };
    });
  /** The act button is AUTO only when no one is in talk range: step away first (hold-to-walk). */
  async function resumeAuto() {
    for (let i = 0; i < 8 && (await s3()).talkable; i++) {
      const r = await page.evaluate(() => document.querySelector('#game canvas').getBoundingClientRect());
      await page.mouse.move(r.left + r.width * (i % 2 ? 0.25 : 0.75), r.top + r.height * (i % 4 < 2 ? 0.7 : 0.4));
      await page.mouse.down();
      await page.waitForTimeout(600);
      await page.mouse.up();
    }
    await tapG(111, 309); // AUTO
  }
  check(await page.evaluate((id) => window.__scene3.S.character.id === id, CHAR), `scene 3 receives the same character (${CHAR})`);
  await page.waitForTimeout(800);
  await shot(page, 'scene3_arrival');
  // The welcome: Jayimpacts walks in, his pages, walks out (taps, like scene3.mjs).
  await tapG(90, 160);
  await page.waitForTimeout(3000); // the white fade-in
  let pages = 0;
  while ((await s3()).dlg && pages < 20) {
    if (pages === 0) await shot(page, 'scene3_welcome');
    await tapG(90, 260);
    pages++;
  }
  for (let i = 0; i < 10 && (await s3()).welcome !== 'done'; i++) {
    await tapG(90, 160);
    await page.waitForTimeout(300);
  }
  check((await s3()).welcome === 'done', `welcome: ${pages} pages, Jayimpacts walks out`);
  await page.waitForTimeout(400);
  await shot(page, 'scene3_missions_hint');

  // AUTO tour: every place. The thank-you card opens after the seventh.
  await page.waitForTimeout(500);
  await tapG(111, 309); // AUTO
  check((await s3()).auto, 'AUTO starts the tour');
  let seen = 0;
  const tourEnd = Date.now() + 300000;
  while (Date.now() < tourEnd) {
    const st = await s3();
    if (st.overlay === 'thanks') break;
    if (st.goals.length > seen) {
      seen = st.goals.length;
      console.log(`     place ${seen}/7: ${st.goals[seen - 1]} [${clock()}]`);
      await page.waitForTimeout(400);
      await shot(page, `scene3_place_${seen}_${st.goals[seen - 1]}`);
    }
    if (st.dlg) await tapG(30, 260);
    else if (!st.auto && !st.overlay && st.goals.length < 7) {
      console.log(`     AUTO stopped at ${JSON.stringify(await page.evaluate(() => window.__scene3.world.player))}; again`);
      await resumeAuto(); // the tour ended or stopped
    }
    await page.waitForTimeout(400);
  }
  let st = await s3();
  check(st.goals.length === 7 && st.overlay === 'thanks', `all seven places explored, thank-you card open (${st.goals.join(', ')}) [${clock()}]`);
  await page.waitForTimeout(400);
  await shot(page, 'scene3_thanks_booking');
  const tb = await page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').thanksBtns);
  const cardUrls = [];
  for (let i = 0; i < 3; i++) {
    cardUrls.push(await page.evaluate(() => window.__scene3.game.scene.getScene('S3Hud').thanksBtns.url));
    if (i < 2) {
      await tapG(tb.next[0] + 8, tb.next[1] + 26);
      await page.waitForTimeout(200);
      await shot(page, `scene3_thanks_${i ? 'map' : 'ig'}`);
    }
  }
  check(
    JSON.stringify(cardUrls) === JSON.stringify(['https://www.hellobooku.com/laanapha2026', 'https://www.instagram.com/laanapha/', 'https://maps.app.goo.gl/XxkVruXCpHoy5VWr5']),
    `thank-you card pages: booking -> IG laanapha -> Google Map`,
  );
  await tapG(tb.more[0] + tb.more[2] / 2, tb.more[1] + 9); // คุยกับทีมงานต่อ
  check(!(await s3()).overlay, 'คุยกับทีมงานต่อ: keep playing');

  // Talk with everyone: tap the character (the player walks there and talks). If the
  // straight walk is blocked, stand next to it and press TALK (reported as "placed").
  const where = (key) =>
    page.evaluate((key) => {
      const w = window.__scene3.world;
      const n = w.npc(key);
      if (n) return { x: n.x, y: n.y - 6, stand: { x: n.x, y: n.y + 12 } };
      const t = w.targets().find((o) => o.key === key); // the stall row: its nearest touch point
      return { x: t.x + 26, y: t.y - 10, stand: { x: t.x, y: t.y } };
    }, key);
  const onScreen = (p) =>
    page.evaluate((p) => {
      const cam = window.__scene3.game.scene.getScene('S3World').cameras.main;
      const v = cam.worldView;
      const fx = (p.x - v.x) / v.width;
      const fy = (p.y - v.y) / v.height;
      if (fx < 0.05 || fx > 0.95 || fy < 0.12 || fy > 0.85) return null;
      const r = document.querySelector('#game canvas').getBoundingClientRect();
      return { x: r.left + fx * r.width, y: r.top + fy * r.height };
    }, p);
  /** World point -> page point, clamped inside the canvas. */
  const toScreen = (p) =>
    page.evaluate((p) => {
      const v = window.__scene3.game.scene.getScene('S3World').cameras.main.worldView;
      const r = document.querySelector('#game canvas').getBoundingClientRect();
      const fx = Math.min(0.99, Math.max(0.01, (p.x - v.x) / v.width));
      const fy = Math.min(0.99, Math.max(0.01, (p.y - v.y) / v.height));
      return { x: r.left + fx * r.width, y: r.top + fy * r.height };
    }, p);
  const playerAt = () => page.evaluate(() => `${window.__scene3.world.player.x.toFixed(1)},${window.__scene3.world.player.y.toFixed(1)}`);
  let walked = 0;
  let placed = 0;
  const targets = await page.evaluate(() => window.__scene3.world.progress.targets);
  for (const key of ['stallRow', 'po', 'kaiching', 'peay', 'jay', 'aomsin', 'nemo'].filter((k) => targets.includes(k))) {
    if ((await s3()).talked.includes(key)) continue;
    const p = await where(key);
    let ok = false;
    for (let z = 0; z < 3 && !ok; z++) {
      const sp = await onScreen(p);
      if (!sp) {
        await tapG(169, 149); // - : zoom out until it is in view
        await page.waitForTimeout(300);
        continue;
      }
      await page.touchscreen.tap(sp.x, sp.y);
      // Wait for the walk and the talk; a straight walk blocked by a fence stops moving.
      let last = '';
      let still = 0;
      const until = Date.now() + 30000;
      while (Date.now() < until && !(await s3()).dlg && still < 6) {
        await page.waitForTimeout(250);
        const at = await playerAt();
        still = at === last ? still + 1 : 0;
        last = at;
      }
      ok = (await s3()).dlg;
      if (!ok) break;
    }
    if (ok) walked++;
    else {
      await page.evaluate((s) => window.__scene3.teleport(s.x, s.y), p.stand);
      await page.waitForTimeout(300);
      await tapG(111, 309); // TALK
      await page.waitForTimeout(200);
      if ((await s3()).dlg) placed++;
    }
    await shot(page, `scene3_talk_${key}`);
    for (let i = 0; i < 20 && (await s3()).dlg; i++) await tapG(30, 260);
    st = await s3();
    console.log(`     talked to ${key}: ${st.talked.length}/${targets.length} [${clock()}]`);
  }
  st = await s3();
  check(st.talked.length === targets.length && st.vouchers === 1, `talked with all ${targets.length} (${walked} walked to by tapping them, ${placed} placed next to them): ${st.vouchers} special-prize coupon`);
  check(st.prize, 'the special prize for talking with everyone');
  await page.waitForTimeout(1500);
  await shot(page, 'scene3_prize');

  // Out of the soi: AUTO (the tour ends in the soi), then hold a finger on the soi's east end.
  await resumeAuto();
  const back = Date.now() + 240000;
  while (Date.now() < back && (await page.evaluate(() => !!window.__scene3.world.auto))) await page.waitForTimeout(500);
  // The exit: the soi's east end (the tour's last stop is in the soi). Hold a finger east of the player.
  for (let i = 0; i < 4 && !(await s3()).ended; i++) {
    // Far east along the soi (clamped to the screen edge), so the walk goes straight along it.
    const sp = await page.evaluate(() => ({ x: window.__scene3.world.player.x + 400, y: window.__scene3.world.player.y })).then(toScreen);
    await page.mouse.move(sp.x, sp.y);
    await page.mouse.down();
    const until = Date.now() + 20000;
    while (Date.now() < until && !(await s3()).ended) await page.waitForTimeout(200);
    await page.mouse.up();
  }
  await page.waitForTimeout(1500);
  st = await s3();
  check(st.ending, `walked out of the soi: the ending [${clock()}]`);
  await shot(page, 'scene3_ending');

  // Ending: book, IG, credits, home.
  const before = await page.evaluate(() => window.__opened.length);
  await tapG(90, 262); // จองบัตรเลย
  await tapG(90, 285); // Instagram
  const opened = await page.evaluate((n) => window.__opened.slice(n), before);
  check(
    JSON.stringify(opened) === JSON.stringify(['https://www.hellobooku.com/laanapha2026', 'https://www.instagram.com/laanapha/']),
    `ending buttons open the booking page and IG laanapha (${opened.join(', ')})`,
  );
  await tapG(49, 307); // เครดิต
  await page.waitForTimeout(3000);
  check((await s3()).credits, 'เครดิต: the credits roll');
  await shot(page, 'scene3_credits');
  await tapG(90, 160);
  await page.waitForTimeout(600);
  check((await s3()).ending, 'a tap: back to the ending');
  await tapG(131, 307); // หน้าแรก
  await page.waitForTimeout(1500);
  check(await homeShown(), `หน้าแรก: scene 1's home page [${clock()}]`);
  await shot(page, 'home_after_ending');
  await page.evaluate(() => {
    window.__scene2 = undefined;
    window.__scene2Won = undefined;
  });
  const again = await startGame('pumpkin');
  await page.waitForFunction(() => window.__scene2?.state, null, { timeout: 20000 });
  check(again?.id === 'pumpkin' && (await page.evaluate(() => window.__scene2.character.id)) === 'pumpkin', 'play again from home: a second game starts (pumpkin)');
  await page.waitForTimeout(1500);
  await shot(page, 'second_game');
}

check(missing.length === 0, `every file loads (${missing.join(' | ') || 'no 404s'})`);
check(errors.length === 0, `no console errors (${errors.join(' | ')})`);
await browser.close();
console.log(`${failed ? `${failed} FAILED` : 'all passed'} in ${clock()}`);
process.exit(failed ? 1 : 0);

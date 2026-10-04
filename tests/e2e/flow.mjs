// Full game flow (spec 3) on game.html: scene 1 home -> character select ->
// confirm -> scene 2 with that character -> onWin(character). Every selectable
// character, using scene 1's real buttons. Needs `npm run dev` on :5173.
//
//   node tests/e2e/flow.mjs [--full] [--only=<id>] [--shots=dir]
//
// For each character:
//   - scene 1 hands over { id, name }; scene 2's player is that character,
//   - every frame of scene 2's sheets equals scene 1's own drawing (3x nearest neighbour),
//   - scene 1's frame names map to the right scene 2 animations,
//   - costume layers stay on their anchors and mirror exactly in every pose
//     (walk, struggle, look-back scared, run, front, win silhouette), checked with a
//     test layer on a second BirdActor (scene 1 draws its costumes into the frames),
//   - onWin passes the same character on (forced win, or --full: the whole run by tapping).
// Then once: Game over -> Home button -> scene 1 home -> play again with another character.
import { chromium } from 'playwright';
import { playToWin } from './play.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const args = process.argv.slice(2);
const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) ?? '').slice(name.length + 3);
const shots = opt('shots');
const only = opt('only');
const full = args.includes('--full');
// Headless Chromium renders on the CPU; DPR 1 keeps the game at speed (see smoke.mjs).
const VP = { width: 390, height: 844, dpr: 1 };

const browser = await chromium.launch();
let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
  if (!ok) failed = true;
};

async function open() {
  const ctx = await browser.newContext({ viewport: { width: VP.width, height: VP.height }, deviceScaleFactor: VP.dpr, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Count oscillators per AudioContext, to hear whether scene 1's own sounds play.
  await page.addInitScript(() => {
    const AC = window.AudioContext;
    const orig = AC.prototype.createOscillator;
    window.__osc = new Map();
    AC.prototype.createOscillator = function () {
      window.__osc.set(this, (window.__osc.get(this) ?? 0) + 1);
      return orig.call(this);
    };
  });
  // Scene 1 asks Google Fonts for Kanit; not needed for the test (and may be offline).
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(`${BASE}game.html?today=2026-10-12`);
  await page.waitForFunction(() => window.LannaphaGame?.characters);
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// Scene 1 design coords (its 180 x 320 canvas #c) -> tap.
async function tap1(page, x, y) {
  const p = await page.evaluate(([x, y]) => {
    const r = document.getElementById('c').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 180, y: r.top + (y * r.height) / 320 };
  }, [x, y]);
  await page.touchscreen.tap(p.x, p.y);
}

// Scene 1's own button rectangles (BTN.start, SELBTN.c<i>, SELBTN.confirm).
const CARD_X = [6, 49, 92, 135];
const CARD_Y = [166, 208];
async function chooseInScene1(page, i) {
  await tap1(page, 90, 255); // กดเริ่มเกม (start)
  await page.waitForTimeout(600); // scene 1 fade
  await tap1(page, CARD_X[i % 4] + 19, CARD_Y[Math.floor(i / 4)] + 20);
  await page.waitForTimeout(150);
  const selected = await page.evaluate(() => window.LannaphaGame.selected());
  await tap1(page, 90, 264); // ยืนยัน (confirm)
  await page.waitForFunction(() => window.__scene2?.state && window.__flow?.selected, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  return selected;
}

/** Scene 2 sheet pixels vs scene 1's getSprite() for every frame of both views. */
const comparePixels = () => {
  const s = window.__scene2;
  const G = window.LannaphaGame;
  const { id } = s.character;
  const out = { frames: 0, badFrames: [], animNames: {} };
  for (const view of ['side', 'front']) {
    const img = s.textures.get(s.character[view].key).getSourceImage();
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    const big = cx.getImageData(0, 0, img.width, img.height).data;
    const { w, h } = G.frames.cell;
    const k = img.height / h;
    G.frames[view].forEach((name, n) => {
      const d = G.getSprite(id, view, name).getContext('2d').getImageData(0, 0, w, h).data;
      let diff = 0;
      for (let y = 0; y < h * k; y++)
        for (let x = 0; x < w * k; x++) {
          const a = ((y * img.width) + n * w * k + x) * 4;
          const b = ((Math.floor(y / k) * w) + Math.floor(x / k)) * 4;
          const sameAlpha = (big[a + 3] > 127) === (d[b + 3] > 127);
          if (!sameAlpha || (d[b + 3] > 127 && (big[a] !== d[b] || big[a + 1] !== d[b + 1] || big[a + 2] !== d[b + 2]))) diff++;
        }
      out.frames++;
      if (diff) out.badFrames.push(`${view}/${name}: ${diff} px`);
    });
    out.animNames[view] = Object.fromEntries(Object.entries(s.character[view].anims).map(([a, idx]) => [a, idx.map((i) => G.frames[view][i]).join(',')]));
  }
  return out;
};

/**
 * Test layer (5 x 4, asymmetric) on the head top of a second BirdActor with this
 * character, through every pose. Returns placements; flipped ones must be the exact
 * mirror of unflipped ones.
 */
const checkLayers = () => {
  const s = window.__scene2;
  const R = 3;
  if (!s.textures.exists('test_layer')) {
    const t = s.textures.createCanvas('test_layer', 5 * R, 4 * R);
    const c = t.getContext();
    c.fillStyle = '#FFFF4F';
    c.fillRect(0, 0, 5 * R, 4 * R);
    c.fillStyle = '#F02DF0';
    c.fillRect(0, 0, 2 * R, 4 * R); // magenta on the left as drawn
    t.refresh();
  }
  const layer = { key: 'test_layer', anchor: 'headTop' };
  const c = { ...s.character, layers: { side: [layer], front: [{ ...layer, anchor: 'eye' }] } };
  const actor = new s.bird.constructor(s, c, 60, 240, 300);
  const poses = [
    ['walk', () => actor.play('run', 'side')],
    ['struggle', () => actor.play('struggle', 'side')],
    ['lookBack scared', () => (actor.lookBack(true), actor.play('scared', 'side'))],
    ['run', () => (actor.lookBack(false), actor.play('run', 'side'))],
    ['front happy', () => actor.play('happy', 'front')],
  ];
  const rows = [];
  for (const [name, fn] of poses) {
    fn();
    actor.sync();
    const sp = actor.sprite;
    const { def, sprite: l } = actor.layers[actor.view][0];
    const fw = Math.round(sp.displayWidth);
    const left = Math.round(sp.x - fw * sp.originX);
    const a = c[actor.view].anchors[def.anchor];
    rows.push({
      name,
      view: actor.view,
      birdFlip: sp.flipX,
      layerFlip: l.flipX,
      visible: l.visible,
      relLeft: l.x - left, // layer left edge inside the bird frame
      layerW: Math.round(l.displayWidth),
      fw,
      anchorX: a.x,
      integer: Number.isInteger(l.x) && Number.isInteger(l.y),
      depthAbove: l.depth > sp.depth,
    });
  }
  // Win silhouette covers the layer too.
  actor.play('run', 'side');
  const sil = actor.silhouette();
  const silOk = sil.length === 2 && sil[1].x === actor.layers.side[0].sprite.x && sil[1].flipX === actor.layers.side[0].sprite.flipX;
  sil.forEach((o) => o.destroy());
  actor.destroy();
  return { rows, silOk };
};

function checkLayerRows(id, { rows, silOk }) {
  for (const r of rows) {
    // Unflipped: centre column floor(5/2) = 2 on the anchor. Flipped: exact mirror image.
    const expect = r.layerFlip ? r.fw - 1 - r.anchorX - (r.layerW - 1 - 2) : r.anchorX - 2;
    check(r.visible && r.integer && r.depthAbove && r.layerFlip === r.birdFlip && r.relLeft === expect, `${id}: layer on anchor, ${r.name} (${r.view}, flip ${r.birdFlip}, x ${r.relLeft} want ${expect})`);
  }
  check(rows.find((r) => r.name === 'lookBack scared').birdFlip !== rows.find((r) => r.name === 'walk').birdFlip, `${id}: lookBack(true) mirrors bird and layer`);
  check(silOk, `${id}: win silhouette includes the layer`);
}

const ids = (await (async () => {
  const { ctx, page } = await open();
  const list = await page.evaluate(() => window.LannaphaGame.characters.map((c) => c.id));
  await ctx.close();
  return list;
})()).filter((id) => !only || id === only);

const SIDE_WANT = { idle: 'idle0,idle1', run: 'walk0,walk1,walk2,walk3', struggle: 'struggle0,struggle1', scared: 'scared' };

for (const id of ids) {
  const { ctx, page, errors } = await open();
  const index = await page.evaluate((id) => window.LannaphaGame.characters.findIndex((c) => c.id === id), id);
  const selected = await chooseInScene1(page, index);
  const got = await page.evaluate(() => ({ flow: window.__flow.selected, player: window.__scene2.character.id, key: window.__scene2.bird.sprite.texture.key, flip: window.__scene2.bird.sprite.flipX }));
  check(selected.id === id && got.flow.id === id, `${id}: scene 1 selected it and handed { id, name } to scene 2 (${got.flow.name})`);
  check(got.player === id && got.key === `scene1_${id}_side`, `${id}: scene 2 player is ${got.player} (${got.key})`);
  check(got.flip === false, `${id}: faces left without a flip (scene 1 side frames face left)`);
  const ride = await page.evaluate(() => {
    const s = window.__scene2;
    const r = s.clingCombo();
    return { key: r?.key, frames: r ? s.textures.get(r.key).frameTotal - 1 : 0, feet: window.__scene2.bird.sprite.y };
  });
  check(ride.key === `scene1_${id}_krahang` && ride.frames === 2, `${id}: Krahang-riding art loaded for stall 1 (${ride.key}, ${ride.frames} frames)`);
  check(ride.feet === 250, `${id}: walks on the street (feet at y ${ride.feet})`);

  const px = await page.evaluate(comparePixels);
  check(px.frames === 12 && px.badFrames.length === 0, `${id}: ${px.frames} frames match scene 1 pixel for pixel${px.badFrames.length ? ' (' + px.badFrames.join(', ') + ')' : ''}`);
  check(JSON.stringify(px.animNames.side) === JSON.stringify(SIDE_WANT), `${id}: side anims ${JSON.stringify(px.animNames.side)}`);
  checkLayerRows(id, await page.evaluate(checkLayers));
  if (shots) await page.screenshot({ path: `${shots}/${id}_s0.png` });

  if (full) {
    const final = await playToWin(page, VP, (name) => shots && page.screenshot({ path: `${shots}/${id}_${name}.png` }));
    check(final === 'SCENE3', `${id}: full run reaches scene 3 (${final})`);
  } else {
    await page.evaluate(() => window.__scene2.win());
    await page.waitForFunction(() => window.__scene2Won || window.__scene3?.S?.character, null, { timeout: 10000 }).catch(() => {});
  }
  const won = await page.evaluate(() => ({ same: window.__flow.won === window.__flow.character, id: window.__flow.won?.id, name: window.__flow.won?.name, stub: window.__scene2Won?.character?.id ?? window.__scene3?.S?.character?.id })); // scene 3 (or its stub) received the character
  check(won.same && won.id === id && won.stub === id, `${id}: onWin(character) passes the same character on (${won.id}, ${won.name})`);
  if (shots && full) await page.screenshot({ path: `${shots}/${id}_scene3.png` });
  check(errors.length === 0, `${id}: no console errors (${errors.join(' | ')})`);
  await ctx.close();
}

// Home screen links (owner edit): the event's Instagram, Jayimpacts' and tickets.
if (!only) {
  const { ctx, page, errors } = await open();
  await page.evaluate(() => {
    window.__opened = [];
    window.open = (u) => (window.__opened.push(u), { opener: 1 });
  });
  for (const [x, y] of [[46, 278], [134, 278], [152, 255]]) {
    await tap1(page, x, y);
    await page.waitForTimeout(250);
  }
  const opened = await page.evaluate(() => window.__opened);
  check(
    JSON.stringify(opened) === JSON.stringify(['https://www.instagram.com/laanapha/', 'https://www.instagram.com/jayimpacts/', 'https://www.hellobooku.com/laanapha2026']),
    `home: IG LAANAPHA, IG JAYIMPACTS and tickets open their links (${opened.join(', ')})`,
  );
  check(errors.length === 0, `no console errors on home links (${errors.join(' | ')})`);
  await ctx.close();
}

// Scene 1's own sounds: oscillators on contexts other than scene 2's engine.
const scene1Oscillators = (page) =>
  page.evaluate(() => [...window.__osc.entries()].filter(([c]) => c !== window.__audio.ctx).reduce((n, [, v]) => n + v, 0));

// Game over -> Home -> scene 1 home -> play again with another character.
// With sound: scene 1's speaker is the master switch; switching it off in scene 2
// switches scene 1's off too, so its own button sounds stop.
if (!only) {
  const { ctx, page, errors } = await open();
  // Sound is on by default: the first tap anywhere starts it and switches scene 1's speaker on.
  await tap1(page, 60, 300);
  await page.waitForTimeout(400);
  const s1 = await page.evaluate(() => ({ on: window.__audio.audio.sound, mood: window.__audio.audio.currentMood, ctx: window.__audio.ctx?.state }));
  check(s1.on && s1.ctx === 'running' && s1.mood === 'title' && (await scene1Oscillators(page)) > 0, `sound on from the first tap: title music, scene 1's speaker on (its jingle) (${JSON.stringify(s1)})`);
  const loud = await scene1Oscillators(page);
  await tap1(page, 90, 225); // the bird hops with scene 1's own sound (control for the silent check below)
  await page.waitForTimeout(300);
  check((await scene1Oscillators(page)) > loud, "scene 1's own hop sound plays while its sound is on");
  await page.waitForTimeout(300);
  await chooseInScene1(page, 2);
  check((await page.evaluate(() => window.__audio.audio.currentMood)) === 'calm', 'scene 2 switches to its music');
  const spk = await page.evaluate(() => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left + (168 * r.width) / 180, y: r.top + (8 * r.height) / 320 };
  });
  await page.touchscreen.tap(spk.x, spk.y); // sound off in scene 2
  check((await page.evaluate(() => window.__audio.audio.sound)) === false, 'scene 2 speaker turns sound off');
  await page.evaluate(() => window.__scene2.fail('test'));
  await page.waitForFunction(() => window.__scene2GameOver, null, { timeout: 5000 });
  const home = await page.evaluate(() => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left + (90 * r.width) / 180, y: r.top + (240 * r.height) / 320 };
  });
  await page.touchscreen.tap(home.x, home.y);
  await page.waitForTimeout(800);
  const back = await page.evaluate(() => ({ hidden: document.getElementById('game').hidden, canvases: document.querySelectorAll('#game canvas').length }));
  check(back.hidden && back.canvases === 0, `Game over -> Home: scene 2 closed, scene 1 home shown (${JSON.stringify(back)})`);
  const quiet = await scene1Oscillators(page);
  await tap1(page, 90, 225); // the bird on scene 1's home: hops with a sound when scene 1's sound is on
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ on: window.__audio.audio.sound, mood: window.__audio.audio.currentMood }));
  check(!after.on && after.mood === 'title' && (await scene1Oscillators(page)) === quiet, `scene 1's speaker follows scene 2's switch (silent home tap, ${JSON.stringify(after)})`);
  await tap1(page, 168, 8); // scene 1's speaker back on
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.__audio.audio.sound)) && (await scene1Oscillators(page)) > quiet, "scene 1's speaker turns everything back on");
  if (shots) await page.screenshot({ path: `${shots}/home_after_gameover.png` });
  await page.evaluate(() => {
    window.__scene2 = undefined;
    window.__scene2GameOver = undefined;
    window.__flow = undefined;
  });
  const again = await chooseInScene1(page, 5);
  const player = await page.evaluate(() => window.__scene2.character.id);
  check(player === again.id, `play again from home: scene 2 restarts with ${player}`);
  check(errors.length === 0, `no console errors on game over and replay (${errors.join(' | ')})`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);

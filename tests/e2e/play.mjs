// Shared Playwright helpers that play scene 2 like a player (taps only).
// Used by smoke.mjs (scene 2 on its own), flow.mjs (scene 1 -> scene 2) and fullgame.mjs (the whole game).

// SCENE3: scene 2's own scene 3 stub (scene 2 on its own) or the real scene 3 (game.html).
export const state = (page) =>
  page.evaluate(() =>
    window.__scene2GameOver ? 'GAME_OVER_SCREEN' : window.__scene2Won || window.__scene3?.S?.character ? 'SCENE3' : window.__scene2?.state,
  );
export const tapCenter = (page, vp) => page.touchscreen.tap(vp.width / 2, vp.height / 2);

export async function tapUntil(page, vp, pred, { every = 60, timeout = 60000 } = {}) {
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
export async function tapThroughDialogue(page, vp, done, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end && !(await page.evaluate(done))) {
    if (await page.evaluate(() => window.__scene2.dialogue.active)) await tapCenter(page, vp);
    await page.waitForTimeout(250);
  }
}

// Scene 2 design coords (180 x 320) -> page coords.
export async function toPage(page, x, y) {
  return page.evaluate(([x, y]) => {
    const r = document.querySelector('#game canvas').getBoundingClientRect();
    return { x: r.left + (x * r.width) / 180, y: r.top + (y * r.height) / 320 };
  }, [x, y]);
}

/**
 * Plays from S0 to the end of the win path. `shot(name)` is called at the
 * moments worth a screenshot (walk, struggle + dim, chase intro look-back, run,
 * sprint, win silhouette). The chase runs and the sprint are tapped. Returns the final state.
 */
export async function playToWin(page, vp, shot = async () => {}, report = {}, { stopAt } = {}) {
  // Idle check: with no taps the world does not move (no auto-run) and does not slide back.
  const idle = async (ms) => {
    const a = await page.evaluate(() => window.__scene2.worldX);
    const ca = await page.evaluate(() => window.__scene2.chaser?.x);
    await page.waitForTimeout(ms);
    const [b, cb] = await page.evaluate(() => [window.__scene2.worldX, window.__scene2.chaser?.x]);
    return { before: a, after: b, chaserBefore: ca, chaserAfter: cb };
  };
  await shot('s0');
  await tapUntil(page, vp, (s) => s === 'WALK1', { every: 120 });
  await page.waitForTimeout(800);
  await shot('walk');
  await tapUntil(page, vp, (s) => s === 'S1', { every: 120 });
  await tapThroughDialogue(page, vp, () => !!window.__scene2.tickS1);
  await page.waitForTimeout(1600); // Krahang on the back, scene dimmed
  await shot('s1_struggle_dim');
  await tapUntil(page, vp, (s) => s === 'S2', { every: 40 });
  // Wait for the jars to become pickable, then pick the letter.
  await tapThroughDialogue(page, vp, () => window.__scene2.jars?.some((j) => j.input?.enabled), 40000);
  await shot('s2');
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
  await shot('s3_letter');
  await tapUntil(page, vp, (s) => s === 'S3_INTRO', { every: 300, timeout: 10000 });
  await page.waitForTimeout(1600); // chaser floated in, bird looking back scared
  await shot('s3_lookback');
  for (const target of ['S4', 'S5', 'S6']) {
    await tapUntil(page, vp, (s) => s === target, { every: 200, timeout: 30000 });
    if (target === stopAt) return target;
    // Tap to run across the street to the stall (no auto-run in the chase).
    if (target === 'S4') {
      await page.waitForFunction(() => !!window.__scene2.tickRun, null, { timeout: 5000 }).catch(() => {});
      report.runIdle = await idle(1200);
    }
    let ranShot = target !== 'S4';
    const end = Date.now() + 40000;
    while (Date.now() < end && !(await page.evaluate(() => window.__scene2.dialogue.active || window.__scene2.ended))) {
      await tapCenter(page, vp);
      await page.waitForTimeout(80);
      if (!ranShot && (await page.evaluate(() => window.__scene2.running))) {
        await shot('s4_run');
        ranShot = true;
      }
    }
    if (target === 'S4') {
      await page.waitForTimeout(800); // let it glide to its new distance
      report.chaserAfterRun = await page.evaluate(() => window.__scene2.chaser.x);
    }
    await shot(`${target}_dialogue`);
    if (target !== 'S6') {
      // Tap through pages until the reply buttons exist, then press the polite one.
      while (!(await page.evaluate(() => window.__scene2.choices.buttons.length))) {
        await tapCenter(page, vp);
        await page.waitForTimeout(150);
      }
      await shot(`${target}_choices`);
      const b = await toPage(page, 90, 104);
      await page.touchscreen.tap(b.x, b.y);
      if (target === 'S4') {
        await page.waitForTimeout(250);
        await shot('s4_happy_front');
      }
    }
  }
  await tapUntil(page, vp, (s) => s === 'S7', { every: 200, timeout: 30000 });
  await page.waitForFunction(() => !!window.__scene2.tickRun, null, { timeout: 5000 }).catch(() => {});
  report.sprint = await page.evaluate(() => ({ eyes: window.__scene2.chaser.texture.key, rate: window.__scene2.timer.rate }));
  for (let i = 0; i < 8; i++) {
    await tapCenter(page, vp);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300); // let the run catch up with the taps
  report.sprintIdle = await idle(1200);
  await shot('s7');
  await tapUntil(page, vp, (s) => s === 'WIN' || s === 'SCENE3' || s === 'GAME_OVER_SCREEN', { every: 40, timeout: 60000 });
  await page.waitForTimeout(1050); // ran into the light, white silhouette up, whiteout starting
  await shot('win_silhouette');
  await page.waitForTimeout(500);
  await shot('win_whiteout');
  return tapUntil(page, vp, (s) => s === 'SCENE3' || s === 'GAME_OVER_SCREEN', { every: 200, timeout: 20000 });
}

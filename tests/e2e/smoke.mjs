// Mobile smoke test (spec 10): integer scaling on three viewports, the player
// character fallback, a fail path and the full win path with the default bird
// (scene 2 on its own; the scene 1 -> scene 2 flow is tests/e2e/flow.mjs). Needs `npm run dev` on :5173.
// Usage: node tests/e2e/smoke.mjs [--win] [--shots=dir]
import { chromium } from 'playwright';
import { state, tapUntil, tapThroughDialogue, playToWin, toPage, tapCenter } from './play.mjs';

/** Tap at scene 2 design coords (180 x 320). */
const tapDesign = async (page, x, y) => {
  const p = await toPage(page, x, y);
  await page.touchscreen.tap(p.x, p.y);
};

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

// 1c. Sound: every effect and every music loop renders (offline), not silent, not clipping.
{
  const { ctx, page, errors } = await open({ width: 390, height: 844, dpr: 1 });
  const levels = await page.evaluate(() => window.__audio.selfTest());
  const bad = Object.entries(levels).filter(([, v]) => v.peak < 0.02 || v.peak > 1);
  check(bad.length === 0, `sound: ${Object.keys(levels).length} effects and music loops render in range${bad.length ? ' (' + JSON.stringify(bad) + ')' : ''}`);
  // Jayimpacts' aura stays quiet: under the old glint chime's peak (0.044) and under the music.
  const aura = levels['loop:aura'];
  check(aura.peak < 0.044 && aura.rms < levels['music:calm'].rms, `Jayimpacts' aura is quiet (peak ${aura.peak}, rms ${aura.rms} vs calm music ${levels['music:calm'].rms})`);
  // Sound is on by default and starts on the first tap; the speaker turns it off and on,
  // the note turns music off; tapping them is not a game tap.
  const before = await page.evaluate(() => ({ on: window.__audio.audio.sound, page: window.__scene2.dialogue.pageIndex, frame: window.__scene2.soundButtons.speaker.frame.name }));
  check(before.on && before.frame === 0, 'sound is on by default (speaker shows on)');
  const spk = await toPage(page, 168, 8);
  await page.touchscreen.tap(spk.x, spk.y);
  check((await page.evaluate(() => window.__audio.audio.sound)) === false, 'speaker button turns sound off');
  await page.touchscreen.tap(spk.x, spk.y);
  const note = await toPage(page, 13, 8);
  await page.touchscreen.tap(note.x, note.y);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    on: window.__audio.audio.sound,
    music: window.__audio.audio.musicOn,
    running: window.__audio.ctx?.state,
    mood: window.__audio.audio.currentMood,
    frames: [window.__scene2.soundButtons.speaker.frame.name, window.__scene2.soundButtons.note.frame.name],
    page: window.__scene2.dialogue.pageIndex,
    complete: window.__scene2.dialogue.complete,
  }));
  check(after.on && after.running === 'running' && after.mood === 'calm', `speaker button turns sound back on, audio running (${JSON.stringify(after)})`);
  check(after.music === false && after.frames.join() === '0,1', `note button turns music off, icons follow`);
  check(after.page === before.page, `sound buttons are not game taps`);
  await page.touchscreen.tap(note.x, note.y);
  check(await page.evaluate(() => window.__audio.audio.musicOn), 'note button turns music back on');
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
  await tapUntil(page, vp, (s) => s === 'WALK1', { every: 150 });
  await page.waitForTimeout(300);
  await tapCenter(page, vp);
  await page.waitForTimeout(110);
  const j = await page.evaluate(() => ({ jumping: window.__scene2.jumping, y: window.__scene2.bird.sprite.y }));
  check(j.jumping && j.y < 250, `walk to stall 1: a tap jumps (y ${j.y})`);
  await tapUntil(page, vp, (s) => s === 'S1', { every: 150 });
  check((await page.evaluate(() => window.__scene2.bird.sprite.y)) === 250, 'lands before stall 1');
  await tapThroughDialogue(page, vp, () => !!window.__scene2.tickS1); // stall 1 dialogue, then the game starts itself
  await page.waitForTimeout(11000);
  await page.waitForFunction(() => window.__scene2GameOver, null, { timeout: 5000 }).catch(() => {});
  const reason = await page.evaluate(() => window.__scene2GameOver?.reason);
  check(reason === 'tapTimeout', `tap game timeout -> Game over (${reason})`);
  const failSounds = await page.evaluate(() => ['countdown_tick', 'jumpscare', 'gameover'].filter((n) => !window.__audio.log.includes(n)));
  check(failSounds.length === 0, `fail path sounds: countdown, caught jumpscare, Game over stinger${failSounds.length ? ' (missing ' + failSounds.join(', ') + ')' : ''}`);
  await shot(page, 'gameover');
  // ลองใหม่: from before stall 1 (the walk), not the angel again.
  await page.evaluate(() => (window.__scene2GameOver = undefined));
  await tapDesign(page, 90, 222);
  await page.waitForFunction(() => window.__scene2?.state === 'WALK1', null, { timeout: 5000 }).catch(() => {});
  const r1 = await page.evaluate(() => ({ state: window.__scene2.state, x: Math.round(window.__scene2.worldX) }));
  check(r1.state === 'WALK1' && r1.x < 20, `Game over at stall 1 -> ลองใหม่: the walk to stall 1 again (${JSON.stringify(r1)})`);
  await ctx.close();
}

// 2b. Retry checkpoints mid-chase (owner): lost at stall 3 -> after stall 2; caught in the final dash -> before it.
if (args.includes('--win')) {
  const vp = PLAY_VP;
  const { ctx, page, errors } = await open(vp, '?today=2026-10-12');
  await playToWin(page, vp, async () => {}, {}, { stopAt: 'S4' });
  // Run to stall 3, read its pages, answer rudely.
  for (let i = 0; i < 400 && !(await page.evaluate(() => window.__scene2.choices.buttons.length)); i++) {
    await tapCenter(page, vp);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(300);
  await tapDesign(page, 90, 145);
  await page.waitForFunction(() => window.__scene2GameOver, null, { timeout: 8000 }).catch(() => {});
  const g3 = await page.evaluate(() => window.__scene2GameOver);
  check(g3?.reason === 'rude' && g3?.checkpoint === 6, `rude at stall 3 -> Game over, checkpoint after stall 2 (${JSON.stringify(g3)})`);
  await page.evaluate(() => (window.__scene2GameOver = undefined));
  await tapDesign(page, 90, 222);
  await page.waitForFunction(() => window.__scene2?.state === 'S3_READY', null, { timeout: 5000 }).catch(() => {});
  const r3 = await page.evaluate(() => ({ state: window.__scene2.state, x: Math.round(window.__scene2.worldX), timer: window.__scene2.timer.started, chaser: !!window.__scene2.chaser }));
  check(r3.state === 'S3_READY' && r3.x === 288 && !r3.timer && r3.chaser, `ลองใหม่: after stall 2, "tap to run" first, the clock waits (${JSON.stringify(r3)})`);
  await shot(page, 'retry_tap_to_run');
  await page.waitForTimeout(500); // the prompt takes taps after 350 ms
  await tapCenter(page, vp);
  await page.waitForFunction(() => window.__scene2?.state === 'S4', null, { timeout: 5000 }).catch(() => {});
  const gap = await page.evaluate(() => {
    const s = window.__scene2;
    return { state: s.state, started: s.timer.started, birdMinusChaser: s.worldX / 2088 - (1 - s.timer.remainingS() / 360) };
  });
  check(gap.state === 'S4' && gap.started && gap.birdMinusChaser >= 0.09, `the chase goes on, the chaser behind (${JSON.stringify(gap)})`);
  // Through stalls 3-5 (polite), then wait in the dash: caught after the warning and 5 s.
  for (const target of ['S5', 'S6', 'S7']) {
    for (let i = 0; i < 600 && (await page.evaluate(() => window.__scene2.state)) !== target; i++) {
      if (await page.evaluate(() => window.__scene2.choices.buttons.length)) {
        await page.waitForTimeout(200);
        await tapDesign(page, 90, 104);
      } else await tapCenter(page, vp);
      await page.waitForTimeout(90);
    }
  }
  await page.waitForFunction(() => !!window.__scene2.dash, null, { timeout: 5000 }).catch(() => {});
  await shot(page, 'dash');
  const t0 = Date.now();
  await page.waitForFunction(() => window.__scene2GameOver, null, { timeout: 12000 }).catch(() => {});
  const g7 = await page.evaluate(() => window.__scene2GameOver);
  const took = (Date.now() - t0) / 1000;
  check(g7?.reason === 'caught' && g7?.checkpoint === 9 && took > 3.5 && took < 7.5, `final dash without taps: caught in about 5 s (${took.toFixed(1)} s, ${JSON.stringify(g7)})`);
  await page.evaluate(() => (window.__scene2GameOver = undefined));
  await tapDesign(page, 90, 222);
  await page.waitForFunction(() => window.__scene2?.state === 'S3_READY', null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await tapCenter(page, vp);
  await page.waitForFunction(() => window.__scene2?.state === 'S7', null, { timeout: 5000 }).catch(() => {});
  const r7 = await page.evaluate(() => ({ state: window.__scene2.state, x: Math.round(window.__scene2.worldX), warn: window.__scene2.dashWarn }));
  check(r7.state === 'S7' && r7.x === 1728 && r7.warn, `ลองใหม่: the final sprint again, from after stall 5 (${JSON.stringify(r7)})`);
  check(errors.length === 0, `no console errors on the retries (${errors.join(' | ')})`);
  await ctx.close();
}

// 3. Win path.
if (args.includes('--win')) {
  const vp = PLAY_VP;
  const { ctx, page, errors } = await open(vp, '?today=2026-10-12');
  // Sound is on by default; the run's first tap starts it.
  const moods = [];
  let chaseFrom = null;
  const watch = setInterval(async () => {
    const [m, st] = await page.evaluate(() => [window.__audio?.audio.currentMood, window.__scene2?.state]).catch(() => []);
    if (m && moods.at(-1) !== m) {
      moods.push(m);
      if (m === 'chase') chaseFrom = st;
    }
  }, 500);
  const report = {};
  const final = await playToWin(page, vp, (name) => shot(page, name), report);
  check(report.runIdle && report.runIdle.after === report.runIdle.before, `chase run: no taps, no movement (tap to run) ${JSON.stringify(report.runIdle)}`);
  const r = report.runIdle ?? {};
  check(r.chaserAfter < r.chaserBefore, `chaser creeps closer while the bird waits (x ${r.chaserBefore} -> ${r.chaserAfter})`);
  check(report.chaserAfterRun > r.chaserAfter && report.chaserAfterRun <= 180, `chaser falls back when the bird runs ahead, staying in view (x ${r.chaserAfter} -> ${report.chaserAfterRun})`);
  check(report.sprintIdle && report.sprintIdle.before > 0 && report.sprintIdle.after === report.sprintIdle.before, `final sprint: progress does not drain when not tapping ${JSON.stringify(report.sprintIdle)}`);
  check(report.sprint?.eyes === 'chaser_red' && report.sprint?.dash && report.sprint?.rate === 0, `final sprint: red-eyed chaser dashes (the chase clock stops, the dash decides) ${JSON.stringify(report.sprint)}`);
  clearInterval(watch);
  const heard = new Set(await page.evaluate(() => window.__audio.log));
  const want = ['angel_poof', 'angel_appear', 'aura', 'chat_open', 'type_blip', 'page_next', 'step', 'shake_rumble', 'krahang_leap', 'krahang_land',
    'tap', 'countdown_tick', 'meter_full', 'krahang_flung', 'ghost_moan', 'jar_swap', 'letter_chime', 'paper', 'jumpscare', 'choice_show', 'choice_press', 'light_swell', 'scene3_chime'];
  const missing = want.filter((n) => !heard.has(n));
  check(missing.length === 0, `win path plays every scene 2 sound (${missing.length ? 'missing ' + missing.join(', ') : want.length + ' kinds'})`);
  check(moods.join('>') === 'calm>funky>chase', `music: calm, funky from stall 1, chase from the chaser's entrance (${moods.join(' > ')})`);
  check(chaseFrom === 'S3_INTRO', `chase music starts when the chaser appears (${chaseFrom})`);
  check(final === 'SCENE3', `full run reaches scene 3 (${final})`);
  await shot(page, 'scene3');
  check(errors.length === 0, `no console errors on win path (${errors.join(' | ')})`);
  await ctx.close();
}

// 4. Caught: stop running in the chase and the chaser catches up (before the 2:00 is out).
if (args.includes('--win')) {
  const vp = PLAY_VP;
  const { ctx, page } = await open(vp, '?today=2026-10-12');
  const at = await playToWin(page, vp, async () => {}, {}, { stopAt: 'S4' });
  // No more taps; fast-forward the chase clock 20x (a 2:00 timeout would take 6 s).
  const t0 = Date.now();
  await page.evaluate(() => window.__scene2.timer.setRate(20));
  await page.waitForFunction(() => window.__scene2GameOver, null, { timeout: 15000 }).catch(() => {});
  const g = await page.evaluate(() => ({ reason: window.__scene2GameOver?.reason, left: window.__scene2.timer.remainingS() }));
  check(at === 'S4' && g.reason === 'caught' && g.left > 0, `waiting in the chase: the chaser catches up -> Game over (${g.reason}, ${g.left.toFixed(0)} s still on the clock, ${Date.now() - t0} ms)`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);

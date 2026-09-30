// Scene 2: Trick or Treat run. State machine from spec section 6.
//
//   S0 angel intro -> S1 Krahang tap game -> S2 jar game -> S3 letter + chase start
//   -> S4 stall 3 -> S5 stall 4 -> S6 stall 5 -> S7 final sprint -> win (scene 3)
//   any fail -> caught sequence -> GameOver scene (single Home button)
//
// Each state is an async step. When the run ends (fail or win) `this.ended` is
// set and every pending wait/tween promise stops resolving, so no step can
// continue after a Game over, even one that was mid-dialogue.
import Phaser from 'phaser';
import * as C from '../config/constants.js';
import { MANIFEST, FRAMES, STALL_BOOTH_FRAME } from '../assets/manifest.js';
import { ANGEL_PAGES, LETTER_TEXT, STALL4_PAGES, STALL5_PAGES, REPLY_POLITE, REPLY_RUDE, NAMES } from '../data/script.js';
import { resolveToday, stall3Pages } from '../logic/ticket.js';
import { TapMeter } from '../logic/meter.js';
import { ChaseTimer, chaserStage } from '../logic/chaseTimer.js';
import { minHitLogical } from '../display/integerScale.js';
import { createPlaceholderCharacter } from '../interfaces.js';
import { Dialogue } from '../ui/Dialogue.js';
import { Choices } from '../ui/Choices.js';
import { MeterView } from '../ui/Meter.js';
import { TimerBar } from '../ui/TimerBar.js';
import { ensureFxAnims, burst } from '../ui/fx.js';
import { wrap, addLines, setLines, textStyle } from '../ui/text.js';
import { BirdActor } from './BirdActor.js';

const faces = (key) => MANIFEST.find((m) => m.key === key)?.facing ?? 'left';
const lerp = (a, b, t) => a + (b - a) * t;

// Distance of one auto-run segment and the world positions derived from it (spec 7.4).
const SEGMENT_PX = C.RUN_SPEED_PX_S * C.RUN_SEGMENT_S;
const STALL_WORLD_X = [1, 2, 3].map((k) => C.STALL_STOP_X - SEGMENT_PX * k); // stalls 3, 4, 5
const FINAL_WORLD_X = SEGMENT_PX * 3 + C.SPRINT_DISTANCE_PX; // scroll at which the light is reached
const LIGHT_ENTRANCE_IN_PIECE = 52; // spec 9: entrance centre from the piece's left edge

export class TrickOrTreatScene extends Phaser.Scene {
  constructor() {
    super('TrickOrTreat');
  }

  init(data = {}) {
    const reg = this.registry;
    this.character = data.character ?? reg.get('character') ?? createPlaceholderCharacter();
    const cb = { ...(reg.get('callbacks') ?? {}), ...(data.callbacks ?? {}) };
    this.onWin = data.onWin ?? cb.onWin;
    this.onGameOver = data.onGameOver ?? cb.onGameOver;
    this.state = 'S0';
    this.ended = false;
    this.won = false;
    this.tapHandler = null;
    this.worldX = 0;
    this.running = false;
    this.meter = null;
    this.stage = -1;
    this.timer = new ChaseTimer(C.CHASE_TIME_S);
  }

  create() {
    ensureFxAnims(this);
    this.makeAnims();
    this.input.enabled = true;
    this.cameras.main.setBackgroundColor(C.CSS.black);
    this.bg = this.add.image(0, 0, 'bg_tap').setOrigin(0).setDepth(0);
    this.bird = new BirdActor(this, this.character, C.BIRD_X, C.GROUND_Y);
    this.dialogue = new Dialogue(this);
    this.choices = new Choices(this);
    this.timerBar = new TimerBar(this);
    this.timerBar.setVisible(false);
    this.input.on('pointerdown', (p) => {
      if (!this.ended) this.tapHandler?.(p);
    });
    if (C.FONT_IS_PLACEHOLDER && import.meta.env.DEV) {
      this.add.text(C.GAME_W - 2, C.GAME_H - 2, 'PLACEHOLDER FONT', textStyle(8, C.CSS.magenta)).setOrigin(1, 1).setDepth(500).setAlpha(0.7);
    }
    if (import.meta.env.DEV) window.__scene2 = this;
    this.run();
  }

  makeAnims() {
    const mk = (key, texture, frames, frameRate, repeat = -1) => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: frames.map((frame) => ({ key: texture, frame })), frameRate, repeat });
    };
    const A = FRAMES.angel;
    mk('angel_idle', 'angel_jayimpacts', A.idle, 6);
    mk('angel_talk', 'angel_jayimpacts', A.talk, 8);
    mk('angel_sign', 'angel_jayimpacts', A.signature, 1, 0);
    mk('angel_wave', 'angel_jayimpacts', A.wave, 4);
    mk('krahang_jump', 'krahang', FRAMES.krahang.jumpOn, 8, 0);
    mk('krahang_cling', 'krahang', FRAMES.krahang.cling, 6);
    mk('krahang_flung', 'krahang', FRAMES.krahang.flung, 10, 0);
    mk('chaser_float', 'chaser', FRAMES.chaser.float, 4);
    mk('jar_shake', 'jar', FRAMES.jar.shake, 12);
    mk('jar_ghost', 'jar', FRAMES.jar.ghost, 8);
    mk('jar_letter', 'jar', FRAMES.jar.letter, 6);
    for (const n of [3, 4, 5]) mk(`stall_ghost_${n}_idle`, `stall_ghost_${n}`, FRAMES.stallGhost.idle, 3);
  }

  // ---------- async helpers (never resolve after the run has ended) ----------
  guard(promise) {
    return new Promise((resolve) => promise.then((v) => !this.ended && resolve(v)));
  }

  wait(ms) {
    return this.guard(new Promise((r) => this.time.delayedCall(ms, r)));
  }

  tweenP(config) {
    return this.guard(new Promise((r) => this.tweens.add({ ...config, onComplete: r })));
  }

  async fade(rebuild) {
    const cam = this.cameras.main;
    cam.fadeOut(250, 0, 0, 0);
    await this.guard(new Promise((r) => cam.once('camerafadeoutcomplete', r)));
    rebuild();
    cam.fadeIn(250, 0, 0, 0);
  }

  /** Plays dialogue pages; screen taps go to the dialogue while it is open. */
  async talk(pages, opts = {}) {
    this.tapHandler = () => this.dialogue.tap();
    await this.guard(this.dialogue.play(pages, opts));
    this.tapHandler = null;
  }

  setState(s) {
    if (this.ended && s !== 'GAME_OVER' && s !== 'WIN') return;
    this.state = s;
    if (import.meta.env.DEV) console.debug('[scene2]', s);
  }

  // ---------- main flow ----------
  async run() {
    const steps = [
      () => this.s0Angel(),
      () => this.s1Krahang(),
      () => this.s2Jars(),
      () => this.s3LetterAndChase(),
      () => this.stall(0),
      () => this.stall(1),
      () => this.stall(2),
      () => this.s7Sprint(),
    ];
    for (const step of steps) {
      if (this.ended) return;
      await step();
    }
  }

  // S0: angel intro, 5 pages, no timer.
  async s0Angel() {
    this.setState('S0');
    this.bird.play('idle', 'side');
    const angelY = C.GROUND_Y - 8;
    const angel = this.add.sprite(52, angelY, 'angel_jayimpacts', 0).setOrigin(0.5, 1).setDepth(40).play('angel_idle');
    const halo = this.add.image(52, angelY - 49, 'angel_halo').setDepth(41);
    this.tweens.add({ targets: [angel, halo], y: '-=2', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const glints = this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => burst(this, 'angel_glint', 52 + Phaser.Math.Between(-16, 16), angel.y - Phaser.Math.Between(10, 46), { depth: 42 }),
    });
    await this.talk(ANGEL_PAGES, {
      speaker: NAMES.angel,
      hooks: {
        onType: () => angel.play('angel_talk'),
        onComplete: (i, last) => angel.play(last ? 'angel_wave' : i === 0 ? 'angel_sign' : 'angel_idle'),
      },
    });
    glints.remove();
    burst(this, 'angel_poof', 52, angel.y - 24, { depth: 43 });
    angel.destroy();
    halo.destroy();
    await this.wait(400);
  }

  // S1: Krahang lands on the bird's back (right side); tap to fling it off.
  async s1Krahang() {
    this.setState('S1');
    const backX = C.BIRD_X + 10;
    const backY = C.GROUND_Y - 18;
    const k = this.add.sprite(C.GAME_W + 20, C.GROUND_Y - 40, 'krahang', 0).setDepth(55).setFlipX(faces('krahang') === 'right');
    k.play('krahang_jump');
    this.bird.play('scared');
    this.tweens.add({ targets: k, x: backX, duration: 600, ease: 'Linear' });
    await this.tweenP({ targets: k, y: C.GROUND_Y - 70, duration: 300, ease: 'Quad.easeOut', yoyo: false });
    await this.tweenP({ targets: k, y: backY, duration: 300, ease: 'Quad.easeIn' });
    k.play('krahang_cling');
    this.bird.play('struggle');

    const meter = new TapMeter(C.TAP_GAME_GAIN, C.TAP_GAME_DECAY_PER_S);
    const view = new MeterView(this);
    const countdown = this.add.text(C.GAME_W / 2, 256, '', textStyle(C.FONT_TITLE_PX, C.CSS.yellow)).setOrigin(0.5).setDepth(92);
    const sweat = this.time.addEvent({ delay: 500, loop: true, callback: () => burst(this, 'fx_sweat', C.BIRD_X - 8, C.GROUND_Y - 30, { dy: 4 }) });
    const endAt = this.time.now + C.TAP_GAME_TIME_S * 1000;
    let taps = 0;

    const result = await this.guard(
      new Promise((resolve) => {
        this.tapHandler = (p) => {
          if (this.time.now >= endAt) return;
          meter.tap();
          view.press();
          burst(this, 'fx_tap_ripple', p.x, p.y, { depth: 200 });
          k.x = backX + (++taps % 2 ? 1 : -1);
          if (meter.full) resolve('win');
        };
        this.tickS1 = (dt) => {
          meter.update(dt);
          view.set(meter.value);
          const left = Math.max(0, endAt - this.time.now);
          countdown.setText(String(Math.ceil(left / 1000)));
          if (left <= 0 && !meter.full) resolve('timeout');
        };
      }),
    );
    this.tapHandler = null;
    this.tickS1 = null;
    sweat.remove();
    if (result === 'timeout') return this.fail('tapTimeout');

    // Fling the Krahang away to the right.
    view.set(1);
    k.play('krahang_flung');
    for (let i = 0; i < 4; i++) burst(this, 'fx_feather', C.BIRD_X + 6, C.GROUND_Y - 16, { dx: Phaser.Math.Between(4, 24), dy: Phaser.Math.Between(-16, 8), ms: 500 });
    this.bird.play('relieved', 'front');
    await this.tweenP({ targets: k, x: C.GAME_W + 40, y: C.GROUND_Y - 110, duration: 550, ease: 'Quad.easeOut' });
    k.destroy();
    view.destroy();
    countdown.destroy();
    await this.wait(500);
  }

  // S2: two jars, one ghost and one letter; reveal, shuffle, pick.
  async s2Jars() {
    this.setState('S2');
    const jars = [];
    await this.fade(() => {
      this.bg.setTexture('bg_jars');
      this.bird.play('idle', 'side');
      const letterSlot = Phaser.Math.Between(0, 1); // random every run
      C.JAR_XS.forEach((x, slot) => {
        const s = this.add.sprite(x, C.JAR_TABLE_Y, 'jar', FRAMES.jar.closed).setOrigin(0.5, 1).setDepth(30);
        s.content = slot === letterSlot ? 'letter' : 'ghost';
        jars.push(s);
      });
    });
    await this.wait(400);

    // Reveal
    jars.forEach((j) => j.play(j.content === 'letter' ? 'jar_letter' : 'jar_ghost'));
    await this.wait(C.JAR_REVEAL_MS);
    jars.forEach((j) => j.stop().setFrame(FRAMES.jar.closed));
    await this.wait(300);

    // Shuffle: each swap exchanges the two jars, one hopping over the other.
    for (let i = 0; i < C.JAR_SWAPS; i++) {
      const ms = lerp(C.JAR_SWAP_MS_START, C.JAR_SWAP_MS_END, C.JAR_SWAPS > 1 ? i / (C.JAR_SWAPS - 1) : 1);
      const [a, b] = Math.random() < 0.5 ? jars : [jars[1], jars[0]];
      const ax = a.x;
      const bx = b.x;
      a.setDepth(31);
      b.setDepth(30);
      a.play('jar_shake');
      b.play('jar_shake');
      this.tweens.add({ targets: a, y: C.JAR_TABLE_Y - 10, duration: ms / 2, yoyo: true, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: b, x: ax, duration: ms, ease: 'Sine.easeInOut' });
      await this.tweenP({ targets: a, x: bx, duration: ms, ease: 'Sine.easeInOut' });
      a.stop().setFrame(FRAMES.jar.closed);
      b.stop().setFrame(FRAMES.jar.closed);
    }

    // Pick (no time limit, ASSUMPTION). Large hit areas that never overlap.
    const minHit = minHitLogical(this.game, C.MIN_TOUCH_CSS_PX);
    const spacing = Math.abs(C.JAR_XS[1] - C.JAR_XS[0]);
    const hw = Math.min(spacing, Math.max(32, minHit));
    const hh = Math.max(40, minHit);
    const picked = await this.guard(
      new Promise((resolve) => {
        jars.forEach((j) => {
          j.setInteractive(new Phaser.Geom.Rectangle((32 - hw) / 2, (40 - hh) / 2, hw, hh), Phaser.Geom.Rectangle.Contains);
          j.once('pointerdown', () => resolve(j));
        });
      }),
    );
    jars.forEach((j) => j.disableInteractive());
    this.jars = jars;

    if (picked.content === 'ghost') {
      picked.play('jar_ghost');
      this.bird.play('scared', 'side');
      const cam = this.cameras.main;
      cam.flash(200, 240, 45, 240);
      cam.shake(C.JUMP_SCARE_MS, 0.02);
      burst(this, 'fx_splat', picked.x, picked.y - 30, { depth: 60 });
      await this.wait(C.JUMP_SCARE_MS);
      return this.fail('ghostJar');
    }
    picked.play('jar_letter');
    this.bird.play('happy', 'front');
    const icon = this.add.image(picked.x, picked.y - 30, 'letter_icon').setDepth(60);
    await this.tweenP({ targets: icon, x: C.GAME_W / 2, y: 120, duration: 500, ease: 'Quad.easeOut' });
    icon.destroy();
  }

  // S3: read the letter, then the chaser appears and the 2:00 timer starts.
  async s3LetterAndChase() {
    this.setState('S3');
    const P = C.UI.letterPanel;
    const cx = C.GAME_W / 2;
    const top = 70;
    const panel = this.add.image(cx, top, 'letter_panel').setOrigin(0.5, 0).setDepth(150);
    const lines = wrap(LETTER_TEXT, P.w - P.pad * 2);
    const texts = addLines(this, cx, top, lines.length, C.LINE_HEIGHT_PX, { align: 'center', depth: 151, color: C.CSS.black });
    setLines(texts, lines, { top, height: P.h, lineHeight: C.LINE_HEIGHT_PX });
    const arrow = this.add.sprite(cx + P.w / 2 - 12, top + P.h - 12, 'ui_arrow', 0).setOrigin(0).setDepth(152).play('ui_arrow_blink');
    await this.wait(400); // avoid the pick tap closing the letter at once
    await this.guard(new Promise((r) => (this.tapHandler = r)));
    this.tapHandler = null;
    [panel, arrow, ...texts].forEach((o) => o.destroy());

    await this.fade(() => {
      this.jars?.forEach((j) => j.destroy());
      this.bg.destroy();
      this.buildWorld();
      this.bird.play('idle', 'side');
    });

    // Chaser enters from the right; the timer starts the moment it appears.
    this.chaser = this.add.sprite(C.GAME_W + 40, C.CHASER_HOVER_Y, 'chaser', FRAMES.chaser.float[0]).setDepth(45);
    this.chaser.setFlipX(faces('chaser') === 'right');
    this.chaser.play('chaser_float');
    this.chaserShadow = this.add.image(this.chaser.x, C.GROUND_Y + 1, 'ground_shadow').setOrigin(0.5, 1).setDepth(44);
    this.timer.start();
    this.timerBar.setVisible(true);
    this.bird.play('scared', 'side');
    this.stage = 0;
    await this.tweenP({ targets: this.chaser, x: C.CHASER_X_BY_STAGE[0], duration: 700, ease: 'Quad.easeOut' });
    await this.wait(300);
  }

  /** Builds the scrolling route: soi, soi exit, street, white light (spec 7.4). */
  buildWorld() {
    this.far = this.add.tileSprite(0, 0, C.GAME_W, C.GAME_H, 'bg_alley_far').setOrigin(0).setDepth(1);
    this.world = this.add.container(0, 0).setDepth(10);
    const W = 360;
    // Soi exit sits between stall 4 and stall 5 (ASSUMPTION for the split).
    const exitLeft = Math.round((STALL_WORLD_X[1] + STALL_WORLD_X[2]) / 2 - W / 2);
    const lightLeft = C.STALL_STOP_X - FINAL_WORLD_X - LIGHT_ENTRANCE_IN_PIECE;
    const pieces = [];
    for (let x = exitLeft + W; x < C.GAME_W; x += W) pieces.push(['bg_alley_near', x]);
    pieces.push(['bg_alley_exit', exitLeft]);
    for (let right = exitLeft; right > lightLeft + W; right -= W) pieces.push(['bg_street', right - W]);
    pieces.push(['bg_light_end', lightLeft]);
    for (const [key, x] of pieces) this.world.add(this.add.image(x, 0, key).setOrigin(0));

    this.stalls = STALL_WORLD_X.map((x, i) => {
      const n = i + 3;
      const ghost = this.add.sprite(x, C.GROUND_Y - 4, `stall_ghost_${n}`, 0).setOrigin(0.5, 1).play(`stall_ghost_${n}_idle`);
      const booth = this.add.image(x, C.GROUND_Y, 'booth', STALL_BOOTH_FRAME[n]).setOrigin(0.5, 1);
      this.world.add([ghost, booth]);
      return { ghost, booth };
    });
  }

  // S4-S6: auto-run to a stall, then its dialogue.
  async stall(i) {
    const n = i + 3;
    this.setState(`S${i + 4}`);
    this.bird.play('run', 'side');
    this.running = true;
    await this.tweenP({ targets: this, worldX: SEGMENT_PX * (i + 1), duration: C.RUN_SEGMENT_S * 1000, ease: 'Linear' });
    this.running = false;
    this.bird.play('idle', 'side');

    const speaker = NAMES[`stall${n}`];
    if (n === 5) {
      await this.talk(STALL5_PAGES, { speaker });
      return; // straight into the sprint
    }
    const pages = n === 3 ? stall3Pages(resolveToday({ search: window.location.search, isDev: import.meta.env.DEV })) : STALL4_PAGES;
    await this.talk(pages, { speaker, keepOpen: true });
    const reply = await this.guard(
      this.choices.show([
        { id: 'polite', text: REPLY_POLITE },
        { id: 'rude', text: REPLY_RUDE },
      ]),
    );
    this.dialogue.setVisible(false);
    if (reply === 'rude') return this.fail('rude');
    this.bird.play('happy', 'front');
    await this.wait(400);
  }

  // S7: tap to fill the meter; meter value maps to scroll toward the light.
  async s7Sprint() {
    this.setState('S7');
    const startX = SEGMENT_PX * 3;
    this.meter = new TapMeter(C.SPRINT_GAIN, C.SPRINT_DECAY_PER_S);
    const view = new MeterView(this);
    this.bird.play('run', 'side');
    await this.guard(
      new Promise((resolve) => {
        this.tapHandler = (p) => {
          if (this.timer.expired) return;
          this.meter.tap();
          view.press();
          burst(this, 'fx_tap_ripple', p.x, p.y, { depth: 200 });
          if (this.meter.full) resolve();
        };
        this.tickS7 = (dt) => {
          this.meter.update(dt);
          view.set(this.meter.value);
          this.worldX = startX + this.meter.value * C.SPRINT_DISTANCE_PX;
        };
      }),
    );
    this.tapHandler = null;
    this.tickS7 = null;
    view.set(1);
    this.worldX = FINAL_WORLD_X;
    return this.win();
  }

  // ---------- endings ----------
  async win() {
    if (this.ended) return;
    this.won = true;
    this.ended = true;
    this.setState('WIN');
    this.cameras.main.shakeEffect.reset();
    const tw = (cfg) => new Promise((r) => this.tweens.add({ ...cfg, onComplete: r }));
    // Run into the light, fade to a white silhouette, then white out.
    this.bird.play('run', 'side');
    await tw({ targets: this.bird.sprite, x: C.STALL_STOP_X, duration: 700, ease: 'Linear' });
    const s = this.bird.sprite;
    const sil = this.add.sprite(s.x, s.y, s.texture.key, s.frame.name).setOrigin(0.5, 1).setDepth(s.depth + 2).setFlipX(s.flipX);
    sil.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setAlpha(0);
    s.stop();
    await tw({ targets: sil, alpha: 1, duration: 400 });
    const white = this.add.image(0, 0, 'fx_whiteout').setOrigin(0).setDepth(1000).setAlpha(0);
    await tw({ targets: white, alpha: 1, duration: C.WHITEOUT_MS });
    this.onWin?.(this.character, this);
  }

  /** Every fail path: caught sequence, then the single Game over screen. */
  fail(reason) {
    if (this.ended) return;
    this.ended = true;
    this.setState('GAME_OVER');
    this.failReason = reason;
    this.tapHandler = null;
    this.tickS1 = this.tickS7 = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.choices.clear();
    this.jars?.forEach((j) => j.active && j.disableInteractive());
    this.input.enabled = false;
    this.cameras.main.shakeEffect.reset();

    if (!this.chaser) {
      this.chaser = this.add.sprite(C.GAME_W + 40, C.CHASER_HOVER_Y, 'chaser', 0).setDepth(45).setFlipX(faces('chaser') === 'right');
    }
    this.chaser.stop().setFrame(FRAMES.chaser.openMouth).setDepth(150);
    this.bird.play('scared', 'side');
    this.tweens.add({ targets: this.chaser, x: C.BIRD_X + 8, y: C.GROUND_Y - 30, duration: C.CAUGHT_MS * 0.6, ease: 'Quad.easeIn' });
    this.time.delayedCall(C.CAUGHT_MS * 0.6, () => {
      this.cameras.main.flash(150, 240, 45, 240);
      this.cameras.main.shake(250, 0.01);
    });
    this.time.delayedCall(C.CAUGHT_MS, () => {
      this.scene.start('GameOver', { reason, onGameOver: this.onGameOver });
    });
  }

  // ---------- per frame ----------
  update(time, delta) {
    const dt = Math.min(delta, 100) / 1000;
    this.dialogue.update(dt);
    this.tickS1?.(dt);
    this.tickS7?.(dt);

    if (this.world) {
      this.world.x = Math.round(this.worldX);
      this.far.tilePositionX = -Math.round(this.worldX * C.FAR_PARALLAX);
    }
    if (this.running && time - (this.lastDust ?? 0) > 220) {
      this.lastDust = time;
      burst(this, 'fx_dust', C.BIRD_X + 10, C.GROUND_Y - 3, { dx: 8, ms: 300 });
    }
    this.bird.sync();

    if (!this.timer.started || this.won) return;
    const remaining = this.timer.remainingS();
    this.timerBar.update(remaining / C.CHASE_TIME_S, Math.min(1, this.worldX / FINAL_WORLD_X));
    if (this.ended) return;

    if (this.timer.expired) {
      this.fail('chaseTimeout');
      return;
    }
    this.updateChaser(time, remaining);
  }

  updateChaser(time, remaining) {
    const c = this.chaser;
    if (!c) return;
    const stage = chaserStage(remaining, C.CHASER_STAGE_REMAINING_S);
    if (stage > this.stage && this.stage >= 0) {
      this.stage = stage;
      this.tweens.add({ targets: c, x: C.CHASER_X_BY_STAGE[stage], duration: 600, ease: 'Quad.easeOut' });
      if (stage === C.CHASER_STAGE_REMAINING_S.length) c.stop().setFrame(FRAMES.chaser.openMouth);
    }
    c.y = C.CHASER_HOVER_Y + Math.round(Math.sin(time / 300) * 2);
    this.chaserShadow?.setX(c.x);
    if (remaining <= C.SHAKE_LAST_S && !this.cameras.main.shakeEffect.isRunning) {
      this.cameras.main.shake(250, C.SHAKE_INTENSITY);
    }
  }
}

// Scene 2: Trick or Treat run. State machine from scene2-spec.md section 6.
//
//   S0 angel intro -> WALK -> S1 stall 1 (Krahang): dialogue, shake, tap game
//   -> WALK -> S2 stall 2 (jar ghost): dialogue, shake, jar game -> S3 letter,
//   chase starts (2:00 timer) -> S4..S6 stalls 3..5 -> S7 final sprint -> scene 3
//   any fail -> caught sequence -> GameOver scene (single Home button)
//
// Each state is an async step. When the run ends (fail or win) `this.ended` is
// set and every pending wait/tween promise stops resolving, so no step can
// continue after a Game over, even one that was mid-dialogue.
import Phaser from 'phaser';
import * as C from '../config/constants.js';
import { MANIFEST, FRAMES } from '../assets/manifest.js';
import { layoutInstances, nativeLayer } from '../assets/loader.js';
import {
  ANGEL_PAGES,
  LETTER_LINES,
  STALL1_PAGES,
  CHASER_INTRO_PAGES,
  STALL2_PAGES,
  STALL4_PAGES,
  STALL5_PAGES,
  REPLY_POLITE,
  REPLY_RUDE,
  NAMES,
} from '../data/script.js';
import { resolveToday, stall3Pages } from '../logic/ticket.js';
import { TapMeter } from '../logic/meter.js';
import { ChaseTimer, chaserStage } from '../logic/chaseTimer.js';
import { minHitLogical, setupScene, pointerPos } from '../display/integerScale.js';
import { createPlaceholderCharacter } from '../interfaces.js';
import { scene1KrahangCombo } from '../integration/scene1.js';
import { Dialogue } from '../ui/Dialogue.js';
import { Choices } from '../ui/Choices.js';
import { MeterView } from '../ui/Meter.js';
import { TimerBar } from '../ui/TimerBar.js';
import { ensureFxAnims, burst } from '../ui/fx.js';
import { wrap, addLines, setLines, textStyle } from '../ui/text.js';
import { checkDialogues } from '../dev/dialogueCheck.js';
import { BirdActor } from './BirdActor.js';

const faces = (key) => MANIFEST.find((m) => m.key === key)?.facing ?? 'left';
const lerp = (a, b, t) => a + (b - a) * t;

// Scroll distance at which each stall (1..5) stops at STALL_STOP_X (spec 7.4).
const WALK_PX = C.WALK_SPEED_PX_S * C.WALK_SEGMENT_S;
const RUN_PX = C.RUN_SPEED_PX_S * C.RUN_SEGMENT_S;
const STALL_SCROLL = [WALK_PX, WALK_PX * 2, WALK_PX * 2 + RUN_PX, WALK_PX * 2 + RUN_PX * 2, WALK_PX * 2 + RUN_PX * 3];
const STALL_WORLD_X = STALL_SCROLL.map((s) => C.STALL_STOP_X - s);
const FINAL_WORLD_X = STALL_SCROLL[4] + C.SPRINT_DISTANCE_PX; // scroll at which the light is reached
const LIGHT_ENTRANCE_IN_PIECE = 52; // entrance centre from the piece's left edge
const COUNTER_Y = C.GROUND_Y - C.STALL_H + C.STALL_COUNTER_Y; // counter top on screen

export class TrickOrTreatScene extends Phaser.Scene {
  constructor() {
    super('TrickOrTreat');
  }

  init(data = {}) {
    const reg = this.registry;
    this.character = data.character ?? reg.get('character') ?? createPlaceholderCharacter(); // what is drawn
    this.passOn = data.passOn ?? this.character; // what onWin hands to scene 3 (spec 3: unchanged)
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
    setupScene(this);
    this.input.enabled = true;
    this.cameras.main.setBackgroundColor(C.CSS.black);
    this.buildWorld();
    this.buildAtmosphere();
    this.bird = new BirdActor(this, this.character, C.BIRD_X, C.PLAYER_Y);
    this.dialogue = new Dialogue(this);
    this.choices = new Choices(this);
    this.timerBar = new TimerBar(this);
    this.timerBar.setVisible(false);
    this.input.on('pointerdown', (p) => {
      if (!this.ended) this.tapHandler?.(p);
    });
    document.getElementById('boot')?.remove(); // first frame is up
    if (import.meta.env.DEV) {
      window.__scene2 = this;
      this.checkDialogues = () => checkDialogues(this);
    }
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('dialoguecheck')) return; // dev check only
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
    for (const n of [3, 4, 5]) mk(`stall_ghost_${n}_idle`, `stall_ghost_${n}`, FRAMES.stallGhost[n].frames, FRAMES.stallGhost[n].rate);
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

  /** Plays dialogue pages; screen taps go to the dialogue while it is open. */
  async talk(pages, opts = {}) {
    this.tapHandler = () => this.dialogue.tap();
    await this.guard(this.dialogue.play(pages, opts));
    this.tapHandler = null;
  }

  /**
   * Stall 1 and 2: dialogue, then when the last page finishes typing the screen
   * shakes and the minigame starts by itself (no extra tap).
   */
  async talkThenShake(pages, opts) {
    await this.talk(pages, { ...opts, keepOpen: true, waitLastTap: false });
    this.cameras.main.shake(C.PRE_GAME_SHAKE_MS, C.PRE_GAME_SHAKE_INTENSITY);
    await this.wait(C.PRE_GAME_SHAKE_MS);
    this.dialogue.setVisible(false);
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
      () => this.walkTo(0),
      () => this.s1Krahang(),
      () => this.walkTo(1),
      () => this.s2Jars(),
      () => this.s3LetterAndChase(),
      () => this.stall(2),
      () => this.stall(3),
      () => this.stall(4),
      () => this.s7Sprint(),
    ];
    for (const step of steps) {
      if (this.ended) return;
      await step();
    }
  }

  /** Scrolls the world until stall `i` stops at STALL_STOP_X. */
  async scrollTo(i, durationMs, animScale) {
    this.bird.play('run', 'side');
    this.bird.sprite.anims.timeScale = animScale;
    this.running = true;
    await this.tweenP({ targets: this, worldX: STALL_SCROLL[i], duration: durationMs, ease: 'Linear' });
    this.running = false;
    this.bird.sprite.anims.timeScale = 1;
    this.bird.play('idle', 'side');
  }

  // WALK: slower auto-scroll before stalls 1 and 2. No timer, no fail.
  async walkTo(i) {
    this.setState(`WALK${i + 1}`);
    await this.scrollTo(i, C.WALK_SEGMENT_S * 1000, C.WALK_SPEED_PX_S / C.RUN_SPEED_PX_S);
  }

  // S0: angel intro, 5 pages, no timer, then the angel disappears.
  async s0Angel() {
    this.setState('S0');
    this.bird.play('idle', 'side');
    const angelY = C.GROUND_Y - 8;
    // Pops in with a poof and sparkles, then just floats (one frame, no frame swaps).
    const angel = this.add.sprite(52, angelY + 6, 'angel_jayimpacts', 0).setOrigin(0.5, 1).setDepth(40).setAlpha(0);
    // The real angel sheet has the halo drawn in; the separate halo is only for marker art.
    const halo = this.add.image(52, angelY - 43, 'angel_halo').setDepth(41).setAlpha(0).setVisible(!this.registry.get('realArt')?.has('angel_jayimpacts'));
    burst(this, 'angel_poof', 52, angelY - 28, { depth: 43 });
    for (let i = 0; i < 4; i++) burst(this, 'angel_glint', 52 + Phaser.Math.Between(-18, 18), angelY - Phaser.Math.Between(8, 56), { depth: 42 });
    await this.tweenP({ targets: [angel, halo], alpha: 1, y: '-=6', duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [angel, halo], y: '-=3', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const glints = this.time.addEvent({
      delay: 600,
      loop: true,
      callback: () => burst(this, 'angel_glint', 52 + Phaser.Math.Between(-16, 16), angel.y - Phaser.Math.Between(10, 46), { depth: 42 }),
    });
    await this.talk(ANGEL_PAGES, { speaker: NAMES.angel });
    glints.remove();
    burst(this, 'angel_poof', 52, angel.y - 24, { depth: 43 });
    angel.destroy();
    halo.destroy();
    await this.wait(400);
  }

  // S1: stall 1. The Krahang talks, the screen shakes, then it leaps from its
  // stall onto the bird's back (right side). Tap to fling it off.
  async s1Krahang() {
    this.setState('S1');
    const st = this.stalls[0];
    await this.talkThenShake(STALL1_PAGES, { speaker: NAMES.stall1 });
    this.dimScene(true);

    // The Krahang lands where it sits in the riding art (on the player's back).
    const ride = this.clingCombo();
    const back = ride?.krahang ?? C.CLING_COMBO_KRAHANG;
    const backX = C.BIRD_X + back.x;
    const backY = C.PLAYER_Y + back.y;
    const from = this.worldToScreen(st.ghost);
    st.ghost.setVisible(false);
    const k = this.add.sprite(from.x, from.y - 16, 'krahang', 0).setDepth(55).setFlipX(faces('krahang') === 'right');
    k.play('krahang_jump');
    this.bird.play('scared');
    this.tweens.add({ targets: k, x: backX, duration: 600, ease: 'Linear' });
    await this.tweenP({ targets: k, y: C.PLAYER_Y - 90, duration: 300, ease: 'Quad.easeOut' });
    await this.tweenP({ targets: k, y: backY, duration: 300, ease: 'Quad.easeIn' });

    // While clinging, show the "Krahang riding the player" art: drawn for the default
    // bird, generated for each scene 1 character (tools/krahang_combo.py). Without it,
    // the Krahang's own cling frames go on top of the struggling player.
    let combo = null;
    if (ride) {
      k.setVisible(false).stop();
      this.bird.sprite.setVisible(false);
      combo = this.add.sprite(C.BIRD_X, C.PLAYER_Y, ride.key, 0).setOrigin(ride.originX, 1).setFlipX(ride.flipX).setDepth(55);
      if (ride.anim) combo.play(ride.anim);
    } else {
      k.play('krahang_cling');
    }
    this.bird.play('struggle');

    const meter = new TapMeter(C.TAP_GAME_GAIN, C.TAP_GAME_DECAY_PER_S);
    const view = new MeterView(this);
    const countdown = this.add.text(C.GAME_W / 2, 256, '', textStyle(C.FONT_TITLE_PX, C.CSS.yellow)).setOrigin(0.5).setDepth(92);
    const sweat = this.time.addEvent({ delay: 500, loop: true, callback: () => burst(this, 'fx_sweat', C.BIRD_X - 8, C.PLAYER_Y - 30, { dy: 4 }) });
    const endAt = this.time.now + C.TAP_GAME_TIME_S * 1000;
    let taps = 0;

    const result = await this.guard(
      new Promise((resolve) => {
        this.tapHandler = (p) => {
          if (this.time.now >= endAt) return;
          meter.tap();
          view.press();
          const w = pointerPos(this, p);
          burst(this, 'fx_tap_ripple', w.x, w.y, { depth: 200 });
          const jiggle = ++taps % 2 ? 1 : -1;
          if (combo) combo.x = C.BIRD_X + jiggle;
          else k.x = backX + jiggle;
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
    if (combo) {
      combo.destroy();
      this.bird.sprite.setVisible(true);
      k.setPosition(backX, backY).setVisible(true);
    }
    k.play('krahang_flung');
    for (let i = 0; i < 4; i++) burst(this, 'fx_feather', C.BIRD_X + 6, C.PLAYER_Y - 16, { dx: Phaser.Math.Between(4, 24), dy: Phaser.Math.Between(-16, 8), ms: 500 });
    this.bird.play('relieved', 'front');
    await this.tweenP({ targets: k, x: C.GAME_W + 40, y: C.PLAYER_Y - 120, duration: 550, ease: 'Quad.easeOut' });
    k.destroy();
    view.destroy();
    countdown.destroy();
    this.dimScene(false);
    await this.wait(500);
  }

  // S2: stall 2. The jar ghost talks (jar open with ghost), shake, then the jar
  // game on the stall counter: reveal, shuffle, pick.
  async s2Jars() {
    this.setState('S2');
    const st = this.stalls[1];
    st.ghost.play('jar_ghost');
    await this.talkThenShake(STALL2_PAGES, { speaker: NAMES.stall2 });
    st.ghost.setVisible(false).stop();
    this.dimScene(true);

    const jars = [];
    const letterSlot = Phaser.Math.Between(0, 1); // random every run
    C.JAR_XS.forEach((x, slot) => {
      const s = this.add.sprite(x - this.worldX, C.JAR_TABLE_Y, 'jar', FRAMES.jar.closed).setOrigin(0.5, 1);
      s.content = slot === letterSlot ? 'letter' : 'ghost';
      this.world.add(s);
      jars.push(s);
    });
    this.jars = jars;
    this.bird.play('idle', 'side');
    await this.wait(300);

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
      this.world.bringToTop(a);
      a.play('jar_shake');
      b.play('jar_shake');
      this.tweens.add({ targets: a, y: C.JAR_TABLE_Y - 10, duration: ms / 2, yoyo: true, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: b, x: ax, duration: ms, ease: 'Sine.easeInOut' });
      await this.tweenP({ targets: a, x: bx, duration: ms, ease: 'Sine.easeInOut' });
      a.stop().setFrame(FRAMES.jar.closed);
      b.stop().setFrame(FRAMES.jar.closed);
    }

    // Pick (no time limit, ASSUMPTION). Large hit areas that never overlap.
    const R = C.RENDER_SCALE;
    const minHit = minHitLogical(this.game, C.MIN_TOUCH_CSS_PX) * R; // texture px
    const spacing = Math.abs(C.JAR_XS[1] - C.JAR_XS[0]) * R;
    const picked = await this.guard(
      new Promise((resolve) => {
        jars.forEach((j) => {
          const fw = j.frame.width;
          const fh = j.frame.height;
          const w = Math.min(spacing, Math.max(fw, minHit));
          const h = Math.max(fh, minHit);
          j.setInteractive(new Phaser.Geom.Rectangle((fw - w) / 2, (fh - h) / 2, w, h), Phaser.Geom.Rectangle.Contains);
          j.once('pointerdown', () => resolve(j));
        });
      }),
    );
    jars.forEach((j) => j.disableInteractive());
    const at = this.worldToScreen(picked);

    if (picked.content === 'ghost') {
      picked.play('jar_ghost');
      this.bird.play('scared', 'side');
      const cam = this.cameras.main;
      cam.flash(200, 240, 45, 240);
      cam.shake(C.JUMP_SCARE_MS, 0.02);
      burst(this, 'fx_splat', at.x, at.y - 30, { depth: 60 });
      await this.wait(C.JUMP_SCARE_MS);
      return this.fail('ghostJar');
    }
    picked.play('jar_letter');
    this.bird.play('happy', 'front');
    this.dimScene(false);
    const icon = this.add.image(at.x, at.y - 30, 'letter_icon').setDepth(60);
    await this.tweenP({ targets: icon, x: C.GAME_W / 2, y: 120, duration: 500, ease: 'Quad.easeOut' });
    icon.destroy();
  }

  // S3: read the letter, then the chaser appears and the 2:00 timer starts.
  async s3LetterAndChase() {
    this.setState('S3');
    const { panel, texts, arrow } = this.buildLetter();
    await this.wait(400); // avoid the pick tap closing the letter at once
    await this.guard(new Promise((r) => (this.tapHandler = r)));
    this.tapHandler = null;
    [panel, arrow, ...texts].forEach((o) => o.destroy());
    this.bird.play('idle', 'side');

    // Chase intro cutscene: the chaser jumps in (open mouth, red flash, shake),
    // calls out in red, the bird turns back scared, the ghost floats in close.
    this.setState('S3_INTRO');
    this.chaser = this.add.sprite(C.CHASER_INTRO_FROM_X, C.CHASER_HOVER_Y, 'chaser', FRAMES.chaser.openMouth).setDepth(45);
    this.chaser.setFlipX(faces('chaser') === 'right');
    this.chaserShadow = this.add.image(this.chaser.x, C.PLAYER_Y + 1, 'ground_shadow').setOrigin(0.5, 1).setDepth(44);
    const cam = this.cameras.main;
    cam.flash(250, 200, 0, 0);
    cam.shake(450, 0.015);
    this.bird.lookBack(true);
    this.bird.play('scared', 'side');
    this.time.delayedCall(450, () => this.chaser.active && this.chaser.play('chaser_float'));
    this.tweens.add({ targets: this.chaser, x: C.CHASER_X_BY_STAGE[0], duration: C.CHASER_INTRO_FLOAT_MS, ease: 'Sine.easeInOut' });
    this.introFloat = true; // update() bobs the chaser while it floats in
    await this.talk(CHASER_INTRO_PAGES, { color: C.CHASER_TEXT_COLOR });

    // The chase starts: bird faces forward, 2:00 timer starts (same rule, never pauses).
    this.bird.lookBack(false);
    this.timer.start();
    this.timerBar.setVisible(true);
    this.stage = 0;
    await this.wait(200);
  }

  /**
   * Dark alley: drifting fog over the ground band and a shadow that almost
   * blacks out the top and bottom of the screen. Both sit above the world and
   * below the characters and UI.
   */
  buildAtmosphere() {
    this.fog = this.add.tileSprite(0, C.FOG_Y, C.GAME_W, 48, 'fx_fog').setOrigin(0).setDepth(15).setAlpha(C.FOG_ALPHA);
    this.fog2 = this.add.tileSprite(0, C.FOG_Y + 14, C.GAME_W, 48, 'fx_fog').setOrigin(0).setDepth(16).setAlpha(C.FOG_ALPHA * 0.6).setFlipX(true);
    this.vignette = this.add.image(0, 0, 'fx_vignette').setOrigin(0).setDepth(20);
  }

  /** Minigame focus: the world fades dark; the characters (above the dim layer) stay lit. */
  dimScene(on) {
    this.tweens.add({
      targets: this.dim,
      alpha: on ? C.MINIGAME_DIM_ALPHA : 0,
      duration: on ? C.MINIGAME_DIM_IN_MS : C.MINIGAME_DIM_OUT_MS,
      ease: 'Sine.easeInOut',
    });
  }

  /** Letter panel: one bold row per authored line (wrapped only if wider than the panel). */
  buildLetter() {
    const P = C.UI.letterPanel;
    const cx = C.GAME_W / 2;
    const top = C.LETTER_TOP;
    const panel = this.add.image(cx, top, 'letter_panel').setOrigin(0.5, 0).setDepth(150);
    const lines = LETTER_LINES.flatMap((l) => wrap(l, P.w - P.pad * 2, C.FONT_BODY_PX, true));
    const lh = C.LETTER_LINE_HEIGHT_PX;
    const texts = addLines(this, cx, top, lines.length, lh, { align: 'center', depth: 151, color: C.CSS.black, bold: true });
    setLines(texts, lines, { top, height: P.h, lineHeight: lh });
    const arrow = this.add.sprite(cx + P.w / 2 - 12, top + P.h - 12, 'ui_arrow', 0).setOrigin(0).setDepth(152).play('ui_arrow_blink');
    return { panel, texts, arrow };
  }

  /** "Krahang riding the player" art for S1, or null (then the Krahang's frames go on top). */
  clingCombo() {
    if (this.character.side.key === 'bird_side') {
      if (!this.registry.get('realArt')?.has('bird_krahang_cling')) return null;
      return { key: 'bird_krahang_cling', originX: C.CLING_COMBO_ORIGIN_X, flipX: faces('bird_krahang_cling') === 'right', krahang: C.CLING_COMBO_KRAHANG };
    }
    const c = scene1KrahangCombo(this.character.id);
    if (!c || this.character.side.key !== c.sideKey || !this.textures.exists(c.key)) return null;
    const anim = `${c.key}_cling`;
    if (!this.anims.exists(anim)) {
      // Pairs with the struggle frames (same rate as BirdActor's struggle).
      this.anims.create({ key: anim, frames: [...Array(c.frames).keys()].map((frame) => ({ key: c.key, frame })), frameRate: 8, repeat: -1 });
    }
    return { key: c.key, originX: c.originX, flipX: false, anim, krahang: c.krahangCentre };
  }

  worldToScreen(obj) {
    return { x: obj.x + this.world.x, y: obj.y + this.world.y };
  }

  /** Builds the scrolling route: soi, soi exit, street, white light, and the 5 stalls. */
  buildWorld() {
    const R = C.RENDER_SCALE;
    const far = nativeLayer(this, 'bg/alley_far') ?? 'bg_alley_far';
    const farScale = far === 'bg_alley_far' ? R : 1;
    this.far = this.add.tileSprite(0, 0, C.GAME_W * farScale, C.GAME_H * farScale, far).setOrigin(0).setDepth(1).setScale(1 / farScale);
    this.world = this.add.container(0, 0).setDepth(10);
    const W = 360;
    // Soi exit sits between stall 4 and stall 5 (ASSUMPTION for the split).
    const exitLeft = Math.round((STALL_WORLD_X[3] + STALL_WORLD_X[4]) / 2 - W / 2);
    const lightLeft = C.STALL_STOP_X - FINAL_WORLD_X - LIGHT_ENTRANCE_IN_PIECE;
    const near = nativeLayer(this, 'bg/alley_near') ?? 'bg_alley_near';
    const pieces = [];
    for (let x = exitLeft + W; x < C.GAME_W; x += W) pieces.push([near, x]);
    const piece = (name) => nativeLayer(this, `bg/${name}`) ?? name; // pipeline output, else marker
    pieces.push([piece('bg_alley_exit'), exitLeft]);
    for (let right = exitLeft; right > lightLeft + W; right -= W) pieces.push([piece('bg_street'), right - W]);
    pieces.push([piece('bg_light_end'), lightLeft]);
    for (const [key, x] of pieces) this.world.add(this.add.image(x, 0, key).setOrigin(0));

    // Props from assets/bg/alley_layout.json (tiled every 720 px over the soi part).
    for (const inst of layoutInstances(this)) {
      for (let base = exitLeft + W - 720; base > STALL_WORLD_X[4]; base -= 720) {
        if (base + inst.x > exitLeft + W) continue;
        this.world.add(this.add.image(base + inst.x, inst.y, inst.key).setOrigin(0, 1));
      }
    }

    // Stalls. Draw order per stall: stall, ghost/staff, stall_front (counter),
    // so the ghost stands behind the counter with head and shoulders above it.
    const ghostBottom = COUNTER_Y + C.GHOST_SINK;
    this.stalls = STALL_WORLD_X.map((x, i) => {
      const n = i + 1;
      const kind = C.STALL_KIND[n];
      const booth = this.add.image(x, C.GROUND_Y, `stall_${kind}`).setOrigin(0.5, 1);
      let ghost;
      if (n === 1) ghost = this.add.sprite(x, ghostBottom, 'krahang', FRAMES.krahang.jumpOn[0]).setOrigin(0.5, 1);
      else if (n === 2) ghost = this.add.sprite(x, C.JAR_TABLE_Y, 'jar', FRAMES.jar.closed).setOrigin(0.5, 1);
      // Stalls 3-5: the ghost stands on the ground next to the stall's right side, facing the camera.
      else ghost = this.add.sprite(x + C.STALL_GHOST_OFFSET_X, C.GROUND_Y, `stall_ghost_${n}`, 0).setOrigin(0.5, 1).play(`stall_ghost_${n}_idle`);
      const front = this.add.image(x, C.GROUND_Y, `stall_${kind}_front`).setOrigin(0.5, 1);
      // The jar sits ON the counter, so it goes above the front.
      // Stall 2's jar sits on the counter and stalls 3-5 ghosts stand in front, so both go above the front.
      this.world.add(n === 1 ? [booth, ghost, front] : [booth, front, ghost]);
      return { booth, ghost, front };
    });
    // Minigame dim layer: inside the world, above stalls and scenery. Jars are added
    // to the world after it, and the bird and Krahang are above the world, so they stay lit.
    this.dim = this.add.rectangle(0, 0, C.GAME_W, C.GAME_H, 0x000000).setOrigin(0).setAlpha(0);
    this.world.add(this.dim);
  }

  // S4-S6: auto-run to stalls 3..5 (index 2..4), then their dialogue.
  async stall(i) {
    const n = i + 1;
    this.setState(`S${n + 1}`);
    await this.scrollTo(i, C.RUN_SEGMENT_S * 1000, 1);

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
    const startX = STALL_SCROLL[4];
    this.meter = new TapMeter(C.SPRINT_GAIN, C.SPRINT_DECAY_PER_S);
    const view = new MeterView(this);
    this.bird.play('run', 'side');
    await this.guard(
      new Promise((resolve) => {
        this.tapHandler = (p) => {
          if (this.timer.expired) return;
          this.meter.tap();
          view.press();
          const w = pointerPos(this, p);
          burst(this, 'fx_tap_ripple', w.x, w.y, { depth: 200 });
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
    const sil = this.bird.silhouette(); // bird and any costume layers, same frame and mirroring
    this.bird.sprite.stop();
    await tw({ targets: sil, alpha: 1, duration: 400 });
    const white = this.add.image(0, 0, 'fx_whiteout').setOrigin(0).setDepth(1000).setAlpha(0);
    await tw({ targets: white, alpha: 1, duration: C.WHITEOUT_MS });
    this.onWin?.(this.passOn, this);
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
    this.tweens.add({ targets: this.chaser, x: C.BIRD_X + 8, y: C.PLAYER_Y - 30, duration: C.CAUGHT_MS * 0.6, ease: 'Quad.easeIn' });
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

    // Move in art-pixel steps (1 / RENDER_SCALE design px) for smooth scrolling.
    const R = C.RENDER_SCALE;
    this.world.x = Math.round(this.worldX * R) / R;
    this.far.tilePositionX = -Math.round(this.worldX * C.FAR_PARALLAX * this.far.scaleX ** -1);
    this.dim.x = -this.world.x; // screen-fixed inside the scrolling world
    const drift = (time / 1000) * C.FOG_DRIFT_PX_S;
    this.fog.tilePositionX = Math.round(-this.worldX * C.FOG_PARALLAX + drift);
    this.fog2.tilePositionX = Math.round(-this.worldX * C.FOG_PARALLAX * 1.3 - drift * 0.6);
    if (this.running && time - (this.lastDust ?? 0) > 220) {
      this.lastDust = time;
      burst(this, 'fx_dust', C.BIRD_X + 10, C.PLAYER_Y - 3, { dx: 8, ms: 300 });
    }
    this.bird.sync();

    if (this.introFloat && this.chaser) {
      this.chaser.y = C.CHASER_HOVER_Y + Math.round(Math.sin(time / 300) * 2);
      this.chaserShadow?.setX(this.chaser.x);
    }
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
    this.introFloat = false;
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

// Scene 3 world view: draws the simulation (logic/world.js). Ground pre-rendered to one
// canvas per look; everything else is a sprite sorted by its foot y. Camera follows the
// player at one of five zoom levels. Input arrives from the HUD scene (HudScene.js).
import Phaser from 'phaser';
import { WORLD, OBJECTS, GUIDE_PATH, EXIT_ARROW, HOUSE_BASE, BAND, GHOST_SPOTS, spread, dist } from '../logic/layout.js';
import { MUSICIANS, STALL_ROW } from '../logic/npcs.js';
import { drawGround } from '../ground.js';
import { COSTUMES, GHOSTS, R, animKey } from '../assets.js';
import { ZOOM_LEVELS, CHAR_PX_PER_UNIT, BANG_RANGE } from '../config.js';

const CH_SCALE = 1 / (R * CHAR_PX_PER_UNIT); // 3x character textures -> world units
const DESIGN = 1 / CHAR_PX_PER_UNIT; // 1 design px in world units
const HEAD = { front: { x: 16, y: 8 }, side: { x: 13, y: 8 } }; // head top in a 32 x 36 cell (design px)

/** A character on the map: sprite, ground shadow, optional accessory. */
class Actor {
  constructor(scene, costume, acc = null) {
    this.scene = scene;
    this.costume = COSTUMES[costume] ? costume : 'nuannapa';
    const c = COSTUMES[this.costume];
    this.cell = c.cell;
    this.shadow = scene.add.image(0, 0, 'c_shadow').setScale(CH_SCALE).setDepth(-500);
    this.sprite = scene.add.sprite(0, 0, `ch_${this.costume}_front`, 0).setOrigin(0.5, 1).setScale(CH_SCALE);
    this.acc = acc ? scene.add.image(0, 0, `c_acc_${acc}`).setScale(CH_SCALE) : null;
    this.accName = acc;
    this.anim = '';
  }

  set(x, y, view, facing, action) {
    const key = animKey(this.scene, this.costume, view, action);
    if (key !== this.anim) {
      this.anim = key;
      this.sprite.play(key);
    }
    const flip = view === 'side' && facing === 'right';
    this.sprite.setPosition(x, y).setFlipX(flip).setDepth(y);
    this.shadow.setPosition(x, y - 0.4);
    if (this.acc) {
      const h = HEAD[view];
      const hx = (flip ? this.cell.w - 1 - h.x : h.x) - this.cell.w / 2;
      const top = y - (this.cell.h - h.y) * DESIGN;
      const a = this.accName;
      let ax = x + hx * DESIGN;
      let ay = top + 2 * DESIGN;
      let ox = 0.5;
      let oy = 1;
      if (a === 'headphones') ay = top + 7 * DESIGN;
      if (a === 'guitar') [ax, ay, oy] = [x + 1 * DESIGN, y - 6 * DESIGN, 1];
      if (a === 'cajon') [ax, ay, oy] = [x + 9 * DESIGN, y, 1];
      if (a === 'mic') [ax, ay, oy] = [x + 7 * DESIGN, y - 15 * DESIGN, 1];
      this.acc.setOrigin(ox, oy).setPosition(ax, ay).setFlipX(flip).setDepth(y + 0.05);
    }
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
    this.acc?.setVisible(v);
  }

  get height() {
    return this.cell.h * DESIGN;
  }
}

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('S3World');
  }

  create() {
    const S = (this.S = this.registry.get('scene3'));
    this.world = S.world;
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.setBackgroundColor('#000000');

    // Ground canvases (day and night), drawn once.
    const tiles = this.textures.get('tiles').getSourceImage();
    const img = (key) => this.textures.get(key).getSourceImage();
    for (const night of [false, true]) {
      const key = night ? 'ground_night' : 'ground_day';
      if (!this.textures.exists(key)) {
        const t = this.textures.createCanvas(key, WORLD.w, WORLD.h);
        drawGround(t.getSourceImage(), tiles, img, night);
        t.refresh();
      }
    }
    this.ground = this.add.image(0, 0, 'ground_day').setOrigin(0).setDepth(-1000);

    // Props.
    this.props = [];
    for (const o of OBJECTS) this.addObject(o);
    this.windows = this.add.image(spread(HOUSE_BASE).x, spread(HOUSE_BASE).y, 'w_haunted_windows').setOrigin(0.5, 1).setDepth(spread(HOUSE_BASE).y + 0.01).setBlendMode(Phaser.BlendModes.ADD);

    // Characters.
    this.player = new Actor(this, S.character.id);
    this.npcActors = new Map(this.world.npcs.map((n) => [n.key, new Actor(this, n.def.costume, n.def.acc)]));
    // The band stands on the deck: drawn just in front of it, not sorted behind it.
    const onStage = BAND.deck.y + 0.5;
    this.musicians = MUSICIANS.map((m) => {
      const a = new Actor(this, m.costume, m.acc);
      a.set(m.at.x, m.at.y, 'front', 'left', 'idle');
      a.sprite.setDepth(onStage);
      a.acc?.setDepth(onStage + 0.05);
      a.shadow.setVisible(false);
      return a;
    });
    this.welcomeJay = new Actor(this, 'jayimpacts');

    // Markers: "!" bubbles, guide arrows, exit arrow, target cross, map frame.
    this.bangs = new Map([...this.world.npcs.map((n) => n.key), STALL_ROW.key].map((k) => [k, this.add.image(0, 0, 'c_bang').setOrigin(0.5, 1).setScale(CH_SCALE).setVisible(false)]));
    this.guides = this.makeGuides();
    this.exitArrow = this.add.image(EXIT_ARROW.x, EXIT_ARROW.y, 'c_exit_arrow').setOrigin(0.5, 1).setScale(CH_SCALE).setDepth(5000).setVisible(false);
    this.cross = this.add.image(0, 0, 'c_cross').setScale(CH_SCALE).setDepth(-400).setVisible(false);
    this.mapFrame = this.add.graphics().setDepth(9000).setVisible(false);

    this.applyNight(S.night);
    this.applyZoom(true);
    // Arriving from scene 2's white light: the screen starts white and fades off.
    this.cameras.main.fadeIn(1600, 255, 255, 255);
    this.registry.events.on('changedata-viewZoom', () => this.applyZoom(true));
    this.events.on('shutdown', () => this.registry.events.removeAllListeners('changedata-viewZoom'));
    this.time0 = 0;
  }

  addObject(o) {
    const n = this.S.night ? '_n' : '';
    const key = (base) => `w_${base}`;
    if (o.kind === 'ghostStall') return this.addGhostStall(o);
    if (o.layered) {
      const back = this.add.image(o.x, o.y, key(`${o.sprite}_back`)).setOrigin(0.5, 1).setDepth(o.y - o.staffDy - 0.01);
      const front = this.add.image(o.x, o.y, key(`${o.sprite}_front`)).setOrigin(0.5, 1).setDepth(o.y);
      this.props.push({ img: back, base: `${o.sprite}_back` }, { img: front, base: `${o.sprite}_front` });
      return;
    }
    if (o.kind === 'sign') {
      const img = this.add.image(o.x, o.y, 'c_cozy_sign').setOrigin(0.5, 1).setScale(CH_SCALE).setDepth(o.y);
      this.props.push({ img, base: 'cozy_sign', charRes: true });
      return;
    }
    const img = this.add.image(o.x, o.y, key(o.sprite)).setOrigin(0.5, 1).setDepth(o.y + (o.depthBias ?? 0));
    this.props.push({ img, base: o.sprite });
    void n;
  }

  /** Scene 2 stall, and its ghost standing beside it (to the right) with a small idle bob. */
  addGhostStall(o) {
    const g = GHOSTS[o.number];
    const s = 1 / CHAR_PX_PER_UNIT; // 1x design textures
    this.add.image(o.x, o.y, `gs_stall_${g.stall}`).setOrigin(0.5, 1).setScale(s).setDepth(o.y);
    const spot = GHOST_SPOTS.find((x) => x.number === o.number);
    const ghost = this.add.sprite(spot.x, spot.y, `ghost_${g.key}`, g.loop[0]).setOrigin(0.5, 1).setScale(CH_SCALE).setDepth(spot.y);
    ghost.play(`ghost_${g.key}`);
    ghost.bob = { top: spot.y, phase: o.number };
    this.add.image(spot.x, spot.y - 0.4, 'c_shadow').setScale(CH_SCALE).setDepth(-500);
    (this.ghosts ??= []).push(ghost);
  }

  makeGuides() {
    const out = [];
    let k = 0;
    for (let i = 0; i < GUIDE_PATH.length - 1; i++) {
      const a = GUIDE_PATH[i];
      const b = GUIDE_PATH[i + 1];
      const d = dist(a, b);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (let t = i === 0 ? 20 : 0; t < d; t += 22, k++) {
        const x = a.x + ((b.x - a.x) * t) / d;
        const y = a.y + ((b.y - a.y) * t) / d;
        out.push(this.add.image(x, y, k % 3 === 0 ? 'c_arrow_hi' : 'c_arrow').setRotation(ang).setScale(CH_SCALE).setDepth(-450).setAlpha(0.95));
        out[out.length - 1].animated = k % 3 === 0; // every third arrow is animated
      }
    }
    return out;
  }

  applyNight(night) {
    this.S.night = night;
    this.ground.setTexture(night ? 'ground_night' : 'ground_day');
    for (const p of this.props) {
      if (p.charRes) {
        p.img.setTexture(night ? 'c_cozy_sign_n' : 'c_cozy_sign');
        continue;
      }
      const k = `w_${p.base}${night ? '_n' : ''}`;
      p.img.setTexture(this.textures.exists(k) ? k : `w_${p.base}`);
    }
    this.cameras.main.setBackgroundColor(night || this.centred ? '#000000' : '#6EC6F5');
  }

  /** Zoom level index -> camera zoom (device px per map unit). */
  zoomValue(i = this.S.zoom) {
    const z = ZOOM_LEVELS[i];
    return z === 'fit' ? 180 / WORLD.w : z;
  }

  applyZoom(snap = false) {
    const viewZoom = this.registry.get('viewZoom') || 3;
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    const z = this.S.mapOpen ? 180 / WORLD.w : this.zoomValue();
    cam.setZoom(viewZoom * z);
    this.designZoom = z;
    // When the whole map is shorter than the window (fit, MAP) it is centred on black.
    this.centred = WORLD.h * z < 320;
    if (this.centred) cam.removeBounds();
    else cam.setBounds(0, 0, WORLD.w, WORLD.h);
    cam.setBackgroundColor(this.centred || this.S.night ? '#000000' : '#6EC6F5');
    if (snap) this.follow(true);
  }

  follow() {
    const cam = this.cameras.main;
    if (this.S.mapOpen || this.centred) {
      cam.centerOn(WORLD.w / 2, WORLD.h / 2);
      return;
    }
    const p = this.world.player;
    cam.centerOn(p.x, p.y - 8);
  }

  /** The MAP view: the whole map at the window width with a yellow frame for the camera. */
  setMap(open) {
    const cam = this.cameras.main;
    if (open) {
      const v = cam.worldView;
      this.mapFrameRect = [v.x, v.y, v.width, v.height];
    }
    this.S.mapOpen = open;
    this.applyZoom(true);
    this.mapFrame.clear().setVisible(open);
    if (open) {
      const [x, y, w, h] = this.mapFrameRect;
      this.mapFrame.lineStyle(3, 0xffff4f, 1).strokeRect(x, y, w, h);
    }
  }

  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000);
    const S = this.S;
    const ev = S.paused ? [] : this.world.update(dt, S.input);
    if (ev.length) this.game.events.emit('s3-events', ev);
    const w = this.world;

    // Player.
    const p = w.player;
    this.player.set(p.x, p.y, p.view, p.facing, p.moving ? 'walk' : 'idle');

    // Characters.
    for (const n of w.npcs) {
      const a = this.npcActors.get(n.key);
      const on = w.present(n);
      a.setVisible(on);
      if (on) a.set(n.x, n.y, n.view, n.facing, n.moving ? 'walk' : 'idle');
      const bang = this.bangs.get(n.key);
      const show = on && !w.progress.talked.has(n.key) && dist(p, n) <= BANG_RANGE && !w.welcome.locked;
      bang.setVisible(show);
      if (show) bang.setPosition(n.x, n.y - a.height - 1 + Math.sin(time / 180) * 0.6).setDepth(n.y + 100);
    }
    const sb = this.bangs.get(STALL_ROW.key);
    const showRow = !w.progress.talked.has(STALL_ROW.key) && dist(p, STALL_ROW.bangAt) <= BANG_RANGE + 30;
    sb.setVisible(showRow).setPosition(STALL_ROW.bangAt.x, STALL_ROW.bangAt.y + Math.sin(time / 180) * 0.6).setDepth(9000);

    // Welcome Jayimpacts.
    const j = w.welcome.jay;
    this.welcomeJay.setVisible(j.visible);
    if (j.visible) this.welcomeJay.set(j.x, j.y, 'side', j.facing, j.anim);
    // The player faces Jay while he talks.
    if (w.welcome.state === 'talk') {
      p.view = 'side';
      p.facing = 'left';
    }

    // Ghost bob, haunted windows flicker.
    for (const g of this.ghosts ?? []) g.y = g.bob.top + (Math.sin(time / 400 + g.bob.phase) > 0 ? -DESIGN : 0);
    this.windows.setAlpha(S.night ? 0.55 + 0.45 * Math.abs(Math.sin(time / 230) * Math.sin(time / 97)) : 0.15 + 0.1 * Math.abs(Math.sin(time / 300)));

    // Guides until the player has talked to น้องบาส; the exit arrow once every goal is done.
    const guidesOn = !w.progress.talked.has('bas');
    for (const g of this.guides) {
      g.setVisible(guidesOn);
      if (guidesOn && g.animated) g.setAlpha(0.5 + 0.5 * Math.abs(Math.sin(time / 300)));
    }
    this.exitArrow.setVisible(w.progress.allGoals && !w.ended);
    if (this.exitArrow.visible) this.exitArrow.y = EXIT_ARROW.y + Math.sin(time / 200) * 1.5;

    // Target cross while a finger is held.
    const t = S.input.target;
    this.cross.setVisible(!!t && !w.locked);
    if (t) this.cross.setPosition(t.x, t.y);

    this.follow();
  }
}

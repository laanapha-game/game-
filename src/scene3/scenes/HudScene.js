// Scene 3 HUD and input (spec 6.2): every pointer and key goes through here first.
// Buttons: back (top left), progress chip (top centre, opens the checklist), MAP, ภารกิจ,
// AUTO/TALK, DAY/NIGHT, + and - zoom on the right edge. Then dialogue, overlays, and
// finally the world: hold a finger to walk toward it, tap a character to talk.
// Design space 180 x 320; hit areas grow to 44 CSS px.
import Phaser from 'phaser';
import { label, wrap } from '../ui/text.js';
import { Dialogue } from '../ui/Dialogue.js';
import { GOALS, LABELS, chipText, CHIP_DONE, WELCOME_PAGES, WELCOME_SPEAKER, AFTER_WELCOME_BANNER, ZOOM_HINT, VOUCHER_BANNER, PRIZE_BANNER, PRIZE_CHECK, THANKS } from '../data/script.js';
import { ZOOM_LEVELS, MIN_TOUCH_CSS_PX, PLATE_RANGE, URLS, STALL_BOOKING, TALK_RANGE, ZOOM_HINT_MS } from '../config.js';
import { ZONES, dist, inZone } from '../logic/layout.js';
import { STALL_ROW, GHOSTS } from '../logic/npcs.js';
import { audio } from '../../audio/engine.js';
import { openUrl } from '../ui/openUrl.js';

const W = 180;
const H = 320;
const BTN = {
  back: [2, 2, 22, 17],
  zoomIn: [160, 118, 18, 18],
  zoomOut: [160, 140, 18, 18],
  map: [2, 300, 42, 18],
  missions: [46, 300, 42, 18],
  act: [90, 300, 42, 18],
  night: [134, 300, 44, 18],
};

export class HudScene extends Phaser.Scene {
  constructor() {
    super('S3Hud');
  }

  create() {
    const S = (this.S = this.registry.get('scene3'));
    this.world = S.world;
    const cam = this.cameras.main;
    const fit = () => {
      const z = this.registry.get('viewZoom') || 3;
      cam.setSize(this.scale.width, this.scale.height).setZoom(z).centerOn(W / 2, H / 2);
    };
    fit();
    this.registry.events.on('changedata-viewZoom', fit);
    cam.fadeIn(1600, 255, 255, 255); // the white light of scene 2 fades off

    this.g = this.add.graphics().setDepth(10);
    this.texts = {};
    for (const [k, txt] of Object.entries({ back: '<', zoomIn: '+', zoomOut: '-', map: LABELS.map, missions: LABELS.missions, act: LABELS.auto, night: LABELS.night })) {
      this.texts[k] = label(this, 0, 0, txt, { depth: 11, align: 'center' });
    }
    this.chip = label(this, W / 2, 0, '', { depth: 11, align: 'center' });
    this.plate = label(this, 0, 0, '', { depth: 12, align: 'center', color: '#FFFF4F' });
    this.hintTexts = ZOOM_HINT.map((t, i) => label(this, 0, 0, t, { depth: 12, align: 'center', color: i ? '#FFFFFF' : '#FFFF4F', px: 10 }).setVisible(false));
    this.hintUntil = 0;
    this.place = label(this, W / 2, 0, '', { depth: 12, align: 'center', color: '#FFFFFF', px: 10 });
    this.bannerG = this.add.graphics().setDepth(150);
    this.bannerTexts = [0, 1].map(() => label(this, W / 2, 0, '', { depth: 151, align: 'center', color: '#FFFF4F' }));
    this.banners = [];
    this.banner = null;
    this.dialogue = new Dialogue(this);
    this.overlay = null; // 'missions' | 'map'
    this.overlayG = this.add.graphics().setDepth(300);
    // Dims the game while a dialogue or panel is up, so the UI stands out.
    this.dim = this.add.rectangle(-20, -20, W + 40, H + 40, 0x000000, 1).setOrigin(0, 0).setDepth(100).setAlpha(0);
    this.overlayTexts = [];

    // Input: pointer (hold to walk), keys, wheel, pinch.
    S.input = { dir: null, target: null };
    this.input.addPointer(1);
    this.input.on('pointerdown', (p) => this.onDown(p));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.on('wheel', (p, o, dx, dy) => this.zoomStep(dy < 0 ? -1 : 1));
    this.keys = this.input.keyboard?.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,ENTER,ESC,M,PLUS,MINUS,NUMPAD_ADD,NUMPAD_SUBTRACT');
    this.input.keyboard?.on('keydown', (e) => this.onKey(e));

    this.game.events.on('s3-events', (ev) => this.onEvents(ev));
    this.events.on('shutdown', () => {
      this.game.events.removeAllListeners('s3-events');
      this.registry.events.off('changedata-viewZoom', fit);
    });
    this.minHit = () => Math.ceil(MIN_TOUCH_CSS_PX / (this.registry.get('cssScale') || 2));
  }

  // ---------------------------------------------------------------- geometry
  design(p) {
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  hit(rect, x, y) {
    const [rx, ry, rw, rh] = rect;
    const m = this.minHit();
    const gx = Math.max(0, (m - rw) / 2);
    const gy = Math.max(0, (m - rh) / 2);
    return x >= rx - gx && x <= rx + rw + gx && y >= ry - gy && y <= ry + rh + gy;
  }

  worldScene() {
    return this.scene.get('S3World');
  }

  toWorld(p) {
    return this.worldScene().cameras.main.getWorldPoint(p.x, p.y);
  }

  // ---------------------------------------------------------------- input
  onDown(p) {
    audio.unlock?.();
    const { x, y } = this.design(p);
    const w = this.world;
    if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
      this.pinch = dist(this.input.pointer1, this.input.pointer2);
      this.S.input.target = null;
      return;
    }
    w.stopAuto();
    if (this.dialogue.open) return this.dialogue.tap(x, y, (r, a, b) => this.hit(r, a, b));
    if (this.overlay === 'thanks') return this.tapThanks(x, y);
    if (this.overlay) return this.closeOverlay();
    if (w.welcome.locked) {
      const r = w.welcome.tap();
      if (r === 'talk') this.openWelcome();
      if (r === 'done') this.welcomeDone();
      return;
    }
    if (w.ended) return;
    for (const k of Object.keys(BTN)) if (this.hit(BTN[k], x, y)) return this.press(k);
    if (this.hit([W / 2 - 60, 2, 120, 16], x, y)) return this.press('missions');
    // A tap on a character: talk when close, otherwise walk there and talk on arrival.
    const wp = this.toWorld(p);
    const t = this.characterAt(wp);
    if (t) {
      this.pendingTalk = t;
      this.S.input.target = null;
      if (t.d <= TALK_RANGE) return this.talk(t.key);
      this.walkTo = { x: t.x, y: t.y + 3 };
      return;
    }
    this.pendingTalk = null;
    this.walkTo = null;
    this.S.input.target = wp;
    this.down = true;
  }

  onMove(p) {
    if (this.pinch && this.input.pointer1.isDown && this.input.pointer2.isDown) {
      const d = dist(this.input.pointer1, this.input.pointer2);
      if (d > this.pinch * 1.25) (this.zoomStep(-1), (this.pinch = d));
      if (d < this.pinch * 0.8) (this.zoomStep(1), (this.pinch = d));
      return;
    }
    if (this.down && p.isDown) this.S.input.target = this.toWorld(p);
  }

  onUp(p) {
    if (this.overlay === 'thanks' && this.thanksSwipe != null && p) {
      const dx = this.design(p).x - this.thanksSwipe;
      if (Math.abs(dx) > 20) this.showThanksPage(this.thanksPage + (dx < 0 ? 1 : -1));
    }
    this.thanksSwipe = null;
    this.down = false;
    this.pinch = null;
    this.S.input.target = null;
  }

  onKey(e) {
    const k = e.key;
    if (this.dialogue.open && (k === ' ' || k === 'Enter')) return this.dialogue.next();
    if (this.overlay === 'thanks') {
      if (k === 'ArrowLeft') this.showThanksPage(this.thanksPage - 1);
      if (k === 'ArrowRight') this.showThanksPage(this.thanksPage + 1);
      return;
    }
    if (this.overlay && (k === 'Escape' || k === 'm' || k === 'M')) return this.closeOverlay();
    if (this.world.welcome.locked && (k === ' ' || k === 'Enter')) {
      const r = this.world.welcome.tap();
      if (r === 'talk') this.openWelcome();
      if (r === 'done') this.welcomeDone();
      return;
    }
    if (k === '+' || k === '=') this.zoomStep(-1);
    if (k === '-' || k === '_') this.zoomStep(1);
    if (k === 'm' || k === 'M') this.press('map');
    if ((k === ' ' || k === 'Enter') && !this.dialogue.open) {
      const t = this.world.talkable();
      if (t) this.talk(t.key);
    }
  }

  /** Arrows/WASD each frame. */
  keyDir() {
    const K = this.keys;
    if (!K) return null;
    const x = (K.RIGHT.isDown || K.D.isDown ? 1 : 0) - (K.LEFT.isDown || K.A.isDown ? 1 : 0);
    const y = (K.DOWN.isDown || K.S.isDown ? 1 : 0) - (K.UP.isDown || K.W.isDown ? 1 : 0);
    if (x || y) this.world.stopAuto();
    return x || y ? { x, y } : null;
  }

  characterAt(wp) {
    const w = this.world;
    let best = null;
    for (const n of w.npcs) {
      if (!w.present(n)) continue;
      const cx = n.x;
      const cy = n.y - 6; // body centre
      const d = Math.hypot(wp.x - cx, wp.y - cy);
      if (d <= 9 && (!best || d < best.hd)) best = { key: n.key, x: n.x, y: n.y, hd: d, d: dist(w.player, n) };
    }
    for (const g of GHOSTS) {
      const d = Math.hypot(wp.x - g.x, wp.y - (g.y - 7));
      if (d <= 9 && (!best || d < best.hd)) best = { key: g.key, x: g.x, y: g.y, hd: d, d: dist(w.player, g) };
    }
    if (!best) {
      for (const t of STALL_ROW.touch) {
        const s = { x: t.x + 26, y: t.y - 10 }; // the stall itself
        if (Math.abs(wp.x - s.x) < 14 && Math.abs(wp.y - s.y) < 16) best = { key: STALL_ROW.key, x: t.x, y: t.y, d: dist(w.player, t) };
      }
    }
    return best;
  }

  press(k) {
    audio.sfx('ui_click');
    const S = this.S;
    const w = this.world;
    if (k === 'back') return S.callbacks.onBack();
    if (k === 'zoomIn') return this.zoomStep(-1);
    if (k === 'zoomOut') return this.zoomStep(1);
    if (k === 'map') return this.openMap();
    if (k === 'missions') return this.openMissions();
    if (k === 'night') {
      this.worldScene().applyNight(!S.night);
      return;
    }
    if (k === 'act') {
      const t = w.talkable();
      if (t) return this.talk(t.key);
      if (w.auto) w.stopAuto();
      else w.startAuto();
    }
  }

  zoomStep(d) {
    const S = this.S;
    if (S.mapOpen) return;
    S.zoom = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, S.zoom + d));
    S.zoomHinted = true;
    this.hintUntil = 0;
    this.worldScene().applyZoom(true);
  }

  // ---------------------------------------------------------------- talk
  talk(key) {
    const w = this.world;
    const t = w.startTalk(key);
    if (!t) return;
    this.walkTo = null;
    this.pendingTalk = null;
    const isJay = key === 'jay';
    let button = null;
    if (t.ig) button = { label: LABELS.igButton, onPress: () => openUrl(URLS.instagram) };
    if (key === STALL_ROW.key && STALL_BOOKING.url) button = { label: STALL_BOOKING.label, onPress: () => openUrl(STALL_BOOKING.url) };
    this.dialogue.show(t.pages, {
      speaker: t.speaker,
      portrait: isJay,
      button,
      onClose: () => this.onEvents(w.endTalk()),
    });
  }

  openWelcome() {
    const w = this.world;
    this.dialogue.show(WELCOME_PAGES, {
      speaker: WELCOME_SPEAKER,
      portrait: true,
      onPage: (i) => w.welcome.onPage(i),
      onClose: () => w.welcome.dialogueDone(),
    });
  }

  welcomeDone() {
    this.showBanner([AFTER_WELCOME_BANNER]);
  }

  onEvents(ev) {
    for (const e of ev) {
      if (e.type === 'welcome:talk') this.openWelcome();
      if (e.type === 'welcome:done') this.welcomeDone();
      if (e.type === 'goal') {
        audio.sfx('letter_chime');
        this.showBanner([e.goal.name, e.goal.line]);
      }
      if (e.type === 'voucher') {
        audio.sfx('angel_appear');
        this.showBanner([VOUCHER_BANNER]);
      }
      if (e.type === 'allGoals') {
        this.world.stopAuto();
        this.time.delayedCall(1200, () => this.openThanks()); // after a moment on the sixth place's banner
      }
      if (e.type === 'prize') this.showBanner([PRIZE_BANNER]);
      if (e.type === 'exitEarly') this.showBanner([e.text]);
      if (e.type === 'exit') {
        audio.sfx('scene3_chime');
        this.time.delayedCall(300, () => this.S.callbacks.toEnding());
      }
    }
    this.S.publish();
  }

  // ---------------------------------------------------------------- banners
  showBanner(lines) {
    this.banners.push(lines);
    if (!this.banner) this.nextBanner();
  }

  nextBanner() {
    const lines = this.banners.shift();
    this.bannerG.clear();
    this.bannerTexts.forEach((t) => t.setVisible(false));
    if (!lines) {
      this.banner = null;
      return;
    }
    const wrapped = lines.flatMap((l, i) => wrap(l, 150).map((s) => ({ s, sub: i > 0 }))).slice(0, 3);
    while (this.bannerTexts.length < wrapped.length) this.bannerTexts.push(label(this, W / 2, 0, '', { depth: 151, align: 'center' }));
    const h = wrapped.length * 16 + 8;
    const y0 = 40;
    this.bannerG.fillStyle(0x000000, 0.9).fillRect(10, y0, 160, h).lineStyle(1, 0xffff4f, 1).strokeRect(10.5, y0 + 0.5, 159, h - 1);
    wrapped.forEach((l, i) => this.bannerTexts[i].setText(l.s).setColor(l.sub ? '#FFFFFF' : '#FFFF4F').setPosition(W / 2, y0 + 4 + i * 16 - 4).setVisible(true));
    this.banner = this.time.delayedCall(2300, () => this.nextBanner());
  }

  // ---------------------------------------------------------------- overlays
  openMissions() {
    const w = this.world;
    this.overlay = 'missions';
    const g = this.overlayG.clear().setVisible(true);
    g.fillStyle(0x000000, 0.94).fillRect(8, 30, 164, 214).lineStyle(1, 0xffff4f, 1).strokeRect(8.5, 30.5, 163, 213);
    const add = (x, y, s, o = {}) => this.overlayTexts.push(label(this, x, y, s, { depth: 301, ...o }));
    add(W / 2, 32, LABELS.missions, { align: 'center', color: '#FFFF4F' });
    GOALS.forEach((goal, i) => {
      const done = w.progress.goals.has(goal.id);
      add(14, 52 + i * 22, done ? '✓' : '·', { color: done ? '#FFFF4F' : '#888888' });
      add(26, 52 + i * 22, goal.name, { color: done ? '#FFFFFF' : '#AAAAAA' });
    });
    add(14, 186, chipText(w.progress.goalCount, w.progress.vouchers), { color: '#FFFFFF' });
    if (w.progress.prize) add(14, 204, PRIZE_CHECK, { color: '#FFFF4F' });
    add(W / 2, 224, LABELS.close, { align: 'center', color: '#888888', px: 10 });
  }

  openMap() {
    this.overlay = 'map';
    this.worldScene().setMap(true);
    const g = this.overlayG.clear().setVisible(true);
    g.fillStyle(0x000000, 0.8).fillRect(0, 0, W, 18);
    this.overlayTexts.push(label(this, W / 2, 0, LABELS.map, { depth: 301, align: 'center', color: '#FFFF4F' }));
  }

  /**
   * All six places explored: a small card that pages book -> IG -> map (arrows, dots, swipe),
   * with จบเกม / คุยกับทีมงานต่อ always at the bottom.
   */
  openThanks() {
    const w = this.world;
    if (w.ended) return;
    if (this.dialogue.open) return this.time.delayedCall(500, () => this.openThanks());
    this.closeOverlay();
    this.banners = []; // the panel replaces any queued banners
    this.banner?.remove();
    this.nextBanner();
    this.hintUntil = 0;
    this.overlay = 'thanks';
    const g = this.overlayG.clear().setVisible(true);
    const P = (this.thanksPanel = { x: 14, y: 92, w: 152, h: 128 });
    g.fillStyle(0x000000, 1).fillRect(P.x, P.y, P.w, P.h).lineStyle(1, 0xffff4f, 1).strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
    this.overlayTexts.push(label(this, W / 2, P.y + 1, THANKS.title, { depth: 301, align: 'center', color: '#FFFF4F' }));
    g.lineStyle(1, 0x5a4a20, 1).lineBetween(P.x + 8, P.y + 21.5, P.x + P.w - 8, P.y + 21.5);
    const talkedAll = w.progress.targets.every((k) => w.progress.talked.has(k));
    const by = P.y + P.h - 24;
    const end = this.thanksButton(g, P.x + 6, by, 50, THANKS.end, 0x000000, 301);
    const more = this.thanksButton(g, P.x + 60, by, P.w - 66, talkedAll ? THANKS.keepWalking : THANKS.keepTalking, 0x000000, 301);
    this.thanksBtns = { end, more, prev: [P.x + 2, P.y + 26, 16, 52], next: [P.x + P.w - 18, P.y + 26, 16, 52] };
    this.thanksPageG = this.thanksPageG ?? this.add.graphics().setDepth(302);
    this.thanksPageObjs = [];
    this.showThanksPage(0);
  }

  thanksButton(g, x, y, bw, text, fill, depth, objs = this.overlayTexts) {
    const r = [x, y, bw, 18];
    g.fillStyle(fill, 1).fillRect(r[0], r[1], r[2], r[3]).lineStyle(1, 0xffff4f, 1).strokeRect(r[0] + 0.5, r[1] + 0.5, r[2] - 1, r[3] - 1);
    const px = wrap(text, bw - 6, 12).length > 1 ? 10 : 12;
    objs.push(label(this, x + bw / 2, 0, text, { depth: depth + 1, align: 'center', color: '#FFFFFF', px }).setOrigin(0.5, 0.5).setY(y + 8));
    return r;
  }

  showThanksPage(i) {
    const n = THANKS.pages.length;
    this.thanksPage = (i + n) % n;
    const pg = THANKS.pages[this.thanksPage];
    const P = this.thanksPanel;
    const g = this.thanksPageG.clear().setVisible(true);
    this.thanksPageObjs.forEach((o) => o.destroy());
    const objs = (this.thanksPageObjs = []);
    const cx = W / 2;
    // Icon and line on one row, centred together.
    const line = label(this, 0, 0, pg.line, { depth: 303, color: '#FFFFFF' });
    objs.push(line);
    const iw = 14;
    const lw = Math.ceil(line.width) - 8;
    const x0 = Math.round(cx - (iw + 4 + lw) / 2);
    const rowY = P.y + 26;
    this.drawIcon(g, pg.icon, x0, rowY + 1, objs);
    line.setPosition(x0 + iw + 4, rowY - 4);
    let y = rowY + 16;
    if (pg.sub) {
      objs.push(label(this, cx, y - 4, pg.sub, { depth: 303, align: 'center', color: '#FFFF4F', px: wrap(pg.sub, 112, 12).length > 1 ? 10 : 12 }));
    }
    const action = this.thanksButton(g, cx - 45, P.y + 60, 90, pg.button, 0x8f2f20, 302, objs);
    this.thanksBtns.action = action;
    this.thanksBtns.url = URLS[pg.url];
    // Arrows and dots.
    g.fillStyle(0xffff4f, 1);
    const ay = P.y + 50;
    g.fillTriangle(P.x + 12, ay - 5, P.x + 12, ay + 5, P.x + 6, ay);
    g.fillTriangle(P.x + P.w - 12, ay - 5, P.x + P.w - 12, ay + 5, P.x + P.w - 6, ay);
    for (let k = 0; k < n; k++) {
      g.fillStyle(k === this.thanksPage ? 0xffff4f : 0x5a5a5a, 1).fillRect(cx - (n * 8) / 2 + k * 8 + 2, P.y + 84, 4, 4);
    }
  }

  /** Small pixel icons (design px): ticket, Instagram glyph, map pin. */
  drawIcon(g, kind, x, y, objs) {
    if (kind === 'ticket') {
      objs.push(this.add.image(x, y + 3, 'c_ticket').setOrigin(0, 0).setScale(1 / 3).setDepth(303));
      return;
    }
    const px = (c, a, b) => g.fillStyle(c, 1).fillRect(x + a, y + b, 1, 1);
    if (kind === 'ig') {
      const N = 13;
      const stops = [
        [0, [0xfe, 0xda, 0x75]],
        [0.35, [0xf5, 0x85, 0x29]],
        [0.6, [0xdd, 0x2a, 0x7b]],
        [1, [0x81, 0x34, 0xaf]],
      ];
      const grad = (t) => {
        for (let k = 1; k < stops.length; k++) {
          if (t <= stops[k][0]) {
            const [t0, c0] = stops[k - 1];
            const [t1, c1] = stops[k];
            const f = (t - t0) / (t1 - t0);
            const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * f));
            return (c[0] << 16) | (c[1] << 8) | c[2];
          }
        }
        return 0x8134af;
      };
      for (let b = 0; b < N; b++) {
        for (let a = 0; a < N; a++) {
          if (Math.min(a, N - 1 - a) + Math.min(b, N - 1 - b) < 2) continue; // rounded corners
          const ring = (a === 2 || a === 10 || b === 2 || b === 10) && a >= 2 && a <= 10 && b >= 2 && b <= 10 && !((a === 2 || a === 10) && (b === 2 || b === 10));
          const d = Math.hypot(a - 6, b - 6);
          const lens = d >= 1.5 && d <= 2.6;
          const dot = a === 8 && b === 4;
          px(ring || lens || dot ? 0xffffff : grad((a + (N - 1 - b)) / (2 * (N - 1))), a, b);
        }
      }
      return;
    }
    if (kind === 'pin') {
      const rows = ['..XXXXX..', '.XXXXXXX.', 'XXXWWWXXX', 'XXWWWWWXX', 'XXWWWWWXX', 'XXXWWWXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
      rows.forEach((r, b) => [...r].forEach((ch, a) => ch !== '.' && px(ch === 'X' ? 0xea4335 : 0xffffff, a + 2, b + 1)));
    }
  }

  tapThanks(x, y) {
    const b = this.thanksBtns;
    if (this.hit(b.action, x, y)) return openUrl(b.url);
    if (this.hit(b.end, x, y)) {
      this.closeOverlay();
      return this.onEvents(this.world.finish());
    }
    if (this.hit(b.more, x, y)) return this.closeOverlay();
    if (this.hit(b.prev, x, y)) return this.showThanksPage(this.thanksPage - 1);
    if (this.hit(b.next, x, y)) return this.showThanksPage(this.thanksPage + 1);
    this.thanksSwipe = x; // a swipe across the card pages too (see onUp)
  }

  closeOverlay() {
    if (this.overlay === 'map') this.worldScene().setMap(false);
    this.thanksPageG?.clear().setVisible(false);
    this.thanksPageObjs?.forEach((o) => o.destroy());
    this.thanksPageObjs = [];
    this.thanksSwipe = null;
    this.overlay = null;
    this.overlayG.clear().setVisible(false);
    this.overlayTexts.forEach((t) => t.destroy());
    this.overlayTexts = [];
  }

  // ---------------------------------------------------------------- frame
  update(time) {
    const S = this.S;
    const w = this.world;
    S.paused = this.dialogue.open || this.overlay === 'missions' || this.overlay === 'thanks';
    // Walk to a tapped character (path straight; collision slides), then talk.
    S.input.dir = this.keyDir();
    if (this.walkTo && !w.locked) {
      S.input.target = this.walkTo;
      const pt = this.pendingTalk && w.targets().find((t) => t.key === this.pendingTalk.key);
      if (pt && pt.d <= TALK_RANGE) this.talk(pt.key);
      else if (dist(w.player, this.walkTo) < 2) this.walkTo = null;
    } else if (!this.down) S.input.target = null;
    // Once per session, after the welcome: point at the +/- buttons.
    if (!S.zoomHinted && !w.welcome.locked && !this.dialogue.open && !this.overlay) {
      S.zoomHinted = true;
      this.hintUntil = time + ZOOM_HINT_MS;
    }
    const dimTo = this.dialogue.open || this.overlay === 'missions' || this.overlay === 'thanks' ? 0.55 : 0;
    this.dim.alpha += (dimTo - this.dim.alpha) * Math.min(1, (this.game.loop.delta / 1000) * 10);
    if (Math.abs(this.dim.alpha - dimTo) < 0.01) this.dim.alpha = dimTo;
    this.dialogue.tick(time);
    this.drawHud(time);
  }

  /** A pulsing callout left of the +/- buttons: "you can zoom". */
  drawZoomHint(g, time, hidden) {
    const on = !hidden && time < this.hintUntil;
    this.hintTexts.forEach((t) => t.setVisible(on));
    if (!on) return;
    const blink = Math.floor(time / 400) % 2 === 0;
    const col = blink ? 0xffffff : 0xffff4f;
    for (const k of ['zoomIn', 'zoomOut']) {
      const r = BTN[k];
      g.lineStyle(1, col, 1).strokeRect(r[0] - 1.5, r[1] - 1.5, r[2] + 3, r[3] + 3);
    }
    const nudge = blink ? 0 : 1;
    const bx = 96 - nudge;
    const by = 122;
    const bw = 56;
    const bh = 30;
    g.fillStyle(0x000000, 0.9).fillRect(bx, by, bw, bh).lineStyle(1, 0xffff4f, 1).strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    // Arrow to the buttons.
    g.fillStyle(0xffff4f, 1).fillTriangle(bx + bw, by + bh / 2 - 4, bx + bw, by + bh / 2 + 4, bx + bw + 5, by + bh / 2);
    this.hintTexts.forEach((t, i) => t.setOrigin(0.5, 0).setPosition(bx + bw / 2, by - 3 + i * 13));
  }

  drawHud(time) {
    const g = this.g.clear();
    const w = this.world;
    const hidden = this.overlay === 'map' || w.ended;
    const box = (r, fill = 0x000000, line = 0xffff4f) => {
      g.fillStyle(fill, 0.85).fillRect(r[0], r[1], r[2], r[3]);
      g.lineStyle(1, line, 1).strokeRect(r[0] + 0.5, r[1] + 0.5, r[2] - 1, r[3] - 1);
    };
    const locked = w.welcome.locked;
    const talkable = !locked && w.talkable();
    this.texts.act.setText(talkable ? LABELS.talk : LABELS.auto);
    this.texts.night.setText(this.S.night ? LABELS.day : LABELS.night);
    for (const [k, r] of Object.entries(BTN)) {
      const t = this.texts[k];
      t.setVisible(!hidden);
      if (hidden) continue;
      const active = (k === 'act' && (talkable || w.auto)) || (k === 'map' && this.overlay === 'map');
      box(r, active ? 0x8f2f20 : 0x000000, locked ? 0x666666 : 0xffff4f);
      t.setOrigin(0.5, 0.5).setPosition(Math.round(r[0] + r[2] / 2), Math.round(r[1] + r[3] / 2) - 1).setColor(locked ? '#777777' : k === 'act' && talkable ? '#FFFF4F' : '#FFFFFF');
    }
    this.drawZoomHint(g, time, hidden || this.dialogue.open);
    // Progress chip.
    const done = w.progress.allGoals;
    const chip = done ? CHIP_DONE : chipText(w.progress.goalCount, w.progress.vouchers);
    this.chip.setText(chip).setVisible(!hidden);
    if (!hidden) {
      const cw = Math.ceil(this.chip.width) - 8 + 12;
      const pulse = done && Math.floor(time / 350) % 2 === 0;
      box([W / 2 - cw / 2, 2, cw, 17], pulse ? 0xde5238 : 0x000000, 0xffff4f);
      this.chip.setOrigin(0.5, 0.5).setPosition(W / 2, 10).setColor(done ? '#FFFF4F' : '#FFFFFF');
    }
    // Name plate over the nearest character; the place name under the chip.
    this.plate.setVisible(false);
    this.place.setVisible(false);
    if (hidden || this.dialogue.open || locked) return;
    const near = w
      .targets()
      .filter((t) => t.key !== STALL_ROW.key && t.d <= PLATE_RANGE)
      .sort((a, b) => a.d - b.d)[0];
    if (near) {
      const n = w.npc(near.key) ?? GHOSTS.find((g) => g.key === near.key);
      const plateText = n.def ? n.def.short : n.short;
      const ws = this.worldScene();
      const cam = ws.cameras.main;
      const z = ws.designZoom;
      const sx = (n.x - cam.worldView.x) * z;
      const sy = (n.y - 14 - cam.worldView.y) * z;
      this.plate.setText(plateText).setPosition(Math.round(sx), Math.round(sy - 16 - (z >= 2 ? 6 : 0))).setVisible(sy > 24 && sy < 290);
      if (this.plate.visible) {
        const pw = Math.ceil(this.plate.width) - 8 + 6;
        g.fillStyle(0x000000, 0.75).fillRect(Math.round(sx - pw / 2), this.plate.y + 4, pw, 13);
      }
    }
    const zone = Object.entries(ZONES).find(([, r]) => inZone(w.player, r));
    if (zone) {
      const goal = GOALS.find((x) => x.id === zone[0]);
      this.place.setText(goal.name).setPosition(W / 2, 18).setVisible(!this.banner);
    }
  }
}

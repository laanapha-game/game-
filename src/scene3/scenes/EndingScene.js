// Scene 3 ending (spec 6.6) and credits. Design space 180 x 320.
// Ending: the player's character, "สำรวจ n/6 จุด · คุยกับทีมงาน k/n", vouchers as ticket
// icons, the event card, the ticket phase line by date, and four buttons: จองบัตรเลย,
// Instagram, เครดิต, หน้าแรก. Links open in a new tab.
import Phaser from 'phaser';
import { label, wrap } from '../ui/text.js';
import { summaryText, voucherHowTo, prizeHowTo, ENDING_BUTTONS, CREDITS } from '../data/script.js';
import { EVENT_CARD, URLS, VOUCHER, SPECIAL_PRIZE, MIN_TOUCH_CSS_PX } from '../config.js';
import { ticketLine } from '../logic/ticketLine.js';
import { COSTUMES } from '../assets.js';
import { audio } from '../../audio/engine.js';
import { openUrl } from '../ui/openUrl.js';

const W = 180;
const H = 320;

function designCamera(scene) {
  const cam = scene.cameras.main;
  const fit = () => cam.setSize(scene.scale.width, scene.scale.height).setZoom(scene.registry.get('viewZoom') || 3).centerOn(W / 2, H / 2);
  fit();
  scene.registry.events.on('changedata-viewZoom', fit);
  scene.events.once('shutdown', () => scene.registry.events.off('changedata-viewZoom', fit));
}

function hitTest(scene, rect, x, y) {
  const m = Math.ceil(MIN_TOUCH_CSS_PX / (scene.registry.get('cssScale') || 2));
  const [rx, ry, rw, rh] = rect;
  const gx = Math.max(0, (m - rw) / 2);
  const gy = Math.max(0, (m - rh) / 2);
  return x >= rx - gx && x <= rx + rw + gx && y >= ry - gy && y <= ry + rh + gy;
}

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('S3Ending');
  }

  create() {
    const S = this.registry.get('scene3');
    designCamera(this);
    const p = S.world.progress;
    const night = S.night;
    this.cameras.main.setBackgroundColor(night ? '#000000' : '#4A1A14');
    const g = this.add.graphics();

    // The player's character (front idle, 2x: a whole-number scale).
    const id = COSTUMES[S.character.id] ? S.character.id : 'nuannapa';
    this.add.image(W / 2, 64, 'c_shadow').setScale(2 / 3);
    this.add.sprite(W / 2, 66, `ch_${id}_front`, 0).setOrigin(0.5, 1).setScale(2 / 3).play(`${id}_front_idle`);

    const center = (y, s, o = {}) => label(this, W / 2, y, s, { align: 'center', ...o }).setOrigin(0.5, 0.5);
    let y = 76;
    center(y, summaryText(p.goalCount, p.talked.size, p.targets.length), { color: '#FFFF4F' });
    y += 13;
    // Vouchers as small ticket icons (rows of 7).
    const per = 7;
    for (let i = 0; i < p.vouchers; i++) {
      const col = i % per;
      const row = Math.floor(i / per);
      this.add.image(W / 2 - (Math.min(p.vouchers, per) * 16) / 2 + 8 + col * 16, y + 3 + row * 10, 'c_ticket').setScale(1 / 3);
    }
    y += p.vouchers > per ? 22 : p.vouchers ? 12 : 0;
    center(y + 2, voucherHowTo(VOUCHER.howToUse), { color: '#FFFFFF', px: 10 });
    y += 12;
    if (p.prize) {
      center(y + 2, prizeHowTo(SPECIAL_PRIZE.howToClaim), { color: '#FFFF4F', px: 10 });
      y += 12;
    }
    // Event card.
    y += 4;
    const cardLines = [`${EVENT_CARD.dates} · ${EVENT_CARD.opens}`, EVENT_CARD.shortFilm, EVENT_CARD.mainProgram];
    const ch = cardLines.length * 15 + 6;
    g.fillStyle(0x000000, 0.9).fillRect(8, y, 164, ch).lineStyle(1, 0xde5238, 1).strokeRect(8.5, y + 0.5, 163, ch - 1);
    cardLines.forEach((l, i) => center(y + 10 + i * 15, l, { color: i ? '#FFFFFF' : '#FFFF4F' }));
    y += ch + 4;
    // Ticket phase by date (up to 2 lines), just above the buttons.
    const tl = wrap(ticketLine(S.today), 164).slice(0, 2);
    tl.forEach((l, i) => center(y + 8 + i * 15, l, { color: '#FFFF4F' }));

    // Buttons, anchored to the bottom.
    const B = (this.buttons = {
      book: { r: [10, 252, 160, 20], fill: 0xffff4f, color: '#000000', text: ENDING_BUTTONS.book, act: () => openUrl(URLS.booking) },
      instagram: { r: [10, 276, 160, 18], fill: 0xf02df0, color: '#000000', text: ENDING_BUTTONS.instagram, act: () => openUrl(URLS.eventInstagram) },
      credits: { r: [10, 298, 78, 18], fill: 0x000000, color: '#FFFFFF', text: ENDING_BUTTONS.credits, act: () => this.scene.start('S3Credits') },
      home: { r: [92, 298, 78, 18], fill: 0x000000, color: '#FFFFFF', text: ENDING_BUTTONS.home, act: () => S.callbacks.onHome() },
    });
    for (const b of Object.values(B)) {
      const [x, yy, w, h] = b.r;
      g.fillStyle(b.fill, 1).fillRect(x, yy, w, h).lineStyle(1, 0xffff4f, 1).strokeRect(x + 0.5, yy + 0.5, w - 1, h - 1);
      label(this, x + w / 2, yy + h / 2 - 1, b.text, { color: b.color }).setOrigin(0.5, 0.5);
    }
    this.input.on('pointerdown', (ptr) => {
      const { x, y: py } = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      for (const b of Object.values(B)) if (hitTest(this, b.r, x, py)) {
        audio.sfx('ui_click');
        b.act();
        return;
      }
    });
    S.publish();
    if (import.meta.env?.DEV) window.__scene3Ending = { ticketLine: ticketLine(S.today), buttons: Object.fromEntries(Object.entries(B).map(([k, b]) => [k, b.r])) };
  }
}

/** Credits: each team member's sprite beside the name, scrolling slowly. Tap to return. */
export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('S3Credits');
  }

  create() {
    designCamera(this);
    this.cameras.main.setBackgroundColor('#000000');
    // CREDITS (prototype): headings, lines, and team members with their sprite beside the name.
    this.rollY = H - 120;
    this.roll = this.add.container(0, this.rollY);
    let y = 0;
    for (const e of CREDITS) {
      if (e.gap) {
        y += e.gap;
        continue;
      }
      if (e.h) {
        this.roll.add(label(this, W / 2, y, e.h, { align: 'center', color: '#FFFF4F' }));
        y += 22;
        continue;
      }
      if (e.t) {
        this.roll.add(label(this, W / 2, y, e.t, { align: 'center', color: '#FFFFFF' }));
        y += 18;
        continue;
      }
      const id = COSTUMES[e.who] ? e.who : 'nuannapa';
      const cell = COSTUMES[id].cell;
      this.roll.add(this.add.sprite(40, y + cell.h, `ch_${id}_front`, 0).setOrigin(0.5, 1).setScale(1 / 3).play(`${id}_front_idle`));
      if (e.acc) this.roll.add(this.add.image(40, y + 10, `c_acc_${e.acc}`).setOrigin(0.5, 1).setScale(1 / 3));
      this.roll.add(label(this, 66, y + cell.h / 2 - 16, e.n, { color: '#FFFFFF' }));
      this.roll.add(label(this, 66, y + cell.h / 2, e.r, { color: '#AAAAAA', px: 10 }));
      y += Math.max(cell.h, 36) + 8;
    }
    this.rollH = y;
    this.input.on('pointerdown', () => {
      audio.sfx('ui_click');
      this.scene.start('S3Ending');
    });
  }

  update(time, dms) {
    this.rollY -= (dms / 1000) * 14; // slow scroll
    if (this.rollY < -this.rollH) this.rollY = H;
    this.roll.y = Math.round(this.rollY);
  }
}

// Scene 3 dialogue box (spec 6.5): black panel, yellow border, magenta name tag, 3 lines of
// 12 px text (about 150 px wide), a blinking arrow to continue, optional buttons on the
// last page (the IG button). Pages that would overflow are split, never clipped.
// Jayimpacts' pages show his portrait above the box.
import { label, wrap } from './text.js';
import { paginate } from '../../logic/textWrap.js';
import { LINE_H } from '../config.js';
import { audio } from '../../audio/engine.js';

const BOX = { x: 4, y: 224, w: 172, h: 70 };
const TEXT = { x: 11, y: 236, w: 150 };
const LINES = 3;
const DEPTH = 200;

export class Dialogue {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(DEPTH);
    this.tag = label(scene, 0, 0, '', { depth: DEPTH + 2, color: '#FFFFFF' });
    this.lines = Array.from({ length: LINES }, (_, i) => label(scene, TEXT.x, TEXT.y + i * LINE_H - 4, '', { depth: DEPTH + 1 }));
    this.arrow = label(scene, BOX.x + BOX.w - 12, BOX.y + BOX.h - 18, '▼', { depth: DEPTH + 2, color: '#FFFF4F', px: 10 });
    this.portrait = scene.add.sprite(BOX.x + 2, BOX.y - 2, 'portrait_jay', 0).setOrigin(0, 1).setScale(1 / 3).setDepth(DEPTH - 1);
    this.btn = null;
    this.open = false;
    this.hide();
  }

  /**
   * pages: strings. opts: { speaker, portrait: bool, button: {label, onPress} on the last page,
   * onPage(i) (index into the original pages), onClose() }
   */
  show(pages, opts = {}) {
    this.opts = opts;
    this.boxes = [];
    pages.forEach((p, i) => paginate(wrap(p, TEXT.w), LINES).forEach((lines) => this.boxes.push({ lines, src: i })));
    this.i = 0;
    this.open = true;
    audio.sfx('chat_open');
    this.render();
  }

  render() {
    const b = this.boxes[this.i];
    const last = this.i === this.boxes.length - 1;
    const g = this.g.clear().setVisible(true);
    g.fillStyle(0x000000, 0.92).fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    g.lineStyle(1, 0xffff4f, 1).strokeRect(BOX.x + 0.5, BOX.y + 0.5, BOX.w - 1, BOX.h - 1);
    const speaker = this.opts.speaker;
    if (speaker) {
      this.tag.setText(speaker).setVisible(true);
      const w = Math.ceil(this.tag.width) - 8 + 10;
      g.fillStyle(0xf02df0, 1).fillRect(BOX.x + 6, BOX.y - 8, w, 15);
      g.lineStyle(1, 0x000000, 1).strokeRect(BOX.x + 6.5, BOX.y - 7.5, w - 1, 14);
      this.tag.setPosition(BOX.x + 6 + 5 - 4, BOX.y - 8 - 4 - 1);
    } else this.tag.setVisible(false);
    this.lines.forEach((t, k) => t.setText(b.lines[k] ?? '').setVisible(true));
    this.portrait.setVisible(!!this.opts.portrait).setFrame(0);
    this.arrow.setVisible(true);
    this.opts.onPage?.(b.src);
    this.btn?.destroy();
    this.btn = null;
    if (last && this.opts.button) {
      const { label: text } = this.opts.button;
      const t = label(this.scene, 0, 0, text, { depth: DEPTH + 3, color: '#000000' });
      const w = Math.ceil(t.width) - 8 + 12;
      const x = BOX.x + BOX.w - w - 4;
      const y = BOX.y - 20;
      g.fillStyle(0xffff4f, 1).fillRect(x, y, w, 16);
      g.lineStyle(1, 0x000000, 1).strokeRect(x + 0.5, y + 0.5, w - 1, 15);
      t.setPosition(x + 6 - 4, y - 3);
      this.btn = t;
      this.btnRect = [x, y, w, 16];
    }
  }

  /** Called every frame: blinking arrow, talking portrait. */
  tick(time) {
    if (!this.open) return;
    this.arrow.setAlpha(Math.floor(time / 400) % 2 ? 0.2 : 1);
    if (this.portrait.visible) this.portrait.setFrame(Math.floor(time / 180) % 2);
  }

  /** A tap while open. Returns true if consumed. */
  tap(x, y, hit) {
    if (!this.open) return false;
    if (this.btn && hit(this.btnRect, x, y)) {
      audio.sfx('ui_click');
      this.opts.button.onPress();
      return true;
    }
    this.next();
    return true;
  }

  next() {
    if (this.i < this.boxes.length - 1) {
      this.i++;
      audio.sfx('page_next');
      this.render();
      return;
    }
    this.hide();
    const cb = this.opts.onClose;
    this.opts = {};
    cb?.();
  }

  hide() {
    this.open = false;
    this.g.clear().setVisible(false);
    this.tag.setVisible(false);
    this.lines.forEach((t) => t.setVisible(false));
    this.arrow.setVisible(false);
    this.portrait.setVisible(false);
    this.btn?.destroy();
    this.btn = null;
  }
}

// Two stacked reply buttons below the chatbox (spec 7.3).
import Phaser from 'phaser';
import { UI, RANDOMISE_CHOICE_ORDER, MIN_TOUCH_CSS_PX } from '../config/constants.js';
import { FRAMES } from '../assets/manifest.js';
import { minHitLogical, addNineSlice } from '../display/integerScale.js';
import { wrap, addLines, setLines } from './text.js';

const DEPTH = 110;

export class Choices {
  constructor(scene) {
    this.scene = scene;
    this.buttons = [];
  }

  /** options: [{id, text}]. Resolves with the chosen id. */
  show(options) {
    this.clear();
    const c = UI.choices;
    const opts = RANDOMISE_CHOICE_ORDER && Math.random() < 0.5 ? [...options].reverse() : options;
    const minHit = minHitLogical(this.scene.game, MIN_TOUCH_CSS_PX);
    const bgTexts = (this.layoutInfo = []);
    return new Promise((resolve) => {
      opts.forEach((opt, i) => {
        const y = c.y + i * (c.h + c.gap);
        const bg = addNineSlice(this.scene, c.x, y, 'choice_button_9slice', FRAMES.choice.normal, c.w, c.h, 6).setOrigin(0).setDepth(DEPTH);
        // Wrapped by pixel width; never truncated (the dev dialogue check fails if it does not fit).
        const lines = wrap(opt.text, c.w - 12);
        const texts = addLines(this.scene, c.x + c.w / 2, y, lines.length, c.lineHeight, { align: 'center', depth: DEPTH + 1 });
        setLines(texts, lines, { top: y, height: c.h, lineHeight: c.lineHeight });
        bgTexts.push({ rect: { x: c.x, y, w: c.w, h: c.h }, texts, lines });
        const hitH = Math.max(c.h, Math.min(minHit, c.h + c.gap));
        const k = bg.texK;
        bg.setInteractive(new Phaser.Geom.Rectangle(0, ((c.h - hitH) / 2) * k, c.w * k, hitH * k), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerdown', () => {
          if (this.locked) return;
          this.locked = true;
          bg.setFrame(FRAMES.choice.pressed);
          this.scene.time.delayedCall(150, () => {
            this.clear();
            resolve(opt.id);
          });
        });
        this.buttons.push(bg, ...texts);
      });
      this.locked = false;
    });
  }

  clear() {
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
  }
}

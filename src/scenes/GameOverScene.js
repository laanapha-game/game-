// The single Game over screen (spec 4): one button to the home page, no retry.
import Phaser from 'phaser';
import * as C from '../config/constants.js';
import { UI_TEXT } from '../data/script.js';
import { FRAMES } from '../assets/manifest.js';
import { minHitLogical, setupScene, addNineSlice } from '../display/integerScale.js';
import { textStyle } from '../ui/text.js';
import { SoundButtons } from '../ui/SoundButtons.js';
import { audio } from '../audio/engine.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ reason, onGameOver } = {}) {
    setupScene(this);
    this.cameras.main.setBackgroundColor(C.CSS.black);
    if (import.meta.env.DEV) window.__scene2GameOver = { reason };
    audio.mood(null);
    audio.sfx('gameover');
    new SoundButtons(this);
    const cx = C.GAME_W / 2;
    this.add.sprite(cx, 130, 'chaser', FRAMES.chaser.openMouth);
    this.add.text(cx, 190, UI_TEXT.gameOver, textStyle(C.FONT_TITLE_PX, C.CSS.orangeRed)).setOrigin(0.5);

    const w = 96;
    const h = 32;
    const btn = addNineSlice(this, cx, 240, 'choice_button_9slice', FRAMES.choice.normal, w, h, 6);
    this.add.text(cx, 240, UI_TEXT.home, textStyle(C.FONT_BODY_PX, C.CSS.yellow)).setOrigin(0.5);
    const hit = Math.max(h, minHitLogical(this.game, C.MIN_TOUCH_CSS_PX));
    btn.setInteractive(new Phaser.Geom.Rectangle(0, ((h - hit) / 2) * btn.texK, w * btn.texK, hit * btn.texK), Phaser.Geom.Rectangle.Contains);
    btn.once('pointerdown', () => {
      audio.sfx('ui_click');
      btn.setFrame(FRAMES.choice.pressed);
      this.time.delayedCall(150, () => onGameOver?.());
    });
  }
}

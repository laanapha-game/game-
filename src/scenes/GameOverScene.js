// The Game over screen (spec 4, owner change): ลองใหม่ restarts from the checkpoint before the
// stall that was lost (the scene passes it in `retry`), ซื้อบัตร opens the ticket page (the
// screen stays), and a small หน้าแรก link goes to the home page.
import Phaser from 'phaser';
import * as C from '../config/constants.js';
import { UI_TEXT } from '../data/script.js';
import { FRAMES } from '../assets/manifest.js';
import { minHitLogical, setupScene, addNineSlice } from '../display/integerScale.js';
import { textStyle } from '../ui/text.js';
import { SoundButtons } from '../ui/SoundButtons.js';
import { audio } from '../audio/engine.js';
import { openUrl } from '../scene3/ui/openUrl.js';
import { URLS } from '../scene3/config.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create({ reason, onGameOver, redEyes, retry } = {}) {
    setupScene(this);
    this.cameras.main.setBackgroundColor(C.CSS.black);
    if (import.meta.env.DEV) window.__scene2GameOver = { reason, checkpoint: retry?.checkpoint?.step };
    audio.mood(null);
    audio.sfx('gameover');
    new SoundButtons(this);
    const cx = C.GAME_W / 2;
    this.add.sprite(cx, 122, redEyes && this.textures.exists('chaser_red') ? 'chaser_red' : 'chaser', FRAMES.chaser.openMouth);
    this.add.text(cx, 180, UI_TEXT.gameOver, textStyle(C.FONT_TITLE_PX, C.CSS.orangeRed)).setOrigin(0.5);

    const minHit = minHitLogical(this.game, C.MIN_TOUCH_CSS_PX);
    let busy = false;
    const button = (y, text, color, act) => {
      const w = 120;
      const h = 28;
      const btn = addNineSlice(this, cx, y, 'choice_button_9slice', FRAMES.choice.normal, w, h, 6);
      this.add.text(cx, y, text, textStyle(C.FONT_BODY_PX, color)).setOrigin(0.5);
      const hit = Math.max(h, minHit);
      btn.setInteractive(new Phaser.Geom.Rectangle(0, ((h - hit) / 2) * btn.texK, w * btn.texK, hit * btn.texK), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', () => {
        if (busy) return;
        audio.sfx('ui_click');
        btn.setFrame(FRAMES.choice.pressed);
        this.time.delayedCall(150, () => btn.setFrame(FRAMES.choice.normal));
        act();
      });
    };
    button(C.GAMEOVER_RETRY_Y, UI_TEXT.retry, C.CSS.yellow, () => {
      busy = true;
      this.time.delayedCall(150, () => this.scene.start('TrickOrTreat', retry));
    });
    button(C.GAMEOVER_TICKET_Y, UI_TEXT.buyTicket, C.CSS.magenta, () => openUrl(URLS.booking));
    const home = this.add.text(cx, C.GAMEOVER_HOME_Y, UI_TEXT.home, textStyle(C.FONT_BODY_PX, C.CSS.white)).setOrigin(0.5).setAlpha(0.8);
    const homeHit = this.add.zone(cx, C.GAMEOVER_HOME_Y, Math.max(home.width + 16, minHit), Math.max(home.height, minHit)).setInteractive();
    homeHit.once('pointerdown', () => {
      busy = true;
      audio.sfx('ui_click');
      this.time.delayedCall(150, () => onGameOver?.());
    });
  }
}

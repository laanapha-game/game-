// Standalone stand-in for scene 3 (out of scope). Shows that onWin fired and
// which character data was passed through.
import Phaser from 'phaser';
import * as C from '../config/constants.js';
import { textStyle } from '../ui/text.js';
import { setupScene } from '../display/integerScale.js';

export class Scene3Stub extends Phaser.Scene {
  constructor() {
    super('Scene3Stub');
  }

  create({ character } = {}) {
    setupScene(this);
    this.cameras.main.setBackgroundColor(C.CSS.white);
    this.cameras.main.fadeIn(400, 255, 255, 255);
    if (import.meta.env.DEV) window.__scene2Won = { character };
    this.add.text(C.GAME_W / 2, 150, 'SCENE 3', textStyle(C.FONT_TITLE_PX, C.CSS.black)).setOrigin(0.5);
    this.add.text(C.GAME_W / 2, 172, `(stub) ${character?.id ?? ''}`, textStyle(C.FONT_BODY_PX, C.CSS.black)).setOrigin(0.5);
  }
}

// Sound buttons in the top corners (scene 2 and its Game over screen):
// speaker (right) = all sound, the same switch as scene 1's speaker;
// note (left) = music on/off. Hit areas are at least 44 CSS px.
import Phaser from 'phaser';
import { MIN_TOUCH_CSS_PX, UI } from '../config/constants.js';
import { minHitLogical } from '../display/integerScale.js';
import { audio } from '../audio/engine.js';

export class SoundButtons {
  constructor(scene) {
    const { sound, music } = UI.soundButtons;
    this.speaker = this.button(scene, sound, () => {
      const on = !audio.sound;
      audio.setSound(on); // inside the tap, so mobile browsers let audio start
      audio.sfx(on ? 'ui_on' : 'ui_off');
    });
    this.note = this.button(scene, music, () => {
      audio.setMusic(!audio.musicOn);
      audio.sfx(audio.musicOn ? 'ui_on' : 'ui_off');
    });
    const sync = () => {
      this.speaker.setFrame(audio.sound ? 0 : 1);
      this.note.setFrame(audio.musicOn ? 0 : 1);
    };
    sync();
    const off = audio.onChange(sync);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  button(scene, at, onTap) {
    const key = at === UI.soundButtons.sound ? 'ui_sound' : 'ui_music';
    const b = scene.add.sprite(at.x, at.y, key, 0).setDepth(130);
    const k = 1 / b.scaleX; // texture px per design px
    const hit = Math.max(minHitLogical(scene.game, MIN_TOUCH_CSS_PX), 12);
    const fw = b.frame.width;
    const fh = b.frame.height;
    b.setInteractive(new Phaser.Geom.Rectangle(fw / 2 - (hit * k) / 2, fh / 2 - (hit * k) / 2, hit * k, hit * k), Phaser.Geom.Rectangle.Contains);
    b.on('pointerdown', onTap);
    return b;
  }

  /** True if a pointer's objects include a sound button (so the tap is not a game tap). */
  owns(over = []) {
    return over.includes(this.speaker) || over.includes(this.note);
  }
}

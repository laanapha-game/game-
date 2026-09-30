// Chase timer bar (spec 7.4): 120 x 8 with a chaser icon and a bird icon.
// ASSUMPTION for the icons: the goal is the LEFT end (the light). The chaser icon
// moves right to left with elapsed time and reaches the left end at 0:00; the bird
// icon moves right to left with run progress. The fill shows the time left.
import { UI, PALETTE } from '../config/constants.js';

export class TimerBar {
  constructor(scene) {
    const t = UI.timerBar;
    this.fill = scene.add.rectangle(t.x + 1, t.y + 1, t.w - 2, t.h - 2, PALETTE.orangeRed).setOrigin(0).setDepth(120);
    this.frame = scene.add.image(t.x, t.y, 'ui_timer_frame').setOrigin(0).setDepth(121);
    this.birdIcon = scene.add.image(t.x + t.w, t.y + t.h / 2, 'icon_bird').setDepth(123);
    this.chaserIcon = scene.add.image(t.x + t.w, t.y + t.h / 2, 'icon_chaser').setDepth(122);
    this.update(1, 0);
  }

  /** timeFrac: remaining / total. progress: 0..1 of the run. */
  update(timeFrac, progress) {
    const t = UI.timerBar;
    this.fill.width = Math.max(0, Math.round((t.w - 2) * timeFrac));
    this.chaserIcon.x = Math.round(t.x + t.w * timeFrac);
    this.birdIcon.x = Math.round(t.x + t.w * (1 - progress));
  }

  setVisible(v) {
    [this.fill, this.frame, this.birdIcon, this.chaserIcon].forEach((o) => o.setVisible(v));
  }
}

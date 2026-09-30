// Push-away / sprint meter display (spec 7.1). Logic lives in src/logic/meter.js.
import { UI } from '../config/constants.js';
import { texScaleOf } from '../display/integerScale.js';

export class MeterView {
  constructor(scene) {
    const m = UI.meter;
    this.fill = scene.add.image(m.x, m.y, 'ui_meter_fill').setOrigin(0).setDepth(90);
    this.k = texScaleOf(scene, 'ui_meter_fill');
    this.frame = scene.add.image(m.x, m.y, 'ui_meter_frame').setOrigin(0).setDepth(91);
    this.button = scene.add.sprite(UI.tapButton.x, UI.tapButton.y, 'ui_tap_button', 0).setDepth(91);
    this.set(0);
  }

  set(v) {
    this.fill.setCrop(0, 0, Math.round(UI.meter.w * this.k * v), UI.meter.h * this.k);
  }

  press() {
    this.button.setFrame(1);
    this.button.scene.time.delayedCall(80, () => this.button.active && this.button.setFrame(0));
  }

  destroy() {
    [this.fill, this.frame, this.button].forEach((o) => o.destroy());
  }
}

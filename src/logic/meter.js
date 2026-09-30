// Tap meter (spec 7.1): value 0..1, each tap adds `gain`, decays continuously.
export class TapMeter {
  constructor(gain, decayPerS) {
    this.gain = gain;
    this.decayPerS = decayPerS;
    this.value = 0;
    this.full = false;
  }

  tap() {
    if (this.full) return;
    this.value = Math.min(1, this.value + this.gain);
    if (this.value >= 1) this.full = true;
  }

  update(dtS) {
    if (this.full) return;
    this.value = Math.max(0, this.value - this.decayPerS * dtS);
  }
}

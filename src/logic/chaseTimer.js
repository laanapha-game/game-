// Chase timer (spec 4): starts when the chaser appears and NEVER pauses.
// Uses wall-clock time, so it also keeps running while dialogue, choices,
// the letter, or even a backgrounded tab would otherwise freeze the game loop.
// setRate(r): from now on time runs r x as fast (the final sprint: the chaser
// comes 1.5x faster). Time already spent is kept.
export class ChaseTimer {
  constructor(totalS, clock = () => performance.now()) {
    this.totalMs = totalS * 1000;
    this.clock = clock;
    this.startedAt = null;
    this.rate = 1;
    this.spentMs = 0; // before the current rate
  }

  start() {
    if (this.startedAt === null) this.startedAt = this.clock();
  }

  setRate(r) {
    if (this.started) {
      const now = this.clock();
      this.spentMs += (now - this.startedAt) * this.rate;
      this.startedAt = now;
    }
    this.rate = r;
  }

  get started() {
    return this.startedAt !== null;
  }

  remainingS() {
    if (!this.started) return this.totalMs / 1000;
    return Math.max(0, (this.totalMs - this.spentMs - (this.clock() - this.startedAt) * this.rate) / 1000);
  }

  get expired() {
    return this.started && this.remainingS() <= 0;
  }
}

/** Chaser stage 0..thresholds.length from the remaining seconds. */
export function chaserStage(remainingS, thresholds) {
  let stage = 0;
  for (const t of thresholds) if (remainingS <= t) stage++;
  return stage;
}

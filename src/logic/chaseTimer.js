// Chase timer (spec 4): starts when the chaser appears and NEVER pauses.
// Uses wall-clock time, so it also keeps running while dialogue, choices,
// the letter, or even a backgrounded tab would otherwise freeze the game loop.
export class ChaseTimer {
  constructor(totalS, clock = () => performance.now()) {
    this.totalMs = totalS * 1000;
    this.clock = clock;
    this.startedAt = null;
  }

  start() {
    if (this.startedAt === null) this.startedAt = this.clock();
  }

  get started() {
    return this.startedAt !== null;
  }

  remainingS() {
    if (!this.started) return this.totalMs / 1000;
    return Math.max(0, (this.totalMs - (this.clock() - this.startedAt)) / 1000);
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

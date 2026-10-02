// Chase timer (spec 4): starts when the chaser appears and NEVER pauses.
// Uses wall-clock time, so it also keeps running while dialogue, choices,
// the letter, or even a backgrounded tab would otherwise freeze the game loop.
// setRate(r): from now on time runs r x as fast (the chase runs at 3x, the final
// sprint at 5x). Time already spent is kept.
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

  /** Real seconds left at the current rate. */
  remainingRealS() {
    return this.remainingS() / this.rate;
  }

  get expired() {
    return this.started && this.remainingS() <= 0;
  }
}

/**
 * How far behind the bird the chaser floats (design px), from the same two
 * progressions the timer bar shows: the bird's run progress and the chaser's
 * (elapsed chase time), both 0..1. Ahead -> further back; idle -> it creeps closer.
 * Clamped: never past the bird (minPx, on its back), at most off screen (maxPx).
 */
export function chaserGapPx(birdProgress, chaserProgress, { pxPerProgress, minPx, maxPx }) {
  return Math.max(minPx, Math.min(maxPx, (birdProgress - chaserProgress) * pxPerProgress));
}

/** Caught: the chaser's progress has reached the bird's (the timer bar icons meet). */
export function chaserCaught(birdProgress, chaserProgress) {
  return chaserProgress >= birdProgress;
}

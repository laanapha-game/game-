// Scene 3 progress: seven goals (main objective), talks (optional), and the special-prize
// coupon after talking to everyone. Pure; the scene shows the returned events.
import { GOALS } from '../data/script.js';
import { SPECIAL_PRIZE } from '../config.js';

export class Progress {
  /** @param {string[]} targets talk target keys (Jayimpacts and the stall row) */
  constructor(targets) {
    this.targets = targets;
    this.goals = new Set();
    this.talked = new Set();
    this.vouchers = 0;
    this.prize = false;
  }

  get goalCount() {
    return this.goals.size;
  }

  get allGoals() {
    return this.goals.size === GOALS.length;
  }

  /** Targets that count toward "talked to everyone" (config: does the stall row count?). */
  get prizeTargets() {
    return SPECIAL_PRIZE.stallRowCounts ? this.targets : this.targets.filter((k) => k !== 'stallRow');
  }

  /** Entering a goal zone. Returns events: [{type:'goal', goal}] (+ 'allGoals'). */
  enterZone(id) {
    if (this.goals.has(id) || !GOALS.some((g) => g.id === id)) return [];
    this.goals.add(id);
    const ev = [{ type: 'goal', goal: GOALS.find((g) => g.id === id) }];
    if (this.allGoals) ev.push({ type: 'allGoals' });
    return ev;
  }

  /** A talk ended. The first talk with a target counts; the last one gives the special-prize coupon. */
  talk(key) {
    if (!this.targets.includes(key) || this.talked.has(key)) return [];
    this.talked.add(key);
    const ev = [{ type: 'talked', key, talked: this.talked.size, targets: this.targets.length }];
    if (!this.prize && this.prizeTargets.every((k) => this.talked.has(k))) {
      this.prize = true;
      this.vouchers = SPECIAL_PRIZE.coupons; // the special-prize coupon
      ev.push({ type: 'prize' });
    }
    return ev;
  }

  snapshot() {
    return {
      goals: [...this.goals],
      talked: [...this.talked],
      vouchers: this.vouchers,
      prize: this.prize,
      targets: this.targets.length,
    };
  }
}

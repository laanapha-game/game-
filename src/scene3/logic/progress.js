// Scene 3 progress: seven goals (main objective), talks and vouchers (optional), the
// special prize after talking to everyone. Pure; the scene shows the returned events.
import { GOALS } from '../data/script.js';
import { VOUCHER, SPECIAL_PRIZE } from '../config.js';

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

  /** A talk ended. First talk with a target gives one voucher; the last one also the prize (after the voucher). */
  talk(key) {
    if (!this.targets.includes(key) || this.talked.has(key)) return [];
    this.talked.add(key);
    this.vouchers += VOUCHER.perFirstTalk;
    const ev = [{ type: 'voucher', key, vouchers: this.vouchers }];
    if (!this.prize && this.prizeTargets.every((k) => this.talked.has(k))) {
      this.prize = true;
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

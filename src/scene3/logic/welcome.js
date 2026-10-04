// Opening welcome (spec 6.0): Jayimpacts walks in along the soi, stops next to the
// player, turns, waves while the first page shows, talks six pages, then walks back
// west. Tap during the walk-in skips to the dialogue; tap during the walk-out ends it.
// The Rotary-stall Jayimpacts stays hidden until the welcome is over. Plays once per
// session (page load). Pure: the scene reads `jay`, `page`, `locked`, `rotaryJayVisible`.
import { WELCOME_PAGES } from '../data/script.js';
import { PLAYER_SPEED } from '../config.js';

const JAY_SPEED = PLAYER_SPEED; // map units per second
let playedThisSession = false;

export const welcomePlayed = () => playedThisSession;
/** Tests only. */
export const resetWelcomeSession = () => (playedThisSession = false);

export class Welcome {
  /**
   * @param {{x:number,y:number}} player  the player's feet
   * @param {{from:{x:number,y:number}, stopDistance:number}} cfg
   * @param {{force?:boolean}} opts  force: play even if already played (dev)
   */
  constructor(player, cfg, { force = false } = {}) {
    this.pages = WELCOME_PAGES;
    this.stop = { x: player.x - cfg.stopDistance, y: player.y };
    this.from = { ...cfg.from };
    this.jay = { x: this.from.x, y: this.from.y, facing: 'right', anim: 'walk', visible: true };
    this.page = -1;
    this.state = !force && playedThisSession ? 'done' : 'walkIn';
    if (this.state === 'done') this.jay.visible = false;
    else playedThisSession = true;
  }

  get locked() {
    return this.state !== 'done';
  }

  get rotaryJayVisible() {
    return this.state === 'done';
  }

  /** Advance by dt seconds. Returns 'talk' when the dialogue should open, 'done' when over. */
  update(dt) {
    const j = this.jay;
    if (this.state === 'walkIn') {
      j.x = Math.min(this.stop.x, j.x + JAY_SPEED * dt);
      if (j.x >= this.stop.x) return this.toTalk();
    } else if (this.state === 'walkOut') {
      j.x -= JAY_SPEED * dt;
      if (j.x <= this.from.x) return this.finish();
    }
    return null;
  }

  toTalk() {
    Object.assign(this.jay, { x: this.stop.x, facing: 'right', anim: 'wave' });
    this.state = 'talk';
    this.page = 0;
    return 'talk';
  }

  /** The dialogue moved to page i (0-based): wave only on the first page. */
  onPage(i) {
    this.page = i;
    this.jay.anim = i === 0 ? 'wave' : 'idle';
  }

  /** The last page was tapped away. */
  dialogueDone() {
    Object.assign(this.jay, { facing: 'left', anim: 'walk' });
    this.state = 'walkOut';
  }

  /** A tap anywhere: skips the walk-in or ends the walk-out. */
  tap() {
    if (this.state === 'walkIn') return this.toTalk();
    if (this.state === 'walkOut') return this.finish();
    return null;
  }

  finish() {
    this.state = 'done';
    this.jay.visible = false;
    return 'done';
  }
}

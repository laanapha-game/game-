// Scene 3 simulation, no Phaser: player movement with the real collision, walking
// characters, talk targets, goal zones, exit, autopilot tour and the opening welcome.
// The Phaser scene feeds input and draws the state; tests drive it directly.
import { boxFree, ZONES, EXIT, START, WELCOME, dist, inZone, R, DESK, LANE_STALLS, SHOPS, TABLES, BAND, HOUSE_BASE, spread } from './layout.js';
import { NPCS, STALL_ROW, TALK_TARGETS, GHOSTS } from './npcs.js';
import { Progress } from './progress.js';
import { Welcome } from './welcome.js';
import { findPath } from './pathfind.js';
import { PLAYER_SPEED, WALKER_SPEED, TALK_RANGE, PLAYER_BOX, AUTOPILOT_PAUSE_MS } from '../config.js';
import { exitTooEarly } from '../data/script.js';

/** Move a point by (dx, dy) with axis-separated sliding against the collision map. */
export function slide(p, dx, dy, box = PLAYER_BOX) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
  let moved = false;
  for (let i = 0; i < steps; i++) {
    if (dx && boxFree(p.x + dx / steps, p.y, box)) {
      p.x += dx / steps;
      moved = true;
    }
    if (dy && boxFree(p.x, p.y + dy / steps, box)) {
      p.y += dy / steps;
      moved = true;
    }
  }
  return moved;
}

/** The autopilot tour stops (world points), in order. */
export const TOUR = [
  { name: 'lane', p: { x: (R.lane[0] + R.lane[2]) / 2 - 8, y: LANE_STALLS[2].y + 6 } },
  { name: 'desk', p: { x: DESK.x - 26, y: DESK.y + 12 } },
  { name: 'shops', p: { x: SHOPS[2].x, y: SHOPS[2].y + 12 } },
  { name: 'tables', p: { x: (TABLES[1].x + TABLES[2].x) / 2, y: (TABLES[5].y + TABLES[9].y) / 2 } },
  { name: 'cinema', p: spread({ x: 150, y: 128 }) },
  { name: 'haunted', p: { x: spread(HOUSE_BASE).x, y: R.river[3] + 6 } },
  { name: 'band', p: { x: BAND.rug.x, y: BAND.rug.y + 2 } },
  { name: 'soi', p: { x: START.x - 30, y: START.y } },
];

export class World {
  constructor({ forceWelcome = false, skipWelcome = false } = {}) {
    this.player = { x: START.x, y: START.y, facing: 'left', moving: false, view: 'side' };
    this.progress = new Progress(TALK_TARGETS);
    this.welcome = new Welcome(this.player, WELCOME, { force: forceWelcome });
    if (skipWelcome && this.welcome.state !== 'done') this.welcome.finish();
    this.npcs = NPCS.map((n) => ({
      def: n,
      key: n.key,
      x: (n.at ?? n.patrol[0]).x,
      y: (n.at ?? n.patrol[0]).y,
      facing: 'left',
      view: n.patrol ? 'side' : 'front',
      moving: false,
      leg: 0,
      path: null,
      paused: false,
    }));
    this.ended = false;
    this.inZones = new Set(Object.keys(ZONES).filter((k) => inZone(this.player, ZONES[k])));
    this.inExit = inZone(this.player, EXIT.rect);
    this.auto = null; // { stop, path, wait }
    this.talking = null;
  }

  get locked() {
    return this.welcome.locked || !!this.talking || this.ended;
  }

  npc(key) {
    return this.npcs.find((n) => n.key === key);
  }

  /** Is this NPC on the map right now (the Rotary Jayimpacts hides during the welcome)? */
  present(n) {
    return n.key !== 'jay' || this.welcome.rotaryJayVisible;
  }

  // ---------------------------------------------------------------- talk targets
  /** Talk targets with their nearest point to the player. */
  targets() {
    const out = this.npcs.filter((n) => this.present(n)).map((n) => ({ key: n.key, x: n.x, y: n.y, d: dist(this.player, n) }));
    let best = null;
    for (const t of STALL_ROW.touch) {
      const d = dist(this.player, t);
      if (!best || d < best.d) best = { key: STALL_ROW.key, x: t.x, y: t.y, d };
    }
    out.push(best);
    for (const g of GHOSTS) out.push({ key: g.key, x: g.x, y: g.y, d: dist(this.player, g) });
    return out;
  }

  /** The nearest target within talk range, or null. */
  talkable() {
    const near = this.targets().filter((t) => t.d <= TALK_RANGE).sort((a, b) => a.d - b.d);
    return near[0] ?? null;
  }

  /** Open a talk. Returns { key, speaker, pages, ig } or null. Walking characters pause. */
  startTalk(key) {
    if (this.welcome.locked || this.talking) return null;
    const n = this.npc(key);
    if (n) n.paused = true;
    this.stopAuto();
    const def = key === STALL_ROW.key ? STALL_ROW : n ? n.def : GHOSTS.find((g) => g.key === key);
    if (!def) return null;
    this.talking = { key, speaker: def.name, pages: def.pages, ig: !!def.ig };
    if (n) this.faceEachOther(n);
    return this.talking;
  }

  faceEachOther(n) {
    const left = n.x < this.player.x;
    this.player.facing = left ? 'left' : 'right';
    this.player.view = 'side';
    n.facing = left ? 'right' : 'left';
    n.view = 'side';
  }

  /** The talk was closed (last page tapped). Returns progress events. */
  endTalk() {
    if (!this.talking) return [];
    const { key } = this.talking;
    this.talking = null;
    const n = this.npc(key);
    if (n) {
      n.paused = false;
      if (!n.def.patrol) n.view = 'front';
    }
    return this.progress.talk(key);
  }

  // ---------------------------------------------------------------- update
  /**
   * input: { dir: {x,y} (keys, -1..1) | null, target: {x,y} (held pointer) | null }
   * Returns events: goal / allGoals / exitEarly / exit / welcome:talk / welcome:done.
   */
  update(dt, input = {}) {
    const ev = [];
    if (this.welcome.state !== 'done') {
      const r = this.welcome.update(dt);
      if (r) ev.push({ type: `welcome:${r}` });
    }
    this.updateNpcs(dt);
    if (this.locked) {
      this.player.moving = false;
      return ev;
    }
    let move = null;
    if (input.dir && (input.dir.x || input.dir.y)) move = input.dir;
    else if (input.target) {
      const dx = input.target.x - this.player.x;
      const dy = input.target.y - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d > 1.5) move = { x: dx / d, y: dy / d };
    }
    if (move) this.stopAuto();
    else if (this.auto) move = this.autoStep(dt);
    this.player.moving = false;
    if (move) {
      const len = Math.hypot(move.x, move.y) || 1;
      const step = PLAYER_SPEED * dt;
      this.player.moving = slide(this.player, (move.x / len) * step, (move.y / len) * step);
      if (Math.abs(move.x) >= Math.abs(move.y) * 0.5) {
        this.player.view = 'side';
        this.player.facing = move.x < 0 ? 'left' : 'right';
      } else this.player.view = 'front';
    }
    ev.push(...this.checkZones());
    return ev;
  }

  checkZones() {
    const ev = [];
    for (const [id, rect] of Object.entries(ZONES)) {
      const inside = inZone(this.player, rect);
      if (inside && !this.inZones.has(id)) ev.push(...this.progress.enterZone(id));
      if (inside) this.inZones.add(id);
      else this.inZones.delete(id);
    }
    const inExit = inZone(this.player, EXIT.rect);
    if (inExit && !this.inExit) {
      if (this.progress.allGoals) {
        this.ended = true;
        this.stopAuto();
        ev.push({ type: 'exit' });
      } else ev.push({ type: 'exitEarly', text: exitTooEarly(this.progress.goalCount) });
    }
    this.inExit = inExit;
    return ev;
  }

  /** End now (the thank-you panel's จบเกม), without walking to the exit. */
  finish() {
    if (!this.progress.allGoals || this.ended) return [];
    this.ended = true;
    this.stopAuto();
    return [{ type: 'exit' }];
  }

  updateNpcs(dt) {
    for (const n of this.npcs) {
      n.moving = false;
      if (!n.def.patrol || n.paused) continue;
      if (!n.path || !n.path.length) {
        n.leg = (n.leg + 1) % n.def.patrol.length;
        n.path = findPath(n, n.def.patrol[n.leg]) ?? [];
        continue;
      }
      const t = n.path[0];
      const dx = t.x - n.x;
      const dy = t.y - n.y;
      const d = Math.hypot(dx, dy);
      const step = WALKER_SPEED * dt;
      if (d <= step) {
        n.x = t.x;
        n.y = t.y;
        n.path.shift();
      } else {
        n.x += (dx / d) * step;
        n.y += (dy / d) * step;
      }
      n.moving = true;
      n.view = Math.abs(dx) >= Math.abs(dy) * 0.5 ? 'side' : 'front';
      if (Math.abs(dx) > 0.01) n.facing = dx < 0 ? 'left' : 'right';
    }
  }

  // ---------------------------------------------------------------- autopilot (AUTO)
  startAuto() {
    if (this.locked) return;
    this.auto = { stop: 0, path: null, wait: 0 };
  }

  stopAuto() {
    this.auto = null;
  }

  autoStep(dt) {
    const a = this.auto;
    if (a.wait > 0) {
      a.wait -= dt * 1000;
      return null;
    }
    if (!a.path) {
      a.path = findPath(this.player, TOUR[a.stop].p) ?? [];
    }
    while (a.path.length && dist(this.player, a.path[0]) < 1.5) a.path.shift();
    if (!a.path.length) {
      a.stop++;
      a.path = null;
      a.wait = AUTOPILOT_PAUSE_MS;
      if (a.stop >= TOUR.length) this.auto = null;
      return null;
    }
    const t = a.path[0];
    return { x: t.x - this.player.x, y: t.y - this.player.y };
  }

  snapshot() {
    return this.progress.snapshot();
  }
}

// Scene 3 logic tests (no browser): reachability on the real collision map, talk targets
// and vouchers, the lane stall row, the opening welcome, the special prize, ticket text,
// and the map spread.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/scene3/logic/layout.js';
import { findPath } from '../src/scene3/logic/pathfind.js';
import { World, slide, TOUR } from '../src/scene3/logic/world.js';
import { NPCS, STALL_ROW, TALK_TARGETS, MUSICIANS } from '../src/scene3/logic/npcs.js';
import { resetWelcomeSession, welcomePlayed } from '../src/scene3/logic/welcome.js';
import { ticketLine } from '../src/scene3/logic/ticketLine.js';
import { WELCOME_PAGES, STALL_ROW_PAGES, STALL_ROW_SPEAKER, GOALS, NPC_LINES } from '../src/scene3/data/script.js';
import { TALK_RANGE, PLAYER_BOX, LS, TICKET_PHASES } from '../src/scene3/config.js';
import { PHASES } from '../src/data/ticketPhases.js';

/** Walk the player along an A* path with the game's own sliding movement; returns the end point. */
function walk(from, to) {
  const path = findPath(from, to);
  if (!path) return null;
  const p = { ...from };
  for (const wp of path) {
    for (let i = 0; i < 2000 && L.dist(p, wp) > 0.6; i++) {
      // Line up on a nearly reached axis, as the autopilot does (World.autoStep).
      if (Math.abs(wp.x - p.x) < 0.5 && L.boxFree(wp.x, p.y, PLAYER_BOX)) p.x = wp.x;
      if (Math.abs(wp.y - p.y) < 0.5 && L.boxFree(p.x, wp.y, PLAYER_BOX)) p.y = wp.y;
      const d = L.dist(p, wp);
      if (d <= 0.6) break;
      const step = Math.min(0.5, d);
      if (!slide(p, ((wp.x - p.x) / d) * step, ((wp.y - p.y) / d) * step, PLAYER_BOX)) break;
    }
  }
  return p;
}

const centre = ([x0, y0, x1, y1]) => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
/** A free point inside a zone, nearest its centre. */
function freeIn(rect) {
  const c = centre(rect);
  let best = null;
  for (let y = rect[1] + 2; y < rect[3] - 1; y += 2)
    for (let x = rect[0] + 4; x < rect[2] - 4; x += 2)
      if (L.boxFree(x, y, PLAYER_BOX) && (!best || L.dist({ x, y }, c) < L.dist(best, c))) best = { x, y };
  return best;
}

test('reachability: start -> every goal zone, walking with the real collision', () => {
  for (const [id, rect] of Object.entries(L.ZONES)) {
    const target = freeIn(rect);
    assert.ok(target, `zone ${id} has a free spot`);
    const end = walk(L.START, target);
    assert.ok(end, `zone ${id}: no path`);
    assert.ok(L.inZone(end, rect), `zone ${id}: walked to ${JSON.stringify(end)}, not inside`);
  }
});

test('reachability: a standing spot within talk range of every character, the stall row and the exit', () => {
  for (const n of NPCS) {
    for (const spot of n.at ? [n.at] : n.patrol) {
      const end = walk(L.START, spot);
      assert.ok(end, `${n.key}: no path`);
      assert.ok(L.dist(end, spot) <= TALK_RANGE, `${n.key}: closest ${L.dist(end, spot).toFixed(1)} units`);
    }
  }
  for (const t of STALL_ROW.touch) {
    const end = walk(L.START, t);
    assert.ok(end && L.dist(end, t) <= TALK_RANGE, 'lane touch point reachable');
  }
  const exit = centre(L.EXIT.rect);
  const end = walk(L.START, exit);
  assert.ok(end && L.inZone(end, L.EXIT.rect), 'exit reachable');
  for (const s of TOUR) assert.ok(findPath(L.START, s.p), `tour stop ${s.name} reachable`);
});

test('the lane keeps a clear walking gap of at least 40 units beside its stalls', () => {
  const wallInner = L.R.lane[0] + L.FENCE;
  for (const s of L.LANE_STALLS) assert.ok(s.block[0] - wallInner >= 40, `gap ${s.block[0] - wallInner}`);
});

test('spread: positions move by LS, sizes do not', () => {
  assert.equal(LS, 1.5);
  assert.deepEqual(L.spread({ x: 124, y: 128 }), { x: 24 + 100 * LS, y: 28 + 100 * LS });
  const gh = L.GUESTHOUSES[0];
  assert.deepEqual([gh.w, gh.h], L.SIZES.guesthouse);
  // collision blocks sit on their sprite's anchor
  for (const o of L.OBJECTS.filter((x) => x.block)) {
    assert.equal(o.block[3], o.y);
    assert.equal((o.block[0] + o.block[2]) / 2, o.x);
  }
  assert.equal(L.WORLD.w, 636);
});

test('talk targets (the team, Jayimpacts and the stall row): each opens its dialogue and counts once; no coupon per talk', () => {
  assert.deepEqual(TALK_TARGETS, ['po', 'kaiching', 'peay', 'aomsin', 'nemo', 'nuea', 'jay', STALL_ROW.key]);
  const w = new World({ skipWelcome: true });
  for (const key of TALK_TARGETS) {
    const t = w.startTalk(key);
    assert.ok(t, `${key} opens`);
    assert.ok(t.pages.length >= 1);
    const def = key === STALL_ROW.key ? STALL_ROW : NPCS.find((n) => n.key === key);
    assert.equal(t.speaker, def.name);
    const ev = w.endTalk();
    assert.equal(ev.filter((e) => e.type === 'talked').length, 1, `${key} counts once`);
    // talking again gives nothing
    w.startTalk(key);
    assert.deepEqual(w.endTalk(), []);
  }
  assert.equal(w.progress.talked.size, TALK_TARGETS.length);
  assert.equal(w.progress.vouchers, 1, 'talking with everyone = 1 special-prize coupon (owner)');
  assert.equal(NPCS.find((n) => n.key === 'jay').link, 'instagram', "Jayimpacts' own IG button");
  assert.equal(NPCS.find((n) => n.key === 'nemo').link, 'eventInstagram', 'Nemo: feedback by DM to @laanapha');
  assert.ok(NPC_LINES.nemo.some((l) => l.includes('Feedback') && l.includes('DM Instagram')), 'Nemo says the game keeps improving, feedback by DM');
});

test('the five lane stalls all open the same dialogue and count once', () => {
  const w = new World({ skipWelcome: true });
  for (const t of STALL_ROW.touch) {
    w.player.x = t.x;
    w.player.y = t.y;
    const near = w.talkable();
    assert.equal(near?.key, STALL_ROW.key);
    const d = w.startTalk(near.key);
    assert.equal(d.speaker, STALL_ROW_SPEAKER);
    assert.deepEqual(d.pages, STALL_ROW_PAGES);
    w.endTalk();
  }
  assert.equal(w.progress.talked.size, 1);
  assert.equal(STALL_ROW_PAGES[0], 'ใครอยากมาเป็นส่วนหนึ่งของงาน สามารถจับจองพื้นที่เปิดซุ้มกับเราได้เลยครับ');
});

test('welcome: plays once, tap skips the walk-in and the walk-out, Rotary Jayimpacts hidden during it', () => {
  resetWelcomeSession();
  const w = new World();
  const jay = w.npc('jay');
  assert.equal(w.welcome.state, 'walkIn');
  assert.equal(w.locked, true, 'controls locked');
  assert.equal(w.present(jay), false, 'Rotary Jayimpacts hidden');
  assert.equal(w.startTalk('bas'), null, 'no talks during the welcome');
  // a tap during the walk-in skips straight to the dialogue
  assert.equal(w.welcome.tap(), 'talk');
  assert.equal(w.welcome.jay.anim, 'wave');
  assert.ok(Math.abs(L.dist(w.welcome.jay, w.player) - L.WELCOME.stopDistance) < 0.01, 'stops 17 units from the player');
  assert.equal(w.welcome.pages, WELCOME_PAGES);
  assert.equal(WELCOME_PAGES.length, 7);
  assert.equal(WELCOME_PAGES[0], "เจ้าได้มาถึงแล้วที่ 'ลานนภา'");
  w.welcome.onPage(1);
  assert.equal(w.welcome.jay.anim, 'idle');
  w.welcome.dialogueDone();
  assert.equal(w.welcome.state, 'walkOut');
  assert.equal(w.present(jay), false);
  // a tap during the walk-out ends it
  assert.equal(w.welcome.tap(), 'done');
  assert.equal(w.locked, false);
  assert.equal(w.present(jay), true, 'Rotary Jayimpacts shown after');
  assert.equal(w.welcome.jay.visible, false, 'never two Jayimpacts');
  // once per session
  assert.equal(welcomePlayed(), true);
  const again = new World();
  assert.equal(again.welcome.state, 'done');
  assert.equal(again.present(again.npc('jay')), true);
});

test('welcome without taps: walks in, talks, walks back out of sight', () => {
  resetWelcomeSession();
  const w = new World();
  let r = null;
  for (let i = 0; i < 600 && r !== 'talk'; i++) r = w.welcome.update(1 / 60);
  assert.equal(r, 'talk');
  w.welcome.dialogueDone();
  for (let i = 0; i < 600 && r !== 'done'; i++) r = w.welcome.update(1 / 60);
  assert.equal(r, 'done');
});

test('the ghosts outside stand beside their stalls and talk, without vouchers', async () => {
  const { GHOSTS } = await import('../src/scene3/logic/npcs.js');
  const { GHOST_PAGES } = await import('../src/scene3/data/script.js');
  assert.equal(GHOSTS.length, 5);
  const w = new World({ skipWelcome: true });
  for (const g of GHOSTS) {
    const stall = L.GHOST_STALLS.find((s) => s.number === g.number);
    assert.ok(g.x - stall.x >= stall.w / 2, 'beside the stall, not inside');
    const end = walk(L.START, { x: g.x, y: g.y + 14 });
    assert.ok(end && L.dist(end, g) <= TALK_RANGE, `ghost ${g.number} reachable`);
    w.player.x = end.x;
    w.player.y = end.y;
    assert.equal(w.talkable()?.key, g.key);
    const t = w.startTalk(g.key);
    assert.deepEqual(t.pages, GHOST_PAGES);
    assert.deepEqual(w.endTalk(), []);
  }
  assert.equal(w.progress.vouchers, 0);
});

test('the player starts on the soi in front of the entrance', () => {
  assert.ok(L.START.x > L.R.lane[0] && L.START.x < L.R.lane[2]);
  assert.ok(L.START.y > L.R.soi[1] && L.START.y < L.R.soi[3]);
});

test('special prize (1 coupon) only after the last target', () => {
  const w = new World({ skipWelcome: true });
  const last = TALK_TARGETS.length - 1;
  TALK_TARGETS.slice(0, last).forEach((k) => {
    w.startTalk(k);
    const ev = w.endTalk();
    assert.ok(!ev.some((e) => e.type === 'prize'));
  });
  assert.equal(w.progress.prize, false);
  assert.equal(w.progress.vouchers, 0);
  w.startTalk(TALK_TARGETS[last]);
  const ev = w.endTalk();
  assert.deepEqual(ev.map((e) => e.type), ['talked', 'prize']);
  assert.equal(w.progress.prize, true);
  assert.equal(w.progress.vouchers, 1);
});

test('goals: seven zones (ซุ้มผี added) tick once each; the exit ends only when all are done', () => {
  const w = new World({ skipWelcome: true });
  // early exit
  w.player.x = L.EXIT.rect[0] - 4;
  w.player.y = L.START.y;
  let ev = w.update(0.2, { dir: { x: 1, y: 0 } });
  assert.ok(ev.some((e) => e.type === 'exitEarly' && e.text === 'ยังสำรวจไม่ครบ (0/7)'));
  for (const g of GOALS) assert.equal(w.progress.enterZone(g.id).length >= 1, true);
  assert.deepEqual(w.progress.enterZone('lane'), []);
  assert.equal(w.progress.allGoals, true);
  w.player.x = L.EXIT.rect[0] - 4;
  w.update(0.05, {});
  ev = w.update(0.2, { dir: { x: 1, y: 0 } });
  assert.ok(ev.some((e) => e.type === 'exit'));
});

test('ซุ้มผี: the seventh place, in front of the ghost stalls, reached before the exit', () => {
  assert.deepEqual(GOALS.map((g) => g.id), ['lane', 'shops', 'desk', 'tables', 'cinema', 'haunted', 'ghosts']);
  assert.equal(GOALS[6].name, 'ซุ้มผี');
  const z = L.ZONES.ghosts;
  for (const s of L.GHOST_STALLS) assert.ok(s.x >= z[0] && s.x <= z[2], `stall ${s.number} is along the zone`);
  assert.ok(z[2] < L.EXIT.rect[0], 'the zone stops before the exit');
  const w = new World({ skipWelcome: true });
  const ev = [];
  for (let i = 0; i < 40 && !w.progress.goals.has('ghosts'); i++) {
    w.player.x = (z[0] + z[2]) / 2;
    w.player.y = (z[1] + z[3]) / 2;
    ev.push(...w.update(0.05, {}));
  }
  assert.ok(ev.some((e) => e.type === 'goal' && e.goal.id === 'ghosts'));
});

test('AUTO: the tour walks every stop with the real movement and reaches all seven places, at any frame rate', () => {
  // The real autopilot (World.update), not walk() above: it once stopped for good between the
  // shops and the tables (x 169.99999 for a waypoint at 170, beside a narrow gap).
  let seed = 7;
  const jitter = () => (8 + ((seed = (seed * 16807) % 2147483647) / 2147483647) * 40) / 1000;
  for (const [name, dt] of [['60 fps', () => 1 / 60], ['30 fps', () => 1 / 30], ['144 fps', () => 1 / 144], ['uneven frames', jitter]]) {
    const w = new World({ skipWelcome: true });
    w.startAuto();
    let t = 0;
    while (w.auto && t < 240) {
      const d = dt();
      w.update(d, {});
      t += d;
    }
    assert.equal(w.auto, null, `${name}: the tour ends (still at stop ${w.auto?.stop} ${TOUR[w.auto?.stop]?.name} after ${t.toFixed(0)} s)`);
    assert.equal(w.progress.goals.size, GOALS.length, `${name}: all seven places (${[...w.progress.goals]})`);
  }
});

test('after all seven places: allGoals once, and finish() ends without the exit walk', () => {
  const w = new World({ skipWelcome: true });
  assert.deepEqual(w.finish(), [], 'no early finish');
  const ev = GOALS.flatMap((g) => w.progress.enterZone(g.id));
  assert.equal(ev.filter((e) => e.type === 'allGoals').length, 1);
  assert.deepEqual(w.finish(), [{ type: 'exit' }]);
  assert.equal(w.ended, true);
  assert.deepEqual(w.finish(), []);
});

test('only people and the player: Jayimpacts and the team in his model, no birds, no band', () => {
  assert.deepEqual(NPCS.map((n) => n.costume), ['team_po', 'team_kaiching', 'team_peay', 'team_aomsin', 'team_nemo', 'team_nuea', 'jayimpacts']);
  const team = JSON.parse(readFileSync('src/assets/art/characters/team.json', 'utf8'));
  const jay = JSON.parse(readFileSync('src/assets/art/characters/jayimpacts.json', 'utf8'));
  assert.deepEqual(team.cell, jay.cell, 'same cell as Jayimpacts');
  assert.deepEqual(team.frames, jay.frames, 'same frames');
  assert.deepEqual(team.anim, jay.anim, 'same anims');
  assert.deepEqual(team.characters.map((c) => c.id), ['team_po', 'team_peay', 'team_kaiching', 'team_aomsin', 'team_nemo', 'team_nuea']);
  for (const c of team.characters) assert.ok(c.source?.startsWith('assets/incoming/scene_3_sprite/'), `${c.id}: from the owner's Drive art`);
  assert.deepEqual(MUSICIANS, []);
});

test('ticket line by date (Asia/Bangkok, poster phases)', () => {
  assert.equal(TICKET_PHASES, PHASES, "scene 3 uses scene 2's ticket table (one source)");
  assert.equal(ticketLine('2026-09-20'), 'Flash Ticket เปิดขาย 9 ต.ค. ราคา 189 บาท');
  assert.equal(ticketLine('2026-10-04'), 'Flash Ticket เปิดขาย 9 ต.ค. ราคา 189 บาท');
  assert.equal(ticketLine('2026-10-09'), 'ตอนนี้ Flash Ticket 189 บาท วันนี้วันเดียวเท่านั้น!');
  assert.equal(ticketLine('2026-10-10'), 'Flash Ticket หมดแล้ว! Early Bird เปิด 12 ต.ค. ราคา 320 บาท');
  assert.equal(ticketLine('2026-10-12'), 'ตอนนี้ Early Bird 320 บาท ขายถึง 16 ต.ค.');
  assert.equal(ticketLine('2026-10-17'), 'ตอนนี้ General Ticket 390 บาท ขายถึง 23 ต.ค.');
  assert.equal(ticketLine('2026-10-24'), 'วันงานซื้อบัตรหน้างานได้ ราคา 450 บาท');
  assert.equal(ticketLine('2026-10-26'), 'งานจัดไปแล้ว ติดตามเราไว้พบกันปีหน้า');
});

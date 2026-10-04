// Scene 3 characters and talk targets (pure data).
// Positions are base units (see layout.js) and spread like every other anchor.
// Speaker tags, dialogue and costumes (scene 1's birds) follow the prototype's NPC_DEFS.
// Owner: the bird-costume characters are gone; only people (Jayimpacts) and the player remain.
// Their lines stay in data/script.js (NPC_LINES) in case they come back.
import { SHOPS, LANE_TOUCH, LANE_STALLS, GHOST_SPOTS } from './layout.js';
import { NPC_LINES, NPC_NAMES, STALL_ROW_PAGES, STALL_ROW_SPEAKER, GHOST_NAMES, GHOST_PAGES } from '../data/script.js';

/**
 * key: dialogue key; name: speaker tag (exact Thai); costume: scene 1 id; acc: accessory sprite;
 * at: standing spot (world); patrol: waypoints for walkers; ig: last page gets the IG button.
 */
export const NPCS = [
  { key: 'jay', name: 'Jayimpacts', costume: 'jayimpacts', at: { x: SHOPS[4].x + 20, y: SHOPS[4].y - 3 }, ig: true }, // beside the Rotary stall
].map((n) => ({ ...n, short: n.name, name: NPC_NAMES[n.key], pages: NPC_LINES[n.key] })); // short: the name plate over the head

// The band: no one on the deck (owner: only people and the player in the event).
export const MUSICIANS = [];

// The lane stall row: one talk target, five touch points, one "!" over the middle stall.
export const STALL_ROW = {
  key: 'stallRow',
  name: STALL_ROW_SPEAKER,
  pages: STALL_ROW_PAGES,
  touch: LANE_TOUCH,
  bangAt: { x: LANE_STALLS[2].x, y: LANE_STALLS[2].y - 30 },
};

/** The ghosts beside the stalls outside: talkable, but no voucher (not talk targets). */
export const GHOSTS = GHOST_SPOTS.map((g) => ({ key: `ghost${g.number}`, number: g.number, name: GHOST_NAMES[g.number], short: GHOST_NAMES[g.number], pages: GHOST_PAGES, x: g.x, y: g.y }));

/** The talk targets: the characters and the stall row. */
export const TALK_TARGETS = [...NPCS.map((n) => n.key), STALL_ROW.key];

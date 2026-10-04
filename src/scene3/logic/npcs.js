// Scene 3 characters and talk targets (pure data).
// Positions are base units (see layout.js) and spread like every other anchor.
// Speaker tags, dialogue and costumes (scene 1's birds) follow the prototype's NPC_DEFS.
// Owner: the bird-costume characters are gone; only people and the player remain: Jayimpacts
// and the team (Po, Peay, Kaiching, Aomsin, Nemo), drawn in his model by tools/team_sprite.py.
// The birds' lines stay in data/script.js (NPC_LINES) in case they come back.
import { SHOPS, DESK, TABLES, LANE_TOUCH, LANE_STALLS, GHOST_SPOTS, spread } from './layout.js';
import { NPC_LINES, NPC_NAMES, STALL_ROW_PAGES, STALL_ROW_SPEAKER, GHOST_NAMES, GHOST_PAGES } from '../data/script.js';

/**
 * key: dialogue key; name: speaker tag (exact Thai); costume: scene 1 id; acc: accessory sprite;
 * at: standing spot (world); patrol: waypoints for walkers; link: the last page gets an IG
 * button to URLS[link] ('instagram' = Jayimpacts' own, 'eventInstagram' = @laanapha).
 */
export const NPCS = [
  { key: 'po', name: 'Po', costume: 'team_po', at: { x: DESK.x, y: DESK.y - 9 } }, // behind the registration desk
  { key: 'kaiching', name: 'Kaiching', costume: 'team_kaiching', at: { x: DESK.x + 15, y: DESK.y + 8 } }, // east of the desk
  { key: 'peay', name: 'Peay', costume: 'team_peay', at: { x: SHOPS[1].x + 22, y: SHOPS[1].y - 3 } }, // between the drinks and pizza stalls
  { key: 'aomsin', name: 'Aomsin', costume: 'team_aomsin', at: { x: (TABLES[1].x + TABLES[2].x) / 2, y: TABLES[5].y + 6 } }, // the banquet tables' middle aisle
  { key: 'nemo', name: 'Nemo', costume: 'team_nemo', at: spread({ x: 150, y: 132 }), link: 'eventInstagram' }, // the beanbags in front of the screen; feedback by DM to the event's IG
  { key: 'jay', name: 'Jayimpacts', costume: 'jayimpacts', at: { x: SHOPS[4].x + 20, y: SHOPS[4].y - 3 }, link: 'instagram' }, // beside the Rotary stall
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

/** The ghosts beside the stalls outside: talkable, but not talk targets (no prize count). */
export const GHOSTS = GHOST_SPOTS.map((g) => ({ key: `ghost${g.number}`, number: g.number, name: GHOST_NAMES[g.number], short: GHOST_NAMES[g.number], pages: GHOST_PAGES, x: g.x, y: g.y }));

/** The talk targets: the characters and the stall row. */
export const TALK_TARGETS = [...NPCS.map((n) => n.key), STALL_ROW.key];

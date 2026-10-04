// Scene 3 characters and talk targets (pure data).
// Positions are base units (see layout.js) and spread like every other anchor.
// Speaker tags, dialogue and costumes (scene 1's birds) follow the prototype's NPC_DEFS.
// TODO(owner): real looks for the team (the costumes are still placeholders).
import { spread, SHOPS, DESK, BAND, LANE_TOUCH, LANE_STALLS, TABLES, R, GHOST_SPOTS } from './layout.js';
import { NPC_LINES, NPC_NAMES, STALL_ROW_PAGES, STALL_ROW_SPEAKER, GHOST_NAMES, GHOST_PAGES } from '../data/script.js';

const staff = (shop) => ({ x: shop.x, y: shop.y - shop.staffDy }); // feet on the counter top, inside the opening
const base = (x, y) => spread({ x, y });

// Walking characters patrol between waypoints (world units), using the autopilot's path finding.
const tableAisles = (() => {
  const xs = [...new Set(TABLES.map((t) => Math.round(t.x)))].sort((a, b) => a - b);
  const ys = [...new Set(TABLES.map((t) => Math.round(t.y)))].sort((a, b) => a - b);
  const ax = (xs[1] + xs[2]) / 2; // the middle aisle
  return [
    { x: ax, y: ys[0] - 14 },
    { x: ax, y: ys[ys.length - 1] + 12 },
    { x: (xs[2] + xs[3]) / 2, y: ys[ys.length - 1] + 12 },
    { x: (xs[2] + xs[3]) / 2, y: ys[0] - 14 },
  ];
})();
const pathRowY = (R.path[1] + R.path[3]) / 2 + 4;
const walkY = SHOPS[0].y + 12; // the walkway in front of the shop row

/**
 * key: dialogue key; name: speaker tag (exact Thai); costume: scene 1 id; acc: accessory sprite;
 * at: standing spot (world); patrol: waypoints for walkers; ig: last page gets the IG button.
 */
export const NPCS = [
  { key: 'bas', name: 'น้องบาส', costume: 'mahidol', at: { x: DESK.x, y: DESK.y - 9 } }, // behind the registration desk
  { key: 'djton', name: 'ดีเจต้น', costume: 'nuannapa', acc: 'headphones', at: base(236, 116) },
  { key: 'wizard', name: 'จอมเวทย์ลึกลับ', costume: 'onryo', patrol: [{ x: 60, y: pathRowY }, { x: 320, y: pathRowY }] },
  { key: 'pan', name: 'น้องปัน', costume: 'silpakorn', at: base(150, 132) },
  { key: 'chef', name: 'เชฟตูน', costume: 'pumpkin', acc: 'chef_hat', at: staff(SHOPS[2]) },
  { key: 'beer', name: 'น้าเบียร์', costume: 'ramwong', at: staff(SHOPS[1]) },
  { key: 'khaopan', name: 'น้องข้าวปั้น', costume: 'nuannapa', acc: 'straw_hat', patrol: tableAisles },
  { key: 'golf', name: 'น้องกอล์ฟ', costume: 'slasher', at: staff(SHOPS[3]) },
  { key: 'nid', name: 'ป้านิด', costume: 'silpakorn', at: staff(SHOPS[0]) },
  { key: 'nok', name: 'พี่นก', costume: 'mahidol', at: { x: R.lane[0] - 14, y: R.soi[1] + 14 } }, // soi, west corner of the lane mouth
  { key: 'jay', name: 'Jayimpacts', costume: 'jayimpacts', at: { x: SHOPS[4].x + 20, y: SHOPS[4].y - 3 }, ig: true }, // beside the Rotary stall
  { key: 'kaiching', name: 'Kaiching', costume: 'vampire', at: { x: DESK.x + 15, y: DESK.y + 8 } }, // Jintanakarn team, east of the desk
  { key: 'captain', name: 'Captain', costume: 'slasher', acc: 'cap', patrol: [{ x: 40, y: walkY }, { x: 310, y: walkY }] },
].map((n) => ({ ...n, short: n.name, name: NPC_NAMES[n.key], pages: NPC_LINES[n.key] })); // short: the name plate over the head

// The band: scenery, no dialogue.
export const MUSICIANS = [
  { key: 'guitar', costume: 'silpakorn', acc: 'guitar', at: { x: BAND.deck.x - 12, y: BAND.stageY } },
  { key: 'singer', costume: 'ramwong', acc: 'mic', at: { x: BAND.deck.x, y: BAND.stageY - 1 } },
  { key: 'cajon', costume: 'pumpkin', acc: 'cajon', at: { x: BAND.deck.x + 12, y: BAND.stageY } },
];

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

/** The 14 talk targets: the thirteen characters and the stall row. */
export const TALK_TARGETS = [...NPCS.map((n) => n.key), STALL_ROW.key];

// Scene 3 (event exploration and ending): every tunable and every open decision in one
// file. TODO = not decided by the owner yet; change it here only.
// The exact Thai text lives in ./data/script.js; the map layout in ./logic/layout.js.

// ---- Map spread (owner: bigger map, every element keeps its size) ----
// The layout is authored on the prototype's 432 x 640 unit grid (tile = 12 units).
// Positions spread by LS around the plot's top-left corner; sizes never change.
export const LS = 1.5;
export const SPREAD_ORIGIN = { x: 24, y: 28 };
export const TILE = 12;
export const BASE_W = 432;
export const BASE_H = 640;

// ---- Camera and zoom (design px per map unit) ----
export const ZOOM_LEVELS = [3, 2, 1.2, 0.65, 'fit']; // 'fit' = the whole map width in the window
export const ZOOM_START = 2; // index into ZOOM_LEVELS: 1.2, the lane and its stalls in view
export const MISSIONS_HINT_MS = 8000; // after the welcome: points at ภารกิจ first, until it is opened
export const ZOOM_HINT_MS = 9000; // then the +/- hint, until the first zoom
export const SMOOTH_BELOW = 1; // the world is drawn with smoothing below this zoom, nearest-neighbour above

// ---- Characters ----
// Characters are 32 x 36 design px (Jayimpacts 40 x 56). At zoom 3 one design px is one
// screen design px, so a character is 32/3 map units wide; they shrink with zoom (scale zoom/3).
export const CHAR_PX_PER_UNIT = 3;
export const PLAYER_SPEED = 40; // map units per second
export const WALKER_SPEED = 18;
export const WALK_FPS = 8;
export const IDLE_FPS = 2.2;
export const TALK_RANGE = 16; // map units, feet to feet
export const BANG_RANGE = 5 * TILE * LS; // yellow "!" over characters not yet talked to, within about 5 tiles
export const PLATE_RANGE = 60; // name plate over the nearest character within this distance
export const PLAYER_BOX = { w: 8, h: 4 }; // collision box at the feet
export const PATH_GRID = 4; // A* grid step (map units)
export const MIN_TOUCH_CSS_PX = 44; // tappable areas grow to at least this (hit areas, not drawings)

// ---- Goals and the special prize ----
export const GOAL_COUNT = 6;
// Talks (owner): no coupon per talk. Talking with everyone gives one special-prize coupon;
// what it is, the team announces later (the ending says so: PRIZE_NOTE in data/script.js).
export const SPECIAL_PRIZE = {
  coupons: 1,
  // Does the lane stall row count toward "talked to everyone"? Default yes.
  stallRowCounts: true,
};
// TODO(owner): a way to actually book a stall (link, phone or IG message). null = no button.
export const STALL_BOOKING = { label: null, url: null };

// ---- Event facts ----
// TODO(owner): opening time. The owner says 4 โมงครึ่ง; an older poster said 5 PM. Confirm.
export const EVENT_CARD = {
  dates: '24-25 ต.ค. 2569',
  opens: 'เริ่ม 4 โมงครึ่ง',
  shortFilm: 'หนังสั้น ชักศอกไม่ถึงใจ 1 ทุ่ม',
  mainProgram: 'โปรแกรมหลัก 1 ทุ่มครึ่ง',
};
// TODO(owner): the number of banquet tables (the plan says 30, the map shows 20). No number appears in any text.
export const TABLE_GRID = { cols: 4, rows: 5 };

// ---- Links (open in a new tab) ----
export const URLS = {
  booking: 'https://www.hellobooku.com/laanapha2026',
  instagram: 'https://www.instagram.com/jayimpacts/', // Jayimpacts' own IG (his dialogue button)
  eventInstagram: 'https://www.instagram.com/laanapha/', // the team's IG (thank-you panel, ending)
  map: 'https://maps.app.goo.gl/XxkVruXCpHoy5VWr5', // Google Maps: เมื่อคืนผมนอนไม่หลับ
};

// ---- Ticket phases: the one table the whole game uses (scene 2's stall 3 and this ending), ----
// from the official ticket poster: src/data/ticketPhases.js. Edit dates and prices there.
export { PHASES as TICKET_PHASES, EVENT_END } from '../data/ticketPhases.js';

// ---- Font ----
// TODO(owner): the Serithai licence for web embedding is still open. Kanit is the web fallback.
export const FONT = '"Lannapha Serithai", "Kanit", sans-serif';
export const FONT_PX = 12;
// Text is rasterised at TEXT_RES canvas px per design px and scaled up with hard edges:
// pixelated like the art, still easy to read (scene 2's chatbox uses 2 as well).
export const TEXT_RES = 2;
export const LINE_H = 16; // 3 lines of 12 px Thai text in the dialogue box, stacked marks included

// ---- Day / night ----
export const START_NIGHT = false; // day is the main look; ?night=1 starts at night

// ---- Autopilot tour (AUTO button) ----
export const AUTOPILOT_PAUSE_MS = 1000;

// ---- Team (TODO: real names and looks; the costumes are placeholders) ----
// Lives in ./logic/npcs.js with the dialogue keys.

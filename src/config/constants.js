// Every tunable for scene 2 lives here (spec section 5 and 7.4).
// ASSUMPTION = starting value from the design discussion, tune in playtest.
// TODO = not decided by the owner; isolated here so it can be changed in one place.

// ---- Logical resolution (spec 2) ----
export const GAME_W = 180; // design units: all layout below is in these
export const GAME_H = 320;
// Art is authored at RENDER_SCALE x design size and the canvas renders at device
// resolution, so the game looks sharp while the layout stays 180 x 320.
export const RENDER_SCALE = 3;
export const LETTERBOX_COLOR = '#000000'; // ASSUMPTION: theme colour for the letterbox bars

// ---- Palette (spec 2, hex estimated from screenshots; sample real values from source art) ----
export const PALETTE = {
  orangeRed: 0xde5238,
  black: 0x000000,
  yellow: 0xffff4f,
  magenta: 0xf02df0,
  white: 0xffffff,
  birdBlue: 0x0000ff,
  birdGreen: 0x55ff3a,
};
export const CSS = {
  orangeRed: '#DE5238',
  black: '#000000',
  yellow: '#FFFF4F',
  magenta: '#F02DF0',
  white: '#FFFFFF',
};

// ---- Section 5 constants ----
export const CHASE_TIME_S = 120; // never pauses
export const TAP_GAME_TIME_S = 10;
export const TAP_GAME_GAIN = 0.06;
export const TAP_GAME_DECAY_PER_S = 0.1;
export const SPRINT_GAIN = 0.03; // ASSUMPTION, tune
export const SPRINT_DECAY_PER_S = 0.1;
export const RUN_SEGMENT_S = 10;
export const JAR_REVEAL_MS = 1200;
export const JAR_SWAPS = 6; // ASSUMPTION
export const JAR_SWAP_MS_START = 500; // ASSUMPTION
export const JAR_SWAP_MS_END = 350; // ASSUMPTION
export const JAR_PICK_TIME_LIMIT_S = null; // ASSUMPTION: no time limit on picking (open item 6)
export const TYPEWRITER_CPS = 30; // counted in grapheme clusters so Thai marks never appear alone
export const CHASER_STAGE_REMAINING_S = [90, 60, 30, 15];
export const SHAKE_LAST_S = 15;

// ---- Layout (spec 7.4, all ASSUMPTIONS, tune visually) ----
export const GROUND_Y = 240; // same in every background
export const BIRD_X = 118;
export const STALL_STOP_X = 44; // stall centre when the world stops (spec ~52; 44 leaves room for the ghost beside it)
export const RUN_SPEED_PX_S = 48; // ASSUMPTION: world scroll speed during auto-run
export const WALK_SPEED_PX_S = 24; // ASSUMPTION: slower walk before stalls 1 and 2 (no timer, no fail)
export const WALK_SEGMENT_S = 6;
export const PRE_GAME_SHAKE_MS = 500; // shake after stall 1/2 dialogue, then the minigame starts
export const PRE_GAME_SHAKE_INTENSITY = 0.012;

// Atmosphere: dark alley with fog; the minigames at stalls 1 and 2 dim the scene
// while the characters stay lit above the dim layer.
export const FOG_Y = 168; // top of the fog band (48 px tall, around the action band)
export const FOG_ALPHA = 0.9;
export const FOG_DRIFT_PX_S = 4; // fog drifts on its own, on top of the world scroll
export const FOG_PARALLAX = 0.8;
export const MINIGAME_DIM_ALPHA = 0.7;
export const MINIGAME_DIM_IN_MS = 1800; // slow fade to dark as the minigame starts
export const MINIGAME_DIM_OUT_MS = 900;

// Stalls (64 x 64 design px). Counter top at y = 40 inside the stall.
export const STALL_H = 64;
export const STALL_COUNTER_Y = 40;
export const STALL_KIND = { 1: 'A', 2: 'B', 3: 'A', 4: 'B', 5: 'C' }; // A yellow, B magenta, C black/yellow
export const STALL_GHOST_OFFSET_X = 42; // stalls 3-5: ghost centre this far right of the stall centre (stall is 64 wide)
export const GHOST_SINK = 12; // ghost bottom this far below the counter top: head and shoulders show above it
export const FAR_PARALLAX = 0.5; // ASSUMPTION: far layer scroll factor
export const SPRINT_DISTANCE_PX = 360; // ASSUMPTION: scroll covered by a full sprint meter
export const CHASER_X_BY_STAGE = [200, 188, 178, 170, 164]; // ASSUMPTION: centre x, stage 0 = > 90 s left
export const CHASER_HOVER_Y = GROUND_Y - 48; // ASSUMPTION: floating ghost, centre y (frames are 87 px tall)
// Where the bird's centre sits inside the flipped Krahang-riding-bird frame (0..1).
export const CLING_COMBO_ORIGIN_X = 0.35; // ASSUMPTION, tune visually
export const JAR_XS = [STALL_STOP_X - 20, STALL_STOP_X + 20]; // 40 px apart, on stall 2's counter
export const JAR_TABLE_Y = GROUND_Y - 24 + 2; // jar bottom sits on stall 2's counter top
export const SHAKE_INTENSITY = 0.006; // ~1 px at 180 px wide

export const UI = {
  timerBar: { x: 30, y: 8, w: 120, h: 8 },
  chatbox: { x: 8, y: 24, w: 164, h: 60, pad: 6, arrowW: 10 }, // text area sits below the name tag, arrow gets its own column
  nametag: { h: 18, padX: 6 },
  choices: { x: 8, y: 88, w: 164, h: 38, gap: 2, lineHeight: 16 }, // 2 lines of 12 px Thai incl. stacked marks
  meter: { x: 30, y: 270, w: 120, h: 10 },
  tapButton: { x: 90, y: 298 },
  letterPanel: { w: 140, h: 100, pad: 10 },
};

// ---- Text (spec 2) ----
// Serithai Regular, a Thai pixel font: 12 px body, drawn on the design grid
// (resolution 1) with smoothing off, so it scales up as crisp pixels like the art.
// TODO(open item 2): confirm the Serithai licence allows embedding in the web game.
export const FONT_IS_PLACEHOLDER = false;
export const FONT_FAMILY = '"Serithai", monospace';
export const FONT_BODY_PX = 12;
export const FONT_TITLE_PX = 16;
export const LINE_HEIGHT_PX = 18; // spec: 16 to 20; room for stacked vowels and tone marks
export const TEXT_PAD_Y = 4; // extra canvas px on every side so no glyph or stacked mark is ever clipped

// ---- Touch (spec 2) ----
export const MIN_TOUCH_CSS_PX = 44;

// ---- Choices (spec 7.3) ----
export const RANDOMISE_CHOICE_ORDER = false; // ASSUMPTION: polite on top, not specified

// ---- Endings ----
export const CAUGHT_MS = 1000; // caught sequence length before the Game over screen
export const WHITEOUT_MS = 1000;
export const JUMP_SCARE_MS = 900;

// Every tunable for scene 2 lives here (spec section 5 and 7.4).
// ASSUMPTION = starting value from the design discussion, tune in playtest.
// TODO = not decided by the owner; isolated here so it can be changed in one place.

// ---- Logical resolution (spec 2) ----
export const GAME_W = 180;
export const GAME_H = 320;
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
export const STALL_STOP_X = 52; // stall centre when the world stops
export const RUN_SPEED_PX_S = 48; // ASSUMPTION: world scroll speed during auto-run
export const FAR_PARALLAX = 0.5; // ASSUMPTION: far layer scroll factor
export const SPRINT_DISTANCE_PX = 360; // ASSUMPTION: scroll covered by a full sprint meter
export const CHASER_X_BY_STAGE = [200, 188, 178, 170, 164]; // ASSUMPTION: centre x, stage 0 = > 90 s left
export const CHASER_HOVER_Y = GROUND_Y - 36; // ASSUMPTION: floating ghost, centre y
export const JAR_XS = [36, 76]; // ~40 px apart, on the table left of the bird
export const JAR_TABLE_Y = GROUND_Y - 22; // jar bottom sits on the table top
export const SHAKE_INTENSITY = 0.006; // ~1 px at 180 px wide

export const UI = {
  timerBar: { x: 30, y: 8, w: 120, h: 8 },
  chatbox: { x: 8, y: 24, w: 164, h: 56, pad: 6 },
  nametag: { h: 16, padX: 6 },
  choices: { x: 8, y: 88, w: 164, h: 32, gap: 6 },
  meter: { x: 30, y: 270, w: 120, h: 10 },
  tapButton: { x: 90, y: 298 },
  letterPanel: { w: 140, h: 100, pad: 10 },
};

// ---- Text (spec 2) ----
// TODO(open item 2): Thai pixel font not chosen, licence not checked. This is a PLACEHOLDER.
// Noto Sans Thai (OFL, bundled via @fontsource) renders stacked vowels and tone marks.
export const FONT_IS_PLACEHOLDER = true;
export const FONT_FAMILY = '"Noto Sans Thai", sans-serif';
export const FONT_BODY_PX = 12;
export const FONT_TITLE_PX = 16;
export const LINE_HEIGHT_PX = 16; // spec: 16 to 20
export const TEXT_RESOLUTION = 1; // 1 = drawn on the 180x320 grid, like the art

// ---- Touch (spec 2) ----
export const MIN_TOUCH_CSS_PX = 44;

// ---- Choices (spec 7.3) ----
export const RANDOMISE_CHOICE_ORDER = false; // ASSUMPTION: polite on top, not specified

// ---- Endings ----
export const CAUGHT_MS = 1000; // caught sequence length before the Game over screen
export const WHITEOUT_MS = 1000;
export const JUMP_SCARE_MS = 900;

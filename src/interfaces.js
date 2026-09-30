// Contracts with the other scenes (spec 3).
// TODO(open item 1): agree the character data shape and the callback names with the
// scene 1 developer, and confirm the framework (Phaser 4 here) matches their stack.

/**
 * Character data passed in from scene 1 and passed on to scene 3 unchanged.
 *
 * @typedef {object} CharacterData
 * @property {string} id
 * @property {number} frameWidth                 32
 * @property {number} frameHeight                32
 * @property {View & {facing: 'left'|'right'}} side
 *   Side sheet. Needs anims idle, run, struggle, scared. If `facing` is 'right' it is flipped in code.
 * @property {View} front
 *   Front sheet. Needs anims surprised, relieved, happy, idle.
 * @property {{side?: CostumeLayer[], front?: CostumeLayer[]}} [layers]
 *   Optional hats/costumes drawn on top of the bird at an anchor.
 *
 * @typedef {object} View
 * @property {string} key                        texture key
 * @property {Record<string, number[]>} anims    frame indices per animation
 * @property {{headTop: {x: number, y: number}, eye: {x: number, y: number}}} anchors
 *   Fixed pixel anchors in the sheet as drawn, identical in every frame of that sheet.
 *
 * @typedef {object} CostumeLayer
 * @property {string} key                        texture key (loaded by the host before scene 2)
 * @property {number} [frame]
 * @property {'headTop'|'eye'} anchor
 * @property {number} [offsetX]                  in sheet pixels, as drawn
 * @property {number} [offsetY]
 */

/** Placeholder bird data so scene 2 runs standalone. The sheets themselves are SPRITE NEEDED until scene 1 supplies them. */
export function createPlaceholderCharacter() {
  return {
    id: 'placeholder-bird',
    frameWidth: 32,
    frameHeight: 32,
    side: {
      key: 'bird_side',
      // Matches the side row of the sheet seen in chat: idle 2, run 5, struggle 2, scared 1,
      // drawn facing right. ASSUMPTION: confirm the split with the scene 1 developer.
      facing: 'right',
      anims: { idle: [0, 1], run: [2, 3, 4, 5, 6], struggle: [7, 8], scared: [9] },
      anchors: { headTop: { x: 16, y: 4 }, eye: { x: 21, y: 10 } }, // TODO(open item 1): real values from scene 1
    },
    front: {
      key: 'bird_front',
      anims: { surprised: [0], relieved: [1], happy: [2, 3, 4], idle: [5] },
      anchors: { headTop: { x: 16, y: 4 }, eye: { x: 16, y: 11 } }, // TODO(open item 1)
    },
    layers: {},
  };
}

/**
 * Anchor in sheet pixels, mirrored when the sprite is flipped in code.
 * Pixel x mirrors to (frameWidth - 1 - x).
 */
export function anchorFor(character, view, name, flipped) {
  const a = character[view].anchors[name];
  return flipped ? { x: character.frameWidth - 1 - a.x, y: a.y } : { x: a.x, y: a.y };
}

// TODO(open item 1): route or function name of the full game's home page.
export const HOME_ROUTE = '/';

/**
 * Scene 2 outputs. The host (the full game) overrides these.
 * Standalone defaults: onWin shows a scene 3 stub, onGameOver goes to HOME_ROUTE.
 */
export const defaultCallbacks = {
  onWin: null, // set in main.js to the scene 3 stub
  onGameOver: () => {
    window.location.href = HOME_ROUTE;
  },
};

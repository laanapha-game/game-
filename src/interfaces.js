// Contracts with the other scenes (spec 3).
// Scene 1 (assets/incoming/scene1/) is plain Canvas 2D, not Phaser. Its choice
// `{ id, name }` is mapped to CharacterData by src/integration/scene1Adapter.js and
// handed over by src/scene1Bridge.js (game.html). See spec section 3.

/**
 * Character data passed in from scene 1 and passed on to scene 3 unchanged.
 *
 * @typedef {object} CharacterData
 * @property {string} id                         scene 1 character id (passed on to scene 3)
 * @property {string} [name]                     scene 1 display name, passed through
 * @property {number} frameWidth                 design px (scene 1: 32)
 * @property {number} frameHeight                design px (scene 1: 36, feet on the bottom row)
 * @property {View & {facing: 'left'|'right'}} side
 *   Side sheet. Needs anims idle, run, struggle, scared. If `facing` is 'right' it is flipped in code.
 * @property {View} front
 *   Front sheet. Needs anims surprised, relieved, happy, idle.
 * @property {{side?: CostumeLayer[], front?: CostumeLayer[]}} [layers]
 *   Optional hats/costumes drawn on top of the bird at an anchor. Scene 1 paints its
 *   costumes into the frames, so its characters have none.
 *
 * @typedef {object} View
 * @property {string} key                        texture key
 * @property {Record<string, number[]>} anims    frame indices per animation
 * @property {{headTop: {x: number, y: number}, eye: {x: number, y: number}}} anchors
 *   Fixed pixel anchors (design px, pixel index inside one frame, as drawn), identical
 *   in every frame of that sheet.
 *
 * @typedef {object} CostumeLayer
 * @property {string} key                        texture key (loaded by the host before scene 2)
 * @property {number} [frame]
 * @property {'headTop'|'eye'} anchor
 * @property {number} [offsetX]                  design px, as drawn
 * @property {number} [offsetY]
 *   With no offset, the layer's centre column (floor(width / 2)) is the anchor's column
 *   and its bottom row sits just above the anchor row (a hat on the head top).
 *   See layerTopLeft().
 */

/**
 * Default bird (Drive sprite_playerdemo) so scene 2 runs on its own, and the fallback
 * when the host's character sheets cannot be loaded.
 */
export function createPlaceholderCharacter() {
  return {
    id: 'placeholder-bird',
    frameWidth: 32,
    frameHeight: 32,
    side: {
      key: 'bird_side',
      // Side row of sprite_playerdemo: idle 2, run 5, struggle 2, scared 1, drawn facing right.
      facing: 'right',
      anims: { idle: [0, 1], run: [2, 3, 4, 5, 6], struggle: [7, 8], scared: [9] },
      anchors: { headTop: { x: 16, y: 4 }, eye: { x: 21, y: 10 } }, // estimates; this bird has no layers
    },
    front: {
      key: 'bird_front',
      anims: { surprised: [0], relieved: [1], happy: [2, 3, 4], idle: [5] },
      anchors: { headTop: { x: 16, y: 4 }, eye: { x: 16, y: 11 } },
    },
    layers: {},
  };
}

/**
 * Anchor in sheet pixels, mirrored when the sprite is flipped in code.
 * Pixel x mirrors to (frameWidth - 1 - x). `frameWidth` defaults to the character's.
 */
export function anchorFor(character, view, name, flipped, frameWidth = character.frameWidth) {
  const a = character[view].anchors[name];
  return flipped ? { x: frameWidth - 1 - a.x, y: a.y } : { x: a.x, y: a.y };
}

/**
 * Top-left of a costume layer (design px, integers): the layer's centre column
 * (floor(w / 2)) is offsetX px right of the bird's anchor pixel, and the layer's
 * bottom edge is offsetY px below the anchor's top edge.
 * When the bird is shown flipped, the anchor, the offset and the layer itself are
 * mirrored: the result is the exact mirror image of the unflipped placement.
 */
export function layerTopLeft({ frameLeft, frameTop, frameWidth, anchor, offsetX = 0, offsetY = 0, layerW, layerH, flipped }) {
  const own = Math.floor(layerW / 2);
  const x = flipped ? frameLeft + (frameWidth - 1 - anchor.x) - offsetX - (layerW - 1 - own) : frameLeft + anchor.x + offsetX - own;
  return { x, y: frameTop + anchor.y + offsetY - layerH };
}

// Home page when scene 2 runs on its own (index.html). In the full game (game.html)
// onGameOver calls scene 1's LannaphaGame.goHome() instead (src/scene1Bridge.js).
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

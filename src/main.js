// Entry point. Runs scene 2 standalone with the placeholder bird, and exports
// startScene2() for the full game to call with the real character data.
import '@fontsource/noto-sans-thai/400.css'; // PLACEHOLDER font, see FONT_IS_PLACEHOLDER
import Phaser from 'phaser';
import { GAME_W, GAME_H, LETTERBOX_COLOR, FONT_FAMILY, FONT_BODY_PX } from './config/constants.js';
import { installIntegerScale } from './display/integerScale.js';
import { createPlaceholderCharacter, defaultCallbacks } from './interfaces.js';
import { BootScene } from './scenes/BootScene.js';
import { TrickOrTreatScene } from './scenes/TrickOrTreatScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { Scene3Stub } from './scenes/Scene3Stub.js';

export { TrickOrTreatScene, BootScene, GameOverScene };

function blockBrowserGestures(el) {
  const stop = (e) => e.preventDefault();
  el.addEventListener('contextmenu', stop);
  el.addEventListener('dblclick', stop);
  el.addEventListener('selectstart', stop);
  // iOS Safari pinch / double-tap zoom
  document.addEventListener('gesturestart', stop, { passive: false });
  let lastTouch = 0;
  el.addEventListener(
    'touchend',
    (e) => {
      const now = e.timeStamp;
      if (now - lastTouch < 350) e.preventDefault();
      lastTouch = now;
    },
    { passive: false },
  );
}

/**
 * Start scene 2.
 * @param {object} opts
 * @param {HTMLElement|string} [opts.parent]
 * @param {import('./interfaces.js').CharacterData} [opts.character]
 * @param {(character) => void} [opts.onWin]   go to scene 3 with the character data
 * @param {() => void} [opts.onGameOver]       go to the full game's home page
 */
export async function startScene2({ parent = 'game', character, onWin, onGameOver } = {}) {
  // Wait for the (placeholder) Thai font so text measures and wraps correctly.
  try {
    await document.fonts.load(`${FONT_BODY_PX}px ${FONT_FAMILY}`, 'ก้ปฐู');
  } catch {
    /* render with the fallback font */
  }
  const parentEl = typeof parent === 'string' ? document.getElementById(parent) : parent;
  blockBrowserGestures(parentEl);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentEl,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: LETTERBOX_COLOR,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 3 },
    scene: [BootScene, TrickOrTreatScene, GameOverScene, Scene3Stub],
  });
  game.registry.set('character', character ?? createPlaceholderCharacter());
  game.registry.set('callbacks', {
    onWin: onWin ?? ((c, scene) => scene.scene.start('Scene3Stub', { character: c })),
    onGameOver: onGameOver ?? defaultCallbacks.onGameOver,
  });
  game.events.once('ready', () => installIntegerScale(game));
  return game;
}

// Standalone run (not embedded by the full game).
if (!window.__LANNAPHA_EMBEDDED__) startScene2();

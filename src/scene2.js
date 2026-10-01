// Scene 2 as a module: startScene2() starts it in a parent element with the
// player's character. No side effects on import and no page-wide styles, so a
// host page (game.html, scene 1) can import it. Standalone entry: src/main.js.
import './scene2.css'; // #game container and the Serithai @font-face
import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_SCALE, LETTERBOX_COLOR, FONT_FAMILY, FONT_BODY_PX } from './config/constants.js';
import { installViewScale } from './display/integerScale.js';
import { createPlaceholderCharacter, defaultCallbacks } from './interfaces.js';
import { BootScene } from './scenes/BootScene.js';
import { TrickOrTreatScene } from './scenes/TrickOrTreatScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { Scene3Stub } from './scenes/Scene3Stub.js';

export { TrickOrTreatScene, BootScene, GameOverScene };

const guarded = new WeakSet();
function blockBrowserGestures(el) {
  if (guarded.has(el)) return; // a host may start scene 2 again in the same element
  guarded.add(el);
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
    width: GAME_W * RENDER_SCALE,
    height: GAME_H * RENDER_SCALE,
    backgroundColor: LETTERBOX_COLOR,
    // Crisp pixel art at whole-number zoom; even pixel edges when the zoom is fractional.
    render: { smoothPixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 3 },
    audio: { noAudio: true }, // sound is src/audio/engine.js (synthesized, shared with scene 1's page)
    scene: [BootScene, TrickOrTreatScene, GameOverScene, Scene3Stub],
  });
  game.registry.set('character', character ?? createPlaceholderCharacter());
  game.registry.set('callbacks', {
    onWin: onWin ?? ((c, scene) => scene.scene.start('Scene3Stub', { character: c })),
    onGameOver: onGameOver ?? defaultCallbacks.onGameOver,
  });
  game.events.once('ready', () => installViewScale(game));
  return game;
}

// Scene 3 as a module: startScene3() starts it in a parent element with the player's
// character. Used by the full game (src/scene1Bridge.js registers it with scene 1 as
// 'scene3') and by the standalone page scene3.html.
import '../scene2.css'; // #game container and the Serithai @font-face (shared)
import Phaser from 'phaser';
import { installScene3Scale } from './viewScale.js';
import { GAME_W, GAME_H, RENDER_SCALE, LETTERBOX_COLOR } from '../config/constants.js';
import { preload, createAnims } from './assets.js';
import { World } from './logic/world.js';
import { resolveToday } from './logic/ticketLine.js';
import { WorldScene } from './scenes/WorldScene.js';
import { HudScene } from './scenes/HudScene.js';
import { EndingScene, CreditsScene } from './scenes/EndingScene.js';
import { FONT, FONT_PX, ZOOM_START, START_NIGHT } from './config.js';
import { audio } from '../audio/engine.js';

class BootScene extends Phaser.Scene {
  constructor() {
    super('S3Boot');
  }

  preload() {
    preload(this);
  }

  create() {
    createAnims(this);
    const S = this.registry.get('scene3');
    if (S.start === 'ending') return this.scene.start('S3Ending');
    this.scene.start('S3World');
    this.scene.launch('S3Hud');
  }
}

/**
 * @param {object} opts
 * @param {HTMLElement|string} [opts.parent]
 * @param {{id:string, name?:string}} [opts.character]  scene 1's choice (or scene 2's CharacterData)
 * @param {() => void} [opts.onBack]   back button: character select
 * @param {() => void} [opts.onHome]   ending: home page
 * @param {{night?:boolean, today?:string, skipWelcome?:boolean, forceWelcome?:boolean, start?:'ending'}} [opts.dev]
 */
export async function startScene3({ parent = 'game', character, onBack, onHome, dev = {} } = {}) {
  try {
    await document.fonts.load(`${FONT_PX}px ${FONT}`, 'ก้ปฐู');
  } catch {
    /* fallback font */
  }
  const parentEl = typeof parent === 'string' ? document.getElementById(parent) : parent;
  const isDev = !!import.meta.env?.DEV;
  const world = new World({ forceWelcome: !!dev.forceWelcome, skipWelcome: !!dev.skipWelcome });
  const S = {
    world,
    character: { id: character?.id ?? 'nuannapa', name: character?.name },
    night: dev.night ?? START_NIGHT,
    zoom: ZOOM_START,
    today: dev.today ?? resolveToday({ search: window.location.search, isDev }),
    start: dev.start,
    input: { dir: null, target: null },
    mapOpen: false,
    paused: false,
    callbacks: {},
    publish() {
      // Progress for the host: window.LannaphaGame.progress.scene3
      const G = (window.LannaphaGame ??= {});
      G.progress ??= {};
      G.progress.scene3 = world.snapshot();
    },
  };
  audio.mood(null); // no music in scene 3
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentEl,
    width: GAME_W * RENDER_SCALE,
    height: GAME_H * RENDER_SCALE,
    backgroundColor: LETTERBOX_COLOR,
    render: { smoothPixelArt: true, roundPixels: false },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 3 },
    audio: { noAudio: true },
    scene: [BootScene, WorldScene, HudScene, EndingScene, CreditsScene],
  });
  S.callbacks = {
    onBack: () => onBack?.(),
    onHome: () => onHome?.(),
    toEnding: () => {
      game.scene.stop('S3Hud');
      game.scene.stop('S3World');
      game.scene.start('S3Ending');
    },
  };
  game.registry.set('scene3', S);
  game.events.once('ready', () => {
    installScene3Scale(game);
    phoneGestures(game.canvas);
  });
  S.publish();
  if (isDev) {
    window.__scene3 = {
      game,
      S,
      world,
      teleport(x, y) {
        world.player.x = x;
        world.player.y = y;
      },
      setZoom(i) {
        S.zoom = i;
        game.scene.getScene('S3World').applyZoom(true);
      },
      setNight(n) {
        game.scene.getScene('S3World').applyNight(n);
      },
      ending: () => S.callbacks.toEnding(),
      credits: () => game.scene.start('S3Credits'),
    };
  }
  return game;
}

/**
 * Phones: scene 3 has its own pinch zoom and hold-to-walk, so the browser must not pinch-zoom
 * the page, pan it or pull it to refresh while a finger is on the game.
 */
const guarded = new WeakSet();
function phoneGestures(canvas) {
  if (!canvas || guarded.has(canvas)) return;
  guarded.add(canvas);
  canvas.style.touchAction = 'none';
  const stop = (e) => e.preventDefault();
  canvas.addEventListener('touchmove', stop, { passive: false });
  canvas.addEventListener('contextmenu', stop);
  document.addEventListener('gesturestart', (e) => canvas.isConnected && e.preventDefault(), { passive: false }); // iOS Safari pinch
}

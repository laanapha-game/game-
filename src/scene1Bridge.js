// Full game page (game.html): scene 1 -> scene 2 -> scene 3 (spec 3; scene 3 at the end of this file).
//
// Scene 1 (plain Canvas 2D, assets/incoming/scene1/) draws home and character
// select into its own canvas and exposes window.LannaphaGame. This plugs scene 2
// in through scene 1's own API: LannaphaGame.registerScene('scene2', ...). On the
// confirm button (ยืนยัน) scene 1 fades to black and calls enter({ id, name });
// scene 2 then runs in #game on top of scene 1's canvas.
//   onWin(character)  -> scene 3: LannaphaGame.go('scene3', character) once a scene 3
//                        is registered with scene 1, until then scene 2's stub.
//   onGameOver()      -> scene 1's home page: LannaphaGame.goHome().
//
// Sound (src/audio/engine.js): scene 1's speaker stays the master switch. Scene 1
// keeps its own button sounds; the bridge adds its music and night ambience.
import { startScene2 } from './scene2.js';
import { characterFromScene1 } from './integration/scene1.js';
import { audio } from './audio/engine.js';
import { startScene3 } from './scene3/index.js';

const G = window.LannaphaGame;
const box = document.getElementById('game');
let game = null;

// Scene 1 keeps its scene list private, so note which scenes get registered.
const registered = new Set();
const register = G.registerScene;
G.registerScene = (name, sc) => {
  registered.add(name);
  register(name, sc);
};

// ---------- sound on scene 1's screens ----------
// Scene 1 keeps its speaker flag private, so the bridge follows the same taps the way
// scene 1 reads them (pick() in its source): its speaker BTN.sound (x 160, y 2,
// 16 x 12) with the hit area grown to 44 CSS px, pressed and released on it; on the
// select screen a sideways drag that starts above y 134 is a swipe instead.
const canvas = document.getElementById('c');
const SPEAKER = { x: 160, y: 2, w: 16, h: 12 };
let scene1Sound = false; // scene 1's own flag, as followed here
let pressed = null;
let syncing = false;
let inScene2 = false;

function toScene1(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * G.W) / r.width, y: ((e.clientY - r.top) * G.H) / r.height, scale: r.width / G.W };
}
function onSpeaker(p) {
  const min = Math.ceil(44 / p.scale);
  const w = Math.max(SPEAKER.w, min);
  const h = Math.max(SPEAKER.h, min);
  return Math.abs(p.x - (SPEAKER.x + SPEAKER.w / 2)) <= w / 2 && Math.abs(p.y - (SPEAKER.y + SPEAKER.h / 2)) <= h / 2;
}
// Home shows the yellow marquee frame at (25, 20); the select screen does not.
function onHomeScreen() {
  const d = G.ctx.getImageData(25, 20, 1, 1).data;
  return d[0] === 255 && d[1] === 255 && d[2] === 79;
}
canvas.addEventListener('pointerdown', (e) => {
  if (syncing || inScene2) return;
  const p = toScene1(e);
  pressed = onSpeaker(p) ? { ...p, home: onHomeScreen() } : null;
});
canvas.addEventListener('pointerup', (e) => {
  if (syncing || inScene2 || !pressed) return;
  const p = toScene1(e);
  const swipe = !pressed.home && pressed.y < 134 && Math.abs(p.x - pressed.x) > 16 && Math.abs(p.y - pressed.y) < 24;
  if (onSpeaker(p) && !swipe) {
    scene1Sound = !scene1Sound;
    audio.setSound(scene1Sound); // inside the tap: mobile browsers allow audio to start
  }
  pressed = null;
});
canvas.addEventListener('pointercancel', () => (pressed = null));

/** If the speaker was switched in scene 2, switch scene 1's to match (its own tap path). */
function syncScene1Speaker() {
  if (scene1Sound === audio.sound) return;
  const r = canvas.getBoundingClientRect();
  const at = {
    clientX: r.left + ((SPEAKER.x + SPEAKER.w / 2) * r.width) / G.W,
    clientY: r.top + ((SPEAKER.y + SPEAKER.h / 2) * r.height) / G.H,
    pointerId: 1,
    bubbles: true,
  };
  syncing = true;
  canvas.dispatchEvent(new PointerEvent('pointerdown', at));
  canvas.dispatchEvent(new PointerEvent('pointerup', at));
  syncing = false;
  scene1Sound = audio.sound;
}

// Sound is on from the start, but scene 1 starts silent and audio may only start in
// a tap: on the player's first tap, switch scene 1's speaker on too (before scene 1
// handles that tap, so a first tap on the speaker itself still turns sound off).
document.addEventListener(
  'pointerdown',
  function firstTap(e) {
    if (!e.isTrusted) return;
    document.removeEventListener('pointerdown', firstTap, true);
    if (!inScene2) syncScene1Speaker();
  },
  true,
);

function scene1Audio() {
  audio.ambient('night');
  audio.mood('title');
}
scene1Audio();

function stopScene2() {
  const wasRunning = inScene2;
  game?.destroy(true);
  game = null;
  box.hidden = true;
  inScene2 = false;
  if (wasRunning) {
    scene1Audio();
    // After scene 1's fade back to home (its fade is 360 ms).
    setTimeout(syncScene1Speaker, 450);
  }
}

G.registerScene('scene2', {
  async enter(selection) {
    const character = characterFromScene1(selection);
    if (!character) console.warn(`[game] no sheets for scene 1 character "${selection?.id}", scene 2 uses the default bird`);
    if (import.meta.env.DEV) window.__flow = { selected: selection, character };
    box.hidden = false;
    inScene2 = true;
    const started = startScene2({
      parent: box,
      character: character ?? undefined,
      onWin: (c, scene) => {
        if (import.meta.env.DEV) window.__flow.won = c;
        if (registered.has('scene3')) {
          stopScene2();
          audio.mood(null); // scene 3 sets its own sound
          G.go('scene3', c);
        } else scene.scene.start('Scene3Stub', { character: c });
      },
      onGameOver: () => {
        stopScene2();
        G.goHome();
      },
    });
    game = await started;
  },
  // Scene 1's canvas is under #game while scene 2 runs; keep it black for the fades.
  draw() {
    G.ctx.fillStyle = '#000000';
    G.ctx.fillRect(0, 0, G.W, G.H);
  },
  onTap() {},
  exit: stopScene2,
});

// ---------- scene 3: event exploration and the ending (src/scene3/) ----------
// Scene 2's onWin calls LannaphaGame.go('scene3', character); scene 3 runs in #game like
// scene 2. Back -> character select, home (ending) -> scene 1's home page.
// Dev: game.html?scene=scene3&char=ramwong&night=1&today=2026-10-12 opens it directly.
let game3 = null;
function stopScene3() {
  const wasRunning = !!game3;
  game3?.destroy(true);
  game3 = null;
  box.hidden = true;
  inScene2 = false;
  if (wasRunning) {
    scene1Audio();
    setTimeout(syncScene1Speaker, 450);
  }
}
G.registerScene('scene3', {
  async enter(selection) {
    box.hidden = false;
    inScene2 = true; // scene 1's canvas is under #game: its taps are not scene 1's now
    const q = new URLSearchParams(window.location.search);
    game3 = await startScene3({
      parent: box,
      character: { id: selection?.id, name: selection?.name },
      onBack: () => {
        stopScene3();
        (G.goSelect ?? (() => G.go('select')))();
      },
      onHome: () => {
        stopScene3();
        G.goHome();
      },
      dev: import.meta.env.DEV ? { night: q.get('night') === '1', skipWelcome: q.get('skip') === '1' } : {},
    });
  },
  draw() {
    G.ctx.fillStyle = '#000000';
    G.ctx.fillRect(0, 0, G.W, G.H);
  },
  onTap() {},
  exit: stopScene3,
});
if (import.meta.env.DEV) {
  const q = new URLSearchParams(window.location.search);
  if (q.get('scene') === 'scene3') {
    const id = q.get('char') ?? 'nuannapa';
    const c = G.characters.find((x) => x.id === id) ?? G.characters[0];
    G.go('scene3', { id: c.id, name: c.name });
  }
}

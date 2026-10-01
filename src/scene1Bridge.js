// Full game page (game.html): scene 1 -> scene 2 -> scene 3 (spec 3).
//
// Scene 1 (plain Canvas 2D, assets/incoming/scene1/) draws home and character
// select into its own canvas and exposes window.LannaphaGame. This plugs scene 2
// in through scene 1's own API: LannaphaGame.registerScene('scene2', ...). On the
// confirm button (ยืนยัน) scene 1 fades to black and calls enter({ id, name });
// scene 2 then runs in #game on top of scene 1's canvas.
//   onWin(character)  -> scene 3: LannaphaGame.go('scene3', character) once a scene 3
//                        is registered with scene 1, until then scene 2's stub.
//   onGameOver()      -> scene 1's home page: LannaphaGame.goHome().
import { startScene2 } from './scene2.js';
import { characterFromScene1 } from './integration/scene1.js';

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

function stopScene2() {
  game?.destroy(true);
  game = null;
  box.hidden = true;
}

G.registerScene('scene2', {
  async enter(selection) {
    const character = characterFromScene1(selection);
    if (!character) console.warn(`[game] no sheets for scene 1 character "${selection?.id}", scene 2 uses the default bird`);
    if (import.meta.env.DEV) window.__flow = { selected: selection, character };
    box.hidden = false;
    const started = startScene2({
      parent: box,
      character: character ?? undefined,
      onWin: (c, scene) => {
        if (import.meta.env.DEV) window.__flow.won = c;
        if (registered.has('scene3')) {
          stopScene2();
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

// Scene 3 textures: generated props (tools/scene3_art.py), the character sheets (scene 1's
// eight birds and Jayimpacts), scene 2's ghost stalls, and the Jayimpacts portrait.
import CHARS from '../assets/art/characters/characters.json';
import JAY from '../assets/art/characters/jayimpacts.json';

const WORLD_PNG = import.meta.glob('../assets/scene3/world/*.png', { eager: true, query: '?url', import: 'default' });
const CHAR_PNG = import.meta.glob('../assets/scene3/char/*.png', { eager: true, query: '?url', import: 'default' });
const TILES = import.meta.glob('../assets/scene3/tiles.png', { eager: true, query: '?url', import: 'default' });
const SHEETS = import.meta.glob('../assets/art/characters/*.png', { eager: true, query: '?url', import: 'default' });
const ART = import.meta.glob(['../assets/art/krahang.png', '../assets/art/jar.png', '../assets/art/stall_ghost_*.png', '../assets/art/portraits/*.png'], { eager: true, query: '?url', import: 'default' });
const STALLS = import.meta.glob('../../assets/stalls/*.png', { eager: true, query: '?url', import: 'default' });

const name = (path) => path.split('/').pop().replace('.png', '');
export const R = 3; // texture px per design px for character-resolution art

/** Character costumes: id -> { cell, frames, side key, front key }. */
export const COSTUMES = (() => {
  const out = {};
  for (const c of CHARS.characters) out[c.id] = { id: c.id, name: c.name, cell: CHARS.cell, frames: CHARS.frames, side: c.side.file, front: c.front.file };
  const j = JAY.characters[0];
  out.jayimpacts = { id: 'jayimpacts', name: j.name, cell: JAY.cell, frames: JAY.frames, side: j.side.file, front: j.front.file };
  return out;
})();

// Ghost stalls (scene 2): stall art A, B, A, B, C for stalls 1-5 (scene2-spec 7.4), each
// with its ghost: frames per sheet and the frames to loop as an idle.
export const GHOSTS = {
  1: { stall: 'A', key: 'krahang', frames: 8, loop: [0] },
  2: { stall: 'B', key: 'jar', frames: 7, loop: [3, 4] },
  3: { stall: 'A', key: 'stall_ghost_3', frames: 6, loop: [0, 1, 2, 3, 4, 5] },
  4: { stall: 'B', key: 'stall_ghost_4', frames: 4, loop: [0, 1, 2, 3] },
  5: { stall: 'C', key: 'stall_ghost_5', frames: 2, loop: [0, 1] },
};

export function preload(scene) {
  for (const [p, url] of Object.entries(WORLD_PNG)) scene.load.image(`w_${name(p)}`, url);
  for (const [p, url] of Object.entries(CHAR_PNG)) scene.load.image(`c_${name(p)}`, url);
  scene.load.image('tiles', Object.values(TILES)[0]);
  for (const c of Object.values(COSTUMES)) {
    const fw = c.cell.w * R;
    const fh = c.cell.h * R;
    for (const view of ['side', 'front']) {
      const url = SHEETS[`../assets/art/characters/${c[view]}`];
      scene.load.spritesheet(`ch_${c.id}_${view}`, url, { frameWidth: fw, frameHeight: fh });
    }
  }
  for (const [p, url] of Object.entries(STALLS)) scene.load.image(`gs_${name(p)}`, url);
  for (const [p, url] of Object.entries(ART)) {
    const n = name(p);
    const g = Object.values(GHOSTS).find((x) => x.key === n);
    if (g) scene.load.image(`ghostsrc_${n}`, url);
    else scene.load.image(`p_${n}`, url);
  }
}

/** Slice the ghost sheets into frames (their frame width is the texture width / frame count) and make anims. */
export function createAnims(scene) {
  for (const g of Object.values(GHOSTS)) {
    const src = scene.textures.get(`ghostsrc_${g.key}`);
    const img = src.getSourceImage();
    const fw = Math.floor(img.width / g.frames);
    scene.textures.addSpriteSheet(`ghost_${g.key}`, img, { frameWidth: fw, frameHeight: img.height });
    scene.anims.create({ key: `ghost_${g.key}`, frames: g.loop.map((frame) => ({ key: `ghost_${g.key}`, frame })), frameRate: 4, repeat: -1 });
  }
  // Portrait: 2 frames of 64 x 64 design px (neutral, talk) at 3x.
  const portrait = scene.textures.get('p_jayimpacts_portrait').getSourceImage();
  scene.textures.addSpriteSheet('portrait_jay', portrait, { frameWidth: portrait.height, frameHeight: portrait.height });
  for (const c of Object.values(COSTUMES)) {
    for (const view of ['side', 'front']) {
      const anim = (JAY_LIKE(c) ? JAY : CHARS).anim[view];
      for (const [a, frames] of Object.entries(anim)) {
        const fps = a === 'walk' ? 8 : a === 'wave' ? 4 : 2.2;
        scene.anims.create({ key: `${c.id}_${view}_${a}`, frames: frames.map((frame) => ({ key: `ch_${c.id}_${view}`, frame })), frameRate: fps, repeat: -1 });
      }
    }
  }
}
const JAY_LIKE = (c) => c.id === 'jayimpacts';

/** Anim key for a costume, view and action, falling back to idle when the sheet has no such action. */
export function animKey(scene, id, view, action) {
  const k = `${id}_${view}_${action}`;
  if (scene.anims.exists(k)) return k;
  if (view === 'front' && action === 'walk') return `${id}_front_idle`;
  return `${id}_${view}_idle`;
}

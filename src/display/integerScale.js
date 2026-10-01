// Display scaling.
//
// Layout stays in 180 x 320 design units (spec 2). For higher visual quality
// the canvas is the phone's real device resolution, the camera zooms the design
// space up to fill it, and every texture is authored at RENDER_SCALE x its
// design size (a 32 px bird is a 96 px sheet). Sprites are shown at 1/RENDER_SCALE,
// so art keeps 3x more detail while staying crisp pixel art (no smoothing).
//
// The zoom snaps to a whole number of device pixels per design pixel when that
// still fills >= SNAP_MIN_FILL of the screen; otherwise it is fractional and
// Phaser's smoothPixelArt keeps pixel edges even.
import Phaser from 'phaser';
import { GAME_W, GAME_H, RENDER_SCALE } from '../config/constants.js';
import { setTextResolution } from '../ui/text.js';

const SNAP_MIN_FILL = 0.9;

export function computeScale(viewW, viewH, dpr) {
  const exact = Math.min((viewW * dpr) / GAME_W, (viewH * dpr) / GAME_H);
  const snapped = Math.floor(exact);
  const zoom = snapped >= 1 && snapped / exact >= SNAP_MIN_FILL ? snapped : exact; // device px per design px
  const canvasW = Math.round(GAME_W * zoom);
  const canvasH = Math.round(GAME_H * zoom);
  const cssW = canvasW / dpr;
  const cssH = canvasH / dpr;
  const left = Math.round(((viewW - cssW) / 2) * dpr) / dpr;
  const top = Math.round(((viewH - cssH) / 2) * dpr) / dpr;
  return { zoom, canvasW, canvasH, cssW, cssH, left, top, cssScale: zoom / dpr };
}

export function installViewScale(game) {
  const apply = () => {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const s = computeScale(w, h, dpr);
    game.scale.setZoom(1 / dpr);
    game.scale.resize(s.canvasW, s.canvasH);
    const c = game.canvas;
    Object.assign(c.style, { position: 'absolute', width: `${s.cssW}px`, height: `${s.cssH}px`, left: `${s.left}px`, top: `${s.top}px`, margin: '0' });
    game.scale.updateBounds();
    // Pointer mapping: canvas pixels per CSS pixel (Phaser's own value is stale in NONE mode).
    game.scale.displayScale.set(s.canvasW / s.cssW, s.canvasH / s.cssH);
    setTextResolution(Math.ceil(s.zoom));
    game.registry.set('cssScale', s.cssScale);
    game.registry.set('viewZoom', s.zoom);
  };
  apply();
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  // A host can destroy scene 2 and start it again (full game: Game over -> home -> play).
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', apply);
    window.visualViewport?.removeEventListener('resize', apply);
  });
  return apply;
}

/**
 * Per scene: camera shows the 180 x 320 design space, and images/sprites are
 * drawn at 1/RENDER_SCALE so their RENDER_SCALE x textures map to design size.
 */
export function setupScene(scene) {
  const cam = scene.cameras.main;
  const fit = () => {
    const z = scene.registry.get('viewZoom') || RENDER_SCALE;
    cam.setSize(scene.scale.width, scene.scale.height);
    cam.setZoom(z);
    cam.centerOn(GAME_W / 2, GAME_H / 2);
  };
  fit();
  scene.registry.events.on('changedata-viewZoom', fit);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.registry.events.off('changedata-viewZoom', fit));
  // Texture px per design px: RENDER_SCALE for sprite sheets, 1 for native pipeline assets.
  const onAdded = (go) => {
    if (go.type !== 'Image' && go.type !== 'Sprite') return;
    const k = scene.registry.get('texScale')?.get(go.texture.key) ?? RENDER_SCALE;
    go.setScale(1 / k);
  };
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, onAdded));
}

/** Texture px per design px for a texture key (RENDER_SCALE for 3x art, 1 for native assets). */
export function texScaleOf(scene, key) {
  return scene.registry.get('texScale')?.get(key) ?? RENDER_SCALE;
}

/** NineSlice sized in design units, whatever the texture's scale. */
export function addNineSlice(scene, x, y, key, frame, w, h, corner) {
  const k = texScaleOf(scene, key);
  const n = scene.add.nineslice(x, y, key, frame, w * k, h * k, corner * k, corner * k, corner * k, corner * k);
  n.texK = k;
  return n.setScale(1 / k);
}

/** Resize a NineSlice made by addNineSlice, in design units. */
export function sizeNineSlice(n, w, h) {
  n.setSize(w * n.texK, h * n.texK);
}

/** Design px needed for a touch target of `minCss` CSS px. */
export function minHitLogical(game, minCss) {
  const cssScale = game.registry.get('cssScale') || 1;
  return Math.ceil(minCss / cssScale);
}

/** Pointer position in design units. */
export function pointerPos(scene, p) {
  return scene.cameras.main.getWorldPoint(p.x, p.y);
}

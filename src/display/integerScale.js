// Whole-number scaling with letterbox (spec 2).
// The scale is an integer in DEVICE pixels, so every art pixel covers an exact
// block of screen pixels even on phones with a fractional devicePixelRatio.
import { GAME_W, GAME_H } from '../config/constants.js';

export function computeScale(viewW, viewH, dpr) {
  const deviceScale = Math.max(1, Math.floor(Math.min((viewW * dpr) / GAME_W, (viewH * dpr) / GAME_H)));
  const cssScale = deviceScale / dpr;
  const cssW = GAME_W * cssScale;
  const cssH = GAME_H * cssScale;
  // Snap the offset to device pixels too.
  const left = Math.round(((viewW - cssW) / 2) * dpr) / dpr;
  const top = Math.round(((viewH - cssH) / 2) * dpr) / dpr;
  return { deviceScale, cssScale, cssW, cssH, left, top };
}

export function installIntegerScale(game) {
  const apply = () => {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    const s = computeScale(w, h, window.devicePixelRatio || 1);
    game.scale.setZoom(s.cssScale);
    const c = game.canvas;
    c.style.position = 'absolute';
    c.style.width = `${s.cssW}px`;
    c.style.height = `${s.cssH}px`;
    c.style.left = `${s.left}px`;
    c.style.top = `${s.top}px`;
    c.style.margin = '0';
    game.registry.set('cssScale', s.cssScale);
    game.scale.updateBounds(); // input maps pointer coords from the canvas rect
  };
  apply();
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  return apply;
}

/** Logical px needed for a touch target of MIN css px at the current scale. */
export function minHitLogical(game, minCss) {
  const cssScale = game.registry.get('cssScale') || 1;
  return Math.ceil(minCss / cssScale);
}

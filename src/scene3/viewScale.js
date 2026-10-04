// Scene 3 display scaling (spec 2): the 180 x 320 design space is always shown at a whole
// number of device pixels per design pixel, letterboxed. (Scene 2's installViewScale may go
// fractional to fill more of the screen; scene 3 never does, so sprites never blur.)
// Same registry values as scene 2: viewZoom (device px per design px), cssScale.
import { setTextResolution } from '../ui/text.js';

const W = 180;
const H = 320;

export function scene3Scale(viewW, viewH, dpr) {
  const exact = Math.min((viewW * dpr) / W, (viewH * dpr) / H);
  const zoom = Math.max(1, Math.floor(exact));
  const canvasW = W * zoom;
  const canvasH = H * zoom;
  const cssW = canvasW / dpr;
  const cssH = canvasH / dpr;
  const left = Math.round(((viewW - cssW) / 2) * dpr) / dpr;
  const top = Math.round(((viewH - cssH) / 2) * dpr) / dpr;
  return { zoom, canvasW, canvasH, cssW, cssH, left, top, cssScale: zoom / dpr };
}

export function installScene3Scale(game) {
  const apply = () => {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const s = scene3Scale(w, h, dpr);
    game.scale.setZoom(1 / dpr);
    game.scale.resize(s.canvasW, s.canvasH);
    Object.assign(game.canvas.style, { position: 'absolute', width: `${s.cssW}px`, height: `${s.cssH}px`, left: `${s.left}px`, top: `${s.top}px`, margin: '0' });
    game.scale.updateBounds();
    game.scale.displayScale.set(s.canvasW / s.cssW, s.canvasH / s.cssH);
    setTextResolution(Math.ceil(s.zoom));
    game.registry.set('cssScale', s.cssScale);
    game.registry.set('viewZoom', s.zoom);
  };
  apply();
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  game.events.once('destroy', () => {
    window.removeEventListener('resize', apply);
    window.visualViewport?.removeEventListener('resize', apply);
  });
  return apply;
}
